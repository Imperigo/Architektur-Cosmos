import { expect, test, type Page } from '@playwright/test';

/**
 * PB1 «Auswahl & Bearbeiten — ArchiCAD-Gefühl» (v0.8.4, W2, docs/V084-SPEZ.md
 * §7 D8, §8 C-9..C-12). Vier Verdrahtungen, die der Kernel bereits konnte,
 * dem 2D-Plan aber bisher fehlten:
 *   - C-9:  Delete/Backspace löscht die Auswahl über `design.loeschen`
 *           (DesignWorkspace.tsx, Werkzeug-keydown, KEIN Kürzel).
 *   - C-10: Enter (leerer Zahlenpuffer) UND Doppelklick schliessen JEDES
 *           Mehrpunkt-Werkzeug identisch ab (`mehrpunktAbschliessen`,
 *           DesignWorkspace.tsx).
 *   - C-11: Rechtsklick-Kontextmenü (PlanView.tsx/ViewportKontextmenue.tsx) —
 *           auf einem Element: Auswählen/Eigenschaften/Löschen; während
 *           einer aktiven Mehrpunkt-Kette: Abschliessen/Abbrechen (Vorrang
 *           vor einem Element-Treffer darunter).
 *   - C-12: Auswahl-Highlight ist zwei Schichten (Kernstrich + Glow) und
 *           spürbar kräftiger als die alten 22/30px (jetzt 28/48, Ziehen 38/60).
 *
 * Jeder Löschen-Pfad beweist zusätzlich den Undo-Roundtrip (Owner-Auftrag:
 * «Löschen → Ctrl+Z stellt her» ist ein eigener Testfall, kein Nebensatz).
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[] };
      state: () => {
        activeStoreyId: string | null;
        doc: {
          byKind: (k: string) => { id: string; outline?: { x: number; y: number }[] }[];
          get: (id: string) => { a: { x: number; y: number }; b: { x: number; y: number } } | undefined;
        };
      };
    };
  }
}

/** Liest die lebende `transform`-Matrix des Plan-SVGs über `getScreenCTM()` —
 *  robust gegen Zoom/Pan, keine zweite, potenziell abdriftende JS-Rechnung
 *  (Muster `masskette-kommentar.spec.ts`). */
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

test.describe('PB1 — Delete/Backspace löscht die Auswahl (C-9)', () => {
  test('Delete löscht die Auswahl über design.loeschen — Strg+Z stellt sie wieder her', async ({ page }) => {
    await starteManuell(page);
    const wallId = await zeichneWand(page, { x: 4000, y: 2000 }, { x: 6000, y: 2000 });
    const mitte = await weltZuBildschirm(page, 5000, 2000);
    await page.mouse.click(mitte.x, mitte.y);
    await expect(page.locator('[data-testid="auswahl-highlight"]')).toBeVisible();

    await page.keyboard.press('Delete');
    await expect.poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length)).toBe(0);
    await expect(page.locator('[data-testid="inspector"]')).toHaveCount(0);

    await page.click('[data-testid="undo"]');
    await expect.poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length)).toBe(1);
    const wiederhergestellt = await page.evaluate((id) => window.__kosmo.state().doc.get(id), wallId);
    expect(wiederhergestellt).toBeTruthy();
  });

  test('Backspace löscht ebenso; im Eingabefeld fokussiert bleibt die Auswahl unangetastet', async ({ page }) => {
    await starteManuell(page);
    await zeichneWand(page, { x: 4000, y: 2000 }, { x: 6000, y: 2000 });
    const mitte = await weltZuBildschirm(page, 5000, 2000);
    await page.mouse.click(mitte.x, mitte.y);
    await expect(page.locator('[data-testid="auswahl-highlight"]')).toBeVisible();

    // Fokus-Guard: ein Eingabefeld (Kosmo-Chat) verschluckt Backspace normal —
    // die Auswahl bleibt unangetastet (dasselbe Guard-Muster wie kurztasten.ts).
    const eingabe = page.locator('input[placeholder*="Kosmo"], textarea').first();
    if (await eingabe.count()) {
      await eingabe.click();
      await page.keyboard.press('Backspace');
      await expect.poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length)).toBe(1);
      await eingabe.blur();
    }

    await page.keyboard.press('Backspace');
    await expect.poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length)).toBe(0);

    await page.click('[data-testid="undo"]');
    await expect.poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length)).toBe(1);
  });
});

test.describe('PB1 — Abschluss-Gesetz: Enter (leerer Puffer) = Doppelklick (C-10)', () => {
  test('Wand-Kette: Enter beendet die Kette — der nächste Klick verbindet NICHT automatisch weiter', async ({ page }) => {
    await starteManuell(page);
    await page.click('[data-testid="tool-wand"]');

    // Bewusst im selben, bereits andernorts (`plan-interaktion.spec.ts`,
    // Zone-Test unten) geprüften sichtbaren Bereich — Welt-y bis 6500 ist
    // ohne `nav-fit` beim Default-Zoom nachweislich on-screen.
    const p0 = await weltZuBildschirm(page, 4000, 1000);
    const p1 = await weltZuBildschirm(page, 6000, 1000);
    await page.mouse.click(p0.x, p0.y);
    await page.mouse.click(p1.x, p1.y); // committet Wand p0→p1, Kette lebt weiter (Anker=p1)
    await expect.poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length)).toBe(1);

    await page.keyboard.press('Enter'); // leerer Zahlenpuffer → Kette abschliessen, KEIN Command
    await expect(page.locator('[data-testid="mass-label"]')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length)).toBe(1);

    // Ein Klick weit weg von p1 setzt NUR einen neuen Anfangspunkt (Wand
    // braucht zwei Punkte) — bliebe die alte Kette lebendig, würde dieser
    // Klick sofort eine (falsche) Wand von p1 hierher committen.
    const p2 = await weltZuBildschirm(page, 4000, 3000);
    await page.mouse.click(p2.x, p2.y);
    await expect.poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length)).toBe(1);

    const p3 = await weltZuBildschirm(page, 6000, 3000);
    await page.mouse.click(p3.x, p3.y); // committet die ZWEITE Wand, p2→p3
    const waende = await page.evaluate(() => window.__kosmo.state().doc.byKind('wall'));
    expect(waende).toHaveLength(2);
    const neue = waende[1]!;
    expect(neue.a).toEqual({ x: 4000, y: 3000 });
    expect(neue.b).toEqual({ x: 6000, y: 3000 });
  });

  test('Zone: Enter ergänzt den Cursor-Punkt wie ein Doppelklick dort — Umriss bekommt 3 Ecken', async ({ page }) => {
    await starteManuell(page);
    await page.click('[data-testid="tool-zone"]');
    const vorher = await page.evaluate(() => window.__kosmo.state().doc.byKind('zone').length);

    const a = await weltZuBildschirm(page, 4000, 4000);
    const b = await weltZuBildschirm(page, 6000, 4000);
    const c = await weltZuBildschirm(page, 5000, 6500);
    await page.mouse.click(a.x, a.y);
    await page.mouse.click(b.x, b.y);
    await page.mouse.move(c.x, c.y); // Cursor auf den dritten Eckpunkt — OHNE zu klicken
    // Auf den Live-React-Zustand warten (mass-label hängt am `cursor`-State),
    // statt blind auf den Enter-Tastendruck zu vertrauen — sonst ist das
    // Ergebnis vom Mess-Zeitpunkt relativ zur pointermove-Verarbeitung
    // abhängig (dieselbe Klasse Falle wie die v0.8.3-Animations-Lehre).
    await expect(page.locator('[data-testid="live-flaeche"]')).toBeVisible();
    await page.keyboard.press('Enter');

    await expect.poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('zone').length)).toBe(vorher + 1);
    const zonen = await page.evaluate(() => window.__kosmo.state().doc.byKind('zone'));
    expect(zonen[zonen.length - 1]!.outline).toHaveLength(3);
    await expect(page.locator('[data-testid="live-flaeche"]')).toHaveCount(0);
  });

  test('Zahlenpuffer-Sonderfall bleibt unverändert: Enter mit getippter Zahl bestätigt NUR die Zahl — die Kette bleibt aktiv', async ({ page }) => {
    await starteManuell(page);
    await page.click('[data-testid="tool-wand"]');
    const p0 = await weltZuBildschirm(page, 4000, 1000);
    await page.mouse.click(p0.x, p0.y);
    await page.mouse.move(p0.x + 120, p0.y); // Cursor horizontal nach rechts

    await page.keyboard.type('2.5');
    await expect(page.locator('[data-testid="mass-label"]')).toContainText('2.5 m ⏎');
    await page.keyboard.press('Enter'); // NICHT-leerer Puffer → Zahl bestätigen, Kette bleibt aktiv

    await expect.poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length)).toBe(1);
    const erste = await page.evaluate(
      () => window.__kosmo.state().doc.byKind('wall')[0] as unknown as { a: { x: number; y: number }; b: { x: number; y: number } },
    );
    expect(Math.hypot(erste.b.x - erste.a.x, erste.b.y - erste.a.y)).toBe(2500);

    // Beweis, dass die Kette WIRKLICH weiterlebt (kein impliziter Abschluss
    // durchs Enter mit gefülltem Puffer, s. Kopfkommentar): ein zweiter Klick
    // verbindet direkt am eben gesetzten Endpunkt weiter — genau EIN
    // zusätzlicher Klick committet die zweite Wand, kein neuer Anfangspunkt.
    const p2 = await weltZuBildschirm(page, erste.b.x, erste.b.y + 2000);
    await page.mouse.click(p2.x, p2.y);
    const waende = await page.evaluate(() => window.__kosmo.state().doc.byKind('wall'));
    expect(waende).toHaveLength(2);
    expect(waende[1]!.a).toEqual(erste.b);
  });
});

test.describe('PB1 — Rechtsklick-Kontextmenü (C-11)', () => {
  test('Auf einem Element: Auswählen/Eigenschaften/Löschen — Löschen committet design.loeschen, Strg+Z stellt her', async ({ page }) => {
    await starteManuell(page);
    await zeichneWand(page, { x: 4000, y: 2000 }, { x: 6000, y: 2000 });
    const mitte = await weltZuBildschirm(page, 5000, 2000);

    await page.mouse.click(mitte.x, mitte.y, { button: 'right' });
    await expect(page.locator('[data-testid="viewport-kontextmenue"]')).toBeVisible();
    await expect(page.locator('[data-testid="kontext2d-auswaehlen"]')).toBeVisible();
    await expect(page.locator('[data-testid="kontext2d-eigenschaften"]')).toBeVisible();
    await expect(page.locator('[data-testid="kontext2d-loeschen"]')).toBeVisible();

    await page.click('[data-testid="kontext2d-eigenschaften"]');
    await expect(page.locator('[data-testid="viewport-kontextmenue"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="inspector"]')).toBeVisible();
    await expect(page.locator('[data-testid="auswahl-highlight"]')).toBeVisible();

    await page.mouse.click(mitte.x, mitte.y, { button: 'right' });
    await page.click('[data-testid="kontext2d-loeschen"]');
    await expect.poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length)).toBe(0);
    await expect(page.locator('[data-testid="inspector"]')).toHaveCount(0);

    await page.click('[data-testid="undo"]');
    await expect.poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length)).toBe(1);
  });

  test('Während einer aktiven Mehrpunkt-Kette: Abschliessen/Abbrechen statt Auswählen (Vorrang vor Element-Treffer)', async ({ page }) => {
    await starteManuell(page);
    await page.click('[data-testid="tool-zone"]');
    const a = await weltZuBildschirm(page, 4000, 4000);
    const b = await weltZuBildschirm(page, 6000, 4000);
    const c = await weltZuBildschirm(page, 5000, 6500);
    await page.mouse.click(a.x, a.y);
    await page.mouse.click(b.x, b.y);

    await page.mouse.click(c.x, c.y, { button: 'right' });
    await expect(page.locator('[data-testid="viewport-kontextmenue"]')).toBeVisible();
    await expect(page.locator('[data-testid="kontext2d-abschliessen"]')).toBeVisible();
    await expect(page.locator('[data-testid="kontext2d-abbrechen"]')).toBeVisible();
    await expect(page.locator('[data-testid="kontext2d-auswaehlen"]')).toHaveCount(0);

    await page.click('[data-testid="kontext2d-abschliessen"]');
    await expect.poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('zone').length)).toBe(1);
    const zonen = await page.evaluate(() => window.__kosmo.state().doc.byKind('zone'));
    expect(zonen[0]!.outline).toHaveLength(3);
  });

  test('Abbrechen im Kontextmenü verwirft die Kette — keine neue Zone entsteht', async ({ page }) => {
    await starteManuell(page);
    await page.click('[data-testid="tool-zone"]');
    const vorher = await page.evaluate(() => window.__kosmo.state().doc.byKind('zone').length);
    const a = await weltZuBildschirm(page, -4000, 4000);
    const b = await weltZuBildschirm(page, -6000, 4000);
    await page.mouse.click(a.x, a.y);
    await page.mouse.click(b.x, b.y);

    await page.mouse.click(b.x, b.y, { button: 'right' });
    await page.click('[data-testid="kontext2d-abbrechen"]');
    await expect(page.locator('[data-testid="viewport-kontextmenue"]')).toHaveCount(0);

    const nachher = await page.evaluate(() => window.__kosmo.state().doc.byKind('zone').length);
    expect(nachher).toBe(vorher);
    await expect(page.locator('[data-testid="live-flaeche"]')).toHaveCount(0);
  });
});

test.describe('PB1 — Auswahl-Highlight kräftiger (C-12)', () => {
  test('Kernstrich + Glow sind token-basiert und deutlich kräftiger als vorher (28/48px statt 22/—)', async ({ page }) => {
    await starteManuell(page);
    await zeichneWand(page, { x: 4000, y: 2000 }, { x: 6000, y: 2000 });
    const mitte = await weltZuBildschirm(page, 5000, 2000);
    await page.mouse.click(mitte.x, mitte.y);

    const kern = page.locator('[data-testid="auswahl-highlight"]');
    const glow = page.locator('[data-testid="auswahl-glow"]');
    await expect(kern).toBeVisible();
    await expect(glow).toBeAttached();
    expect(await kern.getAttribute('stroke-width')).toBe('28'); // vorher: 22
    expect(await kern.getAttribute('stroke')).toBe('var(--k-accent)');
    expect(await glow.getAttribute('stroke-width')).toBe('48'); // Glow-Schicht ist NEU
    expect(await glow.getAttribute('stroke')).toBe('var(--k-accent-wash)');

    await page.screenshot({ path: 'test-results/pb1-highlight-nachher.png' });
  });
});

test.describe('PB1 — Messen (Island-Oberfläche): Enter schliesst die Kette ab (C-10)', () => {
  // Messen ist ein Island-exklusives Werkzeug (kein `tool-messen` in der
  // manuell-Werkzeugleiste, s. ZEICHEN_WERKZEUG_IDS) — dieser Block setzt den
  // globalen Manuell-Seed ausser Kraft, Muster `masskette-kommentar.spec.ts`.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('Enter mit leerem Zahlenpuffer committet die Messkette — derselbe Weg wie Escape/Doppelklick', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('kosmo.onboarded', '1');
      localStorage.setItem('kosmo.starterGuide.done', '1');
    });
    await page.reload();
    await page.click('[data-testid="module-design"]');
    await page.hover('[data-testid="island-zeichnen-pill"]');
    await expect(page.locator('[data-testid="island-zeichnen-leiste"]')).toBeVisible();
    await page.click('[data-testid="island-werkzeug-messen"]');
    await expect(page.locator('[data-testid="island-messen-popup"]')).toBeVisible();

    const p1 = await weltZuBildschirm(page, -2000, -1500);
    const p2 = await weltZuBildschirm(page, 1000, 500);
    const p3 = await weltZuBildschirm(page, 3000, -500);
    await page.mouse.click(p1.x, p1.y);
    await page.mouse.click(p2.x, p2.y);
    await page.mouse.click(p3.x, p3.y);
    await page.keyboard.press('Enter');

    const massketten = await page.evaluate(
      () => window.__kosmo.state().doc.byKind('masskette') as unknown as { punkte: unknown[] }[],
    );
    expect(massketten).toHaveLength(1);
    expect(massketten[0]!.punkte).toHaveLength(3);
  });
});
