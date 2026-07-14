import { expect, test } from '@playwright/test';
import * as B from './sim/bausteine';
import { SZENARIEN } from './sim/szenarien';

/**
 * VP6 Phase 6 — Gebäudeabnahme (v0.6.3, `docs/V063-VOLLPROJEKT-KONZEPT.md`
 * §2 «Abschluss — Gebäudeabnahme», Owner-Hauptaufgabe K22) — sechste und
 * letzte Phasen-Spec der Vollprojekt-Kette, s. Kopfkommentar
 * `sim-vollprojekt-phase1.spec.ts`. SIA 102 kennt für diese Phase KEINE
 * eigene Teilphasen-Nummer (Konzept §2, Abschluss-Absatz) — das Konzept
 * führt sie ehrlich als eigene, unbelegte Arbeitsphase; `SiaPhase` (VP1)
 * bildet sie trotzdem als `'abnahme'` ab, weil der Owner-Auftrag K22
 * ausdrücklich «vom Wettbewerb bis zur Gebäudeabnahme» verlangt.
 *
 * Vor dieser Runde gab es dafür **nichts** im Kernel (Konzept §2, Punkt b:
 * «kein Entity/Command … 0 Treffer») — VP5 hat `Mangel`/
 * `design.mangelErfassen`/`design.mangelStatusSetzen` + das
 * Abnahmeprotokoll-Blatt neu gebaut. Muster `e2e/maengel.spec.ts`.
 */

test('VP6 Phase 6 — Abnahme: Preset (Mängel) → zwei Mängel erfassen, einen beheben → Abnahmeprotokoll-Export + Disclaimer', async ({
  page,
}) => {
  test.setTimeout(180_000);

  const szenario = SZENARIEN.mfh;

  // ---------------------------------------------------------------------
  // Akt 1 — Teilphase «Abnahme» (Baustein 21, Preset: NUR Mängel im Fokus —
  // die Mängelliste ist das einzige noch relevante Werkzeug dieser Phase).
  // ---------------------------------------------------------------------
  await B.projektStarten(page, szenario);
  await B.phaseWechseln(page, 'abnahme', true);
  await expect(page.locator('[data-testid="faehigkeit-maengel"]')).toHaveCSS('opacity', '1');
  await expect(page.locator('[data-testid="faehigkeit-kv"]')).toHaveCSS('opacity', '0.6'); // gedämpft, nicht entfernt

  // ---------------------------------------------------------------------
  // Akt 2 — Mängel-Panel öffnen: Ehrlichkeits-Hinweis permanent sichtbar,
  // Leermeldung vor der ersten Erfassung.
  // ---------------------------------------------------------------------
  await page.click('[data-testid="maengel-oeffnen"]'); // [Quelle: DesignWorkspace.tsx Z.1548]
  await expect(page.locator('[data-testid="maengel-panel"]')).toBeVisible();
  const hinweis = page.locator('[data-testid="maengel-hinweis"]');
  await expect(hinweis).toContainText('kein rechtsgültiges Abnahmeprotokoll');
  await expect(hinweis).toContainText('SIA 118');
  await expect(page.locator('[data-testid="maengel-leer"]')).toBeVisible();

  // ---------------------------------------------------------------------
  // Akt 3 — Zwei Mängel erfassen (Bad 2.OG/Sanitär, Treppenhaus EG/Rohbau
  // mit Frist), einen beheben — dieselbe Fixture wie `maengel.spec.ts`.
  // ---------------------------------------------------------------------
  await page.fill('[data-testid="maengel-ort"]', 'Bad 2.OG');
  await page.fill('[data-testid="maengel-gewerk"]', 'Sanitär/Heizung');
  await page.fill('[data-testid="maengel-beschreibung"]', 'Silikonfuge Dusche undicht');
  await page.click('[data-testid="maengel-erfassen"]');
  await expect(page.locator('[data-testid="maengel-leer"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="maengel-liste"]')).toContainText('Bad 2.OG');

  await page.fill('[data-testid="maengel-ort"]', 'Treppenhaus EG');
  await page.fill('[data-testid="maengel-gewerk"]', 'Rohbau');
  await page.fill('[data-testid="maengel-beschreibung"]', 'Handlauf lose');
  await page.fill('[data-testid="maengel-frist"]', '31.08.2026');
  await page.click('[data-testid="maengel-erfassen"]');
  await expect(page.locator('[data-testid="maengel-liste"]')).toContainText('Treppenhaus EG');
  await expect(page.locator('[data-testid="maengel-panel"]')).toContainText('2 offen / 0 behoben (2 total)');

  const zeileBad = page.locator('[data-testid^="maengel-zeile-"]').filter({ hasText: 'Bad 2.OG' });
  await zeileBad.locator('[data-testid^="maengel-status-"]').click();
  await expect(zeileBad).toContainText('Wieder öffnen');
  await expect(page.locator('[data-testid="maengel-panel"]')).toContainText('1 offen / 1 behoben (2 total)');

  // ---------------------------------------------------------------------
  // Akt 4 — Abnahmeprotokoll-Export über Baustein 22 (exakter Dateiname) +
  // der Disclaimer sowohl im Panel als auch im exportierten SVG.
  // ---------------------------------------------------------------------
  const pfad = await B.berichtExportPruefen(page, 'maengel-protokoll', 'abnahmeprotokoll.svg'); // [Quelle: MaengelPanel.tsx Z.108/136]
  const { readFileSync } = await import('node:fs');
  const svg = readFileSync(pfad, 'utf8');
  // Fragil (V079-Anhang B3): trifft aktuell den nicht-versal'ten Disclaimer-Fliesstext, nicht den (versal gesetzten) Blatttitel — nur Beobachtung, kein Fix hier.
  expect(svg).toContain('Abnahmeprotokoll');
  expect(svg).toContain('kein rechtsgültiges Abnahmeprotokoll (SIA 118 Abnahme bleibt Sache der Parteien).');
  expect(svg).toContain('Sanitär/Heizung');
  expect(svg).toContain('Rohbau');

  // Undo-Kette: Status-Wechsel zuerst rückgängig, dann beide Erfassungen.
  await page.click('[data-testid="undo"]');
  await expect(page.locator('[data-testid="maengel-panel"]')).toContainText('2 offen / 0 behoben (2 total)');
  await page.click('[data-testid="undo"]');
  await expect(page.locator('[data-testid="maengel-liste"]')).not.toContainText('Treppenhaus EG');
  await page.click('[data-testid="undo"]');
  await expect(page.locator('[data-testid="maengel-leer"]')).toBeVisible();

  // 🔒 Was real bleibt (Konzept §2, Abschluss, Punkt e): die reale
  // Schlussbegehung (Bauherrschaft + Architekt + Unternehmer vor Ort) ist
  // ein Realakt — Kosmo bereitet das Protokoll nur vor und führt es, nimmt
  // aber nie selbst ab.
});
