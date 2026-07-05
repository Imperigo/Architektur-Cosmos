import { expect, test } from '@playwright/test';

/**
 * D4 (Serie D, KosmoData-Dach) — der Gedächtnis-Tab: die Memory-Timeline des
 * gesamten Lernjournals (`@kosmo/ai` `LearningJournal`, dasselbe Journal wie
 * KosmoTrain/D3) als erstklassige, pflegbare Sammlung. Einträge OHNE Notiz
 * sind roh; ein Eintrag MIT Notiz gilt als kuratiert (→ Training, D3-Achse).
 * Sichtbarkeit ist umschaltbar, ein roher Eintrag kann per Notiz zu Training
 * befördert werden, und pro Eintrag lässt sich verwandtes Wissen nachladen.
 */

test('KosmoData-Gedächtnis: Timeline zeigt Journal-Einträge, Sichtbarkeit umschaltbar, Beförderung zu Training kuratiert', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem(
      'kosmo.lernjournal',
      JSON.stringify([
        { ts: '2026-07-01T08:00:00.000Z', sentiment: 'gut', context: 'D4-Test Erstbezug Fensterbank sauber gelöst' },
        {
          ts: '2026-07-02T09:00:00.000Z',
          sentiment: 'schlecht',
          context: 'D4-Test Wand ohne Aufbau vorgeschlagen',
          note: 'nie Wände ohne Aufbau vorschlagen',
        },
      ]),
    );
  });
  await page.reload();

  await page.click('[data-testid="module-data"]');
  await page.click('[data-testid="tab-gedaechtnis"]');

  const tab = page.locator('[data-testid="kosmodata-gedaechtnis"]');
  await expect(tab).toBeVisible();

  // Beide Journal-Einträge erscheinen als Timeline-Zeilen (neueste zuerst).
  const zeilen = page.locator('[data-testid="gedaechtnis-eintrag"]');
  await expect(zeilen).toHaveCount(2);
  await expect(zeilen.first()).toContainText('Wand ohne Aufbau');

  const roherEintrag = zeilen.filter({ hasText: 'Erstbezug Fensterbank' });
  const kuratierterEintrag = zeilen.filter({ hasText: 'Wand ohne Aufbau' });

  // Der Eintrag mit gesetzter Notiz gilt bereits als kuratiert (→ Training).
  await expect(kuratierterEintrag.locator('[data-testid="gedaechtnis-kuratiert"]')).toBeVisible();
  // Der rohe Eintrag zeigt (noch) keine Kuratiert-Markierung.
  await expect(roherEintrag.locator('[data-testid="gedaechtnis-kuratiert"]')).toHaveCount(0);

  // Sichtbarkeit: Alteinträge ohne das Feld gelten als 'private' (Default).
  await expect(roherEintrag).toContainText('Privat');
  await roherEintrag.locator('[data-testid="gedaechtnis-visibility-toggle"]').click();
  await expect(roherEintrag).toContainText('Öffentlich');
  // Zurückschalten funktioniert ebenso (kein Einbahnweg).
  await roherEintrag.locator('[data-testid="gedaechtnis-visibility-toggle"]').click();
  await expect(roherEintrag).toContainText('Privat');

  // Filter: nur «Kuratiert» zeigt genau den Eintrag mit Notiz.
  await page.click('[data-testid="gedaechtnis-filter-kuration-kuratiert"]');
  await expect(zeilen).toHaveCount(1);
  await expect(zeilen.first()).toContainText('Wand ohne Aufbau');
  await page.click('[data-testid="gedaechtnis-filter-kuration-alle"]');
  await expect(zeilen).toHaveCount(2);

  // Verwandtes Wissen (on-demand BM25-Suche über den Kontext) — defensiv:
  // kein Absturz, egal ob ein Treffer da ist oder nicht.
  await roherEintrag.locator('[data-testid="gedaechtnis-verwandtes-wissen"]').click();
  await expect(roherEintrag.locator('[data-testid="gedaechtnis-wissen-treffer"]')).toBeVisible();

  // Zu Training befördern: der rohe Eintrag bekommt eine Notiz und wird
  // dadurch zu Training (dieselbe Achse wie KosmoTrain/D3 — Notiz gesetzt).
  await roherEintrag.locator('[data-testid="gedaechtnis-befördern"]').click();
  const notizfeld = roherEintrag.locator('[data-testid="gedaechtnis-befördern-notiz"]');
  await expect(notizfeld).toBeVisible();
  await notizfeld.fill('Fensterbank-Detail als Bürostandard übernehmen');
  await notizfeld.press('Enter');

  await expect(page.locator('[data-testid="meldung-erfolg"]')).toBeVisible();
  await expect(roherEintrag.locator('[data-testid="gedaechtnis-kuratiert"]')).toBeVisible();

  await page.screenshot({ path: 'e2e-results/kosmodata-gedaechtnis.png' });
});
