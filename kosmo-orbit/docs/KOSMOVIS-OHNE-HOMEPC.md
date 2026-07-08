# KosmoVis ohne den Home-PC — Bestandsaufnahme und Wege nach vorn

> Stand 08.07.2026. Owner-Auftrag (v0.6.2): «Treiben wir KosmoVis weiter; wir
> müssen einen Weg finden, wie wir KosmoVis besser machen können, ohne den
> Home-PC zu brauchen.» Diese Datei belegt jeden Ist-Zustand mit Pfad/Zeile,
> prüft drei ehrliche Wege und schliesst mit einer Batch-Empfehlung. Kein
> Code wurde für diese Untersuchung verändert.

## 0 · Kurzfassung

Heute rendert KosmoVis **kein einziges Pixel selbst** — die Station ist ein
Job-Client, der ein GLB baut und an eine externe Bridge schickt; ohne
angedockten Worker antwortet nur der Fake-Worker mit einem eingefärbten
Platzhalter. Drei ehrliche Wege, davon unabhängig zu werden:

- **(a) In-App-Qualität** — three.js im Client aufwerten (Umgebungslicht,
  Tonwertabbildung, weiche Schatten, evtl. ein WebGL2-Pfadtracer). Geht
  **sofort**, ohne Konto, ohne laufende Kosten, ohne Datenabfluss. Deckt nur
  die *bestehende* geometrische Voransicht ab — kein fotorealer KI-Look.
- **(b) Cloud-Bild-API mit Schlüssel** — ein gehosteter Diffusionsdienst
  (Flux/SDXL bei Replicate oder fal.ai) als zweiter `requested_engine`-Wert.
  Bezahlt, das Modell verlässt das Büro, aber sofort fotorealer Look ohne
  GPU-Warten. Braucht einen Owner-Entscheid (Schlüssel + laufende Kosten).
- **(c) bleibt HomeStation** — lokale LoRA-Inferenz, Blender-Cycles
  (kostenlos + alles bleibt im Haus), grosse Batch-Serien.

**Empfehlung:** (a) als nächster Batch (0.6.x) — sofort machbar, kostenlos,
kein Datenschutzrisiko, im Container mit SwiftShader testbar. (b) geht als
**Entscheidungsvorlage** an den Owner (§5.2), weil sie Schlüssel und laufende
Kosten braucht — keine Technikfrage, sondern eine Owner-Entscheidung wie
schon bei B3/D1 in `docs/V2-ENTSCHEIDUNGSVORLAGE.md`.

**Wichtige Richtigstellung:** Anthropic/Claude erzeugt **keine Bilder**. Die
Claude-API ist text-/bildlesend (Vision-Input) und werkzeugnutzend, aber es
gibt keinen Bild-Generierungs-Endpunkt [9]. Falls irgendwo die Annahme
steckt, «Kosmo (Claude) könnte selbst rendern» — das ist falsch. Ein
Cloud-Bildweg braucht einen **eigenen** Anbieter (Stable-Diffusion-/
Flux-Host), nicht Anthropic.

---

## 1 · Die heutige Kette — Inventar mit Belegen

### 1.1 KosmoVis-Station (Node-Tree, vis-runtime)

`apps/kosmo-orbit/src/modules/vis/` enthält **kein three.js und keinen
lokalen Rendercode**. Die Station ist ein Job-Dispatch-Client: Modell → GLB
(im Browser) → `POST` an die Bridge → Polling → Bild anzeigen — so
beschreibt es `VisWorkspace.tsx:20-22` selbst («KosmoVis — Render-Jobs an
die HomeStation … Modell → GLB → Bridge … Ergebnis mit Doppel-QA-Verdikt
zurück»).

Der **Node-Tree** (`packages/kosmo-kernel/src/derive/visgraph.ts`, Katalog
`VIS_NODE_KATALOG`) ist real und fertig gebaut (ROADMAP 120): 10 Node-Typen
(Modell, Material, Prompt, Stimmung, Kombinierer mit Live-Prompt, Zahl,
**Render**, Bildvergleich/QA, Aufs-Blatt, Bild-Referenz), Zyklenprüfung,
Kahn-Topologie, pull-basierte Auswertung — **nur der Render-Node ist ein
expliziter, nie automatischer Auftrag** an die Bridge (`visgraph.ts:6-12`).
Der Graph selbst (`VisGraph`-Entity) lebt im Doc (Undo/Yjs/`.kosmo` gratis).

`vis-runtime.ts` ist der Zustand-Store für Job-Status **ausserhalb** des
Docs — laut eigenem Kommentar bewusst: «Job-Status und Bilder wandern nie
durch Undo oder Yjs (kein Base64 im Sync)» (`vis-runtime.ts:4-9`). Ein
lokaler 10-Minuten-Zeitwächter markiert hängende Jobs, ausser während
`wartetFreigabe`, wo bewusst auf den Menschen gewartet wird (Zeile 66).

### 1.2 HomeStation-Bridge (`tools/homestation-bridge/`)

`kosmo_bridge/main.py` (FastAPI, ~1170 Zeilen) spricht schlichtes
HTTP/JSON/Multipart: `POST /jobs`, `GET /jobs/{id}`, `GET
/jobs/{id}/artifacts/{name}`, plus `/jobs/blender-sim`, `/jobs/video-splat`,
`/stt`, `/tts`, `/embed`. Blender/Cycles sind **dokumentiert und im Vertrag
verankert** (`requested_engine: 'cycles'|'ki'`, `blender-sim.ts`), aber **es
gibt keinen einzigen `subprocess`-Aufruf eines Blender-Binaries im Repo** —
der Worker existiert nicht, nur die Warteschlangen-Logik dafür.

**Was der `--fake-worker` GENAU liefert** (`_fake_worker_step`,
`main.py:967-1058`, höchstens ein Zustandssprung pro 1-Sekunden-Takt):

- Ein normaler Render-Job (`queued`→`running`→`done`) schreibt `cam-01.png`
  — eine handgebaute, abhängigkeitsfreie **640×400-PNG in Vollfarbe RGB
  (194, 94, 58)** («Kupferton», `_placeholder_png()`, `main.py:951-964`).
  Kein Sampling, keine Geometrie, keine Belichtung, keine simulierte
  Renderdauer.
- `render-result.json` trägt **erfundene, aber ehrlich beschriftete**
  QA-Werte (`style_score: 0.42`, `geometry_fidelity: 0.87`, je
  `method: "fake-worker"` — nie als echtes Verfahren getarnt).
- Für `blender-sim`/`video-splat` gibt es **keinen erfundenen Zahlenwert** —
  Status `kein-blender-worker`/`kein-sfm-worker` mit Begründung
  (`main.py:993-998`): «eine Platzhalter-Simulationszahl … könnte eine
  Bau-Entscheidung verseuchen.»

### 1.3 `render-scene/v1` (Vertrag) und Betriebsarten

`packages/kosmo-contracts/src/render-scene.ts` (zod) — Kernfelder:
`geometry.{path,format}`, `cameras`, `render.{resolution,samples,faithful,
sun}` (`faithful` = ControlNet-Stärke 0–1), `style.{mode,refs,prompt}` und
`vis.{skip,backbone,upscale}` mit `backbone: 'qwen'|'flux2-klein'|
'flux-krea'|'sdxl'`. Das ist **kein** reiner Pfadtracer-Auftrag — es ist ein
Bild-zu-Bild-Auftrag für ein lokales, über **ComfyUI** laufendes
Diffusionsmodell (`docs/HOMESTATION-AUFTRAG.md:13`, `docs/V2-AUFTAKT.md:31`),
das ein Cycles-Renderbild als geometrische Führung nimmt. `render-result.ts`
verlangt eine **Doppel-QA** (Stil DINOv3 ≥ 0.30 UND Geometrie-Treue
`sqrt(spearman × geom_iou)` ≥ 0.65).

`packages/kosmo-ai/src/betrieb.ts` (216 Zeilen, vollständig gelesen) ist
**mehr als LLM-Chat** — sie entscheidet, ob KosmoVis überhaupt einen
Render-Server hat: im Cloud-Modus ist `bridgeUrl` die **leere
Zeichenkette**. Das liest die Vis-UI direkt: `NodeCanvas.tsx:546`
(`cloudLeer={bridgeBase() === ''}`) deaktiviert den «Ausführen»-Knopf mit
dem Hinweis (`NodeCanvas.tsx:712`) «Kein HomeStation-Server verbunden — im
Cloud-Betrieb rendert die Kette nicht lokal.» `docs/BETRIEBSARTEN.md:16`
bestätigt: Cloud = Claude (mind. Opus 4.8), Bridge/Sync = «—». Cloud heisst
heute wörtlich **kein Render**.

### 1.4 Render-Prompt-Kette und GLB-Export

`packages/kosmo-kernel/src/derive/renderprompt.ts` (52 Zeilen) ist **keine
KI-Erfindung**, sondern eine deterministische Ableitung: liest die
äusserste Wandschicht jeder Wand, matcht den Materialnamen gegen eine
Regex-Tabelle (`sichtbeton→"Sichtbeton-Fassade"`, `holz→"Holzfassade
(vertikale Lattung)"` …) und ergänzt gezeichnete Fassadenraster. Läuft
**vollständig clientseitig**, kein Netzwerk.

`packages/kosmo-kernel/src/derive/gltf.ts` (`exportGlb`, 213 Zeilen) baut
ein binäres glTF 2.0 händisch, konvertiert mm→m und Z-oben→Y-oben,
Blender-lesbare Namen (z. B. «Wand AW Beton 40 · EG [a1b2c3]»). Läuft
**vollständig clientseitig**. Beide Ketten sind der Input für den
`POST /jobs`-Aufruf — nur dieser Schritt braucht die HomeStation.

### 1.5 Was GENAU braucht heute den HomePC — und was nicht

| Baustein | Läuft heute wo | Braucht HomePC? |
|---|---|---|
| Node-Tree-UI, Graph-Auswertung, Undo/Yjs | Browser, clientseitig | **Nein** |
| Render-Prompt-Ableitung, GLB-Export | Browser, reine Funktionen | **Nein** |
| `render-scene`/`render-result`-Verträge | reine zod-Schemas | **Nein** (definieren nur, was ein Worker erfüllen müsste) |
| Bridge-Warteschlange, Job-Lebenszyklus | Python/FastAPI, läuft überall | **Nein** als Software — **Ja** als Zielort des GPU-Workers |
| **Das eigentliche Rendern** (Cycles/ComfyUI-KI) | existiert **nirgends im Repo** | **Ja, heute exklusiv** — kein Fallback |
| Blender-Simulationen (Wind/Sonne/Energie) | kein Worker im Repo | **Ja, heute exklusiv** |
| Gaussian-Splat-**Erzeugung** (SfM/COLMAP) | kein Worker im Repo | **Ja** (Splat-**Anzeige** läuft laut `main.py:676-683` bereits lokal im Browser) |
| LoRA-Training | Rezept fertig, kein Lauf im Repo | **Ja** |

Kurz: **alles, was heute den Home-PC braucht, ist die Rechenarbeit selbst**
(Bildsynthese, Physik, Splat-Rekonstruktion, Training) — nicht die
Datenwege, Verträge oder App-Logik drumherum. Genau diese Lücke füllen (a)
und (b) unten.

---

## 2 · Option (a) — In-App-Qualitätspfad (three.js aufwerten)

### 2.1 Ist-Zustand und ungenutzte Tech-Radar-Entscheidung

Der lebende BIM-Viewport (`apps/kosmo-orbit/src/modules/design/Viewport3D.tsx`
— **nicht** KosmoVis, aber derselbe three.js-Stack, `three@^0.184.0`) setzt
heute nur Basis-Qualität: `new THREE.WebGLRenderer({antialias:true})`,
`shadowMap.enabled=true` mit `PCFSoftShadowMap` (Zeilen 273/275/276). Kein
`PMREMGenerator`/`RoomEnvironment` (Umgebungslicht/IBL), kein `toneMapping`,
kein AO.

`docs/TECH-RADAR.md:27` (verifiziert 02.07.2026) hat bereits entschieden:
«Renderview (Pathtracing) | **ADOPT** | `three-gpu-pathtracer` 0.0.24 | MIT
(0.x pinnen)» — das Paket ist aber **weder in `package.json` noch im
Quellcode** referenziert. Die Entscheidung steht seit über einer Woche im
Radar, nie umgesetzt.

### 2.2 Machbarkeit — was wirklich sofort geht

**three.js-Bordmittel (kein neues Paket nötig):** `PMREMGenerator` +
`RoomEnvironment` liefern Umgebungslicht/IBL über `scene.environment` [1],
`ACESFilmicToneMapping` ist eingebaut, `SSAOPass`/`GTAOPass` sind fertige
Ambient-Occlusion-Passes unter `three/addons/postprocessing/` [2] — alle
mit dem **bestehenden** `WebGLRenderer`, ohne WebGPU, ohne Pfadtracer.
Sofort machbar, kein Konto, kein Schlüssel.

**`three-gpu-pathtracer`** (v0.0.24, npm, ~1620 GitHub-Stars, aktiv
gepflegt, letzter Release 21.02.2026) [3] ist ein **WebGL2**-Pfadtracer
(Shader-Render-to-Texture-Akkumulation auf `three-mesh-bvh`) — **braucht
kein WebGPU**. Grenzen laut README [3]: pre-1.0, nur `MeshStandardMaterial`/
`MeshPhysicalMaterial`, keine Instanced-Geometrie, verrauschtes Rohbild
(eigenes `DenoiseMaterial` nötig), auf progressive Akkumulation ausgelegt —
passend für ein Stand-Render, nicht für den laufenden Navigations-Viewport.

**WebGPU in Tauri je Plattform** (relevant nur bei einem WebGPU- statt
WebGL2-Pfad): **Windows** (WebView2/Chromium) hat WebGPU seit Chrome/Edge
113, 2023 [4]. **macOS** (WKWebView/Safari) hat es standardmässig erst seit
**Safari 26** (macOS Tahoe, 2025/26) [5] — älteres macOS im Büro hätte es
nicht. **Linux** (WebKitGTK) liess sich **nicht verlässlich belegen**
(Statusseite nicht abrufbar; allgemeine Lage deutet auf Linux als
nachhinkende Plattform über alle Engines hin [6]). **Konsequenz:** Der
WebGL2-Pfadtracer umgeht dieses Plattformrisiko komplett — WebGL2 läuft
überall, wo three.js heute schon läuft.

Unabhängig davon: eine hochauflösende **Screenshot-Pipeline** braucht nur
den bestehenden Renderer mit temporär höherem `setPixelRatio`/`setSize` vor
dem Frame — kein neues Paket, passt in denselben Batch.

---

## 3 · Option (b) — Cloud-GPU mit Schlüssel

**Anthropic/Claude erzeugt keine Bilder** [9] — ein Cloud-Render-Ersatz
braucht einen **zweiten, eigenen** Anbieter- und Schlüsseltyp, nie den
bestehenden Claude-Schlüssel. Zwei unterscheidbare Wege: (1) **Bild-zu-Bild
mit Geometrie-Führung** — das, was `render-scene.style` heute schon
verlangt (ControlNet-artige `faithful`-Steuerung); ein generischer
Bild-API-Host bietet dafür meist **kein** fertiges ControlNet-Depth-Preset
— müsste selbst zusammengesetzt werden (Depth-Map aus GLB → Referenzbild).
(2) **Reine Text-zu-Bild-Stimmungsbilder** — einfacher, aber ohne
Geometrie-Treue würde das Doppel-QA-Gate (§1.3) bei der Geometrie-Hälfte
typischerweise durchfallen.

**Kostenrahmen** (Review-Nachtrag 08.07.2026: live von den Modellseiten
geholt — die Preisangaben stammen aus den strukturierten Pricing-Blöcken
der jeweiligen Seite, per Direktabruf verifiziert [7][8]):

| Anbieter | Modell | Preis |
|---|---|---|
| Replicate | Flux Schnell | **$0.003**/Bild ($3 pro 1'000) |
| Replicate | Flux Dev | **$0.025**/Bild |
| Replicate | Flux 1.1 Pro | **$0.04**/Bild |
| Replicate | Flux 1.1 Pro Ultra | **$0.06**/Bild |
| fal.ai | Flux Schnell | **$0.003**/Megapixel (1024² ≈ 1 MP) |
| fal.ai | Flux Dev | **$0.025**/Megapixel |
| fal.ai | Flux 1.1 Pro | **$0.04**/Megapixel |
| fal.ai | Flux 1.1 Pro Ultra | **$0.06**/Bild |

Flux Schnell (billigstes Modell beider Anbieter) wäre der naheliegende
Einstieg — Cent-Beträge pro Klick bei einer «Drei Stimmungen»-Serie, aber
bei grossen Batch-Serien (§4) summiert sich das linear.

**Datenschutz:** Sobald ein Cloud-Bild-Dienst angefragt wird, verlässt das
Modell (Prompt, ggf. Depth-Map aus dem GLB) das Büro und läuft auf fremder
Infrastruktur (Replicate/fal.ai — USA-basiert, kein Schweizer/EU-Standort
garantiert). Anders als der lokale HomeStation-Pfad, wo nichts das Büronetz
verlässt — für Bauherren-Vertraulichkeit eine **Owner-Entscheidung**, genau
wie beim bestehenden Claude-Cloud-Fallback (`docs/BETRIEBSARTEN.md`).

**Einordnung in die bestehende Betriebsarten-/Schlüssel-Logik:**
`betrieb.ts` kennt bereits das Muster «im Cloud-Modus fehlt ein lokaler
Dienst, Schlüssel ersetzt ihn» (additiv erweiterbar, ohne bestehende Felder
anzufassen); `docs/CLOUD-LOGIN-ABO.md` zeigt das schon gebaute
Schlüssel-/Token-Muster im Kosmo-Panel, das ein zweiter Schlüssel
wiederverwenden würde; der `cloudLeer`-Gate am Render-Node wäre additiv um
einen dritten Zustand erweiterbar. **Was NICHT automatisch passt:** der
`vis.backbone`-Wert ist auf die lokalen HomeStation-Modelle zugeschnitten —
ein Cloud-Host bräuchte einen neuen, additiven `backbone`-Wert (wie
`vis.skip`/`requested_engine` schon additiv ergänzt wurden, ROADMAP
177/182), keinen Ersatz der bestehenden Werte.

---

## 4 · Option (c) — was ehrlich HomeStation bleibt

Diese Punkte sind mit (a) oder (b) **nicht** ablösbar — gebunden an die
lokale RTX 5090 oder an kostenlose/private Rechenzeit, nicht an ein
technisches Detail, das sich in der Cloud nachbauen liesse:

- **LoRA-Inferenz/Training lokal** — der Kosmo-Persona-Chat-LoRA
  (`docs/KOSMOTRAIN.md`) und, taggleich mit diesem Auftrag entschieden, der
  **Imaging-LoRA** für den Büro-Stil (`docs/LORA-KONZEPT.md`, Owner-Auftrag
  v0.6.2 vom 08.07.2026). Er hängt sich laut Konzept **genau an der
  ComfyUI-Nahtstelle der Bridge** ein (`LORA-KONZEPT.md:350`) — ein
  Cloud-Bild-Dienst hat keinen Checkpoint-Ladeplatz dafür; Trainingsdaten
  sollen zudem das Haus nicht verlassen.
- **Blender-Cycles gratis + privat** — Open-Source-Rendering ohne
  API-Kosten; ein Cloud-Cycles-Server wäre selbst Betriebsaufwand (eigener
  Server, eigene GPU-Miete), kein «Schlüssel besorgen»-Fall wie (b).
- **Grosse Batches** («Drei Stimmungen», Serien, Volumenstudien) — bei
  Cloud-API-Abrechnung pro Bild skaliert die Kostenkurve linear mit der
  Seriengrösse; die HomeStation-GPU kostet bei vorhandener Hardware nur
  Strom.

---

## 5 · Empfehlung — erster Batch (0.6.x)

### 5.1 Batch-Spec: «In-App-Renderqualität» (Option a)

**Ziel:** Der bestehende BIM-Viewport (nicht KosmoVis selbst) bekommt
Umgebungslicht (IBL/PMREM), Tonwertabbildung und optional Ambient
Occlusion, ohne die HomeStation zu berühren — eine Qualitätsverbesserung
der Live-3D-Voransicht, keine Ersetzung des KosmoVis-Renderpfads (beide
bleiben getrennte Konzepte: schneller Viewport vs. fotorealer
HomeStation-Render).

**Dateien:** `apps/kosmo-orbit/src/modules/design/Viewport3D.tsx` —
Renderer-Setup (`PMREMGenerator`/`RoomEnvironment`, `toneMapping`, ggf.
`outputColorSpace`), Materialien bleiben `MeshStandardMaterial`-kompatibel.
Kein Kernel-Diff zu erwarten — reine Darstellungsschicht; Goldens
(`test/golden/*.svg`) sind plansvg-Ausgaben und bleiben unberührt. Falls ein
Pfadtracer-Modus ergänzt wird: eigener, default-aus geschalteter Modus,
analog zum «nur Cycles»-Schalter am Render-Node (ROADMAP 182) — nie Ersatz
des Standard-Viewports.

**Testbarkeit im Container mit SwiftShader:** `playwright.config.ts:5+22`
bestätigt, dass die E2E-Suite bereits ohne echte GPU läuft
(`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`). Ein
reiner `WebGLRenderer`-Ausbau ist darin voll lauffähig — SwiftShader
emuliert WebGL2 vollständig, nur langsam. Ein WebGPU-Pfad wäre unter
SwiftShader nicht per se getestet (§2.2) — dafür bräuchte es entweder einen
Software-WebGPU-Pfad im CI oder einen bewussten, begründeten Test-Skip
(ROADMAP-Muster «1 ehrlicher STT-Skip» statt stillem Fake).

**E2E-Machbarkeit:** Ein Screenshot-Vergleichstest ist im bestehenden
Playwright-Rundgang-Muster (`e2e/tools/rundgang.mts`) ergänzbar; ein reiner
Pixel-Diff ist bei Beleuchtungsänderungen bewusst locker zu fassen (kein
Golden-SVG-Byte-Vergleich, sondern ein Sichtprüfungs-Screenshot).

### 5.2 Entscheidungsvorlage für (b) — an den Owner

| Frage | Was zur Entscheidung ansteht |
|---|---|
| Anbieter | Replicate vs. fal.ai — Kostenvergleich siehe §3, vergleichbare Preise |
| Modell | Flux Schnell (billig/schnell) für einen ersten Testlauf vs. Flux Dev/Pro (teurer, besser) für später |
| Schlüssel | Eigener API-Schlüssel des Büros, im Kosmo-Panel hinterlegt (wie Anthropic-Schlüssel/OAuth heute schon) |
| Kosten | Laufend, pro Bild — Owner legt Budget/Limit fest (z. B. «nur auf Klick, nie automatisch in Serien») |
| Datenschutz | Modell/Prompt/Depth-Map verlässt das Büro — **Owner muss das für Bauherren-Vertraulichkeit absegnen** |
| Aufwand | S–M (Owner-Blockskala aus `V2-ENTSCHEIDUNGSVORLAGE.md`) — neuer `vis.backbone`-Wert additiv, neuer Schlüsseltyp im Panel, kein Bruch bestehender Verträge |

**Diese Entscheidung fällt der Owner, nicht der Code** — wie schon bei B3
(Anthropic-Provider) und D1 (Signatur-Keys) in `docs/V2-ENTSCHEIDUNGSVORLAGE.md`.

---

## 6 · Quellen

**Repo-Belege** (im Text mit Pfad/Zeile zitiert): `apps/kosmo-orbit/src/modules/vis/{VisWorkspace.tsx,NodeCanvas.tsx,vis-runtime.ts}`,
`packages/kosmo-kernel/src/derive/{visgraph.ts,renderprompt.ts,gltf.ts}`,
`packages/kosmo-contracts/src/{render-scene.ts,render-result.ts}`,
`packages/kosmo-ai/src/betrieb.ts`, `tools/homestation-bridge/kosmo_bridge/main.py`,
`apps/kosmo-orbit/src/modules/design/Viewport3D.tsx`, `apps/kosmo-orbit/package.json`,
`playwright.config.ts`, `docs/{HOMESTATION-AUFTRAG.md,BETRIEBSARTEN.md,TECH-RADAR.md,
CLOUD-LOGIN-ABO.md,V2-ENTSCHEIDUNGSVORLAGE.md,LORA-KONZEPT.md,V2-AUFTAKT.md}`,
`ROADMAP.md` (Einträge 120, 140, 157, 172, 177, 182, 189, 213–221).

**Externe Quellen (Web):**

1. three.js Docs — `RoomEnvironment`/`PMREMGenerator`: https://threejs.org/docs/pages/RoomEnvironment.html, https://threejs.org/docs/#api/en/extras/PMREMGenerator
2. three.js Docs — `SSAOPass`/`GTAOPass`: https://threejs.org/docs/pages/SSAOPass.html, https://threejs.org/docs/pages/GTAOPass.html
3. `three-gpu-pathtracer` (gkjohnson) — Repo/README: https://github.com/gkjohnson/three-gpu-pathtracer
4. WebGPU-Support grosser Browser (Chrome/Edge 113, 2023): https://web.dev/blog/webgpu-supported-major-browsers
5. WebKit — Safari 26 WebGPU (WWDC25): https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/
6. WebKitGTK/Linux: WebGPU NICHT implementiert — Maintainer-Aussage «WebGPU is not supported and nobody is working on it» (Okt. 2023, https://www.mail-archive.com/webkit-gtk@lists.webkit.org/msg03883.html), unverändert bis WebKitGTK 2.52 (März 2026, https://webkitgtk.org/2026/03/18/webkitgtk-2.52-highlights.html); Übersicht: https://github.com/gpuweb/gpuweb/wiki/Implementation-Status
7. Replicate Pricing (Flux-Familie): https://replicate.com/pricing, https://replicate.com/black-forest-labs/flux-1.1-pro
8. fal.ai Pricing (Flux-Familie): https://fal.ai/pricing, https://fal.ai/flux
9. Claude-API — Vision/Modelle (kein Bild-Ausgabe-Endpunkt): https://platform.claude.com/docs/en/build-with-claude/vision, https://platform.claude.com/docs/en/about-claude/models/overview

Review-Nachtrag (Fable, 08.07.2026): Punkt 6 (WebKitGTK/Linux: kein
WebGPU) und die Preise unter 7/8 wurden in einer zweiten Recherche-Runde
live gegen die Originalquellen verifiziert (Direktabruf der Modellseiten
bzw. Maintainer-Mailingliste + Release-Highlights) — der ursprüngliche
Vorbehalt ist damit aufgehoben. Preise können sich ändern; vor der
Owner-Entscheidung (§5.2) bleibt ein aktueller Blick auf die Preisseite
sinnvoll.
