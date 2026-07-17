import { expect, test } from '@playwright/test';

/**
 * PD3a (`docs/ISLAND-UI-SPEZ.md` §4.4/§7 PD3a-Zeile) — Mini-Popups +
 * Einstellungsfenster für ZEICHNEN+ANSICHT am lebenden Objekt:
 *  1. Wand (Referenzmuster): Popup zeigt Aufbau/Dicke/Tragend der
 *     AUSGEWÄHLTEN Wand, das Einstellungsfenster erlaubt einen echten
 *     Aufbau-Wechsel über den Aufbau-Katalog — bewiesen über das
 *     ECHTE Doc (`window.__kosmo.state().doc`, Command→Patch, kein Mock).
 *  2. Sonne (Referenzmuster): Popup + Fenster mit Datum/Zeit/Schatten,
 *     Fenster nennt Standort UND ehrlich, was fehlt (Nachbargebäude/
 *     2h-Nachweis).
 *  3. Ehrlichkeits-Fall: Trace (ANSICHT) — State lebt PlanView-lokal, das
 *     Popup zeigt Status + Anleitung statt einer Attrappe.
 *
 * **Diese Spec setzt den globalen Manuell-Seed selbst ausser Kraft**
 * (`test.use({ storageState: { cookies: [], origins: [] } })`, exakt wie
 * `e2e/island-verdrahtung.spec.ts`) — nur so startet die App im echten
 * Island-Default, ohne den Seed zu berühren (Sanktion 2, `docs/ISLAND-UI-
 * SPEZ.md` §6).
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

/** Hover statt Klick — s. `island-verdrahtung.spec.ts`-Kopfkommentar
 *  («.click() bewegt die Maus zuerst auf die Pill, was onMouseEnter SCHON
 *  auslöst — der eigentliche Klick trifft danach ins Leere»). */
async function oeffneInsel(page: import('@playwright/test').Page, island: string): Promise<void> {
  await page.hover(`[data-testid="island-${island}-pill"]`);
  await expect(page.locator(`[data-testid="island-${island}-leiste"]`)).toBeVisible();
}

interface KosmoTestHook {
  run: (commandId: string, params: unknown) => { patches: { id: string }[] };
  state: () => {
    activeStoreyId: string | null;
    select: (ids: string[]) => void;
    doc: {
      byKind: (kind: string) => { id: string; name?: string; assemblyId?: string }[];
    };
  };
}

/** Zeichnet eine Wand mit dem Standard-Aufbau «AW Beton 36» (Bootstrap,
 *  `project-store.ts`s `bootstrapProject()`) und wählt sie aus — Setup über
 *  den bestehenden Test-Hook `window.__kosmo` (`App.tsx`), kein UI-Umweg
 *  nötig für die Fixture selbst (nur die Insel-Bedienung danach ist der
 *  eigentliche Testinhalt). */
async function zeichneUndWaehleWand(page: import('@playwright/test').Page): Promise<{ wandId: string; aufbau1Id: string; aufbau2Id: string }> {
  return page.evaluate(() => {
    const k = (window as unknown as { __kosmo: KosmoTestHook }).__kosmo;
    const st = k.state();
    const storeyId = st.activeStoreyId!;
    const aufbauten = st.doc.byKind('assembly');
    const aufbau1 = aufbauten.find((a) => a.name === 'AW Beton 36')!;
    const aufbau2 = aufbauten.find((a) => a.name === 'IW Beton 18')!;
    const ergebnis = k.run('design.wandZeichnen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 4000, y: 0 },
      assemblyId: aufbau1.id,
    });
    const wandId = ergebnis.patches[0]!.id;
    st.select([wandId]);
    return { wandId, aufbau1Id: aufbau1.id, aufbau2Id: aufbau2.id };
  });
}

test.describe('PD3a — Wand (Referenzmuster, echte Wirkung)', () => {
  test('Popup zeigt Aufbau/Dicke/Tragend der ausgewählten Wand, Fenster wechselt den Aufbau ECHT', async ({ page }) => {
    await ueberspringeOnboarding(page);
    await page.click('[data-testid="module-design"]');

    const { wandId, aufbau2Id } = await zeichneUndWaehleWand(page);

    await oeffneInsel(page, 'zeichnen');
    await page.click('[data-testid="island-werkzeug-wand"]');
    await expect(page.locator('[data-testid="island-wand-popup"]')).toBeVisible();

    // Stufe 2: Aufbau-Select zeigt den aktuellen Aufbau, Dicke/Tragend sind
    // aus dem ECHTEN Aufbau abgeleitet (nicht hartkodiert).
    await expect(page.locator('[data-testid="island-wand-aufbau"]')).toHaveAttribute('data-value', /aufbau_/);
    // AW Beton 36 = Putz 20 + Dämmung 160 + Beton 180 = 360mm → «0.36 m»
    // (`formatLength`, SIA-Formatierung: Meter mit Punkt, `model/units.ts`).
    await expect(page.locator('[data-testid="island-wand-dicke"]')).toContainText('0.36');
    await expect(page.locator('[data-testid="island-wand-tragend"]')).toContainText('ja');
    await page.screenshot({ path: 'test-results/pd3a-082-wand-stufe2.png' });

    // Eskalation zum Einstellungsfenster (2. Klick).
    await page.click('[data-testid="island-werkzeug-wand"]');
    await expect(page.locator('[data-testid="island-wand-fenster"]')).toBeVisible();
    await expect(page.locator('[data-testid="island-wand-aufbau-katalog"]')).toBeVisible();
    await expect(page.locator('[data-testid="island-wand-laenge"]')).toContainText('4.0');
    await page.screenshot({ path: 'test-results/pd3a-082-wand-stufe3.png' });

    // Echte Wirkung: «anwenden» im Aufbau-Katalog schreibt über
    // design.eigenschaftSetzen aufs ECHTE Doc — kein Mock, kein UI-only-State.
    // IW Beton 18 = Beton 180 = 180mm → «0.18 m».
    await page.click(`[data-testid="island-wand-aufbau-anwenden-${aufbau2Id}"]`);
    await expect(page.locator('[data-testid="island-wand-dicke"]')).toContainText('0.18');

    const wandNachher = await page.evaluate(
      ({ wandId }) => {
        const k = (window as unknown as { __kosmo: KosmoTestHook }).__kosmo;
        return k.state().doc.byKind('wall').find((w) => w.id === wandId);
      },
      { wandId },
    );
    expect(wandNachher?.assemblyId).toBe(aufbau2Id);
  });
});

test.describe('PD3a — Sonne (Referenzmuster)', () => {
  test('Popup und Fenster zeigen Datum/Zeit/Schatten, Fenster nennt Standort und ehrlich, was fehlt', async ({ page }) => {
    await ueberspringeOnboarding(page);
    await page.click('[data-testid="module-design"]');

    await oeffneInsel(page, 'ansicht');
    await page.click('[data-testid="island-werkzeug-sonne"]');
    await expect(page.locator('[data-testid="island-sonne-popup"]')).toBeVisible();
    await expect(page.locator('[data-testid="island-sonne-datum"]')).toBeVisible();
    await expect(page.locator('[data-testid="island-sonne-zeit"]')).toBeVisible();

    // `.check()`/`toBeChecked()` warten intern per Retry-Loop — die klassische
    // `dw-sonne-row` (`DesignWorkspace.tsx`, PD2s `aktiviereIslandWerkzeug`
    // setzt beim ersten Klick den LOKALEN `sonneOffen`-State auf `true`,
    // unabhängig vom Island/Manuell-Modus rendernd) liegt zusätzlich im DOM
    // und kann Playwrights Stabilitäts-Check ausbremsen — ein einfacher,
    // erzwungener Klick + direkte Eigenschafts-Prüfung ist robuster.
    const schatten = page.locator('[data-testid="island-sonne-schatten"]');
    expect(await schatten.isChecked()).toBe(false);
    await schatten.click({ force: true });
    expect(await schatten.isChecked()).toBe(true);

    // Eskalation zum Einstellungsfenster.
    await page.click('[data-testid="island-werkzeug-sonne"]', { force: true });
    await expect(page.locator('[data-testid="island-sonne-fenster"]')).toBeVisible();
    // Der Schatten-Zustand bleibt zwischen Popup und Fenster erhalten
    // (dateilokaler `sonneVorgabe`-Zustand, s. `ansicht.tsx`-Kopfkommentar).
    expect(await page.locator('[data-testid="island-sonne-fenster-schatten"]').isChecked()).toBe(true);
    await expect(page.locator('[data-testid="island-sonne-standort"]')).toContainText('Innerschweiz');
    await expect(page.locator('[data-testid="island-sonne-hinweis-nicht-gebaut"]')).toContainText('noch nicht gebaut');
    await page.screenshot({ path: 'test-results/pd3a-082-sonne-stufe3.png' });
  });
});

test.describe('PD3a — Ehrlichkeits-Fall: Trace (ANSICHT, PlanView-lokaler State)', () => {
  test('Popup und Fenster zeigen ehrlich Status + Anleitung statt einer Attrappe', async ({ page }) => {
    await ueberspringeOnboarding(page);
    await page.click('[data-testid="module-design"]');

    // PD3c (Owner-Befehl) hob den Trace-State in `state/plan-ansicht.ts` —
    // die Insel zeigt seither ECHTE Schalter statt Status+Anleitung
    // (Fable-Nachzug am PD4-Gate: Erwartung an die neue Realität angepasst).
    await oeffneInsel(page, 'ansicht');
    await page.click('[data-testid="island-werkzeug-trace"]');
    await expect(page.locator('[data-testid="island-trace-popup"]')).toBeVisible();
    await expect(page.locator('[data-testid="island-trace-ziel"]')).toBeVisible();

    await page.click('[data-testid="island-werkzeug-trace"]');
    await expect(page.locator('[data-testid="island-trace-fenster"]')).toBeVisible();
  });
});
