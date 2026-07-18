import { chromium, type Route } from '@playwright/test';

/**
 * v0.8.4 PA3+PA5 («Desktop & Claude-Login», W1) — Beleg-Screenshots der
 * neuen Login-Führung (E9 Vollbild-Schalter, E10 dreiwertiger ant-Status +
 * Key-Validierungs-Ping). Eigenständiges Skript (Muster
 * `e2e/tools/p7a-082-shots.mts`), kein Teil der Playwright-Testsuite selbst.
 *
 * Der Tauri-IPC-Stub geht bewusst als PLAIN STRING an `page.addInitScript`
 * (nicht als JS-Funktion): unter `tsx` (esbuild `keepNames`) bekommen
 * Funktionsausdrücke mit verschachtelten Closures einen `__name(...)`-Wrap,
 * dessen Helfer nur im tsx-Prozess existiert — als isoliert serialisierte
 * Funktion an die Seite geschickt, wirft sie dort `__name is not defined`
 * und die Zuweisung bleibt aus. Ein reiner Code-String umgeht das.
 */

const BASE = process.env['KOSMO_E2E_BASE'] ?? 'http://127.0.0.1:5176';
const OUT = 'e2e-results';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

function tauriStubScript(antStatus: string, fakeToken = 'fake-token-shots'): string {
  return `
    window.__TAURI_INTERNALS__ = {
      invoke: function (cmd) {
        if (cmd === 'claude_login') return Promise.resolve(${JSON.stringify(fakeToken)});
        if (cmd === 'claude_login_status') return Promise.resolve(${JSON.stringify(antStatus)});
        return Promise.reject(new Error('Stub kennt Command nicht: ' + cmd));
      },
    };
  `;
}

const ONBOARD_SCRIPT = `
  localStorage.setItem('kosmo.onboarded', '1');
  localStorage.setItem('kosmo.panelOffen', '1');
`;

async function oeffneCloudEinstellungen(page: import('@playwright/test').Page) {
  await page.goto(BASE);
  await page.click('[data-testid="module-design"]');
  await page.click('[aria-label="Einstellungen"]');
  await page.click('[data-testid="betriebsart-cloud"]');
  await page.waitForSelector('[data-testid="cloud-login-status"]');
}

// ── 1) ant-CLI fehlt: Status + Installations-Anleitung ──
{
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.addInitScript(tauriStubScript('fehlt'));
  await page.addInitScript(ONBOARD_SCRIPT);
  await oeffneCloudEinstellungen(page);
  await page.waitForSelector('[data-testid="cloud-login-anleitung"]');
  await page.screenshot({ path: `${OUT}/pa35-084-ant-fehlt.png` });
  await page.close();
}

// ── 2) ant-CLI da, nicht eingeloggt ──
{
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.addInitScript(tauriStubScript('nicht-eingeloggt'));
  await page.addInitScript(ONBOARD_SCRIPT);
  await oeffneCloudEinstellungen(page);
  await page.waitForSelector('[data-testid="cloud-login-ant-status"]');
  await page.screenshot({ path: `${OUT}/pa35-084-ant-nicht-eingeloggt.png` });
  await page.close();
}

// ── 3) ant-CLI eingeloggt, dann Klick → Abo-Anmeldung ──
{
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.addInitScript(tauriStubScript('eingeloggt'));
  await page.addInitScript(ONBOARD_SCRIPT);
  await oeffneCloudEinstellungen(page);
  await page.waitForSelector('[data-testid="cloud-login-ant-status"]');
  await page.screenshot({ path: `${OUT}/pa35-084-ant-eingeloggt-vor-klick.png` });
  await page.click('[data-testid="cloud-login-abo"]');
  await page.waitForSelector('[data-testid="cloud-login-status"]:has-text("angemeldet als Abo")');
  await page.screenshot({ path: `${OUT}/pa35-084-abo-angemeldet.png` });
  await page.close();
}

// ── 4) Web-Preview (kein Tauri): ehrlicher Desktop/Abo-Hinweis ──
{
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.addInitScript(ONBOARD_SCRIPT);
  await oeffneCloudEinstellungen(page);
  await page.waitForSelector('[data-testid="cloud-login-hinweis"]');
  await page.screenshot({ path: `${OUT}/pa35-084-web-hinweis.png` });
  await page.close();
}

// ── 5) API-Schlüssel-Validierungs-Ping: ok / Schlüssel-Fehler ──
{
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.route('https://api.anthropic.com/v1/messages', async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"id":"msg_test"}' });
  });
  await page.addInitScript(ONBOARD_SCRIPT);
  await oeffneCloudEinstellungen(page);
  await page.getByLabel('API-Schlüssel (bleibt auf diesem Gerät)').fill('sk-ant-gueltig');
  await page.waitForSelector('[data-testid="schluessel-pruefung-status"][data-status="ok"]', { timeout: 5000 });
  await page.screenshot({ path: `${OUT}/pa35-084-schluessel-ok.png` });
  await page.close();
}
{
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.route('https://api.anthropic.com/v1/messages', async (route: Route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: '{"error":{"message":"invalid x-api-key"}}',
    });
  });
  await page.addInitScript(ONBOARD_SCRIPT);
  await oeffneCloudEinstellungen(page);
  await page.getByLabel('API-Schlüssel (bleibt auf diesem Gerät)').fill('sk-ant-falsch');
  await page.waitForSelector('[data-testid="schluessel-pruefung-status"][data-status="schluessel"]', {
    timeout: 5000,
  });
  await page.screenshot({ path: `${OUT}/pa35-084-schluessel-fehler.png` });
  await page.close();
}

// ── 6) Einstellungen — «Beim Start maximieren» (Default an, Web deaktiviert) ──
{
  const page = await browser.newPage({ viewport: { width: 1400, height: 1200 } });
  await page.addInitScript(ONBOARD_SCRIPT);
  await page.goto(BASE);
  await page.click('[data-testid="einstellungen-oeffnen"]');
  await page.waitForSelector('[data-testid="einstellung-start-maximiert"]');
  await page.locator('[data-testid="einstellung-start-maximiert"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/pa35-084-start-maximiert-schalter.png` });
  await page.close();
}

await browser.close();
console.log('Screenshots geschrieben nach', OUT);
