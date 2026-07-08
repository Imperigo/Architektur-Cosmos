import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * D5 (Wettbewerb-Konzept D-E8, Nacht v0.6.2): Grundlagenstudie-Bericht als
 * eigenständiges SVG-Exportartefakt. Vorbild fürs Download-Muster:
 * `unternehmerplan.spec.ts` (`export-dxf` → `page.waitForEvent('download')`
 * → `download.path()` → `readFileSync`). `e2e/sim/bausteine.ts` wird NUR
 * gelesen (API eingefroren, nicht angefasst) — das StudienPanel selbst hat
 * keinen eigenen Baustein, darum bootstrapt dieser Spec direkt wie die
 * bestehende Baugrenze-Journey in `module.spec.ts` («Baugrenze: setzen, im
 * Grundriss sichtbar …», Zeile 243ff: `design.zoneErstellen` + `studie-
 * toggle`).
 */

async function bootstrapStudien(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG
  await page.evaluate(() => {
    const k = window.__kosmo as {
      run: (id: string, p: unknown) => unknown;
      state: () => { activeStoreyId: string | null };
    };
    const eg = k.state().activeStoreyId;
    k.run('design.zoneErstellen', {
      storeyId: eg,
      name: 'Parzelle',
      sia: 'KF',
      outline: [
        { x: 0, y: 0 },
        { x: 60000, y: 0 },
        { x: 60000, y: 60000 },
        { x: 0, y: 60000 },
      ],
    });
  });
  await page.click('[data-testid="studie-toggle"]');
  await expect(page.locator('[data-testid="studien-panel"]')).toBeVisible();
  // GF-Ziel + max. Höhe so setzen, dass alle Typologien auf der 60×60 m
  // Parzelle entstehen (Fixtur aus `studienbericht.test.ts` im Kernel).
  await page.fill('[data-testid="studie-gf"]', '6000');
  await expect(page.locator('[data-testid="variante-teppich"]')).toBeVisible();
}

async function berichtLaden(page: Page): Promise<string> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="studie-bericht"]'),
  ]);
  expect(download.suggestedFilename()).toBe('grundlagenstudie.svg');
  const pfad = await download.path();
  return readFileSync(pfad!, 'utf8');
}

test('Grundlagenstudie-Bericht: SVG-Download enthält Titel, Variante und Ehrlichkeits-Satz', async ({ page }) => {
  await bootstrapStudien(page);
  const svg = await berichtLaden(page);

  expect(svg).toContain('<svg');
  expect(svg.trim().endsWith('</svg>')).toBe(true);
  expect(svg).toContain('Grundlagenstudie');
  expect(svg).toContain('Teppich'); // Variantenname aus generiereVolumenstudien
  expect(svg).toContain('Anstoss, kein Entwurf');
});

test('Grundlagenstudie-Bericht: ohne Standort/Raumprogramm keine Besonnungs-/Programm-Hinweise (Ehrlichkeitspfad)', async ({ page }) => {
  await bootstrapStudien(page);
  const svg = await berichtLaden(page);

  // Kein Standort, kein Raumprogramm gesetzt ⇒ die Ableitungen laufen im
  // App-Code gar nicht erst an — der Bericht darf NICHTS über Besonnung
  // oder Programm-Erfüllung behaupten (keine erfundenen Kennwerte).
  expect(svg).not.toContain('Winter-Besonnung');
  expect(svg).not.toContain('Programm-Erfüllung');
  expect(svg).not.toContain('Vergleichs-Richtwert zwischen Varianten');
  expect(svg).not.toContain('Gesamt-GF-Vergleich');
});

test('Grundlagenstudie-Bericht: mit Standort + Raumprogramm erscheinen Besonnungs-/Programm-Kennwerte samt Hinweisen', async ({ page }) => {
  await bootstrapStudien(page);
  await page.evaluate(() => {
    const k = window.__kosmo as { run: (id: string, p: unknown) => unknown };
    // design.standortSetzen (lat/lon → Besonnungsvergleich via SunCalc).
    k.run('design.standortSetzen', { label: 'Zug', lat: 47.05, lon: 8.31, e: 2683000, n: 1224000 });
    // design.raumprogrammSetzen (HNF-Soll → Programm-Erfüllung).
    k.run('design.raumprogrammSetzen', { posten: [{ typ: 'marktgerecht', hnfSoll: 5000 }] });
  });
  const svg = await berichtLaden(page);

  expect(svg).toContain('Winter-Besonnung');
  expect(svg).toContain('Programm-Erfüllung');
  expect(svg).toContain('Vergleichs-Richtwert zwischen Varianten'); // BESONNUNG_HINWEIS-Kern
  expect(svg).toContain('Gesamt-GF-Vergleich'); // PROGRAMM_ERFUELLUNG_HINWEIS-Kern
});
