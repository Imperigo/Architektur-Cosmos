import { chromium } from 'playwright';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
page.on('pageerror', (e) => console.log('E:', e.message));
await page.addInitScript(() => {
  localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock', baseUrl: '', model: '' }));
});
await page.goto('http://localhost:5183/');
await page.waitForTimeout(400);
await page.getByTestId('module-data').click();
await page.waitForSelector('[data-testid="ref-card"]', { timeout: 6000 });
await page.waitForTimeout(1500); // Bilder laden lassen (Wikimedia via Proxy evtl. blockiert — egal, Fallback greift)
await page.getByTestId('data-search').fill('zumthor');
await page.waitForTimeout(400);
const count = await page.locator('[data-testid="ref-card"]').count();
console.log('ZUMTHOR-TREFFER:', count);
await page.locator('[data-testid="ref-card"]').first().click();
await page.waitForTimeout(500);
const out = '/tmp/claude-0/-home-user-Architektur-Cosmos/29f91fcd-4e18-518e-8c69-206843920053/scratchpad/';
await page.screenshot({ path: out + 'kosmodata.png' });
await browser.close();
console.log('done');
