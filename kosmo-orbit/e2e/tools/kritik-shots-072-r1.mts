/**
 * Kritik-Shots v0.7.2 Runde 1 — nach W1-A (orbit-Theme, Logo 6a, Splash,
 * Fonts) + W1-B (Icon-Familie): Zentrale/OrbitStart, Design-Station mit
 * EntwurfsDock, Dock-Nahaufnahme, Einstellungen — jeweils in BEIDEN Themes
 * (orbit = neuer Standard, paper = Regressionswache).
 * Läuft gegen den frischen Preview auf :5183 (Bundle==dist vorher geprüft).
 * Ablage: docs/rundgang/kritik-072/.
 * Aufruf (aus kosmo-orbit/):
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx tsx e2e/tools/kritik-shots-072-r1.mts
 */
import { chromium, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = 'docs/rundgang/kritik-072';
mkdirSync(OUT, { recursive: true });
const URL_ = 'http://localhost:5183';

const browser = await chromium.launch({ executablePath: process.env['PLAYWRIGHT_CHROMIUM_PATH'] });

async function frisch(thema: 'orbit' | 'paper'): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript((t) => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.thema', t);
  }, thema);
  await page.goto(URL_);
  await page.waitForTimeout(1600);
  return page;
}

for (const thema of ['orbit', 'paper'] as const) {
  // 1 — Zentrale (OrbitStart-Hub mit den 4 Hauptwerkzeugen, neue Glyphen)
  {
    const page = await frisch(thema);
    await page.screenshot({ path: `${OUT}/r1-${thema}-01-zentrale.png` });
    await page.context().close();
  }
  // 2+3 — Design-Station mit EntwurfsDock + Dock-Nahaufnahme (Rollen-Punkte)
  {
    const page = await frisch(thema);
    await page.click('[data-testid="module-design"]');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/r1-${thema}-02-design-station.png` });
    const dock = page.locator('[data-testid="entwurf-dock"]');
    if (await dock.count()) {
      await dock.screenshot({ path: `${OUT}/r1-${thema}-03-entwurfsdock-nah.png` });
    }
    await page.context().close();
  }
  // 4 — Einstellungen (3-Segment-Thema-Wähler aus W1-A)
  {
    const page = await frisch(thema);
    await page.click('[data-testid="einstellungen-oeffnen"]');
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/r1-${thema}-04-einstellungen.png` });
    await page.context().close();
  }
}

await browser.close();
console.log('kritik-shots-072-r1: 8 Shots →', OUT);
