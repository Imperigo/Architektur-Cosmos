import { expect, test } from '@playwright/test';

/**
 * K3 (Owner-Rundgang 0.6.2, S. 8): «Popup-Texte dürfen niemals den Block
 * verlassen; Textblöcke dürfen niemals überlappen» — Beispiel des Owners:
 * Geschossleiste (das Verschieben-/Geschoss-Wechsel-Element links oben)
 * und das Volumenstudien-Panel. Beide sassen bei `left:12`, nur 40 px
 * Top-Abstand auseinander (`top:12` vs. `top:52`) — schon mit den
 * Standard-Geschossen EG/1.OG ragt die Geschossleiste tiefer als 40 px und
 * überdeckte das Studien-Panel. Fix (`DesignWorkspace.tsx`): das Studien-
 * Panel misst die tatsächliche Geschossleisten-Höhe und rückt IMMER
 * darunter. Dieser Test ist die Bounding-Box-Assertion: keine Überlappung,
 * unabhängig von der Geschosszahl (hier 4 Geschosse, mehr als der
 * Standard-Bootstrap).
 */

test('K3: Geschossleiste und Volumenstudien-Panel überlappen nie (Bounding-Box, auch bei mehreren Geschossen)', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/1.OG
  await page.click('[data-testid="view-2d"]');

  // Zwei weitere Geschosse — die Geschossleiste wächst über die alten
  // 40 px hinaus (das war der Reproduktionsfall des Owner-Befunds).
  await page.evaluate(() => {
    const k = window.__kosmo as { run: (id: string, p: unknown) => unknown };
    k.run('design.geschossErstellen', { name: '2.OG', index: 2, elevation: 6000, height: 3000 });
    k.run('design.geschossErstellen', { name: '3.OG', index: 3, elevation: 9000, height: 3000 });
  });

  const geschossleiste = page.locator('[data-testid="geschossleiste"]');
  await expect(geschossleiste).toBeVisible();

  // Studien-Panel öffnen (Owner-Beispiel: «Volumenstudien-Block»)
  await page.click('[data-testid="studie-toggle"]');
  const studienPanel = page.locator('[data-testid="studien-panel"]');
  await expect(studienPanel).toBeVisible();

  const gBox = await geschossleiste.boundingBox();
  const sBox = await studienPanel.boundingBox();
  expect(gBox).not.toBeNull();
  expect(sBox).not.toBeNull();

  // Keine Überlappung: die beiden Rechtecke berühren sich höchstens, sie
  // dürfen sich nicht durchdringen (Achsen-getrennte Rechtecke).
  const getrennt =
    gBox!.x + gBox!.width <= sBox!.x ||
    sBox!.x + sBox!.width <= gBox!.x ||
    gBox!.y + gBox!.height <= sBox!.y ||
    sBox!.y + sBox!.height <= gBox!.y;
  expect(getrennt).toBe(true);

  // Und zusätzlich explizit die vom Owner benannte Konstellation: das
  // Studien-Panel beginnt UNTERHALB der Geschossleiste (rückt darunter).
  expect(sBox!.y).toBeGreaterThanOrEqual(gBox!.y + gBox!.height);
});
