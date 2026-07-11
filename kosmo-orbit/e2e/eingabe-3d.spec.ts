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
  setCamera: (px: number, py: number, pz: number, tx: number, ty: number, tz: number) => void;
};

// v0.7.0 E3: `window.__kosmo.run(...)` für den 3D-Darstellungsmodus-Test
// unten — dieselbe globale Bridge wie in `abnahme.spec.ts` u.a., hier bisher
// ungenutzt (der Rest der Datei arbeitet mit `__kosmoViewport` + rohen
// PointerEvents).
declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[] };
    };
  }
}

async function bootstrap3D(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    // Block-E-Guide startet sonst automatisch und fängt Klicks unter seiner
    // Karte ab (nav-fit/Export) — Tests emulieren den erfahrenen Nutzer.
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
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
      // buttons-Bitmaske: links=1, mitte=4, rechts=2.
      const maske = button === 1 ? 4 : button === 2 ? 2 : 1;
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
      feuer('pointerdown', von[0], von[1], maske);
      hook.renderOnce();
      for (let i = 1; i <= schritte; i++) {
        const x = von[0] + ((nach[0] - von[0]) * i) / schritte;
        const y = von[1] + ((nach[1] - von[1]) * i) / schritte;
        feuer('pointermove', x, y, maske);
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

test('J2: Mitteltaste dreht die Kamera (ArchiCAD/Blender-Muscle-Memory)', async ({ page }) => {
  await bootstrap3D(page);
  const hook = () => page.evaluate(() => (window as unknown as { __kosmoViewport: CamHook }).__kosmoViewport.getCamera());
  const vorher = await hook();
  const cv = (await page.locator('canvas').first().boundingBox())!;
  await pointerGeste(page, { pointerType: 'mouse', button: 1, von: [cv.width / 2 - 100, cv.height / 2], nach: [cv.width / 2 + 100, cv.height / 2] });
  const nachher = await hook();
  const posDelta = Math.hypot(nachher.px - vorher.px, nachher.py - vorher.py, nachher.pz - vorher.pz);
  expect(posDelta).toBeGreaterThan(0.2);
});

test('J2: Rechtsklick öffnet das Kontextmenü; «Einpassen» führt es aus', async ({ page }) => {
  await bootstrap3D(page);
  const cv = (await page.locator('canvas').first().boundingBox())!;
  // Rechtsklick ohne Drag am Canvas-Mittelpunkt.
  await page.evaluate(
    ({ x, y }) => {
      const c = document.querySelector('canvas') as HTMLCanvasElement;
      const r = c.getBoundingClientRect();
      const opt = (buttons: number) => ({ pointerId: 3, pointerType: 'mouse', button: 2, buttons, clientX: r.left + x, clientY: r.top + y, bubbles: true, cancelable: true, composed: true });
      c.dispatchEvent(new PointerEvent('pointerdown', opt(2)));
      c.dispatchEvent(new PointerEvent('pointerup', opt(0)));
    },
    { x: cv.width / 2, y: cv.height / 2 },
  );
  await expect(page.locator('[data-testid="viewport-kontextmenue"]')).toBeVisible();
  for (const t of ['kontext-auswaehlen', 'kontext-fokus', 'kontext-einpassen', 'kontext-reset']) {
    await expect(page.locator(`[data-testid="${t}"]`)).toBeVisible();
  }
  await page.click('[data-testid="kontext-einpassen"]');
  await expect(page.locator('[data-testid="viewport-kontextmenue"]')).toHaveCount(0); // Menü schliesst
});

test('J2: Kontextcursor wechselt mit dem Werkzeug', async ({ page }) => {
  await bootstrap3D(page);
  const cursor = () => page.evaluate(() => (document.querySelector('canvas') as HTMLCanvasElement).style.cursor);
  await page.click('[data-testid="tool-wand"]');
  await expect.poll(cursor).toBe('crosshair'); // Zeichen-Werkzeug
  await page.click('[data-testid="tool-auswahl"]');
  await expect.poll(cursor).toBe('default'); // Auswahl zeigt den Zeiger
});

test('J1b: Doppel-Tap passt die Ansicht ein (Kamera bewegt sich)', async ({ page }) => {
  await bootstrap3D(page);
  // Eine Wand anlegen, damit es etwas einzupassen gibt.
  await page.evaluate(() => {
    const k = window.__kosmo as { run: (id: string, p: unknown) => unknown; state: () => { activeStoreyId: string | null; doc: { byKind: (k: string) => { id: string; name?: string }[] } } };
    const st = k.state();
    const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW'))!;
    k.run('design.wandZeichnen', { storeyId: st.activeStoreyId, a: { x: 0, y: 0 }, b: { x: 6000, y: 0 }, assemblyId: aw.id });
  });
  const hook = () => page.evaluate(() => (window as unknown as { __kosmoViewport: CamHook }).__kosmoViewport.getCamera());
  await page.waitForTimeout(600); // derive-Worker baut das Wand-Mesh
  // Kamera bewusst weit weg setzen — so bewegt ein Doppel-Tap-Einpassen sie
  // messbar, egal ob es auf den Wand-Körper oder (falls das Mesh noch fehlt)
  // aufs Modell/Home einpasst.
  await page.evaluate(() => (window as unknown as { __kosmoViewport: CamHook }).__kosmoViewport.setCamera(45, 32, 45, 0, 0, 0));
  const vorher = await hook();
  const cv = (await page.locator('canvas').first().boundingBox())!;
  // Zwei schnelle Taps in der Canvas-Mitte (synchron → < DOPPELTAP_MS). KEIN
  // renderOnce — der live rAF-Loop animiert die gedämpfte fitToBox aus (im
  // synchronen renderOnce-Loop wäre clock.getDelta() ~0, die Kamera bliebe stehen).
  await page.evaluate(
    ({ x, y }) => {
      const c = document.querySelector('canvas') as HTMLCanvasElement;
      const r = c.getBoundingClientRect();
      const ev = (typ: string, buttons: number) =>
        c.dispatchEvent(new PointerEvent(typ, { pointerId: 5, pointerType: 'touch', button: 0, buttons, clientX: r.left + x, clientY: r.top + y, bubbles: true, cancelable: true, composed: true }));
      ev('pointerdown', 1);
      ev('pointerup', 0);
      ev('pointerdown', 1);
      ev('pointerup', 0);
    },
    { x: cv.width / 2, y: cv.height / 2 },
  );
  await expect
    .poll(
      async () => {
        const n = await hook();
        return Math.hypot(n.px - vorher.px, n.py - vorher.py, n.pz - vorher.pz);
      },
      { timeout: 4000 },
    )
    .toBeGreaterThan(0.2);
});

test('v0.7.0 E3: data-darstellung3d spiegelt den aufgelösten 3D-Darstellungsmodus (Default weiss, dann material/schwarz per Command)', async ({ page }) => {
  await bootstrap3D(page);
  // Frisches Projekt: darstellung3d fehlt (Default 'auto'), siaPhase-Default
  // ist 'wettbewerb' (V070-KONZEPT E1) → aufgeloesteDarstellung3d() löst auf
  // 'weiss' auf (Owner-Entscheid: Weissmodell als Phasen-Default).
  await expect(page.locator('[data-testid="viewport3d"]')).toHaveAttribute('data-darstellung3d', 'weiss');

  await page.evaluate(() => window.__kosmo.run('design.darstellung3dSetzen', { darstellung3d: 'schwarz' }));
  await expect(page.locator('[data-testid="viewport3d"]')).toHaveAttribute('data-darstellung3d', 'schwarz');

  await page.evaluate(() => window.__kosmo.run('design.darstellung3dSetzen', { darstellung3d: 'material' }));
  await expect(page.locator('[data-testid="viewport3d"]')).toHaveAttribute('data-darstellung3d', 'material');

  // 'auto' zurück: löst wieder über siaPhase auf (unverändert 'wettbewerb' → weiss).
  await page.evaluate(() => window.__kosmo.run('design.darstellung3dSetzen', { darstellung3d: 'auto' }));
  await expect(page.locator('[data-testid="viewport3d"]')).toHaveAttribute('data-darstellung3d', 'weiss');
});

test('v0.7.1 E5 4A («Fenster echt»): Wand + Fenster rendert sichtbar andere Geometrie als die Wand allein (echter Pixel-Beweis)', async ({ page }) => {
  // deriveAllMitFensterdetails (scene.ts) fügt für JEDE Fenster-Öffnung eine
  // Glas-Ebene + (ohne fensterTyp) einen Standard-Rahmen-Loop hinzu — NUR im
  // 3D-Viewport (deriveAll für Schnitt/Axo/GLTF/Kamera bleibt bewusst
  // unverändert, s. packages/kosmo-kernel/test/fenster.test.ts). Es gibt
  // (bewusst) keinen Mesh-Zähler für die reguläre Modell-Gruppe im Viewport —
  // `__kosmoViewport.glbMeshCount()` zählt NUR das separat geladene
  // Referenz-GLB (`glbGroup`, s. e2e/ref3d-laden.spec.ts), keine three-Szene
  // ist sonst ans `window` gehängt. Der ehrliche Beweis hier: derselbe
  // Frame/dieselbe Kamera/dasselbe statische Licht — das gerenderte Bild
  // ändert sich NUR, wenn tatsächlich neue Geometrie (Glas + Rahmen) in der
  // Szene ankam. Kein Datenzähler, ein echter Pixel-Diff über den bereits
  // bestehenden `captureFrame()`-Hook (0.6.7 P0, «Für Vis aufnehmen»).
  await bootstrap3D(page);
  type ViewportHook = CamHook & { captureFrame: () => string | null };

  const { wallId } = await page.evaluate(() => {
    const k = window.__kosmo as unknown as {
      run: (id: string, p: unknown) => { patches: { id: string }[] };
      state: () => { activeStoreyId: string | null; doc: { byKind: (k: string) => { id: string; name?: string }[] } };
    };
    const st = k.state();
    const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW'))!;
    const w = k.run('design.wandZeichnen', { storeyId: st.activeStoreyId, a: { x: 0, y: 0 }, b: { x: 6000, y: 0 }, assemblyId: aw.id });
    return { wallId: w.patches[0]!.id };
  });
  await page.waitForTimeout(600); // derive-Worker/Sync-Loop baut das Wand-Mesh (wie J1b oben)

  // Kamera fix auf das kleine Modell — dieselbe Diagonalsicht wie J1b oben
  // (dort bereits erprobt: zeigt ein 6m-Wandmodell vollständig im Bild).
  await page.evaluate(() => (window as unknown as { __kosmoViewport: ViewportHook }).__kosmoViewport.setCamera(45, 32, 45, 0, 0, 0));
  const vorFensterBild = await page.evaluate(() => {
    const h = (window as unknown as { __kosmoViewport: ViewportHook }).__kosmoViewport;
    h.renderOnce();
    return h.captureFrame();
  });
  expect(vorFensterBild).toBeTruthy();

  // Fenster OHNE fensterTyp in dieselbe Wand stanzen — Standardrahmen + Glas.
  await page.evaluate(
    ({ wallId }) => {
      const k = window.__kosmo as unknown as { run: (id: string, p: unknown) => unknown };
      k.run('design.oeffnungSetzen', { wallId, openingType: 'fenster', center: 3000, width: 1600, height: 1400, sill: 900 });
    },
    { wallId },
  );
  await page.waitForTimeout(300); // kleines Modell → synchroner Derive-Pfad, grosszügig für den Sync-Loop

  const nachFensterBild = await page.evaluate(() => {
    const h = (window as unknown as { __kosmoViewport: ViewportHook }).__kosmoViewport;
    h.renderOnce();
    return h.captureFrame();
  });
  expect(nachFensterBild).toBeTruthy();

  // Der eigentliche Beweis: dieselbe Kamera, dasselbe statische Licht — das
  // gerenderte Bild ändert sich, weil tatsächlich neue Geometrie ankam.
  expect(nachFensterBild).not.toBe(vorFensterBild);

  // Zusätzlich der Daten-Weg: die Öffnung existiert wirklich im Doc.
  const oeffnungen = await page.evaluate(() => window.__kosmo.state().doc.byKind('opening').length);
  expect(oeffnungen).toBe(1);
});

test('J1b: Long-Press öffnet das Kontextmenü', async ({ page }) => {
  await bootstrap3D(page);
  const cv = (await page.locator('canvas').first().boundingBox())!;
  // Finger auf die Canvas-Mitte legen und HALTEN — der Renderloop prüft
  // pruefeLongPress je Frame; nach > 500 ms erscheint das Menü.
  await page.evaluate(
    ({ x, y }) => {
      const c = document.querySelector('canvas') as HTMLCanvasElement;
      const r = c.getBoundingClientRect();
      c.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 6, pointerType: 'touch', button: 0, buttons: 1, clientX: r.left + x, clientY: r.top + y, bubbles: true, cancelable: true, composed: true }));
    },
    { x: cv.width / 2, y: cv.height / 2 },
  );
  await expect(page.locator('[data-testid="viewport-kontextmenue"]')).toBeVisible({ timeout: 3000 });
  await page.evaluate(() => {
    const c = document.querySelector('canvas') as HTMLCanvasElement;
    const r = c.getBoundingClientRect();
    c.dispatchEvent(new PointerEvent('pointerup', { pointerId: 6, pointerType: 'touch', button: 0, buttons: 0, clientX: r.left, clientY: r.top, bubbles: true, cancelable: true, composed: true }));
  });
});
