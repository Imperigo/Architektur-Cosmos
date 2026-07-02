# KosmoOrbit V1 — Tech-Radar (verifiziert 2026-07-02)

Adversarial verifizierte Open-Source-Abkürzungen (4 parallele Research-Agenten, npm/GitHub live geprüft).
Lizenz-Politik: MIT/Apache/BSD/ISC/MPL-2.0/BSL-1.0 = bündelbar · LGPL = Grenzfall · GPL/AGPL = nur als separater Prozess (HomeStation) oder gar nicht.

## Geometrie & BIM-Kern

| Baustein | Entscheid | Paket | Lizenz | Begründung |
|---|---|---|---|---|
| 3D-Boolean | **ADOPT** | `manifold-3d` 3.5.x | Apache-2.0 | garantiert-manifolde Ausgabe; three-bvh-csg selbst-deklariert experimentell |
| 2D-Boolean/Offset | **ADOPT** | `clipper2-ts` (Hot-Paths später `clipper2-wasm`) | BSL-1.0 | nativ int64 → passt exakt zu mm-Integer-Koordinaten; kann Offsets (Wanddicken!) |
| Triangulation | **ADOPT** | `earcut` 3.x | ISC | aktiv (Mapbox), Löcher-Support |
| Straight Skeleton (Walmdach) | **SELBST BAUEN** | — | — | ⚠️ Lizenzfalle: `straight-skeleton` v2/v3 wrappt CGAL (GPL!). Eigene TS-Implementierung (Felkel-Stil) auf int-mm |
| IFC I/O | **ADOPT** | `web-ifc` 0.0.77 | MPL-2.0 | einziger realer Browser-IFC4-Read/Write; eigener High-Level-Author-Layer nötig; ifcopenshell-WASM (LGPL/Pyodide) nur als CI-Orakel |
| ThatOpen clay | PATTERN-ONLY | — | MIT | seit Okt 2024 schlafend, nie publiziert — Kernel bleibt Eigenbau |
| Web-CAD-Kerne | REJECT | chili3d (AGPL!), CADmium (tot), opencascade.js (LGPL/30MB) | — | kein adoptierbarer Kernel existiert → Eigenbau bestätigt |
| Constraint-Solver | PATTERN-ONLY | JSketcher (MIT) | MIT | Referenz für 2D-Sketch-Constraints |

## Viewport & Darstellung

| Baustein | Entscheid | Paket | Lizenz |
|---|---|---|---|
| Kamera | **ADOPT** | `camera-controls` 3.x | MIT |
| Picking/Spatial | **ADOPT** | `three-mesh-bvh` | MIT |
| Kanten-Projektion (2D aus 3D) | **ADOPT** | `three-edge-projection` (GitHub-Install) | MIT |
| Schnittebenen | ADOPT/PATTERN | `@thatopen/components` Clipper/ClipEdges | MIT |
| Renderview (Pathtracing) | **ADOPT** | `three-gpu-pathtracer` 0.0.24 | MIT (0.x pinnen) |
| Sonnenstand/Schatten | **ADOPT** | `suncalc` 2.0 (2026 revived) | BSD-2 |

## 2D-Ausgabe

| Baustein | Entscheid | Paket | Lizenz |
|---|---|---|---|
| DXF schreiben | **ADOPT** | `@tarikjabiri/dxf` (Version pinnen, vendor-bereit) | MIT |
| DXF lesen | **ADOPT** | `dxf` (skymakerolof) | MIT |
| PDF (Vektor, A0–A4) | **ADOPT** | `jspdf` + `svg2pdf.js` | MIT |
| PDF-Nachbearbeitung | bei Bedarf | `@cantoo/pdf-lib` (gepflegter Fork) | MIT |

## App-Plattform & UI

| Baustein | Entscheid | Paket | Lizenz |
|---|---|---|---|
| Docking/Splitscreen | **ADOPT** | `dockview-react` 7.x | MIT | touch-fähig, Layout-Serialisierung; Major pinnen (schnelle Kadenz) |
| Command-Palette | **ADOPT** | `cmdk` 1.1.x | MIT |
| State | **ADOPT** | `zustand` 5.x (Entity-Store ausserhalb React, transient subscribe für three.js) | MIT |
| Undo | **SELBST** (Command-Stack mit Patch-Inversen) | zundo nur als API-Pattern | — |
| Node-Graph (Vis-Composer) | **ADOPT** | `@xyflow/react` 12.x | MIT (Pro = nur Funding) |
| Pencil-Strokes | **ADOPT** | `perfect-freehand` 1.2.x | MIT (von tldraw-Relicensing NICHT betroffen) |
| Kurven-Fitting | VENDOR | fit-curve (Schneider-Algorithmus) als eigene TS-Datei | MIT |
| Gesten ($Q) | SELBST (~200 LOC nach New-BSD-Referenz) | — | — |
| Zip (.kosmo) | **ADOPT** | `fflate` 0.8.x | MIT | zip.js nur falls Zip64/Verschlüsselung nötig |

## Sync

| Baustein | Entscheid | Paket | Lizenz |
|---|---|---|---|
| CRDT | **ADOPT** | `yjs` 13.x (Y.Map-von-Y.Maps = Entity-Store) + `y-indexeddb` | MIT | hinter eigenem Adapter isolieren (Loro = Kandidat ~2027) |
| Sync-Server | **ADOPT** | Hocuspocus 4.3 + `@hocuspocus/extension-sqlite` | MIT | 1 Node-Prozess + 1 SQLite auf der HomeStation |

## KI-Schicht

| Baustein | Entscheid | Paket/Modell | Lizenz |
|---|---|---|---|
| LLM-Client | **ADOPT** | `ollama` (ollama-js, offiziell) | MIT |
| Empfohlene Modelle (5090/32GB) | — | `qwen3-coder:30b` (Tools), `qwen3:32b` (Chat); Qwen3.5-A3B beobachten | Apache-2.0 |
| Tool-Call-Robustheit | **ADOPT** | Ollama structured outputs (format=JSON-Schema) + `jsonrepair` + zod-Fehler-Feedback-Retry | ISC |
| STT Schweizerdeutsch | **ADOPT** | faster-whisper + `jayr23/whisper-large-v3-turbo-swiss-german-ct2` (HF); Fallback plain large-v3 | — | ⚠️ ehrliche WER ~25% laut arXiv 2606.07608 — Erwartung setzen |
| STT Browser-Fallback | degraded | transformers.js whisper-turbo (nur Hochdeutsch) | Apache |
| TTS | **ADOPT** | Chatterbox Multilingual (MIT, DE, Voice-Cloning) via Server auf 5090; Piper (GPL-Fork) nur als separater Prozess | MIT |
| VAD/Push-to-Talk | **ADOPT** | `@ricky0123/vad-web` (Silero v5) | MIT |
| Embeddings (RAG) | **ADOPT** | `bge-m3` via Ollama; Browser-Fallback multilingual-e5-small | MIT |
| LoRA-Trainings-Rezepte | — | Unsloth (Apache-Core; läuft eh als Owner-Prozess); Alternative LLaMA-Factory | Apache |
| Persona-Framework | SELBST | OpenJarvis (Apache, Python) nur als Architektur-Pattern (Trace-Learning-Loop → Feedback-Journal) | — |
| LLM→CAD-Brücke | PATTERN | blender-mcp: kleines kuratiertes Toolset + Szenen-Inspektion + Screenshot-Feedback + gated Code-Escape | MIT |

## Test/CI

- Playwright 1.61 + `channel:'chromium'` + Flags `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader` (NICHT --disable-gpu), `deviceScaleFactor:1`, RAF einfrieren + `window.__renderOnce()`-Hook, `maxDiffPixelRatio:0.01`, Baselines nur aus CI-Umgebung.

## Offen (Reports ausstehend)

- Tauri-2-iOS-Reife, iPadOS-PWA-Fähigkeiten (OPFS, Pencil-Pressure, Mikrofon), SQLite (tauri-plugin-sql vs. wa-sqlite/OPFS), MSAL/OneDrive in Tauri — Nachtrag folgt.
- ArchiCAD/Vorform/Finch-Feature-Checklisten + Bonsai-Drawing-Patterns — Nachtrag folgt.
