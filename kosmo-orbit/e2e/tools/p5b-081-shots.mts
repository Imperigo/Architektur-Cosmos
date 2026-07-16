import { chromium } from '@playwright/test';

/**
 * v0.8.1 / P5b (`KPanelZweiStufen` + Pilot Kennzahlen/Draw, `docs/V081-
 * SPEZ.md` §2) — Abnahme-Screenshots der zwei Pilot-Panels in beiden Stufen
 * (Muster `p4-081-shots.mts`). Läuft gegen den eigenen Preview-Build auf
 * :5174.
 *
 * 4 Screenshots:
 *  1  p5b-081-kennzahlen-offen.png   — KennzahlenPanel, Stufe 'offen'
 *     (Kopf + EINEM KTabs-Tab «Übersicht» — Tab-Leiste selbst bleibt darum
 *     unsichtbar, s. Kopfkommentar `KPanelZweiStufen`) + Körper mit Zonen-
 *     Kennzahlen.
 *  2  p5b-081-kennzahlen-kompakt.png — dasselbe Panel, Stufe 'kompakt'
 *     (nur Kopf: Titel + NGF-Kernkennzahl, kein Körper).
 *  3  p5b-081-draw-offen.png        — DrawPanel, Stufe 'offen', KTabs
 *     sichtbar (Modellbaum/Mengen/Ausmass), Kernkennzahl zeigt den Namen
 *     des aktiven Tabs.
 *  4  p5b-081-draw-kompakt.png      — dasselbe Panel, Stufe 'kompakt'.
 */

const BASE = 'http://localhost:5174';
const OUT = 'test-results';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

async function neueSeite() {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.addInitScript(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.goto(BASE);
  // Muster `handbuch-077.mts`/`kritik-shots-065.mts`: `load-tkb` lädt das
  // TKB-Demoprojekt UND navigiert direkt in die Design-Station (NICHT erst
  // `module-design` anklicken — das landet in einer leeren Station ohne
  // Zonen/Bauteile, `kennzahlen` bliebe im Leerzustand). Die TKB-Demo trägt
  // echte Zonen/Bauteile, darum echte Zahlen im Kopf beider Pilot-Panels.
  await page.waitForSelector('[data-testid="load-tkb"]', { timeout: 25_000 });
  await page.click('[data-testid="load-tkb"]');
  await page.waitForTimeout(2600);
  return page;
}

// `kennzahlen` startet in einer frischen Session ANGEDOCKT, aber
// EINGEKLAPPT (34px-Tab, bestehendes Auto-Reaktions-/Preset-Verhalten,
// unverändert seit vor P5b) — kein Regressionsfund dieses Pakets, nur eine
// Eigenheit einer nagelneuen `kosmo.dock.v1`-Session. Der Tab-Klick öffnet
// das Panel ganz regulär über den bestehenden Solver-Weg (`DockPanel.tsx`s
// `tabKlick`), bevor die eigentlichen Zwei-Stufen-Screenshots beginnen.
async function sicherstellenAufgeklappt(page: Awaited<ReturnType<typeof neueSeite>>, panelId: string) {
  const tab = page.locator(`[data-testid="dock-panel-${panelId}-tab"]`);
  if (await tab.count()) {
    await tab.click();
    await page.waitForTimeout(400);
  }
}

// 1+2) KennzahlenPanel — offen (Default-Alt-Verhalten) dann kompakt (Klick
//      auf den neuen Umschalt-Knopf, additive testid `kennzahlen-umschalten`).
{
  const page = await neueSeite();
  await sicherstellenAufgeklappt(page, 'kennzahlen');
  const panel = page.locator('[data-testid="kennzahlen"]');
  await panel.waitFor({ state: 'visible' });
  await page.waitForTimeout(200);
  await panel.screenshot({ path: `${OUT}/p5b-081-kennzahlen-offen.png` });

  await page.click('[data-testid="kennzahlen-umschalten"]');
  await page.waitForTimeout(300);
  await panel.screenshot({ path: `${OUT}/p5b-081-kennzahlen-kompakt.png` });
  await page.close();
}

// 3+4) DrawPanel — offen (KTabs sichtbar) dann kompakt (additive testid
//      `draw-panel-koerper-umschalten`).
{
  const page = await neueSeite();
  await page.click('[data-testid="draw-toggle"]');
  await sicherstellenAufgeklappt(page, 'drawOffen');
  const panel = page.locator('[data-testid="draw-panel"]');
  await panel.waitFor({ state: 'visible' });
  await page.locator('[data-testid="draw-tab-mengen"]').waitFor({ state: 'visible' });
  await page.waitForTimeout(200);
  await panel.screenshot({ path: `${OUT}/p5b-081-draw-offen.png` });

  await page.click('[data-testid="draw-panel-koerper-umschalten"]');
  await page.waitForTimeout(300);
  await panel.screenshot({ path: `${OUT}/p5b-081-draw-kompakt.png` });
  await page.close();
}

await browser.close();
console.log('OK — 4 Screenshots geschrieben nach test-results/p5b-081-*.png');
