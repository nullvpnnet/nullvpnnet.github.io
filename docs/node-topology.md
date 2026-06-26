# NullVPN Node & DNS Topology

> Last updated: 2026-06-26  
> Source of truth: Cloudflare DNS + GCP console

---

## Node Inventory

| Node | Pool | Region | Zone | IPv4 | IPv6 | Status |
|------|------|--------|------|------|------|--------|
| `node1` | `pool1` | GCP US-East | `us-east1-b` | `34.24.103.218` | `2600:1900:4021:3a6::` | ✅ RUNNING |
| `node3` | `pool3` | GCP Europe | `europe-west4-a` | `34.141.132.237` | `2600:1900:4061:755::` | ✅ RUNNING |
| `node4` | `pool4` | GCP US-East | `us-east1-b` | `35.231.63.234` | `2600:1900:4021:3a6:0:2::` | ✅ RUNNING |
| `node5` | `pool5` | GCP Europe | `europe-north1-a` | `35.228.176.231` | `2600:1900:4150:65d::` | ✅ RUNNING |

> ⚠️ **node2 is absent** — decommissioned. Pool numbering skip (1→3→4→5) is intentional.

---

## Auxiliary / Infrastructure Nodes

| Hostname | Type | IP | Proxy | Purpose |
|----------|------|-----|-------|---------|
| `builds.nullvpn.net` | AAAA | `2a02:c207:2325:6947::1` | DNS only | CI/CD build runner (vps-01) |
| `rescue.nullvpn.net` | AAAA | `2a02:c207:2325:6947` | **Proxied** | Emergency rescue access |
| `panel.nullvpn.net` | A | `185.214.135.85` | **Proxied** | Admin panel |
| `*.cdn.nullvpn.net` | CNAME | `api.nullvpn.net` | **Proxied** | NullVPN CDN wildcard → Contabo backend |

---

## DNS Load Balancing Architecture

### VPN Endpoint Round-Robin (`vpn.nullvpn.net`)

Clients connecting to `vpn.nullvpn.net` receive all 4 IPs and their OS picks one (DNS RR).

**A records (IPv4 RR):**
```
vpn.nullvpn.net  A  34.24.103.218    → node1 us-east1-b
vpn.nullvpn.net  A  34.141.132.237   → node3 europe-west4-a
vpn.nullvpn.net  A  35.231.63.234    → node4 us-east1-b
vpn.nullvpn.net  A  35.228.176.231   → node5 europe-north1-a
```

**AAAA records (IPv6 RR):**
```
vpn.nullvpn.net  AAAA  2600:1900:4021:3a6::      → node1 us-east1-b
vpn.nullvpn.net  AAAA  2600:1900:4061:755::      → node3 europe-west4-a
vpn.nullvpn.net  AAAA  2600:1900:4021:3a6:0:2::  → node4 us-east1-b
vpn.nullvpn.net  AAAA  2600:1900:4150:65d::      → node5 europe-north1-a
```

### Named Pool Records (`pool*.nullvpn.net`)

Used internally for targeted node access (monitoring, config push, per-node testing).

```
pool1.nullvpn.net  A/AAAA  → node1 (test target — see testing policy)
pool3.nullvpn.net  A/AAAA  → node3
pool4.nullvpn.net  A/AAAA  → node4
pool5.nullvpn.net  A/AAAA  → node5
```

### Website / API (`nullvpn.net`)

Proxied through Cloudflare (GitHub Pages backend).

```
nullvpn.net  A     185.199.108–111.153  (Cloudflare proxy → GitHub Pages)
nullvpn.net  AAAA  2606:50c0:8000–8003::153  (Cloudflare proxy → GitHub Pages)
```

---

## IPv6 Parity Status

| Record | IPv4 | IPv6 | Parity |
|--------|------|------|--------|
| `node*.nullvpn.net` | ✅ | ✅ | Full |
| `pool*.nullvpn.net` | ✅ | ✅ | Full |
| `vpn.nullvpn.net` | ✅ | ✅ | Full |
| `nullvpn.net` | ✅ Proxied | ✅ Proxied | Full |
| `builds.nullvpn.net` | ❌ | ✅ | IPv6 only (runner OK) |
| `rescue.nullvpn.net` | ❌ | ✅ Proxied | IPv6 only |
| `panel.nullvpn.net` | ✅ Proxied | ❌ | IPv4 only |
