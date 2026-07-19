import { expect, test, type Page } from '@playwright/test';

/**
 * PB3 (v0.8.5, `docs/V085-SPEZ.md` §3 E5 + §7 C-19) — die zwei echten
 * Blatt-Darstellungs-Toggles der DARSTELLUNG-Insel («Bemassung»/«Zonen»):
 * steuern, ob platzierte Grundriss-Ansichten auf dem BLATT die assoziative
 * Bemassung bzw. die Parzellen-/Nachbarkontext-Zonenflächen zeigen.
 *
 * **Mechanik (belegt in `publish-runtime.ts`/`BlattCanvas.tsx`/
 * `publish.css`):** STRIKT app-seitig, golden-still — `derive/plansvg.ts`
 * bleibt unangetastet. Die Toggles schalten nur eine CSS-Modifier-Klasse auf
 * `.k-publish-blatt-svg`, die per Attribut-Selektor exakt die schon
 * vorhandenen, eindeutigen SVG-Fragmente ausblendet:
 * - Bemassung: `<g stroke="#111" fill="#111">` je Masskette
 *   (`derive/plansvg.ts:403`).
 * - Zonen: `Zone.zonenArt`-Pfade (`derive/plansvg.ts:149-162`) — Parzelle
 *   (`fill="none" stroke="#111"` MIT `stroke-dasharray`) bzw. Nachbar
 *   (`stroke="#8a8a8a"`).
 *
 * Diese Spec setzt den globalen Manuell-Seed selbst ausser Kraft (Muster
 * `publish-island.spec.ts`), damit der echte Island-Default (`storageState`
 * leer) geprüft wird.
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

/** Hover statt Klick — Muster `publish-island.spec.ts`s `oeffneInsel`. */
async function oeffneInsel(page: Page, island: string): Promise<void> {
  await page.hover(`[data-testid="island-${island}-root"]`);
  await expect(page.locator(`[data-testid="island-${island}-leiste"]`)).toBeVisible();
}

/**
 * Seed über den Kosmo-Test-Hook (Muster `publish-island.spec.ts`s
 * `seedBlatt`): zwei Wände (Bemassungs-Ketten brauchen `walls.length > 0`,
 * `derive/dimensions.ts:42/43`) + eine Parzellen-Zone (`zonenArt:'parzelle'`,
 * `design.zoneErstellen`, `commands/design.ts:555-560`) + ein Blatt mit
 * einer platzierten Grundriss-Ansicht des Geschosses. `bootstrapProject()`
 * (`PublishWorkspace.tsx`) hat beim Öffnen der Station bereits EG/1.OG +
 * die beiden Standard-Aufbauten («AW Beton 36»/«IW Beton 18») angelegt.
 */
async function seedGrundrissMitBemassungUndZone(page: Page): Promise<void> {
  await page.evaluate(() => {
    const doc = window.__kosmo.state().doc as unknown as {
      byKind: (k: string) => Array<{ id: string; name: string; target?: string }>;
    };
    const storeyId = doc.byKind('storey')[0]!.id;
    const aufbau = doc.byKind('assembly').find((a) => a.target === 'wall')!;
    window.__kosmo.run('design.wandZeichnen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 5000, y: 0 },
      assemblyId: aufbau.id,
    });
    window.__kosmo.run('design.wandZeichnen', {
      storeyId,
      a: { x: 5000, y: 0 },
      b: { x: 5000, y: 4000 },
      assemblyId: aufbau.id,
    });
    window.__kosmo.run('design.zoneErstellen', {
      storeyId,
      name: 'Parzelle',
      sia: 'KF',
      zonenArt: 'parzelle',
      outline: [
        { x: -3000, y: -3000 },
        { x: 9000, y: -3000 },
        { x: 9000, y: 8000 },
        { x: -3000, y: 8000 },
      ],
    });
    const sheet = window.__kosmo.run('publish.blattErstellen', {
      name: 'Toggle-Test',
      format: 'A1',
      orientation: 'quer',
    });
    const sheetId = sheet.patches[0]!.id;
    window.__kosmo.run('publish.ansichtPlatzieren', {
      sheetId,
      view: 'grundriss',
      storeyId,
      scale: 100,
      x: 400,
      y: 250,
    });
  });
  await expect(page.locator('[data-testid="publish-island-buehne"]')).toBeVisible();
  await expect(page.locator('[data-testid="sheet-canvas"]')).toBeVisible();
  await expect(page.locator('[data-testid^="placement-"]')).toHaveCount(1);
}

/** Öffnet die DARSTELLUNG-Insel und deren «Sichtbarkeit»-Popup. */
async function oeffneSichtbarkeit(page: Page): Promise<void> {
  await oeffneInsel(page, 'darstellung');
  await page.click('[data-testid="island-werkzeug-sichtbarkeit"]');
  await expect(page.locator('[data-testid="island-sichtbarkeit-stufe2"]')).toBeVisible();
}

const svgKanvas = (page: Page) => page.locator('[data-testid="sheet-canvas"] .k-publish-blatt-svg');
const massketteGruppen = (page: Page) => svgKanvas(page).locator("svg g[stroke='#111'][fill='#111']");
const zonenPfade = (page: Page) => svgKanvas(page).locator("svg path[fill='none'][stroke='#111'][stroke-dasharray]");

/**
 * `KSwitch` (`@kosmo/ui`, `packages/kosmo-ui/src/aura.css` `.k-switch`) hält
 * das echte `<input type="checkbox">` `position:absolute; opacity:0` — ein
 * Standard-Muster, das Playwrights `.check()`/`.uncheck()` (klickt auf den
 * gemessenen Input-Mittelpunkt) anderswo im Modul klaglos trifft
 * (`e2e/plankopf.spec.ts`s `blattlayout-wasserzeichen`). Innerhalb DIESES
 * Insel-Popups sitzt der Schalter aber unter `.isl-popup` (`island.css:333`,
 * PB1/PC0-Hotspot — NICHT dieses Pakets Dateikreis), das selbst ein
 * `transform` trägt (Positionierungs-/Eintritts-Animation) — das öffnet
 * einen neuen Containing Block für das absolut positionierte `<input>` und
 * verschiebt dessen gemessene Box gegenüber dem sichtbaren `.k-switch-
 * strecke`-Track, wodurch der Track den berechneten Klickpunkt abfängt
 * («intercepts pointer events», reproduzierbar). Der PRAGMATISCHE, in
 * diesem Dateikreis lösbare Fix: `force:true` klickt exakt das `<input>`-
 * Element selbst (keine Interception-/Sichtbarkeitsprüfung), löst denselben
 * nativen Klick/`change` aus wie ein Nutzer, der auf den sichtbaren Schalter
 * tippt — dieselbe Wirkung, nur ohne die (hier fehlgemessene) Actionability-
 * Prüfung. Kein Produktcode-Fix nötig/erlaubt (Hotspot-Sanktion).
 */
async function klickSchalter(page: Page, testid: string): Promise<void> {
  await page.locator(`[data-testid="${testid}"]`).click({ force: true });
}

test.describe('C-19 — Blatt-Darstellungs-Toggles «Bemassung»/«Zonen» (DARSTELLUNG-Insel)', () => {
  test('DARSTELLUNG-Insel zeigt beide Toggles, Default EIN', async ({ page }) => {
    await oeffnePublishIsland(page);
    await oeffneSichtbarkeit(page);
    const bemassung = page.locator('[data-testid="island-sichtbarkeit-bemassung"]');
    const zonen = page.locator('[data-testid="island-sichtbarkeit-zonen"]');
    await expect(bemassung).toBeVisible();
    await expect(zonen).toBeVisible();
    await expect(bemassung).toBeChecked();
    await expect(zonen).toBeChecked();
  });

  test('Default (ohne jeden Toggle-Klick): data-bemassung/-zonen stehen auf "an" — Bestandsschutz für bestehende Blatt-Screenshots', async ({
    page,
  }) => {
    await oeffnePublishIsland(page);
    await seedGrundrissMitBemassungUndZone(page);
    await expect(svgKanvas(page)).toHaveAttribute('data-bemassung', 'an');
    await expect(svgKanvas(page)).toHaveAttribute('data-zonen', 'an');
    expect(await massketteGruppen(page).count()).toBeGreaterThan(0);
    expect(await zonenPfade(page).count()).toBeGreaterThan(0);
  });

  test('Bemassung-Toggle blendet die Masskette-Gruppen auf dem Blatt aus/ein (echter SVG-Beweis)', async ({ page }) => {
    await oeffnePublishIsland(page);
    await seedGrundrissMitBemassungUndZone(page);

    const gruppen = massketteGruppen(page);
    const anzahl = await gruppen.count();
    expect(anzahl).toBeGreaterThan(0);
    for (let i = 0; i < anzahl; i++) {
      await expect(gruppen.nth(i)).toBeVisible();
    }
    await page.screenshot({ path: 'e2e-results/pb3-085-bemassung-ein.png' });

    await oeffneSichtbarkeit(page);
    await klickSchalter(page, 'island-sichtbarkeit-bemassung');
    await expect(svgKanvas(page)).toHaveAttribute('data-bemassung', 'aus');
    for (let i = 0; i < anzahl; i++) {
      await expect(gruppen.nth(i)).toBeHidden();
    }
    await page.screenshot({ path: 'e2e-results/pb3-085-bemassung-aus.png' });

    // Zonen bleiben von diesem Toggle unberührt (zwei unabhängige Felder).
    expect(await zonenPfade(page).count()).toBeGreaterThan(0);
    await expect(zonenPfade(page).first()).toBeVisible();

    await oeffneSichtbarkeit(page);
    await klickSchalter(page, 'island-sichtbarkeit-bemassung');
    await expect(svgKanvas(page)).toHaveAttribute('data-bemassung', 'an');
    for (let i = 0; i < anzahl; i++) {
      await expect(gruppen.nth(i)).toBeVisible();
    }
  });

  test('Zonen-Toggle blendet die Parzellen-Kontextfläche aus/ein (echter SVG-Beweis)', async ({ page }) => {
    await oeffnePublishIsland(page);
    await seedGrundrissMitBemassungUndZone(page);

    const pfade = zonenPfade(page);
    const anzahl = await pfade.count();
    expect(anzahl).toBeGreaterThan(0);
    await expect(pfade.first()).toBeVisible();

    await oeffneSichtbarkeit(page);
    await klickSchalter(page, 'island-sichtbarkeit-zonen');
    await expect(svgKanvas(page)).toHaveAttribute('data-zonen', 'aus');
    for (let i = 0; i < anzahl; i++) {
      await expect(pfade.nth(i)).toBeHidden();
    }

    // Bemassung bleibt von diesem Toggle unberührt.
    expect(await massketteGruppen(page).count()).toBeGreaterThan(0);
    await expect(massketteGruppen(page).first()).toBeVisible();

    await oeffneSichtbarkeit(page);
    await klickSchalter(page, 'island-sichtbarkeit-zonen');
    await expect(svgKanvas(page)).toHaveAttribute('data-zonen', 'an');
    await expect(pfade.first()).toBeVisible();
  });

  test('Zustand überlebt Insel-Schliessen (Laufzeit-Store, kein Reset beim Popup-Schliessen)', async ({ page }) => {
    await oeffnePublishIsland(page);
    await seedGrundrissMitBemassungUndZone(page);

    await oeffneSichtbarkeit(page);
    await klickSchalter(page, 'island-sichtbarkeit-bemassung');
    await expect(svgKanvas(page)).toHaveAttribute('data-bemassung', 'aus');

    // Insel schliessen — der explizite Schliessen-Knopf des Popups
    // (`IslandShell.tsx`s `useOverlaySchliessen`, testid-Muster
    // `island-<werkzeugId>-popup-schliessen`).
    await page.click('[data-testid="island-sichtbarkeit-popup-schliessen"]');
    await expect(page.locator('[data-testid="island-sichtbarkeit-stufe2"]')).toHaveCount(0);
    // Zustand bleibt AUS, während die Insel geschlossen ist.
    await expect(svgKanvas(page)).toHaveAttribute('data-bemassung', 'aus');
    await expect(massketteGruppen(page).first()).toBeHidden();

    // Insel erneut öffnen: der Switch zeigt denselben Zustand.
    await oeffneSichtbarkeit(page);
    await expect(page.locator('[data-testid="island-sichtbarkeit-bemassung"]')).not.toBeChecked();
  });

  test('derselbe Laufzeit-Store wirkt in BEIDEN Modi — Toggle in Island bleibt nach dem Wechsel zu Manuell aktiv', async ({
    page,
  }) => {
    await oeffnePublishIsland(page);
    await seedGrundrissMitBemassungUndZone(page);

    await oeffneSichtbarkeit(page);
    await klickSchalter(page, 'island-sichtbarkeit-zonen');
    await expect(svgKanvas(page)).toHaveAttribute('data-zonen', 'aus');

    // Rückweg 'island' → 'manuell' (AUSTAUSCH-Insel, Muster publish-island.spec.ts).
    await oeffneInsel(page, 'austausch');
    await page.click('[data-testid="island-werkzeug-manuell"]');
    await expect(page.locator('[data-testid="publish-werkzeugleiste"]')).toBeVisible();

    // Dieselbe Blattfläche (BlattCanvas), derselbe Store — Zustand bleibt AUS.
    const manuellCanvas = page.locator('[data-testid="sheet-canvas"] .k-publish-blatt-svg');
    await expect(manuellCanvas).toHaveAttribute('data-zonen', 'aus');
  });
});
