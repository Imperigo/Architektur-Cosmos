import { expect, test, type Page } from '@playwright/test';
import { waehleOption } from './helfer/waehleOption';

/**
 * E6 Inspector-Ausbau (v0.8.10 «Inselrein», `docs/V0810-SPEZ.md` §2 E6/
 * §6 C-10, Z5) — die Kernel-`allowed`-Map in
 * `packages/kosmo-kernel/src/commands/design.ts` (`design.eigenschaftSetzen`,
 * :788-813) erlaubte column/beam/furniture-Felder sowie ergänzte zone/mass/
 * wall/freemesh-Felder BEREITS, ohne dass der Inspector (`Inspector.tsx`)
 * ein UI-Feld dafür hatte — dieses Paket schliesst NUR die UI-Lücke
 * (design.ts bleibt byte-still, Dateikreis exklusiv Inspector.tsx + diese
 * Spec).
 *
 * Muster: `ebenen-sperren.spec.ts`/`pe3-matrix-fixes.spec.ts`
 * (`window.__kosmo`-Testhook fürs deterministische Modell-Setup + reale
 * Inspector-DOM-Interaktion fürs eigentliche Prüfobjekt, `weltZuBildschirm`
 * fürs Welt→Bildschirm-Mapping, `waehleOption` für KSelect seit v0.6.9).
 *
 * **Ehrliche Grenze (Klickbarkeit)**: `column` ist über `pickEntityAt`
 * findbar (`plan-hit-test.ts:208-210`), `beam`/`furniture` NICHT — das ist
 * ein bekannter, benannter Befund (V0810-SPEZ §2 E8, Z3 «Klickbarkeit
 * furniture/beam», nach Kapazität/0.9.0, TABU für dieses Paket:
 * `plan-hit-test.ts` ist Cluster B/Fable-exklusiv). Für beam/furniture nutzt
 * diese Spec darum `window.__kosmo.state().select([id])` fürs Anwählen
 * (derselbe Testhook-Weg wie `ebenen-sperren.spec.ts`s `waehle`-Helfer) —
 * das FELD-EDITIEREN selbst läuft in JEDEM Fall über echte Inspector-DOM-
 * Elemente (KInput/KSelect), nie über einen Test-Only-Setter.
 *
 * **Ehrliche Grenze (Kernel-Wurf)**: nicht jedes neue Feld hat einen über
 * gültige UI-Eingaben erzwingbaren Kernel-Wurf-Fall — `rotationGrad`
 * normalisiert mod 360 statt zu werfen (design.ts:833-844, bewusste
 * Owner-Entscheidung, kein Falschwert-Fall wie bei `sia`/`raumTyp`), freie
 * Textfelder (`program`, `number`, freemesh `name`) validieren nichts, und
 * `raumTyp` bietet im Dropdown nur gültige Optionen an. Wo ein echter
 * Bestands-Bereich existiert (column b/t, beam breite/hoehe, wall height ≥
 * 0), demonstriert je ein Test den Fehlerweg über `[data-testid="meldung-
 * fehler"]`.
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

async function starteManuell(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="view-2d"]');
}

/** Wörtlich aus `ebenen-sperren.spec.ts`/`pe3-matrix-fixes.spec.ts`. */
async function weltZuBildschirm(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  return page.evaluate(
    ({ x, y }) => {
      const svg = document.querySelector('[data-testid="planview"]') as SVGSVGElement;
      const g = svg.querySelector('g') as SVGGElement;
      const pt = svg.createSVGPoint();
      pt.x = x;
      pt.y = -y;
      const transformed = pt.matrixTransform(g.getScreenCTM()!);
      return { x: transformed.x, y: transformed.y };
    },
    { x, y },
  );
}

const waehle = (page: Page, ids: string[]) => page.evaluate((ids) => window.__kosmo.state().select(ids), ids);
const holeEntity = (page: Page, id: string) => page.evaluate((id) => window.__kosmo.state().doc.get(id), id);
const aktiverStorey = (page: Page) => page.evaluate(() => window.__kosmo.state().activeStoreyId);
const fehlerText = (page: Page) => page.locator('[data-testid="meldung-fehler"]').first();

async function erstelleWand(page: Page, a: { x: number; y: number }, b: { x: number; y: number }): Promise<string> {
  return page.evaluate(
    ({ a, b }) => {
      const st = window.__kosmo.state();
      const aw = st.doc.byKind('assembly').find((x) => (x['name'] as string | undefined)?.startsWith('AW'))!;
      const r = window.__kosmo.run('design.wandZeichnen', { storeyId: st.activeStoreyId, a, b, assemblyId: aw['id'] });
      return r.patches[0]!.id;
    },
    { a, b },
  );
}

/** NumberField/KInput: `.fill()` + `Tab` löst den `onBlur`-Commit-Weg aus
 *  (Inspector.tsx `NumberField`/Freitext-Zeilen), wie im Bestand üblich. */
async function setzeUndBlur(page: Page, testid: string, wert: string): Promise<void> {
  const feld = page.locator(`[data-testid="${testid}"]`);
  await feld.fill(wert);
  await feld.press('Tab');
}

// ─────────────────────────────────────────────────────────────────────────
// NEU: column (Stütze) — material/b/t/rotationGrad (design.ts:811)
// ─────────────────────────────────────────────────────────────────────────

test('column (Stütze): Material/Breite/Tiefe/Rotation editierbar, Kernel-Wurf bei zu schmaler Breite', async ({
  page,
}) => {
  await starteManuell(page);
  const storeyId = await aktiverStorey(page);
  const columnId = await page.evaluate(
    (storeyId) =>
      window.__kosmo.run('design.stuetzeSetzen', { storeyId, at: { x: 1000, y: 1000 }, material: 'beton', b: 300, t: 300 })
        .patches[0]!.id,
    storeyId,
  );
  await waehle(page, [columnId]);
  await expect(page.locator('[data-testid="inspector"]')).toBeVisible();
  await expect(page.locator('[data-testid="inspector-stuetze-material"]')).toHaveAttribute('data-value', 'beton');
  await expect(page.locator('[data-testid="inspector-stuetze-b"]')).toHaveValue('300');

  // Setz-Beweis 1: Material (KSelect, Quelle @kosmo/data materialkatalog).
  await waehleOption(page, 'inspector-stuetze-material', 'holz');
  expect((await holeEntity(page, columnId))?.['material']).toBe('holz');

  // Setz-Beweis 2: Breite/Tiefe/Rotation (NumberField).
  await setzeUndBlur(page, 'inspector-stuetze-b', '500');
  expect((await holeEntity(page, columnId))?.['b']).toBe(500);
  await setzeUndBlur(page, 'inspector-stuetze-t', '400');
  expect((await holeEntity(page, columnId))?.['t']).toBe(400);
  await setzeUndBlur(page, 'inspector-stuetze-rotation', '45');
  expect((await holeEntity(page, columnId))?.['rotationGrad']).toBe(45);

  // Kernel-Wurf: b < 80mm (Bestands-Bereich design.stuetzeSetzen, design.ts:845-850).
  await setzeUndBlur(page, 'inspector-stuetze-b', '50');
  await expect(fehlerText(page)).toContainText('zwischen 80 und 2000');
  expect((await holeEntity(page, columnId))?.['b']).toBe(500); // unverändert — der Wurf hat nichts gepatcht.
});

// ─────────────────────────────────────────────────────────────────────────
// NEU: beam (Unterzug) — breite/hoehe/material (design.ts:812)
// ─────────────────────────────────────────────────────────────────────────

test('beam (Unterzug): Breite/Höhe/Material editierbar, Kernel-Wurf bei zu schmaler Breite', async ({ page }) => {
  await starteManuell(page);
  const storeyId = await aktiverStorey(page);
  const beamId = await page.evaluate(
    (storeyId) =>
      window.__kosmo.run('design.unterzugZeichnen', {
        storeyId,
        a: { x: 0, y: 0 },
        b: { x: 3000, y: 0 },
        breite: 300,
        hoehe: 400,
        material: 'beton',
      }).patches[0]!.id,
    storeyId,
  );
  // beam ist NICHT über pickEntityAt findbar (E8/Z3, s. Kopfkommentar) —
  // Anwahl über denselben Testhook wie `ebenen-sperren.spec.ts`s `waehle`.
  await waehle(page, [beamId]);
  await expect(page.locator('[data-testid="inspector"]')).toBeVisible();
  await expect(page.locator('[data-testid="inspector-unterzug-breite"]')).toHaveValue('300');
  await expect(page.locator('[data-testid="inspector-unterzug-hoehe"]')).toHaveValue('400');
  await expect(page.locator('[data-testid="inspector-unterzug-material"]')).toHaveAttribute('data-value', 'beton');

  await setzeUndBlur(page, 'inspector-unterzug-breite', '500');
  expect((await holeEntity(page, beamId))?.['breite']).toBe(500);
  await setzeUndBlur(page, 'inspector-unterzug-hoehe', '600');
  expect((await holeEntity(page, beamId))?.['hoehe']).toBe(600);
  await waehleOption(page, 'inspector-unterzug-material', 'stahl');
  expect((await holeEntity(page, beamId))?.['material']).toBe('stahl');

  // Kernel-Wurf: breite < 80mm (Bestands-Bereich design.unterzugZeichnen, design.ts:851-853).
  await setzeUndBlur(page, 'inspector-unterzug-breite', '50');
  await expect(fehlerText(page)).toContainText('zwischen 80 und 2000');
  expect((await holeEntity(page, beamId))?.['breite']).toBe(500);
});

// ─────────────────────────────────────────────────────────────────────────
// NEU: furniture (Möbel) — rotationGrad (design.ts:810)
// ─────────────────────────────────────────────────────────────────────────

test('furniture (Möbel): Rotation editierbar (mod-360-Normalisierung, kein Wurf-Fall — s. Kopfkommentar)', async ({
  page,
}) => {
  await starteManuell(page);
  const storeyId = await aktiverStorey(page);
  const moebelId = await page.evaluate(
    (storeyId) =>
      window.__kosmo.run('design.moebelSetzen', { storeyId, typ: 'wc', at: { x: 500, y: 500 }, rotationGrad: 0 })
        .patches[0]!.id,
    storeyId,
  );
  // furniture ist NICHT über pickEntityAt findbar (E8/Z3, s. Kopfkommentar).
  await waehle(page, [moebelId]);
  await expect(page.locator('[data-testid="inspector"]')).toBeVisible();
  await expect(page.locator('[data-testid="inspector-moebel-rotation"]')).toHaveValue('0');

  await setzeUndBlur(page, 'inspector-moebel-rotation', '90');
  expect((await holeEntity(page, moebelId))?.['rotationGrad']).toBe(90);

  // Kernel normalisiert mod 360, statt zu werfen (design.ts:833-844) —
  // 400° wird 40°, ein POSITIVER Beweis statt eines Fehler-Falls.
  await setzeUndBlur(page, 'inspector-moebel-rotation', '400');
  expect((await holeEntity(page, moebelId))?.['rotationGrad']).toBe(40);
});

// ─────────────────────────────────────────────────────────────────────────
// ERGÄNZT: zone — program/number/raumTyp (design.ts:789)
// ─────────────────────────────────────────────────────────────────────────

test('zone: Nutzung/Raumnummer/Raumtyp zusätzlich editierbar', async ({ page }) => {
  await starteManuell(page);
  const storeyId = await aktiverStorey(page);
  const zoneId = await page.evaluate(
    (storeyId) =>
      window.__kosmo.run('design.zoneErstellen', {
        storeyId,
        outline: [
          { x: 0, y: 0 },
          { x: 4000, y: 0 },
          { x: 4000, y: 3000 },
          { x: 0, y: 3000 },
        ],
        name: 'Testraum',
        sia: 'HNF',
      }).patches[0]!.id,
    storeyId,
  );
  await waehle(page, [zoneId]);
  await expect(page.locator('[data-testid="inspector"]')).toBeVisible();

  await setzeUndBlur(page, 'inspector-zone-program', 'marktgerecht');
  expect((await holeEntity(page, zoneId))?.['program']).toBe('marktgerecht');

  await setzeUndBlur(page, 'inspector-zone-number', 'R.101');
  expect((await holeEntity(page, zoneId))?.['number']).toBe('R.101');

  await waehleOption(page, 'inspector-zone-raumtyp', 'wohnen');
  expect((await holeEntity(page, zoneId))?.['raumTyp']).toBe('wohnen');
});

// ─────────────────────────────────────────────────────────────────────────
// ERGÄNZT: mass — program (design.ts:791)
// ─────────────────────────────────────────────────────────────────────────

test('mass (Volumen): Nutzung zusätzlich editierbar', async ({ page }) => {
  await starteManuell(page);
  const storeyId = await aktiverStorey(page);
  const massId = await page.evaluate(
    (storeyId) =>
      window.__kosmo.run('design.volumenErstellen', {
        storeyId,
        outline: [
          { x: 0, y: 0 },
          { x: 5000, y: 0 },
          { x: 5000, y: 4000 },
          { x: 0, y: 4000 },
        ],
        height: 9000,
      }).patches[0]!.id,
    storeyId,
  );
  await waehle(page, [massId]);
  await expect(page.locator('[data-testid="inspector"]')).toBeVisible();

  await setzeUndBlur(page, 'inspector-mass-program', 'wohnen');
  expect((await holeEntity(page, massId))?.['program']).toBe('wohnen');
});

// ─────────────────────────────────────────────────────────────────────────
// ERGÄNZT: wall — height (design.ts:793)
// ─────────────────────────────────────────────────────────────────────────

test('wall: Höhe (fix) zusätzlich editierbar, Kernel-Wurf bei negativer Zahl', async ({ page }) => {
  await starteManuell(page);
  const wallId = await erstelleWand(page, { x: 0, y: 0 }, { x: 4000, y: 0 });
  await waehle(page, [wallId]);
  await expect(page.locator('[data-testid="inspector"]')).toBeVisible();
  await expect(page.locator('[data-testid="inspector-wand-hoehe"]')).toHaveValue('0');

  await setzeUndBlur(page, 'inspector-wand-hoehe', '2600');
  expect((await holeEntity(page, wallId))?.['height']).toBe(2600);

  // Kernel-Wurf: negative Zahl — die generische numeric-Prüfung
  // (design.ts:820-826) verlangt wert >= 0 für JEDES mm-Feld, `height`
  // eingeschlossen.
  await setzeUndBlur(page, 'inspector-wand-hoehe', '-100');
  await expect(fehlerText(page)).toContainText('ist keine gültige Zahl');
  expect((await holeEntity(page, wallId))?.['height']).toBe(2600);
});

// ─────────────────────────────────────────────────────────────────────────
// ERGÄNZT: freemesh — name (design.ts:804)
// ─────────────────────────────────────────────────────────────────────────

test('freemesh: Name zusätzlich editierbar (landet in entity.meta.name — s. Kopfkommentar Inspector.tsx)', async ({
  page,
}) => {
  await starteManuell(page);
  const storeyId = await aktiverStorey(page);
  const meshId = await page.evaluate(
    (storeyId) =>
      window.__kosmo.run('design.meshErstellen', {
        form: 'quader',
        storeyId,
        at: { x: 0, y: 0 },
        breite: 2000,
        laenge: 2000,
        hoehe: 2000,
      }).patches[0]!.id,
    storeyId,
  );
  await waehle(page, [meshId]);
  await expect(page.locator('[data-testid="inspector"]')).toBeVisible();

  await setzeUndBlur(page, 'inspector-freemesh-name', 'Erker Ost');
  const entity = await holeEntity(page, meshId);
  expect((entity?.['meta'] as { name?: string } | undefined)?.name).toBe('Erker Ost');
});

// ─────────────────────────────────────────────────────────────────────────
// Gate 3 (V0810-SPEZ §6): Island-first-Screenshot — Stütze im schwebenden
// Inspector (Kontextmenü → Eigenschaften), Muster
// `pe3-matrix-fixes.spec.ts` C-11.
// ─────────────────────────────────────────────────────────────────────────

test.describe('Island-first: Stütze im schwebenden Inspector', () => {
  // Der globale `kosmoUiV1SeedMitManuell`-Seed (playwright.config.ts) hält
  // die Bestands-Specs auf 'manuell' — dieser Test gilt aber ausdrücklich
  // dem Island-Default (Owner-Praxis seit 19.07., V0810-SPEZ §3), darum
  // leerer storageState (Muster `pe3-matrix-fixes.spec.ts` C-11 / `pb4-orb-
  // gesetz`), NUR für diese eine Gruppe.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('Rechtsklick auf eine Stütze → Eigenschaften öffnet den schwebenden Inspector mit dem NEUEN Zweig', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('kosmo.onboarded', '1');
      localStorage.setItem('kosmo.starterGuide.done', '1');
    });
    await page.reload();
    await page.click('[data-testid="module-design"]');
    // Beweis-Anker: wir sind wirklich im Island-Modus (Pill da, kein Dock).
    await expect(page.locator('[data-testid="island-zeichnen-pill"]')).toBeVisible();
    await page.waitForSelector('[data-testid="planview"]');

    const storeyId = await aktiverStorey(page);
    await page.evaluate(
      (storeyId) =>
        window.__kosmo.run('design.stuetzeSetzen', { storeyId, at: { x: 2000, y: 2000 }, material: 'beton', b: 300 }),
      storeyId,
    );

    const p = await weltZuBildschirm(page, 2000, 2000);
    await page.mouse.click(p.x, p.y, { button: 'right' });
    await expect(page.locator('[data-testid="viewport-kontextmenue"]')).toBeVisible();
    await page.click('[data-testid="kontext2d-eigenschaften"]');

    const float = page.locator('[data-testid="dw-eigenschaften-float"]');
    await expect(float).toBeVisible();
    await expect(float.locator('[data-testid="inspector-stuetze-material"]')).toBeVisible();
    await expect(float.locator('[data-testid="inspector-stuetze-b"]')).toBeVisible();
    await expect(float.locator('[data-testid="inspector-stuetze-t"]')).toBeVisible();
    await expect(float.locator('[data-testid="inspector-stuetze-rotation"]')).toBeVisible();

    await page.screenshot({ path: 'e2e-results/inspector-ausbau-island-stuetze.png' });
  });
});
