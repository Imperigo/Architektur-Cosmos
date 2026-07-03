import { chromium } from '@playwright/test';
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
await page.goto('http://localhost:5189/');
await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
await page.reload();
await page.click('[data-testid="module-design"]');
await page.evaluate(() => {
  const k = window.__kosmo;
  const st = k.state();
  k.run('design.raumprogrammSetzen', {
    posten: [{ typ: 'marktgerecht', hnfSoll: 190 }, { typ: 'preisguenstig', hnfSoll: 150 }],
  });
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
// SVG-Plan exportieren (auto-fit aufs Blatt) und direkt rendern
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.evaluate(() => document.querySelector('[data-testid="export-svg"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))),
]);
const pfad = process.env.S + '/finch-grundriss.svg';
await download.saveAs(pfad);
await page.goto('file://' + pfad);
await page.waitForTimeout(500);
await page.screenshot({ path: process.env.S + '/finch-moment.png', fullPage: false });
await browser.close();
