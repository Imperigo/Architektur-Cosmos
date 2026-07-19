import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * PA2-088 E3/C-5 (`docs/V088-SPEZ.md` §3 E3, §7 C-5) — der neue
 * «Flächennachweis (SIA 416)»-Export-Knopf in der AUSTAUSCH-Insel
 * (`publish/island/inhalte/austausch.tsx`, `export-flaechennachweis`).
 * Beweist den vollen Weg: echte Geschosse/Zonen über den Command-Bus
 * (`window.__kosmo.run`, Muster `publish-island.spec.ts`s `seedBlatt`/
 * `island-inhalte-projekt-austausch.spec.ts`s Kennzahlen-Test) → Klick auf
 * den Export-Knopf → echter Download → Inhalt Byte-für-Byte gegen die
 * `flaechennachweisCsv`-Kernel-Tests nachgerechnet (`packages/kosmo-kernel/
 * test/flaechennachweis-csv.test.ts`).
 *
 * **Diese Spec setzt den globalen Manuell-Seed selbst ausser Kraft**
 * (`test.use({ storageState: { cookies: [], origins: [] } })`, exakt wie
 * `publish-island.spec.ts`) — nur ein leerer Kontext beweist den echten
 * Produktions-Default `publishOberflaeche:'island'` ohne Seed.
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

/** `bootstrapProject()` (`state/project-store.ts:127`) legt beim ersten
 * Öffnen IMMER `EG`/`1.OG` an (Guard: nur wenn `doc.byKind('storey')` leer
 * ist) — ein wirklich leeres Doc ist über die UI also nie erreichbar. Diese
 * Funktion setzt Zonen auf die bereits vorhandenen bootstrapped Geschosse
 * (statt neue mit kollidierendem `index:0` anzulegen — zwei Geschosse mit
 * demselben Index hätten eine implementationsabhängige Sortierreihenfolge).
 * Flächen wie `flaechennachweis-csv.test.ts`s `bauMischDoc`-Grundfigur (EG:
 * HNF 100 m², OG: HNF 48 m² + FF 6 m²) — der parzelle/nachbar-Kontrast ist
 * bereits Kernel-seitig hart geprüft; diese Spec beweist die Verdrahtung,
 * nicht nochmal die Flächenmathematik. */
async function seedZonenAufBootstrapGeschosse(page: Page): Promise<void> {
  await page.evaluate(() => {
    const k = window.__kosmo;
    const storeys = k.state().doc.byKind('storey');
    const egId = storeys.find((s) => s.name === 'EG')!.id;
    const ogId = storeys.find((s) => s.name === '1.OG')!.id;
    k.run('design.zoneErstellen', {
      storeyId: egId,
      name: 'Wohnen EG',
      sia: 'HNF',
      outline: [{ x: 0, y: 0 }, { x: 10000, y: 0 }, { x: 10000, y: 10000 }, { x: 0, y: 10000 }],
    });
    k.run('design.zoneErstellen', {
      storeyId: ogId,
      name: 'Wohnen OG',
      sia: 'HNF',
      outline: [{ x: 0, y: 0 }, { x: 8000, y: 0 }, { x: 8000, y: 6000 }, { x: 0, y: 6000 }],
    });
    k.run('design.zoneErstellen', {
      storeyId: ogId,
      name: 'Fassade OG',
      sia: 'FF',
      outline: [{ x: 10000, y: 0 }, { x: 12000, y: 0 }, { x: 12000, y: 3000 }, { x: 10000, y: 3000 }],
    });
  });
}

test('AUSTAUSCH-Insel: «Flächennachweis (SIA 416)» exportiert die echte Matrix aus dem Command-Bus-Modell', async ({ page }) => {
  await oeffnePublishIsland(page);
  await seedZonenAufBootstrapGeschosse(page);

  await oeffneInsel(page, 'austausch');
  await page.click('[data-testid="island-werkzeug-export-hub"]');
  await expect(page.locator('[data-testid="island-export-hub-stufe2"]')).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="export-flaechennachweis"]'),
  ]);
  expect(download.suggestedFilename()).toBe('Unbenannt-Flaechennachweis.csv');

  const pfad = await download.path();
  const csv = readFileSync(pfad!, 'utf8');
  const zeilen = csv.split('\n');

  expect(zeilen[0]).toBe('Geschoss;HNF;NNF;VF;FF;KF;NGF');
  expect(zeilen[1]).toBe('EG;100.00;0.00;0.00;0.00;0.00;100.00');
  expect(zeilen[2]).toBe('1.OG;48.00;0.00;0.00;6.00;0.00;54.00');
  // Total HNF 148, FF 6, NGF 154 — agfZiel = 148 × 1.28 = 189.44 (Default-Faktor).
  expect(zeilen[3]).toBe('Total;148.00;0.00;0.00;6.00;0.00;154.00');
  expect(zeilen[4]).toBe('aGF-Ziel;;;;;;189.44');

  await page.screenshot({ path: 'test-results/pa2-088-flaechennachweis-export.png' });
});

test('AUSTAUSCH-Insel: frisches Projekt (bootstrapped EG/1.OG, keine Zonen) — Export bleibt ehrlich, keine erfundene Fläche', async ({ page }) => {
  // Ehrliche Grenze: ein wirklich LEERES Doc (0 Geschosse) ist über die UI nie
  // erreichbar — `bootstrapProject()` legt EG/1.OG beim ersten Modul-Öffnen
  // IMMER an (`state/project-store.ts:127`). Der Null-Geschosse-Fall
  // (Kopfzeile + Null-Summenzeile, keine Geschosszeile) ist bereits Kernel-
  // seitig bewiesen (`flaechennachweis-csv.test.ts`, direkt gegen `KosmoDoc`).
  // Diese Spec beweist den ehrlich NÄCHSTEN Fall, den die App wirklich zeigt:
  // zwei echte Geschosse ohne Zonen — Nullen, keine Erfindung.
  await oeffnePublishIsland(page);

  await oeffneInsel(page, 'austausch');
  await page.click('[data-testid="island-werkzeug-export-hub"]');
  await expect(page.locator('[data-testid="island-export-hub-stufe2"]')).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="export-flaechennachweis"]'),
  ]);
  const pfad = await download.path();
  const csv = readFileSync(pfad!, 'utf8');
  expect(csv.split('\n')).toEqual([
    'Geschoss;HNF;NNF;VF;FF;KF;NGF',
    'EG;0.00;0.00;0.00;0.00;0.00;0.00',
    '1.OG;0.00;0.00;0.00;0.00;0.00;0.00',
    'Total;0.00;0.00;0.00;0.00;0.00;0.00',
    'aGF-Ziel;;;;;;0.00',
    'GF-Schätzung;;;;;;0.00',
  ]);
});
