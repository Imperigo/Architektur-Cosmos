import { readFileSync } from 'node:fs';
import path from 'node:path';
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
 * K2-Härtung (v0.7.0 Stream 3B): die alte Fixture war eine GLB mit LEERER
 * Szene (`scenes: [{ nodes: [] }]`) — sie bewies nur, dass der GLTFLoader
 * ohne Fehler durchläuft, NICHT dass wirklich Geometrie ankommt (das
 * benannte ROADMAP-144-Restrisiko). `e2e/fixtures/dreieck.glb` ist eine
 * ECHTE, binäre GLB (glTF-2.0-Header + JSON- + BIN-Chunk, von der
 * mitgelieferten `three`-`GLTFLoader` selbst gegengeprüft beim Erzeugen,
 * s. Kommentar in der Datei-Historie) mit einem einzelnen Dreieck-Mesh (3
 * Vertices). Der Beweis-Anker ist ehrlich: `window.__kosmoViewport.
 * glbMeshCount()` (Viewport3D.tsx) traversiert das WIRKLICH über `syncGlb()`
 * geladene `glbGroup` (das GLTFLoader-Ergebnis) und zählt seine Meshes —
 * kein Fake-Zähler, 0 ohne geladenes GLB.
 */
const DREIECK_GLB = readFileSync(path.join(__dirname, 'fixtures', 'dreieck.glb'));

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
  await chooser.setFiles({ name: 'studienmodell.glb', mimeType: 'model/gltf-binary', buffer: DREIECK_GLB });
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

  // 5) DER echte Beweis (ROADMAP-144-Restrisiko): nicht nur die Toast-Meldung,
  //    sondern das tatsächlich in der Three.js-Szene ankommende Dreieck-Mesh.
  //    `glbMeshCount()` zählt live im geladenen `glbGroup` — ohne echtes GLB
  //    (oder bei einer leeren Szene wie der alten Fixture) bliebe das 0.
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __kosmoViewport?: { glbMeshCount?: () => number } }).__kosmoViewport?.glbMeshCount?.() ?? -1), {
      timeout: 5_000,
    })
    .toBe(1);

  await page.screenshot({ path: 'e2e-results/ref3d-laden.png' });
});
