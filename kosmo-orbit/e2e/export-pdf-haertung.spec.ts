import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * PDF-Härtung + Export-Dateiname-Vorschau (v0.8.0 P8, `docs/V080-PLANKOPF-
 * SPEZ.md` §4.4/§9 P-K8/P-I8) — deckt die im Bau-Auftrag geforderten
 * Kernpunkte ab:
 *
 *  - Der Nutzer SIEHT den (Plancode-basierten) Export-Dateinamen VOR dem
 *    Export (`export-dateiname` im `PlankopfPanel`, additiv, byte-gleich
 *    zum tatsächlichen `exportSetSvgs()`-Dateinamen).
 *  - Set-PDF-Export mit vollen Stammdaten + Büro-Logo (PNG) läuft durch:
 *    Datei existiert, beginnt mit `%PDF`, ist über einer Mindestgrösse.
 *  - Text-Layer-Beweis: der Plancode-String erscheint im PDF-Textlayer
 *    (svg2pdf rendert den Plankopf als echten Vektortext, nicht als Bild —
 *    `pdfjs-dist` liest ihn zurück, derselbe Font-Pfad wie
 *    `docs/rundgang/d4-pdffonts-stichprobe.mjs`).
 *  - Logo-Härtung: das Büro-Logo (`<image>` im Plankopf-SVG, s.
 *    `derive/plankopf.ts` `plankopfSvg()`) nimmt NICHT den `ohneRaster`-
 *    Ausschluss von `sheet.bilder` — es läuft durch svg2pdf's eigenen
 *    `<image>`-Renderer. Befund dieses Pakets: svg2pdf.js 2.7 rendert
 *    Daten-URL-`<image>`s zuverlässig als `paintImageXObject`-Operator im
 *    PDF (per Quellcode-Lektüre `svg2pdf.es.js` `ImageNode.renderCore`
 *    bestätigt) — dieser Test beweist es zusätzlich empirisch am ECHTEN
 *    Export-Weg (Chromium, kein Spike): das Operator-Listing der ersten
 *    Seite enthält `OPS.paintImageXObject`.
 */

declare global {
  interface Window {
    __kosmo: { open: (s: string) => void; run: (id: string, p: unknown) => unknown };
  }
}

/** Mini-1×1-PNG (dieselbe Fixture wie `plankopf-commands.test.ts`/
 * `haerte.test.ts` — reicht, um den echten PNG-IHDR-Weg + die svg2pdf-
 * Bildeinbettung zu beweisen, ohne eine echte Logodatei ins Repo zu legen). */
const MINI_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function ladeUndOeffnePublish(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.goto('/');
  await page.click('[data-testid="load-tkb"]');
  await page.evaluate(() => window.__kosmo.open('publish'));
  await expect(page.locator('[data-testid="publish-werkzeugleiste"]')).toBeVisible();
}

test('Export-Dateiname-Vorschau: der Plancode-Name erscheint im Panel, BEVOR exportiert wird', async ({ page }) => {
  await ladeUndOeffnePublish(page);
  await page.click('[data-testid="add-sheet"]');
  await page.click('[data-testid="publish-plankopf"]');
  await expect(page.locator('[data-testid="plankopf-panel"]')).toBeVisible();

  // Ohne Stammdaten: Vorschau zeigt den heutigen Alt-Namen (Guard, keine
  // Plancode-Antäuschung ohne Daten).
  const vorschau = page.locator('[data-testid="export-dateiname"]');
  await expect(vorschau).toBeVisible();
  await expect(vorschau).toContainText(/^P-01_.+\.svg$/);

  await page.fill('[data-testid="plankopf-buero-kuerzel"]', 'MAA');
  await page.locator('[data-testid="plankopf-buero-kuerzel"]').blur();
  await page.fill('[data-testid="plankopf-projekt-code"]', 'SEE');
  await page.locator('[data-testid="plankopf-projekt-code"]').blur();
  await page.fill('[data-testid="plankopf-disziplin"]', 'A');
  await page.locator('[data-testid="plankopf-disziplin"]').blur();
  await page.fill('[data-testid="plankopf-geschoss"]', 'EG');
  await page.locator('[data-testid="plankopf-geschoss"]').blur();
  await page.fill('[data-testid="plankopf-plan-nummer"]', '101');
  await page.locator('[data-testid="plankopf-plan-nummer"]').blur();

  // Mit vollen Stammdaten: Vorschau schaltet automatisch auf den
  // Plancode-Namen — GENAU der Name, den `exportSetSvgs()` real vergibt.
  await expect(vorschau).toContainText(/^MAA-SEE-[A-Z]{2}-A-EG-101_.+\.svg$/);
});

test('Set-PDF mit Stammdaten + Büro-Logo: Datei existiert, %PDF-Header, Plancode im Textlayer, Logo als Bild-XObject', async ({ page }) => {
  await ladeUndOeffnePublish(page);
  // Ehrlicher Nebenfund dieses Pakets (Test-Infrastruktur, kein Produkt-Bug):
  // die TKB-Demo heisst «TKB Bibliothek Hönggerberg» (Umlaut) — Chromiums
  // Blob-Download-Pipeline liefert `download.suggestedFilename()` dafür
  // (unter Playwright/CDP nachgewiesen) als generisches «download» zurück,
  // OBWOHL das `download`-Attribut des Anchors korrekt den vollen,
  // Umlaut-Namen trägt (per Attribut-Spion nachgewiesen: die Datei selbst
  // kommt unversehrt an, nur der von Chromium GEMELDETE Name kollabiert).
  // Ein reines Test-Rauschen dieses einen Bootstraps, keine PDF-Härtung
  // dieses Pakets — umgangen hier mit einem ASCII-Projektnamen, damit die
  // Dateinamen-Assertion unten stabil bleibt.
  await page.evaluate(() => window.__kosmo.run('design.projektNameSetzen', { name: 'Testprojekt ASCII' }));
  await page.click('[data-testid="add-sheet"]');
  await page.click('[data-testid="place-plan"]');
  await expect(page.locator('[data-testid^="placement-"]')).toHaveCount(1);

  await page.click('[data-testid="publish-plankopf"]');
  await expect(page.locator('[data-testid="plankopf-panel"]')).toBeVisible();

  await page.fill('[data-testid="plankopf-buero-name"]', 'Baubüro Andrin');
  await page.locator('[data-testid="plankopf-buero-name"]').blur();
  await page.fill('[data-testid="plankopf-buero-adresse"]', 'Bahnhofstrasse 1, 8000 Zürich');
  await page.locator('[data-testid="plankopf-buero-adresse"]').blur();
  await page.fill('[data-testid="plankopf-buero-kuerzel"]', 'MAA');
  await page.locator('[data-testid="plankopf-buero-kuerzel"]').blur();
  await page.fill('[data-testid="plankopf-projekt-code"]', 'SEE');
  await page.locator('[data-testid="plankopf-projekt-code"]').blur();
  await page.fill('[data-testid="plankopf-disziplin"]', 'A');
  await page.locator('[data-testid="plankopf-disziplin"]').blur();
  await page.fill('[data-testid="plankopf-geschoss"]', 'EG');
  await page.locator('[data-testid="plankopf-geschoss"]').blur();
  await page.fill('[data-testid="plankopf-plan-nummer"]', '101');
  await page.locator('[data-testid="plankopf-plan-nummer"]').blur();
  await page.fill('[data-testid="plankopf-inhalt"]', 'Grundriss EG');
  await page.locator('[data-testid="plankopf-inhalt"]').blur();

  await page.setInputFiles('[data-testid="plankopf-buero-logo"]', {
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: Buffer.from(MINI_PNG_BASE64, 'base64'),
  });
  await expect(page.locator('[data-testid="meldung-erfolg"]')).toContainText('Büro-Logo aktualisiert');

  const plancode = await page.locator('[data-testid="plankopf-plancode"]').innerText();
  expect(plancode).toMatch(/^MAA-SEE-[A-Z]{2}-A-EG-101$/);

  await page.click('[data-testid="plankopf-schliessen"]');
  await expect(page.locator('[data-testid="plankopf-panel"]')).toHaveCount(0);

  await page.fill('[data-testid="pubset-name"]', 'Baueingabe');
  await page.click('[data-testid="pubset-speichern"]');
  await expect(page.locator('[data-testid="pubset-karte"]')).toHaveCount(1);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="pubset-pdf"]'),
  ]);
  expect(download.suggestedFilename()).toMatch(/-Baueingabe\.pdf$/);

  const pfad = await download.path();
  expect(pfad).not.toBeNull();
  const bytes = readFileSync(pfad!);

  // Smoke: Datei existiert, beginnt mit der PDF-Magic, ist über einer
  // Mindestgrösse (ein leeres/abgebrochenes jsPDF-Dokument liegt weit
  // darunter — die Fonts + der Plankopf-Vektortext + das eingebettete
  // Logo-Bild wiegen deutlich mehr als ein paar hundert Bytes).
  expect(bytes.subarray(0, 4).toString('latin1')).toBe('%PDF');
  expect(bytes.length).toBeGreaterThan(20_000);

  // Text-Layer-Beweis (pdfjs-dist, Node-Legacy-Build — derselbe Ansatz wie
  // `docs/rundgang/d4-pdffonts-stichprobe.mjs`s Font-Stichprobe, hier über
  // den ECHTEN Export-Weg statt eines isolierten Spikes).
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(bytes),
    disableWorker: true,
    isEvalSupported: false,
  });
  const pdfDoc = await loadingTask.promise;
  expect(pdfDoc.numPages).toBeGreaterThanOrEqual(1);
  const pdfPage = await pdfDoc.getPage(1);
  const textContent = await pdfPage.getTextContent();
  const text = textContent.items.map((it: { str?: string }) => it.str ?? '').join('');
  expect(text).toContain(plancode);
  // Wasserzeichen-Rotation-Härtung: die Default-Doc-Phase (`wettbewerb`) →
  // Matrix-Stufe VS, Wasserzeichen-Text «STUDIE — NICHT FÜR AUSFÜHRUNG»
  // (`PHASEN_MATRIX.VS`). Es sitzt in `<g transform="rotate(-26 …)">`
  // (`wasserzeichenSvg()`) — der Textlayer-Fund beweist, dass svg2pdf die
  // Rotation korrekt anwendet UND den Text trotzdem lesbar/extrahierbar
  // rendert (kein stiller Verlust des rotierten Elements).
  expect(text).toContain('STUDIE — NICHT FÜR AUSFÜHRUNG');

  // Logo-Härtung: das Büro-Logo ist ein `<image>` INNERHALB der
  // Plankopf-Gruppe (`plankopfSvg()`), NICHT Teil von `sheet.bilder` — es
  // nimmt darum NICHT den `ohneRaster`-Ausschluss von `exportSheetSetPdf()`
  // und läuft durch svg2pdf's eigenen `<image>`-Renderer. Befund: dieser
  // Pfad rendert zuverlässig — das Operator-Listing enthält einen
  // `paintImageXObject`-Aufruf (85), ohne Rasterisierung/Canvas nötig, um
  // das zu beweisen.
  const opList = await pdfPage.getOperatorList();
  expect(opList.fnArray).toContain(pdfjsLib.OPS.paintImageXObject);
});
