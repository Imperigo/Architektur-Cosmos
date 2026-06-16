# Kosmo Owner Unlock Intake Apply Plan Check

Generated: 2026-06-16T17:47:22.180Z
Status: `owner_unlock_intake_apply_plan_guard_failed`

## Summary

- Checks: 20/22
- Failures: 2
- Warnings: 0
- Public-ready after check: 0

## Checks

- failed: `status_ready` - owner_unlock_intake_apply_plan_needs_review
- passed: `policy_review_only` - true
- passed: `policy_plan_only` - true
- passed: `policy_no_write_now` - false/false
- passed: `policy_no_decision_recording` - false
- passed: `policy_no_session_mutation` - false
- passed: `policy_no_source_root_guards_now` - false
- passed: `policy_no_private_reads` - false
- passed: `policy_no_private_inventory` - false
- passed: `public_ready_zero` - 0
- passed: `planned_field_count` - 13
- passed: `source_root_field_count` - 3
- passed: `owner_card_field_count` - 10
- failed: `target_empty_before_apply` - false
- passed: `selected_root_exists` - true
- passed: `all_fields_write_false` - 
- passed: `after_apply_intake_check_first` - npm run kosmo:owner-answer-intake-check npm run kosmo:owner-answer-session-edit-plan npm run kosmo:source-root-decision-session-check npm run kosmo:source-root-blocker-refresh npm run kosmo:source-root-activation-preflight
- passed: `hard_stop_no_auto_apply` - do not apply this plan automatically. do not overwrite non-empty owner intake fields without a fresh review. do not mutate session files from this plan. do not run source-root guards from this plan. do not read private content. keep public-ready at 0.
- passed: `hard_stop_no_overwrite` - do not apply this plan automatically. do not overwrite non-empty owner intake fields without a fresh review. do not mutate session files from this plan. do not run source-root guards from this plan. do not read private content. keep public-ready at 0.
- passed: `hard_stop_no_session_mutation` - do not apply this plan automatically. do not overwrite non-empty owner intake fields without a fresh review. do not mutate session files from this plan. do not run source-root guards from this plan. do not read private content. keep public-ready at 0.
- passed: `hard_stop_no_private_content` - do not apply this plan automatically. do not overwrite non-empty owner intake fields without a fresh review. do not mutate session files from this plan. do not run source-root guards from this plan. do not read private content. keep public-ready at 0.
- passed: `hard_stop_public_ready_zero` - do not apply this plan automatically. do not overwrite non-empty owner intake fields without a fresh review. do not mutate session files from this plan. do not run source-root guards from this plan. do not read private content. keep public-ready at 0.
