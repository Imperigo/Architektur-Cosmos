import { chromium } from '@playwright/test';

/**
 * v0.8.0B / W8c-A (die 5 nachgezogenen Stationen — Owner-Entscheid 16.07.
 * «Scope-Blindpunkt jetzt nachziehen», Muster `p6-data-shots.mts`/
 * `p5-vis-shots.mts`). Läuft gegen den eigenen Preview-Build auf :5175
 * (Parallelbetrieb mit dem Design-Panel-Agenten, Bridge-CORS erlaubt
 * 5173–5177). Navigation über die Orbit-Zentrale: Hauptkacheln
 * (`orbit-haupt-<familie>`) öffnen per Hover ihren Fächer
 * (`orbit-faecher-<familie>`), darin liegen die `module-<id>`-Knöpfe;
 * zurück über den Header-Knopf «Zur Zentrale» (Muster
 * `e2e/orbit-start.spec.ts` + `module.spec.ts:2060ff`).
 *
 * 6 Screenshots:
 *  1–5  w8ca-{prepare,asset,doc,dev,train}-orbit.png (Orbit-Theme)
 *  6    w8ca-prepare-papier.png (Papier-Gegenprobe, Themenpaar-Beweis)
 */

const BASE = 'http://localhost:5175';
const OUT = 'test-results';

// Station → Hauptwerkzeug-Fächer der Zentrale (`shell/orbit-werkzeuge.ts`:
// design-Fächer trägt prepare, data-Fächer trägt asset, kosmo-Fächer trägt
// train/dev/doc).
const FAMILIE: Record<string, string> = {
  prepare: 'design',
  asset: 'data',
  doc: 'kosmo',
  dev: 'kosmo',
  train: 'kosmo',
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

async function neueSeite(theme: 'orbit' | 'paper') {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.addInitScript((t) => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.thema', t);
  }, theme);
  await page.goto(BASE);
  return page;
}

async function shot(
  page: import('@playwright/test').Page,
  modul: string,
  wartenAuf: string,
  datei: string,
  zurueck: boolean,
) {
  await page.hover(`[data-testid="orbit-haupt-${FAMILIE[modul]}"]`);
  await page.click(`[data-testid="orbit-faecher-${FAMILIE[modul]}"] [data-testid="module-${modul}"]`);
  await page.waitForSelector(`[data-testid="${wartenAuf}"]`);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${datei}` });
  if (zurueck) await page.click('header button[aria-label="Zur Zentrale"]');
}

// Orbit-Theme — 5 Stationen.
{
  const page = await neueSeite('orbit');
  await shot(page, 'prepare', 'ingest-zone', 'w8ca-prepare-orbit.png', true);
  await shot(page, 'asset', 'asset-werkzeugleiste', 'w8ca-asset-orbit.png', true);
  await shot(page, 'doc', 'doc-werkzeugleiste', 'w8ca-doc-orbit.png', true);
  await shot(page, 'dev', 'dev-werkzeugleiste', 'w8ca-dev-orbit.png', true);
  await shot(page, 'train', 'train-stand', 'w8ca-train-orbit.png', false);
  await page.close();
}

// Papier-Gegenprobe (eine Station genügt als Themenpaar-Beweis, Muster W6).
{
  const page = await neueSeite('paper');
  await shot(page, 'prepare', 'ingest-zone', 'w8ca-prepare-papier.png', false);
  await page.close();
}

await browser.close();
console.log('OK — 6 Screenshots geschrieben nach test-results/w8ca-*.png');
