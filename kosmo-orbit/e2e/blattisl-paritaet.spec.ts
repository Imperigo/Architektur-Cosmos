import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * 0.8.11 — «BLATT-Insel lernt Umbenennen + Entfernen» (Bauauftrag Bauagent
 * P-A1). Bis hierher konnte die Publish-BLATT-Insel
 * (`apps/kosmo-orbit/src/modules/publish/island/inhalte/blatt.tsx`) Blätter
 * nur wählen/anlegen — Umbenennen und Entfernen existierten ausschliesslich
 * im Manuell-Chrome (`PublishWorkspace.tsx:824-868`, dort bereits gehärtet
 * in `e2e/blatt-umbenennen.spec.ts`). Diese Spec beweist dieselbe Parität
 * für die Insel:
 * - Umbenennen (Klick-zu-Edit, testid `blattisl-name-<index>`) über
 *   `design.eigenschaftSetzen` (`feld:'name'`, Kernel-Weg seit ROADMAP 547) —
 *   inkl. Nachweis im Blattverzeichnis-Export (AUSTAUSCH-Insel, Muster
 *   `e2e/blattverzeichnis.spec.ts`s Insel-Test).
 * - Entfernen (testid `blattisl-entfernen-<index>`) über
 *   `publish.blattEntfernen`, ohne eigenen Bestätigungsdialog — Undo ist der
 *   normale History-Stack (Ctrl+Z, Muster `e2e/blatt-umbenennen.spec.ts`).
 * - Escape bricht den Edit ab (Ref-Guard gegen den Unmount-Blur).
 * - Leerer/Nur-Whitespace-Name wirft im Kernel VOR jedem Patch → sichtbare
 *   Fehlermeldung (`meldung-fehler`), Name unverändert.
 *
 * **Diese Spec setzt den globalen Manuell-Seed selbst ausser Kraft**
 * (`test.use({ storageState: { cookies: [], origins: [] } })`, exakt wie
 * `e2e/blender-bridge.spec.ts`/`e2e/vis-island.spec.ts`/`e2e/publish-
 * island.spec.ts`) — Island ist der echte Produktions-Default, nur ein
 * leerer Kontext beweist ihn ohne den globalen `kosmo.ui.v1`-Manuell-Seed.
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[]; summary: string };
      state: () => {
        doc: {
          byKind: (k: string) => Array<{ id: string; name: string; index: number }>;
        };
      };
    };
  }
}

test.use({ storageState: { cookies: [], origins: [] } });

async function oeffnePublishIsland(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-publish"]');
}

/** Hover statt Klick — dasselbe Muster wie `publish-island.spec.ts`s `oeffneInsel`. */
async function oeffneInsel(page: Page, island: string): Promise<void> {
  await page.hover(`[data-testid="island-${island}-root"]`);
  await expect(page.locator(`[data-testid="island-${island}-leiste"]`)).toBeVisible();
}

/** Öffnet die BLATT-Insel-Stufe2 (Blattliste). */
async function oeffneBlattListe(page: Page): Promise<void> {
  await oeffneInsel(page, 'blatt');
  await page.click('[data-testid="island-werkzeug-blatt"]');
  await expect(page.locator('[data-testid="island-blatt-stufe2"]')).toBeVisible();
}

async function sheetNamenImDoc(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    window.__kosmo
      .state()
      .doc.byKind('sheet')
      .sort((a, b) => a.index - b.index)
      .map((s) => s.name),
  );
}

/** Legt über den Kosmo-Test-Hook ein benanntes Blatt an — reduziert die
 *  Tests auf ihre eigentliche Aussage (Fixture statt UI-Weg, Muster
 *  `e2e/publish-island.spec.ts`s `seedBlatt`). KEIN `page.reload()` danach
 *  — das Projekt-Doc lebt nur im Speicher. */
async function seedBlatt(page: Page, name = 'Blatt 1'): Promise<string> {
  const id = await page.evaluate(
    (n) => window.__kosmo.run('publish.blattErstellen', { name: n, format: 'A1', orientation: 'quer' }).patches[0]!.id,
    name,
  );
  await expect(page.locator('[data-testid="publish-island-buehne"]')).toBeVisible();
  await expect(page.locator('[data-testid="sheet-canvas"]')).toBeVisible();
  return id;
}

test.describe('BLATT-Insel — Umbenennen + Entfernen (Parität zum Manuell-Chrome)', () => {
  test('Umbenennen über die Insel: Eintrag + Doc aktualisiert, Blattverzeichnis-Export zeigt den NEUEN Namen', async ({
    page,
  }) => {
    await oeffnePublishIsland(page);
    const sheetId = await seedBlatt(page, 'Blatt 1');
    await page.evaluate((id) => {
      window.__kosmo.run('publish.setSpeichern', { name: 'Insel-Umbenennen-Set', sheetIds: [id] });
    }, sheetId);

    await oeffneBlattListe(page);
    const feld = page.locator('[data-testid="blattisl-name-0"]');
    await expect(feld).toHaveText(/Blatt 1/);
    await feld.click(); // Klick-zu-Edit: span → KInput (dieselbe testid)
    await feld.fill('Fassadenplan Ost');
    // Gate-Beleg: Screenshot MITTEN im Edit (KInput sichtbar, neuer Wert
    // getippt, vor dem Commit) — Muster `e2e/blatt-umbenennen.spec.ts`.
    await page.screenshot({ path: 'e2e-results/blattisl-umbenennen-edit-offen.png' });
    await feld.press('Enter'); // Enter → blur() → commit via design.eigenschaftSetzen

    await expect(page.locator('[data-testid="blattisl-name-0"]')).toHaveText(/Fassadenplan Ost/);
    expect(await sheetNamenImDoc(page)).toEqual(['Fassadenplan Ost']);

    await oeffneInsel(page, 'austausch');
    await page.click('[data-testid="island-werkzeug-export-hub"]');
    await expect(page.locator('[data-testid="island-export-hub-stufe2"]')).toBeVisible();
    await expect(page.locator('[data-testid="island-pubset-eintrag"]')).toHaveCount(1);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="island-pubset-blattverzeichnis"]'),
    ]);
    const svg = readFileSync((await download.path())!, 'utf8');
    expect(svg).toContain('>Fassadenplan Ost</text>');
    expect(svg).not.toContain('>Blatt 1</text>');
  });

  test('Entfernen über die Insel + Undo bringt das Blatt zurück', async ({ page }) => {
    await oeffnePublishIsland(page);
    await seedBlatt(page, 'Blatt 1');
    await page.evaluate(() => {
      window.__kosmo.run('publish.blattErstellen', { name: 'Blatt 2', format: 'A2', orientation: 'hoch' });
    });

    await oeffneBlattListe(page);
    await expect(page.locator('[data-testid="island-blatt-eintrag-0"]')).toBeVisible();
    await expect(page.locator('[data-testid="island-blatt-eintrag-1"]')).toBeVisible();
    expect(await sheetNamenImDoc(page)).toEqual(['Blatt 1', 'Blatt 2']);

    // Gate-Beleg: der Entfernen-Knopf, sichtbar in der Liste.
    await page.screenshot({ path: 'e2e-results/blattisl-entfernen-knopf.png' });

    await page.click('[data-testid="blattisl-entfernen-1"]');
    await expect(page.locator('[data-testid="island-blatt-eintrag-1"]')).toHaveCount(0);
    expect(await sheetNamenImDoc(page)).toEqual(['Blatt 1']);

    await page.keyboard.press('Control+z');

    await expect(page.locator('[data-testid="island-blatt-eintrag-1"]')).toBeVisible();
    expect(await sheetNamenImDoc(page)).toEqual(['Blatt 1', 'Blatt 2']);
  });

  test('Escape bricht den Edit ab — kein Commit, Name unverändert', async ({ page }) => {
    await oeffnePublishIsland(page);
    await seedBlatt(page, 'Blatt 1');

    await oeffneBlattListe(page);
    const feld = page.locator('[data-testid="blattisl-name-0"]');
    await feld.click();
    await feld.fill('Sollte nie ankommen');
    await feld.press('Escape');

    await expect(page.locator('[data-testid="blattisl-name-0"]')).toHaveText(/Blatt 1/);
    expect(await sheetNamenImDoc(page)).toEqual(['Blatt 1']);
  });

  test('leerer Name → sichtbare Fehlermeldung, Name unverändert', async ({ page }) => {
    await oeffnePublishIsland(page);
    await seedBlatt(page, 'Blatt 1');

    await oeffneBlattListe(page);
    const feld = page.locator('[data-testid="blattisl-name-0"]');
    await feld.click();
    await feld.fill('   '); // Nur-Whitespace — Kernel trimmt, wirft
    await feld.press('Enter');

    const meldung = page.locator('[data-testid="meldung-fehler"]');
    await expect(meldung).toBeVisible();
    await expect(meldung).toContainText('Blattname darf nicht leer sein');

    await expect(page.locator('[data-testid="blattisl-name-0"]')).toHaveText(/Blatt 1/);
    expect(await sheetNamenImDoc(page)).toEqual(['Blatt 1']);
  });
});
