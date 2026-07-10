/**
 * Rundgang-Screenshots «0.6.6» («Bewegung & Anpassung», 10.07.) — Teil 1.
 * Wie `handbuch.mts` (V1-Finish P6), aber für das Kommentier-PDF
 * `rundgang-pdf.mts`: fährt alle Stationen deterministisch ab. Diese Runde
 * ist BEWEGUNGSKONZEPT-066 (siehe `apps/kosmo-orbit/src/shell/neuigkeiten.ts`,
 * Version 0.6.6): Knopfdruck spürbar (`.k-druck`), Arbeitsmodi-Automatik
 * (`state/arbeitsmodi-kern.ts`, Modus-Chip in der Statuszeile), Kosmo-UI-
 * Brücke (Kosmo liest/stellt die Oberfläche über `ui.*`-Werkzeuge, sichtbar
 * quittiert als `kosmo-ui-aktion-*`-Chatzeile, nie als stille Diff-Karte),
 * Gesten mit Schwung (Momentum-Pan/Doppeltipp/langes Drücken), ein Render-
 * Knopf direkt im 3D-Viewport (V-M1, dieselbe KosmoVis-Kette), Renderloop
 * on-demand statt Dauerbetrieb, KosmoVis-Kuratier-Fläche + kategorisierte
 * Node-Palette + Minimap (ab 5 Nodes) + entzerrte Ketten bei «Drei
 * Stimmungen», und Fächer der Zentrale, die federnd aus ihrem Planeten
 * öffnen. Die 0.6.5-Basis (Icon-Bibliothek, KosmoVis-Formular, entrümpelter
 * Design-Kopf, Leerbild-Signete …) bleibt unverändert bestehen — nur die
 * NEUEN Blöcke unten (29+) sind 0.6.6-spezifisch, alles davor ist 1:1 der
 * bewiesene 0.6.5-Rundgang. Strukturfolgen fürs Skript: `load-tkb` landet
 * DIREKT in KosmoDesign (kein module-design-Klick danach), Einstellungen
 * öffnen über `einstellungen-oeffnen` + hartes Warten auf
 * `einstellungen-panel` (Lehre aus Kritik-Befund A11), `kosmo.ui.v1` MUSS
 * VOR dem `reload()` gesetzt werden (Muster `arbeitsmodi.spec.ts`/
 * `kosmo-ui-bruecke.spec.ts`). Jede Station steuert exakt die
 * `data-testid`-Selektoren an, die in den zugehörigen E2E-Specs bewiesen
 * sind (siehe Kommentar je Block). Bilder → docs/rundgang/bilder/.
 * Voraussetzungen: Preview :5183, Fake-Bridge :8600, Sync-Server :8700
 * (überschreibbar über RUNDGANG_URL).
 */
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';

const OUT = new URL('../../docs/rundgang/bilder/', import.meta.url).pathname;
const URL_ = process.env.RUNDGANG_URL ?? 'http://localhost:5183';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.setDefaultTimeout(30000);

const shot = async (name: string, pause = 600) => {
  await page.waitForTimeout(pause);
  await page.screenshot({ path: `${OUT}${name}.png` });
  console.log(`✓ ${name}`);
};

type Kosmo = {
  open: (s: string) => void;
  run: (id: string, p: unknown) => { patches: { id: string }[] };
  state: () => {
    activeStoreyId: string | null;
    undo: () => void;
    doc: { byKind: (k: string) => { id: string; name?: string }[] };
  };
};

/**
 * Frischer Bootstrap wie in den meisten Specs (`module.spec.ts` u.a.):
 * onboarded + starterGuide.done gesetzt (Guide-Karte/Autostart stört die
 * Screenshots nicht), thema/llm fix. WICHTIG (K11/A1): `kosmo.panelOffen`
 * wird explizit ENTFERNT statt gesetzt — Symbol-zuerst ist der neue Default
 * und soll in jeder Station sichtbar bleiben; wo der Chat gebraucht wird,
 * öffnet der jeweilige Block das Panel explizit über `kosmo-symbol` (dieser
 * Klick setzt den Flag selbst auf '1' — ohne das explizite `removeItem` hier
 * würde das für ALLE folgenden Stationen in derselben Browser-Session so
 * bleiben, da `localStorage` einen `page.goto` übersteht).
 */
async function frisch(tkb = true) {
  await page.goto(URL_);
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.thema', 'paper');
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
    localStorage.removeItem('kosmo.panelOffen');
    localStorage.removeItem('kosmo.projekt.aktiv');
    // 0.6.6: `kosmo.ui.v1` überlebt wie `panelOffen` die ganze Browser-
    // Session — die Modus-Blöcke 30/36 setzen es explizit, alle übrigen
    // Stationen sollen den frischen Default zeigen (Automatik an, noch kein
    // Modus erkannt → Chip «Voll»), nicht den Rest der Vorgänger-Station.
    localStorage.removeItem('kosmo.ui.v1');
    indexedDB.deleteDatabase('kosmo-projekte');
  });
  await page.reload();
  await page.waitForSelector('[data-testid="module-design"]');
  if (tkb) {
    await page.click('[data-testid="load-tkb"]');
    await page.waitForTimeout(2200);
  }
}

// ── 00 NEU: Erststart-Frage («Neu hier?») ───────────────────────────
// Muster `erste-start-frage.spec.ts`: onboarded gesetzt, starterGuide.done
// bewusst NICHT gesetzt — der echte Erststart-Zustand.
await page.goto(URL_);
await page.evaluate(() => {
  localStorage.setItem('kosmo.onboarded', '1');
  localStorage.removeItem('kosmo.starterGuide.done');
});
await page.reload();
await page.waitForSelector('[data-testid="module-design"]');
await page.waitForSelector('[data-testid="erste-start-frage"]');
await shot('00-erste-start-frage');
// Frage sauber wegklicken («Nein»), damit nichts in den Folgeschritt bricht.
await page.click('[data-testid="erste-start-nein"]');

// ── 01 Orbit-Startmenü — Ruhezustand + offener Fächer (0.6.5 aufgeräumt) ──
// Muster `orbit-start.spec.ts` + `orbit-faecher.spec.ts`. NEU 0.6.5: die
// Werkzeug-Namen sitzen UNTER den Kreisen statt darin (Kritik-Befund A6:
// Labels schnitten den Kreisrand), der Fächer besteht aus echten
// Karteikarten, Katalog sichern/laden sind klare Knöpfe.
await frisch(false);
await page.evaluate(() => (window as unknown as { __kosmo: Kosmo }).__kosmo.open('home'));
await page.waitForSelector('[data-testid="orbit-start"]');
await shot('01-orbit-start');
await page.locator('[data-testid="orbit-haupt-design"]').hover();
await page.waitForSelector('[data-testid="orbit-faecher-design"].offen');
await shot('01-orbit-faecher-design', 400);
await page.keyboard.press('Escape');

// ── 02 NEU: Kosmo-Symbol + Mini-Popup (Hover) ────────────────────────
// Muster `kosmo-symbol.spec.ts` (frischOhnePanel): Panel-Default ist zu,
// das schwebende Symbol ist der Erstkontakt.
await page.goto(URL_);
await page.evaluate(() => {
  localStorage.setItem('kosmo.onboarded', '1');
  localStorage.setItem('kosmo.starterGuide.done', '1');
  localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
  localStorage.removeItem('kosmo.panelOffen');
});
await page.reload();
const kosmoSymbol = page.locator('[data-testid="kosmo-symbol"]');
await kosmoSymbol.waitFor();
await kosmoSymbol.hover();
await page.waitForSelector('[data-testid="kosmo-mini"]');
await shot('02-kosmo-symbol-mini', 400);

// ── 03 NEU (0.6.5): Einstellungs-Panel — gestalteter Kopf, Schliessen-
//    Zeichen, sichtbarer Scrollbalken; «Funktionen & Neues» mit 0.6.5 oben ──
// Muster `einstellungen.spec.ts` + `leistung.spec.ts`. Öffnen IMMER über
// `einstellungen-oeffnen` + hartes Warten auf `einstellungen-panel`
// (Kritik-Befund A11: blindes Fotografieren lieferte ein Data-Duplikat).
await frisch(false);
await page.click('[data-testid="einstellungen-oeffnen"]');
await page.waitForSelector('[data-testid="einstellungen-panel"]');
await shot('03-einstellungen', 400);
await page.locator('[data-testid="neuigkeiten-version-0.6.6"]').scrollIntoViewIfNeeded();
await shot('03-einstellungen-neuigkeiten', 400);
await page.locator('[data-testid="einstellungen-leistung"]').scrollIntoViewIfNeeded();
await shot('03-einstellungen-leistung', 400);
await page.keyboard.press('Escape');

// ── 04 NEU (0.6.4, F5/A2): Werkzeug-Kurztasten + «?»-Übersicht ──────────
// Muster `module.spec.ts` (Kurzbefehle-Test) + `Kurzbefehle.tsx`: KosmoDesign
// offen, «?» blendet die Übersicht ein — der Zeichnen-Abschnitt zeigt die
// ArchiCAD-angelehnten Werkzeug-Kurztasten (A/W/Z/…) aus `kurztasten.ts`.
// WICHTIG (Screenshot-Falle): view-2d VOR dem Dialog anwählen — über der
// 3D/WebGL-Ansicht rendert der Dialog in der Headless-Aufnahme (SwiftShader)
// als Geisterbild (Compositing-Artefakt), im echten Betrieb ohne Befund.
await frisch(true); // load-tkb landet bereits in KosmoDesign
await page.click('[data-testid="view-2d"]');
await page.waitForTimeout(400);
await page.keyboard.press('?');
await page.waitForSelector('[data-testid="kurzbefehle"]');
await shot('04-kurztasten-uebersicht', 500);
await page.keyboard.press('Escape');

// ── 05 NEU (0.6.5): KosmoDesign — entrümpelter Kopf: EINE Hauptzeile +
//    Kontextzeile (drei gestapelte Zeilen sind Geschichte), Export als
//    aufklappbare Gruppe (`export-menu-toggle`, Default offen), Geschoss-
//    leiste als gerahmte Karte; dazu Entwurfs-Dock + Statusleiste ──────────
// Muster `faehigkeiten-phasen.spec.ts` + `entwurfs-icons.spec.ts` +
// `werkzeugleiste.spec.ts`.
await frisch(true); // TKB geladen — load-tkb landet bereits in KosmoDesign
await page.waitForSelector('[data-testid="entwurf-dock"]');
await page.waitForSelector('[data-testid="design-werkzeugleiste-haupt"]');
await page.waitForSelector('[data-testid="design-werkzeugleiste-kontext"]');
await page.waitForSelector('[data-testid="export-menu-toggle"]');
await page.waitForSelector('[data-testid="leiste-gruppe-faehigkeiten"]');
await shot('05-design-uebersicht', 1000);
await page.click('[data-testid="view-quad"]');
await shot('05-design-4er', 1000);

// ── 06 NEU (0.6.4, F5 «Zahlen zur Hand»): Masszahl am Cursor ────────────
// Muster `mass-eingabe.spec.ts`: Wand-Werkzeug, ersten Punkt setzen, Maus
// bewegen (Live-Label läuft mit), dann eine Länge tippen — der Puffer
// («3.5 m ⏎») zeigt die exakte Länge, bevor Enter den Punkt setzt.
await frisch(false);
await page.click('[data-testid="module-design"]');
await page.click('[data-testid="view-2d"]');
await page.click('[data-testid="nav-fit"]');
await page.waitForTimeout(300);
await page.click('[data-testid="tool-wand"]');
{
  const svg = page.locator('[data-testid="planview"]');
  const box = (await svg.boundingBox())!;
  const mitteX = box.x + box.width / 2;
  const mitteY = box.y + box.height / 2;
  await page.mouse.click(mitteX, mitteY);
  await page.mouse.move(mitteX + 120, mitteY);
  const label = page.locator('[data-testid="mass-label"]');
  await label.waitFor();
  await page.keyboard.type('3.5');
  await page.waitForSelector('[data-testid="mass-label"]:has-text("⏎")');
}
await shot('06-mass-eingabe', 400);
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');

// ── 07 NEU (0.6.4, F4 «Element-Fang»): Fangpunkt-Marker am Wandende ─────
// Muster `element-fang.spec.ts`: bestehende Wand über den Command-Weg,
// Wand-Werkzeug wählen, Maus neben das Wandende bewegen — der Fang-Marker
// (Quadrat = Endpunkt) erscheint, bevor geklickt wird.
await frisch(false);
await page.click('[data-testid="module-design"]');
await page.evaluate(() => {
  const s = (window as unknown as { __kosmo: Kosmo }).__kosmo.state();
  const assembly = (s.doc.byKind('assembly') as unknown as { id: string; target: string }[]).find(
    (a) => a.target === 'wall',
  );
  (window as unknown as { __kosmo: Kosmo }).__kosmo.run('design.wandZeichnen', {
    storeyId: s.activeStoreyId,
    a: { x: 0, y: 0 },
    b: { x: 6000, y: 0 },
    ...(assembly ? { assemblyId: assembly.id } : {}),
  });
});
await page.click('[data-testid="view-2d"]');
await page.click('[data-testid="nav-fit"]');
await page.waitForTimeout(400);
await page.click('[data-testid="tool-wand"]');
{
  const ziel = await page.evaluate(() => {
    const svg = document.querySelector('[data-testid="planview"]') as SVGSVGElement;
    const inhalt = svg.querySelector('g') as SVGGElement;
    const m = inhalt.getScreenCTM()!;
    const pt = new DOMPoint(6000, 0).matrixTransform(m);
    const proMm = new DOMPoint(7000, 0).matrixTransform(m).x - pt.x;
    return { x: pt.x, y: pt.y, pxProMm: proMm / 1000 };
  });
  const abstand = 250 * ziel.pxProMm;
  await page.mouse.move(ziel.x + abstand, ziel.y - abstand);
  await page.waitForSelector('[data-testid="fang-marker"]');
}
await shot('07-element-fang', 400);
await page.keyboard.press('Escape');

// ── 08 NEU: Plan-LOD — nah (voll) / fern, data-lod beweist die Stufe ────
// Muster `plan-lod.spec.ts` exakt (Wand + Öffnung + Möbel per Command).
await frisch(true); // load-tkb landet bereits in KosmoDesign
const wandId = await page.evaluate(() => {
  const k = (window as unknown as { __kosmo: Kosmo }).__kosmo;
  const st = k.state();
  const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW'))!;
  const res = k.run('design.wandZeichnen', {
    storeyId: st.activeStoreyId,
    a: { x: 0, y: 0 },
    b: { x: 8000, y: 0 },
    assemblyId: aw.id,
  });
  return res.patches[0]!.id;
});
await page.evaluate((id) => {
  const k = (window as unknown as { __kosmo: Kosmo }).__kosmo;
  k.run('design.oeffnungSetzen', {
    wallId: id,
    openingType: 'fenster',
    center: 3000,
    width: 2000,
    height: 1500,
    sill: 900,
  });
  k.run('design.moebelSetzen', {
    storeyId: k.state().activeStoreyId,
    typ: 'esstisch',
    at: { x: 4000, y: 2000 },
    rotationGrad: 0,
  });
}, wandId);
await page.click('[data-testid="view-2d"]');
const planview = page.locator('[data-testid="planview"]');
{
  const box = (await planview.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -20000); // rein
  await page.waitForSelector('[data-testid="planview"][data-lod="voll"]');
  await shot('08-plan-lod-voll', 500);
  await page.mouse.wheel(0, 20000); // raus
  await page.waitForSelector('[data-testid="planview"][data-lod="fern"]');
  await shot('08-plan-lod-fern', 500);
}

// ── 09 NEU: Skizzieren-Annäherungen — 3 Karten sichtbar ─────────────────
// Muster `entwurfs-icons.spec.ts` (dritter Test), Strich bewusst nicht
// achsenparallel (~23°) — erst die Annäherung macht ihn orthogonal.
await frisch(false);
await page.click('[data-testid="module-design"]');
await page.click('[data-testid="view-2d"]');
await page.click('[data-testid="entwurf-skizzieren"]');
const overlay = page.locator('[data-testid="sketch-overlay"]');
await overlay.waitFor();
{
  const box = (await overlay.boundingBox())!;
  const x1 = box.x + 140;
  const y1 = box.y + 160;
  const x2 = x1 + 300;
  const y2 = y1 + 130;
  await page.mouse.move(x1, y1);
  await page.mouse.down();
  await page.mouse.move(x1 + (x2 - x1) / 2, y1 + (y2 - y1) / 2, { steps: 6 });
  await page.mouse.move(x2, y2, { steps: 6 });
  await page.mouse.up();
}
await page.click('[data-testid="sketch-uebergeben"]');
await page.waitForSelector('[data-testid="sketch-proposal"]', { timeout: 15000 });
await page.waitForSelector('[data-testid="skizze-vorschlag-3"]');
await shot('09-skizzieren-annaeherungen', 600);

// ── 10 NEU: Kosmo-Vorschlagskarte mit VORSCHAU (Vorher/Nachher-Mini-SVG) ──
// Muster `proposal-vorschau.spec.ts` + `kosmo-symbol.spec.ts` (Panel übers
// Symbol öffnen — der neue Default ist zu).
await frisch(false);
await page.click('[data-testid="kosmo-symbol"]');
await page.waitForSelector('[data-testid="kosmo-panel"]');
await page.click('[data-testid="module-design"]');
await page.fill('[data-testid="kosmo-input"]', 'Zeichne eine Wand von 0,0 bis 6,0');
await page.click('[data-testid="kosmo-send"]');
await page.waitForSelector('[data-testid="proposal-card"]', { timeout: 15000 });
await page.waitForSelector('[data-testid="proposal-vorschau"] svg', { timeout: 15000 });
await shot('10-kosmo-vorschlag-vorschau', 500);

// ── 11 NEU: Phasen-Preset-Banner — Teilphase → Bewilligung ──────────────
// Muster `faehigkeiten-phasen.spec.ts` (dritter Test).
await frisch(false);
await page.click('[data-testid="module-design"]');
await page.click('[data-testid="view-2d"]');
await page.click('[data-testid="projekt-menu-toggle"]');
await page.selectOption('[data-testid="sia-phase-select"]', 'bewilligung');
await page.waitForSelector('[data-testid="phasen-preset-angebot"]');
await shot('11-phasen-preset-banner', 500);

// ── 12 NEU: KV-Panel — Richtwert-Summe + Ehrlichkeits-Hinweis ───────────
// Muster `kv-schaetzung.spec.ts`.
await frisch(true); // load-tkb landet bereits in KosmoDesign
await page.click('[data-testid="kv-oeffnen"]');
await page.waitForSelector('[data-testid="kv-panel"]');
await shot('12-kv-panel', 500);

// ── 13 NEU: Bauablauf-Panel — Gewerke-Tabelle ───────────────────────────
// Muster `bauablauf.spec.ts`.
await frisch(true); // load-tkb landet bereits in KosmoDesign
await page.click('[data-testid="bauablauf-oeffnen"]');
await page.waitForSelector('[data-testid="bauablauf-tabelle"]');
await shot('13-bauablauf-panel', 500);

// ── 14 NEU: Mängel-Panel — mit einem erfassten Mangel (keine Leerdemo) ──
// Muster `maengel.spec.ts`.
await frisch(true); // load-tkb landet bereits in KosmoDesign
await page.click('[data-testid="maengel-oeffnen"]');
await page.waitForSelector('[data-testid="maengel-panel"]');
await page.fill('[data-testid="maengel-ort"]', 'Bad 2.OG');
await page.fill('[data-testid="maengel-gewerk"]', 'Sanitär/Heizung');
await page.fill('[data-testid="maengel-beschreibung"]', 'Silikonfuge Dusche undicht');
await page.click('[data-testid="maengel-erfassen"]');
await page.waitForSelector('[data-testid="maengel-liste"]');
await shot('14-maengel-panel', 500);

// ── 15 NEU: Baugesuch — Blattsatz + Set + Ausnützungsnachweis ──────────
// Muster `baugesuch.spec.ts`.
await frisch(true);
await page.evaluate(() => {
  const k = (window as unknown as { __kosmo: Kosmo }).__kosmo;
  const storeyId = k.state().activeStoreyId;
  const aufbau = k.run('design.aufbauErstellen', {
    name: 'AW Beton 36',
    target: 'wall',
    layers: [{ material: 'beton', thickness: 250, function: 'tragend' }],
  });
  const assemblyId = aufbau.patches[0]!.id;
  k.run('design.wandZeichnen', { storeyId, a: { x: 0, y: 0 }, b: { x: 10000, y: 0 }, assemblyId });
  k.run('design.wandZeichnen', { storeyId, a: { x: 10000, y: 0 }, b: { x: 10000, y: 6000 }, assemblyId });
  k.run('design.wandZeichnen', { storeyId, a: { x: 10000, y: 6000 }, b: { x: 0, y: 6000 }, assemblyId });
  k.run('design.wandZeichnen', { storeyId, a: { x: 0, y: 6000 }, b: { x: 0, y: 0 }, assemblyId });
  k.open('publish');
});
await page.waitForSelector('[data-testid="add-sheet"]');
await page.waitForTimeout(3000); // Publish-Workspace rendert nach dem Öffnen kurz nach — stabilisieren
await page.click('[data-testid="add-sheet"]');
await page.click('[data-testid="place-section"]');
await page.waitForTimeout(400);
await page.click('[data-testid="baugesuch-erstellen"]');
await page.locator('[data-testid="pubset-karte"]', { hasText: 'Baugesuch' }).waitFor({ timeout: 15000 });
await shot('15-baugesuch', 700);

// ── 16 NEU: Blatt-füllen — mehrere Slots automatisch belegt ─────────────
// Muster `blatt-fuellen.spec.ts`.
await frisch(false);
await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG + Standard-Aufbauten
await page.waitForTimeout(600);
await page.evaluate(() => {
  const k = (window as unknown as { __kosmo: Kosmo }).__kosmo;
  const st = k.state();
  const storeyId = st.activeStoreyId!;
  const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW'))!;
  const assemblyId = aw.id;
  k.run('design.wandZeichnen', { storeyId, a: { x: 0, y: 0 }, b: { x: 7000, y: 0 }, assemblyId });
  k.run('design.wandZeichnen', { storeyId, a: { x: 7000, y: 0 }, b: { x: 7000, y: 5000 }, assemblyId });
  k.run('design.wandZeichnen', { storeyId, a: { x: 7000, y: 5000 }, b: { x: 0, y: 5000 }, assemblyId });
  k.run('design.wandZeichnen', { storeyId, a: { x: 0, y: 5000 }, b: { x: 0, y: 0 }, assemblyId });
  k.run('design.deckeZeichnen', {
    storeyId,
    outline: [
      { x: 0, y: 0 },
      { x: 7000, y: 0 },
      { x: 7000, y: 5000 },
      { x: 0, y: 5000 },
    ],
  });
  k.open('publish');
});
await page.waitForSelector('[data-testid="add-sheet"]');
await page.waitForTimeout(3000); // Publish-Workspace rendert nach dem Öffnen kurz nach — stabilisieren
await page.click('[data-testid="add-sheet"]');
await page.waitForSelector('[data-testid="sheet-canvas"]');
await page.click('[data-testid="blatt-fuellen"]');
await page.waitForSelector('[data-testid="meldung-info"]');
await shot('16-blatt-fuellen', 700);

// ── 17 NEU (0.6.5): KosmoVis neu gedacht — Graph nach «+ Drei Stimmungen»:
//    Nodes mit Kategorie-Zeichen und Farbton, Zoom-Leiste (vis-zoom-minus/
//    fit/plus), Porttyp-Legende (vis-legende), V-H4-Formular im Render-Node
//    (Fassade/Szene/Jahreszeit/Personen, sichtbarer finaler Prompt) ────────
// Muster `visgraph.spec.ts` + `vis-automatik.spec.ts`.
await frisch(true);
await page.evaluate(() => (window as unknown as { __kosmo: Kosmo }).__kosmo.open('vis'));
await page.waitForSelector('[data-testid="tab-graph"]');
await page.click('[data-testid="drei-stimmungen"]');
await page.waitForSelector('[data-testid="vis-node-render"]');
// Erst der reine Graph-Zustand: Zoom-Leiste, Legende, Kategorie-Icons und
// das V-H4-Formular der drei Render-Nodes sind im Bild. BEWUSST OHNE den
// `vis-zoom-fit`-Klick der 0.6.5-Fassung (gleiche Lehre wie Block 35):
// herausgezoomt malt Headless-Chromium/SwiftShader die foreignObject-
// Karteninhalte unskaliert über die verkleinerte Szene (Aufnahme-Artefakt,
// DOM sauber). Bei 1:1 ist das Formular gestochen lesbar; die dann
// sichtbare Minimap unten links ist bereits die 0.6.6-Zutat und wird auf
// der PDF-Seite ehrlich als solche benannt.
await page.waitForSelector('[data-testid="vis-zoom-fit"]');
await page.waitForSelector('[data-testid="vis-legende"]');
await page.waitForSelector('[data-testid="render-formular"]');
await shot('17-vis-graph', 800);
await page.click('[data-testid="vis-auto-kamera"]');
await page.waitForSelector('[data-testid="vis-node-kamera"]');
const ersterRenderNode = page.locator('[data-testid="vis-node-render"]').first();
await ersterRenderNode.locator('[data-testid="vis-preset-select"]').selectOption('praesentation');
await ersterRenderNode.locator('[data-testid="render-ausfuehren"]').click();
await ersterRenderNode.locator('[data-testid="render-bild"]').waitFor({ timeout: 45000 });
await shot('17-vis-automatik', 800);

// ── 18 NEU: Material-Würfel — Referenzkatalog-Detail mit Quelle ─────────
// Muster `material-programm.spec.ts`.
await frisch(false);
await page.click('[data-testid="module-asset"]');
await page.click('[data-testid="asset-tab-materialien"]');
await page.click('[data-testid="material-backstein"]');
await page.waitForSelector('[data-testid="material-detail"] canvas');
await page.locator('[data-testid="material-detail"]').scrollIntoViewIfNeeded();
await shot('18-material-wuerfel', 600);

// ── 19 KosmoData (Referenzen/Bauteile) + NEU 0.6.5: gezeichnete Leerbild-
//    Signete («kein Bild hinterlegt») auf allen fotolosen Karten, Karten
//    heben sich über Linienstärke statt Schatten (Kritik-Befund A8) ──────
await frisch(true);
await page.evaluate(() => (window as unknown as { __kosmo: Kosmo }).__kosmo.open('data'));
await page.waitForSelector('[data-testid="ref-card"]');
await page.waitForSelector('[data-testid="karte-leerbild"]');
await page.locator('[data-testid="data-sync-badge"]').scrollIntoViewIfNeeded();
await shot('19-data-referenzen', 800);
await page.click('[data-testid="tab-bauteile"]');
await shot('19-data-bauteile', 500);

// ── 20 KosmoDev: Auftragsbuch — 0.6.5: auf die gemeinsame Formensprache
//    gebracht (ein Primärknopf, gruppierte Werkzeugzeile), Funktion gleich ─
await page.evaluate(() => (window as unknown as { __kosmo: Kosmo }).__kosmo.open('dev'));
await page.fill('[data-testid="auftrag-text"]', 'Türanschläge im Grundriss wählbar machen — Werkzeugleiste KosmoDesign');
await page.click('[data-testid="auftrag-erfassen"]');
await page.waitForSelector('[data-testid="auftrag-karte"]');
await shot('20-dev-auftragsbuch', 500);

// ── 21 Prepare / Doc (Tech-Radar aus 0.6.4) / Train ─────────────────────
// 0.6.5: alle drei auf die gemeinsame Formensprache gebracht (Primärknopf,
// gezeichnete Leerzustände, gruppierte Werkzeugzeilen); Tech-Radar-Inhalt
// (Muster `tech-radar.spec.ts`) unverändert aus 0.6.4.
await page.evaluate(() => (window as unknown as { __kosmo: Kosmo }).__kosmo.open('prepare'));
await shot('21-prepare', 800);
await page.evaluate(() => (window as unknown as { __kosmo: Kosmo }).__kosmo.open('doc'));
await shot('21-doc', 800);
await page.click('[data-testid="doc-tab-radar"]');
await page.waitForSelector('[data-testid="doc-radar"]');
await shot('21-doc-tech-radar', 500);
await page.evaluate(() => (window as unknown as { __kosmo: Kosmo }).__kosmo.open('train'));
await shot('21-train', 800);

// ── 22 KosmoDraw + KosmoSketch — unverändert diese Runde ───────────────
await page.evaluate(() => (window as unknown as { __kosmo: Kosmo }).__kosmo.open('home'));
await page.click('[data-testid="module-draw"]');
await shot('22-draw', 1000);
await page.evaluate(() => (window as unknown as { __kosmo: Kosmo }).__kosmo.open('home'));
await page.click('[data-testid="module-sketch"]');
await shot('22-sketch', 1000);

// ── 23 Umbau-Werkplan (Bestand/Abbruch/Neu) — unverändert diese Runde ──
await frisch(false);
await page.click('[data-testid="module-design"]');
await page.waitForTimeout(600);
await page.evaluate(`(() => {
  const k = window.__kosmo;
  const st = k.state();
  const aw = st.doc.byKind('assembly').find((a) => a.name && a.name.startsWith('AW'));
  const w = (a, b) => k.run('design.wandZeichnen', { storeyId: st.activeStoreyId, a, b, assemblyId: aw.id }).patches[0].id;
  const bestand = w({ x: 0, y: 0 }, { x: 9000, y: 0 });
  const abbruch = w({ x: 0, y: 0 }, { x: 0, y: 6000 });
  const neu = w({ x: 9000, y: 0 }, { x: 9000, y: 6000 });
  w({ x: 0, y: 6000 }, { x: 9000, y: 6000 });
  k.run('design.renovationSetzen', { ids: [bestand], status: 'bestand' });
  k.run('design.renovationSetzen', { ids: [abbruch], status: 'abbruch' });
  k.run('design.renovationSetzen', { ids: [neu], status: 'neu' });
})()`);
await page.click('[data-testid="view-2d"]');
await shot('23-umbau-werkplan', 800);

// ── 24 Volumenstudien — unverändert diese Runde ────────────────────────
await frisch(false);
await page.click('[data-testid="module-design"]');
await page.waitForTimeout(600);
await page.evaluate(`(() => {
  const k = window.__kosmo;
  const storeyId = k.state().activeStoreyId;
  k.run('design.zonenRegelSetzen', {
    name: 'W4 (Zürich-Altstetten)', az: 1.4, maxHoehe: 16000, maxVollgeschosse: 4,
    grenzabstandKlein: 4000, grenzabstandGross: 6000, parzellenFlaeche: 960,
  });
  k.run('design.zoneErstellen', { storeyId, name: 'Parzelle', sia: 'KF', outline: [
    { x: -5000, y: -5000 }, { x: 35000, y: -5000 }, { x: 35000, y: 19000 }, { x: -5000, y: 19000 },
  ] });
  k.run('design.raumprogrammSetzen', { posten: [
    { typ: 'preisguenstig', hnfSoll: 300 }, { typ: 'marktgerecht', hnfSoll: 190 },
  ] });
  k.run('grundlagen.volumenstudie', { storeyId });
})()`);
await page.click('[data-testid="view-3d"]');
await page.click('[data-testid="studie-toggle"]');
await page.waitForSelector('[data-testid="studien-panel"]');
await page.waitForSelector('[data-testid="varianten-matrix"]');
await shot('24-studien-panel', 1200);

// ── 25 Grundlagenstudie-Bericht (SVG) — unverändert diese Runde ────────
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.click('[data-testid="studie-bericht"]'),
]);
const svgPfad = await download.path();
writeFileSync(`${OUT}25-bericht.svg`, readFileSync(svgPfad!, 'utf8'));
console.log('✓ 25-bericht (SVG-Download)');

// ── 26 Unternehmerplan-Import — unverändert diese Runde ────────────────
await frisch(false);
await page.click('[data-testid="module-design"]');
await page.click('[data-testid="view-2d"]');
const [chooser] = await Promise.all([
  page.waitForEvent('filechooser'),
  page.click('[data-testid="import-dxf"]'),
]);
await chooser.setFiles({
  name: 'unternehmer-plan.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4\n%…kein echter Plan, nur die Magic-Bytes fuer die Erkennung…\n'),
});
await page.waitForSelector('[data-testid="pdf-hinweis"]');
await shot('26-unternehmerplan-pdf', 800);

// ── 27 NEU (0.6.4, F1 «Claude-Modell auswählbar»): Modellwahl im Kosmo-Panel ──
// Muster `cloud-login.spec.ts`: Kosmo-Symbol → Panel öffnen, Zahnrad
// («Einstellungen» im Panel, NICHT der globale Einstellungen-Knopf),
// Betriebsart Cloud → das Claude-Modell-Select (Opus/Sonnet/Haiku/Freitext)
// erscheint, Owner-Default ist Opus 4.8.
await frisch(false);
await page.click('[data-testid="kosmo-symbol"]');
await page.waitForSelector('[data-testid="kosmo-panel"]');
await page.click('[aria-label="Einstellungen"]');
await page.click('[data-testid="betriebsart-cloud"]');
await page.waitForSelector('[data-testid="claude-modell-select"]');
await shot('27-claude-modell', 400);

// ── 28 Deinstallieren-Dialog — F2 (0.6.4): Einstieg NUR noch über die
//    Einstellungen (Sektion «System»), der Kopfleisten-Knopf ist weg. Die
//    Farbpalette (Akzente) zog ebenfalls hierher (Sektion «Darstellung»,
//    siehe Block 03) — beides «eine Funktion, ein Ort» ────────────────
await frisch(false);
await page.click('[data-testid="einstellungen-oeffnen"]');
await page.waitForSelector('[data-testid="einstellungen-panel"]');
await page.click('[data-testid="einstellung-deinstallieren"]');
await page.waitForSelector('[role="dialog"]');
await shot('28-deinstallieren', 500);

// ── 29 NEU (0.6.6): Knopfdruck spürbar — Ruhe/gedrückt-Paar ──────────────
// Ehrlichkeitsgrenze: Bewegung selbst zeigt kein Standbild — aber der
// GEDRÜCKTE Zustand (`.k-druck:active`, `packages/kosmo-ui/src/aura.css`:
// scale(0.97) + Tusche-Abdunklung) lässt sich sauber fotografieren:
// `mouse.down()` halten, OHNE `mouse.up()`, dann fotografieren. Lehren aus
// dem ersten Lauf: (1) ein grosser TEXT-Knopf mit sichtbarem Rand
// (`load-tkb`, KButton) statt des kleinen Zahnrad-Icons — 3% Skalierung auf
// ~20px Icon ist Sub-Pixel und beweist nichts; (2) BEIDE Bilder im
// Hover-Zustand aufnehmen, damit der Unterschied wirklich NUR der Druck ist
// (nicht Hover vs. Nicht-Hover). Der Klick beim Loslassen lädt harmlos die
// TKB-Demo — Block 30 macht ohnehin sein eigenes goto.
await frisch(false);
{
  const knopf = page.locator('[data-testid="load-tkb"]');
  await knopf.waitFor();
  const box = (await knopf.boundingBox())!;
  const clip = { x: Math.max(0, box.x - 30), y: Math.max(0, box.y - 24), width: box.width + 60, height: box.height + 48 };
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}29-knopfdruck-ruhe.png`, clip });
  console.log('✓ 29-knopfdruck-ruhe');
  await page.mouse.down();
  await page.waitForTimeout(150); // .k-druck-dauer (80ms) sicher abgewartet
  await page.screenshot({ path: `${OUT}29-knopfdruck-gedrueckt.png`, clip });
  console.log('✓ 29-knopfdruck-gedrueckt');
  await page.mouse.up();
  await page.waitForTimeout(2200); // TKB-Demo lädt (Klick durch das Loslassen) — sauber ausklingen lassen
}

// ── 30 NEU (0.6.6): Design im Arbeitsmodus «Zeichnen» — Modus-Chip zeigt
//    ihn ehrlich («festgehalten»), Chip-Menü offen ─────────────────────────
// Muster `arbeitsmodi.spec.ts` + `kosmo-ui-bruecke.spec.ts`: `kosmo.ui.v1`
// MIT `arbeitsmodus:'zeichnen'` + `modusFesthalten:true` VOR dem `reload()`
// gesetzt — zeigt den Modus sofort, ohne die 5s-Hysterese der Live-Erkennung
// abzuwarten (die läuft unverändert, ist aber in Bewegung nicht fotografierbar).
await page.goto(URL_);
await page.evaluate(() => {
  localStorage.setItem('kosmo.onboarded', '1');
  localStorage.setItem('kosmo.starterGuide.done', '1');
  localStorage.setItem('kosmo.thema', 'paper');
  localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
  localStorage.removeItem('kosmo.panelOffen');
  localStorage.removeItem('kosmo.projekt.aktiv');
  localStorage.setItem(
    'kosmo.ui.v1',
    JSON.stringify({
      version: 1,
      modusAutomatik: true,
      modusFesthalten: true,
      modusManuell: 'zeichnen',
      arbeitsmodus: 'zeichnen',
      phasenFokus: null,
    }),
  );
  indexedDB.deleteDatabase('kosmo-projekte');
});
await page.reload();
await page.waitForSelector('[data-testid="module-design"]');
await page.click('[data-testid="load-tkb"]'); // landet direkt in KosmoDesign
await page.waitForTimeout(2200);
await page.click('[data-testid="view-2d"]');
await page.waitForSelector('[data-testid="modus-chip"]');
await shot('30-design-modus-zeichnen', 500);
const modusChip = page.locator('[data-testid="modus-chip"]');
await modusChip.click();
await page.waitForSelector('[data-testid="modus-menu"]');
await shot('30-design-modus-chip-menu', 400);

// ── 31 NEU (0.6.6): «Mehr…» — Export/Fähigkeiten treten im festen Modus
//    zurück, bleiben aber vollständig im Überlaufmenü erreichbar ───────────
// Muster `arbeitsmodi.spec.ts` (c). Chip-Menü über den Chip selbst wieder
// schliessen (Toggle, kein Deckel-Overlay hinter diesem Menü).
await modusChip.click();
await page.locator('[data-testid="modus-menu"]').waitFor({ state: 'detached' });
await page.waitForSelector('[data-testid="werkzeuge-mehr"]');
await page.click('[data-testid="werkzeuge-mehr"]');
await page.waitForSelector('[data-testid="werkzeuge-mehr-liste"]');
await shot('31-design-mehr-faecher', 400);

// ── 32 NEU (0.6.6): 3D-Viewport — Render-Knopf (V-M1) stösst dieselbe
//    KosmoVis-Kette an; die Fake-Bridge liefert ein Ergebnisbild ───────────
// Muster `kritik-shots-066-r2.mts` (Block «viewport-render-knopf»).
await frisch(true); // load-tkb landet bereits in KosmoDesign
await page.click('[data-testid="view-3d"]');
await page.waitForSelector('[data-testid="viewport-render-knopf"]');
await shot('32-viewport-render-knopf', 1000);
await page.click('[data-testid="viewport-render-knopf"]');
await page.waitForSelector('[data-testid="viewport-render-bild"]', { timeout: 45000 });
await shot('32-viewport-render-fertig', 800);

// ── 33 NEU (0.6.6): KosmoVis — kategorisierte Node-Palette ──────────────
// Muster `kritik-shots-066-r2.mts`: `graph-neu` (leere Canvas) →
// `vis-palette-toggle`.
await frisch(false);
await page.evaluate(() => (window as unknown as { __kosmo: Kosmo }).__kosmo.open('vis'));
await page.waitForSelector('[data-testid="tab-graph"]');
await page.click('[data-testid="graph-neu"]');
await page.waitForSelector('[data-testid="node-canvas"]');
await page.click('[data-testid="vis-palette-toggle"]');
await shot('33-vis-palette', 500);
await page.click('[data-testid="vis-palette-toggle"]'); // schliessen, damit sie die Kuratier-Fläche nicht verdeckt

// ── 34 NEU (0.6.6): KosmoVis — Kuratier-Fläche (merken/verwerfen/vergleichen) ──
await page.click('[data-testid="vis-kuratier-toggle"]');
await shot('34-vis-kuratier', 500);
await page.click('[data-testid="vis-kuratier-toggle"]'); // schliessen

// ── 35 NEU (0.6.6): KosmoVis — Minimap (ab 5 Nodes, hier 24 nach zweifachem
//    «Drei Stimmungen») + entzerrte Ketten (keine Überlappung mehr) ────────
// Muster `vis-oberflaeche.spec.ts` («Minimap: ab 5 Nodes …») +
// `kritik-shots-066-r2.mts` (zweifaches `drei-stimmungen` für die Entzerrung).
// BEWUSST KEIN `vis-zoom-fit` vor dem Foto (Lehre aus dem ersten Lauf):
// beim herausgezoomten Fit malt Headless-Chromium/SwiftShader die
// foreignObject-Inhalte der Node-Karten UNskaliert über die verkleinerte
// Szene (dieselbe Artefakt-Familie wie das dokumentierte Kurzbefehle-
// Geisterbild; DOM nachweislich sauber — ein `vis-minimap`, disjunkte
// Node-Boxen laut vis-oberflaeche.spec). Bei Zoom 1:1 gibt es nichts zu
// skalieren → sauberes Bild, und die Minimap zeigt ihren eigentlichen
// Zweck: der Graph ragt übers Fenster hinaus, der Viewport-Rahmen sitzt
// auf dem sichtbaren Ausschnitt, die zweite (versetzte) Kette liegt als
// Rechteck-Wolke darunter.
await page.click('[data-testid="drei-stimmungen"]');
await page.waitForSelector('[data-testid="vis-node-render"]');
await page.waitForTimeout(800);
await page.click('[data-testid="drei-stimmungen"]');
await page.waitForTimeout(800);
await page.waitForSelector('[data-testid="vis-minimap"]');
await shot('35-vis-minimap-entzerrt', 1000);

// ── 36 NEU (0.6.6): Kosmo-UI-Brücke — Kosmo stellt den Arbeitsmodus selbst;
//    eine eigene `kosmo-ui-aktion-modus`-Chatzeile quittiert es sichtbar
//    (NICHT der Diff-Karten-Weg) ────────────────────────────────────────────
// Muster `kosmo-ui-bruecke.spec.ts`, Test (b), 1:1 übernommen (Mock-Provider).
await page.goto(URL_);
await page.evaluate(() => {
  localStorage.setItem('kosmo.onboarded', '1');
  localStorage.setItem('kosmo.starterGuide.done', '1');
  localStorage.setItem('kosmo.panelOffen', '1');
  localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
  localStorage.setItem(
    'kosmo.ui.v1',
    JSON.stringify({ version: 1, modusAutomatik: true, modusFesthalten: false, phasenFokus: null }),
  );
});
await page.reload();
await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG + AW-Aufbau
await page.waitForSelector('[data-testid="kosmo-panel"]');
await page.fill('[data-testid="kosmo-input"]', 'Stell den Modus auf exportieren');
await page.click('[data-testid="kosmo-send"]');
await page.waitForSelector('[data-testid="kosmo-ui-aktion-modus"]', { timeout: 15000 });
await shot('36-kosmo-ui-aktion-modus', 600);

// ── 37 NEU (0.6.6): Gesten mit Schwung — langes Drücken öffnet das
//    Kontextmenü (Desktop-Äquivalent: Rechtsklick) ──────────────────────────
// Ehrlichkeitsgrenze: Momentum-Pan, Doppeltipp-Zoom und Haptik-Ticks SIND
// Bewegung/Berührungssensorik — in einem Standbild nicht seriös zeigbar,
// bleiben darum textlich im PDF. Nur der STATISCHE Endzustand des langen
// Drückens (das offene Kontextmenü) ist bebilderbar. Muster
// `plan-interaktion.spec.ts` («Touch-Longpress … Rechtsklick ebenso»).
await frisch(false);
await page.click('[data-testid="module-design"]');
await page.evaluate(() => {
  const k = (window as unknown as { __kosmo: Kosmo }).__kosmo;
  const st = k.state();
  const assembly = (st.doc.byKind('assembly') as unknown as { id: string; target: string }[]).find((a) => a.target === 'wall');
  k.run('design.wandZeichnen', {
    storeyId: st.activeStoreyId,
    a: { x: 4000, y: 2000 },
    b: { x: 6000, y: 2000 },
    ...(assembly ? { assemblyId: assembly.id } : {}),
  });
});
await page.click('[data-testid="view-2d"]');
await page.click('[data-testid="nav-fit"]');
await page.waitForTimeout(300);
{
  const ziel = await page.evaluate(() => {
    const svg = document.querySelector('[data-testid="planview"]') as SVGSVGElement;
    const inhalt = svg.querySelector('g') as SVGGElement;
    const m = inhalt.getScreenCTM()!;
    // ACHTUNG Plan-Koordinaten: PlanView zeichnet Welt-y NEGIERT (die
    // Transform-Gruppe flippt nicht, die Geometrie steht bei -y) — Welt
    // (5000, 2000) liegt im SVG darum bei (5000, -2000). Block 07 oben merkt
    // davon nichts, weil dort y=0 ist; ohne die Negation landet der
    // Rechtsklick hier ausserhalb des Fensters (Lehre aus dem ersten
    // 0.6.6-Lauf, Timeout auf viewport-kontextmenue).
    const pt = new DOMPoint(5000, -2000).matrixTransform(m);
    return { x: pt.x, y: pt.y };
  });
  await page.mouse.click(ziel.x, ziel.y, { button: 'right' });
}
await page.waitForSelector('[data-testid="viewport-kontextmenue"]');
await shot('37-gesten-kontextmenu', 400);

await browser.close();
console.log('Alle Rundgang-Bilder liegen unter docs/rundgang/bilder/');
