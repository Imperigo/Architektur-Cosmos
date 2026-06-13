# KosmoAsset Full Review

Library: `kosmoreferences-pilot-seed-library-2026-06-13`
Generated: 2026-06-13T18:37:37.365Z
Status: `asset_full_review_ready_for_human_decisions`

Review-only evening batch. This command runs the local KosmoAsset review chain and does not upload, publish, write D1/R2 or approve public use.

## Summary

- steps: 10/10
- assets: 6
- local ready: 0
- public ready: 0
- open human reviews: 6
- generated profiles: 0
- blocked routes: 1
- needs-review routes: 0
- Blender profiles: 4
- ArchiCAD profiles: 4
- Handoff smoke failures: 0
- human review session: asset_human_review_session_blocked
- human review session open items: 6
- decision ledger: asset_decision_ledger_open
- recorded decisions: 0
- missing decisions: 6
- sandbox ready: 0
- certificates: 0/0
- certificate smoke: asset_certificate_smoke_passed
- promotion guard: asset_promotion_guard_blocked
- promotion blockers: 18
- promotion allowed: no

## Steps

| Step | Status | Report |
| --- | --- | --- |
| Library Check | passed | `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-library-check.generated.json` |
| Export Plan | passed | `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-export-plan.generated.json` |
| Review Pack | passed | `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-review-pack.generated.json` |
| Exchange Profile | passed | `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-exchange-profile.generated.json` |
| Handoff Bundle | passed | `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-handoff-bundle.generated.json` |
| Handoff Smoke | passed | `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-handoff-smoke.generated.json` |
| Human Review Session | passed | `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-human-review-session.generated.json` |
| Decision Ledger | passed | `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-decision-ledger.generated.json` |
| Certificate Smoke | passed | `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-certificate-smoke.generated.json` |
| Promotion Guard | passed | `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-promotion-guard.generated.json` |

## Assets

| Asset | Human Review | Priority | Route | Decision | Certificate | Sandbox | Public Gate | Blender | ArchiCAD | Suggested Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Villa Savoye Concrete Frame Material Study | open | blocked | blender | missing_decision | - | no | blocked | yes | yes | complete_human_review_before_promotion |
| Villa Savoye Five Points Diagram Kit | open | blocked | web | missing_decision | - | no | blocked | no | no | complete_human_review_before_promotion |
| Sogn Benedetg Wood Shingle Material Study | open | blocked | blender | missing_decision | - | no | blocked | yes | yes | complete_human_review_before_promotion |
| Sogn Benedetg Light Band Detail Study | open | blocked | dxf | missing_decision | - | no | blocked | no | no | complete_human_review_before_promotion |
| Ingenbohl Mineral Pigment Material Study | open | blocked | blender | missing_decision | - | no | blocked | yes | yes | complete_human_review_before_promotion |
| Ingenbohl Concrete Core and Frame Study | open | blocked | blender | missing_decision | - | no | blocked | yes | yes | keep_blocked_until_export_routes_are_fixed |

## Outputs

- full_review_json: `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-full-review.generated.json`
- full_review_markdown: `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-full-review.generated.md`
- library_check: `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-library-check.generated.md`
- export_plan: `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-export-plan.generated.md`
- review_pack: `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-review-pack.generated.md`
- exchange_profile: `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-exchange-profile.generated.md`
- handoff_bundle: `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-handoff-bundle.generated.md`
- handoff_smoke: `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-handoff-smoke.generated.md`
- human_review_session: `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-human-review-session.generated.md`
- decision_ledger: `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-decision-ledger.generated.md`
- certificate_smoke: `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-certificate-smoke.generated.md`
- promotion_guard: `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-promotion-guard.generated.md`

## Next Actions

- Use this full-review report as the evening batch checkpoint for KosmoAsset.
- Complete asset-human-review-session.generated.md before recording explicit local decisions per asset/route.
- Use asset-decision-ledger.generated.md to verify which decisions are still missing.
- Use asset-promotion-guard.generated.md as the final local-only promotion stop.
- Keep public downloads, R2 uploads and D1 writes disabled.
