import { expect, test } from '@playwright/test';
import { waehleOption } from './helfer/waehleOption';

/**
 * PD3b (`docs/ISLAND-UI-SPEZ.md` §7 PD3b-Zeile) — Mini-Popups/
 * Einstellungsfenster für PROJEKT+AUSTAUSCH (Kennzahlen/Checks/Varianten/
 * Phase/Liste/Kommentare + Export/Import/Rendern/Blätter/Sync). Dateikreis-
 * disjunkt zu PD3a (`e2e/island-inhalte-zeichnen-ansicht.spec.ts`, sofern im
 * Baum) und zu PD2 (`e2e/island-verdrahtung.spec.ts`, dessen Asserts
 * unverändert bleiben).
 *
 * **Diese Spec setzt den globalen Seed (`playwright.config.ts`, `kosmo.ui.
 * v1` mit `designOberflaeche:'manuell'`) selbst ausser Kraft** — via
 * `test.use({ storageState: { cookies: [], origins: [] } })`, exakt wie
 * `island-verdrahtung.spec.ts` (Sanktion 2, `docs/ISLAND-UI-SPEZ.md` §6):
 * nur so zeigt sich der echte Produktions-Default `'island'`.
 */

test.use({ storageState: { cookies: [], origins: [] } });

async function ueberspringeOnboarding(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
}

/** Hover-Öffnen (§4.1 Stufe 1) — `.hover()`, NICHT `.click()` (Muster aus
 *  `island-verdrahtung.spec.ts`s Kopfkommentar: ein Klick würde die Pill
 *  bereits per `onMouseEnter` wegfächern, bevor der Klick selbst ankommt). */
async function oeffneInsel(page: import('@playwright/test').Page, island: 'projekt' | 'austausch'): Promise<void> {
  await page.hover(`[data-testid="island-${island}-pill"]`);
  await expect(page.locator(`[data-testid="island-${island}-leiste"]`)).toBeVisible();
}

async function oeffnePopup(page: import('@playwright/test').Page, island: 'projekt' | 'austausch', werkzeugId: string): Promise<void> {
  await oeffneInsel(page, island);
  await page.click(`[data-testid="island-werkzeug-${werkzeugId}"]`);
  await expect(page.locator(`[data-testid="island-${werkzeugId}-popup"]`)).toBeVisible();
}

async function eskaliereZuFenster(page: import('@playwright/test').Page, werkzeugId: string): Promise<void> {
  await page.click(`[data-testid="island-werkzeug-${werkzeugId}"]`);
  await expect(page.locator(`[data-testid="island-${werkzeugId}-fenster"]`)).toBeVisible();
}

test('Kennzahlen: Stufe 2 zeigt die NGF live, nachdem eine Zone über den echten Command entsteht', async ({ page }) => {
  await ueberspringeOnboarding(page);
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG

  await oeffnePopup(page, 'projekt', 'kennzahlen');
  await expect(page.locator('[data-testid="island-kennzahlen-ngf"]')).toContainText('Keine Fläche');

  // Test-Hook `window.__kosmo.run` (App.tsx, «Test-Hook für Playwright/
  // KosmoDoc: deterministische Modell-Aufbauten») — derselbe Weg wie andere
  // bestehende Simulations-Specs, kein Umgehen des Command-Wegs (Command →
  // Patch → Undo/Sync läuft unverändert mit).
  await page.evaluate(() => {
    const kosmo = (window as unknown as { __kosmo: { run: (id: string, p: unknown) => { patches: { id: string }[] }; state: () => { setActiveStorey: (id: string) => void } } }).__kosmo;
    const eg = kosmo.run('design.geschossErstellen', { name: 'PD3b-E2E', index: 0, elevation: 0, height: 3000 });
    const storeyId = eg.patches[0]!.id;
    kosmo.state().setActiveStorey(storeyId);
    kosmo.run('design.zoneErstellen', {
      storeyId,
      name: 'Wohnen',
      sia: 'HNF',
      outline: [
        { x: 0, y: 0 },
        { x: 8000, y: 0 },
        { x: 8000, y: 6000 },
        { x: 0, y: 6000 },
      ],
    });
  });

  await expect(page.locator('[data-testid="island-kennzahlen-ngf"]')).toContainText('m²');
  await expect(page.locator('[data-testid="island-kennzahlen-ngf"]')).not.toContainText('Keine Fläche');

  await eskaliereZuFenster(page, 'kennzahlen');
  await expect(page.locator('[data-testid="island-kennzahlen-fenster"] [data-testid="kennzahlen"]')).toBeVisible();
  await page.screenshot({ path: 'test-results/pd3b-082-kennzahlen-stufe2.png' });
});

test('Export wirkt: der echte export-plan.ts-Weg löst einen echten Download aus', async ({ page }) => {
  await ueberspringeOnboarding(page);
  await page.click('[data-testid="module-design"]');

  await oeffnePopup(page, 'austausch', 'export');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="island-export-svg"]'),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.svg$/);
});

test('Ein Deep-Link-Fall (Rendern → KosmoVis): ehrlicher Hinweis, solange DesignWorkspace.tsx die Brücke nicht verdrahtet', async ({ page }) => {
  await ueberspringeOnboarding(page);
  await page.click('[data-testid="module-design"]');

  await oeffnePopup(page, 'austausch', 'rendern');
  await eskaliereZuFenster(page, 'rendern');
  await expect(page.locator('[data-testid="island-rendern-zur-station"]')).toBeVisible();
  await page.click('[data-testid="island-rendern-zur-station"]');
  await expect(page.locator('[data-testid="island-rendern-zur-station-hinweis"]')).toBeVisible();
  await expect(page.locator('[data-testid="island-rendern-zur-station-hinweis"]')).toContainText('§8-4');
  // Ehrlich: kein Stationswechsel geschah (die Brücke ist unverdrahtet).
  await expect(page.locator('[data-testid="island-austausch-root"]')).toBeVisible();
  await page.screenshot({ path: 'test-results/pd3b-082-rendern-stufe3-deep-link.png' });
});

test('Kommentare-Ehrlichkeit: exakter Leerfähigkeits-Text, keine Attrappe', async ({ page }) => {
  await ueberspringeOnboarding(page);
  await page.click('[data-testid="module-design"]');

  await oeffnePopup(page, 'projekt', 'kommentare');
  await expect(page.locator('[data-testid="island-kommentare-stufe2"]')).toHaveText(
    '0 Kommentare — Fähigkeit existiert noch nicht im Kern',
  );

  await eskaliereZuFenster(page, 'kommentare');
  await expect(page.locator('[data-testid="island-kommentare-stufe3"]')).toContainText('§8-6');
  await expect(page.locator('[data-testid="island-kommentare-stufe3"] input')).toHaveCount(0);
  await expect(page.locator('[data-testid="island-kommentare-stufe3"] textarea')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/pd3b-082-kommentare-ehrlichkeit.png' });
});

test('Checks: Filter Alle/Fehler wirkt auf die Insel-Popup-Zahl', async ({ page }) => {
  await ueberspringeOnboarding(page);
  await page.click('[data-testid="module-design"]');

  await oeffnePopup(page, 'projekt', 'checks');
  await expect(page.locator('[data-testid="island-checks-filter-alle"]')).toBeVisible();
  await expect(page.locator('[data-testid="island-checks-filter-fehler"]')).toBeVisible();
  await page.click('[data-testid="island-checks-filter-fehler"]');
  await expect(page.locator('[data-testid="island-checks-filter-fehler"]')).toHaveClass(/pd3b-knopf-aktiv/);
});

test('Phase: Ändern der Plan-Phase im Insel-Popup wirkt auf den echten Store', async ({ page }) => {
  await ueberspringeOnboarding(page);
  await page.click('[data-testid="module-design"]');

  await oeffnePopup(page, 'projekt', 'phase');
  // KSelect ist ein Custom-Dropdown (packages/kosmo-ui/src/select.tsx, seit
  // v0.6.9) — `waehleOption` ist der EINE bestehende E2E-Interaktionsweg
  // dafür (`e2e/helfer/waehleOption.ts`), derselbe wie bei `phase-stil`/
  // `sia-phase-select` im klassischen Projekt-Menü.
  await waehleOption(page, 'island-phase-plan-select', 'werkplan');

  const phase = await page.evaluate(
    () => (window as unknown as { __kosmo: { state: () => { doc: { settings: { phase: string } } } } }).__kosmo.state().doc.settings.phase,
  );
  expect(phase).toBe('werkplan');
});
