import { expect, test } from '@playwright/test';

/**
 * Batch 4 der Codex-Übernahme: die KosmoAsset-Objekt-Bibliothek hebt sich auf
 * das UX-Niveau von KosmoData — Suche, Facetten (asset_type), Sammlung
 * (Stern + localStorage) und ein Detail-Aside mit dem reichen Manifest aus
 * Batch 3 (Formate, Rechte, Sichtbarkeit). Diese Spec prüft die neue UI ohne
 * die bestehenden P3-Selektoren (`glb-karte`, `glb-ins-modell`, `glb-import`)
 * anzutasten — die laufen weiter in `p3.spec.ts`.
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

test('KosmoAsset: leere Bibliothek zeigt Suche, Facettenzeile und Bauzeichnungs-Leerzustand', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();

  await page.click('[data-testid="module-asset"]');
  await page.click('[data-testid="tab-objekte"]');

  await expect(page.locator('[data-testid="asset-search"]')).toBeVisible();
  await expect(page.locator('[data-testid="asset-sammlung"]')).toBeVisible();
  await expect(page.locator('[data-testid="asset-sammlung"]')).toContainText('Sammlung (0)');
  // Noch keine Objekte importiert → Bauzeichnungs-Messrahmen, keine Facetten.
  await expect(page.locator('[data-testid^="asset-facet-"]')).toHaveCount(0);
  await expect(page.getByText('Noch keine Objekte')).toBeVisible();
});

test('KosmoAsset: Objekt-Bibliothek — Suche, Facette, Sammlung und Detail-Aside', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.click('[data-testid="module-asset"]');
  await page.click('[data-testid="tab-objekte"]');

  // GLB importieren — bekannter Weg aus p3.spec.ts.
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('[data-testid="glb-import"]'),
  ]);
  await chooser.setFiles({ name: 'baum.glb', mimeType: 'model/gltf-binary', buffer: miniGlb() });
  await expect(page.locator('[data-testid="asset-card"]')).toHaveCount(1);

  // Facette: glb_model erscheint dynamisch gezählt (genau 1 Objekt).
  const facet = page.locator('[data-testid="asset-facet-glb_model"]');
  await expect(facet).toBeVisible();
  await expect(facet).toContainText('1');

  // Suche schärft auf den Dateinamen ein, ein Fantasiebegriff filtert alles weg.
  await page.fill('[data-testid="asset-search"]', 'baum');
  await expect(page.locator('[data-testid="asset-card"]')).toHaveCount(1);
  await page.fill('[data-testid="asset-search"]', 'kein-treffer-xyz');
  await expect(page.locator('[data-testid="asset-card"]')).toHaveCount(0);
  await expect(page.getByText('Kein Objekt passt zur Suche')).toBeVisible();
  await page.fill('[data-testid="asset-search"]', '');

  // Facette wählen → aktiv, Karte bleibt (einziges Objekt ist glb_model).
  await facet.click();
  await expect(page.locator('[data-testid="asset-card"]')).toHaveCount(1);
  await facet.click(); // wieder lösen

  // Sammlung: Stern setzen, Sammlung-Filter zeigt genau dieses Objekt.
  const stern = page.locator('[data-testid^="asset-stern-"]').first();
  await stern.click();
  await expect(page.locator('[data-testid="asset-sammlung"]')).toContainText('Sammlung (1)');
  await page.click('[data-testid="asset-sammlung"]');
  await expect(page.locator('[data-testid="asset-card"]')).toHaveCount(1);
  await page.click('[data-testid="asset-sammlung"]'); // Filter wieder lösen

  // Detail-Aside: Titel, Typ/Kategorie, Formate, Rechte, Sichtbarkeit.
  await page.click('[data-testid="asset-card"]');
  const dossier = page.locator('[data-testid="asset-detail"]');
  await expect(dossier).toBeVisible();
  await expect(dossier).toContainText('baum');

  const visibility = page.locator('[data-testid="asset-visibility"]');
  await expect(visibility).toBeVisible();
  await expect(visibility).toContainText('Privat'); // speichereGlb() setzt visibility: 'private'

  const formats = page.locator('[data-testid="asset-formats"]');
  await expect(formats).toBeVisible();
  await expect(formats).toContainText('GLB');
  await expect(formats).toContainText('Bereit');

  const rights = page.locator('[data-testid="asset-rights"]');
  await expect(rights).toBeVisible();
  await expect(rights).toContainText('Generiert — Prüfung nötig');
  await expect(rights).toContainText('Nicht erlaubt');

  // 3D-Vorschau im Dossier ist dieselbe GlbVorschau wie auf der Karte.
  await expect(dossier.locator('canvas')).toHaveCount(1);

  // «Ins Modell» funktioniert weiterhin aus dem Dossier heraus.
  await page.click('[data-testid="asset-detail-ins-modell"]');
  await expect(page.locator('[data-testid="meldung-erfolg"]').last()).toContainText('Referenz-Kontext');

  await page.screenshot({ path: 'e2e-results/kosmoasset-bibliothek.png' });
});
