import { expect, test } from '@playwright/test';

/**
 * Batch 5 der Codex-Übernahme: die Ref↔Asset-Verknüpfung — das eigentliche
 * «ein System». Ein GLB-Objekt wird mit einer KosmoData-Referenz verknüpft;
 * beide Seiten zeigen die Verbindung, und ein Klick springt in beide
 * Richtungen (KosmoAsset → KosmoData über den bestehenden `asset-ref-oeffnen-*`-
 * Weg aus Batch 4, KosmoData → KosmoAsset neu über `ref-asset-*`).
 */

/** Minimal gültiges GLB: nur ein JSON-Chunk mit leerer Szene (wie p3.spec.ts). */
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

test('Ref↔Asset: GLB mit Villa Savoye verknüpfen, im KosmoData-Dossier sehen, zurückspringen, entfernen', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();

  // GLB importieren (bekannter Weg aus p3.spec.ts / kosmoasset-bibliothek.spec.ts).
  await page.click('[data-testid="module-asset"]');
  await page.click('[data-testid="tab-objekte"]');
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('[data-testid="glb-import"]'),
  ]);
  await chooser.setFiles({ name: 'sessel.glb', mimeType: 'model/gltf-binary', buffer: miniGlb() });
  await expect(page.locator('[data-testid="asset-card"]')).toHaveCount(1);

  // Detail öffnen — noch keine Referenz verknüpft.
  await page.click('[data-testid="asset-card"]');
  const assetDetail = page.locator('[data-testid="asset-detail"]');
  await expect(assetDetail).toBeVisible();
  await expect(assetDetail).toContainText('Noch keine Referenz verknüpft');

  // Picker öffnen, nach Villa Savoye suchen, verknüpfen.
  await page.click('[data-testid="asset-ref-verknuepfen"]');
  await expect(page.locator('[data-testid="asset-ref-picker"]')).toBeVisible();
  await page.fill('[data-testid="asset-ref-picker-suche"]', 'Villa Savoye');
  await page.click('[data-testid="asset-ref-treffer-villa-savoye"]');
  await expect(page.locator('[data-testid="meldung-erfolg"]').last()).toContainText('verknüpft');

  // Die Verknüpfung steht jetzt im Asset-Dossier.
  await expect(page.locator('[data-testid="asset-refs"]')).toContainText('villa-savoye');
  await expect(page.locator('[data-testid="asset-ref-oeffnen-villa-savoye"]')).toBeVisible();

  // Rückrichtung: im KosmoData-Dossier von Villa Savoye erscheint das Asset.
  // Erst zurück zur Zentrale (die Modul-Kacheln sind nur dort sichtbar).
  await page.getByLabel('Zur Zentrale').click();
  await page.click('[data-testid="module-data"]');
  await page.waitForSelector('[data-testid="ref-card"]');
  await page.fill('[data-testid="data-search"]', 'Villa Savoye');
  await expect(page.locator('[data-testid="ref-card"]')).toHaveCount(1);
  await page.click('[data-testid="ref-card"]');
  const dossier = page.locator('[data-testid="ref-detail-dossier"]');
  await expect(dossier).toBeVisible();
  const refAssets = page.locator('[data-testid="ref-assets"]');
  await expect(refAssets).toBeVisible();
  await expect(refAssets).toContainText('sessel');
  await expect(refAssets).not.toContainText('Noch keine Assets verknüpft');

  // Klick auf das Asset springt zurück nach KosmoAsset und wählt es vor.
  await refAssets.locator('[data-testid^="ref-asset-"]').first().click();
  await expect(page.locator('[data-testid="asset-detail"]')).toBeVisible();
  await expect(page.locator('[data-testid="asset-detail"]')).toContainText('sessel');

  // Verknüpfung wieder entfernen — verschwindet aus dem Dossier.
  await page.click('[data-testid="asset-ref-entfernen-villa-savoye"]');
  await expect(page.locator('[data-testid="meldung-erfolg"]').last()).toContainText('entfernt');
  await expect(page.locator('[data-testid="asset-detail"]')).toContainText('Noch keine Referenz verknüpft');
  await expect(page.locator('[data-testid="asset-refs"]')).toHaveCount(0);

  await page.screenshot({ path: 'e2e-results/ref-asset-verknuepfung.png' });
});
