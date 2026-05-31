# KosmoAsset Exchange Profile

Library: `kosmo-asset-demo`
Generated: 2026-05-31T09:26:50.353Z
Status: `local_review_exchange_profile`

Review-only. This profile prepares Blender, ArchiCAD and Web naming/mapping; it does not import, upload or publish assets.

## Summary

- assets: 3
- Blender profiles: 2
- ArchiCAD profiles: 3
- Web profiles: 3
- public gates blocked: 3
- human reviews open: 3
- KosmoData refs: 2

## Assets

| Asset | Blender | ArchiCAD | Web | KosmoData | Review note |
| --- | --- | --- | --- | --- | --- |
| Kosmo Axis Marker | - | dxf_underlay_or_symbol | blocked | 0 | Human review is still open; exchange profiles are naming proposals only. |
| Warm Concrete Study Material | create_material_from_parameters | surface_attribute_reference | blocked | 2 | Human review is still open; exchange profiles are naming proposals only. |
| Generic Column GLB Slot | link_glb_as_collection | dxf_underlay_or_symbol | blocked | 0 | Human review is still open; exchange profiles are naming proposals only. |

## Kosmo Axis Marker


ArchiCAD:
- exchange mode: `dxf_underlay_or_symbol`
- layer: `KOSMO_ANNOTATION_AXIS_MARKER_SVG_001`
- surface: `-`
- source: `examples/kosmo-assets/kosmo-asset-demo/assets/dxf/axis-marker-svg-001.dxf`

## Warm Concrete Study Material

Blender:
- collection: `KOSMO_ASSET/material/warm-concrete-material-001`
- import mode: `create_material_from_parameters`
- source: `examples/kosmo-assets/kosmo-asset-demo/assets/materials/warm-concrete.material.json`

ArchiCAD:
- exchange mode: `surface_attribute_reference`
- layer: `-`
- surface: `KOSMO_SURFACE_WARM_CONCRETE_MATERIAL_001`
- source: `examples/kosmo-assets/kosmo-asset-demo/assets/materials/warm-concrete.material.json`

KosmoData context:
- `villa-savoye`: material_context / context_only / context_only
- `pantheon`: material_context / context_only / context_only

## Generic Column GLB Slot

Blender:
- collection: `KOSMO_ASSET/structure/generic-column-glb-001`
- import mode: `link_glb_as_collection`
- source: `examples/kosmo-assets/kosmo-asset-demo/assets/models/generic-column-glb-001.glb`

ArchiCAD:
- exchange mode: `dxf_underlay_or_symbol`
- layer: `KOSMO_STRUCTURE_GENERIC_COLUMN_GLB_001`
- surface: `-`
- source: `examples/kosmo-assets/kosmo-asset-demo/assets/dxf/generic-column-glb-001.dxf`

## Next Actions

- Close human review before importing assets into production Blender/ArchiCAD files.
- Run a local Blender smoke only with review assets, not production files.
- Keep ArchiCAD profiles as layer/surface naming references until reviewed.
- Keep public web/download gates blocked until rights and review are explicit.
