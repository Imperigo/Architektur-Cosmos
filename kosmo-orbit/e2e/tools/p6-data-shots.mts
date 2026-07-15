import { chromium } from '@playwright/test';

/**
 * v0.8.0B / W6 (Stations-Welle KosmoData) — Beleg-Screenshots.
 * Muster `p5-vis-shots.mts`. Läuft gegen den Preview-Build auf :5183 (kein
 * paralleler Worktree in dieser Welle, keine CORS-Ausweich-Notwendigkeit).
 *  1/2  p6-data-{orbit,papier}.png — Referenzen-Tab: Quellen-/Epochen-Rail,
 *       Referenztabelle (Hairline statt Kästen), Dossier mit KKeyValue
 *       (Geo/Materialprofil), im Themenpaar.
 */

const BASE = 'http://localhost:5183';
const OUT = 'test-results';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

async function neueSeite(theme: 'orbit' | 'paper') {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.addInitScript((t) => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.thema', t);
  }, theme);
  await page.goto(BASE);
  await page.click('[data-testid="module-data"]');
  await page.waitForSelector('[data-testid="ref-card"]');
  await page.fill('[data-testid="data-search"]', 'Villa Savoye');
  await page.click('[data-testid="ref-card"]');
  await page.waitForSelector('[data-testid="ref-detail-dossier"]');
  await page.waitForTimeout(400);
  return page;
}

const DATEI_SUFFIX = { orbit: 'orbit', paper: 'papier' } as const;

for (const theme of ['orbit', 'paper'] as const) {
  const page = await neueSeite(theme);
  await page.screenshot({ path: `${OUT}/p6-data-${DATEI_SUFFIX[theme]}.png` });
  await page.close();
}

await browser.close();
console.log('OK — 2 Screenshots geschrieben nach test-results/p6-data-{orbit,papier}.png');
