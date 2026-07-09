import { test, expect } from '@playwright/test';

/**
 * v0.6.4, F5+F9 — zwei Owner-Befunde aus dem 0.6.3-Test:
 *
 * F5 («beim modellieren des grundrisses eine tastenkombination oder so
 * einbauen um mich intuitiv bewegen zu können wie archicad»): Werkzeug-
 * Kurztasten (A/W/Z/…, `kurztasten.ts`) mit Fokus-Guard, plus Leertaste
 * halten + Ziehen = Pan im 2D-Plan (ArchiCAD/Photoshop-Muskelgedächtnis),
 * zusätzlich zum bestehenden Mitteltaste-/Rechtsklick-/`navModus2d`-Pan.
 *
 * F9 («die maus sollte sich zudem an die verschiedenen bereichen anpassen
 * können, sprich sie sollte auf die umgebung reagieren»): der Cursor auf dem
 * Plan-SVG wechselt kontextabhängig (`cursor2dFuer`), gespiegelt im
 * `data-cursor`-Attribut des `[data-testid="planview"]`-SVG (verlässlicher
 * als der berechnete CSS-`cursor`, den Playwright nicht direkt abfragt).
 *
 * Playwright-Falle: achsenparallele SVG-Linien/-Gruppen meldet Playwright oft
 * als „hidden“ (kein sichtbarer Rand) → `toBeAttached()` statt `toBeVisible()`.
 */

async function oeffneKosmoDesign(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.panelOffen', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await expect(page.locator('[data-testid="planview"]')).toBeAttached();
}

/** Tone «accent» (aktives Werkzeug) — seit v0.6.6 trägt KButton CSS-Klassen
 * (`k-btn-accent`) statt Inline-Styles (MOTION-KONZEPT-066, Phase 0); der
 * frühere `style.background`-Check lief deshalb ins Leere. */
async function werkzeugIstAktiv(page: import('@playwright/test').Page, testid: string): Promise<boolean> {
  return page.locator(`[data-testid="${testid}"]`).evaluate((el) => el.classList.contains('k-btn-accent'));
}

test('W-Taste wechselt aufs Wand-Werkzeug; Fokus in einem Eingabefeld blockiert die Kurztaste', async ({ page }) => {
  await oeffneKosmoDesign(page);

  // Startzustand: Auswahl-Werkzeug (ArchiCAD-Gefühl, siehe DesignWorkspace.tsx)
  expect(await werkzeugIstAktiv(page, 'tool-auswahl')).toBe(true);
  expect(await werkzeugIstAktiv(page, 'tool-wand')).toBe(false);

  // Ein Eingabefeld hat den Fokus (Stellvertreter für eine Kosmo-Chat-Eingabe) —
  // die Kurztaste darf hier NIE feuern (kurztasten.ts, `istEingabefeld`).
  await page.evaluate(() => {
    const input = document.createElement('input');
    input.setAttribute('data-testid', 'kurztasten-test-eingabe');
    document.body.appendChild(input);
    input.focus();
  });
  await page.keyboard.press('w');
  expect(await werkzeugIstAktiv(page, 'tool-wand')).toBe(false);
  expect(await werkzeugIstAktiv(page, 'tool-auswahl')).toBe(true);

  // Eingabefeld entfernt (Fokus fällt automatisch zurück auf <body>) — jetzt
  // wechselt dieselbe Taste tatsächlich das Werkzeug.
  await page.evaluate(() => document.querySelector('[data-testid="kurztasten-test-eingabe"]')?.remove());
  await page.keyboard.press('w');
  expect(await werkzeugIstAktiv(page, 'tool-wand')).toBe(true);

  // Esc bleibt wie bisher: zurück zur Auswahl
  await page.keyboard.press('Escape');
  expect(await werkzeugIstAktiv(page, 'tool-auswahl')).toBe(true);
});

test('Leertaste halten + Ziehen verschiebt die Ansicht (Pan) und pausiert das Werkzeug — keine Wand entsteht', async ({ page }) => {
  await oeffneKosmoDesign(page);
  await page.click('[data-testid="view-2d"]');
  await page.click('[data-testid="nav-fit"]');
  await page.waitForTimeout(300);
  await page.click('[data-testid="tool-wand"]');
  expect(await werkzeugIstAktiv(page, 'tool-wand')).toBe(true);
  // Der Werkzeug-Klick lässt den Knopf fokussiert zurück — ein echter User
  // hätte die Maus schon auf dem Plan, nicht mehr auf dem Knopf.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

  const holeVerschiebung = () =>
    page.evaluate(() => {
      const svg = document.querySelector('[data-testid="planview"]') as SVGSVGElement;
      const inhalt = svg.querySelector('g') as SVGGElement;
      const m = inhalt.getScreenCTM()!;
      return { e: m.e, f: m.f };
    });
  const waendeAnzahl = () =>
    page.evaluate(() => (window.__kosmo.state().doc.byKind('wall') as unknown[]).length);

  const vor = await holeVerschiebung();
  const waendeVor = await waendeAnzahl();

  const box = (await page.locator('[data-testid="planview"]').boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  await page.keyboard.down('Space');
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 140, cy + 90, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up('Space');

  const nach = await holeVerschiebung();
  const waendeNach = await waendeAnzahl();

  // Die Plan-Inhalts-Gruppe hat sich sichtbar verschoben (Pan hat gewirkt) …
  expect(Math.abs(nach.e - vor.e) + Math.abs(nach.f - vor.f)).toBeGreaterThan(30);
  // … aber das aktive Wand-Werkzeug hat währenddessen NICHT gezeichnet
  // (Owner-Auflage: das Gummiband pausiert, solange die Leertaste gehalten wird).
  expect(waendeNach).toBe(waendeVor);
});

test('Cursor-Attribut des Plans wechselt je Werkzeug/Modus (F9 — kontextabhängige Maus)', async ({ page }) => {
  await oeffneKosmoDesign(page);
  await page.click('[data-testid="view-2d"]');
  const plan = page.locator('[data-testid="planview"]');

  // Auswahl-Werkzeug, freie Fläche: Standard-Cursor
  await expect(plan).toHaveAttribute('data-cursor', 'default');

  // Zeichenwerkzeug: Fadenkreuz
  await page.click('[data-testid="tool-wand"]');
  await expect(plan).toHaveAttribute('data-cursor', 'crosshair');

  // zurück zur Auswahl: wieder Standard
  await page.click('[data-testid="tool-auswahl"]');
  await expect(plan).toHaveAttribute('data-cursor', 'default');

  // Leertaste gehalten (Pan-Bereitschaft): Greifhand
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.down('Space');
  await expect(plan).toHaveAttribute('data-cursor', 'grab');
  await page.keyboard.up('Space');
  await expect(plan).toHaveAttribute('data-cursor', 'default');
});
