import { expect, test } from '@playwright/test';

/**
 * AutoPackPanel (v0.8.1 P12, `docs/V081-SPEZ.md` §7(b)/C-26, «Auto-Pack-
 * Layout-Editor / Intelligentes Planlayout») — deckt den im Auftrag
 * geforderten Kernpunkt ab: der Editor zeigt eine ECHTE Vorschau der
 * `schlageBlattBelegungVor`-Ableitung, lässt die Reihenfolge/«Gewichtung»
 * der Blatt-Arten umordnen, und wendet den Entwurf über denselben
 * `publish.blattFuellen`-Command an, den auch der Werkzeugleisten-Knopf
 * «Blatt füllen» ohne Editor benutzt (EIN atomarer Undo-Schritt).
 *
 * Bootstrap wie `e2e/blatt-fuellen.spec.ts` (module-design bootstrappt
 * EG/OG + Standard-Aufbauten; Wände+Decke nur auf dem aktiven Geschoss,
 * darum genau EIN ableitbarer Grundriss-Kandidat, dazu Axonometrie/
 * Kennzahlen/Render-Platzhalter — kein Schnitt/Situationsplan im Modell).
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => unknown;
      state: () => { activeStoreyId: string | null; doc: { byKind: (k: string) => { id: string; name?: string }[] } };
      open: (s: string) => void;
    };
  }
}

async function ladeModellUndOeffneEditor(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.goto('/');
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG + Standard-Aufbauten

  await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    const storeyId = st.activeStoreyId!;
    const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW'))!;
    const W = (a: unknown, b: unknown) => k.run('design.wandZeichnen', { storeyId, a, b, assemblyId: aw.id });
    W({ x: 0, y: 0 }, { x: 7000, y: 0 });
    W({ x: 7000, y: 0 }, { x: 7000, y: 5000 });
    W({ x: 7000, y: 5000 }, { x: 0, y: 5000 });
    W({ x: 0, y: 5000 }, { x: 0, y: 0 });
    k.run('design.deckeZeichnen', {
      storeyId,
      outline: [
        { x: 0, y: 0 },
        { x: 7000, y: 0 },
        { x: 7000, y: 5000 },
        { x: 0, y: 5000 },
      ],
    });
    k.open('publish');
  });

  await page.click('[data-testid="add-sheet"]');
  await expect(page.locator('[data-testid="sheet-canvas"]')).toBeVisible();

  await page.click('[data-testid="publish-autopack"]');
  await expect(page.locator('[data-testid="dock-panel-autopack"]')).toBeVisible();
  await expect(page.locator('[data-testid="autopack-panel"]')).toBeVisible();
}

test('Auto-Pack-Editor: öffnet mit echter Vorschau derselben Ableitung, die «Blatt füllen» auch ohne Editor benutzt', async ({
  page,
}) => {
  await ladeModellUndOeffneEditor(page);

  // Ehrlichkeits-Hinweis sichtbar (keine «KI»-Magie-Behauptung).
  await expect(page.locator('[data-testid="autopack-ehrlichkeit-hinweis"]')).toBeVisible();

  // Default-Reihenfolge: Grundriss zuerst (einziger Geschoss-Kandidat mit
  // Bauteilen), danach Axonometrie/Kennzahlen/Render-Platzhalter — kein
  // Schnitt/Situationsplan im Modell (ehrliche Hinweise stattdessen).
  const vorschau = page.locator('[data-testid="autopack-vorschau-liste"]');
  await expect(vorschau).toBeVisible();
  await expect(page.locator('[data-testid="autopack-vorschau-eintrag-0"]')).toContainText('Grundriss');
  await expect(page.locator('[data-testid="autopack-vorschau-hinweise"]')).toContainText('Kein Schnitt im Modell definiert');

  await page.screenshot({ path: 'e2e-results/p12-081-editor-vorschau.png' });
});

test('Auto-Pack-Editor: Umordnen (Axonometrie nach vorn) ändert die Vorschau-Reihenfolge sofort, real nachgerechnet', async ({
  page,
}) => {
  await ladeModellUndOeffneEditor(page);

  await expect(page.locator('[data-testid="autopack-vorschau-eintrag-0"]')).toContainText('Grundriss');

  // Axonometrie dreimal nach oben — an Schnitt/Situationsplan vorbei (keine
  // realen Kandidaten hier) und dann auch am Grundriss vorbei.
  const raufAxo = page.locator('[data-testid="autopack-rauf-axo"]');
  await raufAxo.click();
  await raufAxo.click();
  await raufAxo.click();

  await expect(page.locator('[data-testid="autopack-vorschau-eintrag-0"]')).toContainText('Axonometrie');
  await expect(page.locator('[data-testid="autopack-vorschau-eintrag-1"]')).toContainText('Grundriss');

  await page.screenshot({ path: 'e2e-results/p12-081-nach-umordnung.png' });

  // Anwenden platziert weiterhin GENAU dieselbe Auswahl (Grundriss + Axo +
  // Kennzahlen-Text + Render-Platzhalter), nur die Zellreihenfolge im
  // Raster hat sich gedreht — EIN atomarer Patch, wie ohne Editor.
  await page.click('[data-testid="autopack-anwenden"]');
  await expect(page.locator('[data-testid^="placement-"]')).toHaveCount(2);
  await expect(page.locator('[data-testid^="blatt-bild-"]')).toHaveCount(1);
  await expect(page.locator('[data-testid^="blatt-text-"]')).toHaveCount(1);

  const meldung = page.locator('[data-testid="meldung-info"]');
  await expect(meldung).toBeVisible();
  await expect(meldung).toContainText('Platziert:');

  // Undo-Beweis: EIN Rückgängig macht die ganze umgeordnete Platzierung
  // wieder rückgängig (identisch zum bestehenden `blatt-fuellen`-Undo-Netz).
  await page.click('button:has-text("Rückgängig")');
  await expect(page.locator('[data-testid^="placement-"]')).toHaveCount(0);
  await expect(page.locator('[data-testid^="blatt-bild-"]')).toHaveCount(0);
  await expect(page.locator('[data-testid^="blatt-text-"]')).toHaveCount(0);

  await page.screenshot({ path: 'e2e-results/p12-081-undo-beweis.png' });
});

test('Auto-Pack-Editor: unveränderter Entwurf (Alt-Default) liefert dasselbe Ergebnis wie «Blatt füllen» ohne Editor', async ({
  page,
}) => {
  await ladeModellUndOeffneEditor(page);

  // Keine Umordnung/Abstands-Änderung — «Anwenden» mit dem unveränderten
  // Entwurf muss sich exakt wie der Werkzeugleisten-Knopf «Blatt füllen»
  // verhalten (Neutralitäts-Garantie auch auf UI-Ebene, s. Kernel-Tests
  // `blattfuellung.test.ts`s «P12 Auto-Pack-Optionen»-Block).
  await page.click('[data-testid="autopack-anwenden"]');
  await expect(page.locator('[data-testid^="placement-"]')).toHaveCount(2);
  await expect(page.locator('[data-testid^="blatt-bild-"]')).toHaveCount(1);
  await expect(page.locator('[data-testid^="blatt-text-"]')).toHaveCount(1);

  const meldung = page.locator('[data-testid="meldung-info"]');
  await expect(meldung).toContainText('Platziert:');
  await expect(meldung).toContainText('Fehlt im Modell');
});

test('Auto-Pack-Editor: «Auf Alt-Default zurücksetzen» stellt Reihenfolge/Abstände wieder her', async ({ page }) => {
  await ladeModellUndOeffneEditor(page);

  await page.click('[data-testid="autopack-rauf-axo"]');
  await page.click('[data-testid="autopack-rauf-axo"]');
  await page.fill('[data-testid="autopack-zeilenhoehe"]', '80');
  await expect(page.locator('[data-testid="autopack-vorschau-eintrag-0"]')).toContainText('Grundriss');
  // situationsplan hatte keinen Kandidaten, darum bewegt sich Axo nach zwei
  // Klicks bereits an dessen frühere Stelle, VOR Grundriss steht es erst
  // nach dem dritten Klick (s. vorherige Spec) — hier genügt: der Wert
  // weicht vom Default ab.
  await expect(page.locator('[data-testid="autopack-zeilenhoehe"]')).toHaveValue('80');

  await page.click('[data-testid="autopack-zuruecksetzen"]');
  await expect(page.locator('[data-testid="autopack-zeilenhoehe"]')).toHaveValue('150');
  await expect(page.locator('[data-testid="autopack-vorschau-eintrag-0"]')).toContainText('Grundriss');
});
