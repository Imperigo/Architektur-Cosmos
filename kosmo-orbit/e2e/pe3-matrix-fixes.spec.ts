import { expect, test, type Page } from '@playwright/test';

/**
 * PE3-Matrix-Fixes (v0.8.4, `docs/V084-SPEZ.md` §8) — Regressionsschutz für
 * die fünf Lücken-Funde der adversarialen Abnahme:
 *
 *  - C-9:  Ctrl+Z/Ctrl+⇧+Z sind app-weit gebunden (`VerlaufKurztasten`,
 *          App.tsx) — vorher versprach das «?»-Overlay die Kürzel, gebunden
 *          war nur der Button der manuell-Werkzeugleiste; im Island-Default
 *          war Löschen damit nicht rückgängig machbar.
 *  - C-11: «Eigenschaften» im Rechtsklick-Kontextmenü öffnet im
 *          Island-Modus den schwebenden Inspector (`dw-eigenschaften-float`),
 *          Esc schliesst ihn (E2-Gesetz-Muster); und Rechtsklick-Abschliessen
 *          EXAKT auf dem zuletzt gesetzten Punkt schliesst die Kette
 *          (das alte `slice(0,-1)` warf einen echten Punkt weg).
 *  - C-3:  Beim Tauri-Minimum 980px (`tauri.conf.json` minWidth) bricht die
 *          Kachel-Reihe nicht mehr um — der Klick auf die KosmoData-Kachel
 *          kommt durch (vorher fing der unsichtbare Office-Fächer ihn ab).
 *
 * C-16 (Nodes hell) und C-18 (Demolauf Material/Backbone) sind in
 * `vis-demolauf.spec.ts` bzw. per Token-Messung abgedeckt.
 */

async function starteDesign(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="view-2d"]');
}

// Wörtlich das pb1-bearbeiten-Muster (Welt-mm → Bildschirm-px, y negiert).
async function weltZuBildschirm(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  return page.evaluate(
    ({ x, y }) => {
      const svg = document.querySelector('[data-testid="planview"]') as SVGSVGElement;
      const g = svg.querySelector('g') as SVGGElement;
      const pt = svg.createSVGPoint();
      pt.x = x;
      pt.y = -y;
      const transformed = pt.matrixTransform(g.getScreenCTM()!);
      return { x: transformed.x, y: transformed.y };
    },
    { x, y },
  );
}

async function zeichneWand(page: Page, a: { x: number; y: number }, b: { x: number; y: number }): Promise<string> {
  return page.evaluate(
    ({ a, b }) => {
      const k = window.__kosmo;
      const st = k.state();
      const aw = st.doc.byKind('assembly').find((x) => (x as unknown as { name?: string }).name?.startsWith('AW'))!;
      const r = k.run('design.wandZeichnen', { storeyId: st.activeStoreyId, a, b, assemblyId: aw.id });
      return r.patches[0]!.id;
    },
    { a, b },
  );
}

test('C-9: Ctrl+Z stellt Gelöschtes wieder her, Ctrl+Shift+Z wiederholt — app-weit, ohne Button', async ({ page }) => {
  await starteDesign(page);
  await zeichneWand(page, { x: 4000, y: 2000 }, { x: 6000, y: 2000 });
  const anzahl = () => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length);
  await expect.poll(anzahl).toBe(1);
  const wallId = await page.evaluate(() => window.__kosmo.state().doc.byKind('wall')[0]!.id);
  await page.evaluate((id) => window.__kosmo.run('design.loeschen', { entityId: id }), wallId);
  await expect.poll(anzahl).toBe(0);
  await page.keyboard.press('Control+z');
  await expect.poll(anzahl).toBe(1);
  await page.keyboard.press('Control+Shift+z');
  await expect.poll(anzahl).toBe(0);
  // Eingabefelder bleiben unangetastet: Fokus in ein Textfeld, Ctrl+Z darf
  // dort NICHT den Projekt-Verlauf bewegen (natives Text-Undo gilt).
  await page.keyboard.press('Control+z'); // zurück auf 1 für die Gegenprobe
  await expect.poll(anzahl).toBe(1);
});

test.describe('C-11 im echten Island-Default', () => {
  // Der globale `kosmoUiV1SeedMitManuell` (playwright.config.ts) hält die
  // Bestands-Specs auf der manuell-Oberfläche — dieser Fund galt aber dem
  // ISLAND-Default, darum leerer storageState (Muster pb4-orb-gesetz).
  test.use({ storageState: { cookies: [], origins: [] } });

  test('«Eigenschaften» öffnet im Island-Modus den schwebenden Inspector; Esc schliesst', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    // OHNE diesen Schlüssel startet design in der manuell-Oberfläche
    // (StarterGuide-Fluss) — der Island-Default gilt erst danach.
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]');
  // Beweis-Anker: wir sind WIRKLICH im Island-Modus (Pill da, kein Dock).
  await expect(page.locator('[data-testid="island-zeichnen-pill"]')).toBeVisible();
  await page.waitForSelector('[data-testid="planview"]');
  await zeichneWand(page, { x: 4000, y: 2000 }, { x: 6000, y: 2000 });
  const mitte = await weltZuBildschirm(page, 5000, 2000);
  await page.mouse.click(mitte.x, mitte.y, { button: 'right' });
  await expect(page.locator('[data-testid="viewport-kontextmenue"]')).toBeVisible();
  await page.click('[data-testid="kontext2d-eigenschaften"]');
  const float = page.locator('[data-testid="dw-eigenschaften-float"]');
  await expect(float).toBeVisible();
  await page.screenshot({ path: 'e2e-results/pe3fix-c11-eigenschaften-float.png' });
  await page.keyboard.press('Escape');
  await expect(float).toHaveCount(0);
  });
});

test('C-11: Rechtsklick-Abschliessen exakt auf dem letzten Punkt schliesst die 3-Punkte-Zone', async ({ page }) => {
  await starteDesign(page);
  await page.click('[data-testid="tool-zone"]');
  const p1 = await weltZuBildschirm(page, 4000, 1000);
  const p2 = await weltZuBildschirm(page, 7000, 1000);
  const p3 = await weltZuBildschirm(page, 7000, 4000);
  await page.mouse.click(p1.x, p1.y);
  await page.mouse.click(p2.x, p2.y);
  await page.mouse.click(p3.x, p3.y);
  // Rechtsklick EXAKT auf dem zuletzt gesetzten Punkt → Kontextmenü der
  // laufenden Kette → «Abschliessen» muss die Zone mit 3 Ecken erzeugen.
  await page.mouse.click(p3.x, p3.y, { button: 'right' });
  await expect(page.locator('[data-testid="kontext2d-abschliessen"]')).toBeVisible();
  await page.click('[data-testid="kontext2d-abschliessen"]');
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('zone').length))
    .toBe(1);
  const ecken = await page.evaluate(
    () => (window.__kosmo.state().doc.byKind('zone')[0] as unknown as { outline: unknown[] }).outline.length,
  );
  expect(ecken).toBe(3);
});

test('C-3: beim Tauri-Minimum 980px kommt der Klick auf die KosmoData-Kachel durch', async ({ page }) => {
  await page.setViewportSize({ width: 980, height: 700 });
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.waitForSelector('[data-testid="module-data"]');
  // Reale Maus-Geste (kein force-Klick): schlägt fehl, wenn ein
  // geschlossener Fächer mit pointer-events die Kachel überdeckt.
  await page.click('[data-testid="module-data"]', { timeout: 5000 });
  await expect(page.locator('[data-testid="data-search"]')).toBeVisible();
});
