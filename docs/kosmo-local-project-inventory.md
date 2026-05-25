# Kosmo Local Project Inventory

Stand: 2026-05-25  
Zweck: Lokale Projektkarte fuer Codex/Claude-Sessions. Diese Datei haelt fest,
dass Architektur Kosmos nicht nur in OneDrive und nicht nur im aktuellen Repo
liegt.

## 1. Suchumfang

Durchsucht wurden lokal. Aus Sicherheitsgruenden sind die Pfade hier nur als
Aliase dokumentiert:

- `<home>/Documents`
- `<home>/Documents/Claude`
- `<home>/Library/CloudStorage`
- relevante Treffer unter `<home>/Library/Application Support/Claude`
- ausgewaehlte Projekt-/Tooling-Treffer unter `<home>`

Genutzte Suchmuster:

- `Kosmo`
- `Architekturkosmos`
- `Architecture Cosmos`
- `KosmoDraw`
- `KosmoData`
- `KosmoPublish`
- `KosmosPrepare`
- `KosmoZentrale`
- `Blender-Claude`
- `Claude to Blender`

Nicht als Kosmo-Projekt zaehlen False Positives wie Python-Pakete
`transformers/models/kosmos2` in ComfyUI.

## 2. Primaere Arbeitsorte

| Bereich | Pfad | Rolle | Status |
| --- | --- | --- | --- |
| Architecture Cosmos / Kosmo Data / Public Site | `<repo_architecture_cosmos>` | Aktives Next.js/Cloudflare-Static-Export-Repo, KosmoData, Brain-Tools, MVP-Paketvertrag, aktuelle Codex-Arbeit | Git-Repo, ca. 1.1 GB |
| KosmoDraw / Kosmo Design | `<local_projects>/KosmoDraw` | Aktives lokales Blender-Projekt fuer `kosmo_design`, `ar_bridge`, WebXR Client, Plan-Sketch-to-BIM, AI/Voice, Package Bridge | kein Git-Repo gefunden, ca. 66 MB |
| KosmoCAD | `<local_projects>/KosmoCAD` | Lokaler Projektordner/Name fuer CAD-Idee | gefunden, aktuell leer/0 B |
| Kosmo Zentrale / Control Hub | `<ai_workflow>/00 Architekturkosmos Zentrale/Architekturkosmos_Codex_Starter` | FastAPI Control Hub, Android App, macOS Control Center, Operator Mode, Jobs, Approvals, Artifacts, Memory | Git-Repo, ca. 977 MB |
| KosmosPrepare / Wettbewerbsvorbereitung | `<ai_workflow>/KosmosPrepare` | Blender NodeTree/Add-on fuer Wettbewerbsvorbereitung: Atelierblaupause, DXF, CityGML, XYZ, LiDAR, Mapillary, Baugesetz, Dossier, ArchiCAD/IFC/DXF-Export | `01_Source_Code` ist Git-Repo, ca. 470 MB |
| KosmoPublish | `<ai_workflow>/KosmoPublish` | Publikations-/Layout-/Abgabe-Pipeline mit `config`, `core`, `layout`, `nodes`, `tests`, `ui`, Outputs und Strategie-Dokus | kein Git-Repo gefunden, ca. 1.2 GB |
| Claude to Blender / AI Architektur Workflow | `<ai_workflow>/Claude to Blender/Ai Architektur Workflow` | Aeltere/grundlegende AR-Blender-ArchViz-Pipeline, V7-Konzept, BlenderMCP, Benutzerhandbuch, Research und Strategie | Git-Repo, ca. 906 MB |

## 3. Wichtige Nebenquellen

| Quelle | Pfad | Bedeutung |
| --- | --- | --- |
| Architekturkosmos Zentrale PDFs | `.../11 AI Workflow/00 Architekturkosmos Zentrale` | Vision, Businessplan, AI-Workflow-Pipeline, Startup-/Patentstrategie, HomeStation-Bauanleitung |
| ArchitekturKosmos Konzeptbild | `.../11 AI Workflow/ArchitekturKosmos Konzept.png` | Visuelle Systemgrafik mit Modulnamen Architektur Kosmos, Kosmo Data, Kosmo Orbit, Kosmo Zentrale, Kosmo Design, Kosmo Prepare, Kosmo Draw, Kosmo Viz, Kosmo Publish |
| Recht / IP / Startup | `.../11 AI Workflow/Recht` | Legal Roadmaps, Marken-Vorrecherche, GPL/Blender-Memo, Patentideen P1-P5, Templates fuer NDA, Datenschutz, AI Act, GmbH usw. |
| Architecture Cosmos Backups | `.../11 AI Workflow/Architecture Cosmos Backups` | Backups/Snapshots des Website-/Data-Projekts; nur als Recovery-Quelle, nicht als aktive Wahrheit nutzen |
| Claude Scheduled Skills | `<home>/Documents/Claude/Scheduled` | Wiederkehrende Skills: Legal Monthly/Quarterly, Pilot Prep, ArchViz Innovation Research |
| Claude Local Memories | `<home>/Library/Application Support/Claude/local-agent-mode-sessions/.../memory` | Kontext-Snapshots zu KosmoDraw, Architekturkosmos, KosmoPublish, GPL-Entscheidungen; nur Hinweisquelle, keine kanonische Projektquelle |
| Lokales Tooling | `<home>/.architekturkosmos-tools` | Lokale Tools wie Ollama und Gradle fuer Architekturkosmos-Toolchain |
| Android AVD | `<home>/.android/avd/Architekturkosmos_API36.avd` | Emulator fuer Architekturkosmos-Android-App |

## 4. Gefundene Git-Repos

- `<repo_architecture_cosmos>`
- `<ai_workflow>/00 Architekturkosmos Zentrale/Architekturkosmos_Codex_Starter`
- `<ai_workflow>/Claude to Blender/Ai Architektur Workflow`
- `<ai_workflow>/Claude to Blender/Ai Architektur Workflow/_DEV/04_Research/ai_render`
- `<ai_workflow>/Claude to Blender/Ai Architektur Workflow/_DEV/04_Research/blendermcp`
- `<ai_workflow>/Claude to Blender/Ai Architektur Workflow/_DEV/04_Research/dream_textures`
- `<ai_workflow>/Claude to Blender/Ai Architektur Workflow/_DEV/04_Research/ph_archviz`
- `<ai_workflow>/Claude to Blender/Ai Architektur Workflow/_DEV/04_Research/stablegen`
- `<ai_workflow>/KosmosPrepare/01_Source_Code`

## 5. Arbeitsregel fuer kuenftige Sessions

Wenn es um Architektur Kosmos geht, nicht nur im aktuellen Repo suchen.
Vor Architektur-/MVP-Entscheidungen zuerst diese Quellen beruecksichtigen:

1. Aktuelles Public-/KosmoData-Repo in `<repo_architecture_cosmos>`.
2. KosmoDraw in `<local_projects>/KosmoDraw`.
3. Kosmo Zentrale in `<ai_workflow>/00 Architekturkosmos Zentrale/Architekturkosmos_Codex_Starter`.
4. KosmosPrepare in `<ai_workflow>/KosmosPrepare`.
5. KosmoPublish in `<ai_workflow>/KosmoPublish`.
6. Aeltere Pipeline-Grundlagen in `<ai_workflow>/Claude to Blender/Ai Architektur Workflow`.
7. Rechtliche Strategie in `<ai_workflow>/Recht`.

Backups, Claude-Memory-Dateien und Build-Artefakte nur als Kontext oder Recovery
verwenden, nicht als aktuelle Quelle der Wahrheit.

## 6. Offene Klaerungen

- Was soll mit dem leeren Ordner `<local_projects>/KosmoCAD` passieren:
  eigener Produktname, Umbrella fuer Kosmo Design/Draw oder archivieren?
- Soll `KosmoPublish` in ein eigenes Git-Repo ueberfuehrt werden?
- Soll `KosmoDraw` ebenfalls versioniert werden, damit Codex/Claude-Aenderungen
  besser nachvollziehbar sind?
- Welche OneDrive-PDFs sollen als kanonische Vision gelten: `Architecture_Cosmos_Vision_Document.pdf`,
  `Architekturkosmos_AI_Workflow_Pipeline_Projekt_Dokument.pdf`,
  `Architekturkosmos_Businessplan_Praesentation.pdf` oder die neuere
  Architektur-Kosmos-Netzwerkgrafik?
