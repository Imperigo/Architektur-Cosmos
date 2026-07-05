import { expect, test } from '@playwright/test';

/**
 * D2 (Serie D, KosmoData-Dach) — die Wissen-Sammlung als erstklassiger,
 * durchsuchbarer und pflegbarer Tab in KosmoData (nicht mehr nur RAG-intern
 * in KosmoPrepare). Wiederverwendet dieselbe Wissensbasis
 * (`modules/prepare/knowledge.ts`, IndexedDB `kosmo-wissen`) — kein
 * Datenumzug, nur eine zweite, erstklassige Ansicht: Dokumentliste mit
 * Sichtbarkeits-Umschalter, Suche und die Bauwissen-Basis-Korpora.
 */

test('KosmoData-Wissen: Basis-Korpus laden, Suche findet Treffer, Sichtbarkeit umschaltbar', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();

  await page.click('[data-testid="module-data"]');
  await page.click('[data-testid="tab-wissen"]');

  const wissenTab = page.locator('[data-testid="kosmodata-wissen"]');
  await expect(wissenTab).toBeVisible();

  // Frischer Tresor: noch keine Dokumente aufgenommen. Je nachdem, ob das
  // wissen/-Bündel im Preview-Build ausgeliefert wird, zeigt sich entweder
  // die Basis-Sektion oder — falls nicht ausgeliefert — der Leerzustand.
  const basisSektion = page.locator('[data-testid="wissen-basis"]');
  const leer = page.locator('[data-testid="wissen-leer"]');
  await expect(basisSektion.or(leer)).toBeVisible();

  const ladenKnopf = page.locator('[data-testid="wissen-basis-laden"]').first();
  const anzahlLadenKnoepfe = await ladenKnopf.count();
  test.skip(anzahlLadenKnoepfe === 0, 'Kein Bauwissen-Basis-Bündel im Preview-Build ausgeliefert');

  await expect(page.locator('[data-testid="wissen-doc"]')).toHaveCount(0);
  await ladenKnopf.click();

  // Laden ist asynchron (Fetch + viele IndexedDB-Schreibungen) — auf das
  // tatsächliche Ergebnis warten, nicht auf eine feste Zeit.
  await expect(page.locator('[data-testid="wissen-doc"]').first()).toBeVisible({ timeout: 30_000 });
  const anzahlDocs = await page.locator('[data-testid="wissen-doc"]').count();
  expect(anzahlDocs).toBeGreaterThan(0);

  // Rückmeldung per Toast («X Quellen · Y Abschnitte geladen»), kein alert().
  await expect(page.locator('[data-testid="meldung-erfolg"]')).toBeVisible();

  // Suche: „architektur" ist in praktisch jedem Baubüro-Korpus vertreten,
  // unabhängig davon, welche Sammlung zuerst geladen wurde.
  await page.fill('[data-testid="wissen-search"]', 'architektur');
  await expect(page.locator('[data-testid="wissen-hit"]').first()).toBeVisible({ timeout: 10_000 });
  const trefferText = await page.locator('[data-testid="wissen-hit"]').first().textContent();
  expect(trefferText?.toLowerCase()).toContain('architektur');

  // Suche zurücksetzen — die Dokumentliste erscheint wieder.
  await page.fill('[data-testid="wissen-search"]', '');
  await expect(page.locator('[data-testid="wissen-doc"]').first()).toBeVisible();

  // Sichtbarkeit umschalten: importiereBasis setzt visibility='private' —
  // der Umschalt-Knopf macht das erste Dokument öffentlich.
  const ersterDoc = page.locator('[data-testid="wissen-doc"]').first();
  await expect(ersterDoc).toContainText('Privat');
  await ersterDoc.locator('[data-testid="wissen-visibility-toggle"]').click();
  await expect(ersterDoc).toContainText('Öffentlich');

  await page.screenshot({ path: 'e2e-results/kosmodata-wissen.png' });
});
