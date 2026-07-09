import { test, expect } from '@playwright/test';

/**
 * V-H1 «Zahlen zur Hand» (v0.6.4, VORFORM-UI-KONZEPT §1.4): während einer
 * laufenden Zeichenkette läuft eine Live-Masszahl am Cursor mit; Tippen von
 * «3.5» + Enter setzt den nächsten Punkt in der aktuellen Cursor-Richtung
 * mit exakt 3.50 m — ohne erneutes Snappen (die Zahl ist die Absicht).
 */

test('Masseingabe: Live-Label läuft mit, getippte Länge setzt den Punkt exakt', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.panelOffen', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="view-2d"]');
  await page.click('[data-testid="nav-fit"]');
  await page.waitForTimeout(300);
  await page.click('[data-testid="tool-wand"]');

  // Erster Punkt in der Planmitte, dann Cursor horizontal nach rechts
  const svg = page.locator('[data-testid="planview"]');
  const box = (await svg.boundingBox())!;
  const mitteX = box.x + box.width / 2;
  const mitteY = box.y + box.height / 2;
  await page.mouse.click(mitteX, mitteY);
  await page.mouse.move(mitteX + 120, mitteY);

  // Live-Masszahl erscheint (SVG-Text: toBeAttached, Playwright-SVG-Falle)
  const label = page.locator('[data-testid="mass-label"]');
  await expect(label).toBeAttached();
  await expect(label).toContainText(/\d+\.\d{2} m/);

  // «3.5» tippen → Puffer sichtbar, Enter → Wand mit exakt 3500 mm
  await page.keyboard.type('3.5');
  await expect(label).toContainText('3.5 m ⏎');
  await page.keyboard.press('Enter');
  const wand = await page.evaluate(() => {
    const w = window.__kosmo.state().doc.byKind('wall')[0] as unknown as {
      a: { x: number; y: number };
      b: { x: number; y: number };
    };
    return w ? { laenge: Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y), dy: w.b.y - w.a.y } : null;
  });
  expect(wand).not.toBeNull();
  expect(wand!.laenge).toBe(3500);
  expect(wand!.dy).toBe(0); // Richtung kam vom horizontalen Cursor

  // Escape verwirft NUR den Puffer, die Kette lebt weiter; zweites Escape beendet
  await page.keyboard.type('2');
  await expect(label).toContainText('2 m ⏎');
  await page.keyboard.press('Escape');
  await expect(label).not.toContainText('⏎');
  await page.keyboard.press('Escape');
  await expect(label).toHaveCount(0);

  // Fokus-Guard: Ziffern in einem Eingabefeld bauen KEINEN Puffer
  await page.click('[data-testid="tool-wand"]');
  await page.mouse.click(mitteX, mitteY + 60);
  const eingabe = page.locator('input[placeholder*="Kosmo"], textarea, input[type="text"]').first();
  if (await eingabe.count()) {
    await eingabe.click();
    await page.keyboard.type('7');
    await page.waitForTimeout(150);
    // kein Puffer entstanden — Label existiert nicht oder zeigt keinen ⏎-Puffer
    const texte = await page.locator('[data-testid="mass-label"]').allTextContents();
    expect(texte.join('')).not.toContain('⏎');
  }
});
