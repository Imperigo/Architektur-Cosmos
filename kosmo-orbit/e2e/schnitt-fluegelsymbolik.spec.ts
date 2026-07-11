import { expect, test, type Page } from '@playwright/test';

/**
 * Restfix Stream 6B (docs/V071-KONZEPT.md E5, ROADMAP 325 «ehrliche
 * Grenzen»): der Druck-/Export-Weg (`derive/section.ts` `fenstersymbole` +
 * `plansvg.ts` `sectionInnerSvg`) rendert die SIA-Flügelsymbolik seit
 * Welle 4 — die LIVE-Schnitt-/Ansicht-Vorschau (`SectionView.tsx`) liess sie
 * bisher aus (zeichnet cuts/projections direkt, unabhängig von `plansvg.ts`).
 * Diese Spec beweist additiv: ein Fenster MIT `fluegelTyp` erzeugt im
 * Live-Schnitt-SVG `fluegel-*`-Elemente, eines OHNE `fluegelTyp` nicht.
 * Ohne dieses Feld am Modell (heutiger Bestand) ändert sich nichts — der
 * bestehende `schnitt-command.spec.ts`-Pfad bleibt unberührt.
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

test('Live-Schnitt zeigt Flügelsymbolik nur, wenn die Öffnung fluegelTyp trägt (Welle-4-Restfix)', async ({
  page,
}) => {
  await oeffneKosmoDesign(page);

  const openingId = await page.evaluate(() => {
    const k = window.__kosmo as unknown as {
      run: (id: string, p: unknown) => { patches: { id: string }[] };
      state: () => { activeStoreyId: string | null; doc: { byKind: (kind: string) => { id: string; name?: string }[] } };
    };
    const st = k.state();
    const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW'))!;
    const w = k.run('design.wandZeichnen', {
      storeyId: st.activeStoreyId,
      a: { x: 0, y: 3000 },
      b: { x: 8000, y: 3000 },
      assemblyId: aw.id,
    });
    const wallId = w.patches[0]!.id;
    const o = k.run('design.oeffnungSetzen', {
      wallId,
      openingType: 'fenster',
      center: 4000,
      width: 1600,
      height: 1400,
      sill: 900,
    });
    // Schnittlinie VOR der Wand (Blickrichtung +y), wie schnitt-command.spec.ts —
    // sonst bleibt die Schnittansicht leer.
    k.run('design.schnittSetzen', { a: { x: 0, y: 2000 }, b: { x: 8000, y: 2000 } });
    return o.patches[0]!.id;
  });

  await page.click('[data-testid="view-quad"]');
  const schnittSvg = page.locator('[data-testid="section-Schnitt"]');
  await expect(schnittSvg).toBeVisible();

  // Ohne fluegelTyp: keine Flügelsymbolik-Elemente im Live-Schnitt.
  await expect(schnittSvg.locator('[data-testid^="fluegelsymbol-"]')).toHaveCount(0);

  // fluegelTyp setzen (derselbe Command-Weg wie das Inspector-KSelect) —
  // 'drehkipp' erzeugt sowohl 'fluegel-dreh'- als auch 'fluegel-kipp'-Linien
  // (je zwei Schenkel, `derive/section.ts`).
  await page.evaluate((id) => {
    const k = window.__kosmo as unknown as { run: (cmd: string, p: unknown) => unknown };
    k.run('design.eigenschaftSetzen', { entityId: id, feld: 'fluegelTyp', wert: 'drehkipp' });
  }, openingId);

  await expect(schnittSvg.locator('[data-testid="fluegelsymbol-fluegel-dreh"]')).toHaveCount(2);
  await expect(schnittSvg.locator('[data-testid="fluegelsymbol-fluegel-kipp"]')).toHaveCount(2);

  // Undo nimmt die Symbolik wieder vollständig zurück (EIN Patch, wie
  // `design.eigenschaftSetzen` es für jedes andere Feld auch liefert).
  await page.click('[data-testid="undo"]');
  await expect(schnittSvg.locator('[data-testid^="fluegelsymbol-"]')).toHaveCount(0);
});
