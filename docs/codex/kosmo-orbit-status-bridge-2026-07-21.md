# Kosmo Orbit Status Bridge

Generated: 2026-07-21T15:53:30.963Z
Status: `orbit_bridge_ready_with_blockers`

## Summary

- Cards: 85
- Blocking cards: 74
- Owner action cards: 25
- Source root blocked: yes
- Day batch: null
- Source-root decision refresh: source_root_decision_session_refresh_not_needed, changed no, options 10, failures 0
- Source-root candidate integrity: null, existing -, exact roots -, failures -
- Source-root owner action: null
- Source-root recommended decision: null
- Source-root owner decision packet: null, templates -, exact roots -, failures -
- Source-root owner decision packet check: null, failures -, warnings -
- Source-root decision dry run: null, scenarios -, metadata scenarios -, failures -
- Source-root post-owner activation queue: null, steps -, executable -, blocked -, failures -
- Source-root post-owner activation queue check: null, failures -, warnings -
- Source-root owner final decision brief: null, options -, unlock options -, failures -
- Source-root owner choice consequence matrix: null, choices -, unlock -, blocked -, failures -
- Source-root activation: source_root_activation_waiting_for_owner_storage_action
- Private metadata inventory: private_metadata_inventory_blocked_until_activation
- Private metadata inventory fixture: private_metadata_inventory_fixture_passed
- Private metadata inventory check: private_metadata_inventory_guard_passed
- Local models: null
- Local worker HTTP runner: local_worker_http_runner_dry_run_ready, check local_worker_http_runner_guard_passed, safe inputs 3
- Local worker execution runbook: local_worker_execution_runbook_idle_review_only, check local_worker_execution_runbook_guard_passed, executable now 0
- Local worker output contracts: local_worker_output_contract_review_ready, contracts 9, present valid 9, repo conversion now 0, execute now 0, check local_worker_output_contract_review_guard_passed, failures 0
- Source-independent work queue: source_independent_work_queue_needs_review, tasks 9, completed 3, codex executable 4, owner actions 2, failures 4
- Pilot gap label review: pilot_gap_label_review_ready, labels 12, hard blockers 7, owner decisions 7, check pilot_gap_label_review_guard_passed, failures 0
- Asset bridge: null
- Asset source candidate map: kosmoasset_source_candidate_map_review_only_ready, candidates 3
- Asset candidate taxonomy review: kosmoasset_candidate_taxonomy_review_ready, candidates 10, reviewable 3, owner confirmations 3, check kosmoasset_candidate_taxonomy_review_guard_passed, failures 0
- Prepare source package contract: prepare_phase1_source_package_contract_guard_passed, package kosmo-prepare-phase1-adapter-fixture-2026-07-21, failures 0
- Asset prepare fixture contract: kosmoasset_prepare_phase1_fixture_contract_guard_passed, library kosmo-prepare-phase1-fixture, assets 2, failures 0
- Local worker fixture chain task pack: local_worker_fixture_chain_task_pack_missing_refs, tasks 3, executable 0, missing refs 1, check null, failures -
- GitHub fixture contract plan: null, plans -
- GitHub fixture skeletons: null, directories -, files -
- GitHub fixture payloads: null, payloads -
- GitHub fixture payload smoke: null, payloads -, lanes -, content types -
- GitHub worker integration signal bridge: null, candidates -, top signal -
- GitHub worker adapter boundary contract: null, fixture -, commands -
- GitHub worker adapter boundary negative fixtures: null, fixtures -, blocked -
- GitHub worker runtime batch readiness plan: null, ready gates -, blocked gates -
- GitHub worker runtime rollback/redaction fixtures: null, groups -, redaction rules -, rollback steps -
- GitHub worker runtime apply guard: null, exact reply missing, separate runtime blocked, failures -
- GitHub worker runtime log-redaction negative fixtures: null, fixtures -, blocked -, leak categories -
- GitHub worker runtime batch manifest draft: null, id -, blocked prereqs -, open gates -
- GitHub worker runtime manifest validator plan: null, rules -, fixture categories -, executable -, failures -
- GitHub worker runtime manifest validator: null, validated -, blocked -, review-only -, public-ready -, failures -
- Terminal gate audit: null, blockers -, executable -, public-ready -, failures -
- Worktree guard audit: null, entries -, staged -, untracked -, broad stage blocked, failures -
- Cross-worker delta audit: null, repos -, latest handoff -, unmirrored -, foreign commits -, failures -
- Training eval rubric: null, suites -, criteria -
- Training eval row template: null, templates -
- Training eval review queue: null, lanes -
- Architecture ontology seed: null, entities -, relations -
- Owner unlock fast reply card: null, broad intent -, applies now -
- Owner unlock exact reply preview: null, validator -, patches -
- Owner unlock Path A readiness: null, can start after exact reply -, applies now -
- Owner unlock patch review bundle: null, operations -, applies now -
- Owner unlock intake apply plan: null, field edits -, writes now -
- Innovation smoke: null
- Public-ready after bridge: 0

## Orbit Cards

| Card | Status | Owner Action | Signal |
| --- | --- | --- | --- |
| `day-batch` Daily Batch | needs_review | no | 0/0 required steps |
| `source-root` Source Root | blocked | yes | blocked: 0 probable libraries, 59 OneDrive markers |
| `source-root-decision-refresh` Source Root Decision Refresh | review_only_ready | no | source_root_decision_session_refresh_not_needed, changed no, options 10 |
| `source-root-candidate-integrity` Source Root Candidate Integrity | needs_review | yes | missing candidate integrity check |
| `source-root-owner-action` Source Root Owner Action | needs_review | yes | decision pending, root pending |
| `source-root-owner-decision-packet` Source Root Owner Decision Packet | needs_review | yes | missing owner decision packet |
| `source-root-owner-decision-packet-check` Source Root Owner Decision Packet Check | needs_review | no | missing owner decision packet guard |
| `source-root-decision-dry-run` Source Root Decision Dry Run | needs_review | no | missing source-root decision dry run |
| `source-root-post-owner-activation-queue` Source Root Post-Owner Activation Queue | needs_review | no | missing post-owner activation queue |
| `source-root-post-owner-activation-queue-check` Source Root Post-Owner Activation Queue Check | needs_review | no | missing post-owner activation queue guard |
| `source-root-owner-final-decision-brief` Source Root Owner Final Decision Brief | needs_review | yes | missing owner final decision brief |
| `source-root-owner-choice-consequence-matrix` Source Root Owner Choice Consequence Matrix | needs_review | yes | missing owner choice consequence matrix |
| `owner-unlock-fast-reply-card` Owner Unlock Fast Reply Card | needs_review | yes | missing fast reply card |
| `owner-unlock-exact-reply-preview` Owner Unlock Exact Reply Preview | needs_review | yes | missing exact reply preview |
| `owner-unlock-path-a-readiness` Owner Unlock Path A Readiness | needs_review | yes | missing Path A readiness certificate |
| `owner-unlock-patch-review-bundle` Owner Unlock Patch Review Bundle | needs_review | yes | missing patch review bundle |
| `owner-unlock-intake-apply-plan` Owner Unlock Intake Apply Plan | needs_review | yes | missing intake apply plan |
| `owner-unlock-session-edit-preview` Owner Unlock Session Edit Preview | needs_review | yes | missing session edit preview |
| `owner-unlock-operational-start-card` Owner Unlock Operational Start Card | needs_review | yes | missing operational start card |
| `owner-unlock-execution-runbook` Owner Unlock Execution Runbook | needs_review | yes | missing execution runbook |
| `owner-unlock-session-apply-guard` Owner Unlock Session Apply Guard | needs_review | yes | missing session apply guard |
| `owner-unlock-session-apply-guard-smoke` Owner Unlock Session Apply Guard Smoke | needs_review | no | missing session apply guard smoke |
| `source-root-activation` Source Root Activation | blocked | yes | source_root_activation_waiting_for_owner_storage_action, safe commands 13, blocked 4 |
| `local-models` Local Models | needs_review | no | 0/0 roles, 0 Ollama models, 0 GB |
| `local-worker-http-runner` Local Worker HTTP Runner | review_only_ready | no | local_worker_http_runner_dry_run_ready, check local_worker_http_runner_guard_passed, safe inputs 3 |
| `local-worker-execution-runbook` Local Worker Execution Runbook | review_only_ready | no | local_worker_execution_runbook_idle_review_only, check local_worker_execution_runbook_guard_passed, executable now 0 |
| `local-worker-output-contracts` Local Worker Output Contracts | review_only_ready | no | 9 contracts, present 9, repo 0, execute 0, failures 0 |
| `source-independent-work-queue` Source-Independent Work Queue | needs_review | yes | 9 tasks, completed 3, codex 4, owner 2, failures 4 |
| `private-metadata-inventory` Private Metadata Inventory | blocked_with_smoke_passed | yes | blocked until source-root activation; fixture 6 matches; guard private_metadata_inventory_guard_passed |
| `pilot-references` Pilot References | review_only | yes | 3 pilots, 12 evidence gaps |
| `pilot-gap-labels` Pilot Gap Labels | review_only_ready | yes | 12 labels, 7 hard blockers, owner 7, failures 0 |
| `kosmoasset` KosmoAsset | review_only | yes | 6 human reviews open, public-ready 0 |
| `asset-reference-bridge` Asset Reference Bridge | needs_review | no | 0/0 pilot bridges, 0 assets, public-ready 0 |
| `asset-source-candidates` Asset Source Candidates | review_only_ready | yes | 3 asset-lane candidates, material 2, public-ready 0 |
| `asset-candidate-taxonomy` Asset Candidate Taxonomy | review_only_ready | yes | 10 reviews, 3 reviewable, owner 3, failures 0 |
| `prepare-references-asset-fixture-chain` Prepare References Asset Fixture Chain | review_only_ready | no | source package kosmo-prepare-phase1-adapter-fixture-2026-07-21, fixture assets 2, public-ready 0 |
| `fixture-chain-local-worker-task-pack` Fixture Chain Local Worker Task Pack | needs_review | no | 3 tasks, GitHub 0, payloads 0, training 0, executable now 0, missing refs 1 |
| `local-worker-innovation-output-smoke` Local Worker Innovation Output Smoke | needs_review | no | 0 expected outputs, training 0, ontology 0, executable 0, failures 0 |
| `local-worker-innovation-output-adapter-plan` Local Worker Innovation Output Adapter Plan | needs_review | no | 0 adapters, metadata 0, body copy review, failures 0 |
| `local-worker-innovation-output-validator` Local Worker Innovation Output Validator | needs_review | no | 0/0 present, missing 0, parsed 0, failures 0 |
| `local-worker-innovation-output-validator-fixtures` Local Worker Innovation Output Validator Fixtures | needs_review | no | positive -, negative -, failures 0 |
| `local-worker-innovation-launch-dry-run` Local Worker Innovation Launch Dry Run | needs_review | no | 0/0 dry-run ready, execute 0, gates 0, failures 0 |
| `local-worker-innovation-launch-owner-card` Local Worker Innovation Launch Owner Card | needs_review | no | 0 tasks, recommended -, execute 0, failures 0 |
| `local-worker-innovation-launch-apply-guard` Local Worker Innovation Launch Apply Guard | needs_review | no | answer missing, exact no, separate no, execute 0, failures 0 |
| `local-worker-innovation-launch-apply-guard-smoke` Local Worker Innovation Launch Apply Guard Smoke | needs_review | no | 0/0 scenarios, failures 0 |
| `local-worker-innovation-launch-runbook-checkpoint` Local Worker Innovation Launch Runbook Checkpoint | needs_review | no | -, gates 0/0, execute 0, failures 0 |
| `local-worker-innovation-launch-execution-envelope` Local Worker Innovation Launch Execution Envelope | needs_review | no | -, slots 0/0, outputs 0, failures 0 |
| `local-worker-innovation-post-output-intake-review` Local Worker Innovation Post-Output Intake Review | needs_review | no | -, candidates 0, accepted 0, public 0, failures 0 |
| `local-worker-innovation-human-overseer-review-decision-card` Local Worker Innovation Human/Overseer Review Decision Card | needs_review | no | -, candidates 0, decisions 0, public 0, failures 0 |
| `local-worker-innovation-conversion-plan-preview` Local Worker Innovation Conversion Plan Preview | needs_review | no | -, eligible 0, conversions 0, public 0, failures 0 |
| `local-worker-innovation-conversion-apply-guard` Local Worker Innovation Conversion Apply Guard | needs_review | no | -, eligible 0, apply no, conversions 0, failures 0 |
| `local-worker-innovation-conversion-evidence-ledger` Local Worker Innovation Conversion Evidence Ledger | needs_review | no | -, entries 0, apply no, public 0, failures 0 |
| `github-innovation-watchlist` GitHub Innovation Watchlist | needs_review | no | 0 seeded repos, live -, fallback -, failures 0 |
| `github-innovation-discovery` GitHub Innovation Discovery | needs_review | no | 0/0 queries with results, 0 candidates, failures 0 |
| `github-innovation-review-queue` GitHub Innovation Review Queue | needs_review | no | 0 review items, high -, execute 0, failures 0 |
| `codex-morning-routine-run` Codex Morning Routine Run | needs_review | no | fetch 2/2, behind 63, handoff 353, next remote_delta_review, failures 0 |
| `today-loop-plan` Today Loop Plan | needs_review | no | -, blocks 0, tick -m, checkup -m, failures 0 |
| `github-readme-signal-scan` GitHub README Signal Scan | needs_review | no | 0 scanned, README -, high-signal -, failures 0 |
| `github-fixture-contract-plan` GitHub Fixture Contract Plan | needs_review | no | 0 plans, prepare -, asset -, worker -, failures 0 |
| `github-promotion-matrix` GitHub Promotion Matrix | needs_review | no | missing GitHub promotion matrix |
| `github-fixture-skeletons` GitHub Fixture Skeletons | needs_review | no | 0 directories, 0 files, matrix -, executable 0, failures 0 |
| `github-fixture-payloads` GitHub Fixture Payloads | needs_review | no | 0 manifests, 0 payloads, executable 0, failures 0 |
| `github-fixture-payload-smoke` GitHub Fixture Payload Smoke | needs_review | no | 0 payloads, lanes 0/0, training -, content 0/0, failures 0 |
| `github-worker-integration-signal-bridge` GitHub Worker Integration Signal Bridge | needs_review | no | 0 candidates, top -, high -, executable 0, failures 0 |
| `github-worker-adapter-boundary-contract` GitHub Worker Adapter Boundary Contract | needs_review | no | -, commands 0, runtime 0, public 0, failures 0 |
| `github-worker-adapter-boundary-negative-fixtures` GitHub Worker Adapter Boundary Negative Fixtures | needs_review | no | 0 negative fixtures, blocked 0, categories 0, runtime 0, failures 0 |
| `github-worker-runtime-batch-readiness-plan` GitHub Worker Runtime Batch Readiness Plan | needs_review | no | 0/0 gates ready, blocked 0, runtime no, failures 0 |
| `github-worker-runtime-rollback-redaction-fixtures` GitHub Worker Runtime Rollback/Redaction Fixtures | needs_review | no | 0 groups, rules 0, rollback 0, runtime 0, failures 0 |
| `github-worker-runtime-apply-guard` GitHub Worker Runtime Apply Guard | needs_review | yes | exact reply missing, separate runtime blocked, execute 0, checks 0/0 |
| `github-worker-runtime-log-redaction-negative-fixtures` GitHub Worker Runtime Log-Redaction Negative Fixtures | needs_review | no | 0 negative fixtures, blocked 0, leak categories 0, runtime 0, failures 0 |
| `github-worker-runtime-batch-manifest-draft` GitHub Worker Runtime Batch Manifest Draft | needs_review | no | no batch, prereqs 0, blocked 0, gates open 0, executable no, failures 0 |
| `github-worker-runtime-manifest-negative-fixtures` GitHub Worker Runtime Manifest Negative Fixtures | needs_review | no | 0 manifest negatives, blocked 0, categories 0, executable 0, failures 0 |
| `github-worker-runtime-manifest-validator-plan` GitHub Worker Runtime Manifest Validator Plan | needs_review | no | 0 rules, fixtures 0, executable 0, failures 0 |
| `github-worker-runtime-manifest-validator` GitHub Worker Runtime Manifest Validator | needs_review | no | 0 manifests, blocked 0, review-only 0, failures 0 |
| `terminal-gate-audit` Terminal Gate Audit | needs_review | no | 0 terminal blockers, executable -, public-ready -, checks 0/0 |
| `worktree-guard-audit` Worktree Guard Audit | needs_review | no | 0 dirty entries, staged 0, untracked 0, broad stage blocked, failures 0 |
| `cross-worker-delta-audit` Cross-Worker Delta Audit | needs_review | no | 0/0 repos, latest handoff -, unmirrored -, foreign commits -, failures 0 |
| `training-eval-rubric` Training Eval Rubric | needs_review | no | 0 suites, 0 criteria, eval items 0, failures 0 |
| `training-eval-row-template` Training Eval Row Template | needs_review | no | 0 templates, 0 required fields, writes rows now 0, failures 0 |
| `training-eval-review-queue` Training Eval Review Queue | needs_review | no | 0 lanes, 0 states, queue items now 0, failures 0 |
| `architecture-ontology-seed` Architecture Ontology Seed | needs_review | no | 0 entities, 0 relations, 0 facet groups, failures 0 |
| `tomorrow-day-batch` Tomorrow Day Batch | needs_review | no | missing mode, target -, failures 0 |
| `worker-boundary` Worker Boundary | locked | no | 3 workers, 3 blocked command classes |
| `innovation` Innovation Lanes | needs_review | no | 0/0 public-safe smoke checks passed |
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
