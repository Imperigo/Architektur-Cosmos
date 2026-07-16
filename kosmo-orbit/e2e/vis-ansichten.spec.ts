import { expect, test, type Page } from '@playwright/test';

/**
 * v0.8.1 / P8 (0.7.2-Rest «Viz gespeicherte Ansichten + Review-Pins» +
 * «GPU-Telemetrie», Spec §6.2, B-92/B-105/C-32) — der neue «Ansichten»-Tab
 * in `VisWorkspace.tsx`. Eine `Aufnahme` (Viewport-Snapshot) wird über den
 * additiven Test-Hook `window.__kosmoVisRuntime` geseedet (Muster
 * `window.__kosmoCompanion`) — der echte Aufnahme-Knopf sitzt in
 * `Viewport3D.tsx` (anderes Paket, hier nicht Gegenstand).
 */
declare global {
  interface Window {
    __kosmoVisRuntime: {
      fuegeAufnahmeHinzu: (a: { id: string; dataUrl: string; zeit: number; kamera: string }) => void;
    };
  }
}

async function oeffneVisAnsichten(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    // Der Vis-Onboarding-Stepper (B-102, eigene Suite `vis-onboarding.spec.ts`)
    // zeigt sich sonst beim ERSTEN Besuch als Scrim über der Toolbar und
    // blockt den Tab-Klick — für diese Suite bereits als «gesehen» markiert.
    localStorage.setItem('kosmo.vis.onboarded', '1');
  });
  await page.evaluate(() => localStorage.setItem('kosmo.bridge', 'http://localhost:8600'));
  await page.reload();
  await page.click('[data-testid="module-vis"]');
  await page.click('[data-testid="tab-ansichten"]');
  await expect(page.locator('[data-testid="gespeicherte-ansichten"]')).toBeVisible();
}

const WINZIGES_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

test('Gespeicherte Ansichten: alle drei Slots leer + Speichern gesperrt ohne jede Aufnahme', async ({ page }) => {
  await oeffneVisAnsichten(page);
  for (const slot of ['iso', 'nord', 'detail']) {
    await expect(page.locator(`[data-testid="ansicht-slot-${slot}-leer"]`)).toHaveText('Kein Snapshot gespeichert');
    await expect(page.locator(`[data-testid="ansicht-slot-${slot}-speichern"]`)).toBeDisabled();
  }
});

test('Aktuelle Ansicht speichern füllt den Slot, AUTOSAVE-Badge zählt bei erneutem Speichern hoch', async ({
  page,
}) => {
  await oeffneVisAnsichten(page);
  await page.evaluate(
    (url) => window.__kosmoVisRuntime.fuegeAufnahmeHinzu({ id: 'snap-1', dataUrl: url, zeit: Date.now(), kamera: 'aktuell' }),
    WINZIGES_PNG,
  );

  await page.click('[data-testid="ansicht-slot-iso-speichern"]');
  await expect(page.locator('[data-testid="ansicht-slot-iso-autosave"]')).toHaveText('AUTOSAVE · v001');
  await expect(page.locator('[data-testid="ansicht-slot-iso-bild"]')).toBeVisible();

  // Zweite (neuere) Aufnahme, erneut speichern → v002.
  await page.evaluate(
    (url) => window.__kosmoVisRuntime.fuegeAufnahmeHinzu({ id: 'snap-2', dataUrl: url, zeit: Date.now() + 1000, kamera: 'aktuell' }),
    WINZIGES_PNG,
  );
  await page.click('[data-testid="ansicht-slot-iso-speichern"]');
  await expect(page.locator('[data-testid="ansicht-slot-iso-autosave"]')).toHaveText('AUTOSAVE · v002');
});

test('Review-Modus: Klick auf den Snapshot legt einen Kommentar-Pin an — sichtbar als nummerierter Marker', async ({
  page,
}) => {
  await oeffneVisAnsichten(page);
  await page.evaluate(
    (url) => window.__kosmoVisRuntime.fuegeAufnahmeHinzu({ id: 'snap-1', dataUrl: url, zeit: Date.now(), kamera: 'aktuell' }),
    WINZIGES_PNG,
  );
  await page.click('[data-testid="ansicht-slot-nord-speichern"]');
  await page.click('[data-testid="ansicht-slot-nord-review"]');

  const flaeche = page.locator('[data-testid="ansicht-slot-nord-flaeche"]');
  const box = (await flaeche.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.4);

  await page.fill('[data-testid="review-pin-neu-text"]', 'Fensterlaibung prüfen');
  await page.click('[data-testid="review-pin-neu-speichern"]');

  await expect(page.locator('[data-testid^="review-pin-pin-"]')).toHaveCount(1);
  await expect(page.locator('[data-testid^="review-pin-pin-"]')).toHaveText('1');
});

test('GPU-Telemetrie: ehrliche Fake-Bridge-Meldung im Container, keine erfundene Prozentzahl', async ({ page }) => {
  await oeffneVisAnsichten(page);
  const text = page.locator('[data-testid="vis-gpu-status-text"]');
  // Die Fake-Bridge (`--fake`, CLAUDE.md-Setup) meldet ihr GPU-Feld ehrlich
  // als Simulation gekennzeichnet — diese Komponente übernimmt den Text
  // unverändert, erfindet nie eine Auslastungs-Prozentzahl.
  await expect(text).toHaveText(/GPU: .*(Simulation|nicht verfügbar|nicht erreichbar|prüft)/, { timeout: 15000 });
  await expect(text).not.toHaveText(/\d+\s*%/);
});
