# Kosmo Source Of Truth Map

Stand: 2026-05-25  
Zweck: Einordnung der gefundenen lokalen Projekte in Quelle der Wahrheit,
aktive Werkbank, Experiment oder Archiv.

## 1. Kurzfazit

Architektur Kosmos liegt nicht in einem einzigen Repo. Die sinnvolle Ordnung ist:

- **Dieses Repo** ist die kanonische Public-/KosmoData-Schicht und der Ort fuer
  gemeinsame Datenvertraege wie das Kosmo-Projektpaket.
- **KosmoDraw** ist die aktive Blender-Werkbank fuer Kosmo Design, Kosmo Draw
  und den ersten Kosmo Viz Proof.
- **Kosmo Zentrale** ist die Control-Hub- und HomeStation-Schicht fuer Jobs,
  Approvals, Operator Mode, Android/macOS und lokale Orchestrierung.
- **KosmosPrepare** ist die Phase-0-Werkbank fuer Wettbewerb, Standort,
  Baugesetz, GIS/Blaupause, Dossier und Grundlagenmodell.
- **KosmoPublish** ist die reife Abgabe-/Plan-/Poster-Pipeline und sollte nicht
  neu erfunden, sondern an das Kosmo-Projektpaket angebunden werden.
- **Claude to Blender / AI Architektur Workflow** ist die wichtigste
  Legacy-/Research-Quelle fuer ArchViz, Pipeline V7, BlenderMCP und
  AI-Rendering-Ideen.
- **Recht** ist die Arbeitsablage fuer IP, Marke, Blender/GPL, Startup und
  Compliance. Sie ist wichtig, aber kein Rechtsgutachten.

## 2. Kanonische Ebenen

| Ebene | Quelle der Wahrheit | Aktive Rolle | Bemerkung |
| --- | --- | --- | --- |
| Produktname / Modulnamen | `docs/architektur-kosmos-network-concept.md` + Konzeptbild | Architektur Kosmos, Kosmo, Kosmo Data, Kosmo Orbit, Kosmo Zentrale, Kosmo Design, Kosmo Prepare, Kosmo Draw, Kosmo Viz, Kosmo Publish | Historische Ordnernamen duerfen abweichen, z.B. `KosmosPrepare`. |
| Public Data / KosmoData | `<repo_architecture_cosmos>` | Website, Atlas, Brain-Tools, Rechte-/Quellenlogik, KosmoData-Pipelines | Static export bleibt harte Grenze. |
| Gemeinsamer Datenvertrag | `schema/kosmo-project-package.schema.json` + `examples/kosmo-projects/kosmo-demo-001` | Lokales Projektpaket fuer alle Module | Aktuell bester Integrationsanker zwischen Repos. |
| Kosmo Design / Draw / Viz Proof | `<local_projects>/KosmoDraw` + dieses Repo | Blender-Add-on `kosmo_design`, Package Import, Kontextkandidaten, Decision Matrix, Context Review, Context Selection, Write-back, SVG Draw Export, PNG Viz Preview | KosmoDraw ist aktive Werkbank; dieses Repo haelt den Gate-/Package-Vertrag. |
| Kosmo Prepare / Phase 0 | `<ai_workflow>/KosmosPrepare/01_Source_Code` | Wettbewerbsvorbereitung, NodeTree, Importer, Standort/GIS/Baugesetz/Dossier/ArchiCAD-Export | Muss in das Kosmo-Projektpaket schreiben koennen. |
| Kosmo Publish | `<ai_workflow>/KosmoPublish` | Wettbewerbsplakate, SIA-Linien, Hatches, Storeys, IFC, Layout, PDF-Set | Reife Pipeline; sollte als Publish-Backend genutzt werden. |
| Kosmo Zentrale | `<ai_workflow>/00 Architekturkosmos Zentrale/Architekturkosmos_Codex_Starter` | FastAPI Control Hub, Android/macOS, Jobs, Approvals, Artifacts, Memory, Operator Mode | Orchestrator, nicht CAD-Kern. |
| ArchViz Legacy / Research | `<ai_workflow>/Claude to Blender/Ai Architektur Workflow` | Pipeline V7, ArchViz, ComfyUI, BlenderMCP, Render-/AI-Varianten | Ideenmine und Migrationsquelle. |
| Recht / Startup | `<ai_workflow>/Recht` + Zentrale-PDFs | IP, Marke, Blender/GPL, Patente, Templates, Business | Strategisch wichtig, vor externen Schritten juristisch pruefen. |

## 3. Was aktiv ist

### Architektur Cosmos / KosmoData

Aktiv fuer:

- public Website und Atlas
- Datenmodell, Rechte-/Quellenstatus, Brain-Tools
- KosmoData-Enrichment und Recherche-Pipelines
- Kosmo-Projektpaket als erster repo-uebergreifender Vertrag

Nicht hier hinein gehoert:

- serverseitige Runtime fuer private Projektdaten
- R2/D1-Schreibpfade ohne expliziten Auftrag
- Blender Add-on-Quellcode als primaerer Entwicklungsort

### KosmoDraw

Aktiv fuer:

- `ar_bridge` als AR/WebXR/Action-Bus-Schicht
- `kosmo_design` als Plan-Sketch-to-BIM und Entwurfswerkbank
- ArchiCAD-aehnliche UX: Tracker, Constraints, Snaps, Story Stack
- AI/Voice/Freehand/Outline-Edit
- Kosmo-Projektpaket-Bridge: Import, Write-back, Draw-SVGs, Viz-Preview
- Phase-0-Kontextreports und review-pflichtige Kontextkandidaten aus
  Prepare/DXF/IFC
- `design/context-decision-matrix.generated.*` als Empfehlungsschicht
- `design/context-review.*` als kompakte Owner-Review mit Vorschlagscommands
- `design/context-selection.json` als menschliches Gate vor Design-Seeds
- `kosmo:context-guard` als Downstream-Stopp vor ungepruefter Designnutzung

Risiko:

- Kein Git-Repo gefunden. Aenderungen sind aktuell schwer nachvollziehbar.

Empfehlung:

- KosmoDraw zeitnah versionieren oder in eine klare lokale Backup-/Patch-Strategie
  aufnehmen.

### KosmosPrepare

Aktiv fuer Phase 0:

- Wettbewerbs-PDF / Atelierblaupause / Ortsdaten
- DXF, CityGML, XYZ, LiDAR, Mapillary, Orthofoto
- Baugesetz, BZO-Volumen, Standortanalyse, Dossier
- IFC/DXF/ArchiCAD-Grundlage

Integrationsziel:

- Output nicht nur in eigenen Ordnern speichern, sondern mindestens ein
  `kosmo.project.json` plus `brief/`, `data/`, `design/model-profile.json`,
  `memory/` erzeugen oder befuellen.

### KosmoPublish

Aktiv und reif fuer:

- IFC-/Mesh-Klassifikation
- Storey Detection
- SIA-Linien, Hatches, Wandverschneidung, Symbole, Raumbeschriftung
- Grundriss/Schnitt/Fassade/Axo-SVGs
- A0-Poster-Composer, Cover, PDF-Set, YAML-Content-Config
- ArchViz-Image-Slots und Layout-Critique-Ideen

Integrationsziel:

- KosmoPublish soll nicht durch unseren simplen SVG-Smoke-Test ersetzt werden.
  Der Smoke-Test beweist nur den kleinen MVP-Kreis. Fuer ernsthafte Plaene,
  Plakate und Abgabequalitaet ist KosmoPublish die Quelle.

### Kosmo Zentrale

Aktiv fuer:

- Job Queue
- Approval Gates
- Agent Router
- Android/macOS Control Centers
- Artifacts, Logs, Memory
- lokale HomeStation-Strategie

Integrationsziel:

- Kosmo Zentrale soll Projektpakete registrieren und Jobs starten:
  `prepare`, `design-import`, `draw-export`, `viz-preview`, `publish-review`.

## 4. Was Archiv oder Ideenmine ist

| Quelle | Rolle |
| --- | --- |
| `Architecture Cosmos Backups` | Recovery/Archiv, nicht aktuelle Wahrheit |
| `Claude to Blender/Ai Architektur Workflow/_DEV/04_Research/*` | Research-Repos fuer BlenderMCP, StableGen, Dream Textures, ArchViz |
| Claude local memories | Kontext-Hinweise, keine kanonische Dokumentation |
| Cloud-PDFs | Vision/Business/Legal-Grundlage, aber bei Widerspruch in aktuelle Markdown-Kanonik ueberfuehren |
| `<local_projects>/KosmoCAD` | leerer Name/Platzhalter, keine aktive Substanz |

## 5. Konsequenz fuer den MVP

Der MVP sollte nicht mehrere Systeme parallel neu bauen. Die sauberste Kette ist:

```text
KosmosPrepare
  -> kosmo.project.json / brief / data / design seed
KosmoDraw
  -> Blender Import / Kontextkandidaten / Decision Matrix / Context Review / Context Selection / editierbares Modell / schnelle Draw+Viz Proofs
KosmoPublish
  -> hochwertige Pläne / Poster / PDF-Abgabe
Kosmo Zentrale
  -> Jobs / Approvals / Memory / Artifacts / Android+macOS Kontrolle
KosmoData
  -> Referenzen / Assets / Rechte / öffentliche Wissensschicht
```

## 6. Naechste Integrationsschritte

1. **KosmosPrepare -> Kosmo Package Adapter**  
   Kleiner Exporter, der aus einem `KosmosPrepare/03_Output/<projekt>` ein
   Kosmo-Projektpaket oder Paket-Update erzeugt. **Initial umgesetzt** mit:
   `npm run kosmo:prepare-import -- --input "<KosmosPrepare output>" --slug "<projekt-slug>"`.

2. **KosmoDraw Package Bridge haerten**  
   Bereits laufend: Phase-0-Kontextimport, Raum-Import, Write-back, Draw-SVG
   und Viz-Preview. Initial liest KosmoDraw jetzt Origin, Perimeter, DXF als
   sichtbares Underlay und IFC als Bounds-/Quellenanalyse und schreibt
   `design/context-import.generated.json` als persistenten Report. Zusaetzlich
   entsteht `design/context-candidates.generated.json` als Kandidatenliste fuer
   Ursprung, Perimeter, DXF-Layerrollen und IFC-Rollen. Initial umgesetzt sind
   auch `design/context-decision-matrix.generated.*` als Empfehlungsschicht,
   `design/context-review.*` als Owner-Review und
   `design/context-selection.json` als menschliches Gate. Naechster Schritt:
   diese Auswahl in ein kleines Layer-Mapping UI und spaeter freigegebene
   Design-Seeds ueberfuehren.

3. **KosmoPublish Package Adapter**  
   KosmoPublish soll `kosmo.project.json`, `design/model-profile.exported.json`
   und vorhandene Blender-/SVG-/PNG-Artefakte lesen und daraus ein
   `publish/`-Review- oder Poster-Set bauen.

4. **Kosmo Zentrale Job-Registry**  
   In der Zentrale Jobs definieren, die genau diese Paketschritte starten und
   ihre Resultate als Artifacts registrieren.

5. **Repo-/Backup-Disziplin**  
   KosmoDraw und KosmoPublish sollten nicht dauerhaft nur lose Ordner sein,
   wenn sie aktive Produktteile bleiben.

## 7. Offene Entscheidungen

- Wird `KosmoCAD` als Produktname weitergefuehrt oder zugunsten von
  `Kosmo Design`/`Kosmo Draw` gestrichen?
- Soll `KosmosPrepare` offiziell in `Kosmo Prepare` umbenannt werden oder bleibt
  der Ordnername historisch?
- Wird KosmoPublish GPL-3.0-or-later kompatibel in die Architektur-Kosmos-Strategie
  eingebunden, oder als separates internes Tool gefuehrt?
- Welche PDF-/Business-Dokumente aus der Cloud-Ablage muessen in Markdown-Kanonik
  ueberfuehrt werden?
- Wo wird die HomeStation-Produktgrenze rechtlich sauber gezogen:
  Blender Add-ons, Kosmo Core, Dienstleistung, Appliance oder alles kombiniert?
