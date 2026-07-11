/**
 * Kritik-Shots v0.7.0 Runde 1 — Schwarz-Poché je Phase, Projekt-Menü,
 * 3D-Weiss-/Schwarzmodell. Läuft gegen den frischen Preview auf :5183
 * (Bundle==dist vorher geprüft). Ablage: docs/rundgang/kritik-070/.
 * Aufruf (aus kosmo-orbit/):
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx tsx e2e/tools/kritik-shots-070.mts
 */
import { chromium, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = 'docs/rundgang/kritik-070';
mkdirSync(OUT, { recursive: true });
const URL_ = 'http://localhost:5183';

const browser = await chromium.launch({ executablePath: process.env['PLAYWRIGHT_CHROMIUM_PATH'] });

async function frisch(): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.goto(URL_);
  await page.waitForTimeout(1500);
  await page.click('[data-testid="module-design"]');
  await page.waitForTimeout(1200);
  return page;
}

/** Kleines Testhaus: 4 Wände + parametrisches Fenster + Tür. */
async function bauHaus(page: Page): Promise<void> {
  await page.evaluate(() => {
    const k = (window as unknown as Record<string, any>)['__kosmo'];
    const doc = k.state().doc;
    const storeys = doc.storeysOrdered ? doc.storeysOrdered() : doc.byKind('storey');
    const eg = storeys[0];
    const aw = doc.byKind('assembly').find((a: any) => String(a.name ?? '').startsWith('AW')) ?? doc.byKind('assembly')[0];
    // Kein inneres `const W = …` — tsx/esbuild injiziert dafür einen
    // __name-Helfer, den es im Browser-Kontext nicht gibt.
    k.run('design.wandZeichnen', { storeyId: eg.id, assemblyId: aw.id, a: { x: 0, y: 0 }, b: { x: 9000, y: 0 } });
    k.run('design.wandZeichnen', { storeyId: eg.id, assemblyId: aw.id, a: { x: 9000, y: 0 }, b: { x: 9000, y: 6000 } });
    k.run('design.wandZeichnen', { storeyId: eg.id, assemblyId: aw.id, a: { x: 9000, y: 6000 }, b: { x: 0, y: 6000 } });
    k.run('design.wandZeichnen', { storeyId: eg.id, assemblyId: aw.id, a: { x: 0, y: 6000 }, b: { x: 0, y: 0 } });
    const wand = k.state().doc.byKind('wall')[0];
    k.run('design.oeffnungSetzen', { wallId: wand.id, openingType: 'fenster', center: 3000, width: 2000, height: 1500, sill: 900 });
    const fenster = k.state().doc.byKind('opening').at(-1);
    k.run('design.fensterParametrieren', { openingId: fenster.id, fensterTyp: 'zweifluegel', teilung: { n: 2, m: 1 }, rahmenbreite: 60 });
    k.run('design.oeffnungSetzen', { wallId: wand.id, openingType: 'tuer', center: 7000, width: 1000, height: 2200, sill: 0, swing: 'links' });
  });
  await page.waitForTimeout(800);
}

// 1 — Wettbewerb: Grundriss mit EINEM schwarzen Poché
{
  const page = await frisch();
  await bauHaus(page);
  await page.evaluate(() => (window as any).__kosmo.run('design.phaseSetzen', { phase: 'wettbewerb' }));
  await page.getByRole('button', { name: 'Grundriss', exact: true }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/01-wettbewerb-grundriss-schwarz.png` });
  await page.context().close();
}

// 2 — Baueingabe: 3D|Plan-Split, Schichten schwarz/grau + Weissmodell in 3D
{
  const page = await frisch();
  await bauHaus(page);
  await page.evaluate(() => (window as any).__kosmo.run('design.phaseSetzen', { phase: 'baueingabe' }));
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/02-baueingabe-3d-plan.png` });
  await page.context().close();
}

// 3 — Projekt-Menü mit den drei neuen Schaltern
{
  const page = await frisch();
  await bauHaus(page);
  await page.click('[data-testid="projekt-menu-toggle"]');
  await page.waitForTimeout(400);
  await page.click('[data-testid="darstellung-3d"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/03-projekt-menu-darstellung.png` });
  await page.context().close();
}

// 4 — 3D: Weissmodell (Default) vs. Schwarzmodell (explizit)
{
  const page = await frisch();
  await bauHaus(page);
  await page.getByRole('button', { name: '3D', exact: true }).first().click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/04-3d-weissmodell-default.png` });
  await page.evaluate(() => (window as any).__kosmo.run('design.darstellung3dSetzen', { darstellung3d: 'schwarz' }));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/05-3d-schwarzmodell.png` });
  await page.context().close();
}

await browser.close();
console.log('kritik-shots-070: 5 Shots →', OUT);
