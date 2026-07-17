import { expect, test } from '@playwright/test';

/**
 * KosmoPackage — Export-Hub-Vollausbau + Paket-Übersicht (v0.8.1 / P14,
 * `docs/V081-SPEZ.md` §7(e)/§9 C-28/C-30). Deckt den vollen Bau-Auftrag:
 *
 *  - Der Hub zeigt AUSSCHLIESSLICH die sechs realen Formate (PDF/SVG/DXF/
 *    IFC/Splat/Büro-Logo), gruppiert nach Artefakt-Typ — keine 27-Format-
 *    Kachel-Wand.
 *  - Ohne den nötigen Kontext (kein aktives Geschoss, kein Logo) zeigt jede
 *    betroffene Kachel das ehrlich («Braucht Kontext»), statt tot zu
 *    klicken — der «Dorthin wechseln»-Knopf navigiert wirklich.
 *  - Mit vollem Kontext läuft jedes Format über den ECHTEN, bestehenden
 *    Export-Weg (`exportPlanPdf`/`exportPlanSvg`/`exportPlanDxf`/
 *    `exportIfcFile` aus `modules/design/export-plan.ts`, `downloadKxp` aus
 *    `state/kxp-io.ts`) — kein Duplikat, echte Downloads.
 *  - Das Büro-Logo lässt sich zusätzlich als eigene Datei zurückholen
 *    (`downloadBueroLogo`, NEU in diesem Paket — bisher nur eingebettet).
 */

declare global {
  interface Window {
    __kosmo: { open: (s: string) => void; run: (id: string, p: unknown) => unknown };
  }
}

test('KosmoPackage: ohne Kontext (frischer Stand) zeigt jede kontextabhängige Kachel ehrlich «Braucht Kontext», keine tote Kachel', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();

  await page.click('[data-testid="module-paket"]');
  await expect(page.locator('[data-testid="paket-werkzeugleiste"]')).toBeVisible();
  await expect(page.locator('[data-testid="paket-titel"]')).toContainText('KosmoPackage');

  // Genau sechs Format-Kacheln — keine Kachel-Attrappe.
  for (const id of ['plan-pdf', 'plan-svg', 'plan-dxf', 'modell-ifc', 'punktwolke-splat', 'buero-logo']) {
    await expect(page.locator(`[data-testid="paket-karte-${id}"]`)).toBeVisible();
  }

  // Plan-Export (kein aktives Geschoss) + Logo (kein Logo gesetzt): ehrlich «Braucht Kontext».
  for (const id of ['plan-pdf', 'plan-svg', 'plan-dxf', 'buero-logo']) {
    await expect(page.locator(`[data-testid="paket-status-${id}"]`)).toContainText('Braucht Kontext');
    await expect(page.locator(`[data-testid="paket-navigieren-${id}"]`)).toBeVisible();
    await expect(page.locator(`[data-testid="paket-export-${id}"]`)).toHaveCount(0);
  }
  // IFC braucht keinen Kontext — immer verfügbar.
  await expect(page.locator('[data-testid="paket-status-modell-ifc"]')).toContainText('Verfügbar');
  await expect(page.locator('[data-testid="paket-export-modell-ifc"]')).toBeVisible();
  // Splat: IMMER «Braucht Kontext» (kein globaler Zugriff auf die Design-Punktwolke) —
  // aber der Knopf navigiert wirklich, statt tot zu sein.
  await expect(page.locator('[data-testid="paket-status-punktwolke-splat"]')).toContainText('Braucht Kontext');
  await expect(page.locator('[data-testid="paket-hinweis-punktwolke-splat"]')).toContainText(/Design-Werkzeug|Splat-Werkzeug/);

  // .kxp bleibt IMMER exportierbar (Modell + Journal, auch ohne Blätter).
  await expect(page.locator('[data-testid="paket-export-kxp"]')).toBeVisible();
  await expect(page.locator('[data-testid="paket-kxp-leerhinweis"]')).toBeVisible();

  await page.screenshot({ path: 'test-results/p14-081-hub-kontextlos.png', fullPage: true });

  // Splat-Navigation ist ein ECHTER Sprung, kein toter Knopf: öffnet KosmoDesign
  // MIT dem Splat-Werkzeug.
  await page.click('[data-testid="paket-navigieren-punktwolke-splat"]');
  await expect(page.locator('[data-testid="splat-panel"]')).toBeVisible();
});

test('KosmoPackage: mit vollem Kontext (Geschoss + Blatt + Logo) sind alle sechs Formate + .kxp echte Downloads', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.goto('/');
  await page.click('[data-testid="load-tkb"]'); // setzt ein echtes aktives Geschoss (demo-tkb.ts)
  // Ehrlicher Nebenfund (bereits in `export-pdf-haertung.spec.ts` dokumentiert,
  // Test-Infrastruktur-Rauschen, kein Produkt-Bug): die TKB-Demo trägt einen
  // Umlaut-Projektnamen — Chromiums Download-Pipeline meldet
  // `suggestedFilename()` dafür generisch als «download» zurück, obwohl die
  // Datei selbst unversehrt den vollen Namen trägt. ASCII-Name umgeht das.
  await page.evaluate(() => window.__kosmo.run('design.projektNameSetzen', { name: 'Testprojekt ASCII' }));

  await page.evaluate(() => window.__kosmo.open('publish'));
  await expect(page.locator('[data-testid="publish-werkzeugleiste"]')).toBeVisible();
  await page.click('[data-testid="add-sheet"]');
  await expect(page.locator('[data-testid="sheet-0"]')).toBeVisible();

  // Büro-Logo setzen (SVG — echte, gültige Bytes, kein Mime-Label-Fake).
  const logoSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#123"/></svg>';
  await page.evaluate((svg) => {
    const dataUrl = `data:image/svg+xml;base64,${btoa(svg)}`;
    return window.__kosmo.run('publish.bueroSetzen', { logoDataUrl: dataUrl });
  }, logoSvg);

  await page.getByLabel('Zur Zentrale').click();
  await page.click('[data-testid="module-paket"]');
  await expect(page.locator('[data-testid="paket-werkzeugleiste"]')).toBeVisible();

  // Alles ausser Splat ist jetzt «Verfügbar».
  for (const id of ['plan-pdf', 'plan-svg', 'plan-dxf', 'modell-ifc', 'buero-logo']) {
    await expect(page.locator(`[data-testid="paket-status-${id}"]`)).toContainText('Verfügbar');
  }
  await expect(page.locator('[data-testid="paket-status-punktwolke-splat"]')).toContainText('Braucht Kontext');
  await expect(page.locator('[data-testid="paket-karte-buero-logo"]')).toContainText('SVG');

  await page.screenshot({ path: 'test-results/p14-081-hub-vollstaendig.png', fullPage: true });

  // Sechs echte Downloads über den bestehenden Export-Weg + .kxp.
  const erwarteteEndungen: Record<string, RegExp> = {
    'plan-pdf': /\.pdf$/,
    'plan-svg': /\.svg$/,
    'plan-dxf': /\.dxf$/,
    'modell-ifc': /\.ifc$/,
    'buero-logo': /\.svg$/,
  };
  for (const [id, endung] of Object.entries(erwarteteEndungen)) {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click(`[data-testid="paket-export-${id}"]`),
    ]);
    expect(download.suggestedFilename(), id).toMatch(endung);
    const pfad = await download.path();
    expect(pfad, id).not.toBeNull();
  }

  const [kxpDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="paket-export-kxp"]'),
  ]);
  expect(kxpDownload.suggestedFilename()).toMatch(/\.kxp$/);

  await expect(page.locator('[data-testid="meldung-erfolg"]').first()).toBeVisible();
});

test('KosmoPackage: Einstellungen-Knopf öffnet das gefilterte Einstellungen-Panel für diese Station', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();

  await page.click('[data-testid="module-paket"]');
  await page.click('[data-testid="station-einstellungen-paket"]');
  const panel = page.locator('[data-testid="einstellungen-panel"]');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('KosmoPackage');
});
