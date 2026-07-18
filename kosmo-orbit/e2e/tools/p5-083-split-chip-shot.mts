import { chromium } from '@playwright/test';

/**
 * v0.8.3 / P5 (E8 §8, Alt-Flakes-Doppelfix) — Abnahme-Screenshot: der
 * `3D | Plan`-Split (`dw-viewport-flex--getrennt`) mit offenem Modus-Menü,
 * derselbe eingefrorene Zustand wie `kosmo-ui-bruecke.spec.ts` Test (d) und
 * `e2e/statusleiste-nav-overlap.spec.ts`. Zeigt den Modus-Chip/das
 * Modus-Menü sichtbar VOR (nicht hinter) der linken `NavLeiste`
 * (`nav-3d`/`nav-pan`) — der optische Beweis zum `elementFromPoint`-Beweis
 * der Specs. Läuft gegen den eigenen Preview-Build (Standard :5176, per
 * `KOSMO_SHOT_URL` überschreibbar).
 */

const BASE = process.env['KOSMO_SHOT_URL'] ?? 'http://localhost:5176';
const OUT = 'test-results';

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto(BASE);
await page.evaluate(() => {
  localStorage.setItem('kosmo.onboarded', '1');
  localStorage.setItem('kosmo.starterGuide.done', '1');
  localStorage.setItem('kosmo.panelOffen', '1');
  localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
  localStorage.setItem(
    'kosmo.ui.v1',
    JSON.stringify({ version: 1, modusAutomatik: false, modusFesthalten: false, phasenFokus: null, designOberflaeche: 'manuell' }),
  );
});
await page.reload();
await page.click('[data-testid="module-design"]');
await page.waitForSelector('[data-testid="view-split"][aria-pressed="true"]');
await page.click('[data-testid="modus-chip"]');
await page.waitForSelector('[data-testid="modus-menu"]');
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/p5-083-split-chip.png` });
await browser.close();
console.log(`OK — test-results/p5-083-split-chip.png geschrieben (BASE=${BASE})`);
