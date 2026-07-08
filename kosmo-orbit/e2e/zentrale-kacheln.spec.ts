import { expect, test } from '@playwright/test';

/**
 * Serie K / A2 (Owner-Befund K12, wörtlich): «Startmenü neu: personalisierte,
 * dynamische Icons mit Tiefenlayern, Hover zeigt enthaltene Tools, Info-Icon
 * je Kachel; Startanimation; Farbakzente + stromsparende Idle-Animationen.»
 *
 * Diese Suite beweist die neuen Kachel-Fähigkeiten am lebenden Objekt, OHNE
 * die bestehenden Verträge zu verlassen: jede Kachel bleibt exakt
 * `data-testid="module-<id>"`, `role="button"`, sofort klickbar — die
 * Startanimation (opacity/translateY) darf einen Klick direkt nach dem Laden
 * nie verzögern oder blockieren (kein pointer-events-Trick).
 */

async function zentraleLaden(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
}

test('Familien-Gruppen sind da (Kosmo + Design/Data/Büro) — Kachel-Extraktion hat nichts verschluckt', async ({ page }) => {
  await zentraleLaden(page);
  await expect(page.locator('[data-testid="familie-kosmo"]')).toBeVisible();
  await expect(page.locator('[data-testid="familie-design"]')).toBeVisible();
  await expect(page.locator('[data-testid="familie-data"]')).toBeVisible();
  await expect(page.locator('[data-testid="familie-buero"]')).toBeVisible();
  await expect(page.locator('[data-testid="module-design"]')).toBeVisible();
});

test('Kachel funktioniert DIREKT nach dem Laden — die Startanimation blockiert den Klick nicht', async ({ page }) => {
  await zentraleLaden(page);
  // Kein zusätzliches Warten: click() direkt nach dem Reload, während die
  // gestaffelte Startanimation (≤ 800 ms gesamt) noch laufen könnte.
  await page.click('[data-testid="module-design"]');
  await expect(page.locator('[data-testid="planview"], [data-testid="inspector"], canvas').first()).toBeVisible();
  await page.click('header button[aria-label="Zur Zentrale"]');
  await expect(page.locator('[data-testid="module-design"]')).toBeVisible();
});

test('Hover auf module-design zeigt die Werkzeug-Zeile mit einem echten Design-Stichwort', async ({ page }) => {
  await zentraleLaden(page);
  const kachel = page.locator('[data-testid="module-design"]');
  const werkzeugZeile = kachel.locator('[data-testid="kachel-werkzeuge-design"]');

  // Vor dem Hover unsichtbar (max-height/opacity 0) — kein Layout-Sprung.
  await expect(werkzeugZeile).toBeAttached();
  await kachel.hover();
  await expect(werkzeugZeile).toBeVisible();
  await expect(werkzeugZeile).toContainText('Volumenstudien');
});

test('Info-Icon öffnet das Info-Panel mit Werkzeugliste; Escape schliesst', async ({ page }) => {
  await zentraleLaden(page);
  const infoKnopf = page.locator('[data-testid="kachel-info-design"]');
  await expect(page.locator('[data-testid="kachel-info-panel"]')).toHaveCount(0);

  await infoKnopf.click();
  const panel = page.locator('[data-testid="kachel-info-panel"]');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('KosmoDesign');
  await expect(panel).toContainText('Volumenstudien');

  // Klick auf das Info-Icon darf NIE die Station öffnen (stopPropagation).
  await expect(page.locator('[data-testid="planview"]')).toHaveCount(0);

  await page.keyboard.press('Escape');
  await expect(page.locator('[data-testid="kachel-info-panel"]')).toHaveCount(0);
  // Die Kachel selbst ist danach unverändert klickbar.
  await page.click('[data-testid="module-design"]');
  await expect(page.locator('[data-testid="planview"], [data-testid="inspector"], canvas').first()).toBeVisible();
});

test('Info-Panel schliesst auch per × und per Klick daneben', async ({ page }) => {
  await zentraleLaden(page);

  await page.click('[data-testid="kachel-info-design"]');
  await expect(page.locator('[data-testid="kachel-info-panel"]')).toBeVisible();
  await page.click('[aria-label="Schliessen"]');
  await expect(page.locator('[data-testid="kachel-info-panel"]')).toHaveCount(0);

  await page.click('[data-testid="kachel-info-design"]');
  await expect(page.locator('[data-testid="kachel-info-panel"]')).toBeVisible();
  // Klick auf den Scrim (weit ausserhalb der Karte) schliesst.
  await page.locator('[data-testid="kachel-info-panel"]').click({ position: { x: 5, y: 5 } });
  await expect(page.locator('[data-testid="kachel-info-panel"]')).toHaveCount(0);
});
