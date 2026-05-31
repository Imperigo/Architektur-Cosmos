# KosmoAsset Decision Ledger

Library: `kosmo-asset-demo`
Generated: 2026-05-31T09:26:52.839Z
Status: `asset_decision_ledger_open`

Local audit ledger. This file reads decision evidence only; it does not create approvals, mutate assets, upload, publish, write D1/R2 or open public gates.

## Summary

- expected decisions: 3
- recorded decisions: 2
- missing decisions: 1
- local approvals: 1
- needs-review notes: 1
- public blocks: 0
- rejected: 0
- blocked decision files: 0
- state approved: 1
- state blocked: 0
- state rejected: 0
- state needs more evidence: 2
- sandbox ready: 1
- certificates: 1/1
- named reviewers: 1
- reviewer blockers: 0
- promotion blockers: 4
- all certificates ready: no
- recommended next step: `record_or_defer_explicit_human_decisions`

## Expected Rows

| Asset | Route | Decision State | Ledger Status | Decision | Reviewer Gate | Certificate | Sandbox | Blockers |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Kosmo Axis Marker | archicad | needs_more_evidence | missing_decision | - | missing_decision | missing_certificate | no | decision_missing, local_certificate_missing |
| Warm Concrete Study Material | blender | approved | local_approval_recorded | approve-local/local_review_decision_recorded | Kosmo Owner (named_human_reviewer_recorded) | asset_local_review_certified | yes | - |
| Generic Column GLB Slot | blender | needs_more_evidence | needs_review_recorded | needs-review/local_review_note_recorded | not_required_for_note | missing_certificate | no | local_approval_missing, local_certificate_missing |

## Human Gate Detail

### Kosmo Axis Marker

- asset id: `axis-marker-svg-001`
- route: `archicad`
- decision state: `needs_more_evidence` (needs more human evidence)
- reviewer: -
- reviewer gate: `missing_decision`
- certificate: `missing_certificate`
- sandbox ready: no
- promotion blockers: `decision_missing`, `local_certificate_missing`
- next human action: `record_or_defer_human_decision`

### Warm Concrete Study Material

- asset id: `warm-concrete-material-001`
- route: `blender`
- decision state: `approved` (local human approval recorded)
- reviewer: `Kosmo Owner`
- reviewer gate: `named_human_reviewer_recorded`
- certificate: `asset_local_review_certified`
- sandbox ready: yes
- promotion blockers: -
- next human action: `certified_local_sandbox_candidate`
- ledger note: Local-only approval evidence; public gate must remain blocked.

### Generic Column GLB Slot

- asset id: `generic-column-glb-001`
- route: `blender`
- decision state: `needs_more_evidence` (needs more human evidence)
- reviewer: -
- reviewer gate: `not_required_for_note`
- certificate: `missing_certificate`
- sandbox ready: no
- promotion blockers: `local_approval_missing`, `local_certificate_missing`
- next human action: `continue_manual_review`
- ledger note: Manual review remains open or deferred.


## Missing Decision Commands

- Kosmo Axis Marker: `npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmo-asset-demo/library.json --asset axis-marker-svg-001 --route archicad --decision needs-review`

## Next Actions

- Finish or explicitly defer the open human review rows before creating Blender/ArchiCAD sandbox outputs.
- Sandbox generation is only allowed for local approvals with passed smoke and blocked public gates.
- Use certified assets only in copied local sandbox files; keep public gates blocked.
- Keep public downloads, R2 uploads and D1 writes disabled.
