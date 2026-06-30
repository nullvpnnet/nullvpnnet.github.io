# NullVPN Developer Reference — AWG-Only Control Plane

> **Revision:** v3.0 — 2026-06-30
> **Status:** Canonical.  All GCP/SSH-based deploy narratives are deprecated and removed.

---

## Canonical Operational Model

The **single authoritative model** for NullVPN node lifecycle is:

```
[New VPS]  ──► superbundle.sh ──► AWG2-node-provision-addon.sh
                                        │
                                        ├── Phase 8:  awg genkey / awg pubkey
                                        ├── Phase 9:  AWG2 obfuscation params
                                        ├── Phase 10: Write /etc/amneziawg/amn0.conf
                                        ├── Phase 11: POST /v1/nodes/register-self
                                        │             POST /v1/nodes/heartbeat
                                        ├── Phase 12: GET  /v1/nodes/:id/sync → awg syncconf
                                        ├── Phase 13: Post-validation
                                        └── Phase 14: Install drift timer (5min)

Backend owns desired state (awgnodes + vpn_peers tables)
Nodes pull peer state via /v1/nodes/:nodeId/sync
No SSH from backend to nodes.  No GCP dependency.
```

**Rules:**
1. `superbundle.sh` + `AWG2-node-provision-addon.sh` are the **one shell control surface**.
2. The backend **never SSHes into nodes** — nodes always call the backend.
3. Node identity is established by `POST /v1/nodes/register-self` with HMAC auth.
4. AWG obfuscation params (`S1-S4`, `H1-H4`, `I1-I5`) are generated once per node, stored in `/etc/nullvpn/private/obfs.env`, and pushed to the backend DB at registration so the backend can embed them in client configs without another node call.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `API_BASE` | ✅ | — | Backend base URL e.g. `https://api.nullvpn.net` |
| `ADMIN_KEY` | ✅ | — | Admin bearer token |
| `PROVISIONER_SECRET` | ✅ | — | HMAC secret for node→backend auth |
| `AWG_LISTEN_PORT` | ✅ | `3704` | AWG UDP listen port (**migration 018 canonical**) |
| `AWG_SERVER_NET` | ✅ | — | Tunnel subnet CIDR e.g. `10.77.0.0/16` |
| `AWG_IF` | optional | `amn0` | AWG interface name |
| `CF_API_TOKEN` | optional | — | Cloudflare DNS:Read (inventory script only) |
| `CF_DOMAIN_SUFFIX` | optional | — | Domain for FQDN correlation e.g. `nullvpn.net` |

**Removed variables (v3.0):**
- `GCP_PROJECT_ID`, `GCP_ZONE`, `GCP_REGION`, `GCP_SERVICE_ACCOUNT_KEY_PATH` — GCP deploy removed
- `BACKEND_API_URL` → renamed `API_BASE`
- `BACKEND_API_TOKEN` → renamed `ADMIN_KEY`
- `AWG_PORT` → renamed `AWG_LISTEN_PORT`
- `AWG_SUBNET` → renamed `AWG_SERVER_NET`
- `NODE_ID` — no longer set manually; derived from `hostname -s` and returned by register-self

---

## Key & Config File Paths

| Path | Contents | Permissions |
|---|---|---|
| `/etc/nullvpn/private/server.key` | AWG server private key | `600` |
| `/etc/nullvpn/private/server.pub` | AWG server public key | `644` |
| `/etc/nullvpn/private/obfs.env` | AWG2 obfuscation params | `600` |
| `/etc/nullvpn/node-id.env` | `NODE_ID=<uuid>` from backend | `600` |
| `/etc/nullvpn/peers/` | Per-peer .conf fragments | `700` dir |
| `/etc/amneziawg/amn0.conf` | Live AWG interface config | `600` |
| `/usr/local/bin/nullvpn-drift-sync.sh` | Drift sync script | `+x` |

---

## AWG2 Obfuscation Parameters

AmneziaWG 2.x uses these parameters to obfuscate the WireGuard handshake.
**The values must be identical on server and all client configs for a given node.**
They are stored in the `awgnodes.obfuscation_params` JSONB column and embedded
into client configs by `buildClientConfig()` in `backend-routes-stub.ts`.

| Param | Type | Range | Description |
|---|---|---|---|
| `S1` | int | 10–800 | Junk packet size (bytes) appended to init packet |
| `S2` | int | 10–800 | Junk packet size for response packet |
| `S3` | int | 10–1000 | Junk packet size variant 3 |
| `S4` | int | 10–1000 | Junk packet size variant 4 |
| `H1` | hex string | 5 bytes | Init message header magic |
| `H2` | hex string | 5 bytes | Response message header magic |
| `H3` | hex string | 6 bytes | Cookie message header magic |
| `H4` | hex string | 6 bytes | Transport message header magic |
| `I1` | int | 1–5 | Protocol mimicry mode: 1=none, 2=QUIC, 3=DNS, 4=SIP, 5=random |
| `I2`–`I5` | int | 1–5 | Additional mimicry mode fallback chain |

---

## Backend API Endpoints

### Core (minimum viable set)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/v1/nodes/register-self` | Node HMAC | Upsert node record + obfs params |
| `POST` | `/v1/users/:userId/provision` | Admin Bearer | Provision new peer on least-loaded node |
| `POST` | `/v1/users/:userId/reprovision` | Admin Bearer | Revoke + re-provision (key rotation) |
| `POST` | `/v1/nodes/:nodeId/sync` | Node HMAC | Return desired peer list for `awg syncconf` |

### Operational

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/v1/nodes/heartbeat` | Node HMAC | Liveness + status update (every 5min) |
| `POST` | `/v1/drift/report` | Node HMAC | Report live peer count; triggers sync if drift > 0 |
| `GET` | `/v1/health/summary` | Admin Bearer | Aggregate node/peer health for UI dashboard |

### Deprecated

| Method | Path | Status | Note |
|---|---|---|---|
| `POST` | `/v1/deploy` | **410 Gone** | GCP SSH deploy — use superbundle.sh directly |

### Authentication

- **Admin Bearer:** `Authorization: Bearer ${ADMIN_KEY}`
- **Node HMAC:** `X-Node-Sig: HMAC-SHA256(PROVISIONER_SECRET, nonce + body)` + `X-Node-Nonce: <random>`

---

## Script Inventory

| File | Status | Purpose |
|---|---|---|
| `superbundle.sh` | ✅ Active | Node bootstrap orchestrator — Phases 1–4 + delegate to addon |
| `AWG2-node-provision-addon.sh` | ✅ Active | AWG lifecycle — Phases 8–14 incl. self-register |
| `admin/infra/resolve-inventory.sh` | ✅ Active v2.0 | Node inventory from Backend DB + CF DNS |
| `backend-routes-stub.ts` | ✅ Active | 7 canonical backend endpoint stubs (TypeScript) |
| `register-awg-nodes.sh` | ❌ Deleted | Replaced by Phase 11 inline calls in addon |

### Removed in v3.0

- `register-awg-nodes.sh` — deleted; logic inlined into addon Phase 11
- `deployAwgServer()` — removed from backend service layer
- Admin UI `Node Deploy` tab — removed; replaced by `/v1/health/summary` status view
- `POST /v1/deploy` backend route — returns `410 Gone`
- GCP Compute API calls in `resolve-inventory.sh` — replaced by DB + CF sources

---

## Database Schema (required tables)

```sql
-- Nodes table
CREATE TABLE awgnodes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT UNIQUE NOT NULL,
  serverip            INET NOT NULL,
  publickey           TEXT NOT NULL,
  listenport          INTEGER NOT NULL DEFAULT 3704,
  cidr                CIDR NOT NULL,
  obfuscation_params  JSONB NOT NULL DEFAULT '{}',
  status              TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online','offline','degraded')),
  peer_count          INTEGER NOT NULL DEFAULT 0,
  last_heartbeat      TIMESTAMPTZ,
  awg_version         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Peers table
CREATE TABLE vpn_peers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id),
  node_id          UUID NOT NULL REFERENCES awgnodes(id),
  client_pubkey    TEXT NOT NULL,
  allowed_ip       INET NOT NULL,
  config_encrypted TEXT,   -- AES-256-GCM encrypted .conf blob
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at       TIMESTAMPTZ,
  UNIQUE (node_id, allowed_ip)
);

CREATE INDEX idx_vpn_peers_user_id  ON vpn_peers(user_id);
CREATE INDEX idx_vpn_peers_node_id  ON vpn_peers(node_id);
CREATE INDEX idx_vpn_peers_active   ON vpn_peers(node_id) WHERE revoked_at IS NULL;
```

> `config_encrypted` stores the client `.conf` (including private key) encrypted at rest with AES-256-GCM.
> The encryption key must NOT be stored in the same DB — use HSM/Vault/KMS.

---

## AWG Key Generation — Security Note

> **CRITICAL:** Always use `awg genkey` / `awg pubkey` to generate WireGuard keys.
> `openssl rand -base64 32` produces **non-clamped keys** that silently fail the
> Curve25519 handshake. The clamping (bits 0,1,2,255 of private key) is performed
> automatically by `awg genkey` and the WireGuard reference implementation.
> Using unclamped keys produces a tunnel that appears to start but never handshakes.

---

## Drift Sync Daemon

Installed by Phase 14. Runs every **5 minutes** via systemd timer `nullvpn-awg-drift.timer`.

```
POST /v1/drift/report  {node_id, peer_count, status}
  └── backend compares reported peer_count vs DB count
      └── if drift > 0 → queues sync job → node next tick calls /v1/nodes/:id/sync
```

Manual trigger: `systemctl start nullvpn-awg-drift.service`

---

## Admin UI Changes (v3.0)

| Previous | Replaced with |
|---|---|
| "Node Deploy" tab (GCP SSH trigger) | Removed — deploy via superbundle.sh on VPS |
| Manual node status refresh | `GET /v1/health/summary` — auto-polling status dashboard |
| Manual peer count display | Drift report feed via `POST /v1/drift/report` |

---

*Generated by ARIA — NullVPN AWG-only control plane overhaul — 2026-06-30*
