import { expect, test } from '@playwright/test';
import * as B from './sim/bausteine';
import { SZENARIEN } from './sim/szenarien';
import { visManuellStorageState } from './helpers/manuell-seed';

// v0.8.10 E3-Nachtrag Seed-Flip — NOTWENDIGE Folgeänderung (P-B1-Audit-
// Lücke, kein deklariertes Dateikreis-Mitglied von P-B2, aber vom eigenen
// Vor-/Nach-Flip-Vollsuiten-Vergleich gefunden): `sim/bausteine.ts`s
// geteilter Baustein 14 (`renderUeberBridge`) klickt `[data-testid="drei-
// stimmungen"]` — ein Manuell-only-Testid, das im Island-Default nicht
// existiert. Ohne diesen Kopf würde der Seed-Flip diese Journey (und die
// vier weiteren Journeys, die denselben Baustein aufrufen — sim-blockrand/
// -efh/-mfh/-stadthaus) von grün auf rot kippen.
test.use({ storageState: visManuellStorageState() });

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
  // 5) Kern trägt die Erschliessung: eine Treppenhaus-Zone (raumTyp=
  //    treppenhaus) mit gerader Treppe, und eine Regelgeschoss-Zone im
  //    Nordband, die die Nordkante des Kerns TEILT (adjazent, nicht
  //    überlappend) → der Raumgraph bildet aus der gemeinsamen kollinearen
  //    Umriss-Kante ohne Wand automatisch einen «offenen» Übergang
  //    (raumgraph.ts `offeneKante`) = Fluchtweg-Portal. (Nested/überlappend
  //    teilt keine Kante → kein Portal → «keine Verbindung»; Lehre H-13.)
  //    Der Kern sitzt BEWUSST exzentrisch am Südrand (Fable-Review-2,
  //    Auflage 1): so überschreitet die entfernteste Regelgeschoss-Ecke den
  //    35-m-VKF-Richtwert, und der Egress-Check meldet eine **lesbare
  //    Fluchtweg-Länge als FEHLER**. Ein Fehler sortiert im Checks-Panel nach
  //    oben (`checks.ts` fehler-zuerst) und ist damit truncation-fest
  //    sichtbar — DIE Journey, die die Längen-Anzeige scharf pinnt (die
  //    kompakten Türme/MFH sind konform-still). Der zentrale Punkt-Turm-Kern
  //    bleibt in X mittig; nur in Y ist er ans Südende gerückt.
  // ---------------------------------------------------------------------
  const kernMitteX = breite / 2;
  const kernBreite = geometrie.raster; // ein Rasterfeld breit (8.4 m)
  const kern = {
    minX: kernMitteX - kernBreite / 2,
    maxX: kernMitteX + kernBreite / 2,
    minY: 2000, // exzentrisch am Südrand → langer Nord-Fluchtweg (> 35 m, s.o.)
    maxY: 2000 + kernBreite,
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
  // 6b) Regressions-Anker Befund 1, HART (Fable-Review-2, Auflage 5): in
  //     JEDEM gestapelten OG steht Tragstruktur — mindestens `geschosseGeplant`
  //     + EG Geschosse tragen sowohl `column` ALS AUCH `beam`. Fiele die
  //     Stützen-/Unterzug-Kopie in `design.geschossKopieren` wieder aus, sänke
  //     diese Zahl. Und Befund 3, HART (Auflage 2): die Geschossleiste ist
  //     nicht nur sichtbar, sondern das oberste Geschoss ist KLICKBAR — ein
  //     Klick auf seinen Chip macht es aktiv (statt nur `toBeVisible`, das
  //     geclippte Elemente fälschlich als sichtbar wertet).
  // ---------------------------------------------------------------------
  const tragwerkGeschosse = await page.evaluate(() => {
    const doc = window.__kosmo.state().doc;
    return doc
      .storeysOrdered()
      .filter(
        (s) =>
          doc.byKind('column').some((c) => c.storeyId === s.id) &&
          doc.byKind('beam').some((b) => b.storeyId === s.id),
      ).length;
  });
  expect(tragwerkGeschosse).toBeGreaterThanOrEqual(geometrie.geschosseGeplant + 1); // EG + 12 Kopien

  const oberstes = await page.evaluate(() => {
    const g = window.__kosmo.state().doc.storeysOrdered();
    return g[g.length - 1]!;
  });
  await page.click(`[data-testid="storey-${oberstes.name}"]`); // [Quelle: DesignWorkspace.tsx storey-${name} / sim-mfh.spec.ts]
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().activeStoreyId))
    .toBe(oberstes.id); // klickbar: der Chip wird aktiv gesetzt

  // ---------------------------------------------------------------------
  // 7) Fluchtweg-Check (Baustein 11): das Regelgeschoss ist über den offenen
  //    Übergang mit dem Treppenhaus VERBUNDEN (keine «keine Verbindung»-
  //    Warnung = topologischer Nachweis, Anker H-13). Weil der Kern
  //    exzentrisch sitzt (Schritt 5), überschreitet die entfernteste
  //    Regelgeschoss-Ecke den 35-m-VKF-Richtwert → der Check meldet die
  //    Fluchtweg-Länge in Metern als FEHLER. Das ist die suite-weit scharfe
  //    Pinnung der Längen-Anzeige (Fable-Review-2, Auflage 1): eine
  //    Regression im Längen-Format (`checks.ts` `(weg.distanz/1000).toFixed(1)
  //    m`) oder in der Parse-Regex (Baustein 11) würde hier rot.
  // ---------------------------------------------------------------------
  const befund = await B.checksLesen(page);
  expect(befund, 'Checks-Panel liefert keinen Befund').not.toBeNull();
  expect(befund!.text, `Regelgeschoss ist nicht ans Treppenhaus angebunden:\n${befund!.text}`).not.toContain(
    'keine Verbindung zum Treppenhaus',
  );
  // Der überlange Egress erscheint als «… Fluchtweg XX.X m > 35 m (VKF-Richtwert)»
  expect(befund!.text, `Kein Fluchtweg-Überschreitungs-Befund:\n${befund!.text}`).toContain('> 35 m');
  expect(
    befund!.fluchtwegLaengenM.length,
    `Keine lesbare Fluchtweg-Länge im Panel:\n${befund!.text}`,
  ).toBeGreaterThan(0);
  for (const laenge of befund!.fluchtwegLaengenM) {
    expect(laenge).toBeGreaterThan(35); // Meter, jenseits des Richtwerts
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
