import { test, expect } from '@playwright/test';

/**
 * F4 (v0.6.4, Owner-Befund wörtlich): «beim modellieren eines grundrisses
 * muss die maus auf die anderen wände oder elemente snappen können. es
 * braucht ein sichtbarer punkt der beim hovern anzeigt wo es snappen wird.»
 *
 * Der Test baut eine Wand deterministisch über den Test-Hook, wählt das
 * Wand-Werkzeug und fährt mit der Maus NEBEN das bestehende Wandende:
 * der Fang-Marker (Quadrat = Endpunkt) muss erscheinen, und der gesetzte
 * Punkt rastet exakt auf das Wandende ein — nicht aufs 250er-Raster.
 */

test('Element-Fang: Marker am Wandende sichtbar, Klick rastet exakt ein', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.panelOffen', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]');

  // Bestehende Wand (0,0)–(6000,0) deterministisch übers Command-System
  await page.evaluate(() => {
    const s = window.__kosmo.state();
    const assembly = (s.doc.byKind('assembly') as unknown as { id: string; target: string }[]).find(
      (a) => a.target === 'wall',
    );
    window.__kosmo.run('design.wandZeichnen', {
      storeyId: s.activeStoreyId,
      a: { x: 0, y: 0 },
      b: { x: 6000, y: 0 },
      ...(assembly ? { assemblyId: assembly.id } : {}),
    });
  });

  // Voll-Plan + Einpassen (dieselbe Lehre wie module.spec: in der Split-
  // Ansicht läge das Modell teils unter der Werkzeugleiste)
  await page.click('[data-testid="view-2d"]');
  await page.click('[data-testid="nav-fit"]');
  await page.waitForTimeout(400);
  await page.click('[data-testid="tool-wand"]');

  // Welt→Bildschirm über die CTM des Plan-SVG-Inhalts (Wandende 6000/0)
  const ziel = await page.evaluate(() => {
    const svg = document.querySelector('[data-testid="planview"]') as SVGSVGElement;
    const inhalt = svg.querySelector('g') as SVGGElement;
    const m = inhalt.getScreenCTM()!;
    const pt = new DOMPoint(6000, 0).matrixTransform(m); // Kern-y 0 ↦ SVG-y 0
    const proMm = new DOMPoint(7000, 0).matrixTransform(m).x - pt.x; // px pro 1000 mm
    return { x: pt.x, y: pt.y, pxProMm: proMm / 1000 };
  });

  // ~250 mm neben dem Wandende schweben: Marker erscheint als Endpunkt-Quadrat.
  // (Achsenparallele SVG-Formen meldet Playwright teils als hidden → toBeAttached.)
  const abstand = 250 * ziel.pxProMm;
  await page.mouse.move(ziel.x + abstand, ziel.y - abstand);
  const marker = page.locator('[data-testid="fang-marker"]');
  await expect(marker).toBeAttached();
  await expect(marker).toHaveAttribute('data-fang-typ', 'endpunkt');

  // Klick: der erste Wandpunkt sitzt EXAKT auf (6000, 0) — der 250er-Raster
  // hätte den Versatz behalten, nur der Element-Fang zieht aufs Wandende.
  await page.mouse.click(ziel.x + abstand, ziel.y - abstand);
  // Zweiter Punkt weit weg von jeder Geometrie (ausserhalb des Fangradius),
  // nach UNTEN (Welt-y negativ): oberhalb läge die dreizeilige Werkzeugleiste
  // über dem Plan und fräse den Klick ab (dieselbe Lehre wie module.spec).
  await page.mouse.click(ziel.x + abstand, ziel.y + 2500 * ziel.pxProMm);
  const wand = await page.evaluate(() => {
    const waende = window.__kosmo.state().doc.byKind('wall') as unknown as {
      a: { x: number; y: number };
      b: { x: number; y: number };
    }[];
    return { anzahl: waende.length, neu: waende[waende.length - 1]! };
  });
  expect(wand.anzahl).toBe(2); // die neue Wand ist wirklich entstanden
  expect(wand.neu.a).toEqual({ x: 6000, y: 0 });

  // Ausserhalb des Radius: kein Marker (Fang drängt sich nicht auf)
  await page.keyboard.press('Escape');
  await page.mouse.move(ziel.x + 1500 * ziel.pxProMm, ziel.y - 1500 * ziel.pxProMm);
  await expect(marker).toHaveCount(0);
});
