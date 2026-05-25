# IfcOpenShell Semantic Review

Project ID: `kosmo-demo-001`
Status: `ifcopenshell_semantic_review_ready`
IFC schema: `IFC4`

Semantic IFC review via IfcOpenShell. This does not approve design generation.

## Summary

- IfcOpenShell available: yes
- IfcOpenShell version: 0.8.5
- unit scale: 1
- projects/sites/buildings/storeys: 1/1/1/1
- IfcElement: 2
- IfcBuildingElementProxy: 2
- proxies with placement: 2
- proxies with Body/Brep: 2
- proxies contained: 2
- proxies with property sets: 2
- MapConversion / ProjectedCRS: 0/0
- machine checks: 13/13
- recommended decision: `keep_needs_more_source_review`

## Machine Checks

| Check | Status | Detail |
| --- | --- | --- |
| ifc_file_opened | passed | IfcOpenShell opened the IFC file. |
| schema_ifc4 | passed | Schema is IFC4. |
| meter_unit_scale | passed | Unit scale is 1. |
| single_project | passed | Projects: 1. |
| single_site | passed | Sites: 1. |
| single_building | passed | Buildings: 1. |
| storey_present | passed | Storeys: 1. |
| proxy_elements_present | passed | IfcBuildingElementProxy: 2. |
| all_proxies_have_global_id | passed | All proxy elements have GlobalId. |
| all_proxies_have_placement | passed | All proxy elements have ObjectPlacement. |
| all_proxies_have_body_brep | passed | All proxy elements use Body/Brep representation. |
| all_proxies_contained | passed | All proxy elements are contained in a spatial structure. |
| all_proxies_have_psets | passed | All proxy elements have property sets. |

## Distributions

- object types: unclassified: 2
- storeys: IfcBuildingStorey #4 Level 0: 2
- representations: Body/Brep: 2
- property sets: Pset_KosmoDemo: 2

## Element Sample

| STEP | Name | Class | OBJEKTART | Container | Representation |
| ---: | --- | --- | --- | --- | --- |
| #130 | Demo Wall | IfcBuildingElementProxy | - | IfcBuildingStorey #4 Level 0 | Body/Brep |
| #230 | Demo Slab | IfcBuildingElementProxy | - | IfcBuildingStorey #4 Level 0 | Body/Brep |

## Next Actions

- Open the same IFC visually in Bonsai/IfcOpenShell UI and compare semantic tree with this report.
- Decide whether IfcBuildingElementProxy plus OBJEKTART is sufficient as context semantics or requires reclassification.
- Keep context-selection approved_for_design_generation=false until a human reviewer approves a design seed.

