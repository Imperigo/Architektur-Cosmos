import { chromium } from '@playwright/test';

/**
 * v0.8.1 / P3 (UI-Restrunden, `docs/V081-SPEZ.md` §4.3) — Abnahme-Screenshots
 * der drei sichtbar betroffenen Flächen (Muster `p1-081-shots.mts`). Läuft
 * gegen den eigenen Preview-Build auf :5175 (Parallelbetrieb — P4 Werkzeug-
 * Umbau läuft gleichzeitig auf :5174, Bridge-CORS erlaubt 5173–5177/5183).
 *
 * 3 Screenshots:
 *  1  p3-081-onboarding.png — OnboardingWizard (54 Rest-Inline-Styles → Klassen,
 *     `onboarding-wizard.css` `ow-*`-Satz) — Schritt 01 «Konto & Büro».
 *  2  p3-081-starterguide.png — StarterGuide-Karte (10 Inline-Styles →
 *     `starter-guide.css` `sg-*`-Satz; der F7-Positionscarrier bleibt als
 *     dokumentierter Daten-Carrier).
 *  3  p3-081-katalog.png — Bauteilkatalog-CH-Karte (KKeyValue-Anatomie statt
 *     freier Inline-Spans für Dicke/U-Wert, Spez §4.3/C-17).
 */

const BASE = 'http://localhost:5175';
const OUT = 'test-results';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

async function neueSeite(seed: Record<string, string> = {}) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.addInitScript((werte) => {
    for (const [k, v] of Object.entries(werte)) localStorage.setItem(k, v);
  }, seed);
  await page.goto(BASE);
  return page;
}

// 1) OnboardingWizard — frischer Erststart (kein `kosmo.onboarded`), Schritt 01.
{
  const page = await neueSeite();
  const wizard = page.locator('[data-testid="onboarding"]');
  await wizard.waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForTimeout(300);
  await wizard.screenshot({ path: `${OUT}/p3-081-onboarding.png` });
  await page.close();
}

// 2) StarterGuide — Rundgang-Karte nach «Ja» auf die Erste-Start-Frage.
{
  const page = await neueSeite();
  await page.click('[data-testid="erste-start-ja"]');
  await page.click('[data-testid="module-design"]');
  const karte = page.locator('[data-testid="starter-guide-schritt"]');
  await karte.waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForTimeout(300);
  await karte.screenshot({ path: `${OUT}/p3-081-starterguide.png` });
  await page.close();
}

// 3) Bauteilkatalog CH — Karte mit KKeyValue-Dicke/U-Wert-Zeilen (statt der
//    vormals freien Inline-<span>-Paare).
{
  const page = await neueSeite({ 'kosmo.onboarded': '1', 'kosmo.starterGuide.done': '1' });
  await page.click('[data-testid="module-data"]');
  await page.click('[data-testid="tab-bauteile"]');
  const karte = page.locator('[data-testid^="bauteil-"]').first();
  await karte.waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForTimeout(300);
  await karte.screenshot({ path: `${OUT}/p3-081-katalog.png` });
  await page.close();
}

await browser.close();
console.log('OK — 3 Screenshots geschrieben nach test-results/p3-081-*.png');
