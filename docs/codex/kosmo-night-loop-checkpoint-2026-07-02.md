# Kosmo Night Loop Checkpoint

Generated: 2026-07-02T06:04:08.989Z
Status: `night_loop_needs_review`

## Summary

- Data lane: 28/29 (kosmodata_lane_sweep_failed)
- Duration: 19841ms
- Router: worker_router_guarded_review_only
- Owner brief: owner_next_review_brief_open
- Owner open: 5 batches / 16 items
- Asset reviews open: 6
- Source root blocked: yes
- Private inventory blocked: yes
- Public-ready assets: 0
- Local worker review: local_worker_outputs_present_review_only, risk 0
- Private inventory contract: private_inventory_output_contract_passed

## Next Loop

Primary action: `prepare_owner_source_root_decision_and_batch_questions`
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
| `router_blocks_private_without_root` | passed | private_diagnostic_allowed=false, private_inventory_allowed=false |

## Blocked Commands

- `npm run kosmo:private-library-diagnostic -- --roots "<selected-root>"`: Source-root decision session has not passed with private_diagnostic_allowed=true.
- `private inventory extraction or source-dependent asset authoring`: Private source inventory plan is still blocked.
- `public promotion / public_ready=true / R2-D1 public writes`: Separate owner, provenance and rights reviews are still required.
