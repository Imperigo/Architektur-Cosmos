import { chromium } from '@playwright/test';

/**
 * v0.8.1 / P7 (Publish/Export-Runde, `docs/V081-SPEZ.md` §6.1/§7(e)) —
 * Abnahme-Screenshots der vier sichtbar betroffenen Flächen (Muster
 * `p3-081-shots.mts`). Läuft gegen den eigenen Preview-Build auf :5174.
 *
 * 4 Screenshots:
 *  1  p7-081-preset-waehler.png — Publish-Toolbar-Gruppe «Oberfläche»
 *     (Preset-Wähler Fokus/Arbeiten/Prüfen, C-13).
 *  2  p7-081-erststart.png — Erststart der Publish-Station: «Fokus» ist
 *     automatisch aktiv (aria-pressed), OHNE dass ein Preset-Knopf geklickt
 *     wurde (C-13, Erststart-Trigger).
 *  3  p7-081-plankopf-svg-logo.png — Plankopf mit echtem, selbst gebautem
 *     SVG-Logo (C-24: Büro-Logo akzeptiert SVG/JPG, PNG bleibt abgelehnt).
 *  4  p7-081-export-plancode.png — PlankopfPanel-Export-Dateiname-Vorschau
 *     mit Plancode-Namen (C-25, Einzelblatt-Export).
 */

const BASE = 'http://localhost:5174';
const OUT = 'test-results';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

async function neueSeite(seed: Record<string, string> = {}) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.addInitScript((werte) => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    for (const [k, v] of Object.entries(werte)) localStorage.setItem(k, v);
  }, seed);
  await page.goto(BASE);
  return page;
}

declare global {
  interface Window {
    __kosmo: { open: (s: string) => void };
  }
}

async function oeffnePublish(page: Awaited<ReturnType<typeof neueSeite>>) {
  await page.click('[data-testid="load-tkb"]');
  await page.evaluate(() => window.__kosmo.open('publish'));
  await page.locator('[data-testid="publish-werkzeugleiste"]').waitFor({ state: 'visible', timeout: 15_000 });
}

// 1) Preset-Wähler — «Arbeiten» aktiv, Toolbar-Gruppe «Oberfläche» im Bild.
{
  const page = await neueSeite();
  await page.evaluate(() => localStorage.removeItem('kosmo.dock.v1'));
  await page.reload();
  await oeffnePublish(page);
  await page.click('[data-testid="dock-preset-arbeiten"]');
  await page.waitForTimeout(200);
  const gruppe = page.locator('[data-testid="dock-preset-schnellzugriff"]');
  await gruppe.waitFor({ state: 'visible' });
  await page.locator('[data-testid="blattflaeche-werkzeugleiste"]').screenshot({ path: `${OUT}/p7-081-preset-waehler.png` });
  await page.close();
}

// 2) Erststart — frischer Besuch der Publish-Station, kein Klick nötig.
{
  const page = await neueSeite();
  await page.evaluate(() => localStorage.removeItem('kosmo.dock.v1'));
  await page.reload();
  await oeffnePublish(page);
  await page.locator('[data-testid="dock-preset-fokus"][aria-pressed="true"]').waitFor({ state: 'visible', timeout: 5_000 });
  await page.waitForTimeout(200);
  await page.locator('[data-testid="blattflaeche-werkzeugleiste"]').screenshot({ path: `${OUT}/p7-081-erststart.png` });
  await page.close();
}

// 3) Plankopf mit echtem SVG-Logo (selbst gebaute Testdatei, kein Fake-Byte-String).
{
  const page = await neueSeite();
  await oeffnePublish(page);
  await page.click('[data-testid="add-sheet"]');
  await page.click('[data-testid="publish-plankopf"]');
  await page.locator('[data-testid="plankopf-panel"]').waitFor({ state: 'visible' });
  await page.fill('[data-testid="plankopf-buero-name"]', 'Baubüro Andrin');
  await page.locator('[data-testid="plankopf-buero-name"]').blur();
  await page.fill('[data-testid="plankopf-buero-kuerzel"]', 'MAA');
  await page.locator('[data-testid="plankopf-buero-kuerzel"]').blur();

  const svgLogo = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#1f6f78"/><circle cx="32" cy="32" r="20" fill="#f2e9d8"/></svg>',
  );
  await page.setInputFiles('[data-testid="plankopf-buero-logo"]', {
    name: 'testbuero-logo.svg',
    mimeType: 'image/svg+xml',
    buffer: svgLogo,
  });
  await page.locator('[data-testid="meldung-erfolg"]').waitFor({ state: 'visible', timeout: 10_000 });
  await page.waitForTimeout(300);
  await page.locator('[data-testid="sheet-canvas"]').screenshot({ path: `${OUT}/p7-081-plankopf-svg-logo.png` });
  await page.close();
}

// 4) Export-Dateiname-Vorschau mit Plancode (Einzelblatt-Export, C-25).
{
  const page = await neueSeite();
  await oeffnePublish(page);
  await page.click('[data-testid="add-sheet"]');
  await page.click('[data-testid="publish-plankopf"]');
  await page.locator('[data-testid="plankopf-panel"]').waitFor({ state: 'visible' });
  await page.fill('[data-testid="plankopf-buero-kuerzel"]', 'MAA');
  await page.locator('[data-testid="plankopf-buero-kuerzel"]').blur();
  await page.fill('[data-testid="plankopf-projekt-code"]', 'SEE');
  await page.locator('[data-testid="plankopf-projekt-code"]').blur();
  await page.fill('[data-testid="plankopf-disziplin"]', 'A');
  await page.locator('[data-testid="plankopf-disziplin"]').blur();
  await page.fill('[data-testid="plankopf-geschoss"]', 'EG');
  await page.locator('[data-testid="plankopf-geschoss"]').blur();
  await page.fill('[data-testid="plankopf-plan-nummer"]', '101');
  await page.locator('[data-testid="plankopf-plan-nummer"]').blur();
  await page.locator('[data-testid="export-dateiname"]').waitFor({ state: 'visible' });
  await page.waitForTimeout(200);
  await page.locator('[data-testid="plankopf-panel"]').screenshot({ path: `${OUT}/p7-081-export-plancode.png` });
  await page.close();
}

await browser.close();
console.log('p7-081-shots: 4 Screenshots geschrieben.');
