/**
 * Kritik-Shots v0.7.1 Runde 3 — Welle 6: Flügelsymbolik in der LIVE-Schnittvorschau
 * (vorher nur Druck/Export). Setup exakt wie e2e/schnitt-fluegelsymbolik.spec.ts.
 * Läuft gegen den frischen Preview auf :5183 (Bundle==dist vorher geprüft).
 * Aufruf (aus kosmo-orbit/):
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx tsx e2e/tools/kritik-shots-071-r3.mts
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = 'docs/rundgang/kritik-071';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env['PLAYWRIGHT_CHROMIUM_PATH'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => {
  localStorage.setItem('kosmo.onboarded', '1');
  localStorage.setItem('kosmo.starterGuide.done', '1');
});
await page.goto('http://localhost:5183');
await page.waitForTimeout(1500);
await page.click('[data-testid="module-design"]');
await page.waitForTimeout(800);

// Wand + zwei Fenster (dreh links / drehkipp rechts) + Schnittlinie davor —
// dasselbe Rezept wie der 6B-Beweis-Spec.
await page.evaluate(() => {
  const k = (window as never as Record<string, any>)['__kosmo'];
  const st = k.state();
  const aw = st.doc.byKind('assembly').find((a: { name?: string }) => a.name?.startsWith('AW'))!;
  const w = k.run('design.wandZeichnen', {
    storeyId: st.activeStoreyId, a: { x: 0, y: 3000 }, b: { x: 8000, y: 3000 }, assemblyId: aw.id,
  });
  const wallId = w.patches[0].id as string;
  const o1 = k.run('design.oeffnungSetzen', { wallId, openingType: 'fenster', center: 2200, width: 1400, height: 1400, sill: 900 });
  k.run('design.eigenschaftSetzen', { entityId: o1.patches[0].id, feld: 'fluegelTyp', wert: 'dreh' });
  const o2 = k.run('design.oeffnungSetzen', { wallId, openingType: 'fenster', center: 5800, width: 1400, height: 1400, sill: 900 });
  k.run('design.eigenschaftSetzen', { entityId: o2.patches[0].id, feld: 'fluegelTyp', wert: 'drehkipp' });
  k.run('design.schnittSetzen', { a: { x: 0, y: 2000 }, b: { x: 8000, y: 2000 } });
});
await page.waitForTimeout(600);
await page.click('[data-testid="view-quad"]');
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/09-live-schnitt-fluegelsymbolik.png` });
await ctx.close();
await browser.close();
console.log('kritik-shots-071-r3: 1 Shot →', OUT);
