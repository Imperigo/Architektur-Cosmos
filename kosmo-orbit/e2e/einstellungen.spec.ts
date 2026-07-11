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

/**
 * v0.7.2 §5/§7/§8/§9 (W4-H, Kritik-Auflage «Einstellungs-Verdrahtung»): vier
 * neue Schalter in der Sektion «Bewegung & Klang» — jeder schreibt exakt den
 * localStorage-Key, den das jeweilige Modul bereits liest (`state/sounds.ts`,
 * `state/cursor-zustand.ts`, `state/abspiel-ebene.ts`), keine neue Logik.
 */
test.describe('Einstellungen: «Bewegung & Klang» — vier neue Schalter (W4-H)', () => {
  test('Sounds: Default aus, Schalter schreibt kosmo.sounds und wirkt sofort', async ({ page }) => {
    await bootstrap(page);
    await page.click('[data-testid="einstellungen-oeffnen"]');
    const schalter = page.locator('[data-testid="einstellung-sounds"]');
    await expect(schalter).not.toBeChecked(); // Owner-Entscheid: Default AUS
    expect(await page.evaluate(() => localStorage.getItem('kosmo.sounds'))).toBeNull();

    await schalter.click();
    await expect(schalter).toBeChecked();
    expect(await page.evaluate(() => localStorage.getItem('kosmo.sounds'))).toBe('1');

    await schalter.click();
    await expect(schalter).not.toBeChecked();
    expect(await page.evaluate(() => localStorage.getItem('kosmo.sounds'))).toBe('0');
  });

  test('Eigencursor: Default an (pointer:fine in Chromium), Schalter schreibt kosmo.eigencursor und wirkt sofort auf die Cursor-Ebene', async ({
    page,
  }) => {
    await bootstrap(page);
    // Test-Hook aktivieren (Muster e2e/cursor-ebene.spec.ts) — unter
    // navigator.webdriver bleibt die Ebene sonst per Hartvertrag aus,
    // unabhängig von der Einstellung selbst.
    await page.evaluate(() => (window as unknown as { __kosmoCursor: { aktivieren: () => void } }).__kosmoCursor.aktivieren());
    await expect(page.locator('[data-testid="cursor-ebene"]')).toBeAttached();

    await page.click('[data-testid="einstellungen-oeffnen"]');
    const schalter = page.locator('[data-testid="einstellung-eigencursor"]');
    await expect(schalter).toBeChecked(); // Default AN bei pointer:fine

    await schalter.click();
    await expect(schalter).not.toBeChecked();
    expect(await page.evaluate(() => localStorage.getItem('kosmo.eigencursor'))).toBe('0');
    // Wirkt SOFORT, ohne Reload — die Cursor-Ebene verschwindet komplett
    // (kein gecachter Re-Read-Bug, s. `EIGENCURSOR_EINSTELLUNG_EVENT`).
    await expect(page.locator('[data-testid="cursor-ebene"]')).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.eigencursor))
      .toBe('aus');

    // Zurückschalten stellt die Ebene ebenso sofort wieder her.
    await schalter.click();
    await expect(schalter).toBeChecked();
    await expect(page.locator('[data-testid="cursor-ebene"]')).toBeAttached();
  });

  test('«Kosmo zeichnet sichtbar»: Default an, Schalter schreibt kosmo.abspielen', async ({ page }) => {
    await bootstrap(page);
    await page.click('[data-testid="einstellungen-oeffnen"]');
    const schalter = page.locator('[data-testid="einstellung-abspielen"]');
    await expect(schalter).toBeChecked(); // Default AN (Spec §7)

    await schalter.click();
    await expect(schalter).not.toBeChecked();
    expect(await page.evaluate(() => localStorage.getItem('kosmo.abspielen'))).toBe('0');

    await schalter.click();
    await expect(schalter).toBeChecked();
    expect(await page.evaluate(() => localStorage.getItem('kosmo.abspielen'))).toBe('1');
  });

  test('Kosmo-Charakter-Fenster: ehrlich «nur Desktop-App» — ausserhalb Tauri deaktiviert/ausgegraut', async ({
    page,
  }) => {
    await bootstrap(page);
    await page.click('[data-testid="einstellungen-oeffnen"]');
    const schalter = page.locator('[data-testid="einstellung-charakter"]');
    await expect(schalter).toBeVisible();
    // Kein Tauri in dieser Browser-Umgebung (`istTauriDesktop()` prüft
    // `__TAURI_INTERNALS__`, das hier nie gesetzt ist) — der Schalter bleibt
    // ehrlich deaktiviert, nicht nur optisch grau.
    await expect(schalter).toBeDisabled();
    await expect(schalter).not.toBeChecked();
  });
});
