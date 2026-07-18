/**
 * Rundgang-PDF «0.8.4 — Ein Guss» — visueller Rundgang durch die grösste
 * Parallel-Version bisher (ROADMAP 449-473, docs/V084-SPEZ.md, sechs Wellen
 * von zehn Sonnet-Bauagenten, 30 adversariale Matrix-Prüfer). Muster
 * «rundgang-pdf-083.mts» (Screenshots der laufenden App -> A4-PDF, EIN
 * Build/Preview, dieselbe pngGroesse/bildMasse-Skalierungslogik gegen
 * aufgeblasene Element-Screenshots). Die Klick-Choreografie je Szene ist
 * wörtlich aus den jeweiligen Paket-Specs übernommen (e2e/pb4-orb-gesetz.
 * spec.ts, e2e/pb5-zeichnen-tiefe.spec.ts, e2e/pe3-matrix-fixes.spec.ts,
 * e2e/vis-island.spec.ts, e2e/publish-island.spec.ts, e2e/prepare-island.
 * spec.ts, e2e/kosmodata-bilder.spec.ts, e2e/orbit-start.spec.ts,
 * e2e/einstellungen.spec.ts) — keine neu erfundenen Selektoren.
 *
 * Lehre aus v0.8.3 (wissen/training/claude/lehren/v0.8.3.md): innerhalb des
 * grossen HTML-Template-Literals (die «html»-Variable unten) wird NIE ein
 * echtes Backtick-Zeichen verwendet — Zitate/Code-Nennungen im sichtbaren
 * Text laufen über «Guillemets», sonst bricht tsx beim Parsen des
 * Template-Literals.
 *
 * Voraussetzung: Build ist NACH dem Versions-Bump neu zu bauen und der
 * Preview-Server NEU zu starten. Für diesen Lauf: App bereits auf :5183,
 * Bridge :8600, Sync :8700.
 *
 * Aufruf (aus kosmo-orbit/, Preview auf $PORT, Standard 5183):
 *   KOSMO_E2E_PORT=5183 PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium \
 *     npx tsx e2e/tools/rundgang-pdf-084.mts
 *
 * 18 Bild-Szenen + 1 reine Text-Seite (Cursor-Zonen-Matrix, s. Begründung
 * dort): Hauptmenü (Kachel-Reihe statisch + Fächer ohne Überlappung),
 * Cursor-Zonen-Matrix (Text, kein Screenshot — Grund s. u.), Island-UI in
 * allen vier Stationen (design/vis/publish/prepare), Orb-Gesetz (Hover-
 * Popup/Karte/Panel), Zeichnen-Tiefe (Masskette+Inspector-Float,
 * Kommentar-Filter, ?-Overlay), Vis (dunkler Node-Canvas, Stimmungs-
 * Bildkacheln), Publish-Blattzoom, KosmoData-Dossier-Bild, Einstellungen
 * (Maximiert-Schalter), KosmoPanel (Claude-Login-Block, ehrlich im Browser).
 */
import { chromium, type Page } from 'playwright-core';
import { writeFileSync, mkdirSync, readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const ROOT = new URL('../../', import.meta.url).pathname;
const PORT = process.env['KOSMO_E2E_PORT'] ?? '5183';
const BASE = `http://localhost:${PORT}`;
const OUT = `${ROOT}abgabe/RUNDGANG-NOTIZEN-0.8.4.pdf`;
const SHOTDIR = `${ROOT}e2e-results`;
mkdirSync(`${ROOT}abgabe/`, { recursive: true });
mkdirSync(SHOTDIR, { recursive: true });
const exe = process.env['PLAYWRIGHT_CHROMIUM_PATH'] || undefined;

/** Erststart-Marker (Onboarding/StarterGuide übersprungen) + Bridge-URL
 *  (von den prepare-/vis-Island-Specs verlangt, damit die AUFNAHME-/
 *  AUSTAUSCH-Werkzeuge nicht auf einen fehlenden Endpunkt laufen). Kein
 *  «kosmo.ui.v1»-Eintrag hier — der echte Produktions-Default 'island' für
 *  design/vis/publish/prepare soll unverfälscht zu sehen sein (Owner-
 *  Antwort 1.2.1 «ALLE Stationen komplett»). */
function basisLocalStorage(): Record<string, string> {
  return {
    'kosmo.onboarded': '1',
    'kosmo.starterGuide.done': '1',
    'kosmo.bridge': 'http://localhost:8600',
  };
}

/** Erzwingt «manuell» für alle vier Stationen — nur für die zwei Szenen
 *  gebraucht, deren Chrome laut Bericht bewusst NICHT im Island-Modus
 *  verdrahtet ist (Kommentar-Filter-Toggle, PB5-Bericht: «Nur im Modus
 *  manuell … im Island-Modus liegt dieser Chrome-Bereich ausserhalb des
 *  PB5-Dateikreises»). Wörtlich derselbe kosmo.ui.v1-Datensatz wie
 *  e2e/helfer/manuell-seed.ts's kosmoUiV1SeedMitManuell(), hier lokal
 *  nachgebildet statt importiert (eigenständiges tsx-Werkzeug, Muster
 *  rundgang-pdf-083.mts). */
function manuellUiV1(): string {
  return JSON.stringify({
    version: 1,
    modusAutomatik: false,
    modusFesthalten: false,
    phasenFokus: null,
    designOberflaeche: 'manuell',
    visOberflaeche: 'manuell',
    publishOberflaeche: 'manuell',
    prepareOberflaeche: 'manuell',
  });
}

/** Liest Breite/Höhe direkt aus dem PNG-IHDR-Chunk — Muster
 *  rundgang-pdf-083.mts. */
function pngGroesse(buf: Buffer): { w: number; h: number } {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

interface Schuss {
  b64: string;
  w: number;
  h: number;
}

/* --- Runtime-PNG für den KosmoData-Bild-Upload (Repo-Konvention seit PD1,
 * tools/secret-scan.mjs schlägt auf lange Base64-/Hex-Literale an — Test-
 * bilder gehören generiert, nicht eingecheckt). Wörtlich die bauePng-Familie
 * aus e2e/kosmodata-bilder.spec.ts, hier auf den Erfolgsfall reduziert. */
function crc32(daten: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of daten) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(typ: string, daten: Buffer): Buffer {
  const laenge = Buffer.alloc(4);
  laenge.writeUInt32BE(daten.length, 0);
  const inhalt = Buffer.concat([Buffer.from(typ, 'ascii'), daten]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(inhalt), 0);
  return Buffer.concat([laenge, inhalt, crc]);
}
function bauePng(breite: number, hoehe: number, farbe: (x: number, y: number) => [number, number, number]): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(breite, 0);
  ihdr.writeUInt32BE(hoehe, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const zeilen: Buffer[] = [];
  for (let y = 0; y < hoehe; y++) {
    const zeile = Buffer.alloc(1 + breite * 3);
    for (let x = 0; x < breite; x++) {
      const [r, g, b] = farbe(x, y);
      zeile[1 + x * 3] = r;
      zeile[2 + x * 3] = g;
      zeile[3 + x * 3] = b;
    }
    zeilen.push(zeile);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(Buffer.concat(zeilen))),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}
const PNG_GRADIENT = bauePng(48, 34, (x, y) => [
  Math.min(255, 168 + x + y),
  Math.max(0, 96 + Math.round(x / 2) - y),
  Math.max(0, 72 - Math.round(y / 2)),
]);

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[]; summary?: string };
      state: () => {
        activeStoreyId: string | null;
        doc: { byKind: (k: string) => { id: string; name?: string; assemblyId?: string }[] };
      };
    };
  }
}

async function main() {
  const browser = await chromium.launch({ executablePath: exe });
  const shots: Record<string, Schuss> = {};

  async function neueSeite(
    opts: { viewport?: { width: number; height: number }; localStorage?: Record<string, string> } = {},
  ): Promise<Page> {
    const viewport = opts.viewport ?? { width: 1600, height: 1000 };
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.setDefaultTimeout(20000);
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    const alleEintraege = { ...basisLocalStorage(), ...(opts.localStorage ?? {}) };
    await page.evaluate((eintraege) => {
      for (const [k, v] of Object.entries(eintraege)) localStorage.setItem(k, v);
    }, alleEintraege);
    await page.reload({ waitUntil: 'domcontentloaded' });
    return page;
  }

  async function schuss(key: string, page: Page, sel?: string): Promise<void> {
    await page.waitForTimeout(400);
    const p = join(SHOTDIR, `rundgang084-${key}.png`);
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

  /** Hover statt Klick — dasselbe Muster wie island-ui.spec.ts /
   *  vis-island.spec.ts / publish-island.spec.ts / prepare-island.spec.ts:
   *  «-root» existiert in JEDER Stufe (pill/popup/leiste), «-pill» nur in
   *  der Pill-Stufe. */
  async function oeffneInsel(page: Page, island: string): Promise<void> {
    await page.hover(`[data-testid="island-${island}-root"]`);
    await page.locator(`[data-testid="island-${island}-leiste"]`).waitFor({ state: 'visible' });
  }

  // (1) Hauptmenü statisch/zentriert — Kachel-Reihe unten (PA2, C-2, §4-
  // Verträge). Kein app-header/Rotation mehr (D2), Wortmarke+Version an
  // neuer Stelle.
  {
    const page = await neueSeite();
    await page.locator('[data-testid="orbit-start"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="orbit-wortmarke"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="zentrale-kacheln"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="orbit-version"]').waitFor({ state: 'visible' });
    await schuss('home-hauptmenu', page);
    await page.close();
  }

  // (2) Hover-Fächer ohne Überlappung (C-3, §4.4-Vertrag) — design-Kachel
  // zeigt ihre Untertool-Karten (prepare/vis/publish), Owner-Punkt «Hover-
  // Untertools sauber geordnet, nichts überschneidend».
  {
    const page = await neueSeite();
    await page.locator('[data-testid="orbit-start"]').waitFor({ state: 'visible' });
    await page.hover('[data-testid="orbit-haupt-design"]');
    await page.locator('[data-testid="orbit-faecher-design"]').waitFor({ state: 'visible' });
    await schuss('home-faecher', page);
    await page.close();
  }

  // (3-6) Island-UI in allen vier Stationen (Owner-Antwort 1.2.1 «ALLE
  // Stationen komplett», C-15/C-19/C-20 + PC0-Generalisierung ROADMAP 450).
  // Design: ZEICHNEN-Insel (11 Werkzeuge, jetzt mit SVG-Symbolen statt
  // Buchstaben, PB2/PE2).
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-design"]');
    await oeffneInsel(page, 'zeichnen');
    await schuss('island-design', page, '[data-testid="island-zeichnen-leiste"]');
    await page.close();
  }
  // Vis: GRAPH-Insel (Node-Palette).
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-vis"]');
    await oeffneInsel(page, 'graph');
    await schuss('island-vis', page, '[data-testid="island-graph-leiste"]');
    await page.close();
  }
  // Publish: DARSTELLUNG-Insel (Zoom/Fit).
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-publish"]');
    await oeffneInsel(page, 'darstellung');
    await schuss('island-publish', page, '[data-testid="island-darstellung-leiste"]');
    await page.close();
  }
  // Prepare: AUFNAHME-Insel (Dateien/OneDrive).
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-prepare"]');
    await page.locator('[data-testid="prepare-island-fuellen"]').waitFor({ state: 'visible' });
    await oeffneInsel(page, 'aufnahme');
    await schuss('island-prepare', page, '[data-testid="island-aufnahme-leiste"]');
    await page.close();
  }

  // (7-9) Orb-Gesetz (E2-Tabelle, C-25, ROADMAP 469/470) — EIN Kosmo-
  // Verhalten überall: Hover -> Mini-Popup, Einfachklick -> Konversations-
  // karte, Doppelklick -> KosmoPanel. Choreografie 1:1 aus
  // e2e/pb4-orb-gesetz.spec.ts's Screenshot-Test, alle drei auf DERSELBEN
  // Seite/demselben Orb (shell/KosmoSymbol, Home-Zentrale).
  {
    const page = await neueSeite();
    await page.locator('[data-testid="orbit-start"]').waitFor({ state: 'visible' });

    await page.hover('[data-testid="kosmo-symbol"]');
    const mini = page.locator('[data-testid="kosmo-mini"]');
    await mini.waitFor({ state: 'visible' });
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="kosmo-mini"]');
      return !!el && getComputedStyle(el).opacity === '1';
    });
    await schuss('orb-hover-popup', page);

    await page.click('[data-testid="kosmo-symbol"]');
    const karte = page.locator('[data-testid="kosmo-karte"]');
    await karte.waitFor({ state: 'visible' });
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="kosmo-karte"]');
      return !!el && getComputedStyle(el).opacity === '1';
    });
    await schuss('orb-konversationskarte', page);

    await page.dblclick('[data-testid="kosmo-symbol"]');
    await page.locator('[data-testid="kosmo-panel"]').waitFor({ state: 'visible' });
    await schuss('orb-panel-doppelklick', page);

    await page.close();
  }

  // (10) Zeichnen-Tiefe: Masskette real im Plan (PB5) + Inspector-Float via
  // Rechtsklick-Eigenschaften (PE3-Fix C-11) — im echten Island-Default,
  // Choreografie 1:1 aus e2e/pe3-matrix-fixes.spec.ts's «C-11 im echten
  // Island-Default»-Test, nur die gezeichnete Entität ist hier eine
  // Masskette statt einer Wand (kontext2d-eigenschaften ist entity-kind-
  // agnostisch — PlanView.tsx: onClick pickt zuerst, öffnet dann für die
  // gepickte entityId, unabhängig vom Kind).
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-design"]');
    await page.locator('[data-testid="island-zeichnen-pill"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="planview"]').waitFor({ state: 'visible' });

    await page.evaluate(() => {
      const k = window.__kosmo;
      const storeyId = k.state().activeStoreyId!;
      k.run('design.massKetteSetzen', {
        storeyId,
        punkte: [
          { x: -2000, y: -1500 },
          { x: 1000, y: 500 },
          { x: 3000, y: -500 },
        ],
      });
    });
    await page.locator('[data-testid="plan-masskette"]').waitFor({ state: 'visible' });

    const punktAufKette = await page.evaluate(() => {
      const svg = document.querySelector('[data-testid="planview"]') as SVGSVGElement;
      const g = svg.querySelector('g') as SVGGElement;
      const pt = svg.createSVGPoint();
      pt.x = -500; // Mittelpunkt des ersten Segments (-2000,-1500)->(1000,500)
      pt.y = -(-500);
      const ctm = g.getScreenCTM()!;
      const t = pt.matrixTransform(ctm);
      return { x: t.x, y: t.y };
    });
    await page.mouse.click(punktAufKette.x, punktAufKette.y, { button: 'right' });
    await page.locator('[data-testid="viewport-kontextmenue"]').waitFor({ state: 'visible' });
    await page.click('[data-testid="kontext2d-eigenschaften"]');
    await page.locator('[data-testid="dw-eigenschaften-float"]').waitFor({ state: 'visible' });
    await schuss('zeichnen-masskette-inspector', page);
    await page.close();
  }

  // (11-12) Kommentar-Filter (PB5, C-26) + ?-Overlay mit O/M/K/N (PB5, §7
  // D13) — beide Chrome-Bausteine sitzen bewusst NUR im Modus «manuell»
  // (PB5-Bericht: der Toggle liegt im PlanView-eigenen Werkzeugleisten-
  // Chrome, das im Island-Modus ausserhalb des PB5-Dateikreises lag) —
  // ehrliche Lücke, hier mit dem manuellUiV1()-Seed nachgestellt statt
  // stillschweigend übersprungen.
  {
    const page = await neueSeite({ localStorage: { 'kosmo.ui.v1': manuellUiV1() } });
    await page.click('[data-testid="module-design"]');
    await page.click('[data-testid="view-2d"]');
    await page.locator('[data-testid="planview"]').waitFor({ state: 'visible' });

    await page.evaluate(() => {
      const k = window.__kosmo;
      const storeyId = k.state().activeStoreyId!;
      k.run('design.kommentarSetzen', {
        text: 'Rundgang-Kommentar (v0.8.4 PB5)',
        autor: 'Rundgang-Werkzeug',
        at: { x: 1000, y: 1000 },
        storeyId,
        erstelltAm: '18.07.2026',
      });
    });
    await page.locator('[data-testid="plan-kommentar"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="kommentar-filter-toggle"]').waitFor({ state: 'visible' });
    await schuss('zeichnen-kommentar-filter', page);

    await page.keyboard.press('?');
    const dialog = page.locator('[data-testid="kurzbefehle"]');
    await dialog.waitFor({ state: 'visible' });
    await schuss('zeichnen-overlay-kuerzel', page, '[data-testid="kurzbefehle"]');
    await page.close();
  }

  // (13) Vis dunkel mit hellen Nodes (C-16, Token statt Hartwert) — Graph
  // anlegen + einen Modell-Node über die GRAPH-Insel-Palette einfügen
  // (Choreografie 1:1 vis-island.spec.ts).
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-vis"]');
    await page.evaluate(() => window.__kosmo.run('vis.graphErstellen', { name: 'Rundgang-084' }));
    await page.locator('[data-testid="node-canvas"]').waitFor({ state: 'visible' });
    await oeffneInsel(page, 'graph');
    await page.click('[data-testid="island-werkzeug-palette"]');
    await page.locator('[data-testid="island-palette-eintrag-modell"]').waitFor({ state: 'visible' });
    await page.click('[data-testid="island-palette-eintrag-modell"]');
    await page.locator('[data-testid="vis-node-modell"]').waitFor({ state: 'visible' });
    await schuss('vis-dark-nodes', page, '[data-testid="node-canvas"]');
    await page.close();
  }

  // (14) Stimmungen als echte Bild-Kacheln statt Text (E5, C-17) — drei
  // prozedurale Canvas-Vorschauen (morgen/abend/weiss).
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-vis"]');
    await oeffneInsel(page, 'stimmung');
    await page.click('[data-testid="island-werkzeug-stimmung"]');
    await page.locator('[data-testid="island-stimmung-stufe2"]').waitFor({ state: 'visible' });
    for (const preset of ['morgen', 'abend', 'weiss']) {
      await page.locator(`[data-testid="island-stimmung-${preset}"] canvas`).waitFor({ state: 'visible' });
    }
    await schuss('vis-stimmung-kacheln', page, '[data-testid="island-stimmung-stufe2"]');
    await page.close();
  }

  // (15) Publish-Blattzoom (C-19, D10) — Blatt per Test-Hook anlegen, DAR-
  // STELLUNG-Insel öffnen, Zoom-Popup, mehrfach «+» klicken.
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-publish"]');
    await page.evaluate(() =>
      window.__kosmo.run('publish.blattErstellen', { name: 'Rundgang-Blatt', format: 'A1', orientation: 'quer' }),
    );
    await page.locator('[data-testid="publish-island-buehne"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="sheet-canvas"]').waitFor({ state: 'visible' });
    await oeffneInsel(page, 'darstellung');
    await page.click('[data-testid="island-werkzeug-zoom"]');
    await page.locator('[data-testid="island-zoom-stufe2"]').waitFor({ state: 'visible' });
    for (let i = 0; i < 4; i++) await page.click('[data-testid="island-zoom-plus"]');
    await schuss('publish-blattzoom', page, '[data-testid="publish-island-buehne"]');
    await page.close();
  }

  // (16) KosmoData-Bild — Dossier-Hero (C-21, PC5) — eigene Referenz
  // importieren, Dossier öffnen, echtes PNG hochladen (zur Laufzeit gebaut,
  // kein Base64-Literal), Hero-Bild im Dossier sichtbar.
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-data"]');
    await page.locator('[data-testid="ref-card"]').first().waitFor({ state: 'visible' });

    const dir = mkdtempSync(join(tmpdir(), 'kosmo-rundgang-084-'));
    const jsonPfad = join(dir, 'import.json');
    writeFileSync(
      jsonPfad,
      JSON.stringify([{ id: 'rundgang-084-bild-villa', title: 'Rundgang 084 Referenzbild', city: 'Zürich' }], null, 2),
    );
    await page.setInputFiles('[data-testid="ref-import-input"]', jsonPfad);
    await page.locator('[data-testid="meldung-info"], [data-testid="meldung-erfolg"]').first().waitFor({ state: 'visible' });

    await page.fill('[data-testid="data-search"]', 'Rundgang 084 Referenzbild');
    await page.locator('[data-testid="ref-card"]').first().click();
    await page.locator('[data-testid="ref-detail-dossier"]').waitFor({ state: 'visible' });

    const pngPfad = join(dir, 'villa.png');
    writeFileSync(pngPfad, PNG_GRADIENT);
    await page.setInputFiles('[data-testid="ref-bild-upload-input"]', pngPfad);
    await page.locator('[data-testid="meldung-erfolg"]').last().waitFor({ state: 'visible' });
    await page.locator('[data-testid="ref-dossier-bild"] img[data-testid="ref-hero-bild-img"]').waitFor({ state: 'visible' });
    await schuss('kosmodata-dossier-bild', page, '[data-testid="ref-detail-dossier"]');
    await page.close();
  }

  // (17) Einstellungen — Beim-Start-maximieren-Schalter (E9, C-4) — im
  // Browser deaktiviert (wirkt nur Desktop/Tauri) mit erklärendem
  // Tooltip-Titel statt eines stillen No-ops.
  {
    const page = await neueSeite();
    await page.click('[data-testid="einstellungen-oeffnen"]');
    await page.locator('[data-testid="einstellungen-panel"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="einstellung-start-maximiert"]').waitFor({ state: 'visible' });
    await schuss('einstellungen-maximiert', page, '[data-testid="einstellungen-system"]');
    await page.close();
  }

  // (18) KosmoPanel — Claude-Login-Block (E10, C-5) — Doppelklick auf den
  // Orb öffnet das Panel (E2-Gesetz), Verbindung auf «Anthropic (Claude,
  // Cloud)» umschalten zeigt den ehrlichen Browser-Hinweis (die Abo-Brücke
  // läuft nur in der Desktop-App über die ant-CLI — im Browser bleibt nur
  // der API-Schlüssel-Weg, hier klar benannt statt vorgetäuscht).
  {
    const page = await neueSeite();
    await page.dblclick('[data-testid="kosmo-symbol"]');
    await page.locator('[data-testid="kosmo-panel"]').waitFor({ state: 'visible' });
    // Der Verbindungs-Block (inkl. verbindung-select) liegt hinter
    // showSettings — erst der Zahnrad-Knopf im Panel-Kopf schaltet ihn frei
    // (Muster e2e/module.spec.ts, Zeile ~932: erst aria-label=Einstellungen
    // klicken, dann erst ist verbindung-select im DOM sichtbar).
    await page.click('[aria-label="Einstellungen"]');
    await page.locator('[data-testid="verbindung-select"]').waitFor({ state: 'visible' });
    await page.click('[data-testid="verbindung-select"]');
    await page.locator('[data-testid="verbindung-select-popup"]').waitFor({ state: 'visible' });
    await page.click('[data-testid="verbindung-select-popup"] [data-value="anthropic"]');
    await page.locator('[data-testid="verbindung-select-popup"]').waitFor({ state: 'hidden' });
    await page.locator('[data-testid="cloud-login-status"]').waitFor({ state: 'visible' });
    await schuss('kosmo-panel-claude-login', page, '[data-testid="kosmo-panel"]');
    await page.close();
  }

  await browser.close();

  // Einpassen statt Aufblasen — Muster rundgang-pdf-083.mts.
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
    key?: string;
    titel: string;
    notiz: string;
    tabelle?: string;
  }

  const flaechen: Flaeche[] = [
    {
      key: 'home-hauptmenu',
      titel: '§4 · Hauptmenü-Neubau — statisch, zentriert, balkenfrei',
      notiz: 'Kein rotierender Kachel-Ring mehr, kein app-header im Home-DOM: die Wortmarke steht horizontal zentriert, darunter die Kachel-Reihe (Kosmo · KosmoData · KosmoDesign · KosmoOffice) unten mittig — KosmoOffice sichtbar «kommend» und bewusst nicht klickbar (Owner-Antwort 1.2.2, Platzhalter-Kachel). Zwei Messungen der Kachel-Position im Abstand von 500ms sind identisch (Statik-Vertrag §4.1); kein Scroll bei 1440×900/1280×720 (§4.3).',
    },
    {
      key: 'home-faecher',
      titel: '§4.4 · Hover-Fächer ohne Überlappung',
      notiz: 'Hover über einer Hauptkachel zeigt ihre Untertool-Karten sauber gestapelt — der Vertrag verlangt eine paarweise Bounding-Box-Überlappungsfläche von exakt null über alle sichtbaren Karten, jede Karte vollständig im Viewport. Der PE3-Matrix-Fund C-3 (Kachel-Reihe brach beim Tauri-Minimum 980px um, der unsichtbare Office-Fächer fing KosmoData-Klicks ab) wurde vor dem Release mit einem 861–1150px-Zwischenband gefixt.',
    },
    {
      titel: 'Cursor-Formen statt versteckter Maus-Ebene (D1, PA1, C-1)',
      notiz: 'Kein Screenshot hier — ehrlich: unter navigator.webdriver bleibt die eigene Cursor-Ebene per Vertrag AUS (harter Schutz gegen einen unsichtbaren System-Cursor in den ~40 Specs, die design direkt anklicken), im Browser-E2E ist sie also grundsätzlich abgeschaltet. Der einzige echte Beweis ist der Owner-Smoke auf echtem Windows mit dem zugestellten Installer (Sanktion 9, docs/V084-SPEZ.md §7). Statt eines irreführenden Screenshots die Zonen-Matrix, die die Ebene jetzt fährt (ersetzt die alte «über Werkzeug-Zonen verstecken»-Heuristik, die D1 als Ursache des Owner-Befunds «Maus buggt, mal weg» identifizierte):',
      tabelle:
        '<table class="zonen"><thead><tr><th>Computed-Cursor-Zone</th><th>Eigene Form</th></tr></thead><tbody>' +
        '<tr><td>crosshair</td><td>Fadenkreuz</td></tr>' +
        '<tr><td>grab</td><td>Greifen (offen)</td></tr>' +
        '<tr><td>grabbing</td><td>Greift (geschlossen)</td></tr>' +
        '<tr><td>col-resize</td><td>Spalten-Resize</td></tr>' +
        '<tr><td>row-resize</td><td>Zeilen-Resize</td></tr>' +
        '<tr><td>not-allowed</td><td>Gesperrt</td></tr>' +
        '<tr><td>data-cursor-zone="praezision"</td><td>Fadenkreuz (explizite Stations-Zusage)</td></tr>' +
        '<tr><td>Eingabefeld / isContentEditable</td><td>Layer aus, System-Cursor</td></tr>' +
        '<tr><td>auto / default / pointer / sonst</td><td>neutral (Store-Zustand scheint durch)</td></tr>' +
        '</tbody></table>',
    },
    {
      key: 'island-design',
      titel: '§5/C-15 · Island-UI Station 1/4 — KosmoDesign, ZEICHNEN-Insel',
      notiz: 'Die ZEICHNEN-Insel zeigt jetzt durchgehend gezeichnete SVG-Symbole statt Buchstaben-Kürzel (PB2/PE2, Bauvorschrift 1.75/24-Strich, ein Akzentpunkt, currentColor) — der letzte Text-Fallback (Skizze) fiel mit PE2. Alle 27 popupfähigen Werkzeuge tragen echten Registry-Inhalt; fünf tote Hinweis-Texte wurden im PE2-Audit entfernt statt nachträglich gefüllt.',
    },
    {
      key: 'island-vis',
      titel: '§5/C-15 · Island-UI Station 2/4 — KosmoVis, GRAPH-Insel',
      notiz: 'KosmoVis läuft komplett auf Islands — die alte DockFlaeche/Werkzeugleiste/VisTabs-Chrome ist im Island-Modus vollständig weg (D9, C-15), die Zoom-Leiste wohnt jetzt in der ANSICHT-Insel statt in einer fixen Bildschirmecke. Die GRAPH-Insel bietet die Node-Palette («+ Graph erstellen» ohne aktiven Graphen, sonst Knoten hinzufügen) als erstes Werkzeug.',
    },
    {
      key: 'island-publish',
      titel: '§5/C-19 · Island-UI Station 3/4 — KosmoPublish, DARSTELLUNG-Insel',
      notiz: 'Alle vier Publish-Inseln (BLATT/DARSTELLUNG/PROJEKT/AUSTAUSCH) rendern echt mit den in publish-island-katalog.ts benannten Werkzeugen; die alte Sidebar/Werkzeugleiste/DockFlaeche ist weg. DARSTELLUNG trägt den neuen Blatt-Zoom (Wheel + Fit, s. eigene Szene weiter unten) — vorher hatte Publish gar keinen Zoom (D10, statische viewBox).',
    },
    {
      key: 'island-prepare',
      titel: '§5/C-20 · Island-UI Station 4/4 — KosmoPrepare, AUFNAHME-Insel',
      notiz: 'KosmoPrepare bekam sein eigenes Island-Design (vorher: nackter Dock ohne Stationsgesicht, Owner-Punkt «Dock raus; dediziertes Design»). Die AUFNAHME-Insel zeigt echtes Datei-Ingest-Feedback je Datei — Abschnittszahl bei Erfolg, echter Fehlertext bei Misserfolg, statt eines einzigen überschriebenen Fehlerfelds (Owner-Auftrag Punkt 2, C-20).',
    },
    {
      key: 'orb-hover-popup',
      titel: '§3 E2 · Orb-Gesetz 1/3 — Hover zeigt das Mini-Popup',
      notiz: 'Die E2-Tabelle aus docs/V084-SPEZ.md §3 gilt jetzt überall gleich — «Kosmo ist immer überall gleich aufgebaut» (Owner-Regel). Hover über dem Orb zeigt ein Mini-Popup mit Textverlauf (letzte Kosmo-Aktivität); vorher fehlte dieser Hover-Schritt dem Island-Orb komplett, im Home-Symbol war die Hülle bis zu diesem Paket zusätzlich gold statt glasig hinterlegt (Owner-Punkt «Kosmo-Orb nicht gelb hinterlegen» — --f-gold ist seit diesem Paket ersatzlos aus island.css entfernt).',
    },
    {
      key: 'orb-konversationskarte',
      titel: '§3 E2 · Orb-Gesetz 2/3 — Einfachklick öffnet die Konversationskarte',
      notiz: 'Ein Klick öffnet die kompakte Konversationskarte, NICHT direkt das grosse Panel — das Home-Symbol öffnete vor diesem Paket noch sofort das Panel, was der Owner-Regel «Kosmo überall gleich» widersprach. Esc oder ein Klick daneben schliesst die Karte wieder (useOverlaySchliessen, E3-Hook-Rollout).',
    },
    {
      key: 'orb-panel-doppelklick',
      titel: '§3 E2 · Orb-Gesetz 3/3 — Doppelklick öffnet das volle KosmoPanel',
      notiz: 'Doppelklick auf den Orb existierte vor diesem Paket NIRGENDS (Owner-Fund «Doppelklick öffnet Kosmo-Menü nicht») — jetzt öffnet er das grosse KosmoPanel, über eine geteilte Klick/Doppelklick-Disambiguierung (useKlickVsDoppelklick, 200ms, ein Zeitwert app-weit). Ehrliche Restlücke aus dem PB4-Bericht: die SchwarmOrbs bleiben bewusst ausserhalb dieser Tabelle (eigener §6.2-Fokus-Vertrag).',
    },
    {
      key: 'zeichnen-masskette-inspector',
      titel: '§7 D8/§8 C-26 + PE3 C-11 · Zeichnen-Tiefe — Masskette gewählt, Inspector-Float via Rechtsklick',
      notiz: 'Eine Masskette ist seit PB5 real wähl-, verschieb- und löschbar (vorher unsichtbar im Plan). Der Fund aus der adversarialen Matrix-Abnahme (C-11): «Eigenschaften» im Rechtsklick-Kontextmenü war im Island-Default wirkungslos, weil der gedockte Inspector dort gar nicht rendert — jetzt öffnet derselbe Menüpunkt eine schwebende Inspector-Glas-Karte (dw-eigenschaften-float, Esc/Aussenklick schliesst, E2-Muster) für JEDE gepickte Entität, auch für eine Masskette.',
    },
    {
      key: 'zeichnen-kommentar-filter',
      titel: '§8 C-26 · Kommentar-Filter blendet die Plan-Kommentare aus/ein',
      notiz: 'Neuer Toggle-Knopf im bestehenden Plan-Chrome (neben Achsen/Graph/U-Plan) — blendet die ganze plan-kommentare-Gruppe aus dem DOM UND macht ausgeblendete Kommentare in pickAt nicht mehr trefferbar. Ehrliche Lücke aus dem PB5-Bericht: dieser Toggle sitzt NUR im Modus «manuell» — im Island-Modus liegt der PlanView-Chrome-Bereich ausserhalb des PB5-Dateikreises (island/** war gesperrt), diese Szene erzwingt darum den manuell-Seed statt den Island-Default stillschweigend zu zeigen.',
    },
    {
      key: 'zeichnen-overlay-kuerzel',
      titel: '§7 D13 · ?-Overlay zeigt die vier neuen Kürzel O/M/K/N',
      notiz: 'Vier neue Einträge in kurztasten.ts — O Öffnung, M Messen (Masskette), K Kommentar, N Mesh (Netz) — über denselben generischen kurztasteFuer-Pfad wie die neun Bestandstasten, keine App-Änderung ausser der Registry selbst; das ?-Overlay leitet sie ohne Code-Änderung ab. Der veraltete Kopfkommentar in kurztasten.ts wurde dabei korrigiert.',
    },
    {
      key: 'vis-dark-nodes',
      titel: '§2 D9/§8 C-16 · Vis — helle Nodes auf dunklem Canvas',
      notiz: 'Der Node-Canvas ist jetzt dunkel (--k-field statt des alten --k-plan-paper-Weiss) mit hellen Node-Karten — der PE3-Matrix-Fund C-16 deckte auf, dass «Nodes hell» zunächst nur zu einer Elevations-Nuance umgedeutet worden war (Kontrast 1.17:1); die Korrektur zieht eine echte Token-Kreuzung (--vis-node-flaeche/-tinte) statt eines neuen Hex-Werts. Der komplette Demolauf Kamera→Material→Render(--fake)→KI-Slot läuft jetzt über Kernel-Commands (vis.render, E6) — hier nicht extra bebildert, aber damit erstmals auch für Kosmo selbst auslösbar, nicht nur für die Person am Bildschirm.',
    },
    {
      key: 'vis-stimmung-kacheln',
      titel: '§2 D9/E5/§8 C-17 · Stimmungen als echte Bild-Kacheln statt Text',
      notiz: 'Die STIMMUNG-Insel zeigte vorher drei Prompt-TEXTE (D9-Fund); jetzt sind es drei prozedural erzeugte Canvas-Vorschauen (morgen/abend/weiss, THREE.Sky/Gradient→PMREM, null Assets, deterministisch) — ehrlich ohne echte HDRI-Downloads (E5-Politik: App-seitig nur die drei Preview-Environments, Voll-HDRIs sind ein Nicht-Ziel dieser Version). Auswahl setzt renderStimmungPreset auf dem aktiven Render-Node.',
    },
    {
      key: 'publish-blattzoom',
      titel: '§2 D10/§8 C-19 · Publish-Blattzoom (Wheel + Fit)',
      notiz: 'Publish hatte vorher gar keinen Zoom (statische viewBox, D10) — jetzt zoomt die Blatt-Bühne über Mausrad/«+»/«−»/Fit, ohne die Massstab-Semantik platzierter Ansichten zu verändern (publish.ansichtPlatzieren bleibt unberührt, reiner Viewport-Zoom). Der Manuell-Rückweg funktioniert beidseitig — Manuell bleibt exakt das heutige Publish (Bestandsschutz, Sanktion 8).',
    },
    {
      key: 'kosmodata-dossier-bild',
      titel: '§8 C-21 · KosmoData — Dossier-Hero-Bild für eigene Referenzen',
      notiz: 'Eigene Referenzen (quelle:"eigen") tragen jetzt ein Bild: Upload mit ehrlicher Typ-/Grössen-Ablehnung (falscher Dateityp, >2MB), sofortige Anzeige im Dossier-Hero-Slot UND als Mini-Thumb in der Tabellenzeile, Persistenz über Reload (IndexedDB-Laufzeit, kein Yjs/Doc-Eintrag) — der eingebaute 112er-Seed bleibt dabei komplett unberührt (kein Upload-Weg dort). Ein Website-Sync-Wächter im Release-Gate hält architekturkosmos.ch und die eingebauten Referenzdaten seither beweisbar synchron (E7, nicht bebildert).',
    },
    {
      key: 'einstellungen-maximiert',
      titel: '§3 E9/§8 C-4 · Einstellungen — «Beim Start maximieren»',
      notiz: 'Neuer Schalter unter System, Default AN (deckt den Owner-Punkt «Start immer Vollbild»). Im Browser ist er ehrlich deaktiviert mit erklärendem Tooltip («wirkt nur in der Desktop-App») statt eines stillen No-ops — der reale Beweis ist wie beim Cursor der Owner-Smoke auf Windows mit dem zugestellten Installer.',
    },
    {
      key: 'kosmo-panel-claude-login',
      titel: '§3 E10/§8 C-5 · KosmoPanel — Claude-Login «beides»',
      notiz: 'Owner-Antwort 1.2.3 «beides»: die ant-CLI-Abo-Brücke wird jetzt GEFÜHRT (Status-Erkennung, Install-Anleitung mit echtem Befehl, «erneut prüfen») UND der API-Schlüssel-Weg bekommt einen echten Validierungs-Ping. Im Browser (kein Tauri) zeigt der Anthropic-Block ehrlich den cloud-login-hinweis-Text: das Abo läuft nur in der Desktop-App über die lokale ant-CLI — hier bitte den API-Schlüssel nutzen. Kein Schein-Login, die Browser-Grenze wird klar benannt statt vorgetäuscht.',
    },
  ];

  const seiten = flaechen
    .map((f) => {
      if (f.tabelle) {
        return `<section>
      <h2>${f.titel}</h2>
      <p class="notiz">${f.notiz}</p>
      ${f.tabelle}
    </section>`;
      }
      const shot = f.key ? shots[f.key] : undefined;
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
    .titel { padding: 0 0 8mm; }
    .titel h1 { font-size: 23px; margin: 0 0 4px; }
    .titel p { color: #5c574d; margin: 0; font-size: 12px; }
    section { page-break-inside: avoid; margin-bottom: 9mm; }
    h2 { font-size: 15px; margin: 0 0 6px; color: #0b0d12; }
    .shot { max-width: 100%; border: 1px solid #c9c4b6; border-radius: 4px; display: block; margin: 0 auto; }
    .notiz { font-size: 11.5px; color: #14130f; margin: 5px 0 0; line-height: 1.4; }
    .rest { font-size: 11px; color: #5c574d; margin-top: 6mm; border-top: 1px solid #e4e0d6; padding-top: 3mm; }
    table.zonen { border-collapse: collapse; margin-top: 4mm; font-size: 11px; width: 100%; }
    table.zonen th, table.zonen td { border: 1px solid #c9c4b6; padding: 3px 6px; text-align: left; }
    table.zonen th { background: #efece3; }
  </style></head><body>
    <div class="titel"><h1>KosmoOrbit v0.8.4 «Ein Guss» — Rundgang</h1>
      <p>Island-UI in allen vier Werkstationen mit einem überall gleichen Kosmo-Orb, eigene Cursor-Formen statt versteckter Maus-Ebene, Hauptmenü statisch/zentriert/scrollfrei, Start maximiert + geführter Claude-Login, ArchiCAD-Bedientiefe für Massketten/Kommentare, Vis dunkel mit hellen Nodes + Bild-Stimmungen, Publish-Blattzoom, KosmoData-Bilder. 18.07.2026. ROADMAP 449-473, docs/V084-SPEZ.md.</p></div>
    ${seiten}
    <p class="rest"><b>Ehrlich offen:</b> Cursor-Unsichtbarkeit, Maximiert-Start und die ant-CLI-Anmeldung sind im Browser-E2E nur simuliert beweisbar (navigator.webdriver schaltet die Cursor-Ebene per Vertrag aus, der Maximiert-Schalter ist im Browser deaktiviert, das Abo-Login läuft nur in der Desktop-App) — der Owner-Smoke auf echtem Windows mit dem zugestellten Installer bleibt der einzige echte Beweis für alle drei. Der Kommentar-Filter-Toggle sitzt nur im Modus «manuell», nicht im Island-Chrome (dokumentierte PB5-Lücke). Voll-HDRIs und echte Cycles-GPU-Renders warten auf die HomeStation; Multi-Selektion/Griffe sind bewusst v0.8.5-Kandidaten. — <b>Gate:</b> Typecheck 0 über 8 Workspaces, Suiten ai 268 · contracts 41 · data 44 · kernel 1010 · lizenz 8 · ui 106 · app 1616 = 3093, svg-qa 36 Goldens/0 harte Fehler (byte-still), secret-scan grün, website-sync grün, release-gate Exit 0 (ROADMAP 474).</p>
  </body></html>`;

  const b2 = await chromium.launch({ executablePath: exe });
  const p2 = await b2.newPage();
  await p2.setContent(html, { waitUntil: 'networkidle' });
  await p2.pdf({ path: OUT, format: 'A4', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
  await b2.close();
  // eslint-disable-next-line no-console
  console.log(`\nRundgang-PDF -> ${OUT}`);
  // eslint-disable-next-line no-console
  console.log(`Seiten (Flaechen): ${flaechen.length}`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
