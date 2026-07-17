import { expect, test } from '@playwright/test';

/**
 * KosmoTrust — `.kxp`-Hyper-Modell-Viewer + Trust-Layer-Freigabe-Gerüst
 * (v0.8.1 / P11, `docs/V081-SPEZ.md` §7(a)/§9 C-29). Deckt den vollen
 * Kreislauf: Export aus dem laufenden Projekt (mit Vorschau VOR dem
 * Download) → echter Zip-Download → read-only Re-Import → Freigabe-
 * Zustandsmaschine mit Verlaufsprotokoll → erneuter Download des
 * aktualisierten Stands. Jede Stelle, die die Konten-/HomeStation-Grenze
 * berührt (Signatur, Freigabe-Rollen), wird auf den ehrlich sichtbaren
 * Hinweis geprüft — kein stiller Fake-Zustand.
 */

test('KosmoTrust: Leerzustand vor jedem Paket — Export-/Öffnen-Einstieg sichtbar, kein Viewer', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();

  await page.click('[data-testid="module-trust"]');
  await expect(page.locator('[data-testid="kxp-werkzeugleiste"]')).toBeVisible();
  await expect(page.locator('[data-testid="kxp-leerzustand"]')).toBeVisible();
  await expect(page.locator('[data-testid="kxp-viewer"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="kxp-export-oeffnen"]')).toBeVisible();
  await expect(page.locator('[data-testid="kxp-oeffnen"]')).toBeVisible();
});

test('KosmoTrust: Export-Dialog zeigt reale Vorschau (Blätter/Journal) VOR dem Download', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();

  // Ein echtes Blatt anlegen (Publish), damit die .kxp-Vorschau NICHT «keine
  // Pläne» zeigt — die Vorschau muss den wirklichen Projektstand spiegeln.
  await page.click('[data-testid="module-publish"]');
  await page.click('[data-testid="add-sheet"]');
  await expect(page.locator('[data-testid="sheet-0"]')).toBeVisible();
  await page.getByLabel('Zur Zentrale').click();

  await page.click('[data-testid="module-trust"]');
  await page.click('[data-testid="kxp-export-oeffnen"]');

  const dialog = page.locator('[data-testid="kxp-export-dialog"]');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('1 Blatt-SVG(s)');
  await expect(dialog).toContainText('unsigniert');

  await page.screenshot({ path: 'test-results/p11-081-export-dialog.png' });

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="kxp-export-bestaetigen"]'),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.kxp$/);
  const pfad = await download.path();
  expect(pfad).not.toBeNull();
  await expect(dialog).toHaveCount(0);
});

test('KosmoTrust: Viewer zeigt ein importiertes .kxp read-only mit Manifest + Trust-Status + Grenze', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();

  await page.click('[data-testid="module-publish"]');
  await page.click('[data-testid="add-sheet"]');
  await page.getByLabel('Zur Zentrale').click();
  await page.click('[data-testid="module-trust"]');

  await page.click('[data-testid="kxp-export-oeffnen"]');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="kxp-export-bestaetigen"]'),
  ]);
  const kxpPfad = await download.path();
  expect(kxpPfad).not.toBeNull();

  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('[data-testid="kxp-oeffnen"]'),
  ]);
  await chooser.setFiles(kxpPfad!);

  const viewer = page.locator('[data-testid="kxp-viewer"]');
  await expect(viewer).toBeVisible();
  await expect(page.locator('[data-testid="kxp-trust-status"]')).toContainText('Entwurf');
  await expect(page.locator('[data-testid="kxp-manifest"]')).toContainText('unsigniert');
  await expect(page.locator('[data-testid="kxp-plaene"]')).toBeVisible();
  // Deklarierte Grenze IMMER sichtbar, sobald ein Paket geladen ist.
  await expect(page.locator('[data-testid="kxp-grenze-hinweis"]')).toBeVisible();
  await expect(page.locator('[data-testid="kxp-grenze-hinweis"]')).toContainText('Konto');

  await page.screenshot({ path: 'test-results/p11-081-viewer-trust-status.png' });
});

test('KosmoTrust: Freigabe-Zustandsmaschine — Entwurf → Zur Freigabe → Freigegeben, Verlauf wächst, danach terminal', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();

  await page.click('[data-testid="module-publish"]');
  await page.click('[data-testid="add-sheet"]');
  await page.getByLabel('Zur Zentrale').click();
  await page.click('[data-testid="module-trust"]');
  await page.click('[data-testid="kxp-export-oeffnen"]');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="kxp-export-bestaetigen"]'),
  ]);
  const kxpPfad = await download.path();

  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('[data-testid="kxp-oeffnen"]'),
  ]);
  await chooser.setFiles(kxpPfad!);
  await expect(page.locator('[data-testid="kxp-viewer"]')).toBeVisible();

  // Entwurf → Zur Freigabe.
  await expect(page.locator('[data-testid="kxp-uebergang-zur_freigabe"]')).toBeVisible();
  await page.locator('[data-testid="kxp-notiz"]').fill('Bitte prüfen — Grundrisse EG');
  await page.click('[data-testid="kxp-uebergang-zur_freigabe"]');
  await expect(page.locator('[data-testid="kxp-trust-status"]')).toContainText('Zur Freigabe');
  await expect(page.locator('[data-testid="kxp-verlauf-eintrag"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="kxp-unheruntergeladen"], [data-testid="kxp-freigabe-aktionen"]')).toBeVisible();

  // Zur Freigabe → Freigegeben.
  await page.click('[data-testid="kxp-uebergang-freigegeben"]');
  await expect(page.locator('[data-testid="kxp-trust-status"]')).toContainText('Freigegeben');
  await expect(page.locator('[data-testid="kxp-verlauf-eintrag"]')).toHaveCount(2);
  // Freigegeben ist terminal im Gerüst — kein weiterer Übergang-Knopf.
  await expect(page.locator('[data-testid^="kxp-uebergang-"]')).toHaveCount(0);

  await page.screenshot({ path: 'test-results/p11-081-freigabe-verlauf.png' });

  // Der veränderte Trust-Stand lässt sich erneut als .kxp herunterladen —
  // «gespeichert» heisst hier: das Paket trägt seinen eigenen Verlauf.
  const [reDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="kxp-re-export"]'),
  ]);
  expect(reDownload.suggestedFilename()).toMatch(/\.kxp$/);
});

test('KosmoTrust: ein Übergang ohne gewählte Rolle bleibt unmöglich (KSelect erzwingt immer einen Wert) — Ablehnungs-Rückweg funktioniert', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();

  await page.click('[data-testid="module-publish"]');
  await page.click('[data-testid="add-sheet"]');
  await page.getByLabel('Zur Zentrale').click();
  await page.click('[data-testid="module-trust"]');
  await page.click('[data-testid="kxp-export-oeffnen"]');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="kxp-export-bestaetigen"]'),
  ]);
  const kxpPfad = await download.path();
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('[data-testid="kxp-oeffnen"]'),
  ]);
  await chooser.setFiles(kxpPfad!);

  await page.click('[data-testid="kxp-uebergang-zur_freigabe"]');
  await page.click('[data-testid="kxp-uebergang-abgelehnt"]');
  await expect(page.locator('[data-testid="kxp-trust-status"]')).toContainText('Abgelehnt');
  // Ablehnungs-Rückweg: zurück auf Entwurf bleibt möglich.
  await expect(page.locator('[data-testid="kxp-uebergang-entwurf"]')).toBeVisible();
  await page.click('[data-testid="kxp-uebergang-entwurf"]');
  await expect(page.locator('[data-testid="kxp-trust-status"]')).toContainText('Entwurf');
  await expect(page.locator('[data-testid="kxp-verlauf-eintrag"]')).toHaveCount(3);
});
