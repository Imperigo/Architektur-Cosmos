# KosmoData Lane Sweep

Generated: 2026-06-13T19:12:39.470Z
Status: `kosmodata_lane_sweep_review_only_passed`

## Summary

- Steps passed: 6/6
- Duration: 16726ms
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
- Local worker review: local_worker_outputs_present_review_only
- Local worker outputs: 7/7
- Local worker missing outputs: 0
- Local worker invalid JSON outputs: 0
- Local worker high-risk hits: 0
- Local worker public-ready allowed: no
- Pilot evidence matrix: pilot_evidence_matrix_review_only
- Pilot evidence pilots: 3
- Pilot evidence gaps: 12
- Pilot media slots blocked: 12
- Pilot asset candidates blocked: 9
- Pilot evidence public-ready assets: 0

## Steps

| Step | Status | Duration | Report |
| --- | --- | ---: | --- |
| KosmoReferences Nightly Gate | passed | 12275ms | `data/kosmoreferences-nightly-gate-2026-06-13.json` |
| KosmoAsset Seed Full Review | passed | 3527ms | `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-full-review.generated.json` |
| Human Decision Queue | passed | 231ms | `data/kosmo-human-decision-queue-2026-06-13.json` |
| Owner Decision Batches | passed | 232ms | `data/kosmo-human-decision-owner-batches-2026-06-13.json` |
| Local Worker Output Review | passed | 229ms | `data/kosmo-local-worker-output-review-2026-06-13.json` |
| Pilot Evidence Matrix | passed | 230ms | `data/kosmoreferences-pilot-evidence-matrix-2026-06-13.json` |

## Next Actions

- Owner resolves 10 KosmoReferences decisions before public promotion review.
- Complete 6 KosmoAsset human reviews before local approvals or sandbox certificates.
- Use 5 owner decision batches for review rounds instead of asking all open items at once.
- Track 12 pilot evidence gaps across Villa Savoye, Sogn Benedetg and Ingenbohl.
- Expose or mount the real large private book/ETH/HSLU library root.
- Resolve 30 OneDrive sync error marker files before treating the visible mirror as complete.
- Keep public-ready assets at 0 until separate owner and promotion reviews pass.
