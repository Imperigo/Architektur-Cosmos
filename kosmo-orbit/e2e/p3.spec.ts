import { expect, test } from '@playwright/test';

/**
 * V1-Finish P3: KosmoDev-Auftragsbuch (erfassen → Buch → Workorder-Export)
 * und KosmoAsset (Bauteil übernehmen, GLB-Bibliothek).
 */

/** Minimal gültiges GLB: nur ein JSON-Chunk mit leerer Szene. */
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

test('Auftragsbuch: ⚑ im Kosmo-Panel + Erfassen in KosmoDev → Workorder-Export', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    // Interner Fix (K11): Panel-Default ist jetzt zu (Symbol zuerst) — dieser
    // Test spricht kosmo-input direkt an; ein reload() ist nötig, damit das
    // Flag VOR dem ersten Mount gilt (sonst lädt useState den alten Stand).
    localStorage.setItem('kosmo.panelOffen', '1');
  });
  await page.reload();

  // ⚑ im Kosmo-Panel: Eingabetext wird zum Auftrag (Station = Zentrale)
  await page.fill('[data-testid="kosmo-input"]', 'Die Kacheln sollen ihre Kurzbefehl-Ziffer zeigen');
  await page.click('[data-testid="kosmo-flagge"]');
  await expect(page.locator('[data-testid="meldung-erfolg"]')).toContainText('Auftrag im KosmoDev-Buch');

  // KosmoDev: Auftrag steht im Buch, zweiter kommt direkt dazu.
  // P-F2 (v0.9.2): «Dev» ist keine Zentrale-Kachel mehr — der frühere
  // Direktklick lief über die entfallene «Kosmo»-Fächer-Kachel. Das Panel
  // ist hier noch offen (s. `kosmo.panelOffen` oben) — der Kosmo-Orb
  // rendert erst, sobald es zu ist (`App.tsx`, `!kosmoOpen`-Guard); Panel
  // schliessen, dann über den Orb-Rechtsklick navigieren (`module-dev`
  // bleibt dieselbe Testid).
  await page.click('[aria-label="Schliessen"]');
  await page.click('[data-testid="kosmo-symbol"]', { button: 'right' });
  await page.click('[data-testid="module-dev"]');
  await expect(page.locator('[data-testid="auftrag-karte"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="auftrag-karte"]').first()).toContainText('Kurzbefehl-Ziffer');
  await expect(page.locator('[data-testid="auftrag-karte"]').first()).toContainText('Zentrale');
  await page.fill('[data-testid="auftrag-text"]', 'Export-Knopf auch im Blatteditor anbieten');
  await page.click('[data-testid="auftrag-erfassen"]');
  await expect(page.locator('[data-testid="auftrag-karte"]')).toHaveCount(2);

  // Workorder-Export lädt die .md und stellt die Aufträge auf «an-worker»
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="workorder-export"]'),
  ]);
  expect(download.suggestedFilename()).toMatch(/^\d{4}-\d{2}-\d{2}\.md$/);
  await expect(page.locator('[data-testid="auftrag-karte"]').first()).toContainText('an-worker');
  await page.screenshot({ path: 'e2e-results/p3-auftragsbuch.png' });
});

test('KosmoAsset: Bauteil übernehmen wird Projekt-Aufbau, GLB landet in der Bibliothek', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.click('[data-testid="module-asset"]');

  // CH-Bauteil übernehmen → Aufbau im Projekt
  await page.click('[data-testid="asset-tab-bauteile"]');
  const vorher = await page.evaluate(
    () => (window.__kosmo as { state: () => { doc: { byKind: (k: string) => unknown[] } } }).state().doc.byKind('assembly').length,
  );
  await page.locator('[data-testid^="uebernehmen-"]').first().click();
  const nachher = await page.evaluate(
    () => (window.__kosmo as { state: () => { doc: { byKind: (k: string) => unknown[] } } }).state().doc.byKind('assembly').length,
  );
  expect(nachher).toBe(vorher + 1);

  // GLB importieren → Karte in der Bibliothek, «Ins Modell» meldet Erfolg
  await page.click('[data-testid="tab-objekte"]');
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('[data-testid="glb-import"]'),
  ]);
  await chooser.setFiles({ name: 'baum.glb', mimeType: 'model/gltf-binary', buffer: miniGlb() });
  const karte = page.locator('[data-testid="glb-karte"]');
  await expect(karte).toHaveCount(1);
  await expect(karte).toContainText('baum');
  await karte.locator('[data-testid="glb-ins-modell"]').click();
  await expect(page.locator('[data-testid="meldung-erfolg"]').last()).toContainText('Referenz-Kontext');
  await page.screenshot({ path: 'e2e-results/p3-asset.png' });
});
