import { expect, test, type Page } from '@playwright/test';

/**
 * Rotlisten-Runde 2 (21.07.2026): Erststart-Zustand wie im Hausmuster
 * `erste-start-frage.spec.ts` (`ersterStart`). Diese Suite stammt aus
 * v0.6.4 — VOR dem Einrichtungs-Wizard (`OnboardingWizard.tsx`, seit
 * v0.7.7): bei komplett leerem localStorage liegt heute dessen Overlay
 * (`app-onboarding-spanne`, App.tsx) über der Zentrale, und der Klick auf
 * `erste-start-ja` wird vom Wizard-Fuss (`ow-stepper-fuss-text`)
 * abgefangen. Der Produkt-Fluss ist gewollt zweistufig (erst Einrichtung,
 * dann Rundgang-Frage) — kein Produktfehler. `kosmo.onboarded` gesetzt,
 * Rundgang-Flag bewusst NICHT gesetzt: genau der Owner-Testfall
 * «frischer Nutzer vor dem Rundgang», alle F7-Assertions unverändert.
 */
async function ersterStartVorRundgang(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.removeItem('kosmo.starterGuide.done');
  });
  await page.reload();
  await page.waitForSelector('[data-testid="module-design"]');
}

/**
 * v0.6.4 / F7 (Owner-Befund, WIEDERHOLT: «Ich kann in 3D-Viewer immer noch
 * nicht skizzieren»). Diagnose ohne Vorannahme (Dock vs. Werkzeugleiste,
 * Split- vs. volle 3D-Ansicht, Maus statt Stift/Finger) zeigte: der 3D-
 * Skizzierweg selbst (`eingabe-3d.ts` `kameraDarfSehen`, Viewport3D-
 * Pointer-Handler) funktioniert für ALLE diese Kombinationen — der echte
 * Bruch sass eine Ebene höher, im Erststart-Rundgang.
 *
 * Root Cause: `StarterGuide.tsx` sass fix bei `left:20, bottom:20` — GENAU
 * im Boden-Streifen jeder Viewport-Pane (NavLeiste `bottom:50`, KosmoSketch-
 * Batch-/Vorschlagsleisten `bottom:18`, beide links/mittig). Wer beim
 * Erststart «Ja, zeig mir den Rundgang» wählt (naheliegend bei jedem frischen
 * Test/Installer) und dann — statt der vom Guide erwarteten «Wand
 * zeichnen»-Mini-Aufgabe — gleich «Skizzieren» im Entwurfs-Dock probiert,
 * zeichnet zwar einen Strich (der Raycast/Pointer-Weg ist intakt), landet
 * dann aber auf «Übergeben»/«Übernehmen»-Knöpfen, die von der Rundgang-Karte
 * pixelgenau verdeckt werden — der Klick geht ins Leere, es entsteht nie eine
 * Wand. Aus Owner-Sicht: «Skizzieren geht nicht». Diese Suite war vor dem Fix
 * ROT (Playwright meldete `starter-guide-schritt … intercepts pointer
 * events` auf `sketch3d-uebergeben`); der Fix verschiebt die Rundgang-Karte
 * (`left:60, bottom:100`) aus dem Boden-Streifen UND aus dem vertikal
 * mittigen Entwurfs-Dock (K16 A6, `left:12`) heraus, ohne sonst etwas an
 * Layout/Verhalten zu ändern.
 */

test('F7: Owner-Pfad — Rundgang aktiv, Split-Default, Dock «Skizzieren», Maus — Übergeben bleibt klickbar', async ({
  page,
}) => {
  // Erststart-Zustand VOR dem Rundgang (Begründung: `ersterStartVorRundgang`
  // oben — der v0.7.7-Einrichtungs-Wizard liegt sonst über der Frage).
  await ersterStartVorRundgang(page);
  await expect(page.locator('[data-testid="erste-start-frage"]')).toBeVisible();
  await page.click('[data-testid="erste-start-ja"]');
  await page.click('[data-testid="module-design"]');
  await expect(page.locator('[data-testid="starter-guide"]')).toBeVisible();

  // KEIN Klick auf `view-3d` — Split «3D | Plan» ist der Default, wie beim
  // Owner. KEIN Klick auf die klassische `tool-skizze`-Werkzeugleiste —
  // der Owner nutzt den neuen Entwurfs-Dock-Einstieg (A6).
  await page.click('[data-testid="entwurf-skizzieren"]');
  await expect(page.locator('[data-testid="sketch3d-hinweis"]')).toBeVisible();

  const canvas = page.locator('canvas').first();
  const box = (await canvas.boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // Maus-Drag (kein Stift, kein Finger) im 3D-Viewport.
  await page.mouse.move(cx - 100, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy + 60, { steps: 4 });
  await page.mouse.move(cx + 100, cy, { steps: 4 });
  await page.mouse.up();

  // Der eigentliche Beweis: der Knopf ist nicht nur sichtbar, sondern
  // TATSÄCHLICH klickbar (Playwright scheitert mit einem Timeout, sobald ein
  // anderes Element — hier früher die Rundgang-Karte — die Pointer-Events
  // abfängt).
  await expect(page.locator('[data-testid="sketch3d-uebergeben"]')).toBeVisible();
  await page.click('[data-testid="sketch3d-uebergeben"]', { timeout: 5000 });
  await expect(page.locator('[data-testid="sketch3d-proposal"]')).toBeVisible();
  await page.click('[data-testid="sketch3d-accept"]', { timeout: 5000 });

  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length))
    .toBeGreaterThan(0);
});

test('F7: Rundgang-Karte überlappt weder NavLeiste (nav-fit) noch Entwurfs-Dock', async ({ page }) => {
  await ersterStartVorRundgang(page);
  await page.click('[data-testid="erste-start-ja"]');
  await page.click('[data-testid="module-design"]');
  await expect(page.locator('[data-testid="starter-guide"]')).toBeVisible();

  const guideBox = (await page.locator('[data-testid="starter-guide-schritt"]').boundingBox())!;
  // Split-Default zeigt ZWEI NavLeisten (3D + Plan) — die im 3D-Viewport
  // (`nav-3d`) ist die für diesen Befund relevante.
  const navFitBox = (await page.getByTestId('nav-3d').getByTestId('nav-fit').boundingBox())!;
  const dockBox = (await page.locator('[data-testid="entwurf-dock"]').boundingBox())!;

  const ueberlappt = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
    a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

  expect(ueberlappt(guideBox, navFitBox), 'Rundgang-Karte überlappt nav-fit').toBe(false);
  expect(ueberlappt(guideBox, dockBox), 'Rundgang-Karte überlappt den Entwurfs-Dock').toBe(false);
});
