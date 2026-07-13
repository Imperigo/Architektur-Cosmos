/**
 * v0.7.7-Software-Handbuch — der vollständige Rundgang durch KosmoOrbit als
 * PDF. Muster: `handbuch.mts` (V1-Finish P6 — echte Stations-Screenshots des
 * laufenden Preview-Builds) + `rundgang-pdf.mts` (HTML→PDF, Bilder als
 * data-URI, A4-Kapitel-Layout).
 *
 * Zwei Teile in einem Lauf:
 *   1. Screenshots  — fährt jede Station deterministisch ab (TKB-Demo +
 *      `__kosmo`-Testhook), legt 1600×1000@2×-Bilder unter
 *      `docs/handbuch-077/bilder/` ab.
 *   2. HTML → PDF   — baut daraus das gestaltete Handbuch: je Station Zweck ·
 *      Werkzeuge/Panels · Schritt-für-Schritt · Screenshot, dazu der volle
 *      Architektur-/Command-Teil. Die Command-Liste wird zur Laufzeit aus dem
 *      echten Kernel-Register (`allCommands()`) gezogen — kein Abschreiben.
 *
 * Voraussetzungen (aus kosmo-orbit/, siehe CLAUDE.md):
 *   npm run build -w @kosmo/orbit-app
 *   python3 tools/homestation-bridge/kosmo_bridge/main.py --fake --port 8600 &
 *   node    tools/sync-server/src/server.mjs &
 *   npm run preview -w @kosmo/orbit-app -- --port 5183 --strictPort &
 * Aufruf:
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx tsx e2e/tools/handbuch-077.mts
 */
import { chromium, type Page } from 'playwright-core';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import '@kosmo/kernel';
import { allCommands } from '@kosmo/kernel';

const ROOT = new URL('../../', import.meta.url).pathname;
const OUT_BILDER = `${ROOT}docs/handbuch-077/bilder/`;
const OUT_PDF = `${ROOT}abgabe/HANDBUCH-KosmoOrbit-0.7.7.pdf`;
const URL_ = process.env['HANDBUCH_URL'] ?? 'http://localhost:5183';
const exe = process.env['PLAYWRIGHT_CHROMIUM_PATH'] ?? '/opt/pw-browsers/chromium';
mkdirSync(OUT_BILDER, { recursive: true });
mkdirSync(`${ROOT}abgabe/`, { recursive: true });

// ─────────────────────────────────────────────────────────────────────────
// TEIL 1 — Screenshots
// ─────────────────────────────────────────────────────────────────────────

type Kosmo = { open: (s: string) => void; run: (id: string, p: unknown) => { patches: { id: string }[] }; state: () => { activeStoreyId: string | null; doc: { byKind: (k: string) => { id: string; name?: string }[] } } };
const shots: Record<string, string> = {};
// Design-Iteration: mit HANDBUCH_SKIP_SHOTS=1 werden die vorhandenen Bilder
// von der Platte geladen statt neu aufgenommen — nur das PDF wird neu gebaut.
const SKIP_SHOTS = process.env['HANDBUCH_SKIP_SHOTS'] === '1';

if (SKIP_SHOTS) {
  for (const f of readdirSync(OUT_BILDER)) {
    if (f.endsWith('.png')) shots[f.replace(/\.png$/, '')] = readFileSync(`${OUT_BILDER}${f}`).toString('base64');
  }
  console.log(`Teil 1 — ${Object.keys(shots).length} vorhandene Bilder geladen (HANDBUCH_SKIP_SHOTS=1).`);
} else {
const browser = await chromium.launch({
  executablePath: exe,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page: Page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
page.setDefaultTimeout(25000);

async function shot(key: string, pause = 700) {
  await page.waitForTimeout(pause);
  const p = `${OUT_BILDER}${key}.png`;
  await page.screenshot({ path: p });
  shots[key] = readFileSync(p).toString('base64');
  console.log(`  ✓ ${key}`);
}
async function tryShot(key: string, vorbereiten: () => Promise<void>, pause = 700) {
  try {
    await vorbereiten();
    await shot(key, pause);
  } catch (e) {
    console.log(`  ✗ ${key} — ${(e as Error).message.split('\n')[0]}`);
  }
}
const k = () => (window as never as { __kosmo: Kosmo }).__kosmo;

async function frisch(tkb = true, thema = 'orbit') {
  await page.goto(URL_);
  await page.evaluate((t) => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.thema', t);
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
    localStorage.removeItem('kosmo.panelOffen');
    localStorage.removeItem('kosmo.ui.v1');
    localStorage.removeItem('kosmo.projekt.aktiv');
    indexedDB.deleteDatabase('kosmo-projekte');
  }, thema);
  await page.reload();
  await page.waitForSelector('[data-testid="module-design"]', { timeout: 25000 });
  if (tkb) {
    await page.click('[data-testid="load-tkb"]');
    await page.waitForTimeout(2600);
  }
}

console.log('Teil 1 — Screenshots');

// 01 Zentrale (Orbit-Start) — ohne Projekt, der ruhige Startzustand.
await frisch(false);
await page.evaluate(() => (window as never as { __kosmo: Kosmo }).__kosmo.open('home'));
await shot('01-zentrale', 900);

// 02 Kurzbefehle-Overlay.
await tryShot('02-kurzbefehle', async () => {
  await page.keyboard.press('?');
}, 500);
await page.keyboard.press('Escape').catch(() => {});

// 03/04 Einstellungen + «Funktionen & Neues».
await tryShot('03-einstellungen', async () => {
  await page.click('[data-testid="einstellungen-oeffnen"]');
  await page.waitForSelector('[data-testid="einstellungen-panel"]');
}, 600);
await tryShot('04-neuigkeiten', async () => {
  await page.click('[data-testid="einstellungen-neuigkeiten"]');
}, 600);
await page.keyboard.press('Escape').catch(() => {});

// Projekt laden für die Arbeitsstationen.
await frisch(true);

// 05 KosmoDesign — reine 3D-Ansicht (Glass-HUD, Bearbeitungsmodi).
// TKB-Laden landet direkt in KosmoDesign — die Home-Kachel `module-design`
// ist dann nicht mehr da; über den Testhook sicher in die Station gehen.
await tryShot('05-design-3d', async () => {
  await page.evaluate(() => (window as never as { __kosmo: Kosmo }).__kosmo.open('design'));
  await page.waitForTimeout(600);
  await page.click('[data-testid="view-3d"]');
}, 1200);

// 06 KosmoDesign — Grundriss (Werkplan/2D).
await tryShot('06-design-grundriss', async () => {
  await page.click('[data-testid="view-2d"]');
}, 1000);

// 07 KosmoDesign — Split 3D | Plan (die geteilte Arbeitsansicht).
await tryShot('07-design-split', async () => {
  await page.click('[data-testid="view-split"]');
}, 1200);

// 08 Kosmo-Vorschlagskarte (Mock-Provider, gated Proposal).
await tryShot('08-kosmo-vorschlag', async () => {
  await page.click('[data-testid="view-2d"]').catch(() => {});
  const sym = page.locator('[data-testid="kosmo-symbol"]').first();
  if (await sym.isVisible().catch(() => false)) await sym.click().catch(() => {});
  await page.fill('[data-testid="kosmo-input"]', 'Zeichne eine Wand von 0,0 nach 8,0');
  await page.click('[data-testid="kosmo-send"]');
  await page.waitForSelector('[data-testid="proposal-card"]', { timeout: 15000 });
}, 700);

// 09 KosmoDraw — Modellbaum · Mengen · Ausmass.
await tryShot('09-draw', async () => {
  await page.click('[data-testid="draw-toggle"]');
  await page.waitForSelector('[data-testid="draw-panel"]');
}, 900);

// 10 KosmoVis — Node-Graph.
await tryShot('10-vis', async () => {
  await page.evaluate(() => (window as never as { __kosmo: Kosmo }).__kosmo.open('vis'));
  await page.waitForTimeout(700);
  await page.click('[data-testid="drei-stimmungen"]').catch(() => {});
  await page.waitForSelector('[data-testid="node-canvas"]', { timeout: 12000 }).catch(() => {});
}, 1200);

// 11 KosmoData — Referenzkatalog (Tabelle mit Facetten).
await tryShot('11-data', async () => {
  await page.evaluate(() => (window as never as { __kosmo: Kosmo }).__kosmo.open('data'));
}, 1100);

// 12 KosmoAsset — Bibliothek/Materialien.
await tryShot('12-asset', async () => {
  await page.evaluate(() => (window as never as { __kosmo: Kosmo }).__kosmo.open('asset'));
}, 1000);

// 13 KosmoPublish — Blatt + Dossier-Knopf (0.7.7).
await tryShot('13-publish', async () => {
  await page.evaluate(() => (window as never as { __kosmo: Kosmo }).__kosmo.open('publish'));
  await page.waitForTimeout(600);
  await page.click('[data-testid="blatt-fuellen"]').catch(() => {});
}, 1100);
await tryShot('14-dossier', async () => {
  await page.click('[data-testid="publish-dossier"]');
  await page.waitForSelector('[data-testid="dossier-panel"]', { timeout: 8000 });
}, 800);

// 15 KosmoPrepare.
await tryShot('15-prepare', async () => {
  await page.evaluate(() => (window as never as { __kosmo: Kosmo }).__kosmo.open('prepare'));
}, 1000);

// 16 Dev-Auftragsbuch.
await tryShot('16-dev', async () => {
  await page.evaluate(() => (window as never as { __kosmo: Kosmo }).__kosmo.open('dev'));
  const feld = page.locator('[data-testid="auftrag-text"]').first();
  if (await feld.isVisible().catch(() => false)) {
    await feld.fill('Türanschläge im Grundriss wählbar machen — Werkzeugleiste KosmoDesign');
    await page.click('[data-testid="auftrag-erfassen"]').catch(() => {});
  }
}, 1000);

// 17 KosmoDoc — Diagnose / Tech-Radar.
await tryShot('17-doc', async () => {
  await page.evaluate(() => (window as never as { __kosmo: Kosmo }).__kosmo.open('doc'));
}, 1000);

// 18 KosmoTrain.
await tryShot('18-train', async () => {
  await page.evaluate(() => (window as never as { __kosmo: Kosmo }).__kosmo.open('train'));
}, 1000);

// 19 Companion (Governance-Kontext fürs Zweitgerät).
await tryShot('19-companion', async () => {
  await page.goto(`${URL_}#companion`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="companion"]', { timeout: 15000 }).catch(() => {});
}, 1200);

// 20 Onboarding — Erststart-Assistent, Schritt «Zentrale koppeln» (QR).
await tryShot('20-onboarding', async () => {
  await page.goto(URL_, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.removeItem('kosmo.onboarded');
    localStorage.setItem('kosmo.thema', 'orbit');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="onboarding"]', { timeout: 15000 }).catch(() => {});
  for (let i = 0; i < 2; i++) {
    const weiter = page.locator('button', { hasText: /Weiter/i }).first();
    if (await weiter.isVisible().catch(() => false)) {
      await weiter.click().catch(() => {});
      await page.waitForTimeout(500);
    }
  }
}, 900);

await browser.close();
console.log(`Teil 1 fertig — ${Object.keys(shots).length} Bilder.`);
}

// ─────────────────────────────────────────────────────────────────────────
// TEIL 2 — Command-Register zur Laufzeit ziehen
// ─────────────────────────────────────────────────────────────────────────
const DOMAENEN: Record<string, string> = {
  design: 'KosmoDesign — BIM-Kern (Geometrie, Öffnungen, Zonen, Phasen, Mengen)',
  publish: 'KosmoPublish — Blätter, Ansichten, Baugesuch, Revisionen',
  vis: 'KosmoVis — Node-Graph, Render-Kette',
  grundlagen: 'Grundlagenstudien — Volumen/Variantenstudie',
};
const cmds = allCommands()
  .map((c) => ({ id: c.id, title: c.title, description: c.description, domaene: c.id.split('.')[0] ?? 'core' }))
  .sort((a, b) => a.id.localeCompare(b.id));
const cmdsProDomaene = new Map<string, typeof cmds>();
for (const c of cmds) {
  const arr = cmdsProDomaene.get(c.domaene) ?? [];
  arr.push(c);
  cmdsProDomaene.set(c.domaene, arr);
}
console.log(`Teil 2 — ${cmds.length} Commands aus dem Kernel-Register.`);

// ─────────────────────────────────────────────────────────────────────────
// TEIL 3 — HTML
// ─────────────────────────────────────────────────────────────────────────
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Screenshot im Werkplan-Rahmen: 1px-Technik-Linie, vier Koordinatenkreuz-
// Ecken (Passer) und eine Mono-Bildunterschrift «ABB NN · …».
let abbNr = 0;
const bild = (key: string, cap = ''): string => {
  if (!shots[key]) {
    return `<div class="shot-fehlt">Screenshot «${esc(key)}» wurde in diesem Lauf nicht erzeugt (Station in der Container-Umgebung nicht erreichbar).</div>`;
  }
  abbNr += 1;
  const nr = String(abbNr).padStart(2, '0');
  return `<figure class="figur">
    <div class="figur-rahmen">
      <span class="tick tl"></span><span class="tick tr"></span><span class="tick bl"></span><span class="tick br"></span>
      <img class="shot" src="data:image/png;base64,${shots[key]}" alt="${esc(cap)}" />
    </div>
    <figcaption><span class="figur-glyph">⌖</span> ABB ${nr} · ${esc(cap)}</figcaption>
  </figure>`;
};

interface Werkzeug { name: string; text: string; }
interface Kapitel {
  id: string;
  nr: string;
  titel: string;
  farbe: string;
  shot: string;
  zweck: string;
  werkzeuge: Werkzeug[];
  bedienung: string[];
  neu077?: string;
}

const STATIONEN: Kapitel[] = [
  {
    id: 'zentrale', nr: '1', titel: 'Die Zentrale (Orbit-Start)', farbe: '#8f897b', shot: '01-zentrale',
    zweck:
      'Der Ausgangspunkt jeder Sitzung. Die Hauptwerkzeuge (KosmoDesign, KosmoData, KosmoOffice «kommend», Kosmo selbst) kreisen als Planeten um das Kosmos-Zeichen; ein Klick öffnet eine Station, ein Hover zeigt ihre Unterwerkzeuge. Oben läuft die SIA-Phasenleiste (Strategie → Realisierung), rechts das globale Menü (Sync, Speichern, Öffnen, Kosmo öffnen, Kurzbefehle «?», Einstellungen ⚙).',
    werkzeuge: [
      { name: 'Planeten-Hub', text: 'Jede Station ist ein Planet mit Rollenpunkt in ihrer Werkzeugfamilie-Farbe. Fächer öffnen federnd aus dem Planeten heraus, mit Akzent-Rahmen und Verbindungslinie.' },
      { name: 'SIA-Phasenleiste', text: 'Fünf SIA-112-Gruppen (Strategie/Vorstudie/Projektierung/Ausschreibung/Realisierung) als App-weiter Schnellzugriff — ein Klick schreibt die Projektphase, dieselbe wie die feinere Phasenwahl in KosmoDesign.' },
      { name: 'Begrüssung & Rolle', text: 'Tageszeit-Begrüssung, aktuelle Projektzahl («steht 1 Wand» korrekt im Singular), eine wählbare Rolle (neutral/…), Beispielprojekt laden (TKB Bibliothek Hönggerberg).' },
      { name: 'Projekt-Kachel', text: 'Autosave — jede Änderung landet im aktiven .kosmo-Stand; Katalog sichern/laden als klare Knöpfe, «Neues Projekt» per Namensfeld.' },
      { name: 'Kosmo-Orb', text: 'Unten rechts das schwebende Kosmo-Symbol — immer genau einmal sichtbar, ein Klick öffnet das grosse Chat-Panel.' },
    ],
    bedienung: [
      'Beispielprojekt über «Beispielprojekt laden — TKB Bibliothek Hönggerberg» öffnen oder ein neues Projekt benennen und anlegen.',
      'Eine SIA-Phase oben wählen — sie steuert, wie Pläne und 3D die Planungstiefe zeigen.',
      'Auf einen Planeten klicken, um die Station zu betreten; mit dem Kosmos-Zeichen links oben jederzeit hierher zurück.',
    ],
  },
  {
    id: 'design', nr: '2', titel: 'KosmoDesign — der BIM-Kern', farbe: '#c25e3a', shot: '05-design-3d',
    zweck:
      'Die Entwurfs- und Zeichenstation: ein 3D-Viewport und der 2D-Werkplan aus demselben Modell. Alles ist ein Command — Wände, Öffnungen, Zonen, Geschosse, Dächer, Treppen — und damit rückgängig-, sync- und Kosmo-fähig. Der Viewport trägt seit 0.7.6 eine Glass-Bedienschale: drei Bearbeitungsmodi (Modellieren/Kamera/Review), ein HUD mit Live-Werten (Ansicht, Raster, Geschoss, Kamera-Azimut/Neigung/Distanz), ein Orientierungskreuz mit Kompasslabel und eine Zoom-Steuerung — alle Anzeigen aus echten Laufzeitwerten.',
    werkzeuge: [
      { name: 'Ansichtsumschalter', text: '3D · 3D | Plan (Split) · 4er · Grundriss. Der Split zeigt Modell und Werkplan nebeneinander, das 4er-Fenster vier synchron gehaltene Ansichten.' },
      { name: 'Zeichenwerkzeuge', text: 'Wand, Stütze, Unterzug, Decke, Treppe, Dach (Walm/Sattel), Schnitt, Zone, Raster/Stützenraster-Assistent, Mesh (Massing bearbeiten) — mit Element-Fang (Wandenden/-mitten/Ecken) und mitlaufender Masszahl am Cursor.' },
      { name: 'Öffnungen', text: 'Fenster (parametrisch: Einflügel/Zweiflügel/Fest/Fensterband mit Teilung), Türen, Curtain-Wall/Fassadenband, Beschlag-Katalog (Band, Griffseite, Antrieb, Absturzsicherung) — im Grundriss direkt klickbar.' },
      { name: 'Kennzahlen & Checks', text: 'Rechtes Panel: HNF/VF/FF/NGF/aGF-Ziel/GF-Schätzung live aus dem Modell; darunter die Grundriss-Checks nach Schwere gruppiert und filterbar, jeder mit stabiler Regel-Kennung.' },
      { name: 'Vollprojekt-Werkzeuge', text: 'Varianten (Wohnungs-Aufteilungen live), KV-Grobschätzung, Bauablauf-Balkenplan, Mängel/Abnahme, Baugesuch — je ein eigener Knopf in der Kontextzeile.' },
      { name: 'Export', text: 'PDF · SVG · DXF · IFC (mit Bemassungs-Layer), dazu IFC/DXF/Splat laden — die belegte BIM-Brücke nach Rhino/Revit/Grasshopper.' },
      { name: 'Boden-Dock & Modus-Chip', text: 'App-weites Dock am unteren Rand (Sprechen/Skizzieren/CAD, Sonne, Aufnahme, …); die Statuszeile zeigt den erkannten Arbeitsmodus und warum — ein Klick wechselt, hält fest oder schaltet die Automatik aus.' },
    ],
    bedienung: [
      'In 3D das Volumen prüfen, mit dem Modus-Umschalter (Modellieren/Kamera/Review) die richtige Rolle wählen.',
      'Auf «Grundriss» wechseln und mit Wand/Stütze/Zone zeichnen — die Maus rastet an bestehenden Bauteilen ein, eine getippte Zahl + Enter setzt die exakte Länge.',
      'Öffnungen direkt in die Wand klicken und im Inspector parametrieren (Flügeltyp, Teilung, Beschlag).',
      'Rechts Kennzahlen und Checks lesen; einen Befund anklicken, um im Plan zur Stelle zu springen.',
      'Über «Export» das gewünschte Format ziehen — jeder Weg trägt dieselbe Strich-Matrix und die eingebetteten Schriften.',
    ],
    neu077:
      'Der dezente «Kosmos»-Glass-Kopf zieht sich seit dieser Version durch alle Stationen (0.7.6 hat ihn hier eingeführt: Viewport-Chrome, Bearbeitungsmodi, HUD).',
  },
  {
    id: 'werkplan', nr: '3', titel: 'Der 2D-Werkplan (Grundriss · Schnitt · Ansicht)', farbe: '#4e4a42', shot: '06-design-grundriss',
    zweck:
      'Dieselbe Wahrheit wie das 3D-Modell, nur als Zeichnung. Grundriss, Schnitt, Ansicht und Situationsplan entstehen als reine Ableitungen (derive/) aus dem Doc — nie umgekehrt gepflegt. Alle gedruckten Pläne folgen EINER Strich-Matrix aus Stiftstärke × Grauton × Linientyp (geschnitten #111, gesehen #3A3A3A, Projektion #666, Kontext #8a8a8a) und der SIA-Planungsphase.',
    werkzeuge: [
      { name: 'Phasen-LOD-Treppe', text: 'Wettbewerb/Vorprojekt → Bauprojekt/Baueingabe → Werkplan: geschnittene Bauteile werden SIA-gemäss dargestellt (ein Poché bzw. Schichten tragend/nichttragend/Dämmung), Nachbarkontext gefüllt/Umriss/aus, Parzellengrenze immer strichpunktiert.' },
      { name: 'Zoom-Detailstufen', text: 'Aus der Distanz bleibt nur, was lesbar ist; Öffnungen und Umbau-Farbcode bleiben in jeder Stufe sichtbar.' },
      { name: 'Öffnungssymbolik', text: 'Fensterflügel zeigen die Öffnungsrichtung (innen durchgezogen, aussen gestrichelt), ab Vorprojekt trägt jede Öffnung eine Leibungslinie, im Werkplan zusätzlich die Rahmenlinie.' },
      { name: 'Umbau-Farben', text: 'Bestand grau, Abbruch/Neu in SIA-Kadenz — aus EINEM Modell über den Renovations-Status je Bauteil.' },
      { name: 'Ebenen & Darstellung', text: 'Ebenen-Schalter (Raster, Kontext, Möbel, Texte, Masse), Poché-Modus, Bemassungsstil.' },
    ],
    bedienung: [
      'Die SIA-Phase bestimmt automatisch die Darstellungstiefe — für den Plansatz die passende Phase wählen.',
      'Mit Leertaste-halten + Ziehen verschieben (mit Pan-Grenze, die Zeichnung geht nie verloren), Doppeltipp zoomt auf die Stelle.',
      'Werkzeug-Kurztasten nutzen (A Auswahl, W Wand, Z Zone …), «?» zeigt die Übersicht.',
    ],
  },
  {
    id: 'draw', nr: '4', titel: 'KosmoDraw — Modellbaum · Mengen · Ausmass', farbe: '#4e4a42', shot: '09-draw',
    zweck:
      'Das lesende Gegenstück zum Zeichnen: der Modellbaum zeigt die Bauteil-Hierarchie, die Mengen-Ansicht die SIA-416-Flächen und -Mengen, das Ausmass die exportierbare Mengenliste (CSV). Alle Zahlen sind Ableitungen aus dem Doc.',
    werkzeuge: [
      { name: 'Baum', text: 'Geschoss → Bauteil-Hierarchie zum Navigieren und Auswählen.' },
      { name: 'Mengen', text: 'SIA-416-Kennwerte (HNF/NGF/GF …) und Bauteilmengen, live aus dem Modell.' },
      { name: 'Ausmass', text: 'Tabellarische Mengenliste mit CSV-Export für die Weiterverarbeitung.' },
    ],
    bedienung: [
      'In KosmoDesign den Draw-Schalter öffnen.',
      'Zwischen Baum · Mengen · Ausmass umschalten.',
      'Im Ausmass die CSV exportieren, wenn die Mengen nach aussen sollen.',
    ],
  },
  {
    id: 'vis', nr: '5', titel: 'KosmoVis — Node-Graph & Render-Kette', farbe: '#c79a3d', shot: '10-vis',
    zweck:
      'Die Visualisierungsstation als voller Node-Editor: Kamera, Szene, Material und Render als verbundene Knoten. Der Render-Node fragt in Architektensprache (Fassade, Szene, Jahreszeit, Personen) und baut daraus einen sichtbaren Prompt; die Kette läuft über die HomeStation-Bridge (im Container als Fake-Render).',
    werkzeuge: [
      { name: 'Node-Editor', text: 'Mehrfachauswahl, Gruppen-Verschieben mit EINEM Rückgängig, 24px-Raster-Einrasten, Ausrichten-Leiste (links/oben/verteilen), orthogonale oder kurvige Kanten, einklappbare Nodes, Minimap ab 5 Nodes.' },
      { name: '«Drei Stimmungen»', text: 'Legt in einem Zug drei parallele Render-Ketten mit unterschiedlichen Stimmungen an — ohne Überlappung.' },
      { name: 'Kuratier-Fläche', text: 'Sammelt Render- und Viewport-Aufnahmen als Karten: 3-Spalten-Raster, Filter (Alle/Favoriten/Verworfen), Raster/Vergleich-Umschalter, A/B-Parameter-Diff-Tabelle, Inspektor mit Herkunfts-Kette und Bewertung (aus echten Qualitätswerten, keine erfundenen Sterne).' },
      { name: 'Auto-Kamera & Presets', text: 'Kamera aus dem Modell, Cycles-Presets, Bildkomposition am Render-Node.' },
      { name: 'Phasen-Regel', text: '«Phase entscheidet»: bis Baueingabe Weissmodell, ab Ausschreibung Materialien — Visualisierungs-Aufnahmen werden in den phasengerechten Modus gezwungen.' },
    ],
    bedienung: [
      'Über die Zentrale oder das Menü KosmoVis öffnen.',
      '«Drei Stimmungen» oder einen eigenen Graph anlegen; Nodes verbinden, den Render-Node parametrieren.',
      'Render ausführen (braucht eine verbundene HomeStation; ohne echte GPU meldet die App das ehrlich) und die Ergebnisse in der Kuratier-Fläche merken/vergleichen.',
    ],
    neu077:
      'Die Kuratierung ist seit 0.7.6 von einem Einblend-Fenster zur vollen Fläche gewachsen (Karten-Raster, A/B-Diff, Inspektor).',
  },
  {
    id: 'data', nr: '6', titel: 'KosmoData — das Daten-Dach', farbe: '#46617a', shot: '11-data',
    zweck:
      'Der Referenz- und Wissensspeicher: Präzedenz-Bauten, Bauteilkatalog und die Wissensbasis. Der Referenzkatalog erscheint als Tabelle (ID, Objekt, Quelle, Epoche, Material, Status) mit Quellen- und Epochen-Leiste zum Filtern — Epoche aus dem Baujahr abgeleitet, Status (Indexiert/Sync/Lokal) aus vorhandenen Feldern konstruiert, nichts erfunden.',
    werkzeuge: [
      { name: 'Referenzen', text: 'Tabelle mit Facetten-Leiste; ohne Internet gezeichnete Tusche-Piktogramme je Typologie statt kaputter Bild-Links («Bild nicht lokal — Quelle: …»).' },
      { name: 'Referenz-Dossier', text: 'Programm, Kontext, Einordnung, kapitelweiser Architektur-Text, 3D-Modelle, Quellen, Datenbankprofil — aufklappbar, mit Querverweisen ins Gedächtnis und Wissen.' },
      { name: 'Bauteilkatalog', text: 'Aufbauten/Bauteile als Facetten-Katalog, offline voll verfügbar.' },
      { name: 'Wissen (Docling)', text: 'Per Docling importierte PDFs werden zu Markdown-Notizen; Kosmos Antworten zitieren die Import-Notiz als [Q]-Quelle.' },
    ],
    bedienung: [
      'KosmoData öffnen, über die Quellen-/Epochen-Leiste den Referenzkatalog filtern.',
      'Eine Karte öffnen, um das Referenz-Dossier aufzuklappen.',
      'Über den Wissen-Tab Importe mit Herkunftszeile einsehen.',
    ],
  },
  {
    id: 'asset', nr: '7', titel: 'KosmoAsset — die Bibliothek der Dinge', farbe: '#7a6a55', shot: '12-asset',
    zweck:
      'Die Material- und Objektbibliothek: Materialien mit Quelle (Pflichtfeld), echten Dimensionen und 3D-Würfel-Vorschau, dazu Möbel/Objekte für den Plan. Der Bestand ist offline vollständig da.',
    werkzeuge: [
      { name: 'Materialien', text: 'Katalog mit 3D-Würfel-Vorschau, Quelle als Pflichtfeld, echte Dimensionen.' },
      { name: 'Objekte/Möbel', text: 'Platzierbare Objekte für Grundriss und 3D.' },
      { name: 'Ehrliche Leerbilder', text: 'Karten ohne Foto tragen ein gezeichnetes Signet «kein Bild hinterlegt» statt leerer Farbfläche.' },
    ],
    bedienung: [
      'KosmoAsset öffnen und zwischen Materialien und Objekten wechseln.',
      'Ein Material wählen — die Würfel-Vorschau zeigt es räumlich.',
      'Aus KosmoDesign heraus lassen sich Materialien/Möbel im Modell zuweisen.',
    ],
  },
  {
    id: 'publish', nr: '8', titel: 'KosmoPublish — Blatt & Druck', farbe: '#6f8b6a', shot: '13-publish',
    zweck:
      'Die Publikationsstation: Blätter füllen, Ansichten/Schnitte/Situationsplan platzieren, Plankopf, Publikations-Sets, Baugesuch-Blattsatz und das mehrteilige Projekt-Dossier. «Blatt füllen» ergänzt fehlende Ansichten automatisch aus dem Modell — ein Rückgängig-Schritt, nichts doppelt.',
    werkzeuge: [
      { name: 'Blatt füllen', text: 'Ergänzt Ansichten, Schnitte und Situationsplan automatisch aus dem Modell und meldet ehrlich, was fehlt.' },
      { name: 'Ansichten platzieren', text: 'Grundriss/Schnitt/Axonometrie/Situationsplan auf dem Blatt anordnen, verschieben, anpassen; Bild-Slots für Renderings.' },
      { name: 'Plankopf & Typografie', text: 'Titel in Lato (versal), alles Messbare (Masse, Koten, Tabellen, Plankopf-Meta) in IBM Plex Mono mit Tabellenziffern — fürs PDF fest eingebettet. Bauherr/Verfasser aus den Projekt-Stammdaten erscheinen automatisch.' },
      { name: 'Publikations-Sets', text: 'Benannte Blattsätze (z.B. «Wettbewerb») speichern und wiederverwenden.' },
      { name: 'Baugesuch', text: 'Blattsatz mit Ausnützungsnachweis; Revisionswolken und -einträge.' },
      { name: 'Dossier', text: 'Mehrteiliges Projekt-Dossier (A4: Übersicht, Kennzahlen, Bild-Slots, Herkunfts-Kette, Grenzen-Block) mit SVG- und PDF-Export.' },
    ],
    bedienung: [
      'KosmoPublish öffnen, «Blatt füllen» drücken — die fehlenden Pläne werden aus dem Modell gesetzt.',
      'Einzelne Ansichten verschieben/anpassen, Bild-Slots mit Renderings belegen.',
      'Über «Dossier» das mehrteilige Blatt öffnen und als SVG oder PDF exportieren (aktiv, sobald ein Projekt geladen ist).',
    ],
    neu077:
      'NEU 0.7.7: der Knopf «Dossier» in der Publish-Werkzeugleiste macht das seit 0.7.6 gebaute Projekt-Dossier direkt erreichbar (siehe folgendes Bild).',
  },
  {
    id: 'prepare', nr: '9', titel: 'KosmoPrepare — Grundlagen & Standort', farbe: '#7d5e78', shot: '15-prepare',
    zweck:
      'Die Vorbereitungsstation: Projektgrundlagen, Standort/Parzelle, Nachbarkontext und Raumprogramm — das, was ein Entwurf an Rahmen braucht, bevor gezeichnet wird. «Nachbarn übernehmen» holt echte Gebäude-Polygone von geo.admin.ch (VECTOR25) und zeigt sie als graue Footprints.',
    werkzeuge: [
      { name: 'Standort/Parzelle', text: 'Parzellengrenze und Situation; Nachbargebäude amtlich übernehmen (Datenstand ehrlich benannt).' },
      { name: 'Raumprogramm', text: 'Programm erfassen, das später gegen den Entwurf geprüft wird (Programm-Erfüllung je Variante).' },
      { name: 'Terrain', text: 'Erfasstes Geländeprofil, das im 3D-Viewport als Mesh erscheint.' },
    ],
    bedienung: [
      'KosmoPrepare öffnen und Standort/Parzelle setzen.',
      'Nachbarn übernehmen, falls amtlicher Kontext gebraucht wird.',
      'Das Raumprogramm hinterlegen — es speist Checks und Variantenstudien.',
    ],
  },
  {
    id: 'dev', nr: '10', titel: 'KosmoDev — das Auftragsbuch', farbe: '#5e6b52', shot: '16-dev',
    zweck:
      'Die Werkstatt an der Software selbst: ein Auftragsbuch, in dem Wünsche und Befunde zur App erfasst, priorisiert und nachverfolgt werden — die ehrliche Rückkopplung aus der Nutzung ins Produkt.',
    werkzeuge: [
      { name: 'Auftrag erfassen', text: 'Freitext-Auftrag anlegen (z.B. «Türanschläge im Grundriss wählbar machen»), als Karte im Buch.' },
      { name: 'Priorität & Status', text: 'Aufträge priorisieren und ihren Stand pflegen.' },
    ],
    bedienung: [
      'KosmoDev öffnen, im Textfeld den Auftrag formulieren und erfassen.',
      'Die Karten priorisieren; der Stand bleibt im Projekt erhalten.',
    ],
  },
  {
    id: 'doc', nr: '11', titel: 'KosmoDoc — Diagnose & Tech-Radar', farbe: '#5d7489', shot: '17-doc',
    zweck:
      'Die Selbstauskunft der Software: Berichte, System-/Wissenskarten und der Tech-Radar, der zeigt, worauf KosmoOrbit technisch steht und was beobachtet wird — Scan-Posten ehrlich mit ⚠ markiert.',
    werkzeuge: [
      { name: 'Tech-Radar', text: 'Technische Standortbestimmung; beobachtete Punkte offen markiert.' },
      { name: 'Berichte', text: 'KosmoDoc-Berichte (u.a. die E2E-Screenshots je Lauf) als Nachweis.' },
    ],
    bedienung: [
      'KosmoDoc öffnen und den Tech-Radar-Tab wählen.',
      'Die markierten Posten lesen — sie sind die ehrliche Roadmap-Grundlage.',
    ],
  },
  {
    id: 'train', nr: '12', titel: 'KosmoTrain — Lernen & Gedächtnis', farbe: '#8c6d3f', shot: '18-train',
    zweck:
      'Die Lernstation: Kosmos Lernjournal/Gedächtnis und die Grundlage fürs stationsweise Dazulernen (Personas, Memory). Was die HomeStation an eigenem Training (LoRA) braucht, ist offen als HomeStation-Rest markiert.',
    werkzeuge: [
      { name: 'Lernjournal/Memory', text: 'Kosmos Gedächtnis über die Sitzung — die letzten Blicke und Kommandos sind nachlesbar.' },
      { name: 'Personas', text: 'Kosmo-Rollen (Meister/Leiter/Zeichner) als Spiegel der Modell-Guideline.' },
    ],
    bedienung: [
      'KosmoTrain öffnen, das Lernjournal einsehen.',
      'Die HomeStation-abhängigen Teile sind ehrlich als «kommt mit angeschlossener Zentrale» benannt.',
    ],
  },
];

// Sonder-Kapitel (Kosmo-KI, Companion, Onboarding, Kurzbefehle, Einstellungen).
// `titel` kommt als «NN · Text» — die Nummer wandert in die Marken-Spalte.
function sektion(titel: string, farbe: string, inhaltHtml: string): string {
  const [nr, ...rest] = titel.split(' · ');
  const text = rest.join(' · ');
  return `<section class="kapitel" style="--farbe:${farbe}">
    <div class="kap-kopf"><span class="kap-nr">${esc(nr)}</span><div class="kap-titelzeile"><div class="kap-label">Abschnitt</div><h2>${text}</h2></div></div>
    ${inhaltHtml}
  </section>`;
}

function stationHtml(kap: Kapitel): string {
  const wk = kap.werkzeuge
    .map((w) => `<li><b>${esc(w.name)}</b> — ${esc(w.text)}</li>`)
    .join('');
  const bd = kap.bedienung.map((s) => `<li>${esc(s)}</li>`).join('');
  const neu = kap.neu077 ? `<p class="neu"><span class="neu-glyph">◆</span> ${esc(kap.neu077)}</p>` : '';
  return `<section class="kapitel" style="--farbe:${kap.farbe}">
    <div class="kap-kopf"><span class="kap-nr">${esc(kap.nr.padStart(2, '0'))}</span><div class="kap-titelzeile"><div class="kap-label">Station</div><h2>${esc(kap.titel)}</h2></div></div>
    <p class="zweck">${esc(kap.zweck)}</p>
    ${bild(kap.shot, kap.titel)}
    <div class="zweispalt">
      <div class="feld"><h3>Werkzeuge &amp; Panels</h3><ul class="wk">${wk}</ul></div>
      <div class="feld"><h3>Schritt für Schritt</h3><ol class="bd">${bd}</ol>${neu}</div>
    </div>
  </section>`;
}

// Neuigkeiten 0.7.0–0.7.7 aus dem Produktivcode (kuratiert, Auszug der Kernpunkte).
const NEU_077 = [
  'Dossier direkt in der Publish-Station erreichbar (Knopf «Dossier», SVG-/PDF-Export).',
  'Governance-Persistenz: «Für den Job erlauben» überlebt den Neustart und endet nur per ausdrücklichem Widerruf — kein vorgetäuschtes Verfallsdatum.',
  'Onboarding «Zentrale koppeln» echt: QR-Code + ehrliche Zustände (suche/gefunden/nicht gefunden — manuell/Cloud) aus dem realen Verbindungstest.',
  'Kosmos-Glass-Kopf jetzt auf allen Stationen (Publish, Grundlagen, Bibliothek, Training, Diagnose) — rein optisch, Bedienung unverändert.',
  'Testpflege: ein Blatt-Test-Fehlalarm behoben; zwei Viewport-Render-Tests bleiben ohne echte GPU offen (Umgebungsgrenze, ehrlich als 0.7.8-Punkt notiert).',
];

// Command-Teil HTML
function cmdListeHtml(): string {
  const bloecke: string[] = [];
  for (const [dom, label] of Object.entries(DOMAENEN)) {
    const list = cmdsProDomaene.get(dom) ?? [];
    if (!list.length) continue;
    const zeilen = list
      .map((c) => `<tr><td class="cmd-id">${esc(c.id)}</td><td class="cmd-titel">${esc(c.title)}</td><td class="cmd-desc">${esc(c.description)}</td></tr>`)
      .join('');
    bloecke.push(`<h3 class="cmd-dom">${esc(label)} <span class="cmd-anz">(${list.length})</span></h3>
      <table class="cmd-tabelle"><thead><tr><th>Command-ID</th><th>Titel</th><th>Beschreibung (= LLM-Tool-Schema)</th></tr></thead><tbody>${zeilen}</tbody></table>`);
  }
  return bloecke.join('\n');
}

const stationenHtml = STATIONEN.map(stationHtml).join('\n');

const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
  /* ── ClaudeDesign / «Kosmos» — die dunkle Werkplan-Sprache der App ──
     Tokens gespiegelt aus packages/kosmo-ui/src/aura.css ([data-theme='orbit'])
     und tokens.ts (moduleHue). Zwei Schriftstimmen: versal-enge Grotesk für
     Titel, IBM Plex Mono für Marken/Labels/Masse. */
  :root {
    --field:#0b0d12; --surface:#14171f; --raised:#1a1e27; --sink:#0e1117;
    --ink:#f4f6fa; --soft:#b6bdcb; --faint:#6e7686; --technik:#444b59;
    --line:#222732; --line2:#2a3140; --signal:#57b6c2; --signal-tinte:#06141a;
    --glass:rgba(20,23,31,0.72); --glass-stroke:rgba(255,255,255,0.08);
    --grotesk:'Inter','SF Pro Display',-apple-system,'Segoe UI',Roboto,sans-serif;
    --mono:'IBM Plex Mono',ui-monospace,'SF Mono',Menlo,monospace;
  }
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  html { background: var(--field); }
  body { font-family: var(--grotesk); color: var(--soft); font-size: 10.6px; line-height: 1.52;
    padding: 0 13mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  /* Vollflächiger dunkler Grund auf JEDER Seite (position:fixed wiederholt im Druck). */
  .bg { position: fixed; inset: 0; background:
      radial-gradient(120mm 120mm at 82% 20%, rgba(87,182,194,0.06), rgba(11,13,18,0) 70%),
      var(--field); z-index: -2; }
  .bg::after { content:''; position: fixed; inset: 0; z-index:-1;
    background-image: linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px);
    background-size: 24px 24px; opacity: 0.14; }
  h1,h2,h3 { line-height: 1.16; color: var(--ink); }
  b { color: var(--ink); font-weight: 600; }
  code, .mono { font-family: var(--mono); }
  .mono { color: var(--soft); }

  /* ── Titelseite ── */
  .titel { position: relative; height: 286mm; margin: 0 -13mm; padding: 40mm 24mm 22mm;
    page-break-after: always; display: flex; flex-direction: column; overflow: hidden; }
  .titel .passer { position: absolute; width: 16px; height: 16px; color: var(--signal); font-size: 16px; line-height: 16px; opacity: 0.9; }
  .titel .p-tl { top: 12mm; left: 14mm; } .titel .p-tr { top: 12mm; right: 14mm; }
  .titel .p-bl { bottom: 12mm; left: 14mm; } .titel .p-br { bottom: 12mm; right: 14mm; }
  .titel .marke { font-family: var(--mono); letter-spacing: 4px; font-size: 11px; color: var(--faint); text-transform: uppercase; }
  .titel .sig { margin-top: 3mm; width: 46px; height: 46px; border: 1.5px solid var(--signal); border-radius: 50%; position: relative; box-shadow: var(--k-glow, 0 0 26px rgba(87,182,194,0.45)); }
  .titel .sig::before { content:''; position:absolute; inset: 13px; border-radius:50%; background: var(--signal); }
  .titel .sig::after { content:''; position:absolute; left:50%; top:-10px; bottom:-10px; width:1px; background: linear-gradient(var(--signal), transparent); transform: translateX(-0.5px); opacity:.4; }
  .titel h1 { font-size: 50px; margin: auto 0 6px; font-weight: 800; letter-spacing: -1.5px; text-transform: uppercase; color: var(--ink); }
  .titel h1 .zeile2 { color: var(--signal); }
  .titel .unter { font-size: 15px; color: var(--soft); margin: 0 0 22px; max-width: 130mm; }
  .titel .ver { display: inline-flex; align-items:center; gap:8px; font-family: var(--mono); font-size: 12px; color: var(--signal);
    border: 1px solid var(--signal-line, #57b6c266); background: var(--signal-fill, #57b6c21f); padding: 6px 12px; border-radius: 4px; align-self: flex-start; margin-bottom: 26px; }
  .titel .ver::before { content:'▚'; opacity:.7; }
  .titel .fuss { font-family: var(--mono); font-size: 9.5px; color: var(--faint); border-top: 1px solid var(--line2); padding-top: 12px; line-height: 1.7; letter-spacing: .2px; }
  .titel .fuss b { color: var(--soft); font-weight: 500; }

  /* ── Abschnitts-Titel (Werkplan-Kopf) ── */
  h2.abschnitt { font-size: 19px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.4px; color: var(--ink);
    margin: 10mm 0 4mm; padding-bottom: 6px; border-bottom: 1px solid var(--technik); position: relative; }
  h2.abschnitt::before { content:'⌖'; color: var(--signal); font-weight: 400; margin-right: 9px; font-size: 15px; }
  h2.abschnitt::after { content:'§'; position: absolute; right: 2px; bottom: 6px; font-family: var(--mono); font-size: 11px; color: var(--faint); }
  .lead { font-size: 11px; color: var(--soft); margin: 0 0 6mm; }
  .lead .mono, .mono { color: var(--signal); }

  /* ── Inhaltsverzeichnis ── */
  .toc { page-break-after: always; }
  ol.toc-liste { list-style: none; columns: 2; column-gap: 12mm; margin: 5mm 0 0; padding: 0; font-size: 10.5px; }
  ol.toc-liste li { margin: 0 0 6px; break-inside: avoid; color: var(--soft); border-bottom: 1px dotted var(--line2); padding-bottom: 5px; }
  .toc-nr { font-family: var(--mono); font-size: 9px; color: var(--signal); margin-right: 9px; }

  /* ── Stationskarte (Glass, gekappte Ecke, Modul-Tönung) ── */
  .kapitel { page-break-inside: avoid; margin: 6mm 0 8mm; padding: 6mm 6mm 5mm; position: relative;
    background: var(--glass); border: 1px solid var(--glass-stroke); border-top: 2px solid var(--farbe, #888);
    box-shadow: 0 10px 34px rgba(0,0,0,0.38);
    clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%); }
  .kap-kopf { display: flex; align-items: center; gap: 14px; margin-bottom: 6px; }
  .kap-nr { font-family: var(--mono); font-size: 30px; font-weight: 700; line-height: 1; color: var(--farbe, #888);
    min-width: 46px; text-align: right; text-shadow: 0 0 18px color-mix(in srgb, var(--farbe, #888) 55%, transparent); }
  .kap-titelzeile { border-left: 1px solid var(--line2); padding-left: 12px; }
  .kap-label { font-family: var(--mono); font-size: 8.5px; letter-spacing: 2.5px; text-transform: uppercase; color: var(--faint); margin-bottom: 1px; }
  .kap-kopf h2 { font-size: 16px; margin: 0; font-weight: 700; letter-spacing: -0.3px; }
  .zweck { margin: 2px 0 8px; color: var(--soft); }

  /* ── Screenshot im Passer-Rahmen ── */
  .figur { margin: 5px 0 9px; }
  .figur-rahmen { position: relative; padding: 5px; border: 1px solid var(--line2); background: var(--sink); }
  .shot { width: 100%; display: block; border: 1px solid #000; }
  .figur-rahmen .tick { position: absolute; width: 9px; height: 9px; z-index: 2; }
  .figur-rahmen .tick::before, .figur-rahmen .tick::after { content:''; position:absolute; background: var(--signal); }
  .figur-rahmen .tick::before { width: 9px; height: 1px; top: 0; } .figur-rahmen .tick::after { width: 1px; height: 9px; left: 0; }
  .figur-rahmen .tl { top: -1px; left: -1px; } .figur-rahmen .tr { top: -1px; right: -1px; transform: scaleX(-1); }
  .figur-rahmen .bl { bottom: -1px; left: -1px; transform: scaleY(-1); } .figur-rahmen .br { bottom: -1px; right: -1px; transform: scale(-1); }
  figcaption { font-family: var(--mono); font-size: 8.5px; letter-spacing: 1px; text-transform: uppercase; color: var(--faint); margin-top: 5px; }
  .figur-glyph { color: var(--signal); margin-right: 4px; }
  .shot-fehlt { width: 100%; border: 1px dashed var(--line2); padding: 10px; font-size: 10px; color: var(--faint); background: var(--sink); margin: 5px 0 9px; }

  /* ── Zwei-Spalten Werkzeuge / Bedienung ── */
  .zweispalt { display: grid; grid-template-columns: 1fr 1fr; gap: 7mm; }
  .feld h3 { font-family: var(--mono); font-size: 9px; margin: 0 0 5px; color: var(--signal); text-transform: uppercase; letter-spacing: 1.5px;
    border-bottom: 1px dashed var(--line2); padding-bottom: 3px; }
  ul.wk { margin: 0; padding-left: 14px; list-style: none; } ul.wk li { margin: 0 0 5px; position: relative; }
  ul.wk li::before { content:'▪'; color: var(--farbe, var(--signal)); position: absolute; left: -13px; }
  ol.bd { margin: 0; padding-left: 16px; } ol.bd li { margin: 0 0 5px; }
  ol.bd li::marker { color: var(--faint); font-family: var(--mono); font-size: 9px; }
  .neu { margin-top: 7px; font-size: 9.5px; color: var(--soft); background: var(--signal-fill, rgba(87,182,194,0.10));
    border: 1px solid var(--signal-line, rgba(87,182,194,0.32)); border-left: 2px solid var(--signal); padding: 6px 9px; border-radius: 3px; }
  .neu-glyph { color: var(--signal); }

  /* ── Architektur ── */
  .arch { page-break-before: always; }
  .arch p, .lead + p, p { margin: 0 0 6px; }
  .arch h3, h3.blk { font-family: var(--grotesk); font-size: 12.5px; font-weight: 700; color: var(--ink);
    margin: 7mm 0 3px; text-transform: uppercase; letter-spacing: 0.2px; }
  .arch h3::before, h3.blk::before { content:'//'; color: var(--signal); font-family: var(--mono); margin-right: 7px; font-size: 11px; }
  .flow { font-family: var(--mono); font-size: 10px; background: var(--sink); color: var(--signal-hell, #cfe9e4);
    padding: 12px 14px; border: 1px solid var(--line2); border-left: 2px solid var(--signal); border-radius: 4px; margin: 7px 0; white-space: pre-wrap; line-height: 1.45; }
  .paket { break-inside: avoid; background: var(--glass); border: 1px solid var(--glass-stroke); border-left: 2px solid var(--signal);
    padding: 8px 11px; margin: 5px 0; border-radius: 3px; }
  .paket b { color: var(--ink); }

  /* ── Command-Tabelle ── */
  .cmd-dom { font-family: var(--grotesk); font-size: 12px; font-weight: 700; margin: 8mm 0 4px; color: var(--ink);
    border-bottom: 1px solid var(--technik); padding-bottom: 4px; text-transform: uppercase; letter-spacing: 0.2px; }
  .cmd-dom::before { content:'▚'; color: var(--signal); margin-right: 7px; }
  .cmd-anz { font-family: var(--mono); color: var(--faint); font-weight: 400; font-size: 10px; }
  table.cmd-tabelle { width: 100%; border-collapse: collapse; font-size: 9px; }
  table.cmd-tabelle th { text-align: left; background: var(--surface); color: var(--faint); padding: 4px 6px;
    border-bottom: 1px solid var(--line2); font-family: var(--mono); font-size: 8px; text-transform: uppercase; letter-spacing: 0.8px; }
  table.cmd-tabelle td { padding: 4px 6px; border-bottom: 1px solid var(--line); vertical-align: top; color: var(--soft); }
  table.cmd-tabelle tr:nth-child(even) td { background: rgba(255,255,255,0.018); }
  td.cmd-id { font-family: var(--mono); color: var(--signal); white-space: nowrap; }
  td.cmd-titel { font-weight: 600; color: var(--ink); white-space: nowrap; }
  td.cmd-desc { color: var(--soft); }
  tr { break-inside: avoid; }

  ul.neu-liste { padding-left: 16px; list-style: none; } ul.neu-liste li { margin: 0 0 5px; position: relative; }
  ul.neu-liste li::before { content:'◆'; color: var(--signal); position: absolute; left: -15px; font-size: 8px; top: 2px; }
  .fuss-block { margin-top: 8mm; font-family: var(--mono); font-size: 9px; color: var(--faint); border-top: 1px dashed var(--line2); padding-top: 4mm; line-height: 1.6; }
  .fuss-block b { color: var(--soft); }
</style></head><body>
<div class="bg"></div>

<!-- Titelseite -->
<div class="titel">
  <span class="passer p-tl">⌖</span><span class="passer p-tr">⌖</span><span class="passer p-bl">⌖</span><span class="passer p-br">⌖</span>
  <div class="marke">ArchitekturKosmos · Baubüro Andrin</div>
  <div class="sig"></div>
  <h1>KosmoOrbit<br/><span class="zeile2">Software-Handbuch</span></h1>
  <div class="unter">Der vollständige Rundgang: jede Station, jedes Werkzeug — und wie die Software aufgebaut ist.</div>
  <span class="ver">Version 0.7.7 «Verankerung &amp; Feinschliff» · 13.07.2026</span>
  <div class="fuss">
    <b>Lokal-first Monorepo für Architektur</b> — BIM-Kern, 2D-Pläne, Visualisierung, Wissen und die Büro-KI «Kosmo».<br/>
    Alle Screenshots sind echte Aufnahmen des laufenden v0.7.7-Preview-Builds. Die Command-Liste stammt zur Laufzeit
    aus dem Kernel-Register (allCommands()). · GESTALTUNG: Kosmos / ClaudeDesign
  </div>
</div>

<!-- Inhaltsverzeichnis -->
<div class="toc">
  <h2 class="abschnitt">Inhalt</h2>
  <ol class="toc-liste">
    ${[
      'Was KosmoOrbit ist',
      ...STATIONEN.map((s) => s.titel),
      'Kosmo — die Büro-KI (Chat & Diff-Karten)',
      'Companion — Mitlesen & Freigeben am Zweitgerät',
      'Erststart-Assistent (Onboarding)',
      'Einstellungen, Kurzbefehle & «Funktionen & Neues»',
      'Neuerungen 0.7.7',
      'Architektur: Command → Patch → Undo/Sync/.kosmo',
      `Vollständige Command-Liste (${cmds.length})`,
      'Pakete-Landkarte, KI-Provider & Betriebsarten',
    ]
      .map((t, i) => `<li><span class="toc-nr">${String(i + 1).padStart(2, '0')}</span>${esc(t)}</li>`)
      .join('')}
  </ol>
</div>

<!-- Intro -->
<h2 class="abschnitt">Was KosmoOrbit ist</h2>
<p class="lead">KosmoOrbit ist die Architektur-Designzentrale des Baubüros Andrin: ein lokal-first Monorepo, in dem
Entwurf (BIM-Kern), 2D-Planwesen, Visualisierung, Referenzwissen und eine steuernde Büro-KI («Kosmo») zu einem
Werkzeug zusammenlaufen. Die Software läuft als Web-, Desktop- (Tauri) und iPad-App aus derselben Quelle.</p>
<p>Ein Leitgedanke trägt alles: <b>Alles ist ein Command.</b> Jeder schreibende Schritt — eine Wand, ein Fenster, eine
Zone, ein Blatt — ist ein registrierter Command mit zod-Schema. Daraus folgt dreierlei ohne Zusatzaufwand:
Menschen bedienen ihn über die Werkzeuge, die Command-Palette listet ihn, und Kosmo bekommt ihn als LLM-Tool.
Was Kosmo kann, ist genau die Menge der Commands — und alles, was Kosmo tut, ist rückgängig-, inspizier- und
nachvollziehbar. Pläne, Schnitte, Mengen und Renderszenen sind reine Ableitungen aus dem Modell (<span class="mono">derive/</span>),
nie umgekehrt gepflegt.</p>

<!-- Stationen -->
<h2 class="abschnitt" style="page-break-before:always">Die Stationen im Einzelnen</h2>
${stationenHtml}

<!-- Kosmo KI -->
${sektion('13 · Kosmo — die Büro-KI (Chat &amp; Diff-Karten)', '#b06a8c', `
  <p class="zweck">Kosmo ist die Stimme im Raum: ein schwebendes Symbol, das per Klick das grosse Chat-Panel öffnet.
  Kosmo liest die Oberfläche und den aktuellen Blick (3D/Plan/Schnitt/Node-Fläche werden als Bild mitgegeben, wenn ein
  vision-fähiges Modell aktiv ist — sichtbar als «Kosmo sieht: ‹Station›»), schlägt Änderungen als Diff-Karten vor und
  kann die Oberfläche selbst einstellen (Modus, Panels, Ansicht, Werkzeug) — jede Aktion sichtbar im Chat quittiert.</p>
  ${bild('08-kosmo-vorschlag', 'Kosmo-Vorschlag als Diff-Karte')}
  <div class="zweispalt">
    <div><h3>Was Kosmo kann</h3><ul class="wk">
      <li><b>Diff-Karten</b> — schreibende Vorschläge erscheinen als Vorher/Nachher-Karte mit farbiger Hervorhebung; «Anwenden» läuft durch <span class="mono">denselben</span> runCommand-Weg wie ein Handgriff, als atomare Undo-Gruppe.</li>
      <li><b>Kosmo zeichnet sichtbar</b> — vor dem Übernehmen zieht ein Orb den Vorschlag auf dem Plan nach; grosse Pakete (ab 8 Schritten) legen einen «Kosmo arbeitet»-Vollbildrahmen (ESC überspringt die Schau, nicht die Anwendung).</li>
      <li><b>Oberfläche steuern</b> — Kosmo liest/stellt Modus, Panels, Ansicht und Werkzeug über <span class="mono">ui.*</span>-Werkzeuge.</li>
      <li><b>Gedächtnis</b> — die letzten ~20 Kommandos und Stationswechsel sind für Kosmo nachlesbar.</li>
    </ul></div>
    <div><h3>Bedienung</h3><ol class="bd">
      <li>Kosmo-Symbol anklicken, die Aufgabe in natürlicher Sprache eingeben.</li>
      <li>Den Vorschlag als Diff-Karte prüfen — «Anwenden» oder verwerfen.</li>
      <li>Ein Fehlschlag bleibt sichtbar: eine Chat-Zeile nennt den Grund, nichts verschwindet still.</li>
    </ol>
    <p class="neu">◆ Kosmo bleibt ehrlich: in der Cloud-Betriebsart gibt sich die KI nicht als Basismodell aus und nennt auf Nachfrage ihr echtes Modell (Anthropic Claude).</p></div>
  </div>
`)}

<!-- Companion -->
${sektion('14 · Companion — Mitlesen &amp; Freigeben am Zweitgerät', '#4f7a7a', `
  <p class="zweck">Eine schmale, orb-zentrierte Ansicht für jedes per QR gekoppelte Gerät (App-Adresse + «#companion»):
  der grosse Kosmo-Orb mit seinen neun echten Zuständen, daneben die laufenden Agenten und Aufträge. Ein abgestuftes
  Freigabe-Gate (Einmal erlauben / Für den Job erlauben / Nachfragen / Ablehnen) steuert, was Kosmo darf — jede Stufe mit
  echter Wirkung, inklusive Abbrechen eines laufenden Vis-Jobs.</p>
  ${bild('19-companion', 'Companion — Governance-Kontext')}
  <p class="neu">◆ NEU 0.7.7: «Für den Job erlauben» überlebt jetzt einen Neustart (localStorage-Allowlist) und endet ehrlich nur per ausdrücklichem Widerruf — kein vorgetäuschtes Verfallsdatum.</p>
`)}

<!-- Onboarding -->
${sektion('15 · Erststart-Assistent (Onboarding)', '#7d5e78', `
  <p class="zweck">Der erste Start ist ein 4-Schritt-Assistent mit klickbarem Stepper: Konto &amp; Büro · Kosmo-Zentrale
  koppeln · Modelle &amp; Core laden · erstes Projekt. Die Hardware-Kopplung und der Modell-Download benennen offen, was erst
  mit einer angeschlossenen Zentrale kommt, statt einen Fortschritt vorzutäuschen.</p>
  ${bild('20-onboarding', 'Onboarding — Zentrale koppeln (QR)')}
  <p class="neu">◆ NEU 0.7.7: der Schritt «Zentrale koppeln» ist echt — ein QR-Code zum Koppeln eines Zweitgeräts und ehrliche Zustände (suche / gefunden / nicht gefunden — manuell koppeln / im Cloud-Betrieb keine eigene Zentrale nötig) aus dem realen /health-Verbindungstest, keine erfundenen Gerätezeilen.</p>
`)}

<!-- Einstellungen -->
${sektion('16 · Einstellungen, Kurzbefehle &amp; «Funktionen &amp; Neues»', '#5d7489', `
  <p class="zweck">Ein zentrales Einstellungs-Panel (⚙) bündelt Darstellung (Thema «Papier» hell / «Kosmos» dunkel),
  Rundgang, Kosmo/Werkzeuge, Leistung, Bewegung &amp; Klang, Oberflächen-Anpassung und System (Deinstallieren, Palette) —
  zusätzlich je Station erreichbar. Die «?»-Taste zeigt jederzeit die Kurzbefehle. Der Reiter «Funktionen &amp; Neues»
  führt die ehrlichen Release-Notizen je Version — jeder Punkt gegen einen ROADMAP-Beleg geprüft.</p>
  <div class="zweispalt">
    <div>${bild('03-einstellungen', 'Einstellungen')}</div>
    <div>${bild('04-neuigkeiten', 'Funktionen & Neues')}</div>
  </div>
  ${bild('02-kurzbefehle', 'Kurzbefehle-Übersicht')}
`)}

<!-- Neuerungen 0.7.7 -->
<h2 class="abschnitt" style="page-break-before:always">Neuerungen in 0.7.7 «Verankerung &amp; Feinschliff»</h2>
<p class="lead">Eine Über-Nacht-Runde, die die auf 0.7.6 offen benannten Punkte einlöste — in drei dateidisjunkten
Wellen, je Welle integriert und gegatet. Alle Punkte sind gegen einen ROADMAP-Eintrag (343–348) belegt.</p>
<ul class="neu-liste">${NEU_077.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
<p class="fuss-block">Ehrlich vertagt → 0.7.8: die zwei Viewport-Render-E2E (headless-WebGL-Grenze, kein Regress);
ein Auto-Ablauf-Ereignis für Governance-Freigaben (heute nur expliziter Widerruf); ein tieferer Kosmos-Look je
Stationsinhalt (0.7.7 = nur Kopf/Rahmen). — Gate 0.7.7: typecheck · svg-qa 31 Goldens / 0 harte Fehler · App 882 Tests · release-gate grün.</p>

<!-- Architektur -->
<div class="arch">
<h2 class="abschnitt">Architektur — wie die Software aufgebaut ist</h2>
<p class="lead">Der Kern ist bewusst schmal und streng: eine einzige Schreib-Schnittstelle, reine Ableitungen und ein
Datenmodell, das gleichzeitig Undo, Sync und das Austauschformat trägt.</p>

<h3 style="font-size:13px;margin:6mm 0 2px">Der Datenfluss: Command → Patch → (Undo / Sync / .kosmo)</h3>
<p>Jeder Command (<span class="mono">packages/kosmo-kernel/src/commands/</span>) trägt <span class="mono">{ id, title, description, params: zodSchema, summarize, run }</span>.
<span class="mono">run(doc, params)</span> ist <b>pur</b>: es liest den Doc und liefert <span class="mono">AnyPatch[]</span> — es mutiert nie selbst. Erst
<span class="mono">execute()</span> wendet die Patches an. Aus dem Patch fliesst alles Weitere:</p>
<div class="flow">Werkzeug/Palette/Kosmo
     │  ruft mit params
     ▼
 registerCommand.run(doc, params)  ── pur ──▶  AnyPatch[]  (Patch | SettingsPatch)
     │
     ├─▶  doc.apply(patches)            (das Modell ändert sich)
     ├─▶  History: invertPatches()      (Undo/Redo, Gruppen bis 500 Schritte)
     ├─▶  Yjs-Sync                      (gekoppelte Geräte, Companion)
     └─▶  .kosmo-Paket                  (Autosave, Weitergeben, Export)

 derive/  ── pur ──▶  Grundriss · Schnitt · Axo · SIA-416-Mengen · Szene · Render-Graph
             (immer aus dem Doc berechnet, nie zurückgeschrieben)</div>
<p>Schreibende Kosmo-Vorschläge werden Diff-Karten und laufen beim «Anwenden» durch <b>denselben</b>
<span class="mono">runCommand</span>-Weg — als atomare Undo-Gruppe. Ein Mensch kann jede Kosmo-Handlung genauso rückgängig
machen, inspizieren und nachvollziehen wie einen eigenen Handgriff.</p>

<h3 style="font-size:13px;margin:6mm 0 2px">Entities &amp; Ableitungen</h3>
<p>Das Doc hält die Entities (Geschosse, Wände, Öffnungen, Zonen, Aufbauten, Dächer, Treppen, Meshes, Blätter …).
Laufzeit ≠ Modell: was durch Yjs/Undo geht, lebt im Doc; Base64-Bilder, GLB-Binärdaten und Job-Status leben in
Laufzeit-Stores. Der <span class="mono">derive/</span>-Ordner (u.a. plan, hiddenline, mengen, ausmass, baugesuch, dossier, scene,
renderprompt, kamera) rechnet alle Darstellungen und Kennwerte aus dem Doc — reine Funktionen, byte-stabil über
Golden-Tests abgesichert.</p>
</div>

<!-- Command-Liste -->
<h2 class="abschnitt" style="page-break-before:always">Vollständige Command-Liste (${cmds.length})</h2>
<p class="lead">Zur Laufzeit aus dem Kernel-Register gezogen. Jede Zeile ist zugleich ein Kosmo-LLM-Tool: die
Beschreibung ist wörtlich das Tool-Schema, das Kosmo sieht. Nach Domäne gruppiert.</p>
${cmdListeHtml()}

<!-- Pakete -->
<h2 class="abschnitt" style="page-break-before:always">Pakete-Landkarte, KI-Provider &amp; Betriebsarten</h2>
<div class="paket"><b>packages/kosmo-kernel</b> — Entities, das Command-System, Geometrie und alle <span class="mono">derive/</span>-Ableitungen. Der Ort der Wahrheit über ein Projekt.</div>
<div class="paket"><b>packages/kosmo-ai</b> — Kosmos Verstand: Provider-Abstraktion (Ollama · LM-Studio · Anthropic · Mock/Scripted), <span class="mono">ChatSession</span>, <span class="mono">commandTools()</span> (macht jedes Command zum LLM-Tool), Personas, Lernjournal/Memory und das Bild-Budget (Kosmo-Blick verkleinert Bilder vor dem Cloud-Versand).</div>
<div class="paket"><b>packages/kosmo-contracts</b> — zod-Schnittstellen zur HomeStation: <span class="mono">render-scene/v1</span>, <span class="mono">render-result</span>, <span class="mono">blender-sim</span>, <span class="mono">bridge-api</span>, <span class="mono">dev-workorder</span>, <span class="mono">kosmo-package</span> (das .kosmo-Format).</div>
<div class="paket"><b>packages/kosmo-ui</b> — Design-System (<span class="mono">aura.css</span>, Tokens, Modul-Farben), Komponenten (KButton, Panel, Meldungen/Bestätigung, Fehlerzone) und die Motion-Klassen.</div>
<div class="paket"><b>packages/kosmo-data · kosmo-sync</b> — Referenzdaten und der Yjs-Client für die Gerätekopplung.</div>
<div class="paket"><b>apps/kosmo-orbit</b> — die React-App: Stationen unter <span class="mono">src/modules/</span>, Shell unter <span class="mono">src/shell/</span>, Zustand unter <span class="mono">src/state/</span>.</div>
<div class="paket"><b>tools/</b> — <span class="mono">homestation-bridge</span> (Python, im Container mit <span class="mono">--fake</span>: Render/STT/TTS-Platzhalter) und <span class="mono">sync-server</span> (Node, Yjs auf :8700).</div>

<h3 style="font-size:13px;margin:7mm 0 2px">KI-Provider</h3>
<p>Kosmo spricht über eine schmale Streaming-Schnittstelle (bewusst plain <span class="mono">fetch</span>, kein SDK) mit lokalen LLMs
(Ollama, LM-Studio/OpenAI-kompatibel) und mit Anthropic Claude in der Cloud. Vision-fähige Provider bekommen den
Stations-Blick als Bild mit; Mock/Scripted ignorieren ihn still (kein Vertragsbruch, für Tests). Modell-Guideline des
Owners: Fable = Urteil, Opus = Orchestrierung, Sonnet = Ausführung — lokal gespiegelt als Kosmo-Meister/Leiter/Zeichner.</p>

<h3 style="font-size:13px;margin:7mm 0 2px">Betriebsarten (drei Versionen)</h3>
<div class="paket"><b>standard</b> — der HomePC selbst: lokales LLM (Ollama) + alle Werkzeuge (Render-Bridge, Sync) auf <span class="mono">localhost</span>. Volle Leistung, keine Cloud.</div>
<div class="paket"><b>remote</b> — dünner Client über VPN auf denselben HomePC: dieselben Dienste unter der VPN-Adresse; optional <span class="mono">wss/https</span> hinter einem WireGuard-Gateway/Reverse-Proxy.</div>
<div class="paket"><b>cloud</b> — voll Claude-abhängig (Owner: mind. Opus 4.8): kein lokales Modell, keine HomeStation-Werkzeuge; Browser-Fallbacks (Web-Speech, Fake-Render) tragen, was Cycles/Whisper zuhause täten. Anmeldung per API-Schlüssel oder Claude-Abo.</div>

<p class="fuss-block">KosmoOrbit v0.7.7 «Verankerung &amp; Feinschliff» · ArchitekturKosmos / Baubüro Andrin · erzeugt am 13.07.2026
aus dem laufenden Preview-Build. Handbuch-Generator: <span class="mono">e2e/tools/handbuch-077.mts</span>. Screenshots: echt.
Command-Liste: zur Laufzeit aus <span class="mono">allCommands()</span>. Ehrlichkeit vor Politur — wo etwas eine HomeStation, ein
Konto oder einen Schlüssel braucht, ist es im Text offen benannt.</p>

</body></html>`;

// ─────────────────────────────────────────────────────────────────────────
// TEIL 4 — PDF
// ─────────────────────────────────────────────────────────────────────────
console.log('Teil 3 — HTML → PDF');
const b2 = await chromium.launch({ executablePath: exe });
const p2 = await b2.newPage();
await p2.setContent(html, { waitUntil: 'networkidle' });
await p2.pdf({
  path: OUT_PDF,
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate:
    '<div style="width:100%;height:11mm;margin:0;background:#0b0d12;color:#6e7686;font-family:\'IBM Plex Mono\',Menlo,monospace;font-size:7.5px;letter-spacing:1px;display:flex;align-items:center;justify-content:space-between;padding:0 13mm;box-sizing:border-box;border-top:1px solid #222732;">' +
    '<span>KOSMOORBIT · v0.7.7 «VERANKERUNG &amp; FEINSCHLIFF»</span>' +
    '<span style="color:#57b6c2;">⌖ <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
  margin: { top: '0', bottom: '11mm', left: '0', right: '0' },
});
await b2.close();
console.log(`\n✓ Handbuch-PDF → ${OUT_PDF}`);
