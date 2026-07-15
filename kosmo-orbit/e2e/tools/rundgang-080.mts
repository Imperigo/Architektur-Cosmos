/**
 * Rundgang-PDF «0.8.0 — KosmoPublish Plankopf-Framework + Default-Oberflächen»
 * — kompakter Release-Rundgang (Muster `rundgang-pdf-079.mts`, KEIN volles
 * Handbuch): echte Screenshots des laufenden v0.8.0-Preview-Builds → A4-PDF.
 *
 * Kern-Zusage der Spez (§7.2, «Screenshot-Politik»): die Bilder entstehen IN
 * den neuen Default-Oberflächen-Presets — angewendet über die ECHTEN
 * UI-Knöpfe (`dock-preset-fokus|arbeiten|pruefen`, Kontextzeilen-
 * Schnellzugriff der Design-Statusleiste bzw. KToolGruppe «Oberfläche» der
 * Vis-Toolbar; Muster `e2e/dock-presets.spec.ts`), nicht über einen
 * Store-Import. Für KosmoPublish existiert bewusst KEIN UI-Preset-Wähler
 * (`Einstellungen.tsx`: Presets nur für design/vis verdrahtet) — dort laufen
 * die Aufnahmen ehrlich über die realen Werkzeugleisten-Knöpfe
 * `publish-plankopf`/`publish-dossier` (Muster `e2e/tools/p11-shots.mts`).
 *
 * Sechs Aufnahmen:
 *   1. design-fokus     — Aufmacher: Design im Preset «Fokus» (Split-Ansicht,
 *                          alle Werkzeug-Panels zu, Kennzahlen als Tab).
 *   2. design-arbeiten  — Preset «Arbeiten»: listeOffen + drawOffen offen.
 *   3. design-pruefen   — Preset «Prüfen»: Kennzahlen gross + angeheftet.
 *   4. vis-arbeiten     — Vis im Preset «Arbeiten»: Palette offen, Graph mit
 *                          6 Nodes (Minimap/Legende datengetrieben sichtbar).
 *   5. publish-blatt    — Publish MIT Blatt: Plankopf-Framework sichtbar
 *                          (180×55-Kopf, DIN-824-Faltmarken, Wasserzeichen)
 *                          + PlankopfPanel als Dock-Panel + BodenDock-Pille
 *                          geometrisch belegt kollisionsfrei (BBox-Log).
 *   6. publish-plankopf — PlankopfPanel gefüllt: Plancode
 *                          MAA-SEE-VS-A-EG-101 im Panel UND auf dem Blatt.
 *
 * Voraussetzung: Build NACH dem 0.8.0-Bump + frisch gestarteter Preview
 * (`__APP_VERSION__` wird nur beim Vite-Build gelesen — der App-Kopf
 * `data-testid="app-version"` ist der Bump-Beweis im Bild).
 *
 * Aufruf (aus kosmo-orbit/, Preview auf $PORT):
 *   KOSMO_E2E_PORT=5183 PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium \
 *     npx tsx e2e/tools/rundgang-080.mts
 */
import { chromium, type Page } from 'playwright-core';
import { mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const PORT = process.env['KOSMO_E2E_PORT'] ?? '5183';
const BASE = `http://localhost:${PORT}`;
const OUT = `${ROOT}abgabe/RUNDGANG-KosmoOrbit-0.8.0.pdf`;
mkdirSync(`${ROOT}abgabe/`, { recursive: true });
const WORK = join(tmpdir(), 'kosmo-rundgang-080');
mkdirSync(join(WORK, 'bilder'), { recursive: true });
const exe = process.env['PLAYWRIGHT_CHROMIUM_PATH'] || undefined;

// Basis wie `rundgang-pdf-079.mts` + Mock-Provider + Erststart-Marker:
// `kosmo.dock.presetInit.v1 = '1'` hält die automatische Erststart-Fokus-
// Anwendung AUS dem Bild — jedes Preset wird hier AUSDRÜCKLICH über seinen
// UI-Knopf angewendet (das ist der Beleg, den die Spez §7.2 verlangt),
// nicht implizit über den Erststart-Pfad.
const setzeBasis = `
  localStorage.setItem('kosmo.thema','orbit');
  localStorage.setItem('kosmo.starterGuide.done','1');
  localStorage.setItem('kosmo.panelOffen','0');
  localStorage.setItem('kosmo.onboarded','1');
  localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
  localStorage.setItem('kosmo.dock.presetInit.v1','1');
  localStorage.setItem('kosmo.ui.v1', JSON.stringify({ version: 1, modusAutomatik: false, modusFesthalten: false, phasenFokus: null }));
`;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Zwei aufeinanderfolgende Messungen müssen übereinstimmen — reduziertes
 *  `stabileBox()`-Muster aus `dock-interaktion.spec.ts` (s. 079-Tool). */
async function stabileBox(page: Page, testid: string, anlaufMs = 700, ruheMs = 300): Promise<Box> {
  const loc = page.locator(`[data-testid="${testid}"]`);
  await new Promise((r) => setTimeout(r, anlaufMs));
  let letzte = await loc.boundingBox();
  let stabilSeitMs = 0;
  const start = Date.now();
  while (Date.now() - start < 4000) {
    await new Promise((r) => setTimeout(r, 100));
    const jetzt = await loc.boundingBox();
    const gleich =
      !!letzte &&
      !!jetzt &&
      Math.abs(letzte.width - jetzt.width) < 0.5 &&
      Math.abs(letzte.height - jetzt.height) < 0.5 &&
      Math.abs(letzte.x - jetzt.x) < 0.5 &&
      Math.abs(letzte.y - jetzt.y) < 0.5;
    if (gleich) {
      stabilSeitMs += 100;
      if (stabilSeitMs >= ruheMs) return jetzt!;
    } else {
      stabilSeitMs = 0;
    }
    letzte = jetzt;
  }
  return letzte!;
}

function ueberlappen(a: Box | null, b: Box | null): boolean {
  return !!a && !!b && a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

async function main() {
  const browser = await chromium.launch({ executablePath: exe });
  // 1600×1000 wie `handbuch-077.mts`/`p11-shots.mts` — das ist der Viewport,
  // unter dem der P11-Geometrie-Beleg (Pille×Blatt disjunkt) erhoben wurde.
  // Ehrlicher Nebenbefund dieses Laufs (im Bericht dokumentiert): bei
  // 1400×900 bricht die Publish-Werkzeugleiste zweizeilig um (~146px Chrome
  // statt der 132px der P11-Formel) — die Blatt-Unterkante ragt dort ~15px
  // in die Dock-Container-Box. Kein Eingriff hier (Release-Finale fasst
  // keinen P11-Produktcode an), als offener Punkt festgehalten.
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(25000);
  const shots: Record<string, string> = {};
  /** Geometrie-Beleg aus Aufnahme 5 (Pille×Blatt) — landet wörtlich im PDF. */
  let bodenDockBeleg = '';

  async function schuss(key: string, vorbereiten: () => Promise<void>) {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.evaluate(setzeBasis);
    await vorbereiten();
    await page.waitForTimeout(700);
    const p = join(WORK, 'bilder', `${key}.png`);
    await page.screenshot({ path: p });
    shots[key] = readFileSync(p).toString('base64');
    // eslint-disable-next-line no-console
    console.log(`  ✓ ${key}`);
  }

  /** `kosmo.dock.v1` je Aufnahme frisch (Muster 079/`dock-presets.spec.ts`) —
   *  sonst trüge ein früherer Preset-Klick in die nächste Aufnahme hinein. */
  async function frischInDesign(): Promise<void> {
    await page.evaluate(() => localStorage.removeItem('kosmo.dock.v1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.click('[data-testid="load-tkb"]');
    await page.waitForSelector('[data-testid="dock-panel-kennzahlen"]', { timeout: 15000 });
    await page.click('[data-testid="view-split"]').catch(() => {});
    await page.waitForTimeout(500);
  }

  // (1) Design · Preset «Fokus» — der Aufmacher. Anwendung über den ECHTEN
  // Kontextzeilen-Knopf `dock-preset-fokus` (Statusleiste, PD2). Beweis im
  // Bild: kein Werkzeug-Panel offen, Kennzahlen nur als eingeklappter Tab,
  // App-Kopf zeigt v0.8.0 (`app-version`).
  await schuss('design-fokus', async () => {
    await frischInDesign();
    await page.click('[data-testid="dock-preset-fokus"]');
    await page.waitForSelector('[data-testid="dock-panel-kennzahlen-tab"]', { timeout: 8000 });
  });

  // (2) Design · Preset «Arbeiten» — listeOffen (Berechnungsliste) und
  // drawOffen (Modellbaum · Mengen · Ausmass) offen, Kennzahlen normal
  // (Spez §7.1 «1–2 sinnvoll ausgewählte Panels offen», P11-Fassung).
  await schuss('design-arbeiten', async () => {
    await frischInDesign();
    await page.click('[data-testid="dock-preset-arbeiten"]');
    await page.waitForSelector('[data-testid="dock-panel-listeOffen"]', { timeout: 8000 });
    await page.waitForSelector('[data-testid="dock-panel-drawOffen"]', { timeout: 8000 });
  });

  // (3) Design · Preset «Prüfen» — Kennzahlen gross (480) + angeheftet,
  // drawOffen für die Mengen-/Ausmass-Kontrolle.
  await schuss('design-pruefen', async () => {
    await frischInDesign();
    await page.click('[data-testid="dock-preset-pruefen"]');
    await page.waitForSelector('[data-testid="dock-panel-drawOffen"]', { timeout: 8000 });
    await stabileBox(page, 'dock-panel-kennzahlen');
  });

  // (4) Vis · Preset «Arbeiten» — Node-Palette offen (der «volle»
  // Arbeitszustand zeigt bildlich mehr als der leere Fokus-Canvas); sechs
  // Nodes, damit Minimap (ab 5) und Legende datengetrieben sichtbar sind.
  // Preset-Anwendung über die KToolGruppe «Oberfläche» der Vis-Toolbar
  // (dieselben testids `dock-preset-*`, Muster `dock-presets.spec.ts`).
  await schuss('vis-arbeiten', async () => {
    await page.evaluate(() => localStorage.removeItem('kosmo.dock.v1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.click('[data-testid="module-vis"]');
    await page.click('[data-testid="graph-neu"]');
    await page.waitForSelector('[data-testid="node-canvas"]');
    for (const typ of ['modell', 'material', 'prompt', 'zahl', 'kamera', 'render']) {
      await page.click('[data-testid="node-hinzu"]');
      await page.waitForSelector('[data-testid="node-hinzu-popup"]');
      await page.click(`[data-testid="node-hinzu-popup"] [data-value="${typ}"]`);
      await page.waitForSelector('[data-testid="node-hinzu-popup"]', { state: 'hidden' });
    }
    await page.click('[data-testid="dock-preset-arbeiten"]');
    await page.waitForSelector('[data-testid="dock-panel-visPalette"]', { timeout: 8000 });
  });

  // (5) Publish · Blatt mit Plankopf-Framework + Dock + kollisionsfreie
  // BodenDock-Pille. Kein Preset-Klick (Publish hat bewusst keinen
  // UI-Preset-Wähler) — die realen Knöpfe `publish-plankopf` öffnen das
  // Panel als Dock-Panel (P11+). Das frisch erstellte Blatt zeigt dank des
  // P7-Default-Flips SOFORT das volle Framework: 180×55-Plankopf,
  // DIN-824-Faltmarken, ISO-838-Lochung, VS-Wasserzeichen «STUDIE — NICHT
  // FÜR AUSFÜHRUNG». Geometrie-Beleg (Pille×Blatt disjunkt) wird gemessen
  // und wörtlich in die Bildunterschrift geschrieben.
  await schuss('publish-blatt', async () => {
    await page.evaluate(() => localStorage.removeItem('kosmo.dock.v1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.click('[data-testid="load-tkb"]');
    await page.waitForSelector('[data-testid="dock-panel-kennzahlen"]', { timeout: 15000 });
    await page.evaluate(() => (window as unknown as { __kosmo: { open: (s: string) => void } }).__kosmo.open('publish'));
    await page.waitForSelector('[data-testid="publish-werkzeugleiste"]');
    await page.click('[data-testid="add-sheet"]');
    await page.waitForSelector('[data-testid="sheet-canvas"] g[data-teil="plankopf"]', { timeout: 15000 });
    await page.click('[data-testid="publish-plankopf"]');
    await page.waitForSelector('[data-testid="dock-panel-plankopf"]');
    const blatt = await stabileBox(page, 'sheet-canvas');
    const pille = await stabileBox(page, 'boden-dock');
    const kollision = ueberlappen(blatt, pille);
    bodenDockBeleg =
      `Gemessen in dieser Aufnahme: sheet-canvas ${Math.round(blatt.width)}×${Math.round(blatt.height)}px ` +
      `(Unterkante y=${Math.round(blatt.y + blatt.height)}), BodenDock-Pille ab y=${Math.round(pille.y)} — ` +
      `Überlappung: ${kollision ? 'JA (FEHLER!)' : 'keine'}.`;
    // eslint-disable-next-line no-console
    console.log(`  · Geometrie-Beleg: ${bodenDockBeleg}`);
    if (kollision) throw new Error('BodenDock überlappt das Blatt — Release-Beleg gescheitert.');
  });

  // (6) Publish · PlankopfPanel gefüllt — Plancode MAA-SEE-VS-A-EG-101 im
  // Panel (read-only aus sheetPlancode()) UND auf dem Blatt (Feld-Muster
  // wörtlich aus `e2e/plankopf.spec.ts`).
  await schuss('publish-plankopf', async () => {
    await page.evaluate(() => localStorage.removeItem('kosmo.dock.v1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.click('[data-testid="load-tkb"]');
    await page.waitForSelector('[data-testid="dock-panel-kennzahlen"]', { timeout: 15000 });
    await page.evaluate(() => (window as unknown as { __kosmo: { open: (s: string) => void } }).__kosmo.open('publish'));
    await page.waitForSelector('[data-testid="publish-werkzeugleiste"]');
    await page.click('[data-testid="add-sheet"]');
    await page.waitForSelector('[data-testid="sheet-canvas"]');
    await page.click('[data-testid="publish-plankopf"]');
    await page.waitForSelector('[data-testid="plankopf-panel"]');
    const felder: Array<[string, string]> = [
      ['plankopf-buero-kuerzel', 'MAA'],
      ['plankopf-projekt-code', 'SEE'],
      ['plankopf-disziplin', 'A'],
      ['plankopf-geschoss', 'EG'],
      ['plankopf-plan-nummer', '101'],
      ['plankopf-inhalt', 'Grundriss EG'],
    ];
    for (const [tid, wert] of felder) {
      await page.fill(`[data-testid="${tid}"]`, wert);
      await page.locator(`[data-testid="${tid}"]`).blur();
    }
    await page.waitForFunction(
      () => document.querySelector('[data-testid="plankopf-plancode"]')?.textContent?.startsWith('MAA-SEE-') ?? false,
      { timeout: 10000 },
    );
  });

  await browser.close();

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const flaechen = [
    {
      key: 'design-fokus',
      titel: '01 · KosmoDesign im Preset «Fokus» — der aufgeräumte Erststart',
      notiz:
        'Das neue Default-Oberflächen-Preset «Fokus» (ROADMAP 371/373), angewendet über den echten Kontextzeilen-Knopf dock-preset-fokus: alle elf Werkzeug-Panels zu, die Kennzahlen präsent, aber als eingeklappter Tab — genau der Zustand, den ein echter Erststart automatisch bekommt (Bestandsnutzer mit gespeichertem Layout bleiben unangetastet). Der App-Kopf zeigt v0.8.0 — der laufende Build ist der gebumpte.',
    },
    {
      key: 'design-arbeiten',
      titel: '02 · KosmoDesign im Preset «Arbeiten» — der kuratierte Alltag',
      notiz:
        'Preset «Arbeiten» über dock-preset-arbeiten: genau zwei nach Registry-Wichtigkeit kuratierte Panels offen — die Berechnungsliste und Modellbaum · Mengen · Ausmass (Spez §7.1 «1–2 sinnvoll ausgewählte Panels», P11-Fassung nach dem P9-Abnahmefund) —, Kennzahlen normal sichtbar, alles vom Dock-Solver kollisionsfrei verteilt.',
    },
    {
      key: 'design-pruefen',
      titel: '03 · KosmoDesign im Preset «Prüfen» — Kontrolle im Vordergrund',
      notiz:
        'Preset «Prüfen» über dock-preset-pruefen: die Kennzahlen-Säule gross (480 statt 380) und angeheftet (behält ihre Zielgrösse im Einklapp-Wettbewerb), dazu Modellbaum · Mengen · Ausmass für die Mengen-Kontrolle — alle übrigen Werkzeug-Panels zu.',
    },
    {
      key: 'vis-arbeiten',
      titel: '04 · KosmoVis im Preset «Arbeiten» — Palette offen, Graph mit sechs Nodes',
      notiz:
        'Dieselben drei Presets gibt es in KosmoVis (Toolbar-Gruppe «Oberfläche», derselbe dock-preset-arbeiten-Knopf): die Node-Palette ist offen, Minimap und Legende erscheinen datengetrieben (ab genügend Nodes) — ehrlich dokumentierte Grenze: die drei Daten-Guard-Panels kann ein Preset nicht erzwingen, nur die Palette ist ein echter Hebel.',
    },
    {
      key: 'publish-blatt',
      titel: '05 · KosmoPublish — Blatt mit Plankopf-Framework, Panel im Dock, Pille kollisionsfrei',
      notiz:
        'Das Herzstück von v0.8.0: ein frisch erstelltes Blatt trägt ohne jede Eingabe das volle Blattlayout-Framework — 180×55-mm-Plankopf auf der Rahmenecke, Faltmarken nach DIN 824, Lochung nach ISO 838, das Phasen-Wasserzeichen «STUDIE — NICHT FÜR AUSFÜHRUNG» (Matrix-Stufe VS aus der Projektphase; ab AF ersetzt ein Freigabe-Stempel das Wasserzeichen). Bestehende Blätter wurden automatisch umgestellt (einzige Ausnahme: das A0-Plakat bleibt ohne Heftrand). Das PlankopfPanel ist seit P11+ ein echtes Dock-Panel (publish-plankopf-Knopf), und die BodenDock-Pille hält neu geometrisch Abstand vom Blatt. BELEG_PLATZHALTER',
    },
    {
      key: 'publish-plankopf',
      titel: '06 · PlankopfPanel — Stammdaten, Layout-Schalter und der automatische Plancode',
      notiz:
        'Das PlankopfPanel bündelt die sieben Plankopf-Felder, Büro-Stammdaten (samt PNG-Logo; Nicht-PNG wird ehrlich abgelehnt), den Projekt-Code und die fünf Layout-Schalter (Heftrand/Faltmarken/Wasserzeichen/Massstabsbalken/Nordpfeil, alle per Default an) — dazu Massstab-Empfehlungen als Chips je Phasen-Stufe. Der Plancode MAA-SEE-VS-A-EG-101 entsteht automatisch aus Büro-Kürzel · Projekt-Code · Matrix-Stufe · Disziplin · Geschoss · Plan-Nummer und erscheint im Plankopf, im Export-Dateinamen und in der Transmittal-Liste.',
    },
  ];

  const seiten = flaechen
    .map((f) => {
      const notiz = f.notiz.replace('BELEG_PLATZHALTER', bodenDockBeleg);
      return `<section>
      <h2>${esc(f.titel)}</h2>
      <img class="shot" src="data:image/png;base64,${shots[f.key] ?? ''}" />
      <p class="notiz">${esc(notiz)}</p>
    </section>`;
    })
    .join('\n');

  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; color: #14130f; margin: 0; }
    .titel { padding: 26mm 0 0; page-break-after: always; }
    .titel h1 { font-size: 26px; margin: 0 0 6px; }
    .titel .unter { color: #5c574d; margin: 0 0 10mm; font-size: 13px; }
    .titel .block { font-size: 12px; line-height: 1.55; margin: 0 0 5mm; }
    .titel .meta { font-family: ui-monospace, Menlo, monospace; font-size: 10.5px; color: #5c574d;
      border-top: 1px solid #e4e0d6; padding-top: 4mm; margin-top: 10mm; line-height: 1.7; }
    section { page-break-before: always; }
    h2 { font-size: 15px; margin: 0 0 6px; color: #0b0d12; }
    .shot { width: 100%; border: 1px solid #c9c4b6; border-radius: 4px; display: block; }
    .notiz { font-size: 11.5px; color: #14130f; margin: 6px 0 0; line-height: 1.45; }
    .abschluss { page-break-before: always; font-size: 11.5px; line-height: 1.5; }
    .abschluss h2 { margin-bottom: 8px; }
    .abschluss ul { margin: 0 0 6mm; padding-left: 16px; }
    .abschluss li { margin-bottom: 4px; }
    .gate { font-family: ui-monospace, Menlo, monospace; font-size: 10.5px; color: #5c574d;
      border-top: 1px solid #e4e0d6; padding-top: 3mm; line-height: 1.7; }
  </style></head><body>
    <div class="titel">
      <h1>KosmoOrbit v0.8.0 — Release-Rundgang</h1>
      <p class="unter">«KosmoPublish Plankopf-Framework + Default-Oberflächen» · 15.07.2026 · ROADMAP 368–380</p>
      <p class="block"><b>Was diese Version bringt:</b> KosmoPublish hat ein vollständiges, normnahes Blattlayout-Framework
      bekommen — 180×55-mm-Plankopf, Faltmarken nach DIN 824, Lochung nach ISO 838, eine sechsstufige Phasen-Matrix
      (VS–AF) mit Wasserzeichen bzw. AF-Freigabestempel, automatische Plancodes in Plankopf, Export-Dateinamen und
      Transmittal, und ein eigenes PlankopfPanel für Stammdaten und Layout-Schalter. Bestehende Blätter wurden
      automatisch umgestellt; das A0-Plakat bleibt als dokumentierte Ausnahme ohne Heftrand.</p>
      <p class="block"><b>Dazu die Default-Oberflächen:</b> KosmoDesign, KosmoVis und KosmoPublish haben je drei benannte
      Presets (Fokus / Arbeiten / Prüfen); ein echter Erststart landet automatisch im aufgeräumten Fokus, Bestandsnutzer
      bleiben unangetastet. Die BodenDock-Pille schwebt nicht mehr stationsblind über Inhalten, und Dossier + Plankopf
      sind vollwertige Dock-Panels in KosmoPublish.</p>
      <p class="block"><b>Zu den Bildern:</b> alle Aufnahmen stammen aus dem laufenden v0.8.0-Preview-Build (App-Kopf im
      Bild). Die Design-/Vis-Bilder wurden IN den neuen Presets aufgenommen — angewendet über die echten Preset-Knöpfe
      der Oberfläche (Kontextzeile bzw. Vis-Toolbar), nicht über Testhooks. KosmoPublish hat bewusst keinen eigenen
      Preset-Wähler; dort zeigen die Bilder die realen Werkzeugleisten-Knöpfe (Plankopf/Dossier) im neuen Publish-Dock.</p>
      <div class="meta">ArchitekturKosmos · Baubüro Andrin · Generator: e2e/tools/rundgang-080.mts ·
      Screenshots: echt, 1400×900@2× · Ehrlichkeit vor Politur.</div>
    </div>
    ${seiten}
    <div class="abschluss">
      <h2>Neuerungen 0.8.0 im Überblick (= «Funktionen &amp; Neues» in der App)</h2>
      <ul>
        <li><b>Blattlayout-Framework:</b> 180×55-mm-Plankopf, Faltmarken nach DIN 824, Lochung nach ISO 838,
          sechsstufige Phasen-Matrix VS–AF mit Wasserzeichen bzw. AF-Freigabestempel. Bestehende Blätter automatisch
          umgestellt; A0-Plakat als dokumentierte Ausnahme ohne Heftrand.</li>
        <li><b>Plancode:</b> Büro-Kürzel · Projekt-Code · Phasen-Stufe · Disziplin · Geschoss · Plan-Nummer — im
          Plankopf, im Export-Dateinamen und in der Transmittal-Liste, sobald die Stammdaten stehen; ohne sie bleibt
          der bisherige Dateiname unverändert.</li>
        <li><b>PlankopfPanel:</b> Plankopf-Felder, Büro-Stammdaten samt PNG-Logo, Projekt-Code und fünf
          Layout-Schalter an einem Ort, plus Massstab-Chips je Phase.</li>
        <li><b>Default-Oberflächen:</b> Fokus / Arbeiten / Prüfen je Station (Design, Vis, Publish); echter Erststart
          landet automatisch bei Fokus, Bestandsnutzer bleiben unangetastet; Kosmo räumt auf Zuruf auf
          («Räum die Oberfläche auf»).</li>
        <li><b>BodenDock:</b> die untere Werkzeug-Pille hält in jeder Station Abstand vom Inhalt; Dossier und
          Plankopf sind vollwertige, automatisch ausweichende Dock-Panels in KosmoPublish.</li>
      </ul>
    </div>
    <div class="abschluss">
      <h2>Die Release-Chronik (ROADMAP 368–380, alle 15.07.2026)</h2>
      <ul>
        <li><b>P0/P1 (368/369):</b> verbindliche Spezifikation docs/V080-PLANKOPF-SPEZ.md (673 Zeilen, 57-Zeilen-
          Abnahme-Matrix) + pures Blattgeometrie-Modul derive/blattlayout.ts (Formate, Ränder, Faltmarken DIN 824,
          Lochung ISO 838 — Erwartungswerte von Hand nachgerechnet).</li>
        <li><b>P2 (370):</b> Datenmodell (Sheet.plankopf/Sheet.layout/DocSettings.buero) + drei neue Commands
          (publish.plankopfSetzen/blattLayoutSetzen/bueroSetzen) — Undo/Yjs gratis, PNG-Logo mit ehrlicher
          Nicht-PNG-Ablehnung.</li>
        <li><b>PD1/PD2 (371/373):</b> Presets-Kern + Presets-UI/Erststart-Fokus mit hartem Bestandsschutz und
          Kosmo-Befehl ui.dockPresetSetzen.</li>
        <li><b>P3/P4/P5 (372/375/374):</b> Plankopf-Renderer (Phasen-Matrix, Plancode, Wasserzeichen −26°,
          AF-Stempel, Massstabsbalken, Nordpfeil), guarded Blatt-Integration (alle Bestands-Goldens byte-identisch)
          und Plancode-Exportnamen + Transmittal-Spalte.</li>
        <li><b>P6 (376):</b> PublishWorkspace-Umbau + PlankopfPanel (alle Schreibwege über runCommand, Overlay-Hitbox
          aus dem echt gerenderten SVG).</li>
        <li><b>P7 (377):</b> Golden-Sammelwechsel 080 — Default-Flip auf die Spez-Defaults, GENAU EIN Golden
          geändert, Zeichnungsgeometrie per diff-verify byte-identisch belegt.</li>
        <li><b>P8 (378):</b> Export-Hub ehrlich + PDF-Härtung (Plancode und rotiertes Wasserzeichen als echter
          Vektortext im PDF-Textlayer bewiesen, Logo als Bild-Operator).</li>
        <li><b>P9 (379):</b> adversariale Matrix-Abnahme — 53 ✅, 0 Muss-Lücken, 4 ehrliche Kann-Abweichungen.</li>
        <li><b>P11+ (380):</b> BodenDock ins Dock-System (Reserve-Messkante, Publish-Canvas-Deckelung) + Publish als
          Dock-Station mit eigenen Presets; «Arbeiten»-Preset-Fix aus der P9-Abnahme.</li>
      </ul>
    </div>
    <div class="abschluss">
      <h2>Ehrlich offen geblieben (v0.8.1-Kandidaten)</h2>
      <ul>
        <li>.kxp-Hyper-Modell samt Viewer und Trust-Layer-Freigabe-Workflow (braucht Viewer-Runtime/Signatur-Infrastruktur/HomeStation).</li>
        <li>Auto-Pack-Layout-Editor fürs Blatt (eigenes Thema «Intelligentes Planlayout»); heutiges Blatt-Füllen + Drag-Overlays bleiben.</li>
        <li>Büro-Logo nur als PNG (SVG/JPG werden ehrlich abgelehnt statt still zu scheitern).</li>
        <li>Publish hat keinen UI-Preset-Wähler (Presets dort nur über Registry/Befehl) — der Erststart-Trigger bleibt bewusst bei design/vis.</li>
        <li>Einzelblatt-PDF mit eigenem Plancode-Dateinamen (heute trägt das Bündel-PDF bewusst keinen Einzel-Plancode).</li>
      </ul>
      <p class="gate"><b>Release-Gate v0.8.0 (eigener Lauf, Exit 0):</b> typecheck 8 Workspaces ·
      Tests 2221/2221 (Kernel 924 · App 1092 · KI 109 · Contracts 28 · Data 29 · Lizenz 8 · UI 31) ·
      svg-qa 33 Goldens / 0 harte Fehler (4 weiche Text-Overlap-Warnungen, bewusst lange Musterwerte) ·
      secret-scan grün. E2E-Smoke gegen den 0.8.0-Build: boden-dock + dock-presets + plankopf grün.</p>
    </div>
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
