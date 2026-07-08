import { expect, test } from '@playwright/test';

/**
 * Serie K / Batch A4 (Owner-Befund K14, wörtlich): «Einstellungsmenüs:
 * zentral in der Übersicht + je Station (Design/Data/Kosmo/Büro/V2) —
 * Funktionen & Neues.» EIN Panel (`shell/Einstellungen.tsx`) für die ganze
 * App: die Kopfleiste öffnet es ungefiltert, jede Station öffnet dasselbe
 * Panel mit einem Filter-Prop (kein zweites Panel je Station).
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

test('Einstellungen: Kopfleiste öffnet/schliesst das zentrale Panel', async ({ page }) => {
  await bootstrap(page);
  await expect(page.locator('[data-testid="einstellungen-panel"]')).toHaveCount(0);
  await page.click('[data-testid="einstellungen-oeffnen"]');
  await expect(page.locator('[data-testid="einstellungen-panel"]')).toBeVisible();
  // Kein Stations-Filter aus der Kopfleiste — der Titel bleibt ungefiltert.
  await expect(page.locator('[data-testid="einstellungen-neuigkeiten-station"]')).toHaveCount(0);
  // Escape schliesst (k-dialog-Muster).
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-testid="einstellungen-panel"]')).toHaveCount(0);
});

test('Einstellungen: Thema-Wechsel wirkt sofort (data-theme am Wurzelelement)', async ({ page }) => {
  await bootstrap(page);
  const vorher = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.click('[data-testid="einstellungen-oeffnen"]');
  await page.click('[data-testid="einstellung-thema"]');
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.theme))
    .not.toBe(vorher);
});

test('Einstellungen: «Rundgang erneut zeigen» startet den Guide', async ({ page }) => {
  await bootstrap(page);
  await page.click('[data-testid="einstellungen-oeffnen"]');
  await page.click('[data-testid="einstellung-rundgang"]');
  // Panel schliesst sich, der Rundgang läuft (Überspringen-Knopf ist der Beweis).
  await expect(page.locator('[data-testid="einstellungen-panel"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="starter-guide-ueberspringen"]')).toBeVisible();
});

test('Einstellungen: «Funktionen & Neues» zeigt den 0.6.2-Eintrag', async ({ page }) => {
  await bootstrap(page);
  await page.click('[data-testid="einstellungen-oeffnen"]');
  const eintrag = page.locator('[data-testid="neuigkeiten-version-0.6.2"]');
  await expect(eintrag).toBeVisible();
  await expect(eintrag).toContainText('0.6.2');
});

test('Stations-Zahnrad in KosmoDesign öffnet dasselbe Panel gefiltert (Design-Punkt sichtbar)', async ({ page }) => {
  await bootstrap(page);
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="station-einstellungen-design"]');
  const panel = page.locator('[data-testid="einstellungen-panel"]');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('KosmoDesign');
  const stationsBlock = page.locator('[data-testid="einstellungen-neuigkeiten-station"]');
  await expect(stationsBlock).toBeVisible();
  // Mindestens ein echter Design-Punkt aus neuigkeiten.ts steht im gefilterten Block.
  await expect(stationsBlock).toContainText('Teilphase');
  // Die üblichen Sektionen bleiben darunter erhalten — ein Panel, kein Sonderfall.
  await expect(page.locator('[data-testid="einstellungen-darstellung"]')).toBeVisible();
  await expect(page.locator('[data-testid="einstellungen-neuigkeiten"]')).toBeVisible();
});
