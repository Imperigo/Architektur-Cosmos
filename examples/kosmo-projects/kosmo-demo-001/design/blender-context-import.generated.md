# Blender Context Import

Project ID: `kosmo-demo-001`
Generated: 2026-05-25T20:37:40.870Z
Status: `blender_context_import_pending_context_handoff`

Read-only Blender context import script. It creates locked review objects and no design geometry.

## Summary

- root collection: `KOSMO_CONTEXT_REVIEW_KOSMO_DEMO_001`
- context inputs: 0
- blocked inputs: 2
- design generation allowed: no
- accepted DXF layers: 0
- DXF accepted polylines: 0
- DXF embedded polylines: 0
- IFC bbox proxies: 2
- layer collections: 5
- Blender script: `design/blender-context-import.generated.py`

## Blender Objects

| Object | Kind | Permission |
| --- | --- | --- |
| `KOSMO_CONTEXT_ORIGIN` | empty_origin_marker | context_reference_only |
| `KOSMO_PROJECT_PERIMETER` | wire_rectangle | context_reference_only |
| `KOSMO_IFC_GLOBAL_BOUNDS` | wire_box | context_reference_only |
| `KOSMO_IFC_BBOX_CONTEXT` | bbox_wire_mesh | context_reference_only |

## Guardrails

- Blender objects created by this script are locked, hide-select and tagged kosmo_review_only.
- DXF polylines are reference underlay only and must not become editable design geometry automatically.
- IFC boxes are bounding-box review proxies only, not semantic BIM objects.
- Layer collections are empty review containers until a human approves import.
- No GLB export or design generation is enabled by this script.

## Next Actions

- Run npm run kosmo:context-handoff before generating the Blender context import.

