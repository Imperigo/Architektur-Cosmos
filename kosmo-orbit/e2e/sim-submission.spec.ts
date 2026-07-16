import { expect, test } from '@playwright/test';
import * as B from './sim/bausteine';
import { SZENARIEN } from './sim/szenarien';

/**
 * V1.6 Block C6 — E2E-Simulationslauf «Submissions-Testlauf»
 * (`docs/SUBMISSION-KONZEPT.md`, Abschnitt «E2E-Simulation
 * Submissions-Testlauf»): die Owner-Alltagssituation als beweisbarer
 * Testlauf — ein Projektstand wird submissionsreif gemacht, als DXF
 * ausgeschrieben, der (simulierte) Unternehmer-Rücklauf zeigt EINE
 * verschobene Wand, Kosmo schlägt sie als Stufe-1-Karte vor, der Architekt
 * übernimmt sie über denselben `runCommand`-Weg wie jeder andere Klick.
 *
 * Zwei Wege werden dafür direkt aus den bewährten Nachbar-Tests übernommen:
 * - Der Export→Mutation→Import→Karte-anwenden-Weg ist WORTGLEICH das
 *   C4b-Muster aus `unternehmerplan.spec.ts` (dritter Test): zwei WEIT
 *   auseinander liegende, freistehende Wände mit einem eigenen
 *   Ein-Schicht-Aufbau (300 mm, eine `tragend`-Schicht) — jede
 *   TRAGEND-Poché-Region bleibt ein 4-Vertex-Rechteck, robust genug für
 *   einen gezielten String-Edit im rohen DXF-Text (EIN Ring-Vertexpaar,
 *   +50 mm in X, exakt eine Kante).
 * - `submissionsreifePruefen` (Baustein 19, `e2e/sim/bausteine.ts`) ist die
 *   einzige NEUE Journey-Baustein-Ergänzung dieses Batches; `phaseSchalten`
 *   (Baustein 3) existierte schon (`design.phaseSetzen`) und wird
 *   unverändert wiederverwendet.
 *
 * ── Ehrlich nicht abgebildet (Konzept-Ablaufskizze §»E2E-Simulation«) ─────
 * Die Konzept-Skizze nennt zusätzlich `unternehmerplanImportieren` und
 * `diffKartenPruefen`/`diffKarteAnwenden` als mögliche neue Bausteine sowie
 * eine zweite, NEUE Aussparung (400×400) im Rücklauf. Beides fährt dieser
 * Test NICHT als eigene Bausteine: der bestehende `exportPruefen` (Baustein
 * 17) plus der reine `filechooser`/Panel-Weg aus `unternehmerplan.spec.ts`
 * decken denselben Ablauf bereits ab, und eine zusätzliche Aussparung würde
 * eine zweite, unabhängige Diff-Karte erzeugen, die den robusten
 * „GENAU-eine-Stufe-1-Karte"-Beweis (`.first()` auf den Anwenden-Knopf)
 * unnötig verkompliziert — dieselbe Testdoktrin, die schon C4b für sich in
 * Anspruch nimmt. Schritt 9 der Konzept-Skizze («unklassierte
 * Layer/INSERT-Meldungen leer») wird 1:1 als Ehrlichkeits-Assert auf den
 * Bericht-Text gefahren (`importBerichtText` schreibt wörtlich «Alle Layer
 * klassiert.», wenn `bericht.layerUnklassiert` leer ist).
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[] };
      state: () => {
        activeStoreyId: string | null;
        doc: {
          byKind: (k: string) => { id: string; name?: string }[];
          // Wandachsen-Assertionen (Schritt 7/8) — Vorbild
          // `unternehmerplan.spec.ts` Z.33-35.
          get: (id: string) => { a: { x: number; y: number }; b: { x: number; y: number } } | undefined;
        };
      };
    };
  }
}

test('Submissions-Testlauf: vorprojekt → Werkplan-Reife → DXF-Ausschreibung → Unternehmer-Rücklauf → Karte anwenden → Undo', async ({
  page,
}) => {
  test.setTimeout(180_000);

  const szenario = SZENARIEN.stadthaus;

  // ---------------------------------------------------------------------
  // 1) projektStarten (Baustein 1) + zwei weit getrennte Einzelwände mit
  //    EIGENEM Aufbau, über den gesegneten `__kosmo.run`-Weg — exaktes
  //    C4b-Muster (`unternehmerplan.spec.ts`, dritter Test). Danach Phase
  //    explizit auf «vorprojekt» — der Doc-Default ist «werkplan»
  //    (`defaultSettings.phase`, volle Detaillierung ab Bootstrap); die
  //    Owner-Alltagssituation beginnt aber VOR der Submission, im
  //    Vorprojekt-Stand.
  // ---------------------------------------------------------------------
  await B.projektStarten(page, szenario);

  const { wallAId, wallBId } = await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    const auf = k.run('design.aufbauErstellen', {
      name: 'Submission-Testwand 300',
      target: 'wall',
      layers: [{ material: 'beton', thickness: 300, function: 'tragend' }],
    });
    const aid = (auf.patches[0] as { id: string }).id;
    const a = k.run('design.wandZeichnen', {
      storeyId: st.activeStoreyId,
      a: { x: 0, y: 0 },
      b: { x: 4000, y: 0 },
      assemblyId: aid,
    });
    const b = k.run('design.wandZeichnen', {
      storeyId: st.activeStoreyId,
      a: { x: 0, y: 20000 },
      b: { x: 4000, y: 20000 },
      assemblyId: aid,
    });
    return { wallAId: a.patches[0]!.id, wallBId: b.patches[0]!.id };
  });
  expect(await page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length)).toBe(2);

  await B.phaseSchalten(page, 'vorprojekt');

  // ---------------------------------------------------------------------
  // 2) Submissionsreife-Check (Baustein 19) im Vorprojekt-Stand: beide
  //    Wände sind vollständig aufgebaut (Material+Dicke benannt), also
  //    liefert `pruefeSubmissionsreife` GENAU den Phasen-Hinweis («Submission
  //    verlangt Werkplan-Detaillierung», SIA 400 Planfolge) — kein
  //    Bauteil-Befund.
  // ---------------------------------------------------------------------
  const lueckenVorprojekt = await B.submissionsreifePruefen(page, { mindestensLuecken: 1 });
  expect(
    lueckenVorprojekt.some((b) => b.text.includes('Submission verlangt Werkplan-Detaillierung')),
    `Phasen-Hinweis fehlt in:\n${JSON.stringify(lueckenVorprojekt, null, 2)}`,
  ).toBe(true);

  // ---------------------------------------------------------------------
  // 3) Auf Werkplan schalten (Baustein 3, `design.phaseSetzen`) — beide
  //    Wände tragen bereits einen vollständigen Ein-Schicht-Aufbau, keine
  //    Zonen/Öffnungen offen: die Lückenliste wird LEER. Submissionsreife
  //    erreicht.
  // ---------------------------------------------------------------------
  await B.phaseSchalten(page, 'werkplan');
  await B.submissionsreifePruefen(page, { keineLuecken: true });

  // ---------------------------------------------------------------------
  // 4) Submissions-Plansatz als DXF exportieren (Baustein 17, Regel R10:
  //    Promise.all statt click-dann-warten, bereits in `exportPruefen`).
  // ---------------------------------------------------------------------
  const dxfPfad = await B.exportPruefen(page, 'export-dxf', /\.dxf$/);
  const { readFileSync } = await import('node:fs');
  const dxfText = readFileSync(dxfPfad, 'utf-8');

  // ---------------------------------------------------------------------
  // 5) Rücklauf-Fixture: EIN Kantenpaar von Wand A um +50 mm versetzt —
  //    exaktes C4b-Muster (`unternehmerplan.spec.ts`, dritter Test, Z.198-
  //    222). Wand A (y≈0) liegt als LETZTE POLYLINE-Entity vor ENDSEC
  //    (Wand B, y≈20000, kommt zuerst) — eindeutig identifizierbar. Nur die
  //    zwei VERTEX-Einträge mit Gruppencode 20 (Y) = -150 (die lange Kante
  //    bei Welt-y=150 — DXF spiegelt y) werden verschoben, Code 10 (X)
  //    davor um +50 erhöht. Reiner deterministischer String-Edit, kein
  //    externes Binärmaterial.
  // ---------------------------------------------------------------------
  const marker = '0\nPOLYLINE';
  const start = dxfText.lastIndexOf(marker);
  const ende = dxfText.indexOf('0\nENDSEC', start);
  expect(start).toBeGreaterThan(0);
  expect(ende).toBeGreaterThan(start);
  const ringBlock = dxfText.slice(start, ende);

  const zeilen = ringBlock.split('\n');
  let getroffen = 0;
  for (let i = 0; i < zeilen.length; i++) {
    if (zeilen[i] === '20' && zeilen[i + 1] === '-150' && zeilen[i - 2] === '10') {
      zeilen[i - 1] = String(Number(zeilen[i - 1]) + 50);
      getroffen += 1;
    }
  }
  expect(getroffen).toBe(2); // genau die zwei Vertices der einen Kante
  const editiertesDxf = dxfText.slice(0, start) + zeilen.join('\n') + dxfText.slice(ende);

  // ---------------------------------------------------------------------
  // 6) Unternehmer-Rücklauf laden — echter Dateiwahl-Dialog (`filechooser`),
  //    wie import-ifc/splat-werkzeug (Splat-Fusion, v0.8.1/P4, vormals
  //    import-splat)/unternehmerplan.spec.ts (der dynamisch
  //    erzeugte `<input type="file">` hängt nie im DOM, `setInputFiles`
  //    griffe ins Leere). Panel sichtbar, Bericht-Text da.
  // ---------------------------------------------------------------------
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('[data-testid="import-dxf"]'),
  ]);
  await chooser.setFiles({
    name: 'unternehmer-submission.dxf',
    mimeType: 'application/dxf',
    buffer: Buffer.from(editiertesDxf, 'utf-8'),
  });

  const erfolg = page.locator('[data-testid="meldung-erfolg"]').first();
  await expect(erfolg).toBeVisible({ timeout: 10_000 });
  await expect(erfolg).toContainText(/Vorschlag|Quote/);

  const panel = page.locator('[data-testid="unternehmerplan-panel"]');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText(/Vorschlag|Quote/);

  const anwendenKnoepfe = panel.locator('[data-testid^="karte-anwenden-"]');
  await expect(anwendenKnoepfe).toHaveCount(1); // GENAU eine Stufe-1-Karte — die eine verschobene Kante

  // ---------------------------------------------------------------------
  // 7) Stufe-1-Karte anwenden (C-E4): läuft über `runCommand`
  //    (`design.verschieben`), derselbe Weg wie jeder andere Klick/Kosmo-
  //    Vorschlag. Doc-Assert per `expect.poll` (Regel R3).
  // ---------------------------------------------------------------------
  const vorher = await page.evaluate((id) => window.__kosmo.state().doc.get(id)!, wallAId);
  expect(vorher.a).toEqual({ x: 0, y: 0 });
  expect(vorher.b).toEqual({ x: 4000, y: 0 });

  await anwendenKnoepfe.first().click();
  await expect
    .poll(() => page.evaluate((id) => window.__kosmo.state().doc.get(id)!.a, wallAId))
    .toEqual({ x: 50, y: 0 });
  const nachAnwenden = await page.evaluate((id) => window.__kosmo.state().doc.get(id)!, wallAId);
  expect(nachAnwenden.b).toEqual({ x: 4050, y: 0 });
  await expect(page.locator('[data-testid="meldung-erfolg"]').last()).toContainText('übernommen');

  // Wand B (weit entfernt, nicht Teil des Befunds) bleibt unangetastet.
  const wandB = await page.evaluate((id) => window.__kosmo.state().doc.get(id)!, wallBId);
  expect(wandB.a).toEqual({ x: 0, y: 20000 });
  expect(wandB.b).toEqual({ x: 4000, y: 20000 });

  // ---------------------------------------------------------------------
  // 8) Undo — derselbe globale Verlauf wie jede andere Modelländerung,
  //    exakt zurück.
  // ---------------------------------------------------------------------
  await page.click('[data-testid="undo"]');
  await expect
    .poll(() => page.evaluate((id) => window.__kosmo.state().doc.get(id)!.a, wallAId))
    .toEqual({ x: 0, y: 0 });
  const nachUndo = await page.evaluate((id) => window.__kosmo.state().doc.get(id)!, wallAId);
  expect(nachUndo.b).toEqual({ x: 4000, y: 0 });

  // ---------------------------------------------------------------------
  // 9) Ehrlichkeits-Assert: der eigene Export nutzt ausschliesslich
  //    bekannte Layer (`LAYER_REGELN` in `dxf/export.ts`) — der mutierte
  //    Rücklauf verschiebt nur Vertices, keine Layer. `importBerichtText`
  //    schreibt darum wörtlich «Alle Layer klassiert.» — NIE eine
  //    verschwiegene/erfundene Lücke (Konzept-Ablaufskizze Schritt 10).
  // ---------------------------------------------------------------------
  await expect(panel).toContainText('Alle Layer klassiert.');

  // ---------------------------------------------------------------------
  // 10) Beweis-Screenshot des fertigen Testlaufs.
  // ---------------------------------------------------------------------
  await page.screenshot({ path: 'e2e-results/sim-submission-fertig.png' });
});
