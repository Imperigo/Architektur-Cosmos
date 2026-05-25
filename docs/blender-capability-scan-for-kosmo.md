# Blender Capability Scan for Kosmo

Stand: 2026-05-25  
Zweck: Arbeitsnotiz, welche Blender-Faehigkeiten fuer KosmoDesign, KosmoAsset, KosmoData und KosmoZentrale direkt nutzbar, erweiterbar oder nur als Inspiration geeignet sind.

## 1. Kurzfazit

Blender ist fuer Kosmo nicht nur ein 3D-Programm. Es ist ein offener, skriptbarer, visuell starker Spatial Kernel mit:

- Python API und Add-on-System fuer eigene Werkzeuge, Panels, Operatoren, Viewport-Overlays und Automationen.
- Geometry Nodes fuer parametrische/prozedurale Modellierung.
- Simulation Nodes und klassische Physics fuer zeitbasierte und physikalisch inspirierte Prozesse.
- Cycles fuer physikalisch plausibles Path-Tracing und EEVEE fuer schnelle Echtzeit-Previews.
- Sun Position, Sky/HDRI, Light Probes und Raytracing-Features fuer Entwurfslicht, Schattenstudien und Atmosphaere.
- Grease Pencil fuer 2D-/3D-Skizzen, Storyboards, Planvorformen und AR-/Tablet-Interaktion.
- Asset Libraries fuer wiederverwendbare Bauteile, Materialien, Kataloge und KosmoAsset.
- Import/Export fuer GLB/glTF, USD, Alembic, OBJ, STL, SVG/PDF-Grease-Pencil und andere Austauschformate.

Die beste Strategie bleibt: Blender nicht frueh forken, sondern als Host und Engine nutzen. Kosmo baut eigene Architektur-Intelligenz, Datenmodelle, Planlogik, Pruefungen, Freigabe-Gates und Office-Workflows um Blender herum.

## 2. Versionsstrategie

Fuer ein Buero-Produkt sollte Kosmo zwei Blender-Linien unterscheiden:

- Stable/LTS-Linie: fuer produktive Arbeit, Add-on-Kompatibilitaet und Schulung. Blender 4.5 LTS ist die konservative Basis.
- Experimental/Lab-Linie: fuer neue 5.x-Funktionen, Performance, Raycast-/Node-Features, Vulkan/Viewport-Verbesserungen und fruehe KI-/AR-Experimente.

Praktisch: KosmoDesign sollte eine feste Support-Matrix fuehren, z.B. `supported: 4.5 LTS`, `experimental: 5.1+`. Neue Blender-Versionen duerfen zuerst in einer Sandbox getestet werden, bevor sie in ein Buero-Setup kommen.

## 3. Subsysteme, die Kosmo direkt ausnutzen kann

### Python API und Add-on-System

Relevanz: sehr hoch.

Blender laesst sich ueber Python tief erweitern: Daten bearbeiten, eigene Werkzeuge ausfuehren, Operatoren/Panels/Menus definieren, Settings speichern, interaktive Tools bauen und im Viewport zeichnen. Genau darauf basieren `kosmo_design` und `ar_bridge` bereits.

Kosmo-Nutzung:

- eigene Operatoren: Raum erzeugen, Geschoss anlegen, Wand oeffnen, Variante generieren, Plan exportieren
- eigene Panels: Kosmo Brief, Room Data, Varianten, Pruefstatus, Quellen, Rechte
- eigene Custom Properties: `kosmo_room_id`, Nutzung, Geschoss, Flaeche, Quelle, Lizenzstatus, Unsicherheit
- Viewport Overlays: Masse, Achsen, Raumlabel, Sonnenpfad, Fluchtwege, Fehlerhinweise
- Action-Bus: externe KI/AR/Control-Hub-Kommandos in Blender ausfuehren

Kosmo-Entscheidung: Add-ons und Connectoren bleiben schlank und sauber benannt. Die langfristige Intelligenz liegt in Kosmo Core/Zentrale, nicht in einem unkontrollierten Blender-Monolithen.

### Geometry Nodes

Relevanz: sehr hoch.

Geometry Nodes sind fuer Kosmo fast wie ein visuelles parametrisches CAD-Labor. Besonders relevant:

- Fassadenraster, Stuetzentakte, Dachsysteme, Fassadenmodule
- Treppen-, Geländer-, Brüstungs- und Deckenraster-Generatoren
- Terrain-/Landschaftslogik
- Varianten mit Parametern statt manuellem Modellieren
- regelbasierte Asset-Verteilung aus KosmoData
- "For Each Geometry Element" und Repeat-/Simulation-Zones fuer komplexere prozedurale Systeme

Kosmo-Nutzung:

- KosmoDesign erzeugt parametrisierte Bauteile und Varianten.
- KosmoAsset liefert Node-Gruppen als versionierte Assets.
- KosmoZentrale kann Node-Parameter als pruefbare, dokumentierte Entwurfsentscheidungen speichern.

Grenze: Geometry Nodes ersetzen kein echtes BIM-Datenmodell. Kosmo muss semantische Architektur-Objekte selbst fuehren und die Nodes als Geometrie-/Variantenmotor verwenden.

### Simulation Nodes

Relevanz: hoch fuer Entwurf, mittel fuer professionelle Nachweise.

Simulation Zones erlauben, dass ein Frame den naechsten beeinflusst und Simulationen gecacht/gebacken werden koennen. Fuer Kosmo ist das weniger "Ingenieur-Nachweis" und mehr "Entwurfsmaschine".

Kosmo-Nutzung:

- Wachstums-/Dichte-/Partikel-Studien fuer Staedtebau, Vegetation, Bewegung, Besonnungssampling
- iterative Varianten: Raumcluster wandern, wachsen, kollidieren, stabilisieren
- einfache Agenten-/Nutzungsfluss-Simulationen im Entwurf
- generative Formfindung mit reviewbaren Parametern

Grenze: Nicht als zertifizierte Statik, Brandschutz, Tageslichtnorm oder Energieanalyse verkaufen. Fuer Nachweise spaeter externe Engines anbinden.

### Klassische Physics

Relevanz: mittel bis hoch, je nach Use Case.

Blender bietet Rigid Body, Cloth, Soft Body, Fluid, Particle System, Dynamic Paint, Forces, Collision und Baking. Fuer Architektur ist nicht alles gleich wertvoll, aber mehrere Teile sind spannend:

- Rigid Body: Kollisions-/Abstandslogik, Moeblierung, stapelbare Elemente, schnelle Plausibilitaet.
- Cloth/Soft Body: Membrane, Vorhaenge, Textilien, Sonnensegel, adaptive Huelle, Designstudien.
- Fluid: Wasser, Regen, Brunnen, atmosphaerische Visualisierung, nicht als Hydrologie-Nachweis.
- Particles/Hair/Instances: Vegetation, Menschenstroeme als visuelle Dichte, Fassadenelemente.
- Dynamic Paint: Spuren, Nutzung, Wettersimulation als visuelle Entwurfsanalyse.
- Force Fields: Wind-/Kraft-Studien als visuelle Exploration.

Kosmo-Nutzung:

- schnelle "Was passiert wenn?"-Studien im Modell
- anschauliche Kunden-/Teamkommunikation
- KI kann Simulations-Setups erzeugen, Parameter erklaeren und Resultate als Hypothesen markieren

Grenze: Physics ist in Blender in erster Linie Kreativ-/Animationsphysik. Kosmo braucht klare Labels: `conceptual`, `visual`, `engineering_external_required`.

### Rendering: Cycles

Relevanz: sehr hoch.

Cycles ist fuer Kosmo die hochwertige Licht-, Material- und Render-Schicht. Es nutzt Path Tracing, Light Paths, Bounce Controls, Transparenz, Caustics-Optionen und Fast-GI-Approximationen. Fuer Architektur ist das extrem wertvoll:

- Innenraumlicht und Materialwirkung
- Nacht-/Tag-/Schattenstimmungen
- transparente und reflektierende Bauteile
- Variantenvergleich mit gleichen Kameras/Lichtparametern
- Materialbibliothek und realistische Kundenbilder

Kosmo-Nutzung:

- KosmoVis rendert Varianten aus KosmoDesign
- KosmoData speichert Material- und Lichtsetups
- KosmoZentrale plant Renderjobs, Kosten, Prioritaeten und Freigaben

Grenze: Cycles ist physikalisch plausibel, aber kein normierter Tageslicht- oder Energie-Nachweis. Fuer echte Tageslichtkennwerte spaeter Radiance/Ladybug/Honeybee/EnergyPlus anbinden.

### Rendering: EEVEE / Viewport

Relevanz: sehr hoch fuer interaktive Arbeit.

EEVEE ist fuer Echtzeit-Feedback, AR/VR, Wettbewerbs-Previews und schnelle Varianten ideal. Aktuelle EEVEE-/Viewport-Funktionen enthalten Raytracing-Einstellungen, Light Probes, Screen Tracing, Fast GI Approximation, Volumetrics, Motion Blur, Depth of Field und Performance-Regler.

Kosmo-Nutzung:

- Live-Entwerfen mit sofortiger Licht-/Materialstimmung
- AR-/WebXR-/Quest-Previews
- schnelle Kundenbegehungen
- Vergleich von Varianten ohne lange Renderzeiten

Grenze: EEVEE ist schneller und interaktiver, aber approximativer als Cycles. Kosmo sollte zwischen `preview`, `presentation` und `validated analysis` unterscheiden.

### Sun Position, Sky und Lichtstudien

Relevanz: sehr hoch fuer Architektur.

Das gebuendelte Sun Position Add-on kann die Sonne mit Ort, Datum, Uhrzeit, Zeitzone und Nordrichtung positionieren und visualisieren. Das ist fuer Kosmo ein direkter Hebel:

- Besonnungsstudien fuer Wettbewerb und Entwurf
- Schattenverlauf ueber Tag/Jahr
- Orientierung und Nordpfeil als Modellmetadaten
- Verbindung zu Standortdaten aus KosmoPrepare/KosmoData
- automatische Variantenbewertung: "welche Variante bekommt morgens Licht im Wohnraum?"

Kosmo-Nutzung:

- Standortdaten aus KosmoPrepare werden automatisch in Blender gesetzt.
- Kosmo erzeugt Sonnenpfad-Overlays und Schattenbilder.
- KosmoDraw/KosmoPublish kann Sonnen-/Schatten-Diagramme exportieren.

Grenze: Gute Entwurfsanalyse, aber fuer normierte Tageslicht-/Energienachweise braucht es spezialisierte Simulation.

### Grease Pencil

Relevanz: sehr hoch fuer Skizze, AR und Plan-Vorform.

Grease Pencil speichert Zeichnungen als Objekte im 3D-Raum. Das passt direkt zur Kosmo-Idee: Skizze ist nicht nur Bild, sondern raeumliches Eingabeobjekt.

Kosmo-Nutzung:

- Handskizze im Plan oder Schnitt als 3D-nahe Eingabe
- Umwandlung von Stroke zu Raumkante, Wand, Achse, Bewegungspfad
- AR-Zeichnung im Raum
- Korrektur-Layer ueber einem generierten Modell
- Entwurfsnotizen, Storyboards, Diagramme

Kosmo-These: Grease Pencil plus KI plus Plan-Sketch-to-BIM ist einer der wichtigsten Wege, um manuelles CAD-Zeichnen zu ueberspringen.

### Asset Libraries

Relevanz: sehr hoch.

Blenders Asset Libraries und Asset Catalogs sind fast eine fertige lokale Bauteil-/Materialbibliothek. KosmoAsset kann darauf aufbauen:

- Materialien, Moebel, Bauteile, Fassadenmodule, Treppen, Vegetation
- Kataloge nach Typologie, Material, Massstab, Projektquelle, Rechte-Status
- lokale Office-Standards und wiederverwendbare Details
- Preview-Thumbnails und Drag-and-drop in Blender

Kosmo-Nutzung:

- KosmoAsset fuehrt Asset-Metadaten, Rechte, Quellen, Versionen und Semantik.
- Blender Asset Browser dient als schnelle Entwurfsoberflaeche.
- KosmoZentrale synchronisiert lokale Libraries, ohne private Assets oeffentlich zu machen.

### Import/Export und Pipeline

Relevanz: sehr hoch.

Blender unterstuetzt breite Import-/Exportformate wie USD, Alembic, OBJ, FBX, PLY, STL, Collada, SVG/Grease Pencil und mehr. Fuer Kosmo ist das die Bruecke zu:

- Webviewer: GLB/glTF
- ArchiCAD/Revit/OpenBIM: ueber IFC/Bonsai oder externe Bridges
- Visualisierung: USD/Alembic/EXR-Pipeline
- 3D-Druck/Modelle: STL/OBJ
- Plan-/Skizzenlayer: SVG/PDF/Grease Pencil

Kosmo-Nutzung:

- keine harte Abhaengigkeit von einem proprietaeren CAD-Format am Anfang
- saubere Exportpakete fuer Wettbewerbe
- spaeter OpenBIM/IFC als semantische Austauschschicht

## 4. Was Kosmo von CADs lernen sollte, ohne sie zu kopieren

Von ArchiCAD/Vectorworks/Rhino/Grasshopper lernen:

- direkte numerische Eingabe, Tracker, Snaps, Achsensperren, Favoriten/Pipette
- Geschosse, Ebenen, Schnitte, Ansichten, Layouts, Plankopf, Exportsets
- BIM-nahe Objekte mit Parametern und Regeln
- visuelles Scripting und parametrische Varianten
- sauberer Austausch mit Fachplanern

Aber Kosmo sollte nicht versuchen, alte CAD-Interaktionen 1:1 nachzubauen. Der Kosmo-Weg:

- Intent-first: "mach aus dieser Skizze drei Wohnungsvarianten"
- Review-first: KI zeigt Unsicherheiten und fragt nach
- Data-first: jedes Objekt kennt Quelle, Funktion, Rechte, Version, Entscheidung
- Local-first: Buero-Wissen bleibt auf der HomeStation
- Blender-first, aber nicht Blender-only: Blender ist Werkbank, Kosmo ist das Betriebssystem

## 5. Priorisierte Kosmo-Backlog-Ideen aus Blender

1. Blender Capability Registry  
   Eine JSON/YAML-Datei, die festhaelt, welche Blender-Subsysteme Kosmo nutzt: Python Operator, Geometry Node Group, Asset Catalog, Render Preset, Simulation Preset, Export Profile.

2. Kosmo Sun Study Operator  
   Standort, Datum, Uhrzeit und Nordrichtung aus KosmoPrepare setzen; Sonnenpfad, Schattenbilder und Planwerk-Diagramme erzeugen.

3. Kosmo Geometry Node Library  
   Fassadenraster, Raumcluster, Treppen, Geländer, Dachformen, Staedtebau-Blocks, Vegetation, Moeblierung.

4. Kosmo Physics Sandbox  
   Rigid-body/collision fuer Plausibilitaet, Cloth fuer Membrane, Dynamic Paint fuer Nutzungsspuren; alle Resultate als `conceptual` markieren.

5. Kosmo Grease Pencil Interpreter  
   Stroke-Klassifikation: Raumkante, Wand, Achse, Schnittlinie, Kommentar, Bewegungspfad. Danach Umwandlung in KosmoDesign-Geometrie.

6. Kosmo Render Preset System  
   EEVEE fuer Live/AR, Cycles fuer Praesentation, klare Presets fuer Innenraum, Nacht, Tageslicht, Modellbau, Wettbewerb.

7. Kosmo Asset Bridge  
   KosmoAsset-Metadaten mit Blender Asset Browser verbinden: Rechte, Quelle, Massstab, Tags, Projekt, Material, Lizenzwarnung.

8. Kosmo Export Pack  
   GLB fuer Web, Blender-Datei fuer Weiterarbeit, PDF/SVG/PNG fuer Planwerk, spaeter IFC/OpenBIM ueber Bridge.

## 6. Wichtige Grenzen

- Blender ist genial fuer Modell, Entwurf, Visualisierung, Interaktion und prozedurale Geometrie.
- Blender ist nicht automatisch ein rechtssicheres Architektur-CAD, BIM-System, Statikprogramm oder Bauphysik-Tool.
- Kosmo muss Semantik, Plaene, Normpruefung, Rechte, Versionierung, Freigaben und Buero-Standards selbst bauen.
- Physik- und Lichtsimulationen in Blender muessen klar als Entwurf/Visualisierung oder als externe validierte Analyse gekennzeichnet werden.
- Fuer eine 1-2-Personen-Armee ist der Add-on-/Connector-Weg viel staerker als ein frueher Fork.

## 7. Offizielle Quellen

- Blender Release Notes: https://developer.blender.org/docs/release_notes/
- Blender 5.1 Release Notes: https://developer.blender.org/docs/release_notes/5.1/
- Blender Manual 5.1: https://docs.blender.org/manual/en/dev/
- Blender Installation / Release Types: https://docs.blender.org/manual/en/dev/getting_started/installing/index.html
- Blender Python API Quickstart: https://docs.blender.org/api/current/info_quickstart.html
- Blender Physics Manual: https://docs.blender.org/manual/en/latest/physics/index.html
- Geometry Nodes Simulation Zone: https://docs.blender.org/manual/en/4.0/modeling/geometry_nodes/simulation/simulation_zone.html
- Cycles Light Paths: https://docs.blender.org/manual/en/latest/render/cycles/render_settings/light_paths.html
- EEVEE Raytracing: https://docs.blender.org/manual/en/latest/render/eevee/render_settings/raytracing.html
- EEVEE Light Probe Volume: https://docs.blender.org/manual/en/latest/render/eevee/light_probes/volume.html
- Sun Position Add-on: https://docs.blender.org/manual/en/3.4/addons/lighting/sun_position.html
- Grease Pencil Introduction: https://docs.blender.org/manual/en/latest/grease_pencil/introduction.html
- Asset Libraries: https://docs.blender.org/manual/en/latest/files/asset_libraries/index.html
- Importing and Exporting Files: https://docs.blender.org/manual/en/latest/files/import_export/index.html
