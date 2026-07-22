import { chromium } from 'playwright';

// Beschnitt-Sonde v2 (Owner-Auftrag 22.07.: «überprüfe die gesamte ui auf
// solche fehler … nichts so scrollbar machen und nichts abschneiden»).

const GROESSEN = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1152x760', width: 1152, height: 760 },
];

const SCAN = `(() => {
  const funde = [];
  const vw = document.documentElement.clientWidth;
  const beschreibe = (el) => {
    const t = el.getAttribute('data-testid');
    const id = el.id ? '#' + el.id : '';
    const cls = typeof el.className === 'string' ? '.' + el.className.split(/\\s+/).filter(Boolean).slice(0, 3).join('.') : '';
    const text = (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 50);
    return el.tagName.toLowerCase() + id + (t ? '[' + t + ']' : '') + cls + ' «' + text + '»';
  };
  for (const el of document.querySelectorAll('body *')) {
    if (!(el instanceof HTMLElement)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const stil = getComputedStyle(el);
    if (stil.visibility === 'hidden' || stil.display === 'none') continue;
    const dw = el.scrollWidth - el.clientWidth;
    if (dw > 3 && (stil.overflowX === 'hidden' || stil.overflowX === 'clip') && stil.textOverflow !== 'ellipsis') {
      funde.push({ art: 'beschnitten', um: dw, sel: beschreibe(el) });
    }
    if (dw > 3 && (stil.overflowX === 'auto' || stil.overflowX === 'scroll')) {
      funde.push({ art: 'h-scrollbar', um: dw, sel: beschreibe(el) });
    }
    if (r.right > vw + 3 && r.left < vw && stil.position !== 'fixed') {
      funde.push({ art: 'ueber-rand', um: Math.round(r.right - vw), sel: beschreibe(el) });
    }
  }
  const map = new Map();
  for (const f of funde) {
    const k = f.art + '|' + f.sel;
    if (!map.has(k) || map.get(k).um < f.um) map.set(k, f);
  }
  return [...map.values()].sort((a, b) => b.um - a.um).slice(0, 30);
})()`;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const alle = [];
for (const g of GROESSEN) {
  const p = await b.newPage({ viewport: { width: g.width, height: g.height } });
  await p.goto('http://127.0.0.1:5183');
  await p.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await p.reload();
  await p.waitForTimeout(4500);

  const scanUnd = async (kontext) => {
    const liste = await p.evaluate(SCAN);
    alle.push(...liste.map((f) => ({ ...f, kontext: `${g.name} ${kontext}` })));
  };

  await scanUnd('zentrale');

  // Stationen über den Fächer (orbit-haupt-design → module-*)
  for (const [haupt, module] of [
    ['design', ['design', 'prepare', 'vis', 'publish']],
    ['data', ['data']],
  ]) {
    for (const m of module) {
      const kachel = p.locator(`[data-testid="orbit-haupt-${haupt}"]`);
      if (!(await kachel.count())) continue;
      await kachel.hover().catch(() => {});
      await p.waitForTimeout(400);
      const knopf = p.locator(`[data-testid="orbit-faecher-${haupt}"] [data-testid="module-${m}"]`);
      if (!(await knopf.count())) continue;
      await knopf.click({ force: true }).catch(() => {});
      await p.waitForTimeout(1500);
      await scanUnd(`station:${m}`);
      // zurück zur Zentrale fürs nächste Modul
      const heim = p.locator('[data-testid="island-kopf-logo-orbit"]');
      if (await heim.count()) {
        await heim.first().click({ force: true }).catch(() => {});
        await p.waitForTimeout(800);
      }
    }
  }

  // KosmoPanel + dessen Einstellungen (die Owner-Screenshots)
  const toggle = p.locator('[data-testid="kosmo-toggle"]');
  if (await toggle.count()) {
    await toggle.first().click({ force: true }).catch(() => {});
    await p.waitForTimeout(1200);
    await scanUnd('kosmo-panel');
    const zahnrad = p.locator('[data-testid="kosmo-panel"] [aria-label="Einstellungen"]');
    if (await zahnrad.count()) {
      await zahnrad.first().click({ force: true }).catch(() => {});
      await p.waitForTimeout(800);
      await scanUnd('kosmo-panel:einstellungen');
      await p.screenshot({ path: `e2e/tools/.beschnitt-panel-${g.name}.png`, fullPage: false });
    }
  }
  await p.close();
}
await b.close();
console.log(JSON.stringify(alle, null, 1));
