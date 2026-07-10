/**
 * Rundgang-PDF «0.6.7» («Nachtschicht: Simulieren, Sehen, Verbessern», 10.07.)
 * — EIN Skript, zwei Phasen (Muster `kritik-shots-067.mts` + `rundgang-pdf.mts`
 * kombiniert, weil dieses PDF Bilder aus DREI Quellen braucht, von denen nur
 * eine schon fertig auf der Platte liegt):
 *
 *   Phase 1 (Muster kritik-shots-067.mts): ein paar EIGENE Live-Aufnahmen, die
 *   weder die Kritik-Runde-1-Sammlung noch die Journey-Specs schon liefern —
 *   das ehrliche Kurve/Ortho-Vorher-Nachher (Default blieb Kurve!), das
 *   Node-Kollaps-Vorher-Nachher, die Kuratier-Fläche mit BEIDEN Kartentypen
 *   (Render + Aufnahme nebeneinander) und das Chip-Menü mit den neuen
 *   Begründungszeilen. Alle Aufnahmen laufen in ein TEMP-Verzeichnis
 *   (`os.tmpdir()`) — NICHT nach docs/rundgang/ — damit dieses Skript keine
 *   bestehenden Repo-Bilder anfasst (Vertrag: nur dieses Skript + das PDF sind
 *   neue Dateien).
 *
 *   Phase 2 (Muster rundgang-pdf.mts): HTML → PDF. Kopiert zusätzlich die
 *   schon vorhandenen Bilder aus drei Quellen ins selbe Temp-Verzeichnis:
 *     - docs/rundgang/kritik-067/  (Kritik-Runde 1: Mehrfachauswahl, Satteldach)
 *     - e2e-results-journey/       (Journey B MFH: Chat-Paket, fertiges 3D, Vergleich)
 *     - e2e-results-d2/            (kosmo-scripted.spec: Paket-Zusammenfassung, H-28-Fehlerspur)
 *   und baut daraus ein kompaktes Kommentier-Heft (~16-24 Seiten, bewusst
 *   NICHT so umfangreich wie das 46-seitige 0.6.6-PDF).
 *
 * Voraussetzungen (alle im Auftrag beschrieben, keine davon von diesem
 * Skript selbst gestartet):
 *   - Preview-Build auf RUNDGANG_URL (Default :5173), NACH `npm run build`.
 *   - Fake-Worker-Bridge auf :8600 (für den Render-Schritt in Phase 1).
 *   - docs/rundgang/kritik-067/ bereits gefüllt: `npx tsx e2e/tools/kritik-shots-067.mts`
 *     (RUNDGANG_URL auf den echten Port zeigen lassen, Default dort ist :4180).
 *   - e2e-results-journey/ bereits gefüllt: `KOSMO_E2E_PORT=5173 npx playwright
 *     test e2e/kosmo-journey-mfh.spec.ts`.
 *   - e2e-results-d2/ bereits gefüllt: `KOSMO_E2E_PORT=5173 npx playwright test
 *     e2e/kosmo-scripted.spec.ts`.
 * Fehlt eine Quelle, bricht dieses Skript mit einer klaren Meldung ab statt
 * mit einem kaputten Bild weiterzulaufen.
 */
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { waehleOption } from '../helfer/waehleOption';

const ROOT = new URL('../../', import.meta.url).pathname; // kosmo-orbit/
const KRITIK = `${ROOT}docs/rundgang/kritik-067/`;
const JOURNEY = `${ROOT}e2e-results-journey/`;
const D2 = `${ROOT}e2e-results-d2/`;
const OUT = `${ROOT}abgabe/RUNDGANG-NOTIZEN-0.6.7.pdf`;
mkdirSync(`${ROOT}abgabe/`, { recursive: true });

const WORK = join(tmpdir(), 'kosmo-rundgang-067-eigens');
const BILDER = join(WORK, 'bilder');
mkdirSync(BILDER, { recursive: true });

const URL_ = process.env.RUNDGANG_URL ?? 'http://localhost:5173';

function pruefeQuelle(pfad: string, hinweis: string): void {
  if (!existsSync(pfad)) {
    throw new Error(`Quelle fehlt: ${pfad}\n${hinweis}`);
  }
}
pruefeQuelle(`${KRITIK}paper-2-auswahl-leiste.png`, 'Erst `npx tsx e2e/tools/kritik-shots-067.mts` laufen lassen.');
pruefeQuelle(`${KRITIK}paper-6-satteldach-3d.png`, 'Erst `npx tsx e2e/tools/kritik-shots-067.mts` laufen lassen.');
pruefeQuelle(
  `${JOURNEY}01-chat-paket-karte.png`,
  'Erst `KOSMO_E2E_PORT=5173 npx playwright test e2e/kosmo-journey-mfh.spec.ts` laufen lassen.',
);
pruefeQuelle(
  `${D2}paket-zusammenfassung.png`,
  'Erst `KOSMO_E2E_PORT=5173 npx playwright test e2e/kosmo-scripted.spec.ts` laufen lassen.',
);

// ═══════════════════════════════════════════════════════════════════════
// Phase 1 — eigene Live-Aufnahmen (Muster kritik-shots-067.mts)
// ═══════════════════════════════════════════════════════════════════════
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.setDefaultTimeout(30000);

const shot = async (name: string, pause = 700) => {
  await page.waitForTimeout(pause);
  await page.screenshot({ path: join(BILDER, `${name}.png`) });
  console.log(`✓ ${name}`);
};

declare global {
  interface Window {
    __kosmo: { run: (id: string, p: unknown) => unknown; open: (s: string) => void; state: () => unknown };
    __kosmoViewport: { renderOnce: () => void };
  }
}

/** Muster kritik-shots-067.mts frisch() — nur paper-Thema (Screenshots im
 * paper-Theme, wie im Auftrag verlangt), Beispielprojekt TKB landet direkt in
 * KosmoDesign (App.tsx `load-tkb` ruft `gehZu('design')`). */
async function frisch(): Promise<void> {
  await page.goto(URL_);
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.thema', 'paper');
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
    localStorage.removeItem('kosmo.panelOffen');
    localStorage.removeItem('kosmo.projekt.aktiv');
    localStorage.removeItem('kosmo.ui.v1');
    indexedDB.deleteDatabase('kosmo-projekte');
  });
  await page.reload();
  await page.waitForSelector('[data-testid="module-design"]');
  await page.click('[data-testid="load-tkb"]');
  await page.waitForTimeout(2200);
}

// ── 1) Kanten: Default-Kurve vs. Ortho-Routing — EIN Graph, zwei Momente ──
// «Vorher» und «Nachher» kommen bewusst aus ZWEI GETRENNTEN frisch()-Läufen
// (kompletter Seiten-Reload dazwischen) statt aus einem Klick in derselben
// Session: ein Toggle-Klick MITTEN in einer laufenden Session liess unter
// SwiftShader (Software-GPU dieses Containers) zuverlässig ein doppeltes
// Graph-Bild entstehen (Kanten-Übergang + alter Frame überlagert — dasselbe
// bekannte Geisterbild-Muster wie beim Marquee, s. kritik-shots-067.mts). Ein
// frischer Seitenlade-Zyklus vor dem Toggle-Klick war in 3/3 Testläufen
// zuverlässig sauber; auf echter Hardware träte das Ausgangsproblem ohnehin
// nicht auf.
await frisch();
await page.evaluate(() => window.__kosmo.open('vis'));
await page.click('[data-testid="drei-stimmungen"]');
await page.waitForSelector('[data-testid="vis-node-render"]');
await shot('vis-kurve-vorher'); // Default: Kurve — noch nicht umgeschaltet

await frisch();
await page.evaluate(() => window.__kosmo.open('vis'));
await page.click('[data-testid="drei-stimmungen"]');
await page.waitForSelector('[data-testid="vis-node-render"]');
await page.waitForTimeout(700);
await page.click('[data-testid="vis-routing-toggle"]');
await shot('vis-ortho-nachher', 1500);

// ── 2) Node-Kollaps: EIN Kopf, vorher aufgeklappt / nachher eingeklappt ──
// Gezielter Bildausschnitt (clip) um den MODELL-Node (`vis-node-modell`,
// erster `node-kollaps`-Kopf in DOM-Reihenfolge) statt Vollbild — im
// 1920×1080-Vollbild ist der Höhenunterschied zwischen auf-/zugeklappt sonst
// kaum lesbar.
await frisch();
await page.evaluate(() => window.__kosmo.open('vis'));
await page.click('[data-testid="drei-stimmungen"]');
await page.waitForSelector('[data-testid="vis-node-render"]');
const modellNode = page.locator('[data-testid="vis-node-modell"]');
const modellBox = (await modellNode.boundingBox())!;
const kollapsClip = { x: modellBox.x - 24, y: modellBox.y - 24, width: 320, height: 170 };
const kollapsKopf = page.locator('[data-testid="node-kollaps"]').first();
await page.waitForTimeout(700);
await page.screenshot({ path: join(BILDER, 'vis-kollaps-vorher.png'), clip: kollapsClip });
console.log('✓ vis-kollaps-vorher');
await kollapsKopf.click();
await page.waitForTimeout(700);
await page.screenshot({ path: join(BILDER, 'vis-kollaps-nachher.png'), clip: kollapsClip });
console.log('✓ vis-kollaps-nachher');

// ── 3) Kuratier-Fläche mit BEIDEN Kartentypen (Render + Aufnahme) ──
// Baustein-Muster: renderUeberBridge + viewportAufnahme (e2e/sim/bausteine.ts).
await frisch();
await page.evaluate(() => window.__kosmo.open('vis'));
await page.click('[data-testid="drei-stimmungen"]');
await page.waitForSelector('[data-testid="vis-node-render"]');
await page.locator('[data-testid="render-ausfuehren"]').first().click();
await page.waitForSelector('[data-testid="render-bild"]', { timeout: 25000 });
// Zurück zu Design → 3D → «Für Vis aufnehmen» (Baustein 24: viewportAufnahme).
await page.evaluate(() => window.__kosmo.open('design'));
await page.click('[data-testid="view-quad"]');
await page.waitForSelector('[data-testid="viewport3d"]');
await page.evaluate(() => window.__kosmoViewport.renderOnce());
await page.click('[data-testid="viewport-aufnahme"]');
await page.locator('[data-testid="meldung-erfolg"]', { hasText: 'aufgenommen' }).waitFor({ timeout: 10000 });
await page.evaluate(() => window.__kosmo.open('vis'));
await waehleOption(page, 'node-hinzu', 'aufnahme');
await page.waitForSelector('[data-testid="vis-node-aufnahme"]');
await page.click('[data-testid="vis-kuratier-toggle"]');
await page.waitForSelector('[data-testid="vis-kuratier-flaeche"]');
const kuratierKartenAnzahl = await page.locator('[data-testid="vis-kuratier-karte"]').count();
console.log(`  Kuratier-Karten sichtbar: ${kuratierKartenAnzahl} (erwartet 2 — Render + Aufnahme)`);
await shot('vis-kuratier-beide');

// ── 4) Chip-Menü mit Begründungszeilen (TKB + Wand-Werkzeug für Signale) ──
await frisch(); // load-tkb landet bereits in KosmoDesign
await page.click('[data-testid="view-2d"]');
await page.click('[data-testid="tool-wand"]');
await page.click('[data-testid="modus-chip"]');
await page.waitForSelector('[data-testid="modus-menu"]');
await shot('design-chip-menu-begruendung');

await browser.close();

// ═══════════════════════════════════════════════════════════════════════
// Phase 2 — Bilder aus den drei fertigen Quellen dazukopieren + HTML → PDF
// ═══════════════════════════════════════════════════════════════════════
const kopiere = (quelle: string, ziel: string) => copyFileSync(quelle, join(BILDER, ziel));

kopiere(`${JOURNEY}01-chat-paket-karte.png`, 'journey-01-chat-paket-karte.png');
kopiere(`${JOURNEY}02-fertiges-3d.png`, 'journey-02-fertiges-3d.png');
kopiere(`${JOURNEY}03-vis-graph-vergleich.png`, 'journey-03-vis-graph-vergleich.png');
kopiere(`${D2}paket-zusammenfassung.png`, 'd2-paket-zusammenfassung.png');
kopiere(`${D2}h28-fehlerzeile-und-bubble.png`, 'd2-h28-fehlerzeile.png');
kopiere(`${KRITIK}paper-2-auswahl-leiste.png`, 'kritik-auswahl-leiste.png');
kopiere(`${KRITIK}paper-6-satteldach-3d.png`, 'kritik-satteldach.png');
// Bonus-Seiten ink-Thema (2 Stück — «falls Zeit», billig weil schon vorhanden).
kopiere(`${KRITIK}ink-6-satteldach-3d.png`, 'ink-satteldach.png');
kopiere(`${KRITIK}ink-2-auswahl-leiste.png`, 'ink-auswahl-leiste.png');

interface Seite {
  bild?: string;
  titel: string;
  neu?: boolean;
  text: string;
  extra?: string[];
  paar?: boolean;
}

interface Vergleich {
  titel: string;
  alt: string;
  neu: string;
  altLabel: string;
  neuLabel: string;
  text: string;
}

const VERGLEICHE: Vergleich[] = [
  {
    titel: 'KosmoVis — Kanten: Default-Kurve vs. Ortho-Routing',
    alt: 'vis-kurve-vorher.png',
    altLabel: 'Vorher — Default (Kurve, unverändert)',
    neu: 'vis-ortho-nachher.png',
    neuLabel: 'Nachher — nach Klick auf den Ortho-Umschalter',
    text: 'Derselbe «Drei Stimmungen»-Graph, zweimal fotografiert: links der unveränderte Default (Kurven-Kanten, wie bisher), rechts derselbe Graph EINEN Klick später auf den neuen Umschalter (`vis-routing-toggle`). Die Kanten laufen dann als rechtwinklige Pfade mit weichen Ecken statt als Kurven — bei dichten Graphen mit vielen Ketten deutlich leichter zu verfolgen, welcher Ausgang zu welchem Eingang gehört. Wichtig für die Ehrlichkeit dieses Vergleichs: der DEFAULT ist bewusst Kurve geblieben, Ortho ist ein Angebot, keine neue Vorgabe.',
  },
  {
    titel: 'KosmoVis — Node-Kollaps: auf- und zugeklappt',
    alt: 'vis-kollaps-vorher.png',
    altLabel: 'Vorher — Node vollständig aufgeklappt',
    neu: 'vis-kollaps-nachher.png',
    neuLabel: 'Nachher — nach Klick auf den Kollaps-Knopf',
    text: 'Derselbe erste Prompt-Node des «Drei Stimmungen»-Graphen, einmal vor und einmal nach einem Klick auf `node-kollaps`: eingeklappt bleiben nur Kopf und Anschlüsse sichtbar, der restliche Graph gewinnt spürbar Platz. Ein Render mit laufendem Auftrag verweigert das Einklappen mit einer ehrlichen Meldung statt eines lautlosen Zustandsverlusts (nicht auf diesem Bild — der Node hier ist im Ruhezustand).',
  },
];

const SEITEN: Seite[] = [
  {
    titel: 'Die Journey — ein Mehrfamilienhaus, gebaut über den Chat',
    text: 'Diese Nacht entstand ein neues Prüfwerkzeug: statt Features einzeln zu testen, baute Fable als SIMULIERTER NUTZER zwei ganze Häuser (Einfamilien- und Mehrfamilienhaus) ausschliesslich über den Kosmo-Chat — Wände, Decken, Zonen, Fassaden, Geschosse, Dach, alles per Textzeile statt Handgriff im Programm. Auf den folgenden drei Seiten die Mehrfamilienhaus-Journey als Bildergeschichte: der Moment, in dem Kosmo ein ganzes Paket vorschlägt (Stützenraster), der fertige Rohbau, und der Vis-Vergleich am Ende. Die Journey lebt jetzt dauerhaft als E2E-Test (`e2e/kosmo-journey-mfh.spec.ts`) — sie läuft bei jedem künftigen Build automatisch mit und bewacht genau diesen Weg vor Rückfällen.',
  },
  {
    bild: 'journey-01-chat-paket-karte.png',
    titel: 'Journey B, Zug 1 — Kosmo schlägt ein ganzes Paket vor',
    neu: true,
    text: 'Auf «Zeichne mir ein Stützenraster 5×3 Achsen» antwortet Kosmo nicht mit einem einzelnen Vorschlag, sondern mit einer Paket-Karte: 2 Tool-Aufrufe (Raster + Stützen) als EINE anwendbare Einheit, mit Zusammenfassungszeile «Kosmo schlägt … Schritte vor». Nach «Anwenden» stehen exakt 8 neue Rasterlinien und 15 Stützen im Modell — geprüft, nicht behauptet (expect.poll auf doc.byKind(column/grid)).',
  },
  {
    bild: 'journey-02-fertiges-3d.png',
    titel: 'Journey B — der fertige Rohbau, komplett aus dem Chat',
    neu: true,
    text: 'Acht Chat-Züge später: Wände, Decken, Zonen, zwei kopierte Obergeschosse, Klinker-Fassade mit Fenstern, Satteldach. Zwei Stellen brauchten einen dokumentierten Handgriff statt eines Chat-Wegs (Befund 2/H-27 zur Decke ist inzwischen behoben; Befund 6/H-33 zum Geschosswechsel beim Dach ist in dieser Version ebenfalls behoben — `ui.geschossSetzen` ist jetzt ein Kosmo-Werkzeug). Was hier steht, ist ein Bild eines ECHTEN Playwright-Laufs, kein Mockup.',
  },
  {
    bild: 'journey-03-vis-graph-vergleich.png',
    titel: 'Journey B — Bridge-Render und Viewport-Aufnahme im Vergleich',
    neu: true,
    text: 'Nach dem Rohbau wechselt die Journey komplett auf UI-Bedienung: «Drei Stimmungen» im Node-Graphen, ein echter Render über die Fake-Worker-Bridge, dazu eine Viewport-Aufnahme direkt aus dem 3D-Fenster («Für Vis aufnehmen») — ein eigener Vergleich-Node stellt beide Bilder nebeneinander. Das deckt zugleich Befund 8 (H-32, «Render bleibt für immer veraltet») auf, der in dieser Version bereits repariert ist: der Veraltet-Vergleich rechnet jetzt denselben Prompt wie beim Absenden.',
  },
  {
    titel: 'KosmoVis — Node-Editor auf Werkzeug-Niveau',
    text: 'Vier Vergleiche/Funktionen aus dem neuen Node-Editor-Werkzeugkasten: (a) Kanten Kurve vs. Ortho, (b) Mehrfachauswahl mit Ausrichten-Leiste, (c) Node-Kollaps vorher/nachher, (d) die Kuratier-Fläche mit einer echten Render- UND einer echten Aufnahme-Karte nebeneinander. (a) und (c) sind ehrliche Vorher/Nachher-Paare aus JE EINER Sitzung (kein Nachbau aus zwei getrennten Läufen); (b) und (d) sind Einzelaufnahmen des jeweiligen Endzustands.',
  },
  {
    bild: 'kritik-auswahl-leiste.png',
    titel: 'KosmoVis — Mehrfachauswahl + Ausrichten-Leiste',
    neu: true,
    text: 'Drei Node-Köpfe per Shift-Klick ausgewählt (bewusst NICHT per Marquee-Aufziehen fotografiert — der Marquee-Drag löst unter der Software-GPU dieser Testumgebung (SwiftShader) ein bekanntes Geisterbild-Artefakt in der Auswahl-Fläche aus; DOM und Zustand sind dabei nachweislich sauber, auf echter Hardware unsichtbar. Die Marquee-Funktion selbst ist über `e2e/vis-editor.spec.ts` geprüft, nur eben nicht auf diesem Foto). Sichtbar: die Ausrichten-Leiste (links, oben, verteilen) und ein Gruppen-Verschieben mit EINEM Rückgängig-Schritt.',
  },
  {
    bild: 'vis-kuratier-beide.png',
    titel: 'KosmoVis — Kuratier-Fläche mit Render- UND Aufnahme-Karte',
    neu: true,
    text: 'Die Kuratier-Fläche sammelte bisher nur fertige Renderbilder (Befund H-36) — seit dieser Version nimmt sie auch Viewport-Aufnahmen auf. Dieses Bild zeigt beide Kartentypen gleichzeitig: eine echte Render-Karte (über die Fake-Worker-Bridge gerechnet) neben einer echten Aufnahme-Karte (direkt aus dem 3D-Viewport «Für Vis aufnehmen»). Genau ZWEI Karten sind hier der bewiesene, geheilte Zustand — vorher wäre die Aufnahme-Karte schlicht nicht erschienen.',
  },
];

const NEUE_FAEHIGKEITEN: Seite[] = [
  {
    bild: 'kritik-satteldach.png',
    titel: 'Neue Dachform — Satteldach im 3D-Viewport',
    neu: true,
    text: '«Dach erstellen» kann jetzt Walm ODER Sattel mit wählbarer Firstrichtung — auch als Kosmo-Kommando (`design.dachErstellen` mit `form: \'sattel\'`, `firstrichtung: \'x\'`). Bild: ein frisches Mini-Projekt (4 Wände, 9×7m Grundriss) mit Satteldach, 40° Neigung, 400mm Dachvorsprung — echter Modellzustand im 3D-Viewport, kein gerendertes Vorschaubild.',
  },
  {
    bild: 'design-chip-menu-begruendung.png',
    titel: 'Arbeitsmodi — Chip-Menü begründet jede Empfehlung',
    neu: true,
    text: 'Neu an diesem Menü (das Menü selbst ist aus 0.6.6): jede Zeile trägt jetzt eine eigene Begründung («erkannt: 2D-Plan aktiv · Zeichenwerkzeug aktiv») statt nur für den GERADE aktiven Modus. Bild: 2D-Plan + Wand-Werkzeug aktiviert (dieselben zwei Signale wie `e2e/arbeitsmodi.spec.ts`), Chip-Menü geöffnet. Der frühere blosse Ein-Wort-Fallback «Voll» heisst jetzt ehrlich «Alle Werkzeuge» — ein Name, der sagt, was der Neutralzustand bedeutet, statt einen unerklärten Zustand zu behaupten.',
  },
  {
    bild: 'd2-paket-zusammenfassung.png',
    titel: 'Kosmo-Chat — Paket-Zusammenfassung über der Kartenserie',
    neu: true,
    text: 'Schlägt Kosmo mehrere Schritte auf einmal vor (hier: 2× Wand, 1× Decke), steht jetzt eine aggregierte Zusammenfassungszeile («Kosmo schlägt 3 Schritte vor: 2× Wand, 1× Decke») über der Kartenserie — auch nachdem das Paket längst angewendet ist, bleibt sie sichtbar (`diff-paket-zusammenfassung`, hängt nur an «≥2 Schritte», nicht am Anwenden-Status). Zusätzlich, nicht auf diesem Bild: Kosmo schlägt keine Abriss-Kommandos mehr vor — Löschen bleibt bewusst Handgriff im Programm.',
  },
  {
    bild: 'd2-h28-fehlerzeile.png',
    titel: 'Kosmo-Chat — eine bleibende Fehlerspur statt lautlosem Verschwinden',
    neu: true,
    text: 'Befund H-28 (Sim-Runde 1) behoben: scheitert ein «Anwenden» erst beim tatsächlichen Ausführen (nicht schon bei der Eingabe-Validierung — hier: eine Decke mit einer `storeyId`, die im Doc gar nicht existiert), verschwindet die Karte nicht mehr spurlos. Die Karte bleibt als `proposal-card-fehler` mit einer Fehlerzeile stehen, UND eine eigene Chat-Bubble («⚠ Anwenden fehlgeschlagen: … existiert nicht») nennt denselben Grund — beides bleibt auch nach weiterem Chat-Verkehr sichtbar. Kein Halbschritt am Modell: die Decke wurde nachweislich NICHT trotzdem angelegt.',
  },
];

const EHRLICHKEIT_TEXT = `Was diese Nacht ehrlich NICHT ging oder bewusst vertagt ist — aus dem H-Journal (\`docs/SIM-BEFUNDE.md\`, Abschnitt «Sim-Runde 2») und der Kampagnen-Bilanz in ROADMAP 291:

• H-30 — die Szene-Auswahl im Render-Formular nutzt die deutschen Prompt-Langtexte selbst als Werte (keine stabilen Schlüssel). Fragil für Automatisierung und künftige Übersetzung, funktional kein Bug. → 0.6.8.
• H-34 — der Wohnungs-Segmentierer ist ein reiner UI-Knopf, kein Kosmo-Kommando: für den Chat unerreichbar. → 0.6.8 (Command-Extraktion, kein Nacht-Nebenjob).
• H-35 — Fassadenmodul-Zuweisung setzt einen Volumenkörper voraus; der wandbasierte Baupfad (wie ihn die Journey nutzt) geht dabei leer aus. Der Chat-Weg über \`fensterAusModulen\` bleibt gangbar. → 0.6.8.
• H-38 — \`design.geschossErstellen\` erlaubt stillschweigend einen doppelten Namen + Index (keine Warnung, kein Datenverlust, aber verwirrend). → 0.6.8.
• Custom-Dropdowns, echtes Cloud-Imaging, ein OAuth-Härtetest gegen ein echtes Claude-Abo-Token, eine lernende Modus-Gewichtung und die Ablösung des Journey-B-Dach-Zugs durch einen echten \`ui_geschossSetzen\`-Skript-Zug — alle fünf bleiben ehrliche 0.6.8-Kandidaten, keiner ist in dieser Nacht angetäuscht.

Sechs Befunde derselben Kategorie sind dagegen in dieser Nacht wirklich behoben (nicht nur behauptet — jeweils mit einem Regressionstest verankert): H-27 (Chat-Decke gelingt), H-28 (bleibende Fehlerspur, Vorderseite dieser Doppelseite), H-29 (Panel-Schliessen-testid), H-32 (Render-Formular nicht mehr dauerhaft «veraltet»), H-33 (Kosmo kann das aktive Geschoss wechseln), H-36 (Kuratier-Fläche zeigt auch Aufnahmen).

Ein Hinweis zur Testumgebung, nicht zum Produkt: einzelne Bilder in diesem Heft entstanden unter SwiftShader (Software-GPU dieses Containers) statt echter Hardware-Beschleunigung. Wo das ein bekanntes Render-Artefakt auslöst (das erwähnte Marquee-Geisterbild), steht das explizit bei der betroffenen Seite — DOM- und Zustandsprüfungen bleiben davon unberührt, auf echter Hardware ist der Effekt nicht sichtbar.`;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const nl2br = (s: string) => esc(s).replace(/\n/g, '<br/>');

const seiteHtml = (s: Seite, bildOrdner = 'bilder') => `
<section class="seite">
  <header>
    <h2>${esc(s.titel)}${s.neu ? ' <span class="neu">NEU</span>' : ''}</h2>
  </header>
  ${
    s.bild
      ? `<div class="bildzeile${s.extra ? ' mit-extra' : ''}${s.paar ? ' paar' : ''}">
    <img class="haupt" src="${bildOrdner}/${s.bild}" alt="${esc(s.titel)}" />
    ${(s.extra ?? []).map((e) => `<img class="extra" src="${bildOrdner}/${e}" alt="" />`).join('')}
  </div>`
      : ''
  }
  <p class="beschrieb">${esc(s.text)}</p>
  <div class="notiz">
    <div class="notiz-label">✍️ Verbesserungen / Befunde:</div>
  </div>
</section>`;

const vergleichHtml = (v: Vergleich) => `
  <div class="vgl">
    <h3>${esc(v.titel)}</h3>
    <div class="vgl-zeile">
      <figure><img src="bilder/${v.alt}" alt="Vorher" /><figcaption>${esc(v.altLabel)}</figcaption></figure>
      <figure><img src="bilder/${v.neu}" alt="Nachher" /><figcaption>${esc(v.neuLabel)}</figcaption></figure>
    </div>
    <p class="vgl-text">${esc(v.text)}</p>
    <div class="notiz-inline">
      <div class="notiz-label">✍️ Verbesserungen / Befunde:</div>
    </div>
  </div>`;

const vergleichSeite = (v: Vergleich) => `
<section class="seite">
  <header><h2>Vorher / Nachher</h2></header>
  ${vergleichHtml(v)}
</section>`;

const ehrlichkeitSeite = `
<section class="seite">
  <header><h2>Ehrlichkeits-Seite — was diese Nacht NICHT ging</h2></header>
  <p class="beschrieb" style="white-space: pre-line;">${nl2br(EHRLICHKEIT_TEXT)}</p>
  <div class="notiz">
    <div class="notiz-label">✍️ Priorität für 0.6.8 / weitere Notizen:</div>
  </div>
</section>`;

const bonusSeite = `
<section class="seite">
  <header><h2>Bonus — dasselbe im ink-Thema</h2></header>
  <div class="bildzeile paar">
    <img class="haupt" src="bilder/ink-satteldach.png" alt="Satteldach, ink-Thema" />
    <img class="extra" src="bilder/ink-auswahl-leiste.png" alt="Mehrfachauswahl, ink-Thema" />
  </div>
  <p class="beschrieb">Zwei Bilder aus der Kritik-Runde-1-Sammlung (docs/rundgang/kritik-067/) im dunklen ink-Thema — links das Satteldach im 3D, rechts die Mehrfachauswahl mit Ausrichten-Leiste. Beide entstanden in derselben Sitzung wie ihre paper-Pendants (identische Interaktionen, nur kosmo.thema=ink).</p>
  <div class="notiz">
    <div class="notiz-label">✍️ Welches Thema für den Alltag — paper, ink, oder beide behalten?</div>
  </div>
</section>`;

const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>KosmoOrbit 0.6.7 — Rundgang</title>
<style>
  * { box-sizing: border-box; margin: 0; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2b2924; }
  .seite { page-break-after: always; display: flex; flex-direction: column; height: 262mm; }
  h2 { font-size: 17pt; font-weight: 600; letter-spacing: 0.01em; border-bottom: 2px solid #2b2924; padding-bottom: 4px; margin-bottom: 10px; }
  .neu { display: inline-block; font-size: 9pt; font-weight: 700; color: #fff; background: #c96a1e; border-radius: 4px; padding: 2px 7px; vertical-align: 3px; margin-left: 6px; }
  .bildzeile { display: flex; gap: 6px; align-items: flex-start; }
  .bildzeile img.haupt { width: 100%; border: 1px solid #b9b2a4; border-radius: 4px; }
  .bildzeile.mit-extra img.haupt { width: 58%; }
  .bildzeile.mit-extra img.extra { width: 20%; flex: 1; border: 1px solid #b9b2a4; border-radius: 4px; }
  .bildzeile.paar img.haupt { width: 49%; }
  .bildzeile.paar img.extra { width: 49%; flex: none; border: 1px solid #b9b2a4; border-radius: 4px; }
  .beschrieb { font-size: 10.5pt; line-height: 1.5; margin: 9px 0 10px; color: #3d3a33; }
  .notiz { flex: 1; border: 1.5px solid #8a857a; border-radius: 8px; padding: 8px 12px;
    background: repeating-linear-gradient(to bottom, transparent 0, transparent 27px, #dcd6c8 27px, #dcd6c8 28px);
    background-origin: content-box; min-height: 40mm; }
  .notiz-inline { flex: 1; border: 1.5px solid #8a857a; border-radius: 8px; padding: 8px 12px; margin-top: 6px;
    background: repeating-linear-gradient(to bottom, transparent 0, transparent 27px, #dcd6c8 27px, #dcd6c8 28px);
    background-origin: content-box; min-height: 30mm; }
  .notiz-label { font-size: 9.5pt; color: #8a857a; font-weight: 600; }
  .vgl { display: flex; flex-direction: column; flex: 1; }
  .vgl h3 { font-size: 13pt; font-weight: 600; margin-bottom: 6px; }
  .vgl-zeile { display: flex; gap: 8px; }
  .vgl-zeile figure { width: 49.5%; margin: 0; }
  .vgl-zeile img { width: 100%; border: 1px solid #b9b2a4; border-radius: 4px; display: block; }
  .vgl-zeile figcaption { font-size: 8.5pt; color: #8a857a; margin-top: 3px; font-family: Menlo, monospace; }
  .vgl-text { font-size: 10.5pt; line-height: 1.5; margin-top: 8px; color: #3d3a33; }
  .deckblatt { justify-content: center; align-items: flex-start; padding: 0 8mm; }
  .deckblatt h1 { font-size: 28pt; font-weight: 700; margin-bottom: 4mm; }
  .deckblatt .version { font-size: 13pt; color: #8a857a; margin-bottom: 12mm; }
  .deckblatt ol { font-size: 12pt; line-height: 1.9; padding-left: 6mm; margin-bottom: 10mm; }
  .deckblatt .kasten { border: 1.5px solid #2b2924; border-radius: 8px; padding: 6mm; font-size: 11pt; line-height: 1.6; }
  .deckblatt .kasten b { display: block; margin-bottom: 2mm; }
</style></head><body>

<section class="seite deckblatt">
  <h1>KosmoOrbit — Rundgang zum Kommentieren</h1>
  <div class="version">Stand 0.6.7 «Nachtschicht: Simulieren, Sehen, Verbessern» · 10.07.2026</div>
  <ol>
    <li>PDF im Reader öffnen (Adobe Acrobat, Microsoft Edge, Vorschau …).</li>
    <li>Seite für Seite durchgehen — zuerst die Journey-Bildergeschichte, dann Vis-Vorher/Nachher, dann die neuen Fähigkeiten, zuletzt die Ehrlichkeits-Seite.</li>
    <li>Mit dem Kommentar-/Textwerkzeug direkt in die linierte Box schreiben: was stört, was fehlt, was anders soll. Auch Handschrift/Stift geht.</li>
    <li>Das kommentierte PDF hier in den Chat zurückschicken — die Notizen werden die 0.6.8-Auftragsliste.</li>
  </ol>
  <div class="kasten">
    <b>Was diese Nacht war</b>
    v0.6.7 prüft KosmoOrbit zum ersten Mal an einem eigenen Massstab:
    Benutzersimulation als Methode. Fable baute in derselben Nacht als Nutzer
    zwei ganze Häuser — ein Einfamilien- und ein Mehrfamilienhaus — komplett
    über den Kosmo-Chat, fand dabei elf Befunde und behob sechs davon noch in
    derselben Nacht (H-27/28/29/32/33/36). Was blieb: ein Node-Editor auf
    Werkzeug-Niveau (Mehrfachauswahl, Ausrichten, Ortho-Kanten, Kollaps), ein
    repariertes Render-Formular, eine Kuratier-Fläche für Renderbilder UND
    Viewport-Aufnahmen, eine neue Dachform (Satteldach) und eine ehrliche
    0.6.8-Restliste — auf der letzten Seite dieses Hefts.
  </div>
</section>

${vergleichSeite(VERGLEICHE[0]!)}
${vergleichSeite(VERGLEICHE[1]!)}
${SEITEN.map((s) => seiteHtml(s)).join('\n')}
${NEUE_FAEHIGKEITEN.map((s) => seiteHtml(s)).join('\n')}
${ehrlichkeitSeite}
${bonusSeite}
</body></html>`;

const htmlPfad = join(WORK, 'RUNDGANG-067.html');
writeFileSync(htmlPfad, html);

const pdfBrowser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
});
const pdfPage = await pdfBrowser.newPage();
await pdfPage.goto(`file://${htmlPfad}`, { waitUntil: 'networkidle' });
await pdfPage.pdf({
  path: OUT,
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate:
    '<div style="width:100%;text-align:center;font-size:8px;color:#8a857a;font-family:Menlo,monospace;">KosmoOrbit 0.6.7 — Rundgang &amp; Notizen · Seite <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  margin: { top: '12mm', bottom: '16mm', left: '13mm', right: '13mm' },
});
await pdfBrowser.close();
console.log(`PDF: ${OUT}`);
