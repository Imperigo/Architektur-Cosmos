# KosmoAsset Handoff Bundle

Library: `kosmoreferences-pilot-seed-library-2026-06-13`
Generated: 2026-06-13T18:10:33.123Z
Status: `local_review_handoff_bundle`

Review-only. The generated Blender script is non-mutating by default and the ArchiCAD CSV is a reference schedule.

## Outputs

- Blender Python: `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-blender-handoff.generated.py`
- ArchiCAD CSV: `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-archicad-schedule.generated.csv`
- JSON: `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-handoff-bundle.generated.json`

## Summary

- assets: 6
- Blender rows: 4
- ArchiCAD rows: 4
- public gates blocked: 6
- open reviews: 6

## Handoff Rows

| Asset | Blender collection | ArchiCAD layer/surface | Review |
| --- | --- | --- | --- |
| Villa Savoye Concrete Frame Material Study | `KOSMO_ASSET/material/villa-savoye-concrete-frame-material-001` | `KOSMO_SURFACE_VILLA_SAVOYE_CONCRETE_FRAME_MATERIAL_001` | open |
| Villa Savoye Five Points Diagram Kit | `-` | `-` | open |
| Sogn Benedetg Wood Shingle Material Study | `KOSMO_ASSET/material/sogn-benedetg-wood-shingle-material-001` | `KOSMO_SURFACE_SOGN_BENEDETG_WOOD_SHINGLE_MATERIAL_001` | open |
| Sogn Benedetg Light Band Detail Study | `-` | `-` | open |
| Ingenbohl Mineral Pigment Material Study | `KOSMO_ASSET/material/ingenbohl-mineral-pigment-material-001` | `KOSMO_SURFACE_INGENBOHL_MINERAL_PIGMENT_MATERIAL_001` | open |
| Ingenbohl Concrete Core and Frame Study | `KOSMO_ASSET/structure/ingenbohl-concrete-core-frame-study-001` | `KOSMO_STRUCTURE_INGENBOHL_CONCRETE_CORE_FRAME_STUDY_001` | open |

## Next Actions

- Open the generated Blender Python file and keep ALLOW_SCENE_WRITE = False until a manual smoke test is approved.
- Use the ArchiCAD CSV as a naming/reference schedule only; no BIM object is generated in V1.
- Close human review before importing assets into production files.
- Keep public gates blocked until rights and review are explicit.
