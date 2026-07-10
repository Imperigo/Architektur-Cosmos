import { expect, test } from '@playwright/test';

/**
 * H-5/H-10 (Sim-Befunde): RasterPanel hatte für die Querachsen-Eingabe kein
 * eigenes data-testid (nur die Hauptachsen-Eingabe trug `raster-anzahl`) —
 * Automatisierung/Kosmo-Tests konnten den Wert nicht gezielt setzen. Diese
 * Spec ist additiv (neue Datei, kein bestehender Test verändert) und deckt
 * nur die neue `raster-quer-anzahl`-Eingabe ab.
 */
test('RasterPanel: Querachsen-Eingabe hat ein eigenes testid und steuert die Achsenzahl', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.panelOffen', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="raster-toggle"]');
  await expect(page.locator('[data-testid="raster-panel"]')).toBeVisible();

  const quer = page.locator('[data-testid="raster-quer-anzahl"]');
  await expect(quer).toBeVisible();
  await expect(page.locator('[data-testid="raster-anzahl"]')).toBeVisible();

  // Default (Panel): 5 Hauptachsen, 4 Querachsen — auf 6 Querachsen ändern
  // und ins Modell setzen, dann die Grid-Entities zählen.
  await quer.fill('6');
  await page.locator('[data-testid="raster-achsen"]').first().click();

  // Nur Hauptachsen zählen — rasterSetzen erzeugt aus der Panel-Variante
  // zusätzlich feine «wohn»-Zwischenachsen (Wohnraster), deren Anzahl von
  // der gewählten Variante abhängt und hier nicht Gegenstand ist.
  const hauptachsen = await page.evaluate(
    () =>
      (window.__kosmo.state().doc.byKind('grid') as unknown as { typ?: string }[]).filter(
        (a) => a.typ === 'haupt',
      ).length,
  );
  // 5 Hauptachsen (1…5) + 6 Querachsen (A…F) = 11
  expect(hauptachsen).toBe(11);
});
