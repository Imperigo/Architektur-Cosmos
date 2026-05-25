# Kosmo Design Package Bridge

Stand: 2026-05-25  
Status: erster Import-Connector implementiert im aktiven Blender-Projekt `KosmoDraw`.

## 1. Ziel

Kosmo Design soll das lokale Kosmo-Projektpaket aus `Kosmo MVP 0.1` lesen und daraus in Blender echte, bearbeitbare Raum-/Geschossobjekte erzeugen.

Der erste Connector ist bewusst duenn:

- liest `kosmo.project.json`
- liest `design/model-profile.json`
- verwendet den bestehenden Blender-Operator `kosmo_design.create_room_from_plan`
- erzeugt Collections unter `Kosmo_Project_<project_id>`
- taggt erzeugte Collections/Objekte mit `kosmo_project_*` und `kosmo_source_*` Custom Properties

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

## 5. Getestet

Statische Python-Pruefung:

```bash
python3 -m py_compile \
  code/kosmo_design/__init__.py \
  code/kosmo_design/panel.py \
  code/kosmo_design/operators_package_bridge.py
```

Status: bestanden.

Hinweis: Ein echter Blender-Viewport-Test ist noch offen. Der naechste Schritt ist, das Add-on in Blender neu zu laden und das Demo-Paket zu importieren.

## 6. Naechster Schritt

Nach dem ersten Blender-Test:

1. Import-Status in `design/import-status.json` schreiben.
2. Export-Operator bauen, der geaenderte Blender-Raeume wieder als `design/model-profile.exported.json` zurueckschreibt.
3. Kosmo Draw Planexport direkt aus dem importierten Modell testen.
4. Kosmo Zentrale Job-Log mit Paketpfad und Importresultat verbinden.
