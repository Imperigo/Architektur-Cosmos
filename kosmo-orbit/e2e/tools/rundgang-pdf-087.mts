/**
 * Rundgang-PDF «0.8.7 — Verortet» — visueller Rundgang durch die sieben
 * Owner-sichtbaren Stücke gegenüber v0.8.6 (ROADMAP 497-505, vor dem
 * Phase-3-Marker; docs/V087-SPEZ.md). Muster «rundgang-pdf-086.mts» WÖRTLICH
 * übernommen (Screenshots der laufenden App -> A4-PDF, EIN Build/Preview,
 * dieselbe pngGroesse/bildMasse-Skalierungslogik gegen aufgeblasene
 * Element-Screenshots). Die Klick-Choreografie je Szene ist wörtlich aus den
 * jeweiligen Paket-Specs übernommen (e2e/griffe-treppe.spec.ts,
 * e2e/viewport3d-auswahl.spec.ts, e2e/viewport3d-marquee.spec.ts,
 * e2e/oereb-light.spec.ts) — keine neu erfundenen Selektoren.
 *
 * Lehre aus v0.8.3 (wissen/training/claude/lehren/v0.8.3.md): innerhalb des
 * grossen HTML-Template-Literals (die «html»-Variable unten) wird NIE ein
 * echtes Backtick-Zeichen verwendet — Zitate/Code-Nennungen im sichtbaren
 * Text laufen über «Guillemets», sonst bricht tsx beim Parsen des
 * Template-Literals.
 *
 * Lehre v0.8.6 §3 (Betriebsfehler): während dieses Werkzeug gegen :5183
 * prüft, NIE neu bauen oder den Preview killen.
 *
 * Voraussetzung: Preview bereits auf :5183 (kein Neu-Build, kein Neustart
 * durch dieses Werkzeug).
 *
 * Aufruf (aus kosmo-orbit/, Preview auf $PORT, Standard 5183):
 *   KOSMO_E2E_PORT=5183 PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium \
 *     npx tsx e2e/tools/rundgang-pdf-087.mts
 *
 * 7 Bild-Szenen (die sieben v0.8.7-Neuerungen: zwei Treppen-Griff-Formen,
 * 3D-Highlight, 3D-Marquee, ÖREB-Themenliste + KosmoData-Karte,
 * KAMERA-HUD) + eigene Einstiegs-/Übersichtsseite + eigene Abschluss-Seite
 * mit den ehrlichen Grenzen.
 */
import { chromium, type Page, type BrowserContext } from 'playwright-core';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const PORT = process.env['KOSMO_E2E_PORT'] ?? '5183';
const BASE = `http://localhost:${PORT}`;
const OUT = `${ROOT}abgabe/RUNDGANG-NOTIZEN-0.8.7.pdf`;
const SHOTDIR = `${ROOT}e2e-results`;
mkdirSync(`${ROOT}abgabe/`, { recursive: true });
mkdirSync(SHOTDIR, { recursive: true });
const exe = process.env['PLAYWRIGHT_CHROMIUM_PATH'] || undefined;

/** Erststart-Marker (Onboarding/StarterGuide übersprungen) + Bridge-URL —
 *  Muster rundgang-pdf-086.mts's basisLocalStorage(). */
function basisLocalStorage(): Record<string, string> {
  return {
    'kosmo.onboarded': '1',
    'kosmo.starterGuide.done': '1',
    'kosmo.bridge': 'http://localhost:8600',
  };
}

/** Liest Breite/Höhe direkt aus dem PNG-IHDR-Chunk — Muster
 *  rundgang-pdf-086.mts. */
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
          byKind: (k: string) => { id: string; name?: string; target?: string; assemblyId?: string; form?: string }[];
          get: (id: string) => Record<string, unknown> | undefined;
          settings: {
            standortAdresse: { adresse: string; lv95: { e: number; n: number }; quelle: string; abgerufenAm: string } | null;
            oerebAuszug: {
              egrid: string;
              abgerufenAm: string;
              quelle: string;
              themen: { code: string; titel: string; betroffen: boolean }[];
            } | null;
          };
        };
      };
    };
    __kosmoViewport?: {
      getCamera: () => { px: number; py: number; pz: number; tx: number; ty: number; tz: number };
      setCamera: (px: number, py: number, pz: number, tx: number, ty: number, tz: number) => void;
      renderOnce: () => void;
      entityMeshCount: () => number;
      kameraHudEventCount: () => number;
    };
  }
}

const MM = 1 / 1000;

async function main() {
  const browser = await chromium.launch({ executablePath: exe });
  const shots: Record<string, Schuss> = {};

  /** Manuell-Kontext über EXAKT den vom Auftrag vorgegebenen Seed, per
   *  addInitScript VOR dem ersten Skript der Seite gesetzt — Muster
   *  rundgang-pdf-086.mts's neueSeiteManuell(). Die klassische
   *  Werkzeugleiste (Treppen-Griffe, sonne-toggle/Standort-Panel) rendert
   *  nur im manuell-Modus (086-Lehre). */
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

  async function schuss(
    key: string,
    page: Page,
    sel?: string,
    clip?: { x: number; y: number; width: number; height: number },
  ): Promise<void> {
    await page.waitForTimeout(400);
    const p = join(SHOTDIR, `rundgang087-${key}.png`);
    if (clip) {
      await page.screenshot({ path: p, clip });
    } else if (sel) {
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

  /** Welt-mm -> Bildschirm-px über getScreenCTM() — Muster
   *  e2e/griffe-treppe.spec.ts's weltZuBildschirm(). */
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
   *  e2e/viewport3d-auswahl.spec.ts's zeichneWand(). */
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

  /** Treppe über den echten design.treppeErstellen-Command — Muster
   *  e2e/griffe-treppe.spec.ts's erstelleTreppe(). EG (bootstrapProject())
   *  hat height 3000 — die Steigung bleibt für jede Lauflänge ≥1m deutlich
   *  unter dem 200mm-Gate. */
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

  const waehle = (page: Page, ids: string[]) => page.evaluate((ids) => window.__kosmo.state().select(ids), ids);

  /** Bildschirm-Mitte eines gerenderten Griffs — Muster
   *  e2e/griffe-treppe.spec.ts's griffMitte(). */
  async function griffMitte(page: Page, testid: string): Promise<{ x: number; y: number }> {
    const box = await page.locator(`[data-testid="${testid}"]`).boundingBox();
    if (!box) throw new Error(`Griff ${testid} nicht sichtbar`);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  /** Zieh-Geste (down/move/move/up) — Muster e2e/griffe-treppe.spec.ts's
   *  ziehe(). */
  async function ziehe(page: Page, von: { x: number; y: number }, nach: { x: number; y: number }): Promise<void> {
    await page.mouse.move(von.x, von.y);
    await page.mouse.down();
    await page.mouse.move((von.x + nach.x) / 2, (von.y + nach.y) / 2, { steps: 3 });
    await page.mouse.move(nach.x, nach.y, { steps: 3 });
    await page.mouse.up();
  }

  /** Design-Modul, 2D-Plan aktiv — gemeinsamer Einstieg der Treppen-Szenen. */
  async function starteManuell2D(page: Page): Promise<void> {
    await page.click('[data-testid="module-design"]');
    await page.click('[data-testid="view-2d"]');
    await page.locator('[data-testid="planview"]').waitFor({ state: 'visible' });
  }

  /** Design-Modul, 3D-Ansicht aktiv — gemeinsamer Einstieg der 3D-Szenen —
   *  Muster e2e/viewport3d-auswahl.spec.ts's starteManuell3D(). */
  async function starteManuell3D(page: Page): Promise<void> {
    await page.click('[data-testid="module-design"]');
    await page.click('[data-testid="view-3d"]');
    await page.locator('canvas').first().waitFor({ state: 'visible' });
    await page.waitForFunction(() => !!window.__kosmoViewport);
  }

  /** Positioniert die Kamera achsparallel (Augenhöhe = Zielhöhe) — Muster
   *  e2e/viewport3d-auswahl.spec.ts's setzeKamera3D(). */
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

  /** Welt (Plan-mm x/y + Elevation-mm z) -> Bildschirm-Pixel — byte-gleiche
   *  Formel wie e2e/viewport3d-auswahl.spec.ts's weltZuBildschirm3D(). */
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

  /** Zwei Wände links im Bild, Kamera-Ziel-X=9.0m statt mittig — dieselbe
   *  kartenfreie linke Bildschirmhälfte wie e2e/viewport3d-auswahl.spec.ts /
   *  e2e/viewport3d-marquee.spec.ts (086-Lehre: die schwebende HUD-Karte
   *  rechts frisst sonst Klicks/Drag-Enden). */
  async function zweiWaendeLinks(page: Page): Promise<{ w1: string; w2: string }> {
    const meshCountVorher = await page.evaluate(() => window.__kosmoViewport!.entityMeshCount());
    const w1 = await zeichneWand(page, { x: 1000, y: 3000 }, { x: 3000, y: 3000 });
    const w2 = await zeichneWand(page, { x: 7000, y: 3000 }, { x: 9000, y: 3000 });
    await page.waitForFunction(
      (vorher) => window.__kosmoViewport!.entityMeshCount() >= vorher + 2,
      meshCountVorher,
      { timeout: 10000 },
    );
    await setzeKamera3D(page, { x: 9000 * MM, y: 1.3, z: -3000 * MM });
    return { w1, w2 };
  }

  /** Bildschirm-Rechteck, das die Boundingbox EINER Wand umschliesst —
   *  Muster e2e/viewport3d-marquee.spec.ts's rechteckFuerWand(). */
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

  // (1) Treppen-Griff gerade (PA1/PA5, D6/E1, Matrix C-1/C-3) — Treppe über
  // design.treppeErstellen zeichnen, einzeln wählen, Endpunkt-Griff b auf
  // eine neue Lauflänge ziehen — GLEICHE Treppen-ID, form/width bleiben,
  // Griffe a/b weiterhin sichtbar, Inspector + Statuszeile im Bild.
  {
    const { ctx, page } = await neueSeiteManuell();
    await starteManuell2D(page);

    const a = { x: 2000, y: 2000 };
    const b = { x: 2000, y: 6000 };
    const t1 = await erstelleTreppe(page, a, b);
    await waehle(page, [t1]);
    await page.locator('[data-testid="griff-endpunkt-a"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="griff-endpunkt-b"]').waitFor({ state: 'visible' });

    const von = await griffMitte(page, 'griff-endpunkt-b');
    const nach = await weltZuBildschirm(page, 2000, 9000);
    await ziehe(page, von, nach);

    const stand = await page.evaluate(() => {
      const doc = window.__kosmo.state().doc;
      return { treppen: doc.byKind('stair').length, selection: window.__kosmo.state().selection };
    });
    console.log(`  … Treppen-Griff gerade: ${stand.treppen} Treppe, Auswahl ${stand.selection}`);
    await schuss('treppe-griff-gerade', page);
    await ctx.close();
  }

  // (2) Treppen-Griff L-Form (PA1/PA5, D6/E1, Matrix C-1/C-2/C-3) — Treppe
  // mit form:'l' + ecke, drei Griffe (a/ecke/b) sichtbar, Eckpunkt-Griff
  // Richtung a verschoben — form bleibt 'l', ecke geändert, a/b unangetastet.
  {
    const { ctx, page } = await neueSeiteManuell();
    await starteManuell2D(page);

    const a = { x: 2000, y: 2000 };
    const ecke = { x: 2000, y: 5000 };
    const b = { x: 5000, y: 5000 };
    const t1 = await erstelleTreppe(page, a, b, { form: 'l', ecke });
    await waehle(page, [t1]);
    await page.locator('[data-testid="griff-endpunkt-a"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="griff-endpunkt-b"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="griff-endpunkt-ecke"]').waitFor({ state: 'visible' });

    const von = await griffMitte(page, 'griff-endpunkt-ecke');
    const nach = await weltZuBildschirm(page, 2000, 4500);
    await ziehe(page, von, nach);

    const stand = await page.evaluate(() => window.__kosmo.state().doc.byKind('stair'));
    console.log(`  … Treppen-Griff L-Form: form=${stand[0]?.form}`);
    await schuss('treppe-griff-l-form', page);
    await ctx.close();
  }

  // (3) 3D-Highlight (PA2, D1/E3, Matrix C-6) — zwei Wände weit auseinander,
  // Kamera achsparallel (Ziel-X=9.0 statt mittig, kartenfreie linke
  // Bildschirmhälfte, Muster e2e/viewport3d-auswahl.spec.ts), linke Wand
  // per echtem Klick gewählt — oranger Kantenrahmen vs. unselektierte
  // rechte Wand.
  {
    const { ctx, page } = await neueSeiteManuell();
    await starteManuell3D(page);
    const { w1 } = await zweiWaendeLinks(page);

    await klickPick3D(page, { x: 2000, y: 3000, z: 1300 });
    await page.waitForFunction(
      (w1) => window.__kosmo.state().selection.length === 1 && window.__kosmo.state().selection[0] === w1,
      w1,
    );
    await page.evaluate(() => window.__kosmoViewport!.renderOnce());

    // Eng auf beide Wände zugeschnitten (rechteckFuerWand-Muster) statt des
    // vollen 1600x1000-Viewports — der orange Kantenrahmen ist real vorhanden
    // (per Pixel-Readback im echten Test bewiesen), auf der vollen
    // Bildschirmfläche im Druck aber nur wenige Pixel breit. Der enge
    // Ausschnitt macht den Kontrast zur unselektierten Wand auch im
    // gedruckten Rundgang klar erkennbar (selbst gesichtet, s. Bericht).
    const r = await rechteckFuerWand(page, 1000, 9000, 3000, 40);
    console.log(`  … 3D-Highlight: w1=${w1} gewählt, Kante orange, Ausschnitt (${r.x0.toFixed(0)},${r.y0.toFixed(0)})-(${r.x1.toFixed(0)},${r.y1.toFixed(0)})`);
    await schuss('highlight-3d', page, undefined, { x: r.x0, y: r.y0, width: r.x1 - r.x0, height: r.y1 - r.y0 });
    await ctx.close();
  }

  // (4) 3D-Marquee (PB2, D3/E5, Matrix C-14) — Shift-Drag über beide Wände,
  // mid-drag Screenshot mit sichtbarem Aufziehrechteck (Muster
  // e2e/viewport3d-marquee.spec.ts's C-14a).
  {
    const { ctx, page } = await neueSeiteManuell();
    await starteManuell3D(page);
    const { w1, w2 } = await zweiWaendeLinks(page);
    const r = await rechteckFuerWand(page, 1000, 9000, 3000, 20);

    await page.mouse.move(r.x0, r.y0);
    await page.keyboard.down('Shift');
    await page.mouse.down();
    await page.mouse.move((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, { steps: 6 });
    await page.locator('[data-testid="viewport3d-marquee"]').waitFor({ state: 'visible' });

    console.log(`  … 3D-Marquee mid-drag: Overlay sichtbar über w1=${w1}/w2=${w2}`);
    await schuss('marquee-3d', page);

    await page.mouse.move(r.x1, r.y1, { steps: 6 });
    await page.mouse.up();
    await page.keyboard.up('Shift');
    await ctx.close();
  }

  // (5+6) ÖREB light (PB1, D7/E6, Matrix C-11/C-12) — StandortSuche
  // (api3-Fixture) -> Treffer -> nachgelagerter ÖREB-Abruf (ech-SearchServer
  // + oereb/extract-Fixtures, Muster e2e/oereb-light.spec.ts). Erst die
  // Themenliste + Pflicht-Hinweis im Standort-Panel (5), dann nach Reload
  // die PROJEKT-STANDORT/ÖREB-Karte in KosmoData (6) — zwei Screenshots aus
  // demselben Kontext (086-Muster autopilot-vorschlagskarte/-fertig-liste).
  {
    const { ctx, page } = await neueSeiteManuell();
    await page.evaluate(() => localStorage.setItem('kosmo.panelOffen', '1'));

    const THEMEN_JSON = { results: [{ attrs: { egrid: 'CH113928077734' } }] };
    const EXTRACT_JSON = {
      GetExtractByIdResponse: {
        extract: {
          ConcernedTheme: [
            { Code: 'ContaminatedSites', Text: [{ Language: 'de', Text: 'Belastete Standorte' }] },
            { Code: 'GroundwaterProtectionZones', Text: [{ Language: 'de', Text: 'Grundwasserschutzzonen' }] },
          ],
          NotConcernedTheme: [{ Code: 'ForestPerimeters', Text: [{ Language: 'de', Text: 'Waldgrenzen' }] }],
        },
      },
    };

    await page.route('**/rest/services/api/SearchServer**', (route) =>
      route.fulfill({
        json: { results: [{ attrs: { label: '<b>Musterstrasse 1 Zug</b>', lat: 47.17, lon: 8.52, y: 2681500, x: 1224500 } }] },
      }),
    );
    await page.route('**/rest/services/ech/SearchServer**', (route) => route.fulfill({ json: THEMEN_JSON }));
    await page.route('**/rest/services/oereb/extract/json/**', (route) => route.fulfill({ json: EXTRACT_JSON }));

    await page.click('[data-testid="module-design"]');
    await page.locator('[data-testid="viewport3d"]').waitFor({ state: 'visible' });
    await page.click('[data-testid="sonne-toggle"]');
    await page.fill('[data-testid="standort-suche"]', 'Musterstrasse 1');
    await page.click('[data-testid="standort-suchen"]');
    await page.locator('[data-testid="standort-treffer"] button').waitFor({ state: 'visible' });
    await page.click('[data-testid="standort-treffer"] button');

    await page.waitForFunction(() => window.__kosmo.state().doc.settings.oerebAuszug !== undefined);
    await page.locator('[data-testid="oereb-themenliste"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="oereb-hinweis"]').waitFor({ state: 'visible' });
    console.log('  … ÖREB light: Themenliste + Pflicht-Hinweis sichtbar');
    await schuss('oereb-liste', page);

    // Autosave ist entprellt (project-vault.ts, 1200ms) — abwarten, dann
    // reload: der ÖREB-Auszug muss den Reload überleben (Persistenz-Beweis,
    // C-12).
    await page.waitForTimeout(1600);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => window.__kosmo.state().doc.settings.oerebAuszug?.egrid === 'CH113928077734',
    );

    await page.click('[data-testid="module-data"]');
    await page.click('[data-testid="tab-uebersicht"]');
    await page.locator('[data-testid="data-projekt-oereb"]').waitFor({ state: 'visible' });
    console.log('  … ÖREB light: KosmoData-Karte nach Reload sichtbar');
    await schuss('oereb-kosmodata', page);
    await ctx.close();
  }

  // (7) KAMERA-HUD ereignisbasiert (PA2, D2/E4, Matrix C-7) — Kamera per
  // Testhook um 90° gedreht, AZIMUT-Zelle aktualisiert sich ohne auf den
  // 400ms-Poll zu warten (Muster e2e/viewport3d-auswahl.spec.ts's C-7-Test).
  {
    const { ctx, page } = await neueSeiteManuell();
    await starteManuell3D(page);
    await zweiWaendeLinks(page);

    const azimutZelle = page.locator('.k-keyvalue-zeile', { hasText: 'AZIMUT' }).locator('.k-keyvalue-wert').first();
    await azimutZelle.waitFor({ state: 'visible' });
    const textVorher = await azimutZelle.textContent();

    await page.evaluate(() => {
      const hook = window.__kosmoViewport!;
      const cam = hook.getCamera();
      hook.setCamera(cam.tx + 15, cam.ty, cam.tz, cam.tx, cam.ty, cam.tz);
      hook.renderOnce();
    });
    await page.waitForFunction(
      (vorher) => {
        const zelle = Array.from(document.querySelectorAll('.k-keyvalue-zeile')).find((z) =>
          z.textContent?.includes('AZIMUT'),
        );
        return zelle?.querySelector('.k-keyvalue-wert')?.textContent !== vorher;
      },
      textVorher,
      { timeout: 2000 },
    );

    console.log('  … KAMERA-HUD: AZIMUT aktualisiert ereignisbasiert nach Kameradrehung');
    await schuss('kamera-hud', page);
    await ctx.close();
  }

  await browser.close();

  // Einpassen statt Aufblasen — Muster rundgang-pdf-086.mts.
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
      key: 'treppe-griff-gerade',
      titel: '§1/PA1+PA5 · Treppen-Griff gerade — Endpunkt b ziehen, ID bleibt',
      notiz: 'Bis v0.8.6 gab es nur design.treppeErstellen — kein In-Place-Setter, keine Griffe (D6). Das neue Kernel-Command design.treppeGeometrieSetzen (E1, Muster wandGeometrieSetzen) patcht a/b/ecke einer Treppe IN PLACE: Identität, width, form und storeyId bleiben. Fünf Wurf-Regeln laufen VOR jedem Patch auf der neuen Geometrie (Gesamtlauf <1 m, L-Form ohne Ecke, degenerierte Punktpaare <1 mm, Steigungs-Gate via treppenTeile) — deckungsgleich mit treppeErstellen. Einzeln gewählte Treppen zeigen die Endpunkt-Griffe a/b (exakt die Wand-Konvention); der Drag-Screenshot zeigt beide Griffe weiterhin sichtbar, den Inspector mit der Treppen-Kopfzeile und die Statuszeile am unteren Rand — EIN Command = EIN Undo-Schritt stellt die Ausgangsgeometrie exakt wieder her.',
    },
    {
      key: 'treppe-griff-l-form',
      titel: '§2/PA1+PA5 · Treppen-Griff L-Form — Eckpodest-Griff, form bleibt \'l\'',
      notiz: 'Bei form:\'l\' zeigt die Auswahl zusätzlich einen dritten Griff auf dem Eckpodest (griff-endpunkt-ecke). Die für v0.8.7 vorgesehene Reissleine (17:00, «a/b-Griffe, Ecke benannter Aufschub») wurde NICHT gebraucht — die PA1-Wurf-Regeln deckten die Ecke bereits vollständig ab. Der Screenshot zeigt alle drei Griffe (a/Ecke/b) nach dem Zug der Ecke Richtung a: form bleibt \'l\', ecke ist die neue Position, a und b bleiben unangetastet — dieselbe In-Place-Garantie wie bei der geraden Treppe. Bewusst keine Lauf-Vorschau beim Drag (nur der gezogene Punkt springt; eine echte Vorschau müsste treppenTeile pro Frame neu ableiten — im Code als Verzicht kommentiert).',
    },
    {
      key: 'highlight-3d',
      titel: '§3/PA2 · 3D-Highlight — deutlich sichtbarer Auswahlrahmen',
      notiz: 'Die in ROADMAP 493 als «visuell subtil» dokumentierte Kupfer-Glut (emissiv 0.35, Pixel-Readback +22 R) ist geschlossen: die Auswahl schaltet das vorhandene per-Entity-Kantenobjekt per Referenz-Materialtausch auf ein kräftiges Orange (depthTest:false als linewidth-Ersatz, volle Silhouette) — KEINE neue Lib, kein Puls. Pixel-Readback-Beweis aus dem eigenen Test: maxDeltaR 165 statt der alten +22 (≈7.5×; die physikalische 8-Bit-Kanalgrenze bei Basis R=42 liegt bei 213 — kein falsches Zehnerpotenz-Versprechen). Der Screenshot zeigt die linke Wand (gewählt, oranger Kantenrahmen) gegen die rechte, unselektierte Wand (byte-gleiches Material, maxDeltaAny 0).',
    },
    {
      key: 'marquee-3d',
      titel: '§4/PB2 · 3D-Marquee — Shift-Drag zieht ein Aufziehrechteck im Viewport',
      notiz: 'Der seit v0.8.5 deklarierte, 3D-seitig aber nie gefeuerte onMarqueeAuswahl-Vertrag ist geschlossen (D3/E5): Shift-Drag auf dem Canvas zieht ein sichtbares Screen-Space-Rechteck; beim Loslassen wählt ein aus den vier Rechteck-Ecken plus Kameraspitze gebautes THREE.Frustum jedes Entity, dessen Boundingbox es schneidet — additiv wie die 2D-Marquee, Esc bricht ab. Sanktion 8 hält: der Shift-Zweig biegt VOR der camera-controls-Capture ab, ein Drag ohne Shift bewegt weiter nur die Kamera. Der Screenshot zeigt das türkis gestrichelte Aufziehrechteck mitten im Zug, bevor es losgelassen wird.',
    },
    {
      key: 'oereb-liste',
      titel: '§5/PB1 · ÖREB light — Betroffenheitsliste mit Pflicht-Hinweis',
      notiz: 'Die Standort-Kette reicht jetzt bis zur ÖREB-Betroffenheit (E6): nach dem Treffer-Klick der StandortSuche läuft nachgelagert LV95 -> GetEGRID (api.geo.admin.ch/ech/SearchServer, origins=parcel) -> ÖREB-Extract -> das neue Setting oerebAuszug (design.oerebAuszugSetzen, eigener Undo-Schritt NACH der Standort-Gruppe). Das Standort-Panel zeigt die Themenliste (Code+Titel+Marker betroffen/nicht betroffen) und den Pflicht-Hinweis «Auszug light — kein rechtsgültiger ÖREB-Auszug.» (Sanktion 7). Fixture-first: die page.route-Fixturen DEFINIEREN den Vertrag (Antwortform aus der dokumentierten ÖREB-Transferstruktur), der Extract-Pfad ist ehrlich als NICHT live gegen die kantonal föderierten Dienste verifiziert markiert.',
    },
    {
      key: 'oereb-kosmodata',
      titel: '§6/PB1 · KosmoData — PROJEKT-STANDORT-Karte mit ÖREB-Zeile',
      notiz: 'Der Screenshot entsteht NACH einem echten Reload (Autosave-Debounce 1200 ms abgewartet) — kein Session-Artefakt, sondern der persistierte Doc-Zustand. Die KosmoData-Übersicht trägt jetzt die Zeile data-projekt-oereb: «2 von 3 Themen betroffen · EGRID CH113928077734 · Abrufdatum». Ein Ctrl+Z entfernt nur den ÖREB-Schritt (eigener Undo-Schritt, die Standort-Gruppe davor bleibt stehen) — bewiesen in e2e/oereb-light.spec.ts, hier nicht erneut vorgeführt.',
    },
    {
      key: 'kamera-hud',
      titel: '§7/PA2 · KAMERA-HUD ohne Nachhinken — plus ein Wort zum --k-graph-Token',
      notiz: 'Das KAMERA-HUD pollte bis v0.8.6 fix alle 400 ms (D2) — bis zu 400 ms Nachhinken hinter jeder Kamerabewegung. E4 abonniert jetzt die echten camera-controls-Events (control/update/rest, rAF-gebündelt); der 400-ms-Poll bleibt als Fallback für nicht-event-getriebene Werte. Der Screenshot zeigt die AZIMUT-Zelle nach einer Kameradrehung um 90° über den Testhook — sie aktualisiert sich, ohne auf den vollen Poll-Zyklus zu warten. Kein Bild dazu, aber derselbe Tag: der Raumgraph-Diagnosefarbe-Token --k-graph (#2455a4) ersetzt den letzten literalen Hex-Wert im Graph-Toggle-Button (plan-view-chrome.css) — ein theme-invariantes aura-Token statt eines an --k-accent gebundenen Farbwerts (C-8-Matrixfund, noch am selben Tag gefixt).',
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
    section { page-break-inside: avoid; page-break-before: always; margin-bottom: 9mm; }
    h2 { font-size: 15px; margin: 0 0 6px; color: #0b0d12; }
    .shot { max-width: 100%; border: 1px solid #c9c4b6; border-radius: 4px; display: block; margin: 0 auto; }
    .notiz { font-size: 11.5px; color: #14130f; margin: 5px 0 0; line-height: 1.4; }
    .rest { font-size: 11.5px; color: #14130f; margin-top: 0; padding-top: 0; page-break-before: always; }
    .rest h2 { margin-top: 6mm; }
    .rest ul { padding-left: 5mm; line-height: 1.5; }
    .rest .gate { color: #5c574d; margin-top: 6mm; border-top: 1px solid #e4e0d6; padding-top: 3mm; font-size: 11px; }
  </style></head><body>
    <div class="titel">
      <h1>KosmoOrbit v0.8.7 «Verortet» — Rundgang</h1>
      <p>Drei Owner-bestätigte Tagespläne EINER Version (Kern &amp; Feinschliff / Verorten &amp; Aufziehen / Abnahme &amp; Release) — Basis v0.8.6 «Verlässlich». 19.07.2026. ROADMAP 497-505, docs/V087-SPEZ.md.</p>
      <p>Neu gegenüber v0.8.6, sieben Stücke:</p>
      <ul>
        <li>Verlustfreie Treppen-Griffe (a/b, bei L-Form zusätzlich die Ecke) — In-place, EIN Undo.</li>
        <li>Projektions-Util als eine Wahrheit im Kernel, plus das theme-invariante --k-graph-Token.</li>
        <li>3D-Auswahl-Highlight deutlich sichtbar (Pixel-Readback ≈7.5× stärker als bisher).</li>
        <li>KAMERA-HUD folgt echten camera-controls-Events, kein 400-ms-Nachhinken mehr.</li>
        <li>3D-Marquee per Shift-Drag — Frustum-Auswahl im Viewport, bewusst ohne Occlusion.</li>
        <li>ÖREB light: Betroffenheitsliste nach der Standortsuche, mit Pflicht-Hinweis.</li>
        <li>Zeichner-Eval prüft jetzt das echte lauf_planen-Vorschlagsformat.</li>
      </ul>
    </div>
    ${seiten}
    <div class="rest">
      <h2>Ehrlich offen — bewusste Grenzen dieser Version</h2>
      <ul>
        <li><b>3D-Marquee ohne Occlusion:</b> das Frustum sieht durch Wände — ein bewusstes Nicht-Ziel, kein späterer Fund. Steht wörtlich in Spec- und Code-Kommentar.</li>
        <li><b>ÖREB-Extract-Pfad Fixture-Vertrag, nicht live verifiziert:</b> die kantonal föderierten ÖREB-Webservices wurden nicht gegen den echten Endpunkt geprüft — die Antwortform stammt aus der öffentlich dokumentierten Transferstruktur.</li>
        <li><b>Kein rechtsgültiger ÖREB-Auszug:</b> nur eine Themen-Betroffenheitsliste («Auszug light») — der Pflicht-Hinweis steht dauerhaft im UI.</li>
        <li><b>Treppen-Griffe nur im 2D-Plan:</b> die 3D-Ansicht zeigt keine Treppen-Griffe (bewusstes Nicht-Ziel dieser Version).</li>
        <li><b>stopImmediatePropagation-Fragilität:</b> der unabhängige DesignWorkspace-Escape-Listener wird im Marquee-Abbruch blockiert — hängt an der React-Effektreihenfolge Kind-vor-Eltern, ein architektonisch fragiler Punkt, Kandidat für einen expliziten Zustands-Kanal.</li>
        <li><b>act()-Warnung im pc1-Test:</b> test/pc1-standort-persistenz.test.tsx warnt jetzt mit einem harmlosen act()-Hinweis (ungemockter nachgelagerter ÖREB-Abruf) — Politur-Kandidat, kein funktionaler Fehler.</li>
      </ul>
      <p class="gate"><b>Gate:</b> Typecheck 0, Kernel 1084, App 127/1686, kosmo-ai 310, svg-qa 36/0 (byte-still), Matrix-Abnahme 13 adversariale Prüfer (11 bestanden, 2 echte Funde — beide noch am selben Tag gefixt und regressionsgetestet, ROADMAP 505).</p>
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
