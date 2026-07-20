import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * E4 (V0810-SPEZ §2, C-8) — Blatt-Umbenennen. Der 0.8.9-Befund
 * «produktweit KEIN Blatt-Umbenennen-Weg» (dokumentiert im
 * `e2e/blattverzeichnis.spec.ts`-C-5-Test als Delete+Neu-Anlegen-Umweg,
 * weil `design.eigenschaftSetzen` `sheet` nicht kannte und `commands/
 * publish.ts` keinen Rename-Command hat) wird hier geschlossen: der
 * NEUE Kernel-Weg (`design.eigenschaftSetzen` `feld:'name'` auf `sheet`,
 * `packages/kosmo-kernel/src/commands/design.ts`) plus das neue
 * Klick-zu-Edit-Feld in der Blattkarten-Liste
 * (`apps/kosmo-orbit/src/modules/publish/PublishWorkspace.tsx:772`,
 * testid `sheet-name-<index>`).
 *
 * Läuft unter dem globalen Manuell-Seed (`playwright.config.ts` /
 * `e2e/helpers/manuell-seed.ts`) — die Blattkarten-Liste existiert NUR im
 * Manuell-Chrome von `PublishWorkspace.tsx` (kein Island-Äquivalent unter
 * `modules/publish/island/`, grep-geprüft), das ist die Standard-Ansicht
 * jeder bestehenden publish-lastigen Spec (u.a. `blattverzeichnis.spec.ts`,
 * `kxp-trust.spec.ts`).
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[]; summary: string };
      state: () => {
        doc: {
          byKind: (k: string) => Array<{ id: string; name: string }>;
        };
      };
    };
  }
}

async function ueberspringeOnboarding(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
}

async function sheetNamenImDoc(page: Page): Promise<string[]> {
  return page.evaluate(() => window.__kosmo.state().doc.byKind('sheet').map((s) => s.name));
}

test('Umbenennen über die echte UI: Karte + Doc aktualisiert, EIN Ctrl+Z stellt den alten Namen wieder her', async ({
  page,
}) => {
  await ueberspringeOnboarding(page);
  await page.click('[data-testid="module-publish"]'); // bootstrappt EG/1.OG, Manuell-Chrome (globaler Seed)
  await page.click('[data-testid="add-sheet"]');
  await expect(page.locator('[data-testid="sheet-0"]')).toBeVisible();
  await expect(page.locator('[data-testid="sheet-name-0"]')).toHaveText('Blatt 1');

  const feld = page.locator('[data-testid="sheet-name-0"]');
  await feld.click(); // Klick-zu-Edit: div → KInput (dieselbe testid)
  await feld.fill('Fassadenplan Ost');
  // Gate-Beleg (Bauauftrag §Gate 4): Screenshot der Umbenennen-Interaktion
  // MITTEN im Edit (KInput sichtbar, neuer Wert getippt, vor dem Commit) —
  // Manuell-Chrome ehrlich, weil die Blattkarten-Liste NUR dort existiert
  // (kein Island-Äquivalent unter modules/publish/island/, grep-geprüft;
  // der globale E2E-Seed hält publishOberflaeche ohnehin auf 'manuell').
  await page.screenshot({ path: 'e2e-results/blatt-umbenennen-manuell.png' });
  await feld.press('Enter'); // Enter → blur() → commit via design.eigenschaftSetzen

  await expect(page.locator('[data-testid="sheet-name-0"]')).toHaveText('Fassadenplan Ost');
  expect(await sheetNamenImDoc(page)).toEqual(['Fassadenplan Ost']);

  await page.keyboard.press('Control+z');

  await expect(page.locator('[data-testid="sheet-name-0"]')).toHaveText('Blatt 1');
  expect(await sheetNamenImDoc(page)).toEqual(['Blatt 1']);
});

test('leerer Name → sichtbare Fehlermeldung, Name unverändert', async ({ page }) => {
  await ueberspringeOnboarding(page);
  await page.click('[data-testid="module-publish"]');
  await page.click('[data-testid="add-sheet"]');
  await expect(page.locator('[data-testid="sheet-0"]')).toBeVisible();

  const feld = page.locator('[data-testid="sheet-name-0"]');
  await feld.click();
  await feld.fill('   '); // Nur-Whitespace — Kernel trimmt, wirft
  await feld.press('Enter');

  const meldung = page.locator('[data-testid="meldung-fehler"]');
  await expect(meldung).toBeVisible();
  await expect(meldung).toContainText('Blattname darf nicht leer sein');

  // Edit schliesst wieder auf den unveränderten Namen — weder Karte noch Doc
  // haben den leeren Wert übernommen (Kernel wirft VOR jedem Patch).
  await expect(page.locator('[data-testid="sheet-name-0"]')).toHaveText('Blatt 1');
  expect(await sheetNamenImDoc(page)).toEqual(['Blatt 1']);
});

test('Blattverzeichnis-Export zeigt den NEUEN Namen — schliesst den 0.8.9-C-5-Umweg (Delete+Neu-Anlegen)', async ({
  page,
}) => {
  await ueberspringeOnboarding(page);
  await page.click('[data-testid="module-publish"]');
  await page.click('[data-testid="add-sheet"]');
  await expect(page.locator('[data-testid="sheet-0"]')).toBeVisible();

  const feld = page.locator('[data-testid="sheet-name-0"]');
  await feld.click();
  await feld.fill('Fassadenplan Ost');
  await feld.press('Enter');
  await expect(page.locator('[data-testid="sheet-name-0"]')).toHaveText('Fassadenplan Ost');

  // Ein Set ist nötig (Bauauftrag) — derselbe Weg wie
  // `e2e/blattverzeichnis.spec.ts`s `pubset-name`/`pubset-speichern`.
  await page.fill('[data-testid="pubset-name"]', 'Umbenennen-Set');
  await page.click('[data-testid="pubset-speichern"]');
  await expect(page.locator('[data-testid="pubset-karte"]')).toHaveCount(1);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="pubset-blattverzeichnis"]'),
  ]);
  const pfad = await download.path();
  const svg = readFileSync(pfad!, 'utf8');
  expect(svg).toContain('>Fassadenplan Ost</text>');
  expect(svg).not.toContain('>Blatt 1</text>');
});
