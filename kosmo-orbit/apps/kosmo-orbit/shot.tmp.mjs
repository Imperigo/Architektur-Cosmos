import { chromium } from 'playwright';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await page.addInitScript(() => {
  localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock', baseUrl: '', model: '' }));
  localStorage.setItem('kosmo.bridge', 'http://localhost:8600');
});
await page.goto('http://localhost:5183/');
await page.waitForTimeout(400);
await page.getByTestId('module-design').click();
await page.waitForTimeout(700);
await page.evaluate(() => {
  const k = window.__kosmo;
  const st = k.state();
  const storeyId = st.activeStoreyId;
  const aw = st.doc.byKind('assembly').find((a) => a.name === 'AW Beton 36');
  const W = (a, b) => k.run('design.wandZeichnen', { storeyId, a, b, assemblyId: aw.id }).patches[0].id;
  const w1 = W({ x: 0, y: 0 }, { x: 9000, y: 0 });
  W({ x: 9000, y: 0 }, { x: 9000, y: 6500 });
  W({ x: 9000, y: 6500 }, { x: 0, y: 6500 });
  W({ x: 0, y: 6500 }, { x: 0, y: 0 });
  k.run('design.oeffnungSetzen', { wallId: w1, openingType: 'fenster', center: 3000, width: 2000, height: 1500, sill: 900 });
  k.run('design.deckeZeichnen', { storeyId, outline: [{x:0,y:0},{x:9000,y:0},{x:9000,y:6500},{x:0,y:6500}], thickness: 250 });
  window.__kosmo.open('vis');
});
await page.waitForTimeout(1200);
await page.getByTestId('send-render').click();
// warten bis Job done (Fake-Worker ~3s)
await page.waitForFunction(
  () => document.body.innerText.includes('done'),
  null,
  { timeout: 15000 },
);
await page.waitForTimeout(1200);
const out = '/tmp/claude-0/-home-user-Architektur-Cosmos/29f91fcd-4e18-518e-8c69-206843920053/scratchpad/';
await page.screenshot({ path: out + 'vis-loop.png' });
await browser.close();
console.log('done');
