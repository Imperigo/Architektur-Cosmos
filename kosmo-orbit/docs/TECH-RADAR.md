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
- ~~ArchiCAD/Vorform/Finch-Feature-Checklisten~~ ✅ erledigt: `RE-FINCH.md`, `RE-VORFORM.md` (Blöcke F1–F10/V1–V8 gebaut, ROADMAP 49–74) und `RE-ARCHICAD.md` (Feature-Abgleich AC27/28, Lücken A1–A8). Offen bleibt nur: Bonsai-Drawing-Patterns — Nachtrag folgt.

## Nachtrag 2026-07-02 (Owner-Hinweis)

| Baustein | Entscheid | Quelle | Lizenz |
|---|---|---|---|
| LingBot-Map (Robbyant) | **ADOPT (HomeStation)** — Streaming-3D-Rekonstruktion ~20 FPS, 10k+ Frames, ersetzt/ergänzt VGGT-Stufe der Splat-Kette (Handyvideo → Splats live). Für KosmoPrepare-Bestandsaufnahme; App-Seite: Splat-Viewer als Kontext-Layer im Viewport (eigener Block). | github.com/robbyant/lingbot-map | Apache-2.0 |
| LingBot-World | WATCH — interaktives Weltmodell, kein V1-Bedarf | — | offen |

## Nachtrag 2026-07-04 — Blender-Fork-Entscheid (Owner-Frage, V1-Finish)

**Blender-Fork als Grundlage: HOLD (nie).** Vier Gründe: (1) **GPL** — ein Fork
zwingt die gesamte Software unter GPL; KosmoOrbit wäre als Büro-Software nicht
mehr frei verwertbar. (2) **Architektur** — der Wert von KosmoOrbit ist der
TS-Kernel mit Command-Pattern (jedes zod-Schema = Kosmo-LLM-Tool, gated
Proposals, Undo, Yjs); auf einer C/C++-Basis verliert Kosmo als steuernde
Intelligenz die typisierte Command-Ebene. (3) **Wartung** — ein Fork heisst
Blenders Release-Tempo ewig nachpflegen; das trägt kein Ein-Büro-Projekt.
(4) **Das Beste holen wir trotzdem**: Blender ist **Werkbank + Worker**, nicht
Grundlage — GLB-Roundtrip poliert (lesbare Objektnamen «Wand AW … · EG»,
deutsche Material-Slots, Meter), Modellieren via GLB-Import/Export als externes
Werkzeug (FreeMesh selbst bleibt bewusst V2, Owner-Q9 Stufe 3), Rendern/Physik
(Cycles, Wind-/Gebäudesimulation) als **Blender-headless-Worker an der
Bridge-Nahtstelle** — HomeStation-Punkt, siehe HOMESTATION-AUFTRAG.md.

## Nachtrag 2026-07-08 — aus der Notion-Scan-Auswertung (AI-SCAN-AUSWERTUNG-0.6.3.md)

| Baustein | Entscheid | Quelle | Lizenz |
|---|---|---|---|
| Gemini Omni Flash (Preview) | **TEST (Owner-Entscheid)** — erster konkreter Cloud-Bild-/Video-Kandidat für KOSMOVIS-OHNE-HOMEPC Option (b); 0.10 USD/s, max 10 s, Preview ≠ GA. Schlüssel/Kosten/Datenabfluss = Owner. | Gemini API | proprietär |
| Open-Design (nexu-io) | **EVALUATE (Owner-Posten, ~2–4 h)** — lokal-first Design-Desktop mit `DESIGN.md`-Haus-Stil-Profil + PDF-Export; direktester externer K10-Andockpunkt (Publish-Auto-Befüllung). Gegen ein exportiertes KosmoPublish-Blatt testen. | github.com/nexu-io/open-design | Apache 2.0 (laut Scans) |
| PosterGen | **READ (~3–4 h)** — 7-Agenten-Poster-Pipeline (CVPR 2026) als Architektur-Blaupause für den K10-Batch; kein Einbau. | github.com/Y-Research-SBU/PosterGen | MIT (laut Scan) |
| Arbor (RUC-NLPIR) | **WATCH** — autonomer Research-Agent (Claude-Code-Plugin/MCP); Lizenzangaben der Scans widersprüchlich (Apache 2.0 / MIT / «prüfen») — vor jedem Schritt selbst verifizieren; Einsatz nur mit explizitem Owner-Mandat. | github.com/RUC-NLPIR/Arbor | widersprüchlich ⚠️ |

Alle Angaben dieser Tabelle sind Scan-Aussagen (16 Notion-Seiten 01.–08.07.),
nicht selbst verifiziert — Details und Widersprüche in
`AI-SCAN-AUSWERTUNG-0.6.3.md` §4.

## Nachtrag 2026-07-10 — aus der Notion-Scan-Delta-Auswertung (AI-SCAN-AUSWERTUNG-0.6.8.md)

| Baustein | Entscheid | Quelle | Lizenz |
|---|---|---|---|
| Docling v2 + Granite-Docling-258M | **ADOPT** — lokale, halluzinationsarme PDF→MD/JSON-Extraktion (IBM); in v0.6.8 als `tools/docling-ingest` eingebaut (dreistufige Ehrlichkeit: echt / fehlend / --fake). Granite-258M als HomeStation-Option dokumentiert. | github.com/docling-project/docling | Apache 2.0 (laut Scan) |
| Markitdown (Microsoft) | **EVALUATE** — leichter PDF/Office→MD-Konverter, als dokumentierte Alternative in derselben Ingest-Naht (kein zweiter Pfad). | github.com/microsoft/markitdown | MIT (laut Scan) |
| RAG-Anything (HKUDS) | **WATCH** — multimodales RAG über MinerU-Extraktion; 0.6.9-Kandidat für den Abfrage-Teil über dem neuen Wissens-Import. | github.com/HKUDS/RAG-Anything | MIT (laut Scan) |
| Qwen2.5-VL 7B / Qwen3-VL (Ollama) | **TEST (HomeStation)** — lokaler Seh-Weg für «Kosmo sieht mit» (v0.6.8 Bildpfad `images`); RTX-5090-tauglich laut Scan. | ollama.com/library/qwen2.5vl | Apache 2.0 (laut Scan) |
| Qwen3-Embedding 0.6B | **WATCH** — Embedding-Upgrade-Kandidat für den Wissens-RAG (70.7 MTEB laut Scan); HomeStation-Schritt. | ollama.com/library/qwen3-embedding | Apache 2.0 (laut Scan) |
| Nemotron 3 Ultra (OpenRouter) | **WATCH (Owner-Entscheid)** — via OpenRouter kostenlos, lokal auf RTX 5090 UNMÖGLICH; Cloud-Konto + Datenabfluss = Owner-Gate. | openrouter.ai | OpenMDW-1.1 (laut Scan) |

Alle Angaben dieser Tabelle sind Scan-Aussagen (4 Notion-Seiten 09.–10.07.),
nicht selbst verifiziert — Details in `AI-SCAN-AUSWERTUNG-0.6.8.md` §4.

## Nachtrag 2026-07-11 — aus dem Scan-Nachlauf v0.7.0 (AI-SCAN-AUSWERTUNG-0.7.0.md §5)

| Baustein | Entscheid | Quelle | Lizenz |
|---|---|---|---|
| HiVG (Image-to-SVG) | **WATCH** — hierarchisches Bild→SVG, Evaluations-Kandidat 0.7.x auf der HomeStation (~2–3 h); Scan warnt selbst «nicht CAD-genau» — kein Einbau ohne Messung gegen echte Handskizzen. | HiVG | MIT (laut Scan) |
| PosterCraft (FLUX) | **REJECT (Lizenz)** — FLUX-Gewichte non-commercial, für Wettbewerbsabgaben eines Erwerbsbüros ungeeignet; dokumentiert, damit künftige Scans ihn nicht erneut vorschlagen. | PosterCraft | FLUX non-commercial ⚠ |

Prepare-Scan 11.07. bestätigt bestehende Posten (Qwen3-Embedding, Markitdown,
Qwen2.5-VL) und liefert einen GIS-Merker (swissALTI3D 2026 LiDAR /
swissNAMES3D 2026 — WATCH für die Standort-Kette). Details und Ehrlichkeit
in `AI-SCAN-AUSWERTUNG-0.7.0.md` §5 — alles Scan-Aussagen, nicht selbst
verifiziert.
