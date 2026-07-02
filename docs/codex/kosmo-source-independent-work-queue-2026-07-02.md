# Kosmo Source-Independent Work Queue

Generated: 2026-07-02T06:04:56.317Z
Status: `source_independent_work_queue_needs_review`

## Summary

- Data lane: kosmodata_lane_sweep_failed
- Night loop: night_loop_needs_review
- Source-root blocked: yes
- Private inventory blocked: yes
- Tasks: 9
- Completed review-only: 5
- Codex executable now: 2
- Owner actions: 2
- Blocked by private/source root: 0
- Failures: 4
- Owner gate notes: 0
- Public-ready after queue: 0

## Tasks

| Task | Lane | Actor | Status | Executable now | Owner action | Command | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `owner_source_root_choice` | owner_decision | owner_or_overseer | owner_action_required | no | yes | `review docs/codex/kosmo-source-root-owner-choice-consequence-matrix-2026-07-02.md` | choices 0, unlock 0 |
| `codex_asset_candidate_taxonomy_review` | kosmoasset | codex | completed_review_only | no | no | `npm run kosmo:asset-candidate-taxonomy-review && npm run kosmo:asset-candidate-taxonomy-review-check` | completed 10 reviews, guard 12/12 |
| `codex_pilot_gap_label_review` | kosmoreferences | codex | completed_review_only | no | no | `npm run kosmo:pilot-gap-label-review && npm run kosmo:pilot-gap-label-review-check` | completed 12 labels, guard 11/11 |
| `codex_local_worker_output_contract_review` | local_worker | codex | ready | yes | no | `npm run kosmo:local-worker-output-contract-review && npm run kosmo:local-worker-output-contract-review-check` | outputs 9/9, executable 0 |
| `codex_prepare_phase1_source_package_contract` | kosmoprepare-kosmoreferences | codex | completed_review_only | no | no | `npm run kosmo:prepare-phase1-source-package-contract && npm run kosmo:prepare-phase1-source-package-contract-check` | completed package kosmo-prepare-phase1-adapter-fixture-2026-07-02, failures 0 |
| `codex_asset_prepare_phase1_fixture_contract` | kosmoasset | codex | completed_review_only | no | no | `npm run kosmo:asset-prepare-phase1-fixture-contract && npm run kosmo:asset-prepare-phase1-fixture-contract-check` | completed library kosmo-prepare-phase1-fixture, assets 2, failures 0 |
| `codex_local_worker_fixture_chain_task_pack` | local_worker | codex | ready | yes | no | `npm run kosmo:local-worker-fixture-chain-task-pack && npm run kosmo:local-worker-fixture-chain-task-pack-check` | fixture-chain local worker task pack missing or guard not passed |
| `owner_open_review_batches` | owner_decision | owner_or_overseer | owner_action_required | no | yes | `review docs/codex/kosmo-owner-review-packet-2026-06-14.md` | open batches 5, open items 16 |
| `codex_orbit_status_refresh` | orbit | codex | completed_review_only | no | no | `npm run kosmo:orbit-status-bridge` | completed 85 cards, blockers 79, owner 24 |

## Hard Stops

- Do not read private source contents.
- Do not read private local-worker output contents from this queue.
- Do not run private metadata inventory until source-root activation passes.
- Do not execute local workers from this queue.
- Do not set public-ready.

## Owner Gate Notes

- None.

## Failures

- Missing or unreadable required report choiceMatrix: data/kosmo-source-root-owner-choice-consequence-matrix-2026-07-02.json (ENOENT).
- Data lane not passed: kosmodata_lane_sweep_failed
- Night loop not guarded ready: night_loop_needs_review
- Choice matrix not safe for queue: missing_required_report
