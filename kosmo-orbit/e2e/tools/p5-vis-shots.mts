import { chromium } from '@playwright/test';

/**
 * v0.8.0B / W5 (Stations-Welle Vis, Viz-Anatomie) — Beleg-Screenshots.
 * Muster `p3-shell-dock-shots.mts`/`p2-komponenten-shots.mts`. Port 5174
 * statt des ursprünglich zugewiesenen 5184: die geteilte Fake-Bridge
 * (`tools/homestation-bridge/kosmo_bridge/main.py:_cors_origins()`) erlaubt
 * standardmässig nur `localhost:{5173..5177,5183}` — 5184 liegt ausserhalb
 * dieser Liste und jeder Bridge-Fetch (Render-Poll) scheitert dort an CORS
 * (`ERR_FAILED`, kein Regressions-Befund im Code, geprüft per Playwright-
 * Konsolen-Log). 5174 ist laut Bridge-Kommentar («parallele Agenten-
 * Worktrees … je auf eigenen Ports 5174–5177») genau für diesen Fall
 * vorgesehen — Bridge unangetastet, publish-Welle bleibt auf 5183.
 *  1/2  p5-vis-{orbit,papier}.png — KosmoVis Node-Tree, KPipelineNode-
 *       Anatomie (1.5px Rollenborder 55%, radius-node) im Themenpaar.
 *  3    p5-vis-nodes-running.png — «Drei Stimmungen» + «Ausführen»: der
 *       laufende Render-Node zeigt den running-Puls (Gesetz 7, Glow nur
 *       Info-Zustand, NICHT dauerhaft — der Schuss fällt bewusst früh,
 *       solange der Fake-Worker noch nicht «fertig» meldet).
 */

const BASE = 'http://localhost:5174';
const OUT = 'test-results';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

async function neueSeite(theme: 'orbit' | 'paper') {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.addInitScript((t) => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.bridge', 'http://localhost:8600');
    localStorage.setItem('kosmo.thema', t);
  }, theme);
  await page.goto(BASE);
  await page.click('[data-testid="module-vis"]');
  await page.click('[data-testid="drei-stimmungen"]');
  await page.waitForSelector('[data-testid="node-canvas"]');
  await page.waitForTimeout(700);
  return page;
}

const DATEI_SUFFIX = { orbit: 'orbit', paper: 'papier' } as const;

// 1/2 — Node-Tree beide Themes (KPipelineNode-Anatomie, ruhiger Zustand).
for (const theme of ['orbit', 'paper'] as const) {
  const page = await neueSeite(theme);
  await page.screenshot({ path: `${OUT}/p5-vis-${DATEI_SUFFIX[theme]}.png` });
  await page.close();
}

// 3 — Laufender Render-Node (running-Puls, Gesetz 7).
{
  const page = await neueSeite('orbit');
  await page.locator('[data-testid="render-ausfuehren"]').first().click();
  // Nicht auf «fertig» warten — der Puls ist NUR am laufenden Node sichtbar
  // (running-Status, `vis-node-karte--laeuft`), der Screenshot muss ihn
  // treffen, solange der Fake-Worker noch nicht «fertig» gemeldet hat.
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="render-status"]');
    return el && el.textContent !== 'bereit' && el.textContent !== 'fertig';
  });
  await page.screenshot({ path: `${OUT}/p5-vis-nodes-running.png` });
  await page.close();
}

await browser.close();
console.log('OK — 3 Screenshots geschrieben nach test-results/p5-vis-{orbit,papier,nodes-running}.png');
