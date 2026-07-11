# V0.7.3 «Kosmodesign» — Gestaltungs-Spez (verbindlich für alle Streams)

Quelle: Owner-Handoff «Kosmodesign v0.7.3 Paket» (ClaudeDesign, 12.07.2026,
Owner-Entscheid «nach Empfehlung») + Owner-Entscheide vom 12.07.
(AskUserQuestion): **Tinte-Theme wird ENTFERNT** (Zweier-Welt Papier/Kosmos,
localStorage-Migration `ink→orbit`) und **das app-weite Boden-Dock kommt
dazu** (0.7.2-Paket-03, mit Kosmo-Orb im Dock). Die kleinen 0.7.2-Restpunkte
(Takeover-Trigger, chip-serie/orbit-loader, Companion-Link, Pan/Zoom-Overlay,
Icon-Varianten) bleiben per Owner-Wahl **vertagt** (0.7.4-Kandidaten).

**Soll-Bilder:** `docs/soll-073/` (aus dem Canvas extrahiert, Runde R2 = die
gewählten Varianten). Bauagenten vergleichen NUR gegen diese PNGs — niemand
liest das Handoff-HTML (es enthält auch die VERWORFENEN Varianten).

| Datei | Entscheid |
| --- | --- |
| `2b-d1-strich-matrix.png` | D1 Strich-Matrix |
| `3a-d2-fluegel-volle-konvention.png` | D2 Flügelsymbolik + Leibung |
| `4b-d3-lod-treppe.png` | D3 Kontext-LOD-Treppe |
| `5b-d4-zwei-stimmen.png` | D4 Blatt-Typografie |
| `6a-d5-phase-entscheidet-modus.png` | D5 3D-Modusregel |
| `7b-d6-beschlag-katalog-s0.png` | D6 Beschlag-Katalog S0 |
| `8a/8b/8c-d7-*.png` | D7 Theme-Paar + Invarianz (Abnahme-Vorlagen) |

## Grundsätze (unverhandelbar, wörtlich aus dem Handoff)

1. **Papier ist Papier.** Plangrafik schwarz/grau auf Weiss, theme-invariant,
   druckorientiert. Kontext-Layer im Live-Plan nutzen UI-Variablen (lesbar
   als «nicht Papier»), der Druckweg bleibt hart kodiert. (0.7.1 §8)
2. **80 · 15 · 5.** Ruhe/Linie/Signal — gilt neu auch für Toolbar, Panels,
   Viewport-Chrome.
3. **Ein Stilblatt, zwei Renderer.** Alle Darstellungs-Konstanten in einem
   Token-Modul `derive/stilblatt.ts`; `PlanView.tsx`, `SectionView.tsx` und
   `plansvg.ts` lesen dieselbe Tabelle. Löst §11.9.
4. **Golden-Regime.** Jede Änderung = ein bewusster, dokumentierter
   Golden-Wechsel (ein Commit); alles Neue hinter Daten-/Phasen-Guards;
   svg-qa bleibt Pflicht. **Genau zwei Sammelwechsel: D1 (mit D2-Leibung
   gefaltet) und D4.** Alt-Goldens ändern sonst NIE.

## D1 · Strich-Matrix (Soll: 2b) — Stream S1, FABLE

Jede derive-Linie deklariert ein Tripel **Stift × Grau × Linientyp**:

- **Stift = konstruktive Bedeutung** (Papier-mm, massstabskonstant wie
  heute): `0.50` primär geschnitten · `0.35` sekundär geschnitten/Terrain
  neu · `0.25` Sichtkante · `0.18` fein (Projektion, Symbolik, Mass).
- **Grau = Bildtiefe:** `#111` geschnitten · `#3A3A3A` gesehen · `#666`
  projiziert · `#8A8A8A` Kontext. (Heutiges Projektions-`#444` wird `#666`,
  Gesehenes dunkler — bewusster Wechsel.)
- **Linientyp = Existenz** (Papier-mm): voll = real · Strich `3–1.5` =
  verdeckt/Abbruch · Strichpunkt `8–1.5–0.5–1.5` = ideell (Achse/Parzelle) ·
  Punkt `0.5–2` = temporär (Raster/Bewegungsfläche).

**Bauweg (zwei Commits):**
1. **Refactor:** `derive/stilblatt.ts` mit den HEUTIGEN Werten anlegen
   (Streustellen: ~41 in `plansvg.ts`, ~15 `sheet.ts`, ~12 `schwarzplan.ts`,
   ~5 `section.ts`, plus `PlanView.tsx`/`SectionView.tsx`; Umbau-Stifte
   `plansvg.ts:60-61`; Owner-3D-Palette 1:1 aus `Viewport3D.tsx:227-245`;
   Font-Strings unverändert). Beweis: **alle 24 Goldens byte-identisch.**
2. **D1-Sammelwechsel (EIN Commit mit Wechsel-Protokoll):** nur
   Stilblatt-Werte flippen **plus die D2-Leibungslinie 0.25 ab Vorprojekt**
   (s. D2 — sie MUSS in diesen Sammelwechsel, weil die Ansicht-Goldens auf
   dem werkplan-Default laufen und sonst ein dritter Golden-Bruch entstünde)
   → Goldens regenerieren, Diff-Review Zeile für Zeile gegen eine vorab
   geschriebene Erwartungsliste, svg-qa.

## D2 · Flügelsymbolik & Ansicht (Soll: 3a) — Leibung in S1, Rest S4

- Dreieck **Eckpunkt→Eckpunkt** über die volle Flügelfläche, Spitze =
  Bandseite, Stift 0.18.
- **Durchgezogen = öffnet zum Betrachter (innen), gestrichelt 2–1 mm =
  öffnet weg (aussen).** Gilt in Ansicht UND Live-Schnittvorschau (Parität
  via Stilblatt). Datengeguarded über `fluegelTyp` (bestehendes
  KSelect im Inspector); `ansicht-curtainwall` vorab auf fluegelTyp-Daten
  prüfen.
- **Leibungslinie 0.25 wird Standard ab Vorprojekt** für alle Öffnungen in
  der Ansicht (löst §11.3, keine konturlosen Lochungen mehr); Werkplan
  ergänzt Rahmenlinie 0.18. **Eigene Weiche `abVorprojekt()`** —
  `fruehePhase()` passt NICHT (sie umfasst vorprojekt und meint das
  Gegenteil).
- Kipp = Spitze unten, Drehkipp = beide, Schiebe = Doppelpfeil (volle
  Flügelbreite).
- Neues Golden: `ansicht-fluegeltypen` v2 (Aussen-Strichelung + Leibung).

## D3 · Kontext-LOD-Treppe (Soll: 4b) — Stream S4

Kontext folgt der Phase — **gesteuert über `doc.settings.phase`
(BauPhase)**, dieselbe Steuerung wie PLAN-DETAILLIERUNG. (Das README sagt
«SIA-Phase»; gemeint ist die Zeichenstil-Leiter — die Golden-Namen SIND
BauPhase-Werte, darum ist `bauPhase` der Schlüssel, nicht `siaPhase`.)

- Schwarzplan/Situationsplan: Nachbarn Fill `#8A8A8A`, vor eigenen
  gezeichnet (Schwarzplan-Modul bleibt wie heute).
- Wettbewerb/Studie (+ vorprojekt): Fill `#C9C9C9`.
- Bauprojekt/Baueingabe: nur Umriss 0.18 `#8A8A8A`.
- Werkplan: Nachbarn aus, nur Parzelle.
- Parzelle in jeder Stufe strichpunktiert 0.35; Nachbarn nie anwählbar.
- Koexistenz-Regel: der plansvg-Kontext-Renderer ist datengeguarded; das
  PlanView-`plan-kontext`-Layer bekommt erstmals die Phasen-Weiche, seine
  **var()-Farben bleiben** («Papier ist Papier»: das Stilblatt liefert
  Geometrie/Stufe, die Farbe entscheidet der Aufrufer — Druckweg hart,
  Live-Plan UI-Variablen).
- Neue Goldens: `grundriss-kontext-{wettbewerb,baueingabe,werkplan}`.

## D4 · Blatt-Typografie «Zwei Stimmen» (Soll: 5b) — Stream S3, FABLE

- **Titel: Lato Heavy, versal, +0.04em** (Plankopf, Legenden-Titel).
- **Alles Messbare: IBM Plex Mono mit Tabellenziffern** (Masse, Koten,
  Etiketten, Plankopf-Meta, Achskreise). SIA-Schreibweise (hochgestellter
  mm-Rest, `dimensions.ts`) bleibt UNANGETASTET — nur font-family ändert.
- mm-Skala fix: Titel 4.2 · Untertitel 3.2 · Meta 2.8 · Etiketten 2.5 ·
  Bemassung wie heute · Trennlinie 0.35.
- **Font-Einbettung:** jsPDF kann kein woff2 → **TTF** (latin-subsettet,
  ≤200 KB, `public/fonts/pdf/`, via pyftsubset) + `addFileToVFS`/`addFont`;
  Fallback Helvetica + `console.warn`. **Lato Heavy (800) fehlt bei
  fontsource** → offizielles Lato-Release (OFL) beschaffen, sonst
  dokumentierte 700-Annäherung (Soll-Bild 5b entscheidet, ehrlich in den
  Neuigkeiten benennen).
- Kernel-SVGs (Goldens): NUR font-family-Strings (`'Lato', …` /
  `'IBM Plex Mono', ui-monospace, monospace`), KEINE data-URIs in Goldens;
  der App-seitige SVG-Download darf @font-face injizieren.
- DXF: dokumentierter Rückfall auf Standardschrift (`INTEROP.md`).
- Golden-Churn **gross** (jedes Blatt) — zweiter dokumentierter
  Sammelwechsel, NACH dem S4-Merge (Merge-Gesetz W2), Goldens werden genau
  EINMAL im D4-Commit regeneriert. svg-qa rastert ohne Lato mit
  Fallback-Metriken → generische Fallback-Kette, svg-qa VOR dem D4-Commit.

## D5 · 3D-Modusregel «Phase entscheidet» (Soll: 6a) — Stream S6

- Wettbewerb/Studie + Vor-/Bauprojekt → **Weissmodell** ·
  Situation/Volumennachweis → **Schwarzmodus** · Werkplan + Vis/Render →
  **Textur**.
- Neue reine Funktion `offizielleDarstellung3d(settings, zweck?)` in
  `doc.ts` (neben :363; die bestehende auto-Logik deckt weiss/Textur je
  Phase schon ab). `zweck: 'situation' | 'volumennachweis'` → schwarz ist
  ein **Capture-Kontext**, kein Phasenwert.
- `captureFrame({offiziell})` / «Für Vis aufnehmen» / Blatt-Bildslots
  rendern **zwingend im offiziellen Modus**: EIN Frame Material-Swap +
  Rückbau. Die manuelle Modus-Wahl (DesignWorkspace :2428) bleibt
  Arbeitsmodus (sticky, nie amtlich).
- **Owner-Farbmuster fixiert** (ins Stilblatt): masse `#D8CFC0` · dach
  `#6E5F52` · terrain `#6B5842` · rahmen `#E4DDCE` · default `#CFCCC4` ·
  **Glas bleibt in jedem Modus transparent** (0.7.0-Regel). Kein Golden.

## D6 · Beschlag-Katalog S0 (Soll: 7b) — Stream S4

Sechs Symbole: **Band · Griffseite · Brüstungshöhe (BRH) · Schiebe-Lauf ·
Motorantrieb (M) · Absturzsicherung.**

- Alles 0.18, Etiketten Mono 1.8 mm, **nur Werkplan-Phase**, hinter
  Daten-Guard, eigener DXF-Layer `BESCHLAG` (aci 5, Regel VOR 'symbol' in
  `dxf/export.ts`).
- Opening-Felder additiv: `band?` / `griffseite?` / `antrieb?` /
  `absturzsicherung?` — **KEIN neues brh-Feld**: BRH wird aus dem
  bestehenden `sill` etikettiert. exactOptionalPropertyTypes → konditionale
  Spreads. Inspector nach dem FensterAbschnitt-Muster; zod in
  `commands/design.ts` nachziehen (Kosmo-Tools folgen automatisch).
- Neues Golden: `werkplan-beschlag`. IFC-Abbildung vertagt (INTEROP-Notiz).
- Anschläge/RWA/Dichtebene bleiben explizit vertagt; Ausbaustufe S1
  (12 Symbole) ist im Canvas (7a) dokumentiert — NICHT bauen.

## D7 · Shell: Theme-Paar (Soll: 8a/8b/8c) — Stream S2

- **Papier-Theme (hell):** Grund `#F5F3EE`, Flächen `#FBFAF6`, Karten
  `#FFFFFF`, Tusche `#1A1815` (= die heutigen paper-Grundflächen bleiben),
  **NEU Akzent Teal dunkel `#3E96A2`-Familie**, Rollenfarben eine Stufe
  dunkler im paper-Block.
- **Kosmos-Theme (dunkel):** = das bestehende orbit-Theme, Tokens
  unverändert (field `#0B0D12`, field-2 `#14171F`, line `#F4F6FA`, Akzent
  `#57B6C2`, Rollenfarben Original).
- **Tinte (ink) wird entfernt** (Owner-Entscheid): alle
  `[data-theme='ink']`-Blöcke raus, `ThemeName = 'paper' | 'orbit'`,
  Migration `ink→orbit` in App.tsx VOR dem useState (:141), Einstellungen
  auf 2-Segment PAPIER/KOSMOS. Abschlusspflicht: repo-weiter Grep
  `'ink'`/`kosmo.thema`. `e2e/einstellungen.spec.ts` bewusst anpassen
  (der Container-Klick-Trick stirbt bei 2 Segmenten).
- Radien 8/12/16 und Lato/Titel-Font wandern nach `:root` (Grammatik
  themeübergreifend, orbit-Override entfällt).
- KIcon: strokeWidth `1.5 → 1.75` (eine Stelle, `icons.tsx:197`); KEIN
  Zwangs-Rollenpunkt am KIcon (Utility-Zeichen ohne Rollenbezug — im
  Commit begründen; die Werkzeug-Glyphen mit Rollenpunkt sind 0.7.2-Bestand).
- **Invarianz-Regel (8c):** Planblatt und Plangrafik sind in beiden Themes
  identisch weiss/schwarz (`--k-plan-paper` in beiden Themes gegen das
  Soll-Bild prüfen); das Theme wechselt nur UI-Variablen in `aura.css`.

## Zusatzauftrag · Boden-Dock app-weit (Owner-Wahl) — Stream S5

- NEU `shell/BodenDock.tsx` + `boden-dock.css` (aura.css tabu): unten
  Mitte fixed, Glas token-basiert (Papier-Theme = helles Glas), Kreise
  64/54/46 nach `rang()` (`orbit-rang.ts`, nur Lesung), Rollen-Punkte,
  FLIP, reduced-motion.
- KosmoSymbol wird per **Komposition** rechtes Dock-Element (verliert die
  fixed-Hülle :55-57); Testids `kosmo-symbol`/`kosmo-mini` + Panel-Logik
  WÖRTLICH erhalten (kosmo-symbol.spec prüft keine Position). Fallback:
  `#companion`/Charakter-Fenster behalten das freie Symbol.
- Reiner Navigations-Layer ZUSÄTZLICH zur bestehenden Navigation:
  `module-*`-Semantik unangetastet (~40 Specs!), `toBe(18)`-Vertrag und
  orbit-start-Verträge unangetastet, OrbitStart-Hub bleibt.
- **pointer-events nur auf den Buttons** (Lektion arbeitsmodi:111);
  Statusleisten-Kollision: feste Maximalbreite, unter ~1100 px Kollaps auf
  Orb+Top-3 (CSS, kein DOM-Entfall). NEU `e2e/boden-dock.spec.ts` beweist
  boundingBox-Disjunktion + Klick-Durchlässigkeit; Journeys als W3-Gate.

## Stream-Besitz (Dateidisjunktheit = Merge-Gesetz)

| Stream | Modell | Besitz (exklusiv) |
| --- | --- | --- |
| S1 Stilblatt+D1 | **Fable** | NEU `derive/stilblatt.ts` · plansvg.ts · section.ts · plan.ts · schwarzplan.ts · sheet.ts (Konstanten-Lesung) · PlanView.tsx · SectionView.tsx · alle Goldens + deren Tests |
| S2 D7+Tinte raus | Sonnet | aura.css · kosmo-ui/tokens.ts · icons.tsx · token-spiegel.test.ts · App.tsx (+Anker `{/* v073: boden-dock */}`) · Einstellungen.tsx · Companion-thema-Leser · e2e/einstellungen.spec.ts |
| S3 D4-Typografie | **Fable** | stilblatt.ts (nur Schrift-Zeilen) · sheet.ts · dimensions.ts (NUR font-family) · blattfuellung.ts · 5 Blatt-Module · export-plan.ts · export-sheets.ts · public/fonts/pdf/ · Goldens (Regeneration ZULETZT) |
| S4 D2/D3/D6 | Sonnet | plansvg.ts/section.ts/plan.ts/schwarzplan.ts (Logik) · entities.ts · commands/design.ts · dxf/export.ts · Inspector.tsx · neue Goldens |
| S5 Boden-Dock | Sonnet | NEU BodenDock.tsx + boden-dock.css · KosmoSymbol.tsx · App.tsx (nur S2-Ankerzeile) · NEU e2e/boden-dock.spec.ts |
| S6 D5 3D-Regel | Sonnet | doc.ts (nur die neue Funktion) · Viewport3D.tsx · kosmo-blick.ts · DesignWorkspace.tsx :2428 |

**Merge-Gesetz Welle 2: S4 zuerst mergen, S3 regeneriert die Goldens danach
genau EINMAL im D4-Commit.** S1 und S4 teilen sich plansvg/section/plan/
schwarzplan über die WELLEN-Grenze (S1 Tag 1, S4 Tag 2) — nie gleichzeitig.

## Schutzliste (bleibt beweisbar unangetastet)

- `toBe(18)` Mehr-Menü-Vertrag · orbit-start-Verträge (4 Haupt,
  k-orbit-drehen, DOM-Präsenz) · kosmo-symbol-DOM-Vertrag.
- `module-*`-Navigation (~40 Specs) und alle Journeys.
- SIA-Hochzahl-Logik in `dimensions.ts` (nur font-family darf ändern).
- Glas-Transparenz in jedem 3D-Modus (0.7.0-Regel).
- Goldens ausserhalb der zwei dokumentierten Sammelwechsel.
- Sounds Default AUS · Cursor-Ebene webdriver-Default AUS ·
  reduced-motion-Pfade.

## Sprache & Konventionen

Schweizer Deutsch (ss statt ß) · UI-Labels UPPERCASE Mono mit Tracking ·
keine Emoji · Status nie nur über Farbe · deutsche Commits ohne Trailer ·
Ehrlichkeit vor Politur (Lato-Heavy-Beschaffungsweg, DXF-Standardschrift,
Beschlag S0 nur Werkplan und die vertagten Restpunkte werden in den
Neuigkeiten offen benannt).
