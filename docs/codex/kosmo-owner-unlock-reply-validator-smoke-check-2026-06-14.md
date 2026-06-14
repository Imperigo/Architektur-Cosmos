# Kosmo Owner Unlock Reply Validator Smoke Check

Generated: 2026-06-14T17:35:56.461Z
Status: `owner_unlock_reply_validator_smoke_guard_passed`

## Summary

- Checks: 21/21
- Failures: 0
- Warnings: 0
- Public-ready after check: 0

## Checks

- passed: `status_passed` - owner_unlock_reply_validator_smoke_passed
- passed: `policy_smoke_only` - true
- passed: `policy_validator_cli_only` - true
- passed: `policy_no_decisions` - false
- passed: `policy_no_intake_mutation` - false
- passed: `policy_no_session_mutation` - false
- passed: `policy_no_private_reads` - false
- passed: `policy_no_inventory_now` - false
- passed: `public_ready_zero` - 0
- passed: `four_cases` - pending_no_answer,valid_repair_onedrive_first,valid_select_exact_root_review_only,invalid_unlock_without_confirmation
- passed: `all_cases_passed` - 
- passed: `pending_case_present` - owner_unlock_reply_validator_pending_owner_reply
- passed: `repair_case_valid` - owner_unlock_reply_valid
- passed: `select_root_case_valid` - owner_unlock_reply_valid
- passed: `invalid_case_rejected` - owner_unlock_reply_invalid
- passed: `invalid_case_exit_one` - 1
- passed: `one_expected_invalid_case` - 1
- passed: `hard_stops_no_intake_copy` - smoke cases use synthetic owner replies only. do not copy smoke answers into owner intake files. do not run private inventory from this smoke. do not read private content. keep public-ready at 0.
- passed: `hard_stops_no_inventory` - smoke cases use synthetic owner replies only. do not copy smoke answers into owner intake files. do not run private inventory from this smoke. do not read private content. keep public-ready at 0.
- passed: `hard_stops_no_private_content` - smoke cases use synthetic owner replies only. do not copy smoke answers into owner intake files. do not run private inventory from this smoke. do not read private content. keep public-ready at 0.
- passed: `hard_stops_public_ready_zero` - smoke cases use synthetic owner replies only. do not copy smoke answers into owner intake files. do not run private inventory from this smoke. do not read private content. keep public-ready at 0.
