import { expect, test } from '@playwright/test';

/**
 * PD2 Island-Basisspec (`docs/ISLAND-UI-SPEZ.md` §7 PD2-Zeile, `docs/V082-
 * SPEZ.md` C-35/C-41) — beweist den Default-Flip UND die echte Verdrahtung
 * am lebenden Objekt:
 *  1. Ohne Seed ist «Island» der Default (Viewer + vier Pills + Ansichts-
 *     Info + Stationen-Orb, klassische Werkzeugleiste/Geschossleiste NICHT
 *     im DOM).
 *  2. Wand-Aktivierung über die Insel wirkt aufs ECHTE Werkzeug
 *     (`ui-zustand.ts`s `tool`) — bewiesen über den klassischen `tool-wand`-
 *     Knopf NACH dem Umschalten zu Manuell (`k-btn-accent`, `e2e/kurztasten-
 *     pan.spec.ts` nutzt dieselbe Klasse als Aktiv-Beweis).
 *  3. Umschalter Island↔Manuell funktioniert beidseitig UND übersteht einen
 *     Reload (`kosmo.ui.v1`-Persistenz).
 *  4. Ansichts-Wechsel über die Ansichts-Info wirkt auf den echten
 *     `viewMode` (bewiesen über den klassischen `view-2d`-Knopf, `aria-
 *     pressed`, nach dem Umschalten zu Manuell).
 *
 * **Diese Spec setzt den globalen Seed (`playwright.config.ts`, `kosmo.ui.
 * v1` mit `designOberflaeche:'manuell'`) selbst ausser Kraft** — via
 * `test.use({ storageState: { cookies: [], origins: [] } })`, ein LEERER
 * Kontext ohne jedes vorbelegte `localStorage`. Nur so lässt sich der ECHTE
 * Produktions-Default (`'island'`, ohne jeden Seed) beweisen; alle anderen
 * Specs im Repo behalten den globalen Manuell-Seed unangetastet (Sanktion 2,
 * `docs/ISLAND-UI-SPEZ.md` §6).
 */

test.use({ storageState: { cookies: [], origins: [] } });

/** `kosmo.onboarded`-Muster (s. `module.spec.ts` u. v. a.) — JEDE Spec setzt
 *  das selbst, unabhängig vom globalen Seed (nicht Teil von `storageState`). */
async function ueberspringeOnboarding(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
}

/**
 * Öffnet eine Island per Hover (§4.1 Stufe 1) — BEWUSST `.hover()`, NICHT
 * `.click()` auf die Pill: `.click()` bewegt die Maus zuerst auf die Pill
 * (Playwright-Actionability), was `onMouseEnter` (`IslandShell.tsx`) SCHON
 * auslöst und die Pill synchron durch die Leiste ersetzt — der eigentliche
 * Klick trifft danach ins Leere («element was detached», Timeout). `.hover()`
 * löst exakt denselben Übergang aus, wartet ihn aber sauber ab, bevor der
 * nächste Schritt (ein Klick auf ein WERKZEUG in der jetzt offenen Leiste)
 * folgt.
 */
async function oeffneInsel(page: import('@playwright/test').Page, island: string): Promise<void> {
  await page.hover(`[data-testid="island-${island}-pill"]`);
  await expect(page.locator(`[data-testid="island-${island}-leiste"]`)).toBeVisible();
}

test('Default ist Island (ohne Seed): Viewer + vier Pills + Ansichts-Info/Stationen-Orb, klassische Fläche fehlt', async ({ page }) => {
  await ueberspringeOnboarding(page);
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG

  await expect(page.locator('[data-testid="island-zeichnen-pill"]')).toBeVisible();
  await expect(page.locator('[data-testid="island-ansicht-pill"]')).toBeVisible();
  await expect(page.locator('[data-testid="island-projekt-pill"]')).toBeVisible();
  await expect(page.locator('[data-testid="island-austausch-pill"]')).toBeVisible();
  await expect(page.locator('[data-testid="ansichts-info-root"]')).toBeVisible();
  await expect(page.locator('[data-testid="stationen-orb-pill"]')).toBeVisible();

  // Ausgeblendet, nicht bloss unsichtbar — die drei Bereiche sind im
  // Island-Modus gar nicht im DOM (Default-Flip, `DesignWorkspace.tsx`).
  await expect(page.locator('[data-testid="design-werkzeugleiste"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="geschossleiste"]')).toHaveCount(0);

  await page.screenshot({ path: 'test-results/pd2-082-island-default.png' });
});

test('Wand-Aktivierung über die Insel wirkt aufs echte Werkzeug', async ({ page }) => {
  await ueberspringeOnboarding(page);
  await page.click('[data-testid="module-design"]');

  await oeffneInsel(page, 'zeichnen');
  await page.click('[data-testid="island-werkzeug-wand"]');
  await expect(page.locator('[data-testid="island-wand-popup"]')).toBeVisible();
  await page.screenshot({ path: 'test-results/pd2-082-island-leiste-offen.png' });

  // Umschalten zu Manuell (AUSTAUSCH → Manuell, hatPopup=false → Sofort-
  // Umschaltung) — der klassische `tool-wand`-Knopf zeigt danach den ECHTEN
  // Store-Zustand (`tool==='wand'`), den die Insel gesetzt hat.
  await oeffneInsel(page, 'austausch');
  await page.click('[data-testid="island-werkzeug-manuell"]');

  await expect(page.locator('[data-testid="design-werkzeugleiste"]')).toBeVisible();
  await expect(page.locator('[data-testid="tool-wand"]')).toHaveClass(/k-btn-accent/);
  await page.screenshot({ path: 'test-results/pd2-082-manuell-nach-umschalten.png' });
});

test('Umschalter Island ↔ Manuell funktioniert beidseitig und übersteht einen Reload', async ({ page }) => {
  await ueberspringeOnboarding(page);
  await page.click('[data-testid="module-design"]');

  // Island → Manuell
  await oeffneInsel(page, 'austausch');
  await page.click('[data-testid="island-werkzeug-manuell"]');
  await expect(page.locator('[data-testid="design-werkzeugleiste"]')).toBeVisible();
  await expect(page.locator('[data-testid="island-zeichnen-pill"]')).toHaveCount(0);

  // Reload — 'manuell' übersteht (kosmo.ui.v1-Persistenz). `screen` selbst
  // ist ein flüchtiger App.tsx-`useState` (nie persistiert, bestehendes
  // Verhalten unabhängig von PD2) — ein Reload landet darum immer erst auf
  // der Zentrale; «module-design» führt gezielt zurück in die Station.
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await expect(page.locator('[data-testid="design-werkzeugleiste"]')).toBeVisible();

  // Manuell → Island (additiver Rückweg, C-41)
  await page.click('[data-testid="island-zurueck"]');
  await expect(page.locator('[data-testid="island-zeichnen-pill"]')).toBeVisible();
  await expect(page.locator('[data-testid="design-werkzeugleiste"]')).toHaveCount(0);

  // Reload — 'island' übersteht ebenfalls.
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await expect(page.locator('[data-testid="island-zeichnen-pill"]')).toBeVisible();
});

test('Ansichts-Wechsel über die Ansichts-Info wirkt auf den echten viewMode', async ({ page }) => {
  await ueberspringeOnboarding(page);
  await page.click('[data-testid="module-design"]');

  await page.click('[data-testid="ansichts-info-label"]');
  await expect(page.locator('[data-testid="ansichts-info-popover"]')).toBeVisible();
  await page.click('[data-testid="ansichts-info-ansicht-2d"]');

  // Umschalten zu Manuell, um den echten `viewMode` am klassischen
  // `view-2d`-Knopf (`aria-pressed`) zu verifizieren.
  await oeffneInsel(page, 'austausch');
  await page.click('[data-testid="island-werkzeug-manuell"]');
  await expect(page.locator('[data-testid="view-2d"]')).toHaveAttribute('aria-pressed', 'true');
});

// ---------------------------------------------------------------------------
// PE2 (v0.8.4, Bauauftrag Punkte 2+3) — additive Tests: `skizze` bekam ihr
// echtes SVG (kein `SK`-Text mehr), `ISLAND_PILL_GLYPHEN` wuchs von 4 auf 11
// Einträge (design + vis/publish/prepare). Diese Datei gehörte laut Auftrag
// vorher keinem Paket exklusiv (frei für additive Ergänzung) — die
// bestehenden vier Tests oben bleiben UNVERÄNDERT.
// ---------------------------------------------------------------------------

test('PE2: Skizze zeigt jetzt ein echtes SVG-Icon in der ZEICHNEN-Leiste, kein Text-Kürzel "SK" mehr', async ({ page }) => {
  await ueberspringeOnboarding(page);
  await page.click('[data-testid="module-design"]');

  await oeffneInsel(page, 'zeichnen');
  const glyphe = page.locator('[data-testid="island-werkzeug-skizze"] .isl-werkzeug-glyphe');
  await expect(glyphe.locator('svg')).toHaveCount(1);
  await expect(glyphe).not.toHaveText('SK');
});

test('PE2: alle vier design-Insel-Pillen zeigen ein echtes SVG-Icon (kein 2-Buchstaben-Text-Fallback)', async ({ page }) => {
  await ueberspringeOnboarding(page);
  await page.click('[data-testid="module-design"]');

  for (const island of ['zeichnen', 'ansicht', 'projekt', 'austausch']) {
    const pillGlyphe = page.locator(`[data-testid="island-${island}-pill"] .isl-pill-glyphe`);
    await expect(pillGlyphe.locator('svg'), island).toHaveCount(1);
  }
});

test('PE2: die Insel-Pillen von vis/publish/prepare zeigen jetzt ebenfalls echte SVG-Icons (ISLAND_PILL_GLYPHEN auf 11 Einträge erweitert)', async ({
  page,
}) => {
  const STATIONEN: { modul: string; inseln: string[] }[] = [
    { modul: 'module-vis', inseln: ['graph', 'ansicht', 'stimmung', 'austausch'] },
    { modul: 'module-publish', inseln: ['blatt', 'darstellung', 'projekt', 'austausch'] },
    { modul: 'module-prepare', inseln: ['aufnahme', 'wissen', 'bestand', 'austausch'] },
  ];

  for (const { modul, inseln } of STATIONEN) {
    // Frisch von der Zentrale aus starten (`module-<x>`-Kacheln sind nur dort
    // im DOM, ein Klick verlässt die Zentrale endgültig) — `ueberspringeOnboarding`
    // navigiert per `page.goto('/')` + Reload dorthin zurück, dieselbe Funktion
    // wie ganz oben in dieser Datei, hier je Station neu aufgerufen statt
    // versucht zwischen Stationen ohne Rücksprung zu wechseln.
    await ueberspringeOnboarding(page);
    await page.click(`[data-testid="${modul}"]`);
    for (const island of inseln) {
      // Die anderen Stationen hovern über die ganze Insel-Wurzel (nicht nur
      // die Pille, s. `vis-island.spec.ts`s `oeffneInsel`) — die Pille selbst
      // ist ein Kind-Element der Wurzel, solange die Insel noch geschlossen
      // ist (Stufe 'pill').
      const wurzel = page.locator(`[data-testid="island-${island}-root"]`);
      await expect(wurzel, `${modul}/${island}`).toBeVisible();
      const pillGlyphe = wurzel.locator('.isl-pill-glyphe');
      await expect(pillGlyphe.locator('svg'), `${modul}/${island}`).toHaveCount(1);
    }
  }
});
