import { expect, test, type Page } from '@playwright/test';

/**
 * PA1 (v0.8.5 «Greifbar», `docs/V085-SPEZ.md` E1/E2, Matrix C-1…C-7) —
 * Multi-Selektion + Rubber-Band im Design-Plan.
 *
 *  - Shift-Klick toggelt; Klick ohne Modifier ersetzt (Bestand).
 *  - Rubber-Band (Aufziehen auf leerer Fläche, Auswahl-Werkzeug) setzt die
 *    Menge; mit Shift additiv; Voll-Umschluss-Regel.
 *  - Esc leert die Auswahl (dritte Stufe der Esc-Folge).
 *  - Delete löscht N als EINE Undo-Gruppe — Ctrl+Z (GETIPPT, PE3-Lehre)
 *    stellt ALLE wieder her.
 *  - Drag auf einem Element der Mehrfach-Auswahl verschiebt die GANZE
 *    Gruppe als eine Undo-Gruppe.
 *  - Inspector zeigt «N Elemente».
 *  - Leertaste-Pan bleibt unberührt (kein Marquee unter Space).
 *
 * Helfer wörtlich nach `pb1-bearbeiten.spec.ts` (manuell-Oberfläche über den
 * globalen `kosmoUiV1SeedMitManuell`-Seed der playwright.config — der Plan
 * und die Auswahl-Mechanik sind in beiden Oberflächen dieselbe PlanView).
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

async function zeichneWand(page: Page, a: { x: number; y: number }, b: { x: number; y: number }): Promise<string> {
  return page.evaluate(
    ({ a, b }) => {
      const k = window.__kosmo;
      const st = k.state();
      const aw = st.doc.byKind('assembly').find((x) => (x as unknown as { name?: string }).name?.startsWith('AW'))!;
      const r = k.run('design.wandZeichnen', { storeyId: st.activeStoreyId, a, b, assemblyId: aw.id });
      return r.patches[0]!.id;
    },
    { a, b },
  );
}

/** Zwei parallele Wände mit Abstand — Standard-Aufbau der meisten Tests. */
async function zweiWaende(page: Page): Promise<[string, string]> {
  const w1 = await zeichneWand(page, { x: 4000, y: 2000 }, { x: 6000, y: 2000 });
  const w2 = await zeichneWand(page, { x: 4000, y: 5000 }, { x: 6000, y: 5000 });
  return [w1, w2];
}

const auswahl = (page: Page) => page.evaluate(() => window.__kosmo.state().selection as string[]);
const highlights = (page: Page) => page.locator('[data-testid="auswahl-highlight"]');

async function marqueeZug(page: Page, von: { x: number; y: number }, nach: { x: number; y: number }, shift = false) {
  const a = await weltZuBildschirm(page, von.x, von.y);
  const b = await weltZuBildschirm(page, nach.x, nach.y);
  if (shift) await page.keyboard.down('Shift');
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  // steps: echter Ereignisstrom statt Ein-Sprung-Move — ohne steps kann der
  // Browser die zwei Moves koaleszieren, bevor React die Vorschau rendert.
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 3 });
  await page.mouse.move(b.x, b.y, { steps: 3 });
  // Vorschau-Rechteck ist während des Zugs sichtbar.
  await expect(page.locator('[data-testid="plan-marquee"]')).toBeVisible();
  await page.mouse.up();
  if (shift) await page.keyboard.up('Shift');
}

test('C-1: Shift-Klick toggelt, Klick ohne Modifier ersetzt, Esc leert', async ({ page }) => {
  await starteManuell(page);
  const [w1, w2] = await zweiWaende(page);
  const p1 = await weltZuBildschirm(page, 5000, 2000);
  const p2 = await weltZuBildschirm(page, 5000, 5000);

  await page.mouse.click(p1.x, p1.y);
  await expect.poll(() => auswahl(page)).toEqual([w1]);
  await page.keyboard.down('Shift');
  await page.mouse.click(p2.x, p2.y);
  await page.keyboard.up('Shift');
  await expect.poll(async () => (await auswahl(page)).length).toBe(2);
  await expect(highlights(page)).toHaveCount(2);

  // Shift-Klick auf ein GEWÄHLTES Element nimmt es wieder heraus.
  // 400ms Abstand: zwei Klicks auf DENSELBEN Punkt im Doppelklick-Fenster
  // wären eine Doppelklick-Geste (eigene Bedeutung, E1) — kein Nutzer
  // toggelt schneller als das Fenster.
  await page.waitForTimeout(600);
  await page.keyboard.down('Shift');
  await page.mouse.click(p2.x, p2.y);
  await page.keyboard.up('Shift');
  await expect.poll(() => auswahl(page)).toEqual([w1]);

  // Klick ohne Modifier ersetzt (Bestandsverhalten, Sanktion 4).
  await page.waitForTimeout(600);
  await page.keyboard.down('Shift');
  await page.mouse.click(p2.x, p2.y);
  await page.keyboard.up('Shift');
  await page.waitForTimeout(600);
  await page.mouse.click(p1.x, p1.y);
  await expect.poll(() => auswahl(page)).toEqual([w1]);

  // Esc leert (Auswahl-Werkzeug aktiv, keine Kette).
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await auswahl(page)).length).toBe(0);
  await expect(highlights(page)).toHaveCount(0);
});

test('C-2: Rubber-Band setzt die Menge, Shift-Rubber-Band erweitert, Mini-Zug bleibt Leerklick', async ({ page }) => {
  await starteManuell(page);
  const [w1, w2] = await zweiWaende(page);

  // Rechteck um BEIDE Wände (Voll-Umschluss).
  await marqueeZug(page, { x: 3000, y: 1000 }, { x: 7000, y: 6000 });
  await expect.poll(async () => (await auswahl(page)).sort()).toEqual([w1, w2].sort());

  // Rechteck nur um w1 ERSETZT die Menge …
  await marqueeZug(page, { x: 3000, y: 1000 }, { x: 7000, y: 3000 });
  await expect.poll(() => auswahl(page)).toEqual([w1]);

  // … Shift-Rechteck um w2 ERWEITERT sie.
  await marqueeZug(page, { x: 3000, y: 4000 }, { x: 7000, y: 6000 }, true);
  await expect.poll(async () => (await auswahl(page)).sort()).toEqual([w1, w2].sort());

  // Nur halb umschlossen (Rechteck endet mitten in der Wand) zählt NICHT.
  await marqueeZug(page, { x: 3000, y: 1000 }, { x: 5000, y: 3000 });
  await expect.poll(async () => (await auswahl(page)).length).toBe(0);

  // Leerklick (kein echter Zug) leert weiterhin.
  await marqueeZug(page, { x: 3000, y: 1000 }, { x: 7000, y: 6000 });
  const leer = await weltZuBildschirm(page, 9000, 9000);
  await page.mouse.click(leer.x, leer.y);
  await expect.poll(async () => (await auswahl(page)).length).toBe(0);
});

test('C-4: Delete löscht die Mehrfach-Auswahl als EINE Gruppe — Ctrl+Z stellt ALLE wieder her', async ({ page }) => {
  await starteManuell(page);
  await zweiWaende(page);
  const anzahl = () => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length);

  await marqueeZug(page, { x: 3000, y: 1000 }, { x: 7000, y: 6000 });
  await expect.poll(async () => (await auswahl(page)).length).toBe(2);
  await page.keyboard.press('Delete');
  await expect.poll(anzahl).toBe(0);
  await page.keyboard.press('Control+z');
  await expect.poll(anzahl).toBe(2);
});

test('C-5: Drag auf einem Element der Mehrfach-Auswahl verschiebt die GANZE Gruppe — ein Undo-Schritt', async ({ page }) => {
  await starteManuell(page);
  const [w1, w2] = await zweiWaende(page);
  await marqueeZug(page, { x: 3000, y: 1000 }, { x: 7000, y: 6000 });
  await expect.poll(async () => (await auswahl(page)).length).toBe(2);

  const vorher = await page.evaluate(
    (ids) => ids.map((id) => (window.__kosmo.state().doc.get(id) as unknown as { a: { x: number; y: number } }).a),
    [w1, w2],
  );

  // w1 anfassen und um (+2000, +1000) Welt ziehen.
  const von = await weltZuBildschirm(page, 5000, 2000);
  const nach = await weltZuBildschirm(page, 7000, 3000);
  await page.mouse.move(von.x, von.y);
  await page.mouse.down();
  await page.mouse.move((von.x + nach.x) / 2, (von.y + nach.y) / 2);
  await page.mouse.move(nach.x, nach.y);
  await page.mouse.up();

  const nachher = await page.evaluate(
    (ids) => ids.map((id) => (window.__kosmo.state().doc.get(id) as unknown as { a: { x: number; y: number } }).a),
    [w1, w2],
  );
  const d0 = { x: nachher[0]!.x - vorher[0]!.x, y: nachher[0]!.y - vorher[0]!.y };
  const d1 = { x: nachher[1]!.x - vorher[1]!.x, y: nachher[1]!.y - vorher[1]!.y };
  expect(d0.x).not.toBe(0);
  expect(d1).toEqual(d0); // beide Wände wanderten um DENSELBEN Vektor

  // EIN Ctrl+Z hebt den kompletten Gruppen-Zug auf.
  await page.keyboard.press('Control+z');
  const zurueck = await page.evaluate(
    (ids) => ids.map((id) => (window.__kosmo.state().doc.get(id) as unknown as { a: { x: number; y: number } }).a),
    [w1, w2],
  );
  expect(zurueck).toEqual(vorher);
});

test('C-6: Inspector zeigt «N Elemente» + Alle löschen bei Mehrfach-Auswahl', async ({ page }) => {
  await starteManuell(page);
  await zweiWaende(page);
  await marqueeZug(page, { x: 3000, y: 1000 }, { x: 7000, y: 6000 });
  await expect(page.locator('[data-testid="inspector-mehrfach-anzahl"]')).toContainText('2 Elemente');
  await page.click('[data-testid="inspector-mehrfach-loeschen"]');
  await expect.poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length)).toBe(0);
  await page.keyboard.press('Control+z');
  await expect.poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length)).toBe(2);
});

test('C-2/Pan: Leertaste-Pan bleibt unberührt — kein Marquee, keine Auswahl-Änderung', async ({ page }) => {
  await starteManuell(page);
  await zweiWaende(page);
  const von = await weltZuBildschirm(page, 3000, 1000);
  // Fokus vom view-2d-BUTTON wegnehmen: `darfPannen()` (PlanView) ignoriert
  // Space, solange ein Button fokussiert ist (er würde sonst «klicken») —
  // ein Leerklick in den Plan verschiebt den Fokus, wie es ein echter
  // Nutzer vor dem Pan auch täte.
  await page.mouse.click(von.x, von.y);
  await page.waitForTimeout(100);
  await page.keyboard.down('Space');
  await page.mouse.move(von.x, von.y);
  await page.mouse.down();
  await page.mouse.move(von.x + 120, von.y + 80);
  await expect(page.locator('[data-testid="plan-marquee"]')).toHaveCount(0);
  await page.mouse.up();
  await page.keyboard.up('Space');
  await expect.poll(async () => (await auswahl(page)).length).toBe(0);
});
