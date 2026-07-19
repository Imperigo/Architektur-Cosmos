import { expect, test, type Page } from '@playwright/test';

/**
 * PB1 (v0.8.8 «Beweglich», `docs/V088-SPEZ.md` §2 D5/D6, §3 E5/E6,
 * §6 Sanktionen 5–7, §7 C-8/C-9) — Marquee-Occlusion + Esc-Zustands-Kanal
 * in Viewport3D.tsx.
 *
 * E5: der 3D-Marquee (`e2e/viewport3d-marquee.spec.ts`, v0.8.7) testete
 * bislang NUR Frustum-Zugehörigkeit — «das Frustum sieht durch Wände»
 * (V087-SPEZ.md §8, damals ehrliches Nicht-Ziel). Diese Datei beweist den
 * NEUEN Occlusion-Filter (`istUeberwiegendSichtbar`, Viewport3D.tsx bei
 * `idsImFrustum`): ein vollständig von einer näheren Wand verdecktes
 * Element bleibt AUSSERHALB der Marquee-Auswahl, ein nur teilverdecktes
 * bleibt DRIN («überwiegend verdeckt wird ausgelassen», D5/E5). Der Filter
 * läuft AUSSCHLIESSLICH im pointerup-Commit (Sanktion 7) — die
 * onPointerMove-Vorschau (Overlay-Rechteck) bleibt unverändert reine
 * Bildschirm-Geometrie ohne Occlusion.
 *
 * E6: `viewport-chrome-runtime.ts` bekommt ein neues `marqueeAktiv`-Feld
 * (Brücken-Kanal für den späteren Fable-Escape-Guard in
 * `DesignWorkspace.tsx`, TABU für dieses Paket) — Test (d) beweist, dass
 * Viewport3D es bei JEDEM Gesten-Ende korrekt zurücksetzt (Commit UND Esc).
 * `stopImmediatePropagation()` im `onKey`-Escape-Zweig bleibt bewusst DRIN
 * (Übergabe-Punkt an Fable, s. Abschlussbericht + Code-Kommentar dort) —
 * hier NICHT erneut geprüft (das deckt bereits `e2e/viewport3d-marquee.spec.ts`
 * C-14d ab, das als Regression unverändert danebenläuft).
 *
 * Szene/Kamera-Strategie 1:1 aus `e2e/viewport3d-marquee.spec.ts` übernommen
 * (deterministische Kamera über `__kosmoViewport.setCamera`, Klickpunkte per
 * `weltZuBildschirm3D` nachgerechnet, BEIDE Wände in der linken,
 * kartenfreien Bildschirmhälfte, `entityMeshCount()`-Poll gegen die
 * Worker-Sync-Race) — NEU ist nur die Tiefenstaffelung: die zwei Wände
 * liegen hier auf UNTERSCHIEDLICHEN Plan-y-Werten (nicht mehr nebeneinander
 * auf derselben Zeile), damit die vordere Wand die hintere aus Kamerasicht
 * wirklich verdeckt (nicht nur räumlich neben ihr liegt).
 *
 * Diese Datei ist NEU (eigener Dateikreis); `viewport3d-marquee.spec.ts` und
 * `viewport3d-auswahl.spec.ts` bleiben unverändert und laufen als
 * Regression daneben (s. Abschlussbericht).
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
      letzteMarqueeOcclusionMs: () => number;
      marqueeAktiv: () => boolean;
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

/** 1:1 aus `viewport3d-marquee.spec.ts` übernommen (dort begründet). */
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

/** 1:1 aus `viewport3d-marquee.spec.ts` übernommen (dort begründet: gleiche
 *  achsparallele Kamera, fov=45° `Viewport3D.tsx:807`, nie verändert). */
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

interface WandSpanne {
  xMin: number;
  xMax: number;
  yPlan: number;
}

/** Zeichnet zwei Wände auf UNTERSCHIEDLICHEN Plan-y-Tiefen (`vorn` näher an
 *  der Kamera, `hinten` weiter weg) und setzt eine gemeinsame Kamera, deren
 *  Blickachse längs der Plan-y-Achse liegt (1:1 Herleitung wie
 *  `zweiWaendeLinks`/`setzeKamera3D` in `viewport3d-marquee.spec.ts` — nur
 *  das Kamera-Ziel/die Distanz sind auf die zwei Tiefen statt eine einzige
 *  Zeile angepasst). Beide Wände bleiben in der linken, kartenfreien
 *  Bildschirmhälfte (Bildschirm-X < 650, `.vch-hud-karte`-Falle aus
 *  `viewport3d-marquee.spec.ts` gilt hier unverändert). */
async function zweiWaendeTiefengestaffelt(page: Page, vorn: WandSpanne, hinten: WandSpanne): Promise<{ vorn: string; hinten: string }> {
  const meshCountVorher = await page.evaluate(() => window.__kosmoViewport!.entityMeshCount());
  // Hintere Wand zuerst zeichnen — reine Reihenfolge-Dokumentation, für den
  // Occlusion-Test irrelevant (WebGL-Tiefentest/Raycast-Distanz entscheidet,
  // nicht die Zeichenreihenfolge).
  const hinten_ = await zeichneWand(page, { x: hinten.xMin, y: hinten.yPlan }, { x: hinten.xMax, y: hinten.yPlan });
  const vorn_ = await zeichneWand(page, { x: vorn.xMin, y: vorn.yPlan }, { x: vorn.xMax, y: vorn.yPlan });
  await expect
    .poll(() => page.evaluate(() => window.__kosmoViewport!.entityMeshCount()))
    .toBeGreaterThanOrEqual(meshCountVorher + 2);
  const mitteX = (Math.min(vorn.xMin, hinten.xMin) + Math.max(vorn.xMax, hinten.xMax)) / 2;
  const mitteY = (vorn.yPlan + hinten.yPlan) / 2;
  await setzeKamera3D(page, { x: mitteX * MM, y: 1.3, z: -mitteY * MM }, 22);
  return { vorn: vorn_, hinten: hinten_ };
}

/** Bildschirm-Rechteck, das die Boundingboxen ZWEIER auf unterschiedlichen
 *  Plan-y-Tiefen liegenden Wände (Standard-Geschosshöhe 0..2800mm) umschliesst
 *  — alle 8 Eck-Weltpunkte beider Wände werden einzeln projiziert und das
 *  Bildschirm-Min/Max genommen (anders als `rechteckFuerWand` in
 *  `viewport3d-marquee.spec.ts`, das NUR eine einzelne Tiefe kennt).
 *  `padding` in CSS-px gegen Antialiasing/Rundung. */
async function rechteckFuerZweiTiefen(page: Page, a: WandSpanne, b: WandSpanne, padding: number): Promise<{ x0: number; y0: number; x1: number; y1: number }> {
  const ecken: { x: number; y: number; z: number }[] = [];
  for (const w of [a, b]) {
    for (const x of [w.xMin, w.xMax]) {
      for (const z of [0, 2800]) {
        ecken.push({ x, y: w.yPlan, z });
      }
    }
  }
  const pts = await Promise.all(ecken.map((e) => weltZuBildschirm3D(page, e)));
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return {
    x0: Math.min(...xs) - padding,
    y0: Math.min(...ys) - padding,
    x1: Math.max(...xs) + padding,
    y1: Math.max(...ys) + padding,
  };
}

async function ziehMarquee(page: Page, r: { x0: number; y0: number; x1: number; y1: number }): Promise<void> {
  await page.mouse.move(r.x0, r.y0);
  await page.keyboard.down('Shift');
  await page.mouse.down();
  await page.mouse.move((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, { steps: 6 });
  await page.mouse.move(r.x1, r.y1, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
}

const marqueeOverlay = (page: Page) => page.locator('[data-testid="viewport3d-marquee"]');

test('E5/C-9 (a): vollständig verdeckte Wand wird NICHT gewählt — nur die vordere, sie komplett verdeckende Wand landet in der Auswahl', async ({ page }) => {
  await starteManuell3D(page);

  // Vordere Wand (näher an der Kamera, y=1000): generöser x-Bereich UND
  // Standardhöhe (2800mm) wie die hintere — «gleich gross» reicht laut
  // Auftrag, hier bewusst GRÖSSER (2000..8000 vs. 3500..6500), damit die
  // Bbox-Sample-Punkte der hinteren Wand (Mitte + 4 Ecken) OHNE Zweifel
  // ALLE hinter der vorderen Wand liegen — kein Grenzfall.
  const vornSpanne: WandSpanne = { xMin: 2000, xMax: 8000, yPlan: 1000 };
  const hintenSpanne: WandSpanne = { xMin: 3500, xMax: 6500, yPlan: 7000 };
  const { vorn, hinten } = await zweiWaendeTiefengestaffelt(page, vornSpanne, hintenSpanne);

  const r = await rechteckFuerZweiTiefen(page, vornSpanne, hintenSpanne, 25);
  await ziehMarquee(page, r);

  await expect(marqueeOverlay(page)).toBeHidden();
  // Kern-Beweis: NUR die vordere Wand — die hintere ist «überwiegend
  // verdeckt» und bleibt darum aussen vor (D5/E5-Semantik).
  await expect.poll(() => auswahl(page)).toEqual([vorn]);
  const sel = await auswahl(page);
  expect(sel).not.toContain(hinten);

  await page.evaluate(() => window.__kosmoViewport!.renderOnce());
  await page.screenshot({ path: 'e2e-results/pb1-088-marquee-occlusion-verdeckt.png' });
});

test('E5/C-9 (b): teilsichtbare Wand (Ecken frei, nur Mitte verdeckt) wird MIT gewählt — beide landen in der Auswahl', async ({ page }) => {
  await starteManuell3D(page);

  // Hintere Wand ist BREIT (1000..9000), vordere Wand ist SCHMAL und
  // zentriert (4000..6000) — die linke/rechte Bbox-Ecke der hinteren Wand
  // liegt damit ausserhalb des x-Schattens der vorderen Wand (frei), nur
  // die Bbox-Mitte liegt dahinter (verdeckt). Ein einziger freier
  // Sample-Punkt genügt für «sichtbar» (Kurzschluss-Semantik E5).
  const vornSpanne: WandSpanne = { xMin: 4000, xMax: 6000, yPlan: 1000 };
  const hintenSpanne: WandSpanne = { xMin: 1000, xMax: 9000, yPlan: 7000 };
  const { vorn, hinten } = await zweiWaendeTiefengestaffelt(page, vornSpanne, hintenSpanne);

  const r = await rechteckFuerZweiTiefen(page, vornSpanne, hintenSpanne, 25);
  await ziehMarquee(page, r);

  await expect(marqueeOverlay(page)).toBeHidden();
  await expect.poll(async () => (await auswahl(page)).sort()).toEqual([vorn, hinten].sort());

  await page.evaluate(() => window.__kosmoViewport!.renderOnce());
  await page.screenshot({ path: 'e2e-results/pb1-088-marquee-occlusion-teilsichtbar.png' });
});

test('E5/C-9 (c) Sanktion 7: Occlusion-Post-Processing bleibt am Demo-Doc unter 20ms', async ({ page }) => {
  await starteManuell3D(page);

  // Demo-Doc: 6 Wände (3 Spalten × 2 Tiefen — innerhalb der spezifizierten
  // 2–10-Wände-Spanne, D5), jede Spalte staffelt eine nähere vor eine
  // fernere Wand, damit der Filter ECHTE Occlusion-Arbeit leistet (nicht
  // nur einen leeren Nicht-Treffer-Fall misst).
  const meshCountVorher = await page.evaluate(() => window.__kosmoViewport!.entityMeshCount());
  const spalten = [1000, 4000, 7000];
  for (const x of spalten) {
    await zeichneWand(page, { x, y: 7000 }, { x: x + 2000, y: 7000 }); // hinten
    await zeichneWand(page, { x, y: 1000 }, { x: x + 2000, y: 1000 }); // vorn
  }
  await expect
    .poll(() => page.evaluate(() => window.__kosmoViewport!.entityMeshCount()))
    .toBeGreaterThanOrEqual(meshCountVorher + 6);
  await setzeKamera3D(page, { x: 5000 * MM, y: 1.3, z: -4000 * MM }, 26);

  const vorNull = await page.evaluate(() => window.__kosmoViewport!.letzteMarqueeOcclusionMs());
  expect(vorNull).toBe(-1); // noch kein Marquee-Commit gelaufen

  const r = await rechteckFuerZweiTiefen(page, { xMin: 1000, xMax: 9000, yPlan: 1000 }, { xMin: 1000, xMax: 9000, yPlan: 7000 }, 25);
  await ziehMarquee(page, r);

  await expect(marqueeOverlay(page)).toBeHidden();
  // mindestens die drei vorderen Wände sind Teil des Commits.
  await expect.poll(async () => (await auswahl(page)).length).toBeGreaterThanOrEqual(3);

  const dauerMs = await page.evaluate(() => window.__kosmoViewport!.letzteMarqueeOcclusionMs());
  expect(dauerMs).toBeGreaterThanOrEqual(0);
  expect(dauerMs).toBeLessThan(20);
});

test('E6/C-8 (d): marqueeAktiv ist während der Geste true, nach Commit false, nach Esc ebenfalls false', async ({ page }) => {
  await starteManuell3D(page);
  const vornSpanne: WandSpanne = { xMin: 2000, xMax: 8000, yPlan: 1000 };
  const hintenSpanne: WandSpanne = { xMin: 3500, xMax: 6500, yPlan: 7000 };
  await zweiWaendeTiefengestaffelt(page, vornSpanne, hintenSpanne);
  const r = await rechteckFuerZweiTiefen(page, vornSpanne, hintenSpanne, 25);

  // Vor jeder Geste: false (Ausgangszustand).
  expect(await page.evaluate(() => window.__kosmoViewport!.marqueeAktiv())).toBe(false);

  // Mitten im Drag: true.
  await page.mouse.move(r.x0, r.y0);
  await page.keyboard.down('Shift');
  await page.mouse.down();
  await page.mouse.move((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, { steps: 6 });
  await expect(marqueeOverlay(page)).toBeVisible();
  expect(await page.evaluate(() => window.__kosmoViewport!.marqueeAktiv())).toBe(true);

  // Commit (pointerup): false.
  await page.mouse.move(r.x1, r.y1, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect(marqueeOverlay(page)).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__kosmoViewport!.marqueeAktiv())).toBe(false);

  // Neue Geste, diesmal per Esc abgebrochen: true während des Drags, false
  // nach Esc (kein Commit).
  await page.mouse.move(r.x0, r.y0);
  await page.keyboard.down('Shift');
  await page.mouse.down();
  await page.mouse.move((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, { steps: 6 });
  await expect(marqueeOverlay(page)).toBeVisible();
  expect(await page.evaluate(() => window.__kosmoViewport!.marqueeAktiv())).toBe(true);

  await page.keyboard.press('Escape');
  await expect(marqueeOverlay(page)).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__kosmoViewport!.marqueeAktiv())).toBe(false);

  // Loslassen nach dem (bedeutungslosen) Esc bleibt ohne Wirkung — die
  // Geste ist bereits beendet.
  await page.mouse.move(r.x1, r.y1, { steps: 3 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  expect(await page.evaluate(() => window.__kosmoViewport!.marqueeAktiv())).toBe(false);
});
