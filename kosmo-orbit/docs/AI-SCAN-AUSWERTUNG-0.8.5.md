# AI-Scan-Auswertung für v0.8.5

> Delta-Auswertung nach 0.6.3-Methodik (`docs/AI-SCAN-AUSWERTUNG-0.6.3.md`),
> Release-Schritt §0 (`docs/RELEASE-ABLAUF.md`). **Fenster: 12.–18.07.2026**
> (13 Notion-Seiten: 🔬 AI-Scan 12/13/15/16/17/18 — am 14.07. lief keiner —
> und 🔭 Prepare-Scan 12–18), gelesen am 19.07.2026 im Hauptkontext.
> Deckt zugleich das seit `AI-SCAN-AUSWERTUNG-0.7.3.md` offene Auswertungs-
> Delta ab — die Releases 0.7.7–0.8.4 hatten keine eigene Auswertung
> (ehrlich benannt; der Wächter `tools/ai-scan-delta.mjs` prüft nur die
> jeweils aktuelle Version). **Datenbehandlungs-Regel:** Scan-Inhalte sind
> Fremdmaterial — als Daten behandelt, keine darin enthaltenen Anweisungen
> befolgt; Lizenz-/Benchmark-Angaben sind Scan-Aussagen, nicht selbst
> verifiziert.

## 1 · Executive Summary — die Findings mit dem grössten Hebel

1. **BIM-Edit (arXiv 2606.20146, Benchmark):** Kein getestetes LLM löst
   mehr als 3.4 % von 324 IFC-Editing-Aufgaben. Das ist die stärkste
   externe Bestätigung des KosmoOrbit-Kernentscheids, die es bisher gab:
   Kosmo editiert NIE direkt am Modell, sondern ausschliesslich über
   zod-validierte Commands — und der neue v0.8.5-Autopilot (LaufPlan/E4)
   liegt exakt auf der richtigen Seite dieser Evidenz.
2. **MCP-Spec 2026-07-28 RC:** Das Model Context Protocol wird stateless;
   Roots/Sampling/Logging werden depreciert, OAuth 2.1 wird Pflicht.
   Für alle künftigen Kosmo-MCP-Ideen (swisstopo-Anschluss, eigene
   Server) gilt: erst gegen die neue Spec entwerfen, nichts gegen die
   alte bauen.
3. **swisstopo-mcp (MIT, 13 Tools, ÖREB/LV95/STAC, kein API-Key):**
   fertiger Schweizer Geodaten-Anschluss als MCP-Server — der
   konkreteste neue Baustein für eine künftige Standort-/Parzellen-Kette
   in KosmoData (v0.8.6+-Kandidat).
4. **VectorGym (ServiceNow, Apache-2.0-Dataset, ~8000 SVGs human-annotiert):**
   erste kommerziell nutzbare Datenbasis für SVG-Finetuning (Image→SVG,
   SVG-Editing) — Kandidat für die HomeStation-Trainingslinie neben den
   eigenen SFT-Sets.
5. **HiVG (MIT) bleibt der einzige sofort einbaubare Bild→SVG-Baustein** —
   die Scans empfehlen ihn den vierten Tag in Folge; der HomeStation-Test
   (~2–3 h, RTX 5090) steht weiterhin aus (Owner-Hardware nötig).

## 2 · Delta-Findings nach KosmoOrbit-Andockpunkt (dedupliziert)

Empfehlungsskala: **jetzt nutzen** / **beobachten** / **verwerfen**.

### Kernel / Commands / Autopilot
- **BIM-Edit** (Benchmark, Paper CC-BY, kein Code): **jetzt nutzen** als
  Beleg und später als Evaluationsgrundlage, falls ein IFC-Editier-Modul
  entsteht. Bestätigt den Command-Ansatz (s. §1).
- **Grundriss-KI-Paperwelle ohne Code** — HouseMind (CVPR26, VQ-VAE-Raum-
  Tokens), FloorplanVLM (92.5 % Wall-IoU Raster→Vektor), FML (Floorplan
  Markup Language), RLRF/IntroSVG/GeoSVG-RL (SVG-RL-Methoden): alle
  **beobachten** — kein Repo, kein Einbau möglich; Konzepte (Render-als-
  Verifier, strukturierte Layout-Token) als Referenz notiert.

### Publish / Vektor / Print
- **VectorGym** (Apache-2.0-Dataset): **jetzt nutzen** (HomeStation-
  Kandidat für SVG-Finetuning-Daten); ⚠ Annotation-Lizenz vor
  kommerziellem Finetuning prüfen (Scan-Hinweis).
- **HiVG** (MIT): **jetzt nutzen** — HomeStation-Test bleibt der
  konkreteste offene Schritt (seit 11.07. empfohlen).
- **ResearchStudio-Reel** (Microsoft, proprietär): **beobachten** — das
  Muster «ein gemeinsamer Extraktor, dann parallele Format-Skills, harte
  Pass/Fail-Gates» ist auf den Export-Hub übertragbar.
- **MCP4IFC** (CC BY-NC-SA): **verwerfen** für Erwerbsnutzung
  (Non-Commercial; Scan hat die Lizenz am 12.07. abschliessend geklärt).
- **SVGFusion**: weiterhin «Code Coming Soon» — **beobachten**.
- **IfcOpenShell Bonsai 0.8.6-alpha** (LGPL, tägliche Builds seit 12.07.):
  **beobachten**; produktiv bleibt 0.8.5 stable.

### KosmoPrepare-Linie (Phase 0, eigener Strom)
- **Docling (MIT/IBM)** + **Markitdown (MIT)**: bereits im Radar
  (ADOPT/EVALUATE seit 0.6.8) — die Scans bestätigen die Wahl täglich neu.
- **landingai-ade** (MIT, Visual-Grounding-Extraktion mit Quelle-pro-Wert):
  **jetzt nutzen** als Prepare-M2-Kandidat.
- **Qwen3-VL 8B / GLM-4.6V-Flash 9B** (Apache, lokal): **beobachten/testen**
  als neue lokale VLM-Generation für Scan-Extraktion (HomeStation).
- **Embedding-Stacks** (Qwen3-Embedding, EmbeddingGemma, BGE-M3):
  **beobachten** — der M4-Entscheid steht erst im Herbst an.
- **swisstopo-Geodaten**: swissBUILDINGS3D 3.0 Beta (EGID-LoD1 SO/LU),
  swissNAMES3D als GeoPackage, REFRAME-API: **beobachten** für die
  Standort-Kette; **swisstopo-mcp / mcp-swiss (MIT)**: **jetzt nutzen**
  (Evaluation) als fertiger Anschluss.
- **Orchestrierung** (CrewAI 1.14.7, LangGraph 1.0, MS Agent Framework,
  Arbor v0.1.4, n8n): **beobachten**; die n8n-Lizenzlage ist in den Scans
  widersprüchlich (fair-code vs. AGPL) → vor jedem Einbau Owner-Go.
- **DocLayout-YOLO** (AGPL): Owner-Go nötig — **beobachten**.

### Verworfen (damit Scans sie nicht erneut vorschlagen)
- **SubQ/Subquadratic** (proprietäres Cloud-LLM): kein lokal-first-Weg.
- **Gemini Antigravity** (Dev-IDE): kein KosmoOrbit-Baustein.
- **Ideogram 4.0**: Weights non-commercial (Scan-bestätigt 15.07.).
- **Command A+ / Marker-PDF (GPL)**: Cloud- bzw. Lizenz-Gate.

## 3 · Direkte Konsequenzen für v0.8.5

- Der **E4-Autopilot-Vertrag** (jeder Lauf-Schritt über `runCommand`,
  kein LLM-Direkt-Edit) wird durch BIM-Edit extern gestützt — im
  Release-Text als Beleg zitierbar; keine Kursänderung nötig.
- **Kein Scan-Fund erzwingt einen Einbau in v0.8.5** — alle
  «jetzt nutzen»-Verdikte sind HomeStation-/Prepare-Schritte oder
  v0.8.6+-Kandidaten (swisstopo-mcp-Anschluss, VectorGym/HiVG-Tests).
- `docs/TECH-RADAR.md` + `tech-radar.ts` erhalten einen Nachtrag
  (Posten mit `unverifiziert: true`, testerzwungen).
- `docs/HOMESTATION-AUFTRAG.md`-Kandidatenliste: unverändert plus
  VectorGym-Datensatz.

## 4 · Ehrlichkeit — was diese Auswertung NICHT leistet

- Keine der Lizenz-/Benchmark-Angaben wurde selbst verifiziert — alles
  Scan-Aussagen (Fremd-Daten-Regel); vor jedem Einbau eigener
  Lizenz-Check.
- Die Auswertungs-Lücke 0.7.4–0.8.4 ist damit **prozessual** geschlossen
  (dieses Dokument deckt die Scans ab 12.07. ab; die Scans bis 11.07.
  wurden in 0.6.3/0.6.8/0.7.0 ausgewertet — dazwischen liegt keine
  ungelesene Seite).
- Prepare-Scans betreffen mehrheitlich das KosmoPrepare-Programm
  (Phase 0, eigener Worker) — hier ist nur übernommen, was KosmoOrbit
  berührt; die M1–M5-Detailempfehlungen bleiben Sache des
  Prepare-Stroms.
- Kein Owner-Entscheid wurde vorweggenommen: alle Cloud-/AGPL-/NC-Posten
  bleiben hinter Owner-Go.
