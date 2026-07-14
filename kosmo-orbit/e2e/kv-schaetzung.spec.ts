import { expect, test } from '@playwright/test';

/**
 * KV-Grobschätzung (v0.6.3, `docs/V063-VOLLPROJEKT-KONZEPT.md` Abschnitt 4,
 * Lücken-Batch 3, Owner-Hauptaufgabe K22) — Owner-Journey: TKB laden → KV
 * öffnen → Summe > 0 sichtbar + Ehrlichkeits-Hinweis sichtbar → Kennwert
 * ändern → Summe ändert sich → Undo stellt den Vorzustand wieder her.
 *
 * Bootstrap wie `e2e/abnahme.spec.ts`: `load-tkb` direkt nach `page.goto('/')`
 * (kein Onboarding-Flag nötig, der Knopf ist auf dem Startbildschirm sofort
 * da) — die TKB-Demo hat sieben gezeichnete Decken (Σ 2814 m² GF), damit ist
 * die Summe garantiert > 0, ohne dass der Test selbst Geometrie zeichnen muss.
 *
 * NICHT im Worktree ausgeführt (Owner-Auftrag) — der Koordinator fährt ihn
 * nach dem Einpflegen.
 */

function parseChf(text: string): number {
  return Number(text.replace(/[^0-9-]/g, ''));
}

test('KV-Panel: Summe > 0, Ehrlichkeits-Hinweis sichtbar, Kennwert-Änderung wirkt sofort, Undo stellt wieder her', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="load-tkb"]');
  // v0.7.8 Welle 2 (P4): testid statt Text-Locator (Doppel-Chrome-Kollision
  // mit dem Dock-Kopf-Titel des migrierten `kennzahlen`-Panels, s.
  // `dock-layout.spec.ts` Kommentar).
  await expect(page.locator('[data-testid="kennzahlen"]')).toBeVisible();

  await page.click('[data-testid="kv-oeffnen"]');
  await expect(page.locator('[data-testid="kv-panel"]')).toBeVisible();

  // Ehrlichkeits-Hinweis steht IMMER sichtbar im Panel, nicht nur beim Export.
  await expect(page.locator('[data-testid="kv-hinweis"]')).toContainText(
    'Richtwert auf GF-Basis — kein Devis, keine NPK-Positionen.',
  );

  // TKB-Demo zeichnet 7 Decken (Σ 2814 m² GF) — die Summe ist garantiert > 0.
  const summeVorText = await page.locator('[data-testid="kv-summe"]').innerText();
  const summeVor = parseChf(summeVorText);
  expect(summeVor).toBeGreaterThan(0);

  // Kennwert ändern (BKP-2-Basiswert CHF/m² GF) — feuert design.kvKennwerteSetzen
  // sofort, kein separater «Übernehmen»-Schritt nötig.
  await page.fill('[data-testid="kv-chf-m2"]', '3800');
  await expect(page.locator('[data-testid="kv-summe"]')).not.toHaveText(summeVorText);
  const summeNachher = parseChf(await page.locator('[data-testid="kv-summe"]').innerText());
  expect(summeNachher).toBeGreaterThan(summeVor);

  // Undo stellt exakt den Vorzustand wieder her (ein Undo-Schritt je Kennwert-Änderung).
  await page.click('[data-testid="undo"]');
  await expect(page.locator('[data-testid="kv-summe"]')).toHaveText(summeVorText);
});
