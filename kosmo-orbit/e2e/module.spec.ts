import { expect, test } from '@playwright/test';

/** KosmoPublish, KosmoPrepare, KosmoData-Katalog, Palette — Modulflüsse. */

test('KosmoPublish: Blatt → Grundriss platzieren → Plansatz-PDF', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG
  await page.evaluate(() => {
    const k = window.__kosmo as {
      run: (id: string, p: unknown) => unknown;
      state: () => { activeStoreyId: string | null; doc: { byKind: (k: string) => { id: string; name?: string }[] } };
      open: (s: string) => void;
    };
    const st = k.state();
    const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW'))!;
    const W = (a: unknown, b: unknown) =>
      k.run('design.wandZeichnen', { storeyId: st.activeStoreyId, a, b, assemblyId: aw.id });
    W({ x: 0, y: 0 }, { x: 8000, y: 0 });
    W({ x: 8000, y: 0 }, { x: 8000, y: 5000 });
    k.open('publish');
  });
  await page.click('[data-testid="add-sheet"]');
  await page.click('[data-testid="place-plan"]');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="export-set"]'),
  ]);
  expect(download.suggestedFilename()).toMatch(/Plansatz\.pdf$/);
  await page.screenshot({ path: 'e2e-results/publish-blatt.png' });
});

test('KosmoPrepare: Markdown aufnehmen → Suche trifft mit Quellenangabe', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="module-prepare"]');
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('[data-testid="pick-files"]'),
  ]);
  await chooser.setFiles({
    name: 'programm.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(
      '# Programm\n\nDas Stützenraster beträgt 10.50 m im Skelettbau.\n\nFluchtwege mindestens 1.20 m breit.',
    ),
  });
  await page.waitForSelector('[data-testid^="doc-"]');
  await page.fill('[data-testid="knowledge-search"]', 'Stützenraster');
  await expect(page.locator('[data-testid="knowledge-hit"]').first()).toContainText('programm.md');
});

test('Bauteilkatalog: Übernehmen macht den Aufbau im Projekt verfügbar', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="module-data"]');
  await page.click('[data-testid="tab-bauteile"]');
  await page.click('[data-testid="uebernehmen-aw-holzrahmen-36"]');
  const namen = await page.evaluate(() =>
    (window.__kosmo as { state: () => { doc: { byKind: (k: string) => { name?: string }[] } } })
      .state()
      .doc.byKind('assembly')
      .map((a) => a.name),
  );
  expect(namen).toContain('AW Holzrahmenbau 36');
});

test('Befehlspalette: ⌘K → Modulwechsel', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="module-data"]');
  await page.keyboard.press('Control+k');
  await page.fill('[data-testid="palette-input"]', 'kosmodata');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-testid="tab-bauteile"]')).toBeVisible();
});

test('KosmoDraw: Modellbaum sichtbar, Mengenauszug mit IFC-Identität', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="load-tkb"]');
  await page.click('[data-testid="draw-toggle"]');
  await expect(page.locator('[data-testid="draw-panel"]')).toBeVisible();
  // Modellbaum zeigt Geschosse mit Elementen
  await expect(page.getByText('IfcSlab').first()).toBeAttached();
  // Mengen-Tab: Tabelle mit Decken-Position
  await page.click('[data-testid="draw-tab-mengen"]');
  await expect(page.locator('[data-testid="mengen-tabelle"]')).toBeVisible();
  await expect(page.getByText('Decken/Bodenplatten')).toBeVisible();
});

test('Berechnungsliste: Raumprogramm → Zone zeichnen → ausgezogen + Δ Max leben', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="liste-toggle"]');
  // Raumprogramm: Marktgerecht 100 m², Max 200
  await page.fill('[data-testid="posten-hnf-0"]', '100');
  await page.fill('[data-testid="liste-max"]', '200');
  await page.click('[data-testid="liste-uebernehmen"]');
  await expect(page.locator('[data-testid="liste-tabelle"]')).toBeVisible();
  // Zone «marktgerecht» über den Command-Weg zeichnen (10×12 m = 120 m²)
  await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    k.run('design.zoneErstellen', {
      storeyId: st.activeStoreyId,
      name: 'W1',
      sia: 'HNF',
      program: 'marktgerecht',
      outline: [
        { x: 0, y: 0 }, { x: 10000, y: 0 }, { x: 10000, y: 12000 }, { x: 0, y: 12000 },
      ],
    });
  });
  // ausgezogen 120, Ziel 122 → Differenz −2; Δ Max = 120 − 200 = −80
  await expect(page.locator('[data-testid="liste-tabelle"]')).toContainText('120');
  await expect(page.locator('[data-testid="liste-delta-max"]')).toContainText('-80');
});
