import { expect, test, type Page } from '@playwright/test';

/**
 * T1: 2D-Plan-Interaktion auf ArchiCAD-Niveau — Anwählen, Ziehen (ein
 * design.verschieben, undo-fähig) und Doppelklick-Absetzen beim Zeichnen.
 * Bildschirm-Koordinaten werden NIE geschätzt: die Test-Hilfe liest die
 * lebende `transform`-Matrix aus dem Plan-SVG und rechnet Welt-mm exakt in
 * Bildschirm-Pixel um (robust gegen Zoom/Pan/Split-Layout).
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[] };
      state: () => {
        activeStoreyId: string | null;
        doc: {
          byKind: (k: string) => { id: string; name?: string; outline?: { x: number; y: number }[] }[];
          get: (id: string) => { a: { x: number; y: number }; b: { x: number; y: number } } | undefined;
        };
      };
    };
  }
}

/** Liest translate/scale/translate aus dem `<g>` im Plan-SVG und rechnet Welt-mm → Bildschirm-Pixel um. */
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

test('Plan-Interaktion: Wand anwählen, per Maus-Drag verschieben (ein Undo-Schritt)', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG
  await page.click('[data-testid="view-2d"]'); // volle Breite, ruhigere Koordinaten

  const wallId = await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW'))!;
    const r = k.run('design.wandZeichnen', {
      storeyId: st.activeStoreyId,
      a: { x: 4000, y: 2000 },
      b: { x: 6000, y: 2000 },
      assemblyId: aw.id,
    });
    return r.patches[0]!.id;
  });

  // Befund 1: Standard-Werkzeug ist «Auswahl» (ArchiCAD-Gefühl) — kein Extra-Klick
  // nötig, ein Klick auf die Wand wählt sie an statt eine neue zu zeichnen.
  const mitte = await weltZuBildschirm(page, 5000, 2000); // Wandmitte
  await page.mouse.click(mitte.x, mitte.y);

  await expect(page.locator('[data-testid="inspector"]')).toBeVisible();
  await expect(page.locator('[data-testid="auswahl-highlight"]')).toBeVisible();

  // Klick ins Leere hebt die Auswahl wieder auf (Punkt bleibt sichtbar im
  // Fenster, aber weit genug von der Wandachse weg, um sie nicht zu treffen)
  const leer = await weltZuBildschirm(page, 5000, -2000);
  await page.mouse.click(leer.x, leer.y);
  await expect(page.locator('[data-testid="inspector"]')).toHaveCount(0);

  // Erneut anwählen, dann per Maus-Drag verschieben
  await page.mouse.click(mitte.x, mitte.y);
  await expect(page.locator('[data-testid="inspector"]')).toBeVisible();

  const ziel = await weltZuBildschirm(page, 3500, 3000); // dx −1500, dy +1000 mm
  await page.mouse.move(mitte.x, mitte.y);
  await page.mouse.down();
  await page.mouse.move((mitte.x + ziel.x) / 2, (mitte.y + ziel.y) / 2, { steps: 6 });
  await page.mouse.move(ziel.x, ziel.y, { steps: 6 });
  await page.mouse.up();

  // Befund 2: die neue Position landet als EIN design.verschieben im Modell
  await expect
    .poll(() => page.evaluate((id) => window.__kosmo.state().doc.get(id)!.a, wallId))
    .toEqual({ x: 2500, y: 3000 });
  const nachDrag = await page.evaluate((id) => window.__kosmo.state().doc.get(id)!, wallId);
  expect(nachDrag.b).toEqual({ x: 4500, y: 3000 });
  await expect(page.locator('[data-testid="last-action"]')).toContainText('Verschieben');

  // Undo macht genau diesen einen Schritt rückgängig
  await page.click('[data-testid="undo"]');
  const nachUndo = await page.evaluate((id) => window.__kosmo.state().doc.get(id)!, wallId);
  expect(nachUndo.a).toEqual({ x: 4000, y: 2000 });
  expect(nachUndo.b).toEqual({ x: 6000, y: 2000 });
});

test('Plan-Interaktion: Doppelklick schliesst die Zonen-Platzierung ohne Rückweg zum Startpunkt ab', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="view-2d"]');
  await page.click('[data-testid="tool-zone"]');

  const vorher = await page.evaluate(() => window.__kosmo.state().doc.byKind('zone').length);

  const a = await weltZuBildschirm(page, 4000, 4000);
  const b = await weltZuBildschirm(page, 6000, 4000);
  const c = await weltZuBildschirm(page, 5000, 6500);
  await page.mouse.click(a.x, a.y);
  await page.mouse.click(b.x, b.y);
  // Doppelklick am dritten Eckpunkt — schliesst sofort, ohne zum Start
  // zurückzuklicken (das bisherige einzige Schliess-Gefühl).
  await page.mouse.click(c.x, c.y, { clickCount: 2 });

  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('zone').length))
    .toBe(vorher + 1);
  const zonen = await page.evaluate(() => window.__kosmo.state().doc.byKind('zone'));
  const neu = zonen[zonen.length - 1]!;
  expect(neu.outline).toHaveLength(3);

  // Werkzeug ist wieder bereit für die nächste Zone (kein hängender Punkt)
  await expect(page.locator('[data-testid="live-flaeche"]')).toHaveCount(0);
});

/** Liest den `scale(...)`-Faktor aus derselben `transform`-Matrix wie `weltZuBildschirm`. */
async function planScale(page: Page): Promise<number> {
  const svg = page.locator('[data-testid="planview"]');
  const transform = await svg.locator('> g').first().getAttribute('transform');
  const m = transform!.match(/scale\(([-\d.]+)\)/);
  return Number(m![1]);
}

test('v0.6.6 Welle 2 Stream C: Doppelklick auf leere Fläche (Auswahl-Werkzeug) zoomt Faktor 2', async ({ page }) => {
  // §7: Bewegung wird HIER gezielt geprüft — eigene Spec-Zeile ohne die
  // projektweite reduced-motion-Fixture.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="view-2d"]');
  await page.click('[data-testid="nav-fit"]');
  await page.waitForTimeout(300);

  // Standard-Werkzeug ist «Auswahl» (siehe Test oben) — kein Extra-Klick nötig.
  // Frisches Projekt (keine Wände/Zonen gezeichnet) → JEDE Stelle im
  // sichtbaren Plan ist leer, darum reicht die SVG-Mitte per Bounding-Box
  // (robust gegen Fit-Skalierung, kein Off-Screen-Risiko wie bei einer
  // Welt-mm-Koordinate weit ausserhalb des eingepassten Ausschnitts).
  const vorScale = await planScale(page);
  const box = (await page.locator('[data-testid="planview"]').boundingBox())!;
  const mitte = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.click(mitte.x, mitte.y, { clickCount: 2 });

  // Federanimation läuft aus (--k-feder 260ms, ~2% Überschwung) — erst
  // GROSSZÜGIG warten, bis sie fertig ist, DANN erst den Endwert lesen
  // (ein `expect.poll`-Treffer mitten im Überschwung wäre kein Endwert).
  await page.waitForTimeout(500);
  const nachScale = await planScale(page);
  expect(nachScale).toBeGreaterThan(vorScale * 1.7);
  expect(nachScale).toBeLessThan(vorScale * 2.3); // ~Faktor 2, kein Wegdriften

  // Wert bleibt stabil (Animation ist wirklich fertig, kein Weiterlaufen ins Unendliche).
  await page.waitForTimeout(200);
  expect(await planScale(page)).toBeCloseTo(nachScale, 2);
});

test('v0.6.6 Welle 2 Stream C: Doppelklick auf ein Element (Auswahl-Werkzeug) zoomt NICHT — Element beansprucht die Geste', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="view-2d"]');

  await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW'))!;
    k.run('design.wandZeichnen', { storeyId: st.activeStoreyId, a: { x: 4000, y: 2000 }, b: { x: 6000, y: 2000 }, assemblyId: aw.id });
  });
  await page.click('[data-testid="nav-fit"]');
  await page.waitForTimeout(300);

  const vorScale = await planScale(page);
  const mitte = await weltZuBildschirm(page, 5000, 2000); // Wandmitte — ein echter Treffer
  await page.mouse.click(mitte.x, mitte.y, { clickCount: 2 });
  await page.waitForTimeout(400); // genug Zeit für eine (nicht stattfindende) Animation
  expect(await planScale(page)).toBeCloseTo(vorScale, 5);
});

test('v0.6.6 Welle 2 Stream C: Touch-Longpress auf ein Element öffnet das Kontextmenü; Rechtsklick ebenso', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="view-2d"]');

  const wallId = await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW'))!;
    const r = k.run('design.wandZeichnen', { storeyId: st.activeStoreyId, a: { x: 4000, y: 2000 }, b: { x: 6000, y: 2000 }, assemblyId: aw.id });
    return r.patches[0]!.id;
  });
  await page.click('[data-testid="nav-fit"]');
  await page.waitForTimeout(300);
  const mitte = await weltZuBildschirm(page, 5000, 2000);

  // Rechtsklick öffnet dasselbe Kontextmenü-Bauteil wie im 3D-Viewport.
  await page.mouse.click(mitte.x, mitte.y, { button: 'right' });
  await expect(page.locator('[data-testid="viewport-kontextmenue"]')).toBeVisible();
  await expect(page.locator('[data-testid="kontext2d-auswaehlen"]')).toBeVisible();
  // Ein Klick auf den Deckel (deutlich AUSSERHALB des Menü-Panels, das bei
  // `mitte` selbst beginnt und nach unten-rechts wächst) schliesst das Menü —
  // `ViewportKontextmenue.tsx` legt einen vollflächigen Deckel über die Ansicht.
  const box = (await page.locator('[data-testid="planview"]').boundingBox())!;
  await page.mouse.click(box.x + 10, box.y + 10);
  await expect(page.locator('[data-testid="viewport-kontextmenue"]')).toHaveCount(0);

  // Touch-Longpress (>500ms halten, keine Bewegung) — derselbe Weg wie im 3D
  // (`gestenDetektor().pruefeLongPress`), hier additiv im 2D-Plan verdrahtet.
  await page.evaluate(
    ({ x, y }) => {
      const svg = document.querySelector('[data-testid="planview"]') as SVGSVGElement;
      svg.dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerId: 42, pointerType: 'touch', button: 0, buttons: 1,
          clientX: x, clientY: y, bubbles: true, cancelable: true, composed: true,
        }),
      );
    },
    mitte,
  );
  await expect(page.locator('[data-testid="viewport-kontextmenue"]')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('[data-testid="kontext2d-auswaehlen"]')).toBeVisible();

  // «Auswählen» wählt tatsächlich das getroffene Element an.
  await page.click('[data-testid="kontext2d-auswaehlen"]');
  await expect(page.locator('[data-testid="viewport-kontextmenue"]')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length)).toBe(1);
  const selHighlight = page.locator('[data-testid="auswahl-highlight"]');
  await expect(selHighlight).toBeAttached();
  void wallId;

  // Aufräumen: den hängenden Touch-Pointer beenden (kein Effekt auf die Assertions oben).
  await page.evaluate(
    ({ x, y }) => {
      const svg = document.querySelector('[data-testid="planview"]') as SVGSVGElement;
      svg.dispatchEvent(
        new PointerEvent('pointerup', {
          pointerId: 42, pointerType: 'touch', button: 0, buttons: 0,
          clientX: x, clientY: y, bubbles: true, cancelable: true, composed: true,
        }),
      );
    },
    mitte,
  );
});
