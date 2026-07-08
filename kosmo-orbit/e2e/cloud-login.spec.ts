import { expect, test } from '@playwright/test';

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
  await expect(page.locator('[data-testid="cloud-login-abo"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="cloud-login-status"]')).toContainText('nicht angemeldet');
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
