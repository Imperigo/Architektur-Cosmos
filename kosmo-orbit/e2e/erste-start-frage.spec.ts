import { test, expect } from '@playwright/test';

/**
 * Serie K / A3 (Owner-Befund K13): «Erster Start: Kosmo fragt ‹neu hier?› →
 * Guide; sonst nie wieder (Einstellung reaktivierbar).» Der Guide-AUTOSTART
 * (V1.6 Block E) ist ersetzt: beim allerersten Start erscheint in der
 * Zentrale die Kosmo-Frage; der Rundgang läuft nur noch auf Ja — oder
 * jederzeit manuell über das «?» in der Kopfleiste.
 */

/** Frischer Erststart: onboarded gesetzt (statische Karte stört den Test
 *  nicht), Rundgang-Flag bewusst NICHT gesetzt. */
async function ersterStart(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.removeItem('kosmo.starterGuide.done');
  });
  await page.reload();
  await page.waitForSelector('[data-testid="module-design"]');
}

test('Erste-Start-Frage: Ja startet den Rundgang, danach kommt die Frage nie wieder', async ({ page }) => {
  await ersterStart(page);
  await expect(page.locator('[data-testid="erste-start-frage"]')).toBeVisible();
  await page.click('[data-testid="erste-start-ja"]');
  // Frage weg, Rundgang läuft (Überspringen-Knopf ist auf jedem Nicht-Schluss-Schritt da).
  await expect(page.locator('[data-testid="erste-start-frage"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="starter-guide-ueberspringen"]')).toBeVisible();
  // Rundgang beenden markiert das done-Flag — nach Neustart keine Frage mehr.
  await page.click('[data-testid="starter-guide-ueberspringen"]');
  await page.reload();
  await page.waitForSelector('[data-testid="module-design"]');
  await expect(page.locator('[data-testid="erste-start-frage"]')).toHaveCount(0);
});

test('Erste-Start-Frage: Nein heisst nie wieder — kein Rundgang, keine Frage nach Neustart', async ({ page }) => {
  await ersterStart(page);
  await page.click('[data-testid="erste-start-nein"]');
  await expect(page.locator('[data-testid="erste-start-frage"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="starter-guide-ueberspringen"]')).toHaveCount(0);
  await page.reload();
  await page.waitForSelector('[data-testid="module-design"]');
  await expect(page.locator('[data-testid="erste-start-frage"]')).toHaveCount(0);
});

test('Reaktivierung: «?» in der Kopfleiste startet den Rundgang trotz done-Flag', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.waitForSelector('[data-testid="module-design"]');
  await expect(page.locator('[data-testid="erste-start-frage"]')).toHaveCount(0);
  await page.click('[data-testid="starter-guide-start"]');
  await expect(page.locator('[data-testid="starter-guide-ueberspringen"]')).toBeVisible();
});
