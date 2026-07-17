import type { DesignOberflaeche } from '../../apps/kosmo-orbit/src/state/ui-zustand';

/**
 * E2E-Seed-Helper (PD2, `docs/ISLAND-UI-SPEZ.md` §6 Sanktion 2, `V082-SPEZ.
 * md` C-35): zwingt den Start-Zustand der design-Station auf «Manuell».
 *
 * **Warum das nötig ist:** C-35 flippt den Default der `ui-zustand.ts`-
 * Persistenz (`kosmo.ui.v1`) auf `designOberflaeche:'island'` — ohne
 * Gegenmassnahme sähe JEDE bestehende design-lastige E2E-Spec (`module.
 * spec.ts`, `dock-*.spec.ts`, `design-werkzeugleiste.spec.ts`, `kurztasten-
 * pan.spec.ts`, `arbeitsmodi.spec.ts` u. v. a. — s. `docs/ISLAND-UI-SPEZ.md`
 * §6 Sanktion 2) plötzlich die Island-UI statt der klassischen Werkzeugleiste/
 * Dock-Fläche/Geschossleiste, obwohl KEINE dieser Specs geändert werden darf
 * (Sanktion 2: «kein einziger bestehender Test-Assert wird verändert»).
 *
 * **Warum EIN Ort reicht:** `playwright.config.ts`s `use.storageState` läuft
 * für JEDEN Testkontext, den Playwright öffnet — nicht nur vor dem ersten
 * `page.goto()` einer einzelnen Spec, sondern bei JEDEM neuen Browser-Kontext
 * (jede Testdatei/jeder Test, je nach Worker-Isolation). `localStorage` wird
 * dabei VOR jeglichem Skript der Seite gesetzt (Playwright schreibt es direkt
 * in den Kontext, bevor die erste Navigation überhaupt beginnt) — die App
 * liest `kosmo.ui.v1` synchron beim allerersten Modul-Load von
 * `state/ui-zustand.ts` (`anfangsZustand()` läuft beim `create<UiZustand>`-
 * Aufruf, also schon vor dem ersten React-Render). Ergebnis: JEDE Seite, die
 * eine Spec öffnet, sieht von Anfang an `designOberflaeche:'manuell'` — ohne
 * dass eine einzelne Spec-Datei diesen Seed selbst setzen müsste (anders als
 * das etablierte `kosmo.onboarded`-Muster, das JEDE Spec einzeln per
 * `page.evaluate`+`page.reload()` setzt, weil es NICHT im globalen
 * `storageState` steckt). Diese EINE Änderung in `playwright.config.ts`
 * (Wert von `kosmo.ui.v1` um `designOberflaeche` ergänzt) reicht darum aus —
 * keine der ~150 Bestands-Spec-Dateien muss angefasst werden.
 *
 * **Defensives Parsing bleibt der Präzedenzfall** (`state/ui-zustand.ts`
 * `istGueltigerSpeicher`/`normalisiere`, Z. 222–256, wörtlich im Kopfkommentar
 * dort referenziert): nur `version`+`modusAutomatik` sind Pflichtfelder, alle
 * weiteren Felder (inkl. `designOberflaeche`) sind optional und fehlertolerant
 * — dieser Seed nutzt exakt dieses bestehende Muster, kein neuer Vertrag.
 *
 * **Wer das Gegenteil braucht** (den ECHTEN Default 'island' ohne Seed
 * beweisen, `e2e/island-verdrahtung.spec.ts`): setzt die Suite selbst per
 * `test.use({ storageState: { cookies: [], origins: [] } })` ausser Kraft —
 * s. dortigen Kommentar.
 */
export const MANUELL_DESIGN_OBERFLAECHE: DesignOberflaeche = 'manuell';

/**
 * Baut den `kosmo.ui.v1`-`localStorage`-Wert mit `designOberflaeche:'manuell'`
 * — additiv zum bestehenden Seed-Inhalt (`modusAutomatik`/`modusFesthalten`/
 * `phasenFokus`, s. `playwright.config.ts`s Kopfkommentar zu `kosmo.ui.v1`).
 * `basis` erlaubt Aufrufern, die übrigen Felder zu überschreiben, ohne dieses
 * Modul für jede Kombination anzupassen — `designOberflaeche` gewinnt jedoch
 * IMMER (das ist der ganze Zweck dieses Helfers).
 */
export function kosmoUiV1SeedMitManuell(basis: Record<string, unknown> = {}): string {
  return JSON.stringify({
    version: 1,
    modusAutomatik: false,
    modusFesthalten: false,
    phasenFokus: null,
    ...basis,
    designOberflaeche: MANUELL_DESIGN_OBERFLAECHE,
  });
}
