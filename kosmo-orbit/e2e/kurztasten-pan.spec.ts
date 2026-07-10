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

/** Wie `holeVerschiebung` im Pan-Test oben — eigenständig, weil jeder Test
 *  isoliert läuft (kein modulweiter State zwischen Playwright-Tests). */
async function holeVerschiebung(page: import('@playwright/test').Page): Promise<{ e: number; f: number }> {
  return page.evaluate(() => {
    const svg = document.querySelector('[data-testid="planview"]') as SVGSVGElement;
    const inhalt = svg.querySelector('g') as SVGGElement;
    const m = inhalt.getScreenCTM()!;
    return { e: m.e, f: m.f };
  });
}

test('Fling/Momentum: schnelles Maus-Drag-Pan-Loslassen läuft aus und stoppt von selbst (MOTION-KONZEPT-066 §5)', async ({ page }) => {
  // §7: Bewegung wird HIER gezielt geprüft — eigene Spec-Zeile ohne die
  // projektweite reduced-motion-Fixture (Playwright-Default), s. playwright.config.ts.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await oeffneKosmoDesign(page);
  await page.click('[data-testid="view-2d"]');
  await page.click('[data-testid="nav-fit"]');
  await page.waitForTimeout(300);
  // Pan-Modus über die Nav-Leiste (kein Werkzeug-Gummiband im Weg).
  await page.click('[data-testid="nav-pan"]');

  const box = (await page.locator('[data-testid="planview"]').boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  await page.mouse.move(cx, cy);
  await page.mouse.down();
  // Schnelle, grosse Schritte OHNE Zwischenpausen → hohe Loslass-Geschwindigkeit
  // im 80ms-Fenster des `flingTracker` (eingabe-3d.ts).
  await page.mouse.move(cx + 90, cy, { steps: 1 });
  await page.mouse.move(cx + 220, cy, { steps: 1 });
  await page.mouse.move(cx + 380, cy, { steps: 1 });
  await page.mouse.up();

  // Erst settlen lassen (derselbe Render-Nachlauf-Grund wie im reduced-
  // motion-Test unten — die Baseline soll NICHT den regulären Drag-Render
  // nachlaufend als «Momentum» missverstehen), DANN zwei Messpunkte im
  // Abstand nehmen: bewegt sich die Ansicht zwischen ihnen WEITER, ohne dass
  // die Maus noch gedrückt/bewegt wird, läuft der Fling wirklich aus.
  await page.waitForTimeout(400);
  const sofortNachLoslassen = await holeVerschiebung(page);
  await page.waitForTimeout(150);
  const kurzDanach = await holeVerschiebung(page);
  const momentumDelta = Math.abs(kurzDanach.e - sofortNachLoslassen.e) + Math.abs(kurzDanach.f - sofortNachLoslassen.f);
  expect(momentumDelta).toBeGreaterThan(3);
  // Bewegungsrichtung des Fling stimmt mit der Zugrichtung überein (nach rechts
  // gezogen → Inhalt wandert weiter nach rechts, e wächst weiter).
  expect(kurzDanach.e).toBeGreaterThan(sofortNachLoslassen.e);

  // … und der Fling stoppt von selbst (Dämpfung 0.95/Frame, Stopp < 0.02 px/ms
  // RESTGESCHWINDIGKEIT — das ist noch ~5px/250ms, also grosszügig länger
  // warten, bis die Restgeschwindigkeit selbst nochmals klar abgeklungen ist).
  await page.waitForTimeout(3500);
  const spaeterA = await holeVerschiebung(page);
  await page.waitForTimeout(300);
  const spaeterB = await holeVerschiebung(page);
  expect(Math.abs(spaeterB.e - spaeterA.e) + Math.abs(spaeterB.f - spaeterA.f)).toBeLessThan(2);
});

test('Fling/Momentum: bei reduced-motion läuft NACH dem Loslassen nichts mehr aus', async ({ page }) => {
  // Playwright-Projektstandard IST `reducedMotion: 'reduce'` (playwright.config.ts)
  // — explizit gesetzt statt nur verlassen: dieselbe, im Repo bereits
  // dokumentierte Chromium/Playwright-Lücke wie in `App.tsx` (Kommentar bei
  // `gehZu`) — `matchMedia('(prefers-reduced-motion: reduce)')` spiegelt den
  // reinen Kontext-Default NICHT immer zuverlässig, ein expliziter
  // `emulateMedia`-Aufruf schon (CDP setzt die Media-Feature-Emulation hart).
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await oeffneKosmoDesign(page);
  await page.click('[data-testid="view-2d"]');
  await page.click('[data-testid="nav-fit"]');
  await page.waitForTimeout(300);
  await page.click('[data-testid="nav-pan"]');
  // `emulateMedia` setzt sich manchmal erst NACH dem `reload()` in
  // `oeffneKosmoDesign` durch (Race, dieselbe Chromium/Playwright-Lücke wie
  // in App.tsx dokumentiert) — hart auf den tatsächlichen matchMedia-Zustand
  // warten, statt ihn nur anzunehmen, macht den Test deterministisch statt
  // gelegentlich flau.
  await expect
    .poll(() => page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches))
    .toBe(true);

  const box = (await page.locator('[data-testid="planview"]').boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 90, cy, { steps: 1 });
  await page.mouse.move(cx + 220, cy, { steps: 1 });
  await page.mouse.move(cx + 380, cy, { steps: 1 });
  await page.mouse.up();

  // ERST den letzten Pan-Move (regulärer Drag-Pfad, unverändert) vollständig
  // rendern lassen (die schnellen synthetischen Moves können den Render
  // kurz ins Hintertreffen bringen — belegt per Diagnose: der `<g>`-Transform
  // «nachzog» sonst noch bis zu ~350ms nach `mouseup`), DANN erst die
  // Momentum-losigkeits-Baseline lesen — sonst verwechselt der Test
  // Render-Nachlauf des regulären Drags mit einem (hier NICHT gewollten) Fling.
  await page.waitForTimeout(400);
  const sofort = await holeVerschiebung(page);
  await page.waitForTimeout(300);
  const danach = await holeVerschiebung(page);
  // Keine Weiterbewegung ohne gehaltene Maustaste — der Pan endet exakt dort,
  // wo losgelassen wurde (kein Fake-Momentum unter reduced-motion).
  expect(Math.abs(danach.e - sofort.e) + Math.abs(danach.f - sofort.f)).toBeLessThan(0.5);
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
