# CI/CD Runner Topology

> Last updated: 2026-06-26

## Self-Hosted Runners

| Runner Label | Host | Role | Environment | Status |
|---|---|---|---|---|
| `vps-01` | VPS-01 (cloud server) | Production deployments | `prod` | ✅ Active |
| `nullvpn-dev-workstation` | Local dev workstation | Test / staging runs | `test` | ✅ Active |

## Runner Usage Rules

- **Production workflows** (deploys to `nullvpn.net`) → `runs-on: [self-hosted, vps-01]`
- **Test / staging workflows** (PR checks, integration tests) → `runs-on: [self-hosted, nullvpn-dev-workstation]`
- **Utility workflows** (cleanup, one-off scripts with no environment dependency) → `runs-on: ubuntu-latest` (GitHub-hosted)

## Runner Registration

Runners must be registered in the GitHub repository under:
**Settings → Actions → Runners → New self-hosted runner**

Each runner should carry these labels after registration:

```
vps-01               → labels: self-hosted, linux, vps-01
nullvpn-dev-workstation → labels: self-hosted, linux, nullvpn-dev-workstation
```

## Security Notes

- Self-hosted runners must NOT be used for PRs from forked repositories (fork PR isolation risk).
- Runner tokens must be rotated on a regular basis (recommended: 90 days).
- Ensure `ACTIONS_RUNNER_HOOK_JOB_STARTED` and `ACTIONS_RUNNER_HOOK_JOB_COMPLETED` hooks are configured for audit logging on both runners.
