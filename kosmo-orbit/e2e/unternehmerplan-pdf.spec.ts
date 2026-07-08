import { expect, test, type Page } from '@playwright/test';

/**
 * C5 (Nacht v0.6.2, PDF-Pfad des Unternehmerplan-Imports,
 * `docs/SUBMISSION-KONZEPT.md` Abschnitt C5/PDF) — Vorbild
 * `e2e/unternehmerplan.spec.ts`: derselbe Bootstrap, derselbe
 * `filechooser`-Weg über `import-dxf` (der Dateiwahl-Dialog nimmt jetzt
 * auch `.pdf` an, s. `DesignWorkspace.tsx`).
 *
 * Der Cloud-Vision-Anfrage-Pfad wird hier bewusst NICHT gefakt — er läuft
 * mit der Standard-`kosmo.llm`-Einstellung (`provider: 'mock'`, Betriebsart
 * `standard`, s. `bootstrapDesign`) ohnehin nie an; beide Tests hier prüfen
 * exakt den ehrlichen `hinweis`-Pfad (`apps/kosmo-orbit/test/
 * unternehmerplan-pdf.test.ts` deckt das Gate selbst inkl. `vision-anfrage`
 * rein unit-seitig ab).
 */

async function bootstrapDesign(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
  });
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG
  await page.click('[data-testid="view-2d"]'); // volle Breite, ruhigere Plan-Koordinaten
}

/** Ein winziges, aber gültiges PDF-Magic-Präfix — kein echter Plan nötig,
 * die Erkennung prüft nur die ersten vier Bytes (`%PDF`). */
const MINI_PDF = Buffer.from('%PDF-1.4\n%…kein echter Plan, nur die Magic-Bytes fuer die Erkennung…\n');

test('Unternehmerplan-Import: PDF (.pdf) löst den ehrlichen Hinweis aus, kein Parser-Versuch, keine Karten', async ({
  page,
}) => {
  await bootstrapDesign(page);

  // Ohne geladenen Unternehmerplan gibt es kein Panel.
  await expect(page.locator('[data-testid="unternehmerplan-panel"]')).toHaveCount(0);

  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('[data-testid="import-dxf"]'),
  ]);
  await chooser.setFiles({ name: 'unternehmer-plan.pdf', mimeType: 'application/pdf', buffer: MINI_PDF });

  // Meldung: derselbe Text, den `pdfImportPfad` für den hinweis-Pfad liefert
  // (Standard-Betriebsart, Mock-Provider — kein Cloud-Anthropic-Zugang).
  const info = page.locator('[data-testid="meldung-info"]').first();
  await expect(info).toBeVisible({ timeout: 10_000 });
  await expect(info).toContainText('PDF');
  await expect(info).toContainText('DXF');

  // Panel erscheint mit dem ehrlichen Hinweis — KEINE Karten, kein Toggle.
  const panel = page.locator('[data-testid="unternehmerplan-panel"]');
  await expect(panel).toBeVisible();
  const hinweis = panel.locator('[data-testid="pdf-hinweis"]');
  await expect(hinweis).toBeVisible();
  await expect(hinweis).toContainText('keine automatische Analyse');
  await expect(hinweis).toContainText('DXF');

  await expect(panel.locator('[data-testid="unternehmerplan-karten"]')).toHaveCount(0);
  await expect(panel.locator('[data-testid^="karte-"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="unternehmerplan-toggle"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="unternehmerplan-overlay"]')).toHaveCount(0);

  // Kein Fehler wurde gemeldet — der ehrliche Hinweis ist kein Fehlerfall.
  await expect(page.locator('[data-testid="meldung-fehler"]')).toHaveCount(0);
});

test('Unternehmerplan-Import: PDF-Inhalt mit falscher Endung .dxf greift über die Magic-Bytes — derselbe ehrliche Pfad statt Parser-Kauderwelsch', async ({
  page,
}) => {
  await bootstrapDesign(page);

  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('[data-testid="import-dxf"]'),
  ]);
  // Falsche Endung .dxf, aber der Inhalt beginnt mit %PDF — die
  // Magic-Bytes-Erkennung greift als Fallback (DesignWorkspace.tsx prüft
  // Endung zuerst, dann die ersten vier Bytes).
  await chooser.setFiles({
    name: 'versehentlich-als-dxf-verschickt.dxf',
    mimeType: 'application/octet-stream',
    buffer: MINI_PDF,
  });

  // Derselbe ehrliche Hinweis wie im .pdf-Fall — NICHT ein
  // DXF-Parse-Fehler/Kauderwelsch aus `parseDxf`.
  const info = page.locator('[data-testid="meldung-info"]').first();
  await expect(info).toBeVisible({ timeout: 10_000 });
  await expect(info).toContainText('PDF');

  const hinweis = page.locator('[data-testid="pdf-hinweis"]');
  await expect(hinweis).toBeVisible();
  await expect(hinweis).toContainText('keine automatische Analyse');

  // Kein DXF-Parse-Fehler wurde gemeldet (das wäre der Beweis, dass die
  // Datei fälschlich in `parseDxf` gelandet wäre).
  await expect(page.locator('[data-testid="meldung-fehler"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="unternehmerplan-karten"]')).toHaveCount(0);
});
