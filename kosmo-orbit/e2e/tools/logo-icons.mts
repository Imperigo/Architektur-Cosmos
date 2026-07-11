/**
 * v0.7.2 «Visuelles Update» §2 (Paket 01, Stream W1-A) — App-Icons.
 *
 * Rendert die STANDARD-Variante deterministisch (Playwright-Chromium,
 * SwiftShader) als PNG und COMMITTET die vier Dateien nach
 * `apps/kosmo-orbit/public/icons/` — exakt dieselben Namen wie bisher:
 * `icon-512.png`, `icon-192.png`, `icon-180.png`, `icon-512-maskable.png`.
 *
 * Konstruktion (Spec §2): Kreis mit dunklem Verlauf 155° `#171B24→#0B0D12`,
 * Rand `#2A3140`, darauf die Logo-«6a»-Zeichnung (Ring + Signal-Viertel +
 * Satellit + Neun-Quadrat-Zentrum) in ihren festen Marken-Farben (Ink
 * `#F4F6FA` / Signal `#57B6C2` — ein PNG hat kein Theme, darum hier
 * hartcodierte Hexwerte statt CSS-Variablen, dieselben wie im orbit-Thema).
 * `icon-512-maskable`: Hintergrund randlos (volle Kanvas, keine transparenten
 * Ecken — die OS-Maske schneidet sonst sichtbar frei), die komplette
 * Kreis+Zeichnung-Komposition auf eine zentrierte ~80%-Safe-Zone verkleinert
 * (Standard-Empfehlung für maskable Icons: Inhalt in den inneren ~80%,
 * Rest darf von jeder OS-Maskenform ohne Bild-/Zeichnungsverlust
 * weggeschnitten werden).
 *
 * Aufruf (aus kosmo-orbit/):
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx tsx e2e/tools/logo-icons.mts
 */
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT_DIR = new URL('../../apps/kosmo-orbit/public/icons/', import.meta.url).pathname;
mkdirSync(OUT_DIR, { recursive: true });

const INK = '#F4F6FA';
const SIGNAL = '#57B6C2';
const GRAD_VON = '#171B24';
const GRAD_BIS = '#0B0D12';
const BORDER = '#2A3140';

// 155°-Verlauf (CSS-Winkelkonvention, 0°="nach oben", im Uhrzeigersinn) als
// SVG-Gradientenlinie: Richtungsvektor (sin155°, -cos155°) ≈ (0.4226, 0.9063)
// in Objekt-Koordinaten (0..1), Endpunkte = Mittelpunkt ± Vektor/2.
const GRAD_X1 = '28.87%';
const GRAD_Y1 = '4.68%';
const GRAD_X2 = '71.13%';
const GRAD_Y2 = '95.32%';

/** Logo-«6a»-Zeichnung (Spec §2), viewBox 0..48 — Ring + Satellit + Zentrum. */
function logo6aFragment(): string {
  return `
    <circle cx="24" cy="24" r="17" stroke="${INK}" stroke-width="1.5" stroke-dasharray="2 4" stroke-linecap="round" opacity=".5"/>
    <path d="M 24 7 A 17 17 0 0 1 41 24" stroke="${SIGNAL}" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="40.3" cy="9.9" r="1.7" fill="${SIGNAL}"/>
    <rect x="17.5" y="17.5" width="13" height="13" rx="4" stroke="${INK}" stroke-width="1.4"/>
    <path d="M 21.8 17.5 V 30.5 M 26.2 17.5 V 30.5 M 17.5 21.8 H 30.5 M 17.5 26.2 H 30.5" stroke="${INK}" stroke-width="1" opacity=".7"/>
    <circle cx="24" cy="24" r="1.6" fill="${SIGNAL}"/>
  `;
}

function gradientDefs(): string {
  return `<linearGradient id="grad" x1="${GRAD_X1}" y1="${GRAD_Y1}" x2="${GRAD_X2}" y2="${GRAD_Y2}">
    <stop offset="0%" stop-color="${GRAD_VON}"/>
    <stop offset="100%" stop-color="${GRAD_BIS}"/>
  </linearGradient>`;
}

/** Baut das volle Icon-SVG (immer `viewBox="0 0 48 48"`, `size` skaliert nur
 *  die Ausgabe-Pixel). `maskable`: Hintergrund randlos, Komposition auf die
 *  Safe-Zone verkleinert (s. Datei-Kopf). */
function iconSvg(size: number, maskable: boolean): string {
  if (!maskable) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">
      <defs>${gradientDefs()}</defs>
      <circle cx="24" cy="24" r="23" fill="url(#grad)" stroke="${BORDER}" stroke-width="1.4"/>
      ${logo6aFragment()}
    </svg>`;
  }
  const scale = 0.8;
  const offset = (48 * (1 - scale)) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">
    <defs>${gradientDefs()}</defs>
    <rect x="0" y="0" width="48" height="48" fill="url(#grad)"/>
    <g transform="translate(${offset} ${offset}) scale(${scale})">
      <circle cx="24" cy="24" r="23" fill="none" stroke="${BORDER}" stroke-width="1.4"/>
      ${logo6aFragment()}
    </g>
  </svg>`;
}

const browser = await chromium.launch({
  executablePath: process.env['PLAYWRIGHT_CHROMIUM_PATH'],
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

async function rendern(dateiname: string, size: number, maskable = false): Promise<void> {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(
    `<!doctype html><html><head><style>html,body{margin:0;padding:0;background:transparent;}</style></head><body>${iconSvg(size, maskable)}</body></html>`,
  );
  await page.waitForTimeout(30);
  const buf = await page.screenshot({ omitBackground: !maskable });
  writeFileSync(`${OUT_DIR}${dateiname}`, buf);
  await page.close();
  // eslint-disable-next-line no-console
  console.log(`geschrieben: icons/${dateiname} (${size}×${size}${maskable ? ', maskable ~80%-Safe-Zone' : ''})`);
}

await rendern('icon-512.png', 512);
await rendern('icon-192.png', 192);
await rendern('icon-180.png', 180);
await rendern('icon-512-maskable.png', 512, true);

await browser.close();
