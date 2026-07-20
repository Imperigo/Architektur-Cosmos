import type {
  DesignOberflaeche,
  VisOberflaeche,
  PublishOberflaeche,
  PrepareOberflaeche,
} from '../../apps/kosmo-orbit/src/state/ui-zustand';

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
 * PC1 (`docs/V084-SPEZ.md` §5 W2) — exakt dasselbe Problem wie C-35 oben, jetzt
 * für die vis-Station: `ui-zustand.ts`s `visOberflaeche`-Default ist `'island'`
 * (Owner-Auftrag).
 *
 * **v0.8.10 E3-Nachtrag Seed-Flip (Owner-Entscheid 20.07.2026, `docs/V0810-
 * SPEZ.md` §2 E3 Punkt 6, Matrix C-7):** dieses Feld ist NICHT mehr Teil des
 * globalen `kosmoUiV1SeedMitManuell()`-Zwangs (s. dortigen Kommentar) — der
 * echte Produktions-Default `visOberflaeche:'island'` gilt jetzt für JEDE
 * Spec, die keinen eigenen Seed setzt. Die Konstante lebt weiter, weil
 * `visManuellStorageState()` (unten) sie gezielt für die sechs Manuell-only-
 * Feature-Specs braucht, die kein Insel-Äquivalent haben.
 */
export const MANUELL_VIS_OBERFLAECHE: VisOberflaeche = 'manuell';

/**
 * PC3 (`docs/V084-SPEZ.md` §5 W3) — exakt dasselbe Problem wie C-35/PC1 oben,
 * jetzt für die publish-Station: `ui-zustand.ts`s `publishOberflaeche`-Default
 * ist `'island'` (Owner-Auftrag, C-19). Ohne Gegenmassnahme sähe JEDE
 * bestehende publish-lastige Spec (`publish-presets.spec.ts`,
 * `blatt-fuellen.spec.ts`, `auto-pack-editor.spec.ts`, `export-pdf-
 * haertung.spec.ts`, `rolle-leporello.spec.ts`, `plankopf.spec.ts`,
 * `dossier-panel.spec.ts`, `export-hub-kosmopackage.spec.ts` u.a.) plötzlich
 * die neue Island-Oberfläche statt der heutigen Werkzeugleiste/Sidebar/
 * Blatt-Canvas-Chrome — derselbe globale Seed-Weg löst das wieder für ALLE
 * Specs auf einen Schlag, additiv neben `designOberflaeche`/`visOberflaeche`
 * (kein Feld hier verändert ein anderes).
 */
export const MANUELL_PUBLISH_OBERFLAECHE: PublishOberflaeche = 'manuell';

/**
 * PC4 (`docs/V084-SPEZ.md` §5 W3, C-20) — exakt dasselbe Problem wie C-35/
 * PC1/PC3 oben, jetzt für die prepare-Station: `ui-zustand.ts`s
 * `prepareOberflaeche`-Default ist `'island'` (Owner-Auftrag, C-20). Ohne
 * Gegenmassnahme sähe JEDE bestehende prepare-lastige Spec plötzlich die
 * neue Island-Oberfläche — derselbe globale Seed-Weg löst das wieder für
 * ALLE Specs auf einen Schlag, additiv neben `designOberflaeche`/
 * `visOberflaeche`/`publishOberflaeche` (kein Feld hier verändert ein
 * anderes).
 */
export const MANUELL_PREPARE_OBERFLAECHE: PrepareOberflaeche = 'manuell';

/**
 * Baut den `kosmo.ui.v1`-`localStorage`-Wert mit `designOberflaeche:'manuell'`,
 * `publishOberflaeche:'manuell'` UND `prepareOberflaeche:'manuell'` — additiv
 * zum bestehenden Seed-Inhalt (`modusAutomatik`/`modusFesthalten`/
 * `phasenFokus`, s. `playwright.config.ts`s Kopfkommentar zu `kosmo.ui.v1`).
 * `basis` erlaubt Aufrufern, die übrigen Felder zu überschreiben, ohne dieses
 * Modul für jede Kombination anzupassen — `designOberflaeche`/
 * `publishOberflaeche`/`prepareOberflaeche` gewinnen jedoch IMMER (das ist
 * der ganze Zweck dieses Helfers).
 *
 * **v0.8.10 E3-Nachtrag Seed-Flip (Owner-Entscheid 20.07.2026, `docs/V0810-
 * SPEZ.md` §2 E3 Punkt 6, Matrix C-7):** `visOberflaeche` gehört NICHT mehr
 * zu den erzwungenen Feldern — design/publish/prepare bleiben unverändert
 * `'manuell'` (Owner-Auftrag betraf nur KosmoVis), aber vis folgt jetzt dem
 * echten Produktions-Default `'island'`, sofern `basis` (oder ein Aufrufer
 * wie `visManuellStorageState()` unten) es nicht explizit setzt. Vorher
 * stand hier zusätzlich `visOberflaeche: MANUELL_VIS_OBERFLAECHE,` im
 * immer-gewinnt-Block — das war der globale vis-Seed, den JEDE Bestands-Spec
 * ungefragt bekam; die sechs Manuell-only-Feature-Specs ohne Insel-
 * Äquivalent holen sich das jetzt gezielt selbst (s. `visManuellStorageState()`).
 */
export function kosmoUiV1SeedMitManuell(basis: Record<string, unknown> = {}): string {
  return JSON.stringify({
    version: 1,
    modusAutomatik: false,
    modusFesthalten: false,
    phasenFokus: null,
    ...basis,
    designOberflaeche: MANUELL_DESIGN_OBERFLAECHE,
    publishOberflaeche: MANUELL_PUBLISH_OBERFLAECHE,
    prepareOberflaeche: MANUELL_PREPARE_OBERFLAECHE,
  });
}

/**
 * v0.8.10 E3-Nachtrag (Owner-Entscheid 20.07.2026, `docs/V0810-SPEZ.md` §2
 * E3 Punkt 6, Matrix C-7): NACH dem Seed-Flip (`kosmoUiV1SeedMitManuell()`s
 * globaler Aufruf in `playwright.config.ts` verliert das `visOberflaeche`-
 * Feld, s. dortigen Kopfkommentar) sähe JEDE der sechs Manuell-only-
 * Feature-Specs (`vis-onboarding.spec.ts`, `dock-layout.spec.ts`,
 * `dock-presets.spec.ts`, `vis-ansichten.spec.ts`, `p8-081-screenshots.
 * spec.ts`, `vis-token.spec.ts`s Legende-`describe`) plötzlich den echten
 * Produktions-Default `visOberflaeche:'island'` statt der Werkzeugleiste/
 * Dock-Panels/Legende/gespeicherten Ansichten, die sie testen — genau die
 * vier Manuell-only-Funktionen ohne Insel-Äquivalent, die den E3-Nachtrag
 * ausgelöst haben (P-B1-Audit-Fund).
 *
 * **Warum ein `test.use({ storageState: visManuellStorageState() })`-Kopf
 * je Spec reicht:** dieser Helfer baut GENAU dasselbe `storageState`-Objekt
 * wie `playwright.config.ts`s globaler `use.storageState` VOR dem Flip
 * (`kosmo.ui.v1` via `kosmoUiV1SeedMitManuell({ visOberflaeche:
 * MANUELL_VIS_OBERFLAECHE })` — `visOberflaeche` reicht er über `basis`
 * durch, weil die Funktion selbst es seit dem Flip nicht mehr erzwingt +
 * `kosmo.leistung.v1` + `kosmo.dock.presetInit.v1`, alle drei Einträge im
 * selben Origin-Block) — Playwrights `test.use` innerhalb einer Spec-Datei
 * überschreibt den globalen `use`-Wert komplett für JEDEN Test dieser Datei
 * (Muster `e2e/blender-bridge.spec.ts:49`/`e2e/vis-island.spec.ts`, dort
 * umgekehrt mit einem LEEREN Kontext). Die betroffenen sechs Specs sehen so
 * nach dem Flip exakt denselben Manuell-Seed wie vorher — nur jetzt lokal
 * deklariert statt global erzwungen. `design`/`publish`/`prepare` bleiben
 * dabei unverändert `'manuell'` (weiterhin vom immer-gewinnt-Block in
 * `kosmoUiV1SeedMitManuell()` erzwungen), da der Owner-Auftrag NUR die
 * vis-Station betraf.
 *
 * Port-Ermittlung identisch zu `playwright.config.ts` (`KOSMO_E2E_PORT`,
 * Default `5183`) — eine Spec, die diesen Helfer importiert, braucht keine
 * eigene Port-Konstante.
 */
export function visManuellStorageState(): {
  cookies: [];
  origins: [{ origin: string; localStorage: { name: string; value: string }[] }];
} {
  const port = process.env['KOSMO_E2E_PORT'] ?? '5183';
  const origin = new URL(`http://localhost:${port}`).origin;
  return {
    cookies: [],
    origins: [
      {
        origin,
        localStorage: [
          { name: 'kosmo.ui.v1', value: kosmoUiV1SeedMitManuell({ visOberflaeche: MANUELL_VIS_OBERFLAECHE }) },
          {
            name: 'kosmo.leistung.v1',
            value: JSON.stringify({ version: 1, zustimmungErteilt: false, override: 'auto', renderBeiBedarf: false }),
          },
          { name: 'kosmo.dock.presetInit.v1', value: '1' },
        ],
      },
    ],
  };
}
