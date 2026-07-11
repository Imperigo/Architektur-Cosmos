/**
 * Kritik-Shots v0.7.1 Runde 2 — Welle 4 «Fenster echt»:
 * 3D-Glas/Standardrahmen, Inspector-Flügeltyp, neue Goldens gerastert.
 * Läuft gegen den frischen Preview auf :5183 (Bundle==dist vorher geprüft).
 * Ablage: docs/rundgang/kritik-071/.
 * Aufruf (aus kosmo-orbit/):
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx tsx e2e/tools/kritik-shots-071-r2.mts
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

// 5+6 — 3D: Wand + zwei Fenster (Standardrahmen+Glas / parametrisch+Glas) + Inspector-Flügeltyp
{
  const page = await frisch();
  await page.click('[data-testid="module-design"]');
  await page.waitForTimeout(800);
  await page.click('[data-testid="view-3d"]');
  await page.click('[data-testid="nav-fit"]');
  await page.waitForTimeout(400);
  const openingId = await page.evaluate(() => {
    const k = (window as never as Record<string, any>)['__kosmo'];
    const st = k.state();
    const aw = st.doc.byKind('assembly').find((a: { name?: string }) => a.name?.startsWith('AW'))!;
    const w = k.run('design.wandZeichnen', {
      storeyId: st.activeStoreyId, a: { x: 0, y: 0 }, b: { x: 7000, y: 0 }, assemblyId: aw.id,
    });
    const wallId = w.patches[0].id as string;
    // Fenster 1: OHNE fensterTyp → Standardrahmen + Glas (4A)
    const o1 = k.run('design.oeffnungSetzen', { wallId, openingType: 'fenster', center: 1800, width: 1600, height: 1400, sill: 900 });
    // Fenster 2: parametrisch einflügelig + Drehkipp (4B-Feld) → Profile + Glas
    const o2 = k.run('design.oeffnungSetzen', { wallId, openingType: 'fenster', center: 5000, width: 1400, height: 1400, sill: 900 });
    const o2Id = o2.patches[0].id as string;
    k.run('design.fensterParametrieren', { openingId: o2Id, fensterTyp: 'einfluegel', fluegelTyp: 'drehkipp', swing: 'rechts' });
    void o1;
    return o2Id;
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const h = (window as never as Record<string, any>)['__kosmoViewport'];
    h.setCamera(9, 5, 9, 3.5, 1, 0);
    h.renderOnce();
  });
  await page.waitForTimeout(400);
  await page.locator('[data-testid="viewport3d"]').screenshot({ path: `${OUT}/05-3d-fenster-glas.png` });

  // Inspector: Fenster 2 selektieren → KSelect «Flügeltyp» sichtbar
  await page.evaluate((id) => {
    const k = (window as never as Record<string, any>)['__kosmo'];
    k.state().select([id]);
  }, openingId);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/06-inspector-fluegeltyp.png` });
  await page.context().close();
}

// 7+8 — Neue Goldens gerastert (Element-Screenshot, QA-Weg)
for (const [nr, name] of [['07', 'ansicht-fluegeltypen'], ['08', 'grundriss-kipp']] as const) {
  const huelle = join(tmpdir(), `kritik-071-r2-${name}.html`);
  writeFileSync(
    huelle,
    `<!doctype html><body style="margin:0;background:#fff"><img id="g" src="file://${GOLDEN}${name}.svg" style="width:1200px;display:block"></body>`,
  );
  const ctx = await browser.newContext({ viewport: { width: 1240, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto(`file://${huelle}`);
  await page.waitForTimeout(400);
  await page.locator('#g').screenshot({ path: `${OUT}/${nr}-golden-${name}.png` });
  await ctx.close();
}

await browser.close();
console.log('kritik-shots-071-r2: 4 Shots →', OUT);
