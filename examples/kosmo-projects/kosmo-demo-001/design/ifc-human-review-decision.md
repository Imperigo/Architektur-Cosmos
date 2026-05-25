# IFC Human Review Decision

Project ID: `kosmo-demo-001`
Generated: 2026-05-25T21:33:35.159Z
Status: `ifc_human_review_decision_draft`
Candidate: `ifc-role-3-semantic_building_elements`
Decision: `keep_needs_more_source_review`
Reviewed by: -

This file records the human decision gate for the IFC candidate. It does not modify context-selection or source-mapping by itself.

## Summary

- final decision recorded: no
- evidence ready: no
- confirmed checks: 0/10
- failed checks: 0
- open human checks: 10
- design generation approval requested: no
- design generation approval granted: no
- context-selection update required: no
- source-mapping update required: yes
- recommended next step: `open_viewer_and_record_final_human_decision`

## Current State

- context-selection decision: `-`
- context-selection approved for design generation: no
- source-mapping decision: `pending_review`
- source-review open human checks: 0
- human review pack: `ifc_human_review_packet_incomplete`
- human review viewer: `ifc_review_viewer_ready`

## Evidence Snapshot

- human pack machine checks: 12/15
- IfcOpenShell machine checks: 13/13
- IFC proxies / Body-Brep: 2/2
- viewer previews: 3

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

## Notes

- none

## Suggested Context-Selection Patch

- none
