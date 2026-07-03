import { chromium } from '@playwright/test';
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto('http://localhost:5187/');
await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
await page.reload();
await page.click('[data-testid="module-design"]');
await page.click('[data-testid="view-2d"]');
await page.evaluate(() => {
  const k = window.__kosmo;
  const st = k.state();
  k.run('design.raumprogrammSetzen', {
    posten: [{ typ: 'marktgerecht', hnfSoll: 190 }, { typ: 'preisguenstig', hnfSoll: 150 }],
  });
  k.run('design.regelnSetzen', { preset: 'ch-wohnbau' });
  k.run('design.zoneErstellen', {
    storeyId: st.activeStoreyId, name: 'Geschoss', sia: 'KF',
    outline: [{ x: 0, y: 0 }, { x: 30000, y: 0 }, { x: 30000, y: 14000 }, { x: 0, y: 14000 }],
  });
  k.run('design.zoneErstellen', {
    storeyId: st.activeStoreyId, name: 'Korridor', sia: 'VF', raumTyp: 'korridor',
    outline: [{ x: 0, y: 6000 }, { x: 30000, y: 6000 }, { x: 30000, y: 8000 }, { x: 0, y: 8000 }],
  });
});
await page.click('[data-testid="liste-toggle"]');
await page.click('[data-testid="segmentierer-lauf"]');
await page.click('[data-testid="segmentierer-uebernehmen"]');
await page.click('[data-testid="grundrisse-fuellen"]');
await page.waitForTimeout(400);
await page.click('[data-testid="liste-toggle"]');
// Plan herauszoomen und zentrieren
const plan = page.locator('canvas').first();
const box = await plan.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
for (let i = 0; i < 7; i++) { await page.mouse.wheel(0, 240); await page.waitForTimeout(120); }
await page.waitForTimeout(800);
await page.screenshot({ path: process.env.S + '/finch-moment.png' });
await browser.close();
