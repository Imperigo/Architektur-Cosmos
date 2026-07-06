import { expect, test } from '@playwright/test';

/**
 * A2a — echter Browser-E2E für den T4c-Referenz-3D-Ladepfad (ROADMAP 144).
 *
 * T4c hatte den «Referenz-3D ins Modell laden»-Knopf so umgebaut, dass er eine
 * per KosmoAsset verknüpfte lokale GLB in den Design-Viewport lädt (three.js
 * GLTFLoader), statt eine tote Remote-URL zu rufen. Bisher war dieser Pfad nur
 * unit-getestet + code-gelesen (ROADMAP 144 «Restrisiko»). Diese Spec fährt den
 * echten Erfolgsweg im Browser: GLB importieren → mit Villa Savoye verknüpfen →
 * im Dossier den (jetzt aktiven) Lade-Knopf klicken → der GLTFLoader lädt die
 * Blob-URL wirklich, das Dossier meldet «Referenz-Kontext im Design-Viewport».
 *
 * Braucht kein Bridge/Sync — reiner Offline-Seed + WebGL (SwiftShader in der
 * Playwright-Config). Gegenstück zu `kosmodata-dossier.spec.ts`, das den
 * ehrlichen «kein-lokal»-Hinweis prüft (Referenz OHNE verknüpftes Asset).
 */

/** Minimal gültiges GLB: nur ein JSON-Chunk mit leerer Szene (wie ref-asset-verknuepfung.spec.ts). */
function miniGlb(): Buffer {
  const json = Buffer.from(
    JSON.stringify({ asset: { version: '2.0' }, scenes: [{ nodes: [] }], scene: 0 }),
    'utf8',
  );
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

test('Referenz-3D laden (T4c): verknüpfte lokale GLB fährt den echten GLTFLoader-Pfad bis zur Erfolgsmeldung', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();

  // 1) GLB importieren und mit Villa Savoye verknüpfen (Weg aus ref-asset-verknuepfung.spec.ts).
  await page.click('[data-testid="module-asset"]');
  await page.click('[data-testid="tab-objekte"]');
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('[data-testid="glb-import"]'),
  ]);
  await chooser.setFiles({ name: 'studienmodell.glb', mimeType: 'model/gltf-binary', buffer: miniGlb() });
  await expect(page.locator('[data-testid="asset-card"]')).toHaveCount(1);
  await page.click('[data-testid="asset-card"]');
  await page.click('[data-testid="asset-ref-verknuepfen"]');
  await page.fill('[data-testid="asset-ref-picker-suche"]', 'Villa Savoye');
  await page.click('[data-testid="asset-ref-treffer-villa-savoye"]');
  await expect(page.locator('[data-testid="meldung-erfolg"]').last()).toContainText('verknüpft');

  // 2) Ins KosmoData-Dossier von Villa Savoye.
  await page.getByLabel('Zur Zentrale').click();
  await page.click('[data-testid="module-data"]');
  await page.waitForSelector('[data-testid="ref-card"]');
  await page.fill('[data-testid="data-search"]', 'Villa Savoye');
  await expect(page.locator('[data-testid="ref-card"]')).toHaveCount(1);
  await page.click('[data-testid="ref-card"]');
  await expect(page.locator('[data-testid="ref-detail-dossier"]')).toBeVisible();

  // 3) Weil jetzt eine lokale GLB verknüpft ist, steht der ECHTE Lade-Knopf da —
  //    nicht der «kein-lokal»-Hinweis (das ist der positive Beweis des T4c-Fixes).
  await expect(page.locator('[data-testid="ref3d-kein-lokal"]')).toHaveCount(0);
  const ladeKnopf = page.locator('[data-testid="ref3d-laden"]');
  await expect(ladeKnopf).toBeVisible();

  // 4) Klick fährt den echten GLTFLoader-Pfad: createObjectURL → setGlbContext →
  //    Design-Viewport lädt die Blob-URL → subscribeGlbStatus meldet 'loaded'.
  //    WebGL-Init + Laden brauchen unter SwiftShader etwas — grosszügiges Timeout.
  await ladeKnopf.click();
  await expect(page.locator('[data-testid="meldung-erfolg"]').last()).toContainText(
    'Referenz-Kontext im Design-Viewport',
    { timeout: 25_000 },
  );

  await page.screenshot({ path: 'e2e-results/ref3d-laden.png' });
});
