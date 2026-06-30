#!/usr/bin/env bash
# =============================================================================
# superbundle.sh  v3.0
# NullVPN — orchestration entry point for node bootstrap
#
# Phase map (v3.0 — GCP deploy phase REMOVED):
#   1  prerequisite-check   OS/kernel/deps validation
#   2  system-hardening     sysctl, firewall, fail2ban
#   3  awg-install          AmneziaWG kernel module + tools
#   4  nullvpn-install      NullVPN runtime binaries
#   5  keygen               AWG2 keypair (delegated to addon Phase 8)
#   6  obfs-params          AWG2 obfuscation params (addon Phase 9)
#   7  server-conf          Write server AWG config (addon Phase 10)
#   8  register-self        Backend self-registration + heartbeat (addon Phase 11)
#   9  peer-sync            Apply peer state from backend (addon Phase 12)
#  10  validate             Post-provisioning validation (addon Phase 13)
#  11  drift-daemon         Install drift sync timer (addon Phase 14)
#
# DEPRECATED/REMOVED in v3.0:
#   deployAwgServer()   — GCP SSH-based server deploy — REMOVED
#   POST /deploy        — Backend deploy endpoint — DEPRECATED (410 Gone)
#   register-awg-nodes.sh — standalone helper — DELETED (inline in addon)
#   Admin UI "Node Deploy" tab — REMOVED from admin panel
#
# Single control surface model:
#   This script + AWG2-node-provision-addon.sh = one shell control surface.
#   Backend owns desired state.  Nodes self-register and sync from DB.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")")" ; cd "${SCRIPT_DIR}"
ADDON_SCRIPT="${SCRIPT_DIR}/AWG2-node-provision-addon.sh"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
log()      { echo -e "${GREEN}[superbundle]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[superbundle:WARN]${NC} $*"; }
die()      { echo -e "${RED}[superbundle:FATAL]${NC} $*" >&2; exit 1; }

# ── Required env vars ─────────────────────────────────────────────────────────
check_env() {
  local missing=0
  for var in API_BASE ADMIN_KEY AWG_LISTEN_PORT AWG_SERVER_NET PROVISIONER_SECRET; do
    [[ -z "${!var:-}" ]] && { echo "[superbundle:ERR] Missing: ${var}"; missing=1; }
  done
  [[ $missing -eq 0 ]] || die "Aborting — set required env vars above"
}

# ── Phase 1: Prerequisites ────────────────────────────────────────────────────
phase_prereq() {
  log "Phase 1 — Prerequisites"
  local os_id; os_id=$(. /etc/os-release && echo "${ID}")
  case "${os_id}" in
    ubuntu|debian) ;;
    *) die "Unsupported OS: ${os_id} — NullVPN supports Ubuntu/Debian" ;;
  esac
  # Kernel >= 5.15 required for AWG kernel module
  local kver; kver=$(uname -r | cut -d. -f1-2)
  python3 -c "assert tuple(map(int,'${kver}'.split('.'))) >= (5,15), 'Kernel ${kver} < 5.15'" \
    || die "Kernel too old: ${kver} — upgrade to 5.15+"
  log "  ✓ OS=${os_id}  kernel=${kver}"
}

# ── Phase 2: System hardening ─────────────────────────────────────────────────
phase_hardening() {
  log "Phase 2 — System hardening"
  # IPv4 forwarding
  sysctl -w net.ipv4.ip_forward=1 &>/dev/null
  echo 'net.ipv4.ip_forward=1' > /etc/sysctl.d/99-nullvpn.conf
  # UFW baseline
  if command -v ufw &>/dev/null; then
    ufw --force reset &>/dev/null
    ufw default deny incoming &>/dev/null
    ufw default allow outgoing &>/dev/null
    ufw allow ssh &>/dev/null
    ufw allow "${AWG_LISTEN_PORT}/udp" &>/dev/null
    ufw allow 8080/tcp &>/dev/null  # node agent
    ufw --force enable &>/dev/null
    log "  ✓ UFW configured — ports: 22/tcp  ${AWG_LISTEN_PORT}/udp  8080/tcp"
  else
    log_warn "  ufw not found — skipping firewall setup"
  fi
}

# ── Phase 3: AmneziaWG install ────────────────────────────────────────────────
phase_awg_install() {
  log "Phase 3 — AmneziaWG kernel module + tools"
  if command -v awg &>/dev/null; then
    log "  awg already installed: $(awg version 2>/dev/null | head -1)"
    return 0
  fi
  # Official AmneziaWG install
  curl -fsSL https://apt.amnezia.org/gpg.key | gpg --dearmor -o /usr/share/keyrings/amnezia.gpg
  echo "deb [signed-by=/usr/share/keyrings/amnezia.gpg] https://apt.amnezia.org/ stable main" \
    > /etc/apt/sources.list.d/amnezia.list
  apt-get update -qq
  apt-get install -y amneziawg amneziawg-tools
  modprobe amneziawg
  log "  ✓ AmneziaWG installed  $(awg version 2>/dev/null | head -1)"
}

# ── Phase 4: NullVPN runtime ──────────────────────────────────────────────────
phase_nullvpn_install() {
  log "Phase 4 — NullVPN runtime"
  mkdir -p /etc/nullvpn/private /etc/nullvpn/peers
  chmod 700 /etc/nullvpn/private /etc/nullvpn/peers
  log "  ✓ NullVPN directories initialised"
}

# ── Phases 5-11: Delegated to AWG2 addon ─────────────────────────────────────
phase_addon() {
  log "Phases 5-11 — AWG2 provisioner addon"
  [[ -f "${ADDON_SCRIPT}" ]] || die "Addon not found: ${ADDON_SCRIPT}"
  chmod +x "${ADDON_SCRIPT}"
  # Export all required env vars for the addon
  export API_BASE ADMIN_KEY AWG_LISTEN_PORT AWG_SERVER_NET AWG_IF PROVISIONER_SECRET
  bash "${ADDON_SCRIPT}"
}

# ── Entry point ───────────────────────────────────────────────────────────────
main() {
  log "NullVPN Superbundle  v3.0  — AWG-only control plane"
  check_env
  phase_prereq
  phase_hardening
  phase_awg_install
  phase_nullvpn_install
  phase_addon
  log "✓ Superbundle complete — node is live and registered with backend"
}

main "$@"
