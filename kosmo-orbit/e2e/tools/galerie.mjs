// Feierabend-Galerie: alle Module + Zentrale (Papier & Tinte) fotografieren.
// Läuft gegen den Preview-Server (dist) auf :5183.
import { chromium } from '@playwright/test';

const OUT = process.env.GALERIE_OUT ?? 'e2e-results';
const URL = process.env.GALERIE_URL ?? 'http://localhost:5183';

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));

const res = await page.goto(URL);
console.log(res.status());

// Onboarding weg + TKB laden
await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
await page.reload();
await page.click('[data-testid="load-tkb"]');
await page.waitForSelector('text=KENNZAHLEN');

// Testhaus dazu: T-Stoss, Fenster+Tür, Walmdach, HNF-Zone (x 30000–39000)
await page.evaluate(() => {
  const k = window.__kosmo;
  const st = k.state();
  const eg = st.activeStoreyId;
  const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW')).id;
  const wand = (a, b) => k.run('design.wandZeichnen', { storeyId: eg, a, b, assemblyId: aw }).patches[0].id;
  const w1 = wand({ x: 30000, y: -14000 }, { x: 39000, y: -14000 });
  wand({ x: 39000, y: -14000 }, { x: 39000, y: -8000 });
  wand({ x: 39000, y: -8000 }, { x: 30000, y: -8000 });
  wand({ x: 30000, y: -8000 }, { x: 30000, y: -14000 });
  wand({ x: 34500, y: -14000 }, { x: 34500, y: -8000 }); // T-Stoss oben+unten
  k.run('design.oeffnungSetzen', { wallId: w1, openingType: 'fenster', center: 2200, width: 1600, height: 1400, sill: 900 });
  k.run('design.oeffnungSetzen', { wallId: w1, openingType: 'tuer', center: 6800, width: 1000, height: 2200, sill: 0 });
  k.run('design.dachErstellen', {
    storeyId: eg,
    outline: [
      { x: 30000, y: -14000 }, { x: 39000, y: -14000 },
      { x: 39000, y: -8000 }, { x: 30000, y: -8000 },
    ],
    pitch: 38, overhang: 500,
  });
  k.run('design.zoneErstellen', {
    storeyId: eg, name: 'Wohnen', sia: 'HNF',
    outline: [
      { x: 30200, y: -13800 }, { x: 38800, y: -13800 },
      { x: 38800, y: -8200 }, { x: 30200, y: -8200 },
    ],
  });
});

const shot = async (name) => {
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/gal-${name}.png` });
  console.log('shot', name);
};
const render3d = async () => {
  await page.waitForTimeout(600);
  await page.evaluate(() => window.__kosmoViewport?.renderOnce());
  await page.waitForTimeout(250);
};

// 1+2) Design: 4er + Grundriss
await page.evaluate(() => window.__kosmo.open('design'));
await page.click('text=4er');
await render3d();
await shot('design-quad');
await page.click('text=Grundriss');
await shot('design-plan');

// 3) Publish: Blatt + Grundriss + Ansicht Süd
await page.evaluate(() => window.__kosmo.open('publish'));
await page.click('[data-testid="add-sheet"]');
await page.click('[data-testid="place-plan"]');
await page.click('button:text-is("S")');
await shot('publish');

// 4+5) Data: Referenzen + Bauteilkatalog
await page.evaluate(() => window.__kosmo.open('data'));
await page.waitForSelector('[data-testid="ref-card"]');
await shot('data');
await page.click('[data-testid="tab-bauteile"]');
await shot('data-bauteile');

// 6) Vis
await page.evaluate(() => window.__kosmo.open('vis'));
await shot('vis');

// 7) Prepare
await page.evaluate(() => window.__kosmo.open('prepare'));
await shot('prepare');

// 8) Zentrale (Papier)
await page.evaluate(() => window.__kosmo.open('home'));
await shot('home-papier');

// 9) Zentrale (Tinte)
await page.click('header >> text=Tinte');
await shot('home-tinte');

// 10) Design in Tinte (4er)
await page.evaluate(() => window.__kosmo.open('design'));
await render3d();
await shot('design-tinte');

console.log('done');
await browser.close();
