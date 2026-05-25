# Kosmo MVP 0.1 Architecture

Stand: 2026-05-25  
Status: Arbeitsarchitektur fuer den ersten durchgehenden Prototyp.

## 1. Ziel

Kosmo MVP 0.1 soll nicht "ein CAD" werden. Der erste Beweis soll sein:

**Von Wettbewerb/Ort/Skizze zu einem nachvollziehbaren Kosmo-Projektpaket mit Brief, Daten, Blender-Grundmodell, einfachem Planexport und Variantenprotokoll.**

Der MVP verbindet die bereits laufenden Stränge:

- Kosmo Data / Architecture Cosmos
- Kosmo Zentrale / Control Hub
- Kosmo Design / KosmoDraw
- Blender / ArchViz / Kosmo Viz
- Notion AI Workflow-Pipeline

## 2. MVP-Schnitt

MVP 0.1 bildet einen schmalen, aber echten Ablauf ab:

1. Projekt anlegen.
2. Wettbewerbs-/Projektgrundlagen erfassen.
3. Kosmo Prepare erzeugt Brief, Constraints und offene Fragen.
4. Kosmo Data liefert Referenzen, Quellen, Rechte- und Asset-Hinweise.
5. Kosmo Design erzeugt in Blender ein erstes bearbeitbares Grundlagen-/Raummodell.
6. Kosmo Draw erzeugt einen einfachen Grundriss/Schnitt-Export.
7. Kosmo Viz erzeugt eine schnelle Standardkamera-/Licht-Preview.
8. Kosmo Publish buendelt lokale Outputs in einem reviewbaren Projektpaket.
9. Kosmo Zentrale protokolliert Jobs, Entscheidungen, Unsicherheiten und Freigaben.

## 3. Systembild

```mermaid
flowchart TD
  INPUT["Input<br/>PDF / Ort / Skizze / Programm"]
  PREP["Kosmo Prepare<br/>Brief + Constraints"]
  DATA["Kosmo Data<br/>Referenzen + Assets + Quellen"]
  ORBIT["Kosmo Orbit<br/>Schemas + Paket + Commands"]
  DESIGN["Kosmo Design<br/>Blender Modell"]
  DRAW["Kosmo Draw<br/>Planexport"]
  VIZ["Kosmo Viz<br/>Preview + Render Presets"]
  PUBLISH["Kosmo Publish<br/>Review Pack"]
  ZENTRALE["Kosmo Zentrale<br/>Jobs + Memory + Approvals"]

  INPUT --> PREP
  PREP --> ORBIT
  DATA --> ORBIT
  ORBIT --> DESIGN
  DESIGN --> DRAW
  DESIGN --> VIZ
  DRAW --> PUBLISH
  VIZ --> PUBLISH
  PUBLISH --> ZENTRALE
  ZENTRALE --> PREP
  ZENTRALE --> DESIGN
```

## 4. Kanonisches Projektpaket

Der erste gemeinsame Nenner zwischen allen Modulen ist kein komplexes Backend, sondern ein lokales Projektpaket.

Vorschlag:

```plain text
kosmo-project/
  kosmo.project.json
  brief/
    kosmo-brief.md
    constraints.json
    open-questions.md
  data/
    sources.json
    references.json
    assets.json
    rights-review.json
  design/
    model.blend
    model-profile.json
    context-import.generated.json
    context-candidates.generated.json
    context-selection.json
    context-decision-matrix.generated.json
    context-decision-matrix.generated.md
    variants.json
  draw/
    plans/
    sections/
    exports/
  viz/
    cameras.json
    render-presets.json
    previews/
  publish/
    review-pack.md
    export-manifest.json
    change-log.md
  memory/
    decisions.jsonl
    jobs.jsonl
    uncertainty-log.jsonl
```

Das Paket ist lokal, reviewbar und versionierbar. Es kann spaeter von Kosmo Zentrale, Blender, Website, Android/macOS Control Center oder Cloudflare-Tools gelesen werden.

## 5. Modulumfang MVP 0.1

### Kosmo Prepare

Aufgabe:

- Projektstart, PDF-/Notizen-/Standortaufnahme.
- Extrahiert Programm, Randbedingungen, relevante Daten, offene Fragen.
- Schreibt `brief/kosmo-brief.md`, `brief/constraints.json`, `brief/open-questions.md`.

Minimaler MVP:

- manuelle Eingabe plus optionales PDF-Parsing
- strukturierter Brief
- Liste sicher/unsicher/fehlt

Noch nicht:

- vollautomatische Rechts-/Baugesetz-Pruefung
- autonome Webrecherche ohne Review

### Kosmo Data

Aufgabe:

- Referenzen, Quellen, Rechte, Assets, Material-/Typologiehinweise.
- Verbindung zu Architecture Cosmos / architekturkosmos.ch.

Minimaler MVP:

- lokale JSON-Referenzen aus diesem Repo
- einfache Asset-/Referenzliste
- Rechtefeld: `public_safe`, `internal_only`, `unknown`, `blocked`

Noch nicht:

- Live-D1/R2-Schreibzugriff
- public Upload
- automatische Rechtefreigabe

### Kosmo Orbit

Aufgabe:

- Software-Schicht zwischen Modulen.
- Definiert Schemas, Commands, Paketstruktur und Status.

Minimaler MVP:

- `kosmo.project.json` als zentrales Manifest
- Commands wie `prepare`, `context-matrix`, `context-selection`, `design-import`, `draw-export`, `viz-preview`, `publish-review-pack`
- klare Modulgrenzen

Noch nicht:

- grosser Plugin-Marktplatz
- Cloud-SaaS-Orchestrierung

### Kosmo Design

Aufgabe:

- Blender-native Entwurfs- und Planungswerkbank.
- Erzeugt bearbeitbares Modell aus Brief, Skizze, Text oder einfachen Raumdaten.

Minimaler MVP:

- nutzt bestehende `kosmo_design`-Logik aus KosmoDraw
- Raeume, Waende, Geschosse, Flaechen, Boundary-Layer
- schreibt `design/model-profile.json`
- speichert Varianten in `design/variants.json`

Noch nicht:

- vollstaendiges BIM
- komplexe Tuer-/Fenster-/Bauteilkataloge
- professioneller IFC-Roundtrip

### Kosmo Draw

Aufgabe:

- Planlogik: Grundriss, Schnitt, Ansicht, Axo, vektorisierte Exporte.

Minimaler MVP:

- ein Grundriss pro Geschoss
- ein einfacher Schnitt
- Export als Bild/PDF/SVG, je nach schnellster stabiler Pipeline
- Planstatus im Review Pack

Noch nicht:

- DWG-Perfektion
- vollwertiger ArchiCAD-Ersatz
- komplette Plankopf-/Layoutnorm

### Kosmo Viz

Aufgabe:

- Kameras, Licht, Material, schnelle Previews und spaeter KI-Bildvarianten.

Minimaler MVP:

- standardisierte Kameras
- Sun/Light Preset
- EEVEE Preview oder schneller Cycles Snapshot
- `viz/cameras.json` und `viz/render-presets.json`

Noch nicht:

- grosse AI-Image-Variant-Pipeline
- vollautomatisches Material-Scattering
- finale Wettbewerbsvisualisierung

### Kosmo Publish

Aufgabe:

- Lokales Export- und Reviewpaket.
- Freigabe-, Rechte- und Versionslogik vor jeder externen Publikation.

Minimaler MVP:

- `publish/review-pack.md`
- `publish/export-manifest.json`
- `publish/change-log.md`
- klare Liste: was darf intern bleiben, was ist public-safe, was ist ungeprueft

Noch nicht:

- automatisches Veroeffentlichen
- Website-Promotion ohne Gate
- R2 Uploads oder externe Kundenzustellung

### Kosmo Zentrale

Aufgabe:

- Home of KI `Kosmo`: Jobs, Memory, Approvals, Sessions, Control Hub.

Minimaler MVP:

- Projektpaket registrieren
- Jobs und Entscheidungen loggen
- Freigaben fuer riskante Schritte abfragen
- spaeter Anbindung an Android/macOS Control Center

Noch nicht:

- voll autonome Desktop-Steuerung im MVP-Kern
- unbeaufsichtigte Kosten-/Cloud-/Publish-Aktionen

## 6. Bestehende Projektquellen

| MVP-Bereich | Bestehende Quelle | Nutzen |
| --- | --- | --- |
| Kosmo Data | dieses Repo | Website, Datenmodell, Brain-Tools, Referenz-/Assetstrategie |
| Kosmo Zentrale | OneDrive `Architekturkosmos_Codex_Starter` | FastAPI Control Hub, Jobs, Approvals, Memory, Operator Mode |
| Kosmo Design / Kosmo Draw | privates lokales KosmoDraw-Projekt | Blender Add-on, Plan-Sketch-to-BIM, Action-Bus, AI/Voice, Kosmo Project Package Bridge |
| Kosmo Viz | ArchViz Toolkit / Blender-Claude | Cycles, ComfyUI/SDXL, Materialkatalog, Kamera-/Renderpipeline |
| Kosmo Workflow | Notion `AI (2)` | Phase-0/Phase-1 Pipeline, Toolkits, Innovationsliste |
| Blender Basis | Offizielle Blender APIs/Manuals | Python API, Geometry Nodes, Physics, Cycles/EEVEE, Asset Libraries |

## 7. Erste Datenvertraege

### `kosmo.project.json`

```json
{
  "schema_version": "0.1",
  "project_id": "kosmo-demo-001",
  "name": "Kosmo Demo Project",
  "created_at": "2026-05-25",
  "site": {
    "address": "",
    "latitude": null,
    "longitude": null,
    "north_rotation_degrees": 0
  },
  "modules": {
    "prepare": "pending",
    "data": "pending",
    "design": "pending",
    "draw": "pending",
    "viz": "pending",
    "publish": "pending"
  },
  "risk_level": "local_review_only"
}
```

### `brief/constraints.json`

```json
{
  "program": [],
  "site_boundaries": [],
  "building_law_constraints": [],
  "design_goals": [],
  "open_questions": [],
  "uncertainties": []
}
```

### `design/model-profile.json`

```json
{
  "units": "meters",
  "stories": [],
  "rooms": [],
  "walls": [],
  "areas": [],
  "collections": [],
  "source_confidence": "conceptual"
}
```

## 8. Review Gates

MVP 0.1 bleibt lokal und review-first.

Gates:

- Public Website Update: menschliche Freigabe.
- R2/D1/Cloud Upload: nicht im MVP.
- Externe E-Mail/Kundenversand: nicht im MVP.
- KI-generierte Referenz/Asset: immer als `generated` und `needs_review`.
- Recht/Baugesetz/Norm: immer als `advisory`, nicht als verbindlicher Nachweis.
- Kontextkandidaten aus DXF/IFC: erst nach `design/context-selection.json`
  als Designinput nutzbar.

## 9. MVP-Demo-Szenario

Ein gutes erstes Demo-Szenario:

1. Man legt ein Demo-Projektpaket an.
2. Man gibt Standort, grobes Raumprogramm und 3-5 Constraints ein.
3. Kosmo Prepare erzeugt Brief und Fragen.
4. Kosmo Data schlaegt 3-5 passende Referenzen oder Asset-Typen vor.
5. Kosmo Design erzeugt in Blender ein simples zweigeschossiges Raum-/Wandmodell.
6. Kosmo Draw erzeugt einen Grundriss und einen Schnitt.
7. Kosmo Viz setzt Kamera, Sonne und Preview.
8. Kosmo Publish erzeugt ein Review Pack mit Outputs, Unsicherheiten und naechsten Schritten.

## 10. Erste Umsetzungsschritte

Status 2026-05-25:

1. `kosmo.project.json` Schema und Beispielprojekt in diesem Repo definieren. **Erledigt.**
2. Minimalen lokalen Package-Checker bauen. **Erledigt.**
3. Lokalen Package-Creator bauen, der neue Projektpakete unter
   `archive-intake/kosmo-projects/` anlegt. **Erledigt.**
4. KosmosPrepare-Output in ein Kosmo-Projektpaket importieren.
   **Initialer Adapter erledigt.**
5. Bestehendes `kosmo_design` Add-on auf dieses Paket lesen/schreiben lassen.
   **Phase-0-Kontextimport, Raum-Import und Write-back erledigt.**
6. Review-Pack-Generator lokal bauen. **Erledigt.**
7. Einfachen Planexport aus Blender pruefen. **Erledigt fuer SVG-Grundriss und SVG-Schnitt.**
8. Kosmo Viz Preview aus Blender pruefen. **Erledigt fuer automatischen Axon-PNG-Preview.**
9. Persistenten Prepare-Kontextreport schreiben. **Erledigt mit `design/context-import.generated.json`.**
10. Review-pflichtige Kontextkandidaten aus Prepare/DXF/IFC erzeugen.
    **Erledigt mit `design/context-candidates.generated.json`.**
11. Kontextkandidaten in ein menschliches Auswahl-Gate ueberfuehren.
    **Erledigt mit `design/context-selection.json` und `npm run kosmo:context-selection`.**
12. Eine Entscheidungsmatrix fuer Kontextkandidaten erzeugen.
    **Erledigt mit `design/context-decision-matrix.generated.*` und `npm run kosmo:context-matrix`.**
13. Kosmo Zentrale spaeter als Job-Orchestrator an dieses Paket anbinden.

## 11. Was bewusst noch nicht gebaut wird

- vollstaendiges Architektur-CAD
- Blender-Fork
- Live-Cloud-Backend fuer private Projektdaten
- automatisches Publizieren
- automatisches Reverse Engineering proprietaerer CADs
- zertifizierte Statik/Bauphysik/Tageslicht-/Energie-Nachweise
- kommerzieller Installer
- Multi-Office-Collaboration

## 12. Erfolgskriterium

MVP 0.1 ist erfolgreich, wenn ein Architekt sagen kann:

> Ich gebe Kosmo ein Projekt, einen Ort und eine Idee. Kosmo baut daraus lokal ein erstes strukturiertes Projektgedaechtnis, ein editierbares Blender-Modell, einen einfachen Planexport und ein Review-Paket, ohne meine Daten unkontrolliert nach aussen zu geben.

## 13. Angelegte Vertragsdateien

Der erste Datenvertrag ist im Repo angelegt:

- `schema/kosmo-project-package.schema.json`
- `examples/kosmo-projects/kosmo-demo-001/kosmo.project.json`
- `examples/kosmo-projects/kosmo-demo-001/`
- `scripts/kosmo-project-package-check.mjs`
- `scripts/kosmo-project-package-create.mjs`
- `scripts/kosmo-prepare-package-import.mjs`
- `scripts/kosmo-context-selection-create.mjs`
- `scripts/kosmo-context-decision-matrix-create.mjs`
- `scripts/kosmo-context-review.mjs`
- `scripts/kosmo-context-guard.mjs`
- `scripts/kosmo-blender-package-bridge-smoke.mjs`
- `scripts/kosmo_blender_package_bridge_smoke.py`
- private lokale KosmoDesign/KosmoDraw-Bridge im separaten Arbeitsbereich

Pruefung:

```bash
npm run kosmo:package-check
```

Blender-Headless-Smoke-Test:

```bash
npm run kosmo:blender-package-smoke
```

Status: bestanden. Blender 5.1.2 importiert das Demo-Paket in `KosmoDraw`,
erzeugt einen minimalen Projektkontext plus 3 Raeume und 12 Raumobjekte,
exportiert 3 Raeume nach
`design/model-profile.exported.json`, erzeugt `draw/exports/ground-floor-plan.svg`
und `draw/exports/section-a.svg` aus den Blender-Raumobjekten, rendert
`viz/previews/kosmo-preview-axon.png` mit automatisch erzeugter Kamera und Licht
und laeuft headless durch.

KosmosPrepare-Phase-0-Smoke-Test:

```bash
npm run kosmo:blender-package-smoke -- \
  --project archive-intake/kosmo-projects/zg-07052026/kosmo.project.json \
  --expected-rooms 0 \
  --expect-context \
  --output-blend archive-intake/kosmo-projects/zg-07052026-context-smoke.blend
```

Status: bestanden. Das Prepare-only-Paket erzeugt in Blender 5 Kontextobjekte
fuer Origin, Perimeter, DXF-Underlay, IFC-Bounds und Label. Es erzeugt noch
keine Raeume; das ist korrekt, weil die Quelle eine Grundlage/Skizze und noch
kein Designmodell ist. KosmoDraw schreibt dazu
`design/context-import.generated.json` als persistenten Report. Dieser Report
enthaelt jetzt auch eine erste Heuristik: DXF-Layer `Schwarzplan_Gebaeude` als
`existing_building`, IFC als `semantic_ifc_context` und die Readiness
`context_ready_needs_human_layer_review`.

KosmoDraw schreibt dazu auch `design/context-candidates.generated.json`. Beim
ZG-Testpaket enthaelt diese Datei 9 Kandidaten fuer Ursprung, Perimeter,
DXF-Layerrollen und IFC-Rollen. Alle bleiben review-pflichtig und duerfen erst
nach menschlicher Layer-/Quellenfreigabe als Designinput verwendet werden.

Kontextauswahl erzeugen:

```bash
npm run kosmo:context-selection -- --project archive-intake/kosmo-projects/zg-07052026
```

Status: bestanden. Im ZG-Testpaket erzeugt der Befehl
`design/context-selection.json` mit 9 `undecided` Entscheidungen und
`approved_for_design_generation: false`. Das ist der bewusste Stopp vor jeder
automatischen Design-Generierung.

Entscheidungsmatrix erzeugen:

```bash
npm run kosmo:context-matrix -- --project archive-intake/kosmo-projects/zg-07052026
```

Status: bestanden. Im ZG-Testpaket empfiehlt die Matrix 6 Kandidaten als
`accepted_as_context`, 2 als `needs_more_source_review`, 1 als `rejected` und
0 als `accepted_as_design_seed`. Die Matrix ist advisory; sie veraendert die
menschliche Selection nicht.

Entscheidungen koennen spaeter gezielt gesetzt werden, ohne die ganze Datei
manuell zu editieren:

```bash
npm run kosmo:context-selection -- --project archive-intake/kosmo-projects/zg-07052026 \
  --decision context-origin=accepted_as_context \
  --decision context-perimeter=needs_more_source_review \
  --reviewed-by "Local Reviewer"
```

`--approve-design-generation` bleibt der separate letzte Gate-Schalter und ist
nur sinnvoll, wenn keine Kandidaten mehr `undecided` oder
`needs_more_source_review` sind.

Kleine Review-Uebersicht erzeugen:

```bash
npm run kosmo:context-review -- --project archive-intake/kosmo-projects/zg-07052026
```

Dieser Befehl schreibt `design/context-review.md/json`, aktualisiert bei Bedarf
Selection und Matrix und gibt pro Kandidat die naechste sichere Entscheidung
als Command aus. Damit kann das Brain Vorschlaege vorbereiten, ohne selbst
Design-Freigaben zu setzen.

Guard fuer Downstream-Design-Tools:

```bash
npm run kosmo:context-guard -- --project archive-intake/kosmo-projects/zg-07052026 --require-approved-design-seed
```

Dieser Befehl bricht ab, solange kein menschlich freigegebener Design-Seed
existiert. Ohne `--require-approved-design-seed` meldet er einen sicheren
Referenzzustand, blockiert aber implizit automatische Designnutzung.

Review-Pack erzeugen:

```bash
npm run kosmo:package-review -- --project examples/kosmo-projects/kosmo-demo-001
```

Neues lokales Projektpaket anlegen:

```bash
npm run kosmo:package-create -- --name "Test Atelier" --address "Zurich" --program "Studio:48, Library:18"
```

KosmosPrepare-Output importieren:

```bash
npm run kosmo:prepare-import -- --input "/path/to/KosmosPrepare/03_Output/PROJECT" --slug "project-slug"
```

Der Creator schreibt standardmaessig nach `archive-intake/kosmo-projects/`.
Dieser Ordner ist gitignored und bleibt fuer echte Projekte, private Notizen
und unreviewte Inputs lokal.

Aktueller Status: Der Demo-Vertrag und alle JSON/JSONL-Artefakte bestehen den lokalen Package-Check. Der KosmosPrepare-Importer erzeugt aus einem Phase-0-Output ein lokales review-only Projektpaket. Der Blender-Bridge-Smoke-Test prueft jetzt Prepare-Kontextimport, Kontextkandidaten, Raum-Import, Write-back, Kosmo-Draw-SVG-Export und Kosmo-Viz-Preview. Das neue Context-Selection-Gate und die Decision-Matrix machen explizit sichtbar, dass erkannte DXF/IFC-Rollen noch nicht automatisch Design-Fakten sind.
