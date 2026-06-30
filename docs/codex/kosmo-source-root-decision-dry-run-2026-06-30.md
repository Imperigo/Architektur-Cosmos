# Kosmo Source-Root Decision Dry Run

Generated: 2026-06-30T06:51:13.854Z
Status: `source_root_decision_dry_run_needs_review`

## Summary

- Packet status: source_root_owner_decision_packet_ready
- Packet guard: source_root_owner_decision_packet_guard_passed
- Activation status: source_root_activation_waiting_for_owner_storage_action
- Private metadata guard: private_metadata_inventory_guard_failed
- Scenarios: 3
- Metadata-diagnostic scenarios: 1
- Blocked scenarios: 2
- Failures: 1
- Public-ready after dry run: 0

## Scenarios

| Scenario | Decision | Root | Metadata diagnostic after recording | Next status | Caution |
| --- | --- | --- | --- | --- | --- |
| `keep_blocked` | `keep_blocked` | `null` | no | source_root_remains_blocked | Owner is not ready to identify the complete private architecture library root. |
| `repair_onedrive_first` | `repair_onedrive_first` | `null` | no | source_root_remains_blocked | Owner says the intended source root is a OneDrive mirror but sync markers/completeness are not resolved. |
| `select_exact_root_1` | `select_existing_root_for_private_diagnostic` | `/mnt/archiv/ArchitekturKosmos/Assets` | yes | source_root_activation_preflight_required | Visible archive subtree; owner/overseer may confirm this exact path before diagnostics. |

## Still Forbidden In All Scenarios

- private OCR or PDF/book text extraction
- copying private scans, plans, images or lecture material into Git
- public-ready promotion for source-dependent references or assets
- local LLM tasks that read private file contents before activation and output guards

## Exact Commands After Owner Records Decision

- `npm run kosmo:source-root-decision-session-check`
- `npm run kosmo:source-root-blocker-refresh`
- `npm run kosmo:source-root-activation-preflight`
- `npm run kosmo:private-metadata-inventory`
- `npm run kosmo:private-metadata-inventory-check`
- `npm run kosmo:day-batch-loop`

## Failures

- Private metadata guard not passed: private_metadata_inventory_guard_failed
