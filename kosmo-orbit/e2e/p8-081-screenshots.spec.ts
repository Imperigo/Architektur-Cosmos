import { expect, test, type Page } from '@playwright/test';
import { visManuellStorageState } from './helpers/manuell-seed';

/**
 * v0.8.1 / P8 — Abnahme-Screenshots der «Erlebnis-Reste» (Owner-Bericht).
 * Reiner Bild-Beleg (zusätzlich zu den funktionalen Specs `schwarm-orbs.
 * spec.ts`/`kosmo-panel-choreografie.spec.ts`/`vis-onboarding.spec.ts`/
 * `vis-ansichten.spec.ts`/`vis-report-dossier.spec.ts`/`data-vollbild.
 * spec.ts`) — Ablage bewusst unter `test-results/` (Auftrags-Vorgabe),
 * nicht der übliche `e2e-results/`-Failure-Ordner dieser Suite.
 *
 * v0.8.10 E3-Nachtrag (Owner-Entscheid 20.07.2026, `docs/V0810-SPEZ.md` §2
 * E3 Punkt 6): die vis-lastigen Screenshots hier (`tab-ansichten`, Vis-
 * Onboarding-Stepper, Report-Dossier) zeigen Manuell-only-Funktionen ohne
 * Insel-Äquivalent (P-B1-Audit-Fund) — der globale `kosmo.ui.v1`-Seed
 * verliert sein `visOberflaeche`-Feld (Seed-Flip), dieser Per-Spec-Kopf hält
 * die GANZE Datei (auch die Companion-/Data-Screenshots ohne Vis-Bezug)
 * unverändert auf dem heutigen Manuell-Seed (Muster `e2e/helpers/manuell-
 * seed.ts`s `visManuellStorageState()`-Kopfkommentar).
 */
test.use({ storageState: visManuellStorageState() });

declare global {
  interface Window {
    __kosmoCompanion: { setzeVisLauf: (nodeId: string, lauf: unknown) => void };
    __kosmoVisRuntime: {
      fuegeAufnahmeHinzu: (a: { id: string; dataUrl: string; zeit: number; kamera: string }) => void;
    };
  }
}

const WINZIGES_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

test('Screenshot: Schwarm-Orbs (3 Neben-Orbs, Companion)', async ({ page }) => {
  await page.goto('/#companion');
  await page.reload();
  for (const id of ['node-a', 'node-b', 'node-c']) {
    await page.evaluate((nid) => window.__kosmoCompanion.setzeVisLauf(nid, { status: 'rendert', memoKey: 'k' }), id);
  }
  await expect(page.locator('[data-testid^="schwarm-orb-vis-"]')).toHaveCount(3);
  await page.screenshot({ path: 'test-results/p8-081-schwarm-orbs.png' });
});

test('Screenshot: Schliessen-Choreografie-Endzustand (Orb-Austritt)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
  });
  await page.reload();
  await page.click('[data-testid="kosmo-symbol"]');
  await expect(page.locator('[data-testid="kosmo-panel"]')).toBeVisible();
  await page.click('[data-testid="kosmo-panel-schliessen"]');
  await expect(page.locator('[data-testid="kosmo-panel"]')).toHaveClass(/k-panel-austritt-orb/);
  await page.screenshot({ path: 'test-results/p8-081-choreografie-austritt.png' });
  await expect(page.locator('[data-testid="kosmo-panel"]')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/p8-081-choreografie-endzustand.png' });
});

test('Screenshot: gespeicherte Ansicht + Review-Pin', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-vis"]');
  await page.click('[data-testid="tab-ansichten"]');
  await page.evaluate(
    (url) => window.__kosmoVisRuntime.fuegeAufnahmeHinzu({ id: 'snap-1', dataUrl: url, zeit: Date.now(), kamera: 'aktuell' }),
    WINZIGES_PNG,
  );
  await page.click('[data-testid="ansicht-slot-iso-speichern"]');
  await page.click('[data-testid="ansicht-slot-iso-review"]');
  const flaeche = page.locator('[data-testid="ansicht-slot-iso-flaeche"]');
  const box = (await flaeche.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.5);
  await page.fill('[data-testid="review-pin-neu-text"]', 'Fensterlaibung prüfen');
  await page.click('[data-testid="review-pin-neu-speichern"]');
  await expect(page.locator('[data-testid^="review-pin-pin-"]')).toHaveCount(1);
  await page.screenshot({ path: 'test-results/p8-081-gespeicherte-ansicht-review-pin.png' });
});

test('Screenshot: Vis-Onboarding-Stepper', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    // s. `e2e/vis-onboarding.spec.ts` — hebt NUR die webdriver-Sperre auf.
    localStorage.setItem('kosmo.vis.onboarding.erzwingen', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-vis"]');
  await expect(page.locator('[data-testid="vis-onboarding"]')).toBeVisible();
  await page.screenshot({ path: 'test-results/p8-081-vis-onboarding-stepper.png' });
});

async function vis(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-vis"]');
}

test('Screenshot: Report-Dossier/Print', async ({ page }) => {
  await vis(page);
  await page.click('[data-testid="tab-ansichten"]');
  await page.click('[data-testid="vis-report-oeffnen"]');
  await expect(page.locator('[data-testid="vis-report-dossier"]')).toBeVisible();
  await page.screenshot({ path: 'test-results/p8-081-report-dossier-print.png' });
});

test('Screenshot: Datenstation-Vollbild-Knopf', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-data"]');
  await page.waitForSelector('[data-testid="ref-card"]');
  await page.click('[data-testid="data-vollbild"]');
  await page.screenshot({ path: 'test-results/p8-081-datenstation-vollbild.png' });
});
