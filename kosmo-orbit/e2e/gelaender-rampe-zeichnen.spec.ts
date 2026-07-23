import { expect, test, type Page } from '@playwright/test';

/**
 * v0.9.1 P-B1 «Zeichnen + Griffe» (`docs/V091-SPEZ.md` §P-B1, Cluster B) —
 * die zwei neuen Klickmodi am lebenden Objekt plus ihre Griffe:
 *   - Geländer: Klickkette (Muster Messen, E2 v0.8.3) → EIN
 *     `design.gelaenderZeichnen` beim Abschluss (Escape/Doppelklick/Enter),
 *     Werte aus der Insel-Vorgabe (`gelaenderVorgabeLesen`, P-B2).
 *   - Rampe: Zwei-Punkt (Muster Schnitt/Wand) → `design.rampeZeichnen` beim
 *     zweiten Klick, width/hoehenDelta aus der Insel-Vorgabe.
 *   - Griffe: Geländer-Punkt-Griffe (Muster Masskette, IN PLACE über
 *     `design.gelaenderGeometrieSetzen`) und Rampen-a/b-Griffe (Muster
 *     Wand/Unterzug, `design.rampeGeometrieSetzen` mit ehrlichem
 *     Steigungs-Gate im Kernel).
 * Jeder Zeichen-Fall beweist den Undo-Roundtrip über den echten
 * `useProject().undo()`-Weg (Command → Patch → Undo, kein Mock).
 *
 * Diese Spec setzt den globalen Manuell-Seed ausser Kraft (Muster
 * `masskette-kommentar.spec.ts`) — die Werkzeuge werden über die
 * ZEICHNEN-Insel aktiviert (P-B2-Katalog, `island-werkzeug-gelaender`/
 * `-rampe`), die Griffe funktionieren in derselben PlanView.
 */

test.use({ storageState: { cookies: [], origins: [] } });

interface KosmoTestHook {
  run: (commandId: string, params: unknown) => { patches: { id: string }[] };
  state: () => {
    activeStoreyId: string | null;
    selection: string[];
    select: (ids: string[]) => void;
    undo: () => void;
    doc: { byKind: (kind: string) => Record<string, unknown>[] };
  };
}

declare global {
  interface Window {
    __kosmo: KosmoTestHook;
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

/** Hover, NICHT Klick — s. `island-verdrahtung.spec.ts`-Kopfkommentar. */
async function oeffneInsel(page: Page, island: string): Promise<void> {
  await page.hover(`[data-testid="island-${island}-pill"]`);
  await expect(page.locator(`[data-testid="island-${island}-leiste"]`)).toBeVisible();
}

/** Welt-mm → Bildschirm über getScreenCTM (Muster masskette-kommentar.spec.ts). */
async function weltZuBildschirm(page: Page, punkt: { x: number; y: number }): Promise<{ x: number; y: number }> {
  return page.evaluate((p) => {
    const svg = document.querySelector('[data-testid="planview"]') as SVGSVGElement;
    const g = svg.querySelector('g') as SVGGElement;
    const pt = svg.createSVGPoint();
    pt.x = p.x;
    pt.y = -p.y;
    const transformed = pt.matrixTransform(g.getScreenCTM()!);
    return { x: transformed.x, y: transformed.y };
  }, punkt);
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

test.describe('v0.9.1 P-B1 — Geländer-Klickkette + Rampen-Zwei-Punkt + Griffe', () => {
  test('Geländer: Klickkette + Escape committet design.gelaenderZeichnen mit Insel-Vorgaben — Undo entfernt es, Overlay zeigt es', async ({ page }) => {
    await ueberspringeOnboarding(page);
    await page.click('[data-testid="module-design"]');

    await oeffneInsel(page, 'zeichnen');
    await page.click('[data-testid="island-werkzeug-gelaender"]');

    const p1 = await weltZuBildschirm(page, { x: -2000, y: -1000 });
    const p2 = await weltZuBildschirm(page, { x: 1000, y: -1000 });
    const p3 = await weltZuBildschirm(page, { x: 1000, y: 2000 });
    await page.mouse.click(p1.x, p1.y);
    await page.mouse.click(p2.x, p2.y);
    await page.mouse.click(p3.x, p3.y);
    // Escape schliesst die Kette ab (dieselbe Abschluss-Semantik wie Messen:
    // committen statt verwerfen) — GENAU EIN design.gelaenderZeichnen.
    await page.keyboard.press('Escape');

    const gelaender = await page.evaluate(
      () => window.__kosmo.state().doc.byKind('gelaender') as unknown as { id: string; punkte: unknown[]; hoehe: number; art: string }[],
    );
    expect(gelaender).toHaveLength(1);
    expect(gelaender[0]!.punkte).toHaveLength(3);
    // Insel-Vorgabewerte (P-B2-Defaults): 1000 mm, staketen.
    expect(gelaender[0]!.hoehe).toBe(1000);
    expect(gelaender[0]!.art).toBe('staketen');
    // Interaktives Overlay (App-Overlay nach Masskette-Vorbild, NICHT derivePlan).
    await expect(page.locator('[data-testid="plan-gelaender"]')).toHaveCount(1);

    await page.screenshot({ path: 'test-results/pb1-091-gelaender-kette.png' });

    await page.evaluate(() => window.__kosmo.state().undo());
    expect(await page.evaluate(() => window.__kosmo.state().doc.byKind('gelaender').length)).toBe(0);
    await expect(page.locator('[data-testid="plan-gelaender"]')).toHaveCount(0);
  });

  test('Rampe: zwei Klicks committen design.rampeZeichnen (Fuss→Kopf, Insel-Vorgaben) — Undo entfernt sie, Overlay zeigt Kontur+Pfeil', async ({ page }) => {
    await ueberspringeOnboarding(page);
    await page.click('[data-testid="module-design"]');

    await oeffneInsel(page, 'zeichnen');
    await page.click('[data-testid="island-werkzeug-rampe"]');

    const fuss = await weltZuBildschirm(page, { x: -1500, y: 0 });
    const kopf = await weltZuBildschirm(page, { x: 1500, y: 0 });
    await page.mouse.click(fuss.x, fuss.y);
    await page.mouse.click(kopf.x, kopf.y);

    const rampen = await page.evaluate(
      () => window.__kosmo.state().doc.byKind('ramp') as unknown as { id: string; a: { x: number }; b: { x: number }; width: number; hoehenDelta: number }[],
    );
    expect(rampen).toHaveLength(1);
    // Insel-Vorgabewerte (P-B2-Defaults): width 1200, hoehenDelta 170 —
    // 170 mm auf ~3 m Lauf = ~5.7 % Steigung, unter der 6-%-Hinweisgrenze.
    expect(rampen[0]!.width).toBe(1200);
    expect(rampen[0]!.hoehenDelta).toBe(170);
    expect(rampen[0]!.a.x).toBeLessThan(rampen[0]!.b.x); // Fuss links, Kopf rechts
    await expect(page.locator('[data-testid="plan-rampe"]')).toHaveCount(1);

    await page.screenshot({ path: 'test-results/pb1-091-rampe-zweipunkt.png' });

    await page.evaluate(() => window.__kosmo.state().undo());
    expect(await page.evaluate(() => window.__kosmo.state().doc.byKind('ramp').length)).toBe(0);
  });

  test('Geländer-Griff: Punkt-Zug läuft IN PLACE (Id bleibt), Undo stellt den Punkt wieder her', async ({ page }) => {
    await ueberspringeOnboarding(page);
    await page.click('[data-testid="module-design"]');

    const punkte = [
      { x: -2000, y: -1000 },
      { x: 0, y: -1000 },
      { x: 2000, y: 1000 },
    ];
    const id = await page.evaluate((pts) => {
      const k = window.__kosmo;
      const st = k.state();
      const r = k.run('design.gelaenderZeichnen', { storeyId: st.activeStoreyId, punkte: pts, hoehe: 1000, art: 'staketen' });
      return r.patches[0]!.id;
    }, punkte);
    await page.evaluate((gid) => window.__kosmo.state().select([gid]), id);
    await expect(page.locator('[data-testid="griff-gelaender-punkt-1"]')).toBeVisible();

    const von = await griffMitte(page, 'griff-gelaender-punkt-1');
    const nach = await weltZuBildschirm(page, { x: 500, y: 1500 });
    await ziehe(page, von, nach);

    const nachher = await page.evaluate(
      () => window.__kosmo.state().doc.byKind('gelaender') as unknown as { id: string; punkte: { x: number; y: number }[] }[],
    );
    expect(nachher).toHaveLength(1);
    expect(nachher[0]!.id).toBe(id); // IN PLACE — keine neue Entity-Id
    expect(nachher[0]!.punkte[1]).toEqual({ x: 500, y: 1500 });
    expect(nachher[0]!.punkte[0]).toEqual(punkte[0]);
    expect(nachher[0]!.punkte[2]).toEqual(punkte[2]);

    await page.evaluate(() => window.__kosmo.state().undo());
    const nachUndo = await page.evaluate(
      () => window.__kosmo.state().doc.byKind('gelaender') as unknown as { punkte: { x: number; y: number }[] }[],
    );
    expect(nachUndo[0]!.punkte[1]).toEqual(punkte[1]);
  });

  test('Rampen-Griff: b-Zug läuft IN PLACE; ein Zug in die >15-%-Steigung wird EHRLICH abgelehnt (Rampe unverändert)', async ({ page }) => {
    await ueberspringeOnboarding(page);
    await page.click('[data-testid="module-design"]');

    const id = await page.evaluate(() => {
      const k = window.__kosmo;
      const st = k.state();
      // 170 mm Delta auf 4 m Lauf = 4.25 % — bequem unter jeder Grenze.
      const r = k.run('design.rampeZeichnen', { storeyId: st.activeStoreyId, a: { x: -2000, y: 0 }, b: { x: 2000, y: 0 }, width: 1200, hoehenDelta: 170 });
      return r.patches[0]!.id;
    });
    await page.evaluate((rid) => window.__kosmo.state().select([rid]), id);
    await expect(page.locator('[data-testid="griff-endpunkt-a"]')).toBeVisible();
    await expect(page.locator('[data-testid="griff-endpunkt-b"]')).toBeVisible();

    // (1) Gültiger Zug: b nach (2000, 1000) — Lauf bleibt >> 0.5 m, Steigung klein.
    const von = await griffMitte(page, 'griff-endpunkt-b');
    const nach = await weltZuBildschirm(page, { x: 2000, y: 1000 });
    await ziehe(page, von, nach);

    const nachZug = await page.evaluate(
      () => window.__kosmo.state().doc.byKind('ramp') as unknown as { id: string; a: { x: number; y: number }; b: { x: number; y: number } }[],
    );
    expect(nachZug).toHaveLength(1);
    expect(nachZug[0]!.id).toBe(id); // IN PLACE
    expect(nachZug[0]!.b).toEqual({ x: 2000, y: 1000 });
    expect(nachZug[0]!.a).toEqual({ x: -2000, y: 0 });

    // (2) Ehrliches Gate: ein Zug, der den Lauf auf ~0.75 m verkürzt (170 mm
    // Delta → ~22.7 % Steigung > 15 %) wird im Kernel abgelehnt — die Rampe
    // bleibt byte-gleich stehen, keine stille Klemmung.
    const von2 = await griffMitte(page, 'griff-endpunkt-b');
    const zuSteil = await weltZuBildschirm(page, { x: -1250, y: 0 });
    await ziehe(page, von2, zuSteil);

    const nachAblehnung = await page.evaluate(
      () => window.__kosmo.state().doc.byKind('ramp') as unknown as { b: { x: number; y: number } }[],
    );
    expect(nachAblehnung[0]!.b).toEqual({ x: 2000, y: 1000 }); // unverändert
    // Der ehrliche Grund erreicht den Architekten als Fehler-Meldung.
    await expect(page.locator('[data-testid="meldung-fehler"]').last()).toContainText('15');

    await page.screenshot({ path: 'test-results/pb1-091-rampe-griff-gate.png' });
  });
});
