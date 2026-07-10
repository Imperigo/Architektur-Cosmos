import { expect, test, type Page } from '@playwright/test';

/**
 * H-9 (Sim-Befund): der «Schnitt»-Linienzug lief als reiner UI-State an
 * runCommand vorbei — kein Undo, kein Yjs-Sync, kein Kosmo-Tool. Jetzt
 * geht er über `design.schnittSetzen` (SettingsPatch `doc.settings.schnitt`).
 * Diese Spec fährt den Werkzeug-Klickpfad (2 Klicke im Plan) und beweist:
 * die Schnittlinie steht im Doc, und EIN Undo nimmt sie wieder weg.
 * Additiv — kein bestehender Test verändert (sim-efh.spec.ts hatte den
 * manuellen Schnitt wegen genau dieser Lücke bewusst ausgelassen).
 */

async function oeffneKosmoDesign(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="view-2d"]');
}

/** Welt-mm → Bildschirm-Pixel (Muster oberflaeche-minimal.spec.ts). */
async function weltZuBildschirm(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const svg = page.locator('[data-testid="planview"]');
  const rect = (await svg.boundingBox())!;
  const transform = await svg.locator('> g').first().getAttribute('transform');
  const [tx, ty, scale, negCx, cy] = transform!.match(/-?\d+\.?\d*/g)!.map(Number);
  return {
    x: rect.x + tx! + scale! * (x + negCx!),
    y: rect.y + ty! + scale! * (cy! - y),
  };
}

test('Schnitt-Werkzeug (H-9): zwei Klicke setzen die Schnittlinie über design.schnittSetzen — Undo nimmt sie zurück', async ({
  page,
}) => {
  await oeffneKosmoDesign(page);

  // vorher: keine Schnittlinie im Doc
  const schnitt = () =>
    page.evaluate(
      () =>
        (window.__kosmo.state().doc as unknown as { settings: { schnitt?: unknown } }).settings
          .schnitt ?? null,
    );
  expect(await schnitt()).toBe(null);

  // Eine Wand VOR der Schnittlinie (Blickrichtung +y) — sonst bleibt die
  // Schnittansicht leer («Kein Modell im Schnittbereich», SectionView.tsx)
  // und das section-Schnitt-SVG erscheint gar nicht.
  await page.evaluate(() => {
    const k = window.__kosmo as unknown as {
      run: (id: string, p: unknown) => unknown;
      state: () => { activeStoreyId: string | null; doc: { byKind: (kind: string) => { id: string; name?: string }[] } };
    };
    const st = k.state();
    const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW'))!;
    k.run('design.wandZeichnen', {
      storeyId: st.activeStoreyId,
      a: { x: 0, y: 3000 },
      b: { x: 8000, y: 3000 },
      assemblyId: aw.id,
    });
  });

  await page.click('[data-testid="tool-schnitt"]');
  const a = await weltZuBildschirm(page, 0, 2000);
  const b = await weltZuBildschirm(page, 8000, 2000);
  await page.mouse.click(a.x, a.y);
  await page.mouse.click(b.x, b.y);

  // Die Schnittlinie steht jetzt im Doc (Command-Weg, nicht UI-State).
  // Koordinaten nur grob prüfen — der Zeichen-Snap darf die Klickpunkte
  // leicht verschieben (z.B. Richtung Wandenden), das ist hier nicht Thema.
  await expect.poll(schnitt).not.toBe(null);
  const spec = (await schnitt()) as { a: { x: number; y: number }; b: { x: number; y: number }; depth: number; lookLeft: boolean };
  expect(spec.depth).toBe(30000);
  expect(spec.lookLeft).toBe(true);
  expect(Math.hypot(spec.b.x - spec.a.x, spec.b.y - spec.a.y)).toBeGreaterThan(1000);

  // Der Klickpfad hat auf Quad-Ansicht geschaltet — der Schnitt ist sichtbar
  await expect(page.locator('[data-testid="section-Schnitt"]')).toBeVisible();

  // EIN Undo nimmt die Schnittlinie zurück — der Beweis, dass sie durch die
  // History geht (vorher: unmöglich, reiner useState).
  await page.click('[data-testid="undo"]');
  await expect.poll(schnitt).toBe(null);
});
