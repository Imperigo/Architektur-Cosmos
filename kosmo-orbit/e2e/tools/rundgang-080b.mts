/**
 * Rundgang-PDF «0.8.0B — UI-Neubau nach ClaudeDesign» — VORHER/NACHHER
 * (Muster `rundgang-080.mts`, aber mit einem zweiten Bildersatz aus dem
 * 1d29136-Worktree = der 0.8.0-Stand VOR dem Neubau).
 *
 * Der Neubau (P0–W8c, ROADMAP 382–392) hat Hooks/Stores/runCommand/testids/
 * aria byte-genau erhalten («testids byte-gleich» ist Owner-Entscheid 1 der
 * Design-Spez) — genau das macht dieses Tool möglich: DIESELBE Klick-
 * Choreografie läuft unverändert gegen den ALTEN 1d29136-Build (Vorher) und
 * den NEUEN Build (Nachher). Kein Bild wird nachträglich beschnitten oder
 * behauptet — beide Aufnahmen entstehen über echte UI-Knöpfe.
 *
 * Drei Aufrufmodi (aus kosmo-orbit/, PLAYWRIGHT_CHROMIUM_PATH gesetzt):
 *
 *   1. Vorher-Aufnahmen (gegen den 1d29136-Worktree-Preview, eigener Port):
 *        KOSMO_E2E_PORT=5176 npx tsx e2e/tools/rundgang-080b.mts vorher
 *
 *   2. Nachher-Aufnahmen (gegen den frischen 0.8.0B-Build, Standardport 5183):
 *        KOSMO_E2E_PORT=5183 npx tsx e2e/tools/rundgang-080b.mts nachher
 *
 *   3. PDF zusammenbauen (liest beide Bilder-Caches, braucht keinen Server):
 *        npx tsx e2e/tools/rundgang-080b.mts pdf
 *
 * Sieben VORHER/NACHHER-Paare (14 Bilder total), je Station/Ausschnitt EIN
 * Bild pro Phase — dieselbe Aufnahme-Choreografie in beiden Phasen:
 *   1. design      — Preset «Arbeiten» (Berechnungsliste + Modellbaum offen),
 *                     Muster `rundgang-080.mts` design-arbeiten.
 *   2. bodendock   — Nahaufnahme der BodenDock-Pille (geclippt auf ihre
 *                     BoundingBox + 30px Rand), direkt aus derselben Design-
 *                     Sitzung.
 *   3. vis         — Preset «Arbeiten», Graph mit sechs Nodes (Muster
 *                     `rundgang-080.mts` vis-arbeiten).
 *   4. data        — Referenzen-Tab, Suche «Villa Savoye», Dossier offen
 *                     (Muster `p6-data-shots.mts`).
 *   5. publish     — Blatt mit Plankopf-Framework, PlankopfPanel gefüllt
 *                     (Muster `rundgang-080.mts` publish-plankopf).
 *   6. prepare     — Ingest-Zone über die Orbit-Zentrale (Muster
 *                     `w8ca-shots.mts`: Hover Hauptkachel → Fächer → Modul).
 *   7. einstellungen — zentrales Einstellungs-Panel (Serie K / A4).
 *
 * Die Bild-Caches liegen unter `os.tmpdir()/kosmo-rundgang-080b/{vorher,
 * nachher}/*.png` — nicht im Repo, überleben nur innerhalb des Containers
 * zwischen den drei Aufrufen derselben Sitzung.
 */
import { chromium, type Page } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const OUT_PDF = `${ROOT}abgabe/RUNDGANG-KosmoOrbit-0.8.0B.pdf`;
mkdirSync(`${ROOT}abgabe/`, { recursive: true });
const CACHE = join(tmpdir(), 'kosmo-rundgang-080b');
mkdirSync(join(CACHE, 'vorher'), { recursive: true });
mkdirSync(join(CACHE, 'nachher'), { recursive: true });
const exe = process.env['PLAYWRIGHT_CHROMIUM_PATH'] || undefined;

type Phase = 'vorher' | 'nachher';
const MODUS = process.argv[2];

// Dieselbe Basis wie `rundgang-080.mts`: Mock-Provider + Erststart-Marker,
// damit die automatische Preset-Anwendung nicht ins Bild pfuscht — jedes
// Preset wird explizit über seinen Knopf gesetzt.
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

/** Zwei aufeinanderfolgende Messungen müssen übereinstimmen (Muster 080). */
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

async function aufnehmen(phase: Phase, port: string) {
  const BASE = `http://localhost:${port}`;
  const dir = join(CACHE, phase);
  const browser = await chromium.launch({ executablePath: exe });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(25000);

  async function schuss(key: string) {
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(dir, `${key}.png`) });
    // eslint-disable-next-line no-console
    console.log(`  ✓ [${phase}] ${key}`);
  }

  async function schussClip(key: string, box: Box, pad: number) {
    await page.screenshot({
      path: join(dir, `${key}.png`),
      clip: {
        x: Math.max(0, box.x - pad),
        y: Math.max(0, box.y - pad),
        width: box.width + pad * 2,
        height: box.height + pad * 2,
      },
    });
    // eslint-disable-next-line no-console
    console.log(`  ✓ [${phase}] ${key}`);
  }

  /** Frischer Home-Stand: Basis-localStorage gesetzt, Dock-Layout geleert,
   *  reload — dieselbe Reihenfolge wie `frischInDesign()` in `rundgang-080.mts`. */
  async function neu() {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.evaluate(setzeBasis);
    await page.evaluate(() => localStorage.removeItem('kosmo.dock.v1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
  }

  // (1) Design · Preset «Arbeiten» + (2) BodenDock-Nahaufnahme aus derselben
  // Sitzung (Muster `rundgang-080.mts` design-arbeiten).
  await neu();
  await page.click('[data-testid="load-tkb"]');
  await page.waitForSelector('[data-testid="dock-panel-kennzahlen"]', { timeout: 15000 });
  await page.click('[data-testid="dock-preset-arbeiten"]');
  await page.waitForSelector('[data-testid="dock-panel-listeOffen"]', { timeout: 8000 });
  await page.waitForSelector('[data-testid="dock-panel-drawOffen"]', { timeout: 8000 });
  await schuss('design');
  const bd = await stabileBox(page, 'boden-dock');
  await schussClip('bodendock', bd, 30);

  // (3) Vis · Preset «Arbeiten», Graph mit sechs Nodes (Muster vis-arbeiten).
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
  await schuss('vis');

  // (4) Data · Referenzen-Tab, Suche + Dossier (Muster `p6-data-shots.mts`).
  await neu();
  await page.click('[data-testid="module-data"]');
  await page.waitForSelector('[data-testid="ref-card"]');
  await page.fill('[data-testid="data-search"]', 'Villa Savoye');
  await page.click('[data-testid="ref-card"]');
  await page.waitForSelector('[data-testid="ref-detail-dossier"]');
  await schuss('data');

  // (5) Publish · Blatt + PlankopfPanel gefüllt (Muster publish-plankopf).
  await neu();
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
  await schuss('publish');

  // (6) Prepare · über die Orbit-Zentrale (Muster `w8ca-shots.mts`).
  await neu();
  await page.hover('[data-testid="orbit-haupt-design"]');
  await page.click('[data-testid="orbit-faecher-design"] [data-testid="module-prepare"]');
  await page.waitForSelector('[data-testid="ingest-zone"]');
  await schuss('prepare');

  // (7) Einstellungen · zentrales Panel, aus derselben Sitzung (Kopfleiste
  // ist stationsübergreifend erreichbar).
  await page.click('[data-testid="einstellungen-oeffnen"]');
  await page.waitForSelector('[data-testid="einstellungen-panel"]');
  await schuss('einstellungen');

  await browser.close();
  // eslint-disable-next-line no-console
  console.log(`${phase}: 7 Bilder → ${dir}`);
}

const STATIONEN: Array<{ key: string; titel: string; notiz: string }> = [
  {
    key: 'design',
    titel: 'KosmoDesign — Preset «Arbeiten»',
    notiz:
      'Berechnungsliste und Modellbaum · Mengen · Ausmass offen (Spez §7.1). Vorher: Kästen mit Volltonrahmen, gefüllte Akzentflächen an mehreren Stellen. Nachher: Hairline-Karten (KCard-Anatomie), genau eine gefüllte Signal-Fläche («Blatt füllen»→quiet demotet), Alpha-Border-Linien statt Volltonfarbe.',
  },
  {
    key: 'bodendock',
    titel: 'BodenDock-Pille — Nahaufnahme',
    notiz:
      'Vorher: einheitliche Kreise ohne klare Rangordnung. Nachher: Top-Tool grösser mit Rollenborder + Punkt, übrige Tools kleiner mit 1px-Border, 1×26px-Trenner, Kosmo-Orb mit gestricheltem Teal-Ring — die Rang-Formel (0.6·Phase+0.4·Nutzung) sortiert nach Wichtigkeit. Kreisgrössen bleiben bei 64/54/46px (Owner-dokumentierte Abweichung von der 44/36px-Blaupause, siehe Abschluss-Seite).',
  },
  {
    key: 'vis',
    titel: 'KosmoVis — Preset «Arbeiten», sechs Nodes',
    notiz:
      'Vorher: Pipeline-Karten mit Volltonrahmen. Nachher: KPipelineNode-Anatomie (1.5px Rollenborder über color-mix, Puls NUR bei echt laufenden Render-Jobs — Gesetz 7), Node-Palette und Minimap/Legende unverändert in Funktion, neu in Optik.',
  },
  {
    key: 'data',
    titel: 'KosmoData — Referenzen-Tab, «Villa Savoye»',
    notiz:
      'Vorher: Referenztabelle mit Kastenrahmen, Label/Wert als loses Inline-Muster. Nachher: Hairlines statt Kästen (Gesetz 8), Dossier-Stapel über KKeyValue (Materialprofil/Geo/Programm/Kontext), Status als Punkt + Mono-Label (Gesetz 10).',
  },
  {
    key: 'publish',
    titel: 'KosmoPublish — Blatt mit Plankopf, PlankopfPanel gefüllt',
    notiz:
      'Das Blattlayout-Framework (180×55-mm-Plankopf, DIN-824-Faltmarken, ISO-838-Lochung, Phasen-Wasserzeichen, Plancode MAA-SEE-VS-A-EG-101) aus v0.8.0 ist unverändert — der Neubau betrifft nur PlankopfPanel/DossierPanel/Werkzeugleiste (98→12 Inline-Styles) und die BodenDock-Pille, die weiterhin geometrisch kollisionsfrei zum Blatt steht.',
  },
  {
    key: 'prepare',
    titel: 'Prepare — Ingest-Zone (Owner-Entscheid «Jetzt nachziehen»)',
    notiz:
      'Prepare gehörte zu den 5 Stationen, die keines der 7 ClaudeDesign-Quellpakete je zeigte (Scope-Blindpunkt der W8-Abnahme) — erst W8c-A hat sie nachgezogen. Vorher: unverändertes Alt-Layout. Nachher: eigene Stations-CSS nach dem W4–W6-Muster, «Dateien wählen» als einzige Signal-Fläche.',
  },
  {
    key: 'einstellungen',
    titel: 'Einstellungen — zentrales Panel',
    notiz:
      'Segmentschalter auf KTabs-Pill-Anatomie, Leistungs-Bericht auf KKeyValue — dieselben Funktionen (Thema/Akzent, Dock-Modus, Bewegung/Klang, Rundgang, Neuigkeiten), nur die Optik ist neu.',
  },
];

const GESETZE = [
  '1 · 80·15·5 — genau eine gefüllte Signal-Fläche pro Ansicht, Rollenfarbe nur als Hairline/Punkt, nie flächig.',
  '2 · Eine Hauptthese pro View, max. drei Sekundärfakten — alles andere versteckt oder nachgelagert.',
  '3 · Papier ist Papier — Plangrafik schwarz/grau auf Weiss, theme-invariant; der Druckweg kennt kein Theme.',
  '4 · Nie-Überlappung + feste Zonen — Panels docken, nur Glass-HUDs schweben, feste Wichtigkeits-Rangfolge.',
  '5 · Rund statt Block — Werkzeuge/Dock-Icons als Kreise, Balken als Pills, keine harten 90°-Boxen.',
  '6 · Zwei Schriftstimmen — Lato Heavy Versal für Titel, IBM Plex Mono uppercase für alles Messbare.',
  '7 · Glow ist Informationszustand, Glass ist Schwebe-Sprache — nie Deko, nie Stationsfläche.',
  '8 · Hierarchie über Flächenstufen + Hairlines statt Kästen.',
  '9 · Sichtbarkeit ist phasen-/datengesteuert, nicht panelgesteuert — nichts erscheint ohne Grund.',
  '10 · Status nie nur Farbe — immer Punkt/Icon + Mono-Textlabel.',
  '11 · Morph- und Kanten-Regel + quittierte Automatik — jede automatische Umordnung wird begründet quittiert.',
  '12 · Disziplin-Klammer — Schweizer Deutsch, UPPERCASE-Mono-Labels, keine Emoji, reduced-motion Pflicht.',
];

async function assemble() {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const bild = (phase: Phase, key: string): string => {
    const p = join(CACHE, phase, `${key}.png`);
    if (!existsSync(p)) throw new Error(`Fehlendes Bild: ${p} — erst 'vorher'/'nachher' laufen lassen.`);
    return readFileSync(p).toString('base64');
  };

  const paare = STATIONEN.map(
    (s) => `
    <section>
      <h2>${esc(s.titel)} — VORHER (v0.8.0)</h2>
      <img class="shot" src="data:image/png;base64,${bild('vorher', s.key)}" />
    </section>
    <section>
      <h2>${esc(s.titel)} — NACHHER (v0.8.0B)</h2>
      <img class="shot" src="data:image/png;base64,${bild('nachher', s.key)}" />
      <p class="notiz">${esc(s.notiz)}</p>
    </section>`,
  ).join('\n');

  const gesetzeListe = GESETZE.map((g) => `<li>${esc(g)}</li>`).join('\n');

  // Gate-/Smoke-Zahlen dieses Release-Laufs — vom W9-Finale VOR dem
  // PDF-Zusammenbau als Textdatei hinterlegt (echte Zahlen aus dem
  // eigenen release-gate-/Smoke-Lauf, keine Vorlagenwerte).
  const gateText = readFileSync(join(CACHE, 'gate-smoke.txt'), 'utf-8').trim();

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
    .gesetze { font-size: 11px; line-height: 1.55; padding-left: 0; margin: 0; list-style: none; }
    .gesetze li { margin-bottom: 5px; }
  </style></head><body>
    <div class="titel">
      <h1>KosmoOrbit v0.8.0B — Release-Rundgang</h1>
      <p class="unter">«UI-Neubau nach ClaudeDesign» · 16.07.2026 · ROADMAP 382–392</p>
      <p class="block"><b>Was diese Version bringt:</b> die komplette visuelle Schicht ist neu gebaut — streng nach
      den 7 ClaudeDesign-Paketen (v0.7.1–v0.8.0). Der Software-Kern (Commands, Undo, Yjs-Sync, Solver) bleibt
      byte-gleich; testids/aria sind über alle 12 Wellen hinweg identisch geblieben — genau das macht den
      VORHER/NACHHER-Vergleich in diesem Heft möglich (dieselbe Klick-Choreografie läuft unverändert gegen beide
      Builds).</p>
      <p class="block"><b>Umfang:</b> Token-Fundament + Alpha-Borders (P1), Komponenten-Neubau (P2, 2100 Inline-Styles
      eliminiert), Dock-Chrome + BodenDock-Zielgestalt (P3), alle 9 Werkstationen (P4–P7, W8c-A) und alle 13
      Design-Werkzeugpanels (W8c-B) auf die neue Grammatik, adversariale 150-Zeilen-Matrix-Abnahme (P8: 127 bestanden) mit
      Muss-Fixes (P8b).</p>
      <p class="block"><b>Zu den Bildern:</b> jedes Paar zeigt zwei echte Screenshots — «Vorher» aus einem frisch
      gebauten Worktree des 0.8.0-Release-Commits (1d29136), «Nachher» aus dem aktuellen 0.8.0B-Build. Beide
      Aufnahmen folgen exakt derselben Klick-Choreografie über echte UI-Knöpfe.</p>
      <div class="meta">ArchitekturKosmos · Baubüro Andrin · Generator: e2e/tools/rundgang-080b.mts ·
      Screenshots: echt, 1600×1000@2× · Ehrlichkeit vor Politur.</div>
    </div>
    <div class="titel">
      <h2 style="font-size:18px;margin-bottom:10px;">Die 12 obersten Gestaltungsgesetze (docs/V080B-DESIGN-SPEZ.md §2)</h2>
      <ul class="gesetze">${gesetzeListe}</ul>
    </div>
    ${paare}
    <div class="abschluss">
      <h2>Neuerungen 0.8.0B im Überblick (= «Funktionen &amp; Neues» in der App)</h2>
      <ul>
        <li><b>Token-Fundament:</b> additive Abstände/Typo-Leiter/Schatten-Skala, Alpha-Border-Umstieg im
          dunklen Thema.</li>
        <li><b>Komponenten-Neubau:</b> KButton/KField/KTabs/KPill/KKeyValue/KCard/KSwitch u.a. ersetzen ~2100
          Inline-Styles.</li>
        <li><b>Dock-Chrome + BodenDock:</b> Rollenfarbe nur als Kopflinie, Rang-Formel aus Phase + Nutzung.</li>
        <li><b>Alle 9 Stationen + 13 Design-Werkzeugpanels</b> auf die neue Grammatik — Funktionen/testids
          byte-gleich.</li>
        <li><b>Genau eine Signal-Fläche je Ansicht</b> statt mehrerer gleichrangiger Knöpfe.</li>
        <li><b>Ehrlich offen:</b> OnboardingWizard/StarterGuide-Rest, GovernanceGate-Optik (braucht
          Datei-Auftauung), B-135 formell geschlossen ohne Bauauftrag, BodenDock-Kreisgrössen-Entscheid
          (64/54/46px statt 44/36px, siehe Gate-Seite).</li>
      </ul>
    </div>
    <div class="abschluss">
      <h2>Gate-Zahlen und offene Punkte</h2>
      <p>${esc(gateText)}</p>
      <ul>
        <li><b>B-135 (Linien-Skala micro/hair/node/hero):</b> seit P1 durch die Wellen gereicht (kein Konsument),
          mit diesem Release formell geschlossen — kein eigener Bauauftrag.</li>
        <li><b>B-65-Abweichung (BodenDock-Kreisgrössen):</b> Blaupause nennt 44/36px, gebaut sind 64/54/46px
          (TIER_GROESSE) — die kleineren Masse hätten den getesteten Abstands-Vertrag BODEN_DOCK_RESERVE_PX=180
          gebrochen. Owner kann das jederzeit als eigenen state/-Entscheid zurückholen.</li>
        <li><b>GovernanceGate:</b> bleibt beim Bestand — die eingefrorene Datei bräuchte eine Owner-Freigabe zur
          Auftauung, bevor sie Klassen statt Inline-Styles bekommen kann.</li>
        <li><b>OnboardingWizard/StarterGuide-Rest:</b> spätere Umbau-Runde.</li>
      </ul>
    </div>
  </body></html>`;

  const b2 = await chromium.launch({ executablePath: exe });
  const p2 = await b2.newPage();
  await p2.setContent(html, { waitUntil: 'networkidle' });
  await p2.pdf({ path: OUT_PDF, format: 'A4', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
  await b2.close();
  // eslint-disable-next-line no-console
  console.log(`\nRundgang-PDF → ${OUT_PDF}`);
}

async function main() {
  if (MODUS === 'vorher' || MODUS === 'nachher') {
    const port = process.env['KOSMO_E2E_PORT'] ?? (MODUS === 'vorher' ? '5176' : '5183');
    await aufnehmen(MODUS, port);
  } else if (MODUS === 'pdf') {
    await assemble();
  } else {
    // eslint-disable-next-line no-console
    console.error("Usage: npx tsx e2e/tools/rundgang-080b.mts <vorher|nachher|pdf>");
    process.exit(1);
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
