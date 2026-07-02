// KosmoPublish visuell: Testhaus bauen → Blatt A1 → Grundriss + Schnitt platzieren → PDF-Knopf
import { chromium } from 'playwright';

const out = '/tmp/claude-0/-home-user-Architektur-Cosmos/29f91fcd-4e18-518e-8c69-206843920053/scratchpad/';

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('ERROR:', m.text()); });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await page.goto('http://localhost:5183/');
await page.waitForSelector('[data-testid="module-design"]');

// Testhaus über den Command-Hook (deterministisch)
await page.evaluate(() => {
  const k = window.__kosmo;
  k.open('design'); // bootstrapt EG/OG + Aufbauten
});
await page.waitForTimeout(400);
await page.evaluate(() => {
  const k = window.__kosmo;
  const st = k.state();
  const storeyId = st.activeStoreyId;
  const aw = st.doc.byKind('assembly').find((a) => a.name.startsWith('AW'));
  const W = (a, b) => k.run('design.wandZeichnen', { storeyId, a, b, assemblyId: aw.id }).patches[0].id;
  const w1 = W({ x: 0, y: 0 }, { x: 9000, y: 0 });
  W({ x: 9000, y: 0 }, { x: 9000, y: 6500 });
  W({ x: 9000, y: 6500 }, { x: 0, y: 6500 });
  W({ x: 0, y: 6500 }, { x: 0, y: 0 });
  k.run('design.oeffnungSetzen', { wallId: w1, openingType: 'fenster', center: 3000, width: 2000, height: 1500, sill: 900 });
  k.run('design.oeffnungSetzen', { wallId: w1, openingType: 'tuer', center: 7000, width: 1000, height: 2200, sill: 0, swing: 'links' });
  k.run('design.deckeZeichnen', { storeyId, outline: [{x:0,y:0},{x:9000,y:0},{x:9000,y:6500},{x:0,y:6500}], thickness: 250 });
});

// KosmoPublish öffnen
await page.evaluate(() => window.__kosmo.open('publish'));
await page.waitForTimeout(400);
await page.click('[data-testid="add-sheet"]');
await page.waitForTimeout(300);
await page.click('[data-testid="place-plan"]');
await page.waitForTimeout(500);
await page.click('[data-testid="place-section"]');
await page.waitForTimeout(700);

// Grundriss etwas nach links, Schnitt nach rechts unten schieben (Drag via Commands wäre der Weg;
// hier direkt die Positionen prüfen wir per Command)
await page.evaluate(() => {
  const k = window.__kosmo;
  const sheet = k.state().doc.byKind('sheet')[0];
  const [plan, schnitt] = sheet.placements;
  k.run('publish.ansichtVerschieben', { sheetId: sheet.id, placementId: plan.id, x: 240, y: 260 });
  if (schnitt) k.run('publish.ansichtVerschieben', { sheetId: sheet.id, placementId: schnitt.id, x: 610, y: 250 });
});
await page.waitForTimeout(500);
await page.screenshot({ path: out + 'publish-blatt.png' });

// Plansatz-PDF erzeugen (Download abfangen)
const [download] = await Promise.all([
  page.waitForEvent('download', { timeout: 30000 }),
  page.click('[data-testid="export-set"]'),
]);
await download.saveAs(out + 'plansatz.pdf');
console.log('PDF:', download.suggestedFilename());

// DXF ebenfalls
const [dl2] = await Promise.all([
  page.waitForEvent('download', { timeout: 30000 }),
  page.click('[data-testid="export-dxf"]'),
]);
await dl2.saveAs(out + 'grundriss.dxf');
console.log('DXF:', dl2.suggestedFilename());
console.log('done');
await browser.close();
