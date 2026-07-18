# V084-SPEZ — v0.8.4 «Ein Guss» (verbindlich)

> **W0-Dokument (Fable, 18.07.2026).** Grundlage: Owner-Mängelliste aus echter
> v0.8.2-Windows-Nutzung (Auftrag 18.07., wörtlich in §1), vier bindende
> Owner-Antworten (§1.2), drei Erkundungs- und ein Design-Bericht (Fundstellen
> in §2). Muster: `V083-SPEZ.md`. Für Bauagenten gilt: dieses Dokument schlägt
> jede eigene Interpretation; Abweichungen nur über Fable.

## 1 · Auftrag

### 1.1 Owner-Mängelliste (v0.8.2-Nutzung, sinngemäss gruppiert)
- **Hauptmenü:** nicht scrollbar; Maus buggt (mal weg, mal Windows-, mal
  Kosmo-Cursor); Texte oben mittig zentriert; kein Balken oben; KosmoOrbit-
  Schriftzug zentral mittig; unten mittig nebeneinander Kosmo-Symbol ·
  KosmoData · KosmoDesign · KosmoOffice, NICHT mehr drehend; Icons nach
  Designsprache; Hover-Untertools sauber geordnet, nichts überschneidend;
  «warum steht v0.8.1?» (→ in v0.8.3 gefixt, ROADMAP 447 — nur kommunizieren).
- **Allgemein:** Start immer Vollbild; Claude-Abo-Anmeldung klappt nicht.
- **KosmoDesign:** Kosmo-Orb nicht gelb hinterlegen (Mittelpunkt+Orbs färben);
  Hover-Mini-Popup mit Textverlauf fehlt; Doppelklick öffnet Kosmo-Menü nicht;
  REGEL: Kosmo überall gleich; UI säubern (Glass); Geschosswahl raus aus
  Tab-Leiste → vertikale Pille unter KosmoOrbit-Logo (gleiche Radien/Grau);
  Logo grau; «AK» = Zentralsymbol mit UNTERTOOLS der anderen Stationen, nie
  die offene; Maus-Kontinuität überall; Pille verschwindet ~1s nach
  Weg-Hover; Aussenklick/Esc schliesst jedes Popup (app-weit); Pillen mit
  Symbolen statt Buchstaben, kürzer, glasiger; Werkzeuge nie
  Buchstaben-Kürzel; Windows-Maus nie sichtbar; Auswahl-Umrandung kräftiger;
  Elemente bearbeiten/löschen wie ArchiCAD; Enter/Doppelklick bestätigt
  überall; Rechtsklick = Schnelleinstellungen; Beschreibungsblock links unten
  abgeschnitten → nur Lang-Hover/Einstellungen; Hover-Animation (Dynamic-
  Island-artig); Papier-Design an Kosmo-Sprache angleichen.
- **KosmoVis:** Maus; dunkle Kosmo-Sprache (Node-Tree dunkel, Nodes hell);
  altes UI raus; Stimmungen als HDRIs MIT Bild statt Text; weisser Tab rechts
  unten klären; alte Dock raus → Island-Konzept mit Vis-Toolsets; Demolauf
  (Kamera/Material/Cycles/AI) als User UND Kosmo-automatisierbar.
- **KosmoData:** Sync mit www.architekturkosmos.ch; Design+Funktionen weiter.
- **KosmoPrepare:** Dock raus; dediziertes Design; weiterentwickeln; Islands.
- **KosmoPublish:** Layout-Zoom; weiterentwickeln; Islands.
- **Angenommene Fable-Kandidaten:** Zeichnen-Tiefe, Island-Restausbau (8
  Rahmen-Werkzeuge, §8-3), Eval-Harness commands, KosmoData-Bilder+Dossier,
  Flakes (dock-tour, Tab(c)), Windows-Installer-Zustellung im Release-Ritual.

### 1.2 Owner-Antworten (bindend)
1. Island-UI-Rollout: **ALLE Stationen komplett** in v0.8.4.
2. KosmoOffice: **Platzhalter-Kachel** (existiert als «kommend»-Hauptwerkzeug,
   `orbit-werkzeuge.ts:216-231` — bleibt ehrlich nicht klickbar).
3. Claude-Login: **beides** — ant-CLI-Abo-Brücke führen UND API-Key-Weg polieren.
4. Website: selbst identifiziert — **die Website IST der Repo-Root**
   (Next.js-Export, `src/worker.ts` serviert `data/mock-entries.json` als
   `/api/entries.json`; `tools/build-kosmodata-seed.mjs` baut daraus den Seed).

## 2 · Diagnosen (verifizierte Fundstellen — Bauagenten bauen GEGEN diese, nicht gegen Vermutungen)

| # | Diagnose | Fundstelle |
|---|---|---|
| D1 | Cursor «buggt»: CursorEbene liegt NIE hinter Layern (z 2147483000, pointer-events:none) — sie VERSTECKT sich per Heuristik über Zonen mit crosshair/grab/grabbing/resize/not-allowed | `CursorEbene.tsx:80-88`; `vis-visual.css:162/197/213`; `dock-flaeche.css:143-352`; `einstellungen.css:113` |
| D2 | Hauptmenü-Balken app-global; Rotation in kosmo-ui; Scroll-Container app-weit; 3 dokumentierte Fächer-Overlap-Risiken | `App.tsx:523-525`; `aura.css:979-1004`; `app.css:157-176`; `orbit-065.css:67-146` |
| D3 | Kein Vollbild-Feld; kein Rust-Fenster-Code | `tauri.conf.json:13-22`; `src-tauri/src/lib.rs` |
| D4 | Abo-Brücke existiert (Tauri `claude_login` → `ant`-CLI → OAuth-Header); Lücken: Desktop-only, ant-Pflicht, keine Key-Validierung | `lib.rs:31-72`; `cloud-login.ts:27-33`; `anthropic.ts:40-48`; `KosmoPanel.tsx:1776-1837` |
| D5 | Orb: EIN Kern, DREI Wrapper; Gold = Hüllen-Hintergrund; kein Doppelklick nirgends | `shell/KosmoOrb.tsx`; `island.css:635` (`--f-gold`); `KosmoSymbol.tsx:67-85`; `island/KosmoOrb.tsx:115-184`; `StationenOrb.tsx:98-106` |
| D6 | Esc/Aussenklick nur in KMenu/KDialog; kein gemeinsamer Hook; fehlt in Orb-Karte/KosmoSymbol/StationenOrb/OrbitStart-Fächern | `kosmo-ui/src/overlay.tsx:90-246` |
| D7 | Island-Generalisierungs-Blocker: 5 `IslandId`-Records + Singleton-REGISTRY + design-gekoppelte inhalte/ | `island-katalog.ts:42-62`; `IslandShell.tsx:49-54`; `registry.ts:28-35` |
| D8 | ArchiCAD-Basis komplett im Kernel; fehlt NUR UI-Verdrahtung (Delete-Binding, Kontextmenü, Abschluss-Gesetz, Highlight w22) | `design.ts:456/512/643`; `DesignWorkspace.tsx:807-828/963-995/996-1040/1131-1276`; `PlanView.tsx:1484-1503/1650-1664` |
| D9 | Vis: Zoom-Leiste = `.vis-chrome-bottomright`; Canvas hell; Stimmungen = 3 Prompt-Texte; kein environment-Feld (→ W0 ergänzt); kein vis.render-Command | `NodeCanvas.tsx:1521-1556/1594`; `vis-visual.css:177`; `visgraph.ts:65-69`; `commands/vis.ts` (9 Graph-Commands) |
| D10 | Publish ohne Zoom (statische viewBox); bestes Muster = NodeCanvas-Zoom | `PublishWorkspace.tsx:1499-1501`; `NodeCanvas.tsx:520-576` |
| D11 | BodenDock-Guard nur design+island | `App.tsx:306/1111` |
| D12 | Icons: 9 echte SVGs + Bauvorschrift; ~20 fehlen; Pillen zeigen Text | `werkzeug-icons.tsx:1-31`; `IslandShell.tsx:411/428-429`; `island-katalog.ts:73` |
| D13 | Kürzel: 9; oeffnung/messen/kommentar fehlen; `?`-Overlay existiert; Kopfkommentar veraltet | `kurztasten.ts:14-17/54-64`; `Kurzbefehle.tsx` |
| D14 | Eval-Vorbild + ScriptedProvider vorhanden | `wissen/training/eval/kosmo-zeichner-grundriss/pruefe-eval.mts`; `kosmo-ai/src/scripted.ts:91` |
| D15 | Beschreibungsblock = isl-popup-hinweis im geklammerten Popup | `island.css:212-251`; `IslandShell.tsx:463-468` |
| D16 | Website-Sync-Mechanik existiert einseitig (Seed-Builder liest mock-entries) | `src/worker.ts:95-97`; `tools/build-kosmodata-seed.mjs:5-8`; `kosmo-data/src/live.ts:34` |

## 3 · Eingefrorene Entscheide (E-Blöcke)

- **E1 PC0-Architektur:** `IslandBuehne` erhält ein Konfig-Objekt
  `InselKonfig { id: string; label; orientierung: 'vertikal'|'horizontal';
  randKlasse; werkzeuge: IslandWerkzeug[] }[]` + eine `InhaltsRegistry`-INSTANZ
  (Klasse statt Modul-Singleton; design behält seine als Default-Export für
  Bestands-Importe). `IslandId` bleibt als design-lokaler Typ bestehen; die 5
  Records wandern in die design-Konfig. **Sanktion: verhaltensneutral — KEINE
  testid-/CSS-Klassen-Umbenennung, alle 9 island-Specs müssen ungeändert grün
  bleiben** (einzige erlaubte Spec-Änderung: keine).
- **E2 Orb-Gesetz (überall, EIN Wrapper `KosmoOrbAnker`):**

  | Interaktion | Verhalten |
  |---|---|
  | Ruhe | Hülle neutral-glasig (`--f-glass`-Familie, NIE Gold-/Farb-Fläche); Kern + 4 Punkte tragen die Stations-/Rollenfarbe |
  | Hover/Focus | Mini-Popup mit Textverlauf (letzte Kosmo-Aktivität, Muster `KosmoSymbol.tsx:67-78`) |
  | Einfachklick | Konversationskarte (Muster `island/KosmoOrb.tsx:115-184`) |
  | Doppelklick | KosmoPanel (grosses Kosmo-Menü) |
  | Esc / Aussenklick | schliesst Popup/Karte (E3-Hook) |

  Gebaut erst W4 (PB4); W0 friert NUR diese Tabelle ein.
- **E3 Popup-Gesetz:** neuer Hook `useOverlaySchliessen(ref, onClose, {esc,
  aussenklick, hoverRueckklappMs?})` in `kosmo-ui` (Verallgemeinerung der
  KMenu-Logik overlay.tsx:96-110). Rollout-Pflicht: island-Popups/Fenster,
  Orb-Karte, KosmoSymbol-Mini, StationenOrb, OrbitStart-Fächer. Hover-Popups
  klappen ~1000ms nach Weg-Hover zurück (ersetzt die 900ms nur dort, wo der
  Owner-Punkt gilt — bestehende RUECKKLAPP_MS-Verträge in Specs beachten).
- **E4 render-scene/v1 environment:** ADDITIV neben `sun` — `{preset:
  'morgen'|'abend'|'weiss', hdri?: string, intensitaet: 0..10 =1,
  rotationGrad: 0..360 =0}` (W0-Commit, contracts-Test 41/41). Die App
  verschifft KEINE .hdr-Dateien; `hdri` ist eine Kennung, die die HomeStation
  lokal auflöst.
- **E5 HDRI-Politik:** App-seitig 3 prozedurale Preview-Environments
  (THREE.Sky/Gradient→PMREM, 0 Assets, deterministisch) + kleine Vorschau-
  Kacheln als BILD (Canvas-generiert). Optionaler Nachtrag NUR wenn
  Container-Download real klappt: ≤3 × 1k-CC0-HDRIs, Budget ≤10 MB,
  `public/hdri/` + QUELLEN-Doku. Kein 2k/4k im Installer.
- **E6 vis.render-Command:** echter Kernel-Command (zod: kameraWahl, presetId?,
  environment?, backbone?), `run` schreibt den Render-AUFTRAG als
  SettingsPatch (Auftragsbuch-Muster); Job-Ausführung/Status bleiben in
  `vis-jobs.ts`/`vis-runtime.ts` (Laufzeit≠Modell). Damit ist Rendern Teil von
  `commandTools()` → Kosmo-automatisierbar; PC2s Demolauf fährt den ganzen Weg
  über Commands.
- **E7 Website-Sync-Vertrag:** Quelle der Wahrheit = Root `data/mock-entries
  .json`. Sync-Gate `kosmo-orbit/tools/pruefe-website-sync.mjs`: regeneriert
  den Seed in Temp via build-kosmodata-seed.mjs, byte-difft gegen den
  eingecheckten `public/kosmodata-seed.json`, protokolliert den
  mock-entries-Hash; wird Teil von `release-gate` (package.json:23).
  Schreibrichtung = Datei-Änderung im Repo (kein API-Write; live.ts bleibt
  lesend). Eigene Referenzen (IndexedDB) sind NICHT sync-pflichtig.
- **E8 Icon-Schnittstelle:** `island-katalog.ts` `glyphe: string |
  ComponentType<{ size?: number }>` — Strings bleiben gültig (Fallback), SVGs
  gewinnen. Die 20 neuen Icons entstehen in W1 als EINE neue Datei
  `design/island/island-glyphen.tsx` (+Unit-Test) nach der Bauvorschrift
  `werkzeug-icons.tsx:1-31` (1.75/24-Strich, runde Kappen, GENAU EIN
  Akzentpunkt, currentColor, aria-hidden, leerer innerText) — UNVERDRAHTET;
  Verdrahtung gehört PB2 (design) bzw. den PC-Paketen (je Station).
- **E9 Vollbild:** `tauri.conf.json` Hauptfenster `"maximized": true` +
  Einstellungs-Schalter «Beim Start maximieren» (Default AN); kein
  Rust-Umbau nötig, ausser der Schalter verlangt window-API — dann kleinster
  `lib.rs`-Command.
- **E10 Claude-Login:** ant-CLI-Weg FÜHREN (Erkennungs-Status, Install-
  Anleitung mit echtem Befehl, «erneut prüfen»-Knopf), API-Key bekommt einen
  echten Validierungs-Ping (billigster Anthropic-Call, Fehlerbilder
  unterschieden: Netz/401/Quota), Abo-Grenze ehrlich erklärt (Browser kann
  kein Abo). Kein Schein-Login.

## 4 · PA2-Spec-Verträge (vorab definiert — ERSETZEN, nicht löschen)

Der Hauptmenü-Neubau bricht bewusst: `orbit-start.spec.ts:90-112` (Rotation),
`zentrale-kacheln.spec.ts:29`, `orbit-hub-vollausbau.spec.ts:101-114`
(app-zentrale-scroll). Neue Verträge:
1. **Statik:** `.k-orbit-knoten` existiert nicht mehr ODER trägt keine
   `animation`; zwei Messungen der Kachel-BoundingBox im Abstand 500ms sind
   identisch.
2. **Komposition:** kein `app-header` im home-Screen-DOM; Wortmarke
   `data-testid="orbit-wortmarke"` horizontal zentriert (|centerX −
   viewport/2| < 2px); Kachel-Reihe `data-testid="zentrale-kacheln"` unten
   mittig, Reihenfolge Kosmo · KosmoData · KosmoDesign · KosmoOffice;
   Office-Kachel trägt sichtbares «kommend» und ist nicht klickbar.
3. **Kein Scroll:** `document.scrollingElement.scrollHeight <= innerHeight`
   auf home bei 1440×900 UND 1280×720.
4. **Fächer:** je Hauptkachel Hover → Untertool-Liste sichtbar; paarweise
   Bounding-Box-Überlappungsfläche aller sichtbaren Untertool-Karten = 0;
   jede Karte vollständig im Viewport.
5. **Version:** Versionszeile zeigt `v${__APP_VERSION__}` (an neuer Stelle,
   testid `orbit-version`).

## 5 · Wellen & Hotspot-Eigentum (bindend)

Hotspot-Matrix: `App.tsx` W1=PA2 → W2=PC1 · `island.css` W1=PC0 → W2=PB2 →
W3=PB3 → W4=PB4 → W5=PB6 · `DesignWorkspace.tsx` W2=PB1 → W3=PB3 → W4=PB5 ·
`PlanView.tsx` W2=PB1 → W4=PB5 → W5=PB6 · `kosmo-ui` W1: aura.css=PA2,
overlay.tsx=PA4 (dateidisjunkt). Je Welle EIN Eigentümer je Datei; keine
Übergaben innerhalb einer Welle.

- **W1:** PA1 Cursor ‖ PA2 Hauptmenü ‖ PA3+PA5 Desktop&Login ‖ PA4+ICON ‖
  **PC0 (Fable selbst, :5183)**. Gates: siehe Plan (Pflicht-Spec-Listen).
- **W2:** PB1 ‖ PB2 ‖ PC1 (erster PC0-Konsument + App.tsx-Guard-
  Verallgemeinerung «aktive Station im Island-Modus») ‖ PD1 ‖ PD2.
- **W3:** PC3 ‖ PC4 ‖ PC5 ‖ PB3 ‖ PC2. boden-dock + boden-dock-reserve-c14 in
  JEDEM PC-Gate (Reserve-Verträge: Nicht-Island-Modus behält Dock UND Reserve;
  Spec erweitern, nie ersetzen).
- **W4:** PB4 ‖ PB5 ‖ PE2 ‖ PE1 (Flake-Beweis = 5× hintereinander grün).
- **W5:** PB6 Token-Sweep (SANKTION: `packages/kosmo-kernel/src/derive/` NIE
  anfassen — `#2455a4` lebt in berechnungsliste.ts:26/Blatt-Goldens) + PE3.

## 6 · Golden-Politik

**v0.8.4 ist komplett golden-still: 36/36 byte-gleich.** Grep-belegt: die
PlanView-Hexes liegen NUR im Live-DOM-Overlay, nie im derive-Pfad. W5-Gate =
`svg-qa` 36/0 UND sha256-Byte-Diff aller 36 Goldens gegen den v0.8.3-Stand
(`ff3c7a6`). Es gibt KEIN GOLDEN-WECHSEL-084.md — jede Golden-Änderung ist
automatisch ein MUSS-Abbruch des verursachenden Pakets.

## 7 · Sanktionsliste (Auszug der härtesten; Verstoss = Gate-Abbruch)

1. PC0 ändert keine testids/Klassen; alle 9 island-Specs laufen UNGEÄNDERT.
2. Kein Paket ausser dem Hotspot-Eigentümer seiner Welle fasst App.tsx /
   island.css / DesignWorkspace.tsx / PlanView.tsx an.
3. Icons: currentColor-only, leerer innerText (oberflaeche-minimal-Vertrag).
4. Kein GPU-/Render-Vortäuschen: Cycles-Demolauf läuft ehrlich gegen `--fake`.
5. Kein .hdr-Download ohne expliziten Budget-Nachweis (≤10 MB, CC0, QUELLEN).
6. `derive/` bleibt in W5 unberührt (Golden-Schutz).
7. Foreground-Pflicht ERSTE Dispatch-Zeile; Ports 5174/5175/5176; Staging nur
   exakter Pfade; `git status` vs. deklarierten Kreis vor jedem Commit.
8. Nicht-Island-Modi bleiben vollwertig (Bestandsschutz `'manuell'` überall).
9. Ehrlichkeit: KosmoOffice bleibt sichtbar «kommend»; Browser-Abo-Grenze
   bleibt benannt; Owner-Windows-Smoke ist der einzige echte Cursor-Beweis
   und steht als Ritualpunkt im Release.

## 8 · Vollständigkeits-Matrix (Abnahme W5/PE3)

- [x] **C-1** Cursor-Kontinuität: keine Zone versteckt die Ebene mehr; Formen-Matrix-Spec grün → PA1
- [x] **C-2** Hauptmenü statisch/zentriert/scrollfrei + Kachel-Reihe + Office «kommend» (Verträge §4) → PA2
- [x] **C-3** Untertool-Fächer ohne Überlappung (Bounding-Box-Beweis) → PA2
- [x] **C-4** Start maximiert + Schalter → PA3
- [x] **C-5** ant-CLI-Login geführt + Key-Validierungs-Ping + ehrliche Abo-Erklärung → PA5
- [x] **C-6** useOverlaySchliessen existiert + 5 Pflicht-Konsumenten → PA4
- [x] **C-7** 20 Icons nach Bauvorschrift, unverdrahtet, Unit-Test → ICON (W1)
- [x] **C-8** PC0 verhaltensneutral: 9 island-Specs ungeändert grün → PC0
- [x] **C-9** Delete/Backspace löscht Auswahl (design.loeschen) → PB1
- [x] **C-10** Enter+Doppelklick schliessen ALLE Mehrpunkt-Werkzeuge ab → PB1
- [x] **C-11** Rechtsklick-Kontextmenü: Löschen/Eigenschaften/Schnelleinstellungen → PB1
- [x] **C-12** Auswahl-Highlight sichtbar kräftiger (Vorher/Nachher-Beleg) → PB1
- [x] **C-13** Pillen+Werkzeuge zeigen SVGs statt Buchstaben (design) → PB2
- [x] **C-14** Hinweis raus aus Popup → Lang-Hover-Tooltip, nichts abgeschnitten → PB2
- [x] **C-15** Vis komplett auf Islands, DockFlaeche/BodenDock weg im Island-Modus, Zoom-Leiste integriert → PC1
- [x] **C-16** Node-Canvas dunkel/Nodes hell (Token, kein Hartwert) → PC1
- [x] **C-17** Stimmungen als BILD-Kacheln (prozedural) + environment im Job → PC1
- [x] **C-18** vis.render-Command + Demolauf-Drehbuch Kamera→Material→Cycles(--fake)→AI-Slot per Commands → PC2
- [x] **C-19** Publish: Islands + Blatt-Zoom (wheel+fit) → PC3
- [x] **C-20** Prepare: Islands + Dock weg + Ausbau → PC4
- [x] **C-21** Data: Bilder für eigene Referenzen + Dossier-Verknüpfung → PC5
- [x] **C-22** Website-Sync-Gate in release-gate (Seed-Byte-Diff + Hash-Protokoll) → PD1
- [x] **C-23** eval/kosmo-zeichner-commands + TrainWorkspace-Anzeige + REGISTRY-Spalte → PD2
- [x] **C-24** Geschoss-Pille vertikal unter grauem Logo; Zentralsymbol zeigt Untertools, nie offene Station → PB3
- [x] **C-25** Orb-Gesetz-Tabelle E2 überall bewiesen (alle Orb-Instanzen) → PB4
- [x] **C-26** Massketten/Kommentare wählen/verschieben/löschen + Filter + Kürzel/Overlay → PB5
- [x] **C-27** 8 Rahmen-Werkzeuge echt oder Owner-sauber geschlossen; §8-3-Regeln → PE2
- [x] **C-28** dock-tour + Tab(c) je 5× grün → PE1
- [x] **C-29** Token-Sweep ohne Golden-Drift (36er-sha256-Beweis) → PB6
- [x] **C-30** Release: Matrix adversarial, Lehren v0.8.4, FÜNF-Träger-Bump, Neuigkeiten, Rundgang-PDF, release-gate 0, Push, **Installer-Zustellung**, Owner-Smoke-Punkt → PE3

**PE3-Ergebnis (18.07.2026):** 30/30 abgenommen — 24 auf Anhieb bestanden
(adversariale Prüfer, Live-DOM :5183), C-24 nach Prüfer-Ausfall von Fable
selbst geometrisch bewiesen, 5 Lücken VOR dem Release gefixt (C-3 980px-
Fächer-Overlap, C-9 Ctrl+Z nie gebunden, C-11 Eigenschaften-Float +
Abschliessen-Punktverlust, C-16 Nodes wirklich hell, C-18 Demolauf
Material/Backbone) — Belege: ROADMAP 473, `e2e/pe3-matrix-fixes.spec.ts`.
C-30 schliesst mit dem Release-Commit selbst.

## 9 · Ehrliche Nicht-Ziele
Griffe/Gizmos; Website-Redesign; echte GPU-Renders; Voll-HDRIs im Installer;
Multi-Selektion/Rubber-Band (nur falls trivial — sonst v0.8.5-Kandidat);
In-App-OAuth ohne CLI (existiert bei Anthropic nicht öffentlich).
