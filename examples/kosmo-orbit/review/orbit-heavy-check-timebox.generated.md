# KosmoOrbit Heavy Check Timebox

Generated: 2026-06-02T22:24:41.144Z
Status: `orbit_heavy_check_timebox_blocked`

Local review-only report. It does not push, deploy, upload, spend money or modify external accounts.

## Summary

- checks: 6/9 passed
- failed: 3
- timed out: 3

## Environment

- node: `v24.15.0`
- platform: `darwin`
- arch: `arm64`
- next package: `^15.5.18`
- typescript package: `^5.9.3`
- eslint package: `^9.39.4`
- CI: `1`
- NEXT_TELEMETRY_DISABLED: `1`

## Checks

| Check | Status | Duration | Command | Output |
| --- | --- | ---: | --- | --- |
| `git_status_no_ahead` | `passed` | 81 ms | `git status --short --branch --no-ahead-behind` | M examples/kosmo-projects/kosmo-demo-001/orbit/role-shell-prototype.generated.json \| M examples/kosmo-projects/kosmo-demo-001/orbit/role-shell-smoke.generated.json \| M examples/kosmo-projects/kosmo-demo-001/orbit/role-shell-smoke.generated.md \| M examples/kosmo-projects/kosmo-demo-001/orbit/role-ui-smoke.generated.json \| M examples/kosmo-projects/kosmo-demo-001/orbit/role-ui-smoke.generated.md \| M examples/kosmo-projects/kosmo-demo-001/orbit/role-ui-variants.generated.json \| M examples/kosmo-projects/kosmo-demo-001/orbit/role-ui-variants.generated.md \| M scripts/kosmo-orbit-heavy-check-timebox.mjs |
| `toolchain_probe` | `passed` | 33 ms | `/Users/andrinbaumann/.nvm/versions/node/v24.15.0/bin/node -e const {existsSync, readFileSync}=require('node:fs');const pkg=JSON.parse(readFileSync('package.json','utf8'));const maybe=(path)=>existsSync(path)?require(path).version:null;const report={node:process.version,npm:process.env.npm_config_user_agent\|\|null,platform:process.platform,arch:process.arch,next:pkg.dependencies?.next\|\|pkg.devDependencies?.next\|\|null,typescript:pkg.dependencies?.typescript\|\|pkg.devDependencies?.typescript\|\|null,eslint:pkg.dependencies?.eslint\|\|pkg.devDependencies?.eslint\|\|null,nextPackage:maybe('./node_modules/next/package.json'),typescriptPackage:maybe('./node_modules/typescript/package.json'),eslintPackage:maybe('./node_modules/eslint/package.json'),tsconfig:existsSync('tsconfig.json'),eslintConfig:existsSync('eslint.config.mjs'),nextTelemetryDisabled:process.env.NEXT_TELEMETRY_DISABLED\|\|null,ci:process.env.CI\|\|null};console.log(JSON.stringify(report));` | {"node":"v24.15.0","npm":"npm/11.12.1 node/v24.15.0 darwin arm64 workspaces/false","platform":"darwin","arch":"arm64","next":"^15.5.18","typescript":"^5.9.3","eslint":"^9.39.4","nextPackage":"15.5.18","typescriptPackage":"5.9.3","eslintPackage":"9.39.4","tsconfig":true,"eslintConfig":true,"nextTelemetryDisabled":null,"ci":null} |
| `kosmosketch_adapter` | `passed` | 173 ms | `npm run kosmo:orbit-kosmosketch-adapter` | > architecture-cosmos@0.1.0 kosmo:orbit-kosmosketch-adapter \| > node scripts/kosmo-orbit-kosmosketch-adapter-check.mjs \| KosmoOrbit KosmoSketch adapter check \| Status: kosmosketch_adapter_contract_passed \| Checks: 20/20 \| Wrote: examples/kosmo-orbit/review/orbit-kosmosketch-adapter.generated.md |
| `route_smoke` | `passed` | 185 ms | `npm run kosmo:orbit-route-smoke` | > architecture-cosmos@0.1.0 kosmo:orbit-route-smoke \| > node scripts/kosmo-orbit-route-smoke.mjs \| KosmoOrbit route smoke \| Status: orbit_route_smoke_passed \| Checks: 246/246 \| Wrote: examples/kosmo-orbit/review/orbit-route-smoke.generated.md |
| `responsive_audit` | `passed` | 164 ms | `npm run kosmo:orbit-responsive-audit` | > architecture-cosmos@0.1.0 kosmo:orbit-responsive-audit \| > node scripts/kosmo-orbit-responsive-audit.mjs \| KosmoOrbit responsive audit \| Status: orbit_responsive_audit_passed \| Checks: 34/34 \| Wrote: examples/kosmo-orbit/review/orbit-responsive-audit.generated.md |
| `full_review` | `passed` | 5481 ms | `npm run kosmo:orbit-full-review` | KosmoOrbit full review \| Workspace: examples/kosmo-orbit/workspace.demo.json \| Project: examples/kosmo-projects/kosmo-demo-001 \| Status: orbit_full_review_ready_for_review_mode \| Steps: 33/33 passed \| Panel state: review_only \| Design open mode: context_review_only \| Wrote: examples/kosmo-orbit/review/orbit-full-review.generated.md |
| `typescript_no_emit` | `timed_out` | 10010 ms | `node_modules/.bin/tsc --noEmit --pretty false --incremental false` | - |
| `lint` | `timed_out` | 10011 ms | `npm run lint` | > architecture-cosmos@0.1.0 lint \| > eslint . |
| `next_static_build` | `timed_out` | 10007 ms | `node_modules/.bin/next build` | - |

## Next Actions

- Keep this as the current heavy-check blocker record.
- Use the toolchain_probe and environment snapshot to diagnose whether the timeout is caused by local Node/Next/SWC tooling.
- Treat TypeScript, lint and Next build timeouts as local heavy-check/tooling blockers until they complete with logs.
- Rerun this timebox after the local Node/Next toolchain is healthy, before relying on the heavy checks as publish evidence.
