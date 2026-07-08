import { expect, test } from '@playwright/test';
import { projektStarten, waendeZeichnen, dachSetzen, treppeSetzen, exportPruefen } from './sim/bausteine';
import { SZENARIEN } from './sim/szenarien';

/**
 * V1.6 Block H — Vollhaus-Simulationsläufe (Owner-Auftrag 07.07.).
 *
 * Drei Läufe zeigen die drei Eingabewege, mit denen ein Architekt bei Kosmo
 * ein komplettes Haus entwirft — jeder Lauf baut von Anfang bis Ende selbst
 * und legt am Ende Screenshots + (Lauf 1) exportierte Dateien ab, damit das
 * Endresultat zum Draufschauen bereitliegt (e2e-results/vollhaus-*).
 *
 * Ehrlichkeit vorweg (steht auch im Owner-Bericht):
 *  - «Draw with Kosmo (primitiv)» = die design.*-Commands, exakt der Weg, den
 *    ein Klick im Werkzeug ODER ein Kosmo-Tool-Call nimmt (runCommand). Voll.
 *  - «Sketch with Kosmo» = KosmoSketch-Striche → BIM. Voll.
 *  - «Speak with Kosmo» = im Container der TEXT-Pfad: die transkribierte Zeile
 *    geht durch dieselbe Kosmo-Chat-Naht wie ein echtes Whisper-Transkript.
 *    Der Audio→Text-Schritt (Whisper, CH-Deutsch) ist HomeStation-Abnahme —
 *    hier wird die Zeile getippt statt gesprochen, der REST ist identisch.
 */

const szenario = SZENARIEN.efh;

test.describe('V1.6 Block H — Vollhaus', () => {
  test('Draw with Kosmo (primitiv): ein komplettes EFH von A bis Z', async ({ page }) => {
    test.setTimeout(180_000);
    await projektStarten(page, szenario);

    // Aufbauten anlegen (Aussen-/Innenwand) — self-contained, wie der
    // Golden-Test; waendeZeichnen löst den Aufbau über das Namenspräfix auf.
    await page.evaluate(() => {
      const k = window.__kosmo;
      k.run('design.aufbauErstellen', {
        name: 'AW',
        target: 'wall',
        layers: [
          { material: 'putz', thickness: 20, function: 'bekleidung' },
          { material: 'daemmung-mw', thickness: 180, function: 'daemmung' },
          { material: 'beton', thickness: 180, function: 'tragend' },
        ],
      });
      k.run('design.aufbauErstellen', {
        name: 'IW',
        target: 'wall',
        layers: [{ material: 'kalksandstein', thickness: 150, function: 'tragend' }],
      });
    });

    // Aussenhülle: ein 10×8-m-Rechteck (Erdgeschoss).
    const aussen = [
      { a: { x: 0, y: 0 }, b: { x: 10000, y: 0 } },
      { a: { x: 10000, y: 0 }, b: { x: 10000, y: 8000 } },
      { a: { x: 10000, y: 8000 }, b: { x: 0, y: 8000 } },
      { a: { x: 0, y: 8000 }, b: { x: 0, y: 0 } },
    ];
    await waendeZeichnen(page, aussen, 'AW');
    // Innenwand: eine Trennwand → zwei Räume.
    await waendeZeichnen(page, [{ a: { x: 4000, y: 0 }, b: { x: 4000, y: 8000 } }], 'IW');

    // Fenster + Tür in die Südwand stanzen (erste gezeichnete Wand).
    const fensterTuer = await page.evaluate(() => {
      const k = window.__kosmo;
      const st = k.state();
      const suedwand = st.doc.byKind('wall')[0]!;
      const f = k.run('design.oeffnungSetzen', {
        wallId: suedwand.id, openingType: 'fenster', center: 2000, width: 1600, height: 1400, sill: 900,
      }).patches.length;
      const t = k.run('design.oeffnungSetzen', {
        wallId: suedwand.id, openingType: 'tuer', center: 7000, width: 1000, height: 2100, sill: 0, swing: 'links',
      }).patches.length;
      return { f, t, oeffnungen: st.doc.byKind('opening').length };
    });
    expect(fensterTuer.f).toBeGreaterThan(0);
    expect(fensterTuer.t).toBeGreaterThan(0);
    await expect
      .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('opening').length))
      .toBeGreaterThanOrEqual(2);

    // Räume (Zonen) mit Typ setzen → Möblierung. Raumtyp/Name/SIA gehen direkt
    // in zoneErstellen; Möbel sitzen per storeyId+at im Geschoss (Kernel-API).
    await page.evaluate(() => {
      const k = window.__kosmo;
      const st = k.state();
      const sid = st.activeStoreyId;
      k.run('design.zoneErstellen', {
        storeyId: sid, name: 'Wohnen', sia: 'HNF', raumTyp: 'wohnen',
        outline: [{ x: 200, y: 200 }, { x: 3800, y: 200 }, { x: 3800, y: 7800 }, { x: 200, y: 7800 }],
      });
      k.run('design.zoneErstellen', {
        storeyId: sid, name: 'Zimmer', sia: 'HNF', raumTyp: 'zimmer',
        outline: [{ x: 4200, y: 200 }, { x: 9800, y: 200 }, { x: 9800, y: 7800 }, { x: 4200, y: 7800 }],
      });
      k.run('design.moebelSetzen', { storeyId: sid, typ: 'esstisch', at: { x: 2000, y: 4000 } });
      k.run('design.moebelSetzen', { storeyId: sid, typ: 'bett-doppel', at: { x: 7000, y: 4000 } });
    });
    await expect
      .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('zone').length))
      .toBeGreaterThanOrEqual(2);

    // Treppe (ins Obergeschoss) + Dach.
    const sid = await page.evaluate(() => window.__kosmo.state().activeStoreyId!);
    await treppeSetzen(page, { storeyId: sid, a: { x: 4200, y: 3000 }, b: { x: 5800, y: 3000 }, width: 1000 });
    await dachSetzen(page, { storeyId: sid, outline: [{ x: 0, y: 0 }, { x: 10000, y: 0 }, { x: 10000, y: 8000 }, { x: 0, y: 8000 }], pitch: 25 });

    // Kennzahlen leben (HNF > 0) — der Beweis, dass das Haus «rechnet».
    await page.click('[data-testid="view-2d"]');
    const kennzahlen = page.locator('[data-testid="kennzahlen"]');
    await expect(kennzahlen).toBeVisible();
    await expect(kennzahlen).toContainText(/m²/);

    // 3D-Gesamtbild → Screenshot.
    await page.click('[data-testid="view-quad"]');
    await page.evaluate(() => window.__kosmoViewport.renderOnce());
    await expect(page.locator('[data-testid="viewport3d"] canvas')).toBeVisible();
    await page.screenshot({ path: 'e2e-results/vollhaus-draw-3d.png', fullPage: true });

    // Grundriss → Screenshot.
    await page.click('[data-testid="view-2d"]');
    await expect(page.locator('[data-testid="plan-svg"], [data-testid="planview"]').first()).toBeVisible();
    await page.screenshot({ path: 'e2e-results/vollhaus-draw-grundriss.png', fullPage: true });

    // Exporte: IFC (BIM) + DXF (CAD-Interop) — die «Endresultat»-Dateien.
    await exportPruefen(page, 'export-ifc', /\.ifc$/);
    const dxfPfad = await exportPruefen(page, 'export-dxf', /\.dxf$/);
    // DXF-Inhalt beweisen: R2000-Kopf, Entities-Sektion, Wand-Poché, EOF.
    const dxf = await (await import('node:fs/promises')).readFile(dxfPfad, 'utf8');
    expect(dxf).toContain('AC1009'); // AutoCAD R12 (max. Interop)
    expect(dxf).toContain('0\nSECTION\n2\nENTITIES\n');
    expect(dxf).toContain('0\nPOLYLINE\n'); // Wand-Poché
    expect(dxf.trimEnd().endsWith('0\nEOF')).toBe(true);
    await page.screenshot({ path: 'e2e-results/vollhaus-draw-fertig.png', fullPage: true });

    // Modell-Bilanz als harter Beweis, dass ein VOLLES Haus steht.
    const bilanz = await page.evaluate(() => {
      const d = window.__kosmo.state().doc;
      return {
        waende: d.byKind('wall').length,
        oeffnungen: d.byKind('opening').length,
        zonen: d.byKind('zone').length,
        moebel: d.byKind('furniture').length,
        treppen: d.byKind('stair').length,
        daecher: d.byKind('roof').length,
      };
    });
    expect(bilanz.waende).toBeGreaterThanOrEqual(5);
    expect(bilanz.oeffnungen).toBeGreaterThanOrEqual(2);
    expect(bilanz.zonen).toBeGreaterThanOrEqual(2);
    expect(bilanz.moebel).toBeGreaterThan(0);
    expect(bilanz.treppen).toBe(1);
    expect(bilanz.daecher).toBe(1);
  });

  test('Sketch with Kosmo: Freihand-Striche werden zu Wänden', async ({ page }) => {
    test.setTimeout(120_000);
    await projektStarten(page, szenario);
    await page.evaluate(() => {
      window.__kosmo.run('design.aufbauErstellen', {
        name: 'AW', target: 'wall',
        layers: [{ material: 'beton', thickness: 180, function: 'tragend' }],
      });
    });

    // Skizzen-Werkzeug an → Overlay im Plan. Der Tool-Umschalter rendert die
    // Knöpfe als `tool-${id}` (DesignWorkspace), das Skizzen-Tool ist 'skizze'.
    await page.click('[data-testid="view-2d"]');
    await page.click('[data-testid="tool-skizze"]');
    const overlay = page.locator('[data-testid="sketch-overlay"]');
    await expect(overlay).toBeVisible({ timeout: 10_000 });

    // Zwei Freihand-Striche (ein L) auf die Skizzenfläche.
    const box = (await overlay.boundingBox())!;
    const zeichne = async (x1: number, y1: number, x2: number, y2: number) => {
      await page.mouse.move(box.x + x1, box.y + y1);
      await page.mouse.down();
      await page.mouse.move(box.x + (x1 + x2) / 2, box.y + (y1 + y2) / 2, { steps: 6 });
      await page.mouse.move(box.x + x2, box.y + y2, { steps: 6 });
      await page.mouse.up();
    };
    await zeichne(120, 140, 420, 140);
    await zeichne(420, 140, 420, 360);

    const vorher = await page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length);
    await page.click('[data-testid="sketch-uebergeben"]');
    // KosmoSketch fittet die Striche zu Wänden und zeigt sie als Vorschlag —
    // «Übernehmen» committet sie als EINEN Aufruf (eine Undo-Gruppe).
    await expect(page.locator('[data-testid="sketch-proposal"]')).toBeVisible({ timeout: 15_000 });
    await page.click('[data-testid="sketch-accept"]');
    await expect
      .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length))
      .toBeGreaterThan(vorher);
    await page.screenshot({ path: 'e2e-results/vollhaus-sketch.png', fullPage: true });
  });

  test('Speak with Kosmo (Text-Pfad): gesprochene Anweisung baut mit', async ({ page }) => {
    test.setTimeout(120_000);
    await projektStarten(page, szenario);

    // Speak = Chat-Naht: die transkribierte Zeile geht durch denselben Weg wie
    // ein Whisper-Transkript. Ein bewiesener Mock-Intent baut eine Wand (die
    // Diff-Karte läuft durch runCommand — Undo/Yjs wie ein Klick).
    const vorher = await page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length);
    await page.fill('[data-testid="kosmo-input"]', 'Zeichne eine Wand von 0,0 bis 6000,0');
    await page.click('[data-testid="kosmo-send"]');
    const proposal = page.locator('[data-testid="proposal-card"]').first();
    await expect(proposal).toBeVisible({ timeout: 15_000 });
    await page.click('[data-testid="apply-proposal"]', { timeout: 15_000 });
    await expect
      .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length))
      .toBeGreaterThan(vorher);
    await page.screenshot({ path: 'e2e-results/vollhaus-speak.png', fullPage: true });
  });
});
