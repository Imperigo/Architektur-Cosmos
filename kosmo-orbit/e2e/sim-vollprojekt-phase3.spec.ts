import { expect, test } from '@playwright/test';
import * as B from './sim/bausteine';
import { SZENARIEN } from './sim/szenarien';
import { waehleOption } from './helfer/waehleOption';

/**
 * VP6 Phase 3 — Bauprojekt (v0.6.3, `docs/V063-VOLLPROJEKT-KONZEPT.md`
 * §2 «Phase 33» (Bauprojekt-Teil), Owner-Hauptaufgabe K22) — dritte von
 * sechs eigenständig lauffähigen Phasen-Specs, s. Kopfkommentar
 * `sim-vollprojekt-phase1.spec.ts`.
 *
 * Baut den EG-Rohbau (Wände+Decke) über dieselben Commands wie Phase 2 neu
 * auf (jede Phase-Spec ist unabhängig, kein geteilter Modellstand) und
 * vertieft ihn auf «Bauprojekt»-Niveau: Plan-Detaillierung + Bemassung
 * (Projekt-Menü, `phase-stil`/`bemassung-stil`), KV-Kennwert anpassen
 * (Summe reagiert live — dasselbe Verhalten wie `kv-schaetzung.spec.ts`),
 * Bauablauf-Panel (Gewerke-Tabelle + Export über Baustein 22).
 */

function parseChf(text: string): number {
  return Number(text.replace(/[^0-9-]/g, ''));
}

test('VP6 Phase 3 — Bauprojekt: Plan-Detaillierung + Bemassung → KV-Kennwert anpassen (Summe reagiert) → Bauablauf-Export', async ({
  page,
}) => {
  test.setTimeout(180_000);

  const szenario = SZENARIEN.mfh;

  // ---------------------------------------------------------------------
  // Akt 1 — Teilphase «Bauprojekt» (Baustein 21, Preset: KV/Sonne/Bauablauf
  // im Fokus) + Plan-Detaillierungsgrad «Bauprojekt» (Baustein 3, 1:100 —
  // `phaseLabel` fasst SIA 32/33 bewusst zusammen, `docs/PLAN-
  // DETAILLIERUNG.md`).
  // ---------------------------------------------------------------------
  await B.projektStarten(page, szenario);
  await B.phaseWechseln(page, 'bauprojekt', true);

  // ---------------------------------------------------------------------
  // Akt 2 — Grundlagen + Rohbau EG (Wände+Decke), wie Phase 2.
  // ---------------------------------------------------------------------
  await B.parzelleSetzen(page, szenario);
  const egId = await page.evaluate(() => window.__kosmo.state().activeStoreyId);
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
  await page.evaluate(
    ({ storeyId, outline }) => window.__kosmo.run('design.deckeZeichnen', { storeyId, outline }),
    { storeyId: egId, outline: regelgeschoss },
  );
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
  );
  // Eine Innenwand mit Türöffnung (Muster `module.spec.ts` «Bemassungs-
  // Stile») — ohne mind. eine Innenwand bleibt `dim-kette-innen` leer, das
  // Werkplan-Preset hätte sonst nichts zu zeigen.
  const [innenId] = await B.waendeZeichnen(page, [{ a: { x: 15000, y: 0 }, b: { x: 15000, y: 14000 } }], 'AW');
  await page.evaluate(
    (wallId) =>
      window.__kosmo.run('design.oeffnungSetzen', {
        wallId,
        openingType: 'tuer',
        center: 7000,
        width: 900,
        height: 2200,
        sill: 0,
      }),
    innenId,
  ); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.oeffnungSetzen']
  // Plan-Detaillierungsgrad «Bauprojekt» (Baustein 3, 1:100 — `phaseLabel`
  // fasst SIA 32/33 bewusst zusammen) — ERST nachdem echte Geometrie steht.
  await B.phaseSchalten(page, 'bauprojekt');
  await B.geschosseStapeln(page, 1, { minZonenOberstes: 0, minMoebelOberstes: 0 }); // mind. ein weiteres Geschoss für eine reale Rohbau-Reihenfolge (mehrere Storeys)

  // ---------------------------------------------------------------------
  // Akt 3 — Plan-Detaillierung + Bemassung im Projekt-Menü: der
  // Werkplan-Preset zeigt die Innenketten zusätzlich zu den Aussenketten
  // (`module.spec.ts` «Bemassungs-Stile»-Beweis).
  // ---------------------------------------------------------------------
  if (!(await page.locator('[data-testid="projekt-menu"]').isVisible())) {
    await page.click('[data-testid="projekt-menu-toggle"]');
  }
  await expect(page.locator('[data-testid="dim-kette-innen"]')).toHaveCount(0); // Standard: keine Innenkette
  await waehleOption(page, 'bemassung-stil', 'werkplan'); // [Quelle: DesignWorkspace.tsx Z.1871]
  await expect(page.locator('[data-testid="dim-kette-innen"]').first()).toBeVisible();

  // ---------------------------------------------------------------------
  // Akt 4 — KV-Kennwert anpassen: Summe reagiert sofort (dieselbe Assertion
  // wie `kv-schaetzung.spec.ts`, hier auf dem selbst gebauten MFH-Rohbau).
  // ---------------------------------------------------------------------
  await page.click('[data-testid="kv-oeffnen"]');
  await expect(page.locator('[data-testid="kv-panel"]')).toBeVisible();
  const summeVorText = await page.locator('[data-testid="kv-summe"]').innerText();
  const summeVor = parseChf(summeVorText);
  expect(summeVor).toBeGreaterThan(0);

  await page.fill('[data-testid="kv-chf-m2"]', '3800'); // [Quelle: KvPanel.tsx 'design.kvKennwerteSetzen']
  await expect(page.locator('[data-testid="kv-summe"]')).not.toHaveText(summeVorText);
  const summeNachher = parseChf(await page.locator('[data-testid="kv-summe"]').innerText());
  expect(summeNachher).toBeGreaterThan(summeVor);

  await page.click('[data-testid="undo"]'); // Kennwert-Undo — ein Schritt je Änderung
  await expect(page.locator('[data-testid="kv-summe"]')).toHaveText(summeVorText);

  // ---------------------------------------------------------------------
  // Akt 5 — Bauablauf öffnen: Gewerke-Tabelle (Aushub…Abnahme) + Export
  // über Baustein 22.
  // ---------------------------------------------------------------------
  await page.click('[data-testid="bauablauf-oeffnen"]'); // [Quelle: DesignWorkspace.tsx Z.1538]
  await expect(page.locator('[data-testid="bauablauf-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="bauablauf-hinweis"]')).toContainText(
    'Abgeleiteter Grob-Terminplan, ersetzt keine Bauleitung.',
  );
  const tabelle = page.locator('[data-testid="bauablauf-tabelle"]');
  await expect(tabelle).toBeVisible();
  await expect(page.locator('[data-testid="bauablauf-leer"]')).toHaveCount(0);
  const gewerkZeilen = await tabelle.locator('tbody tr').allInnerTexts();
  expect(gewerkZeilen.length).toBeGreaterThan(0);
  expect(gewerkZeilen[0]).toContain('Aushub');
  expect(gewerkZeilen[gewerkZeilen.length - 1]).toContain('Abnahme');

  const pfad = await B.berichtExportPruefen(page, 'bauablauf-blatt', 'bauablaufblatt.svg');
  const { readFileSync } = await import('node:fs');
  const svg = readFileSync(pfad, 'utf8');
  // Seit v0.7.3 D4 (447e598, Blatt-Typografie «Zwei Stimmen») setzt das Blatt
  // den Titel versal («BAUABLAUFPLAN») — die Prüfung ist deshalb case-
  // insensitiv, wie der analoge 356er-Fix in `e2e/bauablauf.spec.ts`.
  expect(svg.toLowerCase()).toContain('bauablaufplan');
  expect(svg).toContain('Abgeleiteter Grob-Terminplan, ersetzt keine Bauleitung.');

  // 🔒 Was real bleibt (Konzept §2, Phase 33, Punkt e): die eigentliche
  // Baugesuch-Einreichung bei der Behörde ist der grösste 🔒-Punkt der
  // ganzen Kette (folgt in Phase 4) — diese Phase liefert nur die
  // Bauprojekt-Detaillierung + den Kostenrahmen dafür.
});
