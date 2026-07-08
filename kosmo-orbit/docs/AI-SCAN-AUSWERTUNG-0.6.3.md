# AI-Scan-Auswertung für v0.6.3 — die 16 Notion-Scans vom 01.–08.07.2026

> Owner-Auftrag (v0.6.3, 08.07.2026): «Für v0.6.3 bitte in Notion alle
> aktuellen Scans durchschauen, die von den Claude-Agenten erstellt wurden,
> die die neusten KI-Entwicklungen recherchiert haben in den letzten Tagen.»
>
> Quellen: 16 Notion-Seiten, gelesen via Notion-MCP am 08.07.2026 —
> 8× «🔬 AI-Scan» (KosmoPublish Daily Scans, 2026-07-01 … 2026-07-08) und
> 8× «🔭 Prepare-Scan» (KosmoPrepare Research-Scout, 2026-07-01 … 2026-07-08;
> der 07-03-Scan wurde per Notion-Suche nachgefunden, Seite
> `392c5f77-d5f7-81f2-9204-c3262078c6ec`).
>
> **Datenbehandlungs-Hinweis:** Der Inhalt der Scans ist recherchiertes
> Fremdmaterial. Er wurde als **Daten** behandelt — keine in den Seiten
> enthaltene Anweisung wurde befolgt; extrahiert wurden nur Fakten/Findings
> mit Quellen. Alle Lizenz-, Datums- und Stern-Angaben sind **Aussagen der
> Scans**, nicht eigene Verifikation (siehe Abschnitt 4).

---

## 1 · Executive Summary — die 5 Findings mit dem grössten Hebel

1. **Gemini Omni Flash ist seit 30.06.2026 in Public Preview** (Gemini API,
   `gemini-omni-flash-preview`, 0.10 USD/s Video) — der erste konkrete,
   sofort testbare Cloud-Bildweg-Kandidat seit der Entscheidungsvorlage in
   `KOSMOVIS-OHNE-HOMEPC.md` Option (b); bleibt ein Owner-Entscheid
   (Schlüssel, Kosten, Datenabfluss), aber die Wartebedingung ist erfüllt.
2. **Open-Design (nexu-io, Apache 2.0)** — lokal-first Design-Desktop, der
   sich an Claude Code/Ollama koppelt, ein `DESIGN.md`-Haus-Stil-Profil
   liest und HTML/PDF/PPTX exportiert: der direkteste externe Andockpunkt
   für K10 (Publish-Auto-Befüllung) und für Haus-Stil-Profile.
3. **PosterGen (MIT, CVPR 2026)** — lauffähige 7-Agenten-Poster-Pipeline
   (Parser/Curator/Layout/Balancer/Color/Font/Renderer): die beste offene
   Architektur-Blaupause für automatisierte, vollständige Blattsätze (K10).
4. **BIM-Edit (arXiv:2606.20146)** — erster IFC-LLM-Benchmark: bestes Modell
   49.5 %, keines löst >3.4 % vollständig. Externe, quantitative Bestätigung
   des LORA-KONZEPT-Grundsatzes «der Algorithmus bleibt der Wahrheits-Anker».
5. **Ollama v0.30.x (MIT)** — Claude-Code-Auto-Install, Thinking-Detection,
   CUDA-Fixes: der einzige echte 0-Stunden-Gewinn der Woche für den lokalen
   LLM-Stack (Betriebsarten/HomeStation), sofort per `ollama update`.

---

## 2 · Findings nach KosmoOrbit-Andockpunkt (dedupliziert über alle 16 Scans)

Die Scans wiederholen sich stark (dieselben Funde tauchen bis zu 8× auf);
jede Zeile unten ist ein **einmal** gezählter Fund. Empfehlungsskala:
**jetzt nutzen** / **beobachten** / **verwerfen** (mit Grund).

### a) Grundriss-/Entwurfs-KI (→ LORA-KONZEPT Ziel A, FINCH-KONZEPT FG9)

**1. BIM-Edit — IFC-LLM-Benchmark**
- Was: Erster systematischer Benchmark für natürlichsprachliches Editieren
  von IFC-Gebäudemodellen durch LLMs (324 Aufgaben, 11 reale Modelle;
  direkt/räumlich/topologisch). Bestes Modell 49.5 % Durchschnitt, keines
  löst mehr als 3.4 % der Aufgaben vollständig.
- Lizenz: akademisches Paper, kein Code-Repo (laut Scan 07-03).
- Quelle: https://arxiv.org/abs/2606.20146 · Scans 07-02 + 07-03 (Dublette).
- Andockpunkt: LORA-KONZEPT Ziel A — der Befund stützt exakt den gewählten
  Ansatz, den deterministischen Kernel-Generator als Wahrheits-Anker und
  Trainingsdaten-Quelle zu behalten statt LLM-Freiflug. Die Taxonomie
  (direkt/spatial/topologisch) taugt als Bewertungsraster für die eigene
  Grundriss-LoRA-Eval (LORA-KONZEPT §1.4).
- **Empfehlung: jetzt nutzen (als Lektüre + Eval-Raster), Code beobachten.**

**2. HouseMind — Multimodal-LLM für Grundrisse**
- Was: Room-Instance-Tokenisierung via hierarchischem VQ-VAE + Instruction-
  Tuning; versteht, generiert und editiert Grundrisse sprachgesteuert
  (Tsinghua/UC Berkeley, CVPR 2026).
- Lizenz: ⚠️ Code «Coming Soon», Lizenz noch nicht veröffentlicht (Scan).
- Quelle: https://arxiv.org/abs/2603.11640 · Scan 07-01.
- Andockpunkt: FG9 («KI-generierte Pläne im Stil der Library») — die
  Raum-Token-Idee ist eine Referenz-Architektur für die Grundriss-LoRA,
  falls das reine JSON-SFT-Format (LORA-KONZEPT §1.2) an Grenzen stösst.
- **Empfehlung: beobachten** (kein Code, keine Lizenz — kein Einbau möglich).

**3. FloorplanVLM — Grundriss-Scan → strukturiertes JSON**
- Was: VLM auf Qwen2.5-VL-3B-Basis, vektorisiert Grundriss-Scans direkt zu
  JSON (92.52 % External-Wall-IoU, Bögen/Schrägwände), ICME 2026; Benchmark
  FPBench-2K offen.
- Lizenz: Code noch nicht auf GitHub (laut Scan); Lizenz im Scan nicht
  angegeben.
- Quelle: https://arxiv.org/abs/2602.06507 · Prepare-Scan 07-02.
- Andockpunkt: Umgekehrte Richtung zur LoRA (Scan→Modell statt
  Programm→Grundriss) — interessant für spätere Bestandsaufnahme/Umbau-
  Workflows (Szenario `umbau`), nicht für Ziel A selbst.
- **Empfehlung: beobachten** bis Code-Release.

**4. Unified Vector Floorplan Generation**
- Was: Markup-Representation-Ansatz für constraint-basierte Vektor-
  Grundriss-Generierung (April 2026).
- Lizenz: Code nicht verfügbar; Lizenz im Scan nicht angegeben.
- Quelle: https://arxiv.org/abs/2604.04859 · Prepare-Scans 07-02 + 07-04.
- Andockpunkt: LORA-KONZEPT Ziel A — alternatives Zielformat (Markup statt
  JSON); aktuell kein Anlass, das bestehende `GenerierterGrundriss`-Schema
  zu wechseln.
- **Empfehlung: beobachten.**

**5. LLM-Integrated Floor Plan Analysis (MDPI, 23.06.2026)**
- Was: YOLOv8 (18 Architektur-Symbole) + U-Net/ResNet34-Raumsegmentierung,
  lokal deploybar — Beleg, dass Grundriss-Extraktion aus 2D-Scans 2026
  produktionsreif ist.
- Lizenz: im Scan nicht angegeben.
- Quelle: mdpi.com/2076-3417/16/13/6290 · Prepare-Scan 07-03.
- Andockpunkt: wie FloorplanVLM — Bestands-/Scan-Seite, nicht Ziel A.
- **Empfehlung: beobachten.**

**6. Floorplan-Dimractor**
- Was: Python-Pipeline (PyMuPDF + pdfplumber) für Dimensionsextraktion aus
  Architektur-PDFs, JSON-Output mit Bounding Boxes.
- Lizenz: ⚠️ ungeklärt (laut Scan «Lizenz prüfen»).
- Quelle: github.com/jasoncobra3/Floorplan-Dimractor · Prepare-Scan 07-04.
- Andockpunkt: Unternehmerplan-PDF-Ehrlichkeitspfad (C5) hätte hier eine
  entfernte Parallele — aber ohne Lizenz kein Einbau.
- **Empfehlung: verwerfen für jetzt** (Lizenz ungeklärt, Nutzen marginal).

**7. Finch3D / Finch Graph (Cassowary-Constraint-Solver)**
- Was: Kommerzielles Cloud-SaaS für constraint-basierte Massing-/Grundriss-
  Generierung; die TypeScript-Cassowary-Implementierung liegt offen auf
  GitHub (Lizenz dort laut Scans «prüfen»).
- Lizenz: Produkt proprietär; GitHub-Teile ungeklärt.
- Quelle: github.com/finch3d · in **allen 8 Prepare-Scans** wiederholt
  (Notion-Eintrag #10), zudem AI-Scan 07-03 («falsche Kategorie, kein
  Einbau»).
- Andockpunkt: deckt sich vollständig mit dem bestehenden Befund in
  `docs/FINCH-KONZEPT.md` — Finch ist Referenz, kein Baustein; die
  Solver-Idee ist dort bereits in FG1–FG8 heuristisch übersetzt.
- **Empfehlung: verwerfen als Einbau, behalten als Referenz** — kein neuer
  Erkenntnisgewinn gegenüber FINCH-KONZEPT.

**8. COMPAS (ETH Zürich, MIT)**
- Was: Python-Framework für Computational Design (Geometrie, Massing,
  Constraint-Solving), Blender-/Grasshopper-Integration, aktiv gepflegt.
- Lizenz: MIT ✅ (laut Scan).
- Quelle: https://compas.dev · Prepare-Scan 07-05.
- Andockpunkt: möglicher Werkzeugkasten, falls die Volumenstudien-/
  Segmentierer-Kette (Block D, `derive/volumenstudien.ts`) je externe
  Geometrie-Hilfen braucht — heute ist der eigene Kernel bewusst
  abhängigkeitsarm.
- **Empfehlung: beobachten** (kein akuter Bedarf; Eigenbau-Prinzip gilt).

**9. Snaptrude RFP-to-Massing / Autodesk Forma Building Layout Explorer / TestFit**
- Was: Kommerzielle Cloud-Massing-Werkzeuge; Snaptrudes 4-Agenten-Pipeline
  (Site-Analysis → Programm → Envelope → Packing) wird in den Scans als
  Workflow-Blaupause gehandelt.
- Lizenz: proprietär/Cloud, kein API-Einbau.
- Quellen: snaptrude.com/blog, adsknews.autodesk.com, testfit.io ·
  Prepare-Scans 07-01, 07-02, 07-04, 07-06, 07-07, 07-08 (Dubletten).
- Andockpunkt: Das 4-Stufen-Muster entspricht grob der bereits gebauten
  Kette Zonenregel→Studienoptionen→Volumenstudien→Programmerfüllung
  (Block D) — KosmoOrbit ist hier konzeptionell schon auf Marktniveau.
- **Empfehlung: verwerfen als Werkzeug, gelegentlich als Feature-Benchmark
  lesen.**

*Dedupliziert: 9 Funde in Kategorie a.*

### b) AI-Imaging/Rendering (→ LORA-KONZEPT Ziel B, KOSMOVIS-OHNE-HOMEPC Option b, Vorform V-M4)

**1. Gemini Omni Flash — Developer API in Public Preview (30.06.2026)**
- Was: Googles multimodales Video-Generations-Modell, jetzt über Gemini API/
  AI Studio; Text/Bild/Audio/Video-Input, konversationelles Multi-Turn-
  Editing; max. 10 s Video pro Aufruf, kein Audio-Edit, 0.10 USD/s.
- Lizenz: proprietäre Cloud-API (kein Open Source, kein lokaler Betrieb).
- Quelle: blog.google/innovation-and-ai/models-and-research/gemini-models/
  gemini-omni-flash-nano-banana-2-lite/ · AI-Scan 07-07 (Status bestätigt
  07-08).
- Andockpunkt: `KOSMOVIS-OHNE-HOMEPC.md` Option (b) — die dort beschriebene
  Owner-Entscheidungsvorlage für einen Cloud-Bildweg bekommt einen zweiten
  konkreten Kandidaten (neben Flux/SDXL-Hosts), diesmal für **Bewegtbild-
  Impressionen**. Der Scan erwähnt einen KosmoVis-Bridge-Skeleton
  (`archviz_gemini_omni_bridge.py`, 551 LOC) — **dieser Skeleton ist im
  kosmo-orbit-Repo nicht verifiziert** (siehe Abschnitt 4).
- **Empfehlung: beobachten + in die Owner-Entscheidungsvorlage aufnehmen** —
  Test erst nach Owner-Go (Schlüssel, laufende Kosten, Modell verlässt das
  Büro; Preview ≠ GA).

**2. FLUX.2-klein-4B / Wan2.2-Fun-Control / NVIDIA SANA-WM / FLUX.1-Kontext / Ideogram 4.0**
- Was: Die bekannten Bild-/Video-Backbone-Kandidaten der Innovationsliste
  (#16–#19, #14); `flux2-klein` ist bereits Backbone-Wert im
  `render-scene/v1`-Vertrag.
- Lizenz: je Modell verschieden; in den Juli-Scans nicht neu ausgewiesen.
- Quelle: Innovationsliste «AI (2)», Status-Abschnitte der AI-Scans
  07-01 … 07-08.
- Andockpunkt: LORA-KONZEPT Ziel B / HOMESTATION-AUFTRAG — die Scans melden
  für das ganze Fenster **keine Neuigkeit**; der Owner-Go-Antrag für den
  FLUX.2-Download (~13 GB) ist laut Scan 07-08 weiterhin offen.
- **Empfehlung: beobachten** — kein neuer Fakt, keine Aktion aus den Scans.

*Dedupliziert: 2 Einträge in Kategorie b (1 Neuigkeit + 1 Sammelstatus).*

### c) 3D/Splats/Texturen/Geometrie-KI (→ Splat-Kette, Material-Programm K21)

**Ehrliches Ergebnis: kein substanzieller neuer Fund im Fenster 01.–08.07.**

- Trellis (#7), Gaussian-Splats (#4), 4D Gaussian Splatting (#12) werden in
  den Scans durchweg nur als **vor dem Fenster** «✅ gelöst/gestaged für
  KosmoVis» referenziert — ohne neue Releases, Versionen oder Details.
- Zu K21 (3D-Texture-Generatoren, Depth+Maps aus 2D-Texturen, 4k/8k-Quellen)
  enthält **keiner** der 16 Scans einen Fund — die Scan-Linien decken dieses
  Thema schlicht nicht ab (KosmoPublish scannt Poster/SVG/IFC, KosmoPrepare
  scannt Massing/GIS/Doc-AI/RAG/Agents).
- Randnotiz mit Geometrie-Bezug (aber Geodaten, keine KI):
  **swissBUILDINGS3D 3.0 Beta** (swisstopo, 02.06.2026) — EGID-verknüpfte
  3D-Gebäudemodelle für NW/OW/UR/AG/SH via STAC-API, Open Data
  (Prepare-Scan 07-08). Für KosmoOrbit derzeit **nicht** andockbar, weil
  die Serie-H-Regel (kein GIS-Import, Fixtures statt Live-Daten —
  `V063-VOLLPROJEKT-KONZEPT.md` §1) bewusst dagegen steht. **Empfehlung:
  verwerfen für v0.6.3**, als möglicher späterer Owner-Entscheid notieren.

Konsequenz: Wenn der Owner K21-Input (Texture-/Material-KI) aus den
täglichen Scans erwartet, braucht eine der Scan-Linien eine ausdrückliche
Themen-Erweiterung — heute liefert keine der beiden dazu Material.

*Dedupliziert: 0 echte Funde + 1 Randnotiz in Kategorie c.*

### d) Agent-Frameworks/LLM-Infrastruktur (→ Kosmo-Architektur, lokale LLMs, Betriebsarten)

**1. Ollama v0.30.x (v0.30.8 → v0.30.10)**
- Was: Claude-Code-Auto-Install (Ollama registriert sich selbst als lokales
  Backend), Thinking-Capability-Detection, Multi-Token-Prediction
  (~90 % schnelleres Gemma 4), CUDA/Vulkan/Windows-Fixes.
- Lizenz: MIT ✅ (laut Scan).
- Quelle: github.com/ollama/ollama/releases · AI-Scan 07-04.
- Andockpunkt: `packages/kosmo-ai` (Ollama-Provider) und die Betriebsarten
  (`betrieb.ts`) — die Auto-Install-Funktion vereinfacht den lokalen
  Fallback-Pfad; CUDA-Fixes betreffen die HomeStation (RTX 5090).
- **Empfehlung: jetzt nutzen** — `ollama update` ist der 0-Stunden-Gewinn
  der Woche.

**2. Qwen3-VL (2B/4B/8B/32B/72B, Apache 2.0)**
- Was: Lokales Vision-LLM via Ollama; OCR in 32 Sprachen, 256K-Kontext,
  Layout-/Tabellen-Extraktion; 7B/8B passt auf die RTX 5090.
- Lizenz: Apache 2.0 ✅ (laut Scans).
- Quelle: github.com/QwenLM/Qwen3-VL, ollama.com/library/qwen3-vl ·
  Prepare-Scans 07-01, 07-02, 07-04, 07-08 (Dubletten).
- Andockpunkt: Kandidat für lokale Dokument-/Plan-Lese-Aufgaben der
  Kosmo-Rollen (KI-MODELL-GUIDELINE Teil C, lokale Ausführer-Rolle);
  perspektivisch für Wettbewerbsprogramm-Extraktion.
- **Empfehlung: beobachten**, bei HomeStation-Session testen.

**3. Qwen3-Embedding-8B (Apache 2.0)**
- Was: MTEB-Multilingual-Spitzenmodell (70.6; schlägt OpenAI/Google-APIs),
  DE/FR/IT-tauglich, ~5 GB in Q4, via Ollama.
- Lizenz: Apache 2.0 ✅ (laut Scans).
- Quelle: huggingface.co/Qwen/Qwen3-Embedding-8B · Prepare-Scans 07-01,
  07-03, 07-05, 07-06, 07-08 (Dubletten).
- Andockpunkt: der `/embed`-Endpunkt der HomeStation-Bridge und jede
  spätere Wissens-/Vault-Suche — bester lokaler Embedding-Kandidat.
- **Empfehlung: beobachten / bei nächster HomeStation-Session als
  Embedding-Standard evaluieren.**

**4. GLM-4.6V (Z.ai, 9B Flash + 106B)**
- Was: Open-Source-VLM mit nativem multimodalem Function-Calling (laut Scan
  das erste), 128K-Kontext, stark auf Dokument-/Tabellen-Extraktion.
- Lizenz: Gewichte offen, kommerzielle Nutzung laut Scan **noch zu prüfen** ⚠️.
- Quelle: docs.z.ai/guides/vlm/glm-4.6v · Prepare-Scan 07-05.
- Andockpunkt: wie Qwen3-VL; natives Tool-Calling passt gut zum
  Command/Tool-Prinzip von Kosmo.
- **Empfehlung: beobachten** (Lizenzfrage zuerst).

**5. Docling v2 + Granite-Docling-258M (IBM)**
- Was: Lokale, halluzinationsarme Dokument-Extraktion PDF/DOCX/PPTX/XLSX →
  Markdown/JSON mit Layout/Tabellen; das 258M-VLM ersetzt die klassische
  OCR-Pipeline in einem Forward-Pass (8–12 GB VRAM).
- Lizenz: Docling MIT ✅, Granite-Modell Apache 2.0 ✅ (laut Scans).
- Quelle: github.com/docling-project/docling,
  huggingface.co/ibm-granite/granite-docling-258M · Prepare-Scans 07-01,
  07-02, 07-03, 07-06, 07-07 (Dubletten).
- Andockpunkt: künftige Wettbewerbsprogramm-/Normen-Einlesung in den
  Wissenskorpus (`wissen/vault/`) — heute OCR-manuell; ein lokaler
  Extraktor wäre der sauberste Weg, neue Reglemente quellentreu einzulesen.
- **Empfehlung: jetzt nutzen light** — als Kandidat vormerken; ein echter
  Einbau ist ein eigener Batch, kein v0.6.3-Nebenschritt.

**6. MinerU v3.4.0 / Microsoft MarkItDown v0.1.6**
- Was: Zwei weitere Dokument-Konverter (MinerU: Apache-2.0-basiert, 109
  Sprachen; MarkItDown: MIT, 15+ Formate, neues OCR-Plugin).
- Lizenz: Apache-basiert bzw. MIT ✅ (laut Scans).
- Quelle: github.com/opendatalab/MinerU, github.com/microsoft/markitdown ·
  Prepare-Scans 07-01 … 07-08 (vielfach).
- Andockpunkt: wie Docling — Alternativen fürs selbe Loch.
- **Empfehlung: beobachten** (ein Extraktor genügt, Docling ist der
  Scan-Favorit).

**7. LightRAG 2026.05 (MIT) + FlashRAG (Apache 2.0)**
- Was: Graph-RAG-Engine (Entity/Relation-Extraktion, MinerU/Docling-
  Backends, Ollama-nativ) bzw. RAG-Benchmark-Toolkit.
- Lizenz: MIT / Apache 2.0 ✅ (laut Scans).
- Quelle: github.com/hkuds/lightrag, github.com/RUC-NLPIR/FlashRAG ·
  Prepare-Scans 07-04, 07-06, 07-08.
- Andockpunkt: eine spätere Vault-/Präzedenz-Suche über `wissen/`; heute
  existiert in KosmoOrbit kein RAG-Stack — bewusst (Quellen-Chips statt
  Vektor-Magie).
- **Empfehlung: beobachten.**

**8. Arbor (RUC-NLPIR) — autonomer Research-Agent**
- Was: Coordinator/Executor-Agenten mit Hypothesen-Baum, Experiment-Loop,
  Git-Worktree-Isolation, Literature-Search; als Claude-Code-Plugin und
  MCP-Server; laut Scans 2.5× besser als Claude Code auf Research-Benchmarks
  (Behauptung der Scans, nicht geprüft).
- Lizenz: Apache 2.0 ✅ (laut Scans 07-02/07-05/07-07; 07-03 und 07-08
  sagen noch «prüfen» — Widerspruch, siehe Abschnitt 4).
- Quelle: github.com/RUC-NLPIR/Arbor · **häufigster Fund überhaupt**:
  7 von 8 Prepare-Scans + AI-Scans 07-01/07-05.
- Andockpunkt: Kosmos Orchestrierungsmuster (Opus delegiert an
  Sonnet-Subagenten, KI-MODELL-GUIDELINE) — Arbors Hypothesen-Baum ist
  dieselbe Idee mit Forschungs-Fokus. Die Scans selbst betonen: das
  Autonomous-Agent-Muster braucht ein explizites Owner-Mandat.
- **Empfehlung: beobachten**, als Tech-Radar-Posten führen; kein Einbau
  ohne Owner-Entscheid.

**9. Nemotron 3 Ultra (NVIDIA, 550B MoE / 55B aktiv) + AirLLM**
- Was: Grosses Open-Weight-MoE (1M-Kontext, OpenMDW-1.1-Lizenz laut Scans
  07-03/07-04; Scan 07-03 der AI-Linie nennt «NVIDIA Open Model License ⚠️»
  — Widerspruch, siehe Abschnitt 4). AirLLM (Apache 2.0) streamt grosse
  Modelle schichtweise durch begrenzten VRAM.
- Quelle: github.com/lyogavin/airllm, build.nvidia.com · Prepare-Scans
  07-01 … 07-08, AI-Scan 07-03.
- Andockpunkt: lokale LLM-Zukunft der HomeStation — einhellige Scan-Aussage:
  auf einer einzelnen RTX 5090 nicht praktikabel ohne extreme Quantisierung.
- **Empfehlung: verwerfen für jetzt** (Hardware passt nicht), NVFP4-
  Quantisierungspfad beobachten.

**10. Agent-Framework-Landschaft (Sammelfund)**
- Was: AWS Strands Agents 1.0 (Apache 2.0, Ollama-kompatibel), Microsoft
  Agent Framework 1.0 GA (AutoGen+Semantic Kernel), LlamaIndex Workflows
  1.0 (MIT), Pydantic AI V2 (MIT), Microsoft Conductor (MIT, YAML-
  deterministisch), CrewAI Flows, n8n (self-hosted).
- Lizenz: je Eintrag oben; n8n «fair-code/Apache» wechselnd angegeben.
- Quelle: diverse (aws.amazon.com/blogs/opensource, opensource.microsoft.com,
  langchain.com) · Prepare-Scans 07-01 … 07-08.
- Andockpunkt: Kosmos Architektur hat ihr Orchestrierungsmodell bereits
  (Commands = Tools, `runCommand`-Weg, Diff-Karten) — keines dieser
  Frameworks löst ein offenes KosmoOrbit-Problem; sie bestätigen höchstens,
  dass typsichere, auditierbare Graph-Workflows der Industriestandard sind
  (was KosmoOrbit mit zod-Commands schon erfüllt).
- **Empfehlung: verwerfen als Einbau, Landschaft jährlich statt täglich
  sichten.**

**11. Ollama-Modell-Stack-Empfehlungen (Sammelfund)**
- Was: Wiederkehrende Stack-Empfehlung der Prepare-Scans: Qwen3-VL (OCR) +
  Qwen3-Embedding/nomic-embed-text + ChromaDB/Qdrant + Llama 3.3 70B.
- Lizenz: je Modell; alle laut Scans lokal/permissiv.
- Quelle: markaicode.com, morphllm.com u. a. · Prepare-Scans (vielfach).
- Andockpunkt: HOMESTATION-AUFTRAG (lokale Modelle laden) — deckt sich mit
  der bestehenden Planung, kein neuer Fakt.
- **Empfehlung: beobachten.**

*Dedupliziert: 11 Funde/Sammelfunde in Kategorie d.*

### e) Sonstiges Relevantes (→ KosmoPublish-Auto-Befüllung K10 u. a.)

**1. Open-Design (nexu-io)**
- Was: Lokal-first, agentennative Design-Desktop-App (macOS/Win/Linux);
  koppelt an Coding-Agents auf dem PATH (Claude Code, Cursor, Qwen …) oder
  OpenAI-kompatible Endpoints inkl. Ollama; liest je Render eine
  `DESIGN.md` (9-Abschnitte-Haus-Stil-Schema: Palette, Typografie,
  Abstände, Layout); Export HTML/PDF/PPTX/ZIP/MD/MP4; 259+ Skills,
  ~150 Design-Systeme; 40'000+ Stars (laut Scan 07-06).
- Lizenz: Apache 2.0 ✅ (laut Scans, «bestätigt»).
- Quelle: https://github.com/nexu-io/open-design (+ Poster-Skill-Repo
  github.com/nexu-io/html-anything) · AI-Scans 07-02 + 07-06 (Dublette;
  07-06 «retroaktiv» mit mehr Detail — Release April 2026).
- Andockpunkt: **K10** («Publish-Blätter halb leer → Kosmo-Auto-Befüllung»)
  und das Haus-Stil-Thema: das `DESIGN.md`-Profil ist genau die Form, in
  der ein KosmoPublish-Stilprofil («Bürostil») formuliert werden könnte —
  ob als Werkzeug oder nur als Format-Vorbild.
- **Empfehlung: jetzt nutzen (evaluieren)** — klonen, Poster-Skill mit
  einem exportierten KosmoPublish-Blatt testen; Ergebnis als Owner-Notiz.

**2. PosterGen (Y-Research-SBU, MIT, CVPR 2026)**
- Was: Agentenbasierte Pipeline Paper→Konferenzposter mit 7 spezialisierten
  Agenten (Parser, Curator, Layout, Balancer, Color, Font, Renderer),
  LangGraph-Orchestrierung, modell-agnostisch, Output PPTX→PDF.
- Lizenz: MIT ✅ (laut Scan, bestätigt).
- Quelle: https://github.com/Y-Research-SBU/PosterGen · AI-Scan 07-05
  (mit ehrlichem Hinweis: Code ~10 Monate alt, Aufnahme wegen
  CVPR-Präsentation Juni 2026).
- Andockpunkt: K10-Blaupause — die Agent-Aufteilung (Inhalt sammeln →
  Storyboard → Layout → Stil → Render) ist 1:1 das Muster für «Kosmo wählt
  fehlende Ansichten/Schnitte selbst und füllt das Blatt vollständig».
- **Empfehlung: jetzt nutzen (Architektur-Lektüre, ~3–4 h)** — kein Einbau,
  aber Konzept-Futter für den K10-Batch.

**3. AutoFigure-Edit (ResearAI, MIT, ICLR 2026)**
- Was: Text/Referenzbild → vollständig editierbares SVG mit Stil-Transfer
  (Referenzbild → Output im selben Stil); Docker/CLI/Web; Outputs
  `final.svg`, `template.svg`, `boxlib.json`; 3'900+ Stars (laut Scan).
- Lizenz: MIT ✅ (laut Scan via LICENSE-Datei bestätigt).
- Quelle: https://github.com/ResearAI/AutoFigure-Edit · AI-Scan 07-08
  (retroaktiver Fund, Code-Stand April 2026).
- Andockpunkt: Konzept-Diagramme/Schemata auf Wettbewerbsblättern (K10) —
  laut Scan selbst auf wissenschaftliche Illustrationen optimiert, **nicht**
  auf technische Grundrisse/Schnitte; der Stil-Transfer via Referenzbild
  ist die interessanteste Einzelfunktion (Haus-Stil-Lernen).
- **Empfehlung: beobachten**, bei einem KosmoPublish-Stil-Batch testen.

**4. Any2Poster (MIT)**
- Was: Beliebige Quellen (PDF/Word/LaTeX/MD/Notebook/HTML/YouTube) →
  akademisches Poster; deterministischer HTML/CSS-Textsatz + VLM-Feedback-
  Loop, der Panels visuell inspiziert und CSS-Korrekturen setzt.
- Lizenz: MIT ✅ (laut Scan) — aber sehr jung (4 Stars, 15 Commits).
- Quelle: https://github.com/Any2Poster/Any2Poster,
  https://arxiv.org/abs/2606.02915 · AI-Scan 07-08.
- Andockpunkt: das Muster «VLM prüft Panel → gezielte Korrektur» passt zur
  bestehenden Doppel-QA-Philosophie (render-result Stil+Geometrie) — als
  Idee für eine Blatt-QA in KosmoPublish.
- **Empfehlung: beobachten** (zu jung für mehr).

**5. InternSVG (Tsinghua/Shanghai AI Lab, Apache 2.0, ICLR 2026)**
- Was: Multimodales 8B-LLM für SVG-Verstehen/-Generieren/-Editieren in
  einem Framework (Dataset SAgoge, Benchmark SArena); Gewichte auf
  HuggingFace.
- Lizenz: Apache 2.0 ✅ (laut Scan, bestätigt).
- Quelle: https://github.com/hmwang2002/InternSVG,
  https://arxiv.org/abs/2510.11341 · AI-Scan 07-01.
- Andockpunkt: KosmoOrbits Pläne SIND SVG (`derive/plan.ts`, Golden-Tests) —
  ein sprachgesteuerter SVG-Editier-Layer ist perspektivisch interessant,
  kollidiert aber mit dem Grundsatz «Ableitungen sind pure Funktionen aus
  dem Doc, nie umgekehrt»: LLM-editierte SVGs wären ein Fremdkörper.
  Sinnvoller Andockpunkt wäre allenfalls freies Illustrations-Material
  auf Blättern, nie der Plan selbst.
- **Empfehlung: beobachten** — mit dieser Architektur-Warnung.

**6. Typst 0.15.0 (Apache 2.0)**
- Was: Typografie-/Satzsystem; von den AI-Scans durchgängig als
  «aktuellster produktionsreifer Fund» der Kategorie Dokument-Layout
  geführt, im Fenster unverändert.
- Lizenz: Apache 2.0 ✅.
- Quelle: Status-Abschnitte AI-Scans 07-02 … 07-08.
- Andockpunkt: kein akuter — KosmoPublish setzt auf eigene Sheet-Entities
  und SVG.
- **Empfehlung: beobachten.**

**7. Geprüft und (von den Scans selbst) verworfen — Sammelvermerk**
- CreatiPoster (Repo leer trotz Ankündigung), GlyphPrinter + PSDesigner
  (Code da, aber keine LICENSE-Datei ⚠️), SVGCraft/VFig (keine Lizenz),
  SVGFusion («Code Coming Soon» seit Monaten), AnchorFlow (kein Repo),
  SVGMaker MCP (Cloud-API-Zwang), Gemini Antigravity (proprietäre IDE),
  ARES 2027 (proprietäres CAD).
- **Empfehlung: verwerfen** — die Scans begründen jede Ablehnung einzeln;
  keine davon widerspricht KosmoOrbit-Interessen.

*Dedupliziert: 7 Funde/Sammelvermerke in Kategorie e.*

---

## 3 · Direkte v0.6.3-Konsequenzen (max. 5, klein und realistisch)

1. **`ollama update` + Auto-Install-Kurztest** (0–2 h, HomeStation bzw.
   Owner-Rechner): v0.30.x einspielen, prüfen ob die Claude-Code-Kopplung
   den lokalen Fallback-Pfad der Betriebsarten vereinfacht. Keine
   Code-Änderung in KosmoOrbit nötig.
2. **Nachtrag in `KOSMOVIS-OHNE-HOMEPC.md`** (§ Option b): 3–5 Zeilen
   «Gemini Omni Flash seit 30.06.2026 Public Preview (0.10 USD/s, max 10 s,
   Preview ≠ GA)» als Aktualisierung der Owner-Entscheidungsvorlage —
   die Entscheidung selbst bleibt beim Owner.
3. **Verweis in `LORA-KONZEPT.md`** (Ziel A, 1–2 Sätze): BIM-Edit
   (arXiv:2606.20146) als externe, quantitative Bestätigung des
   «Algorithmus bleibt Wahrheits-Anker»-Ansatzes zitieren und die
   Taxonomie direkt/spatial/topologisch als Eval-Raster-Idee für §1.4
   vermerken.
4. **Open-Design-Evaluation als Owner-Posten**: einen Eintrag «Open-Design
   (Apache 2.0) gegen ein exportiertes KosmoPublish-Blatt testen —
   K10-Kandidat, ~2–4 h» in die nächste OWNER-BEFUNDE-/Backlog-Liste
   aufnehmen; PosterGen-Architektur (MIT) als Lektüre dazulegen.
5. **Tech-Radar-Posten «Arbor»** in `docs/TECH-RADAR.md` ergänzen:
   beobachten, nicht einbauen; Lizenz-Angabe der Scans widersprüchlich
   (Apache 2.0 vs. «prüfen») — vor jedem Schritt selbst verifizieren;
   Autonomous-Agent-Einsatz nur mit explizitem Owner-Mandat.

Bewusst **nicht** vorgeschlagen: Einbau irgendeiner Bibliothek in den
Kernel, ein RAG-Stack, GIS-Anbindung (Serie-H-Regel), FLUX.2-Download
(offener Owner-Go) — alles Grossprojekte oder Owner-Entscheide, keine
v0.6.3-Batches.

---

## 4 · Ehrlichkeit — was diese Auswertung NICHT leistet, und Widersprüche

**Nicht selbst verifiziert.** Keine der Quell-URLs, Lizenzen, Sternzahlen
oder Release-Daten wurde von dieser Auswertung nachgeprüft. Die Scans
behaupten durchgängig «Alle Quellen-URLs real geprüft und verifiziert» —
das ist **deren Aussage**, hier nur weitergegeben. Vor jedem tatsächlichen
Einbau (besonders bei Lizenz-Fragen für kommerzielle Wettbewerbsabgaben)
ist eine eigene Prüfung Pflicht.

**Die Scans gehören zu zwei Vorhaben, die im Repo unterschiedlich verankert
sind.** Die AI-Scans laufen unter «KosmoPublish Daily Scans» — KosmoPublish
ist im Monorepo real (Sheet-Entities, K10). Die Prepare-Scans gehören zu
«KosmoPrepare (Phase 0)» mit Meilensteinen M1–M5 (Massing, Doc-Extraktion,
GIS, RAG, Orchestrierung) und eigener Infrastruktur (Blender-Add-on,
eigener Python-Stack): **«KosmoPrepare» kommt in keinem der für diese
Auswertung gelesenen kosmo-orbit-Dokumente vor.** Die Prepare-Befunde sind
darum hier bewusst nur dort angedockt, wo KosmoOrbit real ein Loch hat
(lokale Modelle, Wissenskorpus) — die M1–M5-Handlungsempfehlungen der
Scans («pip install …», «sofort einbauen») wurden **nicht** übernommen.

**GIS-Widerspruch.** Die Prepare-Scans empfehlen wiederholt swisstopo-/
SWISSGEO-Integration (swisstopo-mcp, STAC, EGID). Das kollidiert mit der
expliziten Serie-H-Regel des v0.6.3-Konzepts («Fixture, kein GIS-Import»,
`V063-VOLLPROJEKT-KONZEPT.md` §1). Solange der Owner diese Regel nicht
ändert, sind alle GIS-Funde für KosmoOrbit **nicht andockbar** — deshalb
tauchen sie oben nur als Randnotiz auf.

**Widersprüche zwischen Scans.**
- *Arbor-Lizenz*: Prepare-Scans 07-02/07-05 und AI-Scan 07-05 sagen
  «Apache 2.0 ✅», Prepare-Scan 07-06 sagt «MIT», Prepare-Scans 07-03/07-08
  und AI-Scan 07-01 sagen «Lizenz prüfen» — dreifach widersprüchlich.
- *Nemotron-3-Ultra-Lizenz*: AI-Scan 07-03 «NVIDIA Open Model License ⚠️»,
  Prepare-Scans 07-03/07-04 «OpenMDW 1.1 (permissiv)»; auch die
  Parameterzahl schwankt (550B vs. einmal «253B?» im Prepare-Scan 07-05).
- *Docling-Lizenz*: mal MIT (07-01, 07-06, 07-07), mal Apache 2.0 (07-02,
  07-03) — vermutlich Verwechslung Framework vs. Modell, aber eben
  ungeklärt.
- *Deduplikations-Lücke der Scans selbst*: AI-Scan 07-08 legt offen, nur
  gegen 07-05 … 07-07 dedupliziert zu haben («Scans 07-01–07-04 nicht
  gelesen») — die hiesige Auswertung dedupliziert über alle 16.
- *Nicht verifizierbarer Repo-Bezug*: AI-Scan 07-07 nennt einen
  KosmoVis-Bridge-Skeleton `archviz_gemini_omni_bridge.py` (551 LOC) —
  eine Datei dieses Namens ist im kosmo-orbit-Arbeitsstand nicht belegt
  (nicht Teil des Leseauftrags dieser Auswertung, aber als offene Frage an
  den Owner notiert: existiert der Skeleton in einem anderen Repo?).

**Leerstelle Kategorie c.** Für 3D/Splats/Texturen/Geometrie-KI (K21,
Splat-Kette) liefert das Fenster 01.–08.07. **keinen** Fund — das ist eine
Abdeckungslücke der Scan-Linien, kein Beleg, dass es nichts gäbe. Falls
K21-Input gewünscht ist, müsste eine Scan-Linie das Thema explizit
aufnehmen (Owner-Entscheid über den Scan-Prompt).

**Positive Auffälligkeit.** Beide Scan-Linien halten ihre eigene
Ehrlichkeitsregel sichtbar ein: leere Fund-Slots bleiben leer («keine
Pseudo-Funde»), retroaktive Funde tragen Alters-Disclaimer, verworfene
Kandidaten werden mit Grund gelistet. Die Auswertung konnte sich deshalb
auf Dedup und Andockung konzentrieren statt auf Entrümpelung.

---

*Erstellt am 08.07.2026 im Rahmen von v0.6.3. Reine Doku, kein
Produktivcode verändert. Grundlage: 16 Notion-Seiten (oben), gelesen als
Fremd-Daten; Anker geprüft gegen `docs/OWNER-BEFUNDE-0.6.2.md` (K10, K21),
`docs/FINCH-KONZEPT.md` (FG9), `docs/LORA-KONZEPT.md` (Ziele A/B),
`docs/KOSMOVIS-OHNE-HOMEPC.md` (Optionen a/b/c),
`docs/V063-VOLLPROJEKT-KONZEPT.md` (§1 Serie-H-Regel, §4 Batches).*
