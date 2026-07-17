/**
 * Rundgang-PDF «0.8.2 — Selbstverbesserung» — visueller Rundgang durch die
 * neue Island-Standard-Oberfläche (PD-Strom, ROADMAP 423–434), die
 * Rollen-Staffelung + den Kuratier-Flow (P6, ROADMAP 426) und den
 * LoRA-Doppel-Strang (Trainingspaket + Signal-Export, P3/P5, ROADMAP
 * 421/424). Muster `rundgang-pdf-081.mts` (Screenshots der laufenden App →
 * A4-PDF, EIN Build/Preview, kein Vorher/Nachher-Vergleich, dieselbe
 * `pngGroesse`/`bildMasse`-Skalierungslogik gegen aufgeblasene Element-
 * Screenshots). Die Klick-Choreografie je Szene ist wörtlich aus den
 * jeweiligen Paket-Specs übernommen (`e2e/island-ui.spec.ts`,
 * `e2e/island-inhalte-zeichnen-ansicht.spec.ts`,
 * `e2e/staffelung-kuratier.spec.ts`, `e2e/train-paket-schnueren.spec.ts`,
 * `e2e/signal-erfassung.spec.ts`) — keine neu erfundenen Selektoren.
 *
 * Voraussetzung: Build ist NACH dem Versions-Bump neu zu bauen und der
 * Preview-Server NEU zu starten (setsid; ein alter Preview-Prozess zeigt
 * sonst weiterhin die alte Versionsnummer im App-Kopf).
 *
 * Aufruf (aus kosmo-orbit/, Preview auf $PORT, Standard 5174):
 *   KOSMO_E2E_PORT=5174 PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium \
 *     npx tsx e2e/tools/rundgang-pdf-082.mts
 *
 * 11 Szenen: Island-Default (Papier + Kosmos), ZEICHNEN-Leiste offen,
 * Wand Stufe 2 (Popup) + Stufe 3 (Fenster), Kosmo-Orb-Karte,
 * Manuell-Umschalter, TrainWorkspace (Adapter-Statustafel + Kuratier-Flow),
 * Rollen-Badge im Chat, Signal-Export-Dialog.
 */
import { chromium, type Page } from 'playwright-core';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const PORT = process.env['KOSMO_E2E_PORT'] ?? '5174';
const BASE = `http://localhost:${PORT}`;
const OUT = `${ROOT}abgabe/RUNDGANG-NOTIZEN-0.8.2.pdf`;
mkdirSync(`${ROOT}abgabe/`, { recursive: true });
const WORK = join(tmpdir(), 'kosmo-rundgang-082');
mkdirSync(join(WORK, 'bilder'), { recursive: true });
const exe = process.env['PLAYWRIGHT_CHROMIUM_PATH'] || undefined;

// Erststart-Marker (Onboarding/StarterGuide übersprungen, Dock-Preset-
// Automatik ausgeschaltet) — Muster `rundgang-pdf-081.mts`. Kein
// `kosmo.designOberflaeche`-Eintrag: der echte Produktions-Default `'island'`
// (ROADMAP 427) soll unverfälscht zu sehen sein.
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
 *  `rundgang-pdf-081.mts` (ROADMAP 416). */
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

  /** Hover statt Klick — `.click()` bewegt die Maus zuerst auf die Pill, was
   *  `onMouseEnter` (`IslandShell.tsx`) SCHON auslöst (Muster
   *  `island-ui.spec.ts`/`island-inhalte-zeichnen-ansicht.spec.ts`). */
  async function oeffneInsel(page: Page, island: string): Promise<void> {
    await page.hover(`[data-testid="island-${island}-root"]`);
    await page.locator(`[data-testid="island-${island}-leiste"]`).waitFor({ state: 'visible' });
  }

  /** Zeichnet eine Wand mit dem Standard-Aufbau «AW Beton 36» und wählt sie
   *  aus — über den bestehenden Test-Hook `window.__kosmo`, exaktes Muster
   *  `island-inhalte-zeichnen-ansicht.spec.ts#zeichneUndWaehleWand`. */
  async function zeichneUndWaehleWand(page: Page): Promise<void> {
    await page.evaluate(() => {
      const k = window.__kosmo;
      const st = k.state();
      const storeyId = st.activeStoreyId!;
      const aufbau1 = st.doc.byKind('assembly').find((a) => a.name === 'AW Beton 36')!;
      const ergebnis = k.run('design.wandZeichnen', {
        storeyId,
        a: { x: 0, y: 0 },
        b: { x: 4000, y: 0 },
        assemblyId: aufbau1.id,
      });
      st.select([ergebnis.patches[0]!.id]);
    });
  }

  // (1+2) Island-Default beide Farbwelten — PD2 Default-Flip (ROADMAP 427):
  // Viewer + vier Islands + Ansichts-Info + Stationen-Orb + Kosmo-Orb, KEIN
  // klassisches Chrome (kein Kopfbalken — PD4, ROADMAP 432).
  for (const thema of ['paper', 'orbit'] as const) {
    const page = await neueSeite({ thema });
    await page.click('[data-testid="module-design"]');
    await page.locator('[data-testid="island-zeichnen-pill"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="kosmo-orb-knopf"]').waitFor({ state: 'visible' });
    await schuss(`island-default-${thema}`, page);
    await page.close();
  }

  // (3) ZEICHNEN-Leiste offen — Stufe 1 (Hover), 11 Werkzeuge sichtbar.
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-design"]');
    await oeffneInsel(page, 'zeichnen');
    await schuss('zeichnen-leiste', page, '[data-testid="island-zeichnen-leiste"]');
    await page.close();
  }

  // (4+5) Wand Stufe 2 (Mini-Popup) + Stufe 3 (Einstellungsfenster) —
  // PD3a-Referenzmuster (ROADMAP 429): Aufbau/Dicke/Tragend der echten,
  // ausgewählten Wand.
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-design"]');
    await zeichneUndWaehleWand(page);
    await oeffneInsel(page, 'zeichnen');
    await page.click('[data-testid="island-werkzeug-wand"]');
    await page.locator('[data-testid="island-wand-popup"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="island-wand-dicke"]').waitFor({ state: 'visible' });
    await schuss('wand-stufe2', page, '[data-testid="island-wand-popup"]');

    await page.click('[data-testid="island-werkzeug-wand"]');
    await page.locator('[data-testid="island-wand-fenster"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="island-wand-aufbau-katalog"]').waitFor({ state: 'visible' });
    await schuss('wand-stufe3', page, '[data-testid="island-wand-fenster"]');
    await page.close();
  }

  // (6) Kosmo-Orb-Karte — PD4/PD5 (ROADMAP 432/434): echter animierter
  // Shell-Orb-Kern statt statischem Glyph, echter Companion-Vorschlag.
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-design"]');
    await page.click('[data-testid="kosmo-orb-knopf"]');
    await page.locator('[data-testid="kosmo-orb-karte"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="kosmo-orb-karte-eingabe"]').waitFor({ state: 'visible' });
    await schuss('kosmo-orb-karte', page, '[data-testid="kosmo-orb-karte"]');
    await page.close();
  }

  // (7) Manuell-Umschalter — die vollständige Alt-Oberfläche bleibt einen
  // Klick entfernt vollwertig erhalten (ROADMAP 427).
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-design"]');
    await oeffneInsel(page, 'austausch');
    await page.click('[data-testid="island-werkzeug-manuell"]');
    await page.locator('[data-testid="design-werkzeugleiste"]').waitFor({ state: 'visible' });
    await schuss('manuell-umschalter', page);
    await page.close();
  }

  // (8) TrainWorkspace — Adapter-Statustafel «Trainingspaket schnüren» (P5,
  // ROADMAP 421).
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-train"]');
    await page.locator('[data-testid="train-werkzeugleiste"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="train-adapter-registry"]').waitFor({ state: 'visible' });
    await schuss('train-paket', page, undefined, { fullPage: true });
    await page.close();
  }

  // (9) TrainWorkspace — Kuratier-Flow: aussortierte Journal-Einträge MIT
  // Grund (P6, ROADMAP 426). Fixture-Muster `staffelung-kuratier.spec.ts`.
  {
    const page = await neueSeite({
      localStorage: {
        'kosmo.lernjournal': JSON.stringify([
          { ts: '2026-07-01T08:00:00.000Z', sentiment: 'schlecht', context: 'Wand ohne Aufbau vorgeschlagen' },
          { ts: '', sentiment: 'gut', context: 'Ohne Zeitstempel erfasst' },
          {
            ts: '2026-07-02T09:00:00.000Z',
            sentiment: 'gut',
            context: 'Fenster korrekt platziert',
            note: 'Immer Fensterbank ab 900mm.',
          },
        ]),
      },
    });
    await page.click('[data-testid="module-train"]');
    await page.locator('[data-testid="train-kuratier-verworfen"]').waitFor({ state: 'visible' });
    await schuss('train-kuratier', page, '[data-testid="train-kuratier-verworfen"]');
    await page.close();
  }

  // (10) Rollen-Badge im Chat — automatische Aufgabenklassen-Klassifikation,
  // ehrlich als «Ein-Modell-Betrieb» benannt (P6, ROADMAP 426).
  {
    const page = await neueSeite({ localStorage: { 'kosmo.llm': JSON.stringify({ provider: 'mock' }), 'kosmo.panelOffen': '1' } });
    await page.click('[data-testid="module-design"]');
    await page.fill('[data-testid="kosmo-input"]', 'Zeichne eine Wand von 0,0 bis 6,0');
    await page.click('[data-testid="kosmo-send"]');
    const badge = page.locator('[data-testid="rollen-badge-meister"]');
    await badge.waitFor({ state: 'visible', timeout: 15000 });
    await badge.scrollIntoViewIfNeeded();
    await schuss('rollen-badge', page, '[data-testid="kosmo-panel"]');
    await page.close();
  }

  // (11) Signal-Export-Dialog — Zahlen je Art VOR dem Download, strikt
  // `visibility==='public'`-gefiltert (P3, ROADMAP 424).
  {
    const page = await neueSeite({ localStorage: { 'kosmo.llm': JSON.stringify({ provider: 'mock' }), 'kosmo.panelOffen': '1' } });
    await page.click('[data-testid="module-design"]');
    await page.fill('[data-testid="kosmo-input"]', 'Zeichne eine Wand von 0,0 bis 6,0');
    await page.click('[data-testid="kosmo-send"]');
    await page.locator('[data-testid="reject-proposal"]').waitFor({ state: 'visible', timeout: 15000 });
    await page.click('[data-testid="reject-proposal"]');
    await page.locator('[data-testid="reject-grund-eingabe"]').waitFor({ state: 'visible' });
    await page.fill('[data-testid="reject-grund-input"]', 'Wandstärke falsch, sollte mit 200mm-Aufbau stehen');
    await page.click('[data-testid="reject-grund-bestaetigen"]');
    await page.locator('[data-testid="proposal-card"]').waitFor({ state: 'hidden' }).catch(() => {});

    await page.click('[aria-label="Einstellungen"]');
    await page.click('[data-testid="journal-export"]');
    await page.locator('[data-testid="kosmo-signal-export-dialog"]').waitFor({ state: 'visible' });
    await schuss('signal-export-dialog', page);
    await page.close();
  }

  await browser.close();

  const flaechen = [
    {
      key: 'island-default-paper',
      titel: '423–427 · Neue Standard-Oberfläche: Islands, Farbwelt Papier',
      notiz: 'Owner-Nachtrag «Kosmodesign_UI_Vereinfachung»: vier schwebende Islands (Zeichnen/Ansicht/Projekt/Austausch) plus Ansichts-Info, Stationen-Orb und Kosmo-Orb ersetzen ab jetzt als Default die klassische Werkzeugleiste — kein Kopfbalken mehr im Bild.',
    },
    {
      key: 'island-default-orbit',
      titel: '423–427 · Dieselbe Island-Oberfläche, Farbwelt Kosmos',
      notiz: 'Beide Farbwelten tragen exakt dieselbe Struktur (Papier-ist-Papier-Invarianz) — die Pille bleibt bewusst dunkles Glas auch auf hellem Papier.',
    },
    {
      key: 'zeichnen-leiste',
      titel: '425/429 · ZEICHNEN-Insel, Stufe 1 (Leiste)',
      notiz: 'Ein Hover öffnet die Insel von der Pille zur vollen Werkzeugleiste — 11 Zeichenwerkzeuge, jedes bis zur Stufe 3 (Einstellungsfenster) ausgebaut.',
    },
    {
      key: 'wand-stufe2',
      titel: '429 · Wand-Werkzeug, Stufe 2 (Mini-Popup)',
      notiz: 'Referenzmuster für alle Island-Werkzeuge: Aufbau/Dicke/Tragend der tatsächlich ausgewählten Wand, live aus dem echten Doc abgeleitet, kein Platzhaltertext.',
    },
    {
      key: 'wand-stufe3',
      titel: '429 · Wand-Werkzeug, Stufe 3 (Einstellungsfenster)',
      notiz: 'Zweiter Klick eskaliert zum vollen Einstellungsfenster mit echtem Aufbau-Katalog — ein Klick auf einen anderen Aufbau wechselt ihn ECHT über den bestehenden Command-Weg (Undo/Sync gelten).',
    },
    {
      key: 'kosmo-orb-karte',
      titel: '432/434 · Kosmo-Orb — echter animierter Companion-Kern',
      notiz: 'Der Island-Kosmo-Orb ist kein statisches Glyph, sondern derselbe Shell-Orb-Kern wie das bisherige Kosmo-Symbol (Wiederverwendung) — mit echtem Companion-Vorschlag, zwei Aktions-Chips und einer Eingabezeile.',
    },
    {
      key: 'manuell-umschalter',
      titel: '427 · Manuell-Umschalter — die volle Alt-Oberfläche bleibt erhalten',
      notiz: 'Ein Klick auf «Manuell» in der AUSTAUSCH-Insel schaltet auf die vollständige, unveränderte Werkzeugleiste zurück — der Rückweg («Zurück») führt genauso einfach in den Island-Modus.',
    },
    {
      key: 'train-paket',
      titel: '421 · TrainWorkspace — «Trainingspaket schnüren»',
      notiz: 'Die Adapter-Statustafel zeigt alle sechs Registry-Zeilen mit ehrlichem Datenstand (kosmo-buero WÄCHST, grundriss REPRODUZIERBAR, commands/dpo LEER, whisper-ch/werkplan WARTET) — der Manifest-Export hasht die Quelldateien real.',
    },
    {
      key: 'train-kuratier',
      titel: '426 · TrainWorkspace — Kuratier-Flow mit Grund',
      notiz: 'Aussortierte Journal-Einträge zeigen ihren Grund (Notiz fehlt / Zeitstempel fehlt) statt einfach zu verschwinden — der Fake-Probelauf danach bleibt sichtbar `fake: true`, kein echtes Training vorgetäuscht.',
    },
    {
      key: 'rollen-badge',
      titel: '426 · Rollen-Badge — automatische Aufgabenklassen-Klassifikation',
      notiz: 'Jede Kosmo-Antwort trägt jetzt «KOSMO-MEISTER/-LEITER/-ZEICHNER» — ehrlich mit «Ein-Modell-Betrieb» beschriftet, solange keine echte Rollen-Modell-Karte konfiguriert ist. Kein vorgetäuschter Modellwechsel.',
    },
    {
      key: 'signal-export-dialog',
      titel: '424 · Signal-Export-Dialog — Zahlen VOR dem Download',
      notiz: 'Der neue Export-Dialog zeigt die Signal-Zahlen je Art, bevor die Datei entsteht, und filtert strikt auf `visibility==\'public\'` (§4.4) — statt des alten ungefilterten Roh-Dumps.',
    },
  ];

  // Einpassen statt Aufblasen (Gate-Fund aus ROADMAP 416, `rundgang-pdf-081.
  // mts` übernommen wörtlich): Skalierung = min(nutzbareBreite/bildBreite,
  // nutzbareHoehe/bildHoehe, 1.0) — nie über natürliche Grösse hochskaliert.
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
    <div class="titel"><h1>KosmoOrbit v0.8.2 „Selbstverbesserung" — Rundgang</h1>
      <p>PD-Strom (Island-Standard-Oberfläche) + W-Strom (Claude-Lernschleife, LoRA-Datenraum, Signal-Erfassung, Staffelung) — 17.07.2026. ROADMAP 417–434.</p></div>
    ${seiten}
    <p class="rest"><b>Ehrlich offen:</b> 11 von 29 Island-Werkzeugen sind reine Rahmen mit sichtbarem Hinweis statt echter Wirkung (Öffnung, Messen, Kommentare, Peers-Anzeige u.a. — offene Owner-Fragen «docs/ISLAND-UI-SPEZ.md» §8); der «kosmo-zeichner-commands»-Trainingsdatensatz ist bewusst leer; reales Touch-Verhalten auf Hardware bleibt Owner-Prüfung ausserhalb des Containers; der AF-Stempel (C-31) ist formell geschlossen (golden-stille Version). — <b>Gate:</b> release-gate Exit 0 (2736 Unit-Tests über 7 Workspaces: Kernel 964 · App 1362 · KI 239 · Contracts 39 · Data 29 · Lizenz 8 · UI 95; Typecheck 8 Workspaces; svg-qa 35/0 byte-gleich; secret-scan grün; SFT-Validator grün).</p>
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
