import { expect, test } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { waehleOption } from './helfer/waehleOption';

/**
 * D5 (Serie D, KosmoData-Dach) — der Archiv-Tab: das Manifest für «alles auf
 * der HDD» am HomePC (Owner-Mandat, `docs/EIN-SYSTEM-KOSMODATA.md` D5).
 * Bewusst KEIN Datenumzug: grosse Bestände bleiben auf der HDD, KosmoOrbit
 * führt nur das Verzeichnis (IndexedDB `kosmo-archiv`). Jeder Eintrag ist
 * `visibility: 'private'` — nie in die Website. Diese Suite prüft manuelle
 * Erfassung, das Ordner-Register (nur Namen/Anzahl/Grösse, keine Byte-Kopie)
 * und Entfernen; ausserdem zeigt der Übersichts-Tab jetzt sechs
 * Sammlungskacheln inkl. Archiv.
 */

test('KosmoData-Archiv: Leerzustand, manuelle Erfassung, Ordner-Register, Suche, Entfernen', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();

  await page.click('[data-testid="module-data"]');
  await page.click('[data-testid="tab-archiv"]');

  const archivTab = page.locator('[data-testid="kosmodata-archiv"]');
  await expect(archivTab).toBeVisible();

  // Ehrlichkeits-Banner: lokal & privat, nie in die Website.
  const hinweis = page.locator('[data-testid="archiv-hinweis"]');
  await expect(hinweis).toBeVisible();
  await expect(hinweis).toContainText('nie in die Website');
  await expect(hinweis).toContainText('HomeStation');

  // Frischer Tresor: Leerzustand.
  await expect(page.locator('[data-testid="archiv-leer"]')).toBeVisible();
  await expect(page.locator('[data-testid="archiv-eintrag"]')).toHaveCount(0);

  // Manuelle Erfassung eines Bestands.
  await page.fill('[data-testid="archiv-feld-name"]', 'Projekte 2010-2020');
  await page.fill('[data-testid="archiv-feld-pfad"]', 'D:\\Archiv\\Projekte 2010-2020');
  await waehleOption(page, 'archiv-feld-kategorie', 'projekte');
  await page.click('[data-testid="archiv-hinzu"]');

  await expect(page.locator('[data-testid="meldung-erfolg"]')).toBeVisible();
  await expect(page.locator('[data-testid="archiv-leer"]')).toHaveCount(0);
  const eintraege = page.locator('[data-testid="archiv-eintrag"]');
  await expect(eintraege).toHaveCount(1);
  await expect(eintraege.first()).toContainText('Projekte 2010-2020');
  await expect(eintraege.first()).toContainText('D:\\Archiv\\Projekte 2010-2020');

  // Suche findet den erfassten Bestand über den Pfad, nicht über Rauschen.
  await page.fill('[data-testid="archiv-search"]', 'projekte 2010');
  await expect(eintraege).toHaveCount(1);
  await page.fill('[data-testid="archiv-search"]', 'kein-treffer-xyz');
  await expect(eintraege).toHaveCount(0);
  await page.fill('[data-testid="archiv-search"]', '');
  await expect(eintraege).toHaveCount(1);

  // Ordner-Register (Browser, feature-detektiert): nur Namen/Anzahl/Grösse
  // werden gelesen — keine Byte-Kopie. Ein `webkitdirectory`-Input akzeptiert
  // von Playwright nur einen echten Verzeichnispfad (kein Buffer-Upload) —
  // darum ein kleiner Testordner mit ein paar Dateien auf der Platte.
  const ordner = mkdtempSync(join(tmpdir(), 'kosmo-archiv-e2e-'));
  writeFileSync(join(ordner, 'plan-eg.pdf'), Buffer.alloc(2048, 1));
  writeFileSync(join(ordner, 'plan-og.pdf'), Buffer.alloc(4096, 1));
  writeFileSync(join(ordner, 'foto-baustelle.jpg'), Buffer.alloc(1024, 1));
  await page.setInputFiles('[data-testid="archiv-ordner-input"]', ordner);

  await expect(eintraege).toHaveCount(2);
  const ordnerEintrag = eintraege.filter({ hasText: 'Dateien' });
  await expect(ordnerEintrag).toHaveCount(1);
  await expect(ordnerEintrag).toContainText('3 Dateien');
  // Gesamtgrösse (2048 + 4096 + 1024 = 7168 B = 7.0 KB) erscheint formatiert.
  await expect(ordnerEintrag).toContainText('KB');

  // Entfernen: Bestätigungsdialog (kein natives confirm()), dann weg.
  await ordnerEintrag.locator('[data-testid="archiv-entfernen"]').click();
  const dialog = page.locator('[data-testid="bestaetigung"]');
  await expect(dialog).toBeVisible();
  await page.click('[data-testid="bestaetigung-ja"]');
  await expect(eintraege).toHaveCount(1);

  // Übersichts-Tab: sechs Sammlungskacheln, Archiv inklusive.
  await page.click('[data-testid="tab-uebersicht"]');
  await expect(page.locator('[data-testid="kosmodata-dach"]')).toBeVisible();
  await expect(page.locator('[data-testid="dach-zahl-archiv"]')).toBeVisible();
  await expect(page.locator('[data-testid="dach-zahl-archiv"]')).toContainText('1');

  await page.screenshot({ path: 'e2e-results/kosmodata-archiv.png' });
});
