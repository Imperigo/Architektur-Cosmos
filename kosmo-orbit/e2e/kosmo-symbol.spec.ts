import { expect, test, type Page } from '@playwright/test';

/**
 * K11 (Owner-Befund, wörtlich): «Kosmo als Copilot-Symbol, nicht Dauerchat:
 * Hover = Mini-Popup (letzte Aktivität), Klick = entfaltet, volle Interaktion
 * = grosses Panel; Animation wenn Kosmo arbeitet; Speak aktiviert das
 * Symbol.» Batch A1 macht den Panel-Default ZU (`kosmo.panelOffen`) — das
 * schwebende Symbol (`KosmoSymbol.tsx`) ist der Erstkontakt.
 *
 * Bootstrap bewusst OHNE `kosmo.panelOffen` — genau der Erststart-Zustand,
 * den diese Suite beweist (onboarded + starterGuide.done sind gesetzt, damit
 * weder die «Erste Schritte»-Karte noch der Rundgang das Symbol verdecken).
 */
async function frischOhnePanel(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
  });
  await page.reload();
}

test('Erststart: Kosmo-Symbol sichtbar, Kosmo-Panel NICHT im DOM', async ({ page }) => {
  await frischOhnePanel(page);
  await expect(page.locator('[data-testid="kosmo-symbol"]')).toBeVisible();
  await expect(page.locator('[data-testid="kosmo-panel"]')).toHaveCount(0);
  // Persistenz-Flag existiert noch nicht — ehrlicher Erststand, kein «0».
  expect(await page.evaluate(() => localStorage.getItem('kosmo.panelOffen'))).toBeNull();
});

test('Hover (und Fokus) zeigt das Mini-Popup mit der letzten Aktivität', async ({ page }) => {
  await frischOhnePanel(page);
  const symbol = page.locator('[data-testid="kosmo-symbol"]');
  await expect(page.locator('[data-testid="kosmo-mini"]')).toHaveCount(0);

  await symbol.hover();
  const mini = page.locator('[data-testid="kosmo-mini"]');
  await expect(mini).toBeVisible();
  // Vor der ersten echten Antwort zeigt das Popup wenigstens die Begrüssung.
  expect((await mini.innerText()).trim().length).toBeGreaterThan(0);

  // Maus weg → Popup verschwindet wieder (kein Dauerchat-Layout).
  await page.mouse.move(20, 20);
  await expect(mini).toHaveCount(0);

  // Tastatur-Fokus zeigt dasselbe Popup (Zugänglichkeit).
  await symbol.focus();
  await expect(page.locator('[data-testid="kosmo-mini"]')).toBeVisible();
});

test('Einfachklick öffnet die Konversationskarte (E2-Tabelle) — nicht sofort das Panel', async ({ page }) => {
  await frischOhnePanel(page);

  await page.click('[data-testid="kosmo-symbol"]');
  const karte = page.locator('[data-testid="kosmo-karte"]');
  await expect(karte).toBeVisible();
  await expect(page.locator('[data-testid="kosmo-panel"]')).toHaveCount(0);
  // Echter Vorschlagstext (Begrüssung, solange Kosmo noch nie geantwortet hat).
  expect((await page.locator('[data-testid="kosmo-karte-text"]').innerText()).trim().length).toBeGreaterThan(0);
  await expect(page.locator('[data-testid="kosmo-karte-antworten"]')).toBeVisible();
  await expect(page.locator('[data-testid="kosmo-karte-spaeter"]')).toBeVisible();

  // «Später» schliesst nur die Karte — kein Panel-Öffnen.
  await page.click('[data-testid="kosmo-karte-spaeter"]');
  await expect(karte).toHaveCount(0);
  await expect(page.locator('[data-testid="kosmo-panel"]')).toHaveCount(0);
});

test('Doppelklick öffnet das Panel; Senden funktioniert (Mock-Provider); Schliessen bringt das Symbol zurück', async ({
  page,
}) => {
  await frischOhnePanel(page);

  // PB4 (`docs/V084-SPEZ.md` §3 E2 «Orb-Gesetz»): Doppelklick überspringt die
  // Konversationskarte direkt zum grossen Panel.
  await page.dblclick('[data-testid="kosmo-symbol"]');
  await expect(page.locator('[data-testid="kosmo-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="kosmo-symbol"]')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('kosmo.panelOffen'))).toBe('1');

  await page.click('[data-testid="module-design"]');
  await page.fill('[data-testid="kosmo-input"]', 'Zeichne eine Wand von 0,0 bis 6,0');
  await page.click('[data-testid="kosmo-send"]');
  const proposal = page.locator('[data-testid="proposal-card"]').first();
  await expect(proposal).toBeVisible({ timeout: 15_000 });
  await page.click('[data-testid="apply-proposal"]', { timeout: 15_000 });
  await expect(page.getByText('Angewendet', { exact: false })).toBeVisible();

  // Schliessen (× im Panel) → Symbol wieder da, Panel weg.
  await page.click('[aria-label="Schliessen"]');
  await expect(page.locator('[data-testid="kosmo-panel"]')).toHaveCount(0);
  const symbol = page.locator('[data-testid="kosmo-symbol"]');
  await expect(symbol).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('kosmo.panelOffen'))).toBe('0');

  // Mini-Popup zeigt jetzt die reale Aktivität (Wand-Vorschlag), nicht mehr
  // nur die Begrüssung.
  await symbol.hover();
  await expect(page.locator('[data-testid="kosmo-mini"]')).toContainText('Wand');
});

test('Zustand persistiert über Reload — offen bleibt offen, zu bleibt zu', async ({ page }) => {
  await frischOhnePanel(page);

  await page.dblclick('[data-testid="kosmo-symbol"]');
  await expect(page.locator('[data-testid="kosmo-panel"]')).toBeVisible();

  await page.reload();
  await expect(page.locator('[data-testid="kosmo-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="kosmo-symbol"]')).toHaveCount(0);

  // P-F2 (Owner-Feedback 23.07.): `kosmo-toggle` rendert auf der Zentrale
  // (`screen==='home'`) nicht mehr (App.tsx `kopfWerkzeuge()`-Guard, der Orb
  // ist dort der einzige Kosmo-Zugang) — Schliessen läuft hier über das
  // ×-Kreuz im Panel selbst (unverändert vorhanden, s. `KosmoPanel.tsx`).
  await page.click('[aria-label="Schliessen"]');
  await expect(page.locator('[data-testid="kosmo-panel"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="kosmo-symbol"]')).toBeVisible();

  await page.reload();
  await expect(page.locator('[data-testid="kosmo-symbol"]')).toBeVisible();
  await expect(page.locator('[data-testid="kosmo-panel"]')).toHaveCount(0);
});
