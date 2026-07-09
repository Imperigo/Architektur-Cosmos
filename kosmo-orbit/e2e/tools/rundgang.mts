/**
 * Rundgang-Screenshots «0.6.3» (Owner-Auftrag 09.07.) — Teil 1.
 * Wie `handbuch.mts` (V1-Finish P6), aber für das Kommentier-PDF
 * `rundgang-pdf.mts`: fährt alle Stationen deterministisch ab. Diese Runde
 * hat die Oberfläche transformiert (Serie K: Kosmo-Symbol statt Dauerchat,
 * neue Zentrale-Kacheln, Erststart-Frage, Entwurfs-Dock + Fähigkeiten-Zeile
 * + Statusleiste in KosmoDesign, Plan-LOD, Phasen-Presets) plus die
 * Vollprojekt-Lücken-Batches (KV/Bauablauf/Mängel/Baugesuch/Blatt-füllen/
 * Vis-Automatik/Material-Würfel). Jede Station steuert exakt die
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

// ── 01 NEU: Zentrale — Kacheln mit Halo, Hover-Werkzeugzeile, Info-Panel ──
// Muster `zentrale-kacheln.spec.ts`.
await frisch(false);
await page.evaluate(() => (window as unknown as { __kosmo: Kosmo }).__kosmo.open('home'));
await shot('01-zentrale');
const designKachel = page.locator('[data-testid="module-design"]');
await designKachel.hover();
await page.waitForSelector('[data-testid="kachel-werkzeuge-design"]');
await shot('01-zentrale-hover', 400);
await page.click('[data-testid="kachel-info-design"]');
await page.waitForSelector('[data-testid="kachel-info-panel"]');
await shot('01-zentrale-info', 400);
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

// ── 03 NEU: Einstellungs-Panel — Funktionen & Neues (0.6.3) + Leistung ──
// Muster `einstellungen.spec.ts` + `leistung.spec.ts`.
await frisch(false);
await page.click('[data-testid="einstellungen-oeffnen"]');
await page.waitForSelector('[data-testid="einstellungen-panel"]');
await shot('03-einstellungen', 400);
await page.locator('[data-testid="neuigkeiten-version-0.6.3"]').scrollIntoViewIfNeeded();
await shot('03-einstellungen-neuigkeiten', 400);
await page.locator('[data-testid="einstellungen-leistung"]').scrollIntoViewIfNeeded();
await shot('03-einstellungen-leistung', 400);
await page.keyboard.press('Escape');

// ── 04 NEU: KosmoDesign — Entwurfs-Dock + Fähigkeiten-Zeile + Statusleiste ──
// Muster `faehigkeiten-phasen.spec.ts` + `entwurfs-icons.spec.ts`.
await frisch(true); // TKB geladen — load-tkb landet bereits in KosmoDesign
await page.waitForSelector('[data-testid="entwurf-dock"]');
await page.waitForSelector('[data-testid="leiste-gruppe-faehigkeiten"]');
await shot('04-design-uebersicht', 1000);
await page.click('[data-testid="view-quad"]');
await shot('04-design-4er', 1000);

// ── 05 NEU: Plan-LOD — nah (voll) / fern, data-lod beweist die Stufe ────
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
  await shot('05-plan-lod-voll', 500);
  await page.mouse.wheel(0, 20000); // raus
  await page.waitForSelector('[data-testid="planview"][data-lod="fern"]');
  await shot('05-plan-lod-fern', 500);
}

// ── 06 NEU: Skizzieren-Annäherungen — 3 Karten sichtbar ─────────────────
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
await shot('06-skizzieren-annaeherungen', 600);

// ── 07 NEU: Kosmo-Vorschlagskarte mit VORSCHAU (Vorher/Nachher-Mini-SVG) ──
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
await shot('07-kosmo-vorschlag-vorschau', 500);

// ── 08 NEU: Phasen-Preset-Banner — Teilphase → Bewilligung ──────────────
// Muster `faehigkeiten-phasen.spec.ts` (dritter Test).
await frisch(false);
await page.click('[data-testid="module-design"]');
await page.click('[data-testid="view-2d"]');
await page.click('[data-testid="projekt-menu-toggle"]');
await page.selectOption('[data-testid="sia-phase-select"]', 'bewilligung');
await page.waitForSelector('[data-testid="phasen-preset-angebot"]');
await shot('08-phasen-preset-banner', 500);

// ── 09 NEU: KV-Panel — Richtwert-Summe + Ehrlichkeits-Hinweis ───────────
// Muster `kv-schaetzung.spec.ts`.
await frisch(true); // load-tkb landet bereits in KosmoDesign
await page.click('[data-testid="kv-oeffnen"]');
await page.waitForSelector('[data-testid="kv-panel"]');
await shot('09-kv-panel', 500);

// ── 10 NEU: Bauablauf-Panel — Gewerke-Tabelle ───────────────────────────
// Muster `bauablauf.spec.ts`.
await frisch(true); // load-tkb landet bereits in KosmoDesign
await page.click('[data-testid="bauablauf-oeffnen"]');
await page.waitForSelector('[data-testid="bauablauf-tabelle"]');
await shot('10-bauablauf-panel', 500);

// ── 11 NEU: Mängel-Panel — mit einem erfassten Mangel (keine Leerdemo) ──
// Muster `maengel.spec.ts`.
await frisch(true); // load-tkb landet bereits in KosmoDesign
await page.click('[data-testid="maengel-oeffnen"]');
await page.waitForSelector('[data-testid="maengel-panel"]');
await page.fill('[data-testid="maengel-ort"]', 'Bad 2.OG');
await page.fill('[data-testid="maengel-gewerk"]', 'Sanitär/Heizung');
await page.fill('[data-testid="maengel-beschreibung"]', 'Silikonfuge Dusche undicht');
await page.click('[data-testid="maengel-erfassen"]');
await page.waitForSelector('[data-testid="maengel-liste"]');
await shot('11-maengel-panel', 500);

// ── 12 NEU: Baugesuch — Blattsatz + Set + Ausnützungsnachweis ──────────
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
await shot('12-baugesuch', 700);

// ── 13 NEU: Blatt-füllen — mehrere Slots automatisch belegt ─────────────
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
await shot('13-blatt-fuellen', 700);

// ── 14 NEU: Vis-Automatik — Auto-Kamera + Cycles-Preset + Fake-Render ───
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
await shot('14-vis-automatik', 800);

// ── 15 NEU: Material-Würfel — Referenzkatalog-Detail mit Quelle ─────────
// Muster `material-programm.spec.ts`.
await frisch(false);
await page.click('[data-testid="module-asset"]');
await page.click('[data-testid="asset-tab-materialien"]');
await page.click('[data-testid="material-backstein"]');
await page.waitForSelector('[data-testid="material-detail"] canvas');
await page.locator('[data-testid="material-detail"]').scrollIntoViewIfNeeded();
await shot('15-material-wuerfel', 600);

// ── 16 KosmoData (Referenzen/Bauteile) — unverändert diese Runde ───────
await frisch(true);
await page.evaluate(() => (window as unknown as { __kosmo: Kosmo }).__kosmo.open('data'));
await page.waitForSelector('[data-testid="ref-card"]');
await shot('16-data-referenzen', 800);
await page.click('[data-testid="tab-bauteile"]');
await shot('16-data-bauteile', 500);

// ── 17 KosmoDev: Auftragsbuch — unverändert diese Runde ────────────────
await page.evaluate(() => (window as unknown as { __kosmo: Kosmo }).__kosmo.open('dev'));
await page.fill('[data-testid="auftrag-text"]', 'Türanschläge im Grundriss wählbar machen — Werkzeugleiste KosmoDesign');
await page.click('[data-testid="auftrag-erfassen"]');
await page.waitForSelector('[data-testid="auftrag-karte"]');
await shot('17-dev-auftragsbuch', 500);

// ── 18 Prepare / Doc / Train — unverändert diese Runde ─────────────────
await page.evaluate(() => (window as unknown as { __kosmo: Kosmo }).__kosmo.open('prepare'));
await shot('18-prepare', 800);
await page.evaluate(() => (window as unknown as { __kosmo: Kosmo }).__kosmo.open('doc'));
await shot('18-doc', 800);
await page.evaluate(() => (window as unknown as { __kosmo: Kosmo }).__kosmo.open('train'));
await shot('18-train', 800);

// ── 19 KosmoDraw + KosmoSketch — unverändert diese Runde ───────────────
await page.evaluate(() => (window as unknown as { __kosmo: Kosmo }).__kosmo.open('home'));
await page.click('[data-testid="module-draw"]');
await shot('19-draw', 1000);
await page.evaluate(() => (window as unknown as { __kosmo: Kosmo }).__kosmo.open('home'));
await page.click('[data-testid="module-sketch"]');
await shot('19-sketch', 1000);

// ── 20 Umbau-Werkplan (Bestand/Abbruch/Neu) — unverändert diese Runde ──
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
await shot('20-umbau-werkplan', 800);

// ── 21 Volumenstudien — unverändert diese Runde ────────────────────────
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
await shot('21-studien-panel', 1200);

// ── 22 Grundlagenstudie-Bericht (SVG) — unverändert diese Runde ────────
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.click('[data-testid="studie-bericht"]'),
]);
const svgPfad = await download.path();
writeFileSync(`${OUT}22-bericht.svg`, readFileSync(svgPfad!, 'utf8'));
console.log('✓ 22-bericht (SVG-Download)');

// ── 23 Unternehmerplan-Import — unverändert diese Runde ────────────────
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
await shot('23-unternehmerplan-pdf', 800);

// ── 24 Deinstallieren-Dialog — unverändert diese Runde ─────────────────
await page.click('[data-testid="menu-deinstallieren"]');
await page.waitForSelector('[role="dialog"]');
await shot('24-deinstallieren', 500);

await browser.close();
console.log('Alle Rundgang-Bilder liegen unter docs/rundgang/bilder/');
