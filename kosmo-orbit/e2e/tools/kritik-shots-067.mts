/**
 * v0.6.7 Kritik-Runde 1 — Screenshot-Sammlung der neuen Welle-1-Flächen:
 * Vis-Editor (Mehrfachauswahl/Ausrichten, Ortho-Routing, Node-Kollaps,
 * Palette-Tonstreifen, Kuratier-Leersignet) + Satteldach im 3D-Viewport.
 * Bilder → docs/rundgang/kritik-067/. Muster: kritik-shots-066.mts.
 * Voraussetzungen: Preview (RUNDGANG_URL, Default :4180) — Bridge NICHT nötig.
 * Nutzung: npx tsx e2e/tools/kritik-shots-067.mts  (cwd kosmo-orbit/)
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const OUT = new URL('../../docs/rundgang/kritik-067/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const URL_ = process.env.RUNDGANG_URL ?? 'http://localhost:4180';

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.setDefaultTimeout(30000);

const shot = async (name: string, pause = 700) => {
  await page.waitForTimeout(pause);
  await page.screenshot({ path: `${OUT}${name}.png` });
  console.log(`✓ ${name}`);
};

async function frisch(thema: 'paper' | 'ink', tkb = true) {
  await page.goto(URL_);
  await page.evaluate((t) => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.thema', t);
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
    localStorage.removeItem('kosmo.panelOffen');
    localStorage.removeItem('kosmo.projekt.aktiv');
    localStorage.removeItem('kosmo.ui.v1');
    indexedDB.deleteDatabase('kosmo-projekte');
  }, thema);
  await page.reload();
  await page.waitForSelector('[data-testid="module-design"]');
  if (tkb) {
    await page.click('[data-testid="load-tkb"]');
    await page.waitForTimeout(2200);
  }
}

declare global {
  interface Window {
    __kosmo: { run: (id: string, p: unknown) => unknown; open: (s: string) => void; state: () => { activeStoreyId: string } };
  }
}

for (const thema of ['paper', 'ink'] as const) {
  await frisch(thema);

  // ── KosmoVis: Drei-Stimmungen-Graph als Spielfeld ─────────────────────
  await page.evaluate(() => window.__kosmo.open('vis'));
  await page.click('[data-testid="drei-stimmungen"]');
  await page.waitForSelector('[data-testid="vis-node-render"]');

  // 1) Ortho-Routing an
  await page.click('[data-testid="vis-routing-toggle"]');
  await shot(`${thema}-1-ortho-routing`);

  // 2) Mehrfachauswahl + Ausrichten-Leiste. Fürs FOTO per Shift-Klicks statt
  // Marquee: der Marquee-Drag triggert unter SwiftShader das bekannte
  // foreignObject-Geisterbild (0.6.6-Lehre; DOM/State verifiziert sauber,
  // auf echter Hardware unsichtbar). Funktional deckt vis-editor.spec den
  // Marquee ab — hier zählt die sichtbare Auswahl + Leiste.
  const koepfe = page.locator('[data-testid="vis-node-stimmung"]');
  await koepfe.nth(0).click({ position: { x: 40, y: 8 } });
  await page.keyboard.down('Shift');
  await koepfe.nth(1).click({ position: { x: 40, y: 8 } });
  await koepfe.nth(2).click({ position: { x: 40, y: 8 } });
  await page.keyboard.up('Shift');
  await shot(`${thema}-2-auswahl-leiste`);
  await page.keyboard.press('Escape');

  // 3) Node-Kollaps (erster Prompt-Node)
  await page.locator('[data-testid="node-kollaps"]').first().click();
  await shot(`${thema}-3-kollaps`);

  // 4) Palette mit Kategorie-Tonstreifen
  await page.click('[data-testid="vis-routing-toggle"]'); // zurück auf Kurve
  await page.click('[data-testid="vis-palette-toggle"]');
  await page.waitForSelector('[data-testid="vis-palette"]');
  await shot(`${thema}-4-palette-tonstreifen`);
  await page.click('[data-testid="vis-palette-toggle"]');

  // 5) Kuratier-Leerzustand mit Tusche-Signet (kein fertiges Bild vorhanden)
  await page.click('[data-testid="vis-kuratier-toggle"]');
  await page.waitForSelector('[data-testid="vis-kuratier-flaeche"]');
  await shot(`${thema}-5-kuratier-leer`);
  await page.click('[data-testid="vis-kuratier-toggle"]');

  // ── Satteldach im 3D-Viewport (frisches Mini-Projekt, __kosmo.run) ────
  await frisch(thema, false);
  await page.click('[data-testid="module-design"]');
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    const k = window.__kosmo as unknown as { run: (id: string, p: unknown) => { patches: { id: string }[] } };
    const eg = k.run('design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = eg.patches[0]!.id;
    const aufbau = k.run('design.aufbauErstellen', {
      name: 'AW Beton 36',
      target: 'wall',
      layers: [{ material: 'beton', thickness: 360, function: 'tragend' }],
    });
    const assemblyId = aufbau.patches[0]!.id;
    const O = [
      { x: 0, y: 0 },
      { x: 9000, y: 0 },
      { x: 9000, y: 7000 },
      { x: 0, y: 7000 },
    ];
    for (let i = 0; i < 4; i++) k.run('design.wandZeichnen', { storeyId, assemblyId, a: O[i], b: O[(i + 1) % 4] });
    k.run('design.dachErstellen', { storeyId, outline: O, pitch: 40, overhang: 400, form: 'sattel', firstrichtung: 'x' });
  });
  await shot(`${thema}-6-satteldach-3d`, 1600);
}

await browser.close();
console.log(`Fertig — Bilder in ${OUT}`);
