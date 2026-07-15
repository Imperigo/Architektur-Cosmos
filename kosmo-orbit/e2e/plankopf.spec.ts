import { expect, test } from '@playwright/test';

/**
 * PlankopfPanel (v0.8.0 P6, `docs/V080-PLANKOPF-SPEZ.md` §1.5/§2.3/§4/§8
 * V-K9/P-K7) — deckt die im Bau-Auftrag geforderten Kernpunkte ab:
 *
 *  - Felder setzen → Plankopf erscheint im SVG (`<g data-teil="plankopf">`),
 *    Plancode wird sichtbar UND im Panel korrekt (`sheetPlancode()`).
 *  - Layout-Toggle Wasserzeichen an/aus (`publish.blattLayoutSetzen`).
 *  - Overlay-Klick öffnet/fokussiert das Panel — für BEIDE Geometrien (Alt-
 *    Fusskopf ohne Plankopf-/Layout-Daten, Framework-Plankopf mit Daten;
 *    Nachweis über die Overlay-Bounding-Box, die beim Wechsel spürbar
 *    wächst, 120×26/31mm → 180×55mm).
 *  - Massstab-Chip MIT Selektion ändert den Massstab der Platzierung (+
 *    Undo), OHNE Selektion bleiben die Chips deaktiviert (reine
 *    Empfehlungsanzeige, Spez §2.3).
 *  - Nicht-PNG-Logo an `publish.bueroSetzen` → ehrliche Fehlermeldung
 *    (`meldung-fehler`), kein stiller Fehlschlag (Spez §4.3/§8).
 *
 * Bootstrap wie `e2e/baugesuch.spec.ts`/`e2e/module.spec.ts`: TKB-Demo laden
 * (Default-Doc, `siaPhase: 'wettbewerb'` → Matrix-Stufe VS, `docs/
 * V080-PLANKOPF-SPEZ.md` §2.2), Publish öffnen, `window.__kosmo` für
 * deterministische Modell-Abfragen (kein Test-Hook-Shortcut für den
 * eigentlichen Plankopf-Auftrag selbst — alle Feld-/Toggle-/Chip-
 * Interaktionen laufen über echte UI-Klicks).
 */

declare global {
  interface Window {
    __kosmo: {
      state: () => {
        doc: {
          byKind: (k: string) => { id: string; placements: { scale: number }[] }[];
        };
      };
      open: (s: string) => void;
    };
  }
}

async function ladeUndOeffnePublish(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.goto('/');
  await page.click('[data-testid="load-tkb"]');
  await page.evaluate(() => window.__kosmo.open('publish'));
  await expect(page.locator('[data-testid="publish-werkzeugleiste"]')).toBeVisible();
}

test('Plankopf: Felder setzen → Framework-Plankopf im SVG, Plancode korrekt, Wasserzeichen-Toggle an/aus', async ({ page }) => {
  await ladeUndOeffnePublish(page);
  await page.click('[data-testid="add-sheet"]');
  await expect(page.locator('[data-testid="sheet-canvas"]')).toBeVisible();

  await page.click('[data-testid="publish-plankopf"]');
  await expect(page.locator('[data-testid="plankopf-panel"]')).toBeVisible();

  // Vor dem Ausfüllen: Alt-Fusskopf, kein Framework-Plankopf im SVG.
  await expect(page.locator('[data-testid="sheet-canvas"] g[data-teil="plankopf"]')).toHaveCount(0);

  await page.fill('[data-testid="plankopf-buero-kuerzel"]', 'MAA');
  await page.locator('[data-testid="plankopf-buero-kuerzel"]').blur();
  await page.fill('[data-testid="plankopf-projekt-code"]', 'SEE');
  await page.locator('[data-testid="plankopf-projekt-code"]').blur();
  await page.fill('[data-testid="plankopf-disziplin"]', 'A');
  await page.locator('[data-testid="plankopf-disziplin"]').blur();
  await page.fill('[data-testid="plankopf-geschoss"]', 'EG');
  await page.locator('[data-testid="plankopf-geschoss"]').blur();
  await page.fill('[data-testid="plankopf-plan-nummer"]', '101');
  await page.locator('[data-testid="plankopf-plan-nummer"]').blur();
  await page.fill('[data-testid="plankopf-inhalt"]', 'Grundriss EG');
  await page.locator('[data-testid="plankopf-inhalt"]').blur();

  // Sobald IRGENDEIN Plankopf-Feld gesetzt ist, ersetzt das Framework den
  // Alt-Fusskopf (Daten-Guard, `derive/sheet.ts` `rahmenGuard`).
  await expect(page.locator('[data-testid="sheet-canvas"] g[data-teil="plankopf"]')).toHaveCount(1, { timeout: 10_000 });
  await expect(page.locator('[data-testid="sheet-canvas"]')).toContainText('Grundriss EG');

  // Plancode: MAA-SEE-<Matrix-Stufe>-A-EG-101 (Matrix-Stufe = 2 Buchstaben,
  // Default-Doc `siaPhase: 'wettbewerb'` → VS, s. `siaZuMatrixStufe`).
  const plancode = page.locator('[data-testid="plankopf-plancode"]');
  await expect(plancode).toHaveText(/^MAA-SEE-[A-Z]{2}-A-EG-101$/);
  await expect(page.locator('[data-testid="sheet-canvas"]')).toContainText(await plancode.innerText());
  // Kein «unvollständig»-Hinweis mehr, sobald alle drei Pflichtteile stehen.
  await expect(page.locator('[data-testid="plankopf-plancode-hinweis"]')).toHaveCount(0);

  // Wasserzeichen-Toggle (VS-Phase: «STUDIE — NICHT FÜR AUSFÜHRUNG»).
  await expect(page.locator('[data-testid="sheet-canvas"]')).not.toContainText('STUDIE');
  await page.check('[data-testid="blattlayout-wasserzeichen"]');
  await expect(page.locator('[data-testid="sheet-canvas"]')).toContainText('STUDIE', { timeout: 10_000 });
  await page.uncheck('[data-testid="blattlayout-wasserzeichen"]');
  await expect(page.locator('[data-testid="sheet-canvas"]')).not.toContainText('STUDIE', { timeout: 10_000 });
});

test('Plankopf: Plancode-Hinweis nennt fehlende Teile, bevor die Stammdaten stehen', async ({ page }) => {
  await ladeUndOeffnePublish(page);
  await page.click('[data-testid="add-sheet"]');
  await page.click('[data-testid="publish-plankopf"]');

  const hinweis = page.locator('[data-testid="plankopf-plancode-hinweis"]');
  await expect(hinweis).toContainText('Büro-Kürzel');
  await expect(hinweis).toContainText('Projekt-Code');
  await expect(hinweis).toContainText('Plan-Nummer');
  await expect(page.locator('[data-testid="plankopf-plancode"]')).toHaveText('—');
});

test('Plankopf-Overlay: Klick öffnet das Panel bei BEIDEN Geometrien — Alt-Rect ohne Daten, Framework-Rect mit Daten', async ({ page }) => {
  await ladeUndOeffnePublish(page);
  await page.click('[data-testid="add-sheet"]');
  await expect(page.locator('[data-testid="sheet-canvas"]')).toBeVisible();

  await expect(page.locator('[data-testid="plankopf-panel"]')).toHaveCount(0);
  const overlay = page.locator('[data-testid="plankopf-overlay"]');
  await expect(overlay).toBeAttached();
  const altBox = await overlay.boundingBox();
  expect(altBox).not.toBeNull();

  // Alt-Rect: Overlay-Klick öffnet das Panel, obwohl das Blatt noch KEINE
  // Plankopf-/Layout-Daten trägt (kompakter Fusskopf, kein `data-teil`).
  await overlay.click();
  await expect(page.locator('[data-testid="plankopf-panel"]')).toBeVisible();
  await page.click('[data-testid="plankopf-schliessen"]');
  await expect(page.locator('[data-testid="plankopf-panel"]')).toHaveCount(0);

  // Framework-Rect: sobald ein Plankopf-Feld gesetzt ist, wächst die Hitbox
  // spürbar (120×26/31mm → 180×55mm) — Klick öffnet das Panel weiterhin.
  await page.click('[data-testid="publish-plankopf"]');
  await page.fill('[data-testid="plankopf-inhalt"]', 'Fassade Ost');
  await page.locator('[data-testid="plankopf-inhalt"]').blur();
  await expect(page.locator('[data-testid="sheet-canvas"] g[data-teil="plankopf"]')).toHaveCount(1);
  await page.click('[data-testid="plankopf-schliessen"]');
  await expect(page.locator('[data-testid="plankopf-panel"]')).toHaveCount(0);

  const frameworkBox = await overlay.boundingBox();
  expect(frameworkBox).not.toBeNull();
  expect(frameworkBox!.height).toBeGreaterThan(altBox!.height * 1.3);

  await overlay.click();
  await expect(page.locator('[data-testid="plankopf-panel"]')).toBeVisible();
});

test('Massstab-Chips: ohne Selektion deaktiviert, mit Selektion ändern sie den Massstab der Platzierung (+ Undo)', async ({ page }) => {
  await ladeUndOeffnePublish(page);
  await page.click('[data-testid="add-sheet"]');
  await page.click('[data-testid="place-plan"]');
  await expect(page.locator('[data-testid^="placement-"]')).toHaveCount(1);

  await page.click('[data-testid="publish-plankopf"]');
  await expect(page.locator('[data-testid="plankopf-panel"]')).toBeVisible();

  // VS-Phase (Default-Doc) empfiehlt 1:500/1:200 — ohne Selektion deaktiviert.
  const chip500 = page.locator('[data-testid="plankopf-massstab-chip-500"]');
  await expect(chip500).toBeVisible();
  await expect(chip500).toBeDisabled();
  await expect(page.locator('[data-testid="plankopf-massstab-hinweis"]')).toBeVisible();

  await page.locator('[data-testid^="placement-"]').first().click();
  await expect(chip500).toBeEnabled();
  await expect(page.locator('[data-testid="plankopf-massstab-hinweis"]')).toHaveCount(0);

  const liesScale = () =>
    page.evaluate(() => window.__kosmo.state().doc.byKind('sheet')[0]!.placements[0]!.scale);

  const scaleVorClick = await liesScale();

  await chip500.click();
  await expect(page.locator('[data-testid="meldung-erfolg"]')).toContainText('1:500');
  await expect.poll(liesScale).toBe(500);

  // Undo macht die Massstabsänderung rückgängig — Panel vorher schliessen,
  // weil es (rechts oben, `right:16/top:52`) den «Rückgängig»-Knopf der
  // Blattflächen-Werkzeugleiste überlappt und dessen Klick abfangen würde.
  await page.click('[data-testid="plankopf-schliessen"]');
  await expect(page.locator('[data-testid="plankopf-panel"]')).toHaveCount(0);
  await page.click('button:has-text("Rückgängig")');
  await expect.poll(liesScale).toBe(scaleVorClick);
});

test('Büro-Logo: Nicht-PNG-Datei löst die ehrliche Fehlermeldung des Commands aus', async ({ page }) => {
  await ladeUndOeffnePublish(page);
  await page.click('[data-testid="add-sheet"]');
  await page.click('[data-testid="publish-plankopf"]');
  await expect(page.locator('[data-testid="plankopf-panel"]')).toBeVisible();

  await page.setInputFiles('[data-testid="plankopf-buero-logo"]', {
    name: 'logo.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('DAS IST KEIN PNG'),
  });

  const toast = page.locator('[data-testid="meldung-fehler"]');
  await expect(toast).toContainText('PNG erforderlich');
  // Kein stiller Fehlschlag: das Panel bleibt offen, kein Logo gesetzt.
  await expect(page.locator('[data-testid="plankopf-panel"]')).toBeVisible();
});
