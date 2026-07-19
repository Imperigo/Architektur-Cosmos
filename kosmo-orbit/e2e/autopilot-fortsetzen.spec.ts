import { expect, test, type Page } from '@playwright/test';

/**
 * v0.8.8 PA5 «Autopilot-Fortsetzung + Runner-Härtung» (`docs/V088-SPEZ.md`
 * §2 D4, §3 E4, §6 Sanktion 4, §7 C-6/C-7) — beweist die neuen Fortsetzen-/
 * Wiederholen-Knöpfe END-TO-END im echten Browser, additiv zu
 * `e2e/autopilot-kern.spec.ts` (PA3, `__kosmoLauf`-Testhook-Weg,
 * UNANGETASTET) und `e2e/autopilot-dialog.spec.ts` (PB1, Dialog-Weg,
 * UNANGETASTET):
 *
 *   - «Ab Schritt N fortsetzen» (`lauf-fortsetzen`) und «Schritt N
 *     wiederholen» (`lauf-wiederholen`) erscheinen NUR im Fehler-/
 *     Abbruch-Zustand (Sanktion 4, C-6) — nie während 'laeuft'/'fertig'.
 *   - Ein Plan ist STATISCH: ein Schritt, der wegen einer fehlenden
 *     `@ref`-Entity scheitert, gelingt erst, NACHDEM die Voraussetzung
 *     manuell im Doc hergestellt wurde (`window.__kosmo.run`, derselbe Weg
 *     wie ein Handgriff des Architekten) — dann lösen fortsetzen()/
 *     wiederholen() die @ref-Referenz frisch gegen den jetzt fortgeschrittenen
 *     Live-Doc auf (C-13-Bestandsmuster, `state/lauf-runtime.ts`).
 *   - Nach einem Abbruch führt «Fortsetzen» NUR die noch offenen Schritte
 *     aus — kein Doppel-Vollzug (Storey-Zählung beweist es).
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
      fortsetzen: () => void;
      wiederholen: (index: number) => void;
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

/** Ein Mini-LaufPlan über drei `design.geschossErstellen`-Schritte (Muster `autopilot-kern.spec.ts`). */
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

/**
 * Zwei Zonen, die BEIDE ein Geschoss "EG" referenzieren, das dieser Plan
 * SELBST nicht anlegt (Schritt 0 legt ein ANDERS benanntes Geschoss an) —
 * Schritt 1 scheitert an der unbekannten `@ref:storey:EG`-Referenz, Schritt
 * 2 bleibt offen. Der Plan ist bewusst STATISCH: eine blosse Wiederholung
 * mit denselben Params würde IMMER wieder scheitern — die Voraussetzung
 * (das Geschoss "EG") muss erst extern hergestellt werden.
 */
function zonenPlanBrauchtEg() {
  const zoneSchritt = (name: string) => ({
    commandId: 'design.zoneErstellen',
    params: {
      storeyId: '@ref:storey:EG',
      outline: [
        { x: 0, y: 0 },
        { x: 4000, y: 0 },
        { x: 4000, y: 4000 },
        { x: 0, y: 4000 },
      ],
      name,
    },
    begruendung: `Braucht ein Geschoss "EG", das dieser Plan selbst NICHT anlegt`,
  });
  return {
    titel: 'Zonen, die ein extern anzulegendes "EG" brauchen',
    schritte: [
      {
        commandId: 'design.geschossErstellen',
        params: { name: 'Anderswo', index: 1, elevation: 3000 },
        begruendung: 'Ein Geschoss, das NICHT "EG" heisst',
      },
      zoneSchritt('Zone A'),
      zoneSchritt('Zone B'),
    ],
  };
}

test.describe('Autopilot-Fortsetzung — Knöpfe nur im Fehler-/Abbruch-Zustand (Sanktion 4, C-6)', () => {
  test('kein Fortsetzen/Wiederholen während "laeuft" oder "fertig"', async ({ page }) => {
    await frischOhnePanel(page);
    await oeffnePanel(page);

    await page.evaluate((plan) => {
      void window.__kosmoLauf.starte(plan);
    }, geschossPlan(200));

    // Während des Laufs ('laeuft'): keine der beiden neuen Knöpfe sichtbar.
    await expect(page.locator('[data-testid="lauf-abbrechen"]')).toBeEnabled();
    await expect(page.locator('[data-testid="lauf-fortsetzen"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="lauf-wiederholen"]')).toHaveCount(0);

    await expect
      .poll(async () => page.evaluate(() => window.__kosmoLauf.zustand().status), { timeout: 30_000 })
      .toBe('fertig');

    // Nach erfolgreichem Abschluss ('fertig'): weiterhin unsichtbar.
    await expect(page.locator('[data-testid="lauf-fortsetzen"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="lauf-wiederholen"]')).toHaveCount(0);
  });
});

test.describe('Autopilot-Fortsetzung — Fehler → Voraussetzung herstellen → Fortsetzen/Wiederholen', () => {
  test('«Schritt wiederholen»: EIN gescheiterter Schritt gelingt nach Herstellen der Voraussetzung, Rest bleibt unberührt', async ({
    page,
  }) => {
    await frischOhnePanel(page);
    await oeffnePanel(page);

    const plan = zonenPlanBrauchtEg();
    await page.evaluate((p) => window.__kosmoLauf.starte(p), plan);

    await expect
      .poll(async () => page.evaluate(() => window.__kosmoLauf.zustand().status), { timeout: 10_000 })
      .toBe('fehler');

    await expect(page.locator('[data-testid="lauf-schritt-0"]')).toHaveClass(/lauf-schritt--ok/);
    await expect(page.locator('[data-testid="lauf-schritt-1"]')).toHaveClass(/lauf-schritt--fehler/);
    await expect(page.locator('[data-testid="lauf-schritt-2"]')).toHaveClass(/lauf-schritt--offen/);
    await expect(page.locator('[data-testid="lauf-schritt-1"]')).toContainText(/@ref:storey:EG/);

    const fortsetzen = page.locator('[data-testid="lauf-fortsetzen"]');
    const wiederholen = page.locator('[data-testid="lauf-wiederholen"]');
    await expect(fortsetzen).toBeVisible();
    await expect(wiederholen).toBeVisible();
    await expect(fortsetzen).toContainText('Schritt 2');
    await expect(wiederholen).toContainText('Schritt 2');

    // Voraussetzung im Doc herstellen — derselbe Weg wie ein Handgriff des
    // Architekten, NICHT über den Lauf selbst (der Plan ist statisch).
    await page.evaluate(() =>
      window.__kosmo.run('design.geschossErstellen', { name: 'EG', index: 0, elevation: 0 }),
    );

    await wiederholen.click();

    // Schritt 1 gelang jetzt, Schritt 2 (Zone B) ist noch NIE gelaufen —
    // bleibt 'offen'. Kein Schritt zeigt mehr 'fehler', also ist der
    // Gesamtstatus NICHT mehr 'fehler' — «angehalten mit Teilergebnis» zählt
    // als 'abgebrochen' (dokumentierter Entscheid, `LaufRunner#gesamtStatus`-
    // Kommentar): genau diese Semantik lässt die Fortsetzen-/Wiederholen-
    // Knöpfe (C-6, nur im Fehler-/Abbruch-Zustand) sichtbar, obwohl NIE
    // `abbrechen()` aufgerufen wurde.
    await expect
      .poll(async () => page.evaluate(() => window.__kosmoLauf.zustand().status), { timeout: 10_000 })
      .toBe('abgebrochen');

    await expect(page.locator('[data-testid="lauf-schritt-1"]')).toHaveClass(/lauf-schritt--ok/);
    await expect(page.locator('[data-testid="lauf-schritt-2"]')).toHaveClass(/lauf-schritt--offen/);

    // Jetzt «Ab Schritt 3 fortsetzen» — Zone B braucht dieselbe (jetzt
    // vorhandene) Voraussetzung und gelingt.
    await expect(page.locator('[data-testid="lauf-fortsetzen"]')).toContainText('Schritt 3');
    await page.locator('[data-testid="lauf-fortsetzen"]').click();

    await expect
      .poll(async () => page.evaluate(() => window.__kosmoLauf.zustand().status), { timeout: 10_000 })
      .toBe('fertig');

    await expect(page.locator('[data-testid="lauf-schritt-0"]')).toHaveClass(/lauf-schritt--ok/);
    await expect(page.locator('[data-testid="lauf-schritt-1"]')).toHaveClass(/lauf-schritt--ok/);
    await expect(page.locator('[data-testid="lauf-schritt-2"]')).toHaveClass(/lauf-schritt--ok/);

    // Beweis über den echten Command-Weg: 2 Geschosse ("Anderswo" + "EG" von
    // aussen) + 2 Zonen (Zone A + Zone B) — GENAU EIN Vollzug je Schritt.
    const storeys = await page.evaluate(() => window.__kosmo.state().doc.byKind('storey').length);
    const zonen = await page.evaluate(() => window.__kosmo.state().doc.byKind('zone').length);
    expect(storeys).toBe(2);
    expect(zonen).toBe(2);

    await page.screenshot({ path: 'e2e-results/pa5-lauf-fehler-fortsetzen.png', fullPage: true });
  });

  test('«Fehler»-Zustand mit beiden Knöpfen — Screenshot-Beleg', async ({ page }) => {
    await frischOhnePanel(page);
    await oeffnePanel(page);

    const plan = zonenPlanBrauchtEg();
    await page.evaluate((p) => window.__kosmoLauf.starte(p), plan);

    await expect
      .poll(async () => page.evaluate(() => window.__kosmoLauf.zustand().status), { timeout: 10_000 })
      .toBe('fehler');

    await expect(page.locator('[data-testid="lauf-fortsetzen"]')).toBeVisible();
    await expect(page.locator('[data-testid="lauf-wiederholen"]')).toBeVisible();
    // Sanktion 4-Beleg: der Abbrechen-Knopf ist im Fehler-Zustand deaktiviert
    // (kein Lauf mehr aktiv) — nur die zwei neuen Knöpfe sind bedienbar.
    await expect(page.locator('[data-testid="lauf-abbrechen"]')).toBeDisabled();

    await page.screenshot({ path: 'e2e-results/pa5-lauf-fehler-zustand.png', fullPage: true });
  });
});

test.describe('Autopilot-Fortsetzung — nach Abbruch (kein Doppel-Vollzug, C-6/C-7)', () => {
  test('«Fortsetzen» nach Abbruch führt NUR die noch offenen Schritte aus — Storey-Zählung beweist es', async ({
    page,
  }) => {
    await frischOhnePanel(page);
    await oeffnePanel(page);

    // N = 400 wie `autopilot-kern.spec.ts`s C-11-Klick-Test: genug Schritte,
    // damit ein ECHTER Klick zuverlässig MITTEN im Lauf landet (ein kleines
    // N lief mit den schnellen `design.geschossErstellen`-Schritten manchmal
    // schon durch, bevor der Klick überhaupt ausgeführt wurde — der Knopf
    // war dann schon wieder deaktiviert).
    const N = 400;
    await page.evaluate((plan) => {
      void window.__kosmoLauf.starte(plan);
    }, geschossPlan(N));

    // Echter Klick auf «Abbrechen», sobald er verfügbar ist — mitten im
    // Lauf, nicht synchron davor (Muster `autopilot-kern.spec.ts`s
    // C-11-Klick-Test): ein Teil der N Schritte ist bereits durchgelaufen.
    const abbrechen = page.locator('[data-testid="lauf-abbrechen"]');
    await expect(abbrechen).toBeEnabled();
    await abbrechen.click();

    await expect
      .poll(async () => page.evaluate(() => window.__kosmoLauf.zustand().status), { timeout: 15_000 })
      .toBe('abgebrochen');

    const standNachAbbruch = await page.evaluate(() => window.__kosmo.state().doc.byKind('storey').length);
    expect(standNachAbbruch).toBeGreaterThan(0);
    expect(standNachAbbruch).toBeLessThan(N);

    await expect(page.locator('[data-testid="lauf-fortsetzen"]')).toBeVisible();
    await page.locator('[data-testid="lauf-fortsetzen"]').click();

    await expect
      .poll(async () => page.evaluate(() => window.__kosmoLauf.zustand().status), { timeout: 30_000 })
      .toBe('fertig');

    const standDanach = await page.evaluate(() => window.__kosmo.state().doc.byKind('storey').length);
    // GENAU N Geschosse — kein Schritt lief doppelt (weder die vor dem
    // Abbruch bereits erledigten NOCH ein versehentlich wiederholter).
    expect(standDanach).toBe(N);

    const zustand = await page.evaluate(() => window.__kosmoLauf.zustand());
    expect(zustand.schritte.every((s) => s.status === 'ok')).toBe(true);
  });
});
