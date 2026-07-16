import { expect, test, type Page } from '@playwright/test';
import { waehleOption } from './helfer/waehleOption';

/**
 * Serie K A5 (K15, Owner-Befund, wörtlich): «Oberfläche minimal: kein Text wo
 * möglich, Werkzeuge nach Nutzungsmenge in Menüs/Popups einsortiert (Adaption
 * ist die Basis), One-Click/Zero-Click, alle vier Bildschirmkanten nutzen;
 * Ziel Vollautomatisierung der Tools — wichtig bleiben die architektonischen
 * Entscheidungsmeldungen.» KosmoDesign ist der Pilot (nicht alle Stationen
 * auf einmal, s. `docs/OWNER-BEFUNDE-0.6.2.md` K15).
 *
 * Drei Bauaufträge, ein Test je Beweis:
 * 1. Text→Icon: die vier meistgenutzten Zeichenwerkzeuge (Auswahl/Wand/
 *    Volumen/Zone, `werkzeug-icons.tsx`) tragen ein Inline-SVG + aria-label
 *    statt Text; Werkzeug-IDs/testids bleiben E2E-Verträge (unverändert) —
 *    Wand zeichnen funktioniert weiterhin über denselben Icon-Button.
 * 2. Nutzungs-Sortierung sichtbar: das Überlauf-Menü «Mehr…» zeigt die
 *    gerade von der J3-Adaption zurückgestellten Export-/Ebenen-Werkzeuge,
 *    absteigend nach Nutzungszählung.
 * 3. Vier Bildschirmkanten: die neue Statusleiste an der Unterkante zeigt
 *    Werkzeug + Geschoss (Zero-Click) und reagiert auf Werkzeugwechsel.
 */

async function oeffneKosmoDesign(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    // Block-E-Guide startet sonst automatisch und fängt Klicks unter seiner
    // Karte ab (Muster aller Nachbar-Specs, z.B. oberflaeche-adaption.spec.ts).
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/1.OG + Standard-Aufbauten
  await page.click('[data-testid="view-2d"]'); // volle Breite, ruhigere Koordinaten
}

/** Phase auf `vorprojekt` setzen (Default eines neuen Projekts ist `werkplan`
 *  — dort hebt die Matrix die Export-Demotion planmässig gleich wieder an,
 *  Muster `oberflaeche-adaption.spec.ts`). */
async function setzePhaseVorprojekt(page: Page): Promise<void> {
  await page.click('[data-testid="projekt-menu-toggle"]');
  await waehleOption(page, 'phase-stil', 'vorprojekt');
  await page.click('[data-testid="projekt-menu-toggle"]'); // Menü wieder schliessen
}

declare global {
  interface Window {
    __kosmo: {
      state: () => { doc: { byKind: (k: string) => { id: string }[] } };
    };
  }
}

/** Liest translate/scale/translate aus dem `<g>` im Plan-SVG und rechnet
 *  Welt-mm → Bildschirm-Pixel um (Muster `plan-interaktion.spec.ts`). */
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

test('Icon-Werkzeuge: aria-label vorhanden, Wand zeichnen funktioniert über den Icon-Button', async ({ page }) => {
  await oeffneKosmoDesign(page);

  // Die vier umgestellten Werkzeuge tragen Icon (SVG) + aria-label, keinen
  // sichtbaren Text mehr — die data-testid bleibt exakt wie vorher.
  // v0.6.4/F5: die aria-labels tragen die Kurztaste mit («Auswahl (A)») —
  // der Kürzel-Hinweis ist Teil des Vertrags, Screenreader lesen ihn mit.
  for (const [id, label] of [
    ['auswahl', 'Auswahl (A)'],
    ['wand', 'Wand (W)'],
    ['volumen', 'Volumen (V)'],
    ['zone', 'Zone (Z)'],
  ] as const) {
    const knopf = page.locator(`[data-testid="tool-${id}"]`);
    await expect(knopf).toHaveAttribute('aria-label', label);
    await expect(knopf.locator('svg')).toBeAttached();
    expect((await knopf.innerText()).trim()).toBe(''); // kein sichtbarer Text mehr
  }

  // Seltener genutzte Werkzeuge bleiben Text — Treppe ist zusätzlich durch
  // einen bestehenden Text-Selektor vertraglich gebunden
  // (`e2e/module.spec.ts` `button:text-is("Treppe")`).
  await expect(page.locator('[data-testid="tool-treppe"]')).toHaveText('Treppe');
  await expect(page.locator('[data-testid="tool-dach"]')).toHaveText('Dach');

  // Funktionsbeweis: eine Wand über den Icon-Button zeichnen.
  await page.click('[data-testid="tool-wand"]');
  const a = await weltZuBildschirm(page, 1000, 1000);
  const b = await weltZuBildschirm(page, 6000, 1000);
  await page.mouse.click(a.x, a.y);
  await page.mouse.click(b.x, b.y, { modifiers: ['Shift'] }); // Shift beendet die Kette
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length))
    .toBe(1);
});

test('«Mehr…»-Menü: erscheint nur bei zurückgestellten Werkzeugen, listet sie absteigend nach Nutzungszählung', async ({
  page,
}) => {
  await oeffneKosmoDesign(page);
  await setzePhaseVorprojekt(page); // ohne die werkplan-Export-Hebung aus 2.2

  const mehr = page.locator('[data-testid="werkzeuge-mehr"]');
  await expect(mehr).toBeHidden(); // Ruhezustand: nichts zurückgestellt, Platz bleibt reserviert (kein Layout-Ruck)

  // Raster zweimal genutzt — UNTER der Top-3-Hebeschwelle (3), bleibt also in
  // 'selten', rutscht in der Überlauf-Sortierung aber vor die ungenutzten
  // Geschwister (Textur, Sonne, …).
  await page.click('[data-testid="raster-toggle"]');
  await page.click('[data-testid="raster-toggle"]');

  // Zeichenwerkzeug wählen (über den neuen Icon-Button) → Export/Ebenen
  // fallen auf 'selten' zurück (Tätigkeits-Matrix, vorprojekt-Phase).
  await page.click('[data-testid="tool-wand"]');
  await expect(mehr).toBeVisible();
  await mehr.click();

  const liste = page.locator('[data-testid="werkzeuge-mehr-liste"]');
  await expect(liste).toBeVisible();
  const eintraege = await liste
    .locator('[data-testid^="werkzeuge-mehr-eintrag-"]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-testid')));
  // Export (7 Werkzeuge, seit v0.8.1/P4 Splat-Fusion — `import-splat`/
  // `splat-werkzeug-toggle` zu EINEM `splat-werkzeug` verschmolzen, §8
  // Sanktion 1, Owner-Entscheid 5) + Ebenen (9 Werkzeuge, seit Stream B/W1b
  // inkl. Bauablauf/Mängel) + Fähigkeiten (1 Werkzeug, Submissions-Check —
  // kein Alt-Knopf in Ebenen) sind alle drei zurückgestellt.
  expect(eintraege.length).toBe(17);
  expect(eintraege).toContain('werkzeuge-mehr-eintrag-ebenen-raster');
  expect(eintraege).toContain('werkzeuge-mehr-eintrag-export-pdf');
  // Stream B (W1b): die zuvor fehlenden Einträge sind jetzt erreichbar.
  expect(eintraege).toContain('werkzeuge-mehr-eintrag-ebenen-bauablauf');
  expect(eintraege).toContain('werkzeuge-mehr-eintrag-ebenen-maengel');
  expect(eintraege).toContain('werkzeuge-mehr-eintrag-faehigkeiten-submission');
  // Sortiert nach Nutzungszählung: Raster (2×) steht vor dem ungenutzten Textur (0×).
  expect(eintraege.indexOf('werkzeuge-mehr-eintrag-ebenen-raster')).toBeLessThan(
    eintraege.indexOf('werkzeuge-mehr-eintrag-ebenen-textur'),
  );

  // Ein Eintrag funktioniert wie der Original-Knopf (One-Click statt «erst in
  // der Leiste suchen») UND schliesst danach das Menü.
  await liste.locator('[data-testid="werkzeuge-mehr-eintrag-ebenen-liste"]').click();
  await expect(page.locator('[data-testid="berechnungsliste-panel"]')).toBeVisible();
  await expect(liste).toHaveCount(0);
});

test('Statusleiste: zeigt Werkzeug + Geschoss (Zero-Click), aktualisiert bei Werkzeug- und Geschosswechsel', async ({
  page,
}) => {
  await oeffneKosmoDesign(page);

  const werkzeugBadge = page.locator('[data-testid="statusleiste-werkzeug"]');
  const geschossBadge = page.locator('[data-testid="statusleiste-geschoss"]');
  const lodBadge = page.locator('[data-testid="statusleiste-lod"]');
  const flaecheBadge = page.locator('[data-testid="statusleiste-flaeche"]');

  await expect(werkzeugBadge).toHaveText('Auswahl'); // Default-Werkzeug (ArchiCAD-Gefühl)
  await expect(geschossBadge).toHaveText('EG'); // Default-Geschoss aus dem Bootstrap
  await expect(lodBadge).toHaveText('voll'); // Default-Zoom liegt über der voll-Schwelle (B2)
  await expect(flaecheBadge).toBeVisible(); // m²-Kurzwert immer vorhanden (auch bei 0)

  await page.click('[data-testid="tool-wand"]');
  await expect(werkzeugBadge).toHaveText('Wand');

  await page.click('[data-testid="storey-1.OG"]');
  await expect(geschossBadge).toHaveText('1.OG');
});
