# KosmoOrbit Local Runtime Bridge

Generated: 2026-06-06T03:05:51.868Z
Status: `local_runtime_bridge_passed`
Input: `examples/kosmo-orbit/runtime/kosmo-night-status.demo.json`
Mode: `external_local_status_import`

Review-only bridge from the local KOSMO Night Status into KosmoOrbit. It reads a JSON snapshot and writes report artifacts only; it does not launch processes, start models, scan private files, upload, publish, access external accounts or spend money.

## Summary

- progress: `[#####################---] 88%`
- checks: 23/23 passed
- ready lanes: 7
- blocked lanes: 1

## Lanes

| Lane | Status | Evidence | Next |
| --- | --- | --- | --- |
| `odysseus-runtime` | `ready` | status=running, chroma=running, url=http://127.0.0.1:7860 | Odysseus laufen lassen und bei Fehlern odysseus-vanilla-smoke.sh erneut ausfuehren. |
| `kosmo-model` | `ready` | KOSMO Ollama enthaelt qwen2.5-coder:1.5b. | odysseus-kosmo-model-sync.sh apply ausfuehren, falls der Endpoint driftet. |
| `desktop-artifacts` | `ready` | odysseus-vanilla-desktop-manifest.json=present, Odysseus-vanilla-linux-workstation.zip=present, KOSMO-Desktop-v2-linux-workstation.zip=present, ArchitekturkosmosMac.app=present | Vanilla/Desktop-Gates neu bauen, falls Manifest oder ZIP fehlt. |
| `home-pc-handover` | `ready` | KOSMO-home-pc-linux-handover.zip: OK | kosmo-home-pc-linux-handover-zip.sh neu ausfuehren und Checksum pruefen. |
| `home-pc-start-readiness` | `ready` | status=home_pc_start_dry_run_passed, checks=55/55, warnings=0 | kosmo-home-pc-start-dry-run.sh ausfuehren und fehlende Pflichtchecks beheben. |
| `kosmo-orbit` | `ready` | repo_commit=37ad7a0, report=present | Orbit bleibt review-only; naechster Hebel ist die sichtbare Odysseus/KOSMO-Statusbruecke. |
| `kosmo-orbit-render-smoke` | `ready` | status=orbit_local_render_smoke_passed, checks=9/9, url=http://localhost:3107/orbit/ | Auf der Orbit-Review-Branch lokalen Server starten und kosmo:orbit-local-render-smoke ausfuehren. |
| `github-separation` | `blocked` | Decision pack proposed repo=Imperigo/Architekturkosmos_Codex_Starter; import_readiness=passed; waiting for owner-go. | Eigenes Imperigo/Architekturkosmos_Codex_Starter Repo anlegen oder Import explizit freigeben. |

## Sources

- local starter commit: `4b1ecb7`
- cloud starter commit: `863dcde`
- Orbit website commit: `37ad7a0`

## Home PC Handover

- platform: `linux-workstation`
- zip: `dist/KOSMO-home-pc-linux-handover.zip`
- checksum: `dist/KOSMO-home-pc-linux-handover.zip.sha256`
- manifest: `tmp/kosmo-home-pc-linux-handover-manifest.json`
- start dry-run script: `scripts/kosmo-home-pc-start-dry-run.sh`
- start dry-run report: `tmp/kosmo-home-pc-start-dry-run.json`
- start dry-run status: `home_pc_start_dry_run_passed`
- start dry-run checks: `55/55`
- doctor script: `scripts/kosmo-home-pc-handover-doctor.sh`
- doctor report: `tmp/kosmo-home-pc-handover-doctor.json`
- doctor status: `home_pc_handover_doctor_passed`
- doctor checks: `18/18`
- purpose: Machine-readable Linux handover index for the future Home-PC setup.

First commands:
- `shasum -a 256 -c KOSMO-home-pc-linux-handover.zip.sha256`
- `unzip KOSMO-home-pc-linux-handover.zip -d KOSMO-home-pc-linux-handover`
- `cd KOSMO-home-pc-linux-handover`
- `./scripts/kosmo-home-pc-start-here.sh`
- `./scripts/kosmo-home-pc-handover-index.sh`
- `./scripts/kosmo-home-pc-handover-doctor.sh`
- `./scripts/kosmo-home-pc-start-dry-run.sh`
- `less KOSMO-home-pc-linux-handover/tmp/kosmo-home-pc-linux-first-run-plan.md`
- `less KOSMO-home-pc-linux-handover/tmp/kosmo-next-action-queue.md`
- `less KOSMO-home-pc-linux-handover/tmp/kosmo-runway-report.md`
- `less KOSMO-home-pc-linux-handover/tmp/kosmo-closeout-aggregator.md`
- `less KOSMO-home-pc-linux-handover/tmp/kosmo-night-status.md`
- `less KOSMO-home-pc-linux-handover/tmp/kosmo-home-pc-linux-handover-manifest.json`

## Next-Action Queue

- status: `next_action_queue_ready`
- ready actions: 4
- blocked actions: 1

| Action | Lane | Status | Owner-Go | Autonomous |
| --- | --- | --- | --- | --- |
| `refresh-control-spine` | `control-spine` | `ready` | `false` | `true` |
| `verify-handover-zip` | `home-pc-handover` | `ready` | `false` | `true` |
| `home-pc-first-evening` | `home-pc-linux` | `waiting_for_target_machine` | `false` | `false` |
| `starter-github-owner-go` | `github-separation` | `blocked` | `true` | `false` |
| `orbit-review-branch` | `kosmo-orbit` | `ready` | `false` | `false` |
| `odysseus-runtime-watch` | `odysseus-runtime` | `ready` | `false` | `true` |

## Runway Report

- status: `runway_report_ready`
- phases: 4
- Tonight On Mac: Keep the local KOSMO/Odysseus state current without production actions.
- First Linux Evening: Start the future Home-PC from evidence, not memory.
- Owner-Go Only: Keep irreversible or external work blocked until explicit approval.
- After Home-PC Boots: Move from packaged readiness into local runtime operation.

## Closeout Aggregator

- status: `closeout_aggregator_ready`
- checks: 13/13
- warnings: 0
- starter commit: `4b1ecb7`
- orbit commit: `37ad7a0`
- Home-PC dry-run: `home_pc_start_dry_run_passed` (55/55)
- Home-PC doctor: `home_pc_handover_doctor_passed` (18/18)
- handover ZIP: `dist/KOSMO-home-pc-linux-handover.zip`
- handover checksum: `KOSMO-home-pc-linux-handover.zip: OK`

Read order:
- `tmp/kosmo-closeout-aggregator.md`
- `tmp/kosmo-night-status.md`
- `tmp/kosmo-next-action-queue.md`
- `tmp/kosmo-runway-report.md`
- `tmp/kosmo-home-pc-linux-first-run-plan.md`
- `tmp/kosmo-home-pc-handover-doctor.md`
- `tmp/kosmo-home-pc-start-dry-run.md`
- `tmp/kosmo-home-pc-linux-handover-manifest.json`
- `docs/home_station/KOSMO_ORBIT_REVIEW_HANDOFF.md`

Owner-Go blockers:
- Dedicated Starter repository must exist before Starter push.
- Owner must explicitly approve first import branch.
- Website repository stays separate from Starter source.
- Public deploy remains blocked until explicit release decision.

Forbidden actions:
- no production deploy
- no secrets changes
- no external account mutation
- no push to main
- no Starter tree pushed into Website repository
- no irreversible file or data action

## Loop Closeout Dashboard

- status: `loop_closeout_dashboard_ready`
- checks: 14/14
- progress: `[#####################---] 88%`
- starter commit: `58ee646`
- runtime bundle: `Architekturkosmos_Codex_Starter_Local_58ee646_20260606-0502.bundle`
- safest next action: `refresh-control-spine`
- command: `./scripts/kosmo-github-import-readiness.sh && ./scripts/kosmo-home-pc-linux-first-run-plan.sh && ./scripts/kosmo-home-pc-start-dry-run.sh && ./scripts/kosmo-night-status.sh`

## GitHub Separation Decision

- status: `owner_go_required`
- recommended repository: `Imperigo/Architekturkosmos_Codex_Starter`
- first import branch: `kosmo-starter-initial-import-20260606`
- website repository: `Imperigo/Architektur-Cosmos`
- import readiness: `github_import_readiness_passed`
- import readiness checks: `19/19`
- import readiness report: `tmp/kosmo-github-import-readiness.json`
- evidence: Decision pack proposed repo=Imperigo/Architekturkosmos_Codex_Starter; import_readiness=passed; waiting for owner-go.

Blocked until:
- Dedicated Starter repository exists.
- Owner explicitly approves first import.
- First push uses a review branch, not main.
- Website repository remains separate.

Forbidden without Owner-Go:
- create GitHub repository
- push to main
- push starter tree into website repository
- change secrets
- enable deployments

## Checks

| Check | Status | Meaning |
| --- | --- | --- |
| `status_file_exists` | `passed` | Night status input file exists. |
| `schema_version` | `passed` | Night status schema version is 0.1. |
| `goal_present` | `passed` | Night status carries the KOSMO control-spine goal. |
| `progress_number` | `passed` | Progress percent is a valid number between 0 and 100. |
| `progress_bar_present` | `passed` | Progress bar is present for UI handoff. |
| `required_lanes_present` | `passed` | All KOSMO control-spine lanes are present. |
| `ready_lane_majority` | `passed` | At least seven of eight lanes are ready. |
| `runtime_ready` | `passed` | Odysseus runtime lane is ready. |
| `model_ready` | `passed` | KOSMO Ollama model lane is ready. |
| `handover_ready` | `passed` | Home-PC handover lane is ready. |
| `home_pc_start_ready` | `passed` | Home-PC start readiness lane is ready. |
| `orbit_render_smoke_ready` | `passed` | Orbit local render smoke lane is ready and visible. |
| `github_separation_blocked` | `passed` | GitHub separation remains blocked until a dedicated Starter repo or explicit import approval exists. |
| `github_import_readiness_visible` | `passed` | GitHub import readiness is visible while Owner-Go remains blocked. |
| `next_action_queue_visible` | `passed` | Next-action queue is visible for allowed, waiting and blocked work. |
| `runway_report_visible` | `passed` | Runway report is visible for Mac, Linux, Owner-Go and post-boot phases. |
| `closeout_aggregator_visible` | `passed` | Closeout aggregator is visible as the Home-PC read order and final evidence packet. |
| `loop_closeout_dashboard_visible` | `passed` | Loop closeout dashboard is visible with safest next action. |
| `home_pc_doctor_visible` | `passed` | Home-PC handover doctor evidence is visible in the closeout packet. |
| `orbit_render_smoke_closeout_visible` | `passed` | Orbit render smoke evidence is visible in the closeout packet. |
| `policy_flags_present` | `passed` | All safety policy flags are present and true. |
| `sources_present` | `passed` | Local starter, cloud starter and Orbit website sources are represented. |
| `no_private_path_required` | `passed` | Bridge can run from a repo-local demo status without a private local path. |

## Next Actions

- GitHub Separation Decision Pack owner-seitig bestaetigen oder Repo-Erstellung weiter blockiert lassen.
- Dediziertes GitHub-Repo fuer den Starter anlegen oder Import-Ziel freigeben.
- Home-PC Linux Handover auf Zielmaschine testen und erste Memory/Worker-Sync-Probe fahren.
