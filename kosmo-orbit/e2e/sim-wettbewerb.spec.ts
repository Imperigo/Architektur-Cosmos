import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import * as B from './sim/bausteine';
import { SZENARIEN } from './sim/szenarien';

/**
 * D6 (Nacht v0.6.2, `docs/WETTBEWERB-KONZEPT.md` Grundlagenphase) — der
 * Wettbewerbs-Testlauf spannt die vier D-Bausteine dieser Nacht zu EINER
 * Dramaturgie: Grundlagen setzen → die Extremvarianten-Studie über den
 * Kosmo-/Command-Weg anstossen (D4, `grundlagen.volumenstudie`) und als
 * atomare Undo-Gruppe beweisen → das StudienPanel zeigt dieselbe
 * Zonenregel-Herkunft (D1) und den Parallel-Achsen-Vergleich (V3/F4) → der
 * Bericht (D5) fasst Zonenregel, Programm-Erfüllung (D2/D3) und die
 * Ehrlichkeits-Zeile in einem SVG zusammen.
 *
 * Vorbilder: `sim-submission.spec.ts` (Akt-Dramaturgie, `data-testid="undo"`-
 * Weg, Download-Muster) und `e2e/studienbericht.spec.ts` (StudienPanel-
 * Bootstrap, `studie-bericht`-Download). `e2e/sim/bausteine.ts` bleibt bis
 * auf EINE Ergänzung unangetastet (API-Freeze, Kommentarkopf der Datei):
 * Baustein 20 `grundlagenStudieAusfuehren` fährt den `grundlagen.
 * volumenstudie`-Command genau wie jeder andere Baustein Commands fährt
 * (`__kosmo.run`) und liefert die entstandenen Studien-Körper-IDs zurück.
 *
 * ── Ehrliche Abweichungen von der Konzept-Ablaufskizze ────────────────────
 * - `packages/kosmo-kernel/src/model/regelpresets.ts` hält NUR Raumtyp-
 *   Richtwerte (ch-wohnbau/wettbewerb, Zimmer-/Wohnungsgrössen) — keine
 *   Zonenrecht-Presets (AZ/Höhe/Grenzabstand). Ein «echtes CH-Preset» für
 *   `design.zonenRegelSetzen` kommt darum aus `SZENARIEN.mfh.zonenRegel`
 *   («W4, Zürich-Altstetten») — derselben Quelle, die `parzelleSetzen`
 *   (Baustein 2) für jede andere sim-Journey schon nutzt.
 * - Für die Parzellenfläche gibt es KEINEN eigenen Command — sie ist ein
 *   Parameter VON `design.zonenRegelSetzen` (`parzellenFlaeche`, m²) und
 *   wird hier direkt mitgegeben (960 m², real aus dem 40×24-m-Rechteck der
 *   Szenario-Parzelle gerechnet), nicht in einem separaten Schritt gesetzt.
 * - Die Parzelle wird als ZONE gezeichnet (`design.zoneErstellen`), NICHT
 *   als Baugrenze (`design.baugrenzeSetzen`): `grundlagen.volumenstudie`
 *   und das StudienPanel lösen das Baufeld beide über «die zuletzt
 *   gezeichnete Zone des Geschosses» auf (`commands/grundlagen.ts`
 *   `loeseStudieAuf`) — eine Baugrenze wäre hier wirkungslos.
 * - Redo hat im Produkt kein eigenes Test-Id (`DesignWorkspace.tsx`
 *   Z.1305-1315, «↪ Wiederholen» ist ein Klartext-Knopf) — Text-Locator via
 *   `getByRole`, keine erfundene `data-testid` (Regel R2/R7-Nachbarschaft,
 *   dieselbe Ehrlichkeit, die `freemesh.spec.ts` Z.201-205 dokumentiert).
 */

test('Wettbewerbs-Testlauf: Grundlagen → Kosmo-Studie als atomare Undo-Gruppe → Matrix + Regel-Hinweis → Bericht', async ({
  page,
}) => {
  test.setTimeout(180_000);

  const szenario = SZENARIEN.mfh;

  // ---------------------------------------------------------------------
  // Akt 1 — Grundlagen: Projekt + Standort (Baustein 1), Zonenregel
  // inklusive Parzellenfläche (echtes CH-Preset «W4, Zürich-Altstetten»,
  // s. Abweichungs-Hinweis oben), Parzelle als Zone (Baufeld), Raumprogramm.
  // ---------------------------------------------------------------------
  await B.projektStarten(page, szenario);
  const storeyId = await page.evaluate(() => window.__kosmo.state().activeStoreyId);
  expect(storeyId).not.toBeNull();

  const parzellenFlaecheM2 = 960; // 40 m × 24 m (Szenario-Parzellenumriss, real gerechnet)

  await page.evaluate(
    ({ zonenRegel, parzellenFlaecheM2 }) => {
      window.__kosmo.run('design.zonenRegelSetzen', { ...zonenRegel, parzellenFlaeche: parzellenFlaecheM2 });
    },
    { zonenRegel: szenario.zonenRegel, parzellenFlaecheM2 },
  ); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.zonenRegelSetzen' Z.1806-1841]

  await page.evaluate(
    ({ storeyId, outline }) => {
      window.__kosmo.run('design.zoneErstellen', { storeyId, name: 'Parzelle', sia: 'KF', outline });
    },
    { storeyId, outline: szenario.parzelle.outline },
  ); // [Quelle: e2e/studienbericht.spec.ts Z.27-38 / e2e/module.spec.ts Z.251-255 'design.zoneErstellen']

  await page.evaluate(
    (posten) => window.__kosmo.run('design.raumprogrammSetzen', { posten }),
    szenario.raumprogramm,
  ); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.raumprogrammSetzen' Z.1138-1166]

  const zonenAnzahl = await page.evaluate(() => window.__kosmo.state().doc.byKind('zone').length);
  expect(zonenAnzahl, 'Parzelle als Zone muss die einzige Zone im Geschoss sein (Baufeld-Konvention)').toBe(1);

  // ---------------------------------------------------------------------
  // Akt 2 — Studie über den Kosmo-/Command-Weg: `grundlagen.volumenstudie`
  // (D4, Baustein 20) löst Parzelle/Zonenregel/GF-Ziel selbst auf und
  // übernimmt EINE Typologie als MassBody-Körper (program:'studie'). EIN
  // Undo entfernt ALLE Körper wieder — atomare Gruppe. Danach EIN Redo:
  // dieselben Körper (identische IDs) kommen zurück.
  // ---------------------------------------------------------------------
  const studieIds = await B.grundlagenStudieAusfuehren(page, { storeyId: storeyId! });
  expect(studieIds.length).toBeGreaterThan(0);

  const studieAnzahl = () =>
    page.evaluate(() =>
      window.__kosmo
        .state()
        .doc.byKind('mass')
        .filter((m) => m.program === 'studie').length,
    );

  await page.click('[data-testid="undo"]'); // [Quelle: DesignWorkspace.tsx Z.1293-1304 / sim-submission.spec.ts Z.216]
  await expect.poll(studieAnzahl, 'Undo muss ALLE Studien-Körper der einen atomaren Gruppe entfernen').toBe(0);

  await page.getByRole('button', { name: /Wiederholen/ }).click(); // [Quelle: DesignWorkspace.tsx Z.1305-1315 — kein eigenes redo-Testid, Text-Locator wie freemesh.spec.ts Z.201-205]
  await expect.poll(studieAnzahl, 'Redo muss dieselbe Anzahl Studien-Körper wiederherstellen').toBe(studieIds.length);
  const idsNachRedo = await page.evaluate(() =>
    window.__kosmo
      .state()
      .doc.byKind('mass')
      .filter((m) => m.program === 'studie')
      .map((m) => m.id),
  );
  expect(new Set(idsNachRedo)).toEqual(new Set(studieIds)); // exakt dieselben Körper, keine neu erzeugten

  // ---------------------------------------------------------------------
  // Akt 3 — Matrix + Regel-Hinweis: StudienPanel öffnen (Baugrenze-Muster
  // aus `module.spec.ts` Z.256/`studienbericht.spec.ts` Z.39), Regel-
  // Herkunft (D1) und Parallel-Achsen-Vergleich (V3/F4) sichtbar.
  // ---------------------------------------------------------------------
  await page.click('[data-testid="studie-toggle"]'); // [Quelle: DesignWorkspace.tsx Z.1178]
  await expect(page.locator('[data-testid="studien-panel"]')).toBeVisible(); // [Quelle: DesignWorkspace.tsx Z.1926]
  await expect(page.locator('[data-testid="variante-teppich"]')).toBeVisible(); // [Quelle: DesignWorkspace.tsx Z.2023 `variante-${v.id}`]

  const regelHinweis = page.locator('[data-testid="studie-regel-hinweis"]'); // [Quelle: DesignWorkspace.tsx Z.1964]
  await expect(regelHinweis).toBeVisible();
  await expect(regelHinweis).toContainText(szenario.zonenRegel.name);

  const matrix = page.locator('[data-testid="varianten-matrix"]'); // [Quelle: DesignWorkspace.tsx Z.2100]
  await expect(matrix).toBeVisible();
  const linien = matrix.locator('[data-testid="matrix-linie"]'); // [Quelle: DesignWorkspace.tsx Z.2120]
  await expect(linien.first()).toBeVisible();
  expect(await linien.count()).toBeGreaterThanOrEqual(2);

  // ---------------------------------------------------------------------
  // Akt 4 — Bericht (D5): SVG-Download enthält Titel, Zonenregel-Namen,
  // Programm-Erfüllung (Raumprogramm ist gesetzt, Akt 1) und den
  // Ehrlichkeitssatz.
  // ---------------------------------------------------------------------
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="studie-bericht"]'), // [Quelle: DesignWorkspace.tsx Z.2062]
  ]); // Regel R10: Promise.all statt click-dann-warten
  expect(download.suggestedFilename()).toBe('grundlagenstudie.svg');
  const pfad = await download.path();
  const svg = readFileSync(pfad!, 'utf8');

  // v0.7.3 W3-Integration: Titel ist seit D4 «Zwei Stimmen» (W2, Commit
  // 447e598 — `versal()` in studienbericht.ts:165) VERSAL. Assertion an die
  // bereits abgenommene D4-Entscheidung angeglichen (prüft weiter die
  // Titel-Präsenz, nur in korrekter Schreibweise). Kein Stream-S5/S6-Bezug.
  expect(svg).toContain('GRUNDLAGENSTUDIE'); // [Quelle: derive/studienbericht.ts Z.165 versal()]
  expect(svg).toContain(szenario.zonenRegel.name); // [Quelle: derive/studienbericht.ts Z.179 'aus Zonenregel «…»']
  expect(svg).toContain('Programm-Erfüllung'); // [Quelle: derive/studienbericht.ts Z.142 — nur mit gesetztem Raumprogramm]
  expect(svg).toContain('Anstoss, kein Entwurf'); // [Quelle: derive/studienbericht.ts Z.231]
});
