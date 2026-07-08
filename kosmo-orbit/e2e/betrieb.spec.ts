import { expect, test } from '@playwright/test';

/**
 * V2-B1: Betriebsarten (Standard/Remote/Cloud) + Cloud-Fallback.
 * Der Owner wollte drei Versionen — HomePC, VPN-Client, Cloud — und dass die
 * App, wenn die HomeStation nicht erreichbar ist, direkt Claude (Opus 4.8)
 * anbietet. Beides ohne echten Server prüfbar: der Wechsel schreibt kohärente
 * Adressen, der Fallback zeigt den Bestätigungsdialog.
 */

async function oeffneEinstellungen(page: import('@playwright/test').Page) {
  await page.click('[data-testid="module-design"]');
  await page.click('[aria-label="Einstellungen"]');
  await expect(page.locator('[data-testid="betriebsart"]')).toBeVisible();
}

test('Betriebsart Cloud stellt auf Claude Opus 4.8, Standard führt zum HomePC zurück', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    // Interner Fix (K11): Panel-Default ist jetzt zu (Symbol zuerst) — diese
    // Tests sprechen kosmo-input/das Panel-Innere direkt an.
    localStorage.setItem('kosmo.panelOffen', '1');
  });
  // Interner Fix (K11): reload() ist nötig, damit kosmo.panelOffen VOR dem
  // ersten Mount gilt — sonst hat das evaluate() danach keine Wirkung mehr
  // (useState-Initializer hat schon gelesen).
  await page.reload();
  await oeffneEinstellungen(page);

  await page.click('[data-testid="betriebsart-cloud"]');
  await expect(page.locator('[data-testid="kosmo-panel"]')).toContainText('claude-opus-4-8');
  const cloud = await page.evaluate(() => JSON.parse(localStorage.getItem('kosmo.llm')!));
  expect(cloud.provider).toBe('anthropic');
  expect(cloud.anthropicModel).toBe('claude-opus-4-8');
  expect(cloud.betriebsart).toBe('cloud');

  await page.click('[data-testid="betriebsart-standard"]');
  const stand = await page.evaluate(() => ({
    llm: JSON.parse(localStorage.getItem('kosmo.llm')!),
    bridge: localStorage.getItem('kosmo.bridge'),
    sync: localStorage.getItem('kosmo.sync.url'),
  }));
  expect(stand.llm.provider).toBe('ollama');
  expect(stand.llm.baseUrl).toBe('http://localhost:11434');
  expect(stand.bridge).toBe('http://localhost:8600');
  expect(stand.sync).toBe('ws://localhost:8700');
});

test('Betriebsart Remote leitet Bridge + Sync auf den VPN-Host', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    // Interner Fix (K11): Panel-Default ist jetzt zu (Symbol zuerst) — diese
    // Tests sprechen kosmo-input/das Panel-Innere direkt an.
    localStorage.setItem('kosmo.panelOffen', '1');
  });
  // Interner Fix (K11): reload() ist nötig, damit kosmo.panelOffen VOR dem
  // ersten Mount gilt — sonst hat das evaluate() danach keine Wirkung mehr
  // (useState-Initializer hat schon gelesen).
  await page.reload();
  await oeffneEinstellungen(page);

  await page.click('[data-testid="betriebsart-remote"]');
  await page.getByLabel('HomePC-Adresse (VPN, IP oder Name)').fill('100.87.3.2');
  const s = await page.evaluate(() => ({
    llm: JSON.parse(localStorage.getItem('kosmo.llm')!),
    bridge: localStorage.getItem('kosmo.bridge'),
    sync: localStorage.getItem('kosmo.sync.url'),
  }));
  expect(s.llm.provider).toBe('ollama');
  expect(s.llm.baseUrl).toBe('http://100.87.3.2:11434');
  expect(s.bridge).toBe('http://100.87.3.2:8600');
  expect(s.sync).toBe('ws://100.87.3.2:8700');
});

test('Setup-Assistent zeigt die Werkzeuge der Betriebsart (Standard vs. Cloud)', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    // Interner Fix (K11): Panel-Default ist jetzt zu (Symbol zuerst) — diese
    // Tests sprechen kosmo-input/das Panel-Innere direkt an.
    localStorage.setItem('kosmo.panelOffen', '1');
  });
  // Interner Fix (K11): reload() ist nötig, damit kosmo.panelOffen VOR dem
  // ersten Mount gilt — sonst hat das evaluate() danach keine Wirkung mehr
  // (useState-Initializer hat schon gelesen).
  await page.reload();
  await oeffneEinstellungen(page);

  // Standard: Ollama + Modell + Bridge als Kern, kein VPN/Claude-Schlüssel.
  await page.click('[data-testid="werkzeuge-oeffnen"]');
  await expect(page.locator('[data-testid="werkzeug-setup"]')).toBeVisible();
  await expect(page.locator('[data-testid="werkzeug-ollama"]')).toBeVisible();
  await expect(page.locator('[data-testid="werkzeug-bridge"]')).toBeVisible();
  await expect(page.locator('[data-testid="werkzeug-claude-key"]')).toHaveCount(0);
  await page.locator('[data-testid="werkzeug-setup"]').getByRole('button', { name: 'Schliessen' }).click();

  // Cloud: nur der Claude-Schlüssel.
  await page.click('[data-testid="betriebsart-cloud"]');
  await page.click('[data-testid="werkzeuge-oeffnen"]');
  await expect(page.locator('[data-testid="werkzeug-claude-key"]')).toBeVisible();
  await expect(page.locator('[data-testid="werkzeug-ollama"]')).toHaveCount(0);
});

test('Auto-«Holen» (Block A2/A3): Knopf nur bei Auto-Befehlen, im Browser ehrlich Desktop-only', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    // Interner Fix (K11): Panel-Default ist jetzt zu (Symbol zuerst) — diese
    // Tests sprechen kosmo-input/das Panel-Innere direkt an.
    localStorage.setItem('kosmo.panelOffen', '1');
  });
  // Interner Fix (K11): reload() ist nötig, damit kosmo.panelOffen VOR dem
  // ersten Mount gilt — sonst hat das evaluate() danach keine Wirkung mehr
  // (useState-Initializer hat schon gelesen).
  await page.reload();
  await oeffneEinstellungen(page);
  await page.click('[data-testid="werkzeuge-oeffnen"]');
  await expect(page.locator('[data-testid="werkzeug-setup"]')).toBeVisible();

  // Der Web-Hinweis nennt ehrlich die Desktop-Grenze (im Browser kein Tauri).
  await expect(page.locator('[data-testid="werkzeug-holen-hinweis"]')).toContainText(/Desktop-App/);

  // «Holen» erscheint bei Ollama (hat Auto-Befehle je Plattform) …
  const holen = page.locator('[data-testid="werkzeug-holen-ollama"]');
  await expect(holen).toBeVisible();
  // … aber NICHT beim Sync-Server (kein install-Befehl im Manifest).
  await expect(page.locator('[data-testid="werkzeug-holen-sync"]')).toHaveCount(0);

  // Klick im Browser: ehrlicher Fehler statt stiller Fehlschlag → Knopf geht
  // in den «erneut holen»-Zustand (Ollama ist ~50 MB, keine GB-Rückfrage).
  await holen.click();
  await expect(holen).toHaveText(/erneut holen/, { timeout: 10_000 });
});

test('HomeStation nicht erreichbar → Cloud-Fallback (Opus 4.8) wird angeboten', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.panelOffen', '1');
    // Standard/HomePC, aber auf eine garantiert tote Adresse gezeigt.
    localStorage.setItem(
      'kosmo.llm',
      JSON.stringify({ betriebsart: 'standard', provider: 'ollama', baseUrl: 'http://127.0.0.1:1', model: 'x' }),
    );
  });
  await page.reload();
  await page.click('[data-testid="module-design"]');

  await page.fill('[data-testid="kosmo-input"]', 'Zeichne eine Wand von 0,0 bis 6,0');
  await page.click('[data-testid="kosmo-send"]');

  // Der Bestätigungsdialog erscheint, sobald das lokale Modell nicht antwortet.
  await expect(page.getByText('HomeStation nicht erreichbar')).toBeVisible({ timeout: 15_000 });
  await page.click('[data-testid="bestaetigung-ja"]'); // «Zu Claude wechseln»

  // Ohne Schlüssel: Betriebsart cloud gesetzt, Einstellungen offen zum Eintragen.
  await expect(page.locator('[data-testid="betriebsart"]')).toBeVisible();
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem('kosmo.llm')!));
  expect(s.provider).toBe('anthropic');
  expect(s.betriebsart).toBe('cloud');
  expect(s.anthropicModel).toBe('claude-opus-4-8');
});
