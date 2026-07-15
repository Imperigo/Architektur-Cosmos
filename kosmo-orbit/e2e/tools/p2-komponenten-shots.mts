import { chromium } from '@playwright/test';

/**
 * v0.8.0B / P2 (kosmo-ui-Komponenten-Neubau) — Komponenten-Schaubild.
 * Muster `p1-tokens-shots.mts`: Einstellungen ist eine natürliche
 * KButton/KField/KTabs/KSelect/KChip-Galerie (Darstellung/Akzent-Auswahl,
 * Neuigkeiten-Stationsliste, Aktionsknöpfe) — beide Themes, damit sichtbar
 * ist: der Umbau (1px-Border-Prinzip/Segmented-Pill/Glass) trägt in Papier
 * UND Orbit.
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
  await page.click('[data-testid="load-tkb"]');
  return page;
}

// Datei-Suffix ist die deutsche Bezeichnung ("papier"), das `data-theme`-
// Attribut/localStorage-Wert bleibt technisch `paper` (Repo-Konvention).
const DATEI_SUFFIX = { orbit: 'orbit', paper: 'papier' } as const;

for (const theme of ['orbit', 'paper'] as const) {
  const page = await neueSeite(theme);
  await page.click('[data-testid="einstellungen-oeffnen"]');
  await page.waitForSelector('[data-testid="einstellungen-panel"]');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/p2-komponenten-${DATEI_SUFFIX[theme]}.png` });
  await page.close();
}

await browser.close();
console.log('OK — 2 Screenshots geschrieben nach test-results/p2-komponenten-{orbit,papier}.png');
