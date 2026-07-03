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

  // V2-A3: Achsen ins Modell → Grid-Entities + Achsköpfe im Plan
  await page.locator('[data-testid="raster-achsen"]').first().click();
  const raster = await page.evaluate(() => {
    const achsen = window.__kosmo.state().doc.byKind('grid') as unknown as {
      label: string;
      typ?: string;
      a: { x: number; y: number };
    }[];
    return {
      gesamt: achsen.length,
      haupt: achsen.filter((a) => a.typ === 'haupt').length,
      achsmass: achsen.find((a) => a.label === '2')!.a.x,
      quermass: achsen.find((a) => a.label === 'B')!.a.y,
    };
  });
  expect(raster.haupt).toBe(9); // 5 Hauptachsen + 4 Querachsen
  await expect(page.locator('[data-testid="grid-achse"]').first()).toBeVisible();
  await page.click('[data-testid="raster-toggle"]'); // Panel zu — es liegt über dem Plan

  // Fang: Klicks NEBEN der Kreuzung rasten exakt auf die Achskreuzung ein.
  // Bildschirm-Koordinaten der HAUPT-Achsen aus dem gerenderten DOM (inkl. Transformation);
  // Wohnraster-Achsen (feines Strichmuster) werden ausgefiltert.
  const koord = await page.evaluate((achsmass) => {
    const linien = [...document.querySelectorAll('[data-testid="grid-achse"] line')]
      .filter((el) => el.getAttribute('stroke-dasharray') === '300 90 60 90')
      .map((el) => el.getBoundingClientRect());
    const senkrecht = linien.filter((r) => r.width < r.height);
    const waagrecht = linien.filter((r) => r.width >= r.height);
    const xs = senkrecht.map((r) => (r.left + r.right) / 2).sort((a, b) => a - b);
    // Bildschirm-y wächst nach unten; Quer-Achse A (Welt-y 0) liegt zuunterst
    const ys = waagrecht.map((r) => (r.top + r.bottom) / 2).sort((a, b) => b - a);
    const pxProMm = (xs[1]! - xs[0]!) / achsmass;
    return { x1: xs[0]!, yA: ys[0]!, yB: ys[1]!, versatz: 300 * pxProMm };
  }, raster.achsmass);
  // 300 mm neben der Kreuzung: Magnet (Radius 400) zieht auf die Achse,
  // der 250er-Rasterfang würde daneben landen — das unterscheidet die Wege.
  // Wand entlang Achse 1 (Kreuzungen 1/A und 1/B sind beide im Sichtfeld).
  await page.mouse.click(koord.x1 + koord.versatz, koord.yA - 2);
  await page.mouse.click(koord.x1 + koord.versatz, koord.yB + 2);
  const wand = await page.evaluate(() => {
    const w = window.__kosmo.state().doc.byKind('wall')[0] as unknown as {
      a: { x: number; y: number };
      b: { x: number; y: number };
    };
    return w ? { a: w.a, b: w.b } : null;
  });
  expect(wand).not.toBeNull();
  expect(wand!.a).toEqual({ x: 0, y: 0 });
  expect(wand!.b).toEqual({ x: 0, y: raster.quermass });
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

test('Bemassungs-Stile: Werkplan zeigt Innenkette + Höhenkoten, Wettbewerb nicht', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW'))!;
    const W = (a: unknown, b: unknown) =>
      k.run('design.wandZeichnen', { storeyId: st.activeStoreyId, a, b, assemblyId: aw.id });
    W({ x: 0, y: 0 }, { x: 9000, y: 0 });
    W({ x: 9000, y: 0 }, { x: 9000, y: 6000 });
    W({ x: 9000, y: 6000 }, { x: 0, y: 6000 });
    W({ x: 0, y: 6000 }, { x: 0, y: 0 });
    const innen = W({ x: 4500, y: 0 }, { x: 4500, y: 6000 }) as { patches: { id: string }[] };
    k.run('design.oeffnungSetzen', {
      wallId: innen.patches[0]!.id,
      openingType: 'tuer', center: 3000, width: 900, height: 2200, sill: 0,
    });
  });
  // Standard: Aussenketten ja, Innenkette nein
  await expect(page.locator('[data-testid="dim-kette-oeffnung"]').first()).toBeVisible();
  await expect(page.locator('[data-testid="dim-kette-innen"]')).toHaveCount(0);
  // Werkplan-Preset → Innenkette erscheint
  await page.selectOption('[data-testid="bemassung-stil"]', 'werkplan');
  await expect(page.locator('[data-testid="dim-kette-innen"]').first()).toBeVisible();
  // Höhenkoten in der Ansicht (4er-Splitscreen, Ansicht Süd)
  await page.click('text=4er');
  await expect(page.locator('[data-testid="hoehenkote"]').first()).toBeVisible();
  // Wettbewerb → nur Gesamtmass, keine Innenkette
  await page.selectOption('[data-testid="bemassung-stil"]', 'wettbewerb');
  await expect(page.locator('[data-testid="dim-kette-innen"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="dim-kette-oeffnung"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="dim-kette-gesamt"]').first()).toBeVisible();
});

test('SIA-Phase: Vorprojekt reduziert die Darstellung, Werkplan detailliert voll', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW'))!;
    const wand = k.run('design.wandZeichnen', {
      storeyId: st.activeStoreyId, a: { x: 0, y: 0 }, b: { x: 9000, y: 0 }, assemblyId: aw.id,
    }) as { patches: { id: string }[] };
    k.run('design.oeffnungSetzen', {
      wallId: wand.patches[0]!.id, openingType: 'tuer', center: 4500, width: 1000, height: 2200, sill: 0,
    });
  });
  const planview = page.locator('[data-testid="planview"]');
  // Default Werkplan: Dämmschicht als eigene Region (Schraffur-Füllung)
  await expect(planview.locator('path[fill="url(#hatch-daemmung)"]').first()).toBeAttached();
  // Vorprojekt: EIN Poché, keine Dämmschicht, kein Türbogen; Bemassung koppelt auf «Wettbewerb»
  await page.selectOption('[data-testid="phase-stil"]', 'vorprojekt');
  await expect(planview.locator('path[fill="url(#hatch-daemmung)"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="bemassung-stil"]')).toHaveValue('wettbewerb');
  // EIN Undo stellt Phase + Bemassung zusammen zurück
  await page.click('[data-testid="undo"]');
  await expect(planview.locator('path[fill="url(#hatch-daemmung)"]').first()).toBeAttached();
  await expect(page.locator('[data-testid="phase-stil"]')).toHaveValue('werkplan');
});

test('Treppen-Formen: U-Lauf mit Wendepodest per Werkzeug zeichnen', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.click('button:text-is("Treppe")');
  await page.selectOption('[data-testid="treppen-form"]', 'u');
  // Zwei Klicks im Plan (rechte Hälfte, auto-zentriert um 5000/3000)
  await page.mouse.click(680, 480);
  await page.mouse.click(950, 480);
  const stand = await page.evaluate(() => {
    const st = window.__kosmo.state().doc.byKind('stair')[0] as unknown as { form?: string } | undefined;
    return st ? { form: st.form } : null;
  });
  expect(stand).not.toBeNull();
  expect(stand!.form).toBe('u');
  // Plansymbol: Stufenlinien beider Läufe + durchgehende Lauflinie
  const planview = page.locator('[data-testid="planview"]');
  expect(await planview.locator('line.symbol.stufe').count()).toBeGreaterThan(10);
  expect(await planview.locator('line.symbol.lauflinie').count()).toBeGreaterThanOrEqual(4);
});

test('LM-Studio-Provider (V2-B3): SSE-Tool-Call → Vorschlagskarte → Wand steht', async ({ page }) => {
  // LM Studio wird per Route-Mock simuliert — der echte Provider-Code (SSE-
  // Parsing, Fragment-Zusammenbau, Gate) läuft dabei komplett im Browser.
  await page.route('**/v1/chat/completions', async (route) => {
    const body = [
      'data: {"choices":[{"delta":{"content":"Ich zeichne die Wand. "}}]}',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_e2e","function":{"name":"design_wandZeichnen","arguments":"{\\"a\\":{\\"x\\":0,\\"y\\":0},"}}]}}]}',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\\"b\\":{\\"x\\":5000,\\"y\\":0}}"}}]}}]}',
      'data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}',
      'data: [DONE]',
      '',
    ].join('\n');
    await route.fulfill({ status: 200, contentType: 'text/event-stream', body });
  });
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem(
      'kosmo.llm',
      JSON.stringify({ provider: 'lmstudio', lmBaseUrl: 'http://localhost:1234/v1', lmModel: 'test-modell' }),
    );
  });
  await page.reload();
  await page.click('[data-testid="module-design"]');
  // Badge zeigt das LM-Studio-Modell
  await expect(page.getByText('test-modell')).toBeVisible();
  await page.fill('[data-testid="kosmo-input"]', 'Zeichne eine Wand');
  await page.click('[data-testid="kosmo-send"]');
  await page.click('[data-testid="apply-proposal"]', { timeout: 15_000 });
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length))
    .toBe(1);
});

test('Kosmo-Einstellungen (V2-B3): Anthropic-Felder erscheinen, Schlüssel bleibt lokal', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.click('[aria-label="Einstellungen"]');
  // Das Verbindungs-Select eindeutig ansteuern (Toolbar hat weitere Selects)
  const verbindung = page.locator('select', { has: page.locator('option[value="anthropic"]') });
  await verbindung.selectOption('anthropic');
  const schluessel = page.locator('input[type="password"]');
  await expect(schluessel).toBeVisible();
  await schluessel.fill('sk-ant-test');
  // Persistiert in localStorage, Badge zeigt das Claude-Modell
  await expect(page.getByText('claude-sonnet-5')).toBeVisible();
  const gespeichert = await page.evaluate(() => JSON.parse(localStorage.getItem('kosmo.llm')!));
  expect(gespeichert.provider).toBe('anthropic');
  expect(gespeichert.anthropicKey).toBe('sk-ant-test');
});

test('IFC-Bestand (V2-A4): Export → Re-Import → «Übernehmen» macht Wände editierbar', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  // Zwei Wände zeichnen (Kernel-Commands direkt — deterministisch)
  await page.evaluate(() => {
    const k = window.__kosmo as unknown as {
      run: (id: string, p: unknown) => unknown;
      state: () => {
        doc: { byKind: (kind: string) => { id: string }[] };
        activeStoreyId: string;
      };
    };
    const st = k.state();
    const aufbau = st.doc.byKind('assembly')[0]!;
    k.run('design.wandZeichnen', {
      storeyId: st.activeStoreyId,
      a: { x: 0, y: 0 },
      b: { x: 6000, y: 0 },
      assemblyId: aufbau.id,
    });
    k.run('design.wandZeichnen', {
      storeyId: st.activeStoreyId,
      a: { x: 6000, y: 0 },
      b: { x: 6000, y: 4000 },
      assemblyId: aufbau.id,
    });
  });
  const vorher = await page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length);
  expect(vorher).toBe(2);
  const geschosseVorher = await page.evaluate(
    () => window.__kosmo.state().doc.byKind('storey').length,
  );

  // Export als IFC …
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="export-ifc"]'),
  ]);
  const pfad = await download.path();
  const { readFileSync } = await import('node:fs');
  const ifcInhalt = readFileSync(pfad!);

  // … und Re-Import: Erkennung bietet die Übernahme an
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('[data-testid="import-ifc"]'),
  ]);
  await chooser.setFiles({ name: 'bestand.ifc', mimeType: 'application/octet-stream', buffer: ifcInhalt });
  await expect(page.locator('[data-testid="bestand-angebot"]')).toContainText('2 Wände', {
    timeout: 20_000,
  });
  await page.click('[data-testid="bestand-uebernehmen"]');
  // 2 gezeichnete + 2 übernommene; Geschoss EG wurde wiederverwendet
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length))
    .toBe(4);
  expect(await page.evaluate(() => window.__kosmo.state().doc.byKind('storey').length)).toBe(
    geschosseVorher,
  );
  // EIN Undo räumt die ganze Übernahme ab
  await page.click('[data-testid="undo"]');
  expect(await page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length)).toBe(2);
});

test('Materialkarten (V2-C2): Textur-Umschalter wirkt und bleibt gemerkt', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    k.run('design.wandZeichnen', {
      storeyId: st.activeStoreyId,
      a: { x: 0, y: 0 },
      b: { x: 6000, y: 0 },
      assemblyId: st.doc.byKind('assembly')[0]!.id,
    });
  });
  // Standard: Texturen an
  expect(await page.evaluate(() => localStorage.getItem('kosmo.texturen'))).not.toBe('0');
  await page.click('[data-testid="textur-toggle"]');
  expect(await page.evaluate(() => localStorage.getItem('kosmo.texturen'))).toBe('0');
  await page.click('[data-testid="textur-toggle"]');
  expect(await page.evaluate(() => localStorage.getItem('kosmo.texturen'))).toBe('1');
});

test('Bauwissen-Basis (Wissens-Andockung): Lehrhefte laden → Suche zitierfähig', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-prepare"]');
  await expect(page.locator('[data-testid="basis-sektion"]')).toBeVisible();
  await expect(page.locator('[data-testid="basis-lehrhefte"]')).toContainText('24 Quellen');
  await page.click('[data-testid="basis-laden-lehrhefte"]');
  await expect(page.locator('[data-testid="basis-lehrhefte"]')).toContainText('geladen', {
    timeout: 30_000,
  });
  // Die Lehrheft-Inhalte sind jetzt Teil der Wissensbasis: Fachbegriff-Suche trifft
  await page.fill('[data-testid="knowledge-search"]', 'Schrittmass Steigung');
  await expect(page.locator('[data-testid="knowledge-hit"]').first()).toContainText('Treppen', {
    timeout: 15_000,
  });
});

test('Regel-Sätze (V2-F3): Preset per Kernel → verletzte Zone im Plan getönt', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="view-2d"]');
  await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    k.run('design.regelnSetzen', { preset: 'ch-wohnbau' });
    k.run('design.zoneErstellen', {
      storeyId: st.activeStoreyId, name: 'Kind', sia: 'HNF', raumTyp: 'zimmer',
      outline: [{ x: 0, y: 0 }, { x: 5000, y: 0 }, { x: 5000, y: 2000 }, { x: 0, y: 2000 }],
    });
  });
  await expect(page.locator('[data-testid="zone-verletzt"]')).toHaveCount(1, { timeout: 10_000 });
});

test('Varianten-Matrix (V2-V3/F4): Parallel-Axis-Vergleich erscheint im Studien-Panel', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    // letzte Zone = Parzelle für den Studien-Generator
    k.run('design.zoneErstellen', {
      storeyId: st.activeStoreyId, name: 'Parzelle', sia: 'KF',
      outline: [{ x: 0, y: 0 }, { x: 40000, y: 0 }, { x: 40000, y: 30000 }, { x: 0, y: 30000 }],
    });
  });
  await page.click('[data-testid="studie-toggle"]');
  await expect(page.locator('[data-testid="varianten-matrix"]')).toBeVisible({ timeout: 10_000 });
  const linien = await page.locator('[data-testid="matrix-linie"]').count();
  expect(linien).toBeGreaterThanOrEqual(2);
});

test('Wohnungs-Segmentierer (V2-F5): Soll-Mix → Vorschlag → Übernehmen → Zonen, 1 Undo', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    k.run('design.raumprogrammSetzen', {
      posten: [
        { typ: 'marktgerecht', hnfSoll: 190 },
        { typ: 'preisguenstig', hnfSoll: 150 },
      ],
    });
    k.run('design.zoneErstellen', {
      storeyId: st.activeStoreyId, name: 'Geschoss', sia: 'KF',
      outline: [{ x: 0, y: 0 }, { x: 30000, y: 0 }, { x: 30000, y: 14000 }, { x: 0, y: 14000 }],
    });
    k.run('design.zoneErstellen', {
      storeyId: st.activeStoreyId, name: 'Korridor', sia: 'VF', raumTyp: 'korridor',
      outline: [{ x: 0, y: 6000 }, { x: 30000, y: 6000 }, { x: 30000, y: 8000 }, { x: 0, y: 8000 }],
    });
  });
  const vorher = await page.evaluate(() => window.__kosmo.state().doc.byKind('zone').length);
  await page.click('[data-testid="liste-toggle"]');
  await page.click('[data-testid="segmentierer-lauf"]');
  await expect(page.locator('[data-testid="segmentierer-ergebnis"]')).toContainText('marktgerecht');
  await page.click('[data-testid="segmentierer-uebernehmen"]');
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('zone').length))
    .toBeGreaterThanOrEqual(vorher + 4);
  await page.click('[data-testid="undo"]');
  expect(await page.evaluate(() => window.__kosmo.state().doc.byKind('zone').length)).toBe(vorher);
});

test('Segmentierer-Dialog (V2-F6): Slider rechnet den Vorschlag sofort neu', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    k.run('design.raumprogrammSetzen', { posten: [{ typ: 'preisguenstig', hnfSoll: 300 }] });
    k.run('design.zoneErstellen', {
      storeyId: st.activeStoreyId, name: 'Geschoss', sia: 'KF',
      outline: [{ x: 0, y: 0 }, { x: 30000, y: 0 }, { x: 30000, y: 14000 }, { x: 0, y: 14000 }],
    });
    k.run('design.zoneErstellen', {
      storeyId: st.activeStoreyId, name: 'Korridor', sia: 'VF', raumTyp: 'korridor',
      outline: [{ x: 0, y: 6000 }, { x: 30000, y: 6000 }, { x: 30000, y: 8000 }, { x: 0, y: 8000 }],
    });
  });
  await page.click('[data-testid="liste-toggle"]');
  await page.click('[data-testid="segmentierer-lauf"]');
  const vorher = await page.locator('[data-testid="segmentierer-ergebnis"]').innerText();
  // Wohnungsgrösse ×0.8 → mehr Wohnungen passen
  await page.locator('[data-testid="segmentierer-groesse"]').fill('0.8');
  await expect.poll(async () => page.locator('[data-testid="segmentierer-ergebnis"]').innerText()).not.toBe(vorher);
});

test('Custom-Kennzahlen (V2-F9): Formel erscheint im Kennzahlen-Panel', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    k.run('design.zoneErstellen', {
      storeyId: st.activeStoreyId, name: 'Wohnen', sia: 'HNF',
      outline: [{ x: 0, y: 0 }, { x: 10000, y: 0 }, { x: 10000, y: 10000 }, { x: 0, y: 10000 }],
    });
    k.run('design.kennzahlFormelnSetzen', {
      formeln: [{ name: 'Erstellungskosten', wert: 3200, basis: 'agf', einheit: 'CHF' }],
    });
  });
  const panel = page.locator('[data-testid="custom-kennzahlen"]');
  await expect(panel).toContainText('Erstellungskosten');
  await expect(panel).toContainText('CHF');
});

test('Raumtyp-Copilot (V2-F10): Vorschlag-Chip → Übernehmen setzt den Raumtyp', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  const zoneId = await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    const r = k.run('design.zoneErstellen', {
      storeyId: st.activeStoreyId, name: 'Flur', sia: 'VF',
      outline: [{ x: 0, y: 0 }, { x: 12000, y: 0 }, { x: 12000, y: 1800 }, { x: 0, y: 1800 }],
    });
    const id = r.patches[0].id;
    k.state().select([id]);
    return id;
  });
  await page.click('[data-testid="draw-toggle"]');
  const chip = page.locator('[data-testid="raumtyp-vorschlag"]');
  await expect(chip).toContainText('korridor');
  await page.click('[data-testid="raumtyp-uebernehmen"]');
  await expect(chip).toHaveCount(0);
  expect(await page.evaluate((id) => window.__kosmo.state().doc.get(id).raumTyp, zoneId)).toBe('korridor');
});

test('Raumprogramm-CSV (V2-V5): Import setzt Posten, %-Spalte erscheint', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="liste-toggle"]');
  await page.setInputFiles('[data-testid="csv-import-input"]', {
    name: 'raumprogramm.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from("Wohnungstyp;HNF Soll\nMarktgerecht;1'250\nPreisgünstig;830\nTotal;2080\n"),
  });
  await expect(page.locator('[data-testid="csv-import-meldung"]')).toContainText('2 Typen übernommen');
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.settings.raumprogramm.length))
    .toBe(2);
  await expect(page.locator('[data-testid="erfuellung-marktgerecht"]')).toContainText('0');
});

test('Render-Prompt (V2-V8): Material-Baustein erscheint im finalen Prompt, Tippen überschreibt', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    const au = k.run('design.aufbauErstellen', {
      name: 'AW Sichtbeton', target: 'wall',
      layers: [{ material: 'sichtbeton', thickness: 180, function: 'tragend' }],
    });
    k.run('design.wandZeichnen', {
      storeyId: st.activeStoreyId, assemblyId: au.patches[0].id,
      a: { x: 0, y: 0 }, b: { x: 5000, y: 0 },
    });
    k.open('vis');
  });
  const feld = page.locator('[data-testid="finaler-prompt"]');
  await expect(feld).toHaveValue(/Sichtbeton-Fassade/);
  await feld.fill('mein eigener Prompt');
  await expect(feld).toHaveValue('mein eigener Prompt');
});

test('Möblierung (V2-F8): Möbel im Plan sichtbar, SIA-500-Kollision im Check', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="view-2d"]');
  await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    const au = k.run('design.aufbauErstellen', {
      name: 'AW', target: 'wall', layers: [{ material: 'beton', thickness: 200, function: 'tragend' }],
    });
    k.run('design.wandZeichnen', {
      storeyId: st.activeStoreyId, assemblyId: au.patches[0].id,
      a: { x: -3000, y: 2500 }, b: { x: 3000, y: 2500 },
    });
    k.run('design.moebelSetzen', { storeyId: st.activeStoreyId, typ: 'bett-doppel', at: { x: 0, y: 0 }, rotationGrad: 0 });
  });
  await expect(page.locator('[data-testid="moebel"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="checks"]')).toContainText('Doppelbett');
});

test('Fassaden-Module (V2-V7): Bilanz erscheint und reagiert auf Modulbreite', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    k.run('design.zoneErstellen', {
      storeyId: st.activeStoreyId, name: 'Parzelle', sia: 'KF',
      outline: [{ x: 0, y: 0 }, { x: 40000, y: 0 }, { x: 40000, y: 30000 }, { x: 0, y: 30000 }],
    });
    k.run('design.volumenErstellen', {
      storeyId: st.activeStoreyId, height: 9000,
      outline: [{ x: 0, y: 0 }, { x: 10000, y: 0 }, { x: 10000, y: 6500 }, { x: 0, y: 6500 }],
    });
  });
  await page.click('[data-testid="studie-toggle"]');
  const bilanz = page.locator('[data-testid="module-bilanz"]');
  await expect(bilanz).toContainText('Standardmodule');
  const vorher = await bilanz.innerText();
  await page.fill('[data-testid="modul-b"]', '2000');
  await expect.poll(() => bilanz.innerText()).not.toBe(vorher);
});

test('Direktzeichnen (V2-V6): Live-m²-Label beim Volumen-Ziehen', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="tool-volumen"]');
  const canvas = page.locator('canvas').first();
  const box = (await canvas.boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.click(cx - 100, cy - 60);
  await page.mouse.click(cx + 100, cy - 60);
  await page.mouse.move(cx + 100, cy + 60);
  const label = page.locator('[data-testid="live-flaeche"]');
  await expect(label).toBeVisible();
  await expect(label).toContainText('GF ~');
});

test('CH-Standort (V2-V4): Suche (gemockt) → Standort gesetzt → Parzelle als Zone', async ({ page }) => {
  await page.route('**/rest/services/api/SearchServer**', (route) =>
    route.fulfill({
      json: { results: [{ attrs: { label: '<b>Baarerstrasse 1 Zug</b>', lat: 47.17, lon: 8.52, y: 2681500, x: 1224500 } }] },
    }),
  );
  await page.route('**/rest/services/api/MapServer/identify**', (route) =>
    route.fulfill({
      json: {
        results: [{ geometry: { rings: [
          [[2681500, 1224500], [2681530, 1224500], [2681530, 1224520], [2681500, 1224520], [2681500, 1224500]],
        ] } }],
      },
    }),
  );
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="sonne-toggle"]');
  await page.fill('[data-testid="standort-suche"]', 'Baarerstrasse 1');
  await page.click('[data-testid="standort-suchen"]');
  await page.click('[data-testid="standort-treffer"] button');
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.settings.standort?.label))
    .toContain('Baarerstrasse');
  await page.click('[data-testid="parzelle-import"]');
  await expect(page.locator('[data-testid="standort-meldung"]')).toContainText('Parzelle importiert (600 m²');
  const zone = await page.evaluate(() => window.__kosmo.state().doc.byKind('zone')[0]);
  expect(zone.name).toContain('Parzelle');
});

test('Modulraster im 3D (V7-Ausbau): Toggle aktiviert das Fassaden-Overlay', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    k.run('design.zoneErstellen', {
      storeyId: st.activeStoreyId, name: 'Parzelle', sia: 'KF',
      outline: [{ x: 0, y: 0 }, { x: 40000, y: 0 }, { x: 40000, y: 30000 }, { x: 0, y: 30000 }],
    });
    k.run('design.volumenErstellen', {
      storeyId: st.activeStoreyId, height: 12000,
      outline: [{ x: 0, y: 0 }, { x: 20000, y: 0 }, { x: 20000, y: 12000 }, { x: 0, y: 12000 }],
    });
  });
  await page.click('[data-testid="studie-toggle"]');
  await page.click('[data-testid="module-3d"]');
  // Overlay rendert ohne Fehler; Ausschalten räumt auf
  await page.evaluate(() => window.__kosmoViewport.renderOnce());
  await page.click('[data-testid="module-3d"]');
  await page.evaluate(() => window.__kosmoViewport.renderOnce());
  await expect(page.locator('[data-testid="module-bilanz"]')).toContainText('Wiederholung');
});
