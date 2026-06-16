# Kosmo Owner Unlock Reply Validator Smoke

Generated: 2026-06-16T04:58:33.976Z
Status: `owner_unlock_reply_validator_smoke_failed`

## Summary

- Cases: 0/5
- Failures: 5
- Expected invalid cases: 2
- Public-ready after smoke: 0

## Cases

- failed: `pending_no_answer` expected `owner_unlock_reply_validator_pending_owner_reply`, got `missing-output`, exit 1
- failed: `valid_repair_onedrive_first` expected `owner_unlock_reply_valid`, got `missing-output`, exit 1
- failed: `valid_select_exact_root_review_only` expected `owner_unlock_reply_valid`, got `missing-output`, exit 1
- failed: `invalid_unlock_without_confirmation` expected `owner_unlock_reply_invalid`, got `missing-output`, exit 1
- failed: `invalid_vague_all_free_grant` expected `owner_unlock_reply_invalid`, got `missing-output`, exit 1

## Hard Stops

- Smoke cases use synthetic owner replies only.
- Do not copy smoke answers into owner intake files.
- Do not run private inventory from this smoke.
- Do not read private content.
- Keep public-ready at 0.
