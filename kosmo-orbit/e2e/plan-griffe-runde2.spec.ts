import { expect, test, type Page } from '@playwright/test';

/**
 * P-A3 (v0.8.11 «Inselgleich», `docs/V0811-SPEZ.md` §2 E3, Matrix C-5) —
 * Plan-Griffe Runde 2: Decken-Ecken (`griff-eckpunkt-<i>`, Muster zone) und
 * Unterzug-a/b (`griff-endpunkt-a/b`, Muster wall/stair). Beide committen
 * IN PLACE über die neuen Kernel-Setter `design.deckeGeometrieSetzen` /
 * `design.unterzugGeometrieSetzen` — die Beweise hier prüfen darum
 * ausdrücklich, dass Aussparung (Decke) bzw. Etikett (Unterzug) den Zug
 * überleben und EIN Undo reicht.
 *
 * Helfer wörtlich nach `e2e/griffe.spec.ts` (dort nach multi-auswahl.spec)
 * — Design bleibt unter dem globalen Manuell-Seed, dieselbe PlanView.
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[] };
      state: () => {
        doc: { byKind: (k: string) => unknown[]; get: (id: string) => unknown };
        activeStoreyId: string;
        selection: string[];
        select: (ids: string[]) => void;
        history: { undo: () => void };
      };
    };
  }
}

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

const waehle = (page: Page, ids: string[]) => page.evaluate((ids) => window.__kosmo.state().select(ids), ids);

test('Decken-Ecken-Griff: Zug ändert genau die Ecke IN PLACE — Aussparung überlebt, EIN Undo stellt zurück', async ({
  page,
}) => {
  await starteManuell(page);
  const { slabId, aussparungId } = await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    const slab = k.run('design.deckeZeichnen', {
      storeyId: st.activeStoreyId,
      outline: [
        { x: 1000, y: 1000 },
        { x: 7000, y: 1000 },
        { x: 7000, y: 5000 },
        { x: 1000, y: 5000 },
      ],
    });
    const slabId = slab.patches[0]!.id;
    const a = k.run('design.aussparungSetzen', { hostId: slabId, at: { x: 4000, y: 3000 }, breite: 800, hoehe: 800 });
    return { slabId, aussparungId: a.patches[0]!.id };
  });

  await waehle(page, [slabId]);
  await expect(page.locator('[data-testid="griff-eckpunkt-2"]')).toBeVisible();

  const von = await griffMitte(page, 'griff-eckpunkt-2');
  const nach = await weltZuBildschirm(page, 8000, 6000);
  await ziehe(page, von, nach);

  const nachher = await page.evaluate(
    ({ slabId, aussparungId }) => {
      const st = window.__kosmo.state();
      const slab = st.doc.get(slabId) as { id: string; outline: { x: number; y: number }[] } | undefined;
      return { outline: slab?.outline, slabDa: !!slab, aussparungDa: !!st.doc.get(aussparungId) };
    },
    { slabId, aussparungId },
  );
  // In place: dieselbe Id, nur Ecke 2 neu — und die Aussparung lebt noch
  // (das Löschen+Neusetzen-Muster hätte sie kaskadiert entfernt).
  expect(nachher.slabDa).toBe(true);
  expect(nachher.aussparungDa).toBe(true);
  expect(nachher.outline![2]).toEqual({ x: 8000, y: 6000 });
  expect(nachher.outline![0]).toEqual({ x: 1000, y: 1000 });

  await page.keyboard.press('Control+z');
  const nachUndo = await page.evaluate(
    (slabId) => (window.__kosmo.state().doc.get(slabId) as { outline: { x: number; y: number }[] }).outline,
    slabId,
  );
  expect(nachUndo[2]).toEqual({ x: 7000, y: 5000 });
});

test('Unterzug-a/b-Griffe: b-Zug IN PLACE — Etikett überlebt, breite/hoehe bleiben, EIN Undo stellt zurück', async ({
  page,
}) => {
  await starteManuell(page);
  const { beamId, etikettId } = await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    const bm = k.run('design.unterzugZeichnen', {
      storeyId: st.activeStoreyId,
      a: { x: 1000, y: 3000 },
      b: { x: 7000, y: 3000 },
      breite: 300,
      hoehe: 400,
    });
    const beamId = bm.patches[0]!.id;
    const et = k.run('design.etikettSetzen', { targetId: beamId, at: { x: 4000, y: 2400 }, inhalt: 'aufbau' });
    return { beamId, etikettId: et.patches[0]!.id };
  });

  await waehle(page, [beamId]);
  await expect(page.locator('[data-testid="griff-endpunkt-a"]')).toBeVisible();
  await expect(page.locator('[data-testid="griff-endpunkt-b"]')).toBeVisible();

  const von = await griffMitte(page, 'griff-endpunkt-b');
  const nach = await weltZuBildschirm(page, 6000, 5000);
  await ziehe(page, von, nach);

  const nachher = await page.evaluate(
    ({ beamId, etikettId }) => {
      const st = window.__kosmo.state();
      const beam = st.doc.get(beamId) as
        | { a: { x: number; y: number }; b: { x: number; y: number }; breite: number; hoehe: number }
        | undefined;
      return { beam, etikettDa: !!st.doc.get(etikettId) };
    },
    { beamId, etikettId },
  );
  expect(nachher.beam).toBeDefined();
  expect(nachher.etikettDa).toBe(true);
  expect(nachher.beam!.a).toEqual({ x: 1000, y: 3000 });
  expect(nachher.beam!.b).toEqual({ x: 6000, y: 5000 });
  expect(nachher.beam!.breite).toBe(300);
  expect(nachher.beam!.hoehe).toBe(400);

  await page.keyboard.press('Control+z');
  const nachUndo = await page.evaluate(
    (beamId) => (window.__kosmo.state().doc.get(beamId) as { b: { x: number; y: number } }).b,
    beamId,
  );
  expect(nachUndo).toEqual({ x: 7000, y: 3000 });
});

test('Griff-Klick ohne Bewegung ist ein Klick, kein Zug (Sanktion-4-Erbe) — Decke bleibt byte-gleich', async ({
  page,
}) => {
  await starteManuell(page);
  const slabId = await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    return k.run('design.deckeZeichnen', {
      storeyId: st.activeStoreyId,
      outline: [
        { x: 2000, y: 2000 },
        { x: 6000, y: 2000 },
        { x: 6000, y: 5000 },
        { x: 2000, y: 5000 },
      ],
    }).patches[0]!.id;
  });
  await waehle(page, [slabId]);
  const vorher = await page.evaluate(
    (id) => JSON.stringify((window.__kosmo.state().doc.get(id) as { outline: unknown }).outline),
    slabId,
  );
  const p = await griffMitte(page, 'griff-eckpunkt-0');
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.up();
  const nachher = await page.evaluate(
    (id) => JSON.stringify((window.__kosmo.state().doc.get(id) as { outline: unknown }).outline),
    slabId,
  );
  expect(nachher).toBe(vorher);
});
