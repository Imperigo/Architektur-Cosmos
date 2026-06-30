# Kosmo Owner Review Batch Resolution Ledger Check

Generated: 2026-06-30T07:10:45.632Z
Status: `owner_review_batch_resolution_ledger_guard_failed`

## Summary

- Checks: 13/17
- Failures: 4
- Public-ready after guard: 0

## Checks

- failed: `status_ready` - owner_review_batch_resolution_ledger_needs_review
- passed: `policy_review_only` - true
- passed: `no_reference_item_decisions` - false
- passed: `no_asset_approvals` - false
- passed: `no_session_writes` - false
- passed: `no_private_reads` - false
- passed: `no_private_inventory_now` - false
- passed: `no_public_writes` - false/false
- passed: `public_ready_zero` - 0
- failed: `all_batches_resolved` - 0/5
- failed: `all_items_resolved` - 0/16
- failed: `owner_action_zero` - 5
- passed: `five_resolutions` - 5
- passed: `resolution_public_ready_zero` - 0,0,0,0,0
- passed: `hard_stop_public_ready` - do not convert this ledger into public-ready approvals. do not copy private files into git. do not ocr or extract private source text from this ledger. do not run local llms on private file contents from this ledger.
- passed: `hard_stop_no_private_copy` - do not convert this ledger into public-ready approvals. do not copy private files into git. do not ocr or extract private source text from this ledger. do not run local llms on private file contents from this ledger.
- passed: `hard_stop_no_private_extraction` - do not convert this ledger into public-ready approvals. do not copy private files into git. do not ocr or extract private source text from this ledger. do not run local llms on private file contents from this ledger.
