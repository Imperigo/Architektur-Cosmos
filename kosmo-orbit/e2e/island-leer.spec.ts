import { expect, test, type Page } from '@playwright/test';
import { waehleOption } from './helfer/waehleOption';

/**
 * PD3c «Island-Modus radikal leer» (Owner-Befehl 17.07.2026, wörtlich:
 * *«achtung ich sehe noch docks und so auf den screenshots z.b die
 * grunddock..alles weg bitte alles in die islands...»*, `docs/ISLAND-UI-
 * SPEZ.md` §6 Sanktion 7, §8 Frage 10).
 *
 * Beweist am lebenden Objekt:
 *  1. Im Island-Modus (Default, KEIN Seed) sind `entwurf-dock`/`boden-dock`/
 *     `statusleiste`/`nav-pan`/`achsen-toggle` NICHT im DOM — Viewer/
 *     Plangrafik, die vier Islands, Ansichts-Info, Stationen-Orb und der
 *     Kosmo-Orb-Zugang bleiben sichtbar. Screenshots in BEIDEN Farbwelten
 *     (Papier + Kosmos).
 *  2. Im Modus 'manuell' sind exakt dieselben Elemente wieder da (Bestand
 *     byte-gleich).
 *  3. Achsen/Trace/Graph über die ANSICHT-Insel wirken ECHT im Plan
 *     (`state/plan-ansicht.ts`) — auch während die PlanView-eigene HUD-Zeile
 *     unsichtbar ist.
 *
 * **Diese Spec setzt den globalen Seed (`playwright.config.ts`, `kosmo.ui.
 * v1` mit `designOberflaeche:'manuell'`) selbst ausser Kraft** — via
 * `test.use({ storageState: { cookies: [], origins: [] } })`, derselbe Weg
 * wie `e2e/island-verdrahtung.spec.ts` — nur ein LEERER Kontext beweist den
 * ECHTEN Produktions-Default `'island'`.
 */

test.use({ storageState: { cookies: [], origins: [] } });

/** `kosmo.onboarded`-Muster (s. `module.spec.ts` u. v. a.). */
async function ueberspringeOnboarding(page: Page, thema?: 'paper' | 'orbit'): Promise<void> {
  await page.goto('/');
  await page.evaluate((t) => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    if (t) localStorage.setItem('kosmo.thema', t);
  }, thema);
  await page.reload();
}

/** Hover statt Klick (s. `island-verdrahtung.spec.ts`-Kommentar): `.click()`
 *  bewegt die Maus erst auf die Pill, was `onMouseEnter` schon auslöst und
 *  die Pill synchron durch die Leiste ersetzt — der Klick selbst träfe dann
 *  ins Leere. Gehovert wird der ROOT-Container (`island-${island}-root`,
 *  IMMER gemountet, egal ob gerade Pill/Leiste/Popup/Fenster steht) statt
 *  der Pill selbst — die dritte Spec unten öffnet dieselbe Insel mehrfach
 *  hintereinander (Achsen → Graph → Trace); nach dem ersten Öffnen existiert
 *  die Pill nicht mehr im DOM (ersetzt durch die Leiste), ein erneutes Hover
 *  auf `-root` löst trotzdem `onMouseEnter` aus und räumt zusätzlich den
 *  900ms-Rückklapp-Timer (`IslandShell.tsx`), falls die Maus zwischen zwei
 *  Aktionen kurz die Insel verlassen hat. */
async function oeffneInsel(page: Page, island: string): Promise<void> {
  await page.hover(`[data-testid="island-${island}-root"]`);
  await expect(page.locator(`[data-testid="island-${island}-leiste"]`)).toBeVisible();
}

/** Die fünf Sammel-Assertions, die in BEIDEN Richtungen (weg/da) gebraucht
 *  werden — ein Ort statt fünffacher Wiederholung. */
async function erwarteAusgeblendeteChrome(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="entwurf-dock"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="boden-dock"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="statusleiste"]')).toHaveCount(0);
  // `nav-pan` kommt aus `NavLeiste.tsx` (`data-testid={'nav-'+a.id}`) — sowohl
  // die 3D- (`nav-3d`) als auch die 2D-Nav-Leiste (`nav-2d`) tragen ein
  // `pan`-Werkzeug; diese EINE Assertion deckt beide Instanzen ab.
  await expect(page.locator('[data-testid="nav-pan"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="achsen-toggle"]')).toHaveCount(0);
  // Dieselbe HUD-Zeile trägt auch Graph/Trace/U-Plan — additiv mitgeprüft
  // (Sanktion 7 nennt die ganze Zeile, nicht nur Achsen).
  await expect(page.locator('[data-testid="graph-toggle"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="trace-select"]')).toHaveCount(0);
}

async function erwarteSichtbareChrome(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="entwurf-dock"]')).toBeVisible();
  await expect(page.locator('[data-testid="boden-dock"]')).toBeVisible();
  await expect(page.locator('[data-testid="statusleiste"]')).toBeVisible();
  await expect(page.locator('[data-testid="nav-pan"]').first()).toBeVisible();
  await expect(page.locator('[data-testid="achsen-toggle"]')).toBeVisible();
  await expect(page.locator('[data-testid="graph-toggle"]')).toBeVisible();
  await expect(page.locator('[data-testid="trace-select"]')).toBeVisible();
}

test.describe('Island-Modus: radikal leer (PD3c)', () => {
  for (const thema of ['paper', 'orbit'] as const) {
    test(`Island-Modus (${thema}): Chrome komplett weg, Viewer/Islands/Kosmo-Orb bleiben`, async ({ page }) => {
      await ueberspringeOnboarding(page, thema);
      await page.click('[data-testid="module-design"]'); // bootstrappt EG/1.OG

      // Viewer/Plangrafik bleiben sichtbar (Owner-Soll: NUR das bleibt +
      // die vier Islands + Ansichts-Info + Stationen-Orb + Kosmo-Orb-Zugang).
      await expect(page.locator('[data-testid="viewport3d"]')).toBeVisible();
      await expect(page.locator('[data-testid="planview"]')).toBeVisible();
      await expect(page.locator('[data-testid="island-zeichnen-pill"]')).toBeVisible();
      await expect(page.locator('[data-testid="island-ansicht-pill"]')).toBeVisible();
      await expect(page.locator('[data-testid="island-projekt-pill"]')).toBeVisible();
      await expect(page.locator('[data-testid="island-austausch-pill"]')).toBeVisible();
      await expect(page.locator('[data-testid="ansichts-info-root"]')).toBeVisible();
      await expect(page.locator('[data-testid="stationen-orb-pill"]')).toBeVisible();
      // Kosmo-Orb-Zugang: `BodenDock` (und sein eingebettetes Symbol) ist weg.
      // PD4 (Island-UI-Strom Abschluss): bis dahin sprang `App.tsx`s
      // freistehendes `<KosmoSymbol>` hier zusätzlich ein — PD4 löst das ab,
      // `DesignWorkspace.tsx` rendert jetzt den echten, spezifizierten
      // Kosmo-Orb (`island/KosmoOrb.tsx`, `kosmo-orb-knopf`) an derselben
      // Stelle; `App.tsx` beschränkt `<KosmoSymbol>` seither auf
      // `screen==='home'` (s. dortigen Kopfkommentar bei der Render-Zeile).
      // Diese eine Assertion widerspricht dem neuen Soll (zwei überlappende
      // Orbs wären falsch) und wechselt darum auf den neuen testid — jede
      // andere Assertion dieser Spec bleibt unverändert.
      await expect(page.locator('[data-testid="kosmo-orb-knopf"]')).toBeVisible();

      await erwarteAusgeblendeteChrome(page);

      await page.screenshot({ path: `test-results/pd3c-082-island-leer-${thema}.png`, fullPage: true });
    });
  }

  test('Manuell-Modus: exakt dieselben Elemente sind wieder da (Bestand unverändert)', async ({ page }) => {
    await ueberspringeOnboarding(page);
    await page.click('[data-testid="module-design"]');

    // Island → Manuell (AUSTAUSCH-Insel, hatPopup=false → Sofort-Umschaltung).
    await oeffneInsel(page, 'austausch');
    await page.click('[data-testid="island-werkzeug-manuell"]');

    await erwarteSichtbareChrome(page);
    // Die Islands selbst verschwinden im Modus 'manuell' (additiv, keine
    // Doppelspurigkeit — Sanktion 6).
    await expect(page.locator('[data-testid="island-zeichnen-pill"]')).toHaveCount(0);

    await page.screenshot({ path: 'test-results/pd3c-082-manuell-unveraendert.png', fullPage: true });
  });

  test('Achsen/Trace/Graph über die ANSICHT-Insel wirken echt im Plan (Island-Modus)', async ({ page }) => {
    await ueberspringeOnboarding(page);
    await page.click('[data-testid="module-design"]');
    // Splitscreen (Default) zeigt Viewport3D UND PlanView gleichzeitig —
    // die Effekte der drei Schalter unten sind direkt im `planview`-SVG
    // beobachtbar, ohne die (im Island-Modus ausgeblendete) HUD-Zeile.
    await expect(page.locator('[data-testid="planview"]')).toBeVisible();

    // `window.__kosmo` (App.tsx-Testhaken) ist in `e2e/` nicht global typisiert
    // (dasselbe Muster wie `module.spec.ts`) — Inline-Cast statt eines
    // zusätzlichen `declare global`-Blocks. `bootstrapProject()` setzt EG als
    // aktives Geschoss (`project-store.ts`); wir lassen es dabei — Trace
    // zielt unten auf das INAKTIVE 1.OG (Trace zeigt sich selbst nie an).
    const { egId, ogId } = await page.evaluate(() => {
      const api = window.__kosmo as {
        state: () => { activeStoreyId: string | null; doc: { byKind: (k: string) => { id: string; name?: string }[] } };
      };
      const st = api.state();
      const og = st.doc.byKind('storey').find((s) => s.name === '1.OG')!;
      return { egId: st.activeStoreyId as string, ogId: og.id };
    });
    // Ein echtes Stützenraster auf dem AKTIVEN Geschoss (EG), sonst hat
    // `plan.axes` nichts zu zeigen — reine Testdaten-Vorbereitung, keine
    // Verhaltensänderung.
    await page.evaluate((storeyId) => {
      (window.__kosmo as { run: (id: string, p: unknown) => unknown }).run('design.rasterSetzen', {
        storeyId,
        achsmass: 4000,
        anzahl: 3,
      });
    }, egId);

    // --- Achsen: hatPopup:false, Sofort-Toggle direkt in der Leiste ---
    await expect(page.locator('[data-testid="grid-achse"]')).toHaveCount(0);
    await oeffneInsel(page, 'ansicht');
    await page.click('[data-testid="island-werkzeug-achsen"]');
    await expect(page.locator('[data-testid="island-toast"]')).toContainText('ACHSEN AKTIV');
    await expect(page.locator('[data-testid="grid-achse"]').first()).toBeVisible();

    // --- Graph: hatPopup:true, echter Checkbox-Schalter (PD3c) ---
    // `toHaveCount(1)` statt `toBeVisible()`: das Geschoss hat (bewusst
    // minimale Testdaten) keine Räume mit `raumTyp` — `graph.kanten`/
    // `zentren` bleiben leer, die `<g data-testid="raumgraph-overlay">`
    // selbst hat dann eine Bounding-Box von 0×0 (Playwright wertet ein
    // Element ohne sichtbaren Inhalt als "hidden", auch wenn es real im DOM
    // steht) — der Store-Effekt zeigt sich trotzdem eindeutig am AN/AUS des
    // DOM-Knotens selbst.
    await expect(page.locator('[data-testid="raumgraph-overlay"]')).toHaveCount(0);
    await oeffneInsel(page, 'ansicht');
    await page.click('[data-testid="island-werkzeug-graph"]');
    await expect(page.locator('[data-testid="island-graph-stufe2"]')).toBeVisible();
    await page.click('[data-testid="island-graph-an"]');
    await expect(page.locator('[data-testid="raumgraph-overlay"]')).toHaveCount(1);

    // --- Trace: hatPopup:true, echter KSelect auf denselben Store (PD3c) ---
    // Gleicher Grund wie beim Graph oben: 1.OG ist bewusst leer (keine
    // Wände) — `toHaveCount(1)` statt `toBeVisible()` auf der Gruppe selbst.
    await expect(page.locator('[data-testid="trace-layer"]')).toHaveCount(0);
    await oeffneInsel(page, 'ansicht');
    await page.click('[data-testid="island-werkzeug-trace"]');
    await expect(page.locator('[data-testid="island-trace-stufe2"]')).toBeVisible();
    await waehleOption(page, 'island-trace-ziel', ogId);
    await expect(page.locator('[data-testid="trace-layer"]')).toHaveCount(1);

    await page.screenshot({ path: 'test-results/pd3c-082-ansicht-insel-schalter.png', fullPage: true });
  });
});
