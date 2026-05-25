# IFC Human Review Sync

Project ID: `kosmo-demo-001`
Generated: 2026-05-25T21:40:48.280Z
Status: `ifc_sync_blocked_pending_final_decision`
Candidate: `ifc-role-3-semantic_building_elements`
Source decision: `keep_needs_more_source_review`
Mapped context decision: `needs_more_source_review`

Dry-run by default. This report applies changes only when the command is run with explicit sync confirmation flags.

## Summary

- can sync: no
- apply mode: dry_run
- operations: 0
- context-selection would write: no
- source-mapping would write: no
- design generation approval: no
- recommended next step: `record_final_ifc_human_review_decision_first`

## Operations

- none

## Apply Command

```bash
npm run kosmo:ifc-human-review-sync -- --project examples/kosmo-projects/kosmo-demo-001 --apply --confirm-sync --i-understand-context-selection-mutation
```
