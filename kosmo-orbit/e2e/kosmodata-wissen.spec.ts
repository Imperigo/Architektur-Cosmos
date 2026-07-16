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

/**
 * D (v0.6.8) — Stream D: Docling-Wissens-Ingest. Additiv zum Test oben: die
 * neue Import-Sektion im Wissen-Tab liest `public/wissen/import.json`
 * (von `tools/docling-ingest/ingest.py` regeneriert) und zeigt je Notiz aus
 * `wissen/vault/Import/` eine Herkunftszeile «Import · ‹werkzeug› ·
 * ‹datum›». Ein per `--fake` erzeugtes Beispiel liegt fest im Repo
 * (`wissen/vault/Import/bauteilkatalog-aussenwand-20260710-131701.md`,
 * `werkzeug: fixture`) — dieser Test verifiziert genau diese Notiz als
 * sichtbaren E2E-Anker.
 */
test('KosmoData-Wissen: Import-Sektion zeigt die Fixture-Notiz mit Herkunftszeile', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();

  await page.click('[data-testid="module-data"]');

  // v0.8.1/P2 (Technik-/Flake-Härtung, ROADMAP-Auftrag «Fixture-Skip
  // auflösen») — ECHTER Befund, KEIN fehlendes Fixture: `import.json` ist
  // seit 85fcbe1 (v0.6.8) committet und wird im Preview-Build unter
  // `wissen/import.json` korrekt ausgeliefert (per Fetch verifiziert). Der
  // Skip unten war eine RACE im Test selbst: `holeWissenImport()`
  // (`DataWorkspace.tsx`) fetcht das Manifest ASYNCHRON erst beim Mounten
  // des Wissen-Tabs — bis die Antwort da ist, zeigt die Sektion ihren
  // initialen LEER-Zustand (`importEintraege === []`). Der Vorbestand
  // akzeptierte `eintrag.first().or(leer)` als „settled" — das trifft aber
  // GENAUSO auf den LEER-Zustand VOR dem Fetch zu; traf `anzahlEintraege`
  // GENAU in diesem Zwischenmoment (unter Last reproduziert), skippte der
  // Test einen echten, funktionierenden Pfad. Fix: explizit auf die
  // TATSÄCHLICHE Netzwerkantwort des Manifests warten (Listener VOR dem
  // Tab-Klick registriert, der den Fetch erst auslöst), bevor der Render-
  // Zustand geprüft wird — deterministisch statt auf ein Timing-Fenster
  // gewettet. Antwortet der Server nie (z.B. Build ohne Manifest), greift
  // der 15s-Timeout-Fallback — der ehrliche Skip-Pfad danach bleibt intakt.
  const importAntwort = page
    .waitForResponse((res) => res.url().includes('/wissen/import.json'), { timeout: 15_000 })
    .catch(() => null);
  await page.click('[data-testid="tab-wissen"]');
  await importAntwort;

  const wissenTab = page.locator('[data-testid="kosmodata-wissen"]');
  await expect(wissenTab).toBeVisible();

  const importSektion = page.locator('[data-testid="wissen-import"]');
  await expect(importSektion).toBeVisible();

  // Ehrliche Leerzeile nur, wenn kein Import-Manifest ausgeliefert wird —
  // im Preview-Build liegt die committete Fixture-Notiz vor, also erwarten
  // wir den echten Eintrag statt des Leerzustands.
  const eintrag = page.locator('[data-testid="wissen-import-eintrag"]');
  const leer = page.locator('[data-testid="wissen-import-leer"]');
  await expect(eintrag.first().or(leer)).toBeVisible();

  const anzahlEintraege = await eintrag.count();
  test.skip(anzahlEintraege === 0, 'Kein Import-Manifest im Preview-Build ausgeliefert');

  await expect(eintrag.first()).toContainText('Bauteilkatalog-Aussenwand');

  const herkunft = eintrag.first().locator('[data-testid="wissen-import-herkunft"]');
  await expect(herkunft).toHaveText('Import · fixture · 2026-07-10');
});
