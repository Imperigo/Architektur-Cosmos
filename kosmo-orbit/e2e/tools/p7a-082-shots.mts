import { chromium } from '@playwright/test';

/**
 * v0.8.2 / P7a (Kleinpaket-Sammel) — Beleg-Screenshots für B2 (Prepare-
 * Ladeanzeige) und B5 (Nutzungszeit 14/14-Abdeckung, trust/paket ehrlich
 * als "nicht separat erfasst"). Eigenständiges Skript (Muster
 * `p1-tokens-shots.mts`), kein Teil der Playwright-Testsuite selbst.
 */

const BASE = process.env['KOSMO_E2E_BASE'] ?? 'http://127.0.0.1:5175';
const OUT = 'test-results';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

type Kosmo = { open: (s: string) => void; run: (id: string, p: unknown) => unknown };

// ── 1) Prepare — Basis-Import-Fortschritt («Quelle X/Y», B2) ──
{
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.route('**/embed', async (route) => {
    await new Promise((r) => setTimeout(r, 400));
    await route.continue();
  });
  await page.goto(BASE);
  await page.click('[data-testid="module-prepare"]');
  await page.waitForSelector('[data-testid="basis-sektion"]');
  await page.click('[data-testid="basis-laden-projektwissen"]');
  await page.waitForSelector('[data-testid="basis-fortschritt-projektwissen"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/p7a-082-prepare-fortschritt.png` });
  await page.close();
}

// ── 2) Einstellungen — Nutzungszeit-Panel (14/14 Stationen, trust/paket
//    ehrlich "nicht separat erfasst") ──
{
  const page = await browser.newPage({ viewport: { width: 1400, height: 1400 } });
  await page.addInitScript(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.goto(BASE);
  await page.click('[data-testid="load-tkb"]');
  // Ein paar echte Klicks, damit die Liste nicht komplett "noch nie genutzt"
  // zeigt (Design/Data/Publish bekommen ein reales Gewicht).
  await page.evaluate(() => (window as unknown as { __kosmo: Kosmo }).__kosmo.open('design'));
  await page.evaluate(() => (window as unknown as { __kosmo: Kosmo }).__kosmo.open('data'));
  await page.evaluate(() => (window as unknown as { __kosmo: Kosmo }).__kosmo.open('publish'));
  await page.click('[data-testid="einstellungen-oeffnen"]');
  await page.waitForSelector('[data-testid="einstellungen-nutzungszeit"]');
  await page.locator('[data-testid="einstellungen-nutzungszeit"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/p7a-082-nutzungszeit-14.png` });
  await page.close();
}

await browser.close();
console.log('p7a-082 Screenshots geschrieben.');
