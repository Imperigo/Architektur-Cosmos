# IFC Layer Plan

Project ID: `kosmo-demo-001`
Generated: 2026-05-25T19:39:52.206Z
Status: `ifc_layer_plan_ready_for_human_review`

Review-only Blender/ArchiCAD layer proposal. This does not approve design generation.

## Summary

- IFC elements: 2
- layer groups: 5
- material groups: 1
- structure elements: 2
- facade elements: 1
- mass elements: 1
- Blender profile: `design/blender-layer-profile.generated.json`
- ArchiCAD profile: `design/archicad-layer-profile.generated.json`
- design seed approved: no

## Layer Groups

| Layer | Type | Elements | Blender collection | ArchiCAD layer | Planned GLB |
| --- | --- | ---: | --- | --- | --- |
| Mass | mass | 1 | `KOSMO_KOSMO_DEMO_001_MASS` | `KOSMO_KOSMO_DEMO_001_MASS` | `models/kosmo-demo-001/mass.glb` |
| Structure | structure | 2 | `KOSMO_KOSMO_DEMO_001_STRUCTURE` | `KOSMO_KOSMO_DEMO_001_STRUCTURE` | `models/kosmo-demo-001/structure.glb` |
| Facade | facade | 1 | `KOSMO_KOSMO_DEMO_001_FACADE` | `KOSMO_KOSMO_DEMO_001_FACADE` | `models/kosmo-demo-001/facade.glb` |
| Tectonic | tectonic | 1 | `KOSMO_KOSMO_DEMO_001_TECTONIC` | `KOSMO_KOSMO_DEMO_001_TECTONIC` | `models/kosmo-demo-001/tectonic.glb` |
| Material concrete | material | 2 | `KOSMO_KOSMO_DEMO_001_MATERIAL_CONCRETE` | `KOSMO_KOSMO_DEMO_001_MATERIAL_CONCRETE` | `models/kosmo-demo-001/materials/concrete.glb` |

## Element Sample

| STEP | Name | Type | Layers | Materials | Confidence |
| ---: | --- | --- | --- | --- | ---: |
| #130 | Demo Wall | wall_or_facade | structure, facade, tectonic, material:concrete | concrete | 0.95 |
| #230 | Demo Slab | horizontal_slab | structure, mass, material:concrete | concrete | 0.95 |

## Next Actions

- Open the layer-plan SVG and compare layer roles against the IFC viewer.
- Human-review wall/slab/support classifications before Blender or ArchiCAD import.
- Prepare 5 review-only collections/layers, but keep approved_for_import=false.
- Only after review: generate GLB layer exports and Blender collections from approved layer keys.

