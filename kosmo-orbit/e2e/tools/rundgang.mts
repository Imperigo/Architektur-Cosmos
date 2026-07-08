/**
 * Rundgang-Screenshots «0.6.1» (Owner-Auftrag 08.07.) — Teil 1.
 * Wie `handbuch.mts` (V1-Finish P6), aber für das Kommentier-PDF
 * `rundgang-pdf.mts`: fährt alle Stationen deterministisch ab und macht
 * zusätzlich die Nacht-Features sichtbar (Volumenstudien mit Zonenregel +
 * Matrix + Bericht, Unternehmerplan-PDF-Hinweis, KosmoData-Adaption).
 * Bilder → docs/rundgang/bilder/. Voraussetzungen wie beim Handbuch:
 * Preview :5183, Fake-Bridge :8600, Sync-Server :8700.
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

async function frisch(tkb = true) {
  await page.goto(URL_);
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1'); // Guide-Karte nicht über den Screenshots
    localStorage.setItem('kosmo.thema', 'paper');
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
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

// ── 01 Zentrale ──────────────────────────────────────────────────────
await frisch();
await page.evaluate(() => (window as never as { __kosmo: { open: (s: string) => void } }).__kosmo.open('home'));
await shot('01-zentrale');

// ── 02–04 KosmoDesign: 3D, Werkplan, 4er ────────────────────────────
await page.click('[data-testid="module-design"]');
await page.waitForTimeout(1500);
await shot('02-design-3d', 1000);
await page.click('[data-testid="view-2d"]');
await shot('03-design-werkplan', 800);
await page.click('[data-testid="view-quad"]');
await shot('04-design-4er', 1200);

// ── 05 Sonnenstudie ─────────────────────────────────────────────────
await page.click('[data-testid="view-3d"]');
await page.click('[data-testid="sonne-toggle"]');
await shot('05-sonnenstudie', 1200);
await page.click('[data-testid="sonne-toggle"]');

// ── 06 Kosmo-Vorschlagskarte (Mock-Provider, gated Proposal) ────────
await page.fill('[data-testid="kosmo-input"]', 'Zeichne eine Wand von 0,0 nach 8,0');
await page.click('[data-testid="kosmo-send"]');
await page.waitForSelector('[data-testid="proposal-card"]');
await shot('06-kosmo-vorschlag', 500);

// ── 07 KosmoVis: Node-Tree mit echtem Fake-Render ───────────────────
await page.evaluate(() => (window as never as { __kosmo: { open: (s: string) => void } }).__kosmo.open('vis'));
await page.click('[data-testid="drei-stimmungen"]');
await page.waitForSelector('[data-testid="vis-node-render"]');
await page.locator('[data-testid="render-ausfuehren"]').first().click();
await page.waitForSelector('[data-testid="render-bild"]', { timeout: 30000 });
await shot('07-vis-nodetree', 800);

// ── 08 KosmoPublish: Blatt ──────────────────────────────────────────
await page.evaluate(() => (window as never as { __kosmo: { open: (s: string) => void } }).__kosmo.open('publish'));
await page.click('[data-testid="add-sheet"]');
await page.click('[data-testid="place-plan"]');
await shot('08-publish-blatt', 800);

// ── 09/10 KosmoData (NEU: Leisten-Gruppen + Adaptions-Schalter) ─────
await page.evaluate(() => (window as never as { __kosmo: { open: (s: string) => void } }).__kosmo.open('data'));
await page.waitForSelector('[data-testid="ref-card"]');
await shot('09-data-referenzen', 800);
await page.click('[data-testid="tab-bauteile"]');
await shot('10-data-bauteile', 500);

// ── 11 KosmoAsset ───────────────────────────────────────────────────
await page.evaluate(() => (window as never as { __kosmo: { open: (s: string) => void } }).__kosmo.open('asset'));
await page.click('[data-testid="asset-tab-materialien"]');
await shot('11-asset-materialien', 600);

// ── 12 KosmoDev: Auftragsbuch ───────────────────────────────────────
await page.evaluate(() => (window as never as { __kosmo: { open: (s: string) => void } }).__kosmo.open('dev'));
await page.fill('[data-testid="auftrag-text"]', 'Türanschläge im Grundriss wählbar machen — Werkzeugleiste KosmoDesign');
await page.click('[data-testid="auftrag-erfassen"]');
await page.waitForSelector('[data-testid="auftrag-karte"]');
await shot('12-dev-auftragsbuch', 500);

// ── 13–15 Prepare / Doc / Train ─────────────────────────────────────
await page.evaluate(() => (window as never as { __kosmo: { open: (s: string) => void } }).__kosmo.open('prepare'));
await shot('13-prepare', 800);
await page.evaluate(() => (window as never as { __kosmo: { open: (s: string) => void } }).__kosmo.open('doc'));
await shot('14-doc', 800);
await page.evaluate(() => (window as never as { __kosmo: { open: (s: string) => void } }).__kosmo.open('train'));
await shot('15-train', 800);

// ── 16/17 KosmoDraw + KosmoSketch ───────────────────────────────────
await page.evaluate(() => (window as never as { __kosmo: { open: (s: string) => void } }).__kosmo.open('home'));
await page.click('[data-testid="module-draw"]');
await shot('16-draw', 1000);
await page.evaluate(() => (window as never as { __kosmo: { open: (s: string) => void } }).__kosmo.open('home'));
await page.click('[data-testid="module-sketch"]');
await shot('17-sketch', 1000);

// ── 18 Umbau-Werkplan (Bestand/Abbruch/Neu) ─────────────────────────
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
await shot('18-umbau-werkplan', 800);

// ── 19 NEU: Volumenstudien — Zonenregel speist die Studie, Matrix, ───
//    Bericht. Dieselben Command-Aufrufe wie `sim-wettbewerb.spec.ts`.
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
await shot('19-studien-panel', 1200);

// ── 20 NEU: Grundlagenstudie-Bericht (das SVG selbst) ───────────────
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.click('[data-testid="studie-bericht"]'),
]);
const svgPfad = await download.path();
writeFileSync(`${OUT}20-bericht.svg`, readFileSync(svgPfad!, 'utf8'));
console.log('✓ 20-bericht (SVG-Download)');

// ── 21 NEU: Unternehmerplan-Import — ehrlicher PDF-Hinweis ──────────
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
await shot('21-unternehmerplan-pdf', 800);

await browser.close();
console.log('Alle Rundgang-Bilder liegen unter docs/rundgang/bilder/');
