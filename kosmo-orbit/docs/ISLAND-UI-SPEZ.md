# Island-UI-Spezifikation (PD0, verbindlich)

*PD0 · Paket W0 des Island-UI-Stroms (Owner-Nachtrag 17.07.2026 zum v0.8.2-Wellenplan,
`root-claude-uploads-73575e4c-8c15-5ba3-silly-plum.md`, Abschnitt «Island-UI-Strom PD»). Dieses
Dokument ist die verbindliche Grundlage für PD1–PD4 — jede Masszahl, jede Mapping-Zeile und jede
Sanktion hier ist der Massstab, gegen den die P8-Matrix-Abnahme (`docs/V082-SPEZ.md` §9/§10-
Addendum) am Ende prüft. Änderungen nach PD0 sind Owner-Sache, nicht Bauagenten-Ermessen (Muster
`docs/V081-SPEZ.md`, `docs/V082-SPEZ.md`).*

## 0 · Auftrag, Quellen, Referenz-Charakter

**Auftrag (Owner-Nachtrag 17.07.2026, ZIP «Kosmodesign_UI_Vereinfachung»):** eine radikal
vereinfachte **Default**-Oberfläche für KosmoDesign — beim Öffnen ist nur der Viewer sichtbar
(3D/Grundriss/Schnitt/Ansicht/4er), sämtliche Werkzeuge liegen in vier «Dynamic Islands» an den
Bildschirmrändern, Kosmo sitzt als Orb unten rechts. Die heutige Zeichnungsoberfläche
(Werkzeugleiste + Dock, `docs/V080B-DESIGN-SPEZ.md`/Konzept A) bleibt als **«Manuell»** einen Klick
entfernt (AUSTAUSCH → Manuell).

**Quellen:**
- Owner-ZIP „Island-UI Paket" (entpackt in `scratchpad/island-ui/Island-UI Paket/`):
  `README.md` (Handoff-Zusammenfassung), `Kosmodesign Island-UI Gestaltungskonzept.dc.html`
  (druckbares A4-Konzept: Bühnenordnung §01, Islands §02, 4-Stufen-Modell §03, Motion §04,
  Token-Tabelle §05, Manuelle Fläche §06, offene Punkte §07), `Kosmodesign Island-UI.dc.html`
  (interaktiver Prototyp — Logikklasse `Component`: `ISLANDS()`, `pickTool()`, `islEnter()`/
  `islLeave()`, `islandVals()`, `--f-*`-Tokenblöcke im `<helmet><style>`), `_ds/…/tokens/*.css`
  (KOSMOS-Tokenbelegung, Architekturkosmos-Design-System).
- Bestand: `docs/V082-SPEZ.md` (Muster/§9-Matrix, hier per Addendum §10 fortgeschrieben),
  `docs/V080B-DESIGN-SPEZ.md` (Gestaltungsgesetze, Token-Disziplin `--k-*` bleibt kanonisch),
  `apps/kosmo-orbit/src/modules/design/DesignWorkspace.tsx` (heutige Zeichen-/Kontextzeile),
  `apps/kosmo-orbit/src/modules/design/EntwurfsDock.tsx` (linke Rail, Stationswechsel),
  `apps/kosmo-orbit/src/state/ui-zustand.ts` (`ToolId`/`ViewMode`/`PanelId`),
  `apps/kosmo-orbit/src/state/kosmo-ui-werkzeuge.ts` (`ui.*`-Kosmo-Brücke),
  `apps/kosmo-orbit/src/state/dock-stationen.ts` (Panel-Registry je Station — Quelle der
  4-Stufen-Inhalts-Destillation), `packages/kosmo-ui/src/aura.css` (PAPIER/KOSMOS-Tokenwahrheit).

**Referenz-Charakter (bindend, wörtlich aus dem README übernommen):** *«Die DC-Datei ist eine
Design-Referenz, kein Produktionscode. Verhalten in Imperigo/KosmoOrbit (React) mit den dortigen
Mustern nachbauen (Store, Command→Patch→Undo/Sync, Aura-Tokens) — nicht das HTML einbetten.»*
Nichts aus `scratchpad/island-ui/` wird ins Repo kopiert oder eingebettet; jede Zahl/jeder Token
unten wurde aus den DC-Dateien abgelesen und wird in PD1–PD4 gegen `aura.css`/`ui-zustand.ts`/
Commands nachgebaut.

---

## 1 · Bühnenordnung

Nur drei Elemente sind permanent sichtbar; alles andere ist eine der vier Islands oder
eingefahren (Gestaltungskonzept §01, Prototyp-Style-Attribute).

| Element | Ort / Masse (Prototyp, 1920×1148-Bühne) | Verhalten |
|---|---|---|
| **Ansichts-Info** | `top:22px; left:26px` (rechts neben dem Stationen-Orb, `gap:14px`) | Mono-Label «GRUNDRISS · EG» (14px/600/`.18em`) + Unterzeile (10px, Massstab/Phase). Klick/Hover öffnet Ansichts- + Geschosswahl (3D · Grundriss · Schnitt · Ansicht · 4er, Chips 999px), Geschoss-Chips darunter. Auto-Schliessen 700ms nach Verlassen (`setInfo`, Prototyp `Component.setInfo`). |
| **Stationen-Orb** | `top:22px; left:26px`, davor; Kreis 38×38px, `border-radius:999px` | AK-Marke im schwarzen Glas (`--f-pill`). Hover/Klick öffnet Direktzugang KosmoDesign/KosmoData/KosmoVis/KosmoPrepare/KosmoPublish, je mit 7px-Rollenpunkt (Stationsfarben aus dem Prototyp: `#74C2A0`/`#B08A6E`/`#CD7670`/`#CF9466`/`#6F9BCF`). Navigation, **keine Island** (kein Werkzeug). Auto-Schliessen 700ms. |
| **Kosmo-Orb** | `right:26px; bottom:24px`, Kreis 52×52px | Goldener Orb (`--f-gold`), Puls `orbPulse` 2.4s zyklisch. Klick öffnet 320px-Konversationskarte (Vorschlagstext + 2 Aktions-Chips + Eingabezeile `⌘K`). Bleibt ausserhalb der vier Islands. |

Die vier Islands (Details §2) liegen mittig an den vier Rändern: ZEICHNEN `left:14px`, ANSICHT
`top:14px`, PROJEKT `right:14px`, AUSTAUSCH `bottom:14px` — je vertikal/horizontal zentriert
(`top:50%`/`left:50%` + `translate(-50%)`).

**Repo-Bezug (PD2):** Ansichts-Info/Geschosswahl entspricht heute den `view-*`-Knöpfen
(`DesignWorkspace.tsx:2130-2159`, `viewMode` aus `ui-zustand.ts:46-49`) + der Geschossleiste
(`DesignWorkspace.tsx:3172-3199`, `storey-${s.name}`). Ein Stationen-Orb in dieser Form (EIN
Hover-Popover mit allen 5 Stationen + Rollenpunkten) existiert **nicht** — die nächsten
Verwandten sind `EntwurfsDock.tsx:131-140` (`dock-draw`/`dock-vis`/`dock-publish`/`dock-prepare`,
vier einzelne Sprung-Knöpfe ohne gemeinsames Popover) und die App-Home-Modulliste (`App.tsx`,
`sortierteModule`/`oeffneModul`). **NEU (PD2):** ein konsolidiertes Stationen-Orb-Popover.

---

## 2 · Die vier Islands (Zuordnungsregel)

*«Erzeugen links · Sehen oben · Prüfen rechts · Übergeben unten»* (Gestaltungskonzept §02).
Ein Werkzeug gehört in **genau eine** Island; gehört es fachlich in zwei, ist es zwei Werkzeuge.

| Island | Rand | Pill-Masse (Stufe 0) | n Werkzeuge | Logik |
|---|---|---|---|---|
| **ZEICHNEN** | links, mittig | 34×104px (Pill, vertikal) | 11 | Erzeugt/ändert Geometrie |
| **ANSICHT** | oben, mittig | 104×34px (Pill, horizontal) | 6 | Ändert die Darstellung, nie das Modell |
| **PROJEKT** | rechts, mittig | 34×104px (Pill, vertikal) | 6 | Liest/prüft: Zahlen, Regeln, Stände |
| **AUSTAUSCH** | unten, mittig | 104×34px (Pill, horizontal) | 6 | Verlässt/betritt das Projekt, inkl. Rückweg zu Manuell |

**Total 29 Werkzeuge** (11+6+6+6) — siehe vollständige Mapping-Tabelle §3.

---

## 3 · Island → Werkzeug-Mapping (29/29, Repo-Fundstellen)

Status-Legende: **Vorhanden** (ToolId/Command/Panel existiert 1:1 nutzbar) · **Teilweise**
(Command/Datenmodell existiert, aber kein eigenständiges UI-Werkzeug) · **NEU** (kein Fund im
Repo, muss in PD3a/PD3b gebaut werden).

### 3.1 · ZEICHNEN (11)

| # | Werkzeug | Repo-Fundstelle | Status |
|---|---|---|---|
| 1 | Auswahl | `ToolId 'auswahl'` (`state/ui-zustand.ts:32`), `ZEICHEN_WERKZEUGE_LEISTE` (`DesignWorkspace.tsx:254`), testid `tool-auswahl` (Template `tool-${id}`, `DesignWorkspace.tsx:2087`) | Vorhanden |
| 2 | Wand | `ToolId 'wand'` (`ui-zustand.ts:33`), `DesignWorkspace.tsx:255`, Kontextzeile Aufbau-`KSelect` bei `tool==='wand'` (`DesignWorkspace.tsx:2237-2249`), Command `design.wandZeichnen` (`packages/kosmo-kernel/src/commands/design.ts:120-152`), Aufbau-Schichten mit `function:'tragend'` (`design.ts:99`), Inspector-Aufbauwahl bei `entity.kind==='wall'` (`Inspector.tsx:95-108`) | Vorhanden — **Referenzmuster laut Auftrag** |
| 3 | Öffnung | Command `design.oeffnungSetzen`/`addOpening` (`design.ts:241-279`), heute nur **implizit** über die Skizze-auf-Wand-Geste ausgelöst (`onSketchWandOeffnung`, `DesignWorkspace.tsx:997-1012`) — **kein eigener ZEICHNEN-Knopf** | Teilweise — Command vorhanden, eigenständiges Werkzeug NEU |
| 4 | Volumen | `ToolId 'volumen'` (`ui-zustand.ts:34`), `DesignWorkspace.tsx:256`, Command `design.volumenErstellen`/`createMass` (`design.ts:281-303`), Stufe-3-Quelle `studieOffen`-Panel (Volumenstudien, `DesignWorkspace.tsx:3696-3849`, testids `studie-gf`/`studie-geschosshoehe`) | Vorhanden |
| 5 | Zone | `ToolId 'zone'` (`ui-zustand.ts:35`), `DesignWorkspace.tsx:257`, Command `design.zoneErstellen`/`createZone` (`design.ts:540-578`) | Vorhanden |
| 6 | Dach | `ToolId 'dach'` (`ui-zustand.ts:36`), `DesignWorkspace.tsx:258`, Command `createRoof` (`design.ts:580-637`) | Vorhanden |
| 7 | Treppe | `ToolId 'treppe'` (`ui-zustand.ts:37`), `DesignWorkspace.tsx:259`, Command `createStair` (`design.ts:1164-1208`), Stufe-3-Quelle `treppen-form`-Select (`DesignWorkspace.tsx:2509`) | Vorhanden |
| 8 | Stütze | `ToolId 'stuetze'` (`ui-zustand.ts:38`), `DesignWorkspace.tsx:260`, Commands `setColumn`/`columnsFromGrid` (`design.ts:958-1088`), Stufe-3-Quelle `RasterPanel.tsx` («Achsen ins Modell») | Vorhanden |
| 9 | Skizze | `ToolId 'skizze'` (`ui-zustand.ts:40`), testid `tool-skizze` — **v0.8.1/P4 aus der Zeichenzeile in die linke Rail (`EntwurfsDock.tsx:239-264`) gezogen**, Kürzel `F` (`kurztasten.ts`) | Vorhanden (anderer DOM-Ort als im Prototyp) |
| 10 | Mesh | `ToolId 'mesh'` (`ui-zustand.ts:41`), testid `werkzeug-mesh` (`DesignWorkspace.tsx:2111-2122`), Command `createFreeMesh` (`design.ts:322-401`), Stufe-3-Quelle `mesh-edit-panel` (`DesignWorkspace.tsx:3086-3130`, `mesh-extrude-distanz`/`mesh-extrudieren`) | Vorhanden |
| 11 | Messen | Kein interaktives Punkt-zu-Punkt-Mess-/Bemassungswerkzeug im Repo. `design.bemassungSetzen` (`design.ts:2873-2905`) steuert nur den **automatischen** Bemassungsstil (welche Massketten angezeigt werden: `aussenKetten`/`innenKetten`/`hoehenKoten`/`rohKette`), keine Nutzer-Messung. `doc.byKind('mass')`-Entitäten (`DesignWorkspace.tsx:818-825`) sind Volumenkörper («Massenstudie»), **kein Mess-Ergebnis**. | **NEU** — kein Fund |

### 3.2 · ANSICHT (6)

| # | Werkzeug | Repo-Fundstelle | Status |
|---|---|---|---|
| 12 | Darstellung | `darstellung-3d`-Select im Projekt-Menü (`DesignWorkspace.tsx:2764-2784`), Command `design.darstellung3dSetzen`; benachbart `poche-modus` (`2787-2802`) und `fenster-boegen` (`2803-2815`) als weitere Darstellungs-Einstellungen | Vorhanden |
| 13 | Sonne | `sonne-toggle` (`DesignWorkspace.tsx:2396`), inline Zeile `sonne-datum`/`sonne-stunde` (`2846-2870`) — **Referenzmuster laut Auftrag**, ABER: heute nur als lokaler `useState` + Inline-Zeile (Stufe ≈2), **kein** eigenes Einstellungsfenster (Stufe 3 fehlt real, obwohl `PANEL_LABEL.sonneOffen = 'Sonnenstudien-Panel'` in `kosmo-ui-werkzeuge.ts:80` das schon benennt) | Vorhanden (Stufe 2), Stufe 3 Teilweise/NEU |
| 14 | Ebenen | `textur-toggle` (`DesignWorkspace.tsx:2388-2395`, `texturen`-Boolean) ist der einzige generische Anzeige-Layer-Schalter; die Kontextzeilen-Gruppe `leiste-gruppe-ebenen` (`2379-2438`) bündelt daneben fachfremde Panel-Toggles (Varianten/Draw/Liste/KV/…) unter demselben Label — kein einheitliches Mehrschicht-Sichtbarkeitssystem | Teilweise |
| 15 | Achsen | `achsen-toggle` + `achsenAn`-State, nur im 2D-Plan (`PlanView.tsx:667-674`, «Stützenraster-Achsen ein-/ausblenden») | Vorhanden (nur in Grundriss-Darstellung) |
| 16 | Trace | `trace-select`, `traceId`-State (`PlanView.tsx:632-646`, «anderes Geschoss blass unterlegen») | Vorhanden (nur in Grundriss-Darstellung) |
| 17 | Graph | `graph-toggle`, `graphAn`-State (`PlanView.tsx:660-666`, Raum-Adjazenz-Graph) | Vorhanden (nur in Grundriss-Darstellung) |

### 3.3 · PROJEKT (6)

| # | Werkzeug | Repo-Fundstelle | Status |
|---|---|---|---|
| 18 | Kennzahlen | `KennzahlenPanel.tsx` (testid `kennzahlen`, Z.79), Registry-Eintrag `dock-stationen.ts:369-392` (immer sichtbar, `wichtigkeit:60`), Tab «Übersicht» mit NGF/GF-`KKeyValue` | Vorhanden |
| 19 | Checks | **Gleiches Panel** wie Kennzahlen: `checks`-Sektion in `KennzahlenPanel.tsx:155-190` (testid `checks`, Filter `checks-filter-alle`/`checks-filter-fehler`, Gruppen `checks-gruppe-${schwere}`); benachbart/verwandt `SubmissionsCheckPanel.tsx` (`submissionOffen`, `pruefeSubmissionsreife`) und `maengelOffen` (Mängelliste) | Vorhanden |
| 20 | Varianten | `variantenPanelOffen` / `VariantenPanel.tsx` (testid `varianten-panel`, `varianten-panel-matrix`, `varianten-panel-zaehler`), Registry `dock-stationen.ts:272-285` | Vorhanden |
| 21 | Phase | `phase-stil`/`sia-phase-select` im Projekt-Menü (`DesignWorkspace.tsx:2665-2738`), Commands `design.phaseSetzen`/`design.siaPhaseSetzen` | Vorhanden |
| 22 | Liste | `listeOffen` / «Berechnungsliste» (`liste-toggle`, `DesignWorkspace.tsx:2405`), Registry `dock-stationen.ts:258-271` | Vorhanden |
| 23 | Kommentare | Kein Fund: kein Annotations-/Kommentarsystem auf Modell-Elementen. `DocWorkspace.tsx`s `p.kommentar`-Feld gehört zum Tech-Radar (Kosmo-Wissen), nicht zu Design-Entitäten; alle übrigen Treffer für „Kommentar" sind Code-Kommentare, kein Feature | **NEU** — kein Fund |

### 3.4 · AUSTAUSCH (6)

| # | Werkzeug | Repo-Fundstelle | Status |
|---|---|---|---|
| 24 | Export | `export-pdf`/`export-dxf`/`export-ifc` (+SVG) in `leiste-gruppe-export` (`DesignWorkspace.tsx:2321-2337`) | Vorhanden |
| 25 | Import | `import-ifc`/`import-dxf` in derselben Gruppe (`DesignWorkspace.tsx:2338-2355`) — heute UI-technisch mit Export in einem Menü (`export-menu-toggle`), im Island-Modell zwei getrennte Werkzeuge | Vorhanden (heute mit Export gruppiert) |
| 26 | Rendern | **Nicht in der Design-Station.** Existiert real in KosmoVis: `render-ausfuehren` (`modules/vis/NodeCanvas.tsx:1938`), `postRenderJob`/`freigebenJob` (`modules/vis/vis-jobs.ts:110-168`), erreichbar aus Design über den Stations-Sprung `dock-vis` (`EntwurfsDock.tsx:137`) | Teilweise (andere Station) |
| 27 | Blätter | **Nicht in der Design-Station.** Existiert real in KosmoPublish: `sheet-${index}`/`add-sheet`/`blatt-fuellen` (`modules/publish/PublishWorkspace.tsx:663-959`), erreichbar aus Design über `dock-publish` (`EntwurfsDock.tsx:138`) | Teilweise (andere Station) |
| 28 | Sync | **Nicht in der Design-Station**, sondern App-/Shell-weit: `sync-toggle`/`sync-url`/`sync-room`/`sync-token`/`sync-connect` (`App.tsx:484-649`), `SyncClient`/`onSyncStatus` (`state/project-sync.ts`) | Teilweise (Shell-Ebene, kein Design-Toolbar-Eintrag) |
| 29 | Manuell | Kein Fund — der Umschalter Island-UI ↔ klassische Dock-Fläche existiert noch nicht. **Genau dieser Umschalter ist der Kern von PD2** | **NEU** — zu bauen (PD2) |

**Mapping-Statistik:** 17 **Vorhanden** (davon 3 nur innerhalb Grundriss-Darstellung, 3 in einer
anderen Station/Shell-Ebene erreichbar), 6 **Teilweise** (Command/Datenmodell da, UI-Werkzeug
fehlt oder ist geteilt/fremdstationiert), 4 **NEU** (Öffnung als eigenes Werkzeug, Messen,
Kommentare, Manuell-Umschalter) — wobei Öffnung mit Teilweise-Charakter (Command existiert) auch
als 5. NEU-artiger Fall zu lesen ist, wenn man „eigenständiges ZEICHNEN-Werkzeug" strikt zählt.
**29/29 Zeilen mit Fundstelle oder ehrlichem NEU-Vermerk — vollständig.**

---

## 4 · Vier-Stufen-Modell

### 4.1 · Stufen (Gestaltungskonzept §03, Prototyp-Style-Attribute)

| Stufe | Zustand | Auslöser | Masse/Regeln |
|---|---|---|---|
| 0 | **Pill** | Ruhezustand | 34×104px (vertikale Island) bzw. 104×34px (horizontale Island) bzw. 38×38px-Kreis (Stationen-Orb); schwarzes Glas (`--f-pill`), EIN Übersichtssymbol zentriert (`ic()`-Glyphe, 17-20px) |
| 1 | **Leiste** | Hover (Desktop) / Tap (iPad) | Pill animiert weg (`islIn`, 320ms `cubic-bezier(.34,1.45,.64,1)`), Werkzeuge fächern auf: Symbol + Mono-Titel (8.5px) darunter, mehr nicht. Kategorie-Label als Mono-Kopfzeile (9px, `.18em`) |
| 2 | **Mini-Popup** | Klick auf ein Werkzeug | Direkt am Symbol, nur wichtigste Infos + **2–4 Schnelleinstellungen**; Werkzeug wird damit aktiv; Fenster/Popup animiert `popIn` 200ms `cubic-bezier(.16,1,.3,1)`; Fusszeile «NOCHMALS KLICKEN → ALLE EINSTELLUNGEN» |
| 3 | **Einstellungsfenster** | 2. Klick auf Symbol oder Popup | Grosses freischwebendes Fenster (Beispielbreiten Prototyp: Wand 460px, Sonne 520px), `winIn` 260ms `cubic-bezier(.16,1,.3,1)`, bleibt bis zum Schliessen (`icX`-Knopf) offen |

**Verbindlich (wörtlich, Gestaltungskonzept §03-Box):** *«Alle Werkzeuge bekommen alle vier
Stufen. Wand und Sonne sind im Prototyp als Muster voll durchgespielt — Vorlage, nicht Ausnahme.
Jedes Werkzeug jeder Island erhält nach diesem Muster sein Mini-Popup … und sein
Einstellungsfenster … Kein Werkzeug endet bei Stufe 1.»*

### 4.2 · Auto-Verhalten (Gestaltungskonzept §03-Box, Prototyp `islEnter`/`islLeave`)

- Island klappt **900ms** nach Pointer-Verlassen zur Pill zurück (`this.timers[id]=setTimeout(…,900)`,
  Prototyp `islLeave`); ein offenes Mini-Popup hält sie offen (`popup.island===id`-Guard).
- Werkzeuge **ohne** Popup (`t.pop` nicht gesetzt) quittieren die Aktivierung mit einem Toast
  («**«WAND AKTIV»**»-Muster, hier «‹NAME› AKTIV») für **1.7s** (`setTimeout(…,1700)`, Prototyp
  `pickTool`).
- Undo/Redo bleibt **unsichtbar** (nur Tastatur/Geste) — keine Undo-Knöpfe in Island-Popups/
  -Fenstern (Gestaltungskonzept §07, offener Punkt: Zwei-Finger-Tap-Konvention fürs iPad
  ungeklärt, s. §8 unten).
- iPad: Tap auf Pill = Hover (Stufe 1), zweiter Tap wählt (Stufe 2). Alle Ziele **≥ 44px**
  Trefferfläche (auch wenn die visuelle Pill schmaler ist — Trefferzone wird grosszügiger
  gepolstert).
- `prefers-reduced-motion`: Endzustände ohne Feder-Animation, sofort voll lesbar (kein
  `islIn`/`popIn`/`winIn`, kein `orbPulse`) — Repo-Analogon bereits vorhanden
  (`packages/kosmo-ui/src/aura.css` globale `@media (prefers-reduced-motion: reduce)`-Regel,
  `_ds/…/effects.css` dieselbe Regel).

### 4.3 · Motion-Tabelle (Gestaltungskonzept §04)

| Übergang | Kurve | Dauer | Repo-Token-Kandidat (PD1) |
|---|---|---|---|
| Pill → Leiste (Auffächern) | `cubic-bezier(.34,1.45,.64,1)` | 320ms | `--k-ease-bounce` (`aura.css:247` = `cubic-bezier(.34,1.4,.64,1)` — 1.4 statt 1.45, praktisch deckungsgleich; Repo-Token gewinnt, kein neuer Wert) + `--k-motion-settle` (320ms, `aura.css:194`) |
| Mini-Popup ein | `cubic-bezier(.16,1,.3,1)` | 200ms | `--k-ease-entrance` (identisch, `aura.css:246`) + `--k-motion-base` (200ms, `aura.css:193`) |
| Einstellungsfenster ein | `cubic-bezier(.16,1,.3,1)` | 260ms | `--k-ease-entrance` + neuer `--k-motion-fenster: 260ms` (additiv, liegt zwischen `-base`/`-settle`) |
| Zustands-Wechsel (Chips/Toggles) | `cubic-bezier(.4,0,.2,1)` | 160ms | `--k-ease-standard` (identisch, `aura.css:245`) + `--k-dock-schnell` (160ms, `aura.css:263`) |
| Kosmo-Orb-Puls | weich, zyklisch | 2.4s | kein 1:1-Repo-Token; `--k-dock-orb` (550ms, `aura.css:262`) ist die BodenDock-Entsprechung (andere Dauer, gleiche Familie «Kosmo bewegt sich weich») |

**Befund:** Die drei Kern-Kurven (`bounce`/`entrance`/`standard`) und zwei der drei Kern-Dauern
(`base`200/`settle`320) sind bereits **byte-identisch** im Repo vorhanden (`aura.css:192-194,
245-247`, bereits durch `docs/V080B-DESIGN-SPEZ.md` §7.2 stichprobenverifiziert) — PD1 muss hier
**nichts Neues erfinden**, nur referenzieren. Einzig `260ms` (Fenster) und `2.4s` (Kosmo-Puls)
brauchen je einen additiven Token.

### 4.4 · Je Werkzeug: Stufe-2-Inhalte + Stufe-3-Quelle

Stufe 2 = 2–4 wichtigste Einstellungen (Mini-Popup); Stufe 3 = welches Bestands-Panel/-Dialog
destilliert wird, oder ehrlich «NEU» wo nichts existiert.

**ZEICHNEN**

| Werkzeug | Stufe 2 (2–4 Einstellungen) | Stufe-3-Quelle |
|---|---|---|
| Auswahl | Anzahl Selektion, Kind-Filter (kein Formular nötig) | Inspector.tsx (bereits volles Eigenschaften-Panel für die aktuelle Auswahl) |
| Wand | Aufbau, Dicke, Tragend (Referenzmuster, 1:1 aus dem Prototyp) | Aufbau-Katalog + Inspector-Wandfelder (`Inspector.tsx:95-108`) — Alle Aufbauten/Dicke/Höhe/Umbaustatus |
| Öffnung | Typ (Fenster/Tür), Breite, Höhe | `design.oeffnungSetzen`-Parameter (`design.ts:241-279`: `openingType`/`width`/`height`/`sill`) — NEU zusammenzustellen, kein Bestandsdialog |
| Volumen | Höhe, Nutzung/Programm | `studieOffen`-Panel (`DesignWorkspace.tsx:3696-3849`: GF, Baugrenze, Geschosshöhe, Varianten) |
| Zone | Raumtyp, Fläche | Inspector.tsx (Zonen-Eigenschaften) + `setRoomType`-Command |
| Dach | Dachform, Neigung | `createRoof`-Parameter (`design.ts:580-637`) |
| Treppe | Form, Steigung/Auftritt | `treppen-form`-Select (`DesignWorkspace.tsx:2509`) + `createStair`-Parameter |
| Stütze | Raster-Achse, Querschnitt | `RasterPanel.tsx` («Achsen ins Modell», `rasterOffen`-Panel) |
| Skizze | Annäherungs-Variante (3 Karten) | Freihand-Overlay bleibt eigenes Werkzeug — kein zusätzliches Fenster nötig (heutiges Verhalten, `onSketchWandOeffnung`/Annäherungskarten) |
| Mesh | Extrudier-Distanz | `mesh-edit-panel` (`DesignWorkspace.tsx:3086-3130`: `mesh-extrude-distanz`, `mesh-extrudieren`) |
| Messen | Kette-Typ (aussen/innen/Höhenkoten) — Interims-Inhalt bis ein echtes Mess-Werkzeug existiert | `design.bemassungSetzen`-Felder (`design.ts:2873-2905`) als Übergangsquelle; **echtes Punkt-zu-Punkt-Messen bleibt PD3a-Neubau** |

**ANSICHT**

| Werkzeug | Stufe 2 | Stufe-3-Quelle |
|---|---|---|
| Darstellung | Darstellung3D (auto/material/weiss/schwarz), Poché | Projekt-Menü-Block `darstellung-3d`/`poche-modus`/`fenster-boegen` (`DesignWorkspace.tsx:2764-2815`) — bereits vollständig, nur zu destillieren |
| Sonne | Datum, Zeit, Schatten anzeigen (Referenzmuster) | Inline-Zeile (`sonne-datum`/`sonne-stunde`, `2846-2870`) für Stufe 2; **Stufe-3-Fenster NEU** (Standort/Nachbargebäude/2h-Nachweis wie im Prototyp — heute nicht gebaut) |
| Ebenen | Textur an/aus | `textur-toggle` (`2388-2395`) — Stufe 3 (echtes Mehrschicht-Sichtbarkeitssystem) ist **NEU** |
| Achsen | An/Aus (kein Popup nötig, reiner Toggle) | `achsenAn`/`achsen-toggle` (`PlanView.tsx:667-674`) |
| Trace | Ziel-Geschoss wählen | `traceId`/`trace-select` (`PlanView.tsx:632-646`) |
| Graph | An/Aus | `graphAn`/`graph-toggle` (`PlanView.tsx:660-666`) |

**PROJEKT**

| Werkzeug | Stufe 2 | Stufe-3-Quelle |
|---|---|---|
| Kennzahlen | NGF/GF-Kernzahl | `KennzahlenPanel.tsx` Tab «Übersicht» (voll vorhanden) |
| Checks | Befundzahl, Filter Alle/Fehler | `KennzahlenPanel.tsx`s Checks-Sektion (`checks`/`checks-filter-*`) + `SubmissionsCheckPanel.tsx` |
| Varianten | Aktive Variantenzahl | `VariantenPanel.tsx` (voll vorhanden) |
| Phase | SIA-Phase, Teilphase | Projekt-Menü `phase-stil`/`sia-phase-select` (`2665-2738`) |
| Liste | Kernkennzahl (m²/Einheiten) | `listeOffen`-Panel «Berechnungsliste» |
| Kommentare | Anzahl offener Kommentare (Platzhalter, keine Daten vorhanden) | **NEU** — kein Bestandsdialog, ganze Fähigkeit fehlt |

**AUSTAUSCH**

| Werkzeug | Stufe 2 | Stufe-3-Quelle |
|---|---|---|
| Export | Format-Kurzwahl (PDF/SVG/DXF/IFC) | `leiste-gruppe-export` (`2321-2337`) — bereits vollständig |
| Import | IFC/DXF laden | `import-ifc`/`import-dxf` (`2338-2355`) |
| Rendern | Job-Status (falls einer läuft) | `NodeCanvas.tsx`s Render-Formular (`render-formular-*`, `1832-1946`) — **fremde Station**, Distillation setzt einen Deep-Link voraus (PD3b-Entscheid nötig, s. §8) |
| Blätter | Aktives Blatt, Blattzahl | `PublishWorkspace.tsx`s Blattliste (`sheet-*`, `663-767`) — **fremde Station**, dito |
| Sync | Verbindungsstatus, Peers | `App.tsx`s Sync-Dialog (`sync-url`/`sync-room`/`sync-token`/`sync-connect`) — **Shell-Ebene**, dito |
| Manuell | (kein Popup — Sofort-Umschaltung wie im Prototyp `pickTool` `t.id==='manuell'`) | Ziel ist die komplette Werkzeugleiste + Dock (`docs/V080B-DESIGN-SPEZ.md`) |

---

## 5 · Token-Mapping `--f-*`

Vollständige Tabelle aus Gestaltungskonzept §05 + den `--f-*`-Blöcken im Prototyp-`<style>`
(`.isl-root`/`.isl-root[data-world="kosmos"]`), gegen `aura.css` (PAPIER-Referenz) und
`_ds/…/tokens/*.css` (KOSMOS-Referenz) geprüft.

| Token | PAPIER-Wert (Konzept/Prototyp) | `aura.css`-Referenz (PAPIER) | KOSMOS-Wert (Konzept/Prototyp) | `_ds`-Referenz (KOSMOS) | Befund |
|---|---|---|---|---|---|
| `--f-field` | `#F5F3EE` | `--k-field:#f5f3ee` (`aura.css:29`) | `#0B0D12` | `--ink-900:#0B0D12` (`colors.css:31`) | **Exakt** — kann direkt auf `--k-field` gemappt werden |
| `--f-ink` | `#1A1815` | `--k-ink:#1a1815` (`aura.css:32`) | `#F4F6FA` | `--neutral-100:#F4F6FA` (`colors.css:39`) | **Exakt** — `--k-ink` |
| `--f-accent` | `#1A1815` («Tusche», d.h. Akzent = Tinte selbst) | `--k-accent:#3e96a2` (`aura.css:58`) | `#57B6C2` | `--signal-teal:#57B6C2` (`colors.css:80`) | **Konflikt Papier:** Konzept will monochromen Akzent (Tusche), Repo hat einen bereits bindenden Teal-Akzent (`docs/V080B-DESIGN-SPEZ.md` §6, «Papier» gewinnt gegen DS-Light — jüngeres Owner-Recht). **Entscheid:** `--k-accent` (Teal `#3e96a2`) bleibt Wahrheit für Island-UI-Papier; das Konzept-«Tusche»-Akzent wird NICHT übernommen (s. Sanktionsliste §6). Kosmos-Seite ist exakt. |
| `--f-glass` | `rgba(255,255,255,.82)`, blur 16 | **kein Fund** — «Papier kennt kein Glas» ist geltendes Gesetz (`docs/V080B-DESIGN-SPEZ.md` Gesetz 7, `.k-glass` fällt auf Papier auf `--k-raised`/`--k-line-strong` zurück, `aura.css:429-436`) | `rgba(20,23,31,.68)`, blur 24 | `--k-glass-fill:rgba(20,23,31,.62)` (`aura.css:389`, blur 20 statt 24) | **Konflikt/Lücke:** Kosmos nah (Fill fast identisch, Blur 20 vs. 24 — geringfügig), Papier hat **keine** Entsprechung. **Entscheid:** additiver, auf die Island-Shell **begrenzter** Papier-Glas-Token (z. B. `--k-insel-glas-papier`), der das globale «Papier kennt kein Glas»-Gesetz NICHT bricht (gilt weiterhin für Stationsflächen/Panels) — Ausnahme ausdrücklich nur für schwebende Island-Elemente (Pill/Leiste/Popup/Fenster), analog zu den bestehenden Viewport-HUD-Floats, die ebenfalls schweben. |
| `--f-pill` | `#1A1815`, «immer dunkel» | kein Repo-Äquivalent (Pill-Konzept ist neu) | `rgba(16,19,25,.92)` | — | **NEU** additiv, beide Welten — Regel «Pill bleibt dunkles Glas» gilt unverändert |
| `--f-r-sm`/`--f-r-md` | 4px / 8px («technisch») | `--k-radius-xs:6px`/`--k-radius-sm:8px` (`aura.css:186,176`) — **kein 4px-Wert im Repo** | 8px / 13px («weich») | `--radius-xs:6px`/`--radius-sm:8px` (`_ds effects.css`) — **kein 13px-Wert** | **Konflikt:** Repo-Radien sind **theme-invariant** (V080B-DESIGN-SPEZ §1 Gesetz), Konzept will **theme-abhängige** Radien nur für die Island-Shell. **Entscheid:** eigener, Island-lokaler Radius-Layer (additiv, wirkt nur auf `.isl-*`-Klassen), rundet NICHT die globale Radius-Skala um — vermeidet einen Bruch von `docs/V080B-DESIGN-SPEZ.md` §7.3 (unantastbare Verträge) |
| `--f-gold` | `#8C6F2E` | Papier-Rolle „agent" `#9e8953` (`aura.css:282`) — **nahe, nicht exakt** | `#CBB06A` | `--k-rolle-agent:#cbb06a` (`aura.css:225`), `--signal-gold:#CBB06A` (`colors.css:84`) | Kosmos **exakt**, Papier **abweichend** (Konzept dunkler/wärmer als Repo-Agent-Rolle) — Kosmo-Orb-Gold bekommt einen eigenen `--f-gold`-Wert statt der Rollenfarbe zu recyceln (Kosmo ist keine Pipeline-Rolle) |
| `--f-blur` | `blur(16px) saturate(1.05)` | kein Repo-Äquivalent (Papier glaslos) | `blur(24px) saturate(1.4)` | `.k-glass`: `blur(20px) saturate(1.4)` (`aura.css:434`) | Kosmos nah (Saturate exakt, Blur 20 vs. 24), Papier NEU (s. `--f-glass` oben) |
| `--f-shadow`/`--f-shadow-sm` | `0 14px 36px rgba(26,24,21,.16)` / `0 3px 10px rgba(26,24,21,.10)` | `--k-shadow-overlay`/`--k-shadow-raised` (`aura.css:78-79`, andere Kurven/Deckkraft) | `0 18px 52px rgba(0,0,0,.55)` / `0 4px 14px rgba(0,0,0,.4)` | `--k-shadow-lg:0 18px 48px rgba(0,0,0,.46)` (`aura.css:418`) — nah | Nah, keine Blockade — Island-Shell kann `--k-shadow-lg`/`-md` direkt verwenden (Toleranz im Rahmen der bestehenden Skala) |
| Motion (Kurven/Dauern) | s. §4.3 | `--k-ease-*`, `--k-motion-*` (`aura.css:192-194,245-247`) | identisch (Motion ist weltunabhängig) | — | **Exakt** (bis auf die zwei additiven Fälle §4.3) |

**Zwei bindende Regeln aus dem Konzept (§05, wörtlich übernommen):**
1. **«Die Pill bleibt in beiden Welten dunkles Glas»** — unabhängig vom Theme, das
   wiedererkennbare Signal «hier liegt eine Island».
2. **«Plangrafik bleibt immer Papier»** — Schwarz/Grau nach Stiftsystem (`derive/stilblatt.ts`,
   `--k-plan-paper`), **nie** UI-Farben, unabhängig davon, ob die Insel-Chrome gerade PAPIER oder
   KOSMOS zeigt (identisch mit `docs/V080B-DESIGN-SPEZ.md` Gesetz 3 «Papier ist Papier»/
   8c-Invarianz — keine neue Regel, nur eine zusätzliche Bestätigung für die Island-Welt).

**Token-Zeilenzahl:** 10 Token-Zeilen (`--f-field/-ink/-accent/-glass/-pill/-r-sm+md/-gold/-blur/
-shadow+shadow-sm/Motion`) + 2 Grundsatzregeln — vollständig gegen beide Prototyp-`<style>`-Blöcke
(PAPIER `.isl-root`, KOSMOS `.isl-root[data-world="kosmos"]`, `Kosmodesign Island-UI.dc.html`
Z.22-47) und die Konzept-Tabelle (Gestaltungskonzept §05) geprüft.

---

## 6 · Sanktionsliste §10-S

Erwartet **additiv/eng begrenzt**, keine Bestandsänderung ohne expliziten Vermerk:

1. **Default-Flip design-Station auf Island-UI** (PD2) — die Design-Station zeigt nach dem Flip
   standardmässig die Island-UI statt der klassischen Werkzeugleiste/Dock. Dies ist die einzige
   Verhaltensänderung am BESTEHENDEN Standard-Bildschirm dieser gesamten PD-Serie.
2. **Bestands-E2E via EINEM globalen Seed-Helper auf Manuell** — die komplette heutige
   E2E-Suite der design-Station (`e2e/module.spec.ts`, `dock-*.spec.ts`, `design-werkzeugleiste.
   spec.ts` u. a.) bleibt **byte-gleich in ihren Assertions**; ein einziger, globaler
   `localStorage`-Seed vor jedem Testlauf zwingt den Start-Zustand auf «Manuell» (dasselbe
   Muster wie der bestehende `kosmo.onboarded`-Seed in `playwright.config.ts`/den Spec-
   `beforeEach`-Hooks, sowie `kosmo.ui.v1` bereits als Präzedenzfall für einen minimalen,
   defensiv geparsten Seed, s. `state/ui-zustand.ts:222-241`). **Kein einziger bestehender
   Test-Assert wird verändert** — nur der Startzustand wird per Seed fixiert.
3. **Additive `island-*`-testid-Namensschema** — jedes neue Island-DOM-Element bekommt ein
   `data-testid="island-…"`-Präfix (z. B. `island-zeichnen-pill`, `island-wand-popup`,
   `island-wand-fenster`), disjunkt von allen bestehenden `tool-*`/`view-*`/`leiste-gruppe-*`-
   Namen — keine Kollision, keine Umbenennung.
4. **Keine Golden-Berührung** — Plangrafik/`derive/stilblatt.ts`/die 35 SVG-Goldens sind von
   diesem Strom nicht betroffen (Regel 2 aus §5 «Plangrafik bleibt immer Papier» bestätigt das
   nur, ändert nichts an der Geometrie-Erzeugung).
5. **Token-Layer additiv** — `--k-insel-*`-Tokens (Glas-Papier-Ausnahme, Island-lokale Radien,
   `--f-gold`-Eigenwert, `--k-motion-fenster`) kommen **zusätzlich** zur bestehenden `--k-*`-
   Skala, ersetzen nichts (s. §5-Konfliktzeilen).
6. **Manuell-Umschalter ist additiv, kein Ersatz** — die klassische Werkzeugleiste/Dock
   (`docs/V080B-DESIGN-SPEZ.md`) bleibt vollständig erhalten und unverändert; Island-UI ist eine
   zusätzliche Präsentationsschicht über demselben Werkzeugbestand/denselben Commands (README-
   Zitat: *«Beide Modi teilen denselben Werkzeugbestand und dieselben Commands — die Island-UI
   ist eine Präsentationsschicht, kein zweites Programm.»*).
7. **PD3c «Island-Modus radikal leer» (Owner-Befehl 17.07.2026, wörtlich:** *«achtung ich sehe
   noch docks und so auf den screenshots z.b die grunddock..alles weg bitte alles in die
   islands...»***):** im Island-Modus (`designOberflaeche==='island'`) ist NUR noch sichtbar:
   Viewer/Plangrafik, die vier Islands, Ansichts-Info, Stationen-Orb, Kosmo-Orb-Zugang. ALLES
   andere wird zusätzlich (additiv zur PD2-Ausblendung der klassischen Werkzeugleiste/des Docks,
   Sanktion 1 oben) bedingt ausgeblendet, nirgends entfernt — der Modus `'manuell'` bleibt in
   jedem der folgenden Fälle byte-gleich wie heute:
   - **`EntwurfsDock`** (linke Rail, `DesignWorkspace.tsx`) — entfällt im Island-Modus komplett
     (§8 Frage 10 jetzt Owner-entschieden, s. dort); der Kosmo-Orb-Zugang («entwurf-sprechen»-
     Kachel) wandert dafür auf das freistehende `<KosmoSymbol>` in `App.tsx`.
   - **`BodenDock`** (untere Knopfreihe, `App.tsx`, app-weiter Navigations-Layer) — entfällt NUR
     für die Kombination `screen==='design'` + Island-Modus; jede andere Station behält ihr
     BodenDock unverändert.
   - **Statusleiste** (Fokus/Arbeiten/Prüfen-Presets, Modus-Chip, Klick-Hinweise,
     `DesignWorkspace.tsx`s `statusleiste`-Div).
   - **Zoom-Steuerung + Raster/Texturen/Kontext-Chips** (`ViewportChrome.tsx`s Bottom-Leiste,
     gerendert aus `Viewport3D.tsx`) sowie die Orbit/Pan/Zoom/Einpassen-Nav-Leisten in beiden
     Ansichten (`NavLeiste.tsx`-Instanzen `nav-3d` in `Viewport3D.tsx` und `nav-2d` in
     `PlanView.tsx`) — reine Viewport-Chrome, keine Maus-/Touch-Navigation selbst (die bleibt in
     jedem Modus aktiv).
   - **PlanView-HUD** (Achsen-/Graph-Toggle, Trace-Select, `PlanView.tsx`).

   **Kern-Arbeit statt reiner Politur:** Achsen/Trace/Graph lebten bis PD3c als PlanView-lokaler
   `useState` (PD3a-Kommentar: «kein eigener Zustand hier, um keinen zweiten State neben PlanView
   zu führen»). PD3c hebt sie in den neuen, additiven, NICHT persistierten Store
   `state/plan-ansicht.ts` (`achsenAn`/`graphAn`/`traceId`) — `PlanView.tsx` konsumiert denselben
   Store (Verhalten im Modus `'manuell'` bleibt mechanisch unverändert), und
   `island/inhalte/ansicht.tsx` ersetzt die bisherigen Status+Anleitungs-Texte für Trace/Graph
   durch ECHTE Schalter auf diesem Store (`island-trace-ziel`/`island-graph-an` u. Fenster-
   Varianten). Achsen bleibt der einzige `hatPopup:false`-Sofort-Toggle der ANSICHT-Insel
   (`island-katalog.ts` unverändert) — der gewählte Verdrahtungsweg ist der zweite der beiden
   erlaubten: `DesignWorkspace.tsx`s `aktiviereIslandWerkzeug()` bekam einen Fall `'achsen'`, der
   direkt `usePlanAnsicht.getState().setAchsenAn(...)` togglet.

**Ausdrücklich NICHT sanktioniert (bleibt tabu wie in `docs/V080B-DESIGN-SPEZ.md` §7.3):**
`state/dock-kern.ts`-Solver, `chat.ts`s `turn()`-Schleife, alle bestehenden `testid`s/aria-labels,
alle 35 Goldens, `--k-*`-Namensraum als kanonische Wahrheit.

---

## 7 · Pakete PD1–PD4

| Paket | Scope | Dateikreis | Gate |
|---|---|---|---|
| **PD0** | Diese Spezifikation + §10-Addendum in `V082-SPEZ.md` | `docs/ISLAND-UI-SPEZ.md` (neu), `docs/V082-SPEZ.md` (nur Addendum) | Mapping-Tabelle 29/29 mit Fundstelle/NEU-Vermerk; Token-Tabelle vollständig; ≥12 Fundstellen stichprobenverifiziert (dieses Dokument: 20+, s. Abschlussbericht) |
| **PD1 Fundament** | Token-Schicht `--f-*`→`--k-*`-Mapping (inkl. additiver `--k-insel-*`-Ausnahmen aus §5), `IslandShell`-Komponente (Zustandsmaschine Pill↔Leiste↔Popup↔Fenster je Island, 900ms-Timer, Motion-Kurven aus §4.3, `prefers-reduced-motion`), Stufen 0–1 mit statischem Werkzeug-Katalog (noch keine echte Command-Anbindung) | `packages/kosmo-ui/src/aura.css` (additiv), neue `packages/kosmo-ui/src/island-shell.tsx`+`.css` (oder `apps/kosmo-orbit`-lokal, je nach Wiederverwendungsbedarf — Owner-Entscheid PD1) | Alle vier Islands rendern Pill+Leiste in beiden Farbwelten, Farbwelt-Umschalter funktioniert, `prefers-reduced-motion` verifiziert per Test, kein bestehender Token verändert (Diff-Beweis gegen `aura.css`) |
| **PD2 Verdrahtung** | Vier Islands aus echten `ToolId`s/Commands befüllen (§3-Mapping), Ansichts-Info + Stationen-Orb (neu, §1), Umschalter Island ↔ Manuell (persistent im Projekt-Store), **Default-Flip** + globaler E2E-Seed-Helper (Sanktion 1+2), Toast-/Undo-Regeln aus §4.2 | `apps/kosmo-orbit/src/modules/design/` (neue Island-Integration), `state/ui-zustand.ts` (additiv: Island/Manuell-Flag), `e2e/`-Seed-Helper (neu, eine Datei) | Bestands-E2E-Suite grün OHNE Assertion-Änderung (nur Seed ergänzt); Default-Flip sichtbar (Screenshot); Umschalter funktioniert beidseitig; Ansichts-Info/Stationen-Orb bedienbar |
| **PD3a** | Mini-Popups + Einstellungsfenster für **ZEICHNEN + ANSICHT** (17 Werkzeuge) nach Wand/Sonne-Muster, Inhalte aus §4.4 destilliert | Design-Werkzeug-Dateien (Wand/Öffnung/Volumen/Zone/Dach/Treppe/Stütze/Skizze/Mesh/Messen/Auswahl + Darstellung/Sonne/Ebenen/Achsen/Trace/Graph) — dateidisjunkt zu PD3b (PROJEKT/AUSTAUSCH-Dateien) | Jedes der 17 Werkzeuge hat Stufe 2 UND Stufe 3 (kein Stufe-1-Endpunkt) |
| **PD3b** | Mini-Popups + Einstellungsfenster für **PROJEKT + AUSTAUSCH** (12 Werkzeuge), inkl. Entscheid zu Rendern/Blätter/Sync (Deep-Link vs. native Mini-Kopie, s. §8 offene Frage) | Kennzahlen/Checks/Varianten/Phase/Liste/Kommentare + Export/Import/Rendern/Blätter/Sync/Manuell — dateidisjunkt zu PD3a | Jedes der 12 Werkzeuge hat Stufe 2 UND Stufe 3; Manuell-Umschalter (aus PD2) bleibt einziger Sofort-Wechsel ohne Popup |
| **PD4 Abschluss** | Kosmo-Orb-Anbindung (echte Companion-Vorschlagskarte + Aktions-Chips, kein Platzhaltertext), iPad/Touch-Polish (≥44px-Ziele verifiziert), eigene Island-E2E-Suite (alle 4 Islands × 4 Stufen × 2 Farbwelten × Manuell-Umschalter), Screenshots beider Welten | `shell/KosmoPanel.tsx`-Anbindung (additiv), neue `e2e/island-ui.spec.ts` | Island-E2E-Suite grün; Screenshots PAPIER+KOSMOS je Insel-Stufe; **hartes Gate: kein Werkzeug (0/29) endet bei Stufe 1** |

**Reihenfolge (bindend):** PD0 → PD1 → PD2 → (PD3a ‖ PD3b, dateidisjunkt) → PD4.

**Hartes PD3-Gate (wörtlich aus dem Auftrag):** *«Kein Werkzeug endet bei Stufe 1.»* Die
P8-Matrix-Abnahme (`docs/V082-SPEZ.md` §9-Addendum) prüft das über alle 29 Zeilen der
Mapping-Tabelle §3 einzeln nach.

---

## 8 · Offene Punkte / Owner-Fragen

Direkt aus dem Konzept übernommen (§07 «Offene Punkte») + eigene, bei der Repo-Prüfung
gefundene Lücken:

1. **Undo/Redo aufs iPad** (Konzept §07): braucht es eine Zwei-Finger-Tap-Konvention, wenn
   Undo/Redo unsichtbar bleibt (nur Tastatur/Geste)? Ungeklärt.
2. **Tastaturkürzel-Overlay** (Konzept §07): Kürzel-Übersicht bei gedrückter Cmd-Taste — noch
   nicht spezifiziert, welche Kürzel für die neuen Werkzeuge (Öffnung/Messen/Kommentare) gelten
   sollen.
3. **4er-Screen-Kollisionsregeln** (Konzept §07): Verhalten der Islands bei sehr kleinen Fenstern
   im 4er-Grid — der bestehende Dock-Solver (`dock-kern.ts`) hat Kollisionsregeln, sie sind aber
   nicht 1:1 auf vier fixe Rand-Islands übertragbar (der Solver kennt Panels, keine
   Rand-Pills) — PD1 muss entscheiden, ob eigene, einfachere Kollisionsregeln reichen.
4. **Rendern/Blätter/Sync: Deep-Link oder native Mini-Kopie?** Diese drei AUSTAUSCH-Werkzeuge
   gehören heute zu anderen Stationen (Vis/Publish) bzw. zur Shell (Sync) — Island-UI könnte
   entweder (a) beim Klick zur jeweiligen Station wechseln (wie `EntwurfsDock.tsx`s
   `dock-vis`/`dock-publish` heute schon tun), oder (b) eine eigene, kleine In-Design-Kopie der
   wichtigsten Funktion bauen (z. B. „PDF exportieren aus KosmoDesign heraus rendern lassen").
   Diese Spez trifft **keine** Vorentscheidung — PD3b muss das mit dem Owner klären.

   > **Bereits entschieden und real verdrahtet (v0.8.3, `docs/V083-SPEZ.md` §4, E4):** Option (a)
   > — Deep-Link zur jeweiligen Station, keine native Mini-Kopie. PD3c hat die von PD3b
   > vorbereitete Brücke (`registriereStationsWeg(onStationOeffnen)`) mit dem bestehenden
   > `onStationOeffnen`-Weg verdrahtet (`DesignWorkspace.tsx:740-752`, Kopfkommentar dort zitiert
   > diese Entscheidung bereits wörtlich) — die AUSTAUSCH-Insel-Fenster (Rendern/Blätter,
   > `ZurStationKnopf`) navigieren damit ECHT zur Vis-/Publish-Station statt nur einen
   > „noch nicht verdrahtet"-Hinweis zu zeigen. `Sync` bleibt bewusst ohne Deep-Link (kein
   > eigenes Stations-Ziel, reine Shell-Funktion) und benennt stattdessen ehrlich die
   > Peer-Lücke (`island/inhalte/austausch.tsx`). Dieser Punkt ist damit geschlossen, keine
   > weitere Bauarbeit offen.
5. **Öffnung als eigenständiges ZEICHNEN-Werkzeug**: heute nur über die Skizze-Geste erreichbar.
   Braucht es einen eigenen `ToolId 'oeffnung'` mit eigenem Click-Platzier-Modus (wie Wand), oder
   bleibt die Skizze-Geste der einzige Weg und die Island zeigt nur die Einstellungen? Owner-
   Entscheid nötig, bevor PD3a das baut.
6. **Kommentare**: komplett neue Fähigkeit (keinerlei Datenmodell im Kernel). Braucht eine
   eigene Kernel-Entität (`comment`/`annotation`) + Command, bevor PD3a hier mehr als eine leere
   Hülle bauen kann — grösster Einzelaufwand der ganzen Mapping-Tabelle.
7. **«Messen»**: analog zu Kommentare — ein echtes interaktives Punkt-zu-Punkt-Mess-Werkzeug
   braucht vermutlich einen neuen Command (`design.massKetteSetzen` o. ä.), der heutige
   `design.bemassungSetzen`-Command steuert nur die automatische Anzeige, keine Nutzer-Messung.
8. **Papier-Glas-Ausnahme** (§5): das Konzept will echtes Glas für Papier-Islands, das bisherige
   Gesetz «Papier kennt kein Glas» gilt aber für Stationsflächen. Diese Spez schlägt eine eng
   begrenzte, additive Ausnahme NUR für die Island-Shell vor (§5/§6) — Owner-Bestätigung dieser
   Auflösung steht aus, bevor PD1 den Token baut.
9. **Radius-Theme-Abhängigkeit** (§5): analog — Island-lokaler Radius-Layer statt globaler
   Umstellung, Owner-Bestätigung ausstehend.
10. **Stationen-Orb-Konsolidierung** (§1): ein einziges Hover-Popover mit allen 5 Stationen +
    Rollenpunkten existiert nicht; PD2 baut es neu. Sollen die bestehenden `dock-*`-Sprünge aus
    `EntwurfsDock.tsx` dabei entfallen (Doppelspurigkeit vermeiden) oder parallel bestehen bleiben
    (Bestandsschutz für die linke Rail)? Owner-Entscheid.

    > **Owner-entschieden 17.07.2026 (PD3c «Island-Modus radikal leer», wörtlich:**
    > *«achtung ich sehe noch docks und so auf den screenshots z.b die grunddock..alles weg bitte
    > alles in die islands...»***):** die `dock-*`-Sprünge aus `EntwurfsDock.tsx` entfallen im
    > Island-Modus — **keine Doppelspurigkeit**. Der `StationenOrb` (PD2, bereits gebaut) ist ab
    > sofort der EINZIGE Direktzugang zu den anderen vier Stationen, solange die design-Station im
    > Island-Modus ist. Das `EntwurfsDock` selbst rendert im Island-Modus gar nicht mehr (auch
    > seine übrigen Kacheln — Sprechen/Skizzieren/CAD — nicht nur die `dock-*`-Sprünge), s. §6
    > Sanktion 7. **Im Modus `'manuell'` bleibt das `EntwurfsDock` vollständig unverändert** (kein
    > Bestandsschutz-Bruch für die linke Rail dort) — die Konsolidierung gilt ausschliesslich für
    > die neue Standard-Oberfläche. Umgesetzt in `DesignWorkspace.tsx` (Render-Ort des
    > `EntwurfsDock`, PD3c).

---

*Ende der Island-UI-Spezifikation. Bezug: `docs/V082-SPEZ.md` §10-Addendum (Kurzverweis +
Matrix-Zeilen C-33ff), `docs/V080B-DESIGN-SPEZ.md` (Gestaltungsgesetze/Token-Disziplin bleiben
in Kraft, diese Spez widerspricht ihnen nicht, sondern baut die Island-Shell nach denselben
Regeln).*
