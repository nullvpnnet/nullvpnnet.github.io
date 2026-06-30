#!/usr/bin/env bash
# =============================================================================
# resolve-inventory.sh  v2.0
# NullVPN — unified node inventory from Backend DB + Cloudflare DNS
#
# DEPRECATED (removed): GCP Compute API source — nodes are no longer GCP-only.
# Inventory is now DB-authoritative.  CF DNS is used for FQDN correlation only.
#
# Required env vars:
#   API_BASE        NullVPN backend base URL   e.g. https://api.nullvpn.net
#   ADMIN_KEY       Backend admin bearer token
#   CF_API_TOKEN    Cloudflare API token (DNS:Read scope)
#   CF_DOMAIN_SUFFIX  e.g. nullvpn.net
#
# Optional:
#   CF_ZONE_ID      Auto-resolved from CF_DOMAIN_SUFFIX if not set
#   INVENTORY_OUT   Path to write JSON output (default: stdout only)
#
# Removed in v2.0:
#   GCP_PROJECT_ID, GCP_ZONE, GCP_REGION, GCP_SERVICE_ACCOUNT_KEY_PATH
#   (All GCP-SSH-based deploy/inventory logic is deprecated.  Use
#    POST /v1/nodes/register-self from the node superbundle instead.)
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
log_head()  { echo -e "\n${BOLD}${CYAN}── $* ──${NC}"; }

check_required_vars() {
  local missing=0
  for var in API_BASE ADMIN_KEY CF_API_TOKEN CF_DOMAIN_SUFFIX; do
    if [[ -z "${!var:-}" ]]; then
      log_error "Required env var not set: ${var}"
      missing=1
    fi
  done
  [[ $missing -eq 0 ]] || { log_error "Aborting — missing required vars."; exit 1; }
}

check_deps() {
  for cmd in curl python3; do
    command -v "$cmd" &>/dev/null || { log_error "Missing dependency: $cmd"; exit 1; }
  done
}

# ── Backend DB: fetch live node records ───────────────────────────────────────
DB_NODES_JSON=""

fetch_db_nodes() {
  log_head "Backend DB Nodes  ${API_BASE}/v1/nodes"

  local http_code response body
  response=$(curl -sw "\n%{http_code}" -sf \
    -H "Authorization: Bearer ${ADMIN_KEY}" \
    -H "Content-Type: application/json" \
    "${API_BASE}/v1/nodes" 2>/dev/null || true)

  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | head -n -1)

  if [[ "$http_code" != "200" ]]; then
    log_warn "Backend /v1/nodes returned HTTP ${http_code:-timeout} — falling back to empty node list"
    DB_NODES_JSON="[]"
    return 0
  fi

  DB_NODES_JSON="$body"
  local count
  count=$(python3 -c "import sys,json; print(len(json.load(sys.stdin)))" <<< "$body" 2>/dev/null || echo "?")
  log_info "DB nodes fetched: ${count}"

  python3 -c "
import sys, json
nodes = json.load(sys.stdin)
for n in nodes:
    print(f\"  DB  {n.get('name','?'):24s}  ip={n.get('serverip','?'):18s}  status={n.get('status','?')}  peers={n.get('peer_count','?')}\")
" <<< "$body" 2>/dev/null || true
}

# ── CF: resolve zone ID ───────────────────────────────────────────────────────
CF_ZONE_ID="${CF_ZONE_ID:-}"

resolve_cf_zone() {
  if [[ -n "$CF_ZONE_ID" ]]; then
    log_info "CF_ZONE_ID provided: ${CF_ZONE_ID}"
    return 0
  fi
  log_info "Resolving CF zone for: ${CF_DOMAIN_SUFFIX}"
  CF_ZONE_ID=$(curl -sf \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    "https://api.cloudflare.com/client/v4/zones?name=${CF_DOMAIN_SUFFIX}&status=active" \
    | python3 -c "
import sys, json
d = json.load(sys.stdin)
results = d.get('result', [])
if not results:
    raise SystemExit('No active CF zone for: ${CF_DOMAIN_SUFFIX}')
print(results[0]['id'])
")
  log_info "CF Zone ID: ${CF_ZONE_ID}"
}

# ── CF: fetch A-records (paginated) ──────────────────────────────────────────
CF_RECORDS=()

fetch_cf_records() {
  log_head "Cloudflare DNS  ${CF_DOMAIN_SUFFIX}"
  local page=1 total_pages=1
  while [[ $page -le $total_pages ]]; do
    local response
    response=$(curl -sf \
      -H "Authorization: Bearer ${CF_API_TOKEN}" \
      "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records?type=A&per_page=100&page=${page}")
    local parsed
    parsed=$(python3 -c "
import sys, json
d = json.load(sys.stdin)
info = d.get('result_info', {})
print('PAGES=' + str(info.get('total_pages', 1)))
for r in d.get('result', []):
    print(r['name'] + '|' + r['content'])
" <<< "$response")
    while IFS= read -r line; do
      if [[ "$line" == PAGES=* ]]; then total_pages="${line#PAGES=}"
      else [[ -z "$line" ]] && continue; CF_RECORDS+=("$line")
        log_info "  CF  ${line%%|*} → ${line##*|}"
      fi
    done <<< "$parsed"
    (( page++ ))
  done
  log_info "CF A-records: ${#CF_RECORDS[@]}"
}

# ── Correlate: DB nodes ↔ CF FQDNs ───────────────────────────────────────────
correlate() {
  log_head "Unified Inventory  (DB-authoritative)"

  declare -A ip_to_cf
  for rec in "${CF_RECORDS[@]}"; do
    ip_to_cf["${rec##*|}"]="${rec%%|*}"
  done

  local json_entries=()

  printf "\n%-24s %-32s %-18s %-10s %s\n" \
    "DB_NAME" "CF_FQDN" "EXT_IP" "STATUS" "PEERS"
  printf "%s\n" "──────────────────────────────────────────────────────────────────────────────────────"

  python3 -c "
import sys, json
nodes = json.load(sys.stdin)
for n in nodes:
    print(\"||\".join([
        n.get('name',''),
        n.get('serverip',''),
        str(n.get('status','')),
        str(n.get('peer_count','0'))
    ]))
" <<< "$DB_NODES_JSON" 2>/dev/null | \
  while IFS='||' read -r name ip status peers; do
    local cf_fqdn="${ip_to_cf[${ip}]:-<no CF record>}"
    printf "%-24s %-32s %-18s %-10s %s\n" "$name" "$cf_fqdn" "$ip" "$status" "$peers"
    json_entries+=("{\"db_name\":\"${name}\",\"cf_fqdn\":\"${cf_fqdn}\",\"serverip\":\"${ip}\",\"status\":\"${status}\",\"peer_count\":${peers:-0}}")
  done

  local json="[$(IFS=,; echo "${json_entries[*]}")]"
  if [[ -n "${INVENTORY_OUT:-}" ]]; then
    echo "$json" | python3 -m json.tool > "${INVENTORY_OUT}"
    log_info "Inventory written → ${INVENTORY_OUT}"
  fi
  echo ""
  log_head "JSON Output"
  echo "$json" | python3 -m json.tool
}

main() {
  log_head "NullVPN Unified Node Inventory  v2.0  (DB + CF)"
  check_deps
  check_required_vars
  fetch_db_nodes
  resolve_cf_zone
  fetch_cf_records
  correlate
}

main "$@"
