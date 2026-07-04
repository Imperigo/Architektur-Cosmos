import { expect, test } from '@playwright/test';

/**
 * V1-Finish P4: Nahtloses Pairing — die gescannte QR-URL (Hash-Fragment)
 * verbindet automatisch mit dem lokalen Hocuspocus (:8700), die Koppel-
 * Karte zeigt den QR, der Raum-Chip verbindet mit einem Klick.
 * Die zwei sync-abhängigen Tests überspringen sich ehrlich, wenn der
 * Sync-Server nicht läuft (CI startet keinen) — wie sync.spec.ts.
 */

async function serverErreichbar(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:8700', { signal: AbortSignal.timeout(1500) });
    return res.status < 600;
  } catch {
    return false;
  }
}

test('Auto-Connect: URL mit #sync-Fragment verbindet, räumt den Hash und meldet den Raum', async ({ page }) => {
  test.skip(!(await serverErreichbar()), 'Sync-Server auf :8700 läuft nicht');
  const fragment = `#sync=${encodeURIComponent('ws://localhost:8700')}&raum=${encodeURIComponent('pairing-test')}&token=${encodeURIComponent('kosmo-buero')}`;
  await page.goto(`/${fragment}`);
  await expect(page.locator('[data-testid="meldung-erfolg"]')).toContainText('pairing-test');
  // Hash ist weg (nie in der Adresszeile stehen lassen)
  expect(new URL(page.url()).hash).toBe('');
  // Status wird live (Hocuspocus läuft lokal)
  await expect(page.locator('[data-testid="sync-toggle"]')).toContainText(/live/i, { timeout: 10000 });
});

test('«iPad koppeln»: Karte zeigt den QR, der Raum-Chip eines aktiven Kollegen verbindet direkt', async ({ browser, page }) => {
  // Kollege hält einen Raum offen (zweiter Browser-Kontext — das echte Szenario)
  const raum = `buero-${Math.random().toString(36).slice(2, 8)}`;
  const kollege = await (await browser.newContext()).newPage();
  await kollege.goto('/');
  await kollege.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await kollege.click('[data-testid="sync-toggle"]');
  await kollege.fill('[data-testid="sync-room"]', raum);
  await kollege.click('[data-testid="sync-connect"]');
  await expect(kollege.locator('[data-testid="sync-toggle"]')).toContainText(/live/i, { timeout: 10000 });

  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.click('[data-testid="sync-toggle"]');
  await page.click('[data-testid="ipad-koppeln"]');
  const karte = page.locator('[data-testid="koppeln-karte"]');
  await expect(karte).toBeVisible();
  await expect(karte.locator('svg')).toBeVisible();
  await expect(karte).toContainText('iPad-Kamera');

  // Ein-Klick-Join: der Chip des offenen Raums verbindet direkt
  const chip = page.locator('[data-testid="sync-raeume"] button', { hasText: raum });
  await expect(chip).toBeVisible({ timeout: 10000 });
  await chip.dispatchEvent('click');
  await expect(page.locator('[data-testid="sync-toggle"]')).toContainText(/live/i, { timeout: 10000 });
  await page.screenshot({ path: 'e2e-results/p4-pairing.png' });
  await kollege.context().close();
});

test('Härtetest H4d — Hash-Injection: Nicht-ws-Adresse wird abgelehnt, kein Connect, Hash geräumt', async ({ page }) => {
  await page.goto(`/#sync=${encodeURIComponent('javascript:alert(1)')}&raum=boese`);
  await expect(page.locator('[data-testid="meldung-fehler"]')).toContainText('abgelehnt');
  expect(new URL(page.url()).hash).toBe('');
  await expect(page.locator('[data-testid="sync-toggle"]')).toContainText('Sync aus');
});
