/**
 * Rundgang-PDF «0.8.3 — Wissensfundament» — visueller Rundgang durch den
 * KosmoData-Ausbau (P2/P9, `docs/V083-SPEZ.md` §6/§6.5: BM25-geteilter
 * Referenzindex mit `[Qn]`-Belegen im Chat, RefKarten, Import eigener
 * Referenzen), die drei neuen Island-§8-Werkzeuge (P3, §1–§3: Öffnung/Messen/
 * Kommentar als echte Kernel-Entitäten statt Rahmen) und den iPad-Polish
 * (P8, §10: Popup-Klammerung im 1024×768-Viewport + optionale Zwei-Finger-
 * Undo-Geste, Default AUS). Muster `rundgang-pdf-082.mts` (Screenshots der
 * laufenden App → A4-PDF, EIN Build/Preview, kein Vorher/Nachher-Vergleich,
 * dieselbe `pngGroesse`/`bildMasse`-Skalierungslogik gegen aufgeblasene
 * Element-Screenshots). Die Klick-Choreografie je Szene ist wörtlich aus den
 * jeweiligen Paket-Specs übernommen (`e2e/popup-kollision.spec.ts`,
 * `e2e/masskette-kommentar.spec.ts`, `e2e/einstellungen.spec.ts`,
 * `e2e/kosmodata-import.spec.ts`, `e2e/kosmodata-chat.spec.ts`,
 * `e2e/train-paket-schnueren.spec.ts`,
 * `e2e/island-inhalte-projekt-austausch.spec.ts`) — keine neu erfundenen
 * Selektoren.
 *
 * Voraussetzung: Build ist NACH dem Versions-Bump neu zu bauen und der
 * Preview-Server NEU zu starten (setsid; ein alter Preview-Prozess zeigt
 * sonst weiterhin die alte Versionsnummer im App-Kopf).
 *
 * Aufruf (aus kosmo-orbit/, Preview auf $PORT, Standard 5183):
 *   KOSMO_E2E_PORT=5183 PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium \
 *     npx tsx e2e/tools/rundgang-pdf-083.mts
 *
 * 12 Szenen (10 Pflicht + 2 optional): Island-Default (Papier + Kosmos),
 * ZEICHNEN-Leiste offen (11 Werkzeuge inkl. Öffnung/Messen), Messen Stufe 2,
 * Masskette real im Plan, Kommentar real im Plan, P8-Klammer-Beweisbild
 * (1024×768), Einstellungen «Bewegung & Klang» (Touch-Undo-Schalter),
 * KosmoData Referenzen-Tab (Import-Knopf), Kosmo-Chat mit Referenz-Antwort
 * ([Qn]/RefKarte), App-Kopf mit Versionsbadge, TrainWorkspace-Adapter-
 * Registry (optional), AUSTAUSCH-Deep-Link-Fenster (optional).
 */
import { chromium, type Page } from 'playwright-core';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const PORT = process.env['KOSMO_E2E_PORT'] ?? '5183';
const BASE = `http://localhost:${PORT}`;
const OUT = `${ROOT}abgabe/RUNDGANG-NOTIZEN-0.8.3.pdf`;
mkdirSync(`${ROOT}abgabe/`, { recursive: true });
const WORK = join(tmpdir(), 'kosmo-rundgang-083');
mkdirSync(join(WORK, 'bilder'), { recursive: true });
const exe = process.env['PLAYWRIGHT_CHROMIUM_PATH'] || undefined;

// Erststart-Marker (Onboarding/StarterGuide übersprungen, Dock-Preset-
// Automatik ausgeschaltet) — Muster `rundgang-pdf-082.mts`. Kein
// `kosmo.designOberflaeche`-Eintrag: der echte Produktions-Default `'island'`
// soll unverfälscht zu sehen sein.
function basisLocalStorage(thema?: 'paper' | 'orbit'): Record<string, string> {
  return {
    'kosmo.onboarded': '1',
    'kosmo.starterGuide.done': '1',
    'kosmo.dock.presetInit.v1': '1',
    ...(thema ? { 'kosmo.thema': thema } : {}),
  };
}

/** Liest Breite/Höhe direkt aus dem PNG-IHDR-Chunk (Bytes 16–24, big-endian
 *  uint32 je Feld) — kein Zusatz-Paket nötig, reines Node/Buffer. Muster
 *  `rundgang-pdf-082.mts`. */
function pngGroesse(buf: Buffer): { w: number; h: number } {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

interface Schuss {
  b64: string;
  w: number; // Rohpixel (Screenshot bei deviceScaleFactor 2)
  h: number;
}

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[]; summary?: string };
      state: () => {
        activeStoreyId: string | null;
        select: (ids: string[]) => void;
        doc: { byKind: (k: string) => { id: string; name?: string; assemblyId?: string }[] };
      };
      open: (s: string) => void;
    };
    __kosmoSkripte?: Record<string, unknown>;
  }
}

async function main() {
  const browser = await chromium.launch({ executablePath: exe });
  const shots: Record<string, Schuss> = {};

  async function neueSeite(
    opts: { viewport?: { width: number; height: number }; thema?: 'paper' | 'orbit'; localStorage?: Record<string, string> } = {},
  ): Promise<Page> {
    const viewport = opts.viewport ?? { width: 1600, height: 1000 };
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.setDefaultTimeout(20000);
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    const alleEintraege = { ...basisLocalStorage(opts.thema), ...(opts.localStorage ?? {}) };
    await page.evaluate((eintraege) => {
      for (const [k, v] of Object.entries(eintraege)) localStorage.setItem(k, v);
    }, alleEintraege);
    await page.reload({ waitUntil: 'domcontentloaded' });
    return page;
  }

  async function schuss(key: string, page: Page, sel?: string, opts: { fullPage?: boolean } = {}): Promise<void> {
    await page.waitForTimeout(500);
    const p = join(WORK, 'bilder', `${key}.png`);
    if (sel) {
      await page.locator(sel).screenshot({ path: p });
    } else {
      await page.screenshot({ path: p, fullPage: opts.fullPage ?? false });
    }
    const buf = readFileSync(p);
    const { w, h } = pngGroesse(buf);
    shots[key] = { b64: buf.toString('base64'), w, h };
    // eslint-disable-next-line no-console
    console.log(`  ✓ ${key} (${w}×${h}px)`);
  }

  /** Hover statt Klick — `.click()` bewegt die Maus zuerst auf die Pille, was
   *  `onMouseEnter` (`IslandShell.tsx`) SCHON auslöst (Muster
   *  `e2e/popup-kollision.spec.ts`/`e2e/masskette-kommentar.spec.ts`, beide
   *  hovern explizit die `-pill`, nicht den `-root`). */
  async function oeffneInsel(page: Page, island: string): Promise<void> {
    await page.hover(`[data-testid="island-${island}-pill"]`);
    await page.locator(`[data-testid="island-${island}-leiste"]`).waitFor({ state: 'visible' });
  }

  // (1) Island-Default beide Farbwelten — Papier + Kosmos, Muster
  // `rundgang-pdf-082.mts` Szene 1: Viewer + vier Islands + Ansichts-Info +
  // Stationen-Orb + Kosmo-Orb, kein klassisches Kopfbalken-Chrome (Island-
  // Modus der design-Station, `App.tsx` `bodenDockAusgeblendet`).
  for (const thema of ['paper', 'orbit'] as const) {
    const page = await neueSeite({ thema });
    await page.click('[data-testid="module-design"]');
    await page.locator('[data-testid="island-zeichnen-pill"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="kosmo-orb-knopf"]').waitFor({ state: 'visible' });
    await schuss(`island-default-${thema}`, page);
    await page.close();
  }

  // (2) ZEICHNEN-Leiste offen — Stufe 1 (Hover), 11 Werkzeuge, davon jetzt
  // Öffnung UND Messen als echte Werkzeuge statt Rahmen (P3, §3.1 ZEICHNEN-
  // Katalog `island-katalog.ts`). Kommentar (das dritte §8-Werkzeug) sitzt in
  // der PROJEKT-Insel, nicht hier — s. Szene 5.
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-design"]');
    await oeffneInsel(page, 'zeichnen');
    await page.locator('[data-testid="island-werkzeug-oeffnung"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="island-werkzeug-messen"]').waitFor({ state: 'visible' });
    await schuss('zeichnen-leiste', page, '[data-testid="island-zeichnen-leiste"]');
    await page.close();
  }

  // (3) Messen Stufe 2 (Mini-Popup) — Choreografie 1:1
  // `e2e/masskette-kommentar.spec.ts` («Messen: eine Klickkette + Escape…»):
  // Insel öffnen, Werkzeug-Knopf EIN Klick → `island-messen-popup`.
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-design"]');
    await oeffneInsel(page, 'zeichnen');
    await page.click('[data-testid="island-werkzeug-messen"]');
    await page.locator('[data-testid="island-messen-popup"]').waitFor({ state: 'visible' });
    await schuss('messen-stufe2', page, '[data-testid="island-messen-popup"]');
    await page.close();
  }

  // (4) Masskette real im Plan (E2, §2.2/§2.4) — Wandbau-Schnipsel wörtlich
  // aus `e2e/masskette-kommentar.spec.ts`s Öffnung-Test übernommen (Aufbau
  // «AW Beton 36», Fallback erster Aufbau), die drei Masskette-Punkte 1:1 aus
  // demselben Datei-Messen-Test (`(-2000,-1500)→(1000,500)→(3000,-500)`) —
  // hier per `design.massKetteSetzen` direkt über `window.__kosmo.run`
  // committet (derselbe Command-Weg, den die UI-Klickkette am Ende auch
  // aufruft) statt über Mausklicks simuliert, damit der Rundgang
  // deterministisch bleibt. Kein View-Wechsel nötig — `[data-testid=
  // "planview"]` ist im Island-Default bereits die aktive Fläche (dieselbe
  // Annahme, unter der `masskette-kommentar.spec.ts` selbst ohne
  // `view-2d`-Klick auskommt).
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-design"]');
    await page.locator('[data-testid="planview"]').waitFor({ state: 'visible' });

    await page.evaluate(() => {
      const k = window.__kosmo;
      const st = k.state();
      const storeyId = st.activeStoreyId!;
      const aufbauten = st.doc.byKind('assembly');
      const aufbau = aufbauten.find((a) => a.name === 'AW Beton 36') ?? aufbauten[0]!;
      k.run('design.wandZeichnen', {
        storeyId,
        a: { x: -4000, y: 0 },
        b: { x: 4000, y: 0 },
        assemblyId: aufbau.id,
      });
      k.run('design.massKetteSetzen', {
        storeyId,
        punkte: [
          { x: -2000, y: -1500 },
          { x: 1000, y: 500 },
          { x: 3000, y: -500 },
        ],
      });
    });

    await schuss('masskette-plan', page, '[data-testid="planview"]');
    await page.close();
  }

  // (5) Kommentar real im Plan (E1, §1.2/§1.4) — Text/Autor/Punkt 1:1 aus
  // `e2e/masskette-kommentar.spec.ts`s Kommentar-Test übernommen, hier per
  // `design.kommentarSetzen` direkt über `window.__kosmo.run` committet
  // (derselbe Command, den das Erfassen-Formular am Ende auch aufruft) statt
  // über Klick+Formular simuliert. Screenshot der Plan-Fläche mit dem
  // `plan-kommentare`-Overlay (App-Overlay, kein Kernel-Derive-Pfad,
  // `PlanView.tsx`) sichtbar samt gesetztem `plan-kommentar`-Marker.
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-design"]');
    await page.locator('[data-testid="planview"]').waitFor({ state: 'visible' });

    await page.evaluate(() => {
      const k = window.__kosmo;
      const st = k.state();
      const storeyId = st.activeStoreyId!;
      k.run('design.kommentarSetzen', {
        text: 'E2E-Testkommentar (v0.8.3 P3)',
        autor: 'E2E-Suite',
        at: { x: 1000, y: 1000 },
        storeyId,
        erstelltAm: '18.07.2026',
      });
    });

    await page.locator('[data-testid="plan-kommentar"]').waitFor({ state: 'visible' });
    await schuss('kommentar-plan', page, '[data-testid="planview"]');
    await page.close();
  }

  // (6) P8-Klammer-Beweisbild — Viewport 1024×768, ZEICHNEN-Insel, Messen-
  // Fenster (zweiter Klick aufs Symbol eskaliert Stufe 2 → Stufe 3), exakte
  // Choreografie aus `e2e/popup-kollision.spec.ts`s «Bounding-Box-
  // Einzelbeweis — hohe ZEICHNEN-Insel»: Messen ist das ELFTE (letzte)
  // ZEICHNEN-Werkzeug, die Leiste ist dabei komplett aufgefächert — der
  // Fund-Fall aus ROADMAP 427 (Popup-Position nahe der Statusleiste). 600ms
  // Wartezeit nach dem zweiten Klick für die `winIn`-Fenster-Animation, dann
  // ein voller Viewport-Screenshot (kein Element-Crop — der Beweis ist
  // gerade, dass NICHTS über den 1024×768-Rand hinausragt).
  {
    const page = await neueSeite({ viewport: { width: 1024, height: 768 } });
    await page.click('[data-testid="module-design"]');
    await oeffneInsel(page, 'zeichnen');
    const knopf = page.locator('[data-testid="island-werkzeug-messen"]');
    await knopf.click();
    await knopf.click();
    await page.locator('[data-testid="island-messen-fenster"]').waitFor({ state: 'visible' });
    await page.waitForTimeout(600);
    await schuss('p8-klammer-messen-fenster', page);
    await page.close();
  }

  // (7) Einstellungen «Bewegung & Klang» — neuer Zwei-Finger-Doppeltipp-
  // Undo-Schalter (P8/E10, §10.2), Default AUS. Öffnungsweg 1:1
  // `e2e/einstellungen.spec.ts` (Kopfleiste `einstellungen-oeffnen`, kein
  // vorheriger Stationswechsel nötig — der Header ist auf der Zentrale
  // sichtbar).
  {
    const page = await neueSeite();
    await page.click('[data-testid="einstellungen-oeffnen"]');
    await page.locator('[data-testid="einstellungen-panel"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="einstellung-touch-undo-geste"]').waitFor({ state: 'visible' });
    await schuss('einstellungen-bewegung-klang', page, '[data-testid="einstellungen-bewegung-klang"]');
    await page.close();
  }

  // (8) KosmoData Referenzen-Tab — «Eigene importieren»-Knopf
  // (`ref-import-button`) + `referenzen-zaehler`, OHNE echten Import (Muster
  // `e2e/kosmodata-import.spec.ts`s `oeffneReferenzenTab`: `module-data`
  // öffnet direkt auf dem Referenzen-Tab, dem Default-Tab). Voller Viewport-
  // Screenshot statt Element-Crop — die Werkzeugleiste ist ein reiner
  // `display:contents`-Test-Wrapper ohne eigene Box-Geometrie.
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-data"]');
    await page.locator('[data-testid="ref-card"]').first().waitFor({ state: 'visible' });
    await page.locator('[data-testid="ref-import-button"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="referenzen-zaehler"]').waitFor({ state: 'visible' });
    await schuss('kosmodata-referenzen', page);
    await page.close();
  }

  // (9) Kosmo-Chat mit Referenz-Antwort + [Qn]/RefKarte (P2, §6.2/§6.3) —
  // Mock-/Skript-Provider-Weg exakt aus `e2e/kosmodata-chat.spec.ts`
  // übernommen: der ECHTE `ChatSession`-Pfad über den `ScriptedProvider`
  // (`window.__kosmoSkripte` + `localStorage['kosmo.llm']`), kein
  // Regex-Mock. Skript/Frage/Chip-Klick 1:1 aus dem ersten Testfall der
  // Datei («chandigarh» trifft im Seed genau einen Eintrag → EIN [Q1]-Beleg
  // + EIN Chip). `SzenarioSkript`-Form lokal nachgebildet (kein Workspace-
  // Import in diesem eigenständigen tsx-Tool, Muster `rundgang-pdf-082.mts`
  // — nur `playwright-core`/Node-Bordmittel).
  {
    const page = await neueSeite();
    await page.evaluate(() => {
      const skript = {
        id: 'rundgang-083-kosmodata-referenz',
        zuege: [
          {
            nutzerErwartung: 'chandigarh',
            antwortText: 'Chandigarh von Le Corbusier passt hier gut als Referenz [Q1].',
            toolCalls: [{ name: 'referenzen_suchen', args: { suchbegriff: 'Chandigarh' } }],
          },
        ],
      };
      window.__kosmoSkripte = { ...(window.__kosmoSkripte ?? {}), [skript.id]: skript };
      localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'scripted', skriptId: skript.id }));
    });
    await page.click('[data-testid="kosmo-symbol"]');
    await page.locator('[data-testid="kosmo-input"]').waitFor({ state: 'visible' });
    await page.fill('[data-testid="kosmo-input"]', 'Kennst du eine gute Referenz wie Chandigarh?');
    await page.click('[data-testid="kosmo-send"]');

    const chips = page.locator('[data-testid="quelle-chip"]');
    await chips.first().waitFor({ state: 'visible', timeout: 15000 });
    await chips.first().click();
    await page.locator('[data-testid="ref-karte"]').waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('[data-testid="ref-karte-bild"]').waitFor({ state: 'visible' });
    await schuss('kosmodata-chat-refkarte', page, '[data-testid="kosmo-panel"]');
    await page.close();
  }

  // (10) App-Kopf mit Versionsbadge — der Kopfbalken (`app-header`,
  // `Wordmark`-Komponente, `data-testid="app-version"`) rendert NUR ausserhalb
  // des Island-Modus der design-Station (`App.tsx` `bodenDockAusgeblendet`);
  // die Zentrale (Home-Screen, Ausgangszustand jeder neuen Seite) zeigt ihn
  // unverändert. Die Version wird NICHT hart verdrahtet gelesen — der
  // Screenshot zeigt einfach den echten, gerade gebauten Kopf.
  {
    const page = await neueSeite();
    await page.locator('[data-testid="app-version"]').waitFor({ state: 'visible' });
    await schuss('app-kopf-version', page, '.app-header');
    await page.close();
  }

  // (11, optional) TrainWorkspace-Statustafel — Adapter-Registry mit der
  // `kosmo-zeichner-commands`-Zeile (Commands-SFT-Datensatz). Einfacher Weg
  // aus `e2e/train-paket-schnueren.spec.ts` übernommen (nur die Registry-
  // Sichtbarkeitsprüfung, ohne den Schnüren-/Download-Teil dieser Spec).
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-train"]');
    await page.locator('[data-testid="train-adapter-registry"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="train-adapter-kosmo-zeichner-commands"]').waitFor({ state: 'visible' });
    await schuss('train-adapter-registry', page, '[data-testid="train-adapter-registry"]');
    await page.close();
  }

  // (12, optional) AUSTAUSCH-Deep-Link-Fenster — «Rendern» Stufe 3
  // eskaliert echt zur KosmoVis-Station. Choreografie 1:1
  // `e2e/island-inhalte-projekt-austausch.spec.ts` («Ein Deep-Link-Fall»):
  // hier wird NUR das Fenster mit dem `island-rendern-zur-station`-Knopf
  // gezeigt, ohne ihn zu klicken (ein Klick würde die design-Islands aus dem
  // DOM entfernen und den Rundgang-Kontext verlassen).
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-design"]');
    await oeffneInsel(page, 'austausch');
    await page.click('[data-testid="island-werkzeug-rendern"]');
    await page.locator('[data-testid="island-rendern-popup"]').waitFor({ state: 'visible' });
    await page.click('[data-testid="island-werkzeug-rendern"]');
    await page.locator('[data-testid="island-rendern-fenster"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="island-rendern-zur-station"]').waitFor({ state: 'visible' });
    await schuss('austausch-rendern-deep-link', page, '[data-testid="island-rendern-fenster"]');
    await page.close();
  }

  await browser.close();

  const flaechen = [
    {
      key: 'island-default-paper',
      titel: '§8 · Island-Standard-Oberfläche, Farbwelt Papier',
      notiz: 'Unveränderter Island-Default (PD-Strom v0.8.2) als Ausgangspunkt des Rundgangs — vier schwebende Islands plus Ansichts-Info, Stationen-Orb und Kosmo-Orb, kein Kopfbalken im Island-Modus der design-Station.',
    },
    {
      key: 'island-default-orbit',
      titel: '§8 · Dieselbe Island-Oberfläche, Farbwelt Kosmos',
      notiz: 'Beide Farbwelten tragen exakt dieselbe Struktur (Papier-ist-Papier-Invarianz) — unverändert seit v0.8.2.',
    },
    {
      key: 'zeichnen-leiste',
      titel: '§3.1 · ZEICHNEN-Insel, 11 Werkzeuge — Öffnung und Messen jetzt echt',
      notiz: 'Öffnung (E3) und Messen (E2) sind ab v0.8.3 echte Werkzeuge mit Kernel-Entität + Command statt reiner Rahmen mit Hinweistext — dieselben 11 Positionen wie in v0.8.2, aber zwei davon jetzt wirklich verdrahtet.',
    },
    {
      key: 'messen-stufe2',
      titel: '§2.2/§2.4 · Messen-Werkzeug, Stufe 2 (Mini-Popup)',
      notiz: 'Ein Klick öffnet den Klickmodus — jeder weitere Klick im Plan sammelt einen Punkt der Masskette, Doppelklick oder Escape schliesst sie ab (`design.massKetteSetzen`, ein Command-Aufruf für die ganze Kette).',
    },
    {
      key: 'masskette-plan',
      titel: '§2 · Masskette real im Plan — neue MassKette-Entität + Plan-Derive-Zweig',
      notiz: 'Eine echte, per Command gesetzte Punkt-zu-Punkt-Kette (drei Punkte, zwei Segmente) erscheint jetzt im Plan-SVG (`derive/plan.ts`, Guard-geschützt: nur aktiv, wenn `doc.byKind(\'masskette\')` nicht leer ist — alle 35 Bestands-Goldens bleiben dadurch byte-gleich, +1 neues Golden `masskette-plan.svg`).',
    },
    {
      key: 'kommentar-plan',
      titel: '§1 · Kommentar real im Plan — neue Kommentar-Entität + App-Overlay',
      notiz: 'Ein Klick setzt zuerst nur den Punkt (UI-Brücke), das Erfassen-Formular der PROJEKT-Insel committet `design.kommentarSetzen` erst nach Text/Autor — der Marker (`plan-kommentare`/`plan-kommentar`) ist ein reines App-Overlay in `PlanView.tsx`, kein Kernel-Derive-Pfad, also ebenfalls golden-neutral.',
    },
    {
      key: 'p8-klammer-messen-fenster',
      titel: '§10.1 · iPad-Klammerung — Messen-Fenster bleibt im 1024×768-Viewport',
      notiz: 'Bounding-Box-Sweep über alle 29 Insel-Werkzeuge (ROADMAP-427-Fund «Popup-Position der hohen ZEICHNEN-Insel nahe der Statusleiste», jetzt strukturell behoben): auch bei voll aufgefächerter, hoher ZEICHNEN-Leiste ragt kein Popup/Fenster über den iPad-Viewport hinaus.',
    },
    {
      key: 'einstellungen-bewegung-klang',
      titel: '§10.2 · Einstellungen «Bewegung & Klang» — neuer Zwei-Finger-Undo-Schalter',
      notiz: 'Der neue Touch-Undo-Geste-Schalter (Zwei-Finger-Doppeltipp löst Undo aus) steht standardmässig AUS, exakt wie die drei bestehenden Schalter dieser Sektion — kein überraschendes Touch-Verhalten ohne bewusste Zustimmung. §8-1 (reales Verhalten auf Hardware) bleibt Owner-offen.',
    },
    {
      key: 'kosmodata-referenzen',
      titel: '§6.5/E6e · KosmoData Referenzen-Tab — Import eigener Referenzen',
      notiz: 'Der neue «Eigene importieren»-Knopf öffnet eine JSON-Dateiauswahl mit Schema-Validierung, zeilengenauer Fehlermeldung, Kollisions-Guard gegen bestehende Seed-ids und sichtbarer «Eigene Referenz»-Kennzeichnung im Dossier — hier nur der Tab mit dem Knopf, kein Import ausgeführt.',
    },
    {
      key: 'kosmodata-chat-refkarte',
      titel: '§6.2/§6.3 · Kosmo-Chat — [Qn]-Beleg + Referenz-Chip + RefKarte',
      notiz: 'Das `referenzen_suchen`-Werkzeug zitiert jetzt über dieselbe geteilte BM25-Maschinerie wie `quellen_suchen`, mit `[Qn]`-Belegen im Antworttext — ein Klick auf den Chip rendert die volle RefKarte samt Bild direkt im Chatverlauf, zusätzlich zum bestehenden Stations-Sprung.',
    },
    {
      key: 'app-kopf-version',
      titel: 'App-Kopf mit Versionsbadge',
      notiz: 'Der Kopfbalken (nur ausserhalb des Island-Modus der design-Station sichtbar) trägt die Versionsnummer als hochgestelltes Suffix der Wortmarke — direkt aus dem gerade gebauten `__APP_VERSION__` gelesen, nicht im Rundgang-Skript hart verdrahtet.',
    },
    {
      key: 'train-adapter-registry',
      titel: 'TrainWorkspace — Adapter-Registry mit Commands-SFT-Zeile',
      notiz: 'Die «kosmo-zeichner-commands»-Zeile springt von LEER auf REPRODUZIERBAR: P4 hat den Datensatz real gefüllt (commands-v1.jsonl, 372 seeded Zeilen) — die alte In-App-Zeile war ein nicht nachgezogener Spiegel und wurde am P10-Rundgang-Gate berichtigt (ehrlich weiterhin: «noch nicht trainiert»).',
    },
    {
      key: 'austausch-rendern-deep-link',
      titel: 'AUSTAUSCH-Insel — Rendern-Fenster mit echtem Stations-Sprung',
      notiz: 'Stufe 3 des Rendern-Werkzeugs trägt einen echten Deep-Link zur KosmoVis-Station (PD3c-Verdrahtung) — hier nur das Fenster gezeigt, ein Klick auf «zur Station» würde die design-Islands sofort verlassen.',
    },
  ];

  // Einpassen statt Aufblasen (Gate-Fund aus ROADMAP 416, wörtlich aus
  // `rundgang-pdf-082.mts` übernommen): Skalierung = min(nutzbareBreite/
  // bildBreite, nutzbareHoehe/bildHoehe, 1.0) — nie über natürliche Grösse
  // hochskaliert.
  const DPR = 2;
  const MM_PRO_PX = 25.4 / 96; // 96 CSS-px/Zoll
  const NUTZBARE_BREITE_MM = 210 - 2 * 14; // @page-Breite minus beide Ränder
  const MAX_BILD_HOEHE_MM = 155; // lässt Titel+Notiz sicher auf derselben Seite Platz

  function bildMasse(s: Schuss): { wMm: number; hMm: number } {
    const naturalWMm = (s.w / DPR) * MM_PRO_PX;
    const naturalHMm = (s.h / DPR) * MM_PRO_PX;
    const scale = Math.min(NUTZBARE_BREITE_MM / naturalWMm, MAX_BILD_HOEHE_MM / naturalHMm, 1.0);
    return { wMm: naturalWMm * scale, hMm: naturalHMm * scale };
  }

  const seiten = flaechen
    .map((f) => {
      const shot = shots[f.key];
      const { wMm, hMm } = shot
        ? bildMasse(shot)
        : { wMm: NUTZBARE_BREITE_MM, hMm: 40 };
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
  </style></head><body>
    <div class="titel"><h1>KosmoOrbit v0.8.3 „Wissensfundament" — Rundgang</h1>
      <p>KosmoData-Ausbau (BM25-geteilter Referenzindex, [Qn]-Belege im Chat, RefKarten, Import eigener Referenzen) + Island §8-Werkzeuge (Öffnung/Messen/Kommentar als echte Kernel-Entitäten) + iPad-Polish (Popup-Klammerung, optionale Zwei-Finger-Undo-Geste, Default AUS) — dazu Skills-Fundament, Commands-SFT-Datensatz, HomeStation-LoRA-Empfänger, Flake-Fixes. 18.07.2026. ROADMAP 435–448, docs/V083-SPEZ.md.</p></div>
    ${seiten}
    <p class="rest"><b>Ehrlich offen:</b> 8 von 29 Island-Werkzeugen bleiben reine Rahmen mit sichtbarem Hinweis statt echter Wirkung (vorher 11 in v0.8.2 — Öffnung/Messen/Kommentar sind mit diesem Paket dazugekommen, die übrigen acht bleiben offene Owner-Fragen, «docs/ISLAND-UI-SPEZ.md» §8); reales Touch-Verhalten der neuen Zwei-Finger-Undo-Geste auf Hardware bleibt Owner-Prüfung ausserhalb des Containers (§8-1); 36 SVG-Goldens (35→36, +«masskette-plan.svg», golden-diszipliniert statt golden-still, s. «docs/GOLDEN-WECHSEL-083.md»). — <b>Gate:</b> release-gate wird nach diesem Build vom Release-Ablauf geprüft (volle Suiten je Batch, «docs/RELEASE-ABLAUF.md»).</p>
  </body></html>`;

  const b2 = await chromium.launch({ executablePath: exe });
  const p2 = await b2.newPage();
  await p2.setContent(html, { waitUntil: 'networkidle' });
  await p2.pdf({ path: OUT, format: 'A4', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
  await b2.close();
  // eslint-disable-next-line no-console
  console.log(`\nRundgang-PDF → ${OUT}`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
