#!/usr/bin/env bash
# =============================================================================
# resolve-inventory.sh
# NullVPN — unified node inventory from GCP (IPs) + CF (domain names)
# Sources: GCP Compute API + Cloudflare DNS API — zero hardcoding
#
# Required env vars (all sourced externally — no defaults, no hardcoding):
#   GCP_PROJECT_ID                e.g. from GCP SA key json: .project_id
#   GCP_ZONE                      e.g. us-east1-b
#   GCP_REGION                    e.g. us-east1
#   GCP_SERVICE_ACCOUNT_KEY_PATH  path to GCP SA JSON key file
#   CF_API_TOKEN                  Cloudflare API token (DNS:Read scope)
#   CF_DOMAIN_SUFFIX              e.g. nullvpn.net
#
# Optional:
#   CF_ZONE_ID                    auto-resolved from CF_DOMAIN_SUFFIX if not set
#   INVENTORY_OUT                 path to write JSON output (default: stdout only)
# =============================================================================
set -euo pipefail

# ── Colour output ─────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
log_head()  { echo -e "\n${BOLD}${CYAN}── $* ──${NC}"; }

# ── Validate required vars — fail fast, no silent defaults ──────────────────
check_required_vars() {
  local missing=0
  for var in GCP_PROJECT_ID GCP_ZONE GCP_REGION GCP_SERVICE_ACCOUNT_KEY_PATH \
             CF_API_TOKEN CF_DOMAIN_SUFFIX; do
    if [[ -z "${!var:-}" ]]; then
      log_error "Required env var not set: ${var}"
      missing=1
    fi
  done
  [[ $missing -eq 0 ]] || { log_error "Aborting — missing required vars above."; exit 1; }
}

check_deps() {
  for cmd in gcloud curl python3; do
    command -v "$cmd" &>/dev/null || { log_error "Missing dependency: $cmd"; exit 1; }
  done
}

# ── GCP auth via SA key file (reads project_id from key file if not set) ─────
gcp_auth() {
  # Auto-extract project_id from key file if GCP_PROJECT_ID not already set
  if [[ -z "${GCP_PROJECT_ID:-}" ]]; then
    GCP_PROJECT_ID=$(python3 -c "
import json, sys
with open('${GCP_SERVICE_ACCOUNT_KEY_PATH}') as f:
    print(json.load(f)['project_id'])
")
    log_info "GCP_PROJECT_ID auto-extracted from key: ${GCP_PROJECT_ID}"
  fi

  log_info "Authenticating GCP SA: project=${GCP_PROJECT_ID}  key=${GCP_SERVICE_ACCOUNT_KEY_PATH}"
  gcloud auth activate-service-account \
    --key-file="${GCP_SERVICE_ACCOUNT_KEY_PATH}" \
    --project="${GCP_PROJECT_ID}" --quiet
  gcloud config set project "${GCP_PROJECT_ID}" --quiet
}

# ── GCP: fetch all VM instances → name | ext_ip | int_ip | status ────────────
GCP_INSTANCES=()

fetch_gcp_instances() {
  log_head "GCP Instances  project=${GCP_PROJECT_ID}  zone=${GCP_ZONE}"

  local raw
  raw=$(gcloud compute instances list \
    --project="${GCP_PROJECT_ID}" \
    --filter="zone:(${GCP_ZONE})" \
    --format="csv[no-heading](name,networkInterfaces[0].accessConfigs[0].natIP,networkInterfaces[0].networkIP,status)" \
    2>/dev/null || true)

  if [[ -z "$raw" ]]; then
    log_warn "No GCP instances found in zone ${GCP_ZONE} — continuing"
    return 0
  fi

  while IFS=',' read -r name ext_ip int_ip status; do
    [[ -z "$name" ]] && continue
    GCP_INSTANCES+=("${name}|${ext_ip}|${int_ip}|${status}")
    log_info "  GCP  ${name}  ext=${ext_ip:-none}  int=${int_ip}  [${status}]"
  done <<< "$raw"

  log_info "Total GCP instances: ${#GCP_INSTANCES[@]}"
}

# ── CF: resolve zone ID from domain suffix ───────────────────────────────────
CF_ZONE_ID="${CF_ZONE_ID:-}"

resolve_cf_zone() {
  if [[ -n "$CF_ZONE_ID" ]]; then
    log_info "CF_ZONE_ID provided: ${CF_ZONE_ID}"
    return 0
  fi

  log_info "Resolving CF zone ID for: ${CF_DOMAIN_SUFFIX}"
  CF_ZONE_ID=$(curl -sf \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    "https://api.cloudflare.com/client/v4/zones?name=${CF_DOMAIN_SUFFIX}&status=active" \
    | python3 -c "
import sys, json
d = json.load(sys.stdin)
results = d.get('result', [])
if not results:
    raise SystemExit('No active CF zone found for domain: ${CF_DOMAIN_SUFFIX}')
print(results[0]['id'])
")
  log_info "CF Zone ID resolved: ${CF_ZONE_ID}"
}

# ── CF: fetch all A-records (paginated) ──────────────────────────────────────
CF_RECORDS=()

fetch_cf_records() {
  log_head "Cloudflare DNS A-records  domain=${CF_DOMAIN_SUFFIX}  zone=${CF_ZONE_ID}"

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
total = info.get('total_pages', 1)
print('PAGES=' + str(total))
for r in d.get('result', []):
    print(r['name'] + '|' + r['content'])
" <<< "$response")

    while IFS= read -r line; do
      if [[ "$line" == PAGES=* ]]; then
        total_pages="${line#PAGES=}"
      else
        [[ -z "$line" ]] && continue
        CF_RECORDS+=("$line")
        local fqdn="${line%%|*}" ip="${line##*|}"
        log_info "  CF   ${fqdn} → ${ip}"
      fi
    done <<< "$parsed"

    (( page++ ))
  done

  log_info "Total CF A-records: ${#CF_RECORDS[@]}"
}

# ── Correlate: GCP ext IPs ↔ CF A-record FQDNs ───────────────────────────────
correlate() {
  log_head "Unified Node Inventory"

  # Build reverse lookup: ext_ip → cf_fqdn
  declare -A ip_to_cf
  for rec in "${CF_RECORDS[@]}"; do
    local fqdn="${rec%%|*}" ip="${rec##*|}"
    ip_to_cf["$ip"]="${fqdn}"
  done

  local json_entries=()

  printf "\n%-32s %-18s %-18s %-24s %s\n" \
    "CF_FQDN" "EXT_IP" "INT_IP" "GCP_NAME" "STATUS"
  printf "%s\n" "────────────────────────────────────────────────────────────────────────────────────────────────────"

  # GCP instances — match to CF record by ext IP
  for inst in "${GCP_INSTANCES[@]}"; do
    IFS='|' read -r gcp_name ext_ip int_ip status <<< "$inst"
    local cf_name="${ip_to_cf[${ext_ip}]:-<no CF record>}"
    printf "%-32s %-18s %-18s %-24s %s\n" \
      "$cf_name" "${ext_ip:-none}" "$int_ip" "$gcp_name" "$status"
    json_entries+=("{\"gcp_name\":\"${gcp_name}\",\"cf_fqdn\":\"${cf_name}\",\"ext_ip\":\"${ext_ip:-}\",\"int_ip\":\"${int_ip}\",\"status\":\"${status}\"}")
  done

  # CF-only records (no matching GCP instance) — stale DNS
  for rec in "${CF_RECORDS[@]}"; do
    local fqdn="${rec%%|*}" cf_ip="${rec##*|}"
    local matched=0
    for inst in "${GCP_INSTANCES[@]}"; do
      local ext_ip; ext_ip=$(cut -d'|' -f2 <<< "$inst")
      [[ "$ext_ip" == "$cf_ip" ]] && matched=1 && break
    done
    if [[ $matched -eq 0 ]]; then
      log_warn "  CF-ONLY (no GCP instance): ${fqdn} → ${cf_ip}"
      printf "%-32s %-18s %-18s %-24s %s\n" \
        "$fqdn" "$cf_ip" "-" "<no GCP instance>" "CF_ONLY"
      json_entries+=("{\"gcp_name\":null,\"cf_fqdn\":\"${fqdn}\",\"ext_ip\":\"${cf_ip}\",\"int_ip\":null,\"status\":\"CF_ONLY\"}")
    fi
  done

  # Emit JSON
  local json="[$(IFS=,; echo "${json_entries[*]}")]"

  if [[ -n "${INVENTORY_OUT:-}" ]]; then
    echo "$json" | python3 -m json.tool > "${INVENTORY_OUT}"
    log_info "Inventory JSON written → ${INVENTORY_OUT}"
  fi

  echo ""
  log_head "JSON Output"
  echo "$json" | python3 -m json.tool
}

# ── Entry point ───────────────────────────────────────────────────────────────
main() {
  log_head "NullVPN Unified Node Inventory"
  check_deps
  check_required_vars
  gcp_auth
  fetch_gcp_instances
  resolve_cf_zone
  fetch_cf_records
  correlate
}

main "$@"
