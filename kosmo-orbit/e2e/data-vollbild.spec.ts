import { expect, test, type Page } from '@playwright/test';

/**
 * v0.8.1 / P8 (0.7.5-Welle-2 «Datenstationen-Vollbild», Spec §6.2/§9.17,
 * B-101) — NUR der Vollbild-Aspekt der KosmoData-Station: ein echter
 * `requestFullscreen()`/`exitFullscreen()`-Knopf (`data-vollbild`), analog
 * `viewport-vollbild` in `ViewportChrome.tsx` (anderes Paket).
 *
 * Ehrlich benannt: kein bestehender Spec dieses Repos prüft die tatsächliche
 * `document.fullscreenElement`-Transition unter Playwright (auch
 * `viewport-vollbild` selbst hat keinen solchen Test) — Chromium verweigert
 * `requestFullscreen()` im headless/Container-Kontext meist ohne eine echte
 * Nutzergeste/einen echten Bildschirm, ein Warten auf `fullscreenchange`
 * wäre darum unzuverlässig. Diese Suite prüft darum den REALEN, deterministisch
 * beobachtbaren Teil: der Knopf ist da, beschriftet korrekt, lässt sich ohne
 * Fehler klicken, und die Station bleibt danach voll bedienbar (kein
 * Layout-/Crash-Regress durch den neuen `vollbildRef`).
 */
async function oeffneKosmoData(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-data"]');
  await page.waitForSelector('[data-testid="ref-card"]');
}

test('«Vollbild»-Knopf ist da, beschriftet, klickbar — Station bleibt danach bedienbar', async ({ page }) => {
  await oeffneKosmoData(page);
  const knopf = page.locator('[data-testid="data-vollbild"]');
  await expect(knopf).toBeVisible();
  await expect(knopf).toHaveText('Vollbild');
  await expect(knopf).toHaveAttribute('aria-pressed', 'false');

  await knopf.click();
  // Kein Absturz, keine Navigation weg — die Suche bleibt sofort bedienbar.
  await page.fill('[data-testid="data-search"]', 'Pantheon');
  await expect(page.locator('[data-testid="ref-card"]')).toHaveCount(1);
});
