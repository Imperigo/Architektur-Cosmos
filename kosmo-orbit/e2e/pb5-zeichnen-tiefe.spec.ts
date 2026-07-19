import { expect, test, type Page } from '@playwright/test';

/**
 * PB5 «Zeichnen-Tiefe» (v0.8.4, W4, docs/V084-SPEZ.md §7 D8/D13, §8 C-26).
 * ArchiCAD-Gefühl für die zwei Entitäten, die PB1 (v0.8.4 W2) bewusst
 * ausklammerte, weil sie keine `outline` im Sinn von `plan-hit-test.ts`
 * haben: Masskette (`design.massKetteSetzen`, offene Punktkette) und
 * Kommentar (`design.kommentarSetzen`, ein Welt-Punkt).
 *
 *   - Wählen/Verschieben/Löschen: `PlanView.tsx`s `pickAt` bekam einen
 *     eigenen Trefferzonen-Zweig für beide Kinds VOR dem bestehenden
 *     `pickEntityAt`-Fallback; die Auswahl-Highlight-Schicht (dasselbe
 *     28/48-Kern+Glow-Muster wie PB1) bekam einen eigenen Zweig, weil
 *     `outlineOf` für beide `null` liefert. Löschen läuft unverändert über
 *     `design.loeschen` (kernelseitig bereits generisch, kein Kind-Zweig
 *     nötig). Verschieben hat KEINEN `design.verschieben`-Zweig im Kernel
 *     für diese zwei Kinds (Spez-Widerspruch zu §7 D8, s. PB5-Bericht) —
 *     `DesignWorkspace.tsx`s `onMoveEnd` löst das über die bestehenden
 *     generischen Loeschen+Setzen-Commands als EINE `history`-Gruppe
 *     (Löschen+Neusetzen = EIN Undo-Schritt, die Entity-ID wechselt dabei —
 *     Undo bringt trotzdem die URSPRÜNGLICHE ID zurück, s. `invertPatches`,
 *     `packages/kosmo-kernel/src/model/doc.ts`).
 *   - Kommentar-Filter: neuer Toggle-Knopf im bestehenden Plan-Chrome
 *     (`pv-toggle-btn`-Familie, neben Achsen/Graph/U-Plan) — blendet die
 *     GANZE `plan-kommentare`-Gruppe aus dem DOM aus UND macht ausgeblendete
 *     Kommentare in `pickAt` nicht mehr trefferbar.
 *   - Kürzel: vier neue Einträge in `kurztasten.ts` (O/M/K/N) — derselbe
 *     generische `kurztasteFuer`-Pfad wie die neun bestehenden, keine
 *     App-Änderung nötig ausser der Registry selbst.
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[] };
      state: () => {
        activeStoreyId: string | null;
        selection: string[];
        doc: {
          byKind: (k: string) => Record<string, unknown>[];
          get: (id: string) => Record<string, unknown> | undefined;
        };
      };
    };
    __kosmoUiBefehle: { ausfuehren: (id: string, params: unknown) => unknown };
  }
}

/** Muster `pb1-bearbeiten.spec.ts`/`masskette-kommentar.spec.ts`: liest die
 *  lebende `transform`-Matrix des Plan-SVGs über `getScreenCTM()`. */
async function weltZuBildschirm(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  return page.evaluate(
    ({ x, y }) => {
      const svg = document.querySelector('[data-testid="planview"]') as SVGSVGElement;
      const g = svg.querySelector('g') as SVGGElement;
      const pt = svg.createSVGPoint();
      pt.x = x;
      pt.y = -y;
      const ctm = g.getScreenCTM()!;
      const transformed = pt.matrixTransform(ctm);
      return { x: transformed.x, y: transformed.y };
    },
    { x, y },
  );
}

async function starteManuell(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="view-2d"]');
}

async function setzeMasskette(page: Page, punkte: { x: number; y: number }[]): Promise<string> {
  return page.evaluate((punkte) => {
    const k = window.__kosmo;
    const storeyId = k.state().activeStoreyId;
    const r = k.run('design.massKetteSetzen', { storeyId, punkte });
    return r.patches[0]!.id;
  }, punkte);
}

async function setzeKommentar(
  page: Page,
  at: { x: number; y: number },
  text = 'PB5-Testkommentar',
): Promise<string> {
  return page.evaluate(
    ({ at, text }) => {
      const k = window.__kosmo;
      const storeyId = k.state().activeStoreyId;
      const r = k.run('design.kommentarSetzen', {
        text,
        autor: 'E2E-Suite',
        at,
        storeyId,
        erstelltAm: '18.07.2026',
      });
      return r.patches[0]!.id;
    },
    { at, text },
  );
}

test.describe('PB5 — Masskette wählen/verschieben/löschen (§8 C-26)', () => {
  test('Klick wählt sie (Highlight 28/48) → Ziehen verschiebt (EIN Undo) → Delete löscht (Undo stellt her)', async ({ page }) => {
    await starteManuell(page);
    await setzeMasskette(page, [
      { x: 4000, y: 4000 },
      { x: 7000, y: 4000 },
      { x: 7000, y: 6000 },
    ]);
    await expect(page.locator('[data-testid="plan-masskette"]')).toBeVisible();

    // Wählen: Klick auf einen Punkt AUF der Kette (Mitte des ersten Segments).
    const punktAufKette = await weltZuBildschirm(page, 5500, 4000);
    await page.mouse.click(punktAufKette.x, punktAufKette.y);
    const kern = page.locator('[data-testid="auswahl-highlight"]');
    const glow = page.locator('[data-testid="auswahl-glow"]');
    await expect(kern).toBeVisible();
    expect(await kern.getAttribute('stroke-width')).toBe('28');
    expect(await glow.getAttribute('stroke-width')).toBe('48');
    await page.screenshot({ path: 'e2e-results/pb5-masskette-highlight.png' });

    // Rechtsklick-Kontextmenü auf derselben gewählten Masskette (C-11-Muster,
    // jetzt auch für Massketten — Beweis + Gate-Screenshot in einem Zug).
    await page.mouse.click(punktAufKette.x, punktAufKette.y, { button: 'right' });
    await expect(page.locator('[data-testid="viewport-kontextmenue"]')).toBeVisible();
    await expect(page.locator('[data-testid="kontext2d-loeschen"]')).toBeVisible();
    await page.screenshot({ path: 'e2e-results/pb5-kontextmenue-masskette.png' });
    // Backdrop-Klick schliesst das Menü (ViewportKontextmenue.tsx: ein
    // transparenter Deckel mit `onClick={onClose}`, `inset:0` über der ganzen
    // `[data-testid="planview"]`-Fläche) — sicherer als Escape, das laut
    // Kopfkommentar dort «der Aufrufer» behandelt, hier ausserhalb des
    // PB5-Dateikreises nicht zwingend verdrahtet ist. Ecke der SVG-Box statt
    // fester Seitenkoordinate, damit der Klick sicher auf dem Deckel landet.
    const svgBox = (await page.locator('[data-testid="planview"]').boundingBox())!;
    await page.mouse.click(svgBox.x + 10, svgBox.y + 10);
    await expect(page.locator('[data-testid="viewport-kontextmenue"]')).toHaveCount(0);

    // Verschieben: Ziehen von einem Kettenpunkt um (+1000, +500) — EIN
    // pointerdown/move/up-Zyklus, wie beim bestehenden Wand-Drag (PB1).
    // Anfasspunkt = Segmentmitte, NICHT ein Kettenpunkt: auf den Punkten
    // sitzen seit v0.8.5 Griffe mit Vorrang (C-17), die nur den einen Punkt
    // verschieben — der Ganzelement-Zug gilt auf der Linie dazwischen.
    const start = await weltZuBildschirm(page, 5500, 4000);
    const ziel = await weltZuBildschirm(page, 6500, 4500);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(ziel.x, ziel.y, { steps: 8 });
    await page.mouse.up();

    await expect.poll(() =>
      page.evaluate(() => window.__kosmo.state().doc.byKind('masskette').length),
    ).toBe(1);
    const nachVerschieben = await page.evaluate(
      () => window.__kosmo.state().doc.byKind('masskette')[0] as unknown as { punkte: { x: number; y: number }[] },
    );
    expect(nachVerschieben.punkte[0]).toEqual({ x: 5000, y: 4500 });
    expect(nachVerschieben.punkte[1]).toEqual({ x: 8000, y: 4500 });
    expect(nachVerschieben.punkte[2]).toEqual({ x: 8000, y: 6500 });

    // EIN Undo macht die ganze Verschiebung rückgängig (Löschen+Neusetzen
    // liefen als EINE `history`-Gruppe) — die ursprünglichen Punkte UND die
    // ursprüngliche ID kommen zurück (`invertPatches` dreht Reihenfolge UND
    // Vorzeichen der Gruppe um).
    await page.click('[data-testid="undo"]');
    const nachUndo = await page.evaluate(
      () => window.__kosmo.state().doc.byKind('masskette')[0] as unknown as { punkte: { x: number; y: number }[] },
    );
    expect(nachUndo.punkte[0]).toEqual({ x: 4000, y: 4000 });

    // Löschen: erneut wählen, Delete, Undo stellt wieder her.
    await page.mouse.click(punktAufKette.x, punktAufKette.y);
    await expect(kern).toBeVisible();
    await page.keyboard.press('Delete');
    await expect.poll(() =>
      page.evaluate(() => window.__kosmo.state().doc.byKind('masskette').length),
    ).toBe(0);

    await page.click('[data-testid="undo"]');
    await expect.poll(() =>
      page.evaluate(() => window.__kosmo.state().doc.byKind('masskette').length),
    ).toBe(1);
  });
});

test.describe('PB5 — Kommentar wählen/löschen (§8 C-26)', () => {
  test('Klick auf den Marker wählt ihn — Delete löscht über design.loeschen, Undo stellt her', async ({ page }) => {
    await starteManuell(page);
    await setzeKommentar(page, { x: 2000, y: 2000 });
    await expect(page.locator('[data-testid="plan-kommentar"]')).toBeVisible();

    const marker = await weltZuBildschirm(page, 2000, 2000);
    await page.mouse.click(marker.x, marker.y);
    await expect(page.locator('[data-testid="auswahl-highlight"]')).toBeVisible();
    await expect(page.locator('[data-testid="auswahl-glow"]')).toBeVisible();

    await page.keyboard.press('Delete');
    await expect.poll(() =>
      page.evaluate(() => window.__kosmo.state().doc.byKind('kommentar').length),
    ).toBe(0);
    await expect(page.locator('[data-testid="plan-kommentar"]')).toHaveCount(0);

    await page.click('[data-testid="undo"]');
    await expect.poll(() =>
      page.evaluate(() => window.__kosmo.state().doc.byKind('kommentar').length),
    ).toBe(1);
  });

  test('Verschieben behält den Status «erledigt» (kein stiller Reset auf «offen»)', async ({ page }) => {
    await starteManuell(page);
    const id = await setzeKommentar(page, { x: -1000, y: -1000 });
    await page.evaluate((id) => {
      window.__kosmo.run('design.kommentarStatusSetzen', { kommentarId: id, status: 'erledigt', erledigtAm: '18.07.2026' });
    }, id);
    await expect(page.locator('[data-testid="plan-kommentar"][data-status="erledigt"]')).toBeVisible();

    const start = await weltZuBildschirm(page, -1000, -1000);
    const ziel = await weltZuBildschirm(page, -500, -500);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(ziel.x, ziel.y, { steps: 8 });
    await page.mouse.up();

    const nachVerschieben = await page.evaluate(
      () => window.__kosmo.state().doc.byKind('kommentar')[0] as unknown as { status: string; erledigtAm?: string; at: { x: number; y: number } },
    );
    expect(nachVerschieben.status).toBe('erledigt');
    expect(nachVerschieben.erledigtAm).toBe('18.07.2026');
    expect(nachVerschieben.at).toEqual({ x: -500, y: -500 });
  });
});

test.describe('PB5 — Kommentar-Filter (§8 C-26, Owner-Auftrag)', () => {
  test('Toggle blendet Plan-Kommentare aus/ein — ausgeblendete sind auch nicht mehr wählbar', async ({ page }) => {
    await starteManuell(page);
    await setzeKommentar(page, { x: 3000, y: 1000 });
    await expect(page.locator('[data-testid="plan-kommentar"]')).toHaveCount(1);
    await page.screenshot({ path: 'e2e-results/pb5-kommentar-filter-ein.png' });

    const toggle = page.locator('[data-testid="kommentar-filter-toggle"]');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.locator('[data-testid="plan-kommentar"]')).toHaveCount(0);
    await page.screenshot({ path: 'e2e-results/pb5-kommentar-filter-aus.png' });

    // Ausgeblendet heisst auch: nicht mehr klickbar (pickAt überspringt ihn).
    const marker = await weltZuBildschirm(page, 3000, 1000);
    await page.mouse.click(marker.x, marker.y);
    await expect(page.locator('[data-testid="auswahl-highlight"]')).toHaveCount(0);

    await toggle.click();
    await expect(page.locator('[data-testid="plan-kommentar"]')).toHaveCount(1);
  });
});

test.describe('PB5 — neue Kürzel aktivieren die Werkzeuge (§7 D13)', () => {
  test('O aktiviert Öffnung — Klick auf eine Wand setzt eine Öffnung (Kernel-Beweis, kein Insel-Popup nötig)', async ({ page }) => {
    await starteManuell(page);
    const wallId = await page.evaluate(() => {
      const k = window.__kosmo;
      const storeyId = k.state().activeStoreyId;
      const aufbau = (k.state().doc.byKind('assembly') as { id: string; name?: string }[]).find((a) => a.name?.startsWith('AW'))!;
      const r = k.run('design.wandZeichnen', { storeyId, a: { x: -4000, y: 0 }, b: { x: 4000, y: 0 }, assemblyId: aufbau.id });
      return r.patches[0]!.id;
    });

    await page.keyboard.press('o');
    const zustand = await page.evaluate(() => window.__kosmoUiBefehle.ausfuehren('ui.zustandLesen', {})) as { tool: string };
    expect(zustand.tool).toBe('oeffnung');

    const wandMitte = await weltZuBildschirm(page, 0, 0);
    await page.mouse.click(wandMitte.x, wandMitte.y);
    const oeffnungen = await page.evaluate(
      (wId) => (window.__kosmo.state().doc.byKind('opening') as { wallId: string }[]).filter((o) => o.wallId === wId),
      wallId,
    );
    expect(oeffnungen).toHaveLength(1);
  });

  test('M aktiviert Messen — Klickkette + Enter (leerer Zahlenpuffer) committet design.massKetteSetzen', async ({ page }) => {
    // Enter statt Escape: der Escape-Weg für «messen» hängt am
    // `onEscape`-Handler in `Viewport3D.tsx` (nur gemountet in '3d'/'split',
    // s. `DesignWorkspace.tsx` Zeile ~3439/3459) — ein VOR PB5 bestehender
    // Pfad, der in reinem `view-2d` (wie hier, `starteManuell`) gar nicht
    // gemountet ist. Enter läuft dagegen über den werkzeugunabhängigen
    // Capture-Handler direkt in `DesignWorkspace.tsx` (C-10, PB1) — der
    // robuste, moduswertunabhängige Abschluss-Weg, den auch
    // `pb1-bearbeiten.spec.ts` («Messen … Enter schliesst die Kette ab»)
    // nutzt. S. PB5-Bericht («Beobachtung»/ehrliche Lücke).
    await starteManuell(page);
    await page.keyboard.press('m');
    const zustand = await page.evaluate(() => window.__kosmoUiBefehle.ausfuehren('ui.zustandLesen', {})) as { tool: string };
    expect(zustand.tool).toBe('messen');

    const p1 = await weltZuBildschirm(page, -2000, 2000);
    const p2 = await weltZuBildschirm(page, 1000, 3000);
    await page.mouse.click(p1.x, p1.y);
    await page.mouse.click(p2.x, p2.y);
    await page.keyboard.press('Enter');

    const massketten = await page.evaluate(() => window.__kosmo.state().doc.byKind('masskette'));
    expect(massketten).toHaveLength(1);
  });

  test('K aktiviert Kommentar, N aktiviert Mesh (Werkzeugwechsel-Beweis über ui.zustandLesen)', async ({ page }) => {
    await starteManuell(page);
    await page.keyboard.press('k');
    let zustand = await page.evaluate(() => window.__kosmoUiBefehle.ausfuehren('ui.zustandLesen', {})) as { tool: string };
    expect(zustand.tool).toBe('kommentar');

    await page.keyboard.press('n');
    zustand = await page.evaluate(() => window.__kosmoUiBefehle.ausfuehren('ui.zustandLesen', {})) as { tool: string };
    expect(zustand.tool).toBe('mesh');

    // Zurück zur Auswahl über Esc (ArchiCAD-Reflex, PB1-Bestand) — Beweis,
    // dass die neuen Kürzel sich in denselben Werkzeug-Kreislauf einfügen.
    await page.keyboard.press('Escape');
    zustand = await page.evaluate(() => window.__kosmoUiBefehle.ausfuehren('ui.zustandLesen', {})) as { tool: string };
    expect(zustand.tool).toBe('auswahl');
  });

  test('Eingabefeld-Guard: die neuen Kürzel feuern NICHT, solange ein Eingabefeld fokussiert ist', async ({ page }) => {
    await starteManuell(page);
    const eingabe = page.locator('input[placeholder*="Kosmo"], textarea').first();
    test.skip((await eingabe.count()) === 0, 'kein Kosmo-Eingabefeld auf diesem Screen sichtbar');
    await eingabe.click();
    await page.keyboard.press('m');
    const zustand = await page.evaluate(() => window.__kosmoUiBefehle.ausfuehren('ui.zustandLesen', {})) as { tool: string };
    expect(zustand.tool).not.toBe('messen');
  });
});

test.describe('PB5 — ?-Overlay zeigt die neuen Kürzel (§7 D13)', () => {
  test('Öffnung/Messen/Kommentar/Mesh erscheinen mit ihren Grossbuchstaben-Tasten', async ({ page }) => {
    await starteManuell(page);
    await page.keyboard.press('?');
    const dialog = page.locator('[data-testid="kurzbefehle"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Öffnung');
    await expect(dialog).toContainText('Messen (Masskette)');
    await expect(dialog).toContainText('Kommentar');
    await expect(dialog).toContainText('Mesh (Netz)');
    const tasten = await dialog.locator('.orbit065-kurzbefehl-taste').allTextContents();
    expect(tasten).toEqual(expect.arrayContaining(['O', 'M', 'K', 'N']));

    await page.screenshot({ path: 'e2e-results/pb5-overlay-kuerzel.png' });
  });
});
