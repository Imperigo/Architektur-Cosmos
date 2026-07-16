import { expect, test, type Page } from '@playwright/test';

/**
 * v0.8.1 / P8 (0.7.5-Welle-2 «Report-Dossier/Print», Spec §6.2/§9.17,
 * B-103/B-104 «Papier ist Papier») — eigenständig von `modules/publish/
 * DossierPanel.tsx` (Unternehmerplan-Bericht, anderes Paket/-Dateikreis).
 */
async function oeffneVisAnsichten(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    // s. Kommentar `vis-ansichten.spec.ts` — der Vis-Onboarding-Stepper
    // würde sonst die Toolbar überdecken.
    localStorage.setItem('kosmo.vis.onboarded', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-vis"]');
  await page.click('[data-testid="tab-ansichten"]');
}

test('Report-Dossier zeigt Kopf, drei Ansichten-Kacheln und eine Governance-Box — schliesst wieder', async ({
  page,
}) => {
  await oeffneVisAnsichten(page);
  await page.click('[data-testid="vis-report-oeffnen"]');

  const dossier = page.locator('[data-testid="vis-report-dossier"]');
  await expect(dossier).toBeVisible();
  await expect(page.locator('[data-testid^="vis-report-kachel-"]')).toHaveCount(3);
  await expect(page.locator('[data-testid="vis-report-governance"]')).toBeVisible();
  // «Papier ist Papier»: der Bogen bleibt hell (harte Farbliterale), auch
  // wenn die App gerade im dunklen Kosmos-Theme läuft.
  await expect(dossier).toHaveCSS('background-color', 'rgb(255, 255, 255)');

  await page.click('[data-testid="vis-report-schliessen"]');
  await expect(dossier).toHaveCount(0);
});
