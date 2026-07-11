import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * Ref-3D-Remote-Kaskade (v0.7.1 E4, docs/V071-KONZEPT.md): fehlt eine lokal
 * per KosmoAsset verknüpfte GLB, aber der Referenz-Eintrag trägt ein
 * model_asset mit `r2_key` (Master-Datenmodell, `packages/kosmo-data/src/
 * reference.ts`), bietet das Dossier einen Remote-Ladeversuch an
 * (`modellUrlAusR2Key` → fetch → Blob → derselbe glb-guard/setGlbContext-Pfad
 * wie beim lokalen Asset, s. `ref3d-laden.spec.ts`). «Villa Savoye» trägt im
 * Seed bereits mehrere model_assets (u.a. `entries/villa-savoye/models/
 * mass.glb`) — OHNE dass hier ein lokales Asset verknüpft wird, damit
 * garantiert der Remote-Pfad (nicht der lokale) gefahren wird.
 *
 * Fixture: `e2e/fixtures/dreieck.glb` (echtes Ein-Dreieck-Mesh, s.
 * Kommentar in ref3d-laden.spec.ts) — derselbe Beweis-Anker
 * `window.__kosmoViewport.glbMeshCount()`.
 */
const DREIECK_GLB = readFileSync(path.join(__dirname, 'fixtures', 'dreieck.glb'));

test('Referenz-3D-Remote (E4): kein lokales Asset, aber r2_key → fetch/Guard/GLTFLoader bis zur Erfolgsmeldung', async ({
  page,
}) => {
  await page.route('https://archiv.architekturkosmos.ch/**', (route) =>
    route.fulfill({ status: 200, contentType: 'model/gltf-binary', body: DREIECK_GLB }),
  );

  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();

  await page.click('[data-testid="module-data"]');
  await page.waitForSelector('[data-testid="ref-card"]');
  await page.fill('[data-testid="data-search"]', 'Villa Savoye');
  await expect(page.locator('[data-testid="ref-card"]')).toHaveCount(1);
  await page.click('[data-testid="ref-card"]');
  await expect(page.locator('[data-testid="ref-detail-dossier"]')).toBeVisible();

  // Kein lokales Asset verknüpft → der lokale Knopf existiert nicht, dafür
  // der neue Remote-Knopf (der «kein-lokal»-Hinweis bleibt dokumentiert
  // ohnehin sichtbar daneben stehen, s. DataWorkspace.tsx-Kommentar).
  await expect(page.locator('[data-testid="ref3d-laden"]')).toHaveCount(0);
  const remoteKnopf = page.locator('[data-testid="ref3d-laden-remote"]');
  await expect(remoteKnopf).toBeVisible();

  await remoteKnopf.click();
  await expect(page.locator('[data-testid="meldung-erfolg"]').last()).toContainText(
    'Referenz-Kontext im Design-Viewport',
    { timeout: 25_000 },
  );

  // Derselbe ehrliche Beweis-Anker wie beim lokalen Pfad: das tatsächlich in
  // der Three.js-Szene ankommende Dreieck-Mesh (nicht nur die Toast-Meldung).
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __kosmoViewport?: { glbMeshCount?: () => number } }).__kosmoViewport?.glbMeshCount?.() ?? -1), {
      timeout: 5_000,
    })
    .toBe(1);

  await page.screenshot({ path: 'e2e-results/ref3d-remote-erfolg.png' });
});

test('Referenz-3D-Remote (E4): 404 vom Archiv → ehrliche «nicht erreichbar»-Meldung statt stillem Fehlschlag', async ({
  page,
}) => {
  await page.route('https://archiv.architekturkosmos.ch/**', (route) => route.fulfill({ status: 404 }));

  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();

  await page.click('[data-testid="module-data"]');
  await page.waitForSelector('[data-testid="ref-card"]');
  await page.fill('[data-testid="data-search"]', 'Villa Savoye');
  await expect(page.locator('[data-testid="ref-card"]')).toHaveCount(1);
  await page.click('[data-testid="ref-card"]');
  await expect(page.locator('[data-testid="ref-detail-dossier"]')).toBeVisible();

  const remoteKnopf = page.locator('[data-testid="ref3d-laden-remote"]');
  await expect(remoteKnopf).toBeVisible();
  await remoteKnopf.click();

  await expect(page.locator('[data-testid="meldung-fehler"]').last()).toContainText(
    'Remote-Modell nicht erreichbar',
    { timeout: 25_000 },
  );

  // Ehrlich: der «kein-lokal»-Hinweis bleibt stehen — nichts wird vorgetäuscht.
  await expect(page.locator('[data-testid="ref3d-kein-lokal"]')).toBeVisible();
  // Kein Fake-Erfolg: der Design-Viewport (erst jetzt geöffnet, da ein
  // Fehlschlag NICHT wie ladeRef3d automatisch dorthin springt) zeigt kein
  // GLB-Mesh.
  await page.getByLabel('Zur Zentrale').click();
  await page.click('[data-testid="module-design"]');
  await expect(page.locator('[data-testid="planview"]')).toBeVisible({ timeout: 15_000 });
  expect(
    await page.evaluate(() => (window as unknown as { __kosmoViewport?: { glbMeshCount?: () => number } }).__kosmoViewport?.glbMeshCount?.() ?? -1),
  ).toBe(0);

  await page.screenshot({ path: 'e2e-results/ref3d-remote-fehler.png' });
});
