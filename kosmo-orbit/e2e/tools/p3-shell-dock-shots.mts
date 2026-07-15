import { chromium } from '@playwright/test';

/**
 * v0.8.0B / W3 (Shell-Zonen + Dock-Chrome + BodenDock) — Beleg-Screenshots.
 * Muster `p2-komponenten-shots.mts`:
 *  1/2  p3-design-{orbit,papier}.png — KosmoDesign 2D mit Dock-Panels,
 *       Header 56/sunken, Statuszeilen-Chips, Rail-Kreise, BodenDock-Pille.
 *  3    p3-bodendock-detail.png — Nahaufnahme der Glas-Pille (Clip auf die
 *       BoundingBox + Rand).
 *  4    p3-dock-float.png — ein per Pop-out gelöstes, schwebendes Panel
 *       (Glass + shadow-lg + Griffpunkte + Rollen-Topborder).
 */

const BASE = 'http://127.0.0.1:5183';
const OUT = 'test-results';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

async function neueSeite(theme: 'orbit' | 'paper') {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.addInitScript((t) => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.removeItem('kosmo.dock.v1');
    localStorage.removeItem('kosmo.dock.presetInit.v1');
    localStorage.setItem('kosmo.thema', t);
  }, theme);
  await page.goto(BASE);
  // `load-tkb` navigiert bereits nach KosmoDesign (Muster `p11-shots.mts`
  // nutzt danach `__kosmo.open`), kein module-design-Kachel-Klick nötig.
  await page.click('[data-testid="load-tkb"]');
  await page.waitForSelector('[data-testid="dock-panel-kennzahlen"]');
  await page.waitForTimeout(900);
  return page;
}

const DATEI_SUFFIX = { orbit: 'orbit', paper: 'papier' } as const;

// 1/2 — Stationsbild beide Themes.
for (const theme of ['orbit', 'paper'] as const) {
  const page = await neueSeite(theme);
  await page.screenshot({ path: `${OUT}/p3-design-${DATEI_SUFFIX[theme]}.png` });
  await page.close();
}

// 3 — BodenDock-Nahaufnahme (orbit, Clip um die Pille + Rollenpunkte).
{
  const page = await neueSeite('orbit');
  const box = await page.locator('[data-testid="boden-dock"]').boundingBox();
  if (!box) throw new Error('boden-dock nicht gefunden');
  await page.screenshot({
    path: `${OUT}/p3-bodendock-detail.png`,
    clip: {
      x: Math.max(0, box.x - 40),
      y: Math.max(0, box.y - 40),
      width: box.width + 80,
      height: box.height + 80,
    },
  });
  await page.close();
}

// 4 — Schwebendes Panel (KV öffnen → Pop-out, Glass-Anatomie; Ablauf wie
//     `dock-interaktion.spec.ts` «Pop-out: Panel schwebt frei …»).
{
  const page = await neueSeite('orbit');
  await page.click('[data-testid="kv-oeffnen"]');
  await page.waitForSelector('[data-testid="dock-panel-kvOffen"]');
  await page.click('[data-testid="dock-panel-kvOffen-popout"]');
  await page.waitForSelector('[data-testid="dock-panel-kvOffen"][data-schwebend="true"]');
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/p3-dock-float.png` });
  await page.close();
}

await browser.close();
console.log('OK — 4 Screenshots geschrieben nach test-results/p3-{design-orbit,design-papier,bodendock-detail,dock-float}.png');
