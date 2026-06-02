# KosmoOrbit Heavy Check Timebox

Generated: 2026-06-02T20:45:46.157Z
Status: `orbit_heavy_check_timebox_blocked`

Local review-only report. It does not push, deploy, upload, spend money or modify external accounts.

## Summary

- checks: 5/8 passed
- failed: 3
- timed out: 3

## Checks

| Check | Status | Duration | Command | Output |
| --- | --- | ---: | --- | --- |
| `git_status_no_ahead` | `passed` | 25 ms | `git status --short --branch --no-ahead-behind` | M examples/kosmo-projects/kosmo-demo-001/orbit/role-shell-smoke.generated.json \| M examples/kosmo-projects/kosmo-demo-001/orbit/role-shell-smoke.generated.md \| M examples/kosmo-projects/kosmo-demo-001/orbit/role-ui-smoke.generated.json \| M examples/kosmo-projects/kosmo-demo-001/orbit/role-ui-smoke.generated.md \| M examples/kosmo-projects/kosmo-demo-001/orbit/role-ui-variants.generated.json \| M examples/kosmo-projects/kosmo-demo-001/orbit/role-ui-variants.generated.md \| M package.json \| ?? scripts/kosmo-orbit-heavy-check-timebox.mjs |
| `kosmosketch_adapter` | `passed` | 163 ms | `npm run kosmo:orbit-kosmosketch-adapter` | > architecture-cosmos@0.1.0 kosmo:orbit-kosmosketch-adapter \| > node scripts/kosmo-orbit-kosmosketch-adapter-check.mjs \| KosmoOrbit KosmoSketch adapter check \| Status: kosmosketch_adapter_contract_passed \| Checks: 20/20 \| Wrote: examples/kosmo-orbit/review/orbit-kosmosketch-adapter.generated.md |
| `route_smoke` | `passed` | 174 ms | `npm run kosmo:orbit-route-smoke` | > architecture-cosmos@0.1.0 kosmo:orbit-route-smoke \| > node scripts/kosmo-orbit-route-smoke.mjs \| KosmoOrbit route smoke \| Status: orbit_route_smoke_passed \| Checks: 246/246 \| Wrote: examples/kosmo-orbit/review/orbit-route-smoke.generated.md |
| `responsive_audit` | `passed` | 153 ms | `npm run kosmo:orbit-responsive-audit` | > architecture-cosmos@0.1.0 kosmo:orbit-responsive-audit \| > node scripts/kosmo-orbit-responsive-audit.mjs \| KosmoOrbit responsive audit \| Status: orbit_responsive_audit_passed \| Checks: 34/34 \| Wrote: examples/kosmo-orbit/review/orbit-responsive-audit.generated.md |
| `full_review` | `passed` | 5157 ms | `npm run kosmo:orbit-full-review` | KosmoOrbit full review \| Workspace: examples/kosmo-orbit/workspace.demo.json \| Project: examples/kosmo-projects/kosmo-demo-001 \| Status: orbit_full_review_ready_for_review_mode \| Steps: 33/33 passed \| Panel state: review_only \| Design open mode: context_review_only \| Wrote: examples/kosmo-orbit/review/orbit-full-review.generated.md |
| `typescript_no_emit` | `timed_out` | 60026 ms | `node_modules/.bin/tsc --noEmit --pretty false --incremental false` | - |
| `lint` | `timed_out` | 60022 ms | `npm run lint` | > architecture-cosmos@0.1.0 lint \| > eslint . |
| `next_static_build` | `timed_out` | 89950 ms | `node_modules/.bin/next build` | - |

## Next Actions

- Keep this as the current heavy-check blocker record.
- Treat TypeScript, lint and Next build timeouts as local heavy-check/tooling blockers until they complete with logs.
- Rerun this timebox after the local Node/Next toolchain is healthy, before relying on the heavy checks as publish evidence.
