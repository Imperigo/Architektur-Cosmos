/**
 * v0.6.6 Kritik-Runde 2 — die neuen W2/W3-Flächen: Vis-Palette, Kuratier-
 * Fläche, entzerrte Ketten, Viewport-Render-Knopf. Beide Themes.
 * Voraussetzungen: Preview :5183 (frisch!), Bridge --fake-worker :8600.
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const OUT = new URL('../../docs/rundgang/kritik-066/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.setDefaultTimeout(30000);
const shot = async (n: string, p = 700) => { await page.waitForTimeout(p); await page.screenshot({ path: `${OUT}${n}.png` }); console.log('✓', n); };
async function frisch(thema: 'paper' | 'ink') {
  await page.goto('http://localhost:5183');
  await page.evaluate((t) => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.thema', t);
    localStorage.setItem('kosmo.bridge', 'http://localhost:8600');
    localStorage.removeItem('kosmo.projekt.aktiv');
    indexedDB.deleteDatabase('kosmo-projekte');
  }, thema);
  await page.reload();
  await page.waitForSelector('[data-testid="module-design"]');
}
for (const thema of ['paper', 'ink'] as const) {
  const T = thema === 'paper' ? 'p' : 'i';
  // Vis: Palette + Drei Stimmungen 2× (Entzerrung) + Kuratier-Fläche
  await frisch(thema);
  await page.click('[data-testid="module-vis"]');
  await page.waitForTimeout(600);
  // Palette/Kuratier leben im NodeCanvas — der braucht einen Graphen.
  await page.click('[data-testid="graph-neu"]');
  await page.waitForSelector('[data-testid="node-canvas"]');
  await page.click('[data-testid="vis-palette-toggle"]');
  await shot(`${T}-11-vis-palette`);
  await page.click('[data-testid="vis-palette-toggle"]');
  await page.click('[data-testid="drei-stimmungen"]');
  await page.waitForTimeout(800);
  await page.click('[data-testid="drei-stimmungen"]');
  await page.waitForTimeout(800);
  const fit = page.locator('[data-testid="vis-zoom-fit"]');
  if (await fit.count()) await fit.click();
  await shot(`${T}-12-vis-ketten-entzerrt`, 1000);
  await page.click('[data-testid="vis-kuratier-toggle"]');
  await shot(`${T}-13-vis-kuratier-leer`);
  // Design 3D: Render-Knopf
  await frisch(thema);
  await page.click('[data-testid="load-tkb"]');
  await page.waitForTimeout(2200);
  await page.click('[data-testid="view-3d"]').catch(() => {});
  await shot(`${T}-14-viewport-render-knopf`, 1000);
}
await browser.close();
console.log('fertig');
