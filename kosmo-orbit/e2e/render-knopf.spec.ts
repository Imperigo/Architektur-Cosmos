import { expect, test, type Page } from '@playwright/test';

/**
 * V-M1 (v0.6.6 Welle 2 / Stream D, UI-SELBSTKRITIK-065 Restliste Priorität 1)
 * — Render-Knopf direkt im 3D-Viewport. Prüft, dass der Knopf DIESELBE
 * KosmoVis-Render-Kette anstösst wie die Vis-Station (Fake-Worker-Bridge,
 * Muster `visgraph.spec.ts`): Knopf sichtbar → Klick startet Job → Status
 * wandert ehrlich weiter → Ergebnisbild erscheint → «Aufs Blatt legen»
 * (Weiterleitung) legt es auf ein Publish-Blatt.
 *
 * Fake-Worker-Bridge auf :8600 (Hauptbaum-Default; die Stream-Isolation der
 * W2-Phase ist mit der Integration beendet — Muster visgraph.spec.ts).
 * `kosmo.bridge` wird explizit gesetzt.
 */

const BRIDGE = 'http://localhost:8600';

async function bootstrapDesign3D(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    // Block-E-Guide fängt sonst Klicks unter seiner Karte ab (Muster freemesh.spec.ts).
    localStorage.setItem('kosmo.starterGuide.done', '1');
  }, undefined);
  await page.evaluate((bridge) => localStorage.setItem('kosmo.bridge', bridge), BRIDGE);
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG, Default-Ansicht 'split' zeigt den 3D-Viewport
  await expect(page.locator('[data-testid="viewport3d"]')).toBeVisible();
}

test('Render-Knopf im 3D-Viewport: sichtbar, Klick startet Job, Ergebnisbild + Weiterleitung aufs Blatt', async ({
  page,
}) => {
  await bootstrapDesign3D(page);

  // Ruhezustand: der Knopf ist da, das Status-/Ergebnis-Panel (noch) nicht —
  // «unaufdringlich» heisst auch: kein Panel ohne aktiven/abgeschlossenen Lauf.
  const knopf = page.locator('[data-testid="viewport-render-knopf"]');
  await expect(knopf).toBeVisible();
  await expect(page.locator('[data-testid="viewport-render-panel"]')).toHaveCount(0);

  await knopf.click();

  // Der Knopf zeigt ehrlich den Zustand: Status wandert von «bereit» weg
  // (eigene testid — die Vis-Station-Texte an `render-status` bleiben unberührt).
  await expect(page.locator('[data-testid="viewport-render-status"]')).not.toHaveText('bereit', { timeout: 10000 });

  // Fake-Worker liefert ein Bild — dieselbe Kette wie visgraph.spec.ts.
  const bild = page.locator('[data-testid="viewport-render-bild"]');
  await expect(bild).toBeVisible({ timeout: 25000 });
  const bildBreite = await bild.evaluate((el) => (el as HTMLImageElement).naturalWidth);
  expect(bildBreite).toBeGreaterThan(0);
  await expect(page.locator('[data-testid="viewport-render-status"]')).toHaveText('fertig');

  // Weiterleitung: «Aufs Blatt legen» ruft denselben `bildAufsBlatt`-Weg wie
  // die Vis-Station — der globale Erfolgs-Toast ist ein Shell-Vertrag
  // (bereits in visgraph.spec.ts geprüft), keine Vis-Stations-testid.
  await page.locator('[data-testid="viewport-render-blatt"]').click();
  await expect(page.locator('[data-testid="meldung-erfolg"]').last()).toContainText('Render liegt auf', {
    timeout: 15000,
  });

  await page.screenshot({ path: 'e2e-results-streamd/render-knopf.png' });
});
