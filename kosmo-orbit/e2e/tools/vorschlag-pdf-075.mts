/**
 * Vorschlag-PDF «KosmoOrbit 0.7.5 — Vorschlag & Design-Ausblick».
 * Rendert docs/V075-VORSCHLAG.md-Inhalt als lesbares PDF (HTML → Chromium print,
 * A4 hoch). Ablage abgabe/KOSMOORBIT-0.7.5-VORSCHLAG.pdf.
 *
 * Aufruf (aus kosmo-orbit/):
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx tsx e2e/tools/vorschlag-pdf-075.mts
 */
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const OUT = `${ROOT}abgabe/KOSMOORBIT-0.7.5-VORSCHLAG.pdf`;
mkdirSync(`${ROOT}abgabe/`, { recursive: true });
const WORK = join(tmpdir(), 'kosmo-vorschlag-075');
mkdirSync(WORK, { recursive: true });

const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
  @page { size: A4 portrait; margin: 18mm 16mm; }
  :root { --ink:#1a1815; --soft:#5c574d; --line:#d9d4c8; --paper:#f6f4ee; --accent:#0e766c; --accent-weich:#e2efed; --gold:#9a6b1e; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", system-ui, -apple-system, sans-serif; color: var(--ink); font-size: 11.4px; line-height: 1.52; }
  h1 { font-size: 26px; letter-spacing: 0.02em; margin: 0 0 4px; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing: 0.09em; border-bottom: 2px solid var(--ink); padding-bottom: 5px; margin: 18px 0 10px; }
  h3 { font-size: 12.5px; margin: 13px 0 5px; color: var(--accent); }
  p { margin: 0 0 8px; } ul { margin: 0 0 8px; padding-left: 18px; } li { margin: 3px 0; }
  code { font-family: "IBM Plex Mono", ui-monospace, Menlo, monospace; font-size: 10px; background: var(--paper); padding: 0 3px; border-radius: 2px; }
  .eyebrow { font-family: "IBM Plex Mono", monospace; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent); }
  .titel-meta { color: var(--soft); font-size: 11.5px; margin-bottom: 14px; font-style: italic; }
  .karte { border: 1px solid var(--line); border-radius: 6px; padding: 9px 13px; margin: 8px 0; background: #fff; break-inside: avoid; }
  .karte.kern { border-left: 4px solid var(--accent); }
  .karte.stretch { border-left: 4px solid var(--gold); }
  .karte h3 { margin-top: 0; }
  .karte .code { color: var(--accent); }
  .beleg { font-size: 9.3px; color: var(--soft); font-style: italic; margin-top: 3px; }
  .merk { background: var(--accent-weich); border-left: 3px solid var(--accent); padding: 9px 12px; font-size: 11.4px; margin: 10px 0; border-radius: 0 4px 4px 0; }
  .badge { display: inline-block; font-family: "IBM Plex Mono", monospace; font-size: 8.5px; font-weight: 700; letter-spacing: 0.06em; padding: 1px 6px; border-radius: 3px; color: #fff; vertical-align: middle; margin-left: 4px; }
  .badge.kern { background: var(--accent); } .badge.klein { background: var(--soft); } .badge.stretch { background: var(--gold); } .badge.extern { background: #7a3b3b; }
  .klein { font-size: 9.5px; color: var(--soft); }
</style></head><body>

<div class="eyebrow">Vorschlag · nach v0.7.4 · 12.07.2026</div>
<h1>KosmoOrbit 0.7.5 — Vorschlag &amp; Design-Ausblick</h1>
<p class="titel-meta">Meine Empfehlung für die nächste Runde. Teil A: offene Funktionspunkte
(priorisiert). Teil B: Design-Ausblick für eine neue Kosmodesign-Runde. Alle Punkte gegen die
ehrliche Vertagungsliste belegt — kein Wunschdenken.</p>

<div class="merk"><strong>Ausgangslage:</strong> v0.7.4 hat genau die in 0.7.3 <em>namentlich</em>
vertagten Punkte eingelöst (SIA-Hochzahl im PDF, D1-Kadenz/Ton, Boden-Dock-Orb, Live-Plan-Nachbarn,
Companion, Pan-Grenze, Takeover, Beschlag S1). Die sind erledigt. Unten steht nur, was wirklich bleibt.</p>

<h2>Teil A · Funktionspunkte für 0.7.5</h2>

<h3>Empfohlener Kern — das würde ich bauen</h3>

<div class="karte kern">
  <h3>A1 · Beschlag-Katalog Stufe 2 <span class="badge kern">KERN</span></h3>
  <p>Der grösste funktionale Brocken. 0.7.4 lieferte nur die Datengrundlage (<code>derive/beschlag.ts</code>:
  12 Typen, Plan-Symbol, IFC-Mapping). <strong>S2</strong> macht daraus ein echtes Feature: eine
  Beschlag-Entity, ein Command zum Zuweisen am Bauteil, Inspector-UI, und das Export-Wiring
  (IFC <code>IFCDISCRETEACCESSORY</code> + DXF-Layer). Baut direkt auf S1 auf, klar abgegrenzt, golden-diszipliniert.</p>
  <div class="beleg">Belege: neuigkeiten.ts (0.7.4), ROADMAP 331 «W3 · P10».</div>
</div>

<div class="karte kern">
  <h3>A2 · Projekt-/Auftrags-Stammdatenmodell + Persistenz-Vereinheitlichung <span class="badge kern">KERN</span></h3>
  <p>Der strukturell wichtigste Punkt. Heute gibt es kein echtes Projekt-/Auftraggeber-Modell
  (<code>auftragsbuch.ts</code> ist nur das Dev-Workorder-Buch; nur ein Signal-Stub), und die Persistenz
  ist gemischt (localStorage neben Yjs; einzelne Panels führen Zustand lokal statt zentral — «H-43»).
  Ein sauberes Stammdatenmodell (Projekt, Bauherr, Adresse, Phasen, Fristen) entblockt Plankopf,
  Companion-Karten und Sync.</p>
  <div class="beleg">Belege: BEWEGUNGSKONZEPT-066 (Auftragsmodell-Lücke), SIM-BEFUNDE (H-43).</div>
</div>

<h3>Kleine Print-Fixes — billig, ehrlich versprochen</h3>

<div class="karte">
  <h3>A3 · Lato 400 im PDF-Export einbetten <span class="badge klein">KLEIN</span></h3>
  <p>Heute nur Lato 900 im PDF-Pfad; die Plankopf-Regular-Nebenzeile fällt auf einen Sans-Ersatz
  zurück. Fix: <code>lato-400-latin-pdf.ttf</code> subsetten (~26 KB) und in <code>export-plan.ts</code>/
  <code>export-sheets.ts</code> registrieren. Ein halber Tag — schliesst die letzte 0.7.4-Lücke.</p>
  <div class="beleg">Beleg: public/fonts/pdf/README.md, ROADMAP 331 «Ehrlich offen».</div>
</div>

<div class="karte">
  <h3>A4 · DXF-Typografie <span class="badge klein">KLEIN</span></h3>
  <p>Der DXF-Export trägt weiterhin die CAD-Standardschrift — die «Zwei-Stimmen»-Typografie erreicht
  den DXF-Weg nicht. Optional; ehrlich benannt seit 0.7.3.</p>
  <div class="beleg">Beleg: neuigkeiten.ts (0.7.3), docs/INTEROP.md.</div>
</div>

<h3>Stretch &amp; extern-gebunden</h3>

<div class="karte stretch">
  <h3>A5–A6 · Arbeitsmodi hub-weit &amp; Vis-Kür-Reste <span class="badge stretch">STRETCH</span></h3>
  <p><strong>A5</strong> Der adaptive Modus-Kern (<code>arbeitsmodi-kern.ts</code>) ist vorbereitet, aber
  nur auf der Design-Station scharf — hub-weiter Rollout braucht Design (s. Teil B).
  <strong>A6</strong> Node-Palette mit Kategorien, Minimap, Kanten-Routing (UI-KONZEPT-065 §6, «Stufe 2»).</p>
</div>

<div class="karte">
  <h3>A7–A8 · OAuth-Abo-Härtetest &amp; Tauri-Desktop-Rundgang <span class="badge extern">OWNER/OS</span></h3>
  <p>Nicht im Container erledigbar: <strong>A7</strong> echter Anthropic-Schlüssel (bisher nur gegen
  Fake bewiesen; Drehbuch existiert). <strong>A8</strong> Zusammenspiel Haupt-/Charakter-Fenster + Schliess-
  Choreografie — braucht ein echtes OS. Beide bleiben Owner-Abnahme.</p>
</div>

<h2>Teil B · Design-Ausblick «Kosmodesign 0.7.5»</h2>
<p>Das Fundament steht und gilt weiter: <strong>80·15·5</strong>, <strong>«Papier ist Papier»</strong>,
<strong>«Zwei Stimmen»</strong>, <strong>KIcon 1.75px</strong>, Rollenfarben, Orb-Zustände. Diese
Prinzipien sind gesetzt — aber für mehrere Bereiche gibt es <em>noch keine eigene Soll-Bild-Serie</em>.
Genau dort lohnt die nächste Handoff-Runde.</p>

<div class="karte kern">
  <h3>D-Serie 0.7.5 — erste Welle (grösster sichtbarer Hebel)</h3>
  <ul>
    <li><strong>3D-Viewport-Chrome</strong> — der 3D-Raum «erbt heute nur die Stimmung», hat aber keine
    ausformulierte Chrome-Sprache. Zu gestalten: Achsenkreuz, Kamera-HUD, Phasen-/Modus-Badge in 80·15·5.</li>
    <li><strong>Vis-Kuratierfläche</strong> — funktional gebaut, ohne eigene Gestaltung: Kartenraster,
    Vergleichsmodus, Leerzustände, Node-Palette mit Kategorien-Ikonografie.</li>
  </ul>
</div>

<div class="karte">
  <h3>Zweite Welle</h3>
  <ul>
    <li><strong>Companion (Zweitgerät)</strong> — bisher nur «minimal»; verdient eine eigene ruhige Sprache fürs Tablet/Handy.</li>
    <li><strong>Datenstationen</strong> (KosmoData/Referenz-Dossier/Wissen) — Facetten &amp; Dossier-Gruppierung durchkomponieren, wie seinerzeit Plan/Shell.</li>
    <li><strong>Onboarding/Erststart</strong> — den «Kosmo als Bauzeichnung»-Auftritt auf den ersten Eindruck anwenden.</li>
    <li><strong>Report-Druck-Layouts</strong> — die 5 Blätter (Bauablauf/Abnahme/Ausnützung/Studienbericht/KV) auf Plan/Schnitt-Niveau heben (inkl. der bekannten Overlap-Warnung in <code>abnahmeprotokoll.svg</code>).</li>
  </ul>
</div>

<div class="merk"><strong>Meine Empfehlung in einem Satz:</strong> 0.7.5 = <strong>A1 (Beschlag S2)</strong>
+ <strong>A2 (Stammdatenmodell)</strong> als Kern, <strong>A3 (Lato-400)</strong> als billiger Abschluss
der 0.7.4-Lücke — und parallel eine kleine ClaudeDesign-Runde D für <strong>Viewport-Chrome +
Vis-Kuratierfläche</strong>. Ein runder «Substanz + Sichtbarkeit»-Mix.</div>

<p class="klein">Automatisch erzeugt (vorschlag-pdf-075.mts) aus docs/V075-VORSCHLAG.md, Stand v0.7.4.</p>

</body></html>`;

writeFileSync(join(WORK, 'vorschlag.html'), html);

const browser = await chromium.launch({ executablePath: process.env['PLAYWRIGHT_CHROMIUM_PATH'] });
const page = await (await browser.newContext()).newPage();
await page.goto(`file://${join(WORK, 'vorschlag.html')}`);
await page.waitForTimeout(500);
await page.pdf({ path: OUT, format: 'A4', printBackground: true });
await browser.close();
console.log('vorschlag-pdf-075 →', OUT, '·', basename(OUT));
