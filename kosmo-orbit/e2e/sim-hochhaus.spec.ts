import { expect, test } from '@playwright/test';
import * as B from './sim/bausteine';
import { SZENARIEN } from './sim/szenarien';

/**
 * Vollsimulation Hochhaus (Serie H, Batch H2b): Punkthochhaus Zürich-West
 * (Hardturm), `SZENARIEN.hochhaus` (`e2e/sim/szenarien.ts`). Längste Journey
 * der Serie — EIN `test()`, `test.setTimeout(180_000)`.
 *
 * Leitidee (H4, `szenario.gestaltung.leitidee`): «Skelett-Punkthochhaus im
 * Raster 8.4 m: der Kern trägt die Erschliessung, die Fassade ist ringsum
 * gleich orientiert.» Das bestimmt die Geometrie direkt: ein 5×28-Achsen-
 * Skelettraster (8.4 m Hauptachsen, 1.4 m Querachsen — bewusst > 26
 * Querachsen, Regressions-Anker Befund 2), eine zentrale Kern-Zone
 * (Treppenhaus) in der Mitte des Grundrisses statt an einer Fassade, und ein
 * ringsum montiertes Fassadensystem, das — passiv-solar begründet, nicht im
 * Widerspruch zur «gleich orientierten» Systemgrenze — Süd mehr Verglasung
 * gibt als Nord (Dossier-Vorgabe unten). Konstruktion laut
 * `szenario.gestaltung.material`: Sichtbeton-Skelett mit vorgehängter
 * Glas-Metall-Fassade.
 *
 * Pflichtprogramm (Buildplan `docs/SERIE-H-BUILDPLAN.md` Abschnitt 2, Zeile
 * «Hochhaus»): Tragwerk aus Raster (Baustein 7, Achslabels bijektiv, Achse 27
 * = «AA»), Unterzüge, Fassadenmodule N/S/W/O (Baustein 8, 154), 12×
 * `geschossKopieren` in EINER `__kosmo.run`-Schleife (kein Timeout durch UI-
 * Klicks) + EIN `geschoss-stapeln`-UI-Klick als Bedienbeweis (Befund 1 + 3),
 * Fluchtweg-Längen lesbar (Baustein 11), Phasengang mit Monotonie-Assert
 * (Baustein 3), Dossier + eine Kosmo-Station (Baustein 13),
 * `renderUeberBridge`-Segment (H3, bridge-gegatet), Export als Abschluss
 * (Baustein 17, Publikations-Set).
 */

test('Vollsimulation Hochhaus: Tragwerk aus Raster → Fassadenmodule N/S/W/O → 12× Geschosse stapeln → Fluchtweg → Phasengang → Kosmo → Bridge-Render → Publikations-Set', async ({
  page,
}) => {
  test.setTimeout(180_000);

  const szenario = SZENARIEN.hochhaus;
  const geometrie = szenario.geometrie as {
    raster: number;
    anzahl: number;
    querAnzahl: number;
    querAchsmass: number;
    geschosseGeplant: number;
  };

  // Fussabdruck aus dem Raster: Hauptachsen (8.4 m) spannen die Breite,
  // Querachsen (1.4 m) die Tiefe — exakt die Masse aus SZENARIEN.hochhaus,
  // ohne szenarien.ts anzufassen.
  const breite = (geometrie.anzahl - 1) * geometrie.raster; // 33'600 mm
  const tiefe = (geometrie.querAnzahl - 1) * geometrie.querAchsmass; // 37'800 mm

  // ---------------------------------------------------------------------
  // 1) Onboarding + Standort + Parzelle/Zonenregel (Bausteine 1+2). Die
  //    Zentrumszone Zürich-West trägt Grenzabstand NUR über die Zonenregel
  //    (parzelle.grenzabstand === null) — Baustein 2 prüft dabei automatisch
  //    den Regressions-Anker ROADMAP 153 mit einem Probekörper.
  // ---------------------------------------------------------------------
  await B.projektStarten(page, szenario);
  await B.parzelleSetzen(page, szenario);

  // Bootstrap (project-store.ts bootstrapProject) setzt activeStoreyId immer
  // auf das frisch erstellte EG — nie null an dieser Stelle der Journey.
  const storeyId = (await page.evaluate(() => window.__kosmo.state().activeStoreyId))!;

  // ---------------------------------------------------------------------
  // 2) Tragwerk aus Raster (Baustein 7, NEU): 5 Hauptachsen × 28 Querachsen
  //    → 140 Stützen auf jeder Kreuzung, Achslabels bijektiv (Achse 27 =
  //    «AA», Regressions-Anker Befund 2). Danach Unterzüge entlang jeder
  //    Hauptachse (kein genereller Baustein dafür — journey-spezifisch,
  //    Muster: direkter Command + Delta-Assert wie bei waendeZeichnen).
  // ---------------------------------------------------------------------
  await B.tragwerkAusRaster(page, {
    raster: geometrie.raster,
    anzahl: geometrie.anzahl,
    querAnzahl: geometrie.querAnzahl,
    querAchsmass: geometrie.querAchsmass,
  });

  const unterzuegeVorher = await page.evaluate(() => window.__kosmo.state().doc.byKind('beam').length);
  await page.evaluate(
    ({ storeyId, anzahl, raster, tiefe }) => {
      const k = window.__kosmo;
      for (let i = 0; i < anzahl; i++) {
        const x = i * raster;
        k.run('design.unterzugZeichnen', { storeyId, a: { x, y: 0 }, b: { x, y: tiefe } }); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.unterzugZeichnen' Z.763-796]
      }
    },
    { storeyId, anzahl: geometrie.anzahl, raster: geometrie.raster, tiefe },
  );
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('beam').length))
    .toBe(unterzuegeVorher + geometrie.anzahl);

  // ---------------------------------------------------------------------
  // 3) Aussenwände auf dem Rasterumriss (Baustein 4): Reihenfolge Süd → Ost
  //    → Nord → West, damit die Wand-IDs später 1:1 den MassBody-Kanten
  //    1..4 entsprechen (Rechteck im Uhrzeigersinn). Volumenkörper
  //    (`design.volumenErstellen`) mit demselben Umriss für die
  //    Fassadenmodul-Zuweisung (Baustein 8 braucht eine MassId).
  // ---------------------------------------------------------------------
  const [suedWandId, ostWandId, nordWandId, westWandId] = await B.waendeZeichnen(
    page,
    [
      { a: { x: 0, y: 0 }, b: { x: breite, y: 0 } }, // Süd
      { a: { x: breite, y: 0 }, b: { x: breite, y: tiefe } }, // Ost
      { a: { x: breite, y: tiefe }, b: { x: 0, y: tiefe } }, // Nord
      { a: { x: 0, y: tiefe }, b: { x: 0, y: 0 } }, // West
    ],
    'AW',
  );

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
        program: 'gewerbe',
      }).patches[0]!.id,
    { storeyId, breite, tiefe, hoehe: geometrie.geschosseGeplant * 3000 },
  ); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.volumenErstellen' Z.228-253]

  // ---------------------------------------------------------------------
  // 4) Fassadenmodule N/S/W/O (Baustein 8, NEU): Süd bekommt das
  //    Fensterband (grosse Verglasung, passiv-solar), Nord das geschlossenere
  //    Modul, West/Ost ein neutrales Seitenmodul. Assertet Öffnungszahl > 0
  //    UND seitenrichtige Fensterstanzung (Regressions-Anker ROADMAP 154:
  //    Süd- ≠ Nordwand an den gestanzten Fensterbreiten).
  // ---------------------------------------------------------------------
  const suedModul: B.FassadenModulDef = {
    name: 'Fassade Süd Fensterband',
    breite: 2100,
    hoehe: 3000,
    elemente: [{ x: 150, y: 900, b: 1800, h: 1500, typ: 'fenster' }],
  };
  const nordModul: B.FassadenModulDef = {
    name: 'Fassade Nord geschlossen',
    breite: 2100,
    hoehe: 3000,
    elemente: [{ x: 750, y: 1000, b: 600, h: 1200, typ: 'fenster' }],
  };
  const seiteModul: B.FassadenModulDef = {
    name: 'Fassade Seite',
    breite: 2100,
    hoehe: 3000,
    elemente: [{ x: 600, y: 950, b: 900, h: 1400, typ: 'fenster' }],
  };

  await B.fassade(page, {
    storeyId,
    massId,
    kanten: { sued: 1, ost: 2, nord: 3, west: 4 },
    module: { sued: suedModul, nord: nordModul, west: seiteModul, ost: seiteModul },
    vorgabe: suedModul.name,
    waende: { sued: [suedWandId], nord: [nordWandId], west: [westWandId], ost: [ostWandId] },
  });

  // ---------------------------------------------------------------------
  // 5) Kern trägt die Erschliessung (Leitidee): eine zentrale
  //    Treppenhaus-Zone (raumTyp=treppenhaus) im Grundriss, eine gerade
  //    Treppe darin, und eine Regelgeschoss-Zone im Nordband, die die
  //    Nordkante des Kerns TEILT (adjazent, nicht überlappend). Der
  //    Raumgraph bildet aus einer gemeinsamen, kollinearen Umriss-Kante ohne
  //    Wand dazwischen automatisch einen «offenen» Übergang (raumgraph.ts
  //    `offeneKante`) — das ist der Fluchtweg-Portal zwischen Wohnraum und
  //    Treppenhaus. (Eine NESTED/überlappende Zone teilt keine Kante → kein
  //    Portal → «keine Verbindung»; Lehre in SIM-BEFUNDE H-13.)
  // ---------------------------------------------------------------------
  const kernMitteX = breite / 2;
  const kernMitteY = tiefe / 2;
  const kernHalbe = geometrie.raster / 2; // ein Rasterfeld breit (8.4 m)
  const kern = {
    minX: kernMitteX - kernHalbe,
    maxX: kernMitteX + kernHalbe,
    minY: kernMitteY - kernHalbe,
    maxY: kernMitteY + kernHalbe,
  };

  await page.evaluate(
    ({ storeyId, breite, tiefe, kern }) => {
      const k = window.__kosmo;
      k.run('design.zoneErstellen', {
        storeyId,
        name: 'Kern Treppenhaus',
        sia: 'VF',
        raumTyp: 'treppenhaus',
        outline: [
          { x: kern.minX, y: kern.minY },
          { x: kern.maxX, y: kern.minY },
          { x: kern.maxX, y: kern.maxY },
          { x: kern.minX, y: kern.maxY },
        ],
      }); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.zoneErstellen' Z.333-363]
      // Regelgeschoss NORDBAND: teilt die Nordkante des Kerns (y=kern.maxY,
      // x∈[kern.minX,kern.maxX]) → «offener» Übergang im Raumgraph, ohne Wand.
      k.run('design.zoneErstellen', {
        storeyId,
        name: 'Regelgeschoss',
        sia: 'HNF',
        program: 'marktgerecht',
        outline: [
          { x: 0, y: kern.maxY },
          { x: breite, y: kern.maxY },
          { x: breite, y: tiefe },
          { x: 0, y: tiefe },
        ],
      });
      k.run('design.treppeErstellen', {
        storeyId,
        a: { x: kern.minX + 2000, y: (kern.minY + kern.maxY) / 2 },
        b: { x: kern.minX + 5000, y: (kern.minY + kern.maxY) / 2 },
      }); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.treppeErstellen' Z.936-971]
    },
    { storeyId, breite, tiefe, kern },
  );
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('zone').length))
    .toBe(2);
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('stair').length))
    .toBe(1);

  // ---------------------------------------------------------------------
  // 6) Geschosse stapeln: 12× `design.geschossKopieren` in EINER
  //    `__kosmo.run`-Schleife (NICHT 12 UI-Klicks — Timeout-Risiko bei der
  //    längsten Journey der Serie!), danach EIN UI-Klick auf
  //    `geschoss-stapeln` als Bedienbeweis (Baustein 10). Regressions-Anker
  //    Befund 1 (Stützen+Unterzüge in JEDEM gestapelten OG) UND Befund 3
  //    (Geschossleiste bleibt bedienbar) werden von Baustein 10 geprüft.
  // ---------------------------------------------------------------------
  const geschosseVorSchleife = await page.evaluate(() => window.__kosmo.state().doc.storeysOrdered().length);
  await page.evaluate(
    ({ storeyId, n }) => {
      const k = window.__kosmo;
      for (let i = 0; i < n; i++) {
        k.run('design.geschossKopieren', { storeyId, anzahl: 1 }); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.geschossKopieren' Z.1055-1107]
      }
    },
    { storeyId, n: geometrie.geschosseGeplant },
  );
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.storeysOrdered().length))
    .toBe(geschosseVorSchleife + geometrie.geschosseGeplant);

  await B.geschosseStapeln(page, 1, { minZonenOberstes: 0, minMoebelOberstes: 0 });

  // ---------------------------------------------------------------------
  // 7) Fluchtweg-Check (Baustein 11): das Regelgeschoss ist über den offenen
  //    Übergang mit dem zentralen Treppenhaus VERBUNDEN — der Egress-Check
  //    darf KEINE «keine Verbindung zum Treppenhaus»-Warnung melden (das wäre
  //    ein topologischer Fehler). Ein kompakter, konformer Punkt-Turm mit
  //    kurzem Weg zum zentralen Kern meldet BEWUSST keine Längen-Warnung —
  //    checks.ts Z.213 gibt erst > 0.8×35 m eine Meldung aus. Darum: keine
  //    fixe «≥1 Längen-Meldung», sondern (a) Egress verdrahtet, (b) jede
  //    GEMELDETE Länge ist in Metern lesbar (>0). Numerische Egress-Längen
  //    beweist die MFH-Journey (dort liegen die Wohnungen weit genug).
  //    Lehre: SIM-BEFUNDE H-13 (spec-korrigiert).
  // ---------------------------------------------------------------------
  const befund = await B.checksLesen(page);
  expect(befund, 'Checks-Panel liefert keinen Befund').not.toBeNull();
  if (befund) {
    expect(befund.text, `Regelgeschoss ist nicht ans Treppenhaus angebunden:\n${befund.text}`).not.toContain(
      'keine Verbindung zum Treppenhaus',
    );
    for (const laenge of befund.fluchtwegLaengenM) {
      expect(laenge).toBeGreaterThan(0);
    }
  }

  // ---------------------------------------------------------------------
  // 8) Phasengang Vorprojekt → Bauprojekt → Werkplan (Baustein 3) mit
  //    Monotonie-Assert am selben Modellstand (Regel 1.4.1: nie fixe
  //    Pfadzahlen).
  // ---------------------------------------------------------------------
  const pfadeVorprojekt = await B.phaseSchalten(page, 'vorprojekt');
  const pfadeBauprojekt = await B.phaseSchalten(page, 'bauprojekt');
  const pfadeWerkplan = await B.phaseSchalten(page, 'werkplan');
  expect(pfadeBauprojekt).toBeGreaterThanOrEqual(pfadeVorprojekt);
  expect(pfadeWerkplan).toBeGreaterThanOrEqual(pfadeBauprojekt);

  // ---------------------------------------------------------------------
  // 9) Dossier (H4) + eine Kosmo-Station: der Don't zur Kernachse wird
  //    belegt zitiert und lässt sich anspringen (Baustein 13, Modus
  //    «quelle», Muster sim-umbau 6a).
  // ---------------------------------------------------------------------
  await page.evaluate(
    (eintraege) => window.__kosmo.run('design.dossierSetzen', { eintraege }),
    szenario.gestaltung.dossier,
  );
  await B.kosmoFragen(page, 'Was sagt das Dossier zur Kernachse?', {
    modus: 'quelle',
    chipEnthaelt: 'Dossier NO-GO',
    sprungTestid: 'quelle-sprung-dossier',
    sprungEnthaelt: 'Rasters',
  });

  // ---------------------------------------------------------------------
  // 10) KosmoVis-Render über die (Fake-)Bridge (H3): «Drei Stimmungen» →
  //     Render → Bild am Node → aufs Blatt. Nur bei laufender :8600-Bridge
  //     (Regel R7); fehlt sie, wird das Segment ehrlich mit Anleitung
  //     übersprungen — kein stiller Pass.
  // ---------------------------------------------------------------------
  if (await B.bridgeVerfuegbar()) {
    await B.renderUeberBridge(page);
  } else {
    // eslint-disable-next-line no-console
    console.warn(`[sim-hochhaus] Render-Segment übersprungen — ${B.BRIDGE_FEHLT_HINWEIS}`);
  }

  // ---------------------------------------------------------------------
  // 11) Publikations-Set als Abschluss: Blatt mit Grundriss, dann
  //     `export-set` (Plansatz-PDF, Baustein 17).
  // ---------------------------------------------------------------------
  await B.blattPublizieren(page);
  await B.exportPruefen(page, 'export-set', /Plansatz\.pdf$/);
});
