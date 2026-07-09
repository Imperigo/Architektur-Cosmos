import { expect, test } from '@playwright/test';
import * as B from './sim/bausteine';
import { SZENARIEN } from './sim/szenarien';

/**
 * VP6 Phase 5 — Ausschreibung/Ausführung (v0.6.3,
 * `docs/V063-VOLLPROJEKT-KONZEPT.md` §2 «Phase 41»/«Phase 51-52», Owner-
 * Hauptaufgabe K22) — fünfte von sechs eigenständig lauffähigen
 * Phasen-Specs, s. Kopfkommentar `sim-vollprojekt-phase1.spec.ts`.
 *
 * Block C (Submission) ist bereits vollständig gebaut und in
 * `sim-submission.spec.ts` mit einem echten DXF-Export→Mutation→Import→
 * Diff-Karten-Rücklauf bewiesen — diese Phase-Spec wiederholt das NICHT,
 * sondern zeigt den Teil, der bisher KEIN UI hatte: das
 * Submissions-Check-Panel (A7, `SubmissionsCheckPanel.tsx`) als sichtbare
 * Oberfläche für dieselbe `pruefeSubmissionsreife`-Ableitung, die
 * `sim-submission.spec.ts` bisher nur über den `__kosmo.reife()`-Testhook
 * (Baustein 19) liest.
 *
 * Für den Ausführungs-Teil reicht der PDF-Drop-Ehrlichkeitspfad (Muster
 * `unternehmerplan-pdf.spec.ts`, C5): kein Diff-Karten-Rücklauf hier — das
 * ist Owner-Auftrag (s. Abweichungs-Begründung bei Baustein 22 in
 * `bausteine.ts`, «NICHT gebaut»-Absatz).
 */

test('VP6 Phase 5 — Ausschreibung/Ausführung: Submissions-Check-Panel zeigt Ergebnis → Unternehmerplan-PDF-Drop mit ehrlichem Hinweis', async ({
  page,
}) => {
  test.setTimeout(180_000);

  const szenario = SZENARIEN.mfh;

  // ---------------------------------------------------------------------
  // Akt 1 — Teilphase «Ausschreibung» (Baustein 21, Preset: Submissions-
  // Check/KV/Bauablauf im Fokus, Umbau-Filter-Empfehlung «abbruch») +
  // Rohbau EG mit einem VOLLSTÄNDIGEN Wandaufbau (Material+Dicke benannt —
  // dieselbe Vorbedingung wie `sim-submission.spec.ts`).
  // ---------------------------------------------------------------------
  await B.projektStarten(page, szenario);
  await B.phaseWechseln(page, 'ausschreibung', true);

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

  // Submission verlangt Werkplan-Detaillierung (SIA 400 Planfolge, gleicher
  // Phasen-Hinweis wie `sim-submission.spec.ts` Schritt 2/3).
  await B.phaseSchalten(page, 'werkplan');

  // ---------------------------------------------------------------------
  // Akt 2 — Submissions-Check-Panel (A7) öffnen: zeigt dieselbe
  // Lückenliste, die Baustein 19 bislang nur über den Testhook liest — hier
  // über die echte Oberfläche.
  // ---------------------------------------------------------------------
  await page.click('[data-testid="faehigkeit-submission"]'); // [Quelle: DesignWorkspace.tsx — A7-Fähigkeitsicon]
  const panel = page.locator('[data-testid="submission-panel"]');
  await expect(panel).toBeVisible();

  const leer = page.locator('[data-testid="submission-leer"]');
  const luecken = page.locator('[data-testid="submission-luecken"]');
  const hinweise = page.locator('[data-testid="submission-hinweise"]');
  await expect(leer.or(luecken).or(hinweise)).toBeVisible(); // irgendein Ergebnis — Leermeldung ODER Lücken/Hinweise, nie eine stumme Lücke

  // ---------------------------------------------------------------------
  // Akt 3 — Teilphase «Ausführung» (Baustein 21, Preset: Bauablauf/KV im
  // Fokus) + Unternehmerplan-PDF-Drop (Muster `unternehmerplan-pdf.spec.ts`,
  // C5): kein Parser-Versuch, ehrlicher Hinweis statt Kauderwelsch.
  // ---------------------------------------------------------------------
  await B.phaseWechseln(page, 'ausfuehrung', true);

  const MINI_PDF = Buffer.from('%PDF-1.4\n%…kein echter Plan, nur die Magic-Bytes für die Erkennung…\n');
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('[data-testid="import-dxf"]'), // [Quelle: unternehmerplan-pdf.spec.ts — derselbe Dateiwahl-Dialog nimmt auch .pdf an]
  ]);
  await chooser.setFiles({ name: 'unternehmer-plan.pdf', mimeType: 'application/pdf', buffer: MINI_PDF });

  const info = page.locator('[data-testid="meldung-info"]').first();
  await expect(info).toBeVisible({ timeout: 10_000 });
  await expect(info).toContainText('PDF');
  await expect(info).toContainText('DXF');

  const uPanel = page.locator('[data-testid="unternehmerplan-panel"]');
  await expect(uPanel).toBeVisible();
  const hinweis = uPanel.locator('[data-testid="pdf-hinweis"]');
  await expect(hinweis).toBeVisible();
  await expect(hinweis).toContainText('keine automatische Analyse');
  await expect(page.locator('[data-testid="meldung-fehler"]')).toHaveCount(0); // ehrlicher Hinweis ist kein Fehlerfall

  // 🔒 Was real bleibt (Konzept §2, Phase 41/51-52, Punkt e): echte
  // Unternehmer-Offerten, echte Devis-Preise, ein echter Vergabeentscheid —
  // hier nur über eine deterministische Fixture simulierbar
  // (`sim-submission.spec.ts`), nie echte Fremdfirmen. Die Bauleitung vor
  // Ort (Baufortschritt, Qualität am Bau, Handwerker-Koordination) ist zu
  // 100 % ausserhalb von Kosmo — höchstens die Dokumentation (Pläne,
  // Soll/Ist-Abgleich per Unternehmerplan-Diff) wird unterstützt.
});
