import { expect, test, type Page } from '@playwright/test';

/**
 * PA5 (v0.8.7 «Verortet», `docs/V087-SPEZ.md` §2 D6, §3 E1, §7 C-3) —
 * Treppen-Griffe im Plan: a/b wie beim Wand-Zweig, bei form 'l' zusätzlich
 * der Eckpunkt-Griff. Der Drag-Commit läuft über das neue In-place-
 * `design.treppeGeometrieSetzen` (Kernel, PA1) — kein Löschen+Neusetzen,
 * Identität/width/form/storeyId bleiben, EIN Undo-Schritt (Lehre v0.8.6 §2).
 *
 * Helfer wörtlich aus `e2e/griffe.spec.ts` übernommen (`weltZuBildschirm`,
 * `griffMitte`, `ziehe`, `auswahl`, `waehle`) — dieselbe manuell-Oberfläche
 * über den globalen `kosmoUiV1SeedMitManuell`-Seed der playwright.config,
 * Plan-/Griff-Mechanik ist dieselbe PlanView wie in `griffe.spec.ts`.
 * `erstelleTreppe` folgt demselben `window.__kosmo.run(...)`-Setup-Muster
 * wie `erstelleZone`/`erstelleVolumen`/`erstelleDach` dort (kein Zeichnen
 * über echte Klicks nötig — die Treppen-Werkzeugleiste bräuchte für den
 * L-Lauf zusätzlich den `treppen-form`-Select-Umweg, reines Setup-Rauschen
 * für einen Griff-Test).
 */

async function starteManuell(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="view-2d"]');
}

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

/** EG der `bootstrapProject()` (`state/project-store.ts`) hat height 3000 —
 *  `stairSpec` hält die Steigung dabei für JEDE plausible Lauflänge
 *  deutlich unter dem 200-mm-Gate (n=round(3000/175)=17, riser≈176 mm),
 *  darum genügt für alle Erfolgs-Fälle unten ein Lauf ≥ 1 m. */
async function erstelleTreppe(
  page: Page,
  a: { x: number; y: number },
  b: { x: number; y: number },
  extra: { form?: 'gerade' | 'podest' | 'u' | 'l'; ecke?: { x: number; y: number } } = {},
): Promise<string> {
  return page.evaluate(
    ({ a, b, extra }) => {
      const k = window.__kosmo;
      const st = k.state();
      const r = k.run('design.treppeErstellen', {
        storeyId: st.activeStoreyId,
        a,
        b,
        width: 1200,
        ...extra,
      });
      return r.patches[0]!.id;
    },
    { a, b, extra },
  );
}

const auswahl = (page: Page) => page.evaluate(() => window.__kosmo.state().selection as string[]);
const waehle = (page: Page, ids: string[]) => page.evaluate((ids) => window.__kosmo.state().select(ids), ids);

async function griffMitte(page: Page, testid: string): Promise<{ x: number; y: number }> {
  const box = await page.locator(`[data-testid="${testid}"]`).boundingBox();
  if (!box) throw new Error(`Griff ${testid} nicht sichtbar`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function ziehe(page: Page, von: { x: number; y: number }, nach: { x: number; y: number }): Promise<void> {
  await page.mouse.move(von.x, von.y);
  await page.mouse.down();
  await page.mouse.move((von.x + nach.x) / 2, (von.y + nach.y) / 2, { steps: 3 });
  await page.mouse.move(nach.x, nach.y, { steps: 3 });
  await page.mouse.up();
}

type StairDoc = { id: string; a: { x: number; y: number }; b: { x: number; y: number }; form?: string; ecke?: { x: number; y: number }; width: number };
const treppen = (page: Page) => page.evaluate(() => window.__kosmo.state().doc.byKind('stair') as StairDoc[]);

test('C-3: Treppen-Endpunkt-Griffe sichtbar bei Einzel-Auswahl, weg bei Mehrfach-Auswahl', async ({ page }) => {
  await starteManuell(page);
  const t1 = await erstelleTreppe(page, { x: 2000, y: 2000 }, { x: 2000, y: 6000 });
  const t2 = await erstelleTreppe(page, { x: 8000, y: 2000 }, { x: 8000, y: 6000 });

  await waehle(page, [t1]);
  await expect(page.locator('[data-testid="griff-endpunkt-a"]')).toBeVisible();
  await expect(page.locator('[data-testid="griff-endpunkt-b"]')).toBeVisible();

  // (e) Mehrfach-Auswahl — keine Treppen-Griffe mehr (C-15-Vertrag gilt
  // kind-neutral, s. `griffe`-useMemo-Guard in PlanView.tsx).
  await waehle(page, [t1, t2]);
  await expect(page.locator('[data-testid="griff-endpunkt-a"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="griff-endpunkt-b"]')).toHaveCount(0);

  // Zurück zur Einzel-Auswahl — Griffe wieder da.
  await waehle(page, [t2]);
  await expect(page.locator('[data-testid="griff-endpunkt-a"]')).toBeVisible();
});

test('C-1: Drag am Endpunkt-Griff b behält die Treppen-ID — EIN Ctrl+Z stellt die alte Geometrie wieder her', async ({
  page,
}) => {
  await starteManuell(page);
  const a = { x: 2000, y: 2000 };
  const b = { x: 2000, y: 6000 }; // Lauf 4000 mm
  const t1 = await erstelleTreppe(page, a, b);
  await waehle(page, [t1]);
  await expect(page.locator('[data-testid="griff-endpunkt-b"]')).toBeVisible();

  const von = await griffMitte(page, 'griff-endpunkt-b');
  const nach = await weltZuBildschirm(page, 2000, 9000); // 250er-Raster, weit weg vom Fang jeder Nachbargeometrie
  await ziehe(page, von, nach);

  // Doc-Beweis: GENAU eine Treppe, GLEICHE ID, a unverändert, b geändert,
  // width/form (Default) unangetastet (In-place-Gebot, Sanktion 2).
  const stand = await treppen(page);
  expect(stand).toHaveLength(1);
  expect(stand[0]!.id).toBe(t1);
  expect(stand[0]!.a).toEqual(a);
  expect(stand[0]!.b).toEqual({ x: 2000, y: 9000 });
  expect(stand[0]!.width).toBe(1200);
  expect(stand[0]!.form).toBeUndefined(); // Default 'gerade' bleibt undefined (Kernel-Konvention)

  const auswahlStand = await auswahl(page);
  expect(auswahlStand).toEqual([t1]); // Auswahl bleibt (In-place, keine neue Id)

  await page.screenshot({ path: 'e2e-results/pa5-087-griff-treppe-endpunkt.png' });

  // EIN Ctrl+Z stellt exakt die alte Geometrie wieder her (EIN Command =
  // EIN Undo-Schritt, E1).
  await page.keyboard.press('Control+z');
  const nachUndo = await treppen(page);
  expect(nachUndo).toHaveLength(1);
  expect(nachUndo[0]!.id).toBe(t1);
  expect(nachUndo[0]!.a).toEqual(a);
  expect(nachUndo[0]!.b).toEqual(b);
});

test('C-3 (L-Form): Eckpunkt-Griff sichtbar und ziehbar, form/ecke bleiben nach dem Zug erhalten', async ({
  page,
}) => {
  await starteManuell(page);
  const a = { x: 2000, y: 2000 };
  const ecke = { x: 2000, y: 5000 };
  const b = { x: 5000, y: 5000 };
  const t1 = await erstelleTreppe(page, a, b, { form: 'l', ecke });
  await waehle(page, [t1]);
  await expect(page.locator('[data-testid="griff-endpunkt-a"]')).toBeVisible();
  await expect(page.locator('[data-testid="griff-endpunkt-b"]')).toBeVisible();
  await expect(page.locator('[data-testid="griff-endpunkt-ecke"]')).toBeVisible();

  await page.screenshot({ path: 'e2e-results/pa5-087-griff-treppe-l-form.png' });

  const von = await griffMitte(page, 'griff-endpunkt-ecke');
  const nach = await weltZuBildschirm(page, 2000, 4500); // Ecke Richtung a verschieben, bleibt konvex/entartungsfrei
  await ziehe(page, von, nach);

  const stand = await treppen(page);
  expect(stand).toHaveLength(1);
  expect(stand[0]!.id).toBe(t1); // gleiche Id — In-place-Patch
  expect(stand[0]!.form).toBe('l'); // form bleibt 'l'
  expect(stand[0]!.ecke).toEqual({ x: 2000, y: 4500 }); // ecke geändert
  expect(stand[0]!.a).toEqual(a); // a/b unangetastet
  expect(stand[0]!.b).toEqual(b);

  await page.keyboard.press('Control+z');
  const nachUndo = await treppen(page);
  expect(nachUndo[0]!.ecke).toEqual(ecke);
  expect(nachUndo[0]!.form).toBe('l');
});

test('C-2: zu-kurzer Zug (b nah an a) wirft eine sichtbare Fehlermeldung — Treppe bleibt unangetastet', async ({
  page,
}) => {
  await starteManuell(page);
  const a = { x: 2000, y: 2000 };
  const b = { x: 2000, y: 6000 };
  const t1 = await erstelleTreppe(page, a, b);
  await waehle(page, [t1]);
  await expect(page.locator('[data-testid="griff-endpunkt-b"]')).toBeVisible();

  // b auf 250 mm neben a ziehen — Gesamtlauf würde auf 250 mm einbrechen
  // (< 1 m), `design.treppeGeometrieSetzen` wirft VOR jedem Patch (Kernel-
  // Wurf-Regel (1), `commands/design.ts`).
  const von = await griffMitte(page, 'griff-endpunkt-b');
  const nach = await weltZuBildschirm(page, 2000, 2250);
  await ziehe(page, von, nach);

  // `meldeFehler` zeigt den Fehler über `meldung-fehler` (NICHT die
  // stationäre `fehlerzone` — Muster aus `griffe.spec.ts` C-16-Matrix-Fund).
  await expect(page.locator('[data-testid="meldung-fehler"]')).toBeVisible();

  const stand = await treppen(page);
  expect(stand).toHaveLength(1);
  expect(stand[0]!.id).toBe(t1);
  expect(stand[0]!.a).toEqual(a);
  expect(stand[0]!.b).toEqual(b); // unangetastet — kein Zwischenzustand
});

test('C-17-Muster: Griff-Klick klaut der Treppe nicht die Auswahl (kein Marquee, keine neue Id)', async ({
  page,
}) => {
  await starteManuell(page);
  const t1 = await erstelleTreppe(page, { x: 2000, y: 2000 }, { x: 2000, y: 6000 });
  await waehle(page, [t1]);
  await expect(page.locator('[data-testid="griff-endpunkt-b"]')).toBeVisible();

  const punkt = await griffMitte(page, 'griff-endpunkt-b');
  // Reiner Klick auf den Griff (kein Zug) — C-17: kein Rubber-Band startet,
  // die Treppe bleibt exakt dieselbe (Sanktion-4-Muster: Anfassen ohne
  // Bewegung ist ein Klick, kein Zug, `onGriffEnd` in DesignWorkspace).
  await page.mouse.move(punkt.x, punkt.y);
  await page.mouse.down();
  await expect(page.locator('[data-testid="plan-marquee"]')).toHaveCount(0);
  await page.mouse.up();

  await expect.poll(() => auswahl(page)).toEqual([t1]);
  const stand = await treppen(page);
  expect(stand).toHaveLength(1);
  expect(stand[0]!.id).toBe(t1); // dieselbe Id — kein ungewollter Patch
});

test('C-3: Mehrfach-Auswahl zeigt keine Treppen-Griffe (auch mit einer zweiten Treppe)', async ({ page }) => {
  await starteManuell(page);
  const t1 = await erstelleTreppe(page, { x: 2000, y: 2000 }, { x: 2000, y: 6000 });
  const t2 = await erstelleTreppe(page, { x: 8000, y: 2000 }, { x: 8000, y: 6000 });

  await waehle(page, [t1, t2]);
  await expect(page.locator('[data-testid="griff-endpunkt-a"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="griff-endpunkt-b"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="griff-endpunkt-ecke"]')).toHaveCount(0);
});
