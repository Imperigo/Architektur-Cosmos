# Kosmo Owner Unlock Reply Validator Smoke

Generated: 2026-06-15T10:37:01.829Z
Status: `owner_unlock_reply_validator_smoke_passed`

## Summary

- Cases: 4/4
- Failures: 0
- Expected invalid cases: 1
- Public-ready after smoke: 0

## Cases

- passed: `pending_no_answer` expected `owner_unlock_reply_validator_pending_owner_reply`, got `owner_unlock_reply_validator_pending_owner_reply`, exit 0
- passed: `valid_repair_onedrive_first` expected `owner_unlock_reply_valid`, got `owner_unlock_reply_valid`, exit 0
- passed: `valid_select_exact_root_review_only` expected `owner_unlock_reply_valid`, got `owner_unlock_reply_valid`, exit 0
- passed: `invalid_unlock_without_confirmation` expected `owner_unlock_reply_invalid`, got `owner_unlock_reply_invalid`, exit 1

## Hard Stops

- Smoke cases use synthetic owner replies only.
- Do not copy smoke answers into owner intake files.
- Do not run private inventory from this smoke.
- Do not read private content.
- Keep public-ready at 0.
