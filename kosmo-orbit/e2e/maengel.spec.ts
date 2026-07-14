import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * Mängel-/Abnahme-Grundgerüst (v0.6.3, `docs/V063-VOLLPROJEKT-KONZEPT.md`
 * Abschnitt 4, Lücken-Batch 5, Owner-Hauptaufgabe K22) — Abschlussphase
 * «Gebäudeabnahme», die es im Kernel vorher gar nicht gab. Owner-Journey:
 * TKB laden → Mängel-Panel öffnen → zwei Mängel erfassen → einen auf
 * «behoben» setzen → Zusammenfassung stimmt → Abnahmeprotokoll-Export lädt
 * ein eigenständiges SVG mit dem Ehrlichkeits-Disclaimer → Undo-Kette macht
 * Status-Wechsel und beide Erfassungen sauber rückgängig.
 *
 * Bootstrap wie `e2e/bauablauf.spec.ts`/`e2e/kv-schaetzung.spec.ts`:
 * `load-tkb` direkt nach `page.goto('/')`.
 *
 * NICHT im Worktree ausgeführt (Owner-Auftrag) — der Koordinator fährt ihn
 * nach dem Einpflegen.
 */

test('Mängel-Panel: erfassen, Status umschalten, Protokoll-Export, vollständige Undo-Kette', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="load-tkb"]');
  // v0.7.8 Welle 2 (P4): testid statt Text-Locator (Doppel-Chrome-Kollision
  // mit dem Dock-Kopf-Titel des migrierten `kennzahlen`-Panels, s.
  // `dock-layout.spec.ts` Kommentar).
  await expect(page.locator('[data-testid="kennzahlen"]')).toBeVisible();

  await page.click('[data-testid="maengel-oeffnen"]');
  await expect(page.locator('[data-testid="maengel-panel"]')).toBeVisible();

  // Ehrlichkeits-Hinweis steht IMMER sichtbar im Panel, nicht nur beim Export.
  await expect(page.locator('[data-testid="maengel-hinweis"]')).toContainText(
    'kein rechtsgültiges Abnahmeprotokoll',
  );
  await expect(page.locator('[data-testid="maengel-hinweis"]')).toContainText('SIA 118');

  // Noch keine Mängel erfasst — ehrliche Leermeldung statt einer erfundenen Liste.
  await expect(page.locator('[data-testid="maengel-leer"]')).toBeVisible();

  // Mangel 1 erfassen: Bad 2.OG / Sanitär/Heizung.
  await page.fill('[data-testid="maengel-ort"]', 'Bad 2.OG');
  await page.fill('[data-testid="maengel-gewerk"]', 'Sanitär/Heizung');
  await page.fill('[data-testid="maengel-beschreibung"]', 'Silikonfuge Dusche undicht');
  await page.click('[data-testid="maengel-erfassen"]');
  await expect(page.locator('[data-testid="maengel-leer"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="maengel-liste"]')).toContainText('Bad 2.OG');
  await expect(page.locator('[data-testid="maengel-liste"]')).toContainText('Silikonfuge Dusche undicht');

  // Mangel 2 erfassen: Treppenhaus EG / Rohbau, mit Frist.
  await page.fill('[data-testid="maengel-ort"]', 'Treppenhaus EG');
  await page.fill('[data-testid="maengel-gewerk"]', 'Rohbau');
  await page.fill('[data-testid="maengel-beschreibung"]', 'Handlauf lose');
  await page.fill('[data-testid="maengel-frist"]', '31.08.2026');
  await page.click('[data-testid="maengel-erfassen"]');
  await expect(page.locator('[data-testid="maengel-liste"]')).toContainText('Treppenhaus EG');
  await expect(page.locator('[data-testid="maengel-liste"]')).toContainText('Handlauf lose');

  // Zusammenfassung: 2 offen / 0 behoben, bevor irgendeiner behoben wurde.
  await expect(page.locator('[data-testid="maengel-panel"]')).toContainText('2 offen / 0 behoben (2 total)');

  // Einen der beiden Mängel (Bad 2.OG) auf «behoben» setzen.
  const zeileBad = page
    .locator('[data-testid^="maengel-zeile-"]')
    .filter({ hasText: 'Bad 2.OG' });
  await zeileBad.locator('[data-testid^="maengel-status-"]').click();
  await expect(zeileBad).toContainText('Wieder öffnen');
  await expect(page.locator('[data-testid="maengel-panel"]')).toContainText('1 offen / 1 behoben (2 total)');

  // Abnahmeprotokoll-Export lädt ein eigenständiges, druckfähiges SVG mit
  // Gewerke-Gruppen und dem Ehrlichkeits-Disclaimer.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="maengel-protokoll"]'),
  ]);
  expect(download.suggestedFilename()).toBe('abnahmeprotokoll.svg');
  const pfad = await download.path();
  const svg = readFileSync(pfad!, 'utf8');
  expect(svg).toContain('<svg');
  expect(svg).toContain('Abnahmeprotokoll');
  expect(svg).toContain('kein rechtsgültiges Abnahmeprotokoll (SIA 118 Abnahme bleibt Sache der Parteien).');
  expect(svg).toContain('Sanitär/Heizung');
  expect(svg).toContain('Rohbau');

  // Undo-Kette: Status-Wechsel zuerst rückgängig, dann beide Erfassungen —
  // jeder Schritt eine eigene, atomare Undo-Gruppe.
  await page.click('[data-testid="undo"]');
  await expect(page.locator('[data-testid="maengel-panel"]')).toContainText('2 offen / 0 behoben (2 total)');

  await page.click('[data-testid="undo"]');
  await expect(page.locator('[data-testid="maengel-liste"]')).not.toContainText('Treppenhaus EG');
  await expect(page.locator('[data-testid="maengel-liste"]')).toContainText('Bad 2.OG');

  await page.click('[data-testid="undo"]');
  await expect(page.locator('[data-testid="maengel-leer"]')).toBeVisible();
});
