import { expect, test } from '@playwright/test';

/**
 * T7 → Serie K / F3: die Zentrale gruppierte ihre Stationen früher als
 * flache Familien-Kacheln (Design/Data/Büro + Kosmo). Das Orbit-Startmenü
 * (`OrbitStart.tsx`, Owner-Auftrag «rund statt Blöcke») ersetzt das durch
 * Hauptwerkzeuge (KosmoDesign/KosmoData/KosmoOffice) mit einem
 * Hover-/Klick-Fächer; das Mapping (welche echte Station zu welchem
 * Hauptwerkzeug gehört) steht in `shell/orbit-werkzeuge.ts`.
 *
 * P-F2 (v0.9.2, bindende Owner-Entscheidung nach AskUserQuestion): «Kosmo»
 * ist KEINE Zentrale-Kachel mehr — seine Untertools (Speak/Sketch/Modell/
 * Train/Dev/Doc/Trust/Package) laufen jetzt über das Rechtsklick-Menü des
 * Kosmo-Orbs rechts unten (`shell/KosmoSymbol.tsx`, `kosmo-stationen-menu`).
 * Diese Suite prüft die Hierarchie für die verbleibenden DREI Hauptwerkzeuge
 * UND dass jede bestehende Station weiterhin erreichbar bleibt — für
 * KosmoDesign/KosmoData ohne jedes Vorgeplänkel (Harter Vertrag: immer im
 * DOM), für die Kosmo-Gruppe über einen vorangestellten Orb-Rechtsklick
 * (dieselbe `module-<id>`-Testid, s. `KosmoSymbol.tsx`-Kopfkommentar).
 */

test('Orbit zeigt genau 3 Hauptwerkzeuge; hover/Rechtsklick ordnet jede Station korrekt ihrer Gruppe zu', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();

  await expect(page.locator('[data-testid="orbit-start"]')).toBeVisible();
  for (const id of ['design', 'data', 'office']) {
    await expect(page.locator(`[data-testid="orbit-haupt-${id}"]`)).toBeVisible();
  }
  await expect(page.locator('[data-testid="orbit-haupt-kosmo"]')).toHaveCount(0);

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

  // Kosmo-Gruppe: Speak/Sketch/Train/Dev/Doc (Owner-Wortlaut) — jetzt am
  // Orb-Rechtsklick-Menü statt an einer Zentrale-Kachel.
  await page.click('[data-testid="kosmo-symbol"]', { button: 'right' });
  const kosmoMenu = page.locator('[data-testid="kosmo-stationen-menu"]');
  for (const id of ['speak', 'sketch', 'train', 'dev', 'doc']) {
    await expect(kosmoMenu.locator(`[data-testid="module-${id}"]`)).toBeVisible();
  }
  await page.keyboard.press('Escape');

  // KosmoDesign/KosmoData-Stationen: immer im DOM (Harter Vertrag,
  // OrbitStart.tsx-Kopfkommentar) — ohne jedes Hover angehängt.
  for (const id of ['design', 'draw', 'data', 'vis', 'publish', 'prepare', 'asset']) {
    await expect(page.locator(`[data-testid="module-${id}"]`)).toBeAttached();
  }
  // Kosmo-Gruppe: NUR angehängt, solange das Orb-Menü offen ist (kein
  // Harter Vertrag mehr, s. Kopfkommentar) — nach Escape (oben) zu.
  for (const id of ['sketch', 'dev', 'speak', 'doc', 'train']) {
    await expect(page.locator(`[data-testid="module-${id}"]`)).toHaveCount(0);
  }
});

test('jede bestehende Station bleibt erreichbar (Klick → Station offen) — KosmoDesign/KosmoData ohne Hover, Kosmo-Gruppe über den Orb-Rechtsklick', async ({ page }) => {
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

  // Kosmo-Gruppe: Panel ist noch offen (s. `kosmo.panelOffen` oben) — der
  // Orb rendert erst, sobald es zu ist (App.tsx, `!kosmoOpen`-Guard);
  // EINMAL schliessen genügt, `kosmoOpen` bleibt danach für den Rest des
  // Tests zu (P-F2, v0.9.2).
  await page.click('[aria-label="Schliessen"]');
  await page.click('[data-testid="kosmo-symbol"]', { button: 'right' });
  await page.click('[data-testid="module-dev"]');
  await expect(page.locator('[data-testid="auftrag-erfassen"]')).toBeVisible();
  await page.click('header button[aria-label="Zur Zentrale"]');

  await page.click('[data-testid="kosmo-symbol"]', { button: 'right' });
  await page.click('[data-testid="module-doc"]');
  await expect(page.locator('[data-testid="doc-tab-diagnose"]')).toBeVisible();
  await page.click('header button[aria-label="Zur Zentrale"]');

  // Kosmo (module-speak) öffnet weiterhin das Kosmo-Panel, keine eigene Station-Route
  await page.click('[data-testid="kosmo-symbol"]', { button: 'right' });
  await page.click('[data-testid="module-speak"]');
  await expect(page.locator('[data-testid="kosmo-input"]')).toBeVisible();

  // KosmoDesign/KosmoData-Stationen: weiterhin angehängt + sichtbar (keine
  // verlorene Station) — Harter Vertrag unverändert für echte Zentrale-Kacheln.
  for (const id of ['design', 'draw', 'data', 'vis', 'publish', 'prepare', 'asset']) {
    await expect(page.locator(`[data-testid="module-${id}"]`)).toBeVisible();
  }
});
