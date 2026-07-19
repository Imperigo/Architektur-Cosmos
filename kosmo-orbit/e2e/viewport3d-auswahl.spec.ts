import { expect, test, type Page } from '@playwright/test';

/**
 * PB2 (v0.8.6 «Verlässlich», `docs/V086-SPEZ.md` D5/C-14) — 3D-Shift-Klick-
 * Auswahl in Viewport3D.
 *
 * D5-Befund: `onPick(id, opts?: {toggle?:boolean})` war seit PA1 (v0.8.5)
 * deklariert, der Klick-Pick in Viewport3D.tsx (`onPointerUp`, pickMode-Zweig)
 * rief `onPick` aber OHNE `opts` — Shift-Klick im 3D verhielt sich wie ein
 * normaler Klick (ersetzte statt zu toggeln). Der Fix verdrahtet
 * `ev.shiftKey` als `{toggle:true}`, derselbe Vertrag wie PlanView (2D,
 * `e2e/multi-auswahl.spec.ts` C-1): der DesignWorkspace-`onPick`-Handler
 * (DesignWorkspace.tsx ~1056-1064) behandelt Shift-Klick ins Leere
 * (`onPick(null,{toggle:true})`) bereits als No-op — hier NICHT erneut
 * gebaut, nur bewiesen (Test 3). Esc-leert-Auswahl lief bereits vor diesem
 * Paket über den D10-Fix (v0.8.5 PB1): der Escape-Listener in
 * DesignWorkspace.tsx (~860-884) hängt auf `window`, nicht auf PlanView —
 * er feuert also unverändert, wenn `view-3d` PlanView unmountet (reiner
 * 3D-Fokus, kein Doppelbau, nur Test 4 als Beweis).
 *
 * 3D-Klickpunkt-Strategie (kein bestehender Welt→Bildschirm-Helfer für den
 * 3D-Viewport gefunden — `griffe.spec.ts`/`multi-auswahl.spec.ts` decken nur
 * die 2D-PlanView per SVG-`getScreenCTM()` ab; `freemesh.spec.ts`/
 * `module.spec.ts` treffen 3D-Objekte nur über feste Canvas-Mitte bzw. grob
 * geschätzte Pixel-Koordinaten, kein präziser Mehrfach-Treffer). Stattdessen:
 * die Kamera wird über den deterministischen Test-Hook `__kosmoViewport.
 * setCamera(px,py,pz,tx,ty,tz)` (Serie J / J1a, `e2e/eingabe-3d.spec.ts`)
 * bewusst achsparallel positioniert — Augenhöhe = Zielhöhe (`py===ty`),
 * Kamera rein entlang +Z vom Ziel versetzt. Damit hat die Kamera KEINE
 * Rotation relativ zu den Weltachsen (rechts=Welt-X, oben=Welt-Y,
 * vorn=−Welt-Z) und die Perspektiv-Projektion eines Weltpunkts lässt sich
 * ohne Kamera-internes Rotations-Wissen direkt aus `getCamera()` (Position +
 * Ziel) plus dem bekannten, nie veränderten `fov=45°` (Viewport3D.tsx:807)
 * und dem Canvas-Seitenverhältnis nachrechnen (`weltZuBildschirm3D` unten).
 * Scene-Skalierung `MM=1/1000` und die Achsabbildung Plan(x,y)→Szene(x,−y)
 * bei Elevation→Szene-y sind 1:1 aus Viewport3D.tsx (Zeile ~941-962)
 * übernommen.
 *
 * Zwei ehrlich erkämpfte Gruben (beide durch Direkt-Sonden bewiesen, nicht
 * geraten):
 *  1. `syncModel()` baut neue Doc-Entities NICHT im selben Tick wie
 *     `__kosmo.run(...)` in `model` ein (Viewport3D.tsx ~1503-1540,
 *     `applyArtifacts` läuft erst im NÄCHSTEN echten rAF-Tick) — ein
 *     `renderOnce()` direkt danach sieht manchmal noch die alte Mesh-Menge.
 *     Bewiesen per `entityMeshCount()`-Poll VOR `setCamera`, s.
 *     `zweiWaendeMitKamera`.
 *  2. Die «manuell»-Oberfläche schwebt eine `.vch-hud-karte`
 *     (Viewport/Kamera/Szene-Info + «Einpassen») über der RECHTEN
 *     Canvas-Hälfte (gemessen: x≈707-1050, y ab ≈182, wächst mit Inhalt
 *     nach unten). Ein Klickpunkt, dessen Bildschirm-Projektion dort landet,
 *     trifft NICHT das Canvas, sondern die Karte — `document.
 *     elementFromPoint()` bestätigte das direkt (`k-keyvalue-zeile`-DIV statt
 *     `<canvas>`), ein isolierter Raycast mit denselben Kamera-/Geometrie-
 *     Daten fand die Wand dagegen anstandslos. Die Kamera in
 *     `zweiWaendeMitKamera` zielt darum bewusst so, dass BEIDE Wände in die
 *     linke, kartenfreie Bildschirmhälfte (Bildschirm-X < 650) projizieren.
 *
 * PA2 (v0.8.7 «Verortet», `docs/V087-SPEZ.md` §3 E3/E4, C-6/C-7) erweitert
 * diese Datei um zwei Gate-Beweise, KEIN neuer Datei-Kreis:
 *
 *  - **E3/C-6 (Pixel-Readback):** die ROADMAP-493-Ehrlichkeitsgrenze nannte
 *    das alte Auswahl-Highlight («Kupfer-Glut», emissiv 0.35) «per
 *    Pixel-Readback messbar (+22 R), aber fürs Auge schwach». E3 schaltet
 *    zusätzlich das per-Entity-Kanten-`LineSegments` auf ein eigenes,
 *    wiederverwendetes Material (`selectedEdgeMaterial`, Viewport3D.tsx
 *    ~1394-1409: gleiche Akzent-Familie wie die Emissivfarbe, aber auf
 *    R=255 aufgehellt, `depthTest:false` als linewidth-Ersatz). Statt einen
 *    einzelnen, analytisch aus Wanddicke/-höhe hergeleiteten Kantenpixel zu
 *    treffen (fehleranfällig — Wanddicke hängt vom Aufbau-Katalog ab, s.
 *    `apps/kosmo-orbit/src/state/project-store.ts` `AW Beton 36` = 360mm),
 *    scannt der Beweis eine ganze Bildschirm-Spalte um die Wand (volle
 *    Canvas-Höhe) auf die grösste R-Differenz zwischen einem Vorher-/
 *    Nachher-Snapshot (`erfasseFrame`/`vergleicheSpalte` unten, komplett
 *    im Browser gerechnet — kein Multi-MB-Pixelarray über die Playwright-
 *    Brücke). Rechnerische Obergrenze für die R-Differenz: 255 (neue Kante)
 *    − 42 (alte dunkle Basiskante `0x2a2620`) = 213 — mehr ist mit einem
 *    einzelnen 8-Bit-Kanal nicht erreichbar (keine Zehnerpotenz möglich,
 *    ehrlich vermerkt statt eines falschen ×10-Versprechens).
 *  - **E4/C-7 (HUD-Ereignis-Beweis):** camera-controls dispatcht `control`/
 *    `update`/`rest`; Viewport3D.tsx bündelt sie per rAF auf einen
 *    KAMERA-HUD-Schreibzugriff pro Frame und zählt NUR diese
 *    ereignisgetriebenen Schreibungen separat vom bestehenden 400ms-Poll
 *    (`__kosmoViewport.kameraHudEventCount()`). Ein exakter Race gegen die
 *    Poll-Phase (~150ms-Fenster) wäre unter Containerlast geraten — die
 *    Poll-Phase seit Mount ist der Testzeit unbekannt, ein zufällig naher
 *    Poll-Tick könnte einen 150ms-Erfolg vortäuschen, ohne den Event-Weg zu
 *    beweisen. Der Zähler ist der robuste, architektonische Beweis
 *    (Event-Zähler-Testhook, wie in der Auftragsbeschreibung als Ausweg
 *    genannt); ein kurzes Wert-Poll (~250ms) ergänzt ihn informativ.
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
      // E3/C-6-Beweis (v0.8.7, s. Kopfkommentar): derselbe synchrone
      // render+capture-Weg wie `e2e/eingabe-3d.spec.ts`s Fenster-Pixel-Beweis
      // (0.6.7 P0 «Für Vis aufnehmen») — `null`, solange kein Frame gerendert
      // werden kann.
      captureFrame: () => string | null;
      // D5-Fix-Begleiter (v0.8.6 PB2, Viewport3D.tsx ~2154-2161): `syncModel()`
      // baut neue Doc-Entities erst beim NÄCHSTEN echten rAF-Tick in `model`
      // ein — ein einzelnes `renderOnce()` direkt nach `__kosmo.run(...)`
      // sieht manchmal noch die alte Mesh-Menge (gemessen: leeres
      // `model.children` sofort nach Wand-Erzeugung, korrekt nach ~500ms
      // Wartezeit). Dieser Zähler ersetzt eine geratene feste Wartezeit
      // durch einen echten Poll-Anker.
      entityMeshCount: () => number;
      // E4-Beweis-Anker (v0.8.7, PA2 `docs/V087-SPEZ.md` §3): zählt NUR die
      // ereignisgetriebenen KAMERA-HUD-Schreibungen (control/update/rest,
      // rAF-gebündelt, Viewport3D.tsx ~840-870) — unabhängig vom 400ms-
      // Fallback-Poll, damit E2E den Event-Weg robust beweisen kann, ohne
      // gegen dessen Timing zu wetten (Kopfkommentar C-7-Test unten).
      kameraHudEventCount: () => number;
    };
  }
}

const MM = 1 / 1000;

async function starteManuell3D(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    // Wie `freemesh.spec.ts`/`eingabe-3d.spec.ts`: der Block-E-Guide fängt
    // sonst Klicks unter seiner Karte ab — hier zusätzlich relevant, weil
    // unsere synthetischen Klicks auf FESTE, vorausberechnete Canvas-Pixel
    // zielen (kein `nav-fit`/testid-Anker), die eine Guide-Karte überdecken
    // könnte.
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG
  await page.click('[data-testid="view-3d"]'); // unmountet PlanView (design-werkzeugleiste.spec.ts-Befund)
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
 *  +Z-Versatz) — Voraussetzung für die simple Projektion in
 *  `weltZuBildschirm3D` (Kopfkommentar). */
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

/** Welt (Plan-mm x/y + Elevation-mm z) → Bildschirm-Pixel, für die oben
 *  hergeleitete achsparallele Kamera (kein Rotationsanteil). */
async function weltZuBildschirm3D(page: Page, welt: { x: number; y: number; z: number }): Promise<{ x: number; y: number }> {
  return page.evaluate(
    ({ welt, MM }) => {
      const cam = window.__kosmoViewport!.getCamera();
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      // Plan(x,y)+Elevation(z) → Szene(x,y,z), wie Viewport3D.tsx ~941-962.
      const sx = welt.x * MM;
      const sy = welt.z * MM;
      const sz = -welt.y * MM;
      const xc = sx - cam.px;
      const yc = sy - cam.py;
      const zc = sz - cam.pz;
      const fovRad = (45 * Math.PI) / 180; // Viewport3D.tsx:807, nie verändert (Beleg im Kopfkommentar)
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

/** Zwei Wände weit auseinander (Plan-X 1000-3000 bzw. 7000-9000, gleiche
 *  Plan-Y) + eine Kamera, die beide UND einen leeren Bereich weit darüber
 *  sicher im Sichtkegel hat UND — zweite Grube (Kopfkommentar) — beide
 *  Klickpunkte in die linke, kartenfreie Bildschirmhälfte projiziert (Ziel-
 *  X bewusst rechts der Wände, s. Kopfkommentar-Herleitung). Gibt die
 *  Klickpunkte (Wandmitte auf halber Höhe) + einen garantierten
 *  Leer-Treffer (weit über den Wänden, gleiche Tiefe) zurück. */
async function zweiWaendeMitKamera(page: Page): Promise<{
  w1: string;
  w2: string;
  p1: { x: number; y: number; z: number };
  p2: { x: number; y: number; z: number };
  leer: { x: number; y: number; z: number };
}> {
  const meshCountVorher = await page.evaluate(() => window.__kosmoViewport!.entityMeshCount());
  const w1 = await zeichneWand(page, { x: 1000, y: 3000 }, { x: 3000, y: 3000 });
  const w2 = await zeichneWand(page, { x: 7000, y: 3000 }, { x: 9000, y: 3000 });
  // Beide Wand-Meshes wirklich in `model` angekommen warten (erste Grube,
  // Kopfkommentar) — sonst würde der ERSTE `setCamera`+`renderOnce`-Aufruf
  // unten `lastRevision` auf den aktuellen Stand setzen, OHNE dass
  // `model.children` beide Meshes schon enthält, und der zweite Pick würde
  // dauerhaft ins Leere greifen (kein späteres Nachsyncen mehr).
  await expect
    .poll(() => page.evaluate(() => window.__kosmoViewport!.entityMeshCount()))
    .toBeGreaterThanOrEqual(meshCountVorher + 2);
  const p1 = { x: 2000, y: 3000, z: 1300 }; // Mitte w1, halbe Wandhöhe (Standard-Geschosshöhe 2800mm)
  const p2 = { x: 8000, y: 3000, z: 1300 }; // Mitte w2
  const leer = { x: 5000, y: 3000, z: 5000 }; // mittig zwischen beiden, 5m über den Wänden — trifft nichts
  // Ziel-X = 9.0m (rechts von beiden Wänden, statt mittig bei 5.0m) — zweite
  // Grube (Kopfkommentar): eine mittige Kamera projiziert w2 auf
  // Bildschirm-X≈879, direkt unter der schwebenden Viewport-Eigenschaften-
  // Karte (x≈707-1050). Mit Ziel-X=9.0 landen w1≈282px und w2≈640px, beide
  // klar links der Karte.
  await setzeKamera3D(page, { x: 9000 * MM, y: 1.3, z: -3000 * MM });
  return { w1, w2, p1, p2, leer };
}

/** E3/C-6-Helfer: rendert EINEN frischen Frame (`renderOnce()` + `captureFrame()`,
 *  derselbe synchrone Weg wie `e2e/eingabe-3d.spec.ts`s Fenster-Pixel-Beweis)
 *  und legt sein dekodiertes Pixelbild im Browser-Fenster ab
 *  (`window.__kosmoPixelSnaps`, Rückgabewert = Array-Index). Der Vergleich
 *  selbst läuft komplett im Browser (`vergleicheSpalte` unten) — kein
 *  Multi-MB-Pixelarray über die Playwright-Brücke. */
async function erfasseFrame(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const hook = window.__kosmoViewport!;
    hook.renderOnce();
    const dataUrl = hook.captureFrame();
    if (!dataUrl) throw new Error('captureFrame lieferte null');
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Snapshot-Bild liess sich nicht dekodieren'));
      img.src = dataUrl;
    });
    const off = document.createElement('canvas');
    off.width = img.naturalWidth;
    off.height = img.naturalHeight;
    const ctx = off.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const win = window as unknown as { __kosmoPixelSnaps?: ImageData[] };
    win.__kosmoPixelSnaps ??= [];
    win.__kosmoPixelSnaps.push(ctx.getImageData(0, 0, off.width, off.height));
    return win.__kosmoPixelSnaps.length - 1;
  });
}

/** Vergleicht zwei per `erfasseFrame` abgelegte Snapshots in einer vertikalen
 *  Bildschirm-Spalte (CSS-Pixel-`xCss` ± `breiteCss`/2, volle Canvas-Höhe) —
 *  liefert die grösste (positive) R-Differenz und die grösste Differenz
 *  irgendeines Kanals irgendeines Pixels in der Spalte. Volle Höhe statt
 *  eines einzelnen analytisch berechneten Kanten-Punkts: robust gegen
 *  Wanddicke/-höhen-Annahmen, findet den Ausschlag, wo immer er im
 *  gerenderten Bild tatsächlich landet. */
async function vergleicheSpalte(
  page: Page,
  xCss: number,
  breiteCss: number,
  idxVorher: number,
  idxNachher: number,
): Promise<{ maxDeltaR: number; maxDeltaAny: number }> {
  return page.evaluate(
    ({ xCss, breiteCss, idxVorher, idxNachher }) => {
      const win = window as unknown as { __kosmoPixelSnaps: ImageData[] };
      const a = win.__kosmoPixelSnaps[idxVorher]!;
      const b = win.__kosmoPixelSnaps[idxNachher]!;
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      const scaleX = a.width / rect.width;
      const x0 = Math.max(0, Math.floor((xCss - breiteCss / 2) * scaleX));
      const x1 = Math.min(a.width, Math.ceil((xCss + breiteCss / 2) * scaleX));
      let maxDeltaR = -255;
      let maxDeltaAny = 0;
      for (let y = 0; y < a.height; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * a.width + x) * 4;
          const dR = b.data[i]! - a.data[i]!;
          if (dR > maxDeltaR) maxDeltaR = dR;
          for (let c = 0; c < 4; c++) {
            const d = Math.abs(b.data[i + c]! - a.data[i + c]!);
            if (d > maxDeltaAny) maxDeltaAny = d;
          }
        }
      }
      return { maxDeltaR, maxDeltaAny };
    },
    { xCss, breiteCss, idxVorher, idxNachher },
  );
}

test('C-14a: Klick wählt w1, Shift-Klick w2 fügt hinzu — 3D-Mehrfachauswahl per state() bewiesen + Screenshot', async ({ page }) => {
  await starteManuell3D(page);
  const { w1, w2, p1, p2 } = await zweiWaendeMitKamera(page);

  await klickPick3D(page, p1);
  await expect.poll(() => auswahl(page)).toEqual([w1]);

  await klickPick3D(page, p2, true);
  await expect.poll(async () => (await auswahl(page)).sort()).toEqual([w1, w2].sort());

  // Screenshot der 3D-Mehrfachauswahl (Viewport, kein fullPage) — die
  // "Kupfer-Glut" (emissive-Highlight, Viewport3D.tsx ~1992-2000) iteriert
  // über ALLE `model.children` und markiert jedes Mesh, dessen entityId in
  // `selection` liegt — die 3D-Station rendert Mehrfachauswahl also
  // tatsächlich sichtbar, nicht nur im State (selbst per Read geprüft,
  // Bericht).
  await page.evaluate(() => window.__kosmoViewport!.renderOnce());
  await page.screenshot({ path: 'e2e-results/pb2-086-3d-shift-klick-mehrfachauswahl.png' });
});

test('C-14b: Shift-Klick auf ein bereits gewähltes Element (>=600ms später) nimmt es wieder heraus', async ({ page }) => {
  await starteManuell3D(page);
  const { w1, w2, p1, p2 } = await zweiWaendeMitKamera(page);

  await klickPick3D(page, p1);
  await expect.poll(() => auswahl(page)).toEqual([w1]);
  await klickPick3D(page, p2, true);
  await expect.poll(async () => (await auswahl(page)).length).toBe(2);

  // 600ms Abstand: zwei Klicks auf DENSELBEN Punkt im Doppelklick-Fenster
  // wären eine Doppelklick-Geste (J1b, eigene Bedeutung) — dasselbe Muster
  // wie `multi-auswahl.spec.ts` C-1.
  await page.waitForTimeout(600);
  await klickPick3D(page, p2, true);
  await expect.poll(() => auswahl(page)).toEqual([w1]);
});

test('C-14c: Shift-Klick ins Leere lässt die Mehrfachauswahl unverändert (onPick(null,{toggle:true}) ist No-op)', async ({ page }) => {
  await starteManuell3D(page);
  const { w1, w2, p1, p2, leer } = await zweiWaendeMitKamera(page);

  await klickPick3D(page, p1);
  await klickPick3D(page, p2, true);
  await expect.poll(async () => (await auswahl(page)).length).toBe(2);

  await page.waitForTimeout(600);
  await klickPick3D(page, leer, true);
  await expect.poll(async () => (await auswahl(page)).sort()).toEqual([w1, w2].sort());
});

test('C-14d (D10-Beweis): Escape leert die Mehrfachauswahl auch bei reinem 3D-Fokus (view-3d, kein PlanView-Mount)', async ({ page }) => {
  await starteManuell3D(page);
  const { w1, w2, p1, p2 } = await zweiWaendeMitKamera(page);

  await klickPick3D(page, p1);
  await klickPick3D(page, p2, true);
  await expect.poll(async () => (await auswahl(page)).length).toBe(2);

  // `view-3d` hat PlanView unmountet — läuft der Esc-Weg wirklich nur über
  // den `window`-Listener in DesignWorkspace.tsx (D10-Fix v0.8.5 PB1), muss
  // dieser Druck trotzdem leeren.
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await auswahl(page)).length).toBe(0);
});

test('C-6 (E3): Auswahl schaltet die Wand-Kante auf einen kräftigen Akzent — Pixel-Readback ≫ die alte +22-R-Emissiv-Marke; unselektierte Wand bleibt byte-gleich', async ({
  page,
}) => {
  await starteManuell3D(page);
  const { w1, w2, p1, p2 } = await zweiWaendeMitKamera(page);

  const vorher = await erfasseFrame(page); // beide Wände unselektiert

  await klickPick3D(page, p1);
  await expect.poll(() => auswahl(page)).toEqual([w1]);

  const nachher = await erfasseFrame(page); // w1 gewählt, w2 unverändert

  // Spalten aus den TATSÄCHLICHEN Klickpunkt-Projektionen (nicht den im
  // Kopfkommentar dokumentierten Schätzwerten) — self-consistent mit den
  // Punkten, die auch tatsächlich geklickt wurden.
  const p1Screen = await weltZuBildschirm3D(page, p1);
  const p2Screen = await weltZuBildschirm3D(page, p2);
  expect(p1Screen.x + 150).toBeLessThan(p2Screen.x - 150); // Spalten dürfen sich nicht überlappen

  const diffW1 = await vergleicheSpalte(page, p1Screen.x, 300, vorher, nachher);
  // Baseline (ROADMAP 493): Kupfer-Glut emissiv 0.35 allein mass +22 R. Die
  // neue Auswahlkante (`selectedEdgeMaterial`, Viewport3D.tsx ~1394-1409:
  // R=255, `depthTest:false`) ersetzt die dunkle Basiskante (`edgeMaterial`
  // 0x2a2620, R=42) — rechnerisches Maximum 213 (8-Bit-Kanalgrenze). 150 ist
  // ein grosszügiger Schwellwert klar über einer Grössenordnung des alten
  // +22-Werts, ohne gegen Antialiasing-Rundung am exakten Kantenpixel zu
  // wetten.
  expect(diffW1.maxDeltaR).toBeGreaterThanOrEqual(150);

  const diffW2 = await vergleicheSpalte(page, p2Screen.x, 300, vorher, nachher);
  // w2 bleibt komplett unselektiert — E3-Vorgabe «Basis-Material unangetastet»:
  // KEIN Pixel irgendeines Kanals in der w2-Spalte darf sich ändern (nicht
  // nur "annähernd gleich" — die Materialien sind Referenz-Swaps, kein neuer
  // Zufalls-/Zeit-Term fliesst ein).
  expect(diffW2.maxDeltaAny).toBe(0);

  await page.screenshot({ path: 'e2e-results/pa2-087-3d-auswahl-kante.png' });
});

test('C-7 (E4): KAMERA-HUD folgt echten camera-controls-Events — Event-Zähler steigt unabhängig vom 400ms-Fallback-Poll, AZIMUT-Anzeige aktualisiert sich schnell', async ({
  page,
}) => {
  await starteManuell3D(page);
  await zweiWaendeMitKamera(page); // deterministische Startkamera (setCamera + renderOnce, s. setzeKamera3D)

  const azimutZelle = page.locator('.k-keyvalue-zeile', { hasText: 'AZIMUT' }).locator('.k-keyvalue-wert').first();
  await expect(azimutZelle).toBeVisible();
  const textVorher = await azimutZelle.textContent();

  const zaehlerVorher = await page.evaluate(() => window.__kosmoViewport!.kameraHudEventCount());

  // Kamera per Testhook auf einen GEOMETRISCH garantiert anderen Azimut
  // drehen: Ziel bleibt, Position wandert vom bisherigen +Z-Anflug auf einen
  // +X-Anflug (90°-Versatz um das Ziel) — kein Nachrechnen der
  // `controls.azimuthAngle`-Formel nötig, der Winkel MUSS sich ändern.
  // `renderOnce()` ruft `controls.update()` synchron auf — exakt die
  // Bedingung, unter der camera-controls das 'update'-Event dispatcht
  // (camera-controls.module.js:2263-2269, Kommentar an der Listener-Stelle
  // in Viewport3D.tsx).
  await page.evaluate(() => {
    const hook = window.__kosmoViewport!;
    const cam = hook.getCamera();
    hook.setCamera(cam.tx + 15, cam.ty, cam.tz, cam.tx, cam.ty, cam.tz);
    hook.renderOnce();
  });

  // Primärer, robuster Beweis (Kopfkommentar): der ereignisgetriebene Zähler
  // steigt — dieser Zähler wird NUR vom control/update/rest-Listener
  // inkrementiert, NIE vom 400ms-Poll (Viewport3D.tsx). Grosszügiger
  // Timeout: beweist den EREIGNIS-Weg architektonisch, nicht seine
  // Geschwindigkeit unter Containerlast.
  await expect
    .poll(() => page.evaluate(() => window.__kosmoViewport!.kameraHudEventCount()), { timeout: 2000 })
    .toBeGreaterThan(zaehlerVorher);

  // Ergänzender, informativer Wert-Beweis mit kurzem Poll-Fenster: die
  // sichtbare AZIMUT-Zelle ändert sich, ohne auf einen vollen 400ms-Zyklus
  // zu warten. Bewusst NICHT der alleinige Beweis (die Poll-Phase seit Mount
  // ist der Testzeit unbekannt, ein zufällig naher 400ms-Tick könnte sonst
  // mitspielen) — der Zähler oben bleibt entscheidend.
  await expect.poll(() => azimutZelle.textContent(), { timeout: 250, intervals: [20] }).not.toBe(textVorher);
});
