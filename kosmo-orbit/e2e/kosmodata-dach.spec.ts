import { expect, test } from '@playwright/test';

/**
 * D1 (Serie D, KosmoData-Dach) — der leichtgewichtige Übersichts-Tab in
 * KosmoData: fünf Sammlungen (Referenzen · Assets · Wissen · Training ·
 * Gedächtnis) mit Zähler und eine gemeinsame Suche (`sucheDach`) darüber.
 * Kein Datenumzug — nur ein Adapter über die bestehenden Speicher.
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

test('KosmoData-Dach: Übersichts-Tab zeigt fünf Sammlungen mit Zähler und findet Treffer über mehrere Sammlungen', async ({ page }) => {
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

  // Die fünf Sammlungskacheln mit Zähler — Referenzen zeigt den Offline-Seed (112).
  await expect(page.locator('[data-testid="dach-zahl-referenz"]')).toContainText('112');
  await expect(page.locator('[data-testid="dach-zahl-asset"]')).toBeVisible();
  await expect(page.locator('[data-testid="dach-zahl-wissen"]')).toBeVisible();
  await expect(page.locator('[data-testid="dach-zahl-training"]')).toBeVisible();
  await expect(page.locator('[data-testid="dach-zahl-gedaechtnis"]')).toBeVisible();

  // Suche über alle fünf Sammlungen: «Beton» trifft sowohl Referenzen als auch das Asset.
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
