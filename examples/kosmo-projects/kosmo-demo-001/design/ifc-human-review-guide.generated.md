# Kosmo IFC Human Review Anleitung

Project ID: `kosmo-demo-001`
Generated: 2026-05-25T21:50:32.622Z
Status: `ifc_human_review_guide_ready`

Diese Anleitung ist eine menschliche Pruefroutine fuer den IFC-Kandidaten. Sie ist kein Approval und aendert keine Projekt-Gates.

## Review Inputs

- IFC file: `data/source-files/Bestand_Kontext.ifc`
- Static viewer: `design/ifc-human-review-viewer.generated.html`
- IfcOpenShell report: `design/ifcopenshell-semantic-review.generated.md`
- Human review pack: `design/ifc-human-review-pack.generated.md`
- Decision record: `design/ifc-human-review-decision.md`
- Sync report: `design/ifc-human-review-sync.generated.md`
- IFC geometry preview: `viz/previews/ifc-geometry-preview.svg` (exists)
- IFC/DXF alignment preview: `viz/previews/ifc-dxf-alignment-preview.svg` (exists)
- IFC layer plan: `viz/previews/ifc-layer-plan.svg` (exists)

## Machine Snapshot

- evidence ready: no
- viewer ready: yes
- final decision recorded: no
- current decision: `keep_needs_more_source_review`
- sync status: `ifc_sync_blocked_pending_final_decision`
- design generation allowed: no
- human checks open: 10/10
- IfcOpenShell checks: 13/13
- IFC proxies / Body-Brep: 2/2
- unit scale: 1
- storeys: 1
- geometry extents: 10 x 8 x 3.35 m
- alignment hint: missing_dxf_source
- alignment center offset: 0 m
- layer groups: 5
- Blender audit: -

## Ablauf

### 1. Review-Session vorbereiten

- Oeffne den statischen IFC Human Review Viewer.
- Oeffne dieselbe IFC-Datei im semantischen IFC-Viewer: data/source-files/Bestand_Kontext.ifc.
- Lege Viewer, IFC-Tree, Geometriepreview, Alignment-Preview und Layerplan nebeneinander.

### 2. Semantischen IFC-Tree pruefen

- Pruefe, ob Project, Site, Building und Storey plausibel geladen werden.
- Pruefe, ob alle relevanten Bestandselemente unter dem erwarteten Storey liegen.
- Pruefe, ob IFCBUILDINGELEMENTPROXY als Kontextklasse akzeptabel ist oder eine Re-Klassifikation noetig waere.

### 3. Einheiten, Ursprung und Geometrie pruefen

- Vergleiche Meter-Units und Objekt-Placements mit dem Projektkontext.
- Vergleiche IFC-Bounds mit DXF-Unterlage und Projektursprung.
- Markiere auffaellige Ausreisser bei Hoehe, Footprint, Offsets oder fehlenden Elementen.

### 4. Properties und Layerplan pruefen

- Pruefe Property Sets wie OBJEKTART, DACH_MIN, DACH_MAX und gml_id.
- Entscheide, ob die generierten Layergruppen nur als Kontext taugen oder fein genug fuer spaetere Modellarbeit sind.
- Pruefe den Blender-Audit: Review-Objekte muessen gesperrt und review-only bleiben.

### 5. Human Checklist abarbeiten

- semantic_viewer_import: Open `data/source-files/Bestand_Kontext.ifc` in Bonsai/IfcOpenShell or equivalent and confirm the semantic tree loads without import errors.
- element_class_review: Confirm whether 2 IFCBUILDINGELEMENTPROXY objects are acceptable as semantic Bestand/context elements or need reclassification.
- storey_review: Confirm all 2 elements belong to IFCBUILDINGSTOREY #4 Level 0 and there are no missing/extra storeys.
- placement_units_review: Confirm object placements and project units match the expected meter-based project context.
- origin_alignment_review: Compare the semantic IFC import against DXF underlay, IFC bounds and LV95/project origin.
- geometry_outlier_review: Inspect large footprint/height outliers in the geometry preview before trusting the IFC as a design seed.
- property_set_review: Check `Pset_AtelierBlaupause_Object` fields such as OBJEKTART, DACH_MIN, DACH_MAX and gml_id for reliability.
- layer_mapping_review: Review the generated Mass/material_unknown layer plan and decide whether finer wall/slab/roof/support classes are possible.
- blender_reference_review: Open the audited Blender review blend and visually confirm it is only a locked reference underlay.
- final_seed_decision: Only after the checks above: decide keep as source review, accept as context, reject or approve as design seed.

### 6. Finalen Entscheid recorden

- Wenn ein Check offen oder unsicher bleibt: keep_needs_more_source_review.
- Wenn die IFC als Referenz taugt, aber nicht als editierbarer Seed: accepted_as_context.
- Wenn Quelle, Semantik, Ursprung, Einheiten und Layer wirklich belastbar sind: accepted_as_design_seed nur mit separater Design-Freigabe.
- Wenn Quelle oder Semantik nicht vertrauenswuerdig sind: rejected.

## Entscheidungslogik

- `keep_needs_more_source_review`: mindestens ein menschlicher Check offen ist, Quelle/Origin/Layer unsicher sind oder die IFC nur maschinell, aber nicht visuell geprueft wurde. Effekt: bleibt Kontext-Review; kein Design-Seed; keine Design-Generierung.
- `accepted_as_context`: Semantik und Geometrie als Referenz plausibel sind, aber Klassen/Layer noch zu grob fuer editierbare Modellgenerierung bleiben. Effekt: darf als staerkere Referenz dienen; bleibt ohne Design-Generierung.
- `accepted_as_design_seed`: alle Human Checks bestaetigt sind und die IFC als semantisch, geometrisch und quellenbezogen belastbarer Seed gilt. Effekt: kann spaetere Design-Seed-Workflows freischalten, aber nur mit --approve-design-generation und Context Guard.
- `rejected`: Quelle, Units, Origin, Storeys, Properties oder Klassen nicht vertrauenswuerdig sind. Effekt: blockiert den IFC-Kandidaten fuer Downstream-Seed-Nutzung.

## Red Flags

- Machine evidence is not ready.
- Final human IFC decision is not recorded.

## Decision Commands

### keep_needs_more_source_review

```bash
npm run kosmo:ifc-human-review-decision -- --project examples/kosmo-projects/kosmo-demo-001 --record-final --decision keep_needs_more_source_review --reviewed-by Reviewer
```

### accepted_as_context

```bash
npm run kosmo:ifc-human-review-decision -- --project examples/kosmo-projects/kosmo-demo-001 --record-final --decision accepted_as_context --reviewed-by Reviewer --confirm-checklist --i-confirm-human-ifc-review
```

### accepted_as_design_seed

```bash
npm run kosmo:ifc-human-review-decision -- --project examples/kosmo-projects/kosmo-demo-001 --record-final --decision accepted_as_design_seed --reviewed-by Reviewer --confirm-checklist --i-confirm-human-ifc-review --approve-design-generation
```

### rejected

```bash
npm run kosmo:ifc-human-review-decision -- --project examples/kosmo-projects/kosmo-demo-001 --record-final --decision rejected --reviewed-by Reviewer
```

### sync_after_final_decision

```bash
npm run kosmo:ifc-human-review-sync -- --project examples/kosmo-projects/kosmo-demo-001
```

### apply_sync_after_owner_confirmation

```bash
npm run kosmo:ifc-human-review-sync -- --project examples/kosmo-projects/kosmo-demo-001 --apply --confirm-sync --i-understand-context-selection-mutation
```

## Next Actions

- Open the static IFC review viewer.
- Open the IFC in Bonsai/IfcOpenShell or an equivalent semantic IFC viewer.
- Complete the human checklist.
- Record a final IFC human decision with npm run kosmo:ifc-human-review-decision.
