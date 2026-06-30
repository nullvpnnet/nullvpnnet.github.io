/**
 * backend-routes-stub.ts
 * NullVPN — AWG-only control plane: 7 canonical backend endpoints
 *
 * Minimum viable set for AWG-only operation:
 *   Core (4):       POST /v1/nodes/register-self
 *                   POST /v1/users/:userId/provision
 *                   POST /v1/users/:userId/reprovision
 *                   POST /v1/nodes/:nodeId/sync
 *
 *   Operational (3): POST /v1/nodes/heartbeat
 *                    POST /v1/drift/report
 *                    GET  /v1/health/summary
 *
 * DEPRECATED (returns 410 Gone):
 *   POST /v1/deploy   — GCP SSH-based deploy — use superbundle.sh instead
 *
 * Authentication:
 *   Admin endpoints: Bearer ${ADMIN_KEY} header
 *   Node endpoints:  HMAC-SHA256 sig in X-Node-Sig header (PROVISIONER_SECRET)
 *
 * This file is a typed stub / reference implementation.
 * Adapt to your Express/Fastify/NestJS router as appropriate.
 */

import type { Request, Response, NextFunction, Router } from 'express';
import crypto from 'crypto';

// ── Type definitions ──────────────────────────────────────────────────────────

interface AwgNode {
  id: string;
  name: string;
  serverip: string;
  publickey: string;
  listenport: number;
  cidr: string;
  obfuscation_params: Record<string, string | number>;
  status: 'online' | 'offline' | 'degraded';
  peer_count: number;
  last_heartbeat: Date | null;
}

interface VpnPeer {
  id: string;
  user_id: string;
  node_id: string;
  client_pubkey: string;
  allowed_ip: string;  // single /32 from node CIDR pool
  config_encrypted: string;  // AES-256-GCM encrypted client config blob
  created_at: Date;
  revoked_at: Date | null;
}

// ── Middleware ────────────────────────────────────────────────────────────────

/** Verify Bearer ADMIN_KEY on admin endpoints */
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const auth = req.headers.authorization ?? '';
  if (auth !== `Bearer ${process.env.ADMIN_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

/** Verify HMAC-SHA256 node signature for node self-call endpoints */
const requireNodeSig = (req: Request, res: Response, next: NextFunction) => {
  const sig   = req.headers['x-node-sig'] as string ?? '';
  const nonce = req.headers['x-node-nonce'] as string ?? '';
  const expected = crypto
    .createHmac('sha256', process.env.PROVISIONER_SECRET ?? '')
    .update(nonce + JSON.stringify(req.body))
    .digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return res.status(401).json({ error: 'Invalid node signature' });
  }
  next();
};

// ── Route registration ────────────────────────────────────────────────────────

export function registerAwgControlPlaneRoutes(router: Router): void {

  // ============================================================
  // DEPRECATED: POST /v1/deploy  (GCP SSH-based)
  // Returns 410 Gone — use superbundle.sh on the target node
  // ============================================================
  router.post('/v1/deploy', (_req: Request, res: Response) => {
    res.status(410).json({
      error: 'Gone',
      message:
        'POST /v1/deploy is deprecated. ' +
        'Deploy nodes using superbundle.sh directly on the VPS. ' +
        'Nodes self-register via POST /v1/nodes/register-self.',
      migration: 'https://docs.nullvpn.net/ops/node-deploy-migration',
    });
  });

  // ============================================================
  // CORE 1: POST /v1/nodes/register-self
  // Called by superbundle/addon Phase 11 on first boot and re-deploy.
  // Upserts node record; stores obfuscation_params for client config gen.
  // ============================================================
  router.post('/v1/nodes/register-self', requireNodeSig, async (req: Request, res: Response) => {
    try {
      const {
        name, serverip, publickey, listenport, cidr, obfuscation_params, status
      } = req.body as Partial<AwgNode>;

      if (!name || !serverip || !publickey || !listenport || !cidr) {
        return res.status(400).json({ error: 'Missing required fields: name, serverip, publickey, listenport, cidr' });
      }

      // Upsert into awgnodes table (conflict on name or serverip)
      // const node = await db.awgNodes.upsert({ name, serverip, publickey, listenport, cidr, obfuscation_params, status, last_heartbeat: new Date() });
      const node = { id: 'stub-node-id', name, serverip, status: status ?? 'online' } as AwgNode;

      res.status(200).json({ id: node.id, name: node.name, status: node.status, message: 'Node registered' });
    } catch (err) {
      res.status(500).json({ error: 'Registration failed', detail: String(err) });
    }
  });

  // ============================================================
  // CORE 2: POST /v1/users/:userId/provision
  // Provisions a new VPN peer for a user on the least-loaded node.
  // Uses awg genkey/pubkey on node (via node agent) OR generates
  // keys server-side and sends to node via /sync.
  // ============================================================
  router.post('/v1/users/:userId/provision', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { preferred_node_id } = req.body as { preferred_node_id?: string };

      // 1. Select node (least peer_count, status=online)
      // const node = await db.awgNodes.findLeastLoaded(preferred_node_id);
      const node = { id: 'stub-node-id', cidr: '10.77.0.0/16', obfuscation_params: {} } as AwgNode;

      // 2. Generate client keypair — MUST use awg genkey on node or validated Curve25519 here
      // const clientPrivkey = execOnNode(node.id, 'awg genkey');
      // const clientPubkey  = execOnNode(node.id, `echo ${clientPrivkey} | awg pubkey`);
      const clientPrivkey = '[awg-genkey-output]';
      const clientPubkey  = '[awg-pubkey-output]';

      // 3. Allocate /32 IP from node CIDR pool
      // const allowedIp = await db.vpnPeers.allocateIp(node.cidr);
      const allowedIp = '10.77.0.2';

      // 4. INSERT vpn_peers record (config_encrypted = AES-256-GCM encrypted .conf)
      // await db.vpnPeers.create({ user_id: userId, node_id: node.id, client_pubkey: clientPubkey, allowed_ip: allowedIp });

      // 5. Apply peer to live interface via /sync
      // await notifyNodeSync(node.id);

      // 6. Return config bundle to caller (app serves QR/conf download)
      const configBundle = buildClientConfig(node, clientPrivkey, clientPubkey, allowedIp);

      res.status(201).json({
        peer_id:    'stub-peer-id',
        node_id:    node.id,
        allowed_ip: allowedIp,
        config:     configBundle,  // base64 or raw .conf — encrypt in transit
      });
    } catch (err) {
      res.status(500).json({ error: 'Provision failed', detail: String(err) });
    }
  });

  // ============================================================
  // CORE 3: POST /v1/users/:userId/reprovision
  // Revokes existing peer and provisions a new one.
  // Used for key rotation or node migration.
  // ============================================================
  router.post('/v1/users/:userId/reprovision', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { reason } = req.body as { reason?: string };

      // 1. Find existing active peer
      // const existing = await db.vpnPeers.findActive(userId);
      // 2. Remove from live interface: awg set amn0 peer <pubkey> remove
      // 3. Revoke in DB: vpn_peers.revoked_at = now()
      // 4. Provision fresh peer (same logic as provision)
      // await revokeAndReprovision(userId, reason);

      res.status(200).json({
        message:    'Peer reprovisioned',
        user_id:    userId,
        reason:     reason ?? 'manual',
        new_peer_id: 'stub-new-peer-id',
      });
    } catch (err) {
      res.status(500).json({ error: 'Reprovision failed', detail: String(err) });
    }
  });

  // ============================================================
  // CORE 4: POST /v1/nodes/:nodeId/sync
  // Returns desired peer list for node.  Node calls this on boot
  // (Phase 12) and drift timer.  Response fed directly to awg syncconf.
  // ============================================================
  router.post('/v1/nodes/:nodeId/sync', requireNodeSig, async (req: Request, res: Response) => {
    try {
      const { nodeId } = req.params;

      // Fetch all non-revoked peers for this node
      // const peers = await db.vpnPeers.findActiveByNode(nodeId);
      const peers: VpnPeer[] = []; // stub

      const peerBlocks = peers.map(p => ({
        publickey:  p.client_pubkey,
        allowed_ip: p.allowed_ip,
      }));

      res.status(200).json({
        node_id:    nodeId,
        peers:      peerBlocks,
        peer_count: peerBlocks.length,
        synced_at:  new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({ error: 'Sync failed', detail: String(err) });
    }
  });

  // ============================================================
  // OPERATIONAL 1: POST /v1/nodes/heartbeat
  // Node reports liveness every 5min (drift timer).
  // Updates last_heartbeat + status in DB.
  // ============================================================
  router.post('/v1/nodes/heartbeat', requireNodeSig, async (req: Request, res: Response) => {
    try {
      const { node_id, status, awg_version, peer_count } = req.body as {
        node_id: string;
        status: string;
        awg_version?: string;
        peer_count?: number;
      };

      if (!node_id) return res.status(400).json({ error: 'node_id required' });

      // await db.awgNodes.update(node_id, { status, last_heartbeat: new Date(), awg_version, peer_count });

      res.status(200).json({ ok: true, node_id, received_at: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ error: 'Heartbeat failed', detail: String(err) });
    }
  });

  // ============================================================
  // OPERATIONAL 2: POST /v1/drift/report
  // Node reports current live peer count for drift detection.
  // If drift > threshold, backend queues a sync push.
  // ============================================================
  router.post('/v1/drift/report', requireNodeSig, async (req: Request, res: Response) => {
    try {
      const { node_id, peer_count, status } = req.body as {
        node_id: string;
        peer_count: number;
        status: string;
      };

      // const dbPeerCount = await db.vpnPeers.countActive(node_id);
      const dbPeerCount = 0; // stub
      const drift = Math.abs(peer_count - dbPeerCount);
      const action = drift > 0 ? 'sync_queued' : 'ok';

      // if (drift > 0) await queueSyncJob(node_id);

      res.status(200).json({
        node_id,
        reported_peers: peer_count,
        db_peers:       dbPeerCount,
        drift,
        action,
      });
    } catch (err) {
      res.status(500).json({ error: 'Drift report failed', detail: String(err) });
    }
  });

  // ============================================================
  // OPERATIONAL 3: GET /v1/health/summary
  // Returns aggregate node/peer health for UI status dashboard.
  // Replaces manual node-management actions in admin panel.
  // ============================================================
  router.get('/v1/health/summary', requireAdmin, async (_req: Request, res: Response) => {
    try {
      // const nodes = await db.awgNodes.findAll();
      // const peers = await db.vpnPeers.countAll();
      const summary = {
        nodes_total:    0,  // stub
        nodes_online:   0,
        nodes_offline:  0,
        nodes_degraded: 0,
        peers_active:   0,
        peers_revoked:  0,
        last_updated:   new Date().toISOString(),
      };

      res.status(200).json(summary);
    } catch (err) {
      res.status(500).json({ error: 'Health summary failed', detail: String(err) });
    }
  });
}

// ── Helper: build client .conf with AWG2 obfuscation params ──────────────────
function buildClientConfig(
  node: AwgNode,
  clientPrivkey: string,
  clientPubkey: string,
  allowedIp: string,
): string {
  // obfuscation_params must be fetched from awgnodes DB record (stored at register-self)
  const o = node.obfuscation_params as Record<string, string | number>;
  return [
    '[Interface]',
    `PrivateKey = ${clientPrivkey}`,
    `Address = ${allowedIp}/32`,
    `DNS = 1.1.1.1, 8.8.8.8`,
    `# AWG2 client obfuscation (must match server)`,
    `S1 = ${o.S1 ?? 0}`,
    `S2 = ${o.S2 ?? 0}`,
    `H1 = ${o.H1 ?? ''}`,
    `H2 = ${o.H2 ?? ''}`,
    `I1 = ${o.I1 ?? 1}`,
    '',
    '[Peer]',
    `PublicKey = ${node.publickey}`,
    `Endpoint = ${node.serverip}:${node.listenport}`,
    `AllowedIPs = 0.0.0.0/0, ::/0`,
    `PersistentKeepalive = 25`,
  ].join('\n');
}
