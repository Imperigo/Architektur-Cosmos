import { expect, test, type Page } from '@playwright/test';

/**
 * v0.8.3 P3 «Island §8 (E1–E4)», neue Spec (`docs/V083-SPEZ.md` §1-§3) — die
 * drei neuen Klickmodi am lebenden Objekt:
 *   - Öffnung (E3, §3.2): Klick auf eine Wand → `design.oeffnungSetzen`
 *     (Wand-Treffer + `oeffnungVorgabe`-Werte aus der ZEICHNEN-Insel).
 *   - Messen (E2, §2.4): Klickkette → `design.massKetteSetzen`, abgeschlossen
 *     über Escape (getestet hier) oder Doppelklick (derselbe Commit-Pfad,
 *     `massKetteAbschliessen()` in `DesignWorkspace.tsx`).
 *   - Kommentar (E1, §1.4): Klick setzt NUR den Punkt (`kommentarPunkt`-
 *     UI-Brücke, `state/ui-zustand.ts`) — das Erfassen-Formular der
 *     PROJEKT-Insel committet `design.kommentarSetzen` erst nach Text/Autor.
 *
 * Jeder Fall beweist zusätzlich den Undo-Roundtrip über den echten
 * `useProject().undo()`-Weg (Command → Patch → Undo, kein Mock).
 *
 * **Diese Spec setzt den globalen Manuell-Seed selbst ausser Kraft**
 * (`test.use({ storageState: { cookies: [], origins: [] } })`, Muster
 * `island-verdrahtung.spec.ts`/`island-inhalte-*.spec.ts`) — nur so startet
 * die App im echten Island-Default (§8-5/§8-6/§8-7 sind Island-Werkzeuge).
 */

test.use({ storageState: { cookies: [], origins: [] } });

interface KosmoTestHook {
  run: (commandId: string, params: unknown) => { patches: { id: string }[] };
  state: () => {
    activeStoreyId: string | null;
    undo: () => void;
    doc: {
      byKind: (kind: string) => Record<string, unknown>[];
      settings: unknown;
    };
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

/** Hover, NICHT Klick — s. `island-verdrahtung.spec.ts`-Kopfkommentar
 *  («.click() bewegt die Maus zuerst auf die Pill, was onMouseEnter SCHON
 *  auslöst — der eigentliche Klick trifft danach ins Leere»). */
async function oeffneInsel(page: Page, island: string): Promise<void> {
  await page.hover(`[data-testid="island-${island}-pill"]`);
  await expect(page.locator(`[data-testid="island-${island}-leiste"]`)).toBeVisible();
}

/**
 * Wandelt einen Welt-mm-Punkt in Bildschirm-Koordinaten um — exakt dieselbe
 * Transformation, die `PlanView.tsx`s äusserstes `<g transform="…">`
 * (Zeile ~974: `translate(w/2,h/2) scale(view.scale) translate(-cx,cy)`)
 * anwendet, hier über `getScreenCTM()` statt eine zweite, potenziell
 * abdriftende JS-Rechnung zu pflegen. `y` wird negiert (Plan-Konvention
 * überall in `PlanView.tsx`: `y={-p.y}`).
 */
async function weltZuBildschirm(page: Page, punkt: { x: number; y: number }): Promise<{ x: number; y: number }> {
  return page.evaluate((p) => {
    const svg = document.querySelector('[data-testid="planview"]') as SVGSVGElement;
    const g = svg.querySelector('g') as SVGGElement;
    const pt = svg.createSVGPoint();
    pt.x = p.x;
    pt.y = -p.y;
    const ctm = g.getScreenCTM()!;
    const transformed = pt.matrixTransform(ctm);
    return { x: transformed.x, y: transformed.y };
  }, punkt);
}

test.describe('v0.8.3 P3 — Öffnung/Messen/Kommentar Klickmodi (E1-E3)', () => {
  test('Öffnung: Klick auf eine Wand ruft design.oeffnungSetzen über den echten Klickmodus auf — Undo entfernt sie wieder', async ({ page }) => {
    await ueberspringeOnboarding(page);
    await page.click('[data-testid="module-design"]');

    const wallId = await page.evaluate(() => {
      const k = (window as unknown as { __kosmo: KosmoTestHook }).__kosmo;
      const st = k.state();
      const storeyId = st.activeStoreyId!;
      const aufbauten = st.doc.byKind('assembly') as { id: string; name?: string }[];
      const aufbau = aufbauten.find((a) => a.name === 'AW Beton 36') ?? aufbauten[0]!;
      const r = k.run('design.wandZeichnen', {
        storeyId,
        a: { x: -4000, y: 0 },
        b: { x: 4000, y: 0 },
        assemblyId: aufbau.id,
      });
      return r.patches[0]!.id;
    });

    await oeffneInsel(page, 'zeichnen');
    await page.click('[data-testid="island-werkzeug-oeffnung"]');
    await expect(page.locator('[data-testid="island-oeffnung-popup"]')).toBeVisible();

    // Klick auf die Wandmitte (Welt (0,0) → Wand-lokal center=4000, Aufbau
    // 360mm dick, Vorgabe-Fensterbreite 1200mm passt bequem in die 8m-Wand).
    const screen = await weltZuBildschirm(page, { x: 0, y: 0 });
    await page.mouse.click(screen.x, screen.y);

    const oeffnungenNachher = await page.evaluate((wId) => {
      const k = (window as unknown as { __kosmo: KosmoTestHook }).__kosmo;
      return (k.state().doc.byKind('opening') as { wallId: string; center: number; openingType: string }[]).filter(
        (o) => o.wallId === wId,
      );
    }, wallId);
    expect(oeffnungenNachher).toHaveLength(1);
    expect(oeffnungenNachher[0]!.openingType).toBe('fenster'); // Default-Vorgabe
    expect(oeffnungenNachher[0]!.center).toBeGreaterThan(3400);
    expect(oeffnungenNachher[0]!.center).toBeLessThan(4600);

    await page.screenshot({ path: 'test-results/p3-083-oeffnung-klickmodus.png' });

    await page.evaluate(() => (window as unknown as { __kosmo: KosmoTestHook }).__kosmo.state().undo());
    const oeffnungenNachUndo = await page.evaluate((wId) => {
      const k = (window as unknown as { __kosmo: KosmoTestHook }).__kosmo;
      return (k.state().doc.byKind('opening') as { wallId: string }[]).filter((o) => o.wallId === wId);
    }, wallId);
    expect(oeffnungenNachUndo).toHaveLength(0);
  });

  test('Messen: eine Klickkette + Escape committet design.massKetteSetzen (§2.4) — Undo entfernt sie wieder', async ({ page }) => {
    await ueberspringeOnboarding(page);
    await page.click('[data-testid="module-design"]');

    await oeffneInsel(page, 'zeichnen');
    await page.click('[data-testid="island-werkzeug-messen"]');
    await expect(page.locator('[data-testid="island-messen-popup"]')).toBeVisible();

    const p1 = await weltZuBildschirm(page, { x: -2000, y: -1500 });
    const p2 = await weltZuBildschirm(page, { x: 1000, y: 500 });
    const p3 = await weltZuBildschirm(page, { x: 3000, y: -500 });
    await page.mouse.click(p1.x, p1.y);
    await page.mouse.click(p2.x, p2.y);
    await page.mouse.click(p3.x, p3.y);
    // Escape schliesst die Kette ab (§2.4: «Doppelklick/Escape»), committet
    // GENAU EINEN design.massKetteSetzen-Aufruf mit den drei Punkten.
    await page.keyboard.press('Escape');

    const massketten = await page.evaluate(
      () => (window as unknown as { __kosmo: KosmoTestHook }).__kosmo.state().doc.byKind('masskette') as { id: string; punkte: { x: number; y: number }[] }[],
    );
    expect(massketten).toHaveLength(1);
    expect(massketten[0]!.punkte).toHaveLength(3);

    await page.screenshot({ path: 'test-results/p3-083-masskette.png' });

    await page.evaluate(() => (window as unknown as { __kosmo: KosmoTestHook }).__kosmo.state().undo());
    const nachUndo = await page.evaluate(
      () => (window as unknown as { __kosmo: KosmoTestHook }).__kosmo.state().doc.byKind('masskette'),
    );
    expect(nachUndo).toHaveLength(0);
  });

  test('Messen: derselbe Commit-Pfad über Doppelklick (statt Escape) wirft nicht und committet ebenfalls', async ({ page }) => {
    await ueberspringeOnboarding(page);
    await page.click('[data-testid="module-design"]');
    await oeffneInsel(page, 'zeichnen');
    await page.click('[data-testid="island-werkzeug-messen"]');

    const p1 = await weltZuBildschirm(page, { x: -1500, y: 0 });
    const p2 = await weltZuBildschirm(page, { x: 1500, y: 1200 });
    await page.mouse.click(p1.x, p1.y);
    await page.mouse.dblclick(p2.x, p2.y);

    const massketten = await page.evaluate(
      () => (window as unknown as { __kosmo: KosmoTestHook }).__kosmo.state().doc.byKind('masskette') as { punkte: unknown[] }[],
    );
    expect(massketten.length).toBeGreaterThanOrEqual(1);
    expect(massketten[0]!.punkte.length).toBeGreaterThanOrEqual(2);
  });

  test('Kommentar: Klick setzt NUR den Punkt, das Erfassen-Formular committet design.kommentarSetzen — Undo entfernt ihn wieder', async ({ page }) => {
    await ueberspringeOnboarding(page);
    await page.click('[data-testid="module-design"]');

    await oeffneInsel(page, 'projekt');
    await page.click('[data-testid="island-werkzeug-kommentare"]');
    await expect(page.locator('[data-testid="island-kommentare-popup"]')).toBeVisible();
    // Vor dem Klick: kein Formular, nur der Hinweis (E1, §1.4).
    await expect(page.locator('[data-testid="island-kommentar-hinweis-punkt"]')).toBeVisible();
    await expect(page.locator('[data-testid="island-kommentar-text"]')).toHaveCount(0);

    const punkt = await weltZuBildschirm(page, { x: 1000, y: 1000 });
    await page.mouse.click(punkt.x, punkt.y);

    // Reine UI-Brücke (kommentarPunkt) — noch KEIN Kommentar im Doc, aber
    // das Formular erscheint jetzt.
    await expect(page.locator('[data-testid="island-kommentar-text"]')).toBeVisible();
    let kommentareVorSenden = await page.evaluate(
      () => (window as unknown as { __kosmo: KosmoTestHook }).__kosmo.state().doc.byKind('kommentar'),
    );
    expect(kommentareVorSenden).toHaveLength(0);

    await page.fill('[data-testid="island-kommentar-text"]', 'E2E-Testkommentar (v0.8.3 P3)');
    await page.fill('[data-testid="island-kommentar-autor"]', 'E2E-Suite');
    await expect(page.locator('[data-testid="island-kommentar-setzen"]')).toBeEnabled();
    await page.click('[data-testid="island-kommentar-setzen"]');

    const kommentare = await page.evaluate(
      () => (window as unknown as { __kosmo: KosmoTestHook }).__kosmo.state().doc.byKind('kommentar') as { text: string; autor: string; status: string }[],
    );
    expect(kommentare).toHaveLength(1);
    expect(kommentare[0]!.text).toBe('E2E-Testkommentar (v0.8.3 P3)');
    expect(kommentare[0]!.status).toBe('offen');

    // Marker jetzt sichtbar im Plan (App-Overlay, E1 §1.4 — kein Kernel-Derive).
    await expect(page.locator('[data-testid="plan-kommentar"]')).toBeVisible();
    await page.screenshot({ path: 'test-results/p3-083-kommentar-im-plan.png' });

    await page.evaluate(() => (window as unknown as { __kosmo: KosmoTestHook }).__kosmo.state().undo());
    kommentareVorSenden = await page.evaluate(
      () => (window as unknown as { __kosmo: KosmoTestHook }).__kosmo.state().doc.byKind('kommentar'),
    );
    expect(kommentareVorSenden).toHaveLength(0);
    await expect(page.locator('[data-testid="plan-kommentar"]')).toHaveCount(0);
  });
});
