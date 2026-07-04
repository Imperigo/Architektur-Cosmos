/**
 * Handbuch «KosmoOrbit V1» (V1-Finish P6) — Teil 1: Full-HD-Screenshots.
 * Fährt alle Stationen und Schlüssel-Workflows deterministisch ab
 * (TKB-Demo + __kosmo-Testhook) und legt 1920×1080-Bilder unter
 * docs/handbuch/bilder/ ab. Teil 2 (handbuch-pdf.mts) baut daraus das PDF.
 * Voraussetzungen: Preview :5183, Fake-Bridge :8600, Sync-Server :8700.
 */
import { chromium, type Page } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const OUT = new URL('../../docs/handbuch/bilder/', import.meta.url).pathname;
const URL_ = process.env.HANDBUCH_URL ?? 'http://localhost:5183';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.setDefaultTimeout(30000);

const kosmo = (fn: string) => page.evaluate(fn);
const shot = async (name: string, pause = 600) => {
  await page.waitForTimeout(pause);
  await page.screenshot({ path: `${OUT}${name}.png` });
  console.log(`✓ ${name}`);
};

async function frisch(tkb = true) {
  await page.goto(URL_);
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
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

// ── 01/02 Zentrale (paper + ink) ─────────────────────────────────────
await frisch();
await page.evaluate(() => (window as never as { __kosmo: { open: (s: string) => void } }).__kosmo.open('home'));
await shot('01-zentrale');
await page.evaluate(() => {
  document.documentElement.dataset.theme = 'ink';
});
await shot('02-zentrale-ink', 400);
await page.evaluate(() => {
  document.documentElement.dataset.theme = 'paper';
});

// ── 03 Kurzbefehle-Overlay ───────────────────────────────────────────
await page.keyboard.press('?');
await shot('03-kurzbefehle', 400);
await page.keyboard.press('Escape');

// ── 04–07 KosmoDesign: 3D, Werkplan, Split, 4er ─────────────────────
await page.click('[data-testid="module-design"]');
await page.waitForTimeout(1500);
await shot('04-design-3d', 1000);
await page.click('[data-testid="view-2d"]');
await shot('05-design-werkplan', 800);
await page.click('[data-testid="view-split"]');
await shot('06-design-split', 1200);
await page.click('[data-testid="view-quad"]');
await shot('07-design-4er', 1200);

// ── 08 Stützenraster-Assistent ───────────────────────────────────────
await page.click('[data-testid="view-2d"]');
await page.click('text=Raster');
await shot('08-raster-assistent', 600);
await page.click('[data-testid="raster-panel"] [aria-label="Schliessen"]');

// ── 09 Sonnenstudie ─────────────────────────────────────────────────
await page.click('[data-testid="view-3d"]');
await page.click('[data-testid="sonne-toggle"]');
await shot('09-sonnenstudie', 1200);
await page.click('[data-testid="sonne-toggle"]');

// ── 10 Kosmo-Vorschlagskarte (Mock-Provider, gated Proposal) ────────
await page.fill('[data-testid="kosmo-input"]', 'Zeichne eine Wand von 0,0 nach 8,0');
await page.click('[data-testid="kosmo-send"]');
await page.waitForSelector('[data-testid="proposal-card"]');
await shot('10-kosmo-vorschlag', 500);

// ── 11/12 KosmoVis: Node-Tree mit echtem Fake-Render + Einfach ──────
await page.evaluate(() => (window as never as { __kosmo: { open: (s: string) => void } }).__kosmo.open('vis'));
await page.click('[data-testid="drei-stimmungen"]');
await page.waitForSelector('[data-testid="vis-node-render"]');
await page.locator('[data-testid="render-ausfuehren"]').first().click();
await page.waitForSelector('[data-testid="render-bild"]', { timeout: 30000 });
await shot('11-vis-nodetree', 800);
await page.click('[data-testid="tab-einfach"]');
await shot('12-vis-einfach', 800);

// ── 13/14 KosmoPublish: Blatt + Publikations-Sets ───────────────────
await page.evaluate(() => (window as never as { __kosmo: { open: (s: string) => void } }).__kosmo.open('publish'));
await page.click('[data-testid="add-sheet"]');
await page.click('[data-testid="place-plan"]');
await shot('13-publish-blatt', 800);
await page.fill('[data-testid="pubset-name"]', 'Wettbewerb');
await page.click('text=Set speichern');
await shot('14-publish-sets', 500);

// ── 15/16 KosmoData ─────────────────────────────────────────────────
await page.evaluate(() => (window as never as { __kosmo: { open: (s: string) => void } }).__kosmo.open('data'));
await page.waitForSelector('[data-testid="ref-card"]');
await shot('15-data-referenzen', 800);
await page.click('[data-testid="tab-bauteile"]');
await shot('16-data-bauteile', 500);

// ── 17 KosmoAsset ───────────────────────────────────────────────────
await page.evaluate(() => (window as never as { __kosmo: { open: (s: string) => void } }).__kosmo.open('asset'));
await page.click('[data-testid="asset-tab-materialien"]');
await shot('17-asset-materialien', 600);

// ── 18 KosmoDev: Auftragsbuch mit Einträgen ─────────────────────────
await page.evaluate(() => (window as never as { __kosmo: { open: (s: string) => void } }).__kosmo.open('dev'));
await page.fill('[data-testid="auftrag-text"]', 'Türanschläge im Grundriss wählbar machen — Werkzeugleiste KosmoDesign');
await page.click('[data-testid="auftrag-erfassen"]');
await page.fill('[data-testid="auftrag-text"]', 'Blattliste im Plansatz per Drag sortieren');
await page.click('[data-testid="auftrag-erfassen"]');
await page.waitForSelector('[data-testid="auftrag-karte"]');
await shot('18-dev-auftragsbuch', 500);

// ── 19–21 Prepare / Doc / Train ─────────────────────────────────────
await page.evaluate(() => (window as never as { __kosmo: { open: (s: string) => void } }).__kosmo.open('prepare'));
await shot('19-prepare', 800);
await page.evaluate(() => (window as never as { __kosmo: { open: (s: string) => void } }).__kosmo.open('doc'));
await shot('20-doc', 800);
await page.evaluate(() => (window as never as { __kosmo: { open: (s: string) => void } }).__kosmo.open('train'));
await shot('21-train', 800);

// ── 22 iPad koppeln (QR) ────────────────────────────────────────────
await page.evaluate(() => (window as never as { __kosmo: { open: (s: string) => void } }).__kosmo.open('home'));
await page.click('[data-testid="sync-toggle"]');
await page.click('[data-testid="ipad-koppeln"]');
await page.waitForSelector('[data-testid="koppeln-karte"] svg');
await shot('22-ipad-koppeln', 500);
await page.click('[data-testid="sync-toggle"]');

// ── 23 KosmoDraw (Modellbaum · Mengen · Ausmass) ────────────────────
await page.click('[data-testid="module-draw"]');
await shot('23-draw', 1000);

// ── 24 KosmoSketch ──────────────────────────────────────────────────
await page.evaluate(() => (window as never as { __kosmo: { open: (s: string) => void } }).__kosmo.open('home'));
await page.click('[data-testid="module-sketch"]');
await shot('24-sketch', 1000);

// ── 25 Umbau-Werkplan (Bestand/Abbruch/Neu aus EINEM Modell) ────────
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
await shot('25-umbau-werkplan', 800);

await browser.close();
console.log('Alle Handbuch-Bilder liegen unter docs/handbuch/bilder/');
