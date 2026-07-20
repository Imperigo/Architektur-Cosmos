import { expect, test } from '@playwright/test';
import * as B from './sim/bausteine';
import type { TerrainProfil } from './sim/bausteine';
import { SZENARIEN } from './sim/szenarien';
import { visManuellStorageState } from './helpers/manuell-seed';

// v0.8.10 E3-Nachtrag Seed-Flip — NOTWENDIGE Folgeänderung (P-B1-Audit-
// Lücke, kein deklariertes Dateikreis-Mitglied von P-B2, aber vom eigenen
// Vor-/Nach-Flip-Vollsuiten-Vergleich gefunden): `sim/bausteine.ts`s
// geteilter Baustein 14 (`renderUeberBridge`) klickt `[data-testid="drei-
// stimmungen"]` — ein Manuell-only-Testid, das im Island-Default nicht
// existiert. Ohne diesen Kopf würde der Seed-Flip diese Journey (und die
// vier weiteren Journeys, die denselben Baustein aufrufen — sim-blockrand/
// -hochhaus/-mfh/-stadthaus) von grün auf rot kippen.
test.use({ storageState: visManuellStorageState() });

/**
 * Serie H / H2a — Vollsimulation EFH «Hanglage Emmental» (`SZENARIEN.efh`,
 * `e2e/sim/szenarien.ts`: Gemeinde Lauperswil, Zone W2, AZ 0.4, Hang ~15 %
 * nach Süden).
 *
 * ── Leitidee (H4, Buildplan Abschnitt 4 — bestimmt die Geometrie) ─────────
 * «Hangsprung: zwei versetzte Ebenen, die dem ~15 %-Gefälle nach Süden
 * folgen, Split-Level-Treppe dazwischen» (`szenario.gestaltung.leitidee`).
 * Genau so modelliert: zwei eigene Geschosse «Unterer Split»/«Oberer Split»
 * (Höhen aus `szenario.geometrie.ebenen`, nicht frei erfunden), eine kurze
 * Split-Level-Treppe mit der Geschosshöhen-Differenz als Steigung, und eine
 * grosszügige Südverglasung auf der Hauptwohnebene (Dossier-Vorgabe
 * «passive Solargewinne», `szenario.gestaltung.dossier[0]`).
 *
 * Serie H fasst keinen Kernel-Code an; jeder Schritt läuft über die
 * Journey-Bausteine (`e2e/sim/bausteine.ts`, Bausteine 1–6, 13–18) oder —
 * wo kein genereller Baustein passt (Split-Level-Geschosse, Möblierung,
 * Südfenster, SIA-416-Regressions-Anker) — über denselben
 * `__kosmo.run`-Command-Weg wie in sim-umbau/sim-mfh, mit UI-Assert.
 */

/** Shoelace-Fläche eines Polygons in m² (mm-Koordinaten) — journey-lokal,
 * nur zur Grössenordnungs-Kontrolle der Kennzahlen (kein Kernel-Import). */
function polygonFlaecheM2(outline: readonly { x: number; y: number }[]): number {
  let s = 0;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i]!;
    const b = outline[(i + 1) % outline.length]!;
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2 / 1_000_000;
}

test('Vollsimulation EFH Hanglage Emmental: Parzelle/Zonenregel → Hang-Terrain → Split-Level (Wände/Treppe/Dach/Möbel) → Sonne → SIA-416 → Berechnungsliste → Kosmo → Publish/Export', async ({
  page,
}) => {
  test.setTimeout(180_000);

  const szenario = SZENARIEN.efh;
  const ebenen = szenario.geometrie['ebenen'] as { name: string; hoeheM: number }[];
  const [unterEbene, oberEbene] = ebenen as [{ name: string; hoeheM: number }, { name: string; hoeheM: number }];
  const splitHoeheMm = oberEbene.hoeheM - unterEbene.hoeheM; // 1500 mm — die Split-Level-Steigung
  const OBERGESCHOSS_RAUMHOEHE_MM = 2800; // gewöhnliche CH-Wohn-Raumhöhe (wie bootstrapProject 1.OG)

  // ---------------------------------------------------------------------
  // 1) Onboarding + Standort (Baustein 1). Bootstrap legt EG + 1.OG samt
  //    Standard-Aussenwandaufbau «AW Beton 36» an — bleiben hier unbenutzt
  //    (die EFH-Journey baut ihre eigenen Split-Level-Geschosse, Schritt 5).
  // ---------------------------------------------------------------------
  await B.projektStarten(page, szenario);

  // ---------------------------------------------------------------------
  // 2) Parzelle als Boundary (NIE als KF-Zone, SIA-416-Regel 1.2) + Zonenregel
  //    (Baustein 2). `szenario.parzelle.grenzabstand === null` UND
  //    `zonenRegel.grenzabstandKlein` gesetzt → Baustein 2 fährt intern den
  //    Regressions-Anker ROADMAP 153 (Probekörper knapp innerhalb der
  //    Baugrenze, Checks-Text nennt die Zonenregel als Quelle, Probekörper
  //    danach entfernt).
  // ---------------------------------------------------------------------
  await B.parzelleSetzen(page, szenario);

  // ---------------------------------------------------------------------
  // 3) Gestaltungskonzept (H4, Punkt 2): Dossier früh setzen, Raumprogramm
  //    des Wettbewerbs. Ein zweiter, bewusst NICHT gezeichneter Posten
  //    («atelier-gewerbe») prüft später die ehrliche 0 %-Lücke der
  //    Berechnungsliste (Baustein 12, Muster sim-mfh Schritt 6).
  // ---------------------------------------------------------------------
  await page.evaluate(
    (eintraege) => window.__kosmo.run('design.dossierSetzen', { eintraege }),
    szenario.gestaltung.dossier,
  ); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.dossierSetzen']
  await page.evaluate(
    (posten) => window.__kosmo.run('design.raumprogrammSetzen', { posten }),
    [...szenario.raumprogramm, { typ: 'atelier-gewerbe', hnfSoll: 20 }],
  ); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.raumprogrammSetzen']

  // ---------------------------------------------------------------------
  // 4) Volumenstudie (Vorprojekt-Massing, Kern-Toolkette EFH): der grobe
  //    Baukörper vor dem Detailmodell — Breite der Werkzeuge (H4, Punkt 3).
  // ---------------------------------------------------------------------
  const egId = await page.evaluate(() => window.__kosmo.state().activeStoreyId);
  await page.evaluate(
    (storeyId) =>
      window.__kosmo.run('design.volumenErstellen', {
        storeyId,
        outline: [
          { x: 5000, y: 5000 },
          { x: 15000, y: 5000 },
          { x: 15000, y: 13000 },
          { x: 5000, y: 13000 },
        ],
        height: 4300, // Unterer + Oberer Split zusammen (1500 + 2800 mm)
      }),
    egId,
  ); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.volumenErstellen']
  expect(await page.evaluate(() => window.__kosmo.state().doc.byKind('mass').length)).toBe(1);

  // ---------------------------------------------------------------------
  // 5) Hang-Terrain (Baustein 18): gewachsen ~15 % nach Süden, neu
  //    terrassiert (Hangsprung) — fährt bewusst den Nicht-flach-Zweig
  //    (Regel 1.4.4 / Fable-Review-1 Auflage 2).
  // ---------------------------------------------------------------------
  await B.terrainSetzen(page, szenario.geometrie['terrain'] as TerrainProfil);

  // ---------------------------------------------------------------------
  // 6) Split-Level-Geschosse (H4, Punkt 1 — Leitidee bestimmt die Geometrie):
  //    zwei eigene Geschosse, Höhen aus `szenario.geometrie.ebenen`. Kein
  //    genereller Baustein (Geschoss-Erstellung mit freien Massen ist
  //    journey-eigenes Setup, wie das Raumprogramm in sim-mfh Schritt 1).
  // ---------------------------------------------------------------------
  const unterId = await page.evaluate(
    ({ name, elevation, height }) =>
      window.__kosmo.run('design.geschossErstellen', { name, index: 0, elevation, height }).patches[0]!.id,
    { name: unterEbene.name, elevation: unterEbene.hoeheM, height: splitHoeheMm },
  ); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.geschossErstellen']
  const oberId = await page.evaluate(
    ({ name, elevation, height }) =>
      window.__kosmo.run('design.geschossErstellen', { name, index: 1, elevation, height }).patches[0]!.id,
    { name: oberEbene.name, elevation: oberEbene.hoeheM, height: OBERGESCHOSS_RAUMHOEHE_MM },
  );
  expect(await page.evaluate(() => window.__kosmo.state().doc.storeysOrdered().length)).toBe(4); // EG, 1.OG (Bootstrap, unbenutzt) + die 2 Split-Ebenen

  // ---------------------------------------------------------------------
  // 7) Unterer Split (Sichtbeton-Sockel im Hang, `szenario.gestaltung.
  //    material`): Wände (Baustein 4) + Zone (technik/Sockel).
  // ---------------------------------------------------------------------
  await page.click(`[data-testid="storey-${unterEbene.name}"]`); // [Quelle: DesignWorkspace.tsx Z.1476-1486 storey-${s.name}]
  await B.waendeZeichnen(
    page,
    [
      { a: { x: 5000, y: 5000 }, b: { x: 11000, y: 5000 } },
      { a: { x: 11000, y: 5000 }, b: { x: 11000, y: 11000 } },
      { a: { x: 11000, y: 11000 }, b: { x: 5000, y: 11000 } },
      { a: { x: 5000, y: 11000 }, b: { x: 5000, y: 5000 } },
    ],
    'AW',
  );
  await page.evaluate(
    (storeyId) =>
      window.__kosmo.run('design.zoneErstellen', {
        storeyId,
        name: 'Sockel/Technik',
        sia: 'HNF',
        raumTyp: 'technik',
        program: 'eigenheim',
        outline: [
          { x: 5000, y: 5000 },
          { x: 11000, y: 5000 },
          { x: 11000, y: 11000 },
          { x: 5000, y: 11000 },
        ],
      }),
    unterId,
  ); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.zoneErstellen']

  // Möblierung (Kern-Toolkette EFH) — Nasszellen im Sockel.
  await page.evaluate((storeyId) => {
    const k = window.__kosmo;
    k.run('design.moebelSetzen', { storeyId, typ: 'wc', at: { x: 6000, y: 10000 } });
    k.run('design.moebelSetzen', { storeyId, typ: 'lavabo', at: { x: 7500, y: 10000 } });
    k.run('design.moebelSetzen', { storeyId, typ: 'dusche', at: { x: 9500, y: 10000 } });
  }, unterId); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.moebelSetzen']

  // ---------------------------------------------------------------------
  // 8) Split-Level-Treppe (Baustein 6, neu): Steigung aus der Geschosshöhe
  //    des «Unterer Split» (= splitHoeheMm, die Hangsprung-Differenz).
  // ---------------------------------------------------------------------
  await B.treppeSetzen(page, {
    storeyId: unterId,
    a: { x: 9000, y: 6000 },
    b: { x: 9000, y: 8400 },
  });

  // ---------------------------------------------------------------------
  // 9) Oberer Split (Hauptwohnebene, verputzte Holzelement-Obergeschosse):
  //    Wände (Baustein 4) + Zone (wohnen) + grosse Südverglasung (Dossier-
  //    Vorgabe «Südfassade grossen Fensteranteil», H4 Punkt 1) + Möblierung.
  // ---------------------------------------------------------------------
  await page.click(`[data-testid="storey-${oberEbene.name}"]`);
  const [suedwand] = await B.waendeZeichnen(
    page,
    [
      { a: { x: 5000, y: 5000 }, b: { x: 15000, y: 5000 } }, // Südfassade (kleinste y — DesignWorkspace.tsx Z.290-308 elevationSpec: Blick von Süden auf minY)
      { a: { x: 15000, y: 5000 }, b: { x: 15000, y: 13000 } },
      { a: { x: 15000, y: 13000 }, b: { x: 5000, y: 13000 } },
      { a: { x: 5000, y: 13000 }, b: { x: 5000, y: 5000 } },
    ],
    'AW',
  );
  await page.evaluate(
    (storeyId) =>
      window.__kosmo.run('design.zoneErstellen', {
        storeyId,
        name: 'Wohnen/Küche',
        sia: 'HNF',
        raumTyp: 'wohnen',
        program: 'eigenheim',
        outline: [
          { x: 5000, y: 5000 },
          { x: 15000, y: 5000 },
          { x: 15000, y: 13000 },
          { x: 5000, y: 13000 },
        ],
      }),
    oberId,
  );

  const oeffnungenVorher = await page.evaluate(() => window.__kosmo.state().doc.byKind('opening').length);
  const suedfenster = await page.evaluate(
    (wallId) =>
      window.__kosmo.run('design.oeffnungSetzen', {
        wallId,
        openingType: 'fenster',
        center: 5000,
        width: 6000, // grosszügig — deutlich über dem Default (1200 mm), H4 Punkt 1
        height: 2200,
        sill: 200,
      }).patches[0]!.id,
    suedwand,
  ); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.oeffnungSetzen']
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('opening').length))
    .toBe(oeffnungenVorher + 1);
  const suedfensterBreite = await page.evaluate(
    (id) => window.__kosmo.state().doc.byKind('opening').find((o) => o.id === id)?.['width'],
    suedfenster,
  );
  expect(suedfensterBreite).toBeGreaterThan(3000); // Leitidee «grosse Südverglasung» — Geometrie, nicht Behauptung (H4)

  await page.evaluate((storeyId) => {
    const k = window.__kosmo;
    k.run('design.moebelSetzen', { storeyId, typ: 'kuechenzeile', at: { x: 6000, y: 6000 } });
    k.run('design.moebelSetzen', { storeyId, typ: 'esstisch', at: { x: 10000, y: 7000 } });
    k.run('design.moebelSetzen', { storeyId, typ: 'bett-doppel', at: { x: 7000, y: 12000 } });
  }, oberId);
  await page.click('[data-testid="view-2d"]'); // [Quelle: DesignWorkspace.tsx 'view-2d']
  await expect(page.locator('[data-testid="moebel"]').first()).toBeVisible(); // [Quelle: PlanView.tsx Z.416-430]
  expect(await page.evaluate(() => window.__kosmo.state().doc.byKind('furniture').length)).toBe(6); // 3× Unterer Split (Nasszelle) + 3× Oberer Split (Küche/Essen/Schlafen)

  // ---------------------------------------------------------------------
  // 10) Walmdach (Baustein 5, neu) über dem Oberer-Split-Grundriss — V1 kennt
  //     keine eigene Satteldach-Form (SIM-BEFUNDE H-8). Assert Dach im Doc
  //     UND sichtbar in der 3D-Szene; bewusst KEIN 2D-Plansymbol (V2-Lücke
  //     SIM-BEFUNDE H-2).
  // ---------------------------------------------------------------------
  await B.dachSetzen(page, {
    storeyId: oberId,
    outline: [
      { x: 5000, y: 5000 },
      { x: 15000, y: 5000 },
      { x: 15000, y: 13000 },
      { x: 5000, y: 13000 },
    ],
  });

  // ---------------------------------------------------------------------
  // 11) Phasengang Vorprojekt → Bauprojekt → Werkplan (Baustein 3) mit
  //     Monotonie-Assert je Wechsel (nie fixe Pfadzahlen, Regel R1).
  // ---------------------------------------------------------------------
  const nVorprojekt = await B.phaseSchalten(page, 'vorprojekt');
  const nBauprojekt = await B.phaseSchalten(page, 'bauprojekt');
  const nWerkplan = await B.phaseSchalten(page, 'werkplan');
  expect(nBauprojekt).toBeGreaterThanOrEqual(nVorprojekt);
  expect(nWerkplan).toBeGreaterThanOrEqual(nBauprojekt);

  // ---------------------------------------------------------------------
  // 12) Schnitt/Ansicht (Kern-Toolkette EFH): «Ansicht Süd» rechnet
  //     DesignWorkspace.tsx automatisch aus der Wand-Bounding-Box (kein
  //     manueller Schritt); Terrain-Profile darin nur per Attribut geprüft
  //     (Regel 1.4.4 — die EFH-Terrainpunkte liegen alle auf x=0 und
  //     kollabieren auf der Süd-Schnittlinie zu einer Senkrechten, die
  //     Playwright als Bounding-Breite 0 nie «visible» meldet). Den
  //     manuellen «Schnitt»-Linienzug (reiner UI-State ohne Command-
  //     Rückbindung) fährt diese Journey bewusst NICHT — SIM-BEFUNDE H-9.
  // ---------------------------------------------------------------------
  const ansichtSued = page.locator('[data-testid="section-Ansicht Süd"]'); // [Quelle: SectionView.tsx Z.48 / DesignWorkspace.tsx Z.1429 title="Ansicht Süd"]
  await expect(ansichtSued).toBeVisible();
  await expect(ansichtSued.locator('[data-testid="terrain-gewachsen"]')).toHaveAttribute('points', /\d/); // [Quelle: SectionView.tsx Z.66-70]
  await expect(ansichtSued.locator('[data-testid="terrain-neu"]')).toHaveAttribute('points', /\d/);

  // ---------------------------------------------------------------------
  // 13) Sonne: Datum/Stunde + Standort-Label (Kern-Toolkette EFH). Baustein 1
  //     hat das Label schon einmal belegt; hier zusätzlich Datum/Stunde
  //     bedienen (Frühlings-Tagundnachtgleiche — Dossier «passive
  //     Solargewinne» über die grosse Südverglasung).
  // ---------------------------------------------------------------------
  await page.click('[data-testid="sonne-toggle"]'); // [Quelle: DesignWorkspace.tsx Z.1028]
  await expect(page.locator('[data-testid="sonne-standort-label"]')).toContainText(szenario.standort.label); // [Quelle: DesignWorkspace.tsx Z.1298]
  await page.fill('[data-testid="sonne-datum"]', '2026-03-21'); // [Quelle: DesignWorkspace.tsx Z.1302-1308, type=date]
  await expect(page.locator('[data-testid="sonne-datum"]')).toHaveValue('2026-03-21');
  await page.fill('[data-testid="sonne-stunde"]', '12'); // [Quelle: DesignWorkspace.tsx Z.1309-1318, type=range 5–22]
  await expect(page.locator('[data-testid="sonne-stunde"]')).toHaveValue('12');
  await page.click('[data-testid="sonne-toggle"]'); // Panel wieder schliessen — neutraler Zustand

  // ---------------------------------------------------------------------
  // 14) SIA-416: Parzelle bleibt Boundary, NIE KF-Zone (ROADMAP-Fehlgriff/
  //     SIM-BEFUNDE H-1) — die NGF-Kennzahl enthält NUR die HNF-Zonen der
  //     zwei Split-Ebenen (36 + 80 = 116 m²), NICHT die 500 m² grosse
  //     Parzelle (25 × 20 m). Vergleich gegen die Grössenordnung des
  //     Fussabdrucks, nicht gegen die Parzelle (schärfste EFH-Assertion,
  //     Buildplan Abschnitt 2).
  // ---------------------------------------------------------------------
  const parzellenFlaecheM2 = polygonFlaecheM2(szenario.parzelle.outline);
  const fussabdruckM2 = 36 + 80; // Unterer Split (6×6 m) + Oberer Split (10×8 m), exakt wie oben gezeichnet
  expect(fussabdruckM2).toBeLessThan(parzellenFlaecheM2 / 2); // Gegenprobe: die Parzelle ist bewusst viel grösser als das Haus
  await expect
    .poll(
      async () => {
        const text = await page.locator('[data-testid="kennzahlen"]').innerText(); // [Quelle: KennzahlenPanel.tsx Z.32]
        const treffer = text.match(/NGF\D{0,10}([\d'.,]+)\s*m²/); // [Quelle: KennzahlenPanel.tsx Z.84 Row label="NGF"]
        return treffer ? Number(treffer[1]!.replace(/['’]/g, '').replace(',', '.')) : null;
      },
      { message: 'NGF-Zeile im Kennzahlen-Panel nicht lesbar' },
    )
    .toBe(fussabdruckM2); // NGF = Summe der HNF-Zonen, NICHT die Parzellenfläche (Boundary-Modellierung, Baustein 2)

  // ---------------------------------------------------------------------
  // 15) Berechnungsliste: %-Erfüllung. «eigenheim» ist gebaut (> 0 %),
  //     «atelier-gewerbe» (Schritt 3) bleibt geplant, aber ungezeichnet —
  //     ehrliche 0 %-Lücke statt Fake-Erfüllung (Baustein 12).
  // ---------------------------------------------------------------------
  await page.click('[data-testid="liste-toggle"]'); // [Quelle: DesignWorkspace.tsx 'liste-toggle' / sim-mfh.spec.ts Z.72]
  await B.berechnungslistePruefen(page, { gebaut: ['eigenheim'], geplant: ['atelier-gewerbe'] });

  // ---------------------------------------------------------------------
  // 16) Kosmo (Mock-Provider), Dossier-Frage: die Südfassaden-Vorgabe wird
  //     belegt zitiert und lässt sich anspringen (Baustein 13, Modus
  //     «quelle», Muster sim-umbau 6a).
  // ---------------------------------------------------------------------
  await B.kosmoFragen(page, 'Was sagt das Dossier zur Südfassade?', {
    modus: 'quelle',
    chipEnthaelt: 'Dossier GEFORDERT',
    sprungTestid: 'quelle-sprung-dossier',
    sprungEnthaelt: 'Südfassade',
  });

  // ---------------------------------------------------------------------
  // 17) KosmoVis-Render über die (Fake-)Bridge (H3): «Drei Stimmungen» →
  //     Render → Bild am Node → aufs Blatt. Nur bei laufender :8600-Fake-
  //     Bridge (Regel R7); fehlt sie, ehrlich mit Anleitung übersprungen.
  //     Baustein 14 (bewiesen aus einem Aufrufer, H1b).
  // ---------------------------------------------------------------------
  if (await B.bridgeVerfuegbar()) {
    await B.renderUeberBridge(page);
  } else {
    // eslint-disable-next-line no-console
    console.warn(`[sim-efh] Render-Segment übersprungen — ${B.BRIDGE_FEHLT_HINWEIS}`);
  }

  // ---------------------------------------------------------------------
  // 18) Publish + Export als Abschluss (Baustein 16 + 17).
  // ---------------------------------------------------------------------
  await B.blattPublizieren(page, { art: 'plan' });
  await B.exportPruefen(page, 'export-set', /Plansatz\.pdf$/);
});
