import { expect, test, type Page } from '@playwright/test';

/**
 * PB2 (v0.8.7 «Verortet», `docs/V087-SPEZ.md` §3 E5, §6 Sanktion 8, §7 C-14)
 * — 3D-Marquee (Shift-Drag) in Viewport3D.tsx.
 *
 * D3-Befund: `onMarqueeAuswahl` war seit v0.8.5 deklariert
 * (`Viewport3D.tsx:188`) und app-seitig verdrahtet (`DesignWorkspace.tsx
 * ~1073`: `select(additiv ? [...new Set([...sel, ...ids])] : ids)`), wurde
 * 3D-seitig aber NIE gefeuert. E5 verdrahtet die Geste: Shift+PointerDown
 * (Maus, `pickMode`) startet ein Screen-Space-Rechteck; PointerUp baut aus
 * dem Rechteck ein `THREE.Frustum` (Herleitung im Kopfkommentar von
 * `Viewport3D.tsx` bei `frustumAusRechteck`) und testet es gegen die
 * Boundingbox jedes Entity-Meshes (`model.children`, `userData['entityId']`,
 * `frustum.intersectsBox`) — **ohne Occlusion** (das Frustum sieht durch
 * Wände, V087-SPEZ.md §8, ehrliches Nicht-Ziel, hier NICHT geprüft/behauptet).
 * Sanktion 8: OHNE Shift bleibt camera-controls unangetastet — der Shift-Fall
 * biegt in `onCaptureDown` (Capture-Phase auf dem Mount-DIV, läuft VOR
 * camera-controls' eigenem Target-Phase-Listener) mit `controls.enabled =
 * false` ab, bevor camera-controls das pointerdown überhaupt sieht (Test c
 * unten beweist den Umkehrschluss: ohne Shift bewegt sich die Kamera
 * unverändert).
 *
 * Szene/Kamera-Strategie 1:1 aus `e2e/viewport3d-auswahl.spec.ts` übernommen
 * (Kopfkommentar dort, zwei erkämpfte Gruben): deterministische Kamera über
 * `__kosmoViewport.setCamera(px,py,pz,tx,ty,tz)` achsparallel (Augenhöhe =
 * Zielhöhe), Klick-/Rechteckpunkte per `weltZuBildschirm3D` aus der bekannten
 * Kamera-Geometrie nachgerechnet (kein Rate-Pixel), BEIDE Wände bewusst in
 * die linke, kartenfreie Bildschirmhälfte (Bildschirm-X < 650) projiziert —
 * die `.vch-hud-karte` schwebt sonst über der rechten Hälfte und frisst
 * Pointer-Events. `entityMeshCount()`-Poll vor jedem `setCamera` deckt
 * dieselbe Mesh-Sync-Race ab (`applyArtifacts` läuft erst im nächsten
 * rAF-Tick).
 *
 * Diese Datei ist NEU (eigener Dateikreis, `e2e/viewport3d-auswahl.spec.ts`
 * bleibt unverändert und läuft als Regression daneben, s. Abschlussbericht).
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[] };
      state: () => {
        activeStoreyId: string | null;
        selection: string[];
        doc: {
          byKind: (k: string) => { id: string; name?: string }[];
        };
        select: (ids: string[]) => void;
      };
    };
    __kosmoViewport?: {
      getCamera: () => { px: number; py: number; pz: number; tx: number; ty: number; tz: number };
      setCamera: (px: number, py: number, pz: number, tx: number, ty: number, tz: number) => void;
      renderOnce: () => void;
      captureFrame: () => string | null;
      entityMeshCount: () => number;
      kameraHudEventCount: () => number;
    };
  }
}

const MM = 1 / 1000;

async function starteManuell3D(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG
  await page.click('[data-testid="view-3d"]'); // unmountet PlanView
  await expect(page.locator('canvas').first()).toBeVisible();
  await page.waitForFunction(() => !!window.__kosmoViewport);
}

async function zeichneWand(page: Page, a: { x: number; y: number }, b: { x: number; y: number }): Promise<string> {
  return page.evaluate(
    ({ a, b }) => {
      const k = window.__kosmo;
      const st = k.state();
      const aw = st.doc.byKind('assembly').find((x) => x.name?.startsWith('AW'))!;
      const r = k.run('design.wandZeichnen', { storeyId: st.activeStoreyId, a, b, assemblyId: aw.id });
      return r.patches[0]!.id;
    },
    { a, b },
  );
}

const auswahl = (page: Page) => page.evaluate(() => window.__kosmo.state().selection);

/** Positioniert die Kamera achsparallel (Augenhöhe = Zielhöhe, reiner
 *  +Z-Versatz) — 1:1 aus `viewport3d-auswahl.spec.ts` übernommen (Vorbild
 *  dort begründet die Herleitung der einfachen Projektion unten). */
async function setzeKamera3D(page: Page, ziel: { x: number; y: number; z: number }, distanz = 15): Promise<void> {
  await page.evaluate(
    ({ ziel, distanz }) => {
      const hook = window.__kosmoViewport!;
      hook.setCamera(ziel.x, ziel.y, ziel.z + distanz, ziel.x, ziel.y, ziel.z);
      hook.renderOnce();
    },
    { ziel, distanz },
  );
}

/** Welt (Plan-mm x/y + Elevation-mm z) → Bildschirm-Pixel — byte-gleiche
 *  Formel wie `viewport3d-auswahl.spec.ts` (dieselbe achsparallele Kamera,
 *  fov=45° `Viewport3D.tsx:807`, nie verändert). */
async function weltZuBildschirm3D(page: Page, welt: { x: number; y: number; z: number }): Promise<{ x: number; y: number }> {
  return page.evaluate(
    ({ welt, MM }) => {
      const cam = window.__kosmoViewport!.getCamera();
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      const sx = welt.x * MM;
      const sy = welt.z * MM;
      const sz = -welt.y * MM;
      const xc = sx - cam.px;
      const yc = sy - cam.py;
      const zc = sz - cam.pz;
      const fovRad = (45 * Math.PI) / 180;
      const aspect = rect.width / rect.height;
      const tanHalf = Math.tan(fovRad / 2);
      const ndcX = xc / (-zc * tanHalf * aspect);
      const ndcY = yc / (-zc * tanHalf);
      return {
        x: rect.left + (ndcX * 0.5 + 0.5) * rect.width,
        y: rect.top + (1 - (ndcY * 0.5 + 0.5)) * rect.height,
      };
    },
    { welt, MM },
  );
}

async function klickPick3D(page: Page, welt: { x: number; y: number; z: number }, shift = false): Promise<void> {
  const p = await weltZuBildschirm3D(page, welt);
  if (shift) await page.keyboard.down('Shift');
  await page.mouse.click(p.x, p.y);
  if (shift) await page.keyboard.up('Shift');
}

/** Zwei Wände in der linken, kartenfreien Bildschirmhälfte (identische
 *  Geometrie/Kamera wie `viewport3d-auswahl.spec.ts` `zweiWaendeMitKamera`
 *  — bewusst 1:1 übernommen, kein neu geratenes Layout). */
async function zweiWaendeLinks(page: Page): Promise<{ w1: string; w2: string }> {
  const meshCountVorher = await page.evaluate(() => window.__kosmoViewport!.entityMeshCount());
  const w1 = await zeichneWand(page, { x: 1000, y: 3000 }, { x: 3000, y: 3000 });
  const w2 = await zeichneWand(page, { x: 7000, y: 3000 }, { x: 9000, y: 3000 });
  await expect
    .poll(() => page.evaluate(() => window.__kosmoViewport!.entityMeshCount()))
    .toBeGreaterThanOrEqual(meshCountVorher + 2);
  await setzeKamera3D(page, { x: 9000 * MM, y: 1.3, z: -3000 * MM });
  return { w1, w2 };
}

/** Bildschirm-Rechteck, das die Boundingbox EINER Wand (Plan-x-Spanne
 *  `[xMin,xMax]`, Plan-y `yPlan`, Höhe 0..2800mm Standard-Geschosshöhe)
 *  umschliesst — `padding` in CSS-px, damit Antialiasing/Rundung der
 *  Wand-Ecken sicher innerhalb des Rechtecks landet. Reine Geometrie
 *  (`weltZuBildschirm3D`), kein Rate-Pixel. */
async function rechteckFuerWand(
  page: Page,
  xMin: number,
  xMax: number,
  yPlan: number,
  padding: number,
): Promise<{ x0: number; y0: number; x1: number; y1: number }> {
  const oben = await weltZuBildschirm3D(page, { x: xMin, y: yPlan, z: 2800 });
  const unten = await weltZuBildschirm3D(page, { x: xMax, y: yPlan, z: 0 });
  return {
    x0: Math.min(oben.x, unten.x) - padding,
    y0: Math.min(oben.y, unten.y) - padding,
    x1: Math.max(oben.x, unten.x) + padding,
    y1: Math.max(oben.y, unten.y) + padding,
  };
}

const marqueeOverlay = (page: Page) => page.locator('[data-testid="viewport3d-marquee"]');

test('C-14a: Shift-Drag über beide Wände wählt beide — Overlay mid-drag sichtbar, Ergebnis per state() + Screenshot bewiesen', async ({
  page,
}) => {
  await starteManuell3D(page);
  const { w1, w2 } = await zweiWaendeLinks(page);

  // Rechteck spannt beide Wände auf (grosszügiges Padding — der leere
  // Zwischenraum stört den Frustum-Schnitt nicht, jede Wand wird einzeln
  // gegen das Rechteck-Frustum getestet).
  const r = await rechteckFuerWand(page, 1000, 9000, 3000, 20);

  await page.mouse.move(r.x0, r.y0);
  await page.keyboard.down('Shift');
  await page.mouse.down();
  // Echter Zwischenschritt (>4px) — erst DAS macht aus dem Down eine
  // Marquee-Geste (kein Klick) und zeichnet das Overlay live nach.
  await page.mouse.move((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, { steps: 6 });

  await expect(marqueeOverlay(page)).toBeVisible();
  await page.screenshot({ path: 'e2e-results/pb2-087-3d-marquee-middrag.png' });

  await page.mouse.move(r.x1, r.y1, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up('Shift');

  await expect.poll(async () => (await auswahl(page)).sort()).toEqual([w1, w2].sort());
  await expect(marqueeOverlay(page)).toBeHidden();

  await page.evaluate(() => window.__kosmoViewport!.renderOnce());
  await page.screenshot({ path: 'e2e-results/pb2-087-3d-marquee-ergebnis.png' });
});

test('C-14b: Shift-Drag über nur EINE Wand wählt genau sie; zweiter Shift-Marquee über die andere ist additiv (2)', async ({
  page,
}) => {
  await starteManuell3D(page);
  const { w1, w2 } = await zweiWaendeLinks(page);

  const rNurW1 = await rechteckFuerWand(page, 1000, 3000, 3000, 15);
  await page.mouse.move(rNurW1.x0, rNurW1.y0);
  await page.keyboard.down('Shift');
  await page.mouse.down();
  await page.mouse.move(rNurW1.x1, rNurW1.y1, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up('Shift');

  await expect.poll(() => auswahl(page)).toEqual([w1]);

  const rNurW2 = await rechteckFuerWand(page, 7000, 9000, 3000, 15);
  await page.mouse.move(rNurW2.x0, rNurW2.y0);
  await page.keyboard.down('Shift');
  await page.mouse.down();
  await page.mouse.move(rNurW2.x1, rNurW2.y1, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up('Shift');

  await expect.poll(async () => (await auswahl(page)).sort()).toEqual([w1, w2].sort());
});

test('C-14c (Sanktion 8): Drag OHNE Shift bewegt die Kamera unverändert weiter, Auswahl bleibt stehen', async ({ page }) => {
  await starteManuell3D(page);
  const { w1 } = await zweiWaendeLinks(page);

  await klickPick3D(page, { x: 2000, y: 3000, z: 1300 });
  await expect.poll(() => auswahl(page)).toEqual([w1]);

  const zaehlerVorher = await page.evaluate(() => window.__kosmoViewport!.kameraHudEventCount());
  const kameraVorher = await page.evaluate(() => window.__kosmoViewport!.getCamera());

  const rect = page.locator('canvas').first();
  const box = (await rect.boundingBox())!;
  const startX = box.x + box.width * 0.3;
  const startY = box.y + box.height * 0.5;

  // Grube (erkämpft, s. Bericht): `zweiWaendeLinks`/`setzeKamera3D` ruft
  // `__kosmoViewport.renderOnce()` — der Hook schaltet `testMode=true` UND
  // `cancelAnimationFrame(raf)` (Viewport3D.tsx `renderOnce`-Testhook),
  // schaltet also den automatischen Dauerloop dauerhaft AB. Eine reine
  // `page.mouse.move({steps:N})`-Geste bewegt danach zwar den Bildschirm-
  // Cursor und feuert echte `pointermove`-Events, aber OHNE einen
  // rAF-Tick ruft nichts mehr `controls.update()` — die Kamera bliebe
  // (fälschlich nach einem echten Bug aussehend) exakt bei 0 Delta stehen.
  // Fix: jeden Zwischenschritt selbst per `renderOnce()` antreiben — 1:1
  // dasselbe Muster wie `e2e/eingabe-3d.spec.ts`s `pointerGeste`-Helfer
  // (Kopfkommentar dort: „gedämpfte Kamera ausrollen lassen").
  await page.mouse.move(startX, startY);
  await page.evaluate(() => window.__kosmoViewport!.renderOnce());
  await page.mouse.down();
  await page.evaluate(() => window.__kosmoViewport!.renderOnce());
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(startX + 16 * i, startY - 9 * i);
    await page.evaluate(() => window.__kosmoViewport!.renderOnce());
  }
  await expect(marqueeOverlay(page)).toHaveCount(0);
  await page.mouse.up();
  // Gedämpfte Kamera ausrollen lassen (`draggingSmoothTime`/`smoothTime`).
  for (let i = 0; i < 12; i++) {
    await page.evaluate(() => window.__kosmoViewport!.renderOnce());
  }

  // Primärer Beweis (wie C-7 in `viewport3d-auswahl.spec.ts`): der
  // ereignisgetriebene KAMERA-HUD-Zähler steigt NUR bei echter
  // camera-controls-Bewegung.
  const zaehlerNachher = await page.evaluate(() => window.__kosmoViewport!.kameraHudEventCount());
  expect(zaehlerNachher).toBeGreaterThan(zaehlerVorher);
  // Ergänzender Wert-Beweis: die tatsächliche Kameraposition hat sich
  // messbar verschoben (Orbit dreht `px/py/pz` um das feststehende `tx/ty/tz`).
  const kameraNachher = await page.evaluate(() => window.__kosmoViewport!.getCamera());
  expect(
    Math.hypot(kameraNachher.px - kameraVorher.px, kameraNachher.py - kameraVorher.py, kameraNachher.pz - kameraVorher.pz),
  ).toBeGreaterThan(0.01);

  // Sanktion 8: die Auswahl aus dem Klick oben ist von der Kamerafahrt
  // komplett unberührt.
  await expect.poll(() => auswahl(page)).toEqual([w1]);
});

test('C-14d: Esc mitten im Drag bricht die Geste ab — kein Feuern, Overlay verschwindet, Auswahl unverändert', async ({
  page,
}) => {
  await starteManuell3D(page);
  const { w1, w2 } = await zweiWaendeLinks(page);

  await klickPick3D(page, { x: 2000, y: 3000, z: 1300 });
  await expect.poll(() => auswahl(page)).toEqual([w1]);
  const vorEsc = await auswahl(page);

  const r = await rechteckFuerWand(page, 1000, 9000, 3000, 20);
  await page.mouse.move(r.x0, r.y0);
  await page.keyboard.down('Shift');
  await page.mouse.down();
  await page.mouse.move((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, { steps: 6 });
  await expect(marqueeOverlay(page)).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(marqueeOverlay(page)).toBeHidden();
  // kein Feuern: die VOR der Geste bestehende Auswahl (nur w1) bleibt stehen
  // — insbesondere KEIN onEscape-Fanout, der sie leeren würde (C-14d,
  // Viewport3D.tsx `onKey`-Kommentar).
  await expect.poll(() => auswahl(page)).toEqual(vorEsc);

  await page.mouse.move(r.x1, r.y1, { steps: 3 });
  await page.mouse.up();
  await page.keyboard.up('Shift');

  // Auch nach dem (bedeutungslosen) Loslassen bleibt die Auswahl stehen —
  // w2 wurde NIE ausgewählt.
  await expect.poll(() => auswahl(page)).toEqual(vorEsc);
  expect(vorEsc).not.toContain(w2);
});

test('C-14e: Mini-Drag (<4px) mit Shift verhält sich wie ein Shift-Klick (Toggle) — kein Doppel-Feuern', async ({ page }) => {
  await starteManuell3D(page);
  const { w1, w2 } = await zweiWaendeLinks(page);

  await klickPick3D(page, { x: 2000, y: 3000, z: 1300 });
  await expect.poll(() => auswahl(page)).toEqual([w1]);

  const p2 = await weltZuBildschirm3D(page, { x: 8000, y: 3000, z: 1300 });
  await page.mouse.move(p2.x, p2.y);
  await page.keyboard.down('Shift');
  await page.mouse.down();
  // 2px Zittern — unter der 4px-Klick-Schwelle (`KLICK_RADIUS_PX`,
  // `eingabe-3d.ts`), MUSS als Klick zählen, nicht als Marquee.
  await page.mouse.move(p2.x + 2, p2.y + 1, { steps: 2 });
  await page.mouse.up();
  await page.keyboard.up('Shift');

  await expect(marqueeOverlay(page)).toHaveCount(0);
  // Shift-Toggle fügt w2 hinzu (bestehende Klick-Auswahl-Logik, Vertrag wie
  // `viewport3d-auswahl.spec.ts` C-14a) — kein zusätzliches
  // `onMarqueeAuswahl`-Feuern, sonst stünde hier ein anderes Ergebnis
  // (Duplikate/[w1,w2,w2] o.ä.).
  await expect.poll(async () => (await auswahl(page)).sort()).toEqual([w1, w2].sort());

  await page.waitForTimeout(600); // ausserhalb des Doppelklick-Fensters (Muster C-14b)
  const p1 = await weltZuBildschirm3D(page, { x: 2000, y: 3000, z: 1300 });
  await page.mouse.move(p1.x, p1.y);
  await page.keyboard.down('Shift');
  await page.mouse.down();
  await page.mouse.move(p1.x - 1, p1.y + 2, { steps: 2 });
  await page.mouse.up();
  await page.keyboard.up('Shift');

  // Toggle NIMMT w1 wieder heraus (reiner Klick-Pfad) — hätte der
  // Mini-Drag ZUSÄTZLICH ein leeres/kleines Marquee gefeuert, wäre das
  // Ergebnis nicht dieses exakte Einzelelement.
  await expect.poll(() => auswahl(page)).toEqual([w2]);
});
