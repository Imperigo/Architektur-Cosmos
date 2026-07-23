import { expect, test, type Page } from '@playwright/test';

/**
 * P-B2 «Insel + Inspector» (v0.9.1 «Trittsicher», `docs/V091-SPEZ.md`
 * §P-B2) — Beweis für die zwei neuen ZEICHNEN-Insel-Werkzeuge
 * (`island-werkzeug-gelaender`/`-rampe`) + die Inspector-Felder beider
 * Entities:
 *
 * 1. Die ZEICHNEN-Insel zeigt beide Werkzeuge, ein Klick öffnet das
 *    Mini-Popup (Stufe 2) — Muster `island-ui.spec.ts`/`popup-kollision.
 *    spec.ts` (Hover statt Klick auf die Pille, s. dortiger Kommentar:
 *    `.click()` löst `onMouseEnter` bereits selbst aus).
 * 2. Der Inspector zeigt nach einem PROGRAMMATISCHEN
 *    `design.gelaenderZeichnen` (über die Testbrücke `window.__kosmo`,
 *    Muster `griffe-treppe.spec.ts`/`inspector-ausbau.spec.ts` — kein
 *    Zeichnen über echte Klicks nötig, die Klickketten-Interaktion selbst
 *    ist P-B1s TABU-Baustelle in PlanView.tsx) die editierbaren
 *    Geländer-Felder (Höhe/Art), echt über `design.eigenschaftSetzen`.
 * 3. Der Inspector zeigt nach `design.rampeZeichnen` NUR die Anzeige der
 *    abgeleiteten Steigung + Rohwerte (kein editierbares Feld — Sanktion 4,
 *    `design.eigenschaftSetzen` kennt `ramp` nicht, s. Auftrag).
 *
 * Kernel-Seite (Entity `Gelaender`/`Rampe` + beide Commands) ist bereits
 * gelandet (P-A1/P-A2) — dieses Paket rührt NUR die ZEICHNEN-Insel +
 * `Inspector.tsx` an, TABU bleiben PlanView.tsx/DesignWorkspace.tsx/
 * plan-hit-test.ts (Cluster B, P-B1/Fable).
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[]; summary: string };
      state: () => {
        activeStoreyId: string;
        doc: {
          get: (id: string) => Record<string, unknown> | undefined;
          byKind: (k: string) => Array<Record<string, unknown>>;
        };
        selection: string[];
        select: (ids: string[]) => void;
      };
      open: (s: string) => void;
    };
  }
}

/** Island-Default (kein Manuell-Seed) — derselbe leere `storageState`-Weg
 *  wie `inspector-ausbau.spec.ts`s «Island-first»-Gruppe. */
async function starteIsland(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]');
  // Beweis-Anker: wirklich im Island-Modus (Pille da, kein Dock).
  await expect(page.locator('[data-testid="island-zeichnen-pill"]')).toBeVisible();
}

/** Hover statt Klick — `.click()` löst `onMouseEnter` (IslandShell.tsx)
 *  bereits selbst aus, s. `island-verdrahtung.spec.ts`-Kopfkommentar. */
async function oeffneZeichnenInsel(page: Page): Promise<void> {
  await page.hover('[data-testid="island-zeichnen-pill"]');
  await expect(page.locator('[data-testid="island-zeichnen-leiste"]')).toBeVisible();
}

/**
 * Manuell-Modus (globaler `kosmoUiV1SeedMitManuell`-Seed der
 * `playwright.config.ts`, KEIN `storageState`-Override in dieser Gruppe) —
 * derselbe Weg wie `griffe-treppe.spec.ts`/`inspector-ausbau.spec.ts`s
 * Haupt-Specs: der gedockte `<Inspector/>` (`DesignWorkspace.tsx`) zeigt die
 * Auswahl DIREKT (`selection`-Store-Abhängigkeit), ohne den Island-
 * exklusiven Kontextmenü-Umweg über `setEigenschaftenFloatOffen` (der NUR
 * bei `designOberflaeche==='island'` UND einem echten Rechtsklick-«Eigen-
 * schaften»-Klick greift, s. `DesignWorkspace.tsx`s `onEigenschaften`,
 * TABU-Datei, hier nur gelesen). Diese Tests prüfen den Inspector, nicht die
 * Insel — der Manuell-Weg ist darum der direktere, bestehende Beweisweg.
 */
async function starteManuell(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="view-2d"]');
}

const aktiverStorey = (page: Page) => page.evaluate(() => window.__kosmo.state().activeStoreyId);
const waehle = (page: Page, ids: string[]) => page.evaluate((ids) => window.__kosmo.state().select(ids), ids);
const holeEntity = (page: Page, id: string) => page.evaluate((id) => window.__kosmo.state().doc.get(id), id);
const fehlerText = (page: Page) => page.locator('[data-testid="meldung-fehler"]').first();

async function zeichneGelaender(
  page: Page,
  storeyId: string,
  extra: { hoehe?: number; art?: 'staketen' | 'handlauf' | 'voll' } = {},
): Promise<string> {
  return page.evaluate(
    ({ storeyId, extra }) =>
      window.__kosmo.run('design.gelaenderZeichnen', {
        storeyId,
        punkte: [
          { x: 0, y: 0 },
          { x: 3000, y: 0 },
        ],
        ...extra,
      }).patches[0]!.id,
    { storeyId, extra },
  );
}

async function zeichneRampe(page: Page, storeyId: string): Promise<string> {
  return page.evaluate(
    (storeyId) =>
      window.__kosmo.run('design.rampeZeichnen', {
        storeyId,
        a: { x: 0, y: 0 },
        b: { x: 5000, y: 0 },
        width: 1200,
        hoehenDelta: 170,
      }).patches[0]!.id,
    storeyId,
  );
}

async function setzeUndBlur(page: Page, testid: string, wert: string): Promise<void> {
  const feld = page.locator(`[data-testid="${testid}"]`);
  await feld.fill(wert);
  await feld.press('Tab');
}

test.describe('P-B2 Geländer/Rampe — ZEICHNEN-Insel (Island-Default)', () => {
  // Island-Default statt des globalen Manuell-Seeds (playwright.config.ts)
  // — dieselbe Ausnahme wie `inspector-ausbau.spec.ts`s «Island-first»-Gruppe.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('ZEICHNEN-Insel zeigt beide neuen Werkzeuge, ein Klick öffnet je das Mini-Popup', async ({ page }) => {
    await starteIsland(page);
    await oeffneZeichnenInsel(page);

    const gelaenderKnopf = page.locator('[data-testid="island-werkzeug-gelaender"]');
    const rampeKnopf = page.locator('[data-testid="island-werkzeug-rampe"]');
    await expect(gelaenderKnopf).toBeVisible();
    await expect(rampeKnopf).toBeVisible();

    // Geländer: Klick öffnet das Mini-Popup (Stufe 2) mit den Vorgabewerten
    // (kein Geländer ausgewählt).
    await gelaenderKnopf.click();
    await expect(page.locator('[data-testid="island-gelaender-popup"]')).toBeVisible();
    await expect(page.locator('[data-testid="island-gelaender-stufe2"]')).toBeVisible();
    await expect(page.locator('[data-testid="island-gelaender-vorgabe-hoehe"]')).toHaveValue('1000');
    await expect(page.locator('[data-testid="island-gelaender-vorgabe-art"]')).toHaveAttribute('data-value', 'staketen');
    await expect(page.locator('[data-testid="island-gelaender-hinweis-vorgabe"]')).toContainText('P-B1');

    // Rampe: Klick auf ein ANDERES Werkzeug wechselt die Popup-Anzeige (§4.1).
    await rampeKnopf.click();
    await expect(page.locator('[data-testid="island-rampe-popup"]')).toBeVisible();
    await expect(page.locator('[data-testid="island-rampe-stufe2"]')).toBeVisible();
    await expect(page.locator('[data-testid="island-rampe-vorgabe-breite"]')).toHaveValue('1200');
    await expect(page.locator('[data-testid="island-rampe-hinweis-vorgabe"]')).toContainText('P-B1');
  });
});

test.describe('P-B2 Geländer/Rampe — Inspector (Manuell-Modus, gedockter Inspector)', () => {
  test('Inspector zeigt Geländer-Felder (Höhe/Art) nach programmatischem design.gelaenderZeichnen, editierbar über design.eigenschaftSetzen', async ({
    page,
  }) => {
    await starteManuell(page);
    const storeyId = await aktiverStorey(page);
    const gelaenderId = await zeichneGelaender(page, storeyId, { hoehe: 1100, art: 'handlauf' });

    await waehle(page, [gelaenderId]);
    await expect(page.locator('[data-testid="inspector"]')).toBeVisible();
    await expect(page.locator('[data-testid="inspector-gelaender-hoehe"]')).toHaveValue('1100');
    await expect(page.locator('[data-testid="inspector-gelaender-art"]')).toHaveAttribute('data-value', 'handlauf');

    // Setz-Beweis: Höhe (NumberField) — echt über design.eigenschaftSetzen.
    await setzeUndBlur(page, 'inspector-gelaender-hoehe', '1200');
    expect((await holeEntity(page, gelaenderId))?.['hoehe']).toBe(1200);

    // Kernel-Wurf: Bestands-Bereich 700–1500 mm (SIA-Absturzsicherung,
    // design.gelaenderZeichnen) — design.eigenschaftSetzen lehnt dieselbe
    // Grenze ab (design.ts:875-880), keine stille Klemmung.
    await setzeUndBlur(page, 'inspector-gelaender-hoehe', '1600');
    await expect(fehlerText(page)).toContainText('zwischen 700 und 1500');
    expect((await holeEntity(page, gelaenderId))?.['hoehe']).toBe(1200); // unverändert
  });

  test('Inspector zeigt Rampe NUR als Anzeige (Steigung + Rohwerte) — design.eigenschaftSetzen kennt «ramp» nicht, keine editierbaren Felder', async ({
    page,
  }) => {
    await starteManuell(page);
    const storeyId = await aktiverStorey(page);
    // a→b Lauf 5000 mm, hoehenDelta 170 mm → Steigung 3.4 % (< 6 %, kein
    // «nicht hindernisfrei»-Zusatz).
    const rampeId = await zeichneRampe(page, storeyId);

    await waehle(page, [rampeId]);
    await expect(page.locator('[data-testid="inspector"]')).toBeVisible();
    await expect(page.locator('[data-testid="inspector-rampe-steigung"]')).toContainText('3.4 %');
    // Breite/Höhendelta laufen über `formatLength()` (mm → m, s. Inspector.tsx) —
    // 1200 mm → «1.2 m», 170 mm → «0.17 m».
    await expect(page.locator('[data-testid="inspector-rampe-breite"]')).toContainText('1.2 m');
    await expect(page.locator('[data-testid="inspector-rampe-hoehendelta"]')).toContainText('0.17 m');
    await expect(page.locator('[data-testid="inspector-rampe-hinweis-nicht-editierbar"]')).toContainText('eigenschaftSetzen kennt «ramp» nicht');

    // Ehrliche Grenze: keine <input>-Elemente für Breite/Höhendelta — reine
    // Anzeige, kein vorgetäuschtes Editierfeld (Sanktion 4, V091-SPEZ).
    await expect(page.locator('input[data-testid="inspector-rampe-breite"]')).toHaveCount(0);
    await expect(page.locator('input[data-testid="inspector-rampe-hoehendelta"]')).toHaveCount(0);
  });
});
