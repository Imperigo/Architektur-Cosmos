/**
 * Kritik-Shots v0.6.8 — Screenshot-Rundgang für die Fable-Kritikrunde
 * (Muster kritik-shots-067.mts). Läuft gegen einen frischen Preview-Build
 * auf :5173 (Bundle==dist vorher prüfen!). Ablage: docs/rundgang/kritik-068/.
 *
 * Aufruf (aus kosmo-orbit/):
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx tsx e2e/tools/kritik-shots-068.mts
 */
import { chromium, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = 'docs/rundgang/kritik-068';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });

async function frisch(init?: (page: Page) => Promise<void>): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.setItem('kosmo.onboarded', '1'));
  if (init) await init(page);
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1500);
  return page;
}

// 1 — Zentrale, weisses Papier
{
  const page = await frisch();
  await page.screenshot({ path: `${OUT}/01-zentrale-weiss.png` });
  await page.context().close();
}

// 2+3 — Satteldach im Design: 3D|Plan-Split und reiner Grundriss (Dach-Aufsicht)
{
  const page = await frisch();
  await page.click('[data-testid="module-design"]');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const k = (window as unknown as Record<string, any>)['__kosmo'];
    const doc = k.state().doc;
    const storeys = doc.storeysOrdered ? doc.storeysOrdered() : doc.byKind('storey');
    const eg = storeys[0];
    k.run('design.dachErstellen', {
      storeyId: eg.id,
      outline: [
        { x: 0, y: 0 },
        { x: 8000, y: 0 },
        { x: 8000, y: 6000 },
        { x: 0, y: 6000 },
      ],
      pitch: 38,
      overhang: 500,
      form: 'sattel',
      firstrichtung: 'x',
    });
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/02-design-satteldach-3d-plan.png` });
  await page.getByRole('button', { name: 'Grundriss', exact: true }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/03-grundriss-dach-aufsicht.png` });
  await page.context().close();
}

// 4 — Kosmo-Blick-Chip: «Kosmo sieht: ‹KosmoDesign›» (ScriptedProvider, Blick AN)
{
  const page = await frisch(async (p) => {
    await p.addInitScript(() => {
      (window as unknown as Record<string, any>).__kosmoSkripte = {
        kritik068: {
          id: 'kritik068',
          zuege: [
            {
              antwortText:
                'Ich sehe deinen Entwurf — das Satteldach sitzt sauber über dem Rechteck. Womit machen wir weiter?',
              toolCalls: [],
            },
          ],
        },
      };
      localStorage.setItem(
        'kosmo.llm',
        JSON.stringify({ provider: 'scripted', skriptId: 'kritik068', blickAn: true }),
      );
    });
  });
  await page.click('[data-testid="module-design"]');
  await page.waitForTimeout(1200);
  await page.click('[data-testid="kosmo-symbol"]');
  await page.waitForSelector('[data-testid="kosmo-input"]');
  await page.fill('[data-testid="kosmo-input"]', 'Was siehst du gerade?');
  await page.click('[data-testid="kosmo-send"]');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/04-kosmo-blick-chip.png` });
  await page.context().close();
}

// 5+6 — KosmoData: Tusche-Platzhalter im Grid + reiches Dossier
{
  const page = await frisch();
  await page.click('[data-testid="module-data"]');
  await page.waitForSelector('[data-testid="ref-card"]');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/05-kosmodata-tusche-platzhalter.png` });
  await page.fill('[data-testid="data-search"]', 'Pantheon');
  await page.waitForTimeout(400);
  await page.click('[data-testid="ref-card"]');
  await page.waitForSelector('[data-testid="ref-detail-dossier"]');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/06-kosmodata-dossier-reich.png` });
  await page.context().close();
}

// 7 — Wissen-Tab mit Docling-Import-Sektion
{
  const page = await frisch();
  await page.click('[data-testid="module-data"]');
  await page.waitForSelector('[data-testid="ref-card"]');
  await page.click('[data-testid="tab-wissen"]');
  await page.waitForSelector('[data-testid="wissen-import"]');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/07-wissen-import.png` });
  await page.context().close();
}

await browser.close();
console.log('kritik-shots-068: 7 Shots →', OUT);
