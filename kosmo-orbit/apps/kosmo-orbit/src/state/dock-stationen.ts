import type { PanelDef } from './dock-kern';

/**
 * Stations-Registry (v0.7.8 Welle 1 / Paket P2, erweitert Welle 2 / Paket P4
 * — «Intelligente Werkzeugtabs») — die `PanelDef[]`-Datensätze je Station für
 * den Dock-Kern (`dock-kern.ts`, NUR importiert, nicht verändert). Diese
 * Datei ist reine Deklaration: kein DOM, kein Store, keine Persistenz (die
 * lebt in `dock-zustand.ts`).
 *
 * **Welle 1 (P2)**: Station `'design'` startete mit den 12 Panels, die in P3
 * aus ihrer heutigen Kollisions-/Handposition (`DesignWorkspace.tsx`, feste
 * `position:'absolute'`-Overlays) in den neuen Dock migriert wurden.
 * **Welle 2 (P4)**: zwei weitere — `kennzahlen`/`inspector` — kommen hinzu
 * (die letzten zwei verbliebenen Design-Überlagerungen ausserhalb des Docks,
 * s. u.), macht 14 Panels total. `'plan'`/`'vis'` folgen in Welle 3 (leere
 * Arrays, s.u.).
 *
 * **WICHTIG — ID-Kopplung an `ui-zustand.ts`**: Jede `PanelDef.id` unten ist
 * 1:1 der kanonische `PanelId`-String aus `ui-zustand.ts` (`PANEL_IDS`,
 * Z.52-82), NICHT ein verkürzter/eigener Name — z.B. `'rasterOffen'`, nicht
 * `'raster'`. Das erlaubt P3 die Booleans (`studieOffen`, `drawOffen`, …)
 * direkt als `eingeklappt`/`geschlossen`-Quelle zu verdrahten, ohne eine
 * zweite Namenstabelle zu pflegen. DREI Ausnahmen ohne `…Offen`-Flag in
 * `ui-zustand.ts` — alle drei sind Daten-Guards (rendern, sobald die
 * jeweilige Bedingung zutrifft, kein Boolean-Toggle):
 *   - `'unternehmerplan'` — sobald ein Unternehmerplan geladen ist (s.
 *     `DesignWorkspace.tsx` Kommentar C4b/C-E4).
 *   - `'kennzahlen'` (P4) — IMMER sichtbar in der Design-Station (die
 *     Live-Kennzahlen liefen schon vorher ohne eigenen Toggle, s.
 *     `KennzahlenPanel.tsx`); Sichtbarkeit für `DockFlaeche` ist schlicht
 *     `true`, kein Store-Feld nötig.
 *   - `'inspector'` (P4) — sobald eine Entität ausgewählt ist (`selection`,
 *     `state/project-store.ts`), gespiegelt aus `Inspector.tsx`s eigenem
 *     `if (!entity) return null`-Guard.
 * Diese Lücke ist eine bewusste, dokumentierte Abweichung (s. Test
 * `dock-zustand.test.ts`s Registry-Invarianten).
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
 *                           daher am wichtigsten unter dem Welle-1-Band,
 *                           klappt innerhalb dieses Bands zuletzt ein.
 *   60 kennzahlen (P4)    — der `checks`-Tier aus dem Prototyp: Live-
 *                           Kennzahlen/Checks sind IMMER sichtbar, sollen
 *                           daher später einklappen als jedes Welle-1-Panel
 *                           (auch `draw`/`unternehmerplan`).
 *   82 inspector (P4)     — solange eine Entität ausgewählt ist, ist ihre
 *                           Bearbeitung die unmittelbare Nutzerabsicht —
 *                           klappt praktisch nie zugunsten anderer Panels.
 *
 * `min`/`groesse` sind Höhen-Budgets für den Stack-Solver (NICHT die
 * Panel-Breite — die bleibt in der Dock-Spalte einheitlich `leftW`/`rightW`),
 * abgeleitet aus der heutigen Inhaltsdichte je Panel (Tabellen/Matrizen
 * brauchen mehr `groesse` als reine Formulare), gewählt im vorgegebenen
 * Rahmen `min` 150-220 / `groesse` 280-420.
 *
 * **Boden-Dock — bewusst KEIN Registry-Eintrag (v0.8.0 P11, Owner-
 * Pflichtauftrag 15.07.)**: der Boden-Dock (`shell/BodenDock.tsx`,
 * `data-testid="boden-dock"`) ist ein APP-WEITER, stationsübergreifender
 * Navigations-Layer (gemountet in `App.tsx` für jede Station gleichzeitig,
 * `screen !== 'home'`) — kein Panel EINER Station, das der Solver an-/
 * abdocken, einklappen oder verschieben könnte (`schliessbar`/`bewegbar`/
 * `dock:'left'|'right'|'float'` ergäben hier keinen Sinn: es gibt nichts,
 * das man schliessen oder umdocken würde). Er ist trotzdem kein blinder
 * Fleck fürs Dock-System, sondern auf zwei ehrlich unterschiedlichen Wegen
 * angebunden, je nachdem ob die Station eine `DockFlaeche` hat:
 *   - Stationen MIT `DockFlaeche` (`'design'`/`'vis'`, s.u.): der Solver
 *     kennt den Boden-Dock nicht direkt, aber `shell/dock/DockFlaeche.tsx`
 *     MISST seine reale Position (`kosmo-symbol`-Knoten im Regelfall, seit
 *     P11 zusätzlich der `boden-dock`-Container selbst als Fallback, s.
 *     dortiger Kopfkommentar) und reserviert daraus die adaptive
 *     y-Ende-Grenze des Feldes — Panels wachsen strukturell nie darunter.
 *   - Stationen OHNE `DockFlaeche` (`'publish'` seit P11, sowie `'daten'`/
 *     `'wissen'`/… ausserhalb dieser Registry): kein Solver-Feld zum
 *     Reservieren vorhanden — dort gilt statt einer Registry-Zeile die
 *     exportierte Konstante `BODEN_DOCK_RESERVE_PX` (`shell/BodenDock.tsx`),
 *     die Aufrufer als statisches Bottom-Padding einsetzen (s.
 *     `modules/publish/PublishWorkspace.tsx`s Blattfläche). Minimalziel
 *     dieses Pakets war ausschliesslich Publish — `daten`/`wissen`/`chat`/
 *     `pipeline` teilen dieselbe theoretische Lücke, sind aber NICHT Teil
 *     dieser Runde (ehrlich offener Punkt, s. Abschlussbericht P11).
 */

export type DockStation = 'design' | 'plan' | 'vis' | 'publish';

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
  // ---- v0.7.8 Welle 2 (P4) — Rechts-Stack-Migration -----------------------
  // `kennzahlen` (KennzahlenPanel.tsx) und `inspector` (Inspector.tsx) waren
  // bislang die letzten zwei Design-Überlagerungen ausserhalb des Docks
  // (`DesignWorkspace.tsx` rendert sie noch als eigene `<KennzahlenPanel/>`/
  // `<Inspector/>`-Geschwister NEBEN `DockFlaeche` — P4 macht daraus zwei
  // weitere `DockPanelEintrag`s derselben rechten Spalte). Beide sind reine
  // Daten-Guards wie `unternehmerplan` oben (KEIN `…Offen`-Flag in
  // `ui-zustand.ts`, s. `dock-zustand.test.ts`s erweiterte Registry-
  // Invarianten) — `kennzahlen` ist in der Design-Station IMMER sichtbar
  // (Sichtbarkeit = `true`, kein Toggle), `inspector` nur solange eine
  // Entität ausgewählt ist (Sichtbarkeit = `selection.length > 0`, gespiegelt
  // aus `Inspector.tsx`s eigenem `if (!entity) return null`-Guard).
  //
  // Wichtigkeit: `kennzahlen` = 60 — der «checks»-Tier aus dem Design-Handoff-
  // Prototyp (s. Kopfkommentar oben, «unter `checks`≈60»), also wichtiger als
  // JEDES Panel der Design-Station (Band 38-52 + `unternehmerplan`/`draw`
  // 47/48) — die Live-Kennzahlen/Checks sollen bei Platzmangel als LETZTES
  // einklappen, `draw` (48) als vorletztes. `inspector` = 82 — noch wichtiger:
  // solange eine Entität ausgewählt ist, ist das Bearbeiten dieser Entität
  // die unmittelbare Absicht des Nutzers, das darf so gut wie nie einklappen.
  {
    id: 'kennzahlen',
    titel: 'Kennzahlen',
    rolle: 'generator',
    wichtigkeit: 60,
    dock: 'right',
    min: 200,
    groesse: 380,
    // `start` ist wie bei `unternehmerplan` oben irrelevant für die Design-
    // Station: `DockFlaeche.tsx` überschreibt `geschlossen` bei JEDEM Panel
    // immer aus der `sichtbar`-Prop (Daten-Guard statt `def.start`) — `'zu'`
    // hier ist nur die Registry-weite Konvention, kein tatsächlicher Default.
    start: 'zu',
    schliessbar: true,
    bewegbar: true,
  },
  {
    id: 'inspector',
    titel: 'Inspector',
    // `dock-kern.ts`s `PanelDef['rolle']`-Union kennt `'system'`, nicht
    // `'office'` (dieselbe dokumentierte Diskrepanz wie im Kopfkommentar
    // oben) — `dock-flaeche.css` legt den Alias `--k-rolle-system` auf
    // `--k-rolle-office` (Prüfung: `dock-zustand.test.ts`).
    rolle: 'system',
    wichtigkeit: 82,
    dock: 'right',
    min: 180,
    groesse: 320,
    // `start` ist wie bei `unternehmerplan` oben irrelevant für die Design-
    // Station: `DockFlaeche.tsx` überschreibt `geschlossen` bei JEDEM Panel
    // immer aus der `sichtbar`-Prop (Daten-Guard statt `def.start`) — `'zu'`
    // hier ist nur die Registry-weite Konvention, kein tatsächlicher Default.
    start: 'zu',
    schliessbar: true,
    bewegbar: true,
  },

  // ---- v0.7.8 Welle 2 (P5) — Viewport-HUDs als echte Dock-Floats ----------
  // Vier der fünf damaligen 3D-Viewport-HUDs (`modules/design/ViewportChrome
  // .tsx`/`ViewportChromeHuds.tsx`) wurden hier `dock:'float'`-Panels
  // derselben Design-Station statt handgetunter `position:absolute`-Kinder:
  // Modus-Umschalter, Modus-Infokarte, Werkzeug-Rail, Orientierungskreuz.
  // Die restlichen zwei (HUD-Statuskarte + Eigenschaften-Panel, damals
  // Ist-Zustand-Entscheid) sind seit v0.7.9 A1 GENAUSO Floats — s.
  // `viewportHudStatuskarte`/`viewportEigenschaften` weiter unten (eigener
  // Anker `top-right`, eigener Kommentarblock mit der Überlapp-Historie).
  // Der Zoom-/Vollbild-Cluster bleibt unverändert (Teil der Bottom-
  // Statuszeile, `ViewportChrome.tsx`).
  //
  // Sichtbarkeit ist wie `kennzahlen`/`inspector` oben ein reiner Daten-Guard
  // (kein `…Offen`-Flag in `ui-zustand.ts`): `DesignWorkspace.tsx` leitet
  // `sichtbar` aus `viewport-chrome-runtime.ts`s `bereit` (Viewport3D
  // gemountet UND fertig) UND `viewMode ∈ {'3d','split'}` ab — Quad-Ansicht
  // ist bewusst ausgeschlossen: die vier Viewport3D-Chrome-Werte kommen zwar
  // auch dort (Viewport3D mountet in jeder Nicht-2D-Ansicht inkl. Quad), die
  // Floats selbst würden dort aber über das GANZE 2×2-Feld schweben (der
  // Solver kennt nur EIN zentrales Viewport-Rechteck je Station, nicht vier
  // Grid-Zellen) statt nur über der Viewport3D-Zelle — reale
  // Überlappungsgefahr mit PlanView/SectionView-Zellen. «3D-/Split-Ansicht
  // wie heute» (Auftrag) schliesst Quad damit aus.
  //
  // `fw`/`fh` sind ECHTE gerenderte Grössen (Playwright-Messung am
  // unveränderten v0.7.7-Stand, 1400×900, alle drei Modi durchgeklickt),
  // NICHT die groben Prototyp-Näherungen aus dem Auftrag — Details/
  // Abweichungen im Abschlussbericht:
  //   mode            Ziel ~250×44  → gemessen 259×44  (fast exakt)
  //   card/Massing    Ziel ~200×92  → gemessen 204-240×99 (Titeltext variiert
  //                   je Modus, «Kamera & Render-Setup» ist am längsten)
  //   gizmo/Transform Ziel ~196×56  → gemessen 288×58 (6 Werkzeuge je Modus,
  //                   ungewrappt — der Ziel-Wert unterschätzt die reale
  //                   Rail-Breite deutlich)
  //   orient          Ziel ~150×92  → gemessen 185×84
  {
    id: 'viewportModusLeiste',
    titel: 'Modus',
    rolle: 'system',
    wichtigkeit: 70,
    dock: 'float',
    anker: 'top',
    fw: 260,
    fh: 44,
    start: 'zu',
    schliessbar: false,
    bewegbar: true,
    floatChrome: 'schlank',
  },
  {
    id: 'viewportModusKarte',
    titel: 'Modus-Info',
    rolle: 'manuell',
    wichtigkeit: 50,
    dock: 'float',
    anker: 'top',
    fw: 244,
    fh: 100,
    start: 'zu',
    schliessbar: false,
    bewegbar: true,
    floatChrome: 'schlank',
  },
  {
    id: 'viewportWerkzeugRail',
    titel: 'Werkzeuge',
    rolle: 'system',
    wichtigkeit: 64,
    dock: 'float',
    anker: 'top',
    fw: 290,
    fh: 60,
    start: 'zu',
    schliessbar: false,
    bewegbar: true,
    floatChrome: 'schlank',
  },
  {
    id: 'viewportOrientierung',
    titel: 'Orientierung',
    rolle: 'system',
    wichtigkeit: 30,
    dock: 'float',
    anker: 'bottom-left',
    fw: 188,
    fh: 86,
    start: 'zu',
    schliessbar: false,
    bewegbar: true,
    floatChrome: 'schlank',
  },

  // ---- v0.7.9 A1 — die letzte Überlappungs-Klasse (ROADMAP 357/358) -------
  // Die zwei P5-Ausnahmen (HUD-Statuskarte `viewport-hud` + das
  // Eigenschaften-Panel) waren bis v0.7.8 fixes `position:absolute`-Chrome
  // in `ViewportChrome.tsx` (`k-vp-spalte-rechts`, verankert relativ zum
  // `Viewport3D`-DOM-Element statt zum Solver-`vp` — die Ursache des
  // dokumentierten ~130×85px-Überlapps mit `viewportOrientierung` in enger
  // Split-Ansicht, s. ROADMAP 357/358 + `ViewportChrome.tsx`s
  // Kopfkommentar). Jetzt zwei eigene Floats wie die vier oben — NEUER Anker
  // `top-right` (additive `dock-kern.ts`-Erweiterung, s. dortigen
  // `FloatAnker`-Kommentar): rechtsbündiger Stapel von der oberen Kante nach
  // unten, Registry-Reihenfolge = Stapel-Reihenfolge (Statuskarte zuerst,
  // Eigenschaften direkt darunter — dieselbe Optik wie die alte
  // `k-vp-spalte-rechts`).
  //
  // `wichtigkeit` bewusst ÜBER allen vier P5-HUD-Floats (deren höchste ist
  // `viewportModusLeiste` mit 70): beide waren vorher UNBEWEGLICHES, nie
  // einklappendes/nie verdrängtes Chrome — die höchste Priorität in dieser
  // Float-Gruppe erhält denselben Charakter zurück (`separate()` verschiebt
  // bei Kollision das Panel mit der NIEDRIGEREN Wichtigkeit, s.
  // `dock-kern.ts`), jetzt aber kollisions-SICHER statt kollisions-BLIND.
  //
  // `fw`/`fh` sind ECHTE gerenderte Grössen (Playwright-Messung am
  // v0.7.8-Stand, 1400×900, alle drei Modi durchgeklickt — HUD-Statuskarte
  // ist in allen drei Modi exakt gleich hoch, das Eigenschaften-Panel
  // braucht im «Modellieren»-Modus am meisten Platz, wegen der zusätzlichen
  // Texturen-Zeile):
  //   viewport-hud (Karte)  gemessen 280×153.6 (Card inkl. Padding) → fw 280/fh 160
  //   Eigenschaften-Inhalt  Kopf 40.9 + Content-`scrollHeight` max. 513
  //                         (Modellieren, 3 Sektionen + Texturen-Zeile) +
  //                         Fuss 51.1 ≈ 605 → fw 280/fh 610 (das Panel behält
  //                         sein eigenes `overflowY:auto` als Sicherheitsnetz
  //                         für seltenere, noch längere Inhalte).
  {
    id: 'viewportHudStatuskarte',
    titel: 'Viewport-HUD',
    rolle: 'system',
    wichtigkeit: 72,
    dock: 'float',
    anker: 'top-right',
    fw: 280,
    fh: 160,
    start: 'zu',
    schliessbar: false,
    bewegbar: true,
    floatChrome: 'schlank',
  },
  {
    id: 'viewportEigenschaften',
    titel: 'Eigenschaften',
    rolle: 'system',
    wichtigkeit: 74,
    dock: 'float',
    anker: 'top-right',
    fw: 280,
    fh: 610,
    start: 'zu',
    schliessbar: false,
    bewegbar: true,
    floatChrome: 'schlank',
  },
];

/**
 * v0.7.8 Welle 3 (P6) — KosmoVis-Station: vier Panels, alle vier OHNE
 * `…Offen`-Flag in `ui-zustand.ts` (dieselbe Daten-Guard-/Toggle-Ausnahme wie
 * `unternehmerplan`/`kennzahlen`/`inspector` in `DESIGN_PANELS` oben — die
 * ⊆-`PANEL_IDS`-Invariante gilt darum NICHT für diese Station, s.
 * `dock-zustand.test.ts`s eigene «vis»-Registry-Tests statt der Design-
 * Variante):
 *   - `visPalette` — die Node-Palette (`NodeCanvas.tsx`), Sichtbarkeit ist
 *     ein lokales Toggle-Boolean (`vis-palette-toggle`), das bisher als
 *     `useState` in `NodeCanvas.tsx` lebte — für die Dock-Migration nach
 *     `vis-runtime.ts` gehoben (kein neues `localStorage`, reiner In-Memory-
 *     Zustand wie `kuration`/`laeufe` dort). `dock:'left'`, keine Float-
 *     Geometrie nötig (Breite = Spaltenbreite `leftW`).
 *   - `visAusrichten` — die Ausrichten-Leiste, ein Daten-Guard (Sichtbarkeit
 *     = `auswahl.size >= 2`, keine Toggle-Möglichkeit).
 *   - `visMinimap`/`visLegende` — Daten-Guards (Sichtbarkeit = Graph hat
 *     Nodes, Minimap zusätzlich `minimapSichtbar`). Beide waren bisher EIN
 *     gemeinsamer Flex-Container (`NodeCanvas.tsx`, «unten links, EIN
 *     verankerter Stapel») — als Dock-Floats werden daraus ZWEI getrennte
 *     `anker:'bottom-left'`-Panels (dokumentierte Abweichung, s.
 *     Abschlussbericht P6): `placeFloats()` (`dock-kern.ts`) stapelt mehrere
 *     `bottom-left`-Floats selbst schon (letzter `bl`-Loop) — die REGISTRY-
 *     REIHENFOLGE bestimmt dabei die Stapelrichtung (das ERSTE Element im
 *     `bl`-Filter landet am NÄCHSTEN zum unteren Rand, jedes weitere darüber,
 *     s. `placeFloats()`-Kopfkommentar) — `visLegende` steht darum VOR
 *     `visMinimap` unten, damit die Minimap weiterhin ÜBER der Legende
 *     erscheint (unverändertes Bild trotz getrennter Panels).
 *
 * `fw`/`fh` sind ECHTE gerenderte Grössen (Playwright-Messung am
 * unveränderten v0.7.7-Stand, 1400×900, Graph mit allen 6 Porttypen
 * vertreten):
 *   ausrichten-leiste  gemessen 193.5×36   → fw 200 / fh 40
 *   minimap            gemessen 160×100    → fw 160 / fh 100 (= MINIMAP_W/H)
 *   legende            gemessen 70.5×120.3 (6 Zeilen, Höchstfall — alle
 *                      sechs Porttypen gleichzeitig im Graph) → fw 90 / fh 124
 */
const VIS_PANELS: readonly PanelDef[] = [
  {
    id: 'visPalette',
    titel: 'Node-Palette',
    rolle: 'ak',
    wichtigkeit: 40,
    dock: 'left',
    min: 200,
    groesse: 360,
    start: 'zu',
    schliessbar: true,
    bewegbar: true,
  },
  {
    id: 'visAusrichten',
    titel: 'Ausrichten',
    rolle: 'manuell',
    wichtigkeit: 45,
    dock: 'float',
    anker: 'top',
    fw: 200,
    fh: 40,
    start: 'zu',
    schliessbar: false,
    bewegbar: true,
    // Schlankes Chrome (wie die vier Design-Viewport-HUDs, P5) — die Leiste
    // trägt schon ihre eigene kompakte Knopfreihe, ein zusätzlicher Dock-Kopf
    // (Titel/Pin/Chevron) wäre hier reine Redundanz für 3 Knöpfe.
    floatChrome: 'schlank',
  },
  {
    id: 'visLegende',
    titel: 'Legende',
    rolle: 'system',
    wichtigkeit: 27,
    dock: 'float',
    anker: 'bottom-left',
    fw: 90,
    fh: 124,
    start: 'zu',
    schliessbar: false,
    bewegbar: true,
    floatChrome: 'schlank',
  },
  {
    id: 'visMinimap',
    titel: 'Übersichtskarte',
    rolle: 'system',
    wichtigkeit: 26,
    dock: 'float',
    anker: 'bottom-left',
    fw: 160,
    fh: 100,
    start: 'zu',
    schliessbar: false,
    bewegbar: true,
    floatChrome: 'schlank',
  },
];

/**
 * v0.8.0 P11 (Owner-Pflichtauftrag 15.07., ehem. P11-«Stretch» in
 * `docs/V080-PLANKOPF-SPEZ.md` §8, jetzt Pflichtrahmen) — KosmoPublish
 * bekommt eine `DockFlaeche` wie design/vis. EHRLICHER SCHNITT (Auftrag:
 * «was heute absolut positioniert ist, wird DockPanel-Kind; was zu tief
 * verwoben ist, bleibt draussen»):
 *   - `plankopf` (`PlankopfPanel.tsx`) und `dossier` (`DossierPanel.tsx`)
 *     waren die ZWEI einzigen `position:'absolute'`-Overlays in
 *     `PublishWorkspace.tsx` (rechts `right:16/top:52/width:380` bzw. links
 *     `left:90/top:52/width:430`, beide `zIndex:20`) — strukturell identisch
 *     zum Design-Stations-Befund aus Welle 1/2 (`KennzahlenPanel.tsx`/
 *     `Inspector.tsx`), darum nach demselben Muster migriert: die eigene
 *     `position/right|left/top/width/maxHeight/zIndex`-Hülle entfällt in
 *     beiden Komponenten (der Rest — Badge/Titel/Schliessen-Knopf/Inhalt/
 *     Hintergrund/Rahmen/Schatten — bleibt UNVERÄNDERT, «Doppel-Chrome»
 *     bewusst in Kauf genommen, s. `DockPanel.tsx`-Kopfkommentar). Beide
 *     bleiben reine Daten-/UI-Zustand-Guards ohne `…Offen`-Flag in
 *     `ui-zustand.ts` (Sichtbarkeit = lokaler `plankopfOffen`/`dossierOffen`-
 *     State aus `PublishWorkspace.tsx`, gespiegelt wie `unternehmerplan`/
 *     `kennzahlen`/`inspector` in der Design-Station) — die
 *     ⊆-`PANEL_IDS`-Invariante gilt darum NICHT für `'publish'` (wie schon
 *     für `'vis'`, s. `dock-zustand.test.ts`).
 *   - DOKUMENTIERTE AUSNAHME (bleibt draussen): die Blattliste links
 *     (Set-/Blattverwaltung, Export-Sektionen, `width:220`-Sidebar) UND die
 *     Blattfläche selbst (`sheet-canvas`, Werkzeugleiste, Drag-Overlays auf
 *     dem SVG) sind NICHT Teil des Docks. Beide sind kein «Panel», das man
 *     schliessen/andocken/einklappen würde — die Sidebar ist waagrecht per
 *     Flex-Spalte fixiert (kein Solver-Rechteck nötig), die Blattfläche IST
 *     der zentrale Arbeitsinhalt selbst (das Äquivalent zu `viewport3d`/
 *     `planview` in Design — auch die sind, korrekt, NIE Dock-Panels).
 *     Beide bleiben darum handgetunt wie bisher, keine Migrations-Lücke.
 *
 * Wichtigkeit/Dock-Zone: `plankopf` rechts (spiegelt seine historische
 * Position rechts oben), `dossier` links (spiegelt seine historische
 * Position links der Blattmitte) — je eine eigene Spalte, keine Konkurrenz
 * um Rang untereinander (nur je ein Panel pro Spalte, `wichtigkeit` ist
 * hier ohne praktische Wirkung, gesetzt nach dem üblichen Band zur
 * Konsistenz mit den anderen Registries). `min`/`groesse` grosszügig (beide
 * Panels sind inhaltlich dicht: Plankopf hat sieben Textfelder + Layout-
 * Schalter + Phasenkarte + Massstab-Chips, Dossier Kennzahlen + Freitext +
 * Export-Knöpfe).
 */
const PUBLISH_PANELS: readonly PanelDef[] = [
  {
    id: 'dossier',
    titel: 'Projekt-Dossier',
    rolle: 'generator',
    wichtigkeit: 45,
    dock: 'left',
    min: 220,
    groesse: 420,
    start: 'zu',
    schliessbar: true,
    bewegbar: true,
  },
  {
    id: 'plankopf',
    titel: 'Plankopf',
    rolle: 'manuell',
    wichtigkeit: 50,
    dock: 'right',
    min: 220,
    groesse: 420,
    start: 'zu',
    schliessbar: true,
    bewegbar: true,
  },
];

/**
 * Panel-Registry je Station. `'plan'` bleibt ein bewusst leeres Array —
 * KEIN Welle-3-TODO mehr, sondern ein endgültiger Scope-Entscheid (s.
 * Abschlussbericht P6): die 2D-«Plan»-Station ist im echten Produkt keine
 * eigene Station, sondern der `viewMode:'2d'` DER DESIGN-STATION — deren
 * Panels sind bereits (Welle 1/2) im Dock der Station `'design'`. Ein
 * separates `'plan'`-Preset entfiele ersatzlos; die vier PlanView-Toggle-
 * Buttons (`top:8`) bleiben fixe Chrome.
 *
 * v0.7.8 Abnahme-Fix (Matrix-Muss, Entscheids-Dokumentation): dieselbe
 * Begründung trägt die «generic»-Station des Design-Handoff-Prototyps —
 * auch sie war reine Regel-Demo (ein Platzhalter-Panel-Set ohne echte
 * Registry-Einträge) ohne Produkt-Pendant und entfällt darum ebenso bewusst,
 * nicht nur `'plan'`.
 */
export function stationsPanels(station: DockStation): readonly PanelDef[] {
  switch (station) {
    case 'design':
      return DESIGN_PANELS;
    case 'plan':
      // Bewusst leer — s. Kopfkommentar direkt über dieser Funktion.
      return [];
    case 'vis':
      return VIS_PANELS;
    case 'publish':
      return PUBLISH_PANELS;
  }
}

/** Die dockbaren Panel-IDs einer Station (Reihenfolge wie `stationsPanels`). */
export function dockbarePanelIds(station: DockStation): readonly string[] {
  return stationsPanels(station).map((p) => p.id);
}
