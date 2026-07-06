import { expect, test } from '@playwright/test';

/**
 * Splat-Werkzeug (Owner-Korrektur 05.07.: Gaussian-Splats sind NICHT
 * HomeStation-exklusiv) — Stufe 1 komplett lokal im Browser: Import (bereits
 * bestehend) → Zuschneiden → Ausdünnen → Export als .splat. Diese Spec baut
 * eine winzige, gültige antimatter15-.splat-Datei (4 Punkte) direkt im
 * Node-Kontext des Tests (kein Zugriff auf die App-Module nötig) und prüft
 * den ganzen Werkzeugweg im Browser.
 *
 * NICHT in diesem Batch ausgeführt (Owner-Auftrag: Playwright ist Opus'
 * serieller Job) — bitte beim Zusammenführen laufen lassen.
 */

/** antimatter15 .splat: 32 Bytes/Splat — pos f32×3, scale f32×3, rgba u8×4, quat u8×4. */
function baueSplatDatei(punkte: { pos: [number, number, number]; scale: number; rgba: [number, number, number, number] }[]): Buffer {
  const buf = Buffer.alloc(punkte.length * 32);
  punkte.forEach((p, i) => {
    const o = i * 32;
    buf.writeFloatLE(p.pos[0], o);
    buf.writeFloatLE(p.pos[1], o + 4);
    buf.writeFloatLE(p.pos[2], o + 8);
    buf.writeFloatLE(p.scale, o + 12);
    buf.writeFloatLE(p.scale, o + 16);
    buf.writeFloatLE(p.scale, o + 20);
    buf.writeUInt8(p.rgba[0], o + 24);
    buf.writeUInt8(p.rgba[1], o + 25);
    buf.writeUInt8(p.rgba[2], o + 26);
    buf.writeUInt8(p.rgba[3], o + 27);
    buf.writeUInt8(128, o + 28);
    buf.writeUInt8(128, o + 29);
    buf.writeUInt8(128, o + 30);
    buf.writeUInt8(255, o + 31);
  });
  return buf;
}

test('Splat-Werkzeug: Import → Zuschneiden → Ausdünnen → Export (voll lokal)', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');

  const datei = baueSplatDatei([
    { pos: [0, 0, 0], scale: 0.05, rgba: [255, 0, 0, 255] },
    { pos: [1, 1, 1], scale: 0.05, rgba: [0, 255, 0, 255] },
    { pos: [2, 2, 2], scale: 0.05, rgba: [0, 0, 255, 255] },
    { pos: [50, 50, 50], scale: 0.05, rgba: [255, 255, 0, 255] }, // ausserhalb der Test-Crop-Box
  ]);

  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('[data-testid="import-splat"]'),
  ]);
  await chooser.setFiles({ name: 'testwolke.splat', mimeType: 'application/octet-stream', buffer: datei });

  // Import öffnet automatisch das Splat-Werkzeug mit der Punktzahl
  await expect(page.locator('[data-testid="splat-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="splat-count"]')).toContainText('4');

  // Zuschneiden: Box lässt nur die drei inneren Punkte durch
  await page.fill('[data-testid="splat-crop-minx"]', '-1');
  await page.fill('[data-testid="splat-crop-miny"]', '-1');
  await page.fill('[data-testid="splat-crop-minz"]', '-1');
  await page.fill('[data-testid="splat-crop-maxx"]', '10');
  await page.fill('[data-testid="splat-crop-maxy"]', '10');
  await page.fill('[data-testid="splat-crop-maxz"]', '10');
  await page.click('[data-testid="splat-crop"]');
  await expect(page.locator('[data-testid="splat-count"]')).toContainText('3');

  // Ausdünnen: Faktor 2 behält jeden zweiten der verbliebenen 3 Punkte → 2
  await page.fill('[data-testid="splat-decimate-faktor"]', '2');
  await page.click('[data-testid="splat-decimate"]');
  await expect(page.locator('[data-testid="splat-count"]')).toContainText('2');

  // Export als .splat — echter Blob-Download, kein Fake
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="splat-export"]'),
  ]);
  expect(download.suggestedFilename()).toBe('kosmo-splat.splat');
  const pfad = await download.path();
  const { statSync } = await import('node:fs');
  // 2 Punkte × 32 Bytes
  expect(statSync(pfad!).size).toBe(64);
});

test('Video → Splat: lokale Frame-Extraktion + ehrliche Bridge-Übergabe (kein Fake-Ergebnis)', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="splat-werkzeug-toggle"]');
  await expect(page.locator('[data-testid="splat-panel"]')).toBeVisible();

  // Eine winzige, gültige WebM-Datei wird im Browser nicht zwingend
  // dekodierbar sein (kein echtes Kamera-Video zur Hand) — dieser Test prüft
  // darum primär den ehrlichen Übergabe-/Status-Pfad: ohne Frames bleibt
  // «An Splat-Konverter übergeben» deaktiviert, der Status-Text verspricht
  // nichts Falsches.
  await expect(page.locator('[data-testid="video-splat-start"]')).toBeDisabled();
  await expect(page.locator('[data-testid="video-frames-extract"]')).toContainText('noch keine Frames');
  await expect(page.locator('[data-testid="video-splat-status"]')).toContainText('Noch nicht gestartet');

  // TODO (Opus, mit echter Kamera-Testdatei unter e2e/fixtures/):
  // chooser.setFiles(...) mit echtem kurzen .mp4 → Frames extrahieren →
  // «An Splat-Konverter übergeben» → mit --fake-Bridge muss der Status
  // "kein-sfm-worker" + Frame-Anzahl zeigen, NIE ein Splat-Ergebnis vortäuschen.
});
