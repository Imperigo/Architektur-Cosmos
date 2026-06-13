# KosmoAsset Exchange Profile

Library: `kosmoreferences-pilot-seed-library-2026-06-13`
Generated: 2026-06-13T18:23:43.088Z
Status: `local_review_exchange_profile`

Review-only. This profile prepares Blender, ArchiCAD and Web naming/mapping; it does not import, upload or publish assets.

## Summary

- assets: 6
- Blender profiles: 4
- ArchiCAD profiles: 4
- Web profiles: 5
- public gates blocked: 6
- human reviews open: 6
- KosmoData refs: 6

## Assets

| Asset | Blender | ArchiCAD | Web | KosmoData | Review note |
| --- | --- | --- | --- | --- | --- |
| Villa Savoye Concrete Frame Material Study | create_material_from_parameters | surface_attribute_reference | blocked | 1 | Human review is still open; exchange profiles are naming proposals only. |
| Villa Savoye Five Points Diagram Kit | - | - | blocked | 1 | Human review is still open; exchange profiles are naming proposals only. |
| Sogn Benedetg Wood Shingle Material Study | create_material_from_parameters | surface_attribute_reference | blocked | 1 | Human review is still open; exchange profiles are naming proposals only. |
| Sogn Benedetg Light Band Detail Study | - | - | - | 1 | Human review is still open; exchange profiles are naming proposals only. |
| Ingenbohl Mineral Pigment Material Study | create_material_from_parameters | surface_attribute_reference | blocked | 1 | Human review is still open; exchange profiles are naming proposals only. |
| Ingenbohl Concrete Core and Frame Study | metadata_only | manual_reference | blocked | 1 | Human review is still open; exchange profiles are naming proposals only. |

## Villa Savoye Concrete Frame Material Study

Blender:
- collection: `KOSMO_ASSET/material/villa-savoye-concrete-frame-material-001`
- import mode: `create_material_from_parameters`
- source: `-`

ArchiCAD:
- exchange mode: `surface_attribute_reference`
- layer: `-`
- surface: `KOSMO_SURFACE_VILLA_SAVOYE_CONCRETE_FRAME_MATERIAL_001`
- source: `-`

KosmoData context:
- `villa-savoye`: material_context / derived_asset_review_required / needs_human_review

## Villa Savoye Five Points Diagram Kit


KosmoData context:
- `villa-savoye`: typology_context / context_only / context_only

## Sogn Benedetg Wood Shingle Material Study

Blender:
- collection: `KOSMO_ASSET/material/sogn-benedetg-wood-shingle-material-001`
- import mode: `create_material_from_parameters`
- source: `-`

ArchiCAD:
- exchange mode: `surface_attribute_reference`
- layer: `-`
- surface: `KOSMO_SURFACE_SOGN_BENEDETG_WOOD_SHINGLE_MATERIAL_001`
- source: `-`

KosmoData context:
- `kapelle-sogn-benedetg`: material_context / derived_asset_review_required / needs_human_review

## Sogn Benedetg Light Band Detail Study


KosmoData context:
- `kapelle-sogn-benedetg`: typology_context / context_only / context_only

## Ingenbohl Mineral Pigment Material Study

Blender:
- collection: `KOSMO_ASSET/material/ingenbohl-mineral-pigment-material-001`
- import mode: `create_material_from_parameters`
- source: `-`

ArchiCAD:
- exchange mode: `surface_attribute_reference`
- layer: `-`
- surface: `KOSMO_SURFACE_INGENBOHL_MINERAL_PIGMENT_MATERIAL_001`
- source: `-`

KosmoData context:
- `alterszentrum-kloster-ingenbohl`: material_context / derived_asset_review_required / needs_human_review

## Ingenbohl Concrete Core and Frame Study

Blender:
- collection: `KOSMO_ASSET/structure/ingenbohl-concrete-core-frame-study-001`
- import mode: `metadata_only`
- source: `-`

ArchiCAD:
- exchange mode: `manual_reference`
- layer: `KOSMO_STRUCTURE_INGENBOHL_CONCRETE_CORE_FRAME_STUDY_001`
- surface: `-`
- source: `-`

KosmoData context:
- `alterszentrum-kloster-ingenbohl`: model_context / derived_asset_review_required / needs_human_review

## Next Actions

- Close human review before importing assets into production Blender/ArchiCAD files.
- Run a local Blender smoke only with review assets, not production files.
- Keep ArchiCAD profiles as layer/surface naming references until reviewed.
- Keep public web/download gates blocked until rights and review are explicit.
