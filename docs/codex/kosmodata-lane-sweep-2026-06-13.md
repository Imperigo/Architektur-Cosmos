# KosmoData Lane Sweep

Generated: 2026-06-13T20:00:09.997Z
Status: `kosmodata_lane_sweep_review_only_passed`

## Summary

- Steps passed: 12/12
- Duration: 13234ms
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
- Villa brief: villa_provenance_review_brief_ready
- Villa candidates/blocked: 3/4
- Villa public-ready after brief: 0
- Ingenbohl brief: ingenbohl_pdf_extraction_decision_needed
- Ingenbohl PDF links: 1
- Ingenbohl public-ready after brief: 0
- Sogn brief: sogn_source_root_decision_needed
- Sogn public links/local files: 4/0
- Sogn public-ready after brief: 0
- Source-root locator: source_root_candidates_need_owner_selection
- Source-root locator probable/candidates: 0/708
- Source-root locator mirrors/sync roots: 64/5
- Source-root selection: source_root_owner_selection_needed
- Source-root selection options: 10
- Source-root selection public-ready after brief: 0
- Source-root decision session: passed_pending_owner_input
- Source-root selected decision: pending
- Source-root selected root exists: false
- Source-root private diagnostic allowed: no
- Source-root decision public-ready after session: 0

## Steps

| Step | Status | Duration | Report |
| --- | --- | ---: | --- |
| KosmoReferences Nightly Gate | passed | 7266ms | `data/kosmoreferences-nightly-gate-2026-06-13.json` |
| KosmoAsset Seed Full Review | passed | 3496ms | `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-full-review.generated.json` |
| Human Decision Queue | passed | 238ms | `data/kosmo-human-decision-queue-2026-06-13.json` |
| Owner Decision Batches | passed | 235ms | `data/kosmo-human-decision-owner-batches-2026-06-13.json` |
| Local Worker Output Review | passed | 238ms | `data/kosmo-local-worker-output-review-2026-06-13.json` |
| Pilot Evidence Matrix | passed | 233ms | `data/kosmoreferences-pilot-evidence-matrix-2026-06-13.json` |
| Villa Savoye Provenance Review Brief | passed | 236ms | `data/villa-savoye-provenance-review-brief-2026-06-13.json` |
| Ingenbohl PDF Extraction Brief | passed | 227ms | `data/ingenbohl-pdf-extraction-decision-brief-2026-06-13.json` |
| Sogn Benedetg Source-Root Brief | passed | 235ms | `data/sogn-benedetg-source-root-decision-brief-2026-06-13.json` |
| Source Root Locator | passed | 371ms | `data/kosmo-source-root-locator-2026-06-13.json` |
| Source Root Selection Brief | passed | 229ms | `data/kosmo-source-root-selection-brief-2026-06-13.json` |
| Source Root Decision Session Check | passed | 228ms | `data/kosmo-source-root-decision-session-check-2026-06-13.json` |

## Next Actions

- Owner resolves 10 KosmoReferences decisions before public promotion review.
- Complete 6 KosmoAsset human reviews before local approvals or sandbox certificates.
- Use 5 owner decision batches for review rounds instead of asking all open items at once.
- Track 12 pilot evidence gaps across Villa Savoye, Sogn Benedetg and Ingenbohl.
- Keep 4 Villa Savoye files blocked until source-basis/build-log review exists.
- Decide whether Ingenbohl PDF remains link-only or enters private metadata-only extraction.
- Keep Sogn Benedetg link-only until the real private source root is visible and inventoried.
- Select or mount the real source root; source-root locator has 0 probable large private libraries.
- Use the source-root selection brief before any private inventory or source-dependent authoring.
- Record the source-root decision session before any private diagnostic.
- Expose or mount the real large private book/ETH/HSLU library root.
- Resolve 30 OneDrive sync error marker files before treating the visible mirror as complete.
- Keep public-ready assets at 0 until separate owner and promotion reviews pass.
