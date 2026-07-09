import { expect, test, type Page } from '@playwright/test';

/**
 * Owner-Befund K8 / V0.6.3 Batch B1 — «Kosmo-Vorschläge zu klein/banal»:
 * Stufe 1 macht die Diff-Karte visuell (Mini-Grundriss Vorher/Nachher statt
 * nur Text), siehe `apps/kosmo-orbit/src/state/proposal-vorschau.ts` und die
 * Einbindung in `KosmoPanel.tsx`. Zwei Fälle:
 *  1. Ein normaler Wand-Vorschlag hat eine ehrliche Vorschau (Wand betrifft
 *     ein Geschoss, lässt sich vor dem Anwenden zeichnen).
 *  2. Ein Vorschlag, dessen Command beim probeweisen Ausführen scheitert
 *     (hier: Fenster stanzen ohne je ein Fassadenmodul gezeichnet zu haben —
 *     ein ganz normaler Zustand in einem frischen Projekt), bleibt ehrlich
 *     bei der heutigen Textkarte — kein Fake-Diff, kein Absturz.
 *
 * Bootstrap-Reihenfolge (Muster aus `kosmo-symbol.spec.ts`/`module.spec.ts`):
 * onboarded + starterGuide.done VOR dem ersten Mount setzen, panelOffen='1'
 * (A1 — Panel-Default ist sonst zu), Mock-Provider explizit wählen, erst
 * dann reload(). `module-design` bootstrappt Geschoss EG/OG + Wand-Aufbau.
 */
async function bootstrapMitOffenemPanel(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.panelOffen', '1');
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
  });
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG + AW-Aufbau
}

test('Wand-Vorschlag: Karte zeigt Vorher/Nachher-Mini-SVG, Anwenden zeichnet die Wand', async ({ page }) => {
  await bootstrapMitOffenemPanel(page);

  const vorherWaende = await page.evaluate(
    () => (window.__kosmo as { state: () => { doc: { byKind: (k: string) => unknown[] } } }).state().doc.byKind('wall').length,
  );

  await page.fill('[data-testid="kosmo-input"]', 'Zeichne eine Wand von 0,0 bis 6,0');
  await page.click('[data-testid="kosmo-send"]');

  const karte = page.locator('[data-testid="proposal-card"]').first();
  await expect(karte).toBeVisible({ timeout: 15_000 });

  // Visuelle Vorschau: zwei Mini-SVGs (Vorher/Nachher), kein reiner Textfall
  const vorschau = karte.locator('[data-testid="proposal-vorschau"]');
  await expect(vorschau).toBeVisible();
  await expect(vorschau.locator('svg')).toHaveCount(2);

  await page.click('[data-testid="apply-proposal"]', { timeout: 15_000 });
  await expect(page.getByText('Angewendet', { exact: false })).toBeVisible();

  const nachherWaende = await page.evaluate(
    () => (window.__kosmo as { state: () => { doc: { byKind: (k: string) => unknown[] } } }).state().doc.byKind('wall').length,
  );
  expect(nachherWaende).toBe(vorherWaende + 1);
  await page.screenshot({ path: 'e2e-results/proposal-vorschau-wand.png' });
});

test('Vorschlag ohne mögliche Vorschau (Fenster stanzen ohne Fassadenmodul): Textkarte wie bisher', async ({ page }) => {
  await bootstrapMitOffenemPanel(page);

  // Frisches Projekt: kein Fassadenmodul gezeichnet — der Command scheitert
  // beim probeweisen Ausführen (CommandError), die Vorschau bleibt ehrlich
  // aus, OHNE dass die Karte selbst verschwindet oder crasht.
  await page.fill('[data-testid="kosmo-input"]', 'Stanz die Fenster aus dem Modul');
  await page.click('[data-testid="kosmo-send"]');

  const karte = page.locator('[data-testid="proposal-card"]').first();
  await expect(karte).toBeVisible({ timeout: 15_000 });
  await expect(karte.locator('[data-testid="proposal-vorschau"]')).toHaveCount(0);
  // Die heutige Textkarte bleibt unverändert nutzbar (Summary + Knöpfe da)
  await expect(karte.locator('[data-testid="apply-proposal"]')).toBeVisible();
  await page.screenshot({ path: 'e2e-results/proposal-vorschau-keine.png' });
});
