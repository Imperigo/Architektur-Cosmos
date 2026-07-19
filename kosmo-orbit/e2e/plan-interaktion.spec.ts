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
  // Fenster, aber weit genug von der Wandachse weg, um sie nicht zu treffen).
  // v0.7.4: OBERHALB der Wand (Welt-y 6000) statt darunter (−2000) — das
  // Boden-Dock (v0.7.3, `boden-dock`) sitzt unten-mittig und deckte den
  // alten Punkt (Bildschirm ~y769) → der Deselect-Klick landete auf
  // `boden-dock-tool-viz` und navigierte zu KosmoVis. Der neue Punkt liegt
  // auf freier Planfläche über der Wandachse, klar oberhalb der Dock-Reihe.
  const leer = await weltZuBildschirm(page, 5000, 6000);
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

/**
 * PB3-088 (V088-SPEZ §7 C-13) — ersetzt geschätzte feste Wartezeiten nach
 * Fit-/Zoom-Aktionen durch eine echte Zustandsbedingung: wartet, bis das
 * `transform`-Attribut der Plan-Inhalts-Gruppe (`[data-testid="planview"] > g`
 * — dieselbe Matrix wie `weltZuBildschirm`/`planScale`) für `ruheMs` am Stück
 * UNVERÄNDERT bleibt. `view`/`scale` sind reiner PlanView-Lokalzustand (nicht
 * Teil von `__kosmo.state()`), darum ist ein DOM-Locator-Zustand (MutationObserver)
 * hier die einzig echte Poll-Quelle — Muster wörtlich aus `wartetBisRuhig()` in
 * `kurztasten-pan.spec.ts` (v0.8.1/P2-Lehre) übernommen: die Ruhe-Uhr läuft ab
 * dem Aufruf und wird bei JEDER Mutation zurückgesetzt, läuft im Browser selbst
 * (kein Node↔Browser-Poll-Race) und terminiert korrekt auch dann, wenn GAR
 * NICHTS mutiert (Ruhe-Uhr erreicht `ruheMs`, ohne je zurückgesetzt worden zu
 * sein) — deckt damit sowohl «auf eine laufende Federanimation warten» als auch
 * «beweisen, dass NICHTS (mehr) passiert» ab, ohne eine Dauer zu erraten.
 */
async function wartetAufTransformRuhe(page: Page, ruheMs = 250, timeoutMs = 5000): Promise<void> {
  await page.evaluate(
    ({ ruheMs, timeoutMs }) => {
      return new Promise<void>((resolve) => {
        const svg = document.querySelector('[data-testid="planview"]');
        const inhalt = svg?.querySelector(':scope > g') ?? null;
        if (!inhalt) {
          resolve();
          return;
        }
        const start = performance.now();
        let letzteAenderung = start;
        const beobachter = new MutationObserver(() => {
          letzteAenderung = performance.now();
        });
        beobachter.observe(inhalt, { attributes: true, attributeFilter: ['transform'] });
        const tick = () => {
          const jetzt = performance.now();
          if (jetzt - letzteAenderung >= ruheMs || jetzt - start >= timeoutMs) {
            beobachter.disconnect();
            resolve();
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    },
    { ruheMs, timeoutMs },
  );
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
  // Ersetzt: fixe 300ms nach dem Fit-Klick. `einpassen()` (PlanView.tsx)
  // setzt `view` synchron im Klick-Handler, aber der Dock-Solver
  // (`useDockZeichenfeld`) kann eine ResizeObserver-getaktete Nachkorrektur
  // nachschieben — die echte Bedingung ist «die transform-Matrix ist fertig
  // geschrieben», nicht «300ms sind vergangen».
  await wartetAufTransformRuhe(page);

  // Standard-Werkzeug ist «Auswahl» (siehe Test oben) — kein Extra-Klick nötig.
  // Frisches Projekt (keine Wände/Zonen gezeichnet) → JEDE Stelle im
  // sichtbaren Plan ist leer, darum reicht die SVG-Mitte per Bounding-Box
  // (robust gegen Fit-Skalierung, kein Off-Screen-Risiko wie bei einer
  // Welt-mm-Koordinate weit ausserhalb des eingepassten Ausschnitts).
  const vorScale = await planScale(page);
  const box = (await page.locator('[data-testid="planview"]').boundingBox())!;
  const mitte = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.click(mitte.x, mitte.y, { clickCount: 2 });

  // Federanimation läuft aus (--k-feder 260ms, ~2% Überschwung) — ersetzt:
  // fixe 500ms «grosszügig warten». `wartetAufTransformRuhe` pollt die ECHTE
  // Bedingung («die Federanimation hat aufgehört, das transform-Attribut zu
  // mutieren») statt eine Dauer zu erraten — robust auch bei einer unter
  // Last verzögert startenden/laufenden rAF-Taktung (dieselbe Klasse Flake
  // wie die Fling-Härtung in `kurztasten-pan.spec.ts`, v0.8.1/P2).
  await wartetAufTransformRuhe(page, 200);
  const nachScale = await planScale(page);
  expect(nachScale).toBeGreaterThan(vorScale * 1.7);
  expect(nachScale).toBeLessThan(vorScale * 2.3); // ~Faktor 2, kein Wegdriften

  // Wert bleibt stabil (Animation ist wirklich fertig, kein Weiterlaufen ins
  // Unendliche) — ersetzt: fixe 200ms. Ein zweiter `wartetAufTransformRuhe`-
  // Aufruf beweist ECHTE Ruhe über ein weiteres Fenster (statt sie nur
  // anzunehmen): mutiert doch noch etwas nach, verlängert die Ruhe-Uhr real.
  await wartetAufTransformRuhe(page, 200);
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
  // Ersetzt: fixe 300ms nach dem Fit-Klick, s. Begründung im Zoom-Faktor-2-Test oben.
  await wartetAufTransformRuhe(page);

  const vorScale = await planScale(page);
  const mitte = await weltZuBildschirm(page, 5000, 2000); // Wandmitte — ein echter Treffer
  await page.mouse.click(mitte.x, mitte.y, { clickCount: 2 });
  // Ersetzt: fixe 400ms «genug Zeit für eine (nicht stattfindende) Animation».
  // `wartetAufTransformRuhe` beweist die Abwesenheit ECHT (die Ruhe-Uhr läuft
  // bis zum Timeout durch, weil nie eine Mutation sie zurücksetzt) statt eine
  // Dauer zu erraten, die «wahrscheinlich lang genug» ist.
  await wartetAufTransformRuhe(page, 350);
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
  // Ersetzt: fixe 300ms nach dem Fit-Klick, s. Begründung im Zoom-Faktor-2-Test oben.
  await wartetAufTransformRuhe(page);
  const mitte = await weltZuBildschirm(page, 5000, 2000);

  // Rechtsklick öffnet dasselbe Kontextmenü-Bauteil wie im 3D-Viewport.
  await page.mouse.click(mitte.x, mitte.y, { button: 'right' });
  await expect(page.locator('[data-testid="viewport-kontextmenue"]')).toBeVisible();
  await expect(page.locator('[data-testid="kontext2d-auswaehlen"]')).toBeVisible();
  // PB1 C-11 (docs/V084-SPEZ.md §7 D8): Ausbau auf Element-Treffer trägt jetzt
  // auch «Eigenschaften» und «Löschen» (eigene Testfälle in
  // `pb1-bearbeiten.spec.ts`, hier nur die Existenz neben dem Bestandsweg).
  await expect(page.locator('[data-testid="kontext2d-eigenschaften"]')).toBeVisible();
  await expect(page.locator('[data-testid="kontext2d-loeschen"]')).toBeVisible();
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
  // PB1 C-12: Highlight ist jetzt zwei Schichten (Kernstrich 28px statt 22px
  // + eine neue Glow-Schicht in `--k-accent-wash`) — Vorher/Nachher-Beleg im
  // Bericht, hier der Live-DOM-Beweis für den Endwert.
  await expect(selHighlight).toHaveAttribute('stroke-width', '28');
  await expect(page.locator('[data-testid="auswahl-glow"]')).toBeAttached();
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
