import { expect, test, type Page } from '@playwright/test';

/**
 * Owner-Befund «Grundriss aus Distanz schlecht» (Batch B2): zoomabhängiges
 * Level-of-Detail in der Grundriss-Live-Ansicht (PlanView). Weit rausgezoomt
 * verschwinden Bemassung und 1m-Raster (werden aus der Distanz zu Matsch),
 * Öffnungssymbole (Fenster) bleiben immer sichtbar; reingezoomt ist alles
 * wieder da. Reine Sichtbarkeits-Umschaltung auf SVG-Gruppen (`plan-dims`/
 * `plan-grid`/`plan-texte`/`plan-moebel`) — der Export/Plansatz-Pfad
 * (KosmoPublish/PDF) ist davon nicht betroffen, `derive/plansvg.ts` bleibt
 * unverändert (Goldens byte-identisch).
 */

// Ein einzelner, grosser Wheel-Ausschlag reicht: planLod erlaubt in der
// Hysterese Mehrfach-Stufen-Sprünge in einem Aufruf, es muss also nicht in
// vielen kleinen Schritten gezoomt werden (robuster gegen Timing im CI).
async function zoome(page: Page, richtung: 'rein' | 'raus') {
  const box = (await page.locator('[data-testid="planview"]').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, richtung === 'raus' ? 20_000 : -20_000);
}

test('Plan-LOD: Bemassung/Raster verschwinden aus der Distanz, Öffnungen bleiben, reinzoomen bringt sie zurück', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    // Block-E-Guide startet sonst automatisch und fängt Klicks unter seiner
    // Karte ab — Tests emulieren den erfahrenen Nutzer (wie module.spec.ts).
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.goto('/');

  // Beispielprojekt laden (Owner-Vorgabe TKB-Demo) — bootstrappt Geschosse.
  await page.click('[data-testid="load-tkb"]');
  await expect(page.locator('text=KENNZAHLEN')).toBeVisible();

  // Die TKB-Demo selbst zeichnet nur Zonen/Decken, noch keine Wände — für
  // Bemassungsketten und ein Öffnungssymbol brauchen wir echte Geometrie,
  // über denselben Command-Weg wie Maus/Kosmo (kein Sonderpfad fürs Testen).
  const wandId = await page.evaluate(() => {
    const k = window.__kosmo as {
      run: (id: string, p: unknown) => { patches: { id: string }[] };
      state: () => { activeStoreyId: string | null; doc: { byKind: (k: string) => { id: string; name?: string }[] } };
    };
    const st = k.state();
    const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW'))!;
    const res = k.run('design.wandZeichnen', {
      storeyId: st.activeStoreyId,
      a: { x: 0, y: 0 },
      b: { x: 8000, y: 0 },
      assemblyId: aw.id,
    });
    return res.patches[0]!.id;
  });
  await page.evaluate((id) => {
    const k = window.__kosmo as {
      run: (i: string, p: unknown) => unknown;
      state: () => { activeStoreyId: string | null };
    };
    k.run('design.oeffnungSetzen', {
      wallId: id,
      openingType: 'fenster',
      center: 3000,
      width: 2000,
      height: 1500,
      sill: 900,
    });
    // Ein Möbel für die «mittel»-Regel (Möbel sind nur in Stufe «voll» sichtbar)
    k.run('design.moebelSetzen', {
      storeyId: k.state().activeStoreyId,
      typ: 'esstisch',
      at: { x: 4000, y: 2000 },
      rotationGrad: 0,
    });
  }, wandId);

  // Volle Breite fürs Zoomen (statt Split mit dem 3D-Viewport).
  await page.click('[data-testid="view-2d"]');
  const plan = page.locator('[data-testid="planview"]');
  const dims = page.locator('[data-testid="plan-dims"]');
  const grid = page.locator('[data-testid="plan-grid"]');
  const moebel = page.locator('[data-testid="plan-moebel"]');
  const fenster = page.locator('svg .fenster').first();
  await expect(plan).toBeVisible();
  await expect(fenster).toBeAttached();

  // Nah heran: Stufe «voll» — Bemassung, 1m-Raster und Möbel sichtbar.
  await zoome(page, 'rein');
  await expect(plan).toHaveAttribute('data-lod', 'voll');
  await expect(dims).toBeVisible();
  await expect(dims.locator('text').first()).toBeVisible();
  await expect(grid).toBeVisible();
  await expect(moebel).toBeVisible();
  await expect(fenster).toBeVisible();

  // Weit weg: Stufe «fern» — Bemassungstexte, Raster und Möbel ausgeblendet
  // (Owner-Auflage «keine Texte/Bemassung»); das Fenstersymbol (Öffnung)
  // bleibt («nur Poché + Öffnungen»).
  await zoome(page, 'raus');
  await expect(plan).toHaveAttribute('data-lod', 'fern');
  await expect(dims).toBeHidden();
  await expect(grid).toBeHidden();
  await expect(moebel).toBeHidden();
  await expect(fenster).toBeVisible();

  // Wieder heran: Bemassung, Raster und Möbel sind zurück — kein
  // Datenverlust, nur die Anzeige war weg.
  await zoome(page, 'rein');
  await expect(plan).toHaveAttribute('data-lod', 'voll');
  await expect(dims).toBeVisible();
  await expect(dims.locator('text').first()).toBeVisible();
  await expect(grid).toBeVisible();
  await expect(moebel).toBeVisible();

  await page.screenshot({ path: 'e2e-results/plan-lod.png' });
});
