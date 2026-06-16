# Kosmo Night Loop Checkpoint

Generated: 2026-06-16T17:45:36.332Z
Status: `night_loop_guarded_ready`

## Summary

- Data lane: 26/26 (kosmodata_lane_sweep_review_only_passed)
- Duration: 16872ms
- Router: worker_router_private_diagnostic_ready
- Owner brief: owner_next_review_brief_clear
- Owner open: 0 batches / 0 items
- Asset reviews open: 6
- Source root blocked: no
- Private inventory blocked: no
- Public-ready assets: 0
- Local worker review: local_worker_outputs_present_review_only, risk 0
- Private inventory contract: private_inventory_output_contract_passed

## Next Loop

Primary action: `resolve_asset_human_reviews`
First owner card: `batch-a-villa-savoye-image-candidates`

Recommended sequence:
- npm run kosmo:data-lane-sweep
- npm run kosmo:data-lane-command-router
- npm run kosmo:owner-next-review-brief
- npm run kosmo:owner-answer-sheet
- npm run kosmo:owner-answer-sheet-check
- npm run kosmo:owner-review-batch-resolution-ledger
- npm run kosmo:owner-review-batch-resolution-ledger-check
- Present one owner review card or record a confirmed source-root decision.
- After any decision edit, rerun sweep/router/checkpoint.

## Invariants

| Invariant | Status | Evidence |
| --- | --- | --- |
| `public_ready_zero` | passed | references_public_ready_assets=0 |
| `local_worker_review_only` | passed | public_ready_allowed=false, risk=0 |
| `private_inventory_contract` | passed | failures=0, public_ready_hits=0 |
| `router_blocks_private_without_root` | passed | private_diagnostic_allowed=true, private_inventory_allowed=true |

## Blocked Commands

- `public promotion / public_ready=true / R2-D1 public writes`: Separate owner, provenance and rights reviews are still required.
