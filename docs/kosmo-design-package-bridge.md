# Kosmo Design Package Bridge

Stand: 2026-05-25  
Status: Phase-0-Kontextimport, Kontextkandidaten, Context-Selection-Gate, Raum-Import, Write-back, Draw-SVG und Viz-Preview-Connector implementiert.

## 1. Ziel

Kosmo Design soll das lokale Kosmo-Projektpaket aus `Kosmo MVP 0.1` lesen und daraus in Blender zuerst sichtbare Projektgrundlagen und spaeter echte, bearbeitbare Raum-/Geschossobjekte erzeugen.
Bearbeitete oder importierte Raumdaten koennen wieder als separates Exportprofil in das Projektpaket geschrieben werden, ohne das urspruengliche `design/model-profile.json` zu ueberschreiben.
Zusaetzlich kann KosmoDraw einfache SVG-Planexports direkt aus den in Blender erzeugten Raumobjekten schreiben.
Kosmo Viz kann aus demselben Modell automatisch Kamera, Licht und einen lokalen PNG-Preview erzeugen.

Wichtig: Die aktuell gefundenen Kosmo-/Prepare-/Draw-/Publish-Dateien sind noch fruehe Skizzen und Experimentierflaechen. Dieser Connector behandelt sie deshalb als Phase-0-Arbeitsmaterial, nicht als fertige CAD- oder BIM-Prototypen.

Der erste Connector ist bewusst duenn:

- liest `kosmo.project.json`
- liest `design/model-profile.json`
- liest optional `data/sources.json`, `brief/constraints.json` und
  `data/source-files/kosmosprepare-origin.json`
- erzeugt bei Prepare-only-Paketen einen sichtbaren Kontextlayer statt mit
  "keine Raeume" abzubrechen
- schreibt `design/context-import.generated.json` als persistenten Report zum
  importierten Kontext
- schreibt `design/context-candidates.generated.json` als review-pflichtige
  Kandidatenliste fuer Ursprung, Perimeter, DXF-Layerrollen und IFC-Rollen
- nutzt `design/context-selection.json` als menschliches Gate, bevor Kandidaten
  zu Designinput werden duerfen
- schreibt optional `design/context-decision-matrix.generated.json` und `.md`
  als Empfehlungsschicht fuer Kandidatenentscheidungen
- verwendet den bestehenden Blender-Operator `kosmo_design.create_room_from_plan`
- erzeugt Collections unter `Kosmo_Project_<project_id>`
- taggt erzeugte Collections/Objekte mit `kosmo_project_*` und `kosmo_source_*` Custom Properties
- schreibt `design/model-profile.exported.json` aus den Blender-Raumobjekten zurueck
- schreibt `draw/exports/ground-floor-plan.svg` und `draw/exports/section-a.svg`
- schreibt `viz/previews/kosmo-preview-axon.png`, `viz/previews/preview-manifest.json` und `viz/cameras.generated.json`

## 2. Implementierter Ort

Aktiver Projektort:

- privates lokales KosmoDraw-Projekt, Datei `code/kosmo_design/operators_package_bridge.py`

Eingebunden in:

- `code/kosmo_design/__init__.py`
- `code/kosmo_design/panel.py`

Panel:

- `View3D > Sidebar > Kosmo Design > Kosmo Orbit Package`

Operator:

- `kosmo_design.load_project_package`
- `kosmo_design.export_project_package_profile`
- `kosmo_design.export_project_package_drawings`
- `kosmo_design.export_project_package_viz_preview`

## 3. Erwarteter Input

Der Operator akzeptiert entweder:

- einen Projektordner mit `kosmo.project.json`
- oder direkt die Datei `kosmo.project.json`

Demo-Paket:

- `examples/kosmo-projects/kosmo-demo-001/kosmo.project.json`

Das Demo-Paket referenziert:

- `design/model-profile.json`

## 4. Was beim Import entsteht

In Blender entsteht:

```plain text
Kosmo_Project_kosmo-demo-001
  Kosmo_Context_kosmo-demo-001
    Kosmo_Context_Origin_*
    Kosmo_Context_Perimeter_*
    Kosmo_Context_Label_*
  Kosmo_Floor_EG
    Kosmo_Room_*
  Kosmo_Floor_1.OG
    Kosmo_Room_*
```

Bei einem KosmosPrepare-Phase-0-Paket ohne Raeume entsteht statt Raumobjekten:

```plain text
Kosmo_Project_<project_id>
  Kosmo_Context_<project_id>
    Kosmo_Context_Origin_*
    Kosmo_Context_Perimeter_*
    Kosmo_Context_DXF_Underlay_*
    Kosmo_Context_IFC_Bounds_*
    Kosmo_Context_Label_*
```

Jeder Raum wird ueber den bestehenden Plan-Sketch-to-BIM Generator erzeugt:

- Walls
- Floor
- Ceiling
- Label
- Geschoss-Z-Offset
- Raumfunktion-Farbtag, soweit gemappt

Zusatz-Metadaten:

- `kosmo_project_id`
- `kosmo_project_root`
- `kosmo_project_manifest`
- `kosmo_model_profile`
- `kosmo_source_room_id`
- `kosmo_source_story_id`
- `kosmo_source_function`
- `kosmo_package_origin = kosmo_project_package`

Phase-0-Kontextobjekte erhalten:

- `kosmo_context_origin = kosmo_prepare_source`
- `kosmo_role = prepare_origin_marker | prepare_perimeter | prepare_dxf_underlay | prepare_ifc_bounds | prepare_context_label`
- `kosmo_context_source_path`, falls eine Quelle wie DXF oder IFC dahinterliegt

Der DXF-Kontext ist ein limitiertes, sichtbares Mesh-Underlay aus POLYLINE/LWPOLYLINE-Entitaeten. Der IFC-Kontext ist aktuell noch kein voller IFC-Import, sondern eine Quellenanalyse mit sichtbarer Bounding-Box aus `IFCCARTESIANPOINT`-Daten. Das ist bewusst so: Phase 0 soll Grundlagen sichtbar machen, noch nicht behaupten, dass daraus bereits ein BIM-Modell entstanden ist.

Zusätzlich wird im Projektpaket geschrieben:

- `design/context-import.generated.json`
- `design/context-candidates.generated.json`
- `design/context-selection.json`
- `design/context-decision-matrix.generated.json`
- `design/context-decision-matrix.generated.md`

Dieser Report enthält die importierte Kontext-Collection, Objektanzahl,
Perimeter, DXF-Zählwerte, DXF-Layerklassifikation, IFC-Entity-Gruppen,
IFC-Heuristik und IFC-Bounds. Damit können Kosmo Zentrale oder KosmoPublish
später prüfen, was KosmoDraw aus den Grundlagen erkannt hat, ohne Blender
erneut zu starten.

Die Kandidatenliste ist die erste vorsichtige Bruecke Richtung Designlogik. Sie
enthaelt nur Vorschlaege wie `context-origin`, `context-perimeter`,
`dxf-role-1-existing_building`, `ifc-bounds` oder IFC-Rollen. Jeder Eintrag
bleibt `status: generated_needs_review` beziehungsweise
`status: needs_human_review`, traegt eine Confidence, Evidence und Warnungen.
Damit kann Kosmo spaeter fragen: "Soll ich diese Grundlage als Entwurfsinput
verwenden?", statt aus DXF/IFC automatisch verbindliche Planobjekte zu machen.

`design/context-selection.json` ist der naechste Gate-Layer. Er wird mit
`npm run kosmo:context-selection -- --project <projektpfad>` aus den Kandidaten
erzeugt oder aktualisiert. Der Default ist absichtlich konservativ:
alle Kandidaten bleiben `undecided`, `approved_for_design_generation` bleibt
`false`, und bestehende manuelle Entscheidungen werden beim Refresh erhalten.
Das Tool registriert die Selection-Datei auch in `kosmo.project.json` und
`publish/export-manifest.json`, falls sie dort noch fehlt.

`design/context-decision-matrix.generated.json` und `.md` entstehen mit
`npm run kosmo:context-matrix -- --project <projektpfad>`. Die Matrix ist nur
advisory: sie empfiehlt `accepted_as_context`, `needs_more_source_review`,
`rejected` oder spaeter `accepted_as_design_seed`, schreibt aber keine
Freigabe in `context-selection.json`.

Einzelne Kandidaten koennen im gleichen Tool bewusst entschieden werden:

```bash
npm run kosmo:context-selection -- --project <projektpfad> \
  --decision context-origin=accepted_as_context \
  --decision context-perimeter=needs_more_source_review \
  --note context-origin="Koordinaten mit Lageplan abgeglichen" \
  --reviewed-by "Local Reviewer"
```

Erst wenn alle Kandidaten entschieden sind und mindestens ein Kandidat als
`accepted_as_design_seed` markiert ist, darf mit
`--approve-design-generation` die finale lokale Design-Freigabe gesetzt werden.

Fuer die schnelle lokale Owner-Pruefung gibt es zusaetzlich:

```bash
npm run kosmo:context-review -- --project <projektpfad>
```

Das schreibt `design/context-review.md` und `design/context-review.json`. Diese
Review-Ansicht kombiniert Kandidaten, aktuelle Auswahl und Matrix-Empfehlung zu
einer kleinen Entscheidungsliste inklusive konkreter Commands. Sie setzt ohne
`--decision` und `--approve-design-generation` keine Freigabe.

## 5. Was beim Write-back entsteht

Der Export-Operator liest die getaggten Blender-Raumobjekte des aktiven Projekts
und schreibt:

- `design/model-profile.exported.json`

Absichtlich nicht ueberschrieben wird:

- `design/model-profile.json`

Das Exportprofil enthaelt aktuell:

- `stories`
- `rooms`
- Raumflaechen aus den Polygonen
- Boundary-Polygone
- Quellobjekt-Namen aus Blender
- Projekt-Collections
- Export-Metadaten mit Zeitstempel

## 6. Was beim Draw-Export entsteht

Der Draw-Operator liest dieselben getaggten Blender-Raumobjekte und schreibt:

- `draw/exports/ground-floor-plan.svg`
- `draw/exports/section-a.svg`

Der aktuelle Export ist bewusst diagrammatisch:

- Raum-Polygone aus `kosmo_room_outline`
- Raumname, Funktion und Flaeche
- Geschoss-/Hoehenlogik aus den Blender Custom Properties
- SVG-Marker `data-kosmo-export="draw-plan"` und `data-kosmo-export="draw-section"`
- Status bleibt `generated_needs_review`

## 7. Was beim Viz-Export entsteht

Der Viz-Operator liest die Bounds der getaggten Blender-Raumobjekte und erzeugt:

- eine orthografische Axon-Kamera
- Sun- und Area-Light-Setup
- `viz/previews/kosmo-preview-axon.png`
- `viz/previews/preview-manifest.json`
- `viz/cameras.generated.json`

Der aktuelle Preview ist bewusst ein schneller lokaler EEVEE-Render:

- 960 x 540 px
- Quelle: Blender-Raumobjekte aus dem Projektpaket
- Status bleibt `generated_needs_review`

## 8. Getestet

Statische Python-Pruefung:

```bash
python3 -m py_compile \
  code/kosmo_design/__init__.py \
  code/kosmo_design/panel.py \
  code/kosmo_design/operators_package_bridge.py
```

Status: bestanden.

Headless Blender Smoke-Test:

```bash
npm run kosmo:blender-package-smoke
```

Status: lokal bestanden. Der Command sucht `BLENDER_BIN`, danach `blender` im
Shell-Pfad, danach `/Applications/Blender.app/...` und danach die lokale
Steam-Blender-Installation.
Der KosmoDraw-Addon-Code kann mit `--addon-code` oder `KOSMO_DRAW_ADDON_CODE`
gesetzt werden. Ohne expliziten Pfad findet der Command lokal auch
`~/Documents/Claude/Projects/KosmoDraw/code`.

Resultat:

- `kosmo.project.json` wurde geladen.
- `design/model-profile.json` wurde gelesen.
- `design/context-import.generated.json` wurde geschrieben.
- `design/context-candidates.generated.json` wurde geschrieben.
- `kosmo_design.load_project_package` hat 3 Raeume importiert.
- Blender hat 12 Objekte erzeugt: 3 Walls, 3 Floors, 3 Ceilings, 3 Labels.
- `kosmo_design.export_project_package_profile` hat 3 Raeume exportiert.
- `design/model-profile.exported.json` wurde geschrieben.
- `kosmo_design.export_project_package_drawings` hat Plan- und Schnitt-SVGs erzeugt.
- `draw/exports/ground-floor-plan.svg` wurde aus Blender-Raeumen geschrieben.
- `draw/exports/section-a.svg` wurde aus Blender-Raeumen geschrieben.
- `kosmo_design.export_project_package_viz_preview` hat Kamera, Licht und Preview erzeugt.
- `viz/previews/kosmo-preview-axon.png` wurde als PNG gerendert.
- `viz/previews/preview-manifest.json` und `viz/cameras.generated.json` wurden geschrieben.
- Projekt-Collection: `Kosmo_Project_kosmo-demo-001`.

KosmosPrepare-Kontext-Smoke-Test:

```bash
npm run kosmo:blender-package-smoke -- \
  --project archive-intake/kosmo-projects/zg-07052026/kosmo.project.json \
  --expected-rooms 0 \
  --expect-context \
  --output-blend archive-intake/kosmo-projects/zg-07052026-context-smoke.blend
```

Status: lokal bestanden. Das Prepare-Paket `02_Sandbox` erzeugt 5 Kontextobjekte:
Origin-Marker, Perimeter, DXF-Underlay, IFC-Bounds und Label. Es erzeugt bewusst
0 Raeume, weil `design/model-profile.json` in diesem Paket noch ein leerer
Design-Seed ist. Der Report `design/context-import.generated.json` enthaelt
u.a. 13'406 erkannte DXF-Polylines, 1'800 importierte Underlay-Polylines,
273'526 IFC-CartesianPoints und die berechneten IFC-Bounds.

Zusaetzlich schreibt KosmoDraw
`design/context-candidates.generated.json` mit 9 review-pflichtigen Kandidaten:
Ursprung, Perimeter, DXF-Layerrolle `existing_building`, eine unklassifizierte
DXF-Layerrolle, IFC-Bounds, IFC-Projekt-/Site-Hierarchie, IFC-Mesh-Bounds,
semantische IFC-Building-Elemente und IFC-Property-/Source-Metadata.

Danach erzeugt der Orbit-Befehl
`npm run kosmo:context-selection -- --project archive-intake/kosmo-projects/zg-07052026`
das Gate `design/context-selection.json`. Im ZG-Testpaket stehen dort 9
Kandidaten auf `undecided`; es ist also noch kein Design-Seed freigegeben.

Die Decision-Matrix wird mit
`npm run kosmo:context-matrix -- --project archive-intake/kosmo-projects/zg-07052026`
erzeugt. Fuer das ZG-Testpaket empfiehlt sie aktuell:

- 6 Kandidaten als `accepted_as_context`
- 2 Kandidaten als `needs_more_source_review`
- 1 Kandidat als `rejected`
- 0 Kandidaten als `accepted_as_design_seed`

Erste heuristische Klassifikation:

- Gesamtcontext: `prepare_site_context_with_dxf_ifc`
- Design Readiness: `context_ready_needs_human_layer_review`
- DXF: `dense_polyline_underlay`; dominanter Layer
  `AB_Schwarzplan_Schwarzplan_Gebaeude` wird als `existing_building`
  vorgeschlagen.
- IFC: `semantic_ifc_context`; Projekt-/Site-/Building-Hierarchie,
  Mesh-Bounds, Property-Daten und 282 semantische Building-Element-Entities
  werden erkannt.
- Warnung bleibt: Vor Design-Generierung muessen Layer/IFC-Elemente geprueft
  und nicht automatisch als verbindliche BIM-Bauteile behandelt werden.

Ein oeffnbares Test-Blend wurde erzeugt unter:

- `archive-intake/kosmo-projects/kosmo-demo-001-smoke.blend`

Der Ordner `archive-intake/` ist gitignored und bleibt lokal.

Hinweis: Im Headless-Test erscheinen zwei harmlose Add-on-Preference-Warnings, weil das Add-on direkt aus dem Source-Pfad importiert und nicht als installierter Blender-Addon-Eintrag aktiviert wird. Import, Write-back, Draw-Export und Viz-Preview sind erfolgreich.

## 9. Naechster Schritt

Nach dem ersten Blender-Test:

1. DXF-Unterlage besser filtern: Layer, Hoehenlinien, Parzelle, Gebaeude, Baulinien.
2. IFC nicht nur als Bounds analysieren, sondern ueber Bonsai/IfcOpenShell oder einen separaten Importpfad als echte Kontextgeometrie laden.
3. Die Empfehlungen aus `context-decision-matrix.generated.md` in
   `design/context-selection.json` manuell akzeptieren oder korrigieren.
4. Kosmo Zentrale Job-Log mit Paketpfad, Importresultat, Exportresultat, Draw-Export und Viz-Preview verbinden.
