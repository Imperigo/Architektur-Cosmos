import { expect, test, type Route } from '@playwright/test';
import { waehleOption } from './helfer/waehleOption';

/**
 * Cloud-Login mit Abo («Mit Claude anmelden», Owner-Auftrag): der OAuth-Weg
 * ist Desktop-only (Tauri-Command `claude_login`, siehe
 * `apps/kosmo-orbit/src-tauri/src/lib.rs`). Im Web-Preview (kein Tauri) zeigt
 * der Knopf ehrlich den Desktop-only-Hinweis statt sich klickbar zu geben;
 * der API-Schlüssel-Weg bleibt der volle Ersatz.
 */

async function oeffneCloudEinstellungen(page: import('@playwright/test').Page) {
  await page.click('[data-testid="module-design"]');
  await page.click('[aria-label="Einstellungen"]');
  await page.click('[data-testid="betriebsart-cloud"]');
  await expect(page.locator('[data-testid="cloud-login-status"]')).toBeVisible();
}

test('Web-Preview: Mit-Claude-Anmeldung zeigt den ehrlichen Desktop-Hinweis, kein Login-Knopf', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    // Interner Fix (K11): Panel-Default ist jetzt zu — die Einstellungen
    // (Gear-Icon) leben im Kosmo-Panel, «Einstellungen» braucht es offen.
    localStorage.setItem('kosmo.panelOffen', '1');
  });
  // Interner Fix (K11): reload() ist nötig, damit kosmo.panelOffen VOR dem
  // ersten Mount gilt — sonst hat das evaluate() danach keine Wirkung mehr.
  await page.reload();
  await oeffneCloudEinstellungen(page);

  await expect(page.locator('[data-testid="cloud-login-hinweis"]')).toBeVisible();
  await expect(page.locator('[data-testid="cloud-login-hinweis"]')).toContainText('Desktop-App');
  // v0.8.4 PA5 (E10 §3.2, C-5 «Browser-Abo-Grenze klar erklärt»): der Text
  // benennt jetzt explizit das «Abo» UND die lokale CLI, nicht nur den
  // vagen Desktop-App-Verweis von vorher. (v0.9.1: die CLI heisst real
  // `claude`, nicht `ant` — s. src-tauri/src/lib.rs.)
  await expect(page.locator('[data-testid="cloud-login-hinweis"]')).toContainText('Abo');
  await expect(page.locator('[data-testid="cloud-login-hinweis"]')).toContainText('claude');
  await expect(page.locator('[data-testid="cloud-login-abo"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="cloud-login-status"]')).toContainText('nicht angemeldet');
  // Die ant-CLI-Status-Anzeige und der «Erneut prüfen»-Knopf sind reine
  // Desktop/Tauri-Konzepte — im Web/PWA gibt es sie ehrlich gar nicht (kein
  // deaktiviertes Attrappen-Element).
  await expect(page.locator('[data-testid="cloud-login-ant-status"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="cloud-login-erneut-pruefen"]')).toHaveCount(0);
});

test('API-Schlüssel-Weg bleibt voll funktionsfähig neben dem Abo-Login', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    // Interner Fix (K11): Panel-Default ist jetzt zu — die Einstellungen
    // (Gear-Icon) leben im Kosmo-Panel, «Einstellungen» braucht es offen.
    localStorage.setItem('kosmo.panelOffen', '1');
  });
  // Interner Fix (K11): reload() ist nötig, damit kosmo.panelOffen VOR dem
  // ersten Mount gilt — sonst hat das evaluate() danach keine Wirkung mehr.
  await page.reload();
  await oeffneCloudEinstellungen(page);

  await page.getByLabel('API-Schlüssel (bleibt auf diesem Gerät)').fill('sk-ant-test-123');
  await expect(page.locator('[data-testid="cloud-login-status"]')).toContainText('API-Schlüssel hinterlegt');

  const s = await page.evaluate(() => JSON.parse(localStorage.getItem('kosmo.llm')!));
  expect(s.anthropicKey).toBe('sk-ant-test-123');
  expect(s.cloudAuth).toBe('schluessel');
  expect(s.provider).toBe('anthropic');
});

/**
 * Owner-Befund F1 «Modell auswählbar machen von Claude»: das
 * Claude-Modell-Select im Kosmo-Panel (⚙, wo Provider/Schlüssel leben) zeigt
 * die drei aktuellen Modelle + Freitext-Override und persistiert die Wahl in
 * `kosmo.llm`, damit sie einen Reload übersteht.
 */
test('Claude-Modell-Select ist sichtbar und der Wechsel persistiert nach Reload', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.panelOffen', '1');
  });
  await page.reload();
  await oeffneCloudEinstellungen(page);

  const select = page.locator('[data-testid="claude-modell-select"]');
  await expect(select).toBeVisible();
  // Owner-Default: Opus 4.8, solange nichts anderes gewählt wurde.
  // (v0.6.9: KSelect ist ein Custom-Dropdown — der Wert steht als
  // `data-value` am Trigger, nicht mehr als select-value.)
  await expect(select).toHaveAttribute('data-value', 'claude-opus-4-8');

  await waehleOption(page, 'claude-modell-select', 'claude-sonnet-5');
  const nachWahl = await page.evaluate(() => JSON.parse(localStorage.getItem('kosmo.llm')!));
  expect(nachWahl.anthropicModel).toBe('claude-sonnet-5');

  await page.reload();
  await oeffneCloudEinstellungen(page);
  await expect(page.locator('[data-testid="claude-modell-select"]')).toHaveAttribute('data-value', 'claude-sonnet-5');
});

test('Claude-Modell-Select: Freitext-Override für eigene Modell-IDs, persistiert ebenfalls', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.panelOffen', '1');
  });
  await page.reload();
  await oeffneCloudEinstellungen(page);

  await waehleOption(page, 'claude-modell-select', 'freitext');
  await page.getByLabel('Modell-ID (Freitext)').fill('claude-opus-4-9-preview');

  const s = await page.evaluate(() => JSON.parse(localStorage.getItem('kosmo.llm')!));
  expect(s.anthropicModel).toBe('claude-opus-4-9-preview');

  await page.reload();
  await oeffneCloudEinstellungen(page);
  await expect(page.locator('[data-testid="claude-modell-select"]')).toHaveAttribute('data-value', 'freitext');
  await expect(page.getByLabel('Modell-ID (Freitext)')).toHaveValue('claude-opus-4-9-preview');
});

/**
 * v0.8.4 PA5 (E10 §3.2, `docs/V084-SPEZ.md`, C-5 «Key-Validierungs-Ping»):
 * `pruefeAnthropicZugang` (`@kosmo/ai`) macht beim Speichern eines
 * API-Schlüssels einen ECHTEN Anthropic-Call (debounced, 600ms nach der
 * letzten Eingabe) — hier mit `page.route` gegen `api.anthropic.com`
 * abgefangen (Muster `e2e/kosmo-blick-cloud.spec.ts`), damit der Test
 * deterministisch und offline läuft, ohne den Netzcode selbst zu mocken.
 */
/**
 * P-F3 (Owner-Punkt 23.07.2026 «claude-abo 401») — der WEB/PWA-Zweig des
 * NEUEN Chat-Motors `ClaudeCliProvider` (`@kosmo/ai`, `claude-cli.ts`):
 * Playwright-Chromium hat kein `__TAURI_INTERNALS__`, ist also GENAU der
 * ehrliche Fall, den `istTauriDesktop()` dort erkennt. Diese Spec setzt
 * `cloudAuth:'abo'` direkt in `kosmo.llm` (der Login-Knopf selbst ist im
 * Web ohnehin nicht klickbar, s. Test oben) und beweist: ein Chat-Zug im
 * Abo-Modus endet NICHT in einem stillen Fehlschlag oder einem 401-Netz-
 * Request, sondern zeigt exakt den deklarierten Desktop-only-Hinweis im
 * Chat — denselben Wortlaut wie `claudeAboAnmeldung()` für den Login-Knopf.
 */
test.describe('ClaudeCliProvider im Web/PWA (P-F3)', () => {
  test('Ein Chat-Zug im Abo-Modus endet ohne Tauri im deklarierten Web-Fehlerhinweis, kein Netz-Request', async ({
    page,
  }) => {
    let anthropicRequestGesehen = false;
    await page.route('https://api.anthropic.com/v1/messages', async (route: Route) => {
      anthropicRequestGesehen = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('kosmo.onboarded', '1');
      localStorage.setItem(
        'kosmo.llm',
        JSON.stringify({
          provider: 'anthropic',
          betriebsart: 'cloud',
          cloudAuth: 'abo',
          anthropicOauthToken: 'fake-oauth-token-e2e-web',
          anthropicModel: 'claude-opus-4-8',
        }),
      );
    });
    await page.reload();

    const orbKnopf = page.locator('[data-testid="kosmo-orb-knopf"]');
    if ((await orbKnopf.count()) > 0) {
      await page.dblclick('[data-testid="kosmo-orb-knopf"]');
    } else {
      await page.dblclick('[data-testid="kosmo-symbol"]');
    }
    await expect(page.locator('[data-testid="kosmo-input"]')).toBeVisible();

    const sendKnopf = page.locator('[data-testid="kosmo-send"]');
    await expect(sendKnopf).toBeEnabled({ timeout: 15_000 });
    await page.fill('[data-testid="kosmo-input"]', 'Hallo Kosmo');
    await sendKnopf.click();

    await expect(page.locator('text=Claude-Abo läuft nur in der Desktop-App')).toBeVisible({ timeout: 15_000 });
    expect(anthropicRequestGesehen).toBe(false);
  });
});

test.describe('API-Schlüssel-Validierungs-Ping (E10 §3.2)', () => {
  test('ok: eine 200-Antwort zeigt "Zugang bestätigt"', async ({ page }) => {
    await page.route('https://api.anthropic.com/v1/messages', async (route: Route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"id":"msg_test"}' });
    });
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('kosmo.onboarded', '1');
      localStorage.setItem('kosmo.panelOffen', '1');
    });
    await page.reload();
    await oeffneCloudEinstellungen(page);

    await page.getByLabel('API-Schlüssel (bleibt auf diesem Gerät)').fill('sk-ant-gueltig');
    const status = page.locator('[data-testid="schluessel-pruefung-status"]');
    await expect(status).toHaveAttribute('data-status', 'ok', { timeout: 5000 });
    await expect(status).toContainText('bestätigt');
  });

  test('fehler:schluessel — eine 401-Antwort zeigt den Schlüssel-Fehler ehrlich', async ({ page }) => {
    await page.route('https://api.anthropic.com/v1/messages', async (route: Route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: '{"error":{"message":"invalid x-api-key"}}',
      });
    });
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('kosmo.onboarded', '1');
      localStorage.setItem('kosmo.panelOffen', '1');
    });
    await page.reload();
    await oeffneCloudEinstellungen(page);

    await page.getByLabel('API-Schlüssel (bleibt auf diesem Gerät)').fill('sk-ant-falsch');
    const status = page.locator('[data-testid="schluessel-pruefung-status"]');
    await expect(status).toHaveAttribute('data-status', 'schluessel', { timeout: 5000 });
    await expect(status).toContainText('ungültig');
  });
});
