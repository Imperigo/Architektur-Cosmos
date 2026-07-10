import { expect, test, type Page } from '@playwright/test';

/**
 * Stream C (v0.6.8) — «Design-Bedienschulden», UI-Beweise:
 * H-15/H-17: die Checks-Liste hat keinen 6er-Deckel mehr, gruppiert nach
 *            Schwere (checks-gruppe-*) und filtert (alle/nur Fehler).
 * H-7:       design.deckeZeichnen hat eine UI-Fläche (Knopf in der
 *            Geschossleiste, NICHT als 19. Werkzeug — der Werkzeugzähler-
 *            Vertrag in oberflaeche-minimal.spec.ts bleibt unberührt).
 * Additiv — bestehende testids («checks», «kennzahlen») unverändert.
 */

async function oeffneKosmoDesign(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="view-2d"]');
}

test('Checks-Panel (H-15/H-17): gruppiert nach Schwere, Filter «nur Fehler» blendet Warnungen aus', async ({
  page,
}) => {
  await oeffneKosmoDesign(page);

  // Eine zu schmale HNF-Zone (2 m < 2.40 m Richtwert) erzeugt eine Warnung,
  // eine Wand mit zu schmaler Tür (700 < 800 mm) eine zweite.
  await page.evaluate(() => {
    const k = window.__kosmo as unknown as {
      run: (id: string, p: unknown) => { patches: { id: string }[] };
      state: () => { activeStoreyId: string | null; doc: { byKind: (kind: string) => { id: string; name?: string }[] } };
    };
    const st = k.state();
    k.run('design.zoneErstellen', {
      storeyId: st.activeStoreyId,
      name: 'Kammer',
      sia: 'HNF',
      outline: [{ x: 0, y: 0 }, { x: 2000, y: 0 }, { x: 2000, y: 4000 }, { x: 0, y: 4000 }],
    });
  });

  const checks = page.locator('[data-testid="checks"]');
  await expect(checks).toBeVisible();
  // Gruppierung: die Warnungen stehen unter einer eigenen Schwere-Gruppe
  await expect(page.locator('[data-testid="checks-gruppe-warnung"]')).toBeVisible();
  await expect(checks).toContainText('Kammer');

  // Filter «Nur Fehler»: ohne Fehler-Befunde verschwindet die Warnungs-Gruppe
  await page.click('[data-testid="checks-filter-fehler"]');
  await expect(page.locator('[data-testid="checks-gruppe-warnung"]')).toBeHidden();
  // zurück auf «Alle»: die Warnung ist wieder da
  await page.click('[data-testid="checks-filter-alle"]');
  await expect(page.locator('[data-testid="checks-gruppe-warnung"]')).toBeVisible();
});

test('deckeZeichnen-Knopf (H-7): erzeugt eine Decke über der Zonen-BBox — ohne 19. Werkzeug', async ({
  page,
}) => {
  await oeffneKosmoDesign(page);

  const decken = () =>
    page.evaluate(
      () =>
        (window.__kosmo as unknown as { state: () => { doc: { byKind: (k: string) => unknown[] } } })
          .state()
          .doc.byKind('slab').length,
    );
  expect(await decken()).toBe(0);

  // Ohne Zonen: der Knopf meldet einen Fehler-Toast statt still nichts zu tun
  await page.click('[data-testid="decke-zeichnen"]');
  expect(await decken()).toBe(0);

  // Mit Zone: ein Klick = eine Decke (BBox der Zonen des Geschosses)
  await page.evaluate(() => {
    const k = window.__kosmo as unknown as {
      run: (id: string, p: unknown) => unknown;
      state: () => { activeStoreyId: string | null };
    };
    k.run('design.zoneErstellen', {
      storeyId: k.state().activeStoreyId,
      name: 'Wohnen',
      sia: 'HNF',
      outline: [{ x: 0, y: 0 }, { x: 6000, y: 0 }, { x: 6000, y: 5000 }, { x: 0, y: 5000 }],
    });
  });
  await page.click('[data-testid="decke-zeichnen"]');
  await expect.poll(decken).toBe(1);
});
