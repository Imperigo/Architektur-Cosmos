/**
 * v0.6.5 Kritik-Runde — Screenshot-Sammlung für das Kritiker-Panel.
 * Je Station 2–4 Zustände, beide Themes (paper/ink). Bilder →
 * docs/rundgang/kritik-065/. Voraussetzungen: Preview :5183, Bridge :8600.
 * Nutzung: npx tsx e2e/tools/kritik-shots-065.mts  (cwd kosmo-orbit/)
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const OUT = new URL('../../docs/rundgang/kritik-065/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const URL_ = process.env.RUNDGANG_URL ?? 'http://localhost:5183';

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.setDefaultTimeout(30000);

const shot = async (name: string, pause = 700) => {
  await page.waitForTimeout(pause);
  await page.screenshot({ path: `${OUT}${name}.png` });
  console.log(`✓ ${name}`);
};

async function frisch(thema: 'paper' | 'ink', tkb = true) {
  await page.goto(URL_);
  await page.evaluate((t) => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.thema', t);
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
    localStorage.removeItem('kosmo.panelOffen');
    localStorage.removeItem('kosmo.projekt.aktiv');
    indexedDB.deleteDatabase('kosmo-projekte');
  }, thema);
  await page.reload();
  await page.waitForSelector('[data-testid="module-design"]');
  if (tkb) {
    await page.click('[data-testid="load-tkb"]');
    await page.waitForTimeout(2200);
  }
}

for (const thema of ['paper', 'ink'] as const) {
  const T = thema === 'paper' ? 'p' : 'i';

  // Zentrale/Orbit: Ruhe + Fächer offen
  await frisch(thema, false);
  await shot(`${T}-01-zentrale`);
  await page.hover('[data-testid="orbit-haupt-design"]').catch(async () => {
    await page.hover('[data-testid="module-design"]');
  });
  await shot(`${T}-02-zentrale-faecher`);

  // KosmoDesign: 3D-Übersicht + 2D mit Werkzeugleiste + Export-Menü offen
  await frisch(thema);
  await page.click('[data-testid="module-design"]');
  await shot(`${T}-03-design-3d`);
  await page.click('[data-testid="view-2d"]');
  await shot(`${T}-04-design-2d`);
  const exportTrigger = page.locator('[data-testid="export-menu-toggle"]');
  if (await exportTrigger.count()) {
    await exportTrigger.click();
    await shot(`${T}-05-design-export-menu`);
  }

  // KosmoVis: Drei Stimmungen + Zoom-Leiste
  await page.click('[data-testid="module-vis"]');
  await page.waitForTimeout(600);
  const drei = page.locator('[data-testid="drei-stimmungen"]');
  if (await drei.count()) await drei.click();
  await shot(`${T}-06-vis-graph`, 1200);

  // KosmoData: Referenzen (Karten + Leerbilder)
  await page.click('[data-testid="module-data"]');
  await page.waitForTimeout(800);
  await shot(`${T}-07-data-referenzen`);

  // Einstellungen-Dialog
  await page.click('[aria-label="Einstellungen"]').catch(() => {});
  await shot(`${T}-08-einstellungen`);
  await page.keyboard.press('Escape');

  // Publish + Doc (W6-Stichproben)
  await page.click('[data-testid="module-publish"]');
  await shot(`${T}-09-publish`);
  await page.click('[data-testid="module-doc"]');
  await shot(`${T}-10-doc`);
}

await browser.close();
console.log('fertig →', OUT);
