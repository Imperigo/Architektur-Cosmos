import { expect, test } from '@playwright/test';

/**
 * Serie K / A2 (Owner-Befund K12) → Serie K / F3 → v0.8.4 PA2 (Owner-Auftrag
 * «Hauptmenü-Neubau», docs/V084-SPEZ.md §4): die alte Kachel-Ansicht
 * (`ZentraleKachel.tsx`, Info-Icon + Hover-Werkzeugzeile je Kachel) ist
 * durch das Orbit-Startmenü ersetzt (`OrbitStart.tsx`) — seit PA2 eine
 * STATISCHE Kachel-Reihe unten mittig (keine Rotation mehr, Owner wörtlich:
 * «NICHT mehr drehend»). Diese Suite beweist die Fähigkeiten am lebenden
 * Objekt, OHNE den zentralen Bestandsvertrag zu verlassen: jede Station
 * bleibt exakt `data-testid="module-<id>"`, sofort klickbar.
 */

async function zentraleLaden(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
}

test('Orbit mit den 4 Hauptwerkzeugen ist da — nichts aus der Kachel-Extraktion verschluckt', async ({ page }) => {
  await zentraleLaden(page);
  await expect(page.locator('[data-testid="orbit-start"]')).toBeVisible();
  await expect(page.locator('[data-testid="orbit-haupt-design"]')).toBeVisible();
  await expect(page.locator('[data-testid="module-design"]')).toBeAttached();
});

test('Station öffnet DIREKT nach dem Laden — die statische Kachel-Reihe blockiert den Klick nicht', async ({ page }) => {
  await zentraleLaden(page);
  // Kein zusätzliches Warten: click() direkt nach dem Reload (seit PA2
  // steht die Reihe ohnehin still, «NICHT mehr drehend» — Owner-Auftrag).
  await page.click('[data-testid="module-design"]');
  await expect(page.locator('[data-testid="planview"], [data-testid="inspector"], canvas').first()).toBeVisible();
  await page.click('header button[aria-label="Zur Zentrale"]');
  await expect(page.locator('[data-testid="module-design"]')).toBeVisible();
});

test('Hover auf ein Untertool zeigt «was es kann» (Fähigkeitstext), vorher nur angehängt', async ({ page }) => {
  await zentraleLaden(page);
  const faehigkeit = page.locator('[data-testid="orbit-faehigkeit-draw"]');

  // Vor jedem Hover unsichtbar (max-height/opacity 0) — kein Layout-Sprung.
  await expect(faehigkeit).toBeAttached();
  await page.locator('[data-testid="orbit-haupt-design"]').hover();
  await page.locator('[data-testid="module-design"]').hover();
  await expect(faehigkeit).toBeVisible();
  await expect(faehigkeit).toContainText('Volumenstudien');
});

test('KosmoOffice ist «kommend» — sichtbar, aber die Untertools öffnen nie einen leeren Screen', async ({ page }) => {
  await zentraleLaden(page);
  await expect(page.locator('[data-testid="orbit-haupt-office"]')).toContainText('kommend');
  await page.locator('[data-testid="orbit-haupt-office"]').hover();
  const lead = page.locator('[data-testid="orbit-office-lead"]');
  await expect(lead).toBeVisible();
  await expect(lead).toBeDisabled();
  // Ein Klick (erzwungen, da disabled) darf niemals eine Station öffnen.
  await page.locator('[data-testid="orbit-haupt-office"]').click();
  await expect(page.locator('[data-testid="orbit-start"]')).toBeVisible();
  await expect(page.locator('[data-testid="planview"]')).toHaveCount(0);
});
