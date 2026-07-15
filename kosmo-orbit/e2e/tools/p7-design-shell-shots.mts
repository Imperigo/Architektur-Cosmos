import { chromium } from '@playwright/test';

/**
 * v0.8.0B / P7 (Stations-Welle Design + Shell-Rest) — Beleg-Screenshots.
 * Muster `p6-data-shots.mts`. Läuft gegen den Preview-Build auf :5183.
 *  1/2  p7-design-{orbit,papier}.png — KosmoDesign-Station komplett
 *       (Werkzeugleiste/Kontextzeile/Geschossleiste/Statusleiste/Dock) im
 *       Themenpaar, mit gezeichneter Wand.
 *  3    p7-kosmo-panel.png — KosmoPanel offen (Einstellungs-Bereich +
 *       Chat-Hülle), Orbit-Thema.
 *  4    p7-einstellungen.png — zentrales Einstellungs-Panel mit den drei
 *       Segmentschaltern in KTabs-Pill-Anatomie (Signal-Rest-Audit),
 *       Orbit-Thema.
 */

const BASE = 'http://localhost:5183';
const OUT = 'test-results';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function neueSeite(theme: 'orbit' | 'paper') {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.addInitScript((t) => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.thema', t);
    localStorage.setItem('kosmo.ui.v1', JSON.stringify({ version: 1, modusAutomatik: false, modusFesthalten: false, phasenFokus: null }));
    localStorage.setItem('kosmo.dock.presetInit.v1', '1');
  }, theme);
  await page.goto(BASE);
  return page;
}

const DATEI_SUFFIX = { orbit: 'orbit', paper: 'papier' } as const;

// 1/2 — Design-Station im Themenpaar
for (const theme of ['orbit', 'paper'] as const) {
  const page = await neueSeite(theme);
  await page.click('[data-testid="module-design"]');
  await page.waitForSelector('[data-testid="design-werkzeugleiste"]');
  await page.evaluate(() => {
    const s = (window as never as { __kosmo: { state: () => { doc: { byKind: (k: string) => { id: string; target?: string }[] }; activeStoreyId: string }; run: (c: string, p: unknown) => void } }).__kosmo.state();
    const assembly = s.doc.byKind('assembly').find((a) => a.target === 'wall');
    (window as never as { __kosmo: { run: (c: string, p: unknown) => void } }).__kosmo.run('design.wandZeichnen', {
      storeyId: s.activeStoreyId,
      a: { x: 0, y: 0 },
      b: { x: 8000, y: 0 },
      ...(assembly ? { assemblyId: assembly.id } : {}),
    });
  });
  await page.click('[data-testid="view-2d"]');
  await page.click('[data-testid="nav-fit"]');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/p7-design-${DATEI_SUFFIX[theme]}.png` });
  await page.close();
}

// 3 — KosmoPanel offen (Orbit), Einstellungsbereich aufgeklappt
{
  const page = await neueSeite('orbit');
  await page.click('[data-testid="kosmo-toggle"]');
  await page.waitForSelector('[data-testid="kosmo-panel"]');
  await page.click('[data-testid="kosmo-panel"] [aria-label="Einstellungen"]');
  await page.waitForSelector('[data-testid="betriebsart"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/p7-kosmo-panel.png` });
  await page.close();
}

// 4 — zentrales Einstellungs-Panel (Orbit)
{
  const page = await neueSeite('orbit');
  await page.click('[data-testid="einstellungen-oeffnen"]');
  await page.waitForSelector('[data-testid="einstellungen-panel"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/p7-einstellungen.png` });
  await page.close();
}

await browser.close();
console.log('OK — 4 Screenshots geschrieben nach test-results/p7-{design-orbit,design-papier,kosmo-panel,einstellungen}.png');
