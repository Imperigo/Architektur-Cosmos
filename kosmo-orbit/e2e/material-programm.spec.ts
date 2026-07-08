import { expect, test } from '@playwright/test';

/**
 * v0.6.3 / B4 (Owner-Befund K21 «Materialbibliothek ausbauen», Stufe 1).
 *
 * Prüft die neuen Datenmodell-Felder (Quelle/Dimensionen/Materialart/Region)
 * end-to-end in der Materialien-Tab der Asset-Station:
 * - Referenzkatalog: Filter, Detail mit 3D-Würfel-Canvas + Quellen-Text
 *   («Quelle unbelegt (Altbestand)» — Owner-Mandat Ehrlichkeit vor Politur).
 * - Eigene Einträge: Quelle ist beim Erfassen Pflicht (Validierungsmeldung
 *   ohne Quelle), mit Quelle wird gespeichert und im Detail sichtbar.
 *
 * Stufe 2 (externer Quellen-Ingest, Lizenzprüfung, echte 4k/8k-Fotomaps) ist
 * NICHT Teil dieses Batches — hier nur Datenmodell + Würfel-Vorschau.
 */

test('Materialbibliothek K21: Referenzkatalog zeigt Würfel + Quelle, Filter funktionieren', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();

  await page.click('[data-testid="module-asset"]');
  await page.click('[data-testid="asset-tab-materialien"]');

  // Referenzkatalog-Karten sind da (mind. Backstein, das Owner-Beispiel).
  const backstein = page.locator('[data-testid="material-backstein"]');
  await expect(backstein).toBeVisible();

  // Filter: Baumaterial/Rohmaterial/Unbekannt zählen plausibel (Summe = Alle).
  const alle = page.locator('[data-testid="material-filter-alle"]');
  const bau = page.locator('[data-testid="material-filter-baumaterial"]');
  const roh = page.locator('[data-testid="material-filter-rohmaterial"]');
  await expect(alle).toBeVisible();
  await expect(bau).toBeVisible();
  await expect(roh).toBeVisible();

  await roh.click();
  await expect(page.locator('[data-testid="material-kies"]')).toBeVisible();
  // Backstein ist Baumaterial — beim Rohmaterial-Filter nicht mehr da.
  await expect(backstein).toHaveCount(0);
  await alle.click();
  await expect(backstein).toBeVisible();

  // Detail: Klick auf Backstein zeigt den Würfel (Canvas) + die ehrliche Quelle.
  await backstein.click();
  const detail = page.locator('[data-testid="material-detail"]');
  await expect(detail).toBeVisible();
  await expect(detail.locator('[data-testid="material-wuerfel"]')).toBeVisible();
  await expect(detail.locator('canvas')).toHaveCount(1);
  const quelle = page.locator('[data-testid="material-detail-quelle"]');
  await expect(quelle).toContainText('Quelle unbelegt (Altbestand)');
  // Owner-Beispiel aus dem Befund: Backstein NF 250×120×65 mm ist hinterlegt.
  await expect(detail).toContainText('250');
  await expect(detail).toContainText('120');
  await expect(detail).toContainText('65');
});

test('Materialbibliothek K21: eigenes Material — Quelle ist Pflicht (Validierung), mit Quelle gespeichert', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();

  await page.click('[data-testid="module-asset"]');
  await page.click('[data-testid="asset-tab-materialien"]');

  await page.click('[data-testid="material-erfassen-oeffnen"]');
  const formular = page.locator('[data-testid="material-erfassen-formular"]');
  await expect(formular).toBeVisible();

  // Ohne Quelle speichern → Validierungsmeldung, NICHTS gespeichert.
  await page.fill('[data-testid="material-titel"]', 'Muster-Klinker Nordfassade');
  await page.click('[data-testid="material-erfassen-speichern"]');
  await expect(page.locator('[data-testid="meldung-fehler"]').last()).toContainText('Quelle');
  await expect(page.locator('[data-testid^="material-erfasst-"]')).toHaveCount(0);

  // Mit Quelle + Dimensionen + Materialart → gespeichert, taucht in der Liste auf.
  await page.fill('[data-testid="material-quelle"]', 'Musterlieferant AG, Datenblatt 2026');
  await page.selectOption('[data-testid="material-art"]', 'baumaterial');
  await page.fill('[data-testid="material-region"]', 'Zürich');
  await page.fill('[data-testid="material-laenge"]', '250');
  await page.fill('[data-testid="material-breite"]', '120');
  await page.fill('[data-testid="material-dicke"]', '65');
  await page.click('[data-testid="material-erfassen-speichern"]');
  await expect(page.locator('[data-testid="meldung-erfolg"]').last()).toContainText('erfasst');

  const karte = page.locator('[data-testid^="material-erfasst-"]').first();
  await expect(karte).toBeVisible();
  await expect(karte).toContainText('Muster-Klinker Nordfassade');
  await expect(karte).toContainText('Musterlieferant AG');

  // Detail des eigenen Eintrags zeigt ebenfalls den Würfel (Canvas).
  await karte.click();
  const detail = page.locator('[data-testid="material-erfasst-detail"]');
  await expect(detail).toBeVisible();
  await expect(detail.locator('[data-testid="material-wuerfel"]')).toBeVisible();
  await expect(detail).toContainText('Musterlieferant AG');
});
