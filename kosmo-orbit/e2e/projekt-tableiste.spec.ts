import { expect, test, type Page } from '@playwright/test';

/**
 * P-Z («Projekt-Tableiste», `docs/V0812-SPEZ.md` §E-Z, Owner-Auftrag
 * «Projekt-Tableiste — nur Projekte, kein AI-Slop»): `ProjektListe`
 * (App.tsx) wechselt von der vertikalen Karten-Liste zur horizontalen Tab-
 * Leiste — ein Tab je Tresor-Projekt, aktives Projekt markiert, Tab-Klick
 * öffnet, «+ Neues Projekt» als letzter Tab. Die harten testid-Verträge
 * (`projekt-<id>`/`projekt-oeffnen-<id>`/`projekt-neu`/`projekt-neu-name`/
 * `katalog-export`/`katalog-import`) sind hier NICHT nochmals geprüft —
 * das übernehmen die unveränderten Bestandsspecs `e2e/module.spec.ts`
 * (Bestätigung-Test) und `e2e/orbit-hub-vollausbau.spec.ts`/`e2e/
 * cursor-ebene.spec.ts` (Namensfeld). Diese Spec beweist die NEUE
 * Tableiste-Mechanik selbst:
 *  (a) ein Tab je Projekt + genau eine aktiv-Markierung,
 *  (b) Tab-Klick lädt das Projekt beweisbar (Projektname im lebenden Doc),
 *  (c) der «+»-Schluss-Tab legt sofort ein frisches, benanntes Projekt an,
 *  (d) Touch-Höhe ≥44px je Tab/Knopf,
 *  (e) iPad 1024×768 (Touch) — Muster `e2e/start-sequenz.spec.ts` «iPad
 *      1024×768».
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => unknown;
      state: () => { activeStoreyId: string | null; doc: { settings: { projectName: string } } };
    };
  }
}

async function zentraleLaden(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.waitForSelector('[data-testid="orbit-start"]');
}

/**
 * Legt über den «+»-Schluss-Tab ein neues Projekt an, zeichnet eine Wand
 * (bumpt die `revision`) und wartet den Autosave-Entprellzeitraum ab —
 * dieselbe Tresor-Mechanik wie `module.spec.ts`s Bestätigung-Test:
 * `neuesProjekt()` (state/project-vault.ts) schreibt den Vault-Record erst
 * NACH einer echten Revisionsänderung + 1.2s Entprellung (`initVault()`s
 * `setTimeout`) in die IndexedDB — ein frisch angelegtes, unangefasstes
 * Projekt taucht darum in `listeProjekte()` (und damit als Tab) noch NICHT
 * auf. Endet zurück auf der Zentrale (Tableiste sichtbar).
 */
async function projektAnlegenUndSichern(page: Page, name: string): Promise<void> {
  await page.fill('[data-testid="projekt-neu-name"]', name);
  await page.click('[data-testid="projekt-neu"]');
  await expect(page.locator('[data-testid="export-pdf"]')).toBeVisible();
  await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    const aufbau = k.run('design.aufbauErstellen', {
      name: 'AW T',
      target: 'wall',
      layers: [{ material: 'beton', thickness: 200, function: 'tragend' }],
    }) as { patches: { id: string }[] };
    k.run('design.wandZeichnen', {
      storeyId: st.activeStoreyId,
      assemblyId: aufbau.patches[0].id,
      a: { x: 0, y: 0 },
      b: { x: 4000, y: 0 },
    });
  });
  await page.waitForTimeout(1800);
  await page.click('[aria-label="Zur Zentrale"]');
}

test('Tabs erscheinen je Tresor-Projekt, genau ein Tab trägt die aktiv-Markierung', async ({ page }) => {
  await zentraleLaden(page);
  await projektAnlegenUndSichern(page, 'Tableiste Eins');
  await projektAnlegenUndSichern(page, 'Tableiste Zwei');

  const einsTab = page.locator('[data-testid^="projekt-"]', { hasText: 'Tableiste Eins' }).first();
  const zweiTab = page.locator('[data-testid^="projekt-"]', { hasText: 'Tableiste Zwei' }).first();
  await expect(einsTab).toBeVisible();
  await expect(zweiTab).toBeVisible();

  // Zuletzt angelegt = aktiv («Tableiste Zwei») — «Tableiste Eins» zeigt
  // stattdessen den anklickbaren Öffnen-Bereich (harter testid-Vertrag).
  await expect(zweiTab).toContainText('aktiv');
  await expect(einsTab).not.toContainText('aktiv');
  await expect(einsTab.locator('button[data-testid^="projekt-oeffnen-"]')).toBeVisible();
});

test('Tab-Klick wechselt das Projekt beweisbar — Projektname ändert sich im lebenden Doc', async ({ page }) => {
  await zentraleLaden(page);
  await projektAnlegenUndSichern(page, 'Wechsel Alpha');
  await projektAnlegenUndSichern(page, 'Wechsel Beta');

  // Nach dem zweiten Anlegen ist «Wechsel Beta» aktiv — zurück zu Alpha
  // wechseln über dessen Öffnen-Bereich (Tab-Klick = oeffneProjekt()).
  const alphaOeffnen = page
    .locator('[data-testid^="projekt-"]', { hasText: 'Wechsel Alpha' })
    .first()
    .locator('button[data-testid^="projekt-oeffnen-"]');
  await alphaOeffnen.click();

  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.settings.projectName))
    .toBe('Wechsel Alpha');

  // Zurück zur Zentrale (die Tableiste rendert nur auf `screen==='home'`) —
  // dort trägt jetzt «Wechsel Alpha» die aktiv-Markierung, nicht mehr Beta.
  await page.click('[aria-label="Zur Zentrale"]');
  await expect(page.locator('[data-testid^="projekt-"]', { hasText: 'Wechsel Alpha' }).first()).toContainText(
    'aktiv',
  );
  await expect(
    page.locator('[data-testid^="projekt-"]', { hasText: 'Wechsel Beta' }).first(),
  ).not.toContainText('aktiv');
});

test('Anlegen über den «+»-Schluss-Tab öffnet sofort ein frisches Projekt mit dem eingegebenen Namen', async ({
  page,
}) => {
  await zentraleLaden(page);
  await page.fill('[data-testid="projekt-neu-name"]', 'Frisch aus dem Tab');
  await page.click('[data-testid="projekt-neu"]');
  await expect(page.locator('[data-station="design"]')).toBeAttached();
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.settings.projectName))
    .toBe('Frisch aus dem Tab');
});

test('Touch-Höhe: Tab und «+»-Knopf sind mindestens 44px hoch', async ({ page }) => {
  await zentraleLaden(page);
  await projektAnlegenUndSichern(page, 'Touch Mass');

  const tab = page.locator('[data-testid^="projekt-"]', { hasText: 'Touch Mass' }).first();
  const tabBox = await tab.boundingBox();
  expect(tabBox).not.toBeNull();
  expect(tabBox!.height).toBeGreaterThanOrEqual(44);

  const neuKnopf = page.locator('[data-testid="projekt-neu"]');
  const neuBox = await neuKnopf.boundingBox();
  expect(neuBox).not.toBeNull();
  expect(neuBox!.height).toBeGreaterThanOrEqual(44);
});

/**
 * iPad-Beweis (Muster `e2e/start-sequenz.spec.ts` «iPad 1024×768 (Touch)»,
 * Owner-Kompass 2026-07-20: «iPad erste Klasse»): die Tableiste bleibt im
 * iPad-Viewport per echtem Touch-Event bedienbar — Tab-Tap wechselt das
 * Projekt, der «+»-Tab legt eines an.
 */
test.describe('iPad 1024×768 (Touch)', () => {
  test.use({ viewport: { width: 1024, height: 768 }, hasTouch: true });

  test('Tableiste per Tap bedienbar: Tab wechselt das Projekt, «+»-Tab legt eines an', async ({ page }) => {
    await zentraleLaden(page);
    await projektAnlegenUndSichern(page, 'iPad Erst');
    await projektAnlegenUndSichern(page, 'iPad Zweit');

    const erstOeffnen = page
      .locator('[data-testid^="projekt-"]', { hasText: 'iPad Erst' })
      .first()
      .locator('button[data-testid^="projekt-oeffnen-"]');
    await erstOeffnen.tap();
    await expect
      .poll(() => page.evaluate(() => window.__kosmo.state().doc.settings.projectName))
      .toBe('iPad Erst');

    await page.click('[aria-label="Zur Zentrale"]');
    await page.fill('[data-testid="projekt-neu-name"]', 'iPad Frisch');
    await page.locator('[data-testid="projekt-neu"]').tap();
    await expect
      .poll(() => page.evaluate(() => window.__kosmo.state().doc.settings.projectName))
      .toBe('iPad Frisch');
  });
});
