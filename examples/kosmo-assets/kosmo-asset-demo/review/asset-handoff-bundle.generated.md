# KosmoAsset Handoff Bundle

Library: `kosmo-asset-demo`
Generated: 2026-05-26T19:54:17.787Z
Status: `local_review_handoff_bundle`

Review-only. The generated Blender script is non-mutating by default and the ArchiCAD CSV is a reference schedule.

## Outputs

- Blender Python: `examples/kosmo-assets/kosmo-asset-demo/review/asset-blender-handoff.generated.py`
- ArchiCAD CSV: `examples/kosmo-assets/kosmo-asset-demo/review/asset-archicad-schedule.generated.csv`
- JSON: `examples/kosmo-assets/kosmo-asset-demo/review/asset-handoff-bundle.generated.json`

## Summary

- assets: 3
- Blender rows: 2
- ArchiCAD rows: 3
- public gates blocked: 3
- open reviews: 3

## Handoff Rows

| Asset | Blender collection | ArchiCAD layer/surface | Review |
| --- | --- | --- | --- |
| Kosmo Axis Marker | `-` | `KOSMO_ANNOTATION_AXIS_MARKER_SVG_001` | open |
| Warm Concrete Study Material | `KOSMO_ASSET/material/warm-concrete-material-001` | `KOSMO_SURFACE_WARM_CONCRETE_MATERIAL_001` | open |
| Generic Column GLB Slot | `KOSMO_ASSET/structure/generic-column-glb-001` | `KOSMO_STRUCTURE_GENERIC_COLUMN_GLB_001` | open |

## Next Actions

- Open the generated Blender Python file and keep ALLOW_SCENE_WRITE = False until a manual smoke test is approved.
- Use the ArchiCAD CSV as a naming/reference schedule only; no BIM object is generated in V1.
- Close human review before importing assets into production files.
- Keep public gates blocked until rights and review are explicit.
