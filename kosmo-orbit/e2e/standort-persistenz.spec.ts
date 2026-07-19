import { expect, test } from '@playwright/test';

/**
 * v0.8.6 PC1 (`docs/V086-SPEZ.md` E6/D7/C-17) — Standort-Persistenz:
 * StandortSuche (Standort-Panel, `sonne-toggle`) schreibt nach einem
 * gewählten geo.admin-Treffer zusätzlich `design.standortAdresseSetzen`
 * (SettingsPatch, `DocSettings.standortAdresse`) — überlebt Reload/`project-
 * vault`-Autosave, KosmoData zeigt LV95+Adresse, Undo entfernt ihn wieder.
 *
 * Fixture-Muster: `e2e/nachbarn-import.spec.ts:36-60` (page.route-Mock auf
 * api3.geo.admin.ch SearchServer, KEIN echtes Netz). Persistenz-Muster:
 * `e2e/companion.spec.ts` («Autosave, project-vault.ts#initVault() restauriert
 * einen Autosave-Stand nur, wenn er mindestens eine Entity trägt — Design
 * öffnen bootstrappt EG/OG zuerst, dann 1200ms Debounce abwarten»).
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => unknown;
      state: () => {
        doc: {
          settings: {
            standortAdresse: { adresse: string; lv95: { e: number; n: number }; quelle: string; abgerufenAm: string } | null;
          };
        };
        undo: () => void;
      };
      open: (s: string) => void;
    };
  }
}

test('Standort-Persistenz (E6/D7/C-17): StandortSuche schreibt standortAdresse, überlebt Reload, KosmoData zeigt ihn, Ctrl+Z entfernt ihn', async ({
  page,
}) => {
  await page.route('**/rest/services/api/SearchServer**', (route) =>
    route.fulfill({
      json: {
        results: [
          { attrs: { label: '<b>Musterstrasse 1 Zug</b>', lat: 47.17, lon: 8.52, y: 2681500, x: 1224500 } },
        ],
      },
    }),
  );

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.panelOffen', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();

  // Design öffnen (bootstrappt EG/OG — project-vault.ts#initVault() restauriert
  // einen Autosave-Stand nur, wenn er mindestens EINE Entity trägt, s.
  // Kopfkommentar) UND das Standort-Panel öffnen.
  await page.click('[data-testid="module-design"]');
  await expect(page.locator('[data-testid="viewport3d"]')).toBeVisible();
  await page.click('[data-testid="sonne-toggle"]');

  // Vor der Suche: kein Standort gesetzt (optionales Feld ohne
  // defaultSettings-Eintrag ist `undefined`, nicht `null` — `?? null`
  // normalisiert für den JSON-Bridge-Vergleich).
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.settings.standortAdresse ?? null))
    .toBeNull();

  // Adresse suchen → Treffer wählen.
  await page.fill('[data-testid="standort-suche"]', 'Musterstrasse 1');
  await page.click('[data-testid="standort-suchen"]');
  await expect(page.locator('[data-testid="standort-treffer"] button')).toBeVisible();
  await page.click('[data-testid="standort-treffer"] button');

  // design.standortAdresseSetzen ist gelaufen: LV95 + Adresse + Herkunft +
  // Abrufzeitpunkt im Doc (window.__kosmo.state().doc.settings — SettingsPatch
  // liest sich direkt aus `doc.settings`, wie jedes andere DocSettings-Feld).
  const nachSuche = await page.evaluate(() => window.__kosmo.state().doc.settings.standortAdresse);
  expect(nachSuche).not.toBeNull();
  expect(nachSuche?.adresse).toBe('Musterstrasse 1 Zug');
  expect(nachSuche?.lv95).toEqual({ e: 2681500, n: 1224500 });
  expect(nachSuche?.quelle).toBe('geoadmin');
  expect(() => new Date(nachSuche!.abgerufenAm).toISOString()).not.toThrow();

  // Der Block selbst zeigt den frisch gesetzten Standort (Live-Selektor).
  await expect(page.locator('[data-testid="standort-adresse-aktuell"]')).toContainText('Musterstrasse 1 Zug');

  // Ctrl+Z DIREKT nach dem Setzen entfernt NUR standortAdresse wieder (der
  // Klick auf den Treffer löst zwei unabhängige Commands aus: das
  // BESTEHENDE design.standortSetzen [WGS84/LV95 fürs Sonnenstudien-
  // Fundament] UND das NEUE design.standortAdresseSetzen — je ein eigener
  // Undo-Schritt, ein Ctrl+Z hebt den ZULETZT gelaufenen, also unseren, auf).
  await page.keyboard.press('Control+z');
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.settings.standortAdresse ?? null))
    .toBeNull();
  await expect(page.locator('[data-testid="standort-adresse-aktuell"]')).toHaveCount(0);

  // Redo (nochmals derselbe Weg wie oben, kein eigener Redo-Test gefordert)
  // ist hier nicht nötig — den Standort für die Persistenz-/KosmoData-Prüfung
  // erneut über denselben Treffer setzen (Suche liefert wieder denselben
  // gemockten Treffer).
  await page.click('[data-testid="standort-suchen"]');
  await expect(page.locator('[data-testid="standort-treffer"] button')).toBeVisible();
  await page.click('[data-testid="standort-treffer"] button');
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.settings.standortAdresse?.adresse ?? null))
    .toBe('Musterstrasse 1 Zug');

  // Autosave ist entprellt (project-vault.ts, 1200 ms) — abwarten, dann
  // reload: der Standort muss den Reload überleben (Persistenz-Beweis, D7).
  await page.waitForTimeout(1600);
  await page.reload();

  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.settings.standortAdresse?.adresse ?? null))
    .toBe('Musterstrasse 1 Zug');
  const nachReload = await page.evaluate(() => window.__kosmo.state().doc.settings.standortAdresse);
  expect(nachReload?.lv95).toEqual({ e: 2681500, n: 1224500 });
  expect(nachReload?.quelle).toBe('geoadmin');

  // KosmoData zeigt den Projektstandort (Übersichts-Tab, `data-projekt-
  // standort`) — LV95 + Adresse + Abrufdatum.
  await page.click('[data-testid="module-data"]');
  await page.click('[data-testid="tab-uebersicht"]');
  const standortKarte = page.locator('[data-testid="data-projekt-standort"]');
  await expect(standortKarte).toBeVisible();
  await expect(standortKarte).toContainText('Musterstrasse 1 Zug');
  await expect(standortKarte).toContainText('2681500');
  await expect(standortKarte).toContainText('1224500');
  await expect(page.locator('[data-testid="data-projekt-standort-leer"]')).toHaveCount(0);

  await page.screenshot({ path: 'e2e-results/pc1-086-standort.png' });
});

test('KosmoData zeigt den ehrlichen Leer-Zustand, solange kein Standort gesetzt ist (C-17)', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.panelOffen', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-data"]');
  await page.click('[data-testid="tab-uebersicht"]');
  await expect(page.locator('[data-testid="data-projekt-standort-leer"]')).toBeVisible();
  await expect(page.locator('[data-testid="data-projekt-standort-leer"]')).toContainText('Kein Standort gesetzt');
  await expect(page.locator('[data-testid="data-projekt-standort"]')).toHaveCount(0);
});
