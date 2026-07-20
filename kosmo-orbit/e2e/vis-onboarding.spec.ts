import { expect, test, type Page } from '@playwright/test';
import { visManuellStorageState } from './helpers/manuell-seed';

/**
 * v0.8.1 / P8 (0.7.5-Welle-2 «Vis-Onboarding-Stepper», Spec §6.2/§9.17,
 * B-102 «392px, 34px-Kreise») — eigenständiger KosmoVis-Stepper, unabhängig
 * von `shell/OnboardingWizard.tsx` (anderes Paket).
 *
 * `kosmo.vis.onboarding.erzwingen` (Muster `kosmo.abspielen='erzwingen'`,
 * `state/abspiel-ebene.ts`): hebt NUR die `navigator.webdriver`-Sperre auf,
 * die das automatische Erstbesuchs-Overlay unter jedem gewöhnlichen
 * Playwright-Lauf sonst unterdrückt (Gate-Fund P7 — ohne diese Sperre
 * blockierte das Overlay 4 bestehende Vis-Specs, die den `module-vis`-Klick
 * sofort weiterklicken). Exklusiv dieser Suite (+ `p8-081-screenshots.spec.ts`)
 * vorbehalten.
 *
 * v0.8.10 E3-Nachtrag (Owner-Entscheid 20.07.2026, `docs/V0810-SPEZ.md` §2
 * E3 Punkt 6): der Vis-Onboarding-Stepper ist eine Manuell-only-Funktion
 * (kein Insel-Äquivalent, P-B1-Audit-Fund) — der globale `kosmo.ui.v1`-Seed
 * verliert sein `visOberflaeche`-Feld (Seed-Flip), dieser Per-Spec-Kopf hält
 * die Suite unverändert auf `visOberflaeche:'manuell'` (Muster `e2e/helpers/
 * manuell-seed.ts`s `visManuellStorageState()`-Kopfkommentar).
 */
test.use({ storageState: visManuellStorageState() });

async function oeffneVis(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.vis.onboarding.erzwingen', '1');
  });
  await page.evaluate(() => localStorage.setItem('kosmo.bridge', 'http://localhost:8600'));
  await page.reload();
  await page.click('[data-testid="module-vis"]');
}

test('zeigt sich beim ersten Besuch, «Fertig» schliesst und setzt das Gesehen-Flag (kein zweites Mal beim Reload)', async ({
  page,
}) => {
  await oeffneVis(page);
  const dialog = page.locator('[data-testid="vis-onboarding"]');
  await expect(dialog).toBeVisible();
  await expect(page.locator('[data-testid^="vis-onboarding-kreis-"]')).toHaveCount(4);

  // Durch alle Schritte klicken.
  for (let i = 0; i < 3; i++) {
    await page.click('[data-testid="vis-onboarding-weiter"]');
  }
  await expect(page.locator('[data-testid="vis-onboarding-weiter"]')).toHaveText('Fertig');
  await page.click('[data-testid="vis-onboarding-weiter"]');
  await expect(dialog).toHaveCount(0);

  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('kosmo.vis.onboarded')))
    .toBe('1');

  await page.reload();
  await expect(page.locator('[data-testid="vis-onboarding"]')).toHaveCount(0);
});

test('«?»-Knopf öffnet den Stepper jederzeit wieder', async ({ page }) => {
  await oeffneVis(page);
  await page.click('[data-testid="vis-onboarding-ueberspringen"]');
  await expect(page.locator('[data-testid="vis-onboarding"]')).toHaveCount(0);

  await page.click('[data-testid="vis-onboarding-oeffnen"]');
  await expect(page.locator('[data-testid="vis-onboarding"]')).toBeVisible();
});
