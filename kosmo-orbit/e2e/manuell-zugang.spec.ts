import { expect, test, type Page } from '@playwright/test';

/**
 * E-K15/2 «Manuelle Ansicht = EIN Konzept für alle Stationen», Schritt 2
 * (`docs/V090-SPEZ.md` §E-K15, Fable-Entscheide in
 * `docs/KONZEPT-MANUELL-ALLE-STATIONEN.md`). Beweist die additiven
 * Einstellungen-Checkboxen `einstellung-design-manuell` /
 * `einstellung-publish-manuell` / `einstellung-prepare-manuell`
 * (`shell/Einstellungen.tsx`), die GENAU denselben Store lesen/schreiben
 * wie die bestehenden Insel-Werkzeuge `island-werkzeug-manuell` der drei
 * Stationen (`state/ui-zustand.ts` — `designOberflaeche`/
 * `publishOberflaeche`/`prepareOberflaeche`, alle `kosmo.ui.v1`):
 *
 *  1. Checkbox AN schaltet die Oberfläche beweisbar um (bestehende
 *     Manuell-/Island-Merkmale der Station als Beweis, s.
 *     `docs/KONZEPT-MANUELL-ALLE-STATIONEN.md` §1.1/§1.3/§1.4).
 *  2. Der Insel-Weg (Insel-Werkzeug vorwärts, `island-zurueck` rückwärts)
 *     zeigt DENSELBEN Zustand — ein Zustand, zwei gleichwertige Zugänge:
 *     Checkbox AN → Insel-Rückweg AUS, Checkbox spiegelt das nach dem
 *     Wiederöffnen der Einstellungen; UND umgekehrt Insel-Werkzeug AN →
 *     Checkbox spiegelt AN.
 *  3. Reload behält den über die Checkbox gesetzten Zustand
 *     (`kosmo.ui.v1`-Persistenz, unverändert).
 *  4. Vis-Checkbox (`einstellung-vis-manuell`, seit 0.8.10 E3) bleibt
 *     unverändert funktionsfähig — Bestandsschutz, kein Vertragsbruch.
 *
 * Vis' entfernter Insel-Zugang wird NICHT wiederhergestellt (Fable-
 * Entscheid Punkt 2 im Konzeptdokument) — dort bleibt der Checkbox-Weg
 * der EINZIGE Vorwärtszugang, wie schon in `vis-oberflaeche.spec.ts`
 * bewiesen.
 *
 * **Diese Spec setzt den globalen Manuell-Seed (`playwright.config.ts`,
 * `kosmo.ui.v1` mit `designOberflaeche`/`publishOberflaeche`/
 * `prepareOberflaeche:'manuell'`) selbst ausser Kraft** — via
 * `test.use({ storageState: { cookies: [], origins: [] } })`, exakt wie
 * `island-verdrahtung.spec.ts`/`publish-island.spec.ts`/`prepare-island.
 * spec.ts`/`vis-oberflaeche.spec.ts`. Nur ein leerer Kontext zeigt den
 * echten Produktions-Default `'island'`, den die Checkbox dann gezielt
 * umschaltet. `playwright.config.ts` und `e2e/helpers/manuell-seed.ts`
 * werden dafür NICHT angefasst (harte Auflage, Befund 5 im
 * Konzeptdokument).
 */

test.use({ storageState: { cookies: [], origins: [] } });

async function ueberspringeOnboarding(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.bridge', 'http://localhost:8600');
  });
  await page.reload();
}

/** Öffnet die AUSTAUSCH-Insel per Hover über die Insel-Wurzel — Muster
 *  `publish-island.spec.ts`/`prepare-island.spec.ts` (funktioniert auch für
 *  Design, s. dortiger Kommentar «andere Stationen hovern über die ganze
 *  Insel-Wurzel»). */
async function oeffneAustauschInsel(page: Page): Promise<void> {
  await page.hover('[data-testid="island-austausch-root"]');
  await expect(page.locator('[data-testid="island-austausch-leiste"]')).toBeVisible();
}

interface StationsBeleg {
  name: string;
  modul: string;
  checkboxTestid: string;
  islandPillTestid: string;
  manuellMerkmalTestid: string;
}

const STATIONEN: StationsBeleg[] = [
  {
    name: 'KosmoDesign',
    modul: 'module-design',
    checkboxTestid: 'einstellung-design-manuell',
    islandPillTestid: 'island-zeichnen-pill',
    manuellMerkmalTestid: 'design-werkzeugleiste',
  },
  {
    name: 'KosmoPublish',
    modul: 'module-publish',
    checkboxTestid: 'einstellung-publish-manuell',
    islandPillTestid: 'island-blatt-pill',
    manuellMerkmalTestid: 'publish-werkzeugleiste',
  },
  {
    name: 'KosmoPrepare',
    modul: 'module-prepare',
    checkboxTestid: 'einstellung-prepare-manuell',
    islandPillTestid: 'island-aufnahme-pill',
    manuellMerkmalTestid: 'prepare-werkzeugleiste',
  },
];

for (const station of STATIONEN) {
  test.describe(`E-K15/2 — additiver Einstellungen-Zugang (${station.name})`, () => {
    test(`(1)+(2a) Checkbox AN schaltet auf Manuell um, Insel-Rückweg AUS spiegelt sich zurück in die Checkbox`, async ({
      page,
    }) => {
      await ueberspringeOnboarding(page);
      await page.click(`[data-testid="${station.modul}"]`);

      // Default ohne Seed: Island — der Einstellungs-Kreis der Insel-UI ist
      // sichtbar (bodenDockAusgeblendet), die klassische Werkzeugleiste fehlt.
      await expect(page.locator(`[data-testid="${station.islandPillTestid}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="${station.manuellMerkmalTestid}"]`)).toHaveCount(0);

      await page.click('[data-testid="island-einstellungen-kreis"]');
      await expect(page.locator('[data-testid="einstellungen-panel"]')).toBeVisible();
      const schalter = page.locator(`[data-testid="${station.checkboxTestid}"]`);
      await schalter.scrollIntoViewIfNeeded();
      await expect(schalter).not.toBeChecked();
      await page.screenshot({ path: `e2e-results/manuell-zugang-${station.modul}-einstellungen-vor-umschalten.png` });

      // Checkbox AN → Manuell-Chrome erscheint, Island-Pille verschwindet.
      await schalter.check();
      await expect(schalter).toBeChecked();
      await page.click('[data-testid="einstellungen-panel"] [aria-label="Schliessen"]');
      await expect(page.locator(`[data-testid="${station.manuellMerkmalTestid}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="${station.islandPillTestid}"]`)).toHaveCount(0);
      const zurueck = page.locator('[data-testid="island-zurueck"]');
      await expect(zurueck).toBeVisible();
      await page.screenshot({ path: `e2e-results/manuell-zugang-${station.modul}-manuell-ueber-checkbox.png` });

      // Insel-Rückweg AUS ('manuell' → 'island') — derselbe Zustand, der
      // zweite Zugang. Die klassische Werkzeugleiste verschwindet wieder.
      await zurueck.click();
      await expect(page.locator(`[data-testid="${station.islandPillTestid}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="${station.manuellMerkmalTestid}"]`)).toHaveCount(0);

      // Wiederöffnen der Einstellungen: die Checkbox spiegelt den über den
      // Insel-Rückweg gesetzten Zustand — EIN Zustand, kein zweiter Speicher.
      await page.click('[data-testid="island-einstellungen-kreis"]');
      await expect(page.locator(`[data-testid="${station.checkboxTestid}"]`)).not.toBeChecked();
    });

    test('(2b) Insel-Werkzeug schaltet auf Manuell um — die Checkbox spiegelt denselben Zustand (ein Zustand, zwei Zugänge)', async ({
      page,
    }) => {
      await ueberspringeOnboarding(page);
      await page.click(`[data-testid="${station.modul}"]`);
      await expect(page.locator(`[data-testid="${station.islandPillTestid}"]`)).toBeVisible();

      // Vorwärtsweg über das bestehende Insel-Werkzeug (UNVERÄNDERT).
      await oeffneAustauschInsel(page);
      await page.click('[data-testid="island-werkzeug-manuell"]');
      await expect(page.locator(`[data-testid="${station.manuellMerkmalTestid}"]`)).toBeVisible();

      // In Manuell ist der Insel-Kreis weg (`bodenDockAusgeblendet` false) —
      // der klassische Kopfbalken-Zahnrad ist jetzt der Einstellungs-Zugang.
      await expect(page.locator('[data-testid="island-einstellungen-kreis"]')).toHaveCount(0);
      await page.click('[data-testid="einstellungen-oeffnen"]');
      await expect(page.locator('[data-testid="einstellungen-panel"]')).toBeVisible();
      const schalter = page.locator(`[data-testid="${station.checkboxTestid}"]`);
      await schalter.scrollIntoViewIfNeeded();
      await expect(schalter).toBeChecked();
      await page.screenshot({ path: `e2e-results/manuell-zugang-${station.modul}-checkbox-spiegelt-insel.png` });

      // Checkbox AUS bringt Island zurück (zweiter Zugang, gleiche Wirkung
      // wie `island-zurueck`).
      await schalter.uncheck();
      await page.click('[data-testid="einstellungen-panel"] [aria-label="Schliessen"]');
      await expect(page.locator(`[data-testid="${station.islandPillTestid}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="${station.manuellMerkmalTestid}"]`)).toHaveCount(0);
    });

    test('(3) Reload behält den über die Checkbox gesetzten Manuell-Zustand', async ({ page }) => {
      await ueberspringeOnboarding(page);
      await page.click(`[data-testid="${station.modul}"]`);

      await page.click('[data-testid="island-einstellungen-kreis"]');
      await expect(page.locator('[data-testid="einstellungen-panel"]')).toBeVisible();
      await page.locator(`[data-testid="${station.checkboxTestid}"]`).check();
      await page.click('[data-testid="einstellungen-panel"] [aria-label="Schliessen"]');
      await expect(page.locator(`[data-testid="${station.manuellMerkmalTestid}"]`)).toBeVisible();

      // Reload — `screen` selbst ist ein flüchtiger App.tsx-`useState` (nie
      // persistiert, bestehendes Verhalten), ein Reload landet darum immer
      // erst auf der Zentrale; das Modul-Icon führt gezielt zurück.
      await page.reload();
      await page.click(`[data-testid="${station.modul}"]`);
      await expect(page.locator(`[data-testid="${station.manuellMerkmalTestid}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="${station.islandPillTestid}"]`)).toHaveCount(0);
    });
  });
}

test.describe('E-K15/2 — Bestandsschutz: die Vis-Checkbox bleibt unverändert funktionsfähig', () => {
  test('einstellung-vis-manuell schaltet weiterhin um UND zurück, übersteht einen Reload', async ({ page }) => {
    await ueberspringeOnboarding(page);
    await page.click('[data-testid="module-vis"]');
    await expect(page.locator('[data-testid="vis-island-fuellen"]')).toBeVisible();

    await page.click('[data-testid="island-einstellungen-kreis"]');
    await expect(page.locator('[data-testid="einstellungen-panel"]')).toBeVisible();
    const schalter = page.locator('[data-testid="einstellung-vis-manuell"]');
    await expect(schalter).not.toBeChecked();
    await schalter.check();
    await page.click('[data-testid="einstellungen-panel"] [aria-label="Schliessen"]');
    await expect(page.locator('[data-testid="tab-graph"]')).toBeVisible();
    await expect(page.locator('[data-testid="vis-island-fuellen"]')).toHaveCount(0);

    // Reload behält 'manuell' (unverändertes Bestandsverhalten).
    await page.reload();
    await page.click('[data-testid="module-vis"]');
    await expect(page.locator('[data-testid="tab-graph"]')).toBeVisible();

    // Rückweg über `island-zurueck` (unverändert) — Checkbox spiegelt AUS.
    await page.click('[data-testid="island-zurueck"]');
    await expect(page.locator('[data-testid="vis-island-fuellen"]')).toBeVisible();
    await page.click('[data-testid="island-einstellungen-kreis"]');
    await expect(page.locator('[data-testid="einstellung-vis-manuell"]')).not.toBeChecked();
  });
});
