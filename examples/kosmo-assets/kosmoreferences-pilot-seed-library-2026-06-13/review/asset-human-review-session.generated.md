# KosmoAsset Human Review Session

Library: `kosmoreferences-pilot-seed-library-2026-06-13`
Generated: 2026-06-13T18:15:50.695Z
Status: `asset_human_review_session_blocked`

Editable local human-review session. This file does not approve assets, does not certify quality, does not upload, publish, write D1/R2 or open public gates.

## Summary

- assets: 6
- open items: 6
- blocked items: 6
- local ready: 0
- public ready: 0
- handoff smoke passed: yes
- generated profiles: 0
- recommended next step: `complete_asset_human_review_session_before_approval_commands`

## Certificate Seed

- status: `not_certified`
- note: This session is evidence for later Architecture Kosmos quality certification, but it does not certify the asset yet.

## Decision States

| State | Command | Meaning | Guard |
| --- | --- | --- | --- |
| approved | `approve-local` | A named human reviewer accepted this asset/route for local sandbox evidence only. | Public gate stays blocked and a local review certificate is still required before sandbox-ready status. |
| needs_more_evidence | `needs-review` | The asset remains in human review because source, rights, file, scale, layer or quality checks are not complete. | No sandbox, public gate or publication can be inferred from this note. |
| blocked | `block-public` | The reviewer explicitly keeps web/download/R2 release closed. | Local metadata may remain visible for review; public use needs a separate rights and owner review. |
| rejected | `reject` | The asset/route is not acceptable for exchange workflows. | Keep it out of Blender, ArchiCAD and public promotion paths until a new review replaces this decision. |

## Review Rows

| Asset | Priority | Human Review | Route | Rights | Suggested Decision | Blockers |
| --- | --- | --- | --- | --- | --- | --- |
| Villa Savoye Concrete Frame Material Study | blocked | open | blender | generated_needs_review | complete_human_review_before_promotion | local_files_or_library_check_missing |
| Villa Savoye Five Points Diagram Kit | blocked | open | web | generated_needs_review | complete_human_review_before_promotion | local_files_or_library_check_missing |
| Sogn Benedetg Wood Shingle Material Study | blocked | open | blender | generated_needs_review | complete_human_review_before_promotion | local_files_or_library_check_missing |
| Sogn Benedetg Light Band Detail Study | blocked | open | dxf | generated_needs_review | complete_human_review_before_promotion | local_files_or_library_check_missing |
| Ingenbohl Mineral Pigment Material Study | blocked | open | blender | generated_needs_review | complete_human_review_before_promotion | local_files_or_library_check_missing |
| Ingenbohl Concrete Core and Frame Study | blocked | open | blender | generated_needs_review | keep_blocked_until_export_routes_are_fixed | local_files_or_library_check_missing |

## Villa Savoye Concrete Frame Material Study

- asset id: `villa-savoye-concrete-frame-material-001`
- primary route: `blender`
- local ready: no
- public gate: `blocked`
- handoff smoke: `handoff_smoke_passed`

Human checklist:
- [ ] Source basis was read and is plausible for local review.
- [ ] Rights status and public gate were checked by a human.
- [ ] At least one local file/profile was opened or inspected.
- [ ] Scale, origin, naming and layer/surface mapping were checked.
- [ ] Reviewer checked whether the asset is generic, coherent and not low-quality AI output.
- [ ] Reviewer can choose a route decision for blender.

Decision commands:
- record_needs_review: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json --asset villa-savoye-concrete-frame-material-001 --route blender --decision needs-review`
- record_local_approval: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json --asset villa-savoye-concrete-frame-material-001 --route blender --decision approve-local --confirm-human-review --reviewer "REPLACE_WITH_REVIEWER_NAME"`
- keep_public_blocked: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json --asset villa-savoye-concrete-frame-material-001 --route blender --decision block-public`

## Villa Savoye Five Points Diagram Kit

- asset id: `villa-savoye-five-points-diagram-001`
- primary route: `web`
- local ready: no
- public gate: `blocked`
- handoff smoke: `handoff_smoke_passed`

Human checklist:
- [ ] Source basis was read and is plausible for local review.
- [ ] Rights status and public gate were checked by a human.
- [ ] At least one local file/profile was opened or inspected.
- [ ] Scale, origin, naming and layer/surface mapping were checked.
- [ ] Reviewer checked whether the asset is generic, coherent and not low-quality AI output.
- [ ] Reviewer can choose a route decision for web.

Decision commands:
- record_needs_review: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json --asset villa-savoye-five-points-diagram-001 --route web --decision needs-review`
- record_local_approval: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json --asset villa-savoye-five-points-diagram-001 --route web --decision approve-local --confirm-human-review --reviewer "REPLACE_WITH_REVIEWER_NAME"`
- keep_public_blocked: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json --asset villa-savoye-five-points-diagram-001 --route web --decision block-public`

## Sogn Benedetg Wood Shingle Material Study

- asset id: `sogn-benedetg-wood-shingle-material-001`
- primary route: `blender`
- local ready: no
- public gate: `blocked`
- handoff smoke: `handoff_smoke_passed`

Human checklist:
- [ ] Source basis was read and is plausible for local review.
- [ ] Rights status and public gate were checked by a human.
- [ ] At least one local file/profile was opened or inspected.
- [ ] Scale, origin, naming and layer/surface mapping were checked.
- [ ] Reviewer checked whether the asset is generic, coherent and not low-quality AI output.
- [ ] Reviewer can choose a route decision for blender.

Decision commands:
- record_needs_review: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json --asset sogn-benedetg-wood-shingle-material-001 --route blender --decision needs-review`
- record_local_approval: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json --asset sogn-benedetg-wood-shingle-material-001 --route blender --decision approve-local --confirm-human-review --reviewer "REPLACE_WITH_REVIEWER_NAME"`
- keep_public_blocked: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json --asset sogn-benedetg-wood-shingle-material-001 --route blender --decision block-public`

## Sogn Benedetg Light Band Detail Study

- asset id: `sogn-benedetg-light-band-detail-001`
- primary route: `dxf`
- local ready: no
- public gate: `blocked`
- handoff smoke: `handoff_smoke_passed`

Human checklist:
- [ ] Source basis was read and is plausible for local review.
- [ ] Rights status and public gate were checked by a human.
- [ ] At least one local file/profile was opened or inspected.
- [ ] Scale, origin, naming and layer/surface mapping were checked.
- [ ] Reviewer checked whether the asset is generic, coherent and not low-quality AI output.
- [ ] Reviewer can choose a route decision for dxf.

Decision commands:
- record_needs_review: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json --asset sogn-benedetg-light-band-detail-001 --route dxf --decision needs-review`
- record_local_approval: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json --asset sogn-benedetg-light-band-detail-001 --route dxf --decision approve-local --confirm-human-review --reviewer "REPLACE_WITH_REVIEWER_NAME"`
- keep_public_blocked: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json --asset sogn-benedetg-light-band-detail-001 --route dxf --decision block-public`

## Ingenbohl Mineral Pigment Material Study

- asset id: `ingenbohl-mineral-pigment-material-001`
- primary route: `blender`
- local ready: no
- public gate: `blocked`
- handoff smoke: `handoff_smoke_passed`

Human checklist:
- [ ] Source basis was read and is plausible for local review.
- [ ] Rights status and public gate were checked by a human.
- [ ] At least one local file/profile was opened or inspected.
- [ ] Scale, origin, naming and layer/surface mapping were checked.
- [ ] Reviewer checked whether the asset is generic, coherent and not low-quality AI output.
- [ ] Reviewer can choose a route decision for blender.

Decision commands:
- record_needs_review: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json --asset ingenbohl-mineral-pigment-material-001 --route blender --decision needs-review`
- record_local_approval: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json --asset ingenbohl-mineral-pigment-material-001 --route blender --decision approve-local --confirm-human-review --reviewer "REPLACE_WITH_REVIEWER_NAME"`
- keep_public_blocked: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json --asset ingenbohl-mineral-pigment-material-001 --route blender --decision block-public`

## Ingenbohl Concrete Core and Frame Study

- asset id: `ingenbohl-concrete-core-frame-study-001`
- primary route: `blender`
- local ready: no
- public gate: `blocked`
- handoff smoke: `handoff_smoke_passed`

Human checklist:
- [ ] Source basis was read and is plausible for local review.
- [ ] Rights status and public gate were checked by a human.
- [ ] At least one local file/profile was opened or inspected.
- [ ] Scale, origin, naming and layer/surface mapping were checked.
- [ ] Reviewer checked whether the asset is generic, coherent and not low-quality AI output.
- [ ] Reviewer can choose a route decision for blender.

Decision commands:
- record_needs_review: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json --asset ingenbohl-concrete-core-frame-study-001 --route blender --decision needs-review`
- record_local_approval: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json --asset ingenbohl-concrete-core-frame-study-001 --route blender --decision approve-local --confirm-human-review --reviewer "REPLACE_WITH_REVIEWER_NAME"`
- keep_public_blocked: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json --asset ingenbohl-concrete-core-frame-study-001 --route blender --decision block-public`

## Next Actions

- Resolve blocked session rows before any approve-local command.
- Open local asset files/profiles and complete the human checklist for every open row.
- Record only explicit human decisions with kosmo:asset-review-decision.
- Keep public downloads, R2 uploads and D1 writes disabled.
