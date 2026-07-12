/**
 * Kritik-Shots v0.7.4 Runde 1 — Welle 1 (P1 SIA-Hochzahl-Tspan, P4 Plankopf-
 * Typografie, P5a Projektions-Ton, P5b Abbruch-Kadenz): EIN Beweis-Blatt
 * (dieselbe Nachweis-Fixtur wie `packages/kosmo-kernel/test/
 * w1-nachweis-074.test.ts`: Aussenwand 3615 mm, Fenster 1505/900,
 * freistehende Abbruch-Wand, Volumenkörper) vorher/nachher — als SVG-
 * Screenshot UND als produktionsechtes PDF (jsPDF + svg2pdf.js + die
 * eingebetteten TTF-Fonts aus `apps/kosmo-orbit/public/fonts/pdf/`, exakt
 * derselbe Pfad wie `export-plan.ts`).
 *
 * «Vorher» = Stand `c8e0a4b` (0.7.3 released, vor Welle 1): die zwei
 * betroffenen Quelldateien werden per `git show` kurzzeitig auf diesen
 * Stand zurückgesetzt, ein Kind-Prozess erzeugt das Vorher-SVG, danach
 * `git checkout --` stellt den committeten (gefixten) Stand sauber wieder
 * her — SOFORT, bevor irgendetwas anderes läuft (kein Fenster, in dem ein
 * Absturz den Vorher-Stand liegen liesse).
 *
 * Aufruf (aus kosmo-orbit/):
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium \
 *   npx tsx e2e/tools/kritik-shots-074-r1.mts
 *
 * Intern arbeitet das Skript mit einem Worker-Modus (`--worker <out.json>`),
 * weil Node ES-Module-Caching ein zweites Neuladen derselben Datei nach
 * dem Datei-Swap sonst verhindert — jeder Stand (vorher/nachher) läuft in
 * einem FRISCHEN Kindprozess.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HIER = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HIER, '..', '..', '..'); // /home/user/Architektur-Cosmos
const PKG = resolve(HIER, '..', '..', 'packages', 'kosmo-kernel');
const PLANSVG = resolve(PKG, 'src', 'derive', 'plansvg.ts');
const DIMENSIONS = resolve(PKG, 'src', 'derive', 'dimensions.ts');
const OUT = resolve(HIER, '..', '..', 'docs', 'rundgang', 'kritik-074');
mkdirSync(OUT, { recursive: true });

const VORHER_REV = 'c8e0a4b'; // 0.7.3 released, letzter Stand vor Welle 1

// ─────────────────────────────────────────────────────────────────────────
// Worker-Modus: EIN Prozess, EIN Stand — baut die Nachweis-Fixtur und
// schreibt das volle Plan-SVG (planToSvg, inkl. Plankopf/Nordpfeil) als
// JSON nach argv[3].
// ─────────────────────────────────────────────────────────────────────────
if (process.argv[2] === '--worker') {
  const zielPfad = process.argv[3]!;
  const { KosmoDoc } = await import('../../packages/kosmo-kernel/src/model/doc.ts');
  const { execute } = await import('../../packages/kosmo-kernel/src/commands/core.ts');
  await import('../../packages/kosmo-kernel/src/commands/design.ts');
  await import('../../packages/kosmo-kernel/src/commands/publish.ts');
  const { planToSvg, A3_QUER } = await import('../../packages/kosmo-kernel/src/derive/plansvg.ts');

  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  const storeyId = (eg.patches[0] as { id: string }).id;
  const aufbau = execute(doc, 'design.aufbauErstellen', {
    name: 'AW Beton 25',
    target: 'wall',
    layers: [{ material: 'beton', thickness: 250, function: 'tragend' }],
  });
  const assemblyId = (aufbau.patches[0] as { id: string }).id;
  const wand = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    execute(doc, 'design.wandZeichnen', { storeyId, a, b, assemblyId });

  // Aussenrechteck: Südwand 3615 mm → äussere Kette 361/361⁵ (mm-Rest 5, P1)
  wand({ x: 0, y: 0 }, { x: 3615, y: 0 });
  wand({ x: 3615, y: 0 }, { x: 3615, y: 4000 });
  wand({ x: 3615, y: 4000 }, { x: 0, y: 4000 });
  const west = wand({ x: 0, y: 4000 }, { x: 0, y: 0 });
  const westId = (west.patches[0] as { id: string }).id;

  // Fenster Höhe 1505/Brüstung 900 → Zusatzzeile «150⁵/90» (P1-Komposit)
  execute(doc, 'design.oeffnungSetzen', {
    wallId: westId,
    openingType: 'fenster',
    center: 2000,
    width: 1200,
    height: 1505,
    sill: 900,
  });

  // Freistehende Abbruch-Wand (P5b)
  const abbruch = wand({ x: 6000, y: 0 }, { x: 6000, y: 2000 });
  const abbruchId = (abbruch.patches[0] as { id: string }).id;
  execute(doc, 'design.renovationSetzen', { ids: [abbruchId], status: 'abbruch' });

  // Volumenkörper (P5a)
  execute(doc, 'design.volumenErstellen', {
    storeyId,
    outline: [
      { x: 9000, y: 0 },
      { x: 11000, y: 0 },
      { x: 11000, y: 2000 },
      { x: 9000, y: 2000 },
    ],
    height: 3000,
  });

  const svg = planToSvg(doc, storeyId, {
    scale: 100,
    paper: A3_QUER,
    projectName: 'Kritik 074',
    planTitle: 'Nachweis-Fixtur Welle 1',
    date: '12.07.2026',
  });
  writeFileSync(zielPfad, JSON.stringify({ svg }));
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────────────────
// Orchestrierung
// ─────────────────────────────────────────────────────────────────────────
function erzeugeSvg(stand: 'vorher' | 'nachher'): string {
  const tmp = resolve(OUT, `._tmp-${stand}.json`);
  execFileSync('npx', ['tsx', fileURLToPath(import.meta.url), '--worker', tmp], {
    cwd: resolve(HIER, '..', '..'),
    stdio: 'inherit',
  });
  const { svg } = JSON.parse(readFileSync(tmp, 'utf8')) as { svg: string };
  return svg;
}

// 1 — NACHHER zuerst (aktueller, gefixter, bereits committeter Stand)
console.log('Erzeuge NACHHER-SVG (aktueller Fix-Stand)…');
const nachherSvg = erzeugeSvg('nachher');
writeFileSync(join(OUT, 'nachweis-074-nachher.svg'), nachherSvg);

// 2 — VORHER: Quelldateien kurzzeitig auf c8e0a4b zurücksetzen
console.log(`Setze plansvg.ts/dimensions.ts kurzzeitig auf ${VORHER_REV} zurück…`);
const plansvgAlt = execFileSync('git', ['show', `${VORHER_REV}:kosmo-orbit/packages/kosmo-kernel/src/derive/plansvg.ts`], {
  cwd: REPO_ROOT,
  encoding: 'utf8',
});
const dimensionsAlt = execFileSync('git', ['show', `${VORHER_REV}:kosmo-orbit/packages/kosmo-kernel/src/derive/dimensions.ts`], {
  cwd: REPO_ROOT,
  encoding: 'utf8',
});
writeFileSync(PLANSVG, plansvgAlt);
writeFileSync(DIMENSIONS, dimensionsAlt);

let vorherSvg: string;
try {
  console.log('Erzeuge VORHER-SVG (Stand 0.7.3)…');
  vorherSvg = erzeugeSvg('vorher');
} finally {
  // SOFORT zurücksetzen — bevor irgendetwas anderes (Screenshot/PDF) läuft,
  // das bei einem Absturz den Vorher-Stand liegen lassen könnte.
  console.log('Setze plansvg.ts/dimensions.ts sauber zurück (git checkout --)…');
  execFileSync('git', ['checkout', '--', 'kosmo-orbit/packages/kosmo-kernel/src/derive/plansvg.ts', 'kosmo-orbit/packages/kosmo-kernel/src/derive/dimensions.ts'], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
  const status = execFileSync('git', ['status', '--porcelain', '--', 'kosmo-orbit/packages/kosmo-kernel/src/derive/plansvg.ts', 'kosmo-orbit/packages/kosmo-kernel/src/derive/dimensions.ts'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  if (status.trim() !== '') {
    console.error('ABBRUCH: plansvg.ts/dimensions.ts sind NICHT sauber zurückgesetzt:\n', status);
    process.exit(1);
  }
  console.log('Bestätigt: plansvg.ts/dimensions.ts wieder byte-identisch zum committeten Fix-Stand.');
}
writeFileSync(join(OUT, 'nachweis-074-vorher.svg'), vorherSvg);

// 3 — Playwright: Screenshots + produktionsechtes PDF (jsPDF + svg2pdf.js +
//     dieselben TTF-Fonts wie export-plan.ts)
const { chromium } = await import('playwright');
const browser = await chromium.launch({ executablePath: process.env['PLAYWRIGHT_CHROMIUM_PATH'] });

// Chromium verweigert `file://`-Font-Ladungen aus einer file://-/about:blank-
// Seite («Not allowed to load local resource») — die Fonts darum als
// data:-URI (base64) einbetten, exakt wie `fonts.css` beide Lato-Schnitte
// (400 Regular fürs Untertitel/N, 700 Bold für den Titel) self-hostet.
const b64Font = (rel: string) => readFileSync(resolve(HIER, '..', '..', 'apps', 'kosmo-orbit', 'public', 'fonts', rel)).toString('base64');
const FONTS_CSS = `
@font-face { font-family: 'Lato'; font-weight: 400; src: url('data:font/woff2;base64,${b64Font('lato-latin-400-normal.woff2')}') format('woff2'); }
@font-face { font-family: 'Lato'; font-weight: 700; src: url('data:font/woff2;base64,${b64Font('lato-latin-700-normal.woff2')}') format('woff2'); }
@font-face { font-family: 'IBM Plex Mono'; font-weight: 400; src: url('data:font/woff2;base64,${b64Font('ibm-plex-mono-latin-400-normal.woff2')}') format('woff2'); }
`;

// 3a — Volle Plankopf/Nordpfeil-Ansicht (P4) + Grundriss-Ausschnitt
//      (P1/P5a/P5b) je Stand, mit den ECHTEN Webfonts geladen (sonst zeigt
//      der Font-Fallback Helvetica optisch identisch zu Lato und der P4-Fix
//      wäre im Screenshot unsichtbar).
for (const [stand, svg] of [
  ['vorher', vorherSvg],
  ['nachher', nachherSvg],
] as const) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
  await page.setContent(`<!DOCTYPE html><html><head><style>${FONTS_CSS} body{margin:0;background:#fff;}</style></head><body>${svg}</body></html>`, {
    waitUntil: 'load',
  });
  await page.evaluate(async () => {
    // @ts-expect-error — document.fonts existiert im Browser
    await document.fonts.ready;
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, `r1-${stand}-vollblatt.png`) });
  // Plankopf-Ausschnitt (Nordpfeil «N» + Untertitel, P4) — zwei separate
  // Crops (Nordpfeil oben rechts, Untertitel unten links; SVG 420×297mm ≈
  // 1587×1122 CSS-px bei 96dpi, Viewport 1600×1100).
  await page.screenshot({ path: join(OUT, `r1-${stand}-nordpfeil.png`), clip: { x: 1460, y: 20, width: 140, height: 110 } });
  await page.screenshot({ path: join(OUT, `r1-${stand}-untertitel.png`), clip: { x: 0, y: 1045, width: 420, height: 55 } });
  // Grundriss-Ausschnitt (Bemassung mit Hochzahl P1, Abbruch-Wand P5b,
  // Volumenkörper P5a) — Layout ist deterministisch (immer dieselbe Fixtur).
  await page.screenshot({ path: join(OUT, `r1-${stand}-grundriss.png`), clip: { x: 100, y: 260, width: 1000, height: 520 } });
  await page.context().close();
}

// 3b — Produktionsechtes PDF: jsPDF + svg2pdf.js + dieselben eingebetteten
//      TTFs wie `apps/kosmo-orbit/src/modules/design/export-plan.ts`
//      (`betteD4PdfFontsEin`). Läuft in Chromium (nicht jsdom — jsdom kennt
//      weder `getBBox` noch Canvas-Textmessung, s. Kommentar im Kopf dieser
//      Datei; das ist das dokumentierte Test-Harness-Artefakt, KEIN
//      Produktionsbug — die echte App lädt die Fonts vor dem Export, hier
//      bauen wir dieselbe Reihenfolge in einer echten Browser-Engine nach).
const JSPDF_UMD = resolve(HIER, '..', '..', 'node_modules', 'jspdf', 'dist', 'jspdf.umd.js');
const SVG2PDF_UMD = resolve(HIER, '..', '..', 'node_modules', 'svg2pdf.js', 'dist', 'svg2pdf.umd.js');
const FONTS_DIR = resolve(HIER, '..', '..', 'apps', 'kosmo-orbit', 'public', 'fonts', 'pdf');
const PDF_FONTS = [
  { datei: 'lato-900-latin-pdf.ttf', vfs: 'Lato-900.ttf', familie: 'Lato', stil: 'bold' },
  { datei: 'ibm-plex-mono-400-latin-pdf.ttf', vfs: 'IBMPlexMono-400.ttf', familie: 'IBM Plex Mono', stil: 'normal' },
  { datei: 'ibm-plex-mono-600-latin-pdf.ttf', vfs: 'IBMPlexMono-600.ttf', familie: 'IBM Plex Mono', stil: 'bold' },
];

for (const [stand, svg] of [
  ['vorher', vorherSvg],
  ['nachher', nachherSvg],
] as const) {
  const page = await browser.newPage();
  await page.goto('about:blank');
  await page.addScriptTag({ path: JSPDF_UMD });
  await page.addScriptTag({ path: SVG2PDF_UMD });
  const fontsB64 = PDF_FONTS.map((f) => ({ ...f, b64: readFileSync(join(FONTS_DIR, f.datei)).toString('base64') }));
  const pdfBase64: string = await page.evaluate(
    async ({ svg, fontsB64, paperW, paperH }) => {
      // @ts-expect-error — UMD-Globals aus den <script>-Tags
      const { jsPDF } = window.jspdf;
      const holder = document.createElement('div');
      holder.innerHTML = svg;
      const svgEl = holder.querySelector('svg')!;
      document.body.appendChild(svgEl);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
      for (const f of fontsB64) {
        pdf.addFileToVFS(f.vfs, f.b64);
        pdf.addFont(f.vfs, f.familie, f.stil);
      }
      // @ts-expect-error — UMD-Global aus dem <script>-Tag
      await window.svg2pdf.svg2pdf(svgEl, pdf, { x: 0, y: 0, width: paperW, height: paperH });
      svgEl.remove();
      const buf = pdf.output('arraybuffer') as ArrayBuffer;
      let bin = '';
      const bytes = new Uint8Array(buf);
      const CHUNK = 0x8000;
      for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
      return btoa(bin);
    },
    { svg, fontsB64, paperW: 420, paperH: 297 },
  );
  await page.context().close();
  const pdfPath = join(OUT, `nachweis-074-${stand}.pdf`);
  writeFileSync(pdfPath, Buffer.from(pdfBase64, 'base64'));
  console.log(`PDF geschrieben: ${pdfPath}`);
  // Rasterisieren (pdftoppm, Poppler) — dasselbe Werkzeug wie
  // docs/rundgang/d4-pdffonts-stichprobe.mjs. Crop auf den Bemassungs-
  // Bereich der äusseren Kette (P1-Beweis).
  try {
    execFileSync('pdftoppm', ['-png', '-r', '300', pdfPath, join(OUT, `nachweis-074-${stand}`)], { stdio: 'inherit' });
  } catch (e) {
    console.warn('pdftoppm nicht verfügbar oder fehlgeschlagen — PDF bleibt als Beleg, PNG-Raster entfällt.', e);
  }
}

await browser.close();
console.log('kritik-shots-074-r1: Shots + PDF-Beleg →', OUT);
