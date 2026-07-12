/**
 * Technik-PDF «KosmoOrbit — Technik & Bau» (Stand v0.7.4, 12.07.).
 * Reines Dokument (keine Screenshots): Architektur, Stack (Dritt vs. Eigenbau),
 * Funktionen und die ehrliche Bau-Story. HTML → Chromium print, A4 hoch.
 * Ablage abgabe/KOSMOORBIT-TECHNIK-0.7.4.pdf.
 *
 * Aufruf (aus kosmo-orbit/):
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx tsx e2e/tools/technik-pdf-074.mts
 */
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const OUT = `${ROOT}abgabe/KOSMOORBIT-TECHNIK-0.7.4.pdf`;
mkdirSync(`${ROOT}abgabe/`, { recursive: true });
const WORK = join(tmpdir(), 'kosmo-technik-074');
mkdirSync(WORK, { recursive: true });

const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
  @page { size: A4 portrait; margin: 18mm 16mm; }
  :root { --ink:#1a1815; --soft:#5c574d; --line:#d9d4c8; --paper:#f6f4ee; --accent:#0e766c; --accent-weich:#e2efed; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", system-ui, -apple-system, sans-serif; color: var(--ink); font-size: 11.2px; line-height: 1.5; }
  h1 { font-size: 27px; letter-spacing: 0.02em; margin: 0 0 4px; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing: 0.09em; color: var(--ink);
       border-bottom: 2px solid var(--ink); padding-bottom: 5px; margin: 0 0 10px; }
  h3 { font-size: 12.5px; margin: 14px 0 4px; color: var(--accent); letter-spacing: 0.02em; }
  p { margin: 0 0 8px; } ul { margin: 0 0 8px; padding-left: 18px; } li { margin: 2px 0; }
  code { font-family: "IBM Plex Mono", ui-monospace, Menlo, monospace; font-size: 10px; background: var(--paper);
         padding: 0 3px; border-radius: 2px; }
  .kapitel { page-break-before: always; }
  .kapitel:first-of-type { page-break-before: avoid; }
  .eyebrow { font-family: "IBM Plex Mono", monospace; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent); }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 10px; font-size: 10.3px; }
  th, td { text-align: left; padding: 4px 7px; border-bottom: 1px solid var(--line); vertical-align: top; }
  th { background: var(--paper); font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--soft); }
  td code { background: none; padding: 0; }
  .zahlen { display: flex; gap: 8px; margin: 12px 0 4px; }
  .zahl { flex: 1; background: var(--paper); border: 1px solid var(--line); border-radius: 5px; padding: 8px; text-align: center; }
  .zahl b { display: block; font-size: 19px; } .zahl span { font-size: 9px; color: var(--soft); }
  .merk { background: var(--accent-weich); border-left: 3px solid var(--accent); padding: 8px 11px; font-size: 10.6px; margin: 8px 0; border-radius: 0 4px 4px 0; }
  .klein { font-size: 9.5px; color: var(--soft); }
  .titel-meta { color: var(--soft); font-size: 12px; margin-bottom: 14px; }
  .zweispalt { column-count: 2; column-gap: 16px; }
  .tag { display: inline-block; font-family: "IBM Plex Mono", monospace; font-size: 8.5px; font-weight: 700; letter-spacing: 0.08em;
         padding: 1px 6px; border-radius: 3px; background: var(--ink); color: var(--paper); vertical-align: middle; }
  .tag.eigen { background: var(--accent); color: #fff; }
</style></head><body>

<!-- Deckblatt -->
<section class="kapitel">
  <div class="eyebrow">Technische Dokumentation · Stand v0.7.4 · 12.07.2026</div>
  <h1>KosmoOrbit — Technik &amp; Bau</h1>
  <p class="titel-meta">Die Architektur-Designzentrale des Baubüros ArchitekturKosmos.
  Ein lokal-first Monorepo für Architektur/BIM mit steuernder Büro-KI «Kosmo» — was darin
  eingekaufte Technologie ist, was Eigenbau, welche Funktionen es gibt, und wie es gebaut wurde.</p>
  <div class="zahlen">
    <div class="zahl"><b>8</b><span>Workspaces (7 Pakete + App)</span></div>
    <div class="zahl"><b>~102</b><span>Commands = Kosmos Können</span></div>
    <div class="zahl"><b>~60</b><span>pure Derive-Funktionen</span></div>
    <div class="zahl"><b>765/847</b><span>Kernel-/App-Tests grün</span></div>
  </div>
  <div class="merk"><strong>In einem Satz:</strong> Alles ist ein <em>Command</em> mit einem
  zod-Schema; jedes Schema wird automatisch ein Kosmo-LLM-Werkzeug. Ein Command gibt Patches
  zurück — daraus fliessen Undo, Yjs-Sync und die <code>.kosmo</code>-Pakete. Alle Darstellungen
  (Plan, Schnitt, 3D, Mengen) sind <em>pure Ableitungen</em> aus dem Dokument, nie umgekehrt.</div>
  <h3>Was dieses Dokument abdeckt</h3>
  <ul>
    <li>Kap. 1–2 · Überblick &amp; Monorepo-Landkarte</li>
    <li>Kap. 3–4 · Dritt-Technologien (eingekauft) &amp; Sprachen/Build</li>
    <li>Kap. 5–7 · Eigenbau (selbst gecodet), KI-Schicht, die 9 Stationen</li>
    <li>Kap. 8 · Qualität &amp; CI/Packaging</li>
    <li>Kap. 9 · Bau-Story — wie es tatsächlich entstanden ist (Agenten-Orchestrierung, Golden-Disziplin, Ehrlichkeitsregel)</li>
  </ul>
</section>

<!-- 1 Überblick -->
<section class="kapitel">
  <div class="eyebrow">Kapitel 1</div><h2>Überblick</h2>
  <p><strong>KosmoOrbit</strong> ist ein <strong>lokal-first Monorepo</strong> (npm workspaces,
  Node ≥ 22) für den kompletten Architektur-Workflow eines Schweizer Baubüros: BIM-Kern, 2D-Pläne
  (SIA-konform), 3D-Visualisierung, Wissens-/Datenverwaltung und eine steuernde Büro-KI. «Lokal-first»
  heisst: das Modell und die Daten leben auf dem Rechner der Nutzerin; Cloud/HomeStation sind optional
  und werden im UI ehrlich benannt, nie vorgetäuscht.</p>
  <h3>Das Grundprinzip: «alles ist ein Command»</h3>
  <p>Jede schreibende Aktion — eine Wand zeichnen, ein Geschoss kopieren, ein Blatt platzieren —
  ist ein registriertes <strong>Command</strong> mit einem <code>zod</code>-Parameter-Schema und
  einer reinen <code>run()</code>-Funktion, die <em>Patches</em> zurückgibt. Aus diesem einen
  Mechanismus fällt alles Weitere ab:</p>
  <ul>
    <li><strong>Undo</strong> = die Inverse der Patches (<code>invertPatches</code>).</li>
    <li><strong>Live-Sync</strong> zwischen Geräten = dieselben Patches durch Yjs/CRDT.</li>
    <li><strong>KI-Steuerung</strong> = jedes Command-Schema wird automatisch ein LLM-Werkzeug. «Was Kosmo kann, ist genau die Menge der Commands.»</li>
    <li><strong>Kosmo-Vorschläge</strong> = Diff-Karten, die beim «Anwenden» durch <em>denselben</em> Command-Weg laufen — atomare, umkehrbare Undo-Gruppen.</li>
  </ul>
  <p>Alle <strong>Darstellungen</strong> (Grundriss, Schnitt, Axonometrie, Mengen, 3D-Szene,
  Render-Graph) entstehen als <strong>pure Funktionen</strong> aus dem Dokument (<code>derive/</code>).
  Das Dokument ist die einzige Wahrheit; Bilder, GLB-Daten und Job-Status leben bewusst in
  Laufzeit-Stores ausserhalb des Modells.</p>
</section>

<!-- 2 Monorepo -->
<section class="kapitel">
  <div class="eyebrow">Kapitel 2</div><h2>Monorepo-Landkarte</h2>
  <p>Sieben Bibliotheks-Pakete unter <code>packages/*</code>, eine App unter <code>apps/*</code>,
  dazu Hilfs-Server/-Skripte unter <code>tools/*</code>.</p>
  <table>
    <tr><th>Paket</th><th>Version</th><th>Zweck</th></tr>
    <tr><td><code>@kosmo/kernel</code></td><td>1.0.0-v1</td><td>BIM-Kern: Entities, Commands (Undo/Journal), Geometrie, gesamte Derive-Pipeline — pure TS, läuft im Web-Worker</td></tr>
    <tr><td><code>@kosmo/ai</code></td><td>1.0.0-v1</td><td>KI-Schicht: Provider, Tool-Registry aus Commands, Personas, gated Ausführung</td></tr>
    <tr><td><code>@kosmo/contracts</code></td><td>1.0.0-v1</td><td>Geteilte zod-Verträge zur HomeStation (render-scene/v1, Bridge-API, <code>.kosmo</code>-Paket)</td></tr>
    <tr><td><code>@kosmo/data</code></td><td>1.0.0-v1</td><td>CH-Bauteil- und Materialkatalog (KosmoData)</td></tr>
    <tr><td><code>@kosmo/sync</code></td><td>1.0.0-v1</td><td>Yjs-CRDT-Client (entity-genaues LWW, Offline-Warteschlange), host-agnostisch</td></tr>
    <tr><td><code>@kosmo/ui</code></td><td>1.0.0-v1</td><td>Design-System «Aura»: Tokens, Themes, Logo, Icons, Basiskomponenten</td></tr>
    <tr><td><code>@kosmo/lizenz</code></td><td>1.0.0-v1</td><td>Signierte Lizenz — reine Ed25519-Verify-Funktion (Web Crypto, keine npm-Dep)</td></tr>
    <tr><td><code>@kosmo/orbit-app</code></td><td>0.7.4</td><td>Die React-App (Desktop + iPad) — Stationen, Shell, Zustand</td></tr>
  </table>
  <h3>tools/ — Server &amp; Skripte (kein Workspace)</h3>
  <ul>
    <li><code>homestation-bridge/</code> — Python/FastAPI-Bridge zur Render-Pipeline (<code>--fake</code> im Container)</li>
    <li><code>sync-server/</code> — Node/Hocuspocus-Yjs-Server + SQLite-Persistenz</li>
    <li><code>svg-qa/pruefe-goldens.mts</code> — Golden-SVG-QA (rastert in echtem Chromium)</li>
    <li><code>docling-ingest/</code> — Python PDF→Markdown-Wissens-Ingest</li>
    <li><code>secret-scan.mjs</code> / <code>netz-check.mjs</code> — Sicherheits-Gates (reines Node)</li>
  </ul>
</section>

<!-- 3 Dritt-Technologien -->
<section class="kapitel">
  <div class="eyebrow">Kapitel 3</div><h2>Dritt-Technologien <span class="tag">eingekauft</span></h2>
  <p>Bewusst schlanke, etablierte Bausteine — kein LLM-SDK (Kosmo spricht mit LLMs über plain
  <code>fetch</code>), keine schweren Frameworks über das Nötige hinaus.</p>
  <table>
    <tr><th>Bibliothek</th><th>Version</th><th>Wofür</th></tr>
    <tr><td>React + React-DOM</td><td>^19.2</td><td>UI-Framework der App</td></tr>
    <tr><td>Three.js (+ camera-controls)</td><td>0.184 / 3.1</td><td>3D-Rendering &amp; Kamerasteuerung (direkt, ohne react-three)</td></tr>
    <tr><td>Zustand</td><td>^5.0</td><td>State-Stores (<code>src/state/*</code>)</td></tr>
    <tr><td>Zod</td><td>^4.1</td><td>Schema-Validierung — Basis der Command-Parameter</td></tr>
    <tr><td>Yjs + y-indexeddb + Hocuspocus</td><td>13.6 / 9.0 / 4.3</td><td>CRDT-Live-Sync + Offline-Persistenz</td></tr>
    <tr><td>Tauri (Rust)</td><td>2.x</td><td>Desktop-Verpackung (Dialog/FS/Tray)</td></tr>
    <tr><td>Vite + vite-plugin-pwa</td><td>^7.0 / ^1.3</td><td>Build + Progressive-Web-App</td></tr>
    <tr><td>Vitest / Playwright</td><td>^3.2 / ^1.61</td><td>Unit-/Komponenten-Tests · End-to-End</td></tr>
    <tr><td>jsPDF + svg2pdf.js + pdfjs-dist</td><td>4.2 / 2.7 / 6.1</td><td>PDF-Export (Pläne/Blätter) &amp; PDF-Anzeige/Import</td></tr>
    <tr><td>web-ifc</td><td>0.0.77</td><td>IFC-Interop (BIM-Austausch)</td></tr>
    <tr><td>clipper2-ts / earcut</td><td>2.0 / 3.0</td><td>Polygon-Boolean/Offset (Wände, Pochierung) · Triangulierung (Mesh)</td></tr>
    <tr><td>perfect-freehand / fflate / suncalc</td><td>1.2 / 0.8 / 2.0</td><td>Freihand-Skizzen · Zip (<code>.kosmo</code>/GLB) · Sonnenstand/Besonnung</td></tr>
    <tr><td>jsonrepair / MSAL</td><td>3.13 / 5.16</td><td>Repariert LLM-Tool-Argument-JSON · Microsoft/OneDrive-Login</td></tr>
    <tr><td>FastAPI / uvicorn / httpx / faster-whisper</td><td>Python ≥3.10</td><td>HomeStation-Bridge (Render/STT/TTS)</td></tr>
  </table>
</section>

<!-- 4 Sprachen & Build -->
<section class="kapitel">
  <div class="eyebrow">Kapitel 4</div><h2>Sprachen &amp; Build</h2>
  <h3>TypeScript (überall, ^5.9)</h3>
  <p>Streng konfiguriert: <code>strict</code>, <code>noUncheckedIndexedAccess</code>,
  <code>exactOptionalPropertyTypes</code> (optionale Felder brauchen konditionale Spreads),
  <code>verbatimModuleSyntax</code>, Target ES2022 inkl. WebWorker-Libs. App-Build:
  <code>tsc --noEmit &amp;&amp; vite build</code>.</p>
  <h3>Rust / Tauri 2</h3>
  <p>Desktop-Verpackung (<code>src-tauri/</code>, edition 2021): Crates <code>tauri</code> v2
  (Features tray-icon, image-png), <code>tauri-plugin-dialog</code>, <code>tauri-plugin-fs</code>,
  <code>serde</code>. Release-Profil mit <code>strip</code>/<code>lto</code>. Identifier
  <code>ch.architekturkosmos.kosmoorbit</code>, strikte CSP, zweites Fenster «kosmo-charakter».
  Drei <strong>Editionen</strong> aus einem Codebase (nur <code>VITE_KOSMO_EDITION</code> unterscheidet):
  <strong>standard</strong> (HomePC lokal, Ollama), <strong>remote</strong> (dünner Client über VPN),
  <strong>cloud</strong> (voll Claude-abhängig, Opus 4.8, kein lokales LLM).</p>
  <h3>Python (HomeStation-Bridge)</h3>
  <p>FastAPI ≥0.115 + uvicorn + httpx; optional faster-whisper (STT) und pynacl (Ed25519). Im
  Container läuft sie als <code>--fake</code> (simulierte GPU) für Tests.</p>
  <h3>Node (Sync-Server)</h3>
  <p>Hocuspocus-Server + SQLite-Extension; Token- und optional Lizenz-Auth, Rate-Limit, Payload-Deckel.</p>
</section>

<!-- 5 Eigenbau -->
<section class="kapitel">
  <div class="eyebrow">Kapitel 5</div><h2>Eigenbau <span class="tag eigen">selbst gecodet</span></h2>
  <p>Das ist der eigentliche Wert und die Eigen-IP — <em>nicht</em> generischer Glue-Code, sondern
  eine durchdachte, zod-getriebene Kommando- und Ableitungs-Maschine.</p>
  <h3>Command-System — <code>kosmo-kernel/src/commands/</code></h3>
  <p>Zentrale Schreib-Schnittstelle. <code>core.ts</code> definiert <code>Command&lt;P&gt;</code>
  (<code>id</code>, <code>params: zodSchema</code>, <code>summarize()</code>, pure <code>run()</code>),
  eine globale Registry, <code>registerCommand()</code>, <code>execute()</code> (mit <code>dryRun</code>
  für die Vorschau der Diff-Karten) und ein <code>JournalEntry</code> mit Actor
  (benutzer/kosmo/kosmodev/…). <strong>~102 registrierte Commands</strong>, verteilt auf:</p>
  <table>
    <tr><th>Datei</th><th>Commands</th><th>Domäne</th></tr>
    <tr><td><code>design.ts</code></td><td>69</td><td>Wände, Geschosse, Öffnungen, Mesh, Dach, Treppe, Fassadenmodule, Segmentierung, Grundriss-Generator, Möbel, Regeln</td></tr>
    <tr><td><code>publish.ts</code></td><td>20</td><td>Blätter, Ansichten platzieren, Revisionen, Baugesuch</td></tr>
    <tr><td><code>vis.ts</code></td><td>10</td><td>Render-Graph (Nodes/Kanten)</td></tr>
    <tr><td><code>grundlagen.ts</code> / <code>core.ts</code></td><td>3</td><td>Volumenstudie u.a.</td></tr>
  </table>
  <h3>Command → LLM-Werkzeug — <code>kosmo-ai/src/tools.ts</code></h3>
  <p>Die Brücke, die «alles ist ein Command» mit «Kosmo kann steuern» verbindet:
  <code>commandTools()</code> mappt jedes Command auf eine Werkzeug-Definition, indem es das
  zod-Schema per <code>z.toJSONSchema()</code> in JSON-Schema übersetzt. Kein manuelles
  Tool-Wiring — neue Commands sind automatisch für Kosmo verfügbar.</p>
  <h3>Derive — ~60 pure Ableitungsfunktionen — <code>kosmo-kernel/src/derive/</code></h3>
  <p>Alles entsteht aus dem Doc. Ausgewählte Vertreter: <strong>Plan/2D</strong>
  (<code>plan.ts</code>, <code>plansvg.ts</code>, <code>sheet.ts</code>, <code>poche.ts</code>,
  <code>hiddenline.ts</code>, <code>dimensions.ts</code>, <code>schraffur.ts</code>),
  <strong>Schnitt</strong> (<code>section.ts</code>), <strong>Axo/3D</strong> (<code>axo.ts</code>,
  <code>scene.ts</code>, <code>mesh.ts</code>, <code>gltf.ts</code>, <code>kamera.ts</code>),
  <strong>Mengen/Kosten</strong> (<code>mengen.ts</code>, <code>ausmass.ts</code>,
  <code>kostenschaetzung.ts</code>, <code>sia416.ts</code>), <strong>Vis</strong>
  (<code>visgraph.ts</code>, <code>renderprompt.ts</code>) sowie Fachdomänen wie
  <code>baugesuch.ts</code>, <code>ausnuetzungsnachweis.ts</code>, <code>schwarzplan.ts</code>,
  <code>besonnungsvergleich.ts</code>, <code>beschlag.ts</code> (neu in 0.7.4).</p>
  <h3>Patch/Undo-Modell &amp; Golden-Tests</h3>
  <p><code>model/doc.ts</code> definiert <code>AnyPatch</code>, <code>invertPatches()</code> (Undo)
  und <code>apply()</code>. Aus denselben Patches fliessen Yjs-Sync und <code>.kosmo</code>-Pakete.
  Die <strong>28 Golden-SVGs</strong> (<code>test/golden/</code>) müssen byte-identisch bleiben, wo
  ein neues Feature ohne Daten inaktiv ist — die härteste Regressionswache des Projekts.</p>
</section>

<!-- 6 KI-Schicht -->
<section class="kapitel">
  <div class="eyebrow">Kapitel 6</div><h2>KI-Schicht <span class="tag eigen">selbst gecodet</span></h2>
  <p><code>packages/kosmo-ai/</code> — die Büro-KI «Kosmo», provider-neutral.</p>
  <ul>
    <li><strong>Provider-Abstraktion</strong> (<code>provider.ts</code>): ein <code>ChatProvider</code>
    als async-iterable Stream. Konkret: <code>OllamaProvider</code>, <code>AnthropicProvider</code>,
    <code>OpenAiKompatibelProvider</code> (LM Studio), <code>MockProvider</code> und
    <code>ScriptedProvider</code> (deterministische E2E). Alle über plain <code>fetch</code> — bewusst kein SDK.</li>
    <li><strong>ChatSession</strong> (<code>chat.ts</code>): die Gesprächsschleife mit
    Tool-Aufruf-Orchestrierung und <em>gated</em> Ausführung — schreibende Vorschläge werden erst
    Diff-Karten, laufen nach Freigabe durch <code>runCommand</code>.</li>
    <li><strong>Personas</strong> (<code>personas.ts</code>): kosmo / kosmodev / kosmodoc / kosmotrain
    mit CH-deutschen Systemprompts; Kosmo gibt sich in der Cloud-Betriebsart nie als Basismodell aus,
    antwortet aber ehrlich, wenn direkt gefragt.</li>
    <li><strong>Vision</strong> (<code>bild-budget.ts</code>): Kosmo kann Screenshots «sehen» (Bild-Token-Budget).</li>
  </ul>
</section>

<!-- 7 Stationen -->
<section class="kapitel">
  <div class="eyebrow">Kapitel 7</div><h2>Die neun Stationen</h2>
  <p><code>apps/kosmo-orbit/src/modules/*</code> — die App gliedert sich in neun Arbeitsstationen,
  navigiert über das Orbit-Startmenü und das Boden-Dock.</p>
  <table>
    <tr><th>Station</th><th>Was sie tut</th></tr>
    <tr><td><strong>design</strong></td><td>Entwurf/BIM-Werkbank: Plan, Schnitt, Inspector, Skizzen, Panels (Bauablauf, Berechnungsliste, KV, Mängel, Modul-Editor, Raster)</td></tr>
    <tr><td><strong>vis</strong></td><td>Visualisierung/Render-Graph: Node-Canvas, HomeStation-Bridge-Bilder, Job-Laufzeit</td></tr>
    <tr><td><strong>data</strong></td><td>KosmoData: Bauteil-/Materialkatalog, Referenzen, Wissen</td></tr>
    <tr><td><strong>publish</strong></td><td>Blätter/Plan-Publikation &amp; PDF-Export</td></tr>
    <tr><td><strong>prepare</strong></td><td>Wissens-Vorbereitung, OneDrive-Import</td></tr>
    <tr><td><strong>doc</strong></td><td>Dokumentation, Tech-Radar</td></tr>
    <tr><td><strong>train</strong></td><td>Training/Korpus-Pflege</td></tr>
    <tr><td><strong>asset</strong></td><td>Asset-Bibliothek, GLB→Mesh, Standbilder</td></tr>
    <tr><td><strong>dev</strong></td><td>KosmoDev-Workorders (Entwicklungs-Auftragsbuch)</td></tr>
  </table>
  <p class="klein">Shell (<code>src/shell/</code>): Orbit-Startmenü, Command-Palette, Companion,
  Kosmo-Orb/-Panel/-Symbol, Einstellungen, Phasen-Leiste. Zustand (<code>src/state/</code>) über
  Zustand-Stores — Laufzeit-Daten strikt getrennt vom synchronisierten Modell.</p>
</section>

<!-- 8 Qualität & CI -->
<section class="kapitel">
  <div class="eyebrow">Kapitel 8</div><h2>Qualität &amp; CI/Packaging</h2>
  <h3>Test- &amp; Qualitäts-Infrastruktur</h3>
  <ul>
    <li><strong>Vitest-Suiten</strong>: Kernel (35 Dateien, 765 Tests inkl. 28 Golden-SVGs), App (63 Dateien, 847 Tests), AI, Data (mit Datenschutz-Leak-Gate), UI, Contracts.</li>
    <li><strong>Golden-SVG-QA</strong> (<code>npm run svg-qa</code>): rastert jedes Golden in echtem Chromium und prüft Rendering-Validität, viewBox-Fit und Text-Containment (harte Kriterien → Exit-Code).</li>
    <li><strong>E2E</strong>: 109 Playwright-Specs inkl. voller «Journeys» (ein Haus komplett über den Kosmo-Chat bauen).</li>
    <li><strong>Sicherheits-Gates</strong>: <code>secret-scan</code> (Anthropic/AWS/Entropie/.env) und <code>netz-check</code> (Firewall-Konfig-Lint + Bind-Smoke).</li>
    <li><strong>Release-Gate</strong> (neu 0.7.4): <code>typecheck &amp;&amp; test &amp;&amp; svg-qa &amp;&amp; security:secrets</code> in einem Befehl.</li>
  </ul>
  <h3>CI / Packaging (GitHub Actions)</h3>
  <ul>
    <li><strong>Desktop</strong>: Tauri-Matrix <strong>3 Editionen × 3 Plattformen</strong> (macOS/Linux/Windows).</li>
    <li><strong>iOS</strong>: Tauri-Experiment (unsigniert, best-effort).</li>
    <li><strong>Pages</strong>: Web/PWA (cloud-Edition) auf GitHub Pages.</li>
    <li><strong>Build-Request-Mechanik</strong>: eine Zeitstempel-Datei (<code>.desktop-build-request</code> etc.) anfassen und pushen löst den Build aus. Keine Signing-Keys → Update = neuer Installer.</li>
  </ul>
</section>

<!-- 9 Bau-Story -->
<section class="kapitel">
  <div class="eyebrow">Kapitel 9</div><h2>Bau-Story — wie es entstand</h2>
  <p>KosmoOrbit ist über viele versionierte Grossaufträge «gevibecodet» worden — aber mit einer
  strengen, ehrlichen Disziplin, nicht als Ad-hoc-Generierung.</p>
  <h3>Agenten-Orchestrierung (Owner-Guideline, verbindlich)</h3>
  <p>Ein festes Modell-Regime steuert, wer welche Arbeit macht:</p>
  <ul>
    <li><strong>Opus orchestriert</strong> — der Leiter zerlegt den Auftrag in Wellen, delegiert und urteilt am Ende; das Spitzenmodell ist nie selbst der Ausführer.</li>
    <li><strong>Sonnet führt aus</strong> — die eigentliche Bauarbeit (Code, Tests, Design gegen Spec) läuft in Sonnet-Subagenten, je Welle dateidisjunkt.</li>
    <li><strong>Fable urteilt</strong> — die härtesten 10–15 % (Spec-Freeze, Golden-Verdikte, Schlussreview) gehen an das Urteilsmodell.</li>
  </ul>
  <div class="merk"><strong>«Selbst gevibecodet» heisst hier konkret:</strong> nicht generischer
  Glue-Code, sondern die zod-getriebene Command-Registry und die ~60 puren Derive-Funktionen als
  Eigenentwicklung — die tragende IP. Eingekaufte Bausteine (React, Three.js, Yjs …) sind bewusst
  auf das Nötige beschränkt.</div>
  <h3>Die Arbeitsgesetze</h3>
  <ul>
    <li><strong>Dateidisjunktheit = Merge-Gesetz</strong>: parallele Agenten fassen nie dieselbe Datei an — so gibt es keine Merge-Konflikte.</li>
    <li><strong>Golden-Sammelwechsel-Disziplin</strong>: bevor ein Golden-SVG neu erzeugt wird, wird die erwartete Änderung <em>vorab</em> als Liste geschrieben und danach Zeile für Zeile maschinell verifiziert — kein Golden ändert sich unbemerkt.</li>
    <li><strong>Kritik-Runden gegen Soll-Bilder</strong>: jede visuelle Welle wird gegen die vom Owner gelieferten Soll-Vorlagen geprüft (Screenshot-Vergleich), mehrfach bis «angenommen».</li>
    <li><strong>Push-Early</strong>: nach jedem grünen Schnell-Gate wird sofort gepusht — der Entwicklungs-Container wird gelegentlich zurückgesetzt, die Arbeit ist nur auf dem Remote sicher.</li>
    <li><strong>Ehrlichkeit vor Politur</strong>: was ein Konto, ein Schlüssel oder die HomeStation braucht, wird im UI offen benannt statt vorgetäuscht — und jede bekannte Grenze steht in den Release-Notizen.</li>
  </ul>
  <h3>Beispiel 0.7.4 «Einlösen &amp; Feinschliff»</h3>
  <p>Drei Wellen (Druck-Typografie · Shell/App · neue Features), drei Kritik-Runden, alle
  angenommen. Eingelöst wurden genau die in 0.7.3 <em>namentlich</em> vertagten Punkte (SIA-Hochzahl
  im PDF, Live-Plan-Phasen, Kosmo-Orb ins Dock, Beschlag-Katalog). Ehrlich offen geblieben und
  dokumentiert: Lato-400 im PDF-Export, Beschlag-Stufe 2. Gates: Kernel 765/765, App 847/847,
  svg-qa 28 Goldens / 0 harte Fehler.</p>
  <p class="klein">Automatisch erzeugt (technik-pdf-074.mts) aus der verifizierten Repo-Bestandsaufnahme, Stand v0.7.4.</p>
</section>

</body></html>`;

writeFileSync(join(WORK, 'technik.html'), html);

const browser = await chromium.launch({ executablePath: process.env['PLAYWRIGHT_CHROMIUM_PATH'] });
const page = await (await browser.newContext()).newPage();
await page.goto(`file://${join(WORK, 'technik.html')}`);
await page.waitForTimeout(500);
await page.pdf({ path: OUT, format: 'A4', printBackground: true });
await browser.close();
console.log('technik-pdf-074 →', OUT, '·', basename(OUT));
