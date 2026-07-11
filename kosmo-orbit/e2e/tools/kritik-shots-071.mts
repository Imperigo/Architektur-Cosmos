/**
 * Kritik-Shots v0.7.1 Runde 1 — Nachbarn-Import (Standort-Panel + Grundriss),
 * Blick-Cloud-Hinweis, Golden schwarzplan-nachbarn gerastert.
 * Läuft gegen den frischen Preview auf :5183 (Bundle==dist vorher geprüft).
 * Ablage: docs/rundgang/kritik-071/.
 * Aufruf (aus kosmo-orbit/):
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx tsx e2e/tools/kritik-shots-071.mts
 */
import { chromium, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const OUT = 'docs/rundgang/kritik-071';
mkdirSync(OUT, { recursive: true });
const URL_ = 'http://localhost:5183';
const GOLDEN = new URL('../../packages/kosmo-kernel/test/golden/', import.meta.url).pathname;

const browser = await chromium.launch({ executablePath: process.env['PLAYWRIGHT_CHROMIUM_PATH'] });

async function frisch(): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.goto(URL_);
  await page.waitForTimeout(1500);
  return page;
}

// 1+2 — Nachbarn-Import: Standort-Panel nach Import + Grundriss mit Zonen
{
  const page = await frisch();
  await page.route('**/rest/services/api/SearchServer**', (route) =>
    route.fulfill({
      json: { results: [{ attrs: { label: '<b>Musterstrasse 1 Zug</b>', lat: 47.17, lon: 8.52, y: 2681500, x: 1224500 } }] },
    }),
  );
  await page.route('**/rest/services/api/MapServer/identify**', (route) => {
    if (route.request().url().includes('vec25-gebaeude')) {
      route.fulfill({
        json: {
          results: [
            { featureId: 1, geometry: { rings: [[[2681505, 1224500], [2681525, 1224500], [2681525, 1224515], [2681505, 1224515], [2681505, 1224500]]] } },
            { featureId: 2, geometry: { rings: [[[2681455, 1224455], [2681470, 1224455], [2681470, 1224470], [2681455, 1224470], [2681455, 1224455]]] } },
            { featureId: 3, geometry: { rings: [[[2681550, 1224550], [2681565, 1224550], [2681565, 1224565], [2681550, 1224565], [2681550, 1224550]]] } },
          ],
        },
      });
    } else {
      route.fulfill({
        json: { results: [{ geometry: { rings: [[[2681500, 1224500], [2681530, 1224500], [2681530, 1224520], [2681500, 1224520], [2681500, 1224500]]] } }] },
      });
    }
  });
  await page.click('[data-testid="module-design"]');
  await page.waitForTimeout(800);
  await page.click('[data-testid="sonne-toggle"]');
  await page.fill('[data-testid="standort-suche"]', 'Musterstrasse 1');
  await page.click('[data-testid="standort-suchen"]');
  await page.click('[data-testid="standort-treffer"] button');
  await page.click('[data-testid="parzelle-import"]');
  await page.waitForTimeout(600);
  await page.click('[data-testid="nachbarn-uebernehmen"]');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/01-standort-nachbarn-uebernommen.png` });
  // Panel zu, Grundriss mit Parzelle + 2 Nachbar-Zonen
  await page.click('[data-testid="sonne-toggle"]');
  await page.getByRole('button', { name: 'Grundriss', exact: true }).click();
  await page.waitForTimeout(400);
  // Kritik-Befund (C): Nach dem Import fittet die Ansicht nicht automatisch
  // auf die neuen Zonen — ohne nav-fit bleibt der Grundriss scheinbar leer.
  await page.click('[data-testid="nav-fit"]');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/02-grundriss-mit-nachbarn.png` });
  await page.context().close();
}

// 3 — Blick-Cloud-Hinweis im Kosmo-Panel (Betriebsart cloud)
{
  const page = await frisch();
  await page.evaluate(() =>
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'anthropic', betriebsart: 'cloud', anthropicKey: 'sk-ant-test-fake', anthropicModel: 'claude-opus-4-8', cloudAuth: 'schluessel', blickAn: true })),
  );
  await page.reload();
  await page.waitForTimeout(1200);
  await page.click('[data-testid="module-design"]');
  await page.waitForTimeout(800);
  await page.click('[data-testid="kosmo-symbol"]');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/03-kosmo-cloud-hinweis.png` });
  await page.context().close();
}

// 4 — Golden schwarzplan-nachbarn.svg gerastert (Element-Screenshot, QA-Weg)
{
  const huelle = join(tmpdir(), 'kritik-071-golden.html');
  writeFileSync(
    huelle,
    `<!doctype html><body style="margin:0;background:#fff"><img id="g" src="file://${GOLDEN}schwarzplan-nachbarn.svg" style="width:1200px;display:block"></body>`,
  );
  const ctx = await browser.newContext({ viewport: { width: 1240, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto(`file://${huelle}`);
  await page.waitForTimeout(400);
  await page.locator('#g').screenshot({ path: `${OUT}/04-golden-schwarzplan-nachbarn.png` });
  await ctx.close();
}

await browser.close();
console.log('kritik-shots-071: 4 Shots →', OUT);
