import { expect, test, type Page } from '@playwright/test';

/**
 * v0.9.0 E-K27a (`docs/V090-SPEZ.md`, Owner-Register K27 ANZEIGE-Ebene):
 * Plan-Schrift muss am BILDSCHIRM im Band 1.8–5 mm bleiben («wie archicad,
 * das es leserlich ist») statt welt-fix mit dem Zoom zu wachsen/schrumpfen.
 *
 * Drei Beweise gegen `PlanView.tsx` (`zoomTextFs`, `dim-verdichtet`,
 * Masskette-Spiegel):
 *   (a) Band: das Bemassungs-Label der Leibungs-Segmentkette (role «oeffnung» — die EINE Kette, die ohne Öffnungen/Achsen rendert: Ticks = Wandenden) misst an der LESEGRENZE
 *       (scale ≈ 0.02, letzte LOD-Stufe «mittel» — darunter blendet
 *       `planLod` die Dims ohnehin aus) und bei MAXIMAL-Zoom (scale = 1)
 *       beide Male 6.8–18.9 px auf dem Schirm — ohne Klammer wären es
 *       ~5.5 px bzw. 280 px.
 *   (b) Verdichtung: passt ein Mass nicht mehr zwischen seine Ticks
 *       (300-mm-Segment an der Lesegrenze), wird es zum Punktsymbol
 *       `dim-verdichtet` statt sich mit Nachbarn zu überlagern; voll
 *       hineingezoomt kehrt der Text zurück (0 Punkte).
 *   (c) Masskette-Spiegel: die Mess-Entität zeigt am Bildschirm eine echte
 *       Masslinie mit Verlängerungslinien und PRO-SEGMENT-Labels
 *       (`mk-masslinie`/`mk-hilfslinie`), zoom-neutral — die
 *       Hilfslinien-Länge in Schirm-px ist bei beiden Zoom-Extremen gleich.
 *
 * Die Schirm-px werden über `getScreenCTM()` des Plan-Transform-`<g>`
 * gemessen (font-size-Attribut × ctm.a) — exakt die Transformation, die die
 * App selbst anwendet (Muster `masskette-kommentar.spec.ts`).
 */

// 1.8–5 mm bei 96 dpi — dieselben Konstanten wie `zoomTextFs` in PlanView.
const PX_PRO_MM = 96 / 25.4;
const BAND_MIN_PX = 1.8 * PX_PRO_MM; // ≈ 6.80
const BAND_MAX_PX = 5 * PX_PRO_MM; // ≈ 18.90

interface KosmoTestHook {
  run: (commandId: string, params: unknown) => { patches: { id: string }[] };
  state: () => {
    activeStoreyId: string | null;
    doc: { byKind: (kind: string) => Record<string, unknown>[] };
  };
}

async function ueberspringeOnboarding(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
}

/** Wand über den echten Command-Weg zeichnen (Muster `masskette-kommentar.spec.ts`). */
async function zeichneWand(page: Page, a: { x: number; y: number }, b: { x: number; y: number }): Promise<void> {
  await page.evaluate(
    ({ a, b }) => {
      const k = (window as unknown as { __kosmo: KosmoTestHook }).__kosmo;
      const st = k.state();
      const aufbauten = st.doc.byKind('assembly') as { id: string; name?: string }[];
      const aufbau = aufbauten.find((x) => x.name === 'AW Beton 36') ?? aufbauten[0]!;
      k.run('design.wandZeichnen', { storeyId: st.activeStoreyId!, a, b, assemblyId: aufbau.id });
    },
    { a, b },
  );
}

/** Schirm-Grösse eines SVG-Texts: font-size-Attribut × Plan-CTM-Skala. */
async function schriftSchirmPx(page: Page, selector: string): Promise<number> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error(`kein Element: ${sel}`);
    const svg = document.querySelector('[data-testid="planview"]') as SVGSVGElement;
    const g = svg.querySelector('g') as SVGGElement;
    return parseFloat(el.getAttribute('font-size')!) * g.getScreenCTM()!.a;
  }, selector);
}

async function planScale(page: Page): Promise<number> {
  return page.evaluate(() => {
    const svg = document.querySelector('[data-testid="planview"]') as SVGSVGElement;
    return (svg.querySelector('g') as SVGGElement).getScreenCTM()!.a;
  });
}

/**
 * Zoomt über echte Wheel-Events auf der Planmitte bis an die obere Klemme
 * (PlanView: scale ∈ [0.005, 1], factor = exp(-deltaY·0.0012)).
 */
async function zoomeVollRein(page: Page): Promise<void> {
  const box = (await page.locator('[data-testid="planview"]').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -6000);
  await expect.poll(async () => planScale(page), { timeout: 5000 }).toBeCloseTo(1, 2);
}

/**
 * Zoomt in kleinen Wheel-Schritten (factor ≈ 0.887) heraus, bis
 * scale ≤ 0.021 — landet damit deterministisch in (0.0186, 0.021]:
 * unterhalb der ungeklammerten Lesbarkeit (280·0.02 ≈ 5.6 px), aber noch
 * ≥ 18 px/m, sodass die LOD-Stufe «mittel» die Dims sichtbar lässt
 * (`planLod`-Abstieg auf «fern» erst < 0.018).
 */
async function zoomeAnLesegrenze(page: Page): Promise<void> {
  const box = (await page.locator('[data-testid="planview"]').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < 80; i++) {
    if ((await planScale(page)) <= 0.021) break;
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(30);
  }
  const scale = await planScale(page);
  expect(scale).toBeLessThanOrEqual(0.021);
  expect(scale).toBeGreaterThan(0.018);
}

test.describe('E-K27a — Zoom-stabile Plan-Schrift (Band 1.8–5 mm)', () => {
  test('(a) Bemassungs-Label bleibt bei beiden Zoom-Extremen im Schirm-Band', async ({ page }) => {
    await ueberspringeOnboarding(page);
    await page.click('[data-testid="module-design"]');
    await zeichneWand(page, { x: -4000, y: 0 }, { x: 4000, y: 0 });

    const sel = '[data-testid="dim-kette-oeffnung"] text';
    await expect(page.locator(sel).first()).toBeAttached();

    await zoomeAnLesegrenze(page);
    const scaleRaus = await planScale(page);
    const pxRaus = await schriftSchirmPx(page, sel);
    expect(pxRaus).toBeGreaterThanOrEqual(BAND_MIN_PX - 1);
    expect(pxRaus).toBeLessThanOrEqual(BAND_MAX_PX + 1);
    await page.screenshot({ path: 'test-results/ek27a-zoom-raus.png' });

    await zoomeVollRein(page);
    const scaleRein = await planScale(page);
    const pxRein = await schriftSchirmPx(page, sel);
    expect(pxRein).toBeGreaterThanOrEqual(BAND_MIN_PX - 1);
    expect(pxRein).toBeLessThanOrEqual(BAND_MAX_PX + 1);
    await page.screenshot({ path: 'test-results/ek27a-zoom-rein.png' });

    // Beweis, dass die Klammer WIRKT (nicht bloss zufällig im Band): die
    // WELT-font-size muss zwischen den Zoomstufen deutlich auseinanderliegen
    // (Faktor scale ≈ 50) — ungeklammert wäre sie an beiden Stellen 280.
    expect(pxRaus / scaleRaus).toBeGreaterThan((pxRein / scaleRein) * 10);
  });

  test('(b) Verdichtung: enges Mass wird zum Punktsymbol statt Überlagerung — und kehrt beim Hineinzoomen zurück', async ({ page }) => {
    await ueberspringeOnboarding(page);
    await page.click('[data-testid="module-design"]');
    // Zwei kollineare Südwände → Aussenketten-Segmente 8000 / 300 / 300 mm.
    await zeichneWand(page, { x: -4000, y: 0 }, { x: 4000, y: 0 });
    await zeichneWand(page, { x: 4300, y: 0 }, { x: 4600, y: 0 });
    await expect(page.locator('[data-testid="dim-kette-oeffnung"]').first()).toBeAttached();

    // An der Lesegrenze (scale ≈ 0.02) klemmt die Schrift auf 1.8 mm →
    // Welt-fs ≈ 340; das «30»-Label (≈ 422 Welt-mm breit) passt nicht in
    // sein 300-mm-Segment → Punkt.
    await zoomeAnLesegrenze(page);
    expect(await page.locator('[data-testid="dim-verdichtet"]').count()).toBeGreaterThanOrEqual(1);
    // Das 8-m-Mass bleibt dabei als Text lesbar (keine Pauschal-Ausblendung).
    expect(await page.locator('[data-testid="dim-kette-oeffnung"] text').count()).toBeGreaterThanOrEqual(1);
    await page.screenshot({ path: 'test-results/ek27a-verdichtet.png' });

    // Voll hinein: Welt-fs ≈ 18.9 → «30» passt locker in 300 mm → 0 Punkte.
    await zoomeVollRein(page);
    await expect(page.locator('[data-testid="dim-verdichtet"]')).toHaveCount(0);
  });

  test('(c) Masskette-Spiegel: Offset-Masslinie + Verlängerungslinien + Pro-Segment-Labels, zoom-neutral', async ({ page }) => {
    await ueberspringeOnboarding(page);
    await page.click('[data-testid="module-design"]');
    await page.evaluate(() => {
      const k = (window as unknown as { __kosmo: KosmoTestHook }).__kosmo;
      k.run('design.massKetteSetzen', {
        storeyId: k.state().activeStoreyId!,
        punkte: [
          { x: -2000, y: -1500 },
          { x: 1000, y: 500 },
          { x: 3000, y: -500 },
        ],
      });
    });

    const kette = page.locator('[data-testid="plan-masskette"]');
    await expect(kette).toBeAttached();
    // 3 Punkte → 2 Segmente: je Masslinie + 2 Hilfslinien + EIN Label.
    await expect(kette.locator('[data-testid="mk-masslinie"]')).toHaveCount(2);
    await expect(kette.locator('[data-testid="mk-hilfslinie"]')).toHaveCount(4);
    await expect(kette.locator('text')).toHaveCount(2);
    // Segment 1: hypot(3000, 2000) ≈ 3606 mm → «3.606 m» (formatLength).
    await expect(kette.locator('text').first()).toHaveText('3.606 m');

    // Zoom-Neutralität: Hilfslinien-Schirm-Länge (Welt-Länge × scale) ist an
    // beiden Klemm-Extremen dieselbe Konstante (abstand+ueberstand−luft = 30 px).
    const hilfslinieSchirmPx = () =>
      page.evaluate(() => {
        const l = document.querySelector('[data-testid="mk-hilfslinie"]') as SVGLineElement;
        const svg = document.querySelector('[data-testid="planview"]') as SVGSVGElement;
        const scale = (svg.querySelector('g') as SVGGElement).getScreenCTM()!.a;
        const dx = l.x2.baseVal.value - l.x1.baseVal.value;
        const dy = l.y2.baseVal.value - l.y1.baseVal.value;
        return Math.hypot(dx, dy) * scale;
      });
    await zoomeAnLesegrenze(page);
    const pxRaus = await hilfslinieSchirmPx();
    await zoomeVollRein(page);
    const pxRein = await hilfslinieSchirmPx();
    expect(pxRaus).toBeCloseTo(30, 0);
    expect(pxRein).toBeCloseTo(30, 0);
    await page.screenshot({ path: 'test-results/ek27a-masskette-spiegel.png' });
  });
});
