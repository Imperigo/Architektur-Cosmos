import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * Bauablaufplan-Grundgerüst (v0.6.3, `docs/V063-VOLLPROJEKT-KONZEPT.md`
 * Abschnitt 4, Lücken-Batch 4, Owner-Hauptaufgabe K22) — Owner-Journey: TKB
 * laden → Bauablauf öffnen → Gewerke-Tabelle sichtbar (Reihenfolge Aushub…
 * Abnahme) + Ehrlichkeits-Hinweis sichtbar → Export lädt das Bauablaufblatt
 * (SVG) herunter.
 *
 * Bootstrap wie `e2e/kv-schaetzung.spec.ts`: `load-tkb` direkt nach
 * `page.goto('/')` — die TKB-Demo zeichnet mehrere Geschosse mit Wänden/
 * Decken, damit ist die Gewerke-Tabelle garantiert nicht leer, ohne dass der
 * Test selbst Geometrie zeichnen muss. Download-Muster wie
 * `studienbericht.spec.ts` (`page.waitForEvent('download')` → `download.path()`
 * → `readFileSync`).
 *
 * NICHT im Worktree ausgeführt (Owner-Auftrag) — der Koordinator fährt ihn
 * nach dem Einpflegen.
 */

test('Bauablauf-Panel: Gewerke-Tabelle sichtbar, Reihenfolge stimmt, Ehrlichkeits-Hinweis sichtbar, Export lädt SVG', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="load-tkb"]');
  await expect(page.locator('text=KENNZAHLEN')).toBeVisible();

  await page.click('[data-testid="bauablauf-oeffnen"]');
  await expect(page.locator('[data-testid="bauablauf-panel"]')).toBeVisible();

  // Ehrlichkeits-Hinweis steht IMMER sichtbar im Panel, nicht nur beim Export.
  await expect(page.locator('[data-testid="bauablauf-hinweis"]')).toContainText(
    'Abgeleiteter Grob-Terminplan, ersetzt keine Bauleitung.',
  );

  // TKB-Demo zeichnet Geschosse mit Wänden/Decken — die Tabelle ist garantiert
  // nicht leer (keine «bauablauf-leer»-Meldung).
  const tabelle = page.locator('[data-testid="bauablauf-tabelle"]');
  await expect(tabelle).toBeVisible();
  await expect(page.locator('[data-testid="bauablauf-leer"]')).toHaveCount(0);

  // Feste Gewerke-Reihenfolge: Aushub zuerst, Abnahme zuletzt, Rohbau + Umgebung dazwischen.
  const gewerkZeilen = await tabelle.locator('tbody tr').allInnerTexts();
  expect(gewerkZeilen.length).toBeGreaterThan(0);
  expect(gewerkZeilen[0]).toContain('Aushub');
  expect(gewerkZeilen[gewerkZeilen.length - 1]).toContain('Abnahme');
  expect(gewerkZeilen.some((zeile) => zeile.includes('Rohbau'))).toBe(true);
  expect(gewerkZeilen.some((zeile) => zeile.includes('Umgebung'))).toBe(true);

  // Export lädt das Bauablaufblatt als eigenständiges, druckfähiges SVG.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="bauablauf-blatt"]'),
  ]);
  expect(download.suggestedFilename()).toBe('bauablaufblatt.svg');
  const pfad = await download.path();
  const svg = readFileSync(pfad!, 'utf8');
  expect(svg).toContain('<svg');
  expect(svg).toContain('Bauablaufplan');
  expect(svg).toContain('Abgeleiteter Grob-Terminplan, ersetzt keine Bauleitung.');
});
