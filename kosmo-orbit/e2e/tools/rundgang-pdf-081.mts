/**
 * Rundgang-PDF «0.8.1 — Vollausbau» — visueller Rundgang durch die drei
 * Owner-Aufträge (LLM-Framework KI1–KI4, Werkzeug-Umbau, Zwei-Stufen-Popups)
 * und die sechs D-Brocken (Vollplankopf-Einzelexport, Auto-Pack-Editor,
 * Rolle/Leporello, Export-Hub/KosmoPackage, .kxp/KosmoTrust, Orbit-Hub/
 * Companion/Nutzungszeit) — ROADMAP 394–416. Muster `rundgang-pdf-078.mts`
 * (Screenshots der laufenden App → A4-PDF, EIN Build/Preview, kein Vorher/
 * Nachher-Vergleich). Die Klick-Choreografie je Szene ist wörtlich aus den
 * jeweiligen Paket-Specs übernommen (`e2e/tools/p4-081-shots.mts`,
 * `e2e/tools/p5b-081-shots.mts`, `e2e/kxp-trust.spec.ts`,
 * `e2e/export-hub-kosmopackage.spec.ts`, `e2e/auto-pack-editor.spec.ts`,
 * `e2e/rolle-leporello.spec.ts`, `e2e/nutzungszeit-panel.spec.ts`,
 * `e2e/companion-responsive.spec.ts`) — keine neu erfundenen Selektoren.
 *
 * Voraussetzung: Build ist NACH dem Versions-Bump neu zu bauen und der
 * Preview-Server NEU zu starten (setsid; ein alter Preview-Prozess zeigt
 * sonst weiterhin die alte Versionsnummer im App-Kopf — `Wordmark`, s.
 * `App.tsx`, liest `__APP_VERSION__` nur beim Vite-Build aus
 * `vite.config.ts`).
 *
 * Aufruf (aus kosmo-orbit/, Preview auf $PORT, Standard 5174):
 *   KOSMO_E2E_PORT=5174 PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium \
 *     npx tsx e2e/tools/rundgang-pdf-081.mts
 *
 * 11 Szenen: Werkzeugzeile neu, EntwurfsDock mit Skizze, NavLeiste links
 * unten, Zwei-Stufen kompakt (Kennzahlen) + offen (Draw), Auto-Pack-Editor,
 * KosmoTrust-Viewer, KosmoPackage-Hub, Rolle mit Faltlinien, Nutzungszeit-
 * Panel, Companion mobil.
 */
import { chromium, type Page } from 'playwright-core';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { waehleOption } from '../helfer/waehleOption';

const ROOT = new URL('../../', import.meta.url).pathname;
const PORT = process.env['KOSMO_E2E_PORT'] ?? '5174';
const BASE = `http://localhost:${PORT}`;
const OUT = `${ROOT}abgabe/RUNDGANG-NOTIZEN-0.8.1.pdf`;
mkdirSync(`${ROOT}abgabe/`, { recursive: true });
const WORK = join(tmpdir(), 'kosmo-rundgang-081');
mkdirSync(join(WORK, 'bilder'), { recursive: true });
const exe = process.env['PLAYWRIGHT_CHROMIUM_PATH'] || undefined;

// Basis wie `rundgang-pdf-078.mts`/`rundgang-080b.mts`: Mock-Provider-freier
// Erststart-Marker + `presetInit`-Marker, damit die Erststart-Preset-
// Automatik keiner Szene ins Bild pfuscht (jedes Panel wird explizit über
// seinen eigenen Knopf geöffnet).
const setzeBasis = `
  localStorage.setItem('kosmo.thema','orbit');
  localStorage.setItem('kosmo.starterGuide.done','1');
  localStorage.setItem('kosmo.onboarded','1');
  localStorage.setItem('kosmo.dock.presetInit.v1','1');
`;

/** Liest Breite/Höhe direkt aus dem PNG-IHDR-Chunk (Bytes 16–24, big-endian
 *  uint32 je Feld) — kein Zusatz-Paket nötig, reines Node/Buffer. */
function pngGroesse(buf: Buffer): { w: number; h: number } {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

interface Schuss {
  b64: string;
  w: number; // Rohpixel (Screenshot bei deviceScaleFactor 2)
  h: number;
}

async function main() {
  const browser = await chromium.launch({ executablePath: exe });
  const shots: Record<string, Schuss> = {};

  async function neueSeite(viewport: { width: number; height: number } = { width: 1600, height: 1000 }): Promise<Page> {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.setDefaultTimeout(20000);
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.evaluate(setzeBasis);
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

  /** Öffnet ein docked Panel über seinen Tab, falls es kollabiert ist —
   *  Muster `p5b-081-shots.mts` (Alt-Verhalten: frische Session startet
   *  `kennzahlen` angedockt, aber eingeklappt). */
  async function sicherstellenAufgeklappt(page: Page, panelId: string): Promise<void> {
    const tab = page.locator(`[data-testid="dock-panel-${panelId}-tab"]`);
    if (await tab.count()) {
      await tab.click();
      await page.waitForTimeout(400);
    }
  }

  async function ladeTkbInDesign(page: Page): Promise<void> {
    await page.click('[data-testid="load-tkb"]');
    await page.waitForTimeout(2600);
  }

  // (1) Werkzeugzeile neu — P4 (ROADMAP 401): eine feste Hauptzeile + neue
  // Kontextzeilen-Gruppe `leiste-gruppe-schnitt` statt der alten
  // 2-3-zeiligen Wrap-Leiste.
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-design"]');
    await page.click('[data-testid="view-2d"]');
    await page.locator('[data-testid="design-werkzeugleiste-haupt"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="leiste-gruppe-schnitt"]').waitFor({ state: 'visible' }).catch(() => {});
    await schuss('werkzeugzeile', page, '[data-testid="design-werkzeugleiste"]');
    await page.close();
  }

  // (2) EntwurfsDock mit Skizze — P4 (§1.1): neuer `tool-skizze`-Knopf in
  // der unteren Rail-Reihe, neben Draw/Vis/Publish/Prepare.
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-design"]');
    await page.locator('[data-testid="entwurf-dock"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="tool-skizze"]').waitFor({ state: 'visible' });
    await schuss('entwurfsdock', page, '[data-testid="entwurf-dock"]');
    await page.close();
  }

  // (3) NavLeiste links unten — P4 (§1.4): neue Position `left:12,bottom:50`,
  // Statuszeile + EntwurfsDock im selben Bild als Kollisionsbeleg.
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-design"]');
    await page.click('[data-testid="nav-fit"]');
    await page.waitForTimeout(300);
    await schuss('navleiste', page);
    await page.close();
  }

  // (4+5) Zwei-Stufen-Popups — P5a–c (ROADMAP 403–405): KennzahlenPanel
  // (Pilot) in der Kompakt-Stufe (nur Kopf + Kernkennzahl) und DrawPanel in
  // der Offen-Stufe (KTabs-Durchklick-Menü sichtbar).
  {
    const page = await neueSeite();
    await ladeTkbInDesign(page);

    await sicherstellenAufgeklappt(page, 'kennzahlen');
    const kennzahlen = page.locator('[data-testid="kennzahlen"]');
    await kennzahlen.waitFor({ state: 'visible' });
    await page.click('[data-testid="kennzahlen-umschalten"]').catch(() => {});
    await schuss('zwei-stufen-kompakt', page, '[data-testid="kennzahlen"]');

    await page.click('[data-testid="draw-toggle"]').catch(() => {});
    await sicherstellenAufgeklappt(page, 'drawOffen');
    const drawPanel = page.locator('[data-testid="draw-panel"]');
    await drawPanel.waitFor({ state: 'visible' });
    await page.locator('[data-testid="draw-tab-mengen"]').waitFor({ state: 'visible' }).catch(() => {});
    await schuss('zwei-stufen-offen', page, '[data-testid="draw-panel"]');
    await page.close();
  }

  // (6) Auto-Pack-Editor — P12 (ROADMAP 410): echte Vorschau derselben
  // `schlageBlattBelegungVor()`-Ableitung, die «Blatt füllen» auch ohne
  // Editor benutzt.
  {
    const page = await neueSeite();
    await ladeTkbInDesign(page);
    await page.evaluate(() => (window as unknown as { __kosmo: { open: (s: string) => void } }).__kosmo.open('publish'));
    await page.waitForSelector('[data-testid="publish-werkzeugleiste"]');
    await page.click('[data-testid="add-sheet"]');
    await page.waitForSelector('[data-testid="sheet-canvas"]');
    await page.click('[data-testid="publish-autopack"]');
    await page.waitForSelector('[data-testid="dock-panel-autopack"]');
    const autopack = page.locator('[data-testid="autopack-panel"]');
    await autopack.waitFor({ state: 'visible' });
    await page.locator('[data-testid="autopack-vorschau-liste"]').waitFor({ state: 'visible' }).catch(() => {});
    await schuss('autopack', page, '[data-testid="autopack-panel"]');
    await page.close();
  }

  // (7) KosmoTrust-Viewer — P11 (ROADMAP 411): .kxp exportieren, echt
  // herunterladen, read-only wieder öffnen, Trust-Status + Manifest zeigen.
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-publish"]');
    await page.click('[data-testid="add-sheet"]');
    await page.locator('[data-testid="sheet-0"]').waitFor({ state: 'visible' });
    await page.getByLabel('Zur Zentrale').click();
    await page.click('[data-testid="module-trust"]');
    await page.click('[data-testid="kxp-export-oeffnen"]');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="kxp-export-bestaetigen"]'),
    ]);
    const kxpPfad = await download.path();
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-testid="kxp-oeffnen"]')]);
    await chooser.setFiles(kxpPfad!);
    await page.locator('[data-testid="kxp-viewer"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="kxp-trust-status"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="kxp-grenze-hinweis"]').waitFor({ state: 'visible' }).catch(() => {});
    await schuss('kxp-trust', page);
    await page.close();
  }

  // (8) KosmoPackage-Hub — P14 (ROADMAP 412): sechs reale Exportformate +
  // .kxp, ehrlicher Status je Kachel, keine 27-Format-Kachel-Wand.
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-paket"]');
    await page.locator('[data-testid="paket-werkzeugleiste"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="paket-titel"]').waitFor({ state: 'visible' });
    await schuss('paket-hub', page, undefined, { fullPage: true });
    await page.close();
  }

  // (9) Rolle mit Faltlinien — P13 (ROADMAP 413): neues Format 1600×594mm,
  // Leporello-Knicklinien im Plankopf-Framework.
  {
    const page = await neueSeite();
    await page.click('[data-testid="load-tkb"]');
    await page.waitForTimeout(1200);
    await page.evaluate(() => (window as unknown as { __kosmo: { open: (s: string) => void } }).__kosmo.open('publish'));
    await page.waitForSelector('[data-testid="publish-werkzeugleiste"]');
    await waehleOption(page, 'new-sheet-format', 'Rolle');
    await page.click('[data-testid="add-sheet"]');
    await page.waitForSelector('[data-testid="sheet-canvas"]');
    await page.locator('[data-testid="sheet-canvas"] g[data-teil="leporello"]').waitFor({ state: 'attached' }).catch(() => {});
    await schuss('rolle-leporello', page, '[data-testid="sheet-canvas"]');
    await page.close();
  }

  // (10) Nutzungszeit-Panel — P15 (ROADMAP 414): echte Klickgewichte aus
  // `kosmo.adaption.v1`, ehrlich getrennt nach genutzt/nie genutzt/nicht
  // separat erfasst.
  {
    const page = await neueSeite();
    await page.click('[data-testid="module-design"]');
    await page.click('[data-testid="dock-vis"]');
    await page.locator('[data-testid="vis-auto-kamera"]').waitFor({ state: 'visible' });
    await page.click('[data-testid="einstellungen-oeffnen"]');
    await page.locator('[data-testid="einstellungen-nutzungszeit"]').waitFor({ state: 'visible' });
    await schuss('nutzungszeit', page, '[data-testid="einstellungen-nutzungszeit"]');
    await page.close();
  }

  // (11) Companion mobil — P15 (ROADMAP 414): responsives Kartenlayout bei
  // 375px, 4er-Dock touch-tauglich (>=44px).
  {
    const page = await neueSeite({ width: 375, height: 812 });
    await page.goto(`${BASE}/#companion`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(setzeBasis);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="companion"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="companion-dock"]').waitFor({ state: 'visible' }).catch(() => {});
    await schuss('companion-mobil', page, undefined, { fullPage: true });
    await page.close();
  }

  await browser.close();

  const flaechen = [
    {
      key: 'werkzeugzeile',
      titel: '401 · Werkzeug-Umbau: die Zeichenzeile neu geordnet',
      notiz: 'Eine feste Hauptzeile plus die neue Kontextzeilen-Gruppe „leiste-gruppe-schnitt" (Skizze/Schnitt-Werkzeuge sauber abgesetzt statt eingemischt) — Teil des Owner-Auftrags „Werkzeuge umordnen".',
    },
    {
      key: 'entwurfsdock',
      titel: '401 · EntwurfsDock mit neuem „Skizze"-Knopf',
      notiz: 'Der EntwurfsDock-Rail bekommt einen eigenen „tool-skizze"-Knopf neben Draw/Vis/Publish/Prepare — die 3D-Skizzenfunktion war bisher nur über Umwege erreichbar.',
    },
    {
      key: 'navleiste',
      titel: '401 · NavLeiste an neuer Position links unten',
      notiz: 'Die schwebende Navigationsleiste sitzt jetzt links unten statt mittig — Statuszeile und EntwurfsDock bleiben im selben Bild kollisionsfrei sichtbar.',
    },
    {
      key: 'zwei-stufen-kompakt',
      titel: '403–405 · Zwei-Stufen-Popups: KennzahlenPanel, Stufe „kompakt"',
      notiz: 'Owner-Auftrag „Zwei-Stufen-Popups": nur Kopf mit Titel + einer Kernkennzahl (NGF), kein Körper — eine dritte Solver-Grössenstufe zwischen offen und eingeklappt.',
    },
    {
      key: 'zwei-stufen-offen',
      titel: '403–405 · Zwei-Stufen-Popups: DrawPanel, Stufe „offen"',
      notiz: 'Dasselbe Bauteil-Paar in der Offen-Stufe: KTabs-Durchklick-Menü (Modellbaum/Mengen/Ausmass) ersetzt die alten KButton-Ad-hoc-Tabs.',
    },
    {
      key: 'autopack',
      titel: '410 · Auto-Pack-Layout-Editor („Intelligentes Planlayout")',
      notiz: 'Echte, umordenbare Vorschau derselben Ableitung, die „Blatt füllen" auch ohne Editor benutzt — kein „KI-Layout", eine benannte Heuristik, real nachgerechnet.',
    },
    {
      key: 'kxp-trust',
      titel: '411 · KosmoTrust — .kxp-Viewer + Freigabe-Gerüst',
      notiz: 'Ein echt exportiertes, heruntergeladenes und wieder read-only importiertes .kxp-Paket mit Trust-Status und Manifest — die Konten-/HomeStation-Grenze steht wörtlich im UI (unsigniert).',
    },
    {
      key: 'paket-hub',
      titel: '412 · KosmoPackage — Export-Hub-Vollausbau',
      notiz: 'Bündelt genau die sechs real existierenden Exportformate (PDF/SVG/DXF/IFC/Splat/Büro-Logo) + .kxp — bewusst keine 27-Format-Kachel-Wand, ehrlicher Status je Kachel.',
    },
    {
      key: 'rolle-leporello',
      titel: '413 · Rolle 1600×594mm mit Leporello-Faltung',
      notiz: 'Neues Blattformat „Rolle" (594mm Breite wie A1, 1600mm Standardlänge) mit vollem Plankopf-Framework und Leporello-Knicklinien statt DIN-824-Eckstrichen.',
    },
    {
      key: 'nutzungszeit',
      titel: '414 · Nutzungszeit-Panel in den Einstellungen',
      notiz: 'Echte Klickgewichte aus dem bestehenden Adaptions-Speicher (kosmo.adaption.v1) — drei ehrliche Zustände je Station: genutzt mit Gewicht, noch nie genutzt, nicht separat erfasst. Keine erfundene Aufenthaltsdauer.',
    },
    {
      key: 'companion-mobil',
      titel: '414 · Mobile Companion bei 375px',
      notiz: 'Zwei-Spalten-Layout stapelt sich bei Telefonbreite, das 4er-Dock bleibt touch-tauglich (≥44px). Reales Touch-Verhalten auf Hardware bleibt Owner-Prüfung (deklarierte Grenze im UI).',
    },
  ];

  // Einpassen statt Aufblasen (Gate-Fund: `width:100%` ohne Höhen-Deckel
  // liess schmale/hohe Element-Screenshots — z.B. das 72×528px-EntwurfsDock
  // — auf Seitenbreite hochskalieren, sprengte die Seitenhöhe und riss
  // Überschrift/Bild auseinander). Explizite Ziel-Grösse je Bild statt
  // reinem CSS-`max-*`-Vertrauen — deterministisch, Chromium-PDF-sicher:
  // Skalierung = min(nutzbareBreite/bildBreite, nutzbareHoehe/bildHoehe,
  // 1.0) — nie über natürliche Grösse hochskaliert, schmale Elemente bleiben
  // klein statt verzerrt aufgeblasen. Rohpixel → durch `DPR` geteilt (Shots
  // liefen mit `deviceScaleFactor:2`), macht daraus die tatsächliche CSS-
  // Darstellungsgrösse, bevor gegen die Seiten-Nutzfläche geprüft wird.
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
    <div class="titel"><h1>KosmoOrbit v0.8.1 „Vollausbau" — Rundgang</h1>
      <p>Drei Owner-Aufträge (LLM-Framework, Werkzeug-Umbau, Zwei-Stufen-Popups) + sechs D-Brocken (17.07.2026). ROADMAP 394–416.</p></div>
    ${seiten}
    <p class="rest"><b>Ehrlich offen:</b> GPU-Telemetrie zeigt im Container mangels echter GPU „nicht verfügbar" statt einer erfundenen Zahl; die Tauri-Zweitfenster-Schliessen-Choreografie bleibt eine Rust-Baustelle; reales Touch-Verhalten auf Mobil-Hardware sowie eine echte Mehrbenutzer-Freigabe für KosmoTrust bleiben Owner-Aktionen ausserhalb des Containers; der AF-Stempel ist wegen eines Konflikts mit einem eingefrorenen Golden-Test formal vertagt. Eine vier Releases alte Regression (Volumenstudien-Panel unter der Geschossleiste, seit v0.7.8) ist behoben. — <b>Gate:</b> release-gate Exit 0 (2530 Unit-Tests über 7 Workspaces: Kernel 964 · App 1217 · KI 189 · Contracts 28 · Data 29 · Lizenz 8 · UI 95; Typecheck 8 Workspaces; svg-qa 35/0; secret-scan grün).</p>
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
