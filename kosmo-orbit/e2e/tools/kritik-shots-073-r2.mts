/**
 * Kritik-Shots v0.7.3 Runde 2 — Welle 2 (S4 D2/D3/D6 + S3 D4 Blatt-Typografie
 * inkl. D4-Ergänzung messbare Plan-Schrift + Plankopf). Vergleich NUR gegen die
 * Soll-Bilder in `docs/soll-073/`:
 *   - Ansicht-Flügeltypen (Vollkonvention innen/aussen) vs 3a
 *   - Grundriss-Kontext-LOD in drei Phasen (wettbewerb/baueingabe/werkplan) vs 4b
 *   - Werkplan-Beschlag-Katalog S0 vs 7b
 *   - Plan-Blatt MIT neuem Plankopf (Lato Heavy versal + Mono-Meta) + ein
 *     Report-Blatt (Zwei-Stimmen) vs 5b
 * plus Textbelege: D4-Golden-Diffstat (gesamt) und pdffonts-Ausgabe.
 *
 * Die Goldens tragen NUR font-family-Strings ('Lato' / 'IBM Plex Mono'), KEINE
 * eingebetteten Fonts (Golden-Regime). Damit die Zwei-Stimmen-Typografie im
 * Shot FAITHFUL erscheint (statt Rasterizer-Fallback), injiziert dieses Skript
 * @font-face mit GENAU den committeten, latin-subsetteten TTFs aus
 * `apps/kosmo-orbit/public/fonts/pdf/` (dieselben Dateien, die der PDF-Weg
 * einbettet) — ehrlich: das ist der App-Download-/PDF-Font, nicht der Golden.
 *
 * Bundle==dist wird HIER bewiesen: das von :5183 gelieferte index.html muss
 * byte-identisch zu apps/kosmo-orbit/dist/index.html sein — sonst Abbruch.
 *
 * Aufruf (aus kosmo-orbit/, Preview auf :5183 muss laufen):
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium \
 *   npx tsx e2e/tools/kritik-shots-073-r2.mts
 */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const OUT = 'docs/rundgang/kritik-073-r2';
mkdirSync(OUT, { recursive: true });
const URL_ = 'http://localhost:5183';
const GOLDEN = 'packages/kosmo-kernel/test/golden';
const FONTS = 'apps/kosmo-orbit/public/fonts/pdf';
const BASIS = 'd160283'; // Welle-2-D4-Startpunkt (S4 integriert), fuer den Diffstat

// 0 — Bundle==dist-Beweis: Preview liefert exakt das gebaute index.html
{
  const dist = readFileSync('apps/kosmo-orbit/dist/index.html', 'utf8');
  const live = await (await fetch(`${URL_}/`)).text();
  if (dist !== live) {
    console.error('ABBRUCH: Preview auf :5183 liefert NICHT dist/index.html (Bundle!=dist).');
    process.exit(1);
  }
  console.log('Bundle==dist bewiesen: index.html byte-identisch (', dist.length, 'Bytes ).');
}

// @font-face aus den committeten PDF-TTFs (data-URI, robust in Chromium)
const b64 = (p: string): string => readFileSync(p).toString('base64');
const fontCss = `
@font-face{font-family:'Lato';font-style:normal;font-weight:400 900;src:url(data:font/ttf;base64,${b64(`${FONTS}/lato-900-latin-pdf.ttf`)}) format('truetype');}
@font-face{font-family:'IBM Plex Mono';font-style:normal;font-weight:400;src:url(data:font/ttf;base64,${b64(`${FONTS}/ibm-plex-mono-400-latin-pdf.ttf`)}) format('truetype');}
@font-face{font-family:'IBM Plex Mono';font-style:normal;font-weight:500 700;src:url(data:font/ttf;base64,${b64(`${FONTS}/ibm-plex-mono-600-latin-pdf.ttf`)}) format('truetype');}
`;

const browser = await chromium.launch({ executablePath: process.env['PLAYWRIGHT_CHROMIUM_PATH'] });

// Manche Goldens (rahmenlose Ansichten, px-Report-Blätter) tragen NUR viewBox,
// kein width/height → beim Inline-Einbetten kollabiert das SVG. Wir leiten aus
// der viewBox explizite Pixelmasse ab (längste Kante auf ~1300 px skaliert).
function mitMassen(svg: string): string {
  if (/<svg[^>]*\bwidth=/.test(svg)) return svg;
  const vb = svg.match(/viewBox="([\-0-9.]+)\s+([\-0-9.]+)\s+([\-0-9.]+)\s+([\-0-9.]+)"/);
  if (!vb) return svg;
  const w = parseFloat(vb[3]!);
  const h = parseFloat(vb[4]!);
  const k = 1300 / Math.max(w, h);
  return svg.replace(/<svg /, `<svg width="${Math.round(w * k)}" height="${Math.round(h * k)}" `);
}

async function shotGolden(name: string, out: string): Promise<void> {
  const svg = mitMassen(readFileSync(resolve(GOLDEN, `${name}.svg`), 'utf8'));
  const page = await browser.newPage({ viewport: { width: 1400, height: 1600 }, deviceScaleFactor: 2 });
  await page.setContent(
    `<!doctype html><html><head><meta charset="utf-8"><style>${fontCss}
      html,body{margin:0;background:#fff;} .wrap{display:inline-block;background:#fff;padding:10px;}
      svg{display:block;max-width:1360px;height:auto;}</style></head>
      <body><div class="wrap">${svg}</div></body></html>`,
    { waitUntil: 'load' },
  );
  await page.evaluate(async () => {
    await (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready;
  });
  await page.waitForTimeout(350);
  const el = await page.$('.wrap');
  await el!.screenshot({ path: `${OUT}/${out}.png` });
  await page.close();
  console.log('Shot:', out);
}

// 1 — D2 Flügel-Vollkonvention (innen voll / aussen gestrichelt) vs soll-073/3a
await shotGolden('ansicht-fluegeltypen', 'r2-d2-ansicht-fluegeltypen');

// 2 — D3 Kontext-LOD-Treppe, drei Phasen vs soll-073/4b
for (const ph of ['wettbewerb', 'baueingabe', 'werkplan'] as const) {
  await shotGolden(`grundriss-kontext-${ph}`, `r2-d3-kontext-${ph}`);
}

// 3 — D6 Beschlag-Katalog S0 (Werkplan) vs soll-073/7b
await shotGolden('werkplan-beschlag', 'r2-d6-werkplan-beschlag');

// 4 — D4 Zwei-Stimmen vs soll-073/5b:
//     (a) echtes Plan-Blatt MIT dem neuen Plankopf (Titel Lato Heavy versal,
//         Meta 1:100 · Masse in cm/m · Datum · Phase in IBM Plex Mono);
//     (b) ein Report-Blatt (Ausnützungsnachweis) mit Titel/Tabellen-Zwei-Stimmen.
await shotGolden('grundriss-testhaus', 'r2-d4-planblatt-plankopf');
await shotGolden('ausnuetzungsnachweis', 'r2-d4-report-zwei-stimmen');

await browser.close();

// 5 — Textbelege: D4-Golden-Diffstat (gesamt S3 + Ergänzung + Plankopf) + pdffonts
const diffstat = execSync(`git diff --stat ${BASIS}..HEAD -- packages/kosmo-kernel/test/golden/`, { encoding: 'utf8' });
execSync('node docs/rundgang/d4-pdffonts-stichprobe.mjs > /dev/null 2>&1');
const pdffonts = execSync('pdffonts docs/rundgang/d4-pdffonts-stichprobe.pdf', { encoding: 'utf8' });
writeFileSync(
  `${OUT}/r2-belege.txt`,
  `KRITIK-2 BELEGE (v0.7.3 Welle 2)\n\n` +
    `D4-Golden-Diffstat (${BASIS}..HEAD, nur test/golden/):\n${diffstat}\n` +
    `pdffonts auf einem erzeugten Blatt-PDF (Lato + IBM Plex Mono muessen embedded=yes sein):\n${pdffonts}\n`,
);
console.log('kritik-shots-073-r2: Shots + Belege →', OUT);
