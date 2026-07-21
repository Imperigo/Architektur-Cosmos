import { expect, test, type Page } from '@playwright/test';

/**
 * V0812-SPEZ E-H «Ein-Klick-HomeServer» (`docs/V0812-SPEZ.md` §E-H,
 * Sanktion 7, Matrix C-11). Owner wörtlich: «ziel ist es das ich synchro
 * auf ipad per oneklick aktivieren kann … onecklick ganze verbindung mit
 * home pc aktiv macht».
 *
 * EIN Klick auf «Mit Home-PC verbinden» setzt die bestehende Remote-
 * Betriebsart (derselbe Weg wie `KosmoPanel.tsx`s `wechsleBetriebsart`, s.
 * `state/home-server.ts`) auf alle drei HomeStation-Dienste UND probt sie
 * ECHT gegen die im Container laufende Fake-Bridge (:8600) + den echten
 * Sync-Server (:8700, WebSocket-Handshake) — Ollama läuft im Container
 * BEWUSST NICHT (Ehrlichkeitsbeweis), darum bleibt KOSMO-LLM ehrlich «NICHT
 * VERBUNDEN», während BRIDGE/SYNC «VERBUNDEN» zeigen. Genau dieses
 * GEMISCHTE Bild ist der Beweis für Sanktion 7 («ein Chip zeigt VERBUNDEN
 * ohne echten Probe-Erfolg = Paket ungültig») — ein Alles-oder-nichts-Fake
 * könnte dieses gemischte Bild nicht zeigen.
 *
 * E2E-Hinweis (Spec wörtlich): im Playwright-Kontext ist der erreichbare
 * Host `localhost`/`127.0.0.1`, nicht die echte Tailnet-Adresse
 * (`100.88.48.73`, Default) — der Beweis gilt der MECHANIK (Ein-Klick setzt
 * alle drei Endpunkte + probt echt), nicht der konkreten IP. Jeder Test
 * stellt darum zuerst das Host-Feld um.
 */

async function zentraleLaden(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.waitForSelector('[data-testid="module-design"]');
}

async function einstellungenOeffnen(page: Page): Promise<void> {
  await page.click('[data-testid="einstellungen-oeffnen"]');
  await expect(page.locator('[data-testid="einstellungen-homeserver"]')).toBeVisible();
}

async function hostSetzen(page: Page, host: string): Promise<void> {
  const feld = page.locator('[data-testid="homeserver-host"]');
  await feld.fill('');
  await feld.fill(host);
}

test.describe('Ein-Klick-HomeServer — Einstellungen-Sektion', () => {
  test('(a) Ein Klick setzt beweisbar alle drei Endpunkte + gemischtes Ehrlichkeitsbild: BRIDGE/SYNC verbunden, KOSMO-LLM ehrlich nicht verbunden (Sanktion 7)', async ({
    page,
  }) => {
    await zentraleLaden(page);
    await einstellungenOeffnen(page);

    await hostSetzen(page, '127.0.0.1');
    await page.click('[data-testid="homeserver-verbinden"]');

    // Beweisbar: localStorage trägt danach alle drei Endpunkte auf
    // 127.0.0.1 — derselbe Schreibweg wie KosmoPanel.tsx `wechsleBetriebsart`.
    await expect
      .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('kosmo.llm') ?? '{}').betriebsart))
      .toBe('remote');
    const settings = await page.evaluate(() => JSON.parse(localStorage.getItem('kosmo.llm') ?? '{}'));
    expect(settings.remoteHost).toBe('127.0.0.1');
    expect(settings.provider).toBe('ollama');
    expect(settings.baseUrl).toBe('http://127.0.0.1:11434');
    expect(await page.evaluate(() => localStorage.getItem('kosmo.bridge'))).toBe('http://127.0.0.1:8600');
    expect(await page.evaluate(() => localStorage.getItem('kosmo.sync.url'))).toBe('ws://127.0.0.1:8700');

    // Chips — echte Probe-Ergebnisse, kein Fake. `toHaveText` (statt
    // `toContainText`) macht «VERBUNDEN» vs. «NICHT VERBUNDEN» eindeutig.
    await expect(page.locator('[data-testid="homeserver-status-bridge"]')).toHaveText('BRIDGE — VERBUNDEN', {
      timeout: 10_000,
    });
    await expect(page.locator('[data-testid="homeserver-status-sync"]')).toHaveText('SYNC — VERBUNDEN', {
      timeout: 10_000,
    });
    // Ollama läuft im Container bewusst NICHT (Ehrlichkeitsbeweis) — dieser
    // Chip MUSS ehrlich scheitern, sonst wäre Sanktion 7 verletzt.
    await expect(page.locator('[data-testid="homeserver-status-llm"]')).toHaveText('KOSMO-LLM — NICHT VERBUNDEN', {
      timeout: 10_000,
    });

    // «Trennen» erscheint erst jetzt (verbunden).
    await expect(page.locator('[data-testid="homeserver-trennen"]')).toBeVisible();
  });

  test('(b) Trennen stellt die lokale Betriebsart wieder her', async ({ page }) => {
    await zentraleLaden(page);
    await einstellungenOeffnen(page);
    await hostSetzen(page, '127.0.0.1');
    await page.click('[data-testid="homeserver-verbinden"]');
    await expect(page.locator('[data-testid="homeserver-status-bridge"]')).toHaveText('BRIDGE — VERBUNDEN', {
      timeout: 10_000,
    });
    expect(await page.evaluate(() => localStorage.getItem('kosmo.bridge'))).toBe('http://127.0.0.1:8600');

    await page.click('[data-testid="homeserver-trennen"]');

    await expect
      .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('kosmo.llm') ?? '{}').betriebsart))
      .toBe('standard');
    const settings = await page.evaluate(() => JSON.parse(localStorage.getItem('kosmo.llm') ?? '{}'));
    expect(settings.remoteHost).toBe('');
    expect(await page.evaluate(() => localStorage.getItem('kosmo.bridge'))).toBe('http://localhost:8600');
    expect(await page.evaluate(() => localStorage.getItem('kosmo.sync.url'))).toBe('ws://localhost:8700');
    expect(await page.evaluate(() => localStorage.getItem('kosmo.homeserver.verbunden'))).toBe('0');

    // «Trennen»-Knopf verschwindet, wieder «Mit Home-PC verbinden» bereit.
    await expect(page.locator('[data-testid="homeserver-trennen"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="homeserver-verbinden"]')).toBeVisible();
  });

  test('(c) Neuladen behält den verbundenen Zustand — Auto-Reprobe zeigt BRIDGE/SYNC erneut verbunden ohne erneuten Klick', async ({
    page,
  }) => {
    await zentraleLaden(page);
    await einstellungenOeffnen(page);
    await hostSetzen(page, '127.0.0.1');
    await page.click('[data-testid="homeserver-verbinden"]');
    await expect(page.locator('[data-testid="homeserver-status-bridge"]')).toHaveText('BRIDGE — VERBUNDEN', {
      timeout: 10_000,
    });

    await page.reload();
    await page.waitForSelector('[data-testid="module-design"]');
    await einstellungenOeffnen(page);

    // «Trennen» ist SOFORT sichtbar (persistierter Absichts-Merker), noch
    // bevor die Auto-Reprobe zurück ist.
    await expect(page.locator('[data-testid="homeserver-trennen"]')).toBeVisible();
    // Die Auto-Reprobe läuft ohne erneuten Klick auf «Verbinden» und liefert
    // erneut ein echtes, gemischtes Ergebnis.
    await expect(page.locator('[data-testid="homeserver-status-bridge"]')).toHaveText('BRIDGE — VERBUNDEN', {
      timeout: 10_000,
    });
    await expect(page.locator('[data-testid="homeserver-status-sync"]')).toHaveText('SYNC — VERBUNDEN', {
      timeout: 10_000,
    });
    await expect(page.locator('[data-testid="homeserver-status-llm"]')).toHaveText('KOSMO-LLM — NICHT VERBUNDEN', {
      timeout: 10_000,
    });
  });

  test('Token-Feld schreibt kosmo.bridge.token', async ({ page }) => {
    await zentraleLaden(page);
    await einstellungenOeffnen(page);
    const tokenFeld = page.locator('[data-testid="homeserver-token"]');
    await tokenFeld.fill('geheim-abc-123');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('kosmo.bridge.token'))).toBe('geheim-abc-123');
  });

  test('gescheiterte Bridge/Sync-Probe zeigt den Tailscale-Hinweis mit tailscale://-Link', async ({ page }) => {
    await zentraleLaden(page);
    await einstellungenOeffnen(page);
    // TEST-NET-1 (RFC 5737) — garantiert unerreichbar, kein Dienst antwortet
    // je dort; Bridge/Sync scheitern ehrlich über den 1.5s-Timeout.
    await hostSetzen(page, '192.0.2.1');
    await page.click('[data-testid="homeserver-verbinden"]');
    await expect(page.locator('[data-testid="homeserver-status-bridge"]')).toHaveText('BRIDGE — NICHT VERBUNDEN', {
      timeout: 10_000,
    });
    await expect(page.locator('[data-testid="homeserver-tailscale-hinweis"]')).toBeVisible();
    await expect(page.locator('[data-testid="homeserver-tailscale-link"]')).toHaveAttribute('href', 'tailscale://');
  });
});

/**
 * iPad-Beweis (Owner-Kompass 2026-07-20: «iPad erste Klasse», Muster
 * `e2e/start-sequenz.spec.ts` iPad-Describe): der grosse Verbinden-Knopf
 * ist per Tap bedienbar und erfüllt die 44px-Touch-Mindestfläche.
 */
test.describe('iPad 1024×768 (Touch)', () => {
  test.use({ viewport: { width: 1024, height: 768 }, hasTouch: true });

  test('«Mit Home-PC verbinden» ist per Tap bedienbar, ≥44px Trefferhöhe, Chips erscheinen nach dem Tap', async ({
    page,
  }) => {
    await zentraleLaden(page);
    await einstellungenOeffnen(page);
    await hostSetzen(page, '127.0.0.1');

    const knopf = page.locator('[data-testid="homeserver-verbinden"]');
    const box = await knopf.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);

    await knopf.tap();

    await expect(page.locator('[data-testid="homeserver-status-bridge"]')).toHaveText('BRIDGE — VERBUNDEN', {
      timeout: 10_000,
    });
    // «Trennen» ist ein sekundärer Knopf (KButton size="sm") — die
    // 44px-Touch-Vorgabe der Spec gilt ausdrücklich dem GROSSEN
    // «Mit Home-PC verbinden»-Knopf (geprüft oben), nicht jedem Knopf im
    // Panel.
    await expect(page.locator('[data-testid="homeserver-trennen"]')).toBeVisible();
  });
});
