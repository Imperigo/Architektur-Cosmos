/**
 * Kritik-Shots v0.7.2 Runde 2 — nach W2-C (Phasen & Ordnung) + W2-D
 * (Kosmo-Zustände + Feedback): alle 9 Orb-Zustände (Test-Hook
 * `window.__kosmoStatus`), Phasen-Leiste, Hub-Rang-Umsortierung über
 * Phasenwechsel (deterministisch statt Klick-Simulation), EntwurfsDock
 * Glas/Hover-Sog — orbit UND paper (Regressionswache).
 * Läuft gegen den frischen Preview auf :5183 (Bundle==dist vorher geprüft).
 * Ablage: docs/rundgang/kritik-072/.
 * Aufruf (aus kosmo-orbit/):
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx tsx e2e/tools/kritik-shots-072-r2.mts
 */
import { chromium, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = 'docs/rundgang/kritik-072';
mkdirSync(OUT, { recursive: true });
const URL_ = 'http://localhost:5183';

const browser = await chromium.launch({ executablePath: process.env['PLAYWRIGHT_CHROMIUM_PATH'] });

async function frisch(thema: 'orbit' | 'paper', deviceScaleFactor = 1): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor });
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

// 1 — Die 9 Kosmo-Zustände (orbit; Symbol-Nahaufnahme mit 4× Pixeldichte —
//     ehrliche Vergrösserung für die Kritik, takeover als Vollbild 1×)
{
  const page = await frisch('orbit', 4);
  await page.click('[data-testid="module-design"]');
  await page.waitForTimeout(1200);
  const zustaende = [
    'idle',
    'thinking',
    'listening',
    'speaking',
    'writing',
    'dispatching',
    'done',
    'error',
  ] as const;
  for (const z of zustaende) {
    await page.evaluate((zz) => {
      (window as never as { __kosmoStatus: { setzeZustand(z: string): void } }).__kosmoStatus.setzeZustand(zz);
    }, z);
    await page.waitForTimeout(z === 'done' || z === 'error' ? 250 : 700); // Decay 2s/4s — vorher schiessen
    await page.locator('[data-testid="kosmo-symbol"]').screenshot({
      path: `${OUT}/r2-orbit-zustand-${z}.png`,
    });
  }
  // takeover: Fensterrahmen-Overlay + Chip — Vollbild
  await page.evaluate(() => {
    (window as never as { __kosmoStatus: { setzeZustand(z: string): void } }).__kosmoStatus.setzeZustand('takeover');
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/r2-orbit-zustand-takeover.png` });
  await page.context().close();
}

// 2 — Phasen-Leiste: Default (wettbewerb ⇒ Segment 2) + Klick auf Segment 4
{
  const page = await frisch('orbit');
  await page.screenshot({ path: `${OUT}/r2-orbit-phasenleiste-default.png`, clip: { x: 0, y: 0, width: 1440, height: 120 } });
  await page.click('[data-testid="phasen-leiste-4"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/r2-orbit-phasenleiste-seg4.png`, clip: { x: 0, y: 0, width: 1440, height: 120 } });
  await page.context().close();
}

// 3 — Hub-Rang: Design-Fächer in Phase 2 (wettbewerb) vs. Phase 4
//     (ausschreibung) — die BASE-getriebene Umsortierung + Top-3-Optik.
{
  const page = await frisch('orbit');
  await page.locator('[data-testid="orbit-haupt-design"]').hover();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/r2-orbit-hub-faecher-phase2.png` });
  await page.mouse.move(20, 400);
  await page.waitForTimeout(400);
  await page.click('[data-testid="phasen-leiste-4"]');
  await page.waitForTimeout(900); // FLIP/Hysterese
  await page.locator('[data-testid="orbit-haupt-design"]').hover();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/r2-orbit-hub-faecher-phase4.png` });
  await page.context().close();
}

// 4+5 — EntwurfsDock: Glas-Optik (orbit) + Hover-Sog; paper als Regression
for (const thema of ['orbit', 'paper'] as const) {
  const page = await frisch(thema);
  await page.click('[data-testid="module-design"]');
  await page.waitForTimeout(1200);
  const dock = page.locator('[data-testid="entwurf-dock"]');
  await dock.screenshot({ path: `${OUT}/r2-${thema}-dock.png` });
  // Hover-Sog auf dem mittleren Dock-Knopf
  await dock.locator('button').nth(3).hover();
  await page.waitForTimeout(400);
  await dock.screenshot({ path: `${OUT}/r2-${thema}-dock-hover.png` });
  await page.screenshot({ path: `${OUT}/r2-${thema}-design-gesamt.png` });
  await page.context().close();
}

await browser.close();
console.log('kritik-shots-072-r2: Shots →', OUT);
