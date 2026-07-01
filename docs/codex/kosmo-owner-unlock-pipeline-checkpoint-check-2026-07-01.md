# Kosmo Owner Unlock Pipeline Checkpoint Check

Generated: 2026-07-01T06:01:50.178Z
Status: `owner_unlock_pipeline_checkpoint_guard_failed`

## Summary

- Checks: 22/32
- Failures: 10
- Warnings: 0
- Public-ready after check: 0

## Checks

- failed: `status_ready` - owner_unlock_pipeline_checkpoint_attention_required
- passed: `policy_checkpoint_only` - true
- passed: `policy_no_decisions` - false
- passed: `policy_no_intake_write` - false
- passed: `policy_no_session_mutation` - false
- passed: `policy_no_commands_now` - false
- passed: `policy_no_private_reads` - false
- passed: `policy_no_inventory_now` - false
- passed: `public_ready_zero` - 0
- passed: `twenty_seven_components` - 27
- failed: `all_components_ready` - 0/27
- failed: `guard_checks_at_least_280` - 0
- passed: `guard_checks_all_passed` - 0/0
- passed: `freeform_rejection_accounted` - 0
- failed: `latest_handoffs_include_277_or_newer` - -
- passed: `owner_reply_not_applied` - pending
- passed: `source_root_blocked` - blocked_until_explicit_owner_reply_and_guards
- failed: `path_a_ready_after_exact_reply` - false
- failed: `selected_root_preview_exists` - false
- passed: `session_preview_no_writes_now` - false
- failed: `session_apply_guard_present` - -
- passed: `session_apply_waiting_blocks_private_diagnostic` - false
- failed: `session_apply_smoke_passed` - missing_input
- failed: `session_apply_smoke_mode_applied` - -
- failed: `session_apply_smoke_allows_private_diagnostic` - false
- passed: `session_apply_smoke_no_real_write` - false
- passed: `applies_decision_now_false` - false
- passed: `component_public_ready_zero` - 
- passed: `hard_stop_no_approval` - do not treat this checkpoint as owner approval. do not read private content from this checkpoint. do not run private inventory from this checkpoint. do not mark private-derived material public-ready.
- passed: `hard_stop_no_private_content` - do not treat this checkpoint as owner approval. do not read private content from this checkpoint. do not run private inventory from this checkpoint. do not mark private-derived material public-ready.
- passed: `hard_stop_no_inventory` - do not treat this checkpoint as owner approval. do not read private content from this checkpoint. do not run private inventory from this checkpoint. do not mark private-derived material public-ready.
- passed: `hard_stop_no_public_ready` - do not treat this checkpoint as owner approval. do not read private content from this checkpoint. do not run private inventory from this checkpoint. do not mark private-derived material public-ready.
