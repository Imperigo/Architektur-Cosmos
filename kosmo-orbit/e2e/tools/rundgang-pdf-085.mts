/**
 * Rundgang-PDF «0.8.5 — Greifbar» — visueller Rundgang durch die sechs neuen
 * Owner-sichtbaren Stücke gegenüber v0.8.4 (ROADMAP 475-484, vor dem Marker
 * «Phase 3 abgeschlossen»; docs/V085-SPEZ.md). Muster «rundgang-pdf-084.mts»
 * WÖRTLICH übernommen (Screenshots der laufenden App -> A4-PDF, EIN
 * Build/Preview, dieselbe pngGroesse/bildMasse-Skalierungslogik gegen
 * aufgeblasene Element-Screenshots, derselbe Zahnrad-Klick-Fix
 * aria-label="Einstellungen" vor verbindung-select falls je gebraucht). Die
 * Klick-Choreografie je Szene ist wörtlich aus den jeweiligen Paket-Specs
 * übernommen (e2e/multi-auswahl.spec.ts, e2e/griffe.spec.ts,
 * e2e/autopilot-kern.spec.ts, e2e/publish-toggles.spec.ts,
 * e2e/masskette-kommentar.spec.ts, e2e/vis-island.spec.ts,
 * e2e/publish-island.spec.ts, e2e/prepare-island.spec.ts) — keine neu
 * erfundenen Selektoren.
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
 *     npx tsx e2e/tools/rundgang-pdf-085.mts
 *
 * 9 Bild-Szenen (die sechs v0.8.5-Neuerungen, zwei davon mit zwei
 * Screenshots — Publish-Sichtbarkeit «Popup + Blatt» und die drei
 * Icon-Inseln vis/publish/prepare) + eigene Einstiegs-/Übersichtsseite +
 * eigene Abschluss-Seite mit den ehrlichen Grenzen.
 */
import { chromium, type Page, type BrowserContext } from 'playwright-core';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const PORT = process.env['KOSMO_E2E_PORT'] ?? '5183';
const BASE = `http://localhost:${PORT}`;
const OUT = `${ROOT}abgabe/RUNDGANG-NOTIZEN-0.8.5.pdf`;
const SHOTDIR = `${ROOT}e2e-results`;
mkdirSync(`${ROOT}abgabe/`, { recursive: true });
mkdirSync(SHOTDIR, { recursive: true });
const exe = process.env['PLAYWRIGHT_CHROMIUM_PATH'] || undefined;

/** Erststart-Marker (Onboarding/StarterGuide übersprungen) + Bridge-URL —
 *  Muster rundgang-pdf-084.mts's basisLocalStorage(). Kein «kosmo.ui.v1»-
 *  Eintrag hier — der echte Produktions-Default 'island' für design/vis/
 *  publish/prepare soll unverfälscht zu sehen sein (Island-Default-Auftrag
 *  «Kontext OHNE Seed öffnen»). */
function basisLocalStorage(): Record<string, string> {
  return {
    'kosmo.onboarded': '1',
    'kosmo.starterGuide.done': '1',
    'kosmo.bridge': 'http://localhost:8600',
  };
}

/** Liest Breite/Höhe direkt aus dem PNG-IHDR-Chunk — Muster
 *  rundgang-pdf-084.mts. */
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
  }
}

async function main() {
  const browser = await chromium.launch({ executablePath: exe });
  const shots: Record<string, Schuss> = {};

  /** Island-Default-Kontext (kein «kosmo.ui.v1»-Seed) — Muster
   *  rundgang-pdf-084.mts's neueSeite(). */
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
   *  addInitScript VOR dem ersten Skript der Seite gesetzt (kein
   *  Reload-Umweg nötig — die App liest den Seed schon beim Erststart). */
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
    const p = join(SHOTDIR, `rundgang085-${key}.png`);
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

  /** Hover statt Klick — Muster rundgang-pdf-084.mts's oeffneInsel(). */
  async function oeffneInsel(page: Page, island: string): Promise<void> {
    await page.hover(`[data-testid="island-${island}-root"]`);
    await page.locator(`[data-testid="island-${island}-leiste"]`).waitFor({ state: 'visible' });
  }

  /** Welt-mm -> Bildschirm-px über getScreenCTM() — Muster
   *  multi-auswahl.spec.ts/griffe.spec.ts's weltZuBildschirm(). */
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
   *  multi-auswahl.spec.ts's zeichneWand(). */
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

  /** Marquee-Zug mit echtem Ereignisstrom (steps) — Muster
   *  multi-auswahl.spec.ts's marqueeZug(). */
  async function marqueeZug(page: Page, von: { x: number; y: number }, nach: { x: number; y: number }): Promise<void> {
    const a = await weltZuBildschirm(page, von.x, von.y);
    const b = await weltZuBildschirm(page, nach.x, nach.y);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 3 });
    await page.mouse.move(b.x, b.y, { steps: 3 });
    await page.locator('[data-testid="plan-marquee"]').waitFor({ state: 'visible' });
    await page.mouse.up();
  }

  // (1) Mehrfach-Auswahl + Rubber-Band (PA1, E1/E2, Matrix C-1…C-7) — drei
  // Wände zeichnen, Rubber-Band über alle drei ziehen, Highlights +
  // Inspector «N Elemente» im selben Bild (Dock nur im Modus manuell
  // sichtbar, darum der addInitScript-Seed).
  {
    const { ctx, page } = await neueSeiteManuell();
    await page.click('[data-testid="module-design"]');
    await page.click('[data-testid="view-2d"]');
    await page.locator('[data-testid="planview"]').waitFor({ state: 'visible' });

    await zeichneWand(page, { x: 4000, y: 2000 }, { x: 6000, y: 2000 });
    await zeichneWand(page, { x: 4000, y: 4500 }, { x: 6000, y: 4500 });
    await zeichneWand(page, { x: 4000, y: 7000 }, { x: 6000, y: 7000 });

    await marqueeZug(page, { x: 3000, y: 1000 }, { x: 7000, y: 8000 });
    await page.locator('[data-testid="auswahl-highlight"]').first().waitFor({ state: 'visible' });
    await page.locator('[data-testid="inspector-mehrfach-anzahl"]').waitFor({ state: 'visible' });
    const anzahl = await page.evaluate(() => window.__kosmo.state().selection.length);
    console.log(`  … Marquee-Auswahl: ${anzahl} Elemente`);
    await schuss('multi-auswahl-marquee', page);
    await ctx.close();
  }

  // (2) Griffe an Wand-Endpunkten (PB1, E3, Matrix C-15/C-17) — Wand
  // zeichnen, per Test-Hook einzeln wählen (Quadrat-Griffe sichtbar), den
  // b-Griff mitten im Zug fotografieren (Gummiband + Griff gleichzeitig
  // sichtbar, VOR mouse.up()).
  {
    const { ctx, page } = await neueSeiteManuell();
    await page.click('[data-testid="module-design"]');
    await page.click('[data-testid="view-2d"]');
    await page.locator('[data-testid="planview"]').waitFor({ state: 'visible' });

    const w1 = await zeichneWand(page, { x: 4000, y: 2000 }, { x: 6000, y: 2000 });
    await page.evaluate((id) => window.__kosmo.state().select([id]), w1);
    await page.locator('[data-testid="griff-endpunkt-b"]').waitFor({ state: 'visible' });

    const box = await page.locator('[data-testid="griff-endpunkt-b"]').boundingBox();
    if (!box) throw new Error('griff-endpunkt-b nicht sichtbar');
    const von = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const nach = await weltZuBildschirm(page, 6000, 4000);
    await page.mouse.move(von.x, von.y);
    await page.mouse.down();
    await page.mouse.move((von.x + nach.x) / 2, (von.y + nach.y) / 2, { steps: 3 });
    await page.mouse.move(nach.x, nach.y, { steps: 5 });
    await page.locator('[data-testid="griff-gummiband"]').waitFor({ state: 'visible' });
    await schuss('griffe-wand-endpunkt', page);
    await page.mouse.up();
    await ctx.close();
  }

  // (3) Kosmo-Autopilot — LaufPlan über window.__kosmoLauf.starte() (Muster
  // e2e/autopilot-kern.spec.ts), FERTIG-Schrittliste im KosmoPanel. Fokus-
  // Kontext (kein Design-Modul geöffnet) wie im Spec — reine App.tsx-Ebene.
  {
    const page = await neueSeite();
    await page.evaluate(() => {
      localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.dblclick('[data-testid="kosmo-symbol"]');
    await page.locator('[data-testid="kosmo-panel"]').waitFor({ state: 'visible' });

    const plan = {
      titel: 'Geschosse für den Rohbau',
      schritte: Array.from({ length: 3 }, (_, i) => ({
        commandId: 'design.geschossErstellen',
        params: { name: `Geschoss ${i}`, index: i, elevation: i * 3000 },
        begruendung: `Legt Geschoss ${i} für den Rohbau an`,
      })),
    };
    await page.evaluate((p) => window.__kosmoLauf.starte(p), plan);
    await page.locator('[data-testid="lauf-plan-root"]').waitFor({ state: 'visible' });
    await page.waitForFunction(() => window.__kosmoLauf.zustand().status === 'fertig', undefined, { timeout: 10000 });
    // Viewport-Screenshot statt fullPage (fixiertes Panel, Lehre v0.8.5-PB2).
    await schuss('autopilot-laufplan-fertig', page, '[data-testid="kosmo-panel"]');
    await page.close();
  }

  // (4a/4b) Publish: DARSTELLUNG-Insel, Werkzeug «Sichtbarkeit» — zwei
  // KSwitches Bemassung/Zonen (PB3, E5, Matrix C-19). Blatt vorher mit
  // Bemassungs-Ketten + Parzellen-Zone geseedet (Muster
  // e2e/publish-toggles.spec.ts's seedGrundrissMitBemassungUndZone) —
  // Popup UND Blatt je ein eigener Screenshot.
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
      const sheet = window.__kosmo.run('publish.blattErstellen', { name: 'Rundgang-Blatt', format: 'A1', orientation: 'quer' });
      const sheetId = sheet.patches[0]!.id;
      window.__kosmo.run('publish.ansichtPlatzieren', { sheetId, view: 'grundriss', storeyId, scale: 100, x: 400, y: 250 });
    });
    await page.locator('[data-testid="sheet-canvas"]').waitFor({ state: 'visible' });

    await oeffneInsel(page, 'darstellung');
    await page.click('[data-testid="island-werkzeug-sichtbarkeit"]');
    await page.locator('[data-testid="island-sichtbarkeit-stufe2"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="island-sichtbarkeit-bemassung"]').waitFor({ state: 'visible' });
    await schuss('publish-sichtbarkeit-popup', page);

    // Popup schliessen über den eigenen isl-schliessen-Knopf (IslandShell.tsx,
    // schliessePopupOderFenster) — Blatt mit Masskette + Zonenkontur sichtbar
    // fotografieren.
    await page.click('[data-testid="island-sichtbarkeit-popup-schliessen"]');
    await page.locator('[data-testid="island-sichtbarkeit-stufe2"]').waitFor({ state: 'hidden' });
    await schuss('publish-sichtbarkeit-blatt', page, '[data-testid="publish-island-buehne"]');
    await page.close();
  }

  // (5) Kommentar-Erfassen im Manuell-Modus (PB3/D11-Fable-Nachzug, Matrix
  // C-20) — Kurztaste k TIPPEN (kein Insel-Klick), Klick in den Plan setzt
  // NUR den Punkt, das Glas-Formular verankert sich dort (KommentarErfassen-
  // AmPunkt, PlanView.tsx).
  {
    const { ctx, page } = await neueSeiteManuell();
    await page.click('[data-testid="module-design"]');
    await page.click('[data-testid="view-2d"]');
    await page.locator('[data-testid="planview"]').waitFor({ state: 'visible' });

    await page.keyboard.press('k');
    const punkt = await weltZuBildschirm(page, 2000, 2000);
    await page.mouse.click(punkt.x, punkt.y);
    await page.locator('[data-testid="manuell-kommentar-erfassen-anker"]').waitFor({ state: 'visible' });
    await schuss('kommentar-erfassen-manuell', page);
    await ctx.close();
  }

  // (6a-6c) Echte Werkzeug-Icons in vis/publish/prepare (PA4, E6, Matrix
  // C-13/C-14) — Island-Default OHNE Seed (Kontext wie neueSeite()), drei
  // Stationen, dieselbe oeffneInsel()-Choreografie wie rundgang-pdf-084.mts.
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-vis"]');
    await oeffneInsel(page, 'graph');
    await schuss('icons-vis-graph', page, '[data-testid="island-graph-leiste"]');
    await page.close();
  }
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-publish"]');
    await oeffneInsel(page, 'darstellung');
    await schuss('icons-publish-darstellung', page, '[data-testid="island-darstellung-leiste"]');
    await page.close();
  }
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-prepare"]');
    await page.locator('[data-testid="prepare-island-fuellen"]').waitFor({ state: 'visible' });
    await oeffneInsel(page, 'aufnahme');
    await schuss('icons-prepare-aufnahme', page, '[data-testid="island-aufnahme-leiste"]');
    await page.close();
  }

  await browser.close();

  // Einpassen statt Aufblasen — Muster rundgang-pdf-084.mts.
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
      key: 'multi-auswahl-marquee',
      titel: '§1/PA1 · Mehrfach-Auswahl + Rubber-Band im Plan',
      notiz: 'Drei per window.__kosmo.run(’design.wandZeichnen’, …) gezeichnete Wände, per Rubber-Band-Aufziehrechteck in einem Zug gewählt (Voll-Umschluss-Regel, Shift additiv, Esc leert). Die Auswahl war im Store schon vorher string[] (Befund D1) — dieses Paket ist Verdrahtung, kein Kernel-Umbau: Shift-Klick toggelt einzeln, das Rubber-Band setzt die Menge, jedes gewählte Element trägt sein eigenes Highlight (Kern+Glow), der Dock-Inspector zeigt «N Elemente» + Alle löschen. Delete löscht N als EINE Undo-Gruppe, Drag verschiebt die ganze Gruppe als ein Vektor.',
    },
    {
      key: 'griffe-wand-endpunkt',
      titel: '§2/PB1 · Griffe an Wand-Endpunkten (Quadrat-Griff + Gummiband)',
      notiz: 'Einzel-Auswahl einer Wand zeigt schmale, screen-konstante Quadrat-Griffe an beiden Endpunkten (a/b) — bei Mehrfach-Auswahl verschwinden sie wieder (C-15). Der Screenshot ist bewusst MITTEN im Zug aufgenommen: der gezogene Griff folgt der Maus, das Gummiband (gestrichelte Vorschau-Achse) zeigt die neue Wandlage, bevor irgendetwas committet wird. Erst mouse.up() schreibt — als Löschen+Neusetzen-Gruppe (wie bei der Masskette in v0.8.4 PB5), EIN Ctrl+Z stellt Wand a UND b wieder her. Griff-Hit-Test läuft mit Vorrang vor dem Element-Hit-Test (C-17) — dasselbe Muster gilt für Zonen-/Volumen-/Dach-Eckgriffe.',
    },
    {
      key: 'autopilot-laufplan-fertig',
      titel: '§3/PA3 · Kosmo-Autopilot — LaufPlan-Schrittliste im KosmoPanel',
      notiz: 'Ein LaufPlan («Geschosse für den Rohbau», drei design.geschossErstellen-Schritte mit je eigener Begründung) über window.__kosmoLauf.starte() gestartet — GENAU die Naht, über die auch ein künftiger Kosmo-Dialog einen Lauf anstossen würde (noch kein UI-Knopf, C-10-Beweis: ohne diesen expliziten Aufruf existiert nie ein Lauf, auch nicht nach blossem Panel-Öffnen). Jeder Schritt läuft über den echten runCommand-Weg (Diff-Karten-Semantik bleibt), bekommt eine eigene Undo-Gruppe und einen eigenen Status offen/läuft/ok/fehler; ein Fehler-Schritt stoppt den Lauf ehrlich statt weiterzulaufen. Alle drei Schritte stehen hier grün auf «fertig».',
    },
    {
      key: 'publish-sichtbarkeit-popup',
      titel: '§4a/PB3 · Publish — DARSTELLUNG-Insel, Werkzeug «Sichtbarkeit»',
      notiz: 'Neues Werkzeug in der DARSTELLUNG-Insel mit zwei KSwitches «Bemassung»/«Zonen», Default beide AN (Bestandsschutz für bestehende Blatt-Screenshots). Rein laufzeitseitig (publish-runtime.ts-Store) — derive/plansvg.ts bleibt byte-unangetastet, die Toggles schalten nur eine CSS-Modifier-Klasse, die per Attribut-Selektor die längst vorhandenen SVG-Fragmente (Masskette-Gruppen bzw. Parzellen-/Nachbar-Zonenflächen) ausblendet. Goldens bleiben 36/36 byte-still.',
    },
    {
      key: 'publish-sichtbarkeit-blatt',
      titel: '§4b/PB3 · Publish — dasselbe Blatt mit Bemassung + Zonenkontext (Default AN)',
      notiz: 'Dasselbe Blatt nach Schliessen des Popups: eine platzierte Grundriss-Ansicht mit zwei Wänden zeigt ihre assoziative Bemassungskette, dazu die gestrichelte Parzellenkontur aus der geseedeten Zone (zonenArt:’parzelle’) — beide Toggles im Default-Zustand AN. Ehrlich dokumentiert (Abschluss-Seite): der Zonen-Toggle wirkt nur auf diesen Parzellen-/Nachbar-Kontext, nicht auf einzelne Raumtyp-Füllungen.',
    },
    {
      key: 'kommentar-erfassen-manuell',
      titel: '§5/D11-Nachzug · Kommentar-Erfassen im Manuell-Modus — Kurztaste K',
      notiz: 'Bisher (v0.8.4) setzte das Kommentar-Werkzeug im Manuell-Modus beim Klick nur einen unsichtbaren Welt-Punkt (kommentarPunkt) — nie erschien ein Formular ohne die PROJEKT-Insel. Jetzt: Kurztaste K getippt, Klick in den Plan verankert ein schwebendes Glas-Formular (KommentarErfassenAmPunkt) GENAU an diesem Bildschirmpunkt (dieselbe toScreen-Umrechnung wie SketchOverlay) — Text + Autor sind Pflichtfelder, «Kommentar setzen» committet erst dann design.kommentarSetzen. Escape/ein neuer Klick mit demselben Werkzeug bleibt der Abbruchweg.',
    },
    {
      key: 'icons-vis-graph',
      titel: '§6a/PA4 · Echte Werkzeug-Icons — KosmoVis, GRAPH-Insel',
      notiz: 'Die werkzeug()-Signatur von vis/publish/prepare ist von glyphe: string auf glyphe: string | ComponentType gehoben — dieselbe design-Konvention wie die ZEICHNEN-Insel seit v0.8.4 PB2/PE2. Die GRAPH-Insel zeigt jetzt gezeichnete SVG-Symbole (1.75/24-Strich, EIN Akzentpunkt, currentColor) statt der bisherigen Zwei-Buchstaben-Kürzel — Island-Default ohne jeden Seed geöffnet.',
    },
    {
      key: 'icons-publish-darstellung',
      titel: '§6b/PA4 · Echte Werkzeug-Icons — KosmoPublish, DARSTELLUNG-Insel',
      notiz: 'Dieselbe Icon-Umstellung in der DARSTELLUNG-Insel (Zoom/Fit + das neue Sichtbarkeits-Werkzeug aus §4) — nach Bauvorschrift regeneriert und im Kontaktbogen doppelt gesichtet (Agent + Fable), 66 Icons hell+dunkel.',
    },
    {
      key: 'icons-prepare-aufnahme',
      titel: '§6c/PA4 · Echte Werkzeug-Icons — KosmoPrepare, AUFNAHME-Insel',
      notiz: 'Letzte Buchstaben-Schuld der Inseln getilgt: auch die AUFNAHME-Insel (Dateien/OneDrive-Ingest) trägt jetzt echte Glyphen statt Kürzel — «manuell» bleibt bewusst stationsübergreifend dieselbe Schalter-Pille (gleiche Handlung, gleiches Symbol, keine drei verschiedenen Icons für denselben Umschalter).',
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
      <h1>KosmoOrbit v0.8.5 «Greifbar» — Rundgang</h1>
      <p>Vier Owner-bestätigte Ströme (ArchiCAD-Tiefe II, Kosmo-Autopilot, Publish/Print-Runde, Politur &amp; Schulden) — Basis v0.8.4 «Ein Guss». 19.07.2026. ROADMAP 475-484, docs/V085-SPEZ.md.</p>
      <p>Neu gegenüber v0.8.4, sechs Stücke:</p>
      <ul>
        <li>Mehrfach-Auswahl (Shift-Klick) + Rubber-Band-Aufziehrechteck im Plan, Inspector «N Elemente».</li>
        <li>Griffe an Wand-/Masskette-Endpunkten und Zonen-/Volumen-/Dach-Ecken, Gummiband beim Ziehen.</li>
        <li>Kosmo-Autopilot: LaufPlan + Runner fährt geplante Kernel-Command-Folgen, Schrittliste im KosmoPanel.</li>
        <li>Publish: Bemassungs-/Zonen-Sichtbarkeits-Toggles auf dem Blatt, golden-still.</li>
        <li>Kommentar-Erfassen im Manuell-Modus — Kurztaste K, Glas-Formular direkt am Punkt.</li>
        <li>Echte Werkzeug-Icons statt Kürzel in den vis/publish/prepare-Inseln.</li>
      </ul>
    </div>
    ${seiten}
    <div class="rest">
      <h2>Ehrlich offen — bewusste Grenzen dieser Version</h2>
      <ul>
        <li><b>Publish-Zonen-Toggle:</b> wirkt auf den Parzellen-/Nachbar-Kontext (zonenArt), NICHT auf einzelne Raumtyp-Füllungen — die sind ohne Kernel-Eingriff nicht separat adressierbar (E5).</li>
        <li><b>Wand-Endpunkt-Drag verliert Öffnungen:</b> das Löschen+Neusetzen-Muster (wie bei der Masskette) übernimmt Aufbau/Assembly, aber keine auf der Wand gesetzten Öffnungen — ein bewusster v0.8.6-Kandidat, kein stiller Fehler (E3).</li>
        <li><b>RAUMGRAPH_FARBE bleibt Konstante:</b> bewusst NICHT auf ein aura-Token gehoben (PB6-Urteil «akzentabhängige Falle») — die drei anderen PlanView-Konstanten (Beton-Schraffur, Unternehmerplan-Overlay, Zonenwarnung) laufen seit diesem Paket über Token (E7).</li>
        <li><b>Kein allgemeines Gizmo-Framework:</b> die Griffe bleiben bewusst schmal (Endpunkt/Eckpunkt), kein wiederverwendbares Handle-System (Sanktion 2/D4).</li>
        <li><b>Autopilot ohne Auto-Start und ohne Dialog-Einstieg:</b> ein Lauf entsteht nur aus einer expliziten Aktion (hier: dem Test-Hook window.__kosmoLauf) — der Kosmo-Chat-Knopf dafür ist ein v0.8.6-Kandidat (E4).</li>
      </ul>
      <p class="gate"><b>Gate:</b> Typecheck 0, App-Suite 125 Dateien / 1671 Tests, kosmo-ai 290, kernel 1010 (byte-unangetastet, Sanktion 1), ui 106, svg-qa 36/0 (byte-still), Stations-E2E-Batches (multi-auswahl 6/6, griffe 9/9, autopilot-kern 5/5, publish-toggles 6/6) grün auf :5183, 21 adversariale Prüfer (ROADMAP 484: 20 bestanden, 1 echte Lücke C-16 noch am selben Tag gefixt und regressionsgetestet).</p>
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
