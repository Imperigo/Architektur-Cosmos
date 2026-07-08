import { expect, test } from '@playwright/test';

/**
 * T7 — Oberflächen-Systematik: die Zentrale gruppiert ihre Stationen jetzt
 * nach Familien (Kosmo eigenständig + KosmoDesign/KosmoData/KosmoBüro) und
 * zeigt dezente V2-Platzhalter. Diese Suite prüft, dass die Gruppierung
 * sichtbar ist UND dass jede bestehende Station weiterhin über ihre
 * unveränderte `module-<id>`-Kachel erreichbar bleibt.
 */

test('Zentrale zeigt die Familien-Gruppen (Design/Data/Büro) + Kosmo eigenständig + mind. einen V2-Platzhalter', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();

  // Kosmo ist keine Familie — eigener, immer sichtbarer Bereich
  const kosmo = page.locator('[data-testid="familie-kosmo"]');
  await expect(kosmo).toBeVisible();
  await expect(kosmo.locator('[data-testid="module-speak"]')).toBeVisible();

  // Die drei Familien mit ihren Titeln
  const design = page.locator('[data-testid="familie-design"]');
  await expect(design).toContainText('KosmoDesign');
  await expect(design).toContainText('Entwerfen');
  const data = page.locator('[data-testid="familie-data"]');
  await expect(data).toContainText('KosmoData');
  const buero = page.locator('[data-testid="familie-buero"]');
  await expect(buero).toContainText('KosmoBüro');

  // Jede Familie enthält ihre zugehörigen Stations-Kacheln
  await expect(design.locator('[data-testid="module-design"]')).toBeVisible();
  await expect(design.locator('[data-testid="module-draw"]')).toBeVisible();
  await expect(design.locator('[data-testid="module-vis"]')).toBeVisible();
  await expect(design.locator('[data-testid="module-publish"]')).toBeVisible();
  await expect(design.locator('[data-testid="module-asset"]')).toBeVisible();
  await expect(data.locator('[data-testid="module-data"]')).toBeVisible();
  await expect(data.locator('[data-testid="module-prepare"]')).toBeVisible();
  await expect(data.locator('[data-testid="module-train"]')).toBeVisible();
  await expect(buero.locator('[data-testid="module-dev"]')).toBeVisible();

  // Kosmo/Speak taucht NICHT nochmals innerhalb einer Familie auf
  await expect(design.locator('[data-testid="module-speak"]')).toHaveCount(0);
  await expect(data.locator('[data-testid="module-speak"]')).toHaveCount(0);
  await expect(buero.locator('[data-testid="module-speak"]')).toHaveCount(0);

  // V2-Platzhalter: dezent sichtbar, mindestens einer, nicht Teil der echten Familien
  const v2 = page.locator('[data-testid="familie-v2"] [data-testid^="v2-platzhalter-"]');
  expect(await v2.count()).toBeGreaterThanOrEqual(4);
  await expect(page.locator('[data-testid="v2-platzhalter-lead"]')).toContainText('KosmoLead');
  await expect(page.locator('[data-testid="v2-platzhalter-bau"]')).toContainText('KosmoBau');
});

test('jede bestehende Station bleibt über ihre module-*-Kachel erreichbar (Klick → Station offen)', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    // Interner Fix (K11): Panel-Default ist jetzt zu — hier unschädlich, weil
    // «module-speak» das Panel ohnehin direkt über setKosmoOpen(true) öffnet,
    // aber konsequent gesetzt wie in den übrigen Kosmo-Suiten.
    localStorage.setItem('kosmo.panelOffen', '1');
  });
  await page.reload();

  // Repräsentativ je Familie: KosmoDesign, KosmoData, KosmoBüro (Dev) + Kosmo selbst
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

  // Alle 12 Stations-Kacheln sind angehängt + sichtbar (keine verlorene Station)
  for (const id of ['design', 'draw', 'sketch', 'data', 'vis', 'publish', 'prepare', 'asset', 'dev', 'speak', 'doc', 'train']) {
    await expect(page.locator(`[data-testid="module-${id}"]`)).toBeVisible();
  }
});
