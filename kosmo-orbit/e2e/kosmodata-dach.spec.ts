import { expect, test } from '@playwright/test';

/**
 * D1 (Serie D, KosmoData-Dach) — der leichtgewichtige Übersichts-Tab in
 * KosmoData: sechs Sammlungen (Referenzen · Assets · Wissen · Training ·
 * Gedächtnis · Archiv, D5) mit Zähler und eine gemeinsame Suche (`sucheDach`)
 * darüber. Kein Datenumzug — nur ein Adapter über die bestehenden Speicher.
 */

/** Minimal gültiges GLB: nur ein JSON-Chunk mit leerer Szene (wie ref-asset-verknuepfung.spec.ts). */
function miniGlb(): Buffer {
  const json = Buffer.from(JSON.stringify({ asset: { version: '2.0' }, scenes: [{ nodes: [] }], scene: 0 }), 'utf8');
  const pad = (4 - (json.length % 4)) % 4;
  const jsonChunk = Buffer.concat([json, Buffer.alloc(pad, 0x20)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // magic «glTF»
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonChunk.length, 8);
  const chunkHeader = Buffer.alloc(8);
  chunkHeader.writeUInt32LE(jsonChunk.length, 0);
  chunkHeader.writeUInt32LE(0x4e4f534a, 4); // «JSON»
  return Buffer.concat([header, chunkHeader, jsonChunk]);
}

test('KosmoData-Dach: Übersichts-Tab zeigt sechs Sammlungen mit Zähler und findet Treffer über mehrere Sammlungen', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();

  // Ein GLB-Asset mit dem Tag «beton» importieren — garantiert einen Asset-Treffer
  // neben den Referenz-Treffern aus dem Offline-Seed (19 Einträge enthalten «Beton»).
  await page.click('[data-testid="module-asset"]');
  await page.click('[data-testid="tab-objekte"]');
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('[data-testid="glb-import"]'),
  ]);
  await chooser.setFiles({ name: 'betonstuetze.glb', mimeType: 'model/gltf-binary', buffer: miniGlb() });
  await expect(page.locator('[data-testid="asset-card"]')).toHaveCount(1);

  // Zurück zur Zentrale, KosmoData öffnen, Übersichts-Tab wählen.
  await page.getByLabel('Zur Zentrale').click();
  await page.click('[data-testid="module-data"]');
  await page.click('[data-testid="tab-uebersicht"]');

  const dach = page.locator('[data-testid="kosmodata-dach"]');
  await expect(dach).toBeVisible();

  // Die sechs Sammlungskacheln mit Zähler — Referenzen zeigt den Offline-Seed (112).
  await expect(page.locator('[data-testid="dach-zahl-referenz"]')).toContainText('112');
  await expect(page.locator('[data-testid="dach-zahl-asset"]')).toBeVisible();
  await expect(page.locator('[data-testid="dach-zahl-wissen"]')).toBeVisible();
  await expect(page.locator('[data-testid="dach-zahl-training"]')).toBeVisible();
  await expect(page.locator('[data-testid="dach-zahl-gedaechtnis"]')).toBeVisible();
  await expect(page.locator('[data-testid="dach-zahl-archiv"]')).toBeVisible();

  // Suche über alle sechs Sammlungen: «Beton» trifft sowohl Referenzen als auch das Asset.
  await page.fill('[data-testid="dach-suche"]', 'Beton');
  await expect(page.locator('[data-testid="dach-treffer"]').first()).toBeVisible();
  const treffer = page.locator('[data-testid="dach-treffer"]');
  const anzahl = await treffer.count();
  expect(anzahl).toBeGreaterThanOrEqual(2);

  const trefferTexte = await treffer.allTextContents();
  expect(trefferTexte.some((t) => t.includes('Referenzen'))).toBe(true);
  expect(trefferTexte.some((t) => t.includes('Assets'))).toBe(true);
  // Sichtbarkeits-Chip steht bei jedem Treffer (privat oder öffentlich).
  expect(trefferTexte.every((t) => t.includes('Öffentlich') || t.includes('Privat'))).toBe(true);

  // Klick auf den Asset-Treffer springt zu KosmoAsset und wählt das Objekt vor.
  const assetTreffer = treffer.filter({ hasText: 'Assets' }).first();
  await assetTreffer.click();
  await expect(page.locator('[data-testid="asset-detail"]')).toBeVisible();
  await expect(page.locator('[data-testid="asset-detail"]')).toContainText('betonstuetze');

  await page.screenshot({ path: 'e2e-results/kosmodata-dach.png' });
});

/**
 * F8 (Owner-Befund v0.6.4, Live-Test 0.6.3-Desktop): «Wieso sehe ich
 * KosmoData-Daten nicht, es steht offline seed.» Simuliert genau den
 * Desktop-Zustand — Website-Sync (architekturkosmos.ch) nicht erreichbar —
 * per Route-Abort NUR auf dem Sync-Endpoint (die lokale kosmodata-seed.json
 * bleibt unangetastet). Erwartung: Referenz-Kanon, CH-Bauteilkatalog und
 * Materialkatalog bleiben VOLL sichtbar, und die Badge sagt ehrlich statt
 * kryptisch, was passiert.
 */
test('F8: Website-Sync unerreichbar — eingebaute Referenzdaten/Kataloge bleiben voll sichtbar, Badge ist ehrlich statt kryptisch', async ({ page }) => {
  // Nur der Sync-Endpoint wird abgebrochen — der lokale Seed-Abruf
  // (kosmodata-seed.json, same-origin) ist davon nicht betroffen.
  await page.route('https://architekturkosmos.ch/**', (route) => route.abort('failed'));

  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-data"]');

  // Referenzen-Tab (Standard): der volle eingebaute Referenz-Kanon (112 Einträge).
  await expect(page.locator('[data-testid="ref-card"]')).toHaveCount(112);

  // Badge ist ehrlich: nicht der kryptische String «Offline-Seed», sondern
  // ein Hinweis, dass die eingebauten Referenzdaten trotzdem da sind.
  const badge = page.locator('[data-testid="data-sync-badge"]');
  await expect(badge).toBeVisible();
  await expect(badge).not.toHaveText('Offline-Seed');
  await expect(badge).toContainText(/eingebaute Referenzdaten/i);
  await expect(badge).toHaveAttribute('title', /Website-Sync nicht erreichbar/i);

  // CH-Bauteilkatalog und Materialkatalog hängen nicht am Sync — sie zeigen
  // voll, unabhängig vom (nicht erreichbaren) Website-Sync.
  await page.click('[data-testid="tab-bauteile"]');
  await expect(page.locator('[data-testid^="bauteil-"]').first()).toBeVisible();
  await page.click('[data-testid="tab-materialien"]');
  const materialCount = await page.locator('[data-testid^="material-"]').count();
  expect(materialCount).toBeGreaterThan(0);

  // Klick auf «Sync» versucht den Website-Sync explizit — scheitert er
  // (Route-Abort), bleibt der Seed sichtbar UND die Meldung bleibt ehrlich:
  // Grund benennen, nicht nur "Fehler".
  await page.click('[data-testid="tab-referenzen"]');
  await page.click('[data-testid="data-sync"]');
  await expect(badge).toContainText(/Website-Sync nicht erreichbar/i);
  await expect(badge).toContainText(/eingebaute Referenzdaten bleiben sichtbar/i);
  await expect(page.locator('[data-testid="ref-card"]')).toHaveCount(112);
});

/**
 * K5 (Serie F, 0.6.8) — Facetten für die übrigen KosmoData-Dach-Sammlungen:
 * additiv, NUR wo Tabs reale facettierbare Felder haben (Bauteilkatalog:
 * `kategorie`, Archiv: `kategorie`). Materialien hat bereits eine eigene
 * Facette (`material-filter-*`), Gedächtnis zwei (`gedaechtnis-filter-*`),
 * Training/Wissen haben keine geeignete kategoriale Struktur — bewusst
 * ausgelassen (Abschlussbericht). Beide neuen Tests laufen komplett additiv
 * NEBEN den harten Verträgen oben (112 Referenzen / 19× Beton bleiben
 * unangetastet).
 */
test('K5: Bauteilkatalog-Facette filtert nach Kategorie, «Alle» zeigt wieder alle vier Sektionen', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-data"]');
  await page.click('[data-testid="tab-bauteile"]');

  const alle = page.locator('[data-testid="dach-facette-bauteile-alle"]');
  const dach = page.locator('[data-testid="dach-facette-bauteile-Dach"]');
  await expect(alle).toBeVisible();
  await expect(dach).toBeVisible();

  const kartenVorher = await page.locator('[data-testid^="bauteil-"]').count();
  expect(kartenVorher).toBeGreaterThan(0);

  await dach.click();
  const kartenDach = await page.locator('[data-testid^="bauteil-"]').count();
  expect(kartenDach).toBeGreaterThan(0);
  expect(kartenDach).toBeLessThan(kartenVorher);
  // Nur die Dach-Sektionsüberschrift ist sichtbar — die anderen drei nicht.
  await expect(page.locator('.k-titel', { hasText: 'Dach' })).toHaveCount(1);
  await expect(page.locator('.k-titel', { hasText: 'Aussenwand' })).toHaveCount(0);
  await expect(page.locator('.k-titel', { hasText: 'Innenwand' })).toHaveCount(0);

  // Erneuter Klick auf die aktive Facette setzt zurück (Toggle-Verhalten).
  await dach.click();
  await expect(page.locator('[data-testid^="bauteil-"]')).toHaveCount(kartenVorher);

  // Ausdrücklich «Alle» klicken bringt denselben Ausgangszustand.
  await dach.click();
  await alle.click();
  await expect(page.locator('[data-testid^="bauteil-"]')).toHaveCount(kartenVorher);
});

test('K5: Archiv-Facette filtert nach Kategorie', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-data"]');
  await page.click('[data-testid="tab-archiv"]');

  // Zwei Bestände in unterschiedlichen Kategorien erfassen.
  await page.fill('[data-testid="archiv-feld-name"]', 'Projekte-Ordner');
  await page.fill('[data-testid="archiv-feld-pfad"]', 'D:\\Archiv\\Projekte');
  await page.selectOption('[data-testid="archiv-feld-kategorie"]', 'projekte');
  await page.click('[data-testid="archiv-hinzu"]');
  await expect(page.locator('[data-testid="archiv-eintrag"]')).toHaveCount(1);

  await page.fill('[data-testid="archiv-feld-name"]', 'Foto-Ordner');
  await page.fill('[data-testid="archiv-feld-pfad"]', 'D:\\Archiv\\Fotos');
  await page.selectOption('[data-testid="archiv-feld-kategorie"]', 'fotos');
  await page.click('[data-testid="archiv-hinzu"]');
  await expect(page.locator('[data-testid="archiv-eintrag"]')).toHaveCount(2);

  await page.click('[data-testid="dach-facette-archiv-projekte"]');
  await expect(page.locator('[data-testid="archiv-eintrag"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="archiv-eintrag"]')).toContainText('Projekte-Ordner');

  await page.click('[data-testid="dach-facette-archiv-alle"]');
  await expect(page.locator('[data-testid="archiv-eintrag"]')).toHaveCount(2);
});
