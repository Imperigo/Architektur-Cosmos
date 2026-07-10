import { expect, test, type Page } from '@playwright/test';

/**
 * Stream E (v0.6.6 Welle 3) — Kosmo-UI-Brücke (BEWEGUNGSKONZEPT-066 §6): die
 * `ui.*`-Registry (`apps/kosmo-orbit/src/state/ui-befehle.ts`, EINGEFROREN)
 * wird für Kosmo als LLM-Werkzeuge sichtbar (`packages/kosmo-ai/src/tools.ts`
 * `externalTools()`, `apps/kosmo-orbit/src/state/kosmo-ui-werkzeuge.ts`).
 * Mock-Provider-Muster wie `proposal-vorschau.spec.ts`: onboarded +
 * starterGuide.done VOR dem ersten Mount, `kosmo.panelOffen`/`kosmo.llm`
 * (provider=mock) gesetzt, dann `reload()`.
 *
 * `kosmo.ui.v1` mit `modusAutomatik: true`: der Playwright-Default
 * (`playwright.config.ts`) seedet die Automatik AUS (BEWEGUNGSKONZEPT §8) —
 * diese Suite ist (neben `arbeitsmodi.spec.ts`) eine der wenigen, die sie
 * ausdrücklich wieder einschaltet, um den `ui.modusSetzen`/`ui.
 * modusAutomatik`-Pfad am lebenden Objekt zu beweisen.
 */
async function bootstrap(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.panelOffen', '1');
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
    localStorage.setItem(
      'kosmo.ui.v1',
      JSON.stringify({ version: 1, modusAutomatik: true, modusFesthalten: false, phasenFokus: null }),
    );
  });
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG + AW-Aufbau
}

const chip = (page: Page) => page.locator('[data-testid="modus-chip"]');

test('(a) Kosmo-Tool-Call ui.zustandLesen liefert den ECHTEN, live UI-Zustand', async ({ page }) => {
  await bootstrap(page);

  // Ein unverwechselbares Werkzeug von Hand wählen (Default ist «auswahl») —
  // der Test beweist, dass Kosmo den TATSÄCHLICHEN Store liest, keinen
  // eingefrorenen/erfundenen Stand.
  await page.click('[data-testid="tool-treppe"]');

  await page.fill('[data-testid="kosmo-input"]', 'Wie ist der UI-Zustand?');
  await page.click('[data-testid="kosmo-send"]');

  await expect(page.getByText(/Werkzeug treppe/, { exact: false })).toBeVisible({ timeout: 15_000 });
});

test('(b) ui.modusSetzen(\'exportieren\') wechselt den Modus, der Chip zeigt ihn, Chat zeigt die kosmo-ui-aktion-Zeile', async ({
  page,
}) => {
  await bootstrap(page);
  await expect(chip(page)).toContainText('Modus: Voll');

  await page.fill('[data-testid="kosmo-input"]', 'Stell den Modus auf exportieren');
  await page.click('[data-testid="kosmo-send"]');

  await expect(chip(page)).toContainText('Modus: PDF exportieren', { timeout: 15_000 });

  // Sichtbare Ehrlichkeit (Konzept §5/§6): eine eigene Chat-Zeile, testid
  // kosmo-ui-aktion-modus, NICHT eine Diff-/Vorschlags-Karte.
  const zeile = page.locator('[data-testid="kosmo-ui-aktion-modus"]');
  await expect(zeile).toBeVisible();
  await expect(zeile).toContainText('‹PDF exportieren›');
  // Kritik-1-C1 (UI-SELBSTKRITIK-066): die Begründung lebt in der Chat-Zeile.
  await expect(zeile).toContainText('auf Wunsch');
  await expect(page.locator('[data-testid="proposal-card"]')).toHaveCount(0); // KEIN Diff-Karten-Weg
});

test('(c) ui.panelSetzen öffnet ein Panel sichtbar', async ({ page }) => {
  await bootstrap(page);
  await expect(page.locator('[data-testid="kv-panel"]')).toHaveCount(0);

  await page.fill('[data-testid="kosmo-input"]', 'Öffne das KV-Panel');
  await page.click('[data-testid="kosmo-send"]');

  await expect(page.locator('[data-testid="kv-panel"]')).toBeVisible({ timeout: 15_000 });
  const zeile = page.locator('[data-testid="kosmo-ui-aktion-panel"]');
  await expect(zeile).toBeVisible();
  await expect(zeile).toContainText('KV-Panel');
  await expect(zeile).toContainText('geöffnet');
});

test('(d) Kosmo schaltet die Automatik wieder ein — ein von Hand gehaltener Modus bleibt festgehalten, keine stille Übersteuerung', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.panelOffen', '1');
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
    // Automatik startet AUS — wie ein Mensch, der sie selbst ausgeschaltet
    // hätte. Dieser Test prüft genau den Übergang AUS → EIN, ausgelöst durch
    // Kosmo (ui.modusAutomatik), während ein Modus von Hand gehalten wird.
    localStorage.setItem(
      'kosmo.ui.v1',
      JSON.stringify({ version: 1, modusAutomatik: false, modusFesthalten: false, phasenFokus: null }),
    );
  });
  await page.reload();
  // Uhr einfrieren, BEVOR die Design-Werkstatt mountet (Muster
  // arbeitsmodi.spec.ts) — jeder Hysterese-Timer ab hier virtuell steuerbar.
  await page.clock.install();
  await page.click('[data-testid="module-design"]');

  // Modus von Hand halten (Chip-Menü) — Automatik ist noch aus, darum zeigt
  // der Chip «automatik aus», nicht «festgehalten» (die Chip-Beschriftung
  // selbst ist Stream-B-Gebiet, unangetastet).
  await page.click('[data-testid="modus-chip"]');
  await page.click('[data-testid="modus-item-exportieren"]');
  await expect(chip(page)).toContainText('Modus: PDF exportieren');
  await expect(chip(page)).toContainText('automatik aus');

  // Kosmo schaltet die Automatik wieder ein.
  await page.fill('[data-testid="kosmo-input"]', 'Schalte die Automatik ein');
  await page.click('[data-testid="kosmo-send"]');

  const zeile = page.locator('[data-testid="kosmo-ui-aktion-automatik"]');
  await expect(zeile).toBeVisible({ timeout: 15_000 });
  await expect(zeile).toContainText('eingeschaltet');

  // Automatik ist jetzt an, der Chip zeigt darum wieder die Halte-Beschriftung
  // — der gehaltene Modus selbst ist unverändert: kein stiller Override durch
  // den Automatik-Wechsel.
  await expect(chip(page)).toContainText('Modus: PDF exportieren');
  await expect(chip(page)).toContainText('festgehalten');

  // Selbst nach reichlich virtueller Zeit (die Automatik liefe jetzt, mit
  // den Standard-Signalen eines frischen Projekts, auf einen anderen
  // Kandidaten hinaus) bleibt der gehaltene Modus stehen — `modusFesthalten`
  // friert IMMER ein, auch bei aktiver Automatik (arbeitsmodi-kern.ts).
  await page.clock.fastForward(30_000);
  await expect(chip(page)).toContainText('Modus: PDF exportieren');
  await expect(chip(page)).toContainText('festgehalten');
});
