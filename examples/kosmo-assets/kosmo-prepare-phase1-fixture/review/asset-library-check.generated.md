# KosmoAsset Library Check

Library: `kosmo-prepare-phase1-fixture`
Generated: 2026-06-30T06:49:34.844Z
Status: `passed`

This is a local review-only check. It does not upload assets, write D1/R2 or publish public downloads.

## Summary

- assets: 2
- local ready: 2
- public ready: 0
- planned only: 0
- KosmoData refs: 2
- failures: 0
- warnings: 2

## Assets

| Asset | Type | Preview | Rights | Review | Formats | KosmoData | Local | Public |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Synthetic Timber Frame Material Profile | material | material_swatch | generated_needs_review | draft | material_json | 1 | yes | no |
| Synthetic Primary Column Component Logic | component | wireframe_component | generated_needs_review | draft | json | 1 | yes | no |

## KosmoData Bridge

| Asset | KosmoData entry | Relation | Usage | Review |
| --- | --- | --- | --- | --- |
| Synthetic Timber Frame Material Profile | kosmo-prepare-phase1-fixture | material_context | derived_asset_review_required | needs_human_review |
| Synthetic Primary Column Component Logic | kosmo-prepare-phase1-fixture | typology_context | derived_asset_review_required | needs_human_review |

## Failures

- None.

## Warnings

- synthetic-timber-frame-material-001.kosmodata_refs[0] references unknown KosmoData entry: kosmo-prepare-phase1-fixture
- synthetic-primary-column-component-001.kosmodata_refs[0] references unknown KosmoData entry: kosmo-prepare-phase1-fixture

## Next Actions

- Review warnings, especially private research, missing source entry links and planned export keys.
- Fix unknown KosmoData references before relying on asset/context bridge reports.
