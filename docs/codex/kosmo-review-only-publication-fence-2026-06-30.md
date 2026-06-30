# Kosmo Review-only Publication Fence

Generated: 2026-06-30T12:59:31.768Z
Status: `kosmo_review_only_publication_fence_passed`

## Summary

- Checks: 54/54
- Warnings: 0
- Failures: 0
- Codex executable now: 0
- Owner pending items: 16
- References public-ready assets: 0
- Asset public-ready count: 0
- Public static routes passed: 11
- Public-ready after fence: 0

## Policy

- validates_existing_reports_only: true
- reads_private_content_now: false
- runs_private_inventory_now: false
- executes_local_workers_now: false
- writes_public_files_now: false
- uploads_assets_now: false
- promotes_public_ready_now: false
- public_ready_after_fence: 0

## Source Refs

- `data/kosmo-source-independent-work-queue-2026-06-30.json`
- `data/kosmodata-lane-sweep-2026-06-30.json`
- `data/kosmo-owner-unlock-pipeline-checkpoint-2026-06-30.json`
- `data/kosmo-human-decision-queue-2026-06-30.json`
- `examples/kosmo-references/review/kosmodraw-bundle-intake-review.generated.json`
- `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json`
- `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-promotion-guard.generated.json`
- `examples/kosmo-data/review/public-static-export-smoke.generated.json`

## Checks

- passed: `source_queue_ready` - source_independent_work_queue_ready
- passed: `source_queue_reads_private_false` - false
- passed: `source_queue_copies_private_false` - false
- passed: `source_queue_private_inventory_false` - false
- passed: `source_queue_local_worker_false` - false
- passed: `source_queue_public_writes_false` - {"queue_only":true,"source_root_required":false,"reads_private_content":false,"copies_private_content":false,"runs_private_inventory_now":false,"executes_local_worker_now":false,"writes_public_files":false,"writes_public_manifest":false,"public_ready_after_queue":0,"note":"This queue identifies safe source-independent work. It does not execute local workers or read private output contents."}
- passed: `source_queue_public_ready_zero` - 0
- passed: `source_queue_no_codex_executable_tasks` - 0
- passed: `lane_sweep_review_only_passed` - kosmodata_lane_sweep_review_only_passed
- passed: `lane_sweep_policy_review_only` - true
- passed: `lane_sweep_public_writes_blocked` - false
- passed: `lane_sweep_downloads_blocked` - false
- passed: `lane_sweep_references_public_ready_zero` - 0
- passed: `lane_sweep_assets_public_ready_zero` - 0
- passed: `lane_sweep_asset_promotion_blocked` - false/18
- passed: `lane_sweep_local_worker_public_blocked` - false/0
- passed: `lane_sweep_private_inventory_blocked` - false
- passed: `lane_sweep_source_root_diagnostic_blocked` - false
- passed: `lane_sweep_public_ready_after_briefs_zero` - {"villa":0,"ingenbohl":0,"sogn":0,"source_root_selection":0,"private_inventory_plan":0}
- passed: `owner_checkpoint_ready` - owner_unlock_pipeline_checkpoint_ready
- passed: `owner_checkpoint_no_decision_recording` - false
- passed: `owner_checkpoint_no_intake_write_now` - false
- passed: `owner_checkpoint_no_session_mutation_now` - false
- passed: `owner_checkpoint_no_private_reads_now` - false
- passed: `owner_checkpoint_no_private_inventory_now` - false
- passed: `owner_checkpoint_pending_owner` - pending
- passed: `owner_checkpoint_source_root_blocked` - blocked_until_explicit_owner_reply_and_guards
- passed: `owner_checkpoint_public_ready_zero` - 0
- passed: `human_queue_open` - human_decision_queue_open
- passed: `human_queue_records_no_decisions` - false
- passed: `human_queue_public_writes_blocked` - false
- passed: `human_queue_public_ready_zero` - 0
- passed: `human_queue_has_open_items` - 16
- passed: `references_intake_ready` - kosmodraw_bundle_intake_review_ready
- passed: `references_intake_review_only` - {"review_only":true,"metadata_only":true,"copies_ifc_paths_to_report":false,"copies_private_paths_to_report":false,"writes_public_data_now":false,"writes_mock_entries_now":false,"public_ready_after_intake":0,"owner_review_required_before_public_display":true}
- passed: `references_intake_public_writes_blocked` - {"review_only":true,"metadata_only":true,"copies_ifc_paths_to_report":false,"copies_private_paths_to_report":false,"writes_public_data_now":false,"writes_mock_entries_now":false,"public_ready_after_intake":0,"owner_review_required_before_public_display":true}
- passed: `references_intake_public_ready_zero` - 0
- passed: `references_intake_no_private_path_copy` - false
- passed: `references_intake_bundle_public_ready_zero` - [0,0]
- passed: `references_intake_public_display_zero` - [0,0]
- passed: `references_intake_no_failures` - 0
- passed: `asset_library_draft` - draft
- passed: `asset_library_public_use_false` - villa-savoye-concrete-frame-material-001:false,villa-savoye-five-points-diagram-001:false,sogn-benedetg-wood-shingle-material-001:false,sogn-benedetg-light-band-detail-001:false,ingenbohl-mineral-pigment-material-001:false,ingenbohl-concrete-core-frame-study-001:false
- passed: `asset_library_rights_need_review` - villa-savoye-concrete-frame-material-001:generated_needs_review/planned,villa-savoye-five-points-diagram-001:generated_needs_review/planned,sogn-benedetg-wood-shingle-material-001:generated_needs_review/needs_source,sogn-benedetg-light-band-detail-001:generated_needs_review/needs_source,ingenbohl-mineral-pigment-material-001:generated_needs_review/planned,ingenbohl-concrete-core-frame-study-001:generated_needs_review/needs_source
- passed: `asset_promotion_blocked` - asset_promotion_guard_blocked
- passed: `asset_promotion_no_uploads` - {"no_uploads":true,"no_public_downloads":true,"no_d1_writes":true,"no_r2_writes":true,"promotion_guard_does_not_promote_assets":true,"public_promotion_requires_separate_owner_review":true,"public_promotion_requires_public_rights_review":true}
- passed: `asset_promotion_not_promoting` - true
- passed: `asset_promotion_public_ready_zero` - 0
- passed: `asset_promotion_allowed_false` - false/18
- passed: `asset_promotion_unsafe_zero` - 0
- passed: `asset_promotion_rows_public_false` - villa-savoye-concrete-frame-material-001:false/false,villa-savoye-five-points-diagram-001:false/false,sogn-benedetg-wood-shingle-material-001:false/false,sogn-benedetg-light-band-detail-001:false/false,ingenbohl-mineral-pigment-material-001:false/false,ingenbohl-concrete-core-frame-study-001:false/false
- passed: `public_static_export_smoke_passed` - public_static_export_smoke_passed
- passed: `public_static_export_routes_passed` - {"route_count":11,"passed_routes":11,"failed_routes":0,"check_count":82,"failed_checks":0}
- passed: `public_static_export_checks_passed` - 0

## Hard Stops

- Do not treat this fence as owner approval.
- Do not run private inventory, OCR, embeddings, fine-tunes or local workers from this report.
- Do not promote public-ready state from review-only or owner-pending reports.

