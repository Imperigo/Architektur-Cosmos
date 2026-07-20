import { expect, test } from '@playwright/test';
import * as B from './sim/bausteine';
import type { FassadenModulDef } from './sim/bausteine';
import { SZENARIEN } from './sim/szenarien';
import { visManuellStorageState } from './helpers/manuell-seed';

// v0.8.10 E3-Nachtrag Seed-Flip — NOTWENDIGE Folgeänderung (P-B1-Audit-
// Lücke, kein deklariertes Dateikreis-Mitglied von P-B2, aber vom eigenen
// Vor-/Nach-Flip-Vollsuiten-Vergleich gefunden): `sim/bausteine.ts`s
// geteilter Baustein 14 (`renderUeberBridge`) klickt `[data-testid="drei-
// stimmungen"]` — ein Manuell-only-Testid, das im Island-Default nicht
// existiert. Ohne diesen Kopf würde der Seed-Flip diese Journey (und die
// vier weiteren Journeys, die denselben Baustein aufrufen — sim-blockrand/
// -efh/-hochhaus/-mfh) von grün auf rot kippen.
test.use({ storageState: visManuellStorageState() });

/**
 * Serie H / H2c — Vollsimulation Stadthaus «Reihenhaus-Lückenschluss
 * Länggasse Bern» (`SZENARIEN.stadthaus`, `e2e/sim/szenarien.ts`).
 * Werkplan-Schwerpunkt (Buildplan `docs/SERIE-H-BUILDPLAN.md`, Abschnitt 2,
 * Zeile Stadthaus): die einzige Journey der Serie, die Bemassung,
 * Etikett/Keynote, Ausmass und DXF-Export breit fährt.
 *
 * ── Leitidee (H4, Buildplan Abschnitt 4 — bestimmt die Geometrie) ─────────
 * «Vertikale Erschliessung im schmalen 6×18-m-Lückenschluss zwischen zwei
 * Brandmauern, 4 Vollgeschosse» (`szenario.gestaltung.leitidee`). Genau so
 * modelliert: Parzelle als Boundary 6×18 m; die beiden LANGEN Kanten (Ost/
 * West, volle 18 m Tiefe) sind BLINDE Brandmauern (Aufbau «IW» — `design.
 * fensterAusModulen` stanzt nur in Wände, deren Aufbau mit «AW» beginnt,
 * commands/design.ts Z.1141 — eine Brandmauer kann darum gar nie ein
 * Fenster erhalten); die beiden KURZEN Kanten (Süd = Strasse, Nord = Hof)
 * tragen die Fassade («AW») mit UNTERSCHIEDLICHEN Modulen (Regressions-
 * Anker ROADMAP 154). Eine innenliegende Treppe erschliesst die vier
 * gestapelten Vollgeschosse vertikal; die Trennwand des Treppenkerns liegt
 * bewusst NICHT auf einer Bbox-Kante und löst damit die Innenketten-
 * Bemassung des Werkplans aus (Schritt 9). Material laut `szenario.
 * gestaltung.material` («Berner-Sandstein-Sockel, verputzte Lochfassade mit
 * Klappläden zur Strasse»): die Strassenfassade erhält ein schmales
 * Lochfenster (Klappläden-Charakter), die Hoffassade ein grosszügigeres
 * Gartenfenster.
 *
 * Serie H fasst keinen Kernel-Code an; jeder Schritt läuft über die
 * Journey-Bausteine (`e2e/sim/bausteine.ts`) oder — wo kein genereller
 * Baustein passt (Werkplan-Werkzeuge Bemassung/Etikett/Keynote/Ausmass,
 * Zone/Volumen/Trennwand) — über denselben `__kosmo.run`-Command-Weg mit
 * UI-Assert (Regel 1.4.2).
 */

test('Vollsimulation Stadthaus Länggasse Bern: Lückenschluss zwischen Brandmauern → Treppe → Fassadenmodule Strasse/Hof → 4 Geschosse stapeln → Phasengang → Werkplan (Bemassung/Etikett/Keynote/Ausmass) → Kosmo → Bridge-Render → DXF', async ({
  page,
}) => {
  test.setTimeout(180_000);

  const szenario = SZENARIEN.stadthaus;
  const geometrie = szenario.geometrie as { breite: number; tiefe: number; geschosse: number };

  // ---------------------------------------------------------------------
  // 1) Onboarding + Standort + Parzelle/Zonenregel (Bausteine 1+2). Die
  //    Länggasse-Parzelle trägt keinen eigenen Grenzabstand (beidseitig
  //    Brandmauern) UND die Zonenregel kennt keinen `grenzabstandKlein` —
  //    Baustein 2 fährt darum bewusst NICHT den Probekörper-Regressions-
  //    anker 153 (der gilt nur, wo die Zonenregel als Ersatzquelle für einen
  //    fehlenden Grenzabstand einspringt; die Länggasse-Zonenregel kennt gar
  //    keinen Grenzabstandswert).
  // ---------------------------------------------------------------------
  await B.projektStarten(page, szenario);
  await B.parzelleSetzen(page, szenario);

  // Bootstrap (project-store.ts bootstrapProject) setzt activeStoreyId immer
  // auf das frisch erstellte EG — nie null an dieser Stelle der Journey.
  const egId = (await page.evaluate(() => window.__kosmo.state().activeStoreyId))!;

  // ---------------------------------------------------------------------
  // 2) Gestaltungskonzept (H4, Punkt 2): Dossier früh setzen (Traufhöhen-
  //    Anschluss GEFORDERT, Fassadenflucht NO-GO), Raumprogramm.
  // ---------------------------------------------------------------------
  await page.evaluate(
    (eintraege) => window.__kosmo.run('design.dossierSetzen', { eintraege }),
    szenario.gestaltung.dossier,
  ); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.dossierSetzen']
  await page.evaluate(
    (posten) => window.__kosmo.run('design.raumprogrammSetzen', { posten }),
    szenario.raumprogramm,
  ); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.raumprogrammSetzen']

  // ---------------------------------------------------------------------
  // 3) Aussenwände (Baustein 4): Süd (Strasse, y=0) + Nord (Hof, y=tiefe)
  //    tragen den Fassadenaufbau «AW» (fensterfähig); Ost/West (die vollen
  //    18 m tiefen Brandmauern) tragen bewusst «IW» — blind, siehe Kopf-
  //    kommentar. Reihenfolge Süd→Ost→Nord→West liefert dieselbe Bbox-
  //    Kantenfolge 1..4 wie der Volumenkörper unten (Baustein 8, Muster
  //    sim-hochhaus.spec.ts).
  // ---------------------------------------------------------------------
  const [suedWandId, nordWandId] = await B.waendeZeichnen(
    page,
    [
      { a: { x: 0, y: 0 }, b: { x: geometrie.breite, y: 0 } }, // Süd — Strassenfassade
      { a: { x: geometrie.breite, y: geometrie.tiefe }, b: { x: 0, y: geometrie.tiefe } }, // Nord — Hoffassade
    ],
    'AW',
  );
  await B.waendeZeichnen(
    page,
    [
      { a: { x: geometrie.breite, y: 0 }, b: { x: geometrie.breite, y: geometrie.tiefe } }, // Ost — Brandmauer (blind)
      { a: { x: 0, y: geometrie.tiefe }, b: { x: 0, y: 0 } }, // West — Brandmauer (blind)
    ],
    'IW',
  );
  // Innenliegende Trennwand (Treppenkern, x=3000 — NICHT auf einer
  // Bbox-Kante) → löst die Innenkette der Werkplan-Bemassung aus (Schritt 9,
  // `dim-kette-innen`).
  await B.waendeZeichnen(page, [{ a: { x: 3000, y: 0 }, b: { x: 3000, y: 7500 } }], 'IW');

  // ---------------------------------------------------------------------
  // 4) HNF-Zone «Wohnen» über den ganzen Grundriss (Muster sim-efh.spec.ts
  //    Schritt 9: Zone deckt denselben Umriss wie die Wände) — sorgt dafür,
  //    dass jedes gestapelte Geschoss (Schritt 7) eine Zone > 0 mitträgt
  //    (Baustein 10 assertet `zonen > 0` am obersten Geschoss).
  // ---------------------------------------------------------------------
  await page.evaluate(
    ({ storeyId, breite, tiefe }) =>
      window.__kosmo.run('design.zoneErstellen', {
        storeyId,
        name: 'Wohnen',
        sia: 'HNF',
        raumTyp: 'wohnen',
        program: 'eigenheim',
        outline: [
          { x: 0, y: 0 },
          { x: breite, y: 0 },
          { x: breite, y: tiefe },
          { x: 0, y: tiefe },
        ],
      }),
    { storeyId: egId, breite: geometrie.breite, tiefe: geometrie.tiefe },
  ); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.zoneErstellen']

  // ---------------------------------------------------------------------
  // 5) Vertikale Erschliessung (Leitidee, Baustein 6): interne Treppe im
  //    Kern zwischen Trennwand (x=3000) und Ost-Brandmauer (x=breite).
  // ---------------------------------------------------------------------
  await B.treppeSetzen(page, {
    storeyId: egId,
    a: { x: 4000, y: 2000 },
    b: { x: 4000, y: 6000 },
  });

  // ---------------------------------------------------------------------
  // 6) Fassadenmodule Strasse/Hof (Baustein 8): Strasse mit schmalerem
  //    Lochfenster (Klappläden-Charakter, `szenario.gestaltung.material`),
  //    Hof mit grosszügigerem Gartenfenster. Assertet Öffnungszahl > 0 UND
  //    seitenrichtige Fensterstanzung (Regressions-Anker ROADMAP 154:
  //    Strassen- ≠ Hofmodul an den gestanzten Fensterbreiten).
  // ---------------------------------------------------------------------
  const massId = await page.evaluate(
    ({ storeyId, breite, tiefe, hoehe }) =>
      window.__kosmo.run('design.volumenErstellen', {
        storeyId,
        outline: [
          { x: 0, y: 0 },
          { x: breite, y: 0 },
          { x: breite, y: tiefe },
          { x: 0, y: tiefe },
        ],
        height: hoehe,
        program: 'eigenheim',
      }).patches[0]!.id,
    { storeyId: egId, breite: geometrie.breite, tiefe: geometrie.tiefe, hoehe: geometrie.geschosse * 3000 },
  ); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.volumenErstellen']

  const strasseModul: FassadenModulDef = {
    name: 'Fassade Strasse Lochfenster',
    breite: 2000,
    hoehe: 3000,
    elemente: [{ x: 700, y: 900, b: 600, h: 1400, typ: 'fenster' }],
  };
  const hofModul: FassadenModulDef = {
    name: 'Fassade Hof Gartenfenster',
    breite: 2000,
    hoehe: 3000,
    elemente: [{ x: 300, y: 600, b: 1400, h: 2000, typ: 'fenster' }],
  };

  await B.fassade(page, {
    storeyId: egId,
    massId,
    kanten: { sued: 1, nord: 3 }, // Rechteck Süd→Ost→Nord→West (Bbox-Konvention, Muster sim-hochhaus)
    module: { sued: strasseModul, nord: hofModul },
    vorgabe: strasseModul.name,
    waende: { sued: [suedWandId], nord: [nordWandId] },
  });

  // ---------------------------------------------------------------------
  // 7) 4 Vollgeschosse stapeln (Baustein 10): EG (Strassen-/Hoffassade,
  //    Treppe, Zone) 3× deckungsgleich nach oben kopieren — Fenster UND
  //    Treppe wandern automatisch mit (`design.geschossKopieren`).
  // ---------------------------------------------------------------------
  await B.geschosseStapeln(page, geometrie.geschosse - 1, { minZonenOberstes: 0, minMoebelOberstes: 0 });

  // ---------------------------------------------------------------------
  // 8) Phasengang Vorprojekt → Bauprojekt → Werkplan (Baustein 3) MIT
  //    Monotonie-Assert am FERTIGEN Haus — nach dem Stapeln (Buildplan
  //    Abschnitt 2, schärfste Stadthaus-Assertion «Phasen-Monotonie über
  //    alle drei Phasen am fertigen Haus»).
  // ---------------------------------------------------------------------
  const nVorprojekt = await B.phaseSchalten(page, 'vorprojekt');
  const nBauprojekt = await B.phaseSchalten(page, 'bauprojekt');
  const nWerkplan = await B.phaseSchalten(page, 'werkplan');
  expect(nBauprojekt).toBeGreaterThanOrEqual(nVorprojekt);
  expect(nWerkplan).toBeGreaterThanOrEqual(nBauprojekt);

  // ---------------------------------------------------------------------
  // 9) Werkplan-Werkzeuge breit (Buildplan-Auftrag H2c) — jetzt in Phase
  //    «werkplan»: Bemassungs-Stil mit Innenketten + Rohkonstruktion.
  //    `design.bemassungSetzen` wirkt unabhängig von der Phase auf
  //    `derive/dimensions.ts`; PlanView.tsx rendert je Kette eine
  //    `dim-kette-<role>`-Gruppe. Die Trennwand aus Schritt 3 liegt NICHT
  //    auf einer Bbox-Kante → löst `dim-kette-innen` aus.
  // ---------------------------------------------------------------------
  await page.evaluate(() =>
    window.__kosmo.run('design.bemassungSetzen', { innenKetten: true, rohKette: true, hoehenKoten: true }),
  ); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.bemassungSetzen' Z.1725]
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.settings['bemassung']))
    .not.toBeNull(); // Regel R3: Doc-Zustand zuerst pollen, DOM danach
  await page.click('[data-testid="view-2d"]'); // [Quelle: DesignWorkspace.tsx 'view-2d' / bausteine.ts Baustein 1]
  await expect(page.locator('[data-testid="planview"] [data-testid="dim-kette-gesamt"]').first()).toBeVisible(); // [Quelle: PlanView.tsx Z.591-593]
  await expect(page.locator('[data-testid="planview"] [data-testid="dim-kette-innen"]').first()).toBeVisible();

  // ---------------------------------------------------------------------
  // 10) Etikett am Bauteil (echte UI: Wand anwählen, `inspector-etikett`
  //     klicken — Muster module.spec.ts «Etikett»-Test): Aufbau-Etikett an
  //     der Strassenwand.
  // ---------------------------------------------------------------------
  const etikettenVorher = await page.evaluate(() => window.__kosmo.state().doc.byKind('etikett').length);
  await page.evaluate((id) => window.__kosmo.state().select([id]), suedWandId); // [Quelle: bausteine.ts KosmoState.select]
  await expect(page.locator('[data-testid="inspector"]')).toBeVisible(); // [Quelle: Inspector.tsx Z.54]
  await page.click('[data-testid="inspector-etikett"]'); // [Quelle: Inspector.tsx Z.142]
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('etikett').length))
    .toBe(etikettenVorher + 1);

  // ---------------------------------------------------------------------
  // 11) Keynote (kein UI-Knopf für `design.keynoteSetzen` selbst — der
  //     Inspector setzt für Etiketten nur `inhalt: 'aufbau'`, Regel 1.4.2:
  //     Command-Weg + UI-Assert): eine Keynote zur Sandstein-Sockelbauweise
  //     (`szenario.gestaltung.material`), als Etikett an der Hoffassade
  //     verankert.
  // ---------------------------------------------------------------------
  await page.evaluate(() =>
    window.__kosmo.run('design.keynoteSetzen', { nr: 'K1', text: 'Berner-Sandstein-Sockel' }),
  ); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.keynoteSetzen' Z.587]
  await page.evaluate(
    (nordWandId) =>
      window.__kosmo.run('design.etikettSetzen', {
        targetId: nordWandId,
        at: { x: 3000, y: 18800 },
        inhalt: 'keynote',
        keynote: 'K1',
      }),
    nordWandId,
  ); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.etikettSetzen' Z.551]
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('etikett').length))
    .toBe(etikettenVorher + 2);

  // Etikett am Bauteil im Plan sichtbar (Buildplan schärfste Assertion):
  // beide Etiketten-Texte lesbar, ohne fixe Gesamt-Textzahl (Regel R1) — das
  // Aufbau-Etikett trägt zwei Zeilen (Name + Schichtdicken), das Keynote-
  // Etikett genau die Nummer.
  const etikettTexte = await page.locator('[data-testid="planview"] text.etikett').allTextContents(); // [Quelle: PlanView.tsx Z.506-519 / derive/plan.ts Z.561-564]
  expect(etikettTexte.some((t) => t.includes('AW'))).toBe(true);
  expect(etikettTexte.some((t) => t === 'K1')).toBe(true);

  // ---------------------------------------------------------------------
  // 12) Ausmass (Baustein-17-Muster, Buildplan schärfste Assertion «Ausmass-
  //     CSV-Download > Schwelle»): KosmoDraw öffnen, Ausmass-Tab, CSV-
  //     Download. Kein genereller Baustein (Baustein 17s `ExportArt` kennt
  //     nur `export-*`/`pubset-pdf`; `ausmass-csv` ist derselbe Blob-Anker-
  //     Weg wie `pubset-svg`, bewiesen in module.spec.ts «Set-Publikation»).
  // ---------------------------------------------------------------------
  await page.click('[data-testid="draw-toggle"]'); // [Quelle: DesignWorkspace.tsx 'draw-toggle']
  await page.click('[data-testid="draw-tab-ausmass"]'); // [Quelle: DrawPanel.tsx Z.142]
  await expect(page.locator('[data-testid="ausmass-tabelle"]')).toBeVisible(); // [Quelle: DrawPanel.tsx Z.195]
  const [ausmassDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="ausmass-csv"]'), // [Quelle: DrawPanel.tsx Z.221]
  ]); // Regel R10: nie click-dann-warten
  expect(ausmassDownload.suggestedFilename()).toMatch(/Ausmass\.csv$/);
  const ausmassPfad = await ausmassDownload.path();
  const { readFileSync } = await import('node:fs');
  // Fable-Review-2, Auflage 6: nicht nur Dateiname/Grösse — die CSV muss eine
  // echte Datenzeile NACH der Kopfzeile tragen (`Kapitel;Position;…`), sonst
  // beweist der Export nichts über den Inhalt.
  const ausmassZeilen = readFileSync(ausmassPfad!, 'utf8').trim().split('\n');
  expect(ausmassZeilen.length, `Ausmass-CSV ohne Datenzeile:\n${ausmassZeilen.join('\n')}`).toBeGreaterThan(1);

  // ---------------------------------------------------------------------
  // 13) Kosmo (Mock-Provider), Dossier-Frage (Baustein 13, Modus «quelle»,
  //     Muster sim-efh/sim-hochhaus): die Traufhöhen-Vorgabe wird belegt
  //     zitiert und lässt sich anspringen.
  // ---------------------------------------------------------------------
  await B.kosmoFragen(page, 'Was sagt das Dossier zur Traufhöhe?', {
    modus: 'quelle',
    chipEnthaelt: 'Dossier GEFORDERT',
    sprungTestid: 'quelle-sprung-dossier',
    sprungEnthaelt: 'Traufhöhe',
  });

  // ---------------------------------------------------------------------
  // 14) KosmoVis-Render über die (Fake-)Bridge (H3): «Drei Stimmungen» →
  //     Render → Bild am Node → aufs Blatt. Nur bei laufender :8600-Bridge
  //     (Regel R7); fehlt sie, wird das Segment ehrlich mit Anleitung
  //     übersprungen — kein stiller Pass.
  // ---------------------------------------------------------------------
  if (await B.bridgeVerfuegbar()) {
    await B.renderUeberBridge(page);
  } else {
    // eslint-disable-next-line no-console
    console.warn(`[sim-stadthaus] Render-Segment übersprungen — ${B.BRIDGE_FEHLT_HINWEIS}`);
  }

  // ---------------------------------------------------------------------
  // 15) DXF-Export als Abschluss (Baustein 17, `export-dxf` — die einzige
  //     Journey, die den Werkplan-DXF-Weg statt Plansatz-PDF fährt).
  // ---------------------------------------------------------------------
  await page.evaluate(() => window.__kosmo.open('publish')); // [Quelle: App.tsx __kosmo.open / PublishWorkspace.tsx]
  const dxfPfad = await B.exportPruefen(page, 'export-dxf', /\.dxf$/);
  // Fable-Review-2, Auflage 6: Inhalts-Marker statt nur Suffix — eine gültige
  // DXF trägt einen ENTITIES-Abschnitt.
  expect(readFileSync(dxfPfad, 'utf8')).toContain('ENTITIES');
});
