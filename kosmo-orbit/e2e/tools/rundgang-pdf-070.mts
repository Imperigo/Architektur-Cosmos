/**
 * Rundgang-PDF «0.7.0» («Schwarz auf Weiss», 11.07.)
 * — Muster rundgang-pdf-069.mts. Bilder: docs/rundgang/kritik-070/ +
 * Golden-SVGs live gerastert (Chromium file://-Element-Screenshot, der
 * SVG-QA-Weg — fullPage auf Standalone-SVGs hängt). HTML → PDF über
 * Chromiums print, Ablage abgabe/RUNDGANG-NOTIZEN-0.7.0.pdf.
 *
 * Aufruf (aus kosmo-orbit/):
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx tsx e2e/tools/rundgang-pdf-070.mts
 */
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname; // kosmo-orbit/
const K70 = `${ROOT}docs/rundgang/kritik-070/`;
const GOLDEN = `${ROOT}packages/kosmo-kernel/test/golden/`;
const OUT = `${ROOT}abgabe/RUNDGANG-NOTIZEN-0.7.0.pdf`;
mkdirSync(`${ROOT}abgabe/`, { recursive: true });

const WORK = join(tmpdir(), 'kosmo-rundgang-070');
mkdirSync(join(WORK, 'bilder'), { recursive: true });

function brauche(pfad: string): void {
  if (!existsSync(pfad)) throw new Error(`Quelle fehlt: ${pfad}`);
}

const bilder = [
  '01-wettbewerb-grundriss-schwarz.png',
  '04-3d-weissmodell-default.png',
  '05-3d-schwarzmodell.png',
  '06-baueingabe-grundriss-schichten.png',
  '07-varianten-panel-live.png',
];
for (const b of bilder) {
  brauche(K70 + b);
  copyFileSync(K70 + b, join(WORK, 'bilder', b));
}

const browser = await chromium.launch({ executablePath: process.env['PLAYWRIGHT_CHROMIUM_PATH'] });

// Goldens rastern: SVG in Chromium laden und als PNG schiessen (QA-Loop-Weg).
const goldens = [
  'grundriss-testhaus-wettbewerb',
  'grundriss-testhaus-baueingabe',
  'schnitt-satteldach-baueingabe',
  'schwarzplan',
  'blatt-autofuellung',
];
for (const g of goldens) {
  brauche(`${GOLDEN}${g}.svg`);
  const huelle = join(WORK, `${g}.html`);
  writeFileSync(
    huelle,
    `<!doctype html><body style="margin:0;background:#fff"><img id="g" src="file://${GOLDEN}${g}.svg" style="width:1200px;display:block"></body>`,
  );
  const ctx = await browser.newContext({ viewport: { width: 1240, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto(`file://${huelle}`);
  await page.waitForTimeout(400);
  await page.locator('#g').screenshot({ path: join(WORK, 'bilder', `${g}.png`) });
  await ctx.close();
}

function seite(titel: string, bild: string, notiz: string, extra = ''): string {
  return `<section class="seite">
    <h2>${titel}</h2>
    <img src="bilder/${bild}" />
    ${extra}
    <div class="notiz"><strong>Notiz</strong> ${notiz}</div>
  </section>`;
}

const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
  @page { size: A4 landscape; margin: 14mm; }
  body { font-family: system-ui, sans-serif; color: #1a1815; }
  h1 { font-size: 26px; letter-spacing: 0.04em; }
  h2 { font-size: 16px; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #c9c4b6; padding-bottom: 4px; }
  .seite { page-break-after: always; }
  img { max-width: 100%; max-height: 132mm; border: 1px solid #e4e0d6; display: block; margin: 6px auto; }
  .duo { display: flex; gap: 8px; } .duo div { flex: 1; } .duo img { max-height: 120mm; }
  .notiz { background: #f5f3ee; border-left: 3px solid #1a1815; padding: 8px 12px; font-size: 12.5px; margin-top: 8px; }
  .titelblatt p, li { font-size: 13px; line-height: 1.5; }
  .klein { font-size: 11px; color: #5c574d; }
  table { border-collapse: collapse; font-size: 12px; width: 100%; }
  th, td { border: 1px solid #d8d3c7; padding: 4px 8px; text-align: left; vertical-align: top; }
  th { background: #f5f3ee; }
</style></head><body>

<section class="seite titelblatt">
  <h1>KosmoOrbit v0.7.0 — Rundgang-Notizen</h1>
  <p><strong>«Schwarz auf Weiss»</strong> · 11.07.2026 · ROADMAP 311–321 · Zwei-Tage-Grossauftrag</p>
  <ul>
    <li><strong>SIA-Planungsphasen komplett:</strong> Wettbewerb · Vorprojekt · Bauprojekt · Baueingabe · Werkplan als Darstellungsphasen — bis Baueingabe schneidet der Plan SIA-gemäss SCHWARZ (früh: EIN Poché; Bauprojekt/Baueingabe: Schichten tragend schwarz / nichttragend grau / Dämmung weiss); Umbau-Rot/Gelb behält Vorrang, Werkplan byte-identisch bewiesen.</li>
    <li><strong>3D folgt der Phase:</strong> Weissmodell bis Baueingabe, Material ab Ausschreibung, Schwarzmodell wählbar — Override im Projekt-Menü.</li>
    <li><strong>Situationsplan v1 (Schwarzplan)</strong> als neuer Blatt-Typ + <strong>Blatt-Auto-Befüllung</strong> (fehlende Ansichten/Schnitte/Situationsplan in einem Undo-Schritt).</li>
    <li><strong>Finch-Programm:</strong> deterministische Anytime-Variantensuche (Seed, 4 Gewichte) + Echtzeit-Panel mit Top-8 und Kennzahl-Matrix · Kosmo-Präzisier (Türen platzieren, Komplianz-Fixes, Einheitstyp) · Vorlagen-Locks (fest/dehnbar je Achse) · Regeln in Vorlagen · BIM-Roundtrip-Beweise + INTEROP.md.</li>
    <li><strong>Offene Aufträge eingelöst:</strong> Fenster/Türen im Plan direkt klickbar · Fensterbogen-Schalter (H-42) · Inspector-Layout (H-43) · K2-GLB-Beweis (fand eine LEERE Alt-Fixture) · Parzellen-Zone ohne Kennzahl-Pollution (D8).</li>
  </ul>
  <p class="klein">Unit 1592 (Kernel 677 · App 733 · KI 96 · Contracts 28 · Data 25 · UI 25 · Lizenz 8) · Kritik-Runden 1–3 mit Bildschirm-Beweisen · Scan-Nachlauf §5 vor dem Bump · Vollsuiten-Zahl siehe ROADMAP 321</p>
</section>

${seite(
  '1 · Wettbewerb: EIN schwarzes Poché',
  '01-wettbewerb-grundriss-schwarz.png',
  'Phase «Wettbewerb» am Bildschirm: alle geschnittenen Bauteile EIN durchgehendes schwarzes Poché (SIA-Wettbewerbsusanz), reduzierte Details (keine Möblierung, Gesamtmass statt Ketten), Massstabsvorschlag 1:200. Dieselbe pocheEntscheid()-Utility speist Bildschirm, SVG-Export und Blatt.',
)}

${seite(
  '2 · Baueingabe: Schichten schwarz/grau/weiss — der Kritik-Beweis',
  '06-baueingabe-grundriss-schichten.png',
  'Phase «Baueingabe» mit Schichtaufbau: tragende Schicht schwarz, nichttragende Bekleidung GRAU SOLID (Kritik-Runde 1 fand hier einen Schraffur-Rückfall in der Bildschirm-Kette — behoben, dieser Shot gegen den finalen Build ist der Beweis), Dämmung weiss. Türe mit Aufschlag, Fenster als Öffnung.',
)}

<section class="seite">
  <h2>3 · 3D: Weissmodell (Phasen-Default) und Schwarzmodell (gewählt)</h2>
  <div class="duo">
    <div><img src="bilder/04-3d-weissmodell-default.png"><p class="klein">darstellung3d «auto» → Weissmodell bis Baueingabe</p></div>
    <div><img src="bilder/05-3d-schwarzmodell.png"><p class="klein">darstellung3d «schwarz» — explizite Wahl</p></div>
  </div>
  <div class="notiz"><strong>Notiz</strong> Der Modus lebt in doc.settings (Undo/Yjs/.kosmo gelten), aufgelöst über die SIA-Phase: bis «Baueingabe» weiss, ab «Ausschreibung» Material; Fenster behalten Transparenz, Texturen werden im Weiss-/Schwarzmodus ehrlich übersprungen. Beweis-Anker data-darstellung3d am Container.</div>
</section>

<section class="seite">
  <h2>4 · Die neuen Golden-Pläne — Phasen in Grundriss und Schnitt</h2>
  <div class="duo">
    <div><img src="bilder/grundriss-testhaus-wettbewerb.png"><p class="klein">Golden: Testhaus Wettbewerb (EIN Poché, 1:200-Reduktion)</p></div>
    <div><img src="bilder/grundriss-testhaus-baueingabe.png"><p class="klein">Golden: Testhaus Baueingabe (Schichten schwarz/grau/weiss)</p></div>
  </div>
  <div class="notiz"><strong>Notiz</strong> Drei neue Phasen-Goldens (dazu Schnitt Satteldach Baueingabe), alle nach der 6-Kriterien-Rubrik sichtgeprüft und vom SVG-QA-Loop automatisch gerastert. Die 15 Bestands-Goldens (Werkplan/Material) blieben byte-identisch — der Werkplan-Weg ist beweisbar unberührt.</div>
</section>

<section class="seite">
  <h2>5 · Situationsplan v1 und Blatt-Auto-Befüllung</h2>
  <div class="duo">
    <div><img src="bilder/schwarzplan.png"><p class="klein">Golden: Schwarzplan — eigene Footprints, Parzelle strichpunktiert, Nordpfeil, Massstabsbalken</p></div>
    <div><img src="bilder/blatt-autofuellung.png"><p class="klein">Golden: automatisch befülltes Blatt (Ansichten + Schnitt + Situationsplan)</p></div>
  </div>
  <div class="notiz"><strong>Notiz</strong> Footprints kommen aus echten Volumenkörpern, die Parzelle nur aus der echten geo.admin.ch-Zone — Nachbargebäude werden ehrlich weggelassen, solange keine erfassten Kontext-Polygone existieren (kein OSM-Theater). «Blatt füllen» ergänzt nur Fehlendes, EIN Undo-Schritt.</div>
</section>

${seite(
  '6 · Varianten in Echtzeit — die Finch-Antwort',
  '07-varianten-panel-live.png',
  '3645 geprüfte Varianten in Sekunden: der seeded Anytime-Generator (Greedy-DP-Start, dann Hill-Climbing mit fünf Zugarten) läuft in requestIdleCallback-Zeitscheiben, die Top-8 mit Teilscores (Programm/Kompaktheit/Mix/Fläche) und Kennzahl-Matrix aktualisieren sich live. Gleicher Seed ⇒ gleiche Top-Variante (E2E-bewiesen). «Übernehmen» geht über das bestehende Segmentier-Kommando — EIN Undo-Schritt.',
)}

<section class="seite">
  <h2>7 · Finch-Abdeckung — was v0.7.0 davon lokal kann</h2>
  <table>
    <tr><th>Finch (Product-Page 10.07.)</th><th>KosmoOrbit v0.7.0 — lokal, ohne Cloud</th></tr>
    <tr><td>Plan Library mit eingebetteten Regeln</td><td>Zonen-Vorlagen mit regeln?: string[] — Instanziieren aktiviert die Checks; Projekt-Regeln gewinnen bei Vereinigung.</td></tr>
    <tr><td>Tausende Echtzeit-Varianten, Instant-Feedback</td><td>Deterministische Anytime-Variantensuche + Live-Panel (Top-8, Kennzahl-Matrix, Abbruch) — reproduzierbar per Seed statt Cloud-Rechenpark.</td></tr>
    <tr><td>KI-Agent «Archie» (Präzisionsarbeit)</td><td>Kosmo-Präzisier: tuerenPlatzieren · komplianzFixes (3 verlustfrei automatisierbare Befunde — mehr wäre Raterei) · einheitTypAktualisieren; jeweils EIN Undo-Schritt.</td></tr>
    <tr><td>Constraints (locked/extendable)</td><td>dehnungX/dehnungY je Vorlagen-Achse ('fest'/'dehnbar'); Stretch respektiert Locks, Alles-fest-Konflikt ist ein ehrlicher CommandError.</td></tr>
    <tr><td>Komplettes BIM-Modell + Export ohne Datenverlust</td><td>IFC-/DXF-Roundtrip-Tests (±0.001 mm) + docs/INTEROP.md mit Verlust-Tabelle für Rhino/Revit/Grasshopper — ehrlich: kein .rvt-Direktexport.</td></tr>
    <tr><td>Enterprise (SSO, Teams, Onboarding)</td><td>BEGRÜNDET WEGGELASSEN (RE-FINCH §8): lokal-first Einzelbüro, kein Mandanten-Backend — Ehrlichkeit vor Fassade.</td></tr>
  </table>
  <div class="notiz"><strong>Notiz</strong> F1–F10 waren seit 0.6.x gebaut; v0.7.0 hat die TIEFE nachgezogen (Suche, Locks, Regeln, Präzisier, Beweise). Vollständige Tabelle in docs/RE-FINCH.md §8.</div>
</section>

<section class="titelblatt">
  <h2>8 · Ehrliche Restliste (0.7.1+)</h2>
  <ul>
    <li>Enterprise/SSO bleibt begründet weggelassen (RE-FINCH §8) · OSM-Nachbarbebauung im Schwarzplan (heute: nur erfasste Kontext-Polygone, sonst ehrlich leer).</li>
    <li>Echter Cloud-/Ollama-Bildcall für den Kosmo-Blick · Video-/Dauerstream-Blick · OAuth-Härtetest · K2-Remote-Download (der lokale Ladepfad ist jetzt mit echter Geometrie bewiesen).</li>
    <li>RAG-Anything bleibt WATCH · HiVG (Image-to-SVG, Scan 11.07.) als HomeStation-Evaluation vorgemerkt · PosterCraft wegen FLUX-non-commercial-Lizenz verworfen.</li>
    <li>DXF: zwei parallele Exporter konsolidieren + Bemassungs-Layer befüllen (heute per Test als leer belegt) · Egress-Autofix bleibt bewusst draussen (nicht verlustfrei automatisierbar).</li>
  </ul>
  <p class="klein">Erstellt automatisch aus dem 0.7.0-Stand · abgabe/RUNDGANG-NOTIZEN-0.7.0.pdf</p>
</section>

</body></html>`;

const htmlPfad = join(WORK, 'rundgang.html');
writeFileSync(htmlPfad, html);

const page = await (await browser.newContext()).newPage();
await page.goto(`file://${htmlPfad}`);
await page.waitForTimeout(800);
await page.pdf({ path: OUT, format: 'A4', landscape: true, printBackground: true });
await browser.close();
console.log('Rundgang-PDF →', OUT);
