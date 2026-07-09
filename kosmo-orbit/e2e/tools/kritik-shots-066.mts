/**
 * v0.6.6 Kritik-Runde — Screenshot-Sammlung für das Kritiker-Panel.
 * Erweitert das 065-Muster um die Arbeitsmodi-Zustände (Modus-Chip,
 * Zeichnen-/Export-Modus). Bilder → docs/rundgang/kritik-066/.
 * Voraussetzungen: Preview :5183, Bridge :8600.
 * Nutzung: npx tsx e2e/tools/kritik-shots-066.mts  (cwd kosmo-orbit/)
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const OUT = new URL('../../docs/rundgang/kritik-066/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const URL_ = process.env.RUNDGANG_URL ?? 'http://localhost:5183';

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

// uiSeed: Inhalt für kosmo.ui.v1 (persistierte Modus-Felder) — '' = löschen.
async function frisch(thema: 'paper' | 'ink', tkb = true, uiSeed = '') {
  await page.goto(URL_);
  await page.evaluate(([t, seed]) => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.thema', t);
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
    localStorage.removeItem('kosmo.panelOffen');
    localStorage.removeItem('kosmo.projekt.aktiv');
    if (seed) localStorage.setItem('kosmo.ui.v1', seed);
    else localStorage.removeItem('kosmo.ui.v1');
    indexedDB.deleteDatabase('kosmo-projekte');
  }, [thema, uiSeed] as const);
  await page.reload();
  await page.waitForSelector('[data-testid="module-design"]');
  if (tkb) {
    await page.click('[data-testid="load-tkb"]');
    await page.waitForTimeout(2200);
  }
}

const MODUS = (m: string) =>
  JSON.stringify({ version: 1, modusAutomatik: true, modusFesthalten: true, modusManuell: m, arbeitsmodus: m, phasenFokus: null });

for (const thema of ['paper', 'ink'] as const) {
  const T = thema === 'paper' ? 'p' : 'i';

  // Zentrale/Orbit: Ruhe + Fächer offen (W1-A: Verbindungslinie, Ruheraum 390px)
  await frisch(thema, false);
  await shot(`${T}-01-zentrale`);
  await page.hover('[data-testid="orbit-haupt-design"]').catch(async () => {
    await page.hover('[data-testid="module-design"]');
  });
  await shot(`${T}-02-zentrale-faecher`);

  // KosmoDesign neutral (Automatik an, Neutral-Start = Voll-UI) + Modus-Chip sichtbar?
  await frisch(thema);
  await shot(`${T}-03-design-voll`);

  // Modus «zeichnen» festgehalten: Werkzeugleiste modusgefiltert + Chip
  await frisch(thema, true, MODUS('zeichnen'));
  await page.click('[data-testid="view-2d"]').catch(() => {});
  await shot(`${T}-04-design-modus-zeichnen`);
  const chip = page.locator('[data-testid="modus-chip"]');
  if (await chip.count()) {
    await chip.click();
    await shot(`${T}-05-design-chip-menu`);
    await page.keyboard.press('Escape').catch(() => {});
  } else {
    console.log(`! ${T}: modus-chip nicht gefunden`);
  }

  // Modus «exportieren» festgehalten
  await frisch(thema, true, MODUS('exportieren'));
  await shot(`${T}-06-design-modus-exportieren`);

  // Mehr-Fächer im Modus (Erreichbarkeits-Garantie sichtbar machen)
  await frisch(thema, true, MODUS('zeichnen'));
  const mehr = page.locator('[data-testid="werkzeuge-mehr"]');
  if (await mehr.count()) {
    await mehr.click();
    await shot(`${T}-07-design-mehr-im-modus`);
  }

  // KosmoVis (unverändert diese Welle, Regressionsblick)
  await frisch(thema, false);
  await page.click('[data-testid="module-vis"]');
  await page.waitForTimeout(600);
  const drei = page.locator('[data-testid="drei-stimmungen"]');
  if (await drei.count()) await drei.click();
  await shot(`${T}-08-vis-graph`, 1200);

  // KosmoData + Einstellungen (KButton-Klassen-Regressionsblick)
  await frisch(thema, false);
  await page.click('[data-testid="module-data"]');
  await page.waitForTimeout(800);
  await shot(`${T}-09-data`);
  await page.click('[data-testid="einstellungen-oeffnen"]');
  await page.waitForSelector('[data-testid="einstellungen-panel"]');
  await shot(`${T}-10-einstellungen`);
  await page.keyboard.press('Escape');
}

await browser.close();
console.log('fertig →', OUT);
