import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[] };
      state: () => {
        activeStoreyId: string | null;
        doc: {
          byKind: (k: string) => { id: string; name?: string }[];
        };
      };
    };
  }
}

/**
 * v0.7.0 (Stream 5A, E5-i/iii) — Varianten-Panel (`VariantenPanel.tsx`):
 * Echtzeit-Anytime-Suche über `derive/variantensuche.ts` (Stream 4A) +
 * die verallgemeinerte Kennzahl-Matrix (`derive/variantenmatrix.ts`,
 * `segmentVariantenMatrix`). Fixture (Footprint 30×14 m, Mittelkorridor
 * 2 m, Mix «preisguenstig» 300 m² HNF → 4 Wohnungen à 75 m²) ist bewusst
 * identisch zur bestehenden Segmentierer-Journey
 * (`e2e/module.spec.ts` «Wohnungs-Segmentierer (V2-F5)», `e2e/sim-mfh.spec.ts`)
 * — dieselbe, bereits bewiesene Geometrie, keine neue Ratequelle für
 * Assertions.
 */

const FOOTPRINT = [
  { x: 0, y: 0 },
  { x: 30000, y: 0 },
  { x: 30000, y: 14000 },
  { x: 0, y: 14000 },
];
const KORRIDOR = [
  { x: 0, y: 6000 },
  { x: 30000, y: 6000 },
  { x: 30000, y: 8000 },
  { x: 0, y: 8000 },
];

async function projektMitKontext(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.panelOffen', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.evaluate(
    ({ footprint, korridor }) => {
      const k = window.__kosmo;
      const st = k.state();
      k.run('design.raumprogrammSetzen', { posten: [{ typ: 'preisguenstig', hnfSoll: 300 }] });
      k.run('design.zoneErstellen', { storeyId: st.activeStoreyId, name: 'Regelgeschoss', sia: 'KF', outline: footprint });
      k.run('design.zoneErstellen', {
        storeyId: st.activeStoreyId,
        name: 'Korridor',
        sia: 'VF',
        raumTyp: 'korridor',
        outline: korridor,
      });
    },
    { footprint: FOOTPRINT, korridor: KORRIDOR },
  );
}

test('Varianten-Panel (E5-i/iii): Start → Zähler > 20 → Top-Karte mit Score → Stopp → Übernehmen → Zonen im Doc → Undo macht alles rückgängig', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await projektMitKontext(page);

  const vorherZonen = await page.evaluate(() => window.__kosmo.state().doc.byKind('zone').length);

  await page.click('[data-testid="varianten-oeffnen"]');
  await expect(page.locator('[data-testid="varianten-panel"]')).toBeVisible();

  await page.click('[data-testid="varianten-panel-start"]');

  // Zähler > 20 (Auftrag).
  await expect
    .poll(
      async () => {
        const text = await page.locator('[data-testid="varianten-panel-zaehler"]').innerText();
        return Number(text.split(' ')[0]);
      },
      { timeout: 15_000 },
    )
    .toBeGreaterThan(20);

  // Top-Karte sichtbar mit Score.
  const karte0 = page.locator('[data-testid="varianten-panel-karte-0"]');
  await expect(karte0).toBeVisible();
  const scoreText = await page.locator('[data-testid="varianten-panel-score-0"]').innerText();
  expect(scoreText).toMatch(/\d+\s*%/);

  // Kennzahl-Matrix (verallgemeinerte variantenmatrix.ts) — mind. 2 Linien,
  // sobald mind. 2 Varianten im Top-N stehen.
  await expect(page.locator('[data-testid="varianten-panel-matrix"]')).toBeVisible();

  // Stopp — der Start-Knopf kehrt zurück (Generator sauber angehalten).
  await page.click('[data-testid="varianten-panel-stopp"]');
  await expect(page.locator('[data-testid="varianten-panel-start"]')).toBeVisible();
  const zaehlerNachStopp = await page.locator('[data-testid="varianten-panel-zaehler"]').innerText();

  // Zähler bewegt sich nach dem Stopp nicht mehr weiter (kein Hintergrund-Loop).
  await page.waitForTimeout(300);
  await expect(page.locator('[data-testid="varianten-panel-zaehler"]')).toHaveText(zaehlerNachStopp);

  // Übernehmen — BESTEHENDER Command-Weg (design.wohnungenSegmentieren,
  // additiv um vorberechneteWohnungen erweitert), EIN Undo-Schritt.
  await page.click('[data-testid="varianten-panel-uebernehmen-0"]');
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('zone').length))
    .toBeGreaterThan(vorherZonen);

  // Undo macht ALLES rückgängig (Zonen zurück auf den Vorher-Stand).
  await page.click('[data-testid="undo"]');
  expect(await page.evaluate(() => window.__kosmo.state().doc.byKind('zone').length)).toBe(vorherZonen);
});

test('Varianten-Panel: gleicher Seed + gleiche Gewichte ⇒ gleiche Top-Variante (zwei Läufe im selben Test)', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await projektMitKontext(page);

  await page.click('[data-testid="varianten-oeffnen"]');
  await expect(page.locator('[data-testid="varianten-panel"]')).toBeVisible();

  // Seed explizit fixieren (Default ist bereits 1 — hier trotzdem
  // ausdrücklich gesetzt, damit der Test nicht von einem UI-Default abhängt,
  // der sich später ändern könnte).
  await page.fill('[data-testid="varianten-panel-seed"]', '7');

  const ZIEL = 300; // grosszügiger, für beide Läufe IDENTISCHER Zähler-Zielwert

  async function laufBisZielUndScore(): Promise<string> {
    await page.click('[data-testid="varianten-panel-start"]');
    await expect
      .poll(
        async () => {
          const text = await page.locator('[data-testid="varianten-panel-zaehler"]').innerText();
          return Number(text.split(' ')[0]);
        },
        { timeout: 20_000 },
      )
      .toBeGreaterThanOrEqual(ZIEL);
    await page.click('[data-testid="varianten-panel-stopp"]');
    await expect(page.locator('[data-testid="varianten-panel-start"]')).toBeVisible();
    return page.locator('[data-testid="varianten-panel-score-0"]').innerText();
  }

  const scoreLauf1 = await laufBisZielUndScore();
  const scoreLauf2 = await laufBisZielUndScore();

  // Deterministischer Generator (Mulberry32, API-Vertrag `derive/
  // variantensuche.ts`): derselbe Seed + dieselben Gewichte + derselbe
  // Kontext (Doc unverändert, nichts wurde in diesem Test übernommen) ⇒
  // dieselbe Sequenz ⇒ nach demselben Zähler-Zielwert dieselbe Top-Variante.
  expect(scoreLauf2).toBe(scoreLauf1);
});
