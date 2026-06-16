# Kosmo Orbit Status Bridge

Generated: 2026-06-16T17:15:17.997Z
Status: `orbit_bridge_ready_with_blockers`

## Summary

- Cards: 85
- Blocking cards: 6
- Owner action cards: 19
- Source root blocked: no
- Day batch: day_batch_loop_needs_review
- Source-root decision refresh: source_root_decision_session_refresh_refused, changed no, options 10, failures 1
- Source-root candidate integrity: source_root_candidate_integrity_owner_review_ready, existing 8, exact roots 1, failures 0
- Source-root owner action: source_root_owner_action_satisfied_metadata_only
- Source-root recommended decision: already_allowed
- Source-root owner decision packet: source_root_owner_decision_packet_satisfied_metadata_only, templates 0, exact roots 1, failures 0
- Source-root owner decision packet check: source_root_owner_decision_packet_guard_passed, failures 0, warnings 0
- Source-root decision dry run: source_root_decision_dry_run_satisfied_recorded_selection, scenarios 0, metadata scenarios 1, failures 0
- Source-root post-owner activation queue: source_root_post_owner_activation_queue_ready, steps 7, executable 2, blocked 5, failures 0
- Source-root post-owner activation queue check: source_root_post_owner_activation_queue_guard_passed, failures 0, warnings 0
- Source-root owner final decision brief: source_root_owner_final_decision_brief_satisfied_metadata_only, options 0, unlock options 0, failures 0
- Source-root owner choice consequence matrix: source_root_owner_choice_consequence_matrix_satisfied_metadata_only, choices 0, unlock 0, blocked 0, failures 0
- Source-root activation: source_root_activation_ready_for_private_metadata_diagnostic
- Private metadata inventory: private_metadata_inventory_ready_private_output_written
- Private metadata inventory fixture: private_metadata_inventory_fixture_passed
- Private metadata inventory check: private_metadata_inventory_guard_passed
- Local models: local_model_inventory_ready_review_only
- Local worker HTTP runner: local_worker_http_runner_dry_run_ready, check local_worker_http_runner_guard_passed, safe inputs 6
- Local worker execution runbook: local_worker_execution_runbook_idle_review_only, check local_worker_execution_runbook_guard_passed, executable now 0
- Local worker output contracts: local_worker_output_contract_review_ready, contracts 9, present valid 9, repo conversion now 0, execute now 0, check local_worker_output_contract_review_guard_passed, failures 0
- Source-independent work queue: source_independent_work_queue_ready, tasks 9, completed 9, codex executable 0, owner actions 0, failures 0
- Pilot gap label review: pilot_gap_label_review_ready, labels 12, hard blockers 7, owner decisions 7, check pilot_gap_label_review_guard_passed, failures 0
- Asset bridge: kosmoasset_reference_bridge_review_only_passed
- Asset source candidate map: kosmoasset_source_candidate_map_review_only_ready, candidates 3
- Asset candidate taxonomy review: kosmoasset_candidate_taxonomy_review_ready, candidates 10, reviewable 3, owner confirmations 3, check kosmoasset_candidate_taxonomy_review_guard_passed, failures 0
- Prepare source package contract: prepare_phase1_source_package_contract_guard_passed, package kosmo-prepare-phase1-adapter-fixture-2026-06-16, failures 0
- Asset prepare fixture contract: kosmoasset_prepare_phase1_fixture_contract_guard_passed, library kosmo-prepare-phase1-fixture, assets 2, failures 0
- Local worker fixture chain task pack: local_worker_fixture_chain_task_pack_ready, tasks 8, executable 0, missing refs 0, check local_worker_fixture_chain_task_pack_guard_passed, failures 0
- GitHub fixture contract plan: innovation_github_fixture_contract_plan_ready, plans 5
- GitHub fixture skeletons: innovation_github_fixture_skeletons_ready, directories 5, files 10
- GitHub fixture payloads: innovation_github_fixture_payloads_ready, payloads 10
- GitHub fixture payload smoke: innovation_github_fixture_payload_smoke_passed, payloads 10, lanes 3, content types 6
- GitHub worker integration signal bridge: innovation_github_worker_integration_signal_bridge_ready, candidates 2, top signal 5
- GitHub worker adapter boundary contract: innovation_github_worker_adapter_boundary_contract_ready, fixture worker_integration-mac999-bim-llm-code-agent-signal-fixture, commands 3
- GitHub worker adapter boundary negative fixtures: innovation_github_worker_adapter_boundary_negative_fixtures_ready, fixtures 8, blocked 8
- GitHub worker runtime batch readiness plan: innovation_github_worker_runtime_batch_readiness_plan_ready, ready gates 5, blocked gates 5
- GitHub worker runtime rollback/redaction fixtures: innovation_github_worker_runtime_rollback_redaction_fixtures_ready, groups 3, redaction rules 5, rollback steps 5
- GitHub worker runtime apply guard: innovation_github_worker_runtime_apply_guard_waiting_for_exact_reply, exact reply missing, separate runtime blocked, failures 0
- GitHub worker runtime log-redaction negative fixtures: innovation_github_worker_runtime_log_redaction_negative_fixtures_ready, fixtures 10, blocked 10, leak categories 7
- GitHub worker runtime batch manifest draft: innovation_github_worker_runtime_batch_manifest_draft_ready, id github-worker-runtime-batch-draft-2026-06-16, blocked prereqs 4, open gates 5
- GitHub worker runtime manifest validator plan: innovation_github_worker_runtime_manifest_validator_plan_ready, rules 10, fixture categories 8, executable 0, failures 0
- GitHub worker runtime manifest validator: innovation_github_worker_runtime_manifest_validator_passed, validated 12, blocked 11, review-only 1, public-ready 0, failures 0
- Terminal gate audit: terminal_gate_audit_guarded_blocked, blockers 5, executable 0, public-ready 0, failures 0
- Worktree guard audit: worktree_guard_audit_dirty_review_required, entries 1403, staged 0, untracked 268, broad stage blocked, failures 0
- Cross-worker delta audit: cross_worker_delta_audit_ready, repos 2, latest handoff 327, unmirrored 0, foreign commits 6, failures 0
- Training eval rubric: training_eval_rubric_pack_ready, suites 6, criteria 24
- Training eval row template: training_eval_row_template_ready, templates 6
- Training eval review queue: training_eval_review_queue_plan_ready, lanes 5
- Architecture ontology seed: architecture_ontology_seed_ready, entities 8, relations 10
- Owner unlock fast reply card: owner_unlock_fast_reply_card_ready, broad intent false, applies now false
- Owner unlock exact reply preview: owner_unlock_answer_dry_run_ready_for_review, validator owner_unlock_reply_valid, patches 6
- Owner unlock Path A readiness: owner_unlock_path_a_readiness_certificate_ready, can start after exact reply true, applies now false
- Owner unlock patch review bundle: owner_unlock_patch_review_bundle_ready, operations 6, applies now false
- Owner unlock intake apply plan: owner_unlock_intake_apply_plan_ready, field edits 13, writes now false
- Innovation smoke: innovation_smoke_passed_review_only
- Public-ready after bridge: 0

## Orbit Cards

| Card | Status | Owner Action | Signal |
| --- | --- | --- | --- |
| `day-batch` Daily Batch | needs_review | no | 59/60 required steps |
| `source-root` Source Root | ready | no | private diagnostic allowed |
| `source-root-decision-refresh` Source Root Decision Refresh | needs_review | no | source_root_decision_session_refresh_refused, changed no, options 10 |
| `source-root-candidate-integrity` Source Root Candidate Integrity | review_only_ready | yes | 8/8 paths visible, exact roots 1, failures 0 |
| `source-root-owner-action` Source Root Owner Action | ready | no | decision select_existing_root_for_private_diagnostic, root /mnt/archiv/ArchitekturKosmos/Assets |
| `source-root-owner-decision-packet` Source Root Owner Decision Packet | needs_review | yes | 0 templates, exact roots 1, failures 0 |
| `source-root-owner-decision-packet-check` Source Root Owner Decision Packet Check | locked | no | source_root_owner_decision_packet_guard_passed, failures 0, warnings 0 |
| `source-root-decision-dry-run` Source Root Decision Dry Run | needs_review | no | 0 scenarios, metadata 1, failures 0 |
| `source-root-post-owner-activation-queue` Source Root Post-Owner Activation Queue | review_only_ready | no | 7 steps, executable 2, blocked 5 |
| `source-root-post-owner-activation-queue-check` Source Root Post-Owner Activation Queue Check | guard_passed | no | 0 failures, 0 warnings |
| `source-root-owner-final-decision-brief` Source Root Owner Final Decision Brief | ready | no | 0 options, unlock 0, failures 0 |
| `source-root-owner-choice-consequence-matrix` Source Root Owner Choice Consequence Matrix | ready | no | 0 choices, unlock 0, blocked 0, failures 0 |
| `owner-unlock-fast-reply-card` Owner Unlock Fast Reply Card | owner_action | yes | broad intent no, suggestions 2, applies now no, failures 0 |
| `owner-unlock-exact-reply-preview` Owner Unlock Exact Reply Preview | review_only_ready | yes | validator owner_unlock_reply_valid, intake owner_unlock_reply_intake_map_ready_for_review, patches 6, failures 0 |
| `owner-unlock-path-a-readiness` Owner Unlock Path A Readiness | owner_action | yes | can start after exact reply yes, applies now no, activation ready no, failures 0 |
| `owner-unlock-patch-review-bundle` Owner Unlock Patch Review Bundle | review_only_ready | yes | 6 patches, source-root 1, owner cards 5, applies now no, failures 0 |
| `owner-unlock-intake-apply-plan` Owner Unlock Intake Apply Plan | review_only_ready | yes | 13 field edits, target empty yes, root exists yes, writes now no, failures 0 |
| `owner-unlock-session-edit-preview` Owner Unlock Session Edit Preview | review_only_ready | yes | 6 preview edits, session files 1, manual triage 5, writes now no, failures 0 |
| `owner-unlock-operational-start-card` Owner Unlock Operational Start Card | owner_action | yes | 6/6 components, next 9, blocked 5, writes now no, failures 0 |
| `owner-unlock-execution-runbook` Owner Unlock Execution Runbook | review_only_ready | yes | 8 phases, 21 commands, target examples/kosmo-references/provenance/source-root-decision-session-2026-06-16.json, queue executable 0, failures 0 |
| `owner-unlock-session-apply-guard` Owner Unlock Session Apply Guard | review_only_ready | yes | applied_matches_preview, target examples/kosmo-references/provenance/source-root-decision-session-2026-06-16.json, matches yes, private diagnostic yes, failures 0 |
| `owner-unlock-session-apply-guard-smoke` Owner Unlock Session Apply Guard Smoke | review_only_ready | no | applied_matches_preview, matches yes, private diagnostic yes, checks 18/18, failures 0 |
| `source-root-activation` Source Root Activation | ready | no | activation ready for /mnt/archiv/ArchitekturKosmos/Assets |
| `local-models` Local Models | review_only_ready | no | 4/4 roles, 8 Ollama models, 70 GB |
| `local-worker-http-runner` Local Worker HTTP Runner | review_only_ready | no | local_worker_http_runner_dry_run_ready, check local_worker_http_runner_guard_passed, safe inputs 6 |
| `local-worker-execution-runbook` Local Worker Execution Runbook | review_only_ready | no | local_worker_execution_runbook_idle_review_only, check local_worker_execution_runbook_guard_passed, executable now 0 |
| `local-worker-output-contracts` Local Worker Output Contracts | review_only_ready | no | 9 contracts, present 9, repo 0, execute 0, failures 0 |
| `source-independent-work-queue` Source-Independent Work Queue | review_only_ready | no | 9 tasks, completed 9, codex 0, owner 0, failures 0 |
| `private-metadata-inventory` Private Metadata Inventory | review_only_ready | no | 24 candidates, scanned 5705 files |
| `pilot-references` Pilot References | review_only | yes | 3 pilots, 12 evidence gaps |
| `pilot-gap-labels` Pilot Gap Labels | review_only_ready | yes | 12 labels, 7 hard blockers, owner 7, failures 0 |
| `kosmoasset` KosmoAsset | review_only | yes | 6 human reviews open, public-ready 0 |
| `asset-reference-bridge` Asset Reference Bridge | review_only_ready | yes | 3/3 pilot bridges, 6 assets, public-ready 0 |
| `asset-source-candidates` Asset Source Candidates | review_only_ready | yes | 3 asset-lane candidates, material 2, public-ready 0 |
| `asset-candidate-taxonomy` Asset Candidate Taxonomy | review_only_ready | yes | 10 reviews, 3 reviewable, owner 3, failures 0 |
| `prepare-references-asset-fixture-chain` Prepare References Asset Fixture Chain | review_only_ready | no | source package kosmo-prepare-phase1-adapter-fixture-2026-06-16, fixture assets 2, public-ready 0 |
| `fixture-chain-local-worker-task-pack` Fixture Chain Local Worker Task Pack | review_only_ready | no | 8 tasks, GitHub 5, payloads 10, training 3, executable now 0, missing refs 0 |
| `local-worker-innovation-output-smoke` Local Worker Innovation Output Smoke | review_only_ready | no | 5 expected outputs, training 3, ontology 5, executable 0, failures 0 |
| `local-worker-innovation-output-adapter-plan` Local Worker Innovation Output Adapter Plan | review_only_ready | no | 5 adapters, metadata 11, body copy no, failures 0 |
| `local-worker-innovation-output-validator` Local Worker Innovation Output Validator | review_only_ready | no | 0/5 present, missing 5, parsed 0, failures 0 |
| `local-worker-innovation-output-validator-fixtures` Local Worker Innovation Output Validator Fixtures | review_only_ready | no | positive local_worker_innovation_output_validator_passed, negative local_worker_innovation_output_validator_needs_review, failures 0 |
| `local-worker-innovation-launch-dry-run` Local Worker Innovation Launch Dry Run | review_only_ready | no | 5/5 dry-run ready, execute 0, gates 5, failures 0 |
| `local-worker-innovation-launch-owner-card` Local Worker Innovation Launch Owner Card | review_only_ready | no | 5 tasks, recommended hold_dry_run_ready, execute 0, failures 0 |
| `local-worker-innovation-launch-apply-guard` Local Worker Innovation Launch Apply Guard | review_only_ready | no | answer missing, exact no, separate no, execute 0, failures 0 |
| `local-worker-innovation-launch-apply-guard-smoke` Local Worker Innovation Launch Apply Guard Smoke | review_only_ready | no | 3/3 scenarios, failures 0 |
| `local-worker-innovation-launch-runbook-checkpoint` Local Worker Innovation Launch Runbook Checkpoint | review_only_ready | no | hold_waiting_for_exact_reply, gates 10/10, execute 0, failures 0 |
| `local-worker-innovation-launch-execution-envelope` Local Worker Innovation Launch Execution Envelope | review_only_ready | no | empty_held_waiting_for_exact_reply, slots 5/5, outputs 0, failures 0 |
| `local-worker-innovation-post-output-intake-review` Local Worker Innovation Post-Output Intake Review | review_only_ready | no | waiting_for_worker_outputs, candidates 0, accepted 0, public 0, failures 0 |
| `local-worker-innovation-human-overseer-review-decision-card` Local Worker Innovation Human/Overseer Review Decision Card | review_only_ready | no | waiting_for_review_candidates, candidates 0, decisions 0, public 0, failures 0 |
| `local-worker-innovation-conversion-plan-preview` Local Worker Innovation Conversion Plan Preview | review_only_ready | no | waiting_for_positive_review_decisions, eligible 0, conversions 0, public 0, failures 0 |
| `local-worker-innovation-conversion-apply-guard` Local Worker Innovation Conversion Apply Guard | review_only_ready | no | waiting_for_positive_review_decisions, eligible 0, apply no, conversions 0, failures 0 |
| `local-worker-innovation-conversion-evidence-ledger` Local Worker Innovation Conversion Evidence Ledger | review_only_ready | no | waiting_for_conversion_evidence, entries 7, apply no, public 0, failures 0 |
| `github-innovation-watchlist` GitHub Innovation Watchlist | review_only_ready | no | 9 seeded repos, live 9, fallback 0, failures 0 |
| `github-innovation-discovery` GitHub Innovation Discovery | review_only_ready | no | 5/10 queries with results, 23 candidates, failures 0 |
| `github-innovation-review-queue` GitHub Innovation Review Queue | review_only_ready | no | 7 review items, high 5, execute 0, failures 0 |
| `codex-morning-routine-run` Codex Morning Routine Run | review_only_ready | no | fetch 2/2, behind 0, handoff 311, next source_free_innovation_and_guarding, failures 0 |
| `today-loop-plan` Today Loop Plan | ready | no | source_free_path_b, blocks 6, tick 2m, checkup 3m, failures 0 |
| `github-readme-signal-scan` GitHub README Signal Scan | review_only_ready | no | 7 scanned, README 6, high-signal 5, failures 0 |
| `github-fixture-contract-plan` GitHub Fixture Contract Plan | review_only_ready | no | 5 plans, prepare 2, asset 1, worker 2, failures 0 |
| `github-promotion-matrix` GitHub Promotion Matrix | review_only_ready | no | 5 promotable, held 2, lanes 3, training 3, failures 0 |
| `github-fixture-skeletons` GitHub Fixture Skeletons | review_only_ready | no | 5 directories, 10 files, matrix 5, executable 0, failures 0 |
| `github-fixture-payloads` GitHub Fixture Payloads | review_only_ready | no | 5 manifests, 10 payloads, executable 0, failures 0 |
| `github-fixture-payload-smoke` GitHub Fixture Payload Smoke | review_only_ready | no | 10 payloads, lanes 3/3, training 3, content 6/6, failures 0 |
| `github-worker-integration-signal-bridge` GitHub Worker Integration Signal Bridge | review_only_ready | no | 2 candidates, top 5, high 2, executable 0, failures 0 |
| `github-worker-adapter-boundary-contract` GitHub Worker Adapter Boundary Contract | review_only_ready | no | worker_integration-mac999-bim-llm-code-agent-signal-fixture, commands 3, runtime 0, public 0, failures 0 |
| `github-worker-adapter-boundary-negative-fixtures` GitHub Worker Adapter Boundary Negative Fixtures | review_only_ready | no | 8 negative fixtures, blocked 8, categories 6, runtime 0, failures 0 |
| `github-worker-runtime-batch-readiness-plan` GitHub Worker Runtime Batch Readiness Plan | review_only_ready | no | 5/10 gates ready, blocked 5, runtime no, failures 0 |
| `github-worker-runtime-rollback-redaction-fixtures` GitHub Worker Runtime Rollback/Redaction Fixtures | review_only_ready | no | 3 groups, rules 5, rollback 5, runtime 0, failures 0 |
| `github-worker-runtime-apply-guard` GitHub Worker Runtime Apply Guard | blocked_owner_action_required | yes | exact reply missing, separate runtime blocked, execute 0, checks 31/31 |
| `github-worker-runtime-log-redaction-negative-fixtures` GitHub Worker Runtime Log-Redaction Negative Fixtures | review_only_ready | no | 10 negative fixtures, blocked 10, leak categories 7, runtime 0, failures 0 |
| `github-worker-runtime-batch-manifest-draft` GitHub Worker Runtime Batch Manifest Draft | review_only_ready | no | github-worker-runtime-batch-draft-2026-06-16, prereqs 7, blocked 4, gates open 5, executable no, failures 0 |
| `github-worker-runtime-manifest-negative-fixtures` GitHub Worker Runtime Manifest Negative Fixtures | review_only_ready | no | 10 manifest negatives, blocked 10, categories 8, executable 0, failures 0 |
| `github-worker-runtime-manifest-validator-plan` GitHub Worker Runtime Manifest Validator Plan | review_only_ready | no | 10 rules, fixtures 8, executable 0, failures 0 |
| `github-worker-runtime-manifest-validator` GitHub Worker Runtime Manifest Validator | review_only_ready | no | 12 manifests, blocked 11, review-only 1, failures 0 |
| `terminal-gate-audit` Terminal Gate Audit | guard_passed | no | 5 terminal blockers, executable 0, public-ready 0, checks 23/23 |
| `worktree-guard-audit` Worktree Guard Audit | guard_passed | no | 1403 dirty entries, staged 0, untracked 268, broad stage blocked, failures 0 |
| `cross-worker-delta-audit` Cross-Worker Delta Audit | guard_passed | no | 2/2 repos, latest handoff 327, unmirrored 0, foreign commits 6, failures 0 |
| `training-eval-rubric` Training Eval Rubric | review_only_ready | no | 6 suites, 24 criteria, eval items 24, failures 0 |
| `training-eval-row-template` Training Eval Row Template | review_only_ready | no | 6 templates, 10 required fields, writes rows now 0, failures 0 |
| `training-eval-review-queue` Training Eval Review Queue | review_only_ready | no | 5 lanes, 6 states, queue items now 0, failures 0 |
| `architecture-ontology-seed` Architecture Ontology Seed | review_only_ready | no | 8 entities, 10 relations, 6 facet groups, failures 0 |
| `tomorrow-day-batch` Tomorrow Day Batch | ready | no | source_free_path_until_exact_owner_unlock, target 2026-06-17, failures 0 |
| `worker-boundary` Worker Boundary | locked | no | 3 workers, 1 blocked command classes |
| `innovation` Innovation Lanes | review_only_ready | no | 5/5 public-safe smoke checks passed |
| `owner-handoff` Owner Handoff | needs_review | yes | 6 questions, no filled answers recorded |

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
- `owner_unlock_fast_reply_card`
- `owner_unlock_exact_reply_preview_card`
- `owner_unlock_path_a_readiness_card`
- `owner_unlock_patch_review_bundle_card`
- `owner_unlock_intake_apply_plan_card`
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
- `codex_morning_routine_run_card`
- `github_readme_signal_scan_card`
- `github_fixture_contract_plan_card`
- `github_promotion_matrix_card`
- `github_fixture_skeletons_card`
- `github_fixture_payloads_card`
- `github_fixture_payload_smoke_card`
- `github_worker_integration_signal_bridge_card`
- `github_worker_adapter_boundary_contract_card`
- `github_worker_adapter_boundary_negative_fixtures_card`
- `github_worker_runtime_batch_readiness_plan_card`
- `github_worker_runtime_rollback_redaction_fixtures_card`
- `github_worker_runtime_apply_guard_card`
- `github_worker_runtime_log_redaction_negative_fixtures_card`
- `github_worker_runtime_batch_manifest_draft_card`
- `training_eval_rubric_card`
- `training_eval_row_template_card`
- `training_eval_review_queue_card`
- `architecture_ontology_seed_card`
- `tomorrow_day_batch_card`
- `worker_boundary_card`
- `innovation_lane_card`
- `owner_handoff_card`

## Next Actions

- KosmoOrbit can render orbit_cards as a read-only dashboard.
- Do not add action buttons for blocked private commands until source-root passes.
- Use owner_action_required cards to prepare the next owner review conversation.
