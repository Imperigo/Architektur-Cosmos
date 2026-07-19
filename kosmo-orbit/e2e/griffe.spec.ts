import { expect, test, type Page } from '@playwright/test';

/**
 * PB1 (v0.8.5 «Greifbar», `docs/V085-SPEZ.md` E3, Matrix C-15…C-18) —
 * Griffe/Handles an Wand-/Masskette-Endpunkten und Zonen-/Volumen-/
 * Dach-Ecken, plus der D10-Fix (Esc schliesst eine laufende Masskette auch
 * in reinem view-2d ab).
 *
 * Helfer wörtlich nach `multi-auswahl.spec.ts` kopiert (`starteManuell`,
 * `weltZuBildschirm`, `zeichneWand`, `auswahl`) — dieselbe manuell-
 * Oberfläche über den globalen `kosmoUiV1SeedMitManuell`-Seed der
 * playwright.config, Plan/Auswahl-Mechanik ist dieselbe PlanView wie PA1.
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

async function erstelleZone(page: Page, outline: { x: number; y: number }[], name = 'Testraum'): Promise<string> {
  return page.evaluate(
    ({ outline, name }) => {
      const k = window.__kosmo;
      const st = k.state();
      const r = k.run('design.zoneErstellen', { storeyId: st.activeStoreyId, outline, name, sia: 'HNF' });
      return r.patches[0]!.id;
    },
    { outline, name },
  );
}

async function erstelleVolumen(page: Page, outline: { x: number; y: number }[]): Promise<string> {
  return page.evaluate(
    ({ outline }) => {
      const k = window.__kosmo;
      const st = k.state();
      const r = k.run('design.volumenErstellen', { storeyId: st.activeStoreyId, outline, height: 6000 });
      return r.patches[0]!.id;
    },
    { outline },
  );
}

async function erstelleDach(page: Page, outline: { x: number; y: number }[]): Promise<string> {
  return page.evaluate(
    ({ outline }) => {
      const k = window.__kosmo;
      const st = k.state();
      const r = k.run('design.dachErstellen', { storeyId: st.activeStoreyId, outline, pitch: 35, overhang: 500 });
      return r.patches[0]!.id;
    },
    { outline },
  );
}

async function erstelleMasskette(page: Page, punkte: { x: number; y: number }[]): Promise<string> {
  return page.evaluate(
    ({ punkte }) => {
      const k = window.__kosmo;
      const st = k.state();
      const r = k.run('design.massKetteSetzen', { storeyId: st.activeStoreyId, punkte });
      return r.patches[0]!.id;
    },
    { punkte },
  );
}

const auswahl = (page: Page) => page.evaluate(() => window.__kosmo.state().selection as string[]);
const waehle = (page: Page, ids: string[]) => page.evaluate((ids) => window.__kosmo.state().select(ids), ids);

/** Bildschirm-Mitte eines gerenderten Griffs (per `getBoundingClientRect`,
 *  funktioniert unabhängig von `pointerEvents:none` — PlanView testet den
 *  Griff-Treffer selbst über Client-Koordinaten, kein natives DOM-Ziel
 *  nötig, s. `griffAn()` in PlanView.tsx). */
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

test('C-15: Wand-Endpunkt-Griffe sichtbar bei Einzel-Auswahl, weg bei Mehrfach-Auswahl', async ({ page }) => {
  await starteManuell(page);
  const w1 = await zeichneWand(page, { x: 4000, y: 2000 }, { x: 6000, y: 2000 });
  const w2 = await zeichneWand(page, { x: 4000, y: 5000 }, { x: 6000, y: 5000 });

  await waehle(page, [w1]);
  await expect(page.locator('[data-testid="griff-endpunkt-a"]')).toBeVisible();
  await expect(page.locator('[data-testid="griff-endpunkt-b"]')).toBeVisible();

  // Mehrfach-Auswahl (C-15 «weg bei Mehrfach-Auswahl») — keine Griffe mehr.
  await waehle(page, [w1, w2]);
  await expect(page.locator('[data-testid="griff-endpunkt-a"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="griff-endpunkt-b"]')).toHaveCount(0);

  // Zurück zur Einzel-Auswahl — Griffe wieder da.
  await waehle(page, [w2]);
  await expect(page.locator('[data-testid="griff-endpunkt-a"]')).toBeVisible();
});

test('C-15: Drag am Endpunkt-Griff b ändert NUR den b-Punkt — EIN Ctrl+Z stellt die Wand wieder her', async ({
  page,
}) => {
  await starteManuell(page);
  const w1 = await zeichneWand(page, { x: 4000, y: 2000 }, { x: 6000, y: 2000 });
  await waehle(page, [w1]);
  await expect(page.locator('[data-testid="griff-endpunkt-b"]')).toBeVisible();

  const von = await griffMitte(page, 'griff-endpunkt-b');
  const nach = await weltZuBildschirm(page, 6000, 4000); // grid-genauer Zielpunkt (250er Raster)
  await ziehe(page, von, nach);

  // Doc-Beweis: GENAU eine Wand, a unverändert, b auf den neuen Punkt.
  const waende = await page.evaluate(
    () => window.__kosmo.state().doc.byKind('wall') as { a: { x: number; y: number }; b: { x: number; y: number } }[],
  );
  expect(waende).toHaveLength(1);
  expect(waende[0]!.a).toEqual({ x: 4000, y: 2000 });
  expect(waende[0]!.b).toEqual({ x: 6000, y: 4000 });

  await page.screenshot({ path: 'e2e-results/pb1-085-griff-wand-endpunkt.png' });

  // EIN Ctrl+Z stellt die ursprüngliche Wand (a UND b) wieder her — Löschen+
  // Neusetzen lief als EINE history-Gruppe (E3, C-15 «eine Undo-Gruppe»).
  await page.keyboard.press('Control+z');
  const nachUndo = await page.evaluate(
    () => window.__kosmo.state().doc.byKind('wall') as { a: { x: number; y: number }; b: { x: number; y: number } }[],
  );
  expect(nachUndo).toHaveLength(1);
  expect(nachUndo[0]!.a).toEqual({ x: 4000, y: 2000 });
  expect(nachUndo[0]!.b).toEqual({ x: 6000, y: 2000 });
});

test('C-1 (v0.8.6 E1): Wand-Endpunkt-Drag erhält Öffnung UND Wand-Identität (wandGeometrieSetzen)', async ({
  page,
}) => {
  await starteManuell(page);
  const w1 = await zeichneWand(page, { x: 4000, y: 2000 }, { x: 8000, y: 2000 });
  const oeffnungId = await page.evaluate((wallId) => {
    const r = window.__kosmo.run('design.oeffnungSetzen', {
      wallId,
      openingType: 'fenster',
      center: 1500,
      width: 1200,
      height: 1500,
      sill: 900,
    });
    return r.patches[0]!.id;
  }, w1);
  await waehle(page, [w1]);
  await expect(page.locator('[data-testid="griff-endpunkt-b"]')).toBeVisible();

  // b von (8000,2000) auf (7000,2000) ziehen — Wand wird kürzer, die
  // Öffnung (center 1500, Breite 1200 → 900..2100) passt weiterhin.
  const von = await griffMitte(page, 'griff-endpunkt-b');
  const nach = await weltZuBildschirm(page, 7000, 2000);
  await ziehe(page, von, nach);

  const stand = await page.evaluate(() => {
    const doc = window.__kosmo.state().doc;
    const waende = doc.byKind('wall') as { id: string; b: { x: number; y: number } }[];
    const oeffnungen = doc.byKind('opening') as { id: string; center: number; width: number }[];
    return { waende, oeffnungen, selection: window.__kosmo.state().selection as string[] };
  });
  // In-place: GLEICHE Wand-ID, b neu, Öffnung byte-erhalten, Auswahl bleibt.
  expect(stand.waende).toHaveLength(1);
  expect(stand.waende[0]!.id).toBe(w1);
  expect(stand.waende[0]!.b).toEqual({ x: 7000, y: 2000 });
  expect(stand.oeffnungen).toHaveLength(1);
  expect(stand.oeffnungen[0]!.id).toBe(oeffnungId);
  expect(stand.oeffnungen[0]!.center).toBe(1500);
  expect(stand.selection).toEqual([w1]);

  // EIN Ctrl+Z stellt die alte Geometrie wieder her, Öffnung bleibt.
  await page.keyboard.press('Control+z');
  const nachUndo = await page.evaluate(() => {
    const doc = window.__kosmo.state().doc;
    return {
      b: (doc.byKind('wall')[0] as { b: { x: number; y: number } }).b,
      oeffnungen: doc.byKind('opening').length,
    };
  });
  expect(nachUndo.b).toEqual({ x: 8000, y: 2000 });
  expect(nachUndo.oeffnungen).toBe(1);
});

test('C-4 (v0.8.6 E2): nachbar-Zone behält den zonenArt-Marker beim Eck-Zug', async ({ page }) => {
  await starteManuell(page);
  const zoneId = await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    const r = k.run('design.zoneErstellen', {
      storeyId: st.activeStoreyId,
      outline: [
        { x: 2000, y: 2000 },
        { x: 6000, y: 2000 },
        { x: 6000, y: 6000 },
        { x: 2000, y: 6000 },
      ],
      name: 'Nachbar West',
      sia: 'HNF',
      zonenArt: 'nachbar',
    });
    return r.patches[0]!.id;
  });
  await waehle(page, [zoneId]);
  await expect(page.locator('[data-testid="griff-eckpunkt-2"]')).toBeVisible();

  const von = await griffMitte(page, 'griff-eckpunkt-2');
  const nach = await weltZuBildschirm(page, 7000, 7000);
  await ziehe(page, von, nach);

  const zonen = await page.evaluate(
    () => window.__kosmo.state().doc.byKind('zone') as { zonenArt?: string; outline: { x: number; y: number }[] }[],
  );
  expect(zonen).toHaveLength(1);
  expect(zonen[0]!.zonenArt).toBe('nachbar');
  expect(zonen[0]!.outline[2]).toEqual({ x: 7000, y: 7000 });
});

test('C-16: Zonen-Eck-Griff ziehen ändert die Outline — EIN Undo-Schritt stellt sie wieder her', async ({ page }) => {
  await starteManuell(page);
  const outline = [
    { x: 2000, y: 2000 },
    { x: 6000, y: 2000 },
    { x: 6000, y: 6000 },
    { x: 2000, y: 6000 },
  ];
  const zoneId = await erstelleZone(page, outline, 'Wohnen');
  await waehle(page, [zoneId]);
  await expect(page.locator('[data-testid="griff-eckpunkt-0"]')).toBeVisible();
  await expect(page.locator('[data-testid="griff-eckpunkt-1"]')).toBeVisible();
  await expect(page.locator('[data-testid="griff-eckpunkt-2"]')).toBeVisible();
  await expect(page.locator('[data-testid="griff-eckpunkt-3"]')).toBeVisible();

  const von = await griffMitte(page, 'griff-eckpunkt-0');
  const nach = await weltZuBildschirm(page, 1000, 1000);
  await ziehe(page, von, nach);

  const zonen = await page.evaluate(
    () => window.__kosmo.state().doc.byKind('zone') as { outline: { x: number; y: number }[]; name: string; sia: string }[],
  );
  expect(zonen).toHaveLength(1);
  expect(zonen[0]!.outline[0]).toEqual({ x: 1000, y: 1000 });
  expect(zonen[0]!.outline[1]).toEqual({ x: 6000, y: 2000 }); // unbeteiligte Ecken unverändert
  expect(zonen[0]!.name).toBe('Wohnen'); // Name/SIA übernommen (Löschen+Neusetzen, kein Datenverlust)
  expect(zonen[0]!.sia).toBe('HNF');

  await page.screenshot({ path: 'e2e-results/pb1-085-griff-zone-ecke.png' });

  await page.keyboard.press('Control+z');
  const nachUndo = await page.evaluate(
    () => window.__kosmo.state().doc.byKind('zone') as { outline: { x: number; y: number }[] }[],
  );
  expect(nachUndo).toHaveLength(1);
  expect(nachUndo[0]!.outline[0]).toEqual({ x: 2000, y: 2000 });
});

test('C-16: Volumenkörper-Eck-Griff ziehen ändert die Outline', async ({ page }) => {
  await starteManuell(page);
  const outline = [
    { x: 2000, y: 2000 },
    { x: 6000, y: 2000 },
    { x: 6000, y: 6000 },
    { x: 2000, y: 6000 },
  ];
  const volumenId = await erstelleVolumen(page, outline);
  await waehle(page, [volumenId]);
  await expect(page.locator('[data-testid="griff-eckpunkt-2"]')).toBeVisible();

  const von = await griffMitte(page, 'griff-eckpunkt-2');
  const nach = await weltZuBildschirm(page, 7000, 7000);
  await ziehe(page, von, nach);

  const volumen = await page.evaluate(
    () => window.__kosmo.state().doc.byKind('mass') as { outline: { x: number; y: number }[]; height: number }[],
  );
  expect(volumen).toHaveLength(1);
  expect(volumen[0]!.outline[2]).toEqual({ x: 7000, y: 7000 });
  expect(volumen[0]!.height).toBe(6000); // Höhe übernommen, nicht auf den Default zurückgesetzt
});

test('C-16: Dach-Eck-Griff ziehen ändert die Outline', async ({ page }) => {
  await starteManuell(page);
  const outline = [
    { x: 2000, y: 2000 },
    { x: 6000, y: 2000 },
    { x: 6000, y: 6000 },
    { x: 2000, y: 6000 },
  ];
  const dachId = await erstelleDach(page, outline);
  await waehle(page, [dachId]);
  await expect(page.locator('[data-testid="griff-eckpunkt-2"]')).toBeVisible();

  // Ecke entlang der Aussendiagonale nach aussen ziehen — bleibt konvex
  // (`design.dachErstellen` verlangt einen konvexen Grundriss, V1).
  const von = await griffMitte(page, 'griff-eckpunkt-2');
  const nach = await weltZuBildschirm(page, 7000, 7000);
  await ziehe(page, von, nach);

  const daecher = await page.evaluate(
    () => window.__kosmo.state().doc.byKind('roof') as { outline: { x: number; y: number }[]; pitch: number }[],
  );
  expect(daecher).toHaveLength(1);
  expect(daecher[0]!.outline[2]).toEqual({ x: 7000, y: 7000 });
  expect(daecher[0]!.pitch).toBe(35);
});

test('C-16 (Matrix-Fund W3): fehlgeschlagener Dach-Eck-Zug (nicht-konvex) verliert das Dach NICHT', async ({
  page,
}) => {
  await starteManuell(page);
  const outline = [
    { x: 2000, y: 2000 },
    { x: 6000, y: 2000 },
    { x: 6000, y: 6000 },
    { x: 2000, y: 6000 },
  ];
  const dachId = await erstelleDach(page, outline);
  await waehle(page, [dachId]);
  await expect(page.locator('[data-testid="griff-eckpunkt-2"]')).toBeVisible();

  // Ecke 2 tief ins Innere ziehen (fast auf die Gegen-Ecke zu) — das
  // Ziel-Polygon ist nicht mehr konvex, `design.dachErstellen` wirft.
  // Erst-erstellen-dann-löschen (DesignWorkspace `onGriffEnd`) muss das
  // Original unangetastet stehen lassen: gleiche ID, gleiche Outline,
  // KEIN Zwischenzustand ohne Dach bis zu einem manuellen Undo.
  const von = await griffMitte(page, 'griff-eckpunkt-2');
  const nach = await weltZuBildschirm(page, 2500, 2500);
  await ziehe(page, von, nach);

  const daecher = await page.evaluate(
    () => window.__kosmo.state().doc.byKind('roof') as { id: string; outline: { x: number; y: number }[] }[],
  );
  expect(daecher).toHaveLength(1);
  expect(daecher[0]!.id).toBe(dachId);
  expect(daecher[0]!.outline).toEqual(outline);
  // `meldeFehler` zeigt den Konvex-Fehler sichtbar (kein stilles Schlucken).
  await expect(page.locator('[data-testid="meldung-fehler"]')).toBeVisible();
});

test('Masskette-Punkt-Griff: Drag ändert den Punkt, EIN Ctrl+Z stellt die Kette wieder her', async ({ page }) => {
  await starteManuell(page);
  const punkte = [
    { x: -2000, y: -1500 },
    { x: 1000, y: 500 },
    { x: 3000, y: -500 },
  ];
  const mkId = await erstelleMasskette(page, punkte);
  await waehle(page, [mkId]);
  await expect(page.locator('[data-testid="griff-massketten-punkt-1"]')).toBeVisible();

  const von = await griffMitte(page, 'griff-massketten-punkt-1');
  const nach = await weltZuBildschirm(page, 1000, 2000);
  await ziehe(page, von, nach);

  const massketten = await page.evaluate(
    () => window.__kosmo.state().doc.byKind('masskette') as { punkte: { x: number; y: number }[] }[],
  );
  expect(massketten).toHaveLength(1);
  expect(massketten[0]!.punkte[1]).toEqual({ x: 1000, y: 2000 });
  expect(massketten[0]!.punkte[0]).toEqual(punkte[0]);
  expect(massketten[0]!.punkte[2]).toEqual(punkte[2]);

  await page.keyboard.press('Control+z');
  const nachUndo = await page.evaluate(
    () => window.__kosmo.state().doc.byKind('masskette') as { punkte: { x: number; y: number }[] }[],
  );
  expect(nachUndo).toHaveLength(1);
  expect(nachUndo[0]!.punkte[1]).toEqual(punkte[1]);
});

test('C-17: Griff-Klick klaut keine Auswahl — kein Marquee startet, kein unnötiges Löschen+Neusetzen', async ({
  page,
}) => {
  await starteManuell(page);
  const w1 = await zeichneWand(page, { x: 4000, y: 2000 }, { x: 6000, y: 2000 });
  await waehle(page, [w1]);
  await expect(page.locator('[data-testid="griff-endpunkt-b"]')).toBeVisible();

  const punkt = await griffMitte(page, 'griff-endpunkt-b');
  // Reiner Klick auf den Griff (kein Zug) — C-17: kein Rubber-Band startet,
  // die Wand bleibt exakt dieselbe (Sanktion-4-Muster, kein Löschen+
  // Neusetzen bei Bewegung 0).
  await page.mouse.move(punkt.x, punkt.y);
  await page.mouse.down();
  await expect(page.locator('[data-testid="plan-marquee"]')).toHaveCount(0);
  await page.mouse.up();

  await expect.poll(() => auswahl(page)).toEqual([w1]);
  const waende = await page.evaluate(() => window.__kosmo.state().doc.byKind('wall') as { id: string }[]);
  expect(waende).toHaveLength(1);
  expect(waende[0]!.id).toBe(w1); // dieselbe Id — kein Löschen+Neusetzen ausgelöst
});

test('C-18 (D10): Esc schliesst eine laufende Masskette in reinem view-2d ab (nicht nur in 3d/split)', async ({
  page,
}) => {
  await starteManuell(page); // view-2d — Viewport3D ist NICHT gemountet
  await page.locator('[data-testid="planview"]').click(); // Fokus weg vom view-2d-Knopf, wie ein echter Nutzer
  await page.keyboard.press('m'); // Kurztaste 'messen' (kurztasten.ts:93)

  const p1 = await weltZuBildschirm(page, -2000, -1500);
  const p2 = await weltZuBildschirm(page, 1000, 500);
  const p3 = await weltZuBildschirm(page, 3000, -500);
  await page.mouse.click(p1.x, p1.y);
  await page.mouse.click(p2.x, p2.y);
  await page.mouse.click(p3.x, p3.y);

  // D10-Fix: Esc committet die Kette (massKetteAbschliessen-Weg über
  // `handlersRef.current.onEscape`) auch ohne Viewport3D-Mount — vorher blieb
  // sie in reinem view-2d ungespeichert (Escape-Listener lebte nur in
  // Viewport3D.tsx, 3d/split).
  await page.keyboard.press('Escape');

  const massketten = await page.evaluate(
    () => window.__kosmo.state().doc.byKind('masskette') as { punkte: unknown[] }[],
  );
  expect(massketten).toHaveLength(1);
  expect(massketten[0]!.punkte).toHaveLength(3);

  await page.screenshot({ path: 'e2e-results/pb1-085-d10-esc-2d.png' });

  // Bestehende Esc-Stufenfolge (PA1) bleibt intakt: ein WEITERES Esc leert
  // jetzt die Auswahl (dritte Stufe) statt erneut etwas zu committen/werfen —
  // das Werkzeug ist nach dem ersten Esc bereits 'auswahl' (ArchiCAD-Reflex).
  await page.mouse.click(p1.x, p1.y); // wählt die eben erstellte Masskette an
  await expect.poll(() => page.evaluate(() => window.__kosmo.state().selection.length)).toBe(1);
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => window.__kosmo.state().selection.length)).toBe(0);
});
