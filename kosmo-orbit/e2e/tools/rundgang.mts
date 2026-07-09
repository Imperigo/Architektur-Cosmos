/**
 * Rundgang-Screenshots «0.6.4» (Owner-Auftrag 09.07.) — Teil 1.
 * Wie `handbuch.mts` (V1-Finish P6), aber für das Kommentier-PDF
 * `rundgang-pdf.mts`: fährt alle Stationen deterministisch ab. Diese Runde
 * hat die 0.6.4-Testbefunde des Owners umgesetzt (siehe
 * `apps/kosmo-orbit/src/shell/neuigkeiten.ts`, Version 0.6.4): das neue
 * Orbit-Startmenü ersetzt die alte Zentrale-Kachel-Ansicht (4 Hauptwerkzeuge
 * kreisen um das Kosmos-Zeichen, Hover/Klick zeigt den Fächer), Element-Fang
 * und Masszahl-am-Cursor beim Zeichnen (F4/F5), Werkzeug-Kurztasten + «?»-
 * Übersicht, KosmoVis-Auto-Fit, KosmoData-Offline-Ehrlichkeit, wählbares
 * Claude-Modell, Tech-Radar in KosmoDoc, und Deinstallieren/Farbpalette
 * ausschliesslich in den Einstellungen (F2, Sektion «System»). Jede Station
 * steuert exakt die `data-testid`-Selektoren an, die in den zugehörigen
 * E2E-Specs bewiesen sind (siehe Kommentar je Block). Bilder →
 * docs/rundgang/bilder/.
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

// ── 01 NEU (0.6.4, F3): Orbit-Startmenü — Ruhezustand + offener Fächer ──
// Muster `orbit-start.spec.ts`: löst die alte Kachel-Zentrale ab. Die 4
// Hauptwerkzeuge (KosmoDesign/KosmoData/Kosmo/KosmoOffice) kreisen ganz
// langsam im Kreis um das Kosmos-Zeichen; Hover auf ein Hauptwerkzeug öffnet
// den Fächer mit den Untertools (Titel + Kurzbeschrieb je Kachel).
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

// ── 03 NEU: Einstellungs-Panel — Funktionen & Neues (0.6.4) + Leistung ──
// Muster `einstellungen.spec.ts` + `leistung.spec.ts`. Der 0.6.4-Eintrag
// steht in `NEUIGKEITEN` jetzt zuoberst (neuster zuerst).
await frisch(false);
await page.click('[data-testid="einstellungen-oeffnen"]');
await page.waitForSelector('[data-testid="einstellungen-panel"]');
await shot('03-einstellungen', 400);
await page.locator('[data-testid="neuigkeiten-version-0.6.4"]').scrollIntoViewIfNeeded();
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

// ── 05 NEU: KosmoDesign — Entwurfs-Dock + Fähigkeiten-Zeile + Statusleiste ──
// Muster `faehigkeiten-phasen.spec.ts` + `entwurfs-icons.spec.ts`.
await frisch(true); // TKB geladen — load-tkb landet bereits in KosmoDesign
await page.waitForSelector('[data-testid="entwurf-dock"]');
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

// ── 17 NEU: Vis-Automatik — Auto-Kamera + Cycles-Preset + Fake-Render ───
// Muster `vis-automatik.spec.ts`.
await frisch(true);
await page.evaluate(() => (window as unknown as { __kosmo: Kosmo }).__kosmo.open('vis'));
await page.waitForSelector('[data-testid="tab-graph"]');
await page.click('[data-testid="drei-stimmungen"]');
await page.waitForSelector('[data-testid="vis-node-render"]');
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

// ── 19 KosmoData (Referenzen/Bauteile) + NEU 0.6.4: ehrlicher Offline-
//    Badge («Offline — eingebaute Referenzdaten» statt «Offline-Seed») ──
await frisch(true);
await page.evaluate(() => (window as unknown as { __kosmo: Kosmo }).__kosmo.open('data'));
await page.waitForSelector('[data-testid="ref-card"]');
await page.locator('[data-testid="data-sync-badge"]').scrollIntoViewIfNeeded();
await shot('19-data-referenzen', 800);
await page.click('[data-testid="tab-bauteile"]');
await shot('19-data-bauteile', 500);

// ── 20 KosmoDev: Auftragsbuch — unverändert diese Runde ────────────────
await page.evaluate(() => (window as unknown as { __kosmo: Kosmo }).__kosmo.open('dev'));
await page.fill('[data-testid="auftrag-text"]', 'Türanschläge im Grundriss wählbar machen — Werkzeugleiste KosmoDesign');
await page.click('[data-testid="auftrag-erfassen"]');
await page.waitForSelector('[data-testid="auftrag-karte"]');
await shot('20-dev-auftragsbuch', 500);

// ── 21 Prepare / Doc (+ NEU 0.6.4: Tech-Radar) / Train ──────────────────
// Doc-Grundansicht unverändert diese Runde; der vierte Tab «Tech-Radar»
// (Muster `tech-radar.spec.ts`) ist neu — kuratierte Posten, Scan-Einträge
// ehrlich mit ⚠ markiert.
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
await page.click('[data-testid="einstellung-deinstallieren"]');
await page.waitForSelector('[role="dialog"]');
await shot('28-deinstallieren', 500);

await browser.close();
console.log('Alle Rundgang-Bilder liegen unter docs/rundgang/bilder/');
