# Test Node Policy: pool1 / node1 as Canonical Test Target

> Last updated: 2026-06-26

---

## Policy Statement

**`pool1.nullvpn.net` / `node1` (GCP `us-east1-b`) is the designated test target for ALL CI/CD workflows.**

Whenever a workflow generates both a production config and a test config, the test run MUST target `node1`/`pool1` before any production deployment proceeds. Deployment to prod nodes (node3, node4, node5) is blocked until node1 test passes.

---

## Rationale

- node1 mirrors prod topology (GCP, same OS/stack as node4 in the same zone `us-east1-b`)
- Failures on node1 are cheap to roll back — no client traffic impact
- Consistent test target = reproducible baseline across all workflow runs

---

## Test Target Constants

All workflows must reference these constants — never hardcode IPs:

```yaml
env:
  TEST_NODE: node1
  TEST_POOL: pool1
  TEST_HOST_IPV4: 34.24.103.218
  TEST_HOST_IPV6: "2600:1900:4021:3a6::"
  TEST_HOST_DNS: pool1.nullvpn.net
  TEST_RUNNER: nullvpn-dev-workstation
  PROD_RUNNER: vps-01
```

---

## Workflow Gate Pattern

All config-generating workflows must follow this two-stage gate:

```
[generate-config] → [test-on-node1] → (pass?) → [deploy-to-prod-nodes]
                                     → (fail?) → STOP + notify
```

See `.github/workflows/template-config-deploy.yml` for the canonical reusable implementation.

---

## What Counts as "Test Passed"

1. Config file generated without errors
2. Config pushed to node1 via SSH
3. VPN service restarted on node1 without failure
4. Connectivity probe passes: node1 responds on expected port within 10s
5. No error in service log (last 20 lines) post-restart

All 5 checks must pass. Partial pass = workflow failure.
