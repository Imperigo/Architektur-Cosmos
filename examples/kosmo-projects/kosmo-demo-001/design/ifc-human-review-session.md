# IFC Human Review Session

Project ID: `kosmo-demo-001`
Updated: 2026-05-26T12:42:35.329Z
Status: `ifc_human_review_session_open`
Reviewer: -
Proposed decision: `undecided`

Dieses Protokoll ist das ausfuellbare Arbeitsblatt fuer den menschlichen IFC-Review. Es notiert noch keinen finalen Entscheid.

## Summary

- evidence ready: no
- final decision recorded: no
- confirm all reviewed used: no
- checks confirmed: 0/10
- checks pending: 10
- checks failed: 0
- checks n/a: 0
- decision ready: no

## Decision Blockers

- No proposed decision selected.

## Review Inputs

- IFC file: `data/source-files/Bestand_Kontext.ifc`
- Static viewer: `design/ifc-human-review-viewer.generated.html`
- Review guide: `design/ifc-human-review-guide.generated.md`
- Review pack: `design/ifc-human-review-pack.generated.md`
- Decision record: `design/ifc-human-review-decision.md`

## Checks

| Check | Status | Question | Notes |
| --- | --- | --- | --- |
| semantic_viewer_import | pending | Open `data/source-files/Bestand_Kontext.ifc` in Bonsai/IfcOpenShell or equivalent and confirm the semantic tree loads without import errors. | - |
| element_class_review | pending | Confirm whether 2 IFCBUILDINGELEMENTPROXY objects are acceptable as semantic Bestand/context elements or need reclassification. | - |
| storey_review | pending | Confirm all 2 elements belong to IFCBUILDINGSTOREY #4 Level 0 and there are no missing/extra storeys. | - |
| placement_units_review | pending | Confirm object placements and project units match the expected meter-based project context. | - |
| origin_alignment_review | pending | Compare the semantic IFC import against DXF underlay, IFC bounds and LV95/project origin. | - |
| geometry_outlier_review | pending | Inspect large footprint/height outliers in the geometry preview before trusting the IFC as a design seed. | - |
| property_set_review | pending | Check `Pset_AtelierBlaupause_Object` fields such as OBJEKTART, DACH_MIN, DACH_MAX and gml_id for reliability. | - |
| layer_mapping_review | pending | Review the generated Mass/material_unknown layer plan and decide whether finer wall/slab/roof/support classes are possible. | - |
| blender_reference_review | pending | Open the audited Blender review blend and visually confirm it is only a locked reference underlay. | - |
| final_seed_decision | pending | Only after the checks above: decide keep as source review, accept as context, reject or approve as design seed. | - |

## Commands

### refresh_session

```bash
npm run kosmo:ifc-human-review-session -- --project examples/kosmo-projects/kosmo-demo-001
```

### mark_check_example

```bash
npm run kosmo:ifc-human-review-session -- --project examples/kosmo-projects/kosmo-demo-001 --reviewed-by Reviewer --check semantic_viewer_import=confirmed --note semantic_viewer_import="IFC tree opened and matched review guide"
```

### confirm_all_keep_source_review

```bash
npm run kosmo:ifc-human-review-session -- --project examples/kosmo-projects/kosmo-demo-001 --reviewed-by Reviewer --confirm-all-reviewed --i-reviewed-all-ifc-checks --decision keep_needs_more_source_review
```

### confirm_all_accept_as_context

```bash
npm run kosmo:ifc-human-review-session -- --project examples/kosmo-projects/kosmo-demo-001 --reviewed-by Reviewer --confirm-all-reviewed --i-reviewed-all-ifc-checks --decision accepted_as_context
```

### confirm_semantic_viewer_import

```bash
npm run kosmo:ifc-human-review-session -- --project examples/kosmo-projects/kosmo-demo-001 --reviewed-by Reviewer --check semantic_viewer_import=confirmed --note semantic_viewer_import="Reviewed semantic_viewer_import"
```

### confirm_element_class_review

```bash
npm run kosmo:ifc-human-review-session -- --project examples/kosmo-projects/kosmo-demo-001 --reviewed-by Reviewer --check element_class_review=confirmed --note element_class_review="Reviewed element_class_review"
```

### confirm_storey_review

```bash
npm run kosmo:ifc-human-review-session -- --project examples/kosmo-projects/kosmo-demo-001 --reviewed-by Reviewer --check storey_review=confirmed --note storey_review="Reviewed storey_review"
```

### confirm_placement_units_review

```bash
npm run kosmo:ifc-human-review-session -- --project examples/kosmo-projects/kosmo-demo-001 --reviewed-by Reviewer --check placement_units_review=confirmed --note placement_units_review="Reviewed placement_units_review"
```

### confirm_origin_alignment_review

```bash
npm run kosmo:ifc-human-review-session -- --project examples/kosmo-projects/kosmo-demo-001 --reviewed-by Reviewer --check origin_alignment_review=confirmed --note origin_alignment_review="Reviewed origin_alignment_review"
```

### confirm_geometry_outlier_review

```bash
npm run kosmo:ifc-human-review-session -- --project examples/kosmo-projects/kosmo-demo-001 --reviewed-by Reviewer --check geometry_outlier_review=confirmed --note geometry_outlier_review="Reviewed geometry_outlier_review"
```

### confirm_property_set_review

```bash
npm run kosmo:ifc-human-review-session -- --project examples/kosmo-projects/kosmo-demo-001 --reviewed-by Reviewer --check property_set_review=confirmed --note property_set_review="Reviewed property_set_review"
```

### confirm_layer_mapping_review

```bash
npm run kosmo:ifc-human-review-session -- --project examples/kosmo-projects/kosmo-demo-001 --reviewed-by Reviewer --check layer_mapping_review=confirmed --note layer_mapping_review="Reviewed layer_mapping_review"
```

### confirm_blender_reference_review

```bash
npm run kosmo:ifc-human-review-session -- --project examples/kosmo-projects/kosmo-demo-001 --reviewed-by Reviewer --check blender_reference_review=confirmed --note blender_reference_review="Reviewed blender_reference_review"
```

### confirm_final_seed_decision

```bash
npm run kosmo:ifc-human-review-session -- --project examples/kosmo-projects/kosmo-demo-001 --reviewed-by Reviewer --check final_seed_decision=confirmed --note final_seed_decision="Reviewed final_seed_decision"
```

## Next Actions

- Complete pending review checks in the session log.

