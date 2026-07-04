// Screenshot-Galerie «Vision 100 %» (Batch F2): Umbau-Plan, Terrain-Schnitt,
// NPK-Ausmass, Varianten-Archiv, L-Wohnung. Läuft gegen den Preview-Server.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = process.env.GALERIE_OUT ?? 'e2e-results/galerie-vision';
const URL = process.env.GALERIE_URL ?? 'http://localhost:4173';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.setDefaultTimeout(20000);

async function frisch() {
  await page.goto(URL);
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.removeItem('kosmo.projekt.aktiv');
    indexedDB.deleteDatabase('kosmo-projekte');
  });
  await page.reload();
  await page.waitForSelector('[data-testid="module-design"]');
}

// 1) Zentrale: alle Stationen-Kacheln + Rollen-Select
await frisch();
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/01-zentrale-stationen.png` });

// 2) Umbau-Plan (A1): Bestand/Neu/Abbruch im Werkplan
await frisch();
await page.click('[data-testid="module-design"]');
await page.click('[data-testid="view-2d"]');
await page.evaluate(() => {
  const k = window.__kosmo;
  const st = k.state();
  const aufbau = k.run('design.aufbauErstellen', {
    name: 'AW Umbau', target: 'wall',
    layers: [
      { material: 'putz', thickness: 20, function: 'bekleidung' },
      { material: 'daemmung-mw', thickness: 160, function: 'daemmung' },
      { material: 'beton', thickness: 180, function: 'tragend' },
    ],
  });
  const aid = aufbau.patches[0].id;
  const W = (a, b) => k.run('design.wandZeichnen', { storeyId: st.activeStoreyId, assemblyId: aid, a, b }).patches[0].id;
  const bestand = W({ x: 0, y: 0 }, { x: 9000, y: 0 });
  const abbruch = W({ x: 0, y: 0 }, { x: 0, y: 6000 });
  const neu = W({ x: 0, y: 6000 }, { x: 9000, y: 6000 });
  const bestand2 = W({ x: 9000, y: 0 }, { x: 9000, y: 6000 });
  k.run('design.oeffnungSetzen', { wallId: bestand, openingType: 'fenster', center: 3000, width: 1600, height: 1400, sill: 900 });
  k.run('design.oeffnungSetzen', { wallId: abbruch, openingType: 'tuer', center: 3000, width: 900, height: 2200, sill: 0 });
  k.run('design.oeffnungSetzen', { wallId: neu, openingType: 'fenster', center: 5500, width: 2400, height: 1600, sill: 700 });
  k.run('design.renovationSetzen', { ids: [abbruch], status: 'abbruch' });
  k.run('design.renovationSetzen', { ids: [neu], status: 'neu' });
  k.run('design.renovationSetzen', { ids: [bestand, bestand2], status: 'bestand' });
  k.run('design.aussparungSetzen', { hostId: bestand2, center: 3000, breite: 300, hoehe: 300, sill: 1200 });
});
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/02-umbau-plan-werkplan.png` });

// 3) Terrain im Schnitt (A2) + Koten (B2): Quad-Ansicht
await frisch();
await page.click('[data-testid="module-design"]');
await page.evaluate(() => {
  const k = window.__kosmo;
  const st = k.state();
  const aufbau = k.run('design.aufbauErstellen', {
    name: 'AW Beton', target: 'wall',
    layers: [{ material: 'beton', thickness: 250, function: 'tragend' }],
  });
  const aid = aufbau.patches[0].id;
  const W = (a, b) => k.run('design.wandZeichnen', { storeyId: st.activeStoreyId, assemblyId: aid, a, b });
  W({ x: 0, y: 0 }, { x: 9000, y: 0 });
  W({ x: 0, y: 4000 }, { x: 9000, y: 4000 });
  k.run('design.deckeZeichnen', {
    storeyId: st.activeStoreyId, thickness: 250,
    outline: [{ x: 0, y: 0 }, { x: 9000, y: 0 }, { x: 9000, y: 4000 }, { x: 0, y: 4000 }],
  });
  // Diagonal übers Grundstück, damit Schnitt (quer) UND Ansicht (längs) das Profil zeigen
  k.run('design.terrainSetzen', {
    typ: 'gewachsen',
    punkte: [{ x: -2500, y: -2500, z: 900 }, { x: 2000, y: 500, z: 200 }, { x: 6500, y: 3500, z: -350 }, { x: 11500, y: 6500, z: -150 }],
  });
  k.run('design.terrainSetzen', {
    typ: 'neu',
    punkte: [{ x: -2500, y: -2500, z: 300 }, { x: 11500, y: 6500, z: 0 }],
  });
  k.run('design.standortSetzen', { label: 'Zug', lat: 47.17, lon: 8.52, e: 2681500, n: 1224500, hoeheM: 425 });
});
// Schnittlinie senkrecht durchs Modell ziehen (wechselt automatisch auf 4er)
await page.click('[data-testid="view-2d"]');
await page.click('[data-testid="tool-schnitt"]');
await page.mouse.click(620, 250);
await page.mouse.click(620, 850);
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/03-terrain-schnitt.png` });

// 4) NPK-Ausmass (C1): TKB-Demo, Draw-Panel, Tab Ausmass
await frisch();
await page.click('[data-testid="load-tkb"]');
await page.click('[data-testid="draw-toggle"]');
await page.click('[data-testid="draw-tab-ausmass"]');
await page.waitForSelector('[data-testid="ausmass-tabelle"]');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/04-npk-ausmass.png` });

// 5) Varianten-Archiv (A5): 2 Stände archivieren → Zentrale vergleicht
await frisch();
await page.click('[data-testid="load-tkb"]');
await page.click('[data-testid="liste-toggle"]');
await page.click('[data-testid="variante-archivieren"]');
await page.waitForTimeout(700);
await page.click('[data-testid="variante-archivieren"]');
await page.waitForTimeout(700);
await page.click('header button[aria-label="Zur Zentrale"]');
await page.waitForSelector('[data-testid="variante-karte"]');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/05-varianten-archiv.png` });

// 6) L-Wohnung aus dem Generator (C4)
await frisch();
await page.click('[data-testid="module-design"]');
await page.click('[data-testid="view-2d"]');
await page.evaluate(() => {
  const k = window.__kosmo;
  const st = k.state();
  const w = k.run('design.zoneErstellen', {
    storeyId: st.activeStoreyId, name: 'Whg L', sia: 'HNF', program: 'marktgerecht',
    outline: [
      { x: 0, y: 0 }, { x: 12000, y: 0 }, { x: 12000, y: 6000 },
      { x: 7000, y: 6000 }, { x: 7000, y: 10000 }, { x: 0, y: 10000 },
    ],
  });
  k.run('design.grundrissGenerieren', { zoneId: w.patches[0].id, korridorSeite: 'unten' });
});
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/06-l-wohnung-generator.png` });

await browser.close();
console.log('Galerie fertig:', OUT);
