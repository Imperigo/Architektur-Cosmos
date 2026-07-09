import { test, expect } from '@playwright/test';

/**
 * v0.6.4 Notion-Rest (Phase F): der Tech-Radar ist im Produkt sichtbar —
 * KosmoDoc bekommt einen vierten Tab mit der kuratierten Radar-Liste,
 * Scan-Posten ehrlich mit ⚠ markiert.
 */

test('KosmoDoc → Tech-Radar: kuratierte Posten sichtbar, Scan-Einträge markiert', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.panelOffen', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.waitForSelector('[data-testid="module-design"]');
  await page.evaluate(() => window.__kosmo.open('doc'));
  await page.click('[data-testid="doc-tab-radar"]');
  await expect(page.locator('[data-testid="doc-radar"]')).toBeVisible();
  // Substanzielle Liste (kuratierte Posten, keine leere Attrappe)
  expect(await page.locator('[data-testid="radar-posten"]').count()).toBeGreaterThanOrEqual(20);
  // Der Cloud-Render-Kandidat aus dem Notion-Scan steht drin — mit ⚠ (unverifiziert)
  const gemini = page.locator('[data-testid="radar-posten"]', { hasText: 'Gemini Omni Flash' });
  await expect(gemini).toBeVisible();
  await expect(gemini).toContainText('⚠');
  await expect(gemini).toContainText('Owner');
  // Verifizierter Bestand ohne ⚠
  const kamera = page.locator('[data-testid="radar-posten"]', { hasText: 'camera-controls' });
  await expect(kamera).toBeVisible();
  await expect(kamera).not.toContainText('⚠');
});
