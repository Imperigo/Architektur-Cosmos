# KosmoOrbit Local Runtime Bridge

Generated: 2026-06-06T01:13:48.863Z
Status: `local_runtime_bridge_passed`
Input: `examples/kosmo-orbit/runtime/kosmo-night-status.demo.json`
Mode: `external_local_status_import`

Review-only bridge from the local KOSMO Night Status into KosmoOrbit. It reads a JSON snapshot and writes report artifacts only; it does not launch processes, start models, scan private files, upload, publish, access external accounts or spend money.

## Summary

- progress: `[#####################---] 86%`
- checks: 16/16 passed
- ready lanes: 6
- blocked lanes: 1

## Lanes

| Lane | Status | Evidence | Next |
| --- | --- | --- | --- |
| `odysseus-runtime` | `ready` | status=running, chroma=running, url=http://127.0.0.1:7860 | Odysseus laufen lassen und bei Fehlern odysseus-vanilla-smoke.sh erneut ausfuehren. |
| `kosmo-model` | `ready` | KOSMO Ollama enthaelt qwen2.5-coder:1.5b. | odysseus-kosmo-model-sync.sh apply ausfuehren, falls der Endpoint driftet. |
| `desktop-artifacts` | `ready` | odysseus-vanilla-desktop-manifest.json=present, Odysseus-vanilla-linux-workstation.zip=present, KOSMO-Desktop-v2-linux-workstation.zip=present, ArchitekturkosmosMac.app=present | Vanilla/Desktop-Gates neu bauen, falls Manifest oder ZIP fehlt. |
| `home-pc-handover` | `ready` | KOSMO-home-pc-linux-handover.zip: OK | kosmo-home-pc-linux-handover-zip.sh neu ausfuehren und Checksum pruefen. |
| `home-pc-start-readiness` | `ready` | status=home_pc_start_dry_run_passed, checks=33/33, warnings=0 | kosmo-home-pc-start-dry-run.sh ausfuehren und fehlende Pflichtchecks beheben. |
| `kosmo-orbit` | `ready` | repo_commit=d7cb40e, report=present | Orbit bleibt review-only; naechster Hebel ist die sichtbare Odysseus/KOSMO-Statusbruecke. |
| `github-separation` | `blocked` | Decision pack proposed repo=Imperigo/Architekturkosmos_Codex_Starter; import_readiness=passed; waiting for owner-go. | Eigenes Imperigo/Architekturkosmos_Codex_Starter Repo anlegen oder Import explizit freigeben. |

## Sources

- local starter commit: `0ab9a6d`
- cloud starter commit: `863dcde`
- Orbit website commit: `d7cb40e`

## Home PC Handover

- platform: `linux-workstation`
- zip: `dist/KOSMO-home-pc-linux-handover.zip`
- checksum: `dist/KOSMO-home-pc-linux-handover.zip.sha256`
- manifest: `tmp/kosmo-home-pc-linux-handover-manifest.json`
- start dry-run script: `scripts/kosmo-home-pc-start-dry-run.sh`
- start dry-run report: `tmp/kosmo-home-pc-start-dry-run.json`
- start dry-run status: `home_pc_start_dry_run_passed`
- start dry-run checks: `33/33`
- purpose: Machine-readable Linux handover index for the future Home-PC setup.

First commands:
- `shasum -a 256 -c KOSMO-home-pc-linux-handover.zip.sha256`
- `unzip KOSMO-home-pc-linux-handover.zip -d KOSMO-home-pc-linux-handover`
- `less KOSMO-home-pc-linux-handover/tmp/kosmo-night-status.md`
- `less KOSMO-home-pc-linux-handover/tmp/kosmo-home-pc-linux-handover-manifest.json`

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
| `ready_lane_majority` | `passed` | At least six of seven lanes are ready. |
| `runtime_ready` | `passed` | Odysseus runtime lane is ready. |
| `model_ready` | `passed` | KOSMO Ollama model lane is ready. |
| `handover_ready` | `passed` | Home-PC handover lane is ready. |
| `home_pc_start_ready` | `passed` | Home-PC start readiness lane is ready. |
| `github_separation_blocked` | `passed` | GitHub separation remains blocked until a dedicated Starter repo or explicit import approval exists. |
| `github_import_readiness_visible` | `passed` | GitHub import readiness is visible while Owner-Go remains blocked. |
| `policy_flags_present` | `passed` | All safety policy flags are present and true. |
| `sources_present` | `passed` | Local starter, cloud starter and Orbit website sources are represented. |
| `no_private_path_required` | `passed` | Bridge can run from a repo-local demo status without a private local path. |

## Next Actions

- GitHub Separation Decision Pack owner-seitig bestaetigen oder Repo-Erstellung weiter blockiert lassen.
- Dediziertes GitHub-Repo fuer den Starter anlegen oder Import-Ziel freigeben.
- Home-PC Linux Handover auf Zielmaschine testen und erste Memory/Worker-Sync-Probe fahren.
