import { expect, test } from '@playwright/test';
import * as B from './sim/bausteine';
import { SZENARIEN } from './sim/szenarien';

/**
 * VP6 Phase 1 — Wettbewerb/Studie (v0.6.3, `docs/V063-VOLLPROJEKT-KONZEPT.md`
 * §2 «Phase 31/4.22», Owner-Hauptaufgabe K22) — erste von sechs eigenständig
 * lauffähigen Phasen-Specs der Vollprojekt-Kette am EINEN Testprojekt «MFH
 * Ersatzneubau Zürich-Altstetten» (`SZENARIEN.mfh`, Konzept Abschnitt 1).
 * Jede Phase-Spec baut ihren eigenen Modellstand über `projektStarten` +
 * direkte `__kosmo`-Commands neu auf (Muster `sim-wettbewerb.spec.ts`) —
 * KEINE Abhängigkeit von den anderen fünf Specs, kein geteilter
 * Browser-Zustand.
 *
 * Dramaturgie 1:1 nach `sim-wettbewerb.spec.ts` (Block D, ROADMAP 219): der
 * Wettbewerbsteil ist bereits fast vollständig gebaut (Konzept §2, Phase
 * 31/4.22, Punkt b) — diese Phase-Spec fügt NUR Baustein 21/22 (VP7) hinzu,
 * baut sonst nichts Neues: Zonenregel «W4» + Parzelle (als Zone/Baufeld,
 * NICHT Baugrenze — dieselbe dokumentierte Abweichung wie
 * `sim-wettbewerb.spec.ts`, weil `grundlagen.volumenstudie` und das
 * StudienPanel das Baufeld über «die zuletzt gezeichnete Zone des
 * Geschosses» auflösen) + Raumprogramm → Kosmo-Studie
 * (`grundlagen.volumenstudie`, Baustein 20) → Studien-Panel + Matrix +
 * Regel-Herkunft → Studienbericht-Export (NEU: Baustein 22
 * `berichtExportPruefen` statt der Baustein-17-Regex-Variante aus
 * `sim-wettbewerb.spec.ts` — exakter Dateiname, s. Baustein-22-Kommentar in
 * `bausteine.ts`).
 *
 * Baustein 21 `phaseWechseln(page, 'wettbewerb', true)`: der Doc-Default ist
 * bereits `siaPhase: 'wettbewerb'` (`model/doc.ts` `defaultSettings`) — kein
 * echter Wechsel, also bietet A8 nichts an (Baustein-21-Kommentar). Trotzdem
 * bewusst über das ECHTE UI gesetzt statt stillschweigend vorausgesetzt:
 * jede der sechs Phasen setzt ihre Teilphase über denselben Weg, keine
 * Phase verlässt sich auf einen impliziten Default.
 */

test('VP6 Phase 1 — Wettbewerb/Studie: Zonenregel + Parzelle + Raumprogramm → Kosmo-Studie → Matrix + Regel-Hinweis → Studienbericht-Export', async ({
  page,
}) => {
  test.setTimeout(180_000);

  const szenario = SZENARIEN.mfh;

  // ---------------------------------------------------------------------
  // Akt 1 — Projekt + Teilphase (Baustein 1 + 21) + Grundlagen: Zonenregel
  // inkl. Parzellenfläche, Parzelle als Zone (Baufeld-Konvention D4), Raum-
  // programm.
  // ---------------------------------------------------------------------
  await B.projektStarten(page, szenario);
  await B.phaseWechseln(page, 'wettbewerb', true); // Default-Wert — kein Banner (s. Kommentar oben)
  expect(await page.evaluate(() => window.__kosmo.state().doc.settings.siaPhase)).toBe('wettbewerb');

  const storeyId = await page.evaluate(() => window.__kosmo.state().activeStoreyId);
  expect(storeyId).not.toBeNull();

  const parzellenFlaecheM2 = 960; // 40 m × 24 m (Szenario-Parzellenumriss, real gerechnet — ROADMAP 219)
  await page.evaluate(
    ({ zonenRegel, parzellenFlaecheM2 }) => {
      window.__kosmo.run('design.zonenRegelSetzen', { ...zonenRegel, parzellenFlaeche: parzellenFlaecheM2 });
    },
    { zonenRegel: szenario.zonenRegel, parzellenFlaecheM2 },
  ); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.zonenRegelSetzen']

  await page.evaluate(
    ({ storeyId, outline }) => {
      window.__kosmo.run('design.zoneErstellen', { storeyId, name: 'Parzelle', sia: 'KF', outline });
    },
    { storeyId, outline: szenario.parzelle.outline },
  ); // [Quelle: e2e/sim-wettbewerb.spec.ts Z.71-76 — Baufeld-Konvention]

  await page.evaluate((posten) => window.__kosmo.run('design.raumprogrammSetzen', { posten }), szenario.raumprogramm);

  const zonenAnzahl = await page.evaluate(() => window.__kosmo.state().doc.byKind('zone').length);
  expect(zonenAnzahl, 'Parzelle als Zone muss die einzige Zone im Geschoss sein (Baufeld-Konvention)').toBe(1);

  // ---------------------------------------------------------------------
  // Akt 2 — Studie über den Kosmo-/Command-Weg (Baustein 20): EIN Undo
  // entfernt ALLE Studien-Körper (atomare Gruppe).
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
  await page.click('[data-testid="undo"]'); // [Quelle: DesignWorkspace.tsx Z.1293-1304]
  await expect.poll(studieAnzahl, 'Undo muss ALLE Studien-Körper entfernen').toBe(0);
  await page.getByRole('button', { name: /Wiederholen/ }).click();
  await expect.poll(studieAnzahl, 'Redo muss dieselbe Anzahl Studien-Körper wiederherstellen').toBe(studieIds.length);

  // ---------------------------------------------------------------------
  // Akt 3 — Matrix + Regel-Hinweis: StudienPanel zeigt dieselbe
  // Zonenregel-Herkunft (D1) und den Parallel-Achsen-Vergleich (V3/F4).
  // ---------------------------------------------------------------------
  await page.click('[data-testid="studie-toggle"]'); // [Quelle: DesignWorkspace.tsx Z.1178]
  await expect(page.locator('[data-testid="studien-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="variante-teppich"]')).toBeVisible();

  const regelHinweis = page.locator('[data-testid="studie-regel-hinweis"]'); // [Quelle: DesignWorkspace.tsx Z.1964]
  await expect(regelHinweis).toBeVisible();
  await expect(regelHinweis).toContainText(szenario.zonenRegel.name);

  const matrix = page.locator('[data-testid="varianten-matrix"]'); // [Quelle: DesignWorkspace.tsx Z.2100]
  await expect(matrix).toBeVisible();
  const linien = matrix.locator('[data-testid="matrix-linie"]');
  await expect(linien.first()).toBeVisible();
  expect(await linien.count()).toBeGreaterThanOrEqual(2);

  // ---------------------------------------------------------------------
  // Akt 4 — Studienbericht-Export über Baustein 22 (exakter Dateiname statt
  // der Baustein-17-Regex-Variante).
  // ---------------------------------------------------------------------
  const pfad = await B.berichtExportPruefen(page, 'studie-bericht', 'grundlagenstudie.svg'); // [Quelle: DesignWorkspace.tsx Z.2062]
  const { readFileSync } = await import('node:fs');
  const svg = readFileSync(pfad, 'utf8');
  expect(svg).toContain('Grundlagenstudie'); // [Quelle: derive/studienbericht.ts Z.174]
  expect(svg).toContain(szenario.zonenRegel.name); // [Quelle: derive/studienbericht.ts Z.179]
  expect(svg).toContain('Programm-Erfüllung'); // [Quelle: derive/studienbericht.ts Z.142]
  expect(svg).toContain('Anstoss, kein Entwurf'); // [Quelle: derive/studienbericht.ts Z.231]

  // 🔒 Was real bleibt (Konzept §2, Phase 31/4.22, Punkt e): die reale
  // Ortsbegehung, das Einlesen der echten Zürcher BZO-PDF (die Zonenregel
  // hier ist ein ausgewiesenes Fixture, kein Gemeinde-Zitat) und die
  // SIA-142/143-Verfahrensregeln (Fristen, Anonymität eines echten
  // Wettbewerbs) laufen NIE durch Kosmo — dieser Testlauf simuliert nur die
  // Studien-Rechnung und das Bericht-Artefakt.
});
