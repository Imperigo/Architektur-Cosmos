/**
 * Rundgang-PDF «0.8.6 — Verlässlich» — visueller Rundgang durch die sieben
 * Owner-sichtbaren Stücke gegenüber v0.8.5 (ROADMAP 486-495, vor dem
 * Phase-3-Marker; docs/V086-SPEZ.md). Muster «rundgang-pdf-085.mts» WÖRTLICH
 * übernommen (Screenshots der laufenden App -> A4-PDF, EIN Build/Preview,
 * dieselbe pngGroesse/bildMasse-Skalierungslogik gegen aufgeblasene
 * Element-Screenshots). Die Klick-Choreografie je Szene ist wörtlich aus den
 * jeweiligen Paket-Specs übernommen (e2e/griffe.spec.ts, e2e/autopilot-
 * dialog.spec.ts, e2e/autopilot-drehbuecher.spec.ts, e2e/publish-
 * toggles.spec.ts, e2e/viewport3d-auswahl.spec.ts, e2e/standort-
 * persistenz.spec.ts) — keine neu erfundenen Selektoren.
 *
 * Lehre aus v0.8.3 (wissen/training/claude/lehren/v0.8.3.md): innerhalb des
 * grossen HTML-Template-Literals (die «html»-Variable unten) wird NIE ein
 * echtes Backtick-Zeichen verwendet — Zitate/Code-Nennungen im sichtbaren
 * Text laufen über «Guillemets», sonst bricht tsx beim Parsen des
 * Template-Literals.
 *
 * Voraussetzung: Preview bereits auf :5183, Bridge :8600, Sync :8700 (kein
 * Neu-Build, kein Neustart durch dieses Werkzeug).
 *
 * Aufruf (aus kosmo-orbit/, Preview auf $PORT, Standard 5183):
 *   KOSMO_E2E_PORT=5183 PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium \
 *     npx tsx e2e/tools/rundgang-pdf-086.mts
 *
 * 7 Bild-Szenen (die sieben v0.8.6-Neuerungen, Autopilot-Dialog mit zwei
 * Screenshots — Vorschlagskarte + FERTIG-Schrittliste) + eigene
 * Einstiegs-/Übersichtsseite + eigene Abschluss-Seite mit den ehrlichen
 * Grenzen.
 */
import { chromium, type Page, type BrowserContext } from 'playwright-core';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const PORT = process.env['KOSMO_E2E_PORT'] ?? '5183';
const BASE = `http://localhost:${PORT}`;
const OUT = `${ROOT}abgabe/RUNDGANG-NOTIZEN-0.8.6.pdf`;
const SHOTDIR = `${ROOT}e2e-results`;
mkdirSync(`${ROOT}abgabe/`, { recursive: true });
mkdirSync(SHOTDIR, { recursive: true });
const exe = process.env['PLAYWRIGHT_CHROMIUM_PATH'] || undefined;

/** Erststart-Marker (Onboarding/StarterGuide übersprungen) + Bridge-URL —
 *  Muster rundgang-pdf-085.mts's basisLocalStorage(). Kein «kosmo.ui.v1»-
 *  Eintrag hier — der echte Produktions-Default 'island' für design/vis/
 *  publish/prepare soll unverfälscht zu sehen sein, wo der Auftrag das
 *  verlangt (Raumtyp-Toggle-Szene: «publish-Station OHNE ui-Seed»). */
function basisLocalStorage(): Record<string, string> {
  return {
    'kosmo.onboarded': '1',
    'kosmo.starterGuide.done': '1',
    'kosmo.bridge': 'http://localhost:8600',
  };
}

/** Liest Breite/Höhe direkt aus dem PNG-IHDR-Chunk — Muster
 *  rundgang-pdf-085.mts. */
function pngGroesse(buf: Buffer): { w: number; h: number } {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

interface Schuss {
  b64: string;
  w: number;
  h: number;
}

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[]; summary?: string };
      state: () => {
        activeStoreyId: string | null;
        selection: string[];
        select: (ids: string[]) => void;
        doc: {
          byKind: (k: string) => { id: string; name?: string; target?: string; assemblyId?: string }[];
          get: (id: string) => Record<string, unknown> | undefined;
          settings: {
            standortAdresse: { adresse: string; lv95: { e: number; n: number }; quelle: string; abgerufenAm: string } | null;
          };
        };
      };
    };
    __kosmoLauf: {
      starte: (plan: { titel: string; schritte: { commandId: string; params: unknown; begruendung: string }[] }) => void;
      abbrechen: () => void;
      zustand: () => {
        plan: { titel: string; schritte: unknown[] } | null;
        schritte: { status: string; ergebnis?: string; fehler?: string }[];
        status: string;
      };
    };
    __kosmoViewport?: {
      getCamera: () => { px: number; py: number; pz: number; tx: number; ty: number; tz: number };
      setCamera: (px: number, py: number, pz: number, tx: number, ty: number, tz: number) => void;
      renderOnce: () => void;
      entityMeshCount: () => number;
    };
  }
}

const MM = 1 / 1000;

async function main() {
  const browser = await chromium.launch({ executablePath: exe });
  const shots: Record<string, Schuss> = {};

  /** Island-Default-Kontext (kein «kosmo.ui.v1»-Seed) — Muster
   *  rundgang-pdf-085.mts's neueSeite(). */
  async function neueSeite(opts: { viewport?: { width: number; height: number } } = {}): Promise<Page> {
    const viewport = opts.viewport ?? { width: 1600, height: 1000 };
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.setDefaultTimeout(20000);
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.evaluate((eintraege) => {
      for (const [k, v] of Object.entries(eintraege)) localStorage.setItem(k, v);
    }, basisLocalStorage());
    await page.reload({ waitUntil: 'domcontentloaded' });
    return page;
  }

  /** Manuell-Kontext über EXAKT den vom Auftrag vorgegebenen Seed, per
   *  addInitScript VOR dem ersten Skript der Seite gesetzt — Muster
   *  rundgang-pdf-085.mts's neueSeiteManuell(). */
  async function neueSeiteManuell(opts: { viewport?: { width: number; height: number } } = {}): Promise<{
    ctx: BrowserContext;
    page: Page;
  }> {
    const viewport = opts.viewport ?? { width: 1600, height: 1000 };
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
    await ctx.addInitScript(() => {
      localStorage.setItem(
        'kosmo.ui.v1',
        JSON.stringify({
          version: 1,
          modusAutomatik: false,
          modusFesthalten: false,
          phasenFokus: null,
          designOberflaeche: 'manuell',
          visOberflaeche: 'manuell',
          publishOberflaeche: 'manuell',
          prepareOberflaeche: 'manuell',
        }),
      );
      localStorage.setItem('kosmo.onboarded', '1');
      localStorage.setItem('kosmo.starterGuide.done', '1');
    });
    const page = await ctx.newPage();
    page.setDefaultTimeout(20000);
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    return { ctx, page };
  }

  async function schuss(key: string, page: Page, sel?: string): Promise<void> {
    await page.waitForTimeout(400);
    const p = join(SHOTDIR, `rundgang086-${key}.png`);
    if (sel) {
      await page.locator(sel).screenshot({ path: p });
    } else {
      await page.screenshot({ path: p });
    }
    const buf = readFileSync(p);
    const { w, h } = pngGroesse(buf);
    shots[key] = { b64: buf.toString('base64'), w, h };
    // eslint-disable-next-line no-console
    console.log(`  ✓ ${key} (${w}x${h}px) -> ${p}`);
  }

  /** Hover statt Klick — Muster rundgang-pdf-085.mts's oeffneInsel(). */
  async function oeffneInsel(page: Page, island: string): Promise<void> {
    await page.hover(`[data-testid="island-${island}-root"]`);
    await page.locator(`[data-testid="island-${island}-leiste"]`).waitFor({ state: 'visible' });
  }

  /** Welt-mm -> Bildschirm-px über getScreenCTM() — Muster
   *  e2e/griffe.spec.ts's weltZuBildschirm(). */
  async function weltZuBildschirm(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
    return page.evaluate(
      ({ x, y }) => {
        const svg = document.querySelector('[data-testid="planview"]') as SVGSVGElement;
        const g = svg.querySelector('g') as SVGGElement;
        const pt = svg.createSVGPoint();
        pt.x = x;
        pt.y = -y;
        const transformed = pt.matrixTransform(g.getScreenCTM()!);
        return { x: transformed.x, y: transformed.y };
      },
      { x, y },
    );
  }

  /** Wand über den echten design.wandZeichnen-Command — Muster
   *  e2e/griffe.spec.ts's zeichneWand(). */
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

  /** Fenster in eine bestehende Wand — Muster e2e/griffe.spec.ts's
   *  erstelleOeffnung(). */
  async function erstelleOeffnung(page: Page, wallId: string, center: number, width = 1200): Promise<string> {
    return page.evaluate(
      ({ wallId, center, width }) => {
        const r = window.__kosmo.run('design.oeffnungSetzen', {
          wallId,
          openingType: 'fenster',
          center,
          width,
          height: 1500,
          sill: 900,
        });
        return r.patches[0]!.id;
      },
      { wallId, center, width },
    );
  }

  const waehle = (page: Page, ids: string[]) => page.evaluate((ids) => window.__kosmo.state().select(ids), ids);

  /** Bildschirm-Mitte eines gerenderten Griffs — Muster e2e/griffe.spec.ts's
   *  griffMitte(). */
  async function griffMitte(page: Page, testid: string): Promise<{ x: number; y: number }> {
    const box = await page.locator(`[data-testid="${testid}"]`).boundingBox();
    if (!box) throw new Error(`Griff ${testid} nicht sichtbar`);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  /** Zieh-Geste (down/move/move/up) — Muster e2e/griffe.spec.ts's ziehe(). */
  async function ziehe(page: Page, von: { x: number; y: number }, nach: { x: number; y: number }): Promise<void> {
    await page.mouse.move(von.x, von.y);
    await page.mouse.down();
    await page.mouse.move((von.x + nach.x) / 2, (von.y + nach.y) / 2, { steps: 3 });
    await page.mouse.move(nach.x, nach.y, { steps: 3 });
    await page.mouse.up();
  }

  // (1) Verlustfreier Wand-Griff (PA1/PA2, E1, Matrix C-1/C-2/C-3) — Wand mit
  // Fenster zeichnen, Wand einzeln wählen, Endpunkt-Griff auf eine Länge
  // ziehen, in der das Fenster weiterhin passt (900..2100 bleibt innerhalb
  // 0..3000) — GLEICHE Wand-ID, Fenster byte-erhalten, EIN Undo-Schritt.
  {
    const { ctx, page } = await neueSeiteManuell();
    await page.click('[data-testid="module-design"]');
    await page.click('[data-testid="view-2d"]');
    await page.locator('[data-testid="planview"]').waitFor({ state: 'visible' });

    const w1 = await zeichneWand(page, { x: 4000, y: 2000 }, { x: 8000, y: 2000 });
    await erstelleOeffnung(page, w1, 1500, 1200);
    await waehle(page, [w1]);
    await page.locator('[data-testid="griff-endpunkt-b"]').waitFor({ state: 'visible' });

    const von = await griffMitte(page, 'griff-endpunkt-b');
    const nach = await weltZuBildschirm(page, 7000, 2000);
    await ziehe(page, von, nach);

    const stand = await page.evaluate(() => {
      const doc = window.__kosmo.state().doc;
      return {
        waende: doc.byKind('wall').length,
        oeffnungen: doc.byKind('opening').length,
        selection: window.__kosmo.state().selection,
      };
    });
    console.log(`  … Wand-Griff verlustfrei: ${stand.waende} Wand, ${stand.oeffnungen} Öffnung, Auswahl ${stand.selection}`);
    await schuss('wand-griff-verlustfrei', page);
    await ctx.close();
  }

  // (2) Öffnungs-Griff (PB3, E5, Matrix C-15/C-16) — Fenster einzeln wählen,
  // EIN Griff auf dem Öffnungs-Mittelpunkt, Ziehen entlang der Wandachse
  // verschiebt center per design.eigenschaftSetzen (App-Clamp gegen die
  // Wandkanten, keine Identitätsänderung).
  {
    const { ctx, page } = await neueSeiteManuell();
    await page.click('[data-testid="module-design"]');
    await page.click('[data-testid="view-2d"]');
    await page.locator('[data-testid="planview"]').waitFor({ state: 'visible' });

    const w1 = await zeichneWand(page, { x: 4000, y: 2000 }, { x: 8000, y: 2000 });
    const oeffnungId = await erstelleOeffnung(page, w1, 1500, 1200);
    await waehle(page, [oeffnungId]);
    await page.locator('[data-testid="griff-oeffnung"]').waitFor({ state: 'visible' });

    const von = await griffMitte(page, 'griff-oeffnung');
    const nach = await weltZuBildschirm(page, 6500, 2000);
    await ziehe(page, von, nach);

    const oeffnung = await page.evaluate(
      () => (window.__kosmo.state().doc.byKind('opening') as unknown as { id: string; center: number }[])[0]!,
    );
    console.log(`  … Öffnungs-Griff geschoben: center=${oeffnung.center}`);
    await schuss('oeffnungs-griff', page);
    await ctx.close();
  }

  // (3a/3b) Autopilot-Dialog + Lauf-Bibliothek (PB1, E4, Matrix C-10…C-13) —
  // KosmoPanel per DOPPELklick öffnen (Orb-Gesetz seit v0.8.4 PB4), die
  // Lauf-Bibliothek zeigt drei kuratierte Drehbücher, eines wählen zeigt
  // DIESELBE Vorschlagskarte wie ein Kosmo-Dialog-Vorschlag (kein zweiter
  // Startweg) — «Lauf starten» fährt den Lauf über runtime.starte() bis
  // FERTIG.
  {
    const page = await neueSeite();
    await page.evaluate(() => {
      localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.dblclick('[data-testid="kosmo-symbol"]');
    await page.locator('[data-testid="kosmo-panel"]').waitFor({ state: 'visible' });

    const bibliothek = page.locator('[data-testid="lauf-bibliothek-root"]');
    await bibliothek.waitFor({ state: 'visible' });
    await page.locator('[data-testid="lauf-bibliothek-grundriss-rohbau"]').waitFor({ state: 'visible' });

    await page.locator('[data-testid="lauf-bibliothek-grundriss-rohbau"]').click();
    const vorschlag = page.locator('[data-testid="lauf-vorschlag-root"]');
    await vorschlag.waitFor({ state: 'visible' });
    await page.locator('[data-testid="lauf-vorschlag-schritt-0"]').waitFor({ state: 'visible' });
    await schuss('autopilot-vorschlagskarte', page, '[data-testid="lauf-vorschlag-root"]');

    await page.locator('[data-testid="lauf-vorschlag-starten"]').click();
    const root = page.locator('[data-testid="lauf-plan-root"]');
    await root.waitFor({ state: 'visible' });
    await page.waitForFunction(() => window.__kosmoLauf.zustand().status === 'fertig', undefined, { timeout: 20000 });
    // Viewport-Screenshot statt fullPage (fixiertes Panel, Lehre v0.8.5-PB2).
    await schuss('autopilot-fertig-liste', page, '[data-testid="kosmo-panel"]');
    await page.close();
  }

  // (4) Raumtyp-Toggle (PA3, E3, Matrix C-6/C-7) — publish-Station OHNE
  // ui-Seed (Island-Default), Blatt mit Parzellen-Zone + Raumtyp-Zone
  // (raumTyp:'wohnen') + platzierter Grundriss-Ansicht (Muster e2e/publish-
  // toggles.spec.ts's seedGrundrissMitBemassungUndZone), DARSTELLUNG-Insel
  // → Sichtbarkeit-Popup mit DREI Switches, Raumtypen-Switch aus → die
  // data-raumtyp-Fläche verschwindet vom Blatt.
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-publish"]');
    await page.waitForFunction(() => window.__kosmo?.state().doc.byKind('storey').length > 0, undefined, {
      timeout: 20000,
    });

    await page.evaluate(() => {
      const doc = window.__kosmo.state().doc;
      const storeyId = doc.byKind('storey')[0]!.id;
      const aufbau = doc.byKind('assembly').find((a) => a.target === 'wall')!;
      window.__kosmo.run('design.wandZeichnen', { storeyId, a: { x: 0, y: 0 }, b: { x: 5000, y: 0 }, assemblyId: aufbau.id });
      window.__kosmo.run('design.wandZeichnen', {
        storeyId,
        a: { x: 5000, y: 0 },
        b: { x: 5000, y: 4000 },
        assemblyId: aufbau.id,
      });
      window.__kosmo.run('design.zoneErstellen', {
        storeyId,
        name: 'Parzelle',
        sia: 'KF',
        zonenArt: 'parzelle',
        outline: [
          { x: -3000, y: -3000 },
          { x: 9000, y: -3000 },
          { x: 9000, y: 8000 },
          { x: -3000, y: 8000 },
        ],
      });
      window.__kosmo.run('design.zoneErstellen', {
        storeyId,
        name: 'Wohnen',
        sia: 'HNF',
        raumTyp: 'wohnen',
        outline: [
          { x: 500, y: 500 },
          { x: 3000, y: 500 },
          { x: 3000, y: 3000 },
          { x: 500, y: 3000 },
        ],
      });
      const sheet = window.__kosmo.run('publish.blattErstellen', { name: 'Rundgang-Blatt', format: 'A1', orientation: 'quer' });
      const sheetId = sheet.patches[0]!.id;
      window.__kosmo.run('publish.ansichtPlatzieren', { sheetId, view: 'grundriss', storeyId, scale: 100, x: 400, y: 250 });
    });
    await page.locator('[data-testid="sheet-canvas"]').waitFor({ state: 'visible' });

    await oeffneInsel(page, 'darstellung');
    await page.click('[data-testid="island-werkzeug-sichtbarkeit"]');
    await page.locator('[data-testid="island-sichtbarkeit-stufe2"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="island-sichtbarkeit-raumtypen"]').waitFor({ state: 'visible' });

    // KSwitch sitzt unter dem transform-tragenden .isl-popup — force:true
    // trifft das echte <input> direkt (Muster e2e/publish-toggles.spec.ts's
    // klickSchalter()-Kopfkommentar).
    await page.locator('[data-testid="island-sichtbarkeit-raumtypen"]').click({ force: true });
    await page
      .locator('[data-testid="sheet-canvas"] .k-publish-blatt-svg')
      .waitFor({ state: 'attached' });
    await page.waitForFunction(() => {
      const svg = document.querySelector('[data-testid="sheet-canvas"] .k-publish-blatt-svg');
      return svg?.getAttribute('data-raumtypen') === 'aus';
    });
    await schuss('publish-raumtyp-toggle', page);
    await page.close();
  }

  // (5) 3D-Shift-Klick (PB2, D5, Matrix C-14) — zwei Wände weit auseinander,
  // Kamera achsparallel über den __kosmoViewport-Testhook positioniert
  // (Ziel-X=9.0 statt mittig, damit BEIDE Klickpunkte in die linke,
  // kartenfreie Bildschirmhälfte projizieren — die schwebende HUD-Karte
  // rechts frisst sonst die Klicks, Muster e2e/viewport3d-auswahl.spec.ts).
  {
    const { ctx, page } = await neueSeiteManuell();
    await page.click('[data-testid="module-design"]');
    await page.click('[data-testid="view-3d"]');
    await page.locator('canvas').first().waitFor({ state: 'visible' });
    await page.waitForFunction(() => !!window.__kosmoViewport);

    const meshCountVorher = await page.evaluate(() => window.__kosmoViewport!.entityMeshCount());
    const w1 = await zeichneWand(page, { x: 1000, y: 3000 }, { x: 3000, y: 3000 });
    const w2 = await zeichneWand(page, { x: 7000, y: 3000 }, { x: 9000, y: 3000 });
    await page.waitForFunction(
      (vorher) => window.__kosmoViewport!.entityMeshCount() >= vorher + 2,
      meshCountVorher,
      { timeout: 10000 },
    );

    async function weltZuBildschirm3D(welt: { x: number; y: number; z: number }): Promise<{ x: number; y: number }> {
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

    await page.evaluate(() => {
      const hook = window.__kosmoViewport!;
      hook.setCamera(9000 * (1 / 1000), 1.3, -3000 * (1 / 1000) + 15, 9000 * (1 / 1000), 1.3, -3000 * (1 / 1000));
      hook.renderOnce();
    });

    const p1 = { x: 2000, y: 3000, z: 1300 };
    const p2 = { x: 8000, y: 3000, z: 1300 };
    const s1 = await weltZuBildschirm3D(p1);
    await page.mouse.click(s1.x, s1.y);
    await page.waitForFunction(
      (w1) => window.__kosmo.state().selection.length === 1 && window.__kosmo.state().selection[0] === w1,
      w1,
    );

    const s2 = await weltZuBildschirm3D(p2);
    await page.keyboard.down('Shift');
    await page.mouse.click(s2.x, s2.y);
    await page.keyboard.up('Shift');
    await page.waitForFunction(() => window.__kosmo.state().selection.length === 2);
    await page.locator('[data-testid="inspector-mehrfach-anzahl"]').waitFor({ state: 'visible' });

    const anzahl = await page.evaluate(() => window.__kosmo.state().selection.length);
    console.log(`  … 3D-Shift-Klick: ${anzahl} Elemente ausgewählt (w1=${w1}, w2=${w2})`);
    await page.evaluate(() => window.__kosmoViewport!.renderOnce());
    await schuss('3d-shift-klick', page);
    await ctx.close();
  }

  // (6) Standort-Persistenz (PC1, E6/D7, Matrix C-17) — page.route-Fixture
  // auf api3.geo.admin.ch (Muster e2e/standort-persistenz.spec.ts), echte
  // StandortSuche ausführen, Reload (Autosave-Debounce abwarten) beweist die
  // Persistenz, KosmoData-Übersicht zeigt die PROJEKT-STANDORT-Karte.
  {
    // Manuell-Seed nötig (nicht Island-Default) — «sonne-toggle» ist Teil der
    // klassischen design-Werkzeugleiste (Gruppe «ebenen»), die nur im
    // manuell-Modus rendert (Muster: `e2e/standort-persistenz.spec.ts` seedet
    // NICHT explizit auf Island, erbt also den globalen
    // `kosmoUiV1SeedMitManuell()`-Default aus `playwright.config.ts`).
    const { ctx, page } = await neueSeiteManuell();
    await page.route('**/rest/services/api/SearchServer**', (route) =>
      route.fulfill({
        json: {
          results: [{ attrs: { label: '<b>Musterstrasse 1 Zug</b>', lat: 47.17, lon: 8.52, y: 2681500, x: 1224500 } }],
        },
      }),
    );

    await page.click('[data-testid="module-design"]');
    await page.locator('[data-testid="viewport3d"]').waitFor({ state: 'visible' });
    await page.click('[data-testid="sonne-toggle"]');

    await page.fill('[data-testid="standort-suche"]', 'Musterstrasse 1');
    await page.click('[data-testid="standort-suchen"]');
    await page.locator('[data-testid="standort-treffer"] button').waitFor({ state: 'visible' });
    await page.click('[data-testid="standort-treffer"] button');
    await page.locator('[data-testid="standort-adresse-aktuell"]').waitFor({ state: 'visible' });

    // Autosave ist entprellt (project-vault.ts, 1200ms) — abwarten, dann
    // reload: der Standort muss den Reload überleben (Persistenz-Beweis).
    await page.waitForTimeout(1600);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => window.__kosmo.state().doc.settings.standortAdresse?.adresse === 'Musterstrasse 1 Zug',
    );

    await page.click('[data-testid="module-data"]');
    await page.click('[data-testid="tab-uebersicht"]');
    await page.locator('[data-testid="data-projekt-standort"]').waitFor({ state: 'visible' });
    console.log('  … Standort-Persistenz: PROJEKT-STANDORT-Karte nach Reload sichtbar');
    await schuss('standort-persistenz', page);
    await ctx.close();
  }

  await browser.close();

  // Einpassen statt Aufblasen — Muster rundgang-pdf-085.mts.
  const DPR = 2;
  const MM_PRO_PX = 25.4 / 96;
  const NUTZBARE_BREITE_MM = 210 - 2 * 14;
  const MAX_BILD_HOEHE_MM = 155;

  function bildMasse(s: Schuss): { wMm: number; hMm: number } {
    const naturalWMm = (s.w / DPR) * MM_PRO_PX;
    const naturalHMm = (s.h / DPR) * MM_PRO_PX;
    const scale = Math.min(NUTZBARE_BREITE_MM / naturalWMm, MAX_BILD_HOEHE_MM / naturalHMm, 1.0);
    return { wMm: naturalWMm * scale, hMm: naturalHMm * scale };
  }

  interface Flaeche {
    key: string;
    titel: string;
    notiz: string;
  }

  const flaechen: Flaeche[] = [
    {
      key: 'wand-griff-verlustfrei',
      titel: '§1/PA1+PA2 · Verlustfreier Wand-Griff — Fenster bleibt, Wand-ID bleibt',
      notiz: 'Der Wand-Zweig von onGriffEnd lief bis v0.8.5 als Löschen+Neusetzen — dabei kaskadierten alle auf der Wand gesetzten Öffnungen weg (Fenster/Türen samt fensterTyp/teilung/typeId/Beschlägen). Das neue Kernel-Command design.wandGeometrieSetzen patcht die Wand IN PLACE: Identität, height, Umbau-/Phasen-Status, assemblyId, alignment und ALLE gehosteten Öffnungen bleiben (Objekt-Spread, nur a/b überschrieben). Der Screenshot zeigt es direkt: dieselbe Wand (gleiche ID, Inspector-Kopfzeile unverändert «WAND · …») nach dem Endpunkt-Zug, das Fenster steht unverändert an seinem Platz. Kürzer-Wand-Regel bei kollidierenden Öffnungen: (1) passt center±width/2 weiterhin → byte-gleich (dieser Fall hier); (2) passt erst nach Clamp von center auf die nähere Wandkante → geclampt (Breite bleibt); (3) ist die Öffnung breiter als die neue Wand → sie wird im SELBEN Command entfernt, und summarize meldet es sichtbar («… N Öffnung(en) entfernt»). Alles EIN Command = EIN Undo-Schritt.',
    },
    {
      key: 'oeffnungs-griff',
      titel: '§2/PB3 · Öffnungs-Griff — Fenster wählen, Griff entlang der Wand schieben',
      notiz: 'Einzeln gewähltes Fenster zeigt jetzt EINEN Griff auf dem Öffnungs-Mittelpunkt (achsen-projiziert aus center entlang der Wirtswand). Ziehen schiebt die Öffnung entlang der Wandachse — das Drag-Ende ruft EIN design.eigenschaftSetzen(’center’) mit App-seitigem Clamp gegen width/2 … wandLänge−width/2 (der Kernel validiert center bei eigenschaftSetzen nicht — der Clamp ist der eigentliche Schutz), keine Identitätsänderung, ein Undo-Schritt. Griff-Hit-Vorrang vor dem Wand-Hit (dasselbe Muster wie bei Zonen-/Volumen-/Dach-Eckgriffen). Der Griff verschwindet bei Mehrfach-Auswahl, genau wie die Wand-Endpunkt-Griffe.',
    },
    {
      key: 'autopilot-vorschlagskarte',
      titel: '§3a/PB1 · Autopilot-Dialog — Lauf-Bibliothek → Vorschlagskarte',
      notiz: 'Kosmo-Panel per Doppelklick auf das Kosmo-Symbol geöffnet (Einfachklick öffnet seit v0.8.4 «Orb-Gesetz» nur die kleine Konversationskarte). Die Lauf-Bibliothek zeigt die drei kuratierten Drehbücher; ein Drehbuch («Rohbau-Grundriss») gewählt zeigt DIESELBE Vorschlagskarte wie ein Kosmo-Dialog-Vorschlag (kein zweiter Startweg) — Titel + Schrittliste mit Begründungen, «Lauf starten»/«Ablehnen». Das neue Nicht-Command-Tool lauf_planen wird von der ChatSession NIE ausgeführt, nur als Karte gerendert — solange sie offen steht, ist das Doc unverändert (Sanktion 2+3, V086-SPEZ §6). Die @ref-Platzhalter-Auflösung lebt jetzt als getestete Funktion loeseLaufPlanRefs in @kosmo/ai, mit progressiver Auflösung je Schritt gegen das fortgeschrittene Live-Doc (die Drehbücher referenzieren ihre eigenen, erst zur Laufzeit entstehenden IDs).',
    },
    {
      key: 'autopilot-fertig-liste',
      titel: '§3b/PB1 · Autopilot-Dialog — «Lauf starten» → FERTIG-Schrittliste',
      notiz: 'Erst der Klick auf «Lauf starten» ruft lauf-runtime.starte() — derselbe Weg wie der __kosmoLauf-Testhook. Jeder Schritt läuft über den echten runCommand-Weg, bekommt eine eigene Undo-Gruppe, alle Schritte stehen hier grün auf «fertig». Abbrechen ist echt: bis v0.8.5 liefen alle Kernel-Commands synchron in einem einzigen Task durch — 0 von 400 echten Klick-Versuchen des Prüfers landeten je einen Abbruch. Der Fix lässt LaufRunner.starte() vor JEDEM Schritt einen Macrotask yielden, damit der Browser Klicks zwischen den Schritten wirklich verarbeitet; ein neuer E2E-Test beweist den Abbruch jetzt per echtem Klick gegen einen 400-Schritt-Lauf (ROADMAP 495). Zweite Härtung derselben Prüfrunde: erfundene commandIds werden bereits zur Vorschlags-Zeit gegen die reale Command-Registry geprüft — keine Karte, kein halber Lauf.',
    },
    {
      key: 'publish-raumtyp-toggle',
      titel: '§4/PA3 · Publish — dritter Sichtbarkeits-Switch «Raumtypen»',
      notiz: 'Owner-Feature ohne Golden-Sammelwechsel: planInnerSvg-opts kennt neu datenAttribute?:boolean (Default AUS, alle 36 Goldens bleiben byte-still) — nur die zwei Publish-Blatt-Renderpfade aktivieren es. Bei true tragen Raumtyp-Füllungen ein echtes data-raumtyp-Attribut. Die DARSTELLUNG-Insel zeigt jetzt DREI unabhängige Switches (Bemassung/Zonen/Raumtypen, alle Default AN) statt zwei. Der Screenshot zeigt das Sichtbarkeit-Popup, nachdem der Raumtypen-Switch ausgeschaltet wurde (KSwitch sitzt unter einem transform-tragenden Popup-Container, darum click({force:true}) statt des normalen Actionability-Klicks) — die zuvor sichtbare Wohnen-Fläche ist von der platzierten Grundriss-Ansicht verschwunden, während die Parzellenkontur (Zonen-Switch, unabhängig davon) unverändert stehen bleibt.',
    },
    {
      key: '3d-shift-klick',
      titel: '§5/PB2 · 3D-Shift-Klick — Mehrfach-Auswahl im Viewport',
      notiz: 'Der seit v0.8.5 deklarierte, 3D-seitig aber nie verdrahtete Auswahl-Vertrag ist geschlossen: Viewport3D ruft onPick jetzt mit {toggle: ev.shiftKey} auf. Klick wählt die erste Wand, Shift-Klick fügt die zweite hinzu — der Inspector zeigt «2 Elemente», identisch zum 2D-Dock. Die Kamera zielt bewusst auf X≈9.0m statt mittig auf die Wände: eine mittige Kamera würde die zweite Wand auf Bildschirm-X≈879px projizieren, direkt unter der schwebenden Viewport-Eigenschaften-Karte (x≈707-1050) — diese Karte hätte den Klick abgefangen, nicht das Canvas (per elementFromPoint bewiesen). Mit dem verschobenen Ziel landen beide Klickpunkte klar links davon.',
    },
    {
      key: 'standort-persistenz',
      titel: '§6/PC1 · Standort-Persistenz — überlebt den Reload',
      notiz: 'Der Projektstandort lebte bis v0.8.5 nur im React-State — ein Reload verlor ihn. Das neue Setting standortAdresse (design.standortAdresseSetzen, SettingsPatch-Muster wie schnittSetzen) hält Adresse/LV95/Herkunft/Abrufzeitpunkt im Doc. Die StandortSuche (hier gegen eine geo.admin-Fixture statt echtem Netz) schreibt es nach einem gewählten Treffer, ein Ctrl+Z entfernt nur diesen Schritt (eigene Undo-Gruppe seit dem Fable-Nachzug, ein Klick = ein Undo). Der Screenshot zeigt die KosmoData-Übersicht NACH einem echten Reload — die PROJEKT-STANDORT-Karte zeigt Adresse und LV95-Koordinaten aus dem persistierten Doc, kein Session-Artefakt. Ohne gesetzten Standort zeigt dieselbe Stelle ehrlich «Kein Standort gesetzt».',
    },
  ];

  const seiten = flaechen
    .map((f) => {
      const shot = shots[f.key];
      const { wMm, hMm } = shot ? bildMasse(shot) : { wMm: NUTZBARE_BREITE_MM, hMm: 40 };
      return `<section>
      <h2>${f.titel}</h2>
      <img class="shot" style="width:${wMm.toFixed(2)}mm;height:${hMm.toFixed(2)}mm;" src="data:image/png;base64,${shot?.b64 ?? ''}" />
      <p class="notiz">${f.notiz}</p>
    </section>`;
    })
    .join('\n');

  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; color: #14130f; margin: 0; }
    .titel { padding: 0 0 8mm; page-break-after: always; }
    .titel h1 { font-size: 23px; margin: 0 0 4px; }
    .titel p { color: #5c574d; margin: 0 0 6px; font-size: 12px; }
    .titel ul { margin: 6mm 0 0; padding-left: 5mm; font-size: 12px; color: #14130f; line-height: 1.5; }
    .titel li { margin-bottom: 2mm; }
    section { page-break-inside: avoid; margin-bottom: 9mm; }
    h2 { font-size: 15px; margin: 0 0 6px; color: #0b0d12; }
    .shot { max-width: 100%; border: 1px solid #c9c4b6; border-radius: 4px; display: block; margin: 0 auto; }
    .notiz { font-size: 11.5px; color: #14130f; margin: 5px 0 0; line-height: 1.4; }
    .rest { font-size: 11.5px; color: #14130f; margin-top: 0; padding-top: 0; page-break-before: always; }
    .rest h2 { margin-top: 6mm; }
    .rest ul { padding-left: 5mm; line-height: 1.5; }
    .rest .gate { color: #5c574d; margin-top: 6mm; border-top: 1px solid #e4e0d6; padding-top: 3mm; font-size: 11px; }
  </style></head><body>
    <div class="titel">
      <h1>KosmoOrbit v0.8.6 «Verlässlich» — Rundgang</h1>
      <p>Drei Owner-bestätigte Tagespläne EINER Version (Substanz &amp; Schulden / Kosmo führt / Standort &amp; Release) — Basis v0.8.5 «Greifbar». 19.07.2026. ROADMAP 486-495, docs/V086-SPEZ.md.</p>
      <p>Neu gegenüber v0.8.5, sieben Stücke:</p>
      <ul>
        <li>Verlustfreier Wand-Endpunkt-Griff: Öffnungen bleiben in-place erhalten (design.wandGeometrieSetzen).</li>
        <li>Öffnungs-Griff: Fenster/Türen einzeln per Griff entlang der Wand verschiebbar, App-Clamp an den Kanten.</li>
        <li>Kosmo-Autopilot-Dialog: lauf_planen-Vorschlagskarte aus dem Chat + Lauf-Bibliothek mit drei Drehbüchern.</li>
        <li>Echter Abbruch eines laufenden Autopilot-Laufs — per echtem Klick bewiesen (400-Schritt-Lauf).</li>
        <li>Publish: dritter Sichtbarkeits-Switch «Raumtypen», unabhängig von «Zonen» (Parzellen-Kontext).</li>
        <li>3D-Shift-Klick-Mehrfachauswahl im Viewport, Inspector «N Elemente» wie im 2D-Plan.</li>
        <li>Standort-Persistenz: die StandortSuche überlebt jetzt Reload und Speichern/Laden, KosmoData zeigt ihn.</li>
      </ul>
    </div>
    ${seiten}
    <div class="rest">
      <h2>Ehrlich offen — bewusste Grenzen dieser Version</h2>
      <ul>
        <li><b>3D-Auswahl-Highlight visuell subtil:</b> die «Kupfer-Glut» (emissiv 0.35) ist per Pixel-Readback messbar (+22 R), fürs Auge aber schwach — Kandidat für eine Sichtbarkeits-Politur (ROADMAP 493).</li>
        <li><b>zonenArt bleibt Kontextzonen-Marker:</b> «nachbar» (wie «parzelle») beschreibt den Parzellen-/Nachbarkontext, nicht einzelne Raumtyp-Füllungen — die adressiert weiterhin nur der neue data-raumtyp-Weg.</li>
        <li><b>ÖREB-Abruf vertagt:</b> Standort-Persistenz war der bewusste Schnitt für diese Version (halbe Kette existierte bereits seit v0.7.x) — der öffentlich-rechtliche Eigentumsbeschränkungs-Abruf bleibt Kandidat.</li>
        <li><b>Kein 3D-Marquee:</b> nur Klick/Shift-Klick sind verdrahtet — ein Aufziehrechteck (Frustum/Occlusion) im 3D-Viewport ist bewusst nicht Teil dieser Version.</li>
        <li><b>Projektionsformel dupliziert:</b> die Öffnungs-Griff-Projektion (center↔Bildschirmpunkt) lebt bewusst doppelt in PlanView und DesignWorkspace — ein gemeinsames Util läge ausserhalb des Paket-Dateikreises, Kandidat für eine spätere Politur.</li>
      </ul>
      <p class="gate"><b>Gate:</b> Typecheck 0, Kernel 1043, App 127/1686, kosmo-ai 310, svg-qa 36/0 (byte-still), Matrix-Abnahme 16 adversariale Prüfer (14 bestanden, 2 echte Funde — beide noch am selben Tag gefixt und regressionsgetestet, ROADMAP 495).</p>
    </div>
  </body></html>`;

  const b2 = await chromium.launch({ executablePath: exe });
  const p2 = await b2.newPage();
  await p2.setContent(html, { waitUntil: 'networkidle' });
  await p2.pdf({ path: OUT, format: 'A4', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
  await b2.close();
  // eslint-disable-next-line no-console
  console.log(`\nRundgang-PDF -> ${OUT}`);
  // eslint-disable-next-line no-console
  console.log(`Seiten (Flaechen): ${flaechen.length} + Einstiegs-/Abschluss-Seite`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
