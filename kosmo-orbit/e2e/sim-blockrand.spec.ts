import { expect, test } from '@playwright/test';
import * as B from './sim/bausteine';
import { SZENARIEN } from './sim/szenarien';

/**
 * Serie H / H2d — Vollsimulation Blockrandschliessung Basel-Matthäus
 * (`SZENARIEN.blockrand`, `e2e/sim/szenarien.ts`: L-förmige Ecklücke,
 * Wohn- und Geschäftszone WGZ3, Grenzabstand ausschliesslich über die
 * Zonenregel, Hofseite mit grossem Grenzabstand).
 *
 * ── Leitidee (H4, Buildplan Abschnitt 4 — bestimmt die Geometrie) ─────────
 * «L-förmige Ecklücke schliesst die Blockrand-Fluchtlinie zur Strasse; die
 * Hoffassade tritt hinter grossem Grenzabstand zurück»
 * (`szenario.gestaltung.leitidee`). Genau so modelliert: die Baugrenze
 * selbst ist die 6-Punkt-L-Kontur (`szenario.parzelle.outline`); das
 * Strassenschenkel-Volumen trägt die Klinker-Lochfassade zur Strasse
 * (Süd) und eine zurückhaltendere, verputzte Fassade zum Hof (Nord) —
 * seitenrichtig unterschiedliche Fenstermodule (Regressions-Anker 154).
 *
 * ── Regel-Schwerpunkt dieser Journey (Buildplan Abschnitt 2, Zeile
 *    Blockrand) ───────────────────────────────────────────────────────────
 * Batch H2d ist bewusst Regel-lastig (Baugrenze/Grenzabstand/Verstoss):
 * 1) Grenzabstands-Anker ROADMAP 153 — die Baugrenze trägt selbst KEINEN
 *    Grenzabstand (`parzelle.grenzabstand === null`); Baustein 2
 *    (`parzelleSetzen`) prüft automatisch, dass der Befundtext die aktive
 *    Zonenregel «WGZ3» als Quelle benennt.
 * 2) `design.waendeAusZonen` baut aus einer Zone mit dem vollen L-Umriss
 *    ECHTE Wände — Delta-Zählung exakt `outline.length` (6 achsparallele
 *    Kanten, keine geteilt, da nur eine Zone auf dem Geschoss).
 * 3) Verstoss-Probe: eine Wand wird bewusst VOLLSTÄNDIG ausserhalb der
 *    L-Kontur gezeichnet (im ausgeschnittenen Eckbereich zwischen den
 *    beiden Schenkeln) → die Checks melden «ragt über die Baugrenze …
 *    hinaus» (Regel «Baugrenze», nicht «Grenzabstand» — beide Wandpunkte
 *    liegen ausserhalb des Polygons, der Grenzabstands-Zweig in
 *    `derive/checks.ts` überspringt Punkte ausserhalb bewusst). Danach wird
 *    die Wand entfernt (`design.loeschen`) — der Befund verschwindet
 *    wieder.
 * 4) `zone-verletzt` (Regel-Sätze V2-F3, `design.regelnSetzen`): eine
 *    bewusst zu kleine Zimmer-Zone verletzt die ch-wohnbau-Mindestfläche
 *    → die Marker-Fläche im Plan erscheint, nach dem Löschen der Zone
 *    verschwindet sie wieder. WICHTIG (siehe SIM-BEFUNDE H-14): dieser
 *    Marker ist strikt auf Entitäten vom `kind==='zone'` beschränkt
 *    (`PlanView.tsx`) — Baugrenzen-/Grenzabstands-Verstösse vergeben ihre
 *    `entityId` dagegen ausschliesslich an Wand/Volumen/Dach
 *    (`derive/checks.ts`), NIE an eine Zone. Die Wand-über-die-Baugrenze-
 *    Probe (Punkt 3) kann darum den `zone-verletzt`-Marker grundsätzlich
 *    nie auslösen; diese Journey deckt darum BEIDE im Buildplan genannten
 *    Signale mit ihrem jeweils tatsächlich zuständigen Mechanismus ab,
 *    statt sie fälschlich zusammenzulegen.
 *
 * Das reale Strassenschenkel-Volumen (Schritt 5) hält überall ≥ dem
 * Zonenregel-Grenzabstand (3 m) Abstand zur L-Kontur — der 8 m tiefe
 * Strassenschenkel lässt darum nur ein 2 m tiefes, konformes Bauvolumen zu
 * (2× 3 m Grenzabstand vom 8 m tiefen Schenkel abgezogen; V1 kennt keine
 * Seiten-Zuordnung «klein»/«gross», SIM-BEFUNDE H-4) — bewusst so gehalten,
 * damit die Verstoss-Probe (Punkt 3) der EINZIGE Baugrenzen-Befund im
 * Checks-Panel bleibt.
 */

test('Vollsimulation Blockrandschliessung Basel-Matthäus: Parzelle/Zonenregel (Grenzabstand-Anker 153) → Strassen-/Hoffassade → Verstoss-Probe (Baugrenze) → Zonen→Wände (waendeAusZonen) → Regel-Sätze (zone-verletzt) → Themenplan Brandschutz → Kosmo → Bridge-Render → Publikations-Set/Transmittal', async ({
  page,
}) => {
  test.setTimeout(180_000);

  const szenario = SZENARIEN.blockrand;
  const geometrie = szenario.geometrie as {
    lFoermig: boolean;
    schenkelStrasse: { breite: number; tiefe: number };
    schenkelHof: { breite: number; tiefe: number };
  };

  // ---------------------------------------------------------------------
  // 1) Onboarding + Standort (Baustein 1).
  // ---------------------------------------------------------------------
  await B.projektStarten(page, szenario);

  // ---------------------------------------------------------------------
  // 2) L-förmige Baugrenze (6-Punkt-Kontur, `grenzabstand: null` →
  //    Zonenregel-Grenzabstand, `mehrHoehenAb`/`mehrHoehenAnteil` gesetzt)
  //    + Zonenregel WGZ3 (Baustein 2). Deckt automatisch den
  //    Grenzabstands-Anker ROADMAP 153 (Befundtext benennt die Zonenregel
  //    als Quelle) über einen internen Probekörper, der danach wieder
  //    entfernt wird.
  // ---------------------------------------------------------------------
  await B.parzelleSetzen(page, szenario);

  const egId = (await page.evaluate(() => window.__kosmo.state().activeStoreyId))!;

  // Mehrhöhen-Bonus (Fable-Review-1, Auflage 3) tatsächlich am Boundary-
  // Entity verankert, nicht nur durchgereicht.
  const grenze = await page.evaluate(
    (storeyId) =>
      window.__kosmo
        .state()
        .doc.byKind('boundary')
        .find((b) => b.storeyId === storeyId) ?? null,
    egId,
  );
  expect((grenze as unknown as { mehrHoehen?: { abHoehe: number; anteil: number } } | null)?.mehrHoehen).toEqual({
    abHoehe: szenario.parzelle.mehrHoehenAb,
    anteil: szenario.parzelle.mehrHoehenAnteil,
  });

  // ---------------------------------------------------------------------
  // 2b) Verstoss-Probe (Regel-Kern) — bewusst JETZT, am leeren Modellstand
  //    (nur die Baugrenze existiert), damit der Baugrenzen-Verstoss der
  //    EINZIGE Befund ist und nicht durch andere Befunde aus dem
  //    `befunde.slice(0,6)`-Fenster des Panels gedrängt wird (SIM-BEFUNDE
  //    H-15/H-17). Eine Wand VOLLSTÄNDIG ausserhalb der L-Baugrenze (im
  //    ausgeschnittenen Eckbereich x:10000-13000/y:10000 — die Kontur liegt
  //    dort bei y=8000 bzw. x=8000, der Punkt also klar ausserhalb) → die
  //    Checks melden «ragt über die Baugrenze … hinaus» (Regel «Baugrenze»).
  //    Danach die Wand per `design.loeschen` entfernen → Befund verschwindet.
  // ---------------------------------------------------------------------
  const verstossWandId = await page.evaluate((storeyId) => {
    const k = window.__kosmo;
    const aw = k.state().doc.byKind('assembly').find((a) => a.name?.startsWith('AW'))!;
    return k.run('design.wandZeichnen', {
      storeyId,
      a: { x: 10000, y: 10000 },
      b: { x: 13000, y: 10000 },
      assemblyId: aw.id,
    }).patches[0]!.id;
  }, egId); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.wandZeichnen']

  await expect
    .poll(
      async () => {
        const befund = await B.checksLesen(page);
        return befund?.text.includes('ragt über die Baugrenze «Baugrenze» hinaus') ?? false;
      },
      { timeout: 10_000, message: 'Baugrenzen-Verstoss erscheint nicht im Checks-Panel' },
    )
    .toBe(true); // [Quelle: packages/kosmo-kernel/src/derive/checks.ts regel:'Baugrenze' Z.363-372]

  await page.evaluate((id) => window.__kosmo.run('design.loeschen', { entityId: id }), verstossWandId);

  await expect
    .poll(
      async () => {
        const befund = await B.checksLesen(page);
        return befund?.text.includes('ragt über die Baugrenze') ?? false;
      },
      { timeout: 10_000, message: 'Baugrenzen-Verstoss verschwindet nach Entfernen der Wand nicht' },
    )
    .toBe(false);

  // ---------------------------------------------------------------------
  // 3) Gestaltungskonzept (H4, Punkt 2): Dossier + Raumprogramm früh setzen.
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
  // 4) Strassen-/Hoffassade (H4, Punkt 1 — Leitidee bestimmt die Geometrie):
  //    Baustein 4 (Wände) + `design.volumenErstellen` + Baustein 8
  //    (Fassadenmodule). Marge = Zonenregel-Grenzabstand auf allen Seiten
  //    (siehe Kopf-Kommentar) — dieses Volumen bleibt Baugrenzen-konform.
  // ---------------------------------------------------------------------
  const inset = szenario.zonenRegel.grenzabstandKlein!;
  const { breite: strBreite, tiefe: strTiefe } = geometrie.schenkelStrasse;
  const bx0 = inset;
  const bx1 = strBreite - inset;
  const by0 = inset;
  const by1 = strTiefe - inset;

  const [suedWandId, , nordWandId] = await B.waendeZeichnen(
    page,
    [
      { a: { x: bx0, y: by0 }, b: { x: bx1, y: by0 } }, // Süd = Strassenfassade (Klinker-Lochfassade)
      { a: { x: bx1, y: by0 }, b: { x: bx1, y: by1 } },
      { a: { x: bx1, y: by1 }, b: { x: bx0, y: by1 } }, // Nord = Hoffassade (tritt zurück, verputzt)
      { a: { x: bx0, y: by1 }, b: { x: bx0, y: by0 } },
    ],
    'AW',
  );

  const massId = await page.evaluate(
    ({ storeyId, bx0, bx1, by0, by1, hoehe }) =>
      window.__kosmo.run('design.volumenErstellen', {
        storeyId,
        outline: [
          { x: bx0, y: by0 },
          { x: bx1, y: by0 },
          { x: bx1, y: by1 },
          { x: bx0, y: by1 },
        ],
        height: hoehe,
        program: 'marktgerecht',
      }).patches[0]!.id,
    { storeyId: egId, bx0, bx1, by0, by1, hoehe: 3000 },
  ); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.volumenErstellen']

  const suedModul: B.FassadenModulDef = {
    name: 'Fassade Strasse Klinker',
    breite: 2000,
    hoehe: 3000,
    elemente: [{ x: 200, y: 900, b: 1400, h: 1500, typ: 'fenster' }],
  };
  const nordModul: B.FassadenModulDef = {
    name: 'Fassade Hof verputzt',
    breite: 2000,
    hoehe: 3000,
    elemente: [{ x: 800, y: 1000, b: 500, h: 1100, typ: 'fenster' }],
  };
  await B.fassade(page, {
    storeyId: egId,
    massId,
    kanten: { sued: 1, ost: 2, nord: 3, west: 4 },
    module: { sued: suedModul, nord: nordModul },
    vorgabe: suedModul.name,
    waende: { sued: [suedWandId], nord: [nordWandId] },
  });

  // ---------------------------------------------------------------------
  // 5) Interne Treppe (Baustein 6) + Treppenhaus-Zone (journey-eigen, wie
  //    das Raumprogramm in sim-mfh Schritt 1) — Vorbereitung für den
  //    Themenplan Brandschutz (Schritt 12).
  // ---------------------------------------------------------------------
  await B.treppeSetzen(page, { storeyId: egId, a: { x: 6000, y: 4000 }, b: { x: 9000, y: 4000 }, width: 1200 });
  await page.evaluate(
    (storeyId) =>
      window.__kosmo.run('design.zoneErstellen', {
        storeyId,
        name: 'Treppenhaus',
        sia: 'VF',
        raumTyp: 'treppenhaus',
        outline: [
          { x: 6000, y: 3000 },
          { x: 9000, y: 3000 },
          { x: 9000, y: 5000 },
          { x: 6000, y: 5000 },
        ],
      }),
    egId,
  ); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.zoneErstellen']

  // ---------------------------------------------------------------------
  // 6) Kosmo-Station A (Baustein 13, Modus «quelle»): das Dossier-NO-GO zur
  //    Hoffassade wird belegt zitiert und lässt sich anspringen (H4, Punkt 2).
  // ---------------------------------------------------------------------
  await B.kosmoFragen(page, 'Was sagt das Dossier zur Hoffassade?', {
    modus: 'quelle',
    chipEnthaelt: 'Dossier NO-GO',
    sprungTestid: 'quelle-sprung-dossier',
    sprungEnthaelt: 'Hoffassade',
  });

  // ---------------------------------------------------------------------
  // 8) Phasengang Vorprojekt → Bauprojekt → Werkplan (Baustein 3) mit
  //    Monotonie-Assert am selben Modellstand (Regel R1: nie fixe
  //    Pfadzahlen). Der Kosmo-Quellensprung (Schritt 6) hat die Ansicht auf
  //    die Dossier-Quelle geführt — vor dem plan-lesenden Baustein 3 zurück
  //    in die KosmoDesign-2D-Ansicht (sonst ist `planview` nicht gemountet).
  // ---------------------------------------------------------------------
  await page.evaluate(() => window.__kosmo.open('design'));
  await page.click('[data-testid="view-2d"]'); // [Quelle: DesignWorkspace.tsx view-${id} / bausteine.ts Baustein 1]
  await expect(page.locator('[data-testid="planview"]')).toBeVisible();
  const pfadeVorprojekt = await B.phaseSchalten(page, 'vorprojekt');
  const pfadeBauprojekt = await B.phaseSchalten(page, 'bauprojekt');
  const pfadeWerkplan = await B.phaseSchalten(page, 'werkplan');
  expect(pfadeBauprojekt).toBeGreaterThanOrEqual(pfadeVorprojekt);
  expect(pfadeWerkplan).toBeGreaterThanOrEqual(pfadeBauprojekt);

  // ---------------------------------------------------------------------
  // 9) Regelgeschoss aus Zonen (1.OG): eine Zone über den GESAMTEN
  //    L-Umriss (raumTyp gesetzt, `program` gesetzt — Wohnungs-Aggregat,
  //    nimmt sich damit bewusst aus den Raumtyp-Richtwerten heraus, siehe
  //    `derive/checks.ts` Z.70 `if (z.program) continue`) → Kosmo-Station B
  //    (Baustein 13, Modus «vorschlag»: der bewiesene Mock-Intent
  //    „wände…bauen" ruft `design_waendeAusZonen` mit der aktiven
  //    Geschoss-ID auf, `packages/kosmo-ai/src/provider.ts`). Assert:
  //    Delta = EXAKT die `outline.length` (6) achsparallelen Umriss-Kanten
  //    — keine mehr, keine weniger (Delta-Zählung, kein Fixwert).
  // ---------------------------------------------------------------------
  const storeys = await page.evaluate(() => window.__kosmo.state().doc.storeysOrdered());
  const ogId = storeys.find((s) => s.name === '1.OG')!.id; // Bootstrap-1.OG (project-store.ts bootstrapProject)
  await page.click('[data-testid="storey-1.OG"]'); // [Quelle: apps/kosmo-orbit/src/modules/design/DesignWorkspace.tsx storey-${s.name}]

  await page.evaluate(
    ({ storeyId, outline }) =>
      window.__kosmo.run('design.zoneErstellen', {
        storeyId,
        name: 'Regelgeschoss',
        sia: 'HNF',
        raumTyp: 'wohnen',
        program: 'marktgerecht',
        outline,
      }),
    { storeyId: ogId, outline: szenario.parzelle.outline },
  );

  const waendeVorGlobal = await page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length);
  await B.kosmoFragen(page, 'Baue die Wände aus den Zonen', {
    modus: 'vorschlag',
    nachher: () => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length),
    erwartetWert: waendeVorGlobal + szenario.parzelle.outline.length, // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.waendeAusZonen' Z.1184]
  });

  // ---------------------------------------------------------------------
  // 10) Regel-Sätze (V2-F3, `design.regelnSetzen`): eine bewusst zu kleine
  //     Zimmer-Zone (2×2 m, weit unter der ch-wohnbau-Mindestfläche 10 m²)
  //     verletzt die Regel → `zone-verletzt` erscheint im Plan (Muster
  //     module.spec.ts «Regel-Sätze»); nach dem Löschen der Zone
  //     verschwindet die Markierung wieder. Kein Konflikt mit dem
  //     Regelgeschoss (Schritt 9): dessen Zone trägt `program`, ist also
  //     von den Raumtyp-Richtwerten ausgenommen (s.o.).
  // ---------------------------------------------------------------------
  await page.evaluate(() => window.__kosmo.run('design.regelnSetzen', { preset: 'ch-wohnbau' })); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.regelnSetzen']
  const kleinZoneId = await page.evaluate(
    (storeyId) =>
      window.__kosmo.run('design.zoneErstellen', {
        storeyId,
        name: 'Zu kleines Zimmer',
        sia: 'HNF',
        raumTyp: 'zimmer',
        outline: [
          { x: 9000, y: 9000 },
          { x: 11000, y: 9000 },
          { x: 11000, y: 11000 },
          { x: 9000, y: 11000 },
        ],
      }).patches[0]!.id,
    ogId,
  );
  await page.click('[data-testid="view-2d"]');
  await expect(page.locator('[data-testid="zone-verletzt"]')).toHaveCount(1, { timeout: 10_000 }); // [Quelle: e2e/module.spec.ts Z.828 / apps/kosmo-orbit/src/modules/design/PlanView.tsx Z.438]

  await page.evaluate((id) => window.__kosmo.run('design.loeschen', { entityId: id }), kleinZoneId);
  await expect(page.locator('[data-testid="zone-verletzt"]')).toHaveCount(0, { timeout: 10_000 });

  // ---------------------------------------------------------------------
  // 11) KosmoVis-Render über die (Fake-)Bridge (H3): «Drei Stimmungen» →
  //     Render → Bild am Node → aufs Blatt. Nur bei laufender :8600-Bridge
  //     (Regel R7); fehlt sie, wird das Segment ehrlich mit Anleitung
  //     übersprungen — kein stiller Pass.
  // ---------------------------------------------------------------------
  if (await B.bridgeVerfuegbar()) {
    await B.renderUeberBridge(page);
  } else {
    // eslint-disable-next-line no-console
    console.warn(`[sim-blockrand] Render-Segment übersprungen — ${B.BRIDGE_FEHLT_HINWEIS}`);
  }

  // ---------------------------------------------------------------------
  // 12) Themenplan Brandschutz (Muster sim-mfh Schritt 7b): das
  //     Treppenhaus (Schritt 5, auf dem EG) wird rot getönt, die Legende
  //     trägt Titel + Label. Zurück in die Design-Station und aufs EG
  //     (Schritt 11 kann in die «vis»-Station gewechselt haben), damit der
  //     platzierte Grundriss die Treppenhaus-Zone zeigt.
  // ---------------------------------------------------------------------
  await page.evaluate(() => window.__kosmo.open('design'));
  await page.click('[data-testid="storey-EG"]');
  await page.evaluate(() => {
    window.__kosmo.run('design.themenPlanSpeichern', {
      name: 'Brandschutz',
      regeln: [{ kriterium: 'raumTyp', wert: 'treppenhaus', farbe: '#cc3322', label: 'Fluchtweg' }],
    });
  }); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.themenPlanSpeichern' / e2e/sim-mfh.spec.ts Schritt 7b]
  await B.blattPublizieren(page, { thema: 'Brandschutz' });
  const sheetCanvas = page.locator('[data-testid="sheet-canvas"]');
  await expect(sheetCanvas).toContainText('Brandschutz');
  await expect(sheetCanvas).toContainText('Fluchtweg'); // Themenplan-Legende

  // ---------------------------------------------------------------------
  // 13) Publikations-Set mit Transmittal (Muster e2e/module.spec.ts
  //     «Plan-Revisionen» Z.1791-1798): Set speichern, dann die
  //     Begleitliste als CSV herunterladen.
  // ---------------------------------------------------------------------
  await page.fill('[data-testid="pubset-name"]', 'Blockrand'); // [Quelle: apps/kosmo-orbit/src/modules/publish/PublishWorkspace.tsx Z.444]
  await page.click('[data-testid="pubset-speichern"]'); // [Quelle: PublishWorkspace.tsx Z.450]
  await expect(page.locator('[data-testid="pubset-karte"]')).toHaveCount(1); // [Quelle: PublishWorkspace.tsx Z.398]
  await expect(page.locator('[data-testid="pubset-karte"]')).toContainText('Blockrand');
  const [transmittal] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="pubset-transmittal"]'), // [Quelle: PublishWorkspace.tsx Z.416-429]
  ]);
  expect(transmittal.suggestedFilename()).toBe('Blockrand-Transmittal.csv');

  // ---------------------------------------------------------------------
  // 14) Export als Abschluss (Baustein 17): Plansatz-PDF.
  // ---------------------------------------------------------------------
  await B.exportPruefen(page, 'export-set', /Plansatz\.pdf$/);
});
