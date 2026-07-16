import { chromium } from '@playwright/test';

/**
 * v0.8.1 / P4 (Werkzeug-Umbau, `docs/V081-SPEZ.md` §1) — Abnahme-Screenshots
 * der vier Chrome-Umzüge (Muster `p1-081-shots.mts`/`p3-081-shots.mts`). Läuft
 * gegen den eigenen Preview-Build auf :5174 (Parallelbetrieb, dateidisjunkt
 * zu P3 auf :5175).
 *
 * 4 Screenshots:
 *  1  p4-081-zeichenzeile.png — die klassische Zeichenzeile OHNE Skizze/
 *     Schnitt (beide ausgezogen) + die neue Kontextzeilen-Gruppe
 *     `leiste-gruppe-schnitt` (§1.2) sichtbar.
 *  2  p4-081-entwurfsdock.png — EntwurfsDock mit dem neuen `tool-skizze`-
 *     Knopf in der unteren Rail-Reihe, neben Draw/Vis/Publish/Prepare (§1.1).
 *  3  p4-081-navleiste.png — NavLeiste an der neuen Position `left:12,
 *     bottom:50` (§1.4), inkl. `dw-statusleiste`/EntwurfsDock im selben
 *     Bild als Kollisionsbeleg.
 *  4  p4-081-splat.png — das fusionierte `splat-werkzeug` (§1.3), einmal im
 *     Zustand «keine Cloud» (Export-Kontextzeile) und einmal mit offenem
 *     Splat-Panel (Toggle-Verhalten nach Import).
 */

const BASE = 'http://localhost:5174';
const OUT = 'test-results';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

async function neueSeite() {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.addInitScript(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.goto(BASE);
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="view-2d"]');
  return page;
}

// 1) Zeichenzeile — Skizze/Schnitt ausgezogen, neue leiste-gruppe-schnitt da.
{
  const page = await neueSeite();
  const haupt = page.locator('[data-testid="design-werkzeugleiste-haupt"]');
  await haupt.waitFor({ state: 'visible' });
  await page.locator('[data-testid="leiste-gruppe-schnitt"]').waitFor({ state: 'visible' });
  await page.waitForTimeout(200);
  await page.locator('[data-testid="design-werkzeugleiste"]').screenshot({ path: `${OUT}/p4-081-zeichenzeile.png` });
  await page.close();
}

// 2) EntwurfsDock — tool-skizze in der unteren Rail-Reihe.
{
  const page = await neueSeite();
  const dock = page.locator('[data-testid="entwurf-dock"]');
  await dock.waitFor({ state: 'visible' });
  await page.locator('[data-testid="tool-skizze"]').waitFor({ state: 'visible' });
  await page.waitForTimeout(200);
  await dock.screenshot({ path: `${OUT}/p4-081-entwurfsdock.png` });
  await page.close();
}

// 3) NavLeiste — neue Position links unten, Statusleiste + EntwurfsDock im
//    selben Bild als Kollisionsbeleg (kein Überlapp, s. Bericht).
{
  const page = await neueSeite();
  await page.click('[data-testid="nav-fit"]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/p4-081-navleiste.png` });
  await page.close();
}

// 4) Splat-Fusion — «Splat» im Export-Kontext (keine Cloud) + offenes Panel.
{
  const page = await neueSeite();
  await page.evaluate(() => {
    (
      window as unknown as { __kosmoUiBefehle: { ausfuehren: (id: string, params: unknown) => unknown } }
    ).__kosmoUiBefehle.ausfuehren('ui.panelSetzen', { panel: 'splatPanelOffen', offen: true });
  });
  await page.locator('[data-testid="splat-panel"]').waitFor({ state: 'visible' });
  const splatKnopf = page.locator('[data-testid="splat-werkzeug"]');
  await splatKnopf.waitFor({ state: 'visible' });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/p4-081-splat.png` });
  await page.close();
}

await browser.close();
console.log('OK — 4 Screenshots geschrieben nach test-results/p4-081-*.png');
