# KosmoData Lane Sweep

Generated: 2026-06-13T18:50:58.788Z
Status: `kosmodata_lane_sweep_review_only_passed`

## Summary

- Steps passed: 4/4
- Duration: 16496ms
- KosmoReferences: passed_review_only (10/10)
- References public-ready assets: 0
- References owner pending: 10
- Private library: small_workflow_mirror_visible
- Private library sync errors: 30
- KosmoAsset: asset_full_review_ready_for_human_decisions (10/10)
- KosmoAsset open human reviews: 6
- KosmoAsset public-ready assets: 0
- KosmoAsset promotion allowed: no
- KosmoAsset promotion blockers: 18
- Human decision queue: human_decision_queue_open
- Human decision open items: 16
- Human decision split: 10 references / 6 assets
- Owner decision batches: owner_decision_batches_open
- Owner decision batches open: 5/5
- Owner decision batch items open: 16

## Steps

| Step | Status | Duration | Report |
| --- | --- | ---: | --- |
| KosmoReferences Nightly Gate | passed | 12491ms | `data/kosmoreferences-nightly-gate-2026-06-13.json` |
| KosmoAsset Seed Full Review | passed | 3541ms | `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-full-review.generated.json` |
| Human Decision Queue | passed | 232ms | `data/kosmo-human-decision-queue-2026-06-13.json` |
| Owner Decision Batches | passed | 231ms | `data/kosmo-human-decision-owner-batches-2026-06-13.json` |

## Next Actions

- Owner resolves 10 KosmoReferences decisions before public promotion review.
- Complete 6 KosmoAsset human reviews before local approvals or sandbox certificates.
- Use 5 owner decision batches for review rounds instead of asking all open items at once.
- Expose or mount the real large private book/ETH/HSLU library root.
- Resolve 30 OneDrive sync error marker files before treating the visible mirror as complete.
- Keep public-ready assets at 0 until separate owner and promotion reviews pass.
