/**
 * V0.7.3 Phase 0 — Soll-Bilder-Extraktion (Plan «Kosmodesign», §Phase 0.3).
 *
 * Die R2-Referenzbilder (die vom Owner gewählten Gestaltungs-Entscheide
 * D1–D7) leben im ClaudeDesign-Canvas-HTML des Handoff-ZIPs. Bauagenten
 * vergleichen NUR gegen die hier erzeugten PNGs unter `docs/soll-073/` —
 * niemand liest das Handoff-HTML selbst (es enthält auch die VERWORFENEN
 * Varianten, gegen die niemand bauen darf).
 *
 * Quelle liegt im Session-Scratchpad — der Pfad kommt darum per Argument:
 *   npx tsx e2e/tools/soll-bilder-073.mts "<pfad zum Paket-Ordner>"
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const paketOrdner = process.argv[2];
if (!paketOrdner) throw new Error('Pfad zum «Kosmodesign v0.7.3 Paket»-Ordner als Argument angeben.');

const HTML = resolve(paketOrdner, 'Kosmodesign v0.7.3 Gestaltungspaket.dc.html');
const ZIEL = resolve(import.meta.dirname, '../../docs/soll-073');

/** Die R2-gewählten Varianten (README §D1–D7) — Name = id + Kurzbeschrieb. */
const SOLL: Array<[string, string]> = [
  ['2b', 'd1-strich-matrix'],
  ['3a', 'd2-fluegel-volle-konvention'],
  ['4b', 'd3-lod-treppe'],
  ['5b', 'd4-zwei-stimmen'],
  ['6a', 'd5-phase-entscheidet-modus'],
  ['7b', 'd6-beschlag-katalog-s0'],
  ['8a', 'd7-papier-theme'],
  ['8b', 'd7-kosmos-theme'],
  ['8c', 'd7-invarianz-papier-ist-papier'],
];

mkdirSync(ZIEL, { recursive: true });

const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}),
});
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 });
await page.goto(`file://${HTML}`);
// Das Canvas-HTML bootet seine Deck-Hülle mit React von unpkg — im Container
// ohne Netz bleibt `x-dc` darum auf `display:none`. Die Figuren selbst sind
// statisches HTML/SVG mit lokalen Styles: der Override macht sie sichtbar,
// ganz ohne CDN.
await page.addStyleTag({ content: 'x-dc { display: block !important; }' });
// Webfonts (Lato/IBM Plex Mono aus dem _ds-Bundle) fertig laden lassen —
// sonst rastern die Soll-Bilder mit Fallback-Metriken.
await page.evaluate(() => (document as Document & { fonts: FontFaceSet }).fonts.ready);
await page.waitForTimeout(500);

for (const [id, name] of SOLL) {
  // Attribut-Selektor statt `#2b` — ids, die mit Ziffern beginnen, sind
  // keine gültigen CSS-Id-Selektoren (und CSS.escape gibt es in Node nicht).
  const el = page.locator(`[id="${id}"]`);
  await el.scrollIntoViewIfNeeded();
  await el.screenshot({ path: `${ZIEL}/${id}-${name}.png` });
  console.log(`soll-073 → ${id}-${name}.png`);
}

await browser.close();
