# Kosmo Orbit Status Bridge

Generated: 2026-06-14T14:39:32.193Z
Status: `orbit_bridge_ready_with_blockers`

## Summary

- Cards: 17
- Blocking cards: 4
- Owner action cards: 10
- Source root blocked: yes
- Day batch: day_batch_loop_passed_review_only
- Source-root decision refresh: source_root_decision_session_refresh_not_needed, changed no, options 10, failures 0
- Source-root candidate integrity: source_root_candidate_integrity_owner_review_ready, existing 8, exact roots 1, failures 0
- Source-root owner action: source_root_owner_action_required
- Source-root recommended decision: repair_onedrive_first_or_confirm_complete_non_onedrive_root
- Source-root activation: source_root_activation_waiting_for_owner_storage_action
- Private metadata inventory: private_metadata_inventory_blocked_until_activation
- Private metadata inventory fixture: private_metadata_inventory_fixture_passed
- Private metadata inventory check: private_metadata_inventory_guard_passed
- Local models: local_model_inventory_ready_review_only
- Local worker HTTP runner: local_worker_http_runner_dry_run_ready, check local_worker_http_runner_guard_passed, safe inputs 6
- Local worker execution runbook: local_worker_execution_runbook_idle_review_only, check local_worker_execution_runbook_guard_passed, executable now 0
- Asset bridge: kosmoasset_reference_bridge_review_only_passed
- Asset source candidate map: kosmoasset_source_candidate_map_review_only_ready, candidates 3
- Innovation smoke: innovation_smoke_passed_review_only
- Public-ready after bridge: 0

## Orbit Cards

| Card | Status | Owner Action | Signal |
| --- | --- | --- | --- |
| `day-batch` Daily Batch | ready | no | 42/42 required steps |
| `source-root` Source Root | blocked | yes | blocked: 0 probable libraries, 59 OneDrive markers |
| `source-root-decision-refresh` Source Root Decision Refresh | review_only_ready | no | source_root_decision_session_refresh_not_needed, changed no, options 10 |
| `source-root-candidate-integrity` Source Root Candidate Integrity | review_only_ready | yes | 8/8 paths visible, exact roots 1, failures 0 |
| `source-root-owner-action` Source Root Owner Action | blocked | yes | action required: repair_onedrive_first_or_confirm_complete_non_onedrive_root |
| `source-root-activation` Source Root Activation | blocked | yes | source_root_activation_waiting_for_owner_storage_action, safe commands 13, blocked 4 |
| `local-models` Local Models | review_only_ready | no | 4/4 roles, 8 Ollama models, 70 GB |
| `local-worker-http-runner` Local Worker HTTP Runner | review_only_ready | no | local_worker_http_runner_dry_run_ready, check local_worker_http_runner_guard_passed, safe inputs 6 |
| `local-worker-execution-runbook` Local Worker Execution Runbook | review_only_ready | no | local_worker_execution_runbook_idle_review_only, check local_worker_execution_runbook_guard_passed, executable now 0 |
| `private-metadata-inventory` Private Metadata Inventory | blocked_with_smoke_passed | yes | blocked until source-root activation; fixture 6 matches; guard private_metadata_inventory_guard_passed |
| `pilot-references` Pilot References | review_only | yes | 3 pilots, 12 evidence gaps |
| `kosmoasset` KosmoAsset | review_only | yes | 6 human reviews open, public-ready 0 |
| `asset-reference-bridge` Asset Reference Bridge | review_only_ready | yes | 3/3 pilot bridges, 6 assets, public-ready 0 |
| `asset-source-candidates` Asset Source Candidates | review_only_ready | yes | 3 asset-lane candidates, material 2, public-ready 0 |
| `worker-boundary` Worker Boundary | locked | no | 3 workers, 3 blocked command classes |
| `innovation` Innovation Lanes | review_only_ready | no | 5/5 public-safe smoke checks passed |
| `owner-handoff` Owner Handoff | ready | yes | 6 questions, no filled answers recorded |

## Recommended Orbit Sections

- `status_strip`
- `local_models_card`
- `local_worker_http_runner_card`
- `local_worker_execution_runbook_card`
- `source_root_blocker_card`
- `source_root_decision_refresh_card`
- `source_root_candidate_integrity_card`
- `source_root_owner_action_card`
- `source_root_activation_card`
- `private_metadata_inventory_card`
- `pilot_reference_cards`
- `asset_reference_bridge_card`
- `asset_source_candidate_map_card`
- `worker_boundary_card`
- `innovation_lane_card`
- `owner_handoff_card`

## Next Actions

- KosmoOrbit can render orbit_cards as a read-only dashboard.
- Do not add action buttons for blocked private commands until source-root passes.
- Use owner_action_required cards to prepare the next owner review conversation.
