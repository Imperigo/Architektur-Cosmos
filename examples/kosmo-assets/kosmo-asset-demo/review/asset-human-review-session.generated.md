# KosmoAsset Human Review Session

Library: `kosmo-asset-demo`
Generated: 2026-05-27T05:16:37.984Z
Status: `asset_human_review_session_open`

Editable local human-review session. This file does not approve assets, does not certify quality, does not upload, publish, write D1/R2 or open public gates.

## Summary

- assets: 3
- open items: 3
- blocked items: 0
- local ready: 3
- public ready: 0
- handoff smoke passed: yes
- generated profiles: 4
- recommended next step: `complete_asset_human_review_session_before_approval_commands`

## Certificate Seed

- status: `not_certified`
- note: This session is evidence for later Architecture Kosmos quality certification, but it does not certify the asset yet.

## Review Rows

| Asset | Priority | Human Review | Route | Rights | Suggested Decision | Blockers |
| --- | --- | --- | --- | --- | --- | --- |
| Kosmo Axis Marker | normal | open | archicad | own_work | complete_human_review_before_promotion | - |
| Warm Concrete Study Material | high | open | blender | generated_needs_review | complete_human_review_before_promotion | - |
| Generic Column GLB Slot | high | open | blender | generated_needs_review | complete_human_review_before_promotion | - |

## Kosmo Axis Marker

- asset id: `axis-marker-svg-001`
- primary route: `archicad`
- local ready: yes
- public gate: `blocked`
- handoff smoke: `handoff_smoke_passed`

Human checklist:
- [ ] Source basis was read and is plausible for local review.
- [ ] Rights status and public gate were checked by a human.
- [ ] At least one local file/profile was opened or inspected.
- [ ] Scale, origin, naming and layer/surface mapping were checked.
- [ ] Reviewer checked whether the asset is generic, coherent and not low-quality AI output.
- [ ] Reviewer can choose a route decision for archicad.

Decision commands:
- record_needs_review: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmo-asset-demo/library.json --asset axis-marker-svg-001 --route archicad --decision needs-review`
- record_local_approval: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmo-asset-demo/library.json --asset axis-marker-svg-001 --route archicad --decision approve-local --confirm-human-review`
- keep_public_blocked: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmo-asset-demo/library.json --asset axis-marker-svg-001 --route archicad --decision block-public`

## Warm Concrete Study Material

- asset id: `warm-concrete-material-001`
- primary route: `blender`
- local ready: yes
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
- record_needs_review: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmo-asset-demo/library.json --asset warm-concrete-material-001 --route blender --decision needs-review`
- record_local_approval: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmo-asset-demo/library.json --asset warm-concrete-material-001 --route blender --decision approve-local --confirm-human-review`
- keep_public_blocked: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmo-asset-demo/library.json --asset warm-concrete-material-001 --route blender --decision block-public`

## Generic Column GLB Slot

- asset id: `generic-column-glb-001`
- primary route: `blender`
- local ready: yes
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
- record_needs_review: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmo-asset-demo/library.json --asset generic-column-glb-001 --route blender --decision needs-review`
- record_local_approval: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmo-asset-demo/library.json --asset generic-column-glb-001 --route blender --decision approve-local --confirm-human-review`
- keep_public_blocked: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmo-asset-demo/library.json --asset generic-column-glb-001 --route blender --decision block-public`

## Next Actions

- Open local asset files/profiles and complete the human checklist for every open row.
- Record only explicit human decisions with kosmo:asset-review-decision.
- Keep public downloads, R2 uploads and D1 writes disabled.
