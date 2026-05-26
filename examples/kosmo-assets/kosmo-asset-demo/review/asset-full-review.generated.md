# KosmoAsset Full Review

Library: `kosmo-asset-demo`
Generated: 2026-05-26T19:54:18.022Z
Status: `asset_full_review_ready_for_human_decisions`

Review-only evening batch. This command runs the local KosmoAsset review chain and does not upload, publish, write D1/R2 or approve public use.

## Summary

- steps: 6/6
- assets: 3
- local ready: 3
- public ready: 0
- open human reviews: 3
- generated profiles: 4
- blocked routes: 0
- needs-review routes: 11
- Blender profiles: 2
- ArchiCAD profiles: 3
- Handoff smoke failures: 0

## Steps

| Step | Status | Report |
| --- | --- | --- |
| Library Check | passed | `examples/kosmo-assets/kosmo-asset-demo/review/asset-library-check.generated.json` |
| Export Plan | passed | `examples/kosmo-assets/kosmo-asset-demo/review/asset-export-plan.generated.json` |
| Review Pack | passed | `examples/kosmo-assets/kosmo-asset-demo/review/asset-review-pack.generated.json` |
| Exchange Profile | passed | `examples/kosmo-assets/kosmo-asset-demo/review/asset-exchange-profile.generated.json` |
| Handoff Bundle | passed | `examples/kosmo-assets/kosmo-asset-demo/review/asset-handoff-bundle.generated.json` |
| Handoff Smoke | passed | `examples/kosmo-assets/kosmo-asset-demo/review/asset-handoff-smoke.generated.json` |

## Assets

| Asset | Human Review | Public Gate | Blender | ArchiCAD | Suggested Decision |
| --- | --- | --- | --- | --- | --- |
| Kosmo Axis Marker | open | blocked | no | yes | complete_human_review_before_promotion |
| Warm Concrete Study Material | open | blocked | yes | yes | complete_human_review_before_promotion |
| Generic Column GLB Slot | open | blocked | yes | yes | complete_human_review_before_promotion |

## Outputs

- full_review_json: `examples/kosmo-assets/kosmo-asset-demo/review/asset-full-review.generated.json`
- full_review_markdown: `examples/kosmo-assets/kosmo-asset-demo/review/asset-full-review.generated.md`
- library_check: `examples/kosmo-assets/kosmo-asset-demo/review/asset-library-check.generated.md`
- export_plan: `examples/kosmo-assets/kosmo-asset-demo/review/asset-export-plan.generated.md`
- review_pack: `examples/kosmo-assets/kosmo-asset-demo/review/asset-review-pack.generated.md`
- exchange_profile: `examples/kosmo-assets/kosmo-asset-demo/review/asset-exchange-profile.generated.md`
- handoff_bundle: `examples/kosmo-assets/kosmo-asset-demo/review/asset-handoff-bundle.generated.md`
- handoff_smoke: `examples/kosmo-assets/kosmo-asset-demo/review/asset-handoff-smoke.generated.md`

## Next Actions

- Use this full-review report as the evening batch checkpoint for KosmoAsset.
- Record explicit local human review decisions per asset/route before any production import smoke.
- Keep public downloads, R2 uploads and D1 writes disabled.
