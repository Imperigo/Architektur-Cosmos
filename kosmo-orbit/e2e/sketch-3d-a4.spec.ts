import { expect, test } from '@playwright/test';

/**
 * A4 (ROADMAP 155, Owner-Entscheid «Beides/Raycast»): 3D-Skizze trifft per
 * Raycast die tatsächliche Fläche — eine Wandfläche ergibt eine Öffnung, alles
 * andere (Boden/Terrain/Decke/Volumen) ergibt wie bisher einen Wand-Zug.
 *
 * Diese Suite ist NICHT Teil der automatisierten Serien-Läufe in diesem
 * Batch (Sonnet baut im isolierten Worktree, Opus fährt E2E seriell). Der
 * Wand-Treffer-Test hängt am exakten Bildpunkt, an dem der Raycast die Wand
 * trifft — nach `nav-fit` sollte die einzige Wand im Modell den Canvas-
 * Mittelpunkt gut abdecken, ein kleines Suchraster um die Mitte fängt kleine
 * Framing-Abweichungen ab. Schlägt der Wand-Treffer trotzdem fehl: Screenshot
 * unter `e2e-results/` prüfen und die Canvas-Koordinaten nachjustieren.
 */

test('A4: 3D-Skizze auf eine Wandfläche ergibt eine Öffnung (kein Wand-Zug)', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    // Block-E-Guide startet sonst automatisch und fängt Klicks unter seiner
    // Karte ab (nav-fit/Export) — Tests emulieren den erfahrenen Nutzer.
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG

  await page.evaluate(() => {
    const k = window.__kosmo as {
      run: (id: string, p: unknown) => unknown;
      state: () => { activeStoreyId: string | null; doc: { byKind: (k: string) => { id: string; name?: string }[] } };
    };
    const st = k.state();
    const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW'))!;
    // Eine einzige, lange Wand — nach `nav-fit` deckt sie den Grossteil des
    // Bilds ab, damit ein Strich nahe der Canvas-Mitte sie zuverlässig trifft.
    k.run('design.wandZeichnen', {
      storeyId: st.activeStoreyId,
      a: { x: 0, y: 0 },
      b: { x: 6000, y: 0 },
      assemblyId: aw.id,
    });
  });

  // Volle 3D-Ansicht (kein Splitscreen) — eindeutige `nav-*`-Testids ohne
  // Kollision mit der 2D-NavLeiste.
  await page.click('[data-testid="view-3d"]');
  await page.click('[data-testid="nav-fit"]');
  await page.click('[data-testid="tool-skizze"]');
  await expect(page.locator('[data-testid="sketch3d-hinweis"]')).toBeVisible();

  const canvas = page.locator('canvas').first();
  const box = (await canvas.boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  let getroffen = false;
  // Kleines Suchraster um die Canvas-Mitte — fängt kleine Abweichungen im
  // `fitToBox`-Framing ab, ohne die exakte Wand-Silhouette vorausberechnen zu müssen.
  for (const [dx, dy] of [
    [0, 0], [0, -60], [0, 60], [-80, 0], [80, 0], [-80, -60], [80, -60], [-80, 60], [80, 60],
  ]) {
    const x0 = cx + dx;
    const y0 = cy + dy;
    await page.mouse.move(x0, y0);
    await page.mouse.down();
    await page.mouse.move(x0 + 40, y0 + 25, { steps: 4 });
    await page.mouse.move(x0 + 80, y0 - 15, { steps: 4 });
    await page.mouse.up();
    const anzahl = await page.evaluate(() => window.__kosmo.state().doc.byKind('opening').length);
    if (anzahl === 1) {
      getroffen = true;
      break;
    }
  }

  expect(getroffen, 'kein Strich im Suchraster traf die Wandfläche — Canvas-Koordinaten nachjustieren').toBe(true);
  // Ein Wand-Strich hätte den Wand-Zug-Weg genommen — es darf weiterhin nur
  // die eine ursprüngliche Wand existieren, keine zusätzliche.
  expect(await page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length)).toBe(1);

  const oeffnung = await page.evaluate(
    () =>
      (
        window.__kosmo.state().doc.byKind('opening') as unknown as {
          openingType: string;
          width: number;
          height: number;
          sill: number;
        }[]
      )[0]!,
  );
  expect(['fenster', 'tuer']).toContain(oeffnung.openingType);
  expect(oeffnung.width).toBeGreaterThan(0);
  expect(oeffnung.height).toBeGreaterThan(0);
  expect(oeffnung.sill).toBeGreaterThanOrEqual(0);

  await page.screenshot({ path: 'e2e-results/sketch-3d-a4-wand-oeffnung.png' });
});

test('A4: 3D-Skizze auf den Boden ergibt weiterhin einen Wand-Zug (Regression T5)', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    // Block-E-Guide startet sonst automatisch und fängt Klicks unter seiner
    // Karte ab (nav-fit/Export) — Tests emulieren den erfahrenen Nutzer.
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG, noch keine Wände

  await page.click('[data-testid="view-3d"]');
  await page.click('[data-testid="tool-skizze"]');

  const canvas = page.locator('canvas').first();
  const box = (await canvas.boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // Ohne Modell trifft der Raycast nur das Bodenraster-Mesh (kein Wand-Hit
  // möglich) — genau der «boden»-Pfad, jetzt über den echten Mesh-Treffer
  // statt nur die abstrakte flache Ebene.
  await page.mouse.move(cx - 120, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy, { steps: 4 });
  await page.mouse.move(cx + 120, cy, { steps: 4 });
  await page.mouse.up();

  await page.click('[data-testid="sketch3d-uebergeben"]');
  await expect(page.locator('[data-testid="sketch3d-proposal"]')).toBeVisible();
  await page.click('[data-testid="sketch3d-accept"]');

  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length))
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__kosmo.state().doc.byKind('opening').length)).toBe(0);
});
