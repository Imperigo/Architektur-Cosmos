import { chromium } from '@playwright/test';

/**
 * v0.8.0 P11 — Beleg-Screenshots (Owner-Pflichtauftrag 15.07.):
 *  - bodendock-publish-nachher.png: Publish mit einem Blatt, der Boden-Dock
 *    (Pille) liegt NICHT über dem `sheet-canvas` (Bottom-Reserve-Padding).
 *  - publish-dock.png: Publish mit Dossier + Plankopf als Dock-Panels
 *    (linke/rechte Spalte).
 */

const BASE = 'http://127.0.0.1:5183';
const OUT = 'test-results';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

await page.addInitScript(() => {
  localStorage.setItem('kosmo.onboarded', '1');
  localStorage.setItem('kosmo.starterGuide.done', '1');
  localStorage.removeItem('kosmo.dock.v1');
  localStorage.removeItem('kosmo.dock.presetInit.v1');
});
await page.goto(BASE);
await page.click('[data-testid="load-tkb"]');
await page.evaluate(() => (window as unknown as { __kosmo: { open: (s: string) => void } }).__kosmo.open('publish'));
await page.waitForSelector('[data-testid="publish-werkzeugleiste"]');
// Ein Blatt anlegen, damit der sheet-canvas erscheint.
await page.click('[data-testid="add-sheet"]');
await page.waitForSelector('[data-testid="sheet-canvas"]');
await page.waitForTimeout(1200);

// Shot 1: Blatt sichtbar, Pille darf NICHTS verdecken.
await page.screenshot({ path: `${OUT}/bodendock-publish-nachher.png` });

// Dossier + Plankopf als Dock-Panels öffnen.
await page.click('[data-testid="publish-dossier"]');
await page.click('[data-testid="publish-plankopf"]');
await page.waitForSelector('[data-testid="dock-panel-dossier"]');
await page.waitForSelector('[data-testid="dock-panel-plankopf"]');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/publish-dock.png` });

// Geometrie-Beleg in die Konsole (Pille vs. Blatt disjunkt).
const canvas = await page.locator('[data-testid="sheet-canvas"]').boundingBox();
const dock = await page.locator('[data-testid="boden-dock"]').boundingBox();
const dossier = await page.locator('[data-testid="dock-panel-dossier"]').boundingBox();
const plankopf = await page.locator('[data-testid="dock-panel-plankopf"]').boundingBox();
const ol = (a: typeof canvas, b: typeof canvas) =>
  !!a && !!b && a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
console.log('sheet-canvas', canvas);
console.log('boden-dock  ', dock);
console.log('dossier     ', dossier);
console.log('plankopf    ', plankopf);
console.log('OVERLAP boden-dock × sheet-canvas =', ol(dock, canvas));
console.log('OVERLAP boden-dock × dossier      =', ol(dock, dossier));
console.log('OVERLAP boden-dock × plankopf     =', ol(dock, plankopf));
console.log('OVERLAP dossier × plankopf        =', ol(dossier, plankopf));

await browser.close();
