import { chromium } from '@playwright/test';

/**
 * v0.8.0B / W8c-B (Abnahme-Nachtrag: die 13 Design-Werkzeugpanels) —
 * Beleg-Screenshots. Muster `p7-design-shell-shots.mts`. Läuft gegen den
 * Preview-Build auf :5174 (W8c-B-Parallelbetrieb-Port).
 *  1  w8cb-panels-1.png — KosmoDesign mit mehreren offenen Werkzeugpanels
 *     im Dock (Raster + KV + Bauablauf + Draw + Kennzahlen), Orbit-Thema.
 *  2  w8cb-panels-2.png — dieselbe Collage im Papier-Thema.
 */

const BASE = `http://localhost:${process.env['KOSMO_E2E_PORT'] ?? '5174'}`;
const OUT = 'test-results';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

const DATEI = { orbit: 'w8cb-panels-1', paper: 'w8cb-panels-2' } as const;

for (const theme of ['orbit', 'paper'] as const) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.addInitScript((t) => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.thema', t);
    localStorage.setItem('kosmo.ui.v1', JSON.stringify({ version: 1, modusAutomatik: false, modusFesthalten: false, phasenFokus: null }));
    localStorage.setItem('kosmo.dock.presetInit.v1', '1');
  }, theme);
  await page.goto(BASE);
  await page.click('[data-testid="load-tkb"]');
  await page.waitForSelector('[data-testid="kennzahlen"]');
  await page.click('[data-testid="view-split"]');

  // Mehrere Werkzeugpanels ins Dock: Raster (links) · KV (links) ·
  // Bauablauf (links) · Draw (rechts) · Kennzahlen (rechts, immer offen).
  await page.click('[data-testid="raster-toggle"]');
  await page.click('[data-testid="kv-oeffnen"]');
  await page.click('[data-testid="bauablauf-oeffnen"]');
  await page.click('[data-testid="draw-toggle"]');
  await page.waitForSelector('[data-testid="dock-panel-rasterOffen"]');
  await page.waitForSelector('[data-testid="dock-panel-kvOffen"]');
  await page.waitForSelector('[data-testid="dock-panel-bauablaufOffen"]');
  await page.waitForSelector('[data-testid="dock-panel-drawOffen"]');
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${DATEI[theme]}.png` });
  await page.close();
}

await browser.close();
console.log('OK — 2 Screenshots geschrieben nach test-results/w8cb-panels-{1,2}.png');
