# KosmoAsset Decision Ledger

Library: `kosmoreferences-pilot-seed-library-2026-06-13`
Generated: 2026-06-13T18:15:52.104Z
Status: `asset_decision_ledger_open`

Local audit ledger. This file reads decision evidence only; it does not create approvals, mutate assets, upload, publish, write D1/R2 or open public gates.

## Summary

- expected decisions: 6
- recorded decisions: 0
- missing decisions: 6
- local approvals: 0
- needs-review notes: 0
- public blocks: 0
- rejected: 0
- blocked decision files: 0
- state approved: 0
- state blocked: 0
- state rejected: 0
- state needs more evidence: 6
- sandbox ready: 0
- certificates: 0/0
- named reviewers: 0
- reviewer blockers: 0
- promotion blockers: 12
- all certificates ready: no
- recommended next step: `record_or_defer_explicit_human_decisions`

## Expected Rows

| Asset | Route | Decision State | Ledger Status | Decision | Reviewer Gate | Certificate | Sandbox | Blockers |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Villa Savoye Concrete Frame Material Study | blender | needs_more_evidence | missing_decision | - | missing_decision | missing_certificate | no | decision_missing, local_certificate_missing |
| Villa Savoye Five Points Diagram Kit | web | needs_more_evidence | missing_decision | - | missing_decision | missing_certificate | no | decision_missing, local_certificate_missing |
| Sogn Benedetg Wood Shingle Material Study | blender | needs_more_evidence | missing_decision | - | missing_decision | missing_certificate | no | decision_missing, local_certificate_missing |
| Sogn Benedetg Light Band Detail Study | dxf | needs_more_evidence | missing_decision | - | missing_decision | missing_certificate | no | decision_missing, local_certificate_missing |
| Ingenbohl Mineral Pigment Material Study | blender | needs_more_evidence | missing_decision | - | missing_decision | missing_certificate | no | decision_missing, local_certificate_missing |
| Ingenbohl Concrete Core and Frame Study | blender | needs_more_evidence | missing_decision | - | missing_decision | missing_certificate | no | decision_missing, local_certificate_missing |

## Human Gate Detail

### Villa Savoye Concrete Frame Material Study

- asset id: `villa-savoye-concrete-frame-material-001`
- route: `blender`
- decision state: `needs_more_evidence` (needs more human evidence)
- reviewer: -
- reviewer gate: `missing_decision`
- certificate: `missing_certificate`
- sandbox ready: no
- promotion blockers: `decision_missing`, `local_certificate_missing`
- next human action: `record_or_defer_human_decision`

### Villa Savoye Five Points Diagram Kit

- asset id: `villa-savoye-five-points-diagram-001`
- route: `web`
- decision state: `needs_more_evidence` (needs more human evidence)
- reviewer: -
- reviewer gate: `missing_decision`
- certificate: `missing_certificate`
- sandbox ready: no
- promotion blockers: `decision_missing`, `local_certificate_missing`
- next human action: `record_or_defer_human_decision`

### Sogn Benedetg Wood Shingle Material Study

- asset id: `sogn-benedetg-wood-shingle-material-001`
- route: `blender`
- decision state: `needs_more_evidence` (needs more human evidence)
- reviewer: -
- reviewer gate: `missing_decision`
- certificate: `missing_certificate`
- sandbox ready: no
- promotion blockers: `decision_missing`, `local_certificate_missing`
- next human action: `record_or_defer_human_decision`

### Sogn Benedetg Light Band Detail Study

- asset id: `sogn-benedetg-light-band-detail-001`
- route: `dxf`
- decision state: `needs_more_evidence` (needs more human evidence)
- reviewer: -
- reviewer gate: `missing_decision`
- certificate: `missing_certificate`
- sandbox ready: no
- promotion blockers: `decision_missing`, `local_certificate_missing`
- next human action: `record_or_defer_human_decision`

### Ingenbohl Mineral Pigment Material Study

- asset id: `ingenbohl-mineral-pigment-material-001`
- route: `blender`
- decision state: `needs_more_evidence` (needs more human evidence)
- reviewer: -
- reviewer gate: `missing_decision`
- certificate: `missing_certificate`
- sandbox ready: no
- promotion blockers: `decision_missing`, `local_certificate_missing`
- next human action: `record_or_defer_human_decision`

### Ingenbohl Concrete Core and Frame Study

- asset id: `ingenbohl-concrete-core-frame-study-001`
- route: `blender`
- decision state: `needs_more_evidence` (needs more human evidence)
- reviewer: -
- reviewer gate: `missing_decision`
- certificate: `missing_certificate`
- sandbox ready: no
- promotion blockers: `decision_missing`, `local_certificate_missing`
- next human action: `record_or_defer_human_decision`


## Missing Decision Commands

- Villa Savoye Concrete Frame Material Study: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json --asset villa-savoye-concrete-frame-material-001 --route blender --decision needs-review`
- Villa Savoye Five Points Diagram Kit: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json --asset villa-savoye-five-points-diagram-001 --route web --decision needs-review`
- Sogn Benedetg Wood Shingle Material Study: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json --asset sogn-benedetg-wood-shingle-material-001 --route blender --decision needs-review`
- Sogn Benedetg Light Band Detail Study: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json --asset sogn-benedetg-light-band-detail-001 --route dxf --decision needs-review`
- Ingenbohl Mineral Pigment Material Study: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json --asset ingenbohl-mineral-pigment-material-001 --route blender --decision needs-review`
- Ingenbohl Concrete Core and Frame Study: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json --asset ingenbohl-concrete-core-frame-study-001 --route blender --decision needs-review`

## Next Actions

- Finish or explicitly defer the open human review rows before creating Blender/ArchiCAD sandbox outputs.
- Keep public downloads, R2 uploads and D1 writes disabled.
