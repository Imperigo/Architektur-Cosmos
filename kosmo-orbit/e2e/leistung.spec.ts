import { expect, test } from '@playwright/test';

/**
 * v0.6.3 / Batch A9 (Owner-Befund K19, Leistungs-Autotuning, wörtlich):
 * «beim Start Freigabe ‹Kosmo darf Systemleistung prüfen› → Bericht, Kosmo
 * drosselt selbst … Render-Qualität …». Nur dieser Teil ist eingelöst — der
 * Rest des K19-Blocks (Cycles-Preview-Synchro, Host-PC-Client, lokale
 * LLM-Wahl) bleibt HomeStation/🔒 und wird im Panel offen so benannt.
 *
 * NICHT im Worktree ausgeführt (Owner-Auflage) — läuft im Hauptbaum mit den
 * Helferservern (siehe `kosmo-orbit/CLAUDE.md`, Abschnitt E2E).
 */

async function bootstrap(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.waitForSelector('[data-testid="module-design"]');
}

test('Leistung: Sektion sichtbar, Prüfen ohne Zustimmung gesperrt', async ({ page }) => {
  await bootstrap(page);
  await page.click('[data-testid="einstellungen-oeffnen"]');
  const sektion = page.locator('[data-testid="einstellungen-leistung"]');
  await expect(sektion).toBeVisible();
  const pruefenKnopf = page.locator('[data-testid="leistung-pruefen"]');
  await expect(pruefenKnopf).toBeDisabled();
  await expect(page.locator('[data-testid="leistung-bericht"]')).toHaveCount(0);
});

test('Leistung: Zustimmung + Prüfen zeigt den Bericht mit Stufe', async ({ page }) => {
  await bootstrap(page);
  await page.click('[data-testid="einstellungen-oeffnen"]');
  await page.click('[data-testid="leistung-zustimmung"]');
  const pruefenKnopf = page.locator('[data-testid="leistung-pruefen"]');
  await expect(pruefenKnopf).toBeEnabled();
  await pruefenKnopf.click();
  const bericht = page.locator('[data-testid="leistung-bericht"]');
  await expect(bericht).toBeVisible();
  const stufe = page.locator('[data-testid="leistung-stufe"]');
  await expect(stufe).toHaveText(/^(hoch|mittel|niedrig)$/);
  // Was HomeStation-Reste sind, steht offen im Panel — kein Fake-Regler dafür.
  await expect(sektion(page)).toContainText('HomeStation');
});

test('Leistung: Override auf niedrig persistiert nach Reload', async ({ page }) => {
  await bootstrap(page);
  await page.click('[data-testid="einstellungen-oeffnen"]');
  await page.click('[data-testid="leistung-override-niedrig"]');
  await page.keyboard.press('Escape');
  await page.reload();
  await page.waitForSelector('[data-testid="module-design"]');
  await page.click('[data-testid="einstellungen-oeffnen"]');
  const niedrigKnopf = page.locator('[data-testid="leistung-override-niedrig"]');
  // Aktiver Zustand zeigt sich über die Akzentfarbe — geprüft wird der
  // tatsächlich persistierte localStorage-Wert, der den Viewport-Renderer speist.
  await expect(niedrigKnopf).toBeVisible();
  const gespeichert = await page.evaluate(() => {
    const roh = localStorage.getItem('kosmo.leistung.v1');
    return roh ? (JSON.parse(roh) as { override?: string }).override : null;
  });
  expect(gespeichert).toBe('niedrig');
});

function sektion(page: import('@playwright/test').Page) {
  return page.locator('[data-testid="einstellungen-leistung"]');
}
