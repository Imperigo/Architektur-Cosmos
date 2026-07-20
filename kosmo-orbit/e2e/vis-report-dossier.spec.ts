import { expect, test, type Page } from '@playwright/test';

/**
 * v0.8.1 / P8 (0.7.5-Welle-2 «Report-Dossier/Print», Spec §6.2/§9.17,
 * B-103/B-104 «Papier ist Papier») — eigenständig von `modules/publish/
 * DossierPanel.tsx` (Unternehmerplan-Bericht, anderes Paket/-Dateikreis).
 *
 * v0.8.10 / P-B1b (`docs/V0810-SPEZ.md` §2 E2, Matrix C-4/C-5) — Bootstrap
 * auf die Island-UI umgestellt: `test.use({ storageState: { cookies: [],
 * origins: [] } })` (Muster `e2e/blender-bridge.spec.ts:49`), kein
 * Design/Publish/Prepare-Kontakt in dieser Spec. Das alte `tab-ansichten` +
 * `vis-report-oeffnen` (GespeicherteAnsichten-Tab, nur `!islandModus`)
 * entfällt zugunsten der AUSTAUSCH-Insel `report`-Sofort-Aktion
 * (`VisWorkspace.tsx`s `aktiviereVisIslandWerkzeug`: `case 'report':
 * setIslandReportOffen(true)` — dieselbe State-Variable, dasselbe
 * `VisReportDossier`, nur ein anderer Bedienweg). Die Kern-Assertions
 * (`vis-report-dossier`/`-kachel-*`/`-governance`/`-schliessen`) bleiben
 * unverändert (dieselbe Komponente in beiden Modi).
 */
async function oeffneVisAustausch(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    // s. Kommentar `vis-ansichten.spec.ts` — der Vis-Onboarding-Stepper
    // würde sonst die Toolbar überdecken.
    localStorage.setItem('kosmo.vis.onboarded', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-vis"]');
}

test.use({ storageState: { cookies: [], origins: [] } });

test('Report-Dossier zeigt Kopf, drei Ansichten-Kacheln und eine Governance-Box — schliesst wieder', async ({
  page,
}) => {
  await oeffneVisAustausch(page);
  await page.hover('[data-testid="island-austausch-root"]');
  await expect(page.locator('[data-testid="island-werkzeug-report"]')).toBeVisible();
  await page.click('[data-testid="island-werkzeug-report"]');

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
