import { expect, test } from '@playwright/test';

/**
 * Owner-Auftrag «App deinstallieren…» im Hauptmenü: der dezente Kopfleisten-
 * Knopf öffnet den ehrlichen Dialog (kein Selbst-Deinstallations-Versprechen —
 * Tauri kann das nicht — sondern OS-Kurzanleitung + Link auf die Website).
 */

test('Kopfleiste: „Deinstallieren…" öffnet den Dialog mit den drei OS-Abschnitten', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    // Block-E-Guide startet sonst automatisch (siehe e2e/module.spec.ts) —
    // gleiches Bootstrap-Muster wie die übrigen Kopfleisten-Specs.
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();

  await expect(page.locator('[data-testid="deinstallation-dialog"]')).toHaveCount(0);

  await page.click('[data-testid="menu-deinstallieren"]');

  const dialog = page.locator('[data-testid="deinstallation-dialog"]');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('nicht selbst deinstallieren');
  await expect(page.locator('[data-testid="deinstallation-windows"]')).toBeVisible();
  await expect(page.locator('[data-testid="deinstallation-macos"]')).toBeVisible();
  await expect(page.locator('[data-testid="deinstallation-linux"]')).toBeVisible();
  await expect(page.locator('[data-testid="deinstallation-website-link"]')).toHaveAttribute(
    'href',
    'https://architekturkosmos.ch/orbit/',
  );

  await page.click('[data-testid="deinstallation-dialog"] >> text=×');
  await expect(dialog).toHaveCount(0);
});
