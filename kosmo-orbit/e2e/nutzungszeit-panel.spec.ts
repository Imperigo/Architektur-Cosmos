import { expect, test, type Page } from '@playwright/test';

/**
 * v0.8.1 / P15 (Nutzungszeit-Panel, docs/V081-SPEZ.md §7(f)/§9.5 C-34) —
 * beweist am lebenden Objekt, dass das neue `einstellungen-nutzungszeit`-
 * Panel (`shell/Einstellungen.tsx`) ECHTE Daten aus dem bestehenden
 * Adaptions-Speicher (`kosmo.adaption.v1`) zeigt, keine Attrappen-Zahlen:
 *  - ein Dock-Klick, der WIRKLICH `toolNutzungMelden('viz')` auslöst
 *    (`EntwurfsDock.tsx`s `dock-vis`-Knopf, s. `e2e/faehigkeiten-phasen.
 *    spec.ts` fürs selbe Muster), zeigt sich danach als «genutzt» mit realem
 *    Gewicht + realer «zuletzt»-Zeit — kein Reload/Neuberechnen nötig, das
 *    Profil wird beim Panel-Mount einmal frisch gelesen.
 *  - eine Station MIT Rang-Zuordnung, aber ohne Klick in dieser Sitzung
 *    (KosmoData), bleibt ehrlich «noch nie genutzt».
 *  - eine Station OHNE Rang-Zuordnung (KosmoPackage, `STATION_ZU_TOOLID`
 *    kennt `paket` nicht) zeigt ehrlich «nicht separat erfasst» — nicht
 *    dieselbe 0 wie eine schlicht ungenutzte, aber zählbare Station.
 */

async function bootstrap(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.waitForSelector('[data-testid="module-design"]');
}

test('Nutzungszeit-Panel: echter Dock-Klick zeigt sich als «genutzt», ungenutzte Stationen bleiben ehrlich getrennt', async ({
  page,
}) => {
  await bootstrap(page);

  // Echter Nutzungs-Trigger: KosmoDesign öffnen, dann per Dock-Icon zu
  // KosmoVis wechseln — genau der Weg, den `EntwurfsDock.tsx`s `klick()`
  // mit `toolNutzungMelden('viz')` begleitet (kein Test-Hook, kein
  // Fake-Datenpfad).
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="dock-vis"]');
  await expect(page.locator('[data-testid="vis-auto-kamera"]')).toBeVisible();

  // Einstellungen sind app-weit im Header erreichbar, auch von KosmoVis aus.
  await page.click('[data-testid="einstellungen-oeffnen"]');
  await expect(page.locator('[data-testid="einstellungen-nutzungszeit"]')).toBeVisible();

  const vis = page.locator('[data-testid="nutzungszeit-station-vis"]');
  await expect(vis).toContainText('KosmoVis');
  await expect(vis).toContainText('Gewicht');
  await expect(vis).toContainText('zuletzt');
  await expect(vis).not.toContainText('noch nie genutzt');
  await expect(vis).not.toContainText('nicht separat erfasst');

  // KosmoData hat eine Rang-Zuordnung (STATION_ZU_TOOLID.data === 'data'),
  // wurde aber in dieser Sitzung nie angeklickt — ehrlich "noch nie genutzt".
  const data = page.locator('[data-testid="nutzungszeit-station-data"]');
  await expect(data).toContainText('KosmoData');
  await expect(data).toContainText('noch nie genutzt');

  // KosmoPackage hat KEINE Rang-Zuordnung (s. `state/orbit-rang.ts`
  // STATION_ZU_TOOLID) — ehrlich "nicht separat erfasst", nicht "noch nie
  // genutzt" (unterschiedliche Ehrlichkeits-Aussage, s. Kopfkommentar).
  const paket = page.locator('[data-testid="nutzungszeit-station-paket"]');
  await expect(paket).toContainText('KosmoPackage');
  await expect(paket).toContainText('nicht separat erfasst');

  // Der frische Vis-Klick taucht auch in "Meistgenutzte Einzel-Werkzeuge" auf
  // (`orbit:viz`-Element-Id, s. `state/nutzungszeit.ts` lesbarerElementName).
  await expect(page.locator('[data-testid="nutzungszeit-werkzeug-orbit-viz"]')).toBeVisible();

  // Alle 14 Stationen sind vertreten (Vollständigkeits-Vertrag).
  await expect(page.locator('[data-testid^="nutzungszeit-station-"]')).toHaveCount(14);
});

test('Nutzungszeit-Panel benennt die Ehrlichkeitsgrenze wörtlich: keine gemessene Aufenthaltsdauer', async ({ page }) => {
  await bootstrap(page);
  await page.click('[data-testid="einstellungen-oeffnen"]');
  const sektion = page.locator('[data-testid="einstellungen-nutzungszeit"]');
  await expect(sektion).toBeVisible();
  await expect(sektion).toContainText('kosmo.adaption.v1');
  await expect(sektion).toContainText('Aufenthaltsdauer je Station wird heute nicht erfasst');
});

test('ein frisches Profil (nie geöffnetes Design) zeigt ALLE Stationen ehrlich ungenutzt/nicht erfasst — keine erfundenen Werte', async ({
  page,
}) => {
  await bootstrap(page);
  await page.click('[data-testid="einstellungen-oeffnen"]');
  await expect(page.locator('[data-testid="einstellungen-nutzungszeit"]')).toBeVisible();
  await expect(page.locator('[data-testid="nutzungszeit-werkzeuge"]')).toHaveCount(0);
  const design = page.locator('[data-testid="nutzungszeit-station-design"]');
  await expect(design).toContainText('noch nie genutzt');
});
