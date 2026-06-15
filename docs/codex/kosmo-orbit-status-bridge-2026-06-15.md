# Kosmo Orbit Status Bridge

Generated: 2026-06-15T14:50:59.492Z
Status: `orbit_bridge_ready_with_blockers`

## Summary

- Cards: 39
- Blocking cards: 4
- Owner action cards: 16
- Source root blocked: yes
- Day batch: day_batch_loop_passed_review_only
- Source-root decision refresh: source_root_decision_session_refresh_not_needed, changed no, options 10, failures 0
- Source-root candidate integrity: source_root_candidate_integrity_owner_review_ready, existing 8, exact roots 1, failures 0
- Source-root owner action: source_root_owner_action_required
- Source-root recommended decision: repair_onedrive_first_or_confirm_complete_non_onedrive_root
- Source-root owner decision packet: source_root_owner_decision_packet_ready, templates 3, exact roots 1, failures 0
- Source-root owner decision packet check: source_root_owner_decision_packet_guard_passed, failures 0, warnings 0
- Source-root decision dry run: source_root_decision_dry_run_ready, scenarios 3, metadata scenarios 1, failures 0
- Source-root post-owner activation queue: source_root_post_owner_activation_queue_ready, steps 7, executable 0, blocked 7, failures 0
- Source-root post-owner activation queue check: source_root_post_owner_activation_queue_guard_passed, failures 0, warnings 0
- Source-root owner final decision brief: source_root_owner_final_decision_brief_ready, options 3, unlock options 1, failures 0
- Source-root owner choice consequence matrix: source_root_owner_choice_consequence_matrix_ready, choices 3, unlock 1, blocked 2, failures 0
- Source-root activation: source_root_activation_waiting_for_owner_storage_action
- Private metadata inventory: private_metadata_inventory_blocked_until_activation
- Private metadata inventory fixture: private_metadata_inventory_fixture_passed
- Private metadata inventory check: private_metadata_inventory_guard_passed
- Local models: local_model_inventory_ready_review_only
- Local worker HTTP runner: local_worker_http_runner_dry_run_ready, check local_worker_http_runner_guard_passed, safe inputs 6
- Local worker execution runbook: local_worker_execution_runbook_idle_review_only, check local_worker_execution_runbook_guard_passed, executable now 0
- Local worker output contracts: local_worker_output_contract_review_ready, contracts 9, present valid 9, repo conversion now 0, execute now 0, check local_worker_output_contract_review_guard_passed, failures 0
- Source-independent work queue: source_independent_work_queue_ready, tasks 9, completed 7, codex executable 0, owner actions 2, failures 0
- Pilot gap label review: pilot_gap_label_review_ready, labels 12, hard blockers 7, owner decisions 7, check pilot_gap_label_review_guard_passed, failures 0
- Asset bridge: kosmoasset_reference_bridge_review_only_passed
- Asset source candidate map: kosmoasset_source_candidate_map_review_only_ready, candidates 3
- Asset candidate taxonomy review: kosmoasset_candidate_taxonomy_review_ready, candidates 10, reviewable 3, owner confirmations 3, check kosmoasset_candidate_taxonomy_review_guard_passed, failures 0
- Prepare source package contract: prepare_phase1_source_package_contract_guard_passed, package kosmo-prepare-phase1-adapter-fixture-2026-06-15, failures 0
- Asset prepare fixture contract: kosmoasset_prepare_phase1_fixture_contract_guard_passed, library kosmo-prepare-phase1-fixture, assets 2, failures 0
- Local worker fixture chain task pack: local_worker_fixture_chain_task_pack_ready, tasks 3, executable 0, missing refs 0, check local_worker_fixture_chain_task_pack_guard_passed, failures 0
- GitHub fixture contract plan: innovation_github_fixture_contract_plan_ready, plans 5
- GitHub fixture skeletons: innovation_github_fixture_skeletons_ready, directories 5, files 10
- GitHub fixture payloads: innovation_github_fixture_payloads_ready, payloads 10
- GitHub fixture payload smoke: innovation_github_fixture_payload_smoke_passed, payloads 10, lanes 3, content types 6
- Innovation smoke: innovation_smoke_passed_review_only
- Public-ready after bridge: 0

## Orbit Cards

| Card | Status | Owner Action | Signal |
| --- | --- | --- | --- |
| `day-batch` Daily Batch | ready | no | 71/71 required steps |
| `source-root` Source Root | blocked | yes | blocked: 0 probable libraries, 59 OneDrive markers |
| `source-root-decision-refresh` Source Root Decision Refresh | review_only_ready | no | source_root_decision_session_refresh_not_needed, changed no, options 10 |
| `source-root-candidate-integrity` Source Root Candidate Integrity | review_only_ready | yes | 8/8 paths visible, exact roots 1, failures 0 |
| `source-root-owner-action` Source Root Owner Action | blocked | yes | action required: repair_onedrive_first_or_confirm_complete_non_onedrive_root |
| `source-root-owner-decision-packet` Source Root Owner Decision Packet | ready | yes | 3 templates, exact roots 1, failures 0 |
| `source-root-owner-decision-packet-check` Source Root Owner Decision Packet Check | locked | no | source_root_owner_decision_packet_guard_passed, failures 0, warnings 0 |
| `source-root-decision-dry-run` Source Root Decision Dry Run | review_only_ready | no | 3 scenarios, metadata 1, failures 0 |
| `source-root-post-owner-activation-queue` Source Root Post-Owner Activation Queue | review_only_ready | no | 7 steps, executable 0, blocked 7 |
| `source-root-post-owner-activation-queue-check` Source Root Post-Owner Activation Queue Check | guard_passed | no | 0 failures, 0 warnings |
| `source-root-owner-final-decision-brief` Source Root Owner Final Decision Brief | owner_action | yes | 3 options, unlock 1, failures 0 |
| `source-root-owner-choice-consequence-matrix` Source Root Owner Choice Consequence Matrix | owner_action | yes | 3 choices, unlock 1, blocked 2, failures 0 |
| `source-root-activation` Source Root Activation | blocked | yes | source_root_activation_waiting_for_owner_storage_action, safe commands 13, blocked 4 |
| `local-models` Local Models | review_only_ready | no | 4/4 roles, 8 Ollama models, 70 GB |
| `local-worker-http-runner` Local Worker HTTP Runner | review_only_ready | no | local_worker_http_runner_dry_run_ready, check local_worker_http_runner_guard_passed, safe inputs 6 |
| `local-worker-execution-runbook` Local Worker Execution Runbook | review_only_ready | no | local_worker_execution_runbook_idle_review_only, check local_worker_execution_runbook_guard_passed, executable now 0 |
| `local-worker-output-contracts` Local Worker Output Contracts | review_only_ready | no | 9 contracts, present 9, repo 0, execute 0, failures 0 |
| `source-independent-work-queue` Source-Independent Work Queue | review_only_ready | yes | 9 tasks, completed 7, codex 0, owner 2, failures 0 |
| `private-metadata-inventory` Private Metadata Inventory | blocked_with_smoke_passed | yes | blocked until source-root activation; fixture 6 matches; guard private_metadata_inventory_guard_passed |
| `pilot-references` Pilot References | review_only | yes | 3 pilots, 12 evidence gaps |
| `pilot-gap-labels` Pilot Gap Labels | review_only_ready | yes | 12 labels, 7 hard blockers, owner 7, failures 0 |
| `kosmoasset` KosmoAsset | review_only | yes | 6 human reviews open, public-ready 0 |
| `asset-reference-bridge` Asset Reference Bridge | review_only_ready | yes | 3/3 pilot bridges, 6 assets, public-ready 0 |
| `asset-source-candidates` Asset Source Candidates | review_only_ready | yes | 3 asset-lane candidates, material 2, public-ready 0 |
| `asset-candidate-taxonomy` Asset Candidate Taxonomy | review_only_ready | yes | 10 reviews, 3 reviewable, owner 3, failures 0 |
| `prepare-references-asset-fixture-chain` Prepare References Asset Fixture Chain | review_only_ready | no | source package kosmo-prepare-phase1-adapter-fixture-2026-06-15, fixture assets 2, public-ready 0 |
| `fixture-chain-local-worker-task-pack` Fixture Chain Local Worker Task Pack | review_only_ready | no | 3 tasks, executable now 0, missing refs 0 |
| `github-innovation-watchlist` GitHub Innovation Watchlist | review_only_ready | no | 9 seeded repos, live 9, fallback 0, failures 0 |
| `github-innovation-discovery` GitHub Innovation Discovery | review_only_ready | no | 5/10 queries with results, 23 candidates, failures 0 |
| `github-innovation-review-queue` GitHub Innovation Review Queue | review_only_ready | no | 7 review items, high 5, execute 0, failures 0 |
| `github-readme-signal-scan` GitHub README Signal Scan | review_only_ready | no | 7 scanned, README 6, high-signal 5, failures 0 |
| `github-fixture-contract-plan` GitHub Fixture Contract Plan | review_only_ready | no | 5 plans, prepare 2, asset 1, worker 2, failures 0 |
| `github-fixture-skeletons` GitHub Fixture Skeletons | review_only_ready | no | 5 directories, 10 files, executable 0, failures 0 |
| `github-fixture-payloads` GitHub Fixture Payloads | review_only_ready | no | 5 manifests, 10 payloads, executable 0, failures 0 |
| `github-fixture-payload-smoke` GitHub Fixture Payload Smoke | review_only_ready | no | 10 payloads, lanes 3/3, content 6/6, failures 0 |
| `tomorrow-day-batch` Tomorrow Day Batch | ready | no | source_free_path_until_exact_owner_unlock, target 2026-06-16, failures 0 |
| `worker-boundary` Worker Boundary | locked | no | 3 workers, 3 blocked command classes |
| `innovation` Innovation Lanes | review_only_ready | no | 5/5 public-safe smoke checks passed |
| `owner-handoff` Owner Handoff | ready | yes | 6 questions, no filled answers recorded |

## Recommended Orbit Sections

- `status_strip`
- `local_models_card`
- `local_worker_http_runner_card`
- `local_worker_execution_runbook_card`
- `local_worker_output_contract_card`
- `source_independent_work_queue_card`
- `source_root_blocker_card`
- `source_root_decision_refresh_card`
- `source_root_candidate_integrity_card`
- `source_root_owner_action_card`
- `source_root_owner_decision_packet_card`
- `source_root_owner_decision_packet_check_card`
- `source_root_decision_dry_run_card`
- `source_root_post_owner_activation_queue_card`
- `source_root_post_owner_activation_queue_check_card`
- `source_root_owner_final_decision_brief_card`
- `source_root_owner_choice_consequence_matrix_card`
- `source_root_activation_card`
- `private_metadata_inventory_card`
- `pilot_reference_cards`
- `pilot_gap_label_card`
- `asset_reference_bridge_card`
- `asset_source_candidate_map_card`
- `asset_candidate_taxonomy_card`
- `prepare_references_asset_fixture_chain_card`
- `fixture_chain_local_worker_task_pack_card`
- `github_innovation_watchlist_card`
- `github_innovation_discovery_card`
- `github_innovation_review_queue_card`
- `github_readme_signal_scan_card`
- `github_fixture_contract_plan_card`
- `github_fixture_skeletons_card`
- `github_fixture_payloads_card`
- `github_fixture_payload_smoke_card`
- `tomorrow_day_batch_card`
- `worker_boundary_card`
- `innovation_lane_card`
- `owner_handoff_card`

## Next Actions

- KosmoOrbit can render orbit_cards as a read-only dashboard.
- Do not add action buttons for blocked private commands until source-root passes.
- Use owner_action_required cards to prepare the next owner review conversation.
