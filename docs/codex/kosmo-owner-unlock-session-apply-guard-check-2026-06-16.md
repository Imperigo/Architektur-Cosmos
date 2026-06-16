# Kosmo Owner Unlock Session Apply Guard Check

Generated: 2026-06-16T17:47:23.227Z
Status: `owner_unlock_session_apply_guard_check_failed`

## Summary

- Guard status: owner_unlock_session_apply_guard_failed
- Mode: applied_matches_preview
- Checks: 16/18
- Failures: 2
- Public-ready after check: 0

## Checks

- failed: `status_acceptable` - owner_unlock_session_apply_guard_failed
- passed: `policy_guard_only` - true
- passed: `policy_no_session_writes` - false
- passed: `policy_no_decisions_now` - false
- passed: `policy_no_private_reads` - false
- passed: `policy_no_private_inventory` - false
- passed: `public_ready_zero` - 0
- passed: `target_current_session` - examples/kosmo-references/provenance/source-root-decision-session-2026-06-16.json
- passed: `expected_status_recorded` - source_root_decision_session_recorded
- passed: `expected_decision_exact` - select_existing_root_for_private_diagnostic
- passed: `expected_root_assets` - /mnt/archiv/ArchitekturKosmos/Assets
- passed: `pending_or_matches_preview` - false/true
- passed: `waiting_blocks_private_diagnostic` - false
- failed: `applied_allows_private_diagnostic` - false
- passed: `hard_stop_no_auto_apply` - do not apply this guard automatically. do not infer approval from a broad freeform reply. do not run private inventory while this guard is waiting. do not change public-ready state.
- passed: `hard_stop_no_freeform` - do not apply this guard automatically. do not infer approval from a broad freeform reply. do not run private inventory while this guard is waiting. do not change public-ready state.
- passed: `hard_stop_no_inventory_while_waiting` - do not apply this guard automatically. do not infer approval from a broad freeform reply. do not run private inventory while this guard is waiting. do not change public-ready state.
- passed: `hard_stop_no_public_ready` - do not apply this guard automatically. do not infer approval from a broad freeform reply. do not run private inventory while this guard is waiting. do not change public-ready state.
