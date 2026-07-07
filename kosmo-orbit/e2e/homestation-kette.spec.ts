import { expect, test } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * V2-Technik Block 1 / HS3 — die HomeStation-Kette scharf: der Client bedient
 * den vollen Job-Lebenszyklus (Freigabe → Warten auf GPU-Leerlauf → Abbruch)
 * ehrlich, und meldet Offline ehrlich statt zu hängen.
 *
 * Eigene Bridge auf Port 8601 mit Freigabe-Pflicht AN und GPU-Leerlauf AUS —
 * so bleibt ein freigegebener Job beweisbar in «wartet auf GPU-Leerlauf»
 * stehen (die Default-Bridge :8600 und alle anderen Specs bleiben unberührt).
 * Ohne python3/fastapi überspringt sich die Suite ehrlich (Muster
 * `bridgeVerfuegbar`), statt einen grünen Schein vorzutäuschen.
 */

const BRIDGE = join(__dirname, '..', 'tools', 'homestation-bridge', 'kosmo_bridge', 'main.py');
const PORT = 8601;

let bridge: ChildProcess | null = null;
let bridgeBereit = false;

function starteBridge(): Promise<boolean> {
  if (!existsSync(BRIDGE)) return Promise.resolve(false);
  const store = mkdtempSync(join(tmpdir(), 'kosmo-hs3-'));
  const kind = spawn('python3', [BRIDGE, '--fake-worker', '--port', String(PORT)], {
    env: {
      ...process.env,
      KOSMO_BRIDGE_APPROVAL_PFLICHT: '1', // Freigabe-Pflicht AN
      KOSMO_BRIDGE_GPU_IDLE: '0', // GPU belegt → freigegebene Jobs bleiben queued
      KOSMO_JOB_STORE: store,
    },
    stdio: 'ignore',
  });
  bridge = kind;
  kind.on('error', () => undefined); // python3 fehlt → unten via Health-Timeout ehrlich skippen
  return new Promise((resolve) => {
    const t0 = Date.now();
    const poll = async () => {
      try {
        const r = await fetch(`http://127.0.0.1:${PORT}/health`, { signal: AbortSignal.timeout(500) });
        if (r.ok) return resolve(true);
      } catch {
        /* noch nicht oben */
      }
      if (Date.now() - t0 > 12_000) return resolve(false);
      setTimeout(poll, 250);
    };
    void poll();
  });
}

test.describe.serial('HomeStation-Kette (HS3)', () => {
  test.beforeAll(async () => {
    bridgeBereit = await starteBridge();
  });

  test.afterAll(() => {
    bridge?.kill('SIGKILL');
  });

  test('Lebenszyklus: senden → wartet auf Freigabe → Freigeben → wartet auf GPU-Leerlauf → Abbrechen → abgebrochen', async ({ page }) => {
    test.skip(!bridgeBereit, 'python3/fastapi-Bridge nicht verfügbar — Kette ehrlich übersprungen');
    test.setTimeout(60_000);

    await page.addInitScript(() => {
      localStorage.setItem('kosmo.onboarded', '1');
      // localhost (nicht 127.0.0.1): die App-CSP erlaubt connect-src
      // http://localhost:* — die Bridge lauscht auf 127.0.0.1, wohin localhost
      // auflöst, also verbindet der Browser trotzdem.
      localStorage.setItem('kosmo.bridge', 'http://localhost:8601');
    });
    await page.goto('/');
    await page.click('[data-testid="module-vis"]');
    await page.click('[data-testid="drei-stimmungen"]');
    await expect(page.locator('[data-testid="vis-node-render"]').first()).toBeVisible();

    const status = page.locator('[data-testid="render-status"]').first();

    // Senden → Freigabe-Pflicht hält den Job in «wartet auf Freigabe»
    await page.locator('[data-testid="render-ausfuehren"]').first().click();
    await expect(status).toHaveText('wartet auf Freigabe', { timeout: 15_000 });
    // Der Freigeben-Knopf ist nur in diesem Zustand da
    const freigeben = page.locator('[data-testid="render-freigeben"]').first();
    await expect(freigeben).toBeVisible();

    // Freigeben → Job wird queued, aber GPU belegt (Idle 0) → «wartet auf GPU-Leerlauf».
    // Dass der Job dort bleibt (kein Auto-Render bei belegter GPU) beweist der
    // Abbruch unten: ein bereits fertiger Job liesse sich nicht mehr abbrechen.
    await freigeben.click();
    await expect(status).toHaveText('wartet auf GPU-Leerlauf', { timeout: 15_000 });

    // Abbrechen → ehrlicher Endzustand «abgebrochen», kein hängendes «rendert»
    await page.locator('[data-testid="render-abbrechen"]').first().click();
    await expect(status).toHaveText('abgebrochen', { timeout: 15_000 });
    await page.screenshot({ path: 'e2e-results/homestation-kette-lebenszyklus.png' });
  });

  test('Offline: tote Bridge → senden meldet ehrlich «nicht erreichbar», kein Hänger', async ({ page }) => {
    test.setTimeout(45_000);
    // Toter Port (nichts lauscht, aber CSP-erlaubt via localhost:*) — der Post
    // scheitert als echter Netzfehler (Connection refused), nicht als CSP-Block.
    await page.addInitScript(() => {
      localStorage.setItem('kosmo.onboarded', '1');
      localStorage.setItem('kosmo.bridge', 'http://localhost:8699');
    });
    await page.goto('/');
    await page.click('[data-testid="module-vis"]');
    await page.click('[data-testid="drei-stimmungen"]');
    await expect(page.locator('[data-testid="vis-node-render"]').first()).toBeVisible();

    await page.locator('[data-testid="render-ausfuehren"]').first().click();
    const status = page.locator('[data-testid="render-status"]').first();
    await expect(status).toHaveText('fehler', { timeout: 15_000 });
    // Ehrliche Offline-Meldung im Bild-Feld — nicht der kryptische Rohtext
    await expect(page.locator('[data-testid="vis-node-render"]').first()).toContainText('nicht erreichbar');
  });
});
