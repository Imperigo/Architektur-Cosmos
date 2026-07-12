/**
 * Kritik-Shots v0.7.4 Runde 2 — die beiden Shots, die docs/rundgang/kritik-074/
 * (Runde 1, P1 SIA-Hochzahl + P4 Plankopf-Typografie) noch nicht abdeckt:
 *
 *  1. P3 Kosmo-Orb im Boden-Dock (`shell/BodenDock.tsx` rechter Slot) — eine
 *     Modul-Ansicht (Design) gegen die freistehende Zentrale/Home (Kosmo-Symbol
 *     unten rechts, KEIN Dock dort — v073 S5b-Vertrag unverändert).
 *  2. P9 Takeover-Rahmen (`kosmo-orb-takeover`, `KosmoOrb.tsx`/
 *     `KosmoTakeoverWaechter.tsx`) — via Test-Hook `window.__kosmoStatus.
 *     setzeZustand('takeover')` bei geschlossenem Panel (deterministischer
 *     Store→DOM-Beweis, Muster `e2e/kosmo-takeover.spec.ts` Test (d)).
 *
 * Bundle==dist wird HIER IM SKRIPT bewiesen (nicht nur behauptet), Muster
 * `kritik-shots-073-r1.mts`.
 *
 * Aufruf (aus kosmo-orbit/, Preview auf :5183 muss laufen):
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium \
 *   npx tsx e2e/tools/kritik-shots-074-r2.mts
 */
import { chromium, type Page } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';

const OUT = 'docs/rundgang/kritik-074-r2';
mkdirSync(OUT, { recursive: true });
const URL_ = 'http://localhost:5183';

// 0 — Bundle==dist-Beweis: Preview liefert exakt das gebaute index.html
{
  const dist = readFileSync('apps/kosmo-orbit/dist/index.html', 'utf8');
  const live = await (await fetch(`${URL_}/`)).text();
  if (dist !== live) {
    console.error('ABBRUCH: Preview auf :5183 liefert NICHT dist/index.html (Bundle!=dist).');
    process.exit(1);
  }
  console.log('Bundle==dist bewiesen: index.html byte-identisch (', dist.length, 'Bytes ).');
}

const browser = await chromium.launch({ executablePath: process.env['PLAYWRIGHT_CHROMIUM_PATH'] });

async function frisch(breite = 1440, hoehe = 900): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe } });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.goto(URL_);
  await page.waitForTimeout(1200);
  return page;
}

// 1a — Zentrale/Home: das freistehende Kosmo-Symbol (KEIN Boden-Dock hier,
//      v073 S5b-Vertrag: der Dock erscheint nur in einer Modul-Ansicht).
{
  const page = await frisch();
  await page.locator('[data-testid="kosmo-symbol"]').waitFor({ timeout: 5000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/r2-zentrale-kosmo-frei.png` });
  await page.context().close();
  console.log('1a — Zentrale (Kosmo-Symbol frei schwebend) →', `${OUT}/r2-zentrale-kosmo-frei.png`);
}

// 1b — Design-Modul: der Boden-Dock mit dem eingebetteten Kosmo-Orb im rechten Slot.
{
  const page = await frisch();
  await page.click('[data-testid="module-design"]');
  await page.locator('[data-testid="boden-dock"]').waitFor({ timeout: 8000 });
  await page.locator('[data-testid="boden-dock"] [data-testid="kosmo-symbol"]').waitFor({ timeout: 5000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/r2-design-boden-dock-kosmo-orb.png` });
  await page.context().close();
  console.log('1b — Design (Boden-Dock + eingebetteter Kosmo-Orb) →', `${OUT}/r2-design-boden-dock-kosmo-orb.png`);
}

// 2 — P9 Takeover-Rahmen: deterministischer Store→DOM-Beweis (Panel zu,
//     window.__kosmoStatus.setzeZustand('takeover')), Vollbild-Screenshot.
{
  const page = await frisch();
  await page.evaluate(() => {
    (window as unknown as { __kosmoStatus: { setzeZustand: (z: string) => void } }).__kosmoStatus.setzeZustand(
      'takeover',
    );
  });
  await page.locator('[data-testid="kosmo-orb-takeover"]').waitFor({ timeout: 5000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/r2-takeover-rahmen.png` });
  await page.context().close();
  console.log('2 — Takeover-Rahmen (Vollbild) →', `${OUT}/r2-takeover-rahmen.png`);
}

await browser.close();
console.log('kritik-shots-074-r2: Shots →', OUT);
