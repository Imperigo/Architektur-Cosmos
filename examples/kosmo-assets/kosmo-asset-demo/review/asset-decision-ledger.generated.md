# KosmoAsset Decision Ledger

Library: `kosmo-asset-demo`
Generated: 2026-05-27T11:49:06.178Z
Status: `asset_decision_ledger_open`

Local audit ledger. This file reads decision evidence only; it does not create approvals, mutate assets, upload, publish, write D1/R2 or open public gates.

## Summary

- expected decisions: 3
- recorded decisions: 0
- missing decisions: 3
- local approvals: 0
- needs-review notes: 0
- public blocks: 0
- rejected: 0
- blocked decision files: 0
- sandbox ready: 0
- certificates: 0/0
- named reviewers: 0
- reviewer blockers: 0
- promotion blockers: 6
- all certificates ready: no
- recommended next step: `record_or_defer_explicit_human_decisions`

## Expected Rows

| Asset | Route | Ledger Status | Decision | Reviewer Gate | Certificate | Sandbox | Blockers |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Kosmo Axis Marker | archicad | missing_decision | - | missing_decision | missing_certificate | no | decision_missing, local_certificate_missing |
| Warm Concrete Study Material | blender | missing_decision | - | missing_decision | missing_certificate | no | decision_missing, local_certificate_missing |
| Generic Column GLB Slot | blender | missing_decision | - | missing_decision | missing_certificate | no | decision_missing, local_certificate_missing |

## Human Gate Detail

### Kosmo Axis Marker

- asset id: `axis-marker-svg-001`
- route: `archicad`
- reviewer: -
- reviewer gate: `missing_decision`
- certificate: `missing_certificate`
- sandbox ready: no
- promotion blockers: `decision_missing`, `local_certificate_missing`
- next human action: `record_or_defer_human_decision`

### Warm Concrete Study Material

- asset id: `warm-concrete-material-001`
- route: `blender`
- reviewer: -
- reviewer gate: `missing_decision`
- certificate: `missing_certificate`
- sandbox ready: no
- promotion blockers: `decision_missing`, `local_certificate_missing`
- next human action: `record_or_defer_human_decision`

### Generic Column GLB Slot

- asset id: `generic-column-glb-001`
- route: `blender`
- reviewer: -
- reviewer gate: `missing_decision`
- certificate: `missing_certificate`
- sandbox ready: no
- promotion blockers: `decision_missing`, `local_certificate_missing`
- next human action: `record_or_defer_human_decision`


## Missing Decision Commands

- Kosmo Axis Marker: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmo-asset-demo/library.json --asset axis-marker-svg-001 --route archicad --decision needs-review`
- Warm Concrete Study Material: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmo-asset-demo/library.json --asset warm-concrete-material-001 --route blender --decision needs-review`
- Generic Column GLB Slot: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmo-asset-demo/library.json --asset generic-column-glb-001 --route blender --decision needs-review`

## Next Actions

- Finish or explicitly defer the open human review rows before creating Blender/ArchiCAD sandbox outputs.
- Keep public downloads, R2 uploads and D1 writes disabled.
