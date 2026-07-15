/**
 * Export-Hub-Screenshot (v0.8.0 P8) — belegt den ehrlichen Export-Hub
 * (Publikations-Sets: PDF/SVGs/Transmittal + Plansatz-PDF/Blatt-SVG/
 * Grundriss-DXF-Gruppe) samt der neuen Export-Dateiname-Vorschau im
 * PlankopfPanel, mit vollen Stammdaten + Plancode.
 *
 * Aufruf (aus kosmo-orbit/, Preview auf :5183 muss laufen):
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx tsx e2e/tools/export-hub-shot-080.mts
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('test-results', { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
const page = await ctx.newPage();
await page.addInitScript(() => {
  localStorage.setItem('kosmo.onboarded', '1');
  localStorage.setItem('kosmo.starterGuide.done', '1');
});
await page.goto('http://localhost:5183/');
await page.click('[data-testid="load-tkb"]');
await page.evaluate(() => (window as any).__kosmo.open('publish'));
await page.waitForSelector('[data-testid="publish-werkzeugleiste"]');
await page.click('[data-testid="add-sheet"]');
await page.click('[data-testid="place-plan"]');
await page.click('[data-testid="publish-plankopf"]');
await page.waitForSelector('[data-testid="plankopf-panel"]');

await page.fill('[data-testid="plankopf-buero-name"]', 'Baubüro Andrin');
await page.locator('[data-testid="plankopf-buero-name"]').blur();
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
await page.fill('[data-testid="plankopf-inhalt"]', 'Grundriss EG');
await page.locator('[data-testid="plankopf-inhalt"]').blur();
await page.waitForTimeout(400);

await page.fill('[data-testid="pubset-name"]', 'Baueingabe');
await page.click('[data-testid="pubset-speichern"]');
await page.waitForTimeout(400);

await page.screenshot({ path: 'test-results/export-hub.png' });
await browser.close();
console.log('Screenshot geschrieben: test-results/export-hub.png');
