import { expect, test } from '@playwright/test';

/**
 * Batch 2 der Codex-Übernahme: das KosmoData-Detail-Dossier zeigt die reichen
 * Felder aus dem Master-Referenzmodell (`packages/kosmo-data/src/reference.ts`,
 * Batch 1) — Medien-Galerie, Analyse-Ebenen, Geo-Koordinaten, Materialprofil,
 * Datenbankstatus und Sichtbarkeit. Reiner Offline-Seed, keine Helferserver
 * (kein Bridge/Sync) nötig.
 */

test('KosmoData-Dossier: Villa Savoye zeigt Medien, Analyse-Ebenen, Geo und Sichtbarkeit', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();

  await page.click('[data-testid="module-data"]');
  await page.waitForSelector('[data-testid="ref-card"]');

  // Suche schärft auf genau die eine bekannte, reich befüllte Referenz ein.
  await page.fill('[data-testid="data-search"]', 'Villa Savoye');
  await expect(page.locator('[data-testid="ref-card"]')).toHaveCount(1);
  await page.click('[data-testid="ref-card"]');

  const dossier = page.locator('[data-testid="ref-detail-dossier"]');
  await expect(dossier).toBeVisible();
  await expect(dossier).toContainText('Villa Savoye');
  await expect(dossier).toContainText('Le Corbusier');
  // full_description (Fliesstext) ist deutlich länger als die alte Kurzbeschreibung.
  await expect(dossier).toContainText('Promenade architecturale');

  // Sichtbarkeit — Villa Savoye ist im Seed als "public" markiert.
  const visibility = page.locator('[data-testid="ref-visibility"]');
  await expect(visibility).toBeVisible();
  await expect(visibility).toContainText('Öffentlich');

  // Medien-Galerie: 4 Slots (exterior/interior/section/plan) aus media[].
  const media = page.locator('[data-testid="ref-media"]');
  await expect(media).toBeVisible();
  await expect(media.locator('img')).toHaveCount(2); // exterior + interior haben eine URL
  await expect(media).toContainText('Schnitt'); // section ohne URL → Platzhalterkachel mit Typ-Label
  await expect(media).toContainText('Plan');

  // Analyse-Ebenen: analysis_type + summary + Prüfstatus-Chip.
  const analyse = page.locator('[data-testid="ref-analyse"]');
  await expect(analyse).toBeVisible();
  await expect(analyse).toContainText('Tragwerk'); // structure
  await expect(analyse).toContainText('Geprüft'); // review_status: reviewed

  // Geo: Koordinaten + Region als Text (kein Karten-Widget).
  const geo = page.locator('[data-testid="ref-geo"]');
  await expect(geo).toBeVisible();
  await expect(geo).toContainText('48.9243');
  await expect(geo).toContainText('Ile-de-France');

  // has_3d: true, aber ohne lokal verknüpftes 3D-Objekt zeigt das Dossier seit
  // T4c den ehrlichen Hinweis statt eines Lade-Knopfes, der ins Leere lief.
  await expect(page.locator('[data-testid="ref3d-kein-lokal"]')).toBeVisible();

  await page.screenshot({ path: 'e2e-results/kosmodata-dossier.png' });
});
