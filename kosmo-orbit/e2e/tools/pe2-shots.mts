import { chromium, type Page } from '@playwright/test';

/**
 * PE2 (v0.8.4, Bauauftrag Punkt 5) — §8-3-4er-Screen-Beweis
 * (`docs/ISLAND-UI-SPEZ.md` §8 Punkt 3: «4er-Screen-Kollisionsregeln»).
 * Ein Screenshot je Station (design/vis/publish/prepare) mit OFFENER
 * Island-Leiste — derselbe Öffnungs-Weg (`.hover()` auf die Pill, dann die
 * Leiste abwarten) wie in `island-verdrahtung.spec.ts`/`vis-island.spec.ts`/
 * `publish-island.spec.ts`/`prepare-island.spec.ts`. Läuft gegen den
 * PE2-eigenen Preview-Build auf Port 5176 (Bauauftrag «Dein Port ist
 * 5176»), NICHT gegen die Playwright-Suite selbst (kein Test-Runner nötig,
 * reines Screenshot-Skript).
 */

const PORT = process.env['KOSMO_E2E_PORT'] ?? '5176';
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = 'e2e-results';

async function neueSeite(browser: import('@playwright/test').Browser): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto(BASE_URL);
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.bridge', 'http://localhost:8600');
  });
  await page.reload();
  return page;
}

async function oeffneInsel(page: Page, hoverArt: 'pill' | 'root', island: string): Promise<void> {
  const selektor = hoverArt === 'pill' ? `island-${island}-pill` : `island-${island}-root`;
  await page.hover(`[data-testid="${selektor}"]`);
  await page.waitForSelector(`[data-testid="island-${island}-leiste"]`, { state: 'visible', timeout: 10_000 });
}

interface StationAuftrag {
  name: string;
  moduleTestid: string;
  /** Pill-Hover-Selektor-Basis — design nutzt `island-<id>-pill`, die
   *  anderen Stationen `island-<id>-root` (Hover auf die ganze Insel-
   *  Wurzel, s. `vis-island.spec.ts`s `oeffneInsel`). */
  hoverArt: 'pill' | 'root';
  /** Eine Insel dieser Station, die sicher eine Leiste mit Werkzeugen zeigt. */
  insel: string;
  dateiname: string;
}

const STATIONEN: StationAuftrag[] = [
  { name: 'design', moduleTestid: 'module-design', hoverArt: 'pill', insel: 'zeichnen', dateiname: 'pe2-4er-design.png' },
  { name: 'vis', moduleTestid: 'module-vis', hoverArt: 'root', insel: 'graph', dateiname: 'pe2-4er-vis.png' },
  { name: 'publish', moduleTestid: 'module-publish', hoverArt: 'root', insel: 'blatt', dateiname: 'pe2-4er-publish.png' },
  { name: 'prepare', moduleTestid: 'module-prepare', hoverArt: 'root', insel: 'aufnahme', dateiname: 'pe2-4er-prepare.png' },
];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

for (const s of STATIONEN) {
  const page = await neueSeite(browser);
  await page.click(`[data-testid="${s.moduleTestid}"]`);
  await page.waitForTimeout(300); // Bootstrap (Geschosse/Projekt-Seed) abwarten, Muster e2e-Specs.
  await oeffneInsel(page, s.hoverArt, s.insel);
  await page.waitForTimeout(200); // Öffnungs-Animation ausklingen lassen (reducedMotion ist hier NICHT erzwungen).
  const pfad = `${OUT_DIR}/${s.dateiname}`;
  await page.screenshot({ path: pfad });
  console.log(`Geschrieben: ${pfad} (Station ${s.name}, Insel ${s.insel} offen)`);
  await page.close();
}

await browser.close();
