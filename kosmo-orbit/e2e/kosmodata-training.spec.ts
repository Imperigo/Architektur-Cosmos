import { expect, test } from '@playwright/test';

/**
 * D3 (Serie D, KosmoData-Dach) — der Training-Tab: zwei Achsen (Architektur ·
 * Bürostil aus dem kuratierten Lernjournal, Software · KosmoOrbit-Commands +
 * Doku-Korpus) plus kombinierter JSONL-Export für die LoRA (KosmoTrain/
 * HomeStation). Die tiefe Kuration bleibt in der KosmoTrain-Station — dieser
 * Tab ist die Sammlungs-/Übersichts-/Export-Ebene in KosmoData.
 */

test('KosmoData-Training: beide Achsen sichtbar, Software zeigt Commands, Export löst Download aus', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();

  await page.click('[data-testid="module-data"]');
  await page.click('[data-testid="tab-training"]');

  const trainingTab = page.locator('[data-testid="kosmodata-training"]');
  await expect(trainingTab).toBeVisible();

  // Beide Achsen-Sektionen sichtbar (Software ist praktisch nie leer — die
  // Kernel-Commands sind immer registriert).
  const architekturAchse = page.locator('[data-testid="training-achse-architektur"]');
  const softwareAchse = page.locator('[data-testid="training-achse-software"]');
  await expect(softwareAchse).toBeVisible({ timeout: 15_000 });
  await expect(architekturAchse).toBeVisible();

  // Software-Achse zeigt Command-Beispiele mit Zähler > 0.
  await expect(softwareAchse).toContainText('Commands');
  await expect(softwareAchse.locator('[data-testid="training-beispiel"]').first()).toBeVisible();
  const anzahlSoftwareBeispiele = await softwareAchse.locator('[data-testid="training-beispiel"]').count();
  expect(anzahlSoftwareBeispiele).toBeGreaterThan(0);

  // Export-Knopf ist da, klickbar, löst einen Download aus (kein Crash).
  const exportKnopf = page.locator('[data-testid="training-export"]');
  await expect(exportKnopf).toBeEnabled();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    exportKnopf.click(),
  ]);
  expect(download.suggestedFilename()).toBe('kosmo-training.jsonl');

  // Erfolgsmeldung statt alert().
  await expect(page.locator('[data-testid="meldung-erfolg"]')).toBeVisible();

  await page.screenshot({ path: 'e2e-results/kosmodata-training.png' });
});
