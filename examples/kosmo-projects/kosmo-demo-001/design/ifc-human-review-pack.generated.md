# IFC Human Review Pack

Project ID: `kosmo-demo-001`
Generated: 2026-05-25T21:11:17.550Z
Status: `ifc_human_review_packet_incomplete`
Candidate: `ifc-role-3-semantic_building_elements`

This packet gathers machine evidence for human IFC review. It does not approve design generation.

## Summary

- evidence ready: no
- human review required: yes
- design generation allowed: no
- design seed approved: no
- machine checks passed: 12/15
- open human checks: 10
- recommended decision now: `keep_needs_more_source_review`

## Machine Checks

| Check | Status | Detail |
| --- | --- | --- |
| ifc_source_exists | passed | IFC source exists: data/source-files/Bestand_Kontext.ifc. |
| source_mapping_not_seed | passed | IFC mapping decision is pending_review; suggested decision is needs_more_source_review. |
| design_generation_blocked | passed | Context selection does not approve design generation. |
| ifcopenshell_review_ready | passed | IfcOpenShell machine checks: 13/13. |
| ifcopenshell_units_meter | passed | IfcOpenShell unit scale: 1. |
| ifcopenshell_body_brep_ready | passed | 2 Body/Brep proxy elements. |
| semantic_elements_present | passed | 2 IFCBUILDINGELEMENTPROXY elements found. |
| semantic_integrity_full | passed | Semantic integrity score is 1. |
| geometry_bboxes_resolved | passed | 2 geometry bboxes resolved. |
| alignment_preview_ready | blocked | Alignment hint: missing_dxf_source. |
| layer_plan_review_ready | passed | 5 layer groups proposed. |
| blender_context_import_planned | passed | 4 Blender context objects planned; status blender_context_import_pending_context_handoff. |
| blender_context_smoke_locked | passed | 4/4 smoke objects locked. |
| blender_context_audit_passed | blocked | Audit failures: 0. |
| no_blender_design_mesh_faces | blocked | not audited mesh faces found in audited context import. |

## Human Checklist

| Check | Status | Question | Evidence hint |
| --- | --- | --- | --- |
| semantic_viewer_import | pending_human_review | Open `data/source-files/Bestand_Kontext.ifc` in Bonsai/IfcOpenShell or equivalent and confirm the semantic tree loads without import errors. | IfcOpenShell machine import passed 13/13; visual Bonsai-style tree review remains human. |
| element_class_review | pending_human_review | Confirm whether 2 IFCBUILDINGELEMENTPROXY objects are acceptable as semantic Bestand/context elements or need reclassification. | 2 IFCBUILDINGELEMENTPROXY elements found. |
| storey_review | pending_human_review | Confirm all 2 elements belong to IFCBUILDINGSTOREY #4 Level 0 and there are no missing/extra storeys. | Container distribution: IFCBUILDINGSTOREY #4 Level 0: 2 |
| placement_units_review | pending_human_review | Confirm object placements and project units match the expected meter-based project context. | 2 elements have object placement; geometry extents are 10 x 8 x 3.35 m. |
| origin_alignment_review | pending_human_review | Compare the semantic IFC import against DXF underlay, IFC bounds and LV95/project origin. | Alignment hint: missing_dxf_source; center offset estimate 0 m. |
| geometry_outlier_review | pending_human_review | Inspect large footprint/height outliers in the geometry preview before trusting the IFC as a design seed. | 12 faces resolved; inspect SVG preview and element samples. |
| property_set_review | pending_human_review | Check `Pset_AtelierBlaupause_Object` fields such as OBJEKTART, DACH_MIN, DACH_MAX and gml_id for reliability. | Property set distribution: Pset_KosmoDemo: 2 |
| layer_mapping_review | pending_human_review | Review the generated Mass/material_unknown layer plan and decide whether finer wall/slab/roof/support classes are possible. | 5 generated layer groups; approved_for_import is false. |
| blender_reference_review | pending_human_review | Open the audited Blender review blend and visually confirm it is only a locked reference underlay. | Audit status null; mesh faces 0. |
| final_seed_decision | pending_human_review | Only after the checks above: decide keep as source review, accept as context, reject or approve as design seed. | Recommended current decision remains keep_needs_more_source_review. |

## Evidence Snapshot

- IFCBUILDINGELEMENTPROXY: 2
- contained in spatial structure: 2
- property sets: 2
- semantic integrity score: 1
- IfcOpenShell review: ifcopenshell_semantic_review_ready
- IfcOpenShell machine checks: 13/13
- IfcOpenShell unit scale: 1
- geometry bboxes: 2
- faces resolved: 12
- alignment hint: missing_dxf_source
- Blender audit: -
- Blender audit mesh faces: 0

## Decision Options

- `keep_needs_more_source_review`: default until the IFC has been opened in a semantic IFC viewer and checked against the list below. Effect: keeps context as reference only; no design seed, no model generation.
- `accepted_as_context`: after semantic viewer confirms the IFC is reliable as reference but not yet suitable as editable seed. Effect: allows stronger reference use but still no design generation.
- `accepted_as_design_seed`: only after semantic classes, storeys, placement, units, origin and layer mapping are reviewed by a human. Effect: can unlock design-seed workflow only if approved_for_design_generation is also true.
- `rejected`: if semantic classes, origin, units or source authority are not trustworthy. Effect: removes this IFC semantic candidate from downstream seed consideration.

## Next Actions

- Open the IFC in Bonsai/IfcOpenShell or an equivalent semantic IFC viewer.
- Compare the semantic element tree with design/ifc-semantic-proof.generated.md.
- Compare geometry/origin with viz/previews/ifc-dxf-alignment-preview.svg and the audited Blender review file.
- Keep context-selection approved_for_design_generation=false until the checklist is completed by a human reviewer.

