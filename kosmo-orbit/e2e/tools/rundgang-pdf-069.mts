/**
 * Rundgang-PDF «0.6.9» («Offene Fenster, klare Antworten», 10.07.)
 * — Muster rundgang-pdf-068.mts. Bilder: docs/rundgang/kritik-069/ +
 * Golden-SVGs live gerastert (über Chromium file://-Screenshot — cairosvg
 * ist im Container nicht mehr vorhanden, deshalb derselbe Weg wie der
 * SVG-QA-Loop). HTML → PDF über Chromiums print,
 * Ablage abgabe/RUNDGANG-NOTIZEN-0.6.9.pdf.
 *
 * Aufruf (aus kosmo-orbit/):
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx tsx e2e/tools/rundgang-pdf-069.mts
 */
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname; // kosmo-orbit/
const K69 = `${ROOT}docs/rundgang/kritik-069/`;
const GOLDEN = `${ROOT}packages/kosmo-kernel/test/golden/`;
const OUT = `${ROOT}abgabe/RUNDGANG-NOTIZEN-0.6.9.pdf`;
mkdirSync(`${ROOT}abgabe/`, { recursive: true });

const WORK = join(tmpdir(), 'kosmo-rundgang-069');
mkdirSync(join(WORK, 'bilder'), { recursive: true });

function brauche(pfad: string): void {
  if (!existsSync(pfad)) throw new Error(`Quelle fehlt: ${pfad}`);
}

const bilder = [
  '01-fenster-zweifluegel-3d-plan.png',
  '02-cw-fensterband-grundriss.png',
  '03-kselect-offen.png',
  '04-blick-grundriss-chip.png',
];
for (const b of bilder) {
  brauche(K69 + b);
  copyFileSync(K69 + b, join(WORK, 'bilder', b));
}

const browser = await chromium.launch({ executablePath: process.env['PLAYWRIGHT_CHROMIUM_PATH'] });

// Goldens rastern: SVG in Chromium laden und als PNG schiessen (QA-Loop-Weg).
const goldens = [
  'grundriss-fenster-zweifluegel',
  'ansicht-curtainwall',
  'schnitt-fenster-parametrisch',
  'grundriss-walmdach-flach',
];
for (const g of goldens) {
  brauche(`${GOLDEN}${g}.svg`);
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`file://${GOLDEN}${g}.svg`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(WORK, 'bilder', `${g}.png`), fullPage: true });
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
  img { max-width: 100%; max-height: 150mm; border: 1px solid #e4e0d6; display: block; margin: 6px auto; }
  .duo { display: flex; gap: 8px; } .duo div { flex: 1; } .duo img { max-height: 120mm; }
  .notiz { background: #f5f3ee; border-left: 3px solid #1a1815; padding: 8px 12px; font-size: 12.5px; margin-top: 8px; }
  .titelblatt p, li { font-size: 13px; line-height: 1.5; }
  .klein { font-size: 11px; color: #5c574d; }
</style></head><body>

<section class="seite titelblatt">
  <h1>KosmoOrbit v0.6.9 — Rundgang-Notizen</h1>
  <p><strong>«Offene Fenster, klare Antworten»</strong> · 10.07.2026 · ROADMAP 302–310</p>
  <ul>
    <li><strong>Parametrische Fenster:</strong> Einflügel/Zweiflügel/Fest/Fensterband mit Teilung n×m und Rahmenbreite — Kernel-Commands, 3D-Profile, Plan-Symbolik, Schnitt, 4 neue Goldens.</li>
    <li><strong>Curtain-Wall v1:</strong> «Fassadenband setzen» belegt eine ganze Fassadenseite atomar mit Fensterband-Openings im Pfostenraster — ehrlich als Fensterband benannt.</li>
    <li><strong>Wissen antwortet:</strong> Docling-Importe fliessen in die BM25-Quellen-Kette — Kosmo zitiert die eigene Import-Notiz als [Q]-Beleg (E2E-bewiesen).</li>
    <li><strong>Echtes KSelect:</strong> alle Dropdowns als eigene Menüs im Werkplan-Stil (Tastatur, Type-ahead, ARIA) — 72 E2E-Vertragsstellen als EIN kohärenter Schnitt umgestellt.</li>
    <li><strong>Kosmo-Blick fertig bewiesen:</strong> Grundriss-, Node- und Vis-Renderbild-Pfad end-to-end (dabei einen echten 0.6.8-Bug gefunden und behoben); Chip → Vollbild, Ringpuffer sichtbar.</li>
    <li><strong>Werkplan-Härte:</strong> Dach-Linienhierarchie (First/Traufe/Ortgang), SVG-QA-Loop v1 rastert alle Goldens automatisch, Bridge-Störe pro Instanz (H-31).</li>
    <li><strong>CI geheilt:</strong> der seit Tagen dauerrote Repo-Workflow hatte einen YAML-Parse-Fehler — Ein-Zeilen-Fix, erstmals grün inkl. E2E-Job.</li>
  </ul>
  <p class="klein">Vollsuite 308 passed / 1 skipped / 0 rot (31.6 min) · Unit 1452 · H-31/H-39/H-44 behoben · Kritik-Runden 1+2 · Release-Notiz ab ROADMAP 302</p>
</section>

${seite(
  '1 · Parametrisches Zweiflügel-Fenster — 3D und Plan, live',
  '01-fenster-zweifluegel-3d-plan.png',
  'design.fensterParametrieren macht aus einer bestehenden Öffnung ein Zweiflügel-Fenster (Teilung 2×1, Rahmen 60 mm): 3D zeigt die Rahmenprofile, der Plan Öffnungsbogen je Flügel und Teilungslinie. Additiv auf dem bestehenden Opening — Alt-Projekte und Bestands-Goldens blieben byte-identisch.',
)}

${seite(
  '2 · Fassadenband (Curtain-Wall v1) im Grundriss',
  '02-cw-fensterband-grundriss.png',
  'design.curtainWallSetzen belegt die Nordfassade in EINEM atomaren Command mit Fensterband-Öffnungen (Pfostenraster 1200, Eckabstand 150 mm); ausgelassene Segmente meldet das Summary ehrlich. Der Grundriss zeigt den Pfostentakt im Band.',
)}

<section class="seite">
  <h2>3 · Die neuen Golden-Pläne — Fenster in Ansicht und Schnitt</h2>
  <div class="duo">
    <div><img src="bilder/ansicht-curtainwall.png"><p class="klein">Ansicht: Curtain-Wall mit Pfosten-Riegel-Teilung</p></div>
    <div><img src="bilder/schnitt-fenster-parametrisch.png"><p class="klein">Schnitt: Sturz/Brüstung des parametrischen Fensters</p></div>
  </div>
  <div class="notiz"><strong>Notiz</strong> 4 neue Goldens (dazu Grundriss Zweiflügel + Fensterband), alle nach der 6-Kriterien-Rubrik sichtgeprüft — und neu zusätzlich vom SVG-QA-Loop (tools/svg-qa) automatisch gerastert und auf Sichtbarkeit, viewBox-Passung und Text-Überlappung geprüft (16/16 grün).</div>
</section>

${seite(
  '4 · Echtes KSelect — Auswahlmenü im Werkplan-Stil',
  '03-kselect-offen.png',
  'Die Dropdowns sind jetzt eigene Popups (role=listbox, ↑↓/Enter/Esc, Tipp-Suche, Fokusring) statt der Browser-Standardliste; das native Menü bleibt als dokumentierter Fluchtweg. Der alte E2E-Vertrag «31 Stück per selectOption» wurde bewusst als EIN Schnitt abgelöst: 72 Stellen in 20 Dateien laufen über den neuen Helfer waehleOption().',
)}

${seite(
  '5 · Kosmo sieht den Grundriss — Blick-Beweis mit Chip',
  '04-blick-grundriss-chip.png',
  'Der Mitschau-Beweis gilt jetzt für alle Pfade: Grundriss/Schnitt (SVG-Raster), Node-Fläche und echte Renderbilder. Dabei kam ein echter 0.6.8-Bug ans Licht: NodeLauf.bild ist ein Bridge-Dateiname, kein dataURL — der Vis-Renderbild-Blick scheiterte lautlos; jetzt holt ihn ein Bridge-Fetch. Der Chip öffnet per Klick eine Vollbild-Vorschau mit ehrlicher Zeitangabe.',
)}

${seite(
  '6 · Dach-Linienhierarchie im Werkplan',
  'grundriss-walmdach-flach.png',
  'First 0.5 / Traufe 0.35 / Ortgang+Grat 0.18 — die Dachkanten tragen jetzt differenzierte Strichstärken nach der bestehenden Schnittkanten-Skala (3 Goldens bewusst aktualisiert, nur stroke-width). Der First-Spalt der zwei Dachprismen ist strukturell geschlossen (geteilte Schnittpunkte statt doppelter Berechnung).',
)}

<section class="titelblatt">
  <h2>7 · Ehrliche Restliste (0.7.0)</h2>
  <ul>
    <li>Echter Cloud-/Ollama-Bildcall für den Kosmo-Blick (Owner-Schlüssel/HomeStation nötig — als Abnahmepunkt dokumentiert, nicht vorgetäuscht) · Video-/Dauerstream-Blick.</li>
    <li>Fenster: Öffnungsflügel-Simulation/Beschlag-Details · Opening-Hit-Testing direkt im Plan · Sichtbarkeits-Schalter für Fenster-Öffnungsbögen im Grundriss (H-42, Owner-Geschmack).</li>
    <li>K2 Referenz-3D-Download in den Viewport (Kür dieses Auftrags, aus Zeitgründen sauber vertagt) · K9 Publish-Export · D8 Parzellen-Zonentyp · OAuth-Härtetest.</li>
    <li>RAG-Anything/multimodales RAG über dem Import (bleibt WATCH — erst die Nutzung des BM25-Wegs beobachten).</li>
    <li>Layout: Inspector überlappt bei schmalen Viewports die Navigations-Leiste (H-43) · CurtainWallPanel-Sichtbarkeit in die useUiZustand-Buchführung.</li>
  </ul>
  <p class="klein">Erstellt automatisch aus dem 0.6.9-Stand · abgabe/RUNDGANG-NOTIZEN-0.6.9.pdf</p>
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
