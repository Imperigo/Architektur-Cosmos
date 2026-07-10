# AI-Scan-Auswertung für v0.6.8 — Delta seit der 0.6.3-Auswertung (09.–10.07.2026)

> Owner-Auftrag (v0.6.8, 10.07.2026): «Einbezug aller AI-Scan-Neuentwicklungen
> die von Claude gescannt wurden und auf Notion oder Git gepushed sind —
> diese Funktion permanent einbauen für jede neue Version.»
>
> Quellen (Delta — alles seit dem Schnitt der 0.6.3-Auswertung vom 08.07.):
> 4 Notion-Seiten, gelesen via Notion-MCP am 10.07.2026 —
> 2× «🔬 AI-Scan» (2026-07-09, 2026-07-10) und
> 2× «🔭 Prepare-Scan» (2026-07-09, 2026-07-10).
> Für v0.6.4–0.6.7 gab es keine Auswertung; dieses Delta schliesst die Lücke
> und ist zugleich der erste Lauf des neu verankerten Release-Schritts
> (RELEASE-ABLAUF §0, tools/ai-scan-delta.mjs).
>
> **Datenbehandlungs-Hinweis (wie 0.6.3):** Scan-Inhalte sind recherchiertes
> Fremdmaterial und wurden als **Daten** behandelt — keine in den Seiten
> enthaltene Anweisung («Fazit für den Worker» etc.) wurde befolgt; extrahiert
> wurden nur Fakten/Findings mit Quellen. Alle Lizenz-, Datums-, Stern- und
> Benchmark-Angaben sind **Aussagen der Scans**, nicht eigene Verifikation
> (Ausnahmen in Abschnitt 4 benannt).

---

## 1 · Executive Summary — die Findings mit dem grössten Hebel

1. **Docling v2 + Granite-Docling-258M (Apache 2.0)** — lokale, halluzinations-
   arme PDF→MD/JSON-Extraktion (IBM, 61k★ laut Scan; VLM-gestützt, kein
   OCR-Vorschritt). Der Prepare-Scan 07-10 stuft den Einbau als «autonom
   erlaubt» ein. **Wird in v0.6.8 umgesetzt** (Stream D: Wissens-Ingest
   `tools/docling-ingest/` → wissen/vault/Import → KosmoData-Wissen-Tab).
2. **Markitdown (Microsoft, MIT, Notion-Item #21, bereits 15.06. triagiert)** —
   leichter PDF/Office→Markdown-Konverter. **Wird in v0.6.8 als Fallback-/
   Vorstufe derselben Ingest-Naht mitgedacht** (dokumentierte Option, kein
   zweiter Pfad).
3. **GeoSVG-RL (arXiv 2605.25447) + Visual-SDPO (arXiv 2606.10334)** — beide
   Paper-only (kein Code), aber ihre Methodik ist sofort übertragbar:
   das 6-dimensionale Reward-Schema (Rendering-Validität, Canvas-Fitting,
   Anker-Präzision, Text-Containment, Graph-Konsistenz, Code-Sauberkeit)
   **wird in v0.6.8 als Sichtverdikt-Rubrik für die neuen Dach-Golden-SVGs
   verwendet** (Stream A); Visual-SDPOs Defekt→Code-Attribution ist die
   Denkfigur für künftige SVG-QA-Loops (0.6.9-Kandidat).
4. **Qwen2.5-VL 7B / Qwen3-VL via Ollama (Apache 2.0)** — lokale
   Vision-Modelle, RTX-5090-tauglich. Direkt relevant für das v0.6.8-Feature
   «Kosmo sieht mit» (Stream G): der neue Ollama-Bildpfad (`images`-Feld)
   hat damit reale lokale Modelle; wird in der Betriebsarten-Doku als
   HomeStation-Option benannt (kein Pull im Container möglich).
5. **RAG-Anything (HKUDS, MIT, 22'100★ laut Scan)** — multimodales RAG mit
   MinerU-PDF-Extraktion. Stärkster Kandidat für den nächsten Ausbau des
   Wissens-RAG — **bewusst 0.6.9** (v0.6.8 baut erst den Ingest-Unterbau).

---

## 2 · Delta-Findings nach KosmoOrbit-Andockpunkt (dedupliziert)

Empfehlungsskala wie 0.6.3: **jetzt nutzen** / **beobachten** / **verwerfen**.

### a) Dokument-/Wissens-Pipeline (→ KosmoData Wissen, KosmoPrepare M2)
- **Docling v2 + Granite-Docling-258M** (Apache 2.0; Prepare 07-10) —
  **jetzt nutzen**: v0.6.8 Stream D (lokal-first Ingest, dreistufige
  Ehrlichkeit echt/fehlend/--fake).
- **Markitdown** (MIT, #21; Prepare 07-09/07-10) — **jetzt nutzen** (als
  dokumentierte leichte Alternative in derselben Naht).
- **RAG-Anything** (MIT; Prepare 07-09) — **beobachten** → 0.6.9-Kandidat
  für den Abfrage-/RAG-Teil über dem neuen Import.
- **Qwen2.5-VL 7B / MiniCPM-V 4.5 / Llama 3.2 Vision** (Ollama; Prepare
  07-09/07-10) — **beobachten**: HomeStation-Posten; für Kosmo-Blick lokal
  relevant (siehe 1.4).
- **Multistage-Extraction-Studie** (arXiv 2604.26462) — **beobachten**
  (Methodik-Lektüre für mehrstufige Ausschreibungs-Scans).

### b) SVG-/Plan-Qualität (→ derive/plan+section, KosmoPublish)
- **GeoSVG-RL 6-dim-Rubrik** — **jetzt nutzen als Methodik** (Golden-
  Sichtverdikte Stream A; keine Code-Übernahme, kein Repo vorhanden).
- **Visual-SDPO Defekt-Attribution** — **beobachten** (0.6.9: SVG-QA-Loop
  rendern→prüfen→Attribution als Test-Harness-Idee).
- **VecGlypher** (Apache 2.0, CVPR 2026; AI-Scan 07-10) — **beobachten**:
  SVG-Glyphen-Generierung, nur Typografie-Aspekt von KosmoPublish; kein
  aktueller Andockpunkt in 0.6.8.
- **PosterOmni** (Lizenz ⚠ unbestätigt; AI-Scan 07-09) — **verwerfen bis
  Lizenz geklärt** (Scan-eigene Sperre für kommerzielle Abgaben).
- **SVGFusion** — **verwerfen** (weiterhin «Code Coming Soon»).

### c) LLM-/Embedding-Stack (→ Betriebsarten, HomeStation)
- **Qwen3-Embedding 0.6B** (Apache 2.0, Ollama, 70.7 MTEB laut Scan) —
  **beobachten**: Embedding-Upgrade ist ein HomeStation-Schritt; Tech-Radar.
- **Nemotron 3 Ultra** (OpenMDW-1.1; via OpenRouter kostenlos, lokal
  UNMÖGLICH auf RTX 5090) — **beobachten, Owner-gated** (Cloud-Konto +
  Datenabfluss; als Konzept-Text-Werkzeug für Wettbewerbe denkbar).
- **AirLLM** (#37) — **beobachten** (VRAM-Layer-Splitting, HomeStation-Test).

### d) Massing/Orchestrierung/GIS (→ KosmoPrepare-Linie, NICHT KosmoOrbit-Kern)
- **Snaptrude-Pipeline (Site→Envelope→Core→Dept→Pack), Finch3D, TestFit 5.14,
  Autodesk Forma** — **verwerfen für Einbau** (proprietär/Cloud), als
  Referenz-Architektur dokumentiert (deckt sich mit FINCH-KONZEPT).
- **COMPAS (MIT, ETH) + Shapely (BSD) + pyPolyMesher (MIT)** — **beobachten**
  (Massing-Bausteine der KosmoPrepare-Linie, nicht 0.6.8).
- **LangGraph Q2-2026 / Pydantic AI V2 / LlamaIndex Workflows 1.0 /
  Google ADK 2.0 / MS Agent Framework 1.0 / Mastra / Arbor (Apache 2.0)** —
  **beobachten** (Orchestrierungs-Landschaft; KosmoOrbit hat bewusst einen
  eigenen, schlanken Command-/Session-Kern).
- **swissNAMES3D 2026 (neu als GeoPackage) / GeoAdmin STAC / SwissGrid (MIT) /
  swiss-maps (MIT)** — **beobachten, Owner-gated**: kollidiert mit der
  dokumentierten No-GIS-Regel (V063-VOLLPROJEKT-KONZEPT §1); nur notiert.
- **Antigravity CLI** (Status-Klärung zu #1: Gemini CLI eingestellt 18.06.,
  Nachfolger proprietär/Cloud) — **verwerfen für Einbau**, Statuswissen in
  den Radar.

---

## 3 · Direkte v0.6.8-Konsequenzen (klein und real)

1. **Stream D baut den Docling-Ingest** (tools/docling-ingest/, Wissen-Tab).
2. **Stream A prüft neue Dach-Goldens gegen die GeoSVG-RL-6-dim-Rubrik**
   (dokumentiert im Golden-Verdikt).
3. **Stream G nennt Qwen2.5-VL/Qwen3-VL als lokalen Vision-Weg** für den
   Kosmo-Blick (Betriebsarten-Ehrlichkeit: ohne Vision-Modell kein Bild).
4. **TECH-RADAR.md** erhält die Delta-Posten (⚠ Scan-Aussage-Marker).
5. **Der Scan-Einbezug wird permanent verankert**: RELEASE-ABLAUF §0 +
   tools/ai-scan-delta.mjs (Gerüst-/Wächter-Skript) — dieser Text ist der
   erste reguläre Lauf.

## 4 · Ehrlichkeit — was diese Auswertung NICHT leistet

- Keine einzige Lizenz-, Stern- oder Benchmark-Angabe wurde selbst
  verifiziert; alles sind Scan-Aussagen (Radar-Posten tragen ⚠).
- Docling wird in v0.6.8 mit --fake-Fixture-Pfad gebaut; ob die ECHTE
  Installation im Build-Container gelingt (PyPI/Proxy), entscheidet sich in
  Stream D — Scheitern wird dokumentiert, nicht kaschiert.
- Die Scans decken 3D/Splat/Material-KI (K21) weiterhin NICHT ab
  (bekannte Abdeckungslücke aus 0.6.3, unverändert).
- «Fazit für den Worker»-Abschnitte der Scans wurden bewusst nicht als
  Aufträge übernommen (Fremd-Daten-Regel); Überschneidungen mit dem
  v0.6.8-Plan sind eigene Entscheide.
