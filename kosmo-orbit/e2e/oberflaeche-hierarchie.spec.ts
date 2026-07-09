import { expect, test } from '@playwright/test';

/**
 * T7 → Serie K / F3: die Zentrale gruppierte ihre Stationen früher als
 * flache Familien-Kacheln (Design/Data/Büro + Kosmo). Das Orbit-Startmenü
 * (`OrbitStart.tsx`, Owner-Auftrag «rund statt Blöcke») ersetzt das durch
 * 4 Hauptwerkzeuge (KosmoDesign/KosmoData/Kosmo/KosmoOffice) mit einem
 * Hover-/Klick-Fächer; das Mapping (welche echte Station zu welchem
 * Hauptwerkzeug gehört) steht in `shell/orbit-werkzeuge.ts`.
 *
 * Diese Suite prüft die NEUE Hierarchie UND dass jede bestehende Station
 * weiterhin über ihre unveränderte `module-<id>`-Testid erreichbar bleibt
 * (siehe `OrbitStart.tsx`-Kopfkommentar: Untertool-Knöpfe sind IMMER im DOM
 * und klickbar, ihr Fächer ist nur eine optische Fächer-Öffnung).
 */

test('Orbit zeigt genau 4 Hauptwerkzeuge; hover ordnet jede Station korrekt ihrem Hauptwerkzeug-Fächer zu', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();

  await expect(page.locator('[data-testid="orbit-start"]')).toBeVisible();
  for (const id of ['design', 'data', 'kosmo', 'office']) {
    await expect(page.locator(`[data-testid="orbit-haupt-${id}"]`)).toBeVisible();
  }

  // KosmoDesign-Fächer: Draw(design)/Prepare/Vis/Publish + Modellbaum(draw)
  await page.locator('[data-testid="orbit-haupt-design"]').hover();
  const designFaecher = page.locator('[data-testid="orbit-faecher-design"]');
  await expect(designFaecher.locator('[data-testid="module-design"]')).toBeVisible();
  await expect(designFaecher.locator('[data-testid="module-prepare"]')).toBeVisible();
  await expect(designFaecher.locator('[data-testid="module-vis"]')).toBeVisible();
  await expect(designFaecher.locator('[data-testid="module-publish"]')).toBeVisible();
  await expect(designFaecher.locator('[data-testid="module-draw"]')).toBeVisible();

  // KosmoData-Fächer: Reference(data) + Asset — Asset ist NICHT mehr bei KosmoDesign.
  await page.locator('[data-testid="orbit-haupt-data"]').hover();
  const dataFaecher = page.locator('[data-testid="orbit-faecher-data"]');
  await expect(dataFaecher.locator('[data-testid="module-data"]')).toBeVisible();
  await expect(dataFaecher.locator('[data-testid="module-asset"]')).toBeVisible();
  await expect(designFaecher.locator('[data-testid="module-asset"]')).toHaveCount(0);

  // Kosmo-Fächer: Speak/Sketch/Train/Dev/Doc (Owner-Wortlaut).
  await page.locator('[data-testid="orbit-haupt-kosmo"]').hover();
  const kosmoFaecher = page.locator('[data-testid="orbit-faecher-kosmo"]');
  for (const id of ['speak', 'sketch', 'train', 'dev', 'doc']) {
    await expect(kosmoFaecher.locator(`[data-testid="module-${id}"]`)).toBeVisible();
  }

  // Alle 12 Stations-Testids existieren irgendwo in der Zentrale (attached).
  for (const id of ['design', 'draw', 'sketch', 'data', 'vis', 'publish', 'prepare', 'asset', 'dev', 'speak', 'doc', 'train']) {
    await expect(page.locator(`[data-testid="module-${id}"]`)).toBeAttached();
  }
});

test('jede bestehende Station bleibt über ihre module-*-Testid erreichbar (Klick → Station offen), auch ohne vorheriges Hover', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.panelOffen', '1');
  });
  await page.reload();

  // Repräsentativ je Hauptwerkzeug: KosmoDesign, KosmoData, Kosmo (Dev/Doc/Speak)
  await page.click('[data-testid="module-design"]');
  await expect(page.locator('[data-testid="planview"], [data-testid="inspector"], canvas').first()).toBeVisible();
  await page.click('header button[aria-label="Zur Zentrale"]');

  await page.click('[data-testid="module-data"]');
  await expect(page.locator('[data-testid="tab-uebersicht"]')).toBeVisible();
  await page.click('header button[aria-label="Zur Zentrale"]');

  await page.click('[data-testid="module-dev"]');
  await expect(page.locator('[data-testid="auftrag-erfassen"]')).toBeVisible();
  await page.click('header button[aria-label="Zur Zentrale"]');

  await page.click('[data-testid="module-doc"]');
  await expect(page.locator('[data-testid="doc-tab-diagnose"]')).toBeVisible();
  await page.click('header button[aria-label="Zur Zentrale"]');

  // Kosmo (module-speak) öffnet weiterhin das Kosmo-Panel, keine eigene Station-Route
  await page.click('[data-testid="module-speak"]');
  await expect(page.locator('[data-testid="kosmo-input"]')).toBeVisible();

  // Alle 12 Stations-Testids sind angehängt + sichtbar (keine verlorene Station)
  for (const id of ['design', 'draw', 'sketch', 'data', 'vis', 'publish', 'prepare', 'asset', 'dev', 'speak', 'doc', 'train']) {
    await expect(page.locator(`[data-testid="module-${id}"]`)).toBeVisible();
  }
});
