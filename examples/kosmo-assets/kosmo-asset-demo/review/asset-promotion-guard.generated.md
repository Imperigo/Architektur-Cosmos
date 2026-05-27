# KosmoAsset Promotion Guard

Library: `kosmo-asset-demo`
Generated: 2026-05-27T13:54:54.095Z
Status: `asset_promotion_guard_blocked`

Promotion guard. This report does not promote assets, upload files, write D1/R2, open public downloads or mutate the library.

## Summary

- assets: 3
- promotion allowed: no
- blockers: 6
- unsafe findings: 0
- missing decisions: 3
- local certificates ready: 0
- sandbox ready: 0
- named reviewers: 0
- reviewer blockers: 0
- ledger promotion blockers: 6
- public ready: 0
- full review: `asset_full_review_ready_for_human_decisions`
- decision ledger: `asset_decision_ledger_open`
- recommended next step: `keep_assets_local_review_only`

## Assets

| Asset | Decision State | Decision | Reviewer Gate | Certificate | Sandbox | Public Gate | Promotion | Blockers |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Kosmo Axis Marker | needs_more_evidence | missing_decision | missing_decision | missing_certificate | no | blocked | blocked | decision_missing, local_certificate_missing |
| Warm Concrete Study Material | needs_more_evidence | missing_decision | missing_decision | missing_certificate | no | blocked | blocked | decision_missing, local_certificate_missing |
| Generic Column GLB Slot | needs_more_evidence | missing_decision | missing_decision | missing_certificate | no | blocked | blocked | decision_missing, local_certificate_missing |

## Human Gate Detail

### Kosmo Axis Marker

- asset id: `axis-marker-svg-001`
- decision state: `needs_more_evidence` (needs more human evidence)
- reviewer: -
- reviewer gate: `missing_decision`
- certificate: `missing_certificate`
- next human action: `record_or_defer_human_decision`
- promotion blockers: `decision_missing`, `local_certificate_missing`

### Warm Concrete Study Material

- asset id: `warm-concrete-material-001`
- decision state: `needs_more_evidence` (needs more human evidence)
- reviewer: -
- reviewer gate: `missing_decision`
- certificate: `missing_certificate`
- next human action: `record_or_defer_human_decision`
- promotion blockers: `decision_missing`, `local_certificate_missing`

### Generic Column GLB Slot

- asset id: `generic-column-glb-001`
- decision state: `needs_more_evidence` (needs more human evidence)
- reviewer: -
- reviewer gate: `missing_decision`
- certificate: `missing_certificate`
- next human action: `record_or_defer_human_decision`
- promotion blockers: `decision_missing`, `local_certificate_missing`


## Blockers

- axis-marker-svg-001:decision_missing
- axis-marker-svg-001:local_certificate_missing
- warm-concrete-material-001:decision_missing
- warm-concrete-material-001:local_certificate_missing
- generic-column-glb-001:decision_missing
- generic-column-glb-001:local_certificate_missing

## Next Actions

- Keep KosmoAsset in local review-only mode.
- Complete human review decisions, local certificates and ledger checks before any sandbox or public promotion.
- Current blocker count: 6.
