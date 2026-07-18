import { expect, test, type Page } from '@playwright/test';

/**
 * PC3 (`docs/V084-SPEZ.md` §5 W3, C-19) — «KosmoPublish komplett auf
 * Islands + Blatt-Zoom». Diese Spec ist NEU (Dateikreis-Auftrag) und
 * beweist:
 * - alle vier Publish-Inseln (BLATT/DARSTELLUNG/PROJEKT/AUSTAUSCH) rendern
 *   echt, mit den in `publish-island-katalog.ts` benannten Werkzeugen
 *   (Bauauftrag);
 * - die alte Sidebar/Werkzeugleiste/`DockFlaeche` ist im Island-Modus WEG;
 * - Blatt-Zoom (C-19): Wheel ändert die Skalierung der Blatt-Bühne, «Fit»
 *   setzt sie wieder auf den eingepassten Ausgangszustand zurück — die
 *   Massstab-Semantik platzierter Ansichten (`publish.ansichtPlatzieren`s
 *   `scale`) bleibt dabei unberührt (reiner Viewport-Zoom);
 * - der Manuell-Rückweg ('island' → 'manuell' → 'island') funktioniert
 *   beidseitig, Manuell bleibt exakt das heutige Publish (Bestandsschutz).
 *
 * **Diese Spec setzt den globalen Manuell-Seed selbst ausser Kraft**
 * (`test.use({ storageState: { cookies: [], origins: [] } })`, exakt wie
 * `vis-island.spec.ts`/`island-ui.spec.ts`) — nur ein leerer Kontext beweist
 * den echten Produktions-Default `publishOberflaeche:'island'` ohne Seed.
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[]; summary: string };
      state: () => {
        doc: {
          byKind: (k: string) => Array<{ id: string; name: string }>;
        };
      };
    };
  }
}

test.use({ storageState: { cookies: [], origins: [] } });

async function oeffnePublishIsland(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-publish"]');
}

/** Hover statt Klick — dasselbe Muster wie `island-ui.spec.ts`/`vis-island.spec.ts`s `oeffneInsel`. */
async function oeffneInsel(page: Page, island: string): Promise<void> {
  await page.hover(`[data-testid="island-${island}-root"]`);
  await expect(page.locator(`[data-testid="island-${island}-leiste"]`)).toBeVisible();
}

/** Legt über den Kosmo-Test-Hook ein Blatt an — reduziert Zoom-/Export-Tests
 *  auf ihre eigentliche Aussage (Fixture statt UI-Weg, Muster `vis-island.
 *  spec.ts`s `seedGraphMitRenderNode`). KEIN `page.reload()` danach — das
 *  Projekt-Doc lebt nur im Speicher. */
async function seedBlatt(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__kosmo.run('publish.blattErstellen', { name: 'Insel-Test', format: 'A1', orientation: 'quer' });
  });
  await expect(page.locator('[data-testid="publish-island-buehne"]')).toBeVisible();
  await expect(page.locator('[data-testid="sheet-canvas"]')).toBeVisible();
}

test.describe('PC3 — KosmoPublish auf Islands (Default, kein Seed)', () => {
  test('Default ist island — alle vier Inseln rendern als Pill, alte Chrome ist weg', async ({ page }) => {
    await oeffnePublishIsland(page);

    for (const island of ['blatt', 'darstellung', 'projekt', 'austausch']) {
      await expect(page.locator(`[data-testid="island-${island}-pill"]`)).toBeVisible();
    }

    // Alte Chrome ist im Island-Modus WEG.
    await expect(page.locator('[data-testid="publish-werkzeugleiste"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="blattflaeche-werkzeugleiste"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="add-sheet"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="export-set"]')).toHaveCount(0);

    await page.screenshot({ path: 'test-results/pc3-publish-island-pillen.png' });
  });

  test('BLATT-Insel: Blatt anlegen legt ein echtes Blatt an und aktiviert es', async ({ page }) => {
    await oeffnePublishIsland(page);
    // Vor dem ersten Blatt zeigt die Bühne den Leerzustand (kein `sheet`/
    // `paper` → keine `BlattZoomBuehne`, s. `PublishWorkspace.tsx`s
    // Island-Zweig-Kommentar).
    await expect(page.locator('text=Noch kein Blatt im Plansatz')).toBeVisible();

    await oeffneInsel(page, 'blatt');
    await page.click('[data-testid="island-werkzeug-blatt"]');
    await expect(page.locator('[data-testid="island-blatt-stufe2"]')).toBeVisible();
    await page.click('[data-testid="island-blatt-anlegen"]');
    await expect(page.locator('[data-testid="sheet-canvas"]')).toBeVisible();
    const namen = await page.evaluate(() => window.__kosmo.state().doc.byKind('sheet').map((s) => s.name));
    expect(namen).toContain('Blatt 1');
    await page.screenshot({ path: 'test-results/pc3-publish-island-blatt.png' });
  });

  test('BLATT-Insel: Ansicht platzieren legt eine echte Platzierung aufs Blatt', async ({ page }) => {
    await oeffnePublishIsland(page);
    await seedBlatt(page);

    await oeffneInsel(page, 'blatt');
    await page.click('[data-testid="island-werkzeug-platzieren"]');
    await expect(page.locator('[data-testid="island-platzieren-stufe2"]')).toBeVisible();
    await page.click('[data-testid="island-platzieren-axo"]');
    await expect(page.locator('[data-testid^="placement-"]')).toHaveCount(1);
  });

  test('DARSTELLUNG-Insel: Zoom-Popup mit Minus/Fit/Plus', async ({ page }) => {
    await oeffnePublishIsland(page);
    await seedBlatt(page);

    await oeffneInsel(page, 'darstellung');
    await page.click('[data-testid="island-werkzeug-zoom"]');
    await expect(page.locator('[data-testid="island-zoom-stufe2"]')).toBeVisible();
    await expect(page.locator('[data-testid="island-zoom-plus"]')).toBeVisible();
    await expect(page.locator('[data-testid="island-zoom-minus"]')).toBeVisible();
    await expect(page.locator('[data-testid="island-zoom-fit"]')).toBeVisible();
    await page.screenshot({ path: 'test-results/pc3-publish-island-darstellung.png' });
  });

  test('C-19 Zoom-Beweis: Wheel ändert die Skalierung der Blatt-Bühne, Fit setzt sie zurück', async ({ page }) => {
    await oeffnePublishIsland(page);
    await seedBlatt(page);

    const transform = page.locator('[data-testid="publish-island-transform"]');
    const anfangsSkala = Number(await transform.getAttribute('data-scale'));
    expect(anfangsSkala).toBeCloseTo(1, 4);

    // Wheel-Zoom auf der Bühne (negatives deltaY = hineinzoomen, Muster NodeCanvas).
    const buehne = page.locator('[data-testid="publish-island-buehne"]');
    const box = (await buehne.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -400);
    await expect
      .poll(async () => Number(await transform.getAttribute('data-scale')))
      .toBeGreaterThan(anfangsSkala);
    const gezoomteSkala = Number(await transform.getAttribute('data-scale'));

    // «Fit» über die DARSTELLUNG-Insel setzt die Skalierung zurück auf 1.
    await oeffneInsel(page, 'darstellung');
    await page.click('[data-testid="island-werkzeug-zoom"]');
    await page.click('[data-testid="island-zoom-fit"]');
    await expect.poll(async () => Number(await transform.getAttribute('data-scale'))).toBeCloseTo(1, 4);
    expect(gezoomteSkala).not.toBeCloseTo(1, 4);

    // Fernauslöser-Knöpfe (Zoom+/Zoom-) ändern die Skalierung ebenfalls.
    await oeffneInsel(page, 'darstellung');
    await page.click('[data-testid="island-werkzeug-zoom"]');
    await page.click('[data-testid="island-zoom-plus"]');
    await expect.poll(async () => Number(await transform.getAttribute('data-scale'))).toBeCloseTo(1.25, 2);

    await page.screenshot({ path: 'test-results/pc3-publish-island-blatt-gezoomt.png' });
  });

  test('PROJEKT-Insel: Dossier öffnet das echte DossierPanel', async ({ page }) => {
    await oeffnePublishIsland(page);
    await oeffneInsel(page, 'projekt');
    await page.click('[data-testid="island-werkzeug-dossier"]');
    await expect(page.locator('[data-testid="dossier-panel"]')).toBeVisible();
  });

  test('PROJEKT-Insel: Plankopf öffnet das echte PlankopfPanel', async ({ page }) => {
    await oeffnePublishIsland(page);
    await seedBlatt(page);
    await oeffneInsel(page, 'projekt');
    await page.click('[data-testid="island-werkzeug-plankopf"]');
    await expect(page.locator('[data-testid="plankopf-schliessen"]')).toBeVisible();
  });

  test('AUSTAUSCH-Insel: Export-Hub legt ein Publikations-Set an', async ({ page }) => {
    await oeffnePublishIsland(page);
    await seedBlatt(page);

    await oeffneInsel(page, 'austausch');
    await page.click('[data-testid="island-werkzeug-export-hub"]');
    await expect(page.locator('[data-testid="island-export-hub-stufe2"]')).toBeVisible();
    await page.fill('[data-testid="island-pubset-name"]', 'Insel-Set');
    await page.click('[data-testid="island-pubset-speichern"]');
    await expect(page.locator('[data-testid="island-pubset-eintrag"]')).toHaveCount(1);
  });

  test('AUSTAUSCH-Insel: Manuell schaltet zurück, "Island-UI"-Knopf schaltet wieder vor — Manuell bleibt heutiges Publish', async ({
    page,
  }) => {
    await oeffnePublishIsland(page);

    // Vorwärtsweg 'island' → 'manuell'.
    await oeffneInsel(page, 'austausch');
    await page.click('[data-testid="island-werkzeug-manuell"]');
    await expect(page.locator('[data-testid="publish-werkzeugleiste"]')).toBeVisible();
    await expect(page.locator('[data-testid="island-blatt-root"]')).toHaveCount(0);
    // Bestandsschutz: Manuell zeigt exakt die heutige Sidebar/Werkzeugleiste.
    await expect(page.locator('[data-testid="add-sheet"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-set"]')).toBeVisible();
    await page.screenshot({ path: 'test-results/pc3-publish-manuell-unveraendert.png' });

    // Rückweg 'manuell' → 'island'.
    await page.click('[data-testid="island-zurueck"]');
    await expect(page.locator('[data-testid="island-austausch-root"]')).toBeVisible();
    await expect(page.locator('[data-testid="publish-werkzeugleiste"]')).toHaveCount(0);
  });

  test('Kosmo-Orb ist im Island-Modus der einzige Kosmo-Zugang (kein Boden-Dock)', async ({ page }) => {
    await oeffnePublishIsland(page);
    await expect(page.locator('[data-testid="boden-dock"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="kosmo-orb-wurzel"]')).toBeVisible();
  });
});
