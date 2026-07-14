import type { PanelDef } from './dock-kern';

/**
 * Stations-Registry (v0.7.8 Welle 1 / Paket P2 — «Intelligente Werkzeugtabs»)
 * — die `PanelDef[]`-Datensätze je Station für den Dock-Kern (`dock-kern.ts`,
 * NUR importiert, nicht verändert). Diese Datei ist reine Deklaration: kein
 * DOM, kein Store, keine Persistenz (die lebt in `dock-zustand.ts`).
 *
 * **Welle 1 (P2)**: Station `'design'` ist vollständig definiert — die 12
 * Panels, die in P3 aus ihrer heutigen Kollisions-/Handposition
 * (`DesignWorkspace.tsx`, feste `position:'absolute'`-Overlays) in den neuen
 * Dock migriert werden. `'plan'`/`'vis'` folgen in Welle 3 (leere Arrays,
 * s.u.).
 *
 * **WICHTIG — ID-Kopplung an `ui-zustand.ts`**: Jede `PanelDef.id` unten ist
 * 1:1 der kanonische `PanelId`-String aus `ui-zustand.ts` (`PANEL_IDS`,
 * Z.52-82), NICHT ein verkürzter/eigener Name — z.B. `'rasterOffen'`, nicht
 * `'raster'`. Das erlaubt P3 die Booleans (`studieOffen`, `drawOffen`, …)
 * direkt als `eingeklappt`/`geschlossen`-Quelle zu verdrahten, ohne eine
 * zweite Namenstabelle zu pflegen. EINE Ausnahme: `'unternehmerplan'` hat
 * (Stand heute) KEIN `…Offen`-Flag in `ui-zustand.ts` — das Panel ist ein
 * Daten-Guard (rendert immer, sobald ein Unternehmerplan geladen ist, s.
 * `DesignWorkspace.tsx` Kommentar C4b/C-E4). Diese Lücke ist eine bewusste,
 * dokumentierte Abweichung (s. Test `dock-stationen.test.ts` und der
 * Abschlussbericht von P2) — P3 muss entscheiden, ob `unternehmerplanOffen`
 * ergänzt wird oder ob der Dock dieses eine Panel weiter datengetrieben statt
 * togglegetrieben behandelt.
 *
 * **Wichtigkeits-Rangfolge (Band 38-52, unter `checks`≈60, über `orient`≈30
 * — Bandgrenzen aus dem Design-Handoff-Prototyp, hier nicht importiert, weil
 * `dock-kern.ts` sie nicht exportiert)**: niedrigere Zahl klappt bei
 * Platzmangel ZUERST ein (`stack()` in `dock-kern.ts` wählt das unwichtigste
 * Flex-Panel). Rangfolge, aufsteigend (unwichtigstes zuerst):
 *
 *   38 raster            — reines Einrichtungs-Werkzeug, kurz offen (Raster
 *                           einmal setzen, dann meist zu).
 *   40 cwSetzen           — ebenfalls ein kurzer Einrichtungsdialog
 *                           (Fensterband/CW-Parameter einmal setzen).
 *   41 splat              — Import/Crop/Decimate: punktuelle Werkzeug-
 *                           Session, nicht dauerhaft offen.
 *   42 maengel            — Prüf-/Listen-Panel, wird phasenweise
 *                           konsultiert, nicht kontinuierlich.
 *   43 submission          — dito, Submissions-Check ist ein Kontrollblick.
 *   44 bauablauf          — KV/Bauablauf-Familie: referenziert öfter als die
 *                           reinen Prüf-Listen, aber kein Dauerbegleiter.
 *   45 kv                 — dito (KV/Bauablauf), minimal wichtiger als der
 *                           Ablaufplan, weil Kosten öfter der erste Blick sind.
 *   46 berechnungsliste   — die zentrale Flächen-/Wohnungs-Kennzahlliste,
 *                           während der Entwurfsiteration häufig eingesehen.
 *   47 unternehmerplan    — rechte Spalte: externe Unternehmer-Zuordnung,
 *                           bleibt während einer Zuordnungs-Session offen.
 *   48 draw               — rechte Spalte: Modellbaum/Mengen/Ausmass wird
 *                           beim Modellieren oft mitlaufend offen gehalten.
 *   50 varianten          — Anytime-Variantensuche: lange, iterative
 *                           Arbeitssitzungen (Gewichte/Seed feintunen).
 *   52 studien            — Volumenstudien/Massenvarianten: die am längsten
 *                           offen bearbeitete Fähigkeit (Owner-Rundgang
 *                           0.6.2 S.8 — iterative Geschosshöhen-/GF-Runden),
 *                           daher am wichtigsten, klappt zuletzt ein.
 *
 * `min`/`groesse` sind Höhen-Budgets für den Stack-Solver (NICHT die
 * Panel-Breite — die bleibt in der Dock-Spalte einheitlich `leftW`/`rightW`),
 * abgeleitet aus der heutigen Inhaltsdichte je Panel (Tabellen/Matrizen
 * brauchen mehr `groesse` als reine Formulare), gewählt im vorgegebenen
 * Rahmen `min` 150-220 / `groesse` 280-420.
 */

export type DockStation = 'design' | 'plan' | 'vis';

const DESIGN_PANELS: readonly PanelDef[] = [
  // ---- linke Spalte -------------------------------------------------------
  {
    id: 'rasterOffen',
    titel: 'Stützenraster',
    rolle: 'manuell',
    wichtigkeit: 38,
    dock: 'left',
    min: 160,
    groesse: 300,
    start: 'zu',
    schliessbar: true,
    bewegbar: true,
  },
  {
    id: 'cwSetzenOffen',
    titel: 'Fensterband / Curtain-Wall',
    rolle: 'manuell',
    wichtigkeit: 40,
    dock: 'left',
    min: 170,
    groesse: 320,
    start: 'zu',
    schliessbar: true,
    bewegbar: true,
  },
  {
    id: 'splatPanelOffen',
    titel: 'Splat',
    rolle: 'manuell',
    wichtigkeit: 41,
    dock: 'left',
    min: 160,
    groesse: 300,
    start: 'zu',
    schliessbar: true,
    bewegbar: true,
  },
  {
    id: 'maengelOffen',
    titel: 'Mängel',
    rolle: 'generator',
    wichtigkeit: 42,
    dock: 'left',
    min: 180,
    groesse: 360,
    start: 'zu',
    schliessbar: true,
    bewegbar: true,
  },
  {
    id: 'submissionOffen',
    titel: 'Submissions-Check',
    rolle: 'generator',
    wichtigkeit: 43,
    dock: 'left',
    min: 170,
    groesse: 340,
    start: 'zu',
    schliessbar: true,
    bewegbar: true,
  },
  {
    id: 'bauablaufOffen',
    titel: 'Bauablauf',
    rolle: 'pn',
    wichtigkeit: 44,
    dock: 'left',
    min: 190,
    groesse: 380,
    start: 'zu',
    schliessbar: true,
    bewegbar: true,
  },
  {
    id: 'kvOffen',
    titel: 'Kostenschätzung',
    rolle: 'pn',
    wichtigkeit: 45,
    dock: 'left',
    min: 190,
    groesse: 380,
    start: 'zu',
    schliessbar: true,
    bewegbar: true,
  },
  {
    id: 'listeOffen',
    titel: 'Berechnungsliste',
    rolle: 'generator',
    wichtigkeit: 46,
    dock: 'left',
    min: 200,
    groesse: 400,
    start: 'zu',
    schliessbar: true,
    bewegbar: true,
  },
  {
    id: 'variantenPanelOffen',
    titel: 'Varianten (Anytime-Suche)',
    rolle: 'generator',
    wichtigkeit: 50,
    dock: 'left',
    min: 200,
    groesse: 420,
    start: 'zu',
    schliessbar: true,
    bewegbar: true,
  },
  {
    id: 'studieOffen',
    titel: 'Volumenstudien',
    rolle: 'generator',
    wichtigkeit: 52,
    dock: 'left',
    min: 170,
    groesse: 320,
    start: 'zu',
    schliessbar: true,
    bewegbar: true,
  },

  // ---- rechte Spalte -------------------------------------------------------
  {
    id: 'unternehmerplan',
    titel: 'Unternehmerplan',
    rolle: 'ak',
    wichtigkeit: 47,
    dock: 'right',
    min: 180,
    groesse: 360,
    start: 'zu',
    schliessbar: true,
    bewegbar: true,
  },
  {
    id: 'drawOffen',
    titel: 'Modellbaum · Mengen · Ausmass',
    rolle: 'generator',
    wichtigkeit: 48,
    dock: 'right',
    min: 170,
    groesse: 320,
    start: 'zu',
    schliessbar: true,
    bewegbar: true,
  },
];

/**
 * Panel-Registry je Station. `'plan'`/`'vis'` sind TODO Welle 3 — bewusst
 * leere Arrays statt Platzhalter-Panels, damit `stationsPanels()` schon
 * heute für alle drei Stationen aufrufbar ist (P3/spätere Wellen müssen die
 * Aufrufstelle nicht anfassen, nur hier die Liste füllen).
 */
export function stationsPanels(station: DockStation): readonly PanelDef[] {
  switch (station) {
    case 'design':
      return DESIGN_PANELS;
    case 'plan':
      // TODO Welle 3
      return [];
    case 'vis':
      // TODO Welle 3
      return [];
  }
}

/** Die dockbaren Panel-IDs einer Station (Reihenfolge wie `stationsPanels`). */
export function dockbarePanelIds(station: DockStation): readonly string[] {
  return stationsPanels(station).map((p) => p.id);
}
