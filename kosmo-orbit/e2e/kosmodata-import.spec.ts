import { expect, test, type Page } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * v0.8.3/P9 (`docs/V083-SPEZ.md` §6.5/E6e, §12.1 C-5) — Import eigener
 * Referenzen als JSON im Referenzen-Tab.
 *
 * Deckt:
 *  - Datei-Auswahl + Schema-Validierung mit ehrlicher, zeilengenauer
 *    Fehlermeldung (eine kaputte Zeile hindert die gültigen NICHT am Import).
 *  - Merge mit dem 112er-Seed: 112+N-Mengen-Beweis über den Tab-Zähler
 *    (`referenzen-zaehler`) UND die tatsächliche `ref-card`-Anzahl.
 *  - Kollisions-Guard: eine id, die bereits im Seed steht, wird abgelehnt,
 *    nicht still überschrieben.
 *  - Sichtbare «eigene»-Kennzeichnung im Dossier (`ref-eigen-badge`) — der
 *    Seed selbst trägt sie nie.
 *  - Entfernen-Weg (Bestätigungsdialog, dann weg — der Seed bleibt unberührt).
 *  - Persistenz über einen Reload hinweg (IndexedDB, Laufzeit ≠ Modell —
 *    kein Yjs/Doc-Eintrag).
 */

async function oeffneReferenzenTab(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-data"]');
  await page.waitForSelector('[data-testid="ref-card"]');
}

function schreibeJson(inhalt: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), 'kosmo-ref-import-e2e-'));
  const pfad = join(dir, 'import.json');
  writeFileSync(pfad, JSON.stringify(inhalt, null, 2));
  return pfad;
}

test('P9: eigene Referenzen importieren — Merge (112+N), ehrliche Zeilenfehler, Kollisions-Guard, «eigene»-Kennzeichnung, Entfernen, Persistenz', async ({ page }) => {
  await oeffneReferenzenTab(page);

  // Ausgangslage: exakt der 112er-Seed, Zähler bestätigt es.
  await expect(page.locator('[data-testid="ref-card"]')).toHaveCount(112);
  await expect(page.locator('[data-testid="referenzen-zaehler"]')).toContainText('112 von 112 Referenzen');

  // 1) Ein Batch mit EINER kaputten Zeile (keine id) neben zwei gültigen —
  //    die gültigen werden übernommen, die kaputte trägt eine ehrliche,
  //    zeilengenaue Fehlermeldung, KEINE stillschweigende Verwerfung.
  const gemischterBatch = schreibeJson([
    { id: 'e2e-eigene-villa', title: 'E2E Eigene Villa', city: 'Bern', authors: ['Testautor:in'] },
    { title: 'Kaputte Zeile — keine id' },
    { id: 'e2e-eigenes-museum', title: 'E2E Eigenes Museum', city: 'Basel' },
  ]);
  await page.setInputFiles('[data-testid="ref-import-input"]', gemischterBatch);

  await expect(page.locator('[data-testid="meldung-info"]')).toBeVisible();
  const fehlerPanel = page.locator('[data-testid="ref-import-fehler"]');
  await expect(fehlerPanel).toBeVisible();
  const fehlerZeilen = page.locator('[data-testid="ref-import-fehler-zeile"]');
  await expect(fehlerZeilen).toHaveCount(1);
  await expect(fehlerZeilen.first()).toContainText('Zeile 2');
  await expect(fehlerZeilen.first()).toContainText('id');
  await page.screenshot({ path: 'e2e-results/p9-083-import-fehlerzeile.png' });

  // 112 + 2 gültige Zeilen — der Mengen-Beweis, sowohl im Zähler als auch
  // in der tatsächlichen Karten-Anzahl.
  await expect(page.locator('[data-testid="ref-card"]')).toHaveCount(114);
  await expect(page.locator('[data-testid="referenzen-zaehler"]')).toContainText('114 von 114 Referenzen');

  await page.click('[data-testid="ref-import-fehler-schliessen"]');
  await expect(fehlerPanel).toHaveCount(0);

  // 2) Kollisions-Guard: eine id, die bereits im Seed existiert
  //    (`gobekli-tepe`, erster Eintrag von `kosmodata-seed.json`), wird
  //    ehrlich abgelehnt statt den Seed-Eintrag still zu überschreiben.
  const kollisionsBatch = schreibeJson([{ id: 'gobekli-tepe', title: 'Gefälschtes Duplikat' }]);
  await page.setInputFiles('[data-testid="ref-import-input"]', kollisionsBatch);
  await expect(page.locator('[data-testid="meldung-fehler"]')).toBeVisible();
  await expect(page.locator('[data-testid="ref-import-fehler-zeile"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="ref-import-fehler-zeile"]')).toContainText('existiert bereits');
  // Kein Duplikat entstanden — weiterhin exakt 114, nicht 115.
  await expect(page.locator('[data-testid="ref-card"]')).toHaveCount(114);

  // 3) Sichtbare «eigene»-Kennzeichnung im Dossier — der Seed selbst zeigt
  //    den Chip nie.
  await page.fill('[data-testid="data-search"]', 'E2E Eigene Villa');
  await expect(page.locator('[data-testid="ref-card"]')).toHaveCount(1);
  await page.click('[data-testid="ref-card"]');
  await expect(page.locator('[data-testid="ref-detail-dossier"]')).toBeVisible();
  await expect(page.locator('[data-testid="ref-eigen-badge"]')).toBeVisible();
  await expect(page.locator('[data-testid="ref-eigen-badge"]')).toContainText('Eigene Referenz');
  const entfernenKnopf = page.locator('[data-testid="ref-eigen-entfernen"]');
  await expect(entfernenKnopf).toBeVisible();
  await page.screenshot({ path: 'e2e-results/p9-083-eigene-referenz-dossier.png' });

  await page.fill('[data-testid="data-search"]', '');
  await page.fill('[data-testid="data-search"]', 'Pantheon');
  await expect(page.locator('[data-testid="ref-card"]')).toHaveCount(1);
  await page.click('[data-testid="ref-card"]');
  await expect(page.locator('[data-testid="ref-eigen-badge"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="ref-eigen-entfernen"]')).toHaveCount(0);

  // 4) Persistenz über einen Reload — IndexedDB, kein Yjs/Doc-Eintrag
  //    (Laufzeit ≠ Modell). Beide eigenen Referenzen überleben den Reload.
  await page.reload();
  await page.click('[data-testid="module-data"]');
  await page.waitForSelector('[data-testid="ref-card"]');
  await expect(page.locator('[data-testid="ref-card"]')).toHaveCount(114);
  await page.fill('[data-testid="data-search"]', 'E2E Eigenes Museum');
  await expect(page.locator('[data-testid="ref-card"]')).toHaveCount(1);

  // 5) Entfernen-Weg: Bestätigungsdialog, dann weg — der Seed bleibt
  //    unberührt (112 Seed-Karten weiterhin auffindbar, hier stellvertretend
  //    Pantheon).
  await page.click('[data-testid="ref-card"]');
  await page.click('[data-testid="ref-eigen-entfernen"]');
  const dialog = page.locator('[data-testid="bestaetigung"]');
  await expect(dialog).toBeVisible();
  await page.click('[data-testid="bestaetigung-ja"]');
  await expect(page.locator('[data-testid="meldung-info"]')).toBeVisible();
  await expect(page.locator('[data-testid="ref-detail-dossier"]')).toHaveCount(0);

  await page.fill('[data-testid="data-search"]', '');
  await expect(page.locator('[data-testid="ref-card"]')).toHaveCount(113);
  await expect(page.locator('[data-testid="referenzen-zaehler"]')).toContainText('113 von 113 Referenzen');

  await page.screenshot({ path: 'e2e-results/p9-083-kosmodata-import.png' });
});
