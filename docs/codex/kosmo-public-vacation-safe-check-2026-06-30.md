# Kosmo Public Vacation Safe Check

Generated: 2026-06-30T16:22:45Z
Status: `public_vacation_safe_check_passed`

## Purpose

Source-free Ferienmodus fallback. The new check aggregates the public-safe gates
that should stay green before a daemon block moves on to website, references or
asset work.

## New Guard

- Script: `scripts/public-vacation-safe-check.mjs`
- Default report dir: `.tmp/public-vacation-safe-check`
- Reads private content: no
- Starts server: no
- Writes public-ready: no
- Touches generated review artifacts by default: no

## Aggregated Checks

| Check | Status | Scope |
| --- | --- | --- |
| `public_demo_gate` | `passed` | public entries, public model previews, media rights gate |
| `public_route_gate_alignment` | `passed` | public gate route list vs route-content smoke list |
| `public_runtime_boundary` | `passed` | static export runtime breaker scan |
| `public_leak_pattern_negative_smoke` | `passed` | private path/source marker detector fixtures |

## Validation

- `node scripts/public-vacation-safe-check.mjs`
- `npx eslint scripts/public-vacation-safe-check.mjs`
- Startup gates run before this block:
  - `npm run kosmo:codex-morning-routine-run`
  - `npm run kosmo:owner-unlock-pipeline-checkpoint`
  - `npm run kosmo:source-independent-work-queue`
  - `npm run kosmo:data-lane-sweep`
  - `npm run public:gate-check`

## Result

- Source-independent queue remains at 0 Codex-executable tasks.
- Public-ready remains `0`.
- Source root remains owner-blocked.
- Private inventory remains blocked.
- This gives the daemon a fast, source-free public safety gate for future
  fallback blocks without modifying existing reports.
