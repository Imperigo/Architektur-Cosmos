import { chromium } from '@playwright/test';

/**
 * v0.8.1 / P1 (Owner-Entscheide-Runde, `docs/V081-SPEZ.md` §4.1) — Abnahme-
 * Screenshots der drei Entscheide mit sichtbarer Optik-Wirkung (Muster
 * `w8ca-shots.mts`/`p6-data-shots.mts`). Läuft gegen den eigenen Preview-Build
 * auf :5174 (Parallelbetrieb, Bridge-CORS erlaubt 5173–5177/5183).
 *
 * 3 Screenshots:
 *  1  p1-081-governance.png — GovernanceGate (`.k-approval*`-Klassen, Entscheid 1/C-1)
 *     an einer echten Kosmo-Vorschlagskarte (Mock-Provider, `proposal-governance-gate`).
 *  2  p1-081-bodendock.png — Boden-Dock mit 44/36px-Kreisen (Entscheid 2/C-2).
 *  3  p1-081-doc.png — KosmoDoc-Kopf mit der neuen `--k-rolle-doc`-Farbe statt
 *     `moduleHue.draw` (Entscheid 4/C-4).
 */

const BASE = 'http://localhost:5174';
const OUT = 'test-results';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

async function neueSeite(panelOffen: boolean) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.addInitScript((offen) => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    if (offen) localStorage.setItem('kosmo.panelOffen', '1');
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
  }, panelOffen);
  await page.goto(BASE);
  return page;
}

// 1) GovernanceGate — echte Kosmo-Vorschlagskarte (Mock-Provider).
{
  const page = await neueSeite(true);
  await page.click('[data-testid="module-design"]');
  await page.fill('[data-testid="kosmo-input"]', 'Zeichne eine Wand von 0,0 bis 6,0');
  await page.click('[data-testid="kosmo-send"]');
  const gate = page.locator('[data-testid="proposal-governance-gate"]').first();
  await gate.waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForTimeout(300);
  await gate.screenshot({ path: `${OUT}/p1-081-governance.png` });
  await page.close();
}

// 2) Boden-Dock — 44/36px-Kreise (Entscheid 2/C-2) INKL. Kosmo-Orb-Slot
//    (nur sichtbar, solange das grosse Panel zu ist — panelOffen NICHT setzen).
{
  const page = await neueSeite(false);
  await page.click('[data-testid="module-design"]');
  const dock = page.locator('[data-testid="boden-dock"]');
  await dock.waitFor({ state: 'visible' });
  await page.waitForTimeout(300);
  await dock.screenshot({ path: `${OUT}/p1-081-bodendock.png` });
  await page.close();
}

// 3) KosmoDoc-Kopf — eigene `--k-rolle-doc`-Farbe statt `draw` (Entscheid 4/C-4).
{
  const page = await neueSeite(false);
  await page.evaluate(() => window.__kosmo.open('doc'));
  const kopf = page.locator('[data-testid="doc-werkzeugleiste"]');
  await kopf.waitFor({ state: 'visible' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/p1-081-doc.png` });
  await page.close();
}

await browser.close();
console.log('OK — 3 Screenshots geschrieben nach test-results/p1-081-*.png');
