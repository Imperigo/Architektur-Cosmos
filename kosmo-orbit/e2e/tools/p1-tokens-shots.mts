import { chromium } from '@playwright/test';

/**
 * v0.8.0B / W1 (Token-Fundament) — Vorher/Nachher-Beleg-Screenshots.
 * Der Alpha-Border-Flip + Schatten-Skala + Hover-Stufe wirken GLOBAL im
 * Orbit-Theme; hier je ein Bild pro Station (Orbit) + eine Papier-
 * Gegenprobe (design), damit sichtbar ist: Papier bleibt warm/unverändert,
 * Orbit trägt jetzt Alpha-Borders/Schatten auf allen Flächenstufen.
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

type Kosmo = { open: (s: string) => void };

// ── 1) design — Orbit, Preset "arbeiten" (Standard-Preset der Station) ──
{
  const page = await neueSeite('orbit');
  await page.evaluate(() => (window as unknown as { __kosmo: Kosmo }).__kosmo.open('design'));
  await page.waitForSelector('[data-testid="view-3d"]');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/p1-tokens-design.png` });
  await page.close();
}

// ── 2) vis — Orbit ──
{
  const page = await neueSeite('orbit');
  await page.evaluate(() => (window as unknown as { __kosmo: Kosmo }).__kosmo.open('vis'));
  await page.waitForSelector('[data-testid="vis-3d-viewport"], [data-testid^="vis-"]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/p1-tokens-vis.png` });
  await page.close();
}

// ── 3) publish — Orbit, mit einem Blatt ──
{
  const page = await neueSeite('orbit');
  await page.evaluate(() => (window as unknown as { __kosmo: Kosmo }).__kosmo.open('publish'));
  await page.waitForSelector('[data-testid="publish-werkzeugleiste"]');
  await page.click('[data-testid="add-sheet"]');
  await page.waitForSelector('[data-testid="sheet-canvas"]');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/p1-tokens-publish.png` });
  await page.close();
}

// ── 4) data — Orbit ──
{
  const page = await neueSeite('orbit');
  await page.evaluate(() => (window as unknown as { __kosmo: Kosmo }).__kosmo.open('data'));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/p1-tokens-data.png` });
  await page.close();
}

// ── 5) design — Papier (Gegenprobe: warm, theme-invariant, KEIN Alpha-Flip) ──
{
  const page = await neueSeite('paper');
  await page.evaluate(() => (window as unknown as { __kosmo: Kosmo }).__kosmo.open('design'));
  await page.waitForSelector('[data-testid="view-3d"]');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/p1-tokens-papier.png` });
  await page.close();
}

await browser.close();
console.log('OK — 5 Screenshots geschrieben nach test-results/p1-tokens-*.png');
