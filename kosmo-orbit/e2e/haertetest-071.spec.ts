import { expect, test } from '@playwright/test';

/**
 * Härtetest v0.7.1 «Echt statt Attrappe» (Stream 6A) — EINE durchgehende
 * Vollprojekt-Journey über die drei neuen Kernentscheide aus
 * `docs/V071-KONZEPT.md` hinweg, statt drei isolierter Mini-Specs:
 *
 *   E2 (Nachbarn amtlich): Standort-Import (Adresse → Parzelle → Nachbarn
 *   übernehmen) mit demselben gemockten geo.admin-Fixture wie
 *   `e2e/nachbarn-import.spec.ts` (Parzelle (2681500,1224500)–
 *   (2681530,1224520), 3 `vec25-gebaeude`-Ringe wovon einer das
 *   Parzellen-Zentrum (2681512,1224508) umschliesst = eigenes Gebäude,
 *   NICHT importiert — 2 echte Nachbarn bleiben).
 *
 *   Anschliessend ein kleines Haus (4 Wände + 1 drehkipp-Fenster) auf
 *   demselben Geschoss/derselben Parzelle — dann KosmoPublish: ein
 *   Situationsplan-Placement (`publish.ansichtPlatzieren`,
 *   `view:'situationsplan'`) beweist im echten DOM (`sheet-canvas`s SVG,
 *   dieselbe `sheetToSvg`-Ableitung wie die Vorschau), dass die grauen
 *   Nachbar-Footprints (`#8a8a8a`, `derive/sheet.ts` `situationsplanInnerSvg`)
 *   VOR den eigenen schwarzen Footprints (`#1a1a1a`, aus einem
 *   `design.volumenErstellen`-Volumen — Wände allein liefern KEINEN
 *   `MassBody`-Footprint, s. `derive/schwarzplan.ts` Modul-Kommentar)
 *   im SVG-Dokument stehen — «eigenes Objekt hervorgehoben», nicht
 *   verdeckt.
 *
 *   E3 (DXF-Konsolidierung): derselbe Grundriss als DXF exportiert
 *   (`export-dxf`, echter Playwright-Download wie
 *   `e2e/unternehmerplan.spec.ts`) — der Export trägt jetzt einen
 *   `LAYER_BEMASSUNG`-Layer (`packages/kosmo-kernel/src/dxf/export.ts`);
 *   zweimal exportiert ⇒ byte-identisch (Determinismus); der Rücklauf über
 *   denselben Import-Weg wie `unternehmerplan.spec.ts` (`import-dxf`,
 *   Unternehmerplan-Overlay — der EINZIGE DXF-Import-Weg der App) crasht
 *   nicht und meldet «Alle Layer klassiert» (BEMASSUNG ist semantisch
 *   erkannt, s. `dxf/import.ts` `LAYER_SEMANTIK`, seine Entities fliessen
 *   aber NIE in Regionen/Linien/Texte — `parseDxf`-Modulkommentar: «eine
 *   Masskette ist eine ABLEITUNG, kein Entity»); das Modell-Doc bleibt
 *   dabei komplett unangetastet (Entity-Zahlen vor/nach Import identisch —
 *   der Unternehmerplan-Import ist rein lesend, Regel «Laufzeit ≠ Modell»).
 *
 * Ehrliche Grenze dieses Tests: die Match-Quote/Abweichungs-Zählung des
 * Rücklauf-Vergleichs wird NICHT auf einen exakten Prozentwert gepinnt
 * (die dokumentierte Aussparungs-Vokabular-Lücke in
 * `derive/planabgleich.ts` kann ein Fenster als «neu» markieren, obwohl es
 * derselbe unveränderte Plan ist) — geprüft wird nur, was dieser Auftrag
 * verlangt: kein Crash, Layer erkannt, Modell unverändert.
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[]; summary?: string };
      state: () => {
        activeStoreyId: string | null;
        doc: {
          byKind: (k: string) => Record<string, unknown>[];
          storeysOrdered: () => { id: string }[];
        };
      };
      open: (s: string) => void;
    };
  }
}

test('Härtetest 0.7.1: Nachbarn → Situationsplan → DXF-Bemassung-Roundtrip, EIN Modell durchgehend', async ({
  page,
}) => {
  // ── Geo.admin-Mocks — identisches Fixture wie e2e/nachbarn-import.spec.ts ──
  await page.route('**/rest/services/api/SearchServer**', (route) =>
    route.fulfill({
      json: { results: [{ attrs: { label: '<b>Musterstrasse 1 Zug</b>', lat: 47.17, lon: 8.52, y: 2681500, x: 1224500 } }] },
    }),
  );

  await page.route('**/rest/services/api/MapServer/identify**', (route) => {
    const url = route.request().url();
    if (url.includes('vec25-gebaeude')) {
      route.fulfill({
        json: {
          results: [
            {
              featureId: 1,
              geometry: {
                rings: [[
                  [2681505, 1224500], [2681525, 1224500], [2681525, 1224515], [2681505, 1224515], [2681505, 1224500],
                ]],
              },
            },
            {
              featureId: 2,
              geometry: {
                rings: [[
                  [2681455, 1224455], [2681470, 1224455], [2681470, 1224470], [2681455, 1224470], [2681455, 1224455],
                ]],
              },
            },
            {
              featureId: 3,
              geometry: {
                rings: [[
                  [2681550, 1224550], [2681565, 1224550], [2681565, 1224565], [2681550, 1224565], [2681550, 1224550],
                ]],
              },
            },
          ],
        },
      });
    } else {
      route.fulfill({
        json: {
          results: [{ geometry: { rings: [[
            [2681500, 1224500], [2681530, 1224500], [2681530, 1224520], [2681500, 1224520], [2681500, 1224500],
          ]] } }],
        },
      });
    }
  });

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.panelOffen', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG
  await page.click('[data-testid="sonne-toggle"]'); // Standort-Panel öffnen

  // ── Akt 1: Standort → Parzelle → Nachbarn übernehmen ───────────────────
  await page.fill('[data-testid="standort-suche"]', 'Musterstrasse 1');
  await page.click('[data-testid="standort-suchen"]');
  await page.click('[data-testid="standort-treffer"] button');
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('zone').length))
    .toBe(0);

  await page.click('[data-testid="parzelle-import"]');
  await expect(page.locator('[data-testid="standort-meldung"]')).toContainText('Parzelle importiert');
  await expect(page.locator('[data-testid="nachbarn-fussnote"]')).toContainText('VECTOR25');

  await page.click('[data-testid="nachbarn-uebernehmen"]');
  await expect(page.locator('[data-testid="standort-meldung"]')).toContainText('2 Nachbargebäude übernommen');
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window.__kosmo.state().doc.byKind('zone') as { zonenArt?: string }[]).filter((z) => z.zonenArt === 'nachbar')
          .length,
      ),
    )
    .toBe(2);

  // ── Akt 2: kleines Haus auf derselben Parzelle (4 Wände + Drehkipp-Fenster) ──
  const { storeyId, fensterOeffnungId } = await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    const storeyId = st.activeStoreyId!;
    const aw = (st.doc.byKind('assembly') as { id: string; name?: string }[]).find((a) => a.name?.startsWith('AW'))!;
    const zeichneWand = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      (k.run('design.wandZeichnen', { storeyId, a, b, assemblyId: aw.id }).patches[0] as { id: string }).id;

    const suedwand = zeichneWand({ x: 0, y: 0 }, { x: 6000, y: 0 });
    zeichneWand({ x: 6000, y: 0 }, { x: 6000, y: 5000 });
    zeichneWand({ x: 6000, y: 5000 }, { x: 0, y: 5000 });
    zeichneWand({ x: 0, y: 5000 }, { x: 0, y: 0 });

    const fensterOeffnungId = (
      k.run('design.oeffnungSetzen', {
        wallId: suedwand,
        openingType: 'fenster',
        center: 3000,
        width: 1200,
        height: 1500,
        sill: 900,
      }).patches[0] as { id: string }
    ).id;
    k.run('design.fensterParametrieren', {
      openingId: fensterOeffnungId,
      fensterTyp: 'einfluegel',
      swing: 'links',
      fluegelTyp: 'drehkipp',
    });

    // Eigener Footprint fürs Situationsplan — schwarzplan.ts liest NUR
    // MassBody-Volumen, keine Wandachsen (Modul-Kommentar «ehrliche Grenzen»).
    k.run('design.volumenErstellen', {
      storeyId,
      outline: [
        { x: 0, y: 0 },
        { x: 6000, y: 0 },
        { x: 6000, y: 5000 },
        { x: 0, y: 5000 },
      ],
      height: 6000,
    });

    return { storeyId, fensterOeffnungId };
  });

  const fluegelTyp = await page.evaluate(
    (id) => (window.__kosmo.state().doc.byKind('opening') as { id: string; fluegelTyp?: string }[]).find((o) => o.id === id)
      ?.fluegelTyp,
    fensterOeffnungId,
  );
  expect(fluegelTyp).toBe('drehkipp');

  // Export-DXF hängt am ERSTEN Geschoss (`storeys[0]`, keine explizite
  // Auswahl in diesem Test) — sicherstellen, dass das unser Haus-Geschoss ist.
  const ersteStoreyId = await page.evaluate(() => window.__kosmo.state().doc.storeysOrdered()[0]!.id);
  expect(ersteStoreyId).toBe(storeyId);

  // ── Akt 3: KosmoPublish — Situationsplan-Placement, DOM-Beweis Grau-vor-Schwarz ──
  const sheetId = await page.evaluate(() => {
    const k = window.__kosmo;
    const blatt = k.run('publish.blattErstellen', {
      name: 'Härtetest Situationsplan',
      format: 'A1',
      orientation: 'quer',
    });
    const sheetId = (blatt.patches[0] as { id: string }).id;
    k.run('publish.ansichtPlatzieren', { sheetId, view: 'situationsplan', scale: 500, x: 200, y: 150 });
    return sheetId;
  });
  await page.evaluate(() => window.__kosmo.open('publish'));
  await expect(page.locator('[data-testid="sheet-canvas"]')).toBeVisible();

  const polygonFuellungen = await page
    .locator('[data-testid="sheet-canvas"] svg polygon')
    .evaluateAll((els) => els.map((e) => e.getAttribute('fill')));
  const grauIndizes = polygonFuellungen.reduce<number[]>((acc, f, i) => (f === '#8a8a8a' ? [...acc, i] : acc), []);
  const schwarzIndizes = polygonFuellungen.reduce<number[]>((acc, f, i) => (f === '#1a1a1a' ? [...acc, i] : acc), []);
  // 2 echte Nachbarn (grau) + mindestens 1 eigener Footprint (schwarz).
  expect(grauIndizes).toHaveLength(2);
  expect(schwarzIndizes.length).toBeGreaterThanOrEqual(1);
  // Situationsplan-Usanz: Nachbarn zeichnen VOR den eigenen Footprints —
  // «eigenes Objekt hervorgehoben», nie verdeckt.
  expect(Math.max(...grauIndizes)).toBeLessThan(Math.min(...schwarzIndizes));

  expect(sheetId).toBeTruthy(); // Sheet existiert (nicht nur zur Beweisführung oben verwendet)

  // ── Akt 4: DXF-Export — Bemassungs-Layer, Determinismus ────────────────
  const { readFileSync } = await import('node:fs');

  const [dl1] = await Promise.all([page.waitForEvent('download'), page.click('[data-testid="export-dxf"]')]);
  const dxfPfad1 = await dl1.path();
  const dxfText1 = readFileSync(dxfPfad1!, 'utf-8');

  const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('[data-testid="export-dxf"]')]);
  const dxfPfad2 = await dl2.path();
  const dxfText2 = readFileSync(dxfPfad2!, 'utf-8');

  // Determinismus: zweimal derselbe Export desselben Modells ⇒ byte-identisch.
  expect(dxfText2).toBe(dxfText1);

  // Bemassungs-Layer (dxf/export.ts LAYER_BEMASSUNG, Name «BEMASSUNG») ist
  // im Export enthalten — Gruppencode 8 (Layer) mit diesem Wert.
  expect(dxfText1).toMatch(/\n8\nBEMASSUNG\n/);

  // ── Akt 5: Re-Import über den bestehenden Weg — crash-frei, Modell unangetastet ──
  const entitaetenVorImport = await page.evaluate(() => ({
    wall: window.__kosmo.state().doc.byKind('wall').length,
    opening: window.__kosmo.state().doc.byKind('opening').length,
    zone: window.__kosmo.state().doc.byKind('zone').length,
    mass: window.__kosmo.state().doc.byKind('mass').length,
  }));

  await page.evaluate(() => window.__kosmo.open('design'));
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('[data-testid="import-dxf"]'),
  ]);
  await chooser.setFiles({ name: 'haertetest-rueck.dxf', mimeType: 'application/dxf', buffer: Buffer.from(dxfText1, 'utf-8') });

  const erfolg = page.locator('[data-testid="meldung-erfolg"]').first();
  await expect(erfolg).toBeVisible({ timeout: 10_000 });
  // BEMASSUNG ist semantisch erkannt (dxf/import.ts LAYER_SEMANTIK) — würde
  // der Layer als «unklassiert» durchrutschen, stünde er hier namentlich.
  await expect(erfolg).toContainText('Alle Layer klassiert.');

  const entitaetenNachImport = await page.evaluate(() => ({
    wall: window.__kosmo.state().doc.byKind('wall').length,
    opening: window.__kosmo.state().doc.byKind('opening').length,
    zone: window.__kosmo.state().doc.byKind('zone').length,
    mass: window.__kosmo.state().doc.byKind('mass').length,
  }));
  // Der Unternehmerplan-Import ist rein lesend (Regel «Laufzeit ≠ Modell»,
  // s. unternehmerplan.ts Modul-Kommentar) — Entity-Zahlen bleiben exakt
  // gleich, auch obwohl der reimportierte DXF Bemassungs-Entities trägt.
  expect(entitaetenNachImport).toEqual(entitaetenVorImport);
});
