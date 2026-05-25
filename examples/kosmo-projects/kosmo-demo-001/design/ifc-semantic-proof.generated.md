# IFC Semantic Proof

Project ID: `kosmo-demo-001`
Generated: 2026-05-25T19:39:51.856Z
Status: `semantic_ifc_probe_ready_for_human_review`

Read-only semantic STEP proof. This does not approve design generation.

## Summary

- IFC file: `data/source-files/Bestand_Kontext.ifc`
- parser: `kosmo_step_semantic_probe`
- IfcOpenShell available: no
- total entities: 77
- entity types: 20
- IFCBUILDINGELEMENTPROXY: 2
- with placement: 2
- with product shape: 2
- contained in spatial structure: 2
- with property sets: 2
- property set links: 2
- semantic integrity score: 1
- design seed approved: no

## Project Structure

| STEP | Type | Name | Parent |
| ---: | --- | --- | ---: |
| #1 | IFCPROJECT | Kosmo Demo Project | - |
| #2 | IFCSITE | Demo Site | #1 |
| #3 | IFCBUILDING | Demo Building | #2 |
| #4 | IFCBUILDINGSTOREY | Level 0 | #3 |

## Containers

| Container | Count |
| --- | ---: |
| IFCBUILDINGSTOREY #4 Level 0 | 2 |

## Property Sets

| Property set | Linked elements |
| --- | ---: |
| Pset_KosmoDemo | 2 |

## Element Sample

| STEP | Global ID | Name | Object type | Container | Psets |
| ---: | --- | --- | --- | --- | ---: |
| #130 | KOSMO_WALL_001 | Demo Wall | Exterior wall context seed | IFCBUILDINGSTOREY #4 Level 0 | 1 |
| #230 | KOSMO_SLAB_001 | Demo Slab | Horizontal slab context seed | IFCBUILDINGSTOREY #4 Level 0 | 1 |

## Next Actions

- Open the IFC in Bonsai/IfcOpenShell or an equivalent semantic IFC viewer/import path.
- Human-review classes, storey containment, placements, units and coordinates.
- Compare semantic elements with the DXF context layer and IFC bounds.
- Keep context-selection approved_for_design_generation=false until the semantic review is complete.

