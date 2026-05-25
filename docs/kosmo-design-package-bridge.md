# Kosmo Design Package Bridge

Stand: 2026-05-25  
Status: Import-, Write-back-, Draw-SVG- und Viz-Preview-Connector implementiert im aktiven Blender-Projekt `KosmoDraw`.

## 1. Ziel

Kosmo Design soll das lokale Kosmo-Projektpaket aus `Kosmo MVP 0.1` lesen und daraus in Blender echte, bearbeitbare Raum-/Geschossobjekte erzeugen.
Bearbeitete oder importierte Raumdaten koennen wieder als separates Exportprofil in das Projektpaket geschrieben werden, ohne das urspruengliche `design/model-profile.json` zu ueberschreiben.
Zusaetzlich kann KosmoDraw einfache SVG-Planexports direkt aus den in Blender erzeugten Raumobjekten schreiben.
Kosmo Viz kann aus demselben Modell automatisch Kamera, Licht und einen lokalen PNG-Preview erzeugen.

Der erste Connector ist bewusst duenn:

- liest `kosmo.project.json`
- liest `design/model-profile.json`
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
  Kosmo_Floor_EG
    Kosmo_Room_*
  Kosmo_Floor_1.OG
    Kosmo_Room_*
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
Shell-Pfad, danach die lokale Steam-Blender-Installation und danach den
Standardpfad `/Applications/Blender.app/...`.
Der KosmoDraw-Addon-Code kann mit `--addon-code` oder `KOSMO_DRAW_ADDON_CODE`
gesetzt werden.

Resultat:

- `kosmo.project.json` wurde geladen.
- `design/model-profile.json` wurde gelesen.
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

Ein oeffnbares Test-Blend wurde erzeugt unter:

- `archive-intake/kosmo-projects/kosmo-demo-001-smoke.blend`

Der Ordner `archive-intake/` ist gitignored und bleibt lokal.

Hinweis: Im Headless-Test erscheinen zwei harmlose Add-on-Preference-Warnings, weil das Add-on direkt aus dem Source-Pfad importiert und nicht als installierter Blender-Addon-Eintrag aktiviert wird. Import, Write-back, Draw-Export und Viz-Preview sind erfolgreich.

## 9. Naechster Schritt

Nach dem ersten Blender-Test:

1. Exportprofil, Draw-SVGs und Viz-Manifeste gegen klare MVP-Schemas haerten.
2. Kosmo Zentrale Job-Log mit Paketpfad, Importresultat, Exportresultat, Draw-Export und Viz-Preview verbinden.
3. Optional: mehrere Kameras, Material-Presets und echte Sonne/Standortdaten aus dem Projektpaket einbinden.
4. Optional: Headless-Test um Review-Pack-Validierung und Bildqualitaetscheck erweitern.
