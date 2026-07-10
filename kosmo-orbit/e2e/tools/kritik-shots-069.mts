/**
 * Kritik-Shots v0.6.9 Runde 1 — Fenster/CW, KSelect, Kosmo-Blick im Grundriss.
 * Läuft gegen den frischen Preview auf :5183 (Bundle==dist vorher geprüft).
 * Ablage: docs/rundgang/kritik-069/. Aufruf (aus kosmo-orbit/):
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx tsx e2e/tools/kritik-shots-069.mts
 */
import { chromium, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = 'docs/rundgang/kritik-069';
mkdirSync(OUT, { recursive: true });
const URL_ = 'http://localhost:5183';

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });

async function frisch(): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.goto(URL_);
  await page.waitForTimeout(1500);
  return page;
}

/** Baut im frischen Projekt eine Südwand mit parametrischem Zweiflügel-Fenster. */
async function bauFenster(page: Page): Promise<void> {
  await page.click('[data-testid="module-design"]');
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const k = (window as unknown as Record<string, any>)['__kosmo'];
    const doc = k.state().doc;
    const storeys = doc.storeysOrdered ? doc.storeysOrdered() : doc.byKind('storey');
    const eg = storeys[0];
    const aufbauten = doc.byKind('assembly').filter((a: any) => a.id && String(a.name ?? '').startsWith('AW'));
    const aw = aufbauten[0] ?? doc.byKind('assembly')[0];
    k.run('design.wandZeichnen', { storeyId: eg.id, assemblyId: aw.id, a: { x: 0, y: 0 }, b: { x: 8000, y: 0 } });
    const wand = k.state().doc.byKind('wall').at(-1);
    k.run('design.oeffnungSetzen', { wallId: wand.id, openingType: 'fenster', center: 4000, width: 1600, height: 1400, sill: 900 });
    const fenster = k.state().doc.byKind('opening').at(-1);
    k.run('design.fensterParametrieren', { openingId: fenster.id, fensterTyp: 'zweifluegel', teilung: { n: 2, m: 1 }, rahmenbreite: 60 });
  });
  await page.waitForTimeout(1000);
}

// 1 — Zweiflügel-Fenster in 3D|Plan (Rahmenprofile + Öffnungsbögen)
{
  const page = await frisch();
  await bauFenster(page);
  await page.screenshot({ path: `${OUT}/01-fenster-zweifluegel-3d-plan.png` });
  await page.context().close();
}

// 2 — Fensterband/CW auf der Südfassade (zweite Wand + curtainWallSetzen), Grundriss
{
  const page = await frisch();
  await bauFenster(page);
  await page.evaluate(() => {
    const k = (window as unknown as Record<string, any>)['__kosmo'];
    const doc = k.state().doc;
    const storeys = doc.storeysOrdered ? doc.storeysOrdered() : doc.byKind('storey');
    const eg = storeys[0];
    const aw = doc.byKind('assembly').find((a: any) => String(a.name ?? '').startsWith('AW')) ?? doc.byKind('assembly')[0];
    k.run('design.wandZeichnen', { storeyId: eg.id, assemblyId: aw.id, a: { x: 0, y: 6000 }, b: { x: 8000, y: 6000 } });
    k.run('design.curtainWallSetzen', { storeyId: eg.id, richtung: 'nord', pfostenraster: 1200, riegelraster: 1200, rahmenbreite: 60, bruestung: 0, sturz: 200 });
  });
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Grundriss', exact: true }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/02-cw-fensterband-grundriss.png` });
  await page.context().close();
}

// 3 — Echtes KSelect offen (phase-stil) — Projekt-Menü ZUERST öffnen
// (Lehre aus Runde 1: der Trigger existiert erst mit offenem Projekt-Menü).
{
  const page = await frisch();
  await page.click('[data-testid="module-design"]');
  await page.waitForTimeout(1200);
  await page.click('[data-testid="projekt-menu-toggle"]');
  await page.waitForTimeout(400);
  await page.click('[data-testid="phase-stil"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/03-kselect-offen.png` });
  await page.context().close();
}

// 4 — Kosmo-Blick in der Grundriss-Ansicht (quelle:planview) mit Chip.
// Skript-Registry via addInitScript VOR dem Laden (Lehre aus Runde 1:
// evaluate+reload verliert window.__kosmoSkripte wieder).
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    (window as unknown as Record<string, any>).__kosmoSkripte = {
      kritik069: { id: 'kritik069', zuege: [{ antwortText: 'Ich sehe deinen Grundriss mit dem neuen Zweiflügel-Fenster.', toolCalls: [] }] },
    };
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'scripted', skriptId: 'kritik069', blickAn: true }));
  });
  await page.goto(URL_);
  await page.waitForTimeout(1500);
  await bauFenster(page);
  await page.getByRole('button', { name: 'Grundriss', exact: true }).click();
  await page.waitForTimeout(600);
  await page.click('[data-testid="kosmo-symbol"]');
  await page.waitForSelector('[data-testid="kosmo-input"]');
  await page.fill('[data-testid="kosmo-input"]', 'Was siehst du?');
  await page.click('[data-testid="kosmo-send"]');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/04-blick-grundriss-chip.png` });
  await page.context().close();
}

await browser.close();
console.log('kritik-shots-069: 4 Shots →', OUT);
