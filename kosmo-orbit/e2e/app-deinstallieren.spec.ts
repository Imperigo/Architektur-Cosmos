import { expect, test } from '@playwright/test';

/**
 * Owner-Auftrag «App deinstallieren…»: der Dialog ist ehrlich (kein
 * Selbst-Deinstallations-Versprechen — Tauri kann das nicht — sondern
 * OS-Kurzanleitung + Link auf die Website).
 *
 * F2 (v0.6.4, Entdoppelung): der Einstieg wohnt NUR noch in den
 * Einstellungen (Sektion «System») — der frühere Kopfleisten-Knopf
 * (`menu-deinstallieren`) ist weg, «eine Funktion = ein Ort».
 */

test('Einstellungen → System: „App deinstallieren…" öffnet den Dialog mit den drei OS-Abschnitten', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    // Block-E-Guide startet sonst automatisch (siehe e2e/module.spec.ts) —
    // gleiches Bootstrap-Muster wie die übrigen Kopfleisten-Specs.
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();

  await expect(page.locator('[data-testid="deinstallation-dialog"]')).toHaveCount(0);
  // F2: kein Deinstallieren-Knopf mehr in der Kopfleiste
  await expect(page.locator('[data-testid="menu-deinstallieren"]')).toHaveCount(0);

  await page.click('[data-testid="einstellungen-oeffnen"]');
  await page.click('[data-testid="einstellung-deinstallieren"]');

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

test('F2-Entdoppelung: Thema/Akzent leben NUR in den Einstellungen, nicht in der Kopfleiste', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  // Kopfleiste: keine Akzent-Punkte, kein Thema-Umschalter mehr
  await expect(page.locator('header [data-testid^="akzent-"]')).toHaveCount(0);
  await expect(page.locator('header >> text=Tinte')).toHaveCount(0);
  // Einstellungen: der EINE Ort — Akzent umschalten wirkt aufs Dokument
  await page.click('[data-testid="einstellungen-oeffnen"]');
  await expect(page.locator('[data-testid="einstellung-akzent-tusche"]')).toBeVisible();
  await page.click('[data-testid="einstellung-akzent-kupfer"]');
  expect(await page.evaluate(() => document.documentElement.dataset['akzent'])).toBe('kupfer');
});
