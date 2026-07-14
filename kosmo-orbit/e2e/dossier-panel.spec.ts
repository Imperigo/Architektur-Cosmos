import { expect, test } from '@playwright/test';

/**
 * Report-Dossier-Panel (v0.7.7 Stream A1) — `DossierPanel.tsx` lebte bisher
 * eigenständig, aber ungehängt (Welle 3 Stream F). Diese Spec deckt nur die
 * neue Verdrahtung ab: Publish öffnen → «Dossier»-Knopf in der
 * `publish-werkzeugleiste` → Panel erscheint → Export-Knöpfe (SVG/PDF)
 * sichtbar → Knopf schliesst das Panel wieder. Kein Kernel-/Golden-Pfad,
 * reiner UI-Verdrahtungs-Smoke-Test — analog `e2e/kv-schaetzung.spec.ts`s
 * Bootstrap-Muster (`load-tkb` direkt nach `page.goto('/')`).
 */

declare global {
  interface Window {
    __kosmo: {
      open: (s: string) => void;
    };
  }
}

test('Projekt-Dossier: Knopf öffnet das Panel, Export-Knöpfe sichtbar, Knopf schliesst wieder', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="load-tkb"]');
  // v0.7.8 Welle 2 (P4): testid statt Text-Locator (Doppel-Chrome-Kollision
  // mit dem Dock-Kopf-Titel des migrierten `kennzahlen`-Panels, s.
  // `dock-layout.spec.ts` Kommentar).
  await expect(page.locator('[data-testid="kennzahlen"]')).toBeVisible();

  await page.evaluate(() => window.__kosmo.open('publish'));
  await expect(page.locator('[data-testid="publish-werkzeugleiste"]')).toBeVisible();

  const dossierKnopf = page.locator('[data-testid="publish-dossier"]');
  await expect(dossierKnopf).toBeEnabled();
  await expect(page.locator('[data-testid="dossier-panel"]')).toHaveCount(0);

  await dossierKnopf.click();
  await expect(page.locator('[data-testid="dossier-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="dossier-export-svg"]')).toBeVisible();
  await expect(page.locator('[data-testid="dossier-export-pdf"]')).toBeVisible();
  await expect(page.locator('[data-testid="dossier-hinweis"]')).toBeVisible();

  // Erneuter Klick auf den Werkzeugleisten-Knopf schliesst das Panel wieder
  // (Toggle, kein separater Schliessen-Weg nötig für diesen Smoke-Test).
  await dossierKnopf.click();
  await expect(page.locator('[data-testid="dossier-panel"]')).toHaveCount(0);
});
