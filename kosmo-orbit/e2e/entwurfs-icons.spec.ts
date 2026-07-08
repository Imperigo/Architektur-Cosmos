import { expect, test, type Page } from '@playwright/test';

/**
 * K16 (Owner-Befund, wörtlich): «Drei Entwurfs-Icons in KosmoDesign: (1)
 * Sprechen/Schreiben → Kosmo zeichnet; (2) Skizzieren → Live-Verständnis + 3
 * Preview-Annäherungen, Bestätigung (Entscheid füttert die LoRA), Kosmo
 * modelliert; (3) manuelles CAD → klassische Werkzeugleisten, Anordnung wie
 * ArchiCAD.» Batch A6 baut den Entwurfs-Einstieg (Dock an der linken Kante,
 * die A5-Kanten-Inventar als frei auswies) + die 3-Annäherungs-Karten am
 * bestehenden Skizzen-Batch-Commit-Moment (`SketchOverlay.tsx`).
 *
 * Drei Tests, ein Bauauftrag je Test:
 * 1. Dock sichtbar mit den drei Icons, Default-Modus (kein Werkzeug aktiv) ist CAD.
 * 2. «Sprechen/Schreiben» öffnet das Kosmo-Panel (derselbe Weg wie
 *    `module-speak`) und fokussiert das Eingabefeld.
 * 3. «Skizzieren»: eine Freihand-Skizze ergibt am Batch-Commit-Moment DREI
 *    Karten; Variante (b) orthogonalisiert wählen → die entstandenen Wände
 *    sind exakt achsenparallel (Koordinaten-Assertion); Undo entfernt sie
 *    ALLE auf einen Schlag (atomare Undo-Gruppe); der Entscheid liegt im
 *    Lernjournal (Datensammlung fürs spätere, kuratierbare Training — kein
 *    Live-Training, s. `docs/OWNER-BEFUNDE-0.6.2.md` K16).
 */

async function oeffneKosmoDesign(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    // Block-E-Guide startet sonst automatisch (Muster aller Nachbar-Specs).
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG + Standard-Aufbauten
  await page.click('[data-testid="view-2d"]'); // volle Breite, ruhigere Koordinaten (Muster oberflaeche-minimal.spec.ts)
}

declare global {
  interface Window {
    __kosmo: {
      state: () => {
        doc: { byKind: (k: string) => { id: string; a?: { x: number; y: number }; b?: { x: number; y: number } }[] };
      };
    };
  }
}

test('Entwurfs-Dock: drei Icons sichtbar an der linken Kante, Default-Modus ist CAD', async ({ page }) => {
  await oeffneKosmoDesign(page);

  const dock = page.locator('[data-testid="entwurf-dock"]');
  await expect(dock).toBeVisible();
  const sprechen = page.locator('[data-testid="entwurf-sprechen"]');
  const skizzieren = page.locator('[data-testid="entwurf-skizzieren"]');
  const cad = page.locator('[data-testid="entwurf-cad"]');
  await expect(sprechen).toBeVisible();
  await expect(skizzieren).toBeVisible();
  await expect(cad).toBeVisible();

  // Beim Betreten (Auswahl-Werkzeug, kein Kosmo-Panel offen) ist CAD aktiv —
  // die heutige Werkzeugleiste ist bereits die ArchiCAD-Anordnung (T3/A5).
  await expect(cad).toHaveAttribute('aria-pressed', 'true');
  await expect(sprechen).toHaveAttribute('aria-pressed', 'false');
  await expect(skizzieren).toHaveAttribute('aria-pressed', 'false');
});

test('«Sprechen/Schreiben» öffnet das Kosmo-Panel und fokussiert das Eingabefeld', async ({ page }) => {
  await oeffneKosmoDesign(page);

  await page.click('[data-testid="entwurf-sprechen"]');
  await expect(page.locator('[data-testid="kosmo-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="kosmo-input"]')).toBeFocused();
  await expect(page.locator('[data-testid="entwurf-sprechen"]')).toHaveAttribute('aria-pressed', 'true');
});

test('«Skizzieren»: 3 Annäherungen, Variante orthogonal → achsenparallele Wände, Undo atomar, Journal-Eintrag', async ({
  page,
}) => {
  await oeffneKosmoDesign(page);

  await page.click('[data-testid="entwurf-skizzieren"]');
  await expect(page.locator('[data-testid="entwurf-skizzieren"]')).toHaveAttribute('aria-pressed', 'true');
  const overlay = page.locator('[data-testid="sketch-overlay"]');
  await expect(overlay).toBeVisible();

  const vorherWaende = await page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length);

  // Ein bewusst NICHT achsenparalleler Strich (~23° zur Horizontalen, ausserhalb
  // des 45°-Familien-Toleranzbands von `sketch.ts`, s. Kommentar dort) — erst
  // die Annäherungs-Variante (b) macht ihn achsenparallel.
  const box = (await overlay.boundingBox())!;
  const x1 = box.x + 140;
  const y1 = box.y + 160;
  const x2 = x1 + 300;
  const y2 = y1 + 130;
  await page.mouse.move(x1, y1);
  await page.mouse.down();
  await page.mouse.move(x1 + (x2 - x1) / 2, y1 + (y2 - y1) / 2, { steps: 6 });
  await page.mouse.move(x2, y2, { steps: 6 });
  await page.mouse.up();

  await page.click('[data-testid="sketch-uebergeben"]');
  await expect(page.locator('[data-testid="sketch-proposal"]')).toBeVisible({ timeout: 15_000 });

  // Alle drei Annäherungs-Karten erscheinen.
  await expect(page.locator('[data-testid="skizze-vorschlag-1"]')).toBeVisible();
  await expect(page.locator('[data-testid="skizze-vorschlag-2"]')).toBeVisible();
  await expect(page.locator('[data-testid="skizze-vorschlag-3"]')).toBeVisible();

  // Variante (b) — orthogonalisiert — wählen.
  await page.click('[data-testid="skizze-vorschlag-2-waehlen"]');

  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length))
    .toBeGreaterThan(vorherWaende);

  const neueWaende = await page.evaluate(() => {
    const alle = window.__kosmo.state().doc.byKind('wall') as { a: { x: number; y: number }; b: { x: number; y: number } }[];
    return alle.map((w) => ({ a: w.a, b: w.b }));
  });
  expect(neueWaende.length).toBeGreaterThan(vorherWaende);
  for (const w of neueWaende) {
    // Achsenparallel: entweder x oder y stimmt zwischen a und b exakt überein.
    const achsenparallel = w.a.x === w.b.x || w.a.y === w.b.y;
    expect(achsenparallel, `Wand nicht achsenparallel: ${JSON.stringify(w)}`).toBe(true);
  }

  // Lernjournal: der Entscheid (gewählte Variante) liegt als kuratierbarer
  // Eintrag vor — Datensammlung fürs spätere Training, kein Live-Training.
  const journalTreffer = await page.evaluate(() => {
    const roh = localStorage.getItem('kosmo.lernjournal');
    if (!roh) return false;
    const eintraege = JSON.parse(roh) as { context: string }[];
    return eintraege.some((e) => e.context.includes('Skizze-Annäherung gewählt: orthogonal'));
  });
  expect(journalTreffer).toBe(true);

  // Undo entfernt die ganze Skizzier-Sitzung als EINEN Schritt (atomare Gruppe).
  await page.click('[data-testid="undo"]');
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length))
    .toBe(vorherWaende);
});
