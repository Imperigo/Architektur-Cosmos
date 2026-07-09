import { expect, test } from '@playwright/test';
import * as B from './sim/bausteine';
import { SZENARIEN } from './sim/szenarien';

/**
 * VP6 Phase 2 — Vorprojekt (v0.6.3, `docs/V063-VOLLPROJEKT-KONZEPT.md`
 * §2 «Phase 32», Owner-Hauptaufgabe K22) — zweite von sechs eigenständig
 * lauffähigen Phasen-Specs, s. Kopfkommentar `sim-vollprojekt-phase1.spec.ts`
 * für die gemeinsame Dramaturgie-Regel.
 *
 * Baut das MFH-Erdgeschoss diesmal ECHT (Wände + Decke + Zone, nicht nur die
 * Baufeld-Zone aus Phase 1) — Konzept-Auftrag: «Wände/Decken/Zonen fürs
 * MFH-Erdgeschoss (Commands), Geschosse stapeln». Bewusst KEIN voller
 * Segmentierer-/Grundriss-Generator-Lauf (das ist die Domäne von
 * `sim-mfh.spec.ts`, bereits bewiesen) — diese Phase demonstriert den
 * SIA-31-Meilenstein selbst: Grundrisse fixieren (Wände), Tragwerk grob
 * (Decke), erste Kostenschätzung (KV-Panel).
 *
 * SIA-Teilphase (`design.siaPhaseSetzen`) und Plan-Detaillierungsgrad
 * (`design.phaseSetzen`, Baustein 3 `phaseSchalten`) bleiben bewusst ZWEI
 * getrennte Commands (Konzept §2 Phase 32, Punkt c — der «Phase-Label-Bug»,
 * VP1/Lücken-Batch 1 hat dafür `siaPhase` als eigenes Feld eingeführt):
 * beide werden hier separat gesetzt, keine automatische Kopplung.
 */

function parseChf(text: string): number {
  return Number(text.replace(/[^0-9-]/g, ''));
}

test('VP6 Phase 2 — Vorprojekt: Preset anwenden → Wände/Decke/Zone EG → Geschosse stapeln → Berechnungsliste sichtbar → KV Summe > 0', async ({
  page,
}) => {
  test.setTimeout(180_000);

  const szenario = SZENARIEN.mfh;

  // ---------------------------------------------------------------------
  // Akt 1 — Teilphase «Vorprojekt» (Baustein 21, Preset: Volumenstudien/
  // Sonne/KV im Fokus) + Plan-Detaillierungsgrad «Vorprojekt» (Baustein 3).
  // ---------------------------------------------------------------------
  await B.projektStarten(page, szenario);
  await B.phaseWechseln(page, 'vorprojekt', true);

  // ---------------------------------------------------------------------
  // Akt 2 — Grundlagen: Zonenregel + Baugrenze (Baustein 2 — mit dem
  // eingebauten Grenzabstand-Probekörper-Beweis der MFH-Zonenregel).
  // ---------------------------------------------------------------------
  await B.parzelleSetzen(page, szenario);

  const egId = await page.evaluate(() => window.__kosmo.state().activeStoreyId);

  // ---------------------------------------------------------------------
  // Akt 3 — Wände + Decke fürs Regelgeschoss (30 × 14 m, Szenario-Leitidee
  // «Regelgeschoss 30×14 m zweibündig») + eine HNF-Zone «preisgünstig».
  // ---------------------------------------------------------------------
  const regelgeschoss = [
    { x: 0, y: 0 },
    { x: 30000, y: 0 },
    { x: 30000, y: 14000 },
    { x: 0, y: 14000 },
  ];
  await B.waendeZeichnen(
    page,
    [
      { a: regelgeschoss[0]!, b: regelgeschoss[1]! },
      { a: regelgeschoss[1]!, b: regelgeschoss[2]! },
      { a: regelgeschoss[2]!, b: regelgeschoss[3]! },
      { a: regelgeschoss[3]!, b: regelgeschoss[0]! },
    ],
    'AW',
  );

  const deckenVorher = await page.evaluate(() => window.__kosmo.state().doc.byKind('slab').length);
  await page.evaluate(
    ({ storeyId, outline }) => window.__kosmo.run('design.deckeZeichnen', { storeyId, outline }),
    { storeyId: egId, outline: regelgeschoss },
  ); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.deckeZeichnen']
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('slab').length))
    .toBe(deckenVorher + 1);

  await page.evaluate(
    ({ storeyId, outline }) => {
      window.__kosmo.run('design.zoneErstellen', {
        storeyId,
        name: 'Regelgeschoss',
        sia: 'HNF',
        program: 'preisguenstig',
        outline,
      });
    },
    { storeyId: egId, outline: regelgeschoss },
  ); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.zoneErstellen' — 'program' zählt als «ausgezogen»]

  // Plan-Detaillierungsgrad «Vorprojekt» (Baustein 3, getrennt von der
  // SIA-Teilphase) — ERST nachdem echte Geometrie steht: `phaseSchalten`
  // verlangt eine stabile, nichtleere Plan-SVG-Pfadzahl (Regel R1).
  await B.phaseSchalten(page, 'vorprojekt');

  // ---------------------------------------------------------------------
  // Akt 4 — Geschosse stapeln (Baustein 10): EG (Wände+Decke+Zone) samt
  // Inhalt 2× nach oben kopieren — zusammen mit dem leeren 1.OG aus dem
  // Bootstrap ergibt das 4 Geschosse, exakt `zonenRegel.maxVollgeschosse`.
  // ---------------------------------------------------------------------
  await B.geschosseStapeln(page, 2, { minZonenOberstes: 0, minMoebelOberstes: 0 });
  const geschosse = await page.evaluate(() => window.__kosmo.state().doc.storeysOrdered().length);
  expect(geschosse).toBe(szenario.zonenRegel.maxVollgeschosse);

  // ---------------------------------------------------------------------
  // Akt 5 — Berechnungsliste-Kennwerte sichtbar (Baustein 12): «preisgünstig»
  // ist gebaut (>0 %), «marktgerecht» ist geplant, aber noch nicht gezeichnet
  // (0 % — ehrliche Lücke statt Fake-Erfüllung).
  // ---------------------------------------------------------------------
  await page.evaluate((posten) => window.__kosmo.run('design.raumprogrammSetzen', { posten }), szenario.raumprogramm);
  await page.click('[data-testid="liste-toggle"]'); // [Quelle: sim-mfh.spec.ts Z.72 — Berechnungsliste-Panel]
  await B.berechnungslistePruefen(page, { gebaut: ['preisguenstig'], geplant: ['marktgerecht'] });

  // ---------------------------------------------------------------------
  // Akt 6 — KV öffnen: Summe > 0 (die gestapelten Decken tragen echte GF)
  // + Richtwert-Hinweis permanent sichtbar.
  // ---------------------------------------------------------------------
  await page.click('[data-testid="kv-oeffnen"]'); // [Quelle: DesignWorkspace.tsx Z.1528]
  await expect(page.locator('[data-testid="kv-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="kv-hinweis"]')).toContainText(
    'Richtwert auf GF-Basis — kein Devis, keine NPK-Positionen.',
  );
  const summe = parseChf(await page.locator('[data-testid="kv-summe"]').innerText());
  expect(summe).toBeGreaterThan(0);

  // 🔒 Was real bleibt (Konzept §2, Phase 32, Punkt e): die echte
  // Bauherrenpräsentation und Feedback-Runde zur gewählten Variante ist
  // Owner-Rolle — kein Kosmo-Pfad simuliert das Gespräch selbst.
});
