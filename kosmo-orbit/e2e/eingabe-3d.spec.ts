import { expect, test } from '@playwright/test';

/**
 * Serie J / J1a — einheitliches Eingabemodell Touch↔Maus im 3D.
 *
 * Bewiesen wird die LOGIK (Geste → Kamera-Delta bzw. Zeichnen-vs-Navigieren),
 * nicht die Haptik: echtes Multitouch-Gefühl (Momentum, Palm-Rejection) ist nur
 * am iPad beurteilbar (siehe docs/SERIE-J-BUILDPLAN.md §6). Synthetische
 * PointerEvents werden per `dispatchEvent` auf dem Canvas gefeuert; zwischen den
 * Schritten treibt der deterministische Hook `__kosmoViewport.renderOnce()` das
 * (gedämpfte) camera-controls-Update, `getCamera()` liest den Zustand aus.
 */

type CamHook = {
  renderOnce: () => void;
  getCamera: () => { px: number; py: number; pz: number; tx: number; ty: number; tz: number };
};

async function bootstrap3D(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG
  await page.click('[data-testid="view-3d"]');
  await page.click('[data-testid="nav-fit"]');
  await expect(page.locator('canvas').first()).toBeVisible();
}

/** Feuert eine gedrückte Pointer-Geste (down → moves → up) auf dem Canvas und
 *  rendert nach jedem Schritt einen deterministischen Frame. */
async function pointerGeste(
  page: import('@playwright/test').Page,
  opts: { pointerType: string; button?: number; pointerId?: number; von: [number, number]; nach: [number, number]; schritte?: number },
) {
  const { pointerType, button = 0, pointerId = 1, von, nach, schritte = 6 } = opts;
  await page.evaluate(
    ({ pointerType, button, pointerId, von, nach, schritte }) => {
      const cv = document.querySelector('canvas') as HTMLCanvasElement;
      const rect = cv.getBoundingClientRect();
      const hook = (window as unknown as { __kosmoViewport: { renderOnce: () => void } }).__kosmoViewport;
      const feuer = (typ: string, x: number, y: number, buttons: number) => {
        cv.dispatchEvent(
          new PointerEvent(typ, {
            pointerId,
            pointerType,
            isPrimary: true,
            button,
            buttons,
            clientX: rect.left + x,
            clientY: rect.top + y,
            bubbles: true,
            cancelable: true,
            composed: true,
          }),
        );
      };
      feuer('pointerdown', von[0], von[1], 1);
      hook.renderOnce();
      for (let i = 1; i <= schritte; i++) {
        const x = von[0] + ((nach[0] - von[0]) * i) / schritte;
        const y = von[1] + ((nach[1] - von[1]) * i) / schritte;
        feuer('pointermove', x, y, 1);
        hook.renderOnce();
      }
      feuer('pointerup', nach[0], nach[1], 0);
      // gedämpfte Kamera ausrollen lassen
      for (let i = 0; i < 12; i++) hook.renderOnce();
    },
    { pointerType, button, pointerId, von, nach, schritte },
  );
}

test('J1a: getCamera-Hook + touch-action:none am Canvas', async ({ page }) => {
  await bootstrap3D(page);
  const cam = await page.evaluate(() => (window as unknown as { __kosmoViewport: CamHook }).__kosmoViewport.getCamera());
  for (const v of Object.values(cam)) expect(typeof v).toBe('number');
  const touchAction = await page.evaluate(() => (document.querySelector('canvas') as HTMLCanvasElement).style.touchAction);
  expect(touchAction).toBe('none');
});

test('J1a: 1-Finger-Touch dreht die Kamera (Orbit)', async ({ page }) => {
  await bootstrap3D(page);
  const hook = () => page.evaluate(() => (window as unknown as { __kosmoViewport: CamHook }).__kosmoViewport.getCamera());
  const vorher = await hook();
  const cv = (await page.locator('canvas').first().boundingBox())!;
  await pointerGeste(page, { pointerType: 'touch', von: [cv.width / 2 - 100, cv.height / 2], nach: [cv.width / 2 + 100, cv.height / 2] });
  const nachher = await hook();
  // Orbit ändert die Kameraposition messbar; das Ziel bleibt (Abstand ~gleich).
  const posDelta = Math.hypot(nachher.px - vorher.px, nachher.py - vorher.py, nachher.pz - vorher.pz);
  expect(posDelta).toBeGreaterThan(0.2);
});

test('J1a: im Skizzenmodus navigiert der Finger (kein Strich), der Stift zeichnet', async ({ page }) => {
  await bootstrap3D(page);
  await page.click('[data-testid="tool-skizze"]');
  await expect(page.locator('[data-testid="sketch3d-hinweis"]')).toBeVisible();

  const cv = (await page.locator('canvas').first().boundingBox())!;
  const mitte: [number, number] = [cv.width / 2, cv.height / 2];
  const hook = () => page.evaluate(() => (window as unknown as { __kosmoViewport: CamHook }).__kosmoViewport.getCamera());

  // Finger-Drag: Kamera bewegt sich, KEIN Strich (kein Wand-Zug entsteht).
  const vorFinger = await hook();
  await pointerGeste(page, { pointerType: 'touch', von: [mitte[0] - 100, mitte[1]], nach: [mitte[0] + 100, mitte[1]] });
  const nachFinger = await hook();
  const fingerDelta = Math.hypot(nachFinger.px - vorFinger.px, nachFinger.py - vorFinger.py, nachFinger.pz - vorFinger.pz);
  expect(fingerDelta).toBeGreaterThan(0.2); // Finger hat navigiert
  // Der Finger-Zug darf keinen Roh-Strich hinterlassen haben, der beim
  // «Übergeben» zu einer Wand würde:
  expect(await page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length)).toBe(0);

  // Stift-Drag: zeichnet einen Roh-Strich, Kamera bleibt still.
  const vorPen = await hook();
  await pointerGeste(page, { pointerType: 'pen', von: [mitte[0] - 120, mitte[1] + 40], nach: [mitte[0] + 120, mitte[1] + 40] });
  const nachPen = await hook();
  const penDelta = Math.hypot(nachPen.px - vorPen.px, nachPen.py - vorPen.py, nachPen.pz - vorPen.pz);
  expect(penDelta).toBeLessThan(0.05); // Stift bewegt die Kamera NICHT
  // Der Stift-Strich wird beim Übergeben/Übernehmen zu einer Wand.
  await page.click('[data-testid="sketch3d-uebergeben"]');
  await expect(page.locator('[data-testid="sketch3d-proposal"]')).toBeVisible();
  await page.click('[data-testid="sketch3d-accept"]');
  await expect.poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length)).toBeGreaterThan(0);
});
