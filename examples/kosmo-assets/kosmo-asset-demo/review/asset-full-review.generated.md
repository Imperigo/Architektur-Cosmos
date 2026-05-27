# KosmoAsset Full Review

Library: `kosmo-asset-demo`
Generated: 2026-05-27T20:17:45.400Z
Status: `asset_full_review_ready_for_human_decisions`

Review-only evening batch. This command runs the local KosmoAsset review chain and does not upload, publish, write D1/R2 or approve public use.

## Summary

- steps: 10/10
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
- human review session: asset_human_review_session_open
- human review session open items: 3
- decision ledger: asset_decision_ledger_open
- recorded decisions: 1
- missing decisions: 2
- sandbox ready: 0
- certificates: 0/0
- certificate smoke: asset_certificate_smoke_passed
- promotion guard: asset_promotion_guard_blocked
- promotion blockers: 6
- promotion allowed: no

## Steps

| Step | Status | Report |
| --- | --- | --- |
| Library Check | passed | `examples/kosmo-assets/kosmo-asset-demo/review/asset-library-check.generated.json` |
| Export Plan | passed | `examples/kosmo-assets/kosmo-asset-demo/review/asset-export-plan.generated.json` |
| Review Pack | passed | `examples/kosmo-assets/kosmo-asset-demo/review/asset-review-pack.generated.json` |
| Exchange Profile | passed | `examples/kosmo-assets/kosmo-asset-demo/review/asset-exchange-profile.generated.json` |
| Handoff Bundle | passed | `examples/kosmo-assets/kosmo-asset-demo/review/asset-handoff-bundle.generated.json` |
| Handoff Smoke | passed | `examples/kosmo-assets/kosmo-asset-demo/review/asset-handoff-smoke.generated.json` |
| Human Review Session | passed | `examples/kosmo-assets/kosmo-asset-demo/review/asset-human-review-session.generated.json` |
| Decision Ledger | passed | `examples/kosmo-assets/kosmo-asset-demo/review/asset-decision-ledger.generated.json` |
| Certificate Smoke | passed | `examples/kosmo-assets/kosmo-asset-demo/review/asset-certificate-smoke.generated.json` |
| Promotion Guard | passed | `examples/kosmo-assets/kosmo-asset-demo/review/asset-promotion-guard.generated.json` |

## Assets

| Asset | Human Review | Priority | Route | Decision | Certificate | Sandbox | Public Gate | Blender | ArchiCAD | Suggested Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Kosmo Axis Marker | open | normal | archicad | missing_decision | - | no | blocked | no | yes | complete_human_review_before_promotion |
| Warm Concrete Study Material | open | high | blender | needs_review_recorded | - | no | blocked | yes | yes | complete_human_review_before_promotion |
| Generic Column GLB Slot | open | high | blender | missing_decision | - | no | blocked | yes | yes | complete_human_review_before_promotion |

## Outputs

- full_review_json: `examples/kosmo-assets/kosmo-asset-demo/review/asset-full-review.generated.json`
- full_review_markdown: `examples/kosmo-assets/kosmo-asset-demo/review/asset-full-review.generated.md`
- library_check: `examples/kosmo-assets/kosmo-asset-demo/review/asset-library-check.generated.md`
- export_plan: `examples/kosmo-assets/kosmo-asset-demo/review/asset-export-plan.generated.md`
- review_pack: `examples/kosmo-assets/kosmo-asset-demo/review/asset-review-pack.generated.md`
- exchange_profile: `examples/kosmo-assets/kosmo-asset-demo/review/asset-exchange-profile.generated.md`
- handoff_bundle: `examples/kosmo-assets/kosmo-asset-demo/review/asset-handoff-bundle.generated.md`
- handoff_smoke: `examples/kosmo-assets/kosmo-asset-demo/review/asset-handoff-smoke.generated.md`
- human_review_session: `examples/kosmo-assets/kosmo-asset-demo/review/asset-human-review-session.generated.md`
- decision_ledger: `examples/kosmo-assets/kosmo-asset-demo/review/asset-decision-ledger.generated.md`
- certificate_smoke: `examples/kosmo-assets/kosmo-asset-demo/review/asset-certificate-smoke.generated.md`
- promotion_guard: `examples/kosmo-assets/kosmo-asset-demo/review/asset-promotion-guard.generated.md`

## Next Actions

- Use this full-review report as the evening batch checkpoint for KosmoAsset.
- Complete asset-human-review-session.generated.md before recording explicit local decisions per asset/route.
- Use asset-decision-ledger.generated.md to verify which decisions are still missing.
- Use asset-promotion-guard.generated.md as the final local-only promotion stop.
- Keep public downloads, R2 uploads and D1 writes disabled.
