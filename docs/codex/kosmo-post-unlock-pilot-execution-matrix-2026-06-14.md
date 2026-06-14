# Kosmo Post-Unlock Pilot Execution Matrix

Generated: 2026-06-14T18:07:28.188Z
Status: `post_unlock_pilot_execution_matrix_ready`

## Summary

- Pilots: 3
- Reference stages: 24/24 blocked now
- Evidence gaps: 12
- Asset stages: 18
- Asset count: 6
- Command sequence steps: 10
- Owner unlock: 11 components, 113 guards
- Executable now: 0
- Public-ready after matrix: 0

## Pilots

- Villa Savoye: references 8/8 blocked, assets 2, asset stages 6, public-ready 0
- Kapelle Sogn Benedetg: references 8/8 blocked, assets 2, asset stages 6, public-ready 0
- Alterszentrum Kloster Ingenbohl: references 8/8 blocked, assets 2, asset stages 6, public-ready 0

## Command Sequence

- `owner_answer_dry_run`: npm run kosmo:owner-unlock-answer-dry-run -- --answer "<owner_reply>"
- `record_owner_source_root_choice`: Record explicit owner answer in decision session; no automatic selection.
- `source_root_decision_session_check`: npm run kosmo:source-root-decision-session-check
- `source_root_blocker_refresh`: npm run kosmo:source-root-blocker-refresh
- `source_root_activation_preflight`: npm run kosmo:source-root-activation-preflight
- `post_owner_activation_queue`: npm run kosmo:source-root-post-owner-activation-queue
- `post_owner_activation_queue_check`: npm run kosmo:source-root-post-owner-activation-queue-check
- `private_metadata_inventory`: npm run kosmo:private-metadata-inventory
- `private_metadata_inventory_check`: npm run kosmo:private-metadata-inventory-check
- `day_batch_loop`: npm run kosmo:day-batch-loop

## Next Actions After Owner Reply

- Run owner unlock answer dry-run and review generated intake map.
- Apply reviewed intake only if owner intent is unambiguous.
- Run source-root guards before private metadata inventory.
- Run pilot-scoped metadata inventory before any OCR, asset generation or public promotion.
- Keep all three pilot packages review-only until provenance and rights gates pass.

## Hard Stops

- Do not run private inventory from this matrix.
- Do not read private content from this matrix.
- Do not generate assets from private sources before owner/source-root gates pass.
- Do not mark any pilot or asset public-ready.
