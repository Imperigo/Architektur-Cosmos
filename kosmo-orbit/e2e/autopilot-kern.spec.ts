import { expect, test, type Page } from '@playwright/test';

/**
 * v0.8.5 PA3 «Autopilot-Kern» (`docs/V085-SPEZ.md` §3 E4, C-8/C-9/C-10) —
 * beweist den Kosmo-Lauf END-TO-END im echten Browser:
 *
 *   - `window.__kosmoLauf.starte(plan)` — GENAU der Weg, über den ein Lauf
 *     entsteht (Muster `e2e/vis-demolauf.spec.ts`s `window.__kosmo.run`):
 *     kein UI-Klick ersetzt diesen Auslöser, es gibt (Stand PA3) noch keinen
 *     Kosmo-Dialog-Knopf dafür — der Beweis läuft über dieselbe Naht, über
 *     die auch ein künftiger Dialog den Lauf anstossen würde.
 *   - Jeder Schritt läuft über den ECHTEN `design.*`-Kernel-Command-Weg
 *     (`window.__kosmo.run` bestätigt denselben Doc-Zustand), NICHT an
 *     `runCommand` vorbei (Sanktion 3, V085-SPEZ §6).
 *   - `KosmoPanel.tsx` zeigt die Schrittliste (`lauf-plan-root`/
 *     `lauf-schritt-<i>`/`lauf-abbrechen`, additive testids).
 *   - C-10-Beweis: OHNE einen expliziten `starte()`-Aufruf existiert nie ein
 *     Lauf — auch nicht nach dem blossen Öffnen des Panels.
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[] };
      state: () => {
        doc: {
          byKind: (k: string) => { id: string }[];
        };
      };
    };
    __kosmoLauf: {
      starte: (plan: {
        titel: string;
        schritte: { commandId: string; params: unknown; begruendung: string }[];
      }) => void;
      abbrechen: () => void;
      zustand: () => {
        plan: { titel: string; schritte: unknown[] } | null;
        schritte: { status: string; ergebnis?: string; fehler?: string }[];
        status: string;
      };
    };
  }
}

async function frischOhnePanel(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
  });
  await page.reload();
}

async function oeffnePanel(page: Page): Promise<void> {
  await page.dblclick('[data-testid="kosmo-symbol"]');
  await expect(page.locator('[data-testid="kosmo-panel"]')).toBeVisible();
}

/** Ein Mini-LaufPlan über drei `design.geschossErstellen`-Schritte. */
function geschossPlan(anzahl: number) {
  return {
    titel: 'Geschosse für den Rohbau',
    schritte: Array.from({ length: anzahl }, (_, i) => ({
      commandId: 'design.geschossErstellen',
      params: { name: `Geschoss ${i}`, index: i, elevation: i * 3000 },
      begruendung: `Legt Geschoss ${i} für den Rohbau an`,
    })),
  };
}

test('C-10: ohne explizite Aktion existiert kein Lauf — auch nicht nach dem Öffnen des Panels', async ({ page }) => {
  await frischOhnePanel(page);
  await oeffnePanel(page);
  await expect(page.locator('[data-testid="lauf-plan-root"]')).toHaveCount(0);
});

test('Schrittliste erscheint mit Titel + Begründungen und läuft bis "fertig" durch', async ({ page }) => {
  await frischOhnePanel(page);
  await oeffnePanel(page);

  await page.evaluate((plan) => window.__kosmoLauf.starte(plan), geschossPlan(3));

  const root = page.locator('[data-testid="lauf-plan-root"]');
  await expect(root).toBeVisible();
  await expect(root).toContainText('Geschosse für den Rohbau');
  await expect(page.locator('[data-testid="lauf-schritt-0"]')).toContainText('Legt Geschoss 0 für den Rohbau an');
  await expect(page.locator('[data-testid="lauf-schritt-1"]')).toContainText('Legt Geschoss 1 für den Rohbau an');
  await expect(page.locator('[data-testid="lauf-schritt-2"]')).toContainText('Legt Geschoss 2 für den Rohbau an');

  await expect
    .poll(async () => page.evaluate(() => window.__kosmoLauf.zustand().status), { timeout: 10_000 })
    .toBe('fertig');
  await expect(page.locator('[data-testid="lauf-schritt-0"]')).toHaveClass(/lauf-schritt--ok/);
  await expect(page.locator('[data-testid="lauf-schritt-1"]')).toHaveClass(/lauf-schritt--ok/);
  await expect(page.locator('[data-testid="lauf-schritt-2"]')).toHaveClass(/lauf-schritt--ok/);

  // Beweis: die Schritte liefen wirklich über den echten Command-Weg — drei
  // neue Geschosse stehen im Doc (Sanktion 3 V085-SPEZ §6).
  const storeys = await page.evaluate(() => window.__kosmo.state().doc.byKind('storey').length);
  expect(storeys).toBe(3);

  await page.screenshot({ path: 'e2e-results/pa3-lauf-anzeige.png', fullPage: true });
});

test('Abbrechen wirkt: stoppt vor dem nächsten Schritt, der bereits begonnene Schritt bleibt gültig', async ({ page }) => {
  await frischOhnePanel(page);
  await oeffnePanel(page);

  // starte()+abbrechen() im SELBEN evaluate()-Aufruf. Seit dem C-11-Fix
  // (v0.8.6: Macrotask-Yield VOR jedem Schritt, `lauf-runner.ts`) greift
  // dieser synchrone Abbruch schon VOR Schritt 0 — es läuft GAR KEIN
  // Schritt mehr, das Doc bleibt unberührt.
  await page.evaluate((plan) => {
    window.__kosmoLauf.starte(plan);
    window.__kosmoLauf.abbrechen();
  }, geschossPlan(3));

  await expect
    .poll(async () => page.evaluate(() => window.__kosmoLauf.zustand().status), { timeout: 10_000 })
    .toBe('abgebrochen');

  await expect(page.locator('[data-testid="lauf-schritt-0"]')).toHaveClass(/lauf-schritt--offen/);
  await expect(page.locator('[data-testid="lauf-schritt-1"]')).toHaveClass(/lauf-schritt--offen/);
  await expect(page.locator('[data-testid="lauf-schritt-2"]')).toHaveClass(/lauf-schritt--offen/);

  const storeys = await page.evaluate(() => window.__kosmo.state().doc.byKind('storey').length);
  expect(storeys).toBe(0); // kein Schritt schrieb ins Doc

  // Der Abbrechen-Knopf ist jetzt deaktiviert (kein Lauf mehr aktiv).
  await expect(page.locator('[data-testid="lauf-abbrechen"]')).toBeDisabled();
});

test('C-11 (v0.8.6): Abbrechen per ECHTEM Klick — der Lauf ist für reale Eingaben unterbrechbar', async ({
  page,
}) => {
  await frischOhnePanel(page);
  await oeffnePanel(page);

  // 400 Schritte + Macrotask-Yield je Schritt (C-11-Fix, lauf-runner.ts)
  // öffnen ein reales Klick-Fenster — exakt der Matrix-Angriff, der vorher
  // 0/400 Abbrüche schaffte, weil die Schleife in EINEM Task durchlief.
  await page.evaluate((plan) => {
    void window.__kosmoLauf.starte(plan);
  }, geschossPlan(400));

  const abbrechen = page.locator('[data-testid="lauf-abbrechen"]');
  await expect(abbrechen).toBeEnabled();
  await abbrechen.click();

  await expect
    .poll(async () => page.evaluate(() => window.__kosmoLauf.zustand().status), { timeout: 15_000 })
    .toBe('abgebrochen');

  // Es liefen echte Schritte (der Lauf war wirklich unterwegs), aber NICHT
  // alle — und nach dem Abbruch kommt kein weiterer dazu.
  const stand = await page.evaluate(() => window.__kosmo.state().doc.byKind('storey').length);
  expect(stand).toBeGreaterThan(0);
  expect(stand).toBeLessThan(401);
  await page.waitForTimeout(400);
  const stand2 = await page.evaluate(() => window.__kosmo.state().doc.byKind('storey').length);
  expect(stand2).toBe(stand);
});

test('Fehler-Schritt stoppt den Lauf ehrlich — kein Weiterlaufen, Rest bleibt offen', async ({ page }) => {
  await frischOhnePanel(page);
  await oeffnePanel(page);

  const plan = {
    titel: 'Absichtlich fehlerhafter Lauf',
    schritte: [
      { commandId: 'design.geschossErstellen', params: { name: 'EG', index: 0, elevation: 0 }, begruendung: 'EG zuerst' },
      // `elevation` fehlt bewusst — das zod-Schema von design.geschossErstellen
      // lehnt ab, execute() wirft eine CommandError.
      { commandId: 'design.geschossErstellen', params: { name: 'Kaputt', index: 1 }, begruendung: 'absichtlich ungültig' },
      { commandId: 'design.geschossErstellen', params: { name: '2.OG', index: 2, elevation: 6000 }, begruendung: 'wird nie erreicht' },
    ],
  };
  await page.evaluate((p) => window.__kosmoLauf.starte(p), plan);

  await expect
    .poll(async () => page.evaluate(() => window.__kosmoLauf.zustand().status), { timeout: 10_000 })
    .toBe('fehler');

  await expect(page.locator('[data-testid="lauf-schritt-0"]')).toHaveClass(/lauf-schritt--ok/);
  await expect(page.locator('[data-testid="lauf-schritt-1"]')).toHaveClass(/lauf-schritt--fehler/);
  await expect(page.locator('[data-testid="lauf-schritt-2"]')).toHaveClass(/lauf-schritt--offen/);
  // Die Fehlermeldung ist in der Anzeige sichtbar, nicht nur im Store.
  await expect(page.locator('[data-testid="lauf-schritt-1"]')).toContainText(/elevation|Ungültige Parameter/i);

  const storeys = await page.evaluate(() => window.__kosmo.state().doc.byKind('storey').length);
  expect(storeys).toBe(1); // Schritt 3 lief NIE
});

test('Je Schritt eine eigene Undo-Gruppe: EIN Ctrl+Z macht nur den letzten Schritt rückgängig', async ({ page }) => {
  await frischOhnePanel(page);
  await oeffnePanel(page);

  await page.evaluate((plan) => window.__kosmoLauf.starte(plan), geschossPlan(2));
  await expect
    .poll(async () => page.evaluate(() => window.__kosmoLauf.zustand().status), { timeout: 10_000 })
    .toBe('fertig');

  expect(await page.evaluate(() => window.__kosmo.state().doc.byKind('storey').length)).toBe(2);

  // Fokus weg vom Chat-Eingabefeld (App.tsx `VerlaufKurztasten` lässt
  // Ctrl+Z in einem `<input>`/`<textarea>` bewusst durch — Browser-Text-Undo).
  await page.locator('[data-testid="lauf-plan-root"]').click();
  await page.keyboard.press('Control+z');
  await expect
    .poll(async () => page.evaluate(() => window.__kosmo.state().doc.byKind('storey').length))
    .toBe(1);

  await page.keyboard.press('Control+z');
  await expect
    .poll(async () => page.evaluate(() => window.__kosmo.state().doc.byKind('storey').length))
    .toBe(0);
});
