/**
 * Kritik-Shots v0.7.0 Runde 3 — Beweis 6B-Fix (Baueingabe: nichttragende
 * Schichten am BILDSCHIRM grau solid statt Schraffur) + VariantenPanel live.
 * Läuft gegen den frischen Preview auf :5183 (Bundle==dist vorher geprüft).
 * Ablage: docs/rundgang/kritik-070/.
 * Aufruf (aus kosmo-orbit/):
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx tsx e2e/tools/kritik-shots-070-r3.mts
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

/** Kleines Testhaus: 4 Wände + Fenster + Tür — bewusst UM DEN URSPRUNG
 *  zentriert (−4500..4500 / −3000..3000), damit der Wheel-Zoom auf die
 *  Canvas-Mitte (= Achsenkreuz) das Haus im Bild behält. */
async function bauHaus(page: Page): Promise<void> {
  await page.evaluate(() => {
    const k = (window as unknown as Record<string, any>)['__kosmo'];
    const doc = k.state().doc;
    const storeys = doc.storeysOrdered ? doc.storeysOrdered() : doc.byKind('storey');
    const eg = storeys[0];
    // Eigener Aufbau mit DICKER nichttragender Schicht (120 mm Bekleidung),
    // damit der 6B-Beweis (grau SOLID statt Schraffur am Bildschirm) im
    // Auto-Fit-Massstab klar sichtbar ist — der Standard-AW hat nur 20 mm Putz.
    k.run('design.aufbauErstellen', {
      name: 'AW Beweis 46', target: 'wall',
      layers: [
        { material: 'putz', thickness: 120, function: 'bekleidung' },
        { material: 'daemmung-mw', thickness: 160, function: 'daemmung' },
        { material: 'beton', thickness: 180, function: 'tragend' },
      ],
    });
    const aw = doc.byKind('assembly').find((a: any) => String(a.name ?? '').startsWith('AW Beweis')) ?? doc.byKind('assembly')[0];
    // Kein inneres `const W = …` — tsx/esbuild injiziert dafür einen
    // __name-Helfer, den es im Browser-Kontext nicht gibt.
    k.run('design.wandZeichnen', { storeyId: eg.id, assemblyId: aw.id, a: { x: -4500, y: -3000 }, b: { x: 4500, y: -3000 } });
    k.run('design.wandZeichnen', { storeyId: eg.id, assemblyId: aw.id, a: { x: 4500, y: -3000 }, b: { x: 4500, y: 3000 } });
    k.run('design.wandZeichnen', { storeyId: eg.id, assemblyId: aw.id, a: { x: 4500, y: 3000 }, b: { x: -4500, y: 3000 } });
    k.run('design.wandZeichnen', { storeyId: eg.id, assemblyId: aw.id, a: { x: -4500, y: 3000 }, b: { x: -4500, y: -3000 } });
    const wand = k.state().doc.byKind('wall')[0];
    k.run('design.oeffnungSetzen', { wallId: wand.id, openingType: 'fenster', center: 3000, width: 2000, height: 1500, sill: 900 });
    k.run('design.oeffnungSetzen', { wallId: wand.id, openingType: 'tuer', center: 7000, width: 1000, height: 2200, sill: 0, swing: 'links' });
  });
  await page.waitForTimeout(800);
}

// 6 — Baueingabe-Grundriss am Bildschirm: 6B-Beweis — nichttragende
// Schichten GRAU SOLID (kein Schraffur-Rückfall mehr in der PlanView-Kette).
{
  const page = await frisch();
  await bauHaus(page);
  await page.evaluate(() => (window as any).__kosmo.run('design.phaseSetzen', { phase: 'baueingabe' }));
  await page.getByRole('button', { name: 'Grundriss', exact: true }).click();
  await page.waitForTimeout(800);
  // KEIN Wheel-Zoom: die PlanView passt das Haus automatisch ein (Auto-Fit,
  // Wandschichten dabei ~40px dick — Schichten klar erkennbar). Wheel-Events
  // werden pro deltaY-Pixel gewertet und schieben das Haus aus dem Bild.
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/06-baueingabe-grundriss-schichten.png` });
  await page.context().close();
}

// 7 — VariantenPanel live: MFH-Kontext (30×14 m + Mittelkorridor + Soll-Mix),
// Suche gestartet, Top-Karten + Kennzahl-Matrix sichtbar.
{
  const page = await frisch();
  await page.evaluate(() => {
    const k = (window as unknown as Record<string, any>)['__kosmo'];
    const st = k.state();
    k.run('design.raumprogrammSetzen', { posten: [{ typ: 'preisguenstig', hnfSoll: 300 }] });
    k.run('design.zoneErstellen', {
      storeyId: st.activeStoreyId, name: 'Regelgeschoss', sia: 'KF',
      outline: [{ x: 0, y: 0 }, { x: 30000, y: 0 }, { x: 30000, y: 14000 }, { x: 0, y: 14000 }],
    });
    k.run('design.zoneErstellen', {
      storeyId: st.activeStoreyId, name: 'Korridor', sia: 'VF', raumTyp: 'korridor',
      outline: [{ x: 0, y: 6000 }, { x: 30000, y: 6000 }, { x: 30000, y: 8000 }, { x: 0, y: 8000 }],
    });
  });
  await page.waitForTimeout(600);
  await page.click('[data-testid="varianten-oeffnen"]');
  await page.waitForTimeout(400);
  await page.click('[data-testid="varianten-panel-start"]');
  // Laufen lassen, bis der Zähler dreistellig ist — dann steht die Matrix.
  await page.waitForTimeout(4000);
  await page.click('[data-testid="varianten-panel-stopp"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/07-varianten-panel-live.png` });
  await page.context().close();
}

await browser.close();
console.log('kritik-shots-070-r3: 2 Shots →', OUT);
