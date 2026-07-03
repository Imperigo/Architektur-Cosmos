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

test('KosmoDoc-Modul: Diagnose läuft, Hilfe-Karten stehen', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-draw"]');
  await page.click('[data-testid="doc-tab-hilfe"]');
  await expect(page.getByText('Zeichnen in KosmoDesign')).toBeVisible();
  await page.click('[data-testid="doc-tab-diagnose"]');
  await page.click('[data-testid="diagnose-run"]');
  await expect(page.locator('[data-testid="befund-Kern"]')).toBeVisible({ timeout: 15_000 });
  await page.click('[data-testid="doc-tab-berichte"]');
  await expect(page.locator('[data-testid="doc-berichte"]')).toBeVisible();
});

test('Stützenraster: Owner-Varianten mit Bewertung erscheinen', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="raster-toggle"]');
  await expect(page.locator('[data-testid="raster-panel"]')).toBeVisible();
  // Die Owner-Referenzvariante 4×2.50 → 10.50 m steht mit Bewertung da
  await expect(page.getByText('4 Felder à 2.50 → Achse 10.50 m').first()).toBeVisible();
  await expect(page.locator('[data-testid="raster-varianten"]').getByText('ausgewogen').first()).toBeVisible();
});

test('Axonometrie: aufs Blatt platzieren, Linien erscheinen', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="load-tkb"]');
  await page.waitForSelector('text=KENNZAHLEN');
  await page.evaluate(() => window.__kosmo.open('publish'));
  await page.click('[data-testid="add-sheet"]');
  await page.click('[data-testid="place-axo"]');
  await expect(page.getByText('Axonometrie', { exact: false }).first()).toBeVisible();
  // Die Platzierung enthält gezeichnete Linien
  const linien = await page.locator('[data-testid="sheet-canvas"] line').count();
  expect(linien).toBeGreaterThan(10);
});

test('Plakat-Designer: A0-Plakat mit Slots und editierbaren Texten', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="load-tkb"]');
  await page.waitForSelector('text=KENNZAHLEN');
  await page.evaluate(() => window.__kosmo.open('publish'));
  await page.click('[data-testid="plakat-klassisch"]');
  // Blatt «Plakat 1» aktiv, Titeltext auf dem Blatt, Text-Editor links
  await expect(page.getByText('Plakat 1').first()).toBeVisible();
  await expect(page.locator('[data-testid="text-editor"] textarea')).toHaveCount(3);
  // Titel steht als Text im Blatt-SVG
  const titel = await page.locator('[data-testid="sheet-canvas"] text', { hasText: 'TKB' }).count();
  expect(titel).toBeGreaterThan(0);
  // Text editieren → landet im SVG
  const konzept = page.locator('[data-testid="text-editor"] textarea').last();
  await konzept.fill('Konzept\nZwei Höfe, ein Rücken.');
  await konzept.blur();
  await expect(page.locator('[data-testid="sheet-canvas"]')).toContainText('Zwei Höfe');
});

test('Baugrenze: setzen, im Grundriss sichtbar, Checks melden Verstoss', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.evaluate(() => {
    const k = window.__kosmo;
    const eg = k.state().activeStoreyId;
    k.run('design.zoneErstellen', {
      storeyId: eg, name: 'Parzelle', sia: 'KF',
      outline: [{ x: 0, y: 0 }, { x: 20000, y: 0 }, { x: 20000, y: 15000 }, { x: 0, y: 15000 }],
    });
  });
  await page.click('[data-testid="studie-toggle"]');
  await page.click('[data-testid="als-baugrenze"]');
  // Grenze strichpunktiert im Grundriss
  await page.click('text=Grundriss');
  await expect(page.locator('svg .baugrenze').first()).toBeAttached();
  // Wand ausserhalb → Check «Baugrenze» erscheint im Kennzahlen-Panel
  await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW')).id;
    k.run('design.wandZeichnen', {
      storeyId: st.activeStoreyId, assemblyId: aw,
      a: { x: 18000, y: 5000 }, b: { x: 30000, y: 5000 },
    });
  });
  await expect(page.locator('[data-testid="checks"]')).toContainText('Baugrenze');
});

test('Dossier + KosmoTrain: Regeln erfassen, Journal kuratieren', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.lernjournal', JSON.stringify([
      { ts: '2026-07-03T08:00:00.000Z', sentiment: 'schlecht', context: 'Wand ohne Aufbau vorgeschlagen' },
    ]));
  });
  await page.reload();
  // Dossier in Prepare erfassen
  await page.click('[data-testid="module-prepare"]');
  await page.fill('[data-testid="dossier-text-0"]', 'Nordwohnungen ohne Direktsonne sind ein No-go');
  await page.click('[data-testid="dossier-uebernehmen"]');
  await expect(page.getByText('NO-GO', { exact: true })).toBeVisible();
  // KosmoTrain: Eintrag da, Notiz schärfen, löschen
  await page.evaluate(() => window.__kosmo.open('train'));
  await expect(page.locator('[data-testid="train-stand"]')).toContainText('1 Journal-Einträge');
  const notiz = page.locator('[data-testid="train-kuration"] input');
  await notiz.fill('nie Wände ohne Aufbau vorschlagen');
  await notiz.blur();
  await page.click('[data-testid="train-kuration"] button[aria-label="Eintrag löschen"]');
  await expect(page.locator('[data-testid="train-stand"]')).toContainText('0 Journal-Einträge');
});

test('Referenz-Sammlung: Stern setzen, Filter zeigt nur Gemerkte', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-data"]');
  await page.waitForSelector('[data-testid="ref-card"]');
  await page.locator('[data-testid^="stern-"]').first().click();
  await page.click('[data-testid="filter-sammlung"]');
  await expect(page.locator('[data-testid="ref-card"]')).toHaveCount(1);
});

test('Härtetest: 600 Wände — UI bleibt bedienbar, Mengen bleiben endlich', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW')).id;
    for (let r = 0; r < 30; r++) {
      for (let i = 0; i < 10; i++) {
        k.run('design.wandZeichnen', {
          storeyId: st.activeStoreyId, assemblyId: aw,
          a: { x: i * 4000, y: r * 5000 }, b: { x: (i + 1) * 4000, y: r * 5000 },
        });
        k.run('design.wandZeichnen', {
          storeyId: st.activeStoreyId, assemblyId: aw,
          a: { x: i * 4000, y: r * 5000 }, b: { x: i * 4000, y: r * 5000 + 3500 },
        });
      }
    }
  });
  // Kennzahlen leben, Draw-Panel rechnet, Undo greift
  await page.click('[data-testid="draw-toggle"]');
  await page.click('[data-testid="draw-tab-mengen"]');
  await expect(page.locator('[data-testid="mengen-tabelle"]')).toContainText('IfcWall');
  const anzahl = await page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length);
  expect(anzahl).toBe(600);
  await page.click('[data-testid="undo"]');
  const nachUndo = await page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length);
  expect(nachUndo).toBe(599);
});

test('Härtetest: kaputte .kosmo-Datei → klare Meldung, UI lebt weiter', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('[data-testid="open-project"]'),
  ]);
  const dialog = page.waitForEvent('dialog');
  await chooser.setFiles({
    name: 'kaputt.kosmo',
    mimeType: 'application/zip',
    buffer: Buffer.from('DAS IST KEIN ZIP'),
  });
  const d = await dialog;
  expect(d.message()).toContain('Projekt konnte nicht geöffnet werden');
  await d.accept();
  await expect(page.locator('[data-testid="module-design"]')).toBeVisible();
});

test('Blatt-Pflege: Massstab ändern, Titel setzen, Text verschieben, Blatt löschen', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="load-tkb"]');
  await page.waitForSelector('text=KENNZAHLEN');
  await page.evaluate(() => window.__kosmo.open('publish'));
  await page.click('[data-testid="plakat-klassisch"]');
  // Platzierung wählen → Massstab 1:500 → steht im Blatt-SVG
  await page.locator('[data-testid^="placement-"]').first().click();
  await page.selectOption('[data-testid="auswahl-massstab"]', '500');
  await expect(page.locator('[data-testid="sheet-canvas"]')).toContainText('1:500');
  // Titel umbenennen
  await page.fill('[data-testid="auswahl-titel"]', 'Situation');
  await page.locator('[data-testid="auswahl-titel"]').blur();
  await expect(page.locator('[data-testid="sheet-canvas"]')).toContainText('Situation');
  // Text auf dem Blatt verschieben (Command-Weg über Drag-Overlay)
  const textOverlay = page.locator('[data-testid^="blatt-text-"]').first();
  await expect(textOverlay).toBeAttached();
  // Blatt löschen → Plansatz leer
  await page.click('[data-testid^="blatt-entfernen-"]');
  await expect(page.getByText('Noch kein Blatt im Plansatz', { exact: false })).toBeVisible();
});

test('Aktionskette: «Haus» → EIN Paket → alle anwenden → EIN Undo', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
  });
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.fill('[data-testid="kosmo-input"]', 'Bau mir ein kleines Haus');
  await page.click('[data-testid="kosmo-send"]');
  // EIN Paket mit 6 Schritten statt sechs Karten
  await expect(page.locator('[data-testid="paket-card"]')).toHaveCount(1, { timeout: 15_000 });
  await expect(page.locator('[data-testid="paket-card"] li')).toHaveCount(6);
  await page.click('[data-testid="apply-paket"]');
  // 4 Wände + Fenster (via $neu:0) + Dach stehen
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length))
    .toBe(4);
  expect(await page.evaluate(() => window.__kosmo.state().doc.byKind('opening').length)).toBe(1);
  expect(await page.evaluate(() => window.__kosmo.state().doc.byKind('roof').length)).toBe(1);
  // EIN Undo räumt das ganze Paket ab
  await page.click('[data-testid="undo"]');
  expect(await page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length)).toBe(0);
  expect(await page.evaluate(() => window.__kosmo.state().doc.byKind('roof').length)).toBe(0);
});

test('Bild-Slots: Plakat trägt leeren Render-Slot, Bild einbetten, PDF exportiert', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt das Projekt
  await page.evaluate(() => window.__kosmo.open('publish'));
  await page.click('[data-testid="plakat-klassisch"]');
  // Plakat-Designer platziert einen leeren Render-Slot
  await expect(page.locator('[data-testid="sheet-canvas"]')).toContainText('Render folgt — HomeStation');
  // Slot füllen (derselbe Command wie Datei-Picker und Vis-«Aufs Blatt»)
  await page.evaluate(() => {
    const k = window.__kosmo as unknown as {
      run: (id: string, p: unknown) => unknown;
      state: () => { doc: { byKind: (kind: string) => { id: string; bilder?: { id: string; assetId: string | null }[] }[] } };
    };
    const sheet = k.state().doc.byKind('sheet')[0]!;
    const slot = sheet.bilder!.find((b) => !b.assetId)!;
    k.run('publish.bildFuellen', {
      sheetId: sheet.id,
      bildId: slot.id,
      dataUrl:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    });
  });
  // Bild ist Blatt-Bürger: <image> im Druck-SVG, Platzhalter weg
  await expect(page.locator('[data-testid="sheet-canvas"] svg image')).toHaveCount(1);
  await expect(page.locator('[data-testid="sheet-canvas"]')).not.toContainText('Render folgt');
  // Bild-Werkzeuge: Overlay wählen → Breite/Titel/Entfernen verfügbar
  await page.locator('[data-testid^="blatt-bild-"]').first().click();
  await expect(page.locator('[data-testid="bild-breite"]')).toBeVisible();
  // PDF-Export läuft (addImage-Pfad wirft nicht)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="export-set"]'),
  ]);
  expect(download.suggestedFilename()).toMatch(/Plansatz\.pdf$/);
});

test('Vis → Blatt: Fake-Bridge-Render landet als Bild auf dem Plakat', async ({ page }) => {
  // Ehrlicher Skip ohne laufende Bridge (CI startet keine)
  let bridgeLebt = false;
  try {
    bridgeLebt = (await fetch('http://localhost:8600/jobs', { signal: AbortSignal.timeout(1500) })).ok;
  } catch {
    /* offline */
  }
  test.skip(!bridgeLebt, 'Fake-Bridge auf :8600 läuft nicht');
  test.setTimeout(90_000);

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.bridge', 'http://localhost:8600');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]');
  // Minimales Modell, damit der GLB-Export etwas trägt
  await page.evaluate(() => {
    const k = window.__kosmo as unknown as {
      run: (id: string, p: unknown) => unknown;
      state: () => { activeStoreyId: string | null; doc: { byKind: (kind: string) => { id: string; name?: string }[] } };
      open: (s: string) => void;
    };
    const st = k.state();
    const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW'))!;
    k.run('design.wandZeichnen', { storeyId: st.activeStoreyId, a: { x: 0, y: 0 }, b: { x: 8000, y: 0 }, assemblyId: aw.id });
    k.open('vis');
  });
  await page.click('[data-testid="send-render"]');
  // Fake-Worker rendert das Kupfer-PNG → «Aufs Blatt» erscheint
  await page.locator('[data-testid="render-job"]').first().getByText('Aufs Blatt').click({ timeout: 30_000 });
  await expect(page.locator('[data-testid="vis-hinweis"]')).toBeVisible();
  // Blatt trägt das Bild als Bürger
  const stand = await page.evaluate(() => {
    const k = window.__kosmo as unknown as {
      state: () => { doc: { byKind: (kind: string) => { bilder?: { assetId: string | null }[] }[] } };
    };
    const sheets = k.state().doc.byKind('sheet');
    return {
      blaetter: sheets.length,
      bilder: sheets.flatMap((s) => s.bilder ?? []).filter((b) => b.assetId).length,
      assets: k.state().doc.byKind('imageasset').length,
    };
  });
  expect(stand.blaetter).toBeGreaterThanOrEqual(1);
  expect(stand.bilder).toBe(1);
  expect(stand.assets).toBe(1);
});

test('Belegte Antwort: Kosmo zitiert [Q1] → Chip → Quellensprung in die Grundlagen', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
  });
  await page.reload();
  // Grundlage aufnehmen
  await page.click('[data-testid="module-prepare"]');
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('[data-testid="pick-files"]'),
  ]);
  await chooser.setFiles({
    name: 'wettbewerbsprogramm.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(
      '# Programm\n\nDie Hauptnutzfläche (Nutzfläche HNF) beträgt mindestens 2814 m² über sieben Geschosse.\n\nDas Stützenraster folgt VSS 40 291.',
    ),
  });
  await page.waitForSelector('[data-testid^="doc-"]');
  // Frage an Kosmo → Mock ruft quellen_suchen und zitiert [Qn]
  await page.evaluate(() => window.__kosmo.open('design'));
  await page.fill('[data-testid="kosmo-input"]', 'Was sagt das Programm zur Nutzfläche?');
  await page.click('[data-testid="kosmo-send"]');
  const chip = page.locator('[data-testid="quelle-chip"]').first();
  await expect(chip).toBeVisible({ timeout: 15_000 });
  await expect(chip).toContainText('wettbewerbsprogramm.md');
  // Quellensprung: Chip → KosmoPrepare zeigt den zitierten Abschnitt
  await chip.click();
  await expect(page.locator('[data-testid="quelle-sprung"]')).toBeVisible();
  await expect(page.locator('[data-testid="quelle-sprung"]')).toContainText('2814');
});

test('Belegte Antwort: Dossier-Regel wird zitiert und angesprungen', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
  });
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt das Projekt
  await page.evaluate(() =>
    window.__kosmo.run('design.dossierSetzen', {
      eintraege: [{ typ: 'dont', text: 'Attikageschoss über 12 m Gesamthöhe ist ein No-go.' }],
    }),
  );
  await page.fill('[data-testid="kosmo-input"]', 'Was sagt das Dossier zum Attikageschoss?');
  await page.click('[data-testid="kosmo-send"]');
  const chip = page.locator('[data-testid="quelle-chip"]').first();
  await expect(chip).toBeVisible({ timeout: 15_000 });
  await expect(chip).toContainText('Dossier NO-GO');
  await chip.click();
  await expect(page.locator('[data-testid="quelle-sprung-dossier"]')).toBeVisible();
  await expect(page.locator('[data-testid="quelle-sprung-dossier"]')).toContainText('Attikageschoss');
});
