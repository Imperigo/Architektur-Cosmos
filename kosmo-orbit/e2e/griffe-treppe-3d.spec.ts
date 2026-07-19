import { expect, test, type Page } from '@playwright/test';

/**
 * PA5 (v0.8.9 «Geordnet», `docs/V089-SPEZ.md` §2 D5, §3 E4, §7 C-8) —
 * Treppen-3D-Griffe in Viewport3D.tsx: neue `stairHandleGroup` nach dem
 * FreeMesh-`meshHandleGroup`-Muster (Kugeln, gleicher Stil/gleiche Grösse),
 * AUSWAHL-gated statt meshEditId-gated (nur bei Einzel-Auswahl einer
 * Treppe sichtbar — 2D-Vorbild: PlanView.tsx `griffe`-useMemo). Drag-Commit
 * über den BESTEHENDEN `design.treppeGeometrieSetzen` (kein neuer
 * Kernel-Command, PA1 v0.8.7) — direkt über `useProject.getState().
 * runCommand(...)`, NICHT über den `handlers.current`-Callback-Weg wie die
 * 2D-Griffe: `DesignWorkspace.tsx` ist im Dateikreis dieses Pakets TABU
 * (Betriebsregeln), ein neuer Handler dort war nicht verfügbar (s.
 * Kommentar bei `onPointerUp` in Viewport3D.tsx). x/y-only (kein z-Griff,
 * dokumentiertes Nicht-Ziel) — die Ziehebene liegt horizontal auf der
 * Handle-Höhe, nur x/z (Kern x/y) folgen dem Zeiger.
 *
 * Helfer (Kamera/Welt→Bildschirm/Auswahl/`renderOnce`-Disziplin) 1:1 aus
 * `e2e/viewport3d-marquee.spec.ts` übernommen — dieselbe achsparallele
 * Kamera-Strategie über `__kosmoViewport.setCamera`, dieselbe manuelle
 * `renderOnce()`-Pflicht nach jedem State-Wechsel (der Dauerloop stoppt
 * dauerhaft, sobald `setCamera`/`renderOnce` einmal liefen —
 * `__kosmoViewport.renderOnce`-Kommentar in Viewport3D.tsx). Die
 * Kamera-Zielsuche ist bewusst DYNAMISCH je Testszene (`kameraFuerPunkte`
 * unten, statt fixer Zahlen wie in `viewport3d-marquee.spec.ts`): der
 * Kamera-x-Zielpunkt liegt immer RECHTS des grössten Kern-x der Test-Punkte
 * (`versatzX`), damit JEDER Griff garantiert links der Bildschirmmitte
 * projiziert (die `.vch-hud-karte` schwebt über der rechten Hälfte, s.
 * Kopfkommentar `viewport3d-auswahl.spec.ts`) — unabhängig von der
 * jeweiligen Treppen-Geometrie, kein Nachrechnen von Hand nötig.
 * `erstelleTreppe`/`treppen()`/die Testgeometrien (a/b/ecke) 1:1 aus
 * `e2e/griffe-treppe.spec.ts` (2D-Vorbild) übernommen — nur der Zug selbst
 * läuft jetzt über echte Pointer-Events auf dem 3D-Canvas statt der
 * SVG-PlanView.
 *
 * **Esc-Verhalten (PA5-Übergabepunkt, im v0.8.9-Fable-Nachzug direkt
 * eingelöst):** Esc bricht einen laufenden `stairDrag` korrekt ab (kein
 * Commit, Handle zurück — Kern-Anforderung E4/C-8). Der neue
 * `griffDragAktiv`-Kanal (`viewport-chrome-runtime.ts`, Muster
 * `marqueeAktiv` v0.8.8; gesetzt beim Start von `stairDrag` UND dem
 * älteren `meshDrag`, geräumt bei Commit/Esc-Macrotask/Unmount) lässt den
 * unabhängigen DesignWorkspace-Escape-Handler dieses Esc der GESTE — die
 * Auswahl bleibt stehen; erst ein ZWEITES Esc feuert die
 * ArchiCAD-Dritte-Stufe. Test C-8 (d) beweist beides.
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
      // PA5-Beweis-Anker (v0.8.9 E4, Viewport3D.tsx `__kosmoViewport`):
      // Anzahl sichtbarer Treppen-Griffe (0 ausserhalb Einzel-Auswahl einer
      // Treppe, sonst 2 bzw. 3 bei form 'l').
      stairHandleCount: () => number;
      griffDragAktiv: () => boolean;
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

/** EG (`bootstrapProject()`) hat height 3000 — jeder Lauf ≥ 1 m bleibt
 *  deutlich unter dem 200-mm-Steigungs-Gate (Beleg: `griffe-treppe.spec.ts`
 *  Kopfkommentar, dieselbe Rechnung gilt hier unverändert). */
async function erstelleTreppe(
  page: Page,
  a: { x: number; y: number },
  b: { x: number; y: number },
  extra: { form?: 'gerade' | 'podest' | 'u' | 'l'; ecke?: { x: number; y: number } } = {},
): Promise<string> {
  return page.evaluate(
    ({ a, b, extra }) => {
      const k = window.__kosmo;
      const st = k.state();
      const r = k.run('design.treppeErstellen', {
        storeyId: st.activeStoreyId,
        a,
        b,
        width: 1200,
        ...extra,
      });
      return r.patches[0]!.id;
    },
    { a, b, extra },
  );
}

const auswahl = (page: Page) => page.evaluate(() => window.__kosmo.state().selection as string[]);
const waehle = (page: Page, ids: string[]) => page.evaluate((ids) => window.__kosmo.state().select(ids), ids);

type StairDoc = {
  id: string;
  a: { x: number; y: number };
  b: { x: number; y: number };
  form?: string;
  ecke?: { x: number; y: number };
  width: number;
};
const treppen = (page: Page) => page.evaluate(() => window.__kosmo.state().doc.byKind('stair') as StairDoc[]);

/** Ein frischer Frame + der aktuelle Griff-Zähler in EINEM Browser-Trip —
 *  robust gegen den gestoppten Dauerloop (s. Kopfkommentar), egal ob der
 *  Loop noch läuft oder `setCamera`/`renderOnce` ihn bereits angehalten
 *  hat. */
async function stairHandleCountFrisch(page: Page): Promise<number> {
  return page.evaluate(() => {
    const hook = window.__kosmoViewport!;
    hook.renderOnce();
    return hook.stairHandleCount();
  });
}

/** Kamera achsparallel (Augenhöhe = Zielhöhe) — 1:1 aus
 *  `viewport3d-marquee.spec.ts` `setzeKamera3D` übernommen. */
async function setzeKamera3D(page: Page, ziel: { x: number; y: number; z: number }, distanz: number): Promise<void> {
  await page.evaluate(
    ({ ziel, distanz }) => {
      const hook = window.__kosmoViewport!;
      hook.setCamera(ziel.x, ziel.y, ziel.z + distanz, ziel.x, ziel.y, ziel.z);
      hook.renderOnce();
    },
    { ziel, distanz },
  );
}

/** Kamera-Ziel DYNAMISCH aus den Test-Punkten hergeleitet (s. Kopfkommentar
 *  «kein Nachrechnen von Hand»): x-Ziel liegt `versatzX` mm RECHTS des
 *  grössten Punkt-x — jeder Punkt projiziert damit garantiert mit
 *  negativem NDC-x (linke, kartenfreie Bildschirmhälfte), unabhängig von
 *  der konkreten Treppen-Lage. z-Ziel liegt auf der mittleren Kern-y
 *  (Bildmitte in der Tiefe). Alle Test-Punkte liegen auf der EG-Elevation
 *  (0) — Kamera-Zielhöhe knapp darüber (0.5 m), damit die Handles nicht am
 *  unteren Bildrand kleben. */
async function kameraFuerPunkte(
  page: Page,
  punkte: { x: number; y: number }[],
  versatzX = 3000,
  distanz = 12,
): Promise<void> {
  const maxX = Math.max(...punkte.map((p) => p.x));
  const minY = Math.min(...punkte.map((p) => p.y));
  const maxY = Math.max(...punkte.map((p) => p.y));
  await setzeKamera3D(page, { x: (maxX + versatzX) * MM, y: 0.5, z: -((minY + maxY) / 2) * MM }, distanz);
}

/** Welt (Plan-mm x/y + Elevation-mm z) → Bildschirm-Pixel — byte-gleiche
 *  Formel wie `viewport3d-marquee.spec.ts`/`viewport3d-auswahl.spec.ts`
 *  (dieselbe achsparallele Kamera, fov=45°, nie verändert). */
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

/** Ein Treppen-Griff (`a`/`b`/`ecke`) sitzt IMMER auf der Geschoss-Elevation
 *  (EG = 0, kein z-Griff, E4) — reiner Komfort-Wrapper um
 *  `weltZuBildschirm3D`. */
const griffBildschirm = (page: Page, p: { x: number; y: number }) => weltZuBildschirm3D(page, { x: p.x, y: p.y, z: 0 });

async function ziehe(page: Page, von: { x: number; y: number }, nach: { x: number; y: number }): Promise<void> {
  await page.mouse.move(von.x, von.y);
  await page.mouse.down();
  await page.mouse.move((von.x + nach.x) / 2, (von.y + nach.y) / 2, { steps: 4 });
  await page.mouse.move(nach.x, nach.y, { steps: 4 });
  await page.mouse.up();
}

test('C-8 (a): Einzel-Auswahl einer Treppe zeigt 2 Griffe (a/b) in 3D — weg ausserhalb der Auswahl', async ({ page }) => {
  await starteManuell3D(page);
  const t1 = await erstelleTreppe(page, { x: 2000, y: 2000 }, { x: 2000, y: 6000 });

  await expect.poll(() => stairHandleCountFrisch(page)).toBe(0); // keine Auswahl → keine Griffe

  await waehle(page, [t1]);
  await expect.poll(() => stairHandleCountFrisch(page)).toBe(2);

  await waehle(page, []);
  await expect.poll(() => stairHandleCountFrisch(page)).toBe(0);
});

test('C-8 (b): a-Handle ziehen committet EIN treppeGeometrieSetzen — a geändert, id/form/width stabil', async ({ page }) => {
  await starteManuell3D(page);
  const a = { x: 2000, y: 2000 };
  const b = { x: 2000, y: 6000 }; // Lauf 4000 mm
  const t1 = await erstelleTreppe(page, a, b);
  await waehle(page, [t1]);
  await kameraFuerPunkte(page, [a, b]);
  await expect.poll(() => stairHandleCountFrisch(page)).toBe(2);

  const von = await griffBildschirm(page, a);
  const neuA = { x: 2000, y: 500 }; // Lauf wächst auf 5500 mm — weit über dem 1-m-Gate
  const nach = await griffBildschirm(page, neuA);
  await ziehe(page, von, nach);

  // Doc-Beweis: GENAU eine Treppe, GLEICHE ID, a geändert, b unangetastet,
  // width/form (Default) unangetastet (In-place-Gebot).
  const stand = await treppen(page);
  expect(stand).toHaveLength(1);
  expect(stand[0]!.id).toBe(t1);
  expect(stand[0]!.a).toEqual(neuA);
  expect(stand[0]!.b).toEqual(b);
  expect(stand[0]!.width).toBe(1200);
  expect(stand[0]!.form).toBeUndefined();

  const auswahlStand = await auswahl(page);
  expect(auswahlStand).toEqual([t1]); // Auswahl bleibt (In-place, keine neue Id)

  await page.evaluate(() => window.__kosmoViewport!.renderOnce());
  await page.screenshot({ path: 'e2e-results/pa5-089-griff-treppe-3d-a.png' });

  // EIN Ctrl+Z stellt exakt die alte Geometrie wieder her.
  await page.keyboard.press('Control+z');
  const nachUndo = await treppen(page);
  expect(nachUndo[0]!.a).toEqual(a);
  expect(nachUndo[0]!.b).toEqual(b);
});

test('C-8 (c, L-Form): ecke-Handle sichtbar (3 Griffe) und ziehbar, form/a/b bleiben erhalten', async ({ page }) => {
  await starteManuell3D(page);
  const a = { x: 2000, y: 2000 };
  const ecke = { x: 2000, y: 5000 };
  const b = { x: 5000, y: 5000 };
  const t1 = await erstelleTreppe(page, a, b, { form: 'l', ecke });
  await waehle(page, [t1]);
  await kameraFuerPunkte(page, [a, ecke, b]);
  await expect.poll(() => stairHandleCountFrisch(page)).toBe(3);

  const von = await griffBildschirm(page, ecke);
  const neueEcke = { x: 2000, y: 4500 }; // Richtung a, bleibt konvex/entartungsfrei
  const nach = await griffBildschirm(page, neueEcke);
  await ziehe(page, von, nach);

  const stand = await treppen(page);
  expect(stand).toHaveLength(1);
  expect(stand[0]!.id).toBe(t1);
  expect(stand[0]!.form).toBe('l');
  expect(stand[0]!.ecke).toEqual(neueEcke);
  expect(stand[0]!.a).toEqual(a);
  expect(stand[0]!.b).toEqual(b);

  await page.evaluate(() => window.__kosmoViewport!.renderOnce());
  await page.screenshot({ path: 'e2e-results/pa5-089-griff-treppe-3d-l-form.png' });

  await page.keyboard.press('Control+z');
  const nachUndo = await treppen(page);
  expect(nachUndo[0]!.ecke).toEqual(ecke);
  expect(nachUndo[0]!.form).toBe('l');
});

test('C-8 (d): Esc mitten im Griff-Zug bricht ab — kein Commit, Treppe unverändert', async ({ page }) => {
  await starteManuell3D(page);
  const a = { x: 2000, y: 2000 };
  const b = { x: 2000, y: 6000 };
  const t1 = await erstelleTreppe(page, a, b);
  await waehle(page, [t1]);
  await kameraFuerPunkte(page, [a, b]);
  await expect.poll(() => stairHandleCountFrisch(page)).toBe(2);

  const vorDrag = await treppen(page);

  const von = await griffBildschirm(page, b);
  const unterwegs = await griffBildschirm(page, { x: 2000, y: 9000 });
  await page.mouse.move(von.x, von.y);
  await page.mouse.down();
  await page.mouse.move(unterwegs.x, unterwegs.y, { steps: 6 });

  await page.keyboard.press('Escape');

  // Kein Feuern: die Treppe bleibt exakt wie vor dem Zug (das ist die
  // KERN-Anforderung von E4 — bewiesen unabhängig von der Randwirkung
  // unten).
  const nachEsc = await treppen(page);
  expect(nachEsc).toEqual(vorDrag);

  // Das (jetzt bedeutungslose) Loslassen committet NICHTS zusätzlich —
  // `stairDrag` wurde beim Esc bereits genullt (Viewport3D.tsx `onKey`).
  await page.mouse.up();
  const nachUp = await treppen(page);
  expect(nachUp).toEqual(vorDrag);

  // v0.8.9 Fable-Nachzug (löst die frühere «Bekannte Randwirkung» ein):
  // der neue `griffDragAktiv`-Kanal (viewport-chrome-runtime.ts) lässt den
  // DesignWorkspace-Escape-Handler dieses Esc der GESTE — die Auswahl
  // bleibt STEHEN, die Griffe bleiben sichtbar (vorher leerte die
  // ArchiCAD-Dritte-Stufe die Auswahl mitten im Zug).
  await expect.poll(() => auswahl(page)).toEqual([t1]);
  await expect.poll(() => stairHandleCountFrisch(page)).toBe(2);
  expect(await treppen(page)).toEqual(vorDrag);

  // Ein ZWEITES Esc (keine Geste mehr aktiv) greift wieder normal:
  // ArchiCAD-Dritte-Stufe leert die Auswahl. Der Kanal-Reset läuft als
  // Macrotask NACH dem Esc1-Dispatch — hier explizit gepollt, statt gegen
  // das Timing zu wetten (erster Lauf war exakt daran rot).
  await expect.poll(() => page.evaluate(() => window.__kosmoViewport!.griffDragAktiv())).toBe(false);
  await page.keyboard.press('Escape');
  await expect.poll(() => auswahl(page)).toEqual([]);
  await expect.poll(() => stairHandleCountFrisch(page)).toBe(0);

  // Kein dauerhaft kaputter Zustand: erneute Einzel-Auswahl derselben
  // Treppe zeigt die Griffe wieder normal, an der unveränderten Geometrie.
  await waehle(page, [t1]);
  await expect.poll(() => stairHandleCountFrisch(page)).toBe(2);
  expect(await treppen(page)).toEqual(vorDrag);
});

test('C-8 (e): Mehrfach-Auswahl zeigt keine Treppen-Griffe (auch mit einer zweiten Treppe)', async ({ page }) => {
  await starteManuell3D(page);
  const t1 = await erstelleTreppe(page, { x: 2000, y: 2000 }, { x: 2000, y: 6000 });
  const t2 = await erstelleTreppe(page, { x: 8000, y: 2000 }, { x: 8000, y: 6000 });

  await waehle(page, [t1]);
  await expect.poll(() => stairHandleCountFrisch(page)).toBe(2);

  await waehle(page, [t1, t2]);
  await expect.poll(() => stairHandleCountFrisch(page)).toBe(0);

  await waehle(page, [t2]);
  await expect.poll(() => stairHandleCountFrisch(page)).toBe(2);
});

test('C-8 (f): zu-kurzer Zug (b nah an a) wirft eine sichtbare Fehlermeldung — Treppe bleibt unangetastet', async ({ page }) => {
  await starteManuell3D(page);
  const a = { x: 2000, y: 2000 };
  const b = { x: 2000, y: 6000 };
  const t1 = await erstelleTreppe(page, a, b);
  await waehle(page, [t1]);
  await kameraFuerPunkte(page, [a, b]);
  await expect.poll(() => stairHandleCountFrisch(page)).toBe(2);

  // b auf 250 mm neben a ziehen — Gesamtlauf würde auf 250 mm einbrechen
  // (< 1 m), `design.treppeGeometrieSetzen` wirft VOR jedem Patch (Kernel-
  // Wurf-Regel (1), `commands/design.ts`).
  const von = await griffBildschirm(page, b);
  const nach = await griffBildschirm(page, { x: 2000, y: 2250 });
  await ziehe(page, von, nach);

  await expect(page.locator('[data-testid="meldung-fehler"]')).toBeVisible();

  const stand = await treppen(page);
  expect(stand).toHaveLength(1);
  expect(stand[0]!.id).toBe(t1);
  expect(stand[0]!.a).toEqual(a);
  expect(stand[0]!.b).toEqual(b); // unangetastet — kein Zwischenzustand

  // Der Griff selbst bleibt danach normal weiter nutzbar (Handle sichtbar
  // an der WIRKLICHEN, unangetasteten Position — `stairDragZurueck`).
  await expect.poll(() => stairHandleCountFrisch(page)).toBe(2);
});
