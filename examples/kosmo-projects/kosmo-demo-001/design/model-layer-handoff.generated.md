# Model Layer Handoff

Project ID: `kosmo-demo-001`
Generated: 2026-05-25T19:56:31.281Z
Status: `model_layer_handoff_ready_for_human_review`

Review-only handoff for Blender collections, ArchiCAD layers and future GLB layer exports.

## Summary

- layer plan ready: yes
- context design generation allowed: no
- Blender profile approved for import: no
- ArchiCAD profile approved for import: no
- layer exports: 5
- planned GLBs: 5
- material layers: 1
- GLB export allowed: no

## Layer Exports

| Layer | Elements | Blender collection | ArchiCAD layer | Planned GLB | Permission |
| --- | ---: | --- | --- | --- | --- |
| Mass | 1 | `KOSMO_KOSMO_DEMO_001_MASS` | `KOSMO_KOSMO_DEMO_001_MASS` | `models/kosmo-demo-001/mass.glb` | review_shell_only |
| Structure | 2 | `KOSMO_KOSMO_DEMO_001_STRUCTURE` | `KOSMO_KOSMO_DEMO_001_STRUCTURE` | `models/kosmo-demo-001/structure.glb` | review_shell_only |
| Facade | 1 | `KOSMO_KOSMO_DEMO_001_FACADE` | `KOSMO_KOSMO_DEMO_001_FACADE` | `models/kosmo-demo-001/facade.glb` | review_shell_only |
| Tectonic | 1 | `KOSMO_KOSMO_DEMO_001_TECTONIC` | `KOSMO_KOSMO_DEMO_001_TECTONIC` | `models/kosmo-demo-001/tectonic.glb` | review_shell_only |
| Material concrete | 2 | `KOSMO_KOSMO_DEMO_001_MATERIAL_CONCRETE` | `KOSMO_KOSMO_DEMO_001_MATERIAL_CONCRETE` | `models/kosmo-demo-001/materials/concrete.glb` | review_shell_only |

## Next Actions

- Use the Blender script only for empty review collections, not model generation.
- Resolve context-selection and context-handoff gates before model export.
- Keep GLB generation blocked until design generation is explicitly allowed.

