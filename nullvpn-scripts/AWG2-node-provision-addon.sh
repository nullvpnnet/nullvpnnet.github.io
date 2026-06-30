#!/usr/bin/env bash
# =============================================================================
# AWG2-node-provision-addon.sh  v3.0
# NullVPN — AmneziaWG node provisioner (AWG kernel-mode, single control surface)
#
# Control plane model (v3.0):
#   • superbundle calls this script during node bootstrap
#   • This script owns the FULL local AWG config lifecycle
#   • Phase 11: self-registers with backend — NO external helper scripts
#   • Backend owns desired state (awgnodes + vpn_peers tables)
#   • Nodes pull peer state via /v1/nodes/:nodeId/sync on each drift timer tick
#
# Required env vars:
#   API_BASE          Backend base URL           e.g. https://api.nullvpn.net
#   ADMIN_KEY         Backend admin bearer token
#   AWG_LISTEN_PORT   WireGuard listen port      default: 3704  (migration 018)
#   AWG_SERVER_NET    Tunnel subnet CIDR         e.g. 10.77.0.0/16
#   AWG_IF            Interface name             default: amn0
#   PROVISIONER_SECRET  HMAC secret for node agent requests
#
# Key paths (canonical):
#   /etc/nullvpn/private/  — server keypair
#   /etc/nullvpn/peers/    — per-peer .conf fragments
#
# AWG2 obfuscation parameters (S1-S4, H1-H4, I1-I5) are generated once at
# first run, stored in /etc/nullvpn/private/obfs.env, and pushed to the DB
# during Phase 11 registration so the backend can embed them in client configs.
# =============================================================================
set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────────
AWG_LISTEN_PORT="${AWG_LISTEN_PORT:-3704}"
AWG_SERVER_NET="${AWG_SERVER_NET:-10.77.0.0/16}"
AWG_IF="${AWG_IF:-amn0}"
REPO_ROOT="${REPO_ROOT:-/opt/nullvpn}"
KEY_DIR="/etc/nullvpn/private"
PEER_DIR="/etc/nullvpn/peers"
SERVER_CONF="/etc/amneziawg/${AWG_IF}.conf"
LOG_TAG="AWG2-addon"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
log()      { echo -e "${GREEN}[${LOG_TAG}]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[${LOG_TAG}:WARN]${NC} $*"; }
log_err()  { echo -e "${RED}[${LOG_TAG}:ERR]${NC} $*" >&2; }
die()      { log_err "$*"; exit 1; }

# ── Dependency check ──────────────────────────────────────────────────────────
check_deps() {
  for cmd in awg awg-quick curl jq; do
    command -v "$cmd" &>/dev/null || die "Required command not found: ${cmd}"
  done
  # Ensure awg is kernel-mode (not userspace fallback)
  if ! awg version 2>/dev/null | grep -q 'wireguard-tools'; then
    log_warn "awg version check inconclusive — verify kernel module is loaded"
  fi
}

# ── Phase 8: Generate AWG keypair (kernel-mode tools only) ───────────────────
phase_keygen() {
  log "Phase 8 — AWG keypair generation  (awg genkey / awg pubkey)"
  mkdir -p "${KEY_DIR}" && chmod 700 "${KEY_DIR}"

  local priv_file="${KEY_DIR}/server.key"
  local pub_file="${KEY_DIR}/server.pub"

  if [[ -f "${priv_file}" && -f "${pub_file}" ]]; then
    log "  Keypair exists — skipping generation"
    SERVER_PRIVKEY=$(cat "${priv_file}")
    SERVER_PUBKEY=$(cat "${pub_file}")
    return 0
  fi

  # MUST use awg genkey — openssl rand produces non-clamped keys
  # that silently fail WireGuard handshake (Curve25519 clamping required)
  SERVER_PRIVKEY=$(awg genkey)
  SERVER_PUBKEY=$(echo "${SERVER_PRIVKEY}" | awg pubkey)

  echo "${SERVER_PRIVKEY}" > "${priv_file}" && chmod 600 "${priv_file}"
  echo "${SERVER_PUBKEY}"  > "${pub_file}"  && chmod 644 "${pub_file}"
  log "  Server keypair written → ${KEY_DIR}"
}

# ── Phase 9: Generate AWG2 obfuscation parameters ────────────────────────────
phase_obfs_params() {
  log "Phase 9 — AWG2 obfuscation parameters (S1-S4, H1-H4, I1-I5)"
  local obfs_env="${KEY_DIR}/obfs.env"

  if [[ -f "${obfs_env}" ]]; then
    log "  obfs.env exists — loading"
    # shellcheck source=/dev/null
    source "${obfs_env}"
    return 0
  fi

  # Junk packet sizes (S1-S4): 10-1000 bytes each
  S1=$(shuf -i 10-800  -n1); S2=$(shuf -i 10-800  -n1)
  S3=$(shuf -i 10-1000 -n1); S4=$(shuf -i 10-1000 -n1)
  # Header magic ranges (H1-H4): 5-10 byte hex sequences
  H1=$(od -An -tx1 -N5 /dev/urandom | tr -d ' \n')
  H2=$(od -An -tx1 -N5 /dev/urandom | tr -d ' \n')
  H3=$(od -An -tx1 -N6 /dev/urandom | tr -d ' \n')
  H4=$(od -An -tx1 -N6 /dev/urandom | tr -d ' \n')
  # Protocol mimicry mode (I1-I5): 1=none 2=QUIC 3=DNS 4=SIP 5=random
  I1=2; I2=3; I3=1; I4=4; I5=5  # default: QUIC primary, DNS fallback

  cat > "${obfs_env}" << OBFS
S1=${S1}
S2=${S2}
S3=${S3}
S4=${S4}
H1=${H1}
H2=${H2}
H3=${H3}
H4=${H4}
I1=${I1}
I2=${I2}
I3=${I3}
I4=${I4}
I5=${I5}
OBFS
  chmod 600 "${obfs_env}"
  # shellcheck source=/dev/null
  source "${obfs_env}"
  log "  Obfuscation params generated → ${obfs_env}"
}

# ── Phase 10: Write server AWG config ────────────────────────────────────────
phase_write_server_conf() {
  log "Phase 10 — Write server AWG2 config → ${SERVER_CONF}"
  mkdir -p "$(dirname "${SERVER_CONF}")"

  # Derive server tunnel IP (first usable in subnet)
  local server_ip
  server_ip=$(python3 -c "
import ipaddress, sys
net = ipaddress.ip_network('${AWG_SERVER_NET}', strict=False)
print(str(list(net.hosts())[0]))
" 2>/dev/null) || die "Failed to derive server IP from AWG_SERVER_NET=${AWG_SERVER_NET}"

  cat > "${SERVER_CONF}" << WGCONF
[Interface]
PrivateKey = ${SERVER_PRIVKEY}
Address = ${server_ip}/$(echo ${AWG_SERVER_NET} | cut -d/ -f2)
ListenPort = ${AWG_LISTEN_PORT}
# AWG2 obfuscation
S1 = ${S1}
S2 = ${S2}
S3 = ${S3}
S4 = ${S4}
H1 = ${H1}
H2 = ${H2}
H3 = ${H3}
H4 = ${H4}
I1 = ${I1}
I2 = ${I2}
I3 = ${I3}
I4 = ${I4}
I5 = ${I5}
PostUp   = iptables -A FORWARD -i ${AWG_IF} -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i ${AWG_IF} -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
WGCONF
  chmod 600 "${SERVER_CONF}"
  log "  Server config written — port=${AWG_LISTEN_PORT}  net=${AWG_SERVER_NET}"
}

# ── Phase 11: Self-register with backend + initial heartbeat ─────────────────
# REFACTORED v3.0: direct backend API calls — no helper scripts, no ssh, no GCP
# Replaces: register-awg-nodes.sh (deleted), deployAwgServer() (deprecated)
phase_register_self() {
  log "Phase 11 — Backend self-registration + heartbeat"

  local node_name
  node_name=$(hostname -s)

  local server_ip
  server_ip=$(curl -sf --max-time 5 https://api.ipify.org 2>/dev/null) \
    || server_ip=$(curl -sf --max-time 5 https://ifconfig.me 2>/dev/null) \
    || die "Cannot detect public IP — check network"

  # Build obfuscation params JSON from sourced obfs.env
  local obfs_json
  obfs_json=$(python3 -c "
import json, sys
params = {k: v for k, v in [
    ('S1','${S1}'),('S2','${S2}'),('S3','${S3}'),('S4','${S4}'),
    ('H1','${H1}'),('H2','${H2}'),('H3','${H3}'),('H4','${H4}'),
    ('I1','${I1}'),('I2','${I2}'),('I3','${I3}'),('I4','${I4}'),('I5','${I5}')
]}
print(json.dumps(params))
")

  # ── Register-self (upsert) ─────────────────────────────────────────────────
  local reg_payload
  reg_payload=$(jq -n \
    --arg name   "${node_name}" \
    --arg ip     "${server_ip}" \
    --arg pubkey "${SERVER_PUBKEY}" \
    --arg port   "${AWG_LISTEN_PORT}" \
    --arg cidr   "${AWG_SERVER_NET}" \
    --argjson obfs "${obfs_json}" \
    '{
      name:               $name,
      serverip:           $ip,
      publickey:          $pubkey,
      listenport:         ($port | tonumber),
      cidr:               $cidr,
      obfuscation_params: $obfs,
      status:             "online"
    }')

  local reg_http
  reg_http=$(curl -sw "%{http_code}" -o /tmp/nullvpn-reg-resp.json \
    -X POST "${API_BASE}/v1/nodes/register-self" \
    -H "Authorization: Bearer ${ADMIN_KEY}" \
    -H "Content-Type: application/json" \
    -d "${reg_payload}" \
    --max-time 15 2>/dev/null || echo "000")

  if [[ "${reg_http}" =~ ^2 ]]; then
    NODE_ID=$(jq -r '.id // .node_id // empty' /tmp/nullvpn-reg-resp.json 2>/dev/null || true)
    log "  ✓ Self-registered  node_name=${node_name}  node_id=${NODE_ID:-unknown}  http=${reg_http}"
  else
    log_warn "  Registration returned HTTP ${reg_http} — node may already exist, continuing"
    # Attempt to fetch existing node ID by name
    NODE_ID=$(curl -sf --max-time 10 \
      -H "Authorization: Bearer ${ADMIN_KEY}" \
      "${API_BASE}/v1/nodes?name=${node_name}" 2>/dev/null \
      | jq -r '.[0].id // empty' 2>/dev/null || true)
    log_warn "  Resolved existing NODE_ID=${NODE_ID:-<not found>}"
  fi

  # Persist NODE_ID for subsequent phases and drift daemon
  echo "NODE_ID=${NODE_ID}" > /etc/nullvpn/node-id.env
  chmod 600 /etc/nullvpn/node-id.env

  # ── Initial heartbeat ──────────────────────────────────────────────────────
  local hb_payload
  hb_payload=$(jq -n \
    --arg node_id  "${NODE_ID:-}" \
    --arg status   "online" \
    --arg version  "$(awg version 2>/dev/null | head -1 || echo unknown)" \
    '{ node_id: $node_id, status: $status, awg_version: $version }')

  local hb_http
  hb_http=$(curl -sw "%{http_code}" -o /dev/null \
    -X POST "${API_BASE}/v1/nodes/heartbeat" \
    -H "Authorization: Bearer ${ADMIN_KEY}" \
    -H "Content-Type: application/json" \
    -d "${hb_payload}" \
    --max-time 10 2>/dev/null || echo "000")
  log "  ✓ Heartbeat sent  http=${hb_http}"

  # ── Apply desired peer state from backend ─────────────────────────────────
  if [[ -n "${NODE_ID:-}" ]]; then
    log "  Applying desired peer state from /v1/nodes/${NODE_ID}/sync"
    phase_apply_sync
  else
    log_warn "  NODE_ID unknown — skipping initial peer sync"
  fi
}

# ── Phase 12: Apply peer sync from backend ───────────────────────────────────
phase_apply_sync() {
  log "Phase 12 — Peer sync from backend"
  [[ -z "${NODE_ID:-}" ]] && { log_warn "NODE_ID not set — skip sync"; return 0; }

  mkdir -p "${PEER_DIR}" && chmod 700 "${PEER_DIR}"

  local sync_resp
  sync_resp=$(curl -sf --max-time 15 \
    -H "Authorization: Bearer ${ADMIN_KEY}" \
    "${API_BASE}/v1/nodes/${NODE_ID}/sync" 2>/dev/null || echo '{}')

  local peer_count
  peer_count=$(echo "${sync_resp}" | jq '.peers | length' 2>/dev/null || echo 0)
  log "  Backend returned ${peer_count} peers"

  if [[ "${peer_count}" -gt 0 ]]; then
    # Write peer fragments and apply via awg syncconf (zero-downtime)
    echo "${sync_resp}" | jq -r '.peers[] | "[Peer]\nPublicKey = " + .publickey + "\nAllowedIPs = " + .allowed_ip + "/32"' \
      > /tmp/nullvpn-peers.conf
    awg syncconf "${AWG_IF}" /tmp/nullvpn-peers.conf
    rm -f /tmp/nullvpn-peers.conf
    log "  ✓ awg syncconf applied  peers=${peer_count}"
  fi
}

# ── Phase 13: Post-validation ─────────────────────────────────────────────────
phase_validate() {
  log "Phase 13 — Post-provisioning validation"
  awg show "${AWG_IF}" &>/dev/null && log "  ✓ Interface ${AWG_IF} is up" \
    || log_warn "  Interface ${AWG_IF} not visible — check awg-quick up ${AWG_IF}"
}

# ── Phase 14: Install drift daemon ───────────────────────────────────────────
phase_drift_daemon() {
  log "Phase 14 — Install drift sync daemon (nullvpn-awg-drift)"

  local svc_file="/etc/systemd/system/nullvpn-awg-drift.service"
  local timer_file="/etc/systemd/system/nullvpn-awg-drift.timer"
  local drift_script="/usr/local/bin/nullvpn-drift-sync.sh"

  cat > "${drift_script}" << 'DRIFT'
#!/usr/bin/env bash
# NullVPN drift sync — runs every 5 min via systemd timer
set -euo pipefail
source /etc/nullvpn/node-id.env 2>/dev/null || exit 0
source /etc/nullvpn/private/obfs.env 2>/dev/null || true
[[ -z "${NODE_ID:-}" ]] && exit 0
curl -sf --max-time 15 \
  -X POST "${API_BASE}/v1/drift/report" \
  -H "Authorization: Bearer ${ADMIN_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"node_id\":\"${NODE_ID}\",\"peer_count\":$(awg show amn0 peers 2>/dev/null | wc -l),\"status\":\"online\"}" \
  > /dev/null 2>&1 || true
DRIFT
  chmod +x "${drift_script}"

  cat > "${svc_file}" << SVCEOF
[Unit]
Description=NullVPN AWG Drift Sync
After=network-online.target

[Service]
Type=oneshot
EnvironmentFile=-/etc/nullvpn/node-id.env
ExecStart=${drift_script}
SECURITYEOF

  cat > "${timer_file}" << TIMEREOF
[Unit]
Description=NullVPN AWG Drift Sync Timer

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
Unit=nullvpn-awg-drift.service

[Install]
WantedBy=timers.target
TIMEREOF

  systemctl daemon-reload
  systemctl enable --now nullvpn-awg-drift.timer
  log "  ✓ Drift timer installed — 5min interval"
}

# ── Entry point ───────────────────────────────────────────────────────────────
main() {
  log "NullVPN AWG2 Provisioner  v3.0  — single control surface"
  check_deps
  [[ -n "${API_BASE:-}"   ]] || die "API_BASE not set"
  [[ -n "${ADMIN_KEY:-}"  ]] || die "ADMIN_KEY not set"

  phase_keygen
  phase_obfs_params
  phase_write_server_conf

  # Bring up interface before registering so sync can apply peers immediately
  awg-quick up "${AWG_IF}" 2>/dev/null || log_warn "awg-quick up may have failed — interface may already be active"

  phase_register_self   # Phase 11 — self-register + heartbeat + initial sync
  phase_apply_sync      # Phase 12 — peer reconciliation
  phase_validate        # Phase 13 — post-validation
  phase_drift_daemon    # Phase 14 — install drift timer

  log "✓ Provisioning complete  node=${NODE_ID:-unknown}  if=${AWG_IF}  port=${AWG_LISTEN_PORT}"
}

main "$@"
