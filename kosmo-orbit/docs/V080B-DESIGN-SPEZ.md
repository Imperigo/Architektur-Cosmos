# v0.8.0B «UI-Neubau nach ClaudeDesign» — Design-Spezifikation (verbindlich)

*P0 · Paket W0 des v0.8.0B-Wellenplans. Dieses Dokument ist die verbindliche Grundlage für W1–W9 —
jede Zahl, jeder Entscheid und jede Vertagung hier ist der Massstab, gegen den W8 (Matrix-Abnahme)
am Ende prüft. Änderungen an dieser Spez nach W0 sind Owner-Sache, nicht Bauagenten-Ermessen
(Muster `docs/V080-PLANKOPF-SPEZ.md`).*

**Quelle:** 7 ClaudeDesign-Paket-Digests (v0.7.1 Dossier · v0.7.2 Visual Update · v0.7.3
Gestaltungspaket + `_ds` Architekturkosmos-Design-System · v0.7.31 [byte-identisch mit v0.7.3] ·
0.7.5 Kosmo Viz · v0.7.8 Intelligente Werkzeugtabs), verdichtet in `scratchpad/v080b-digests.json`,
zusammengeführt in `scratchpad/v080b-design-synthese.md` (§1–§7 dieser Spez sind die redaktionell
eingepasste Übernahme dieser Synthese, wörtlich, mit Quellenbezug), adversarial gegengeprüft in
`scratchpad/v080b-kritik-neu.md` (wortgleich als `docs/V080B-KRITIK.md` im Repo). Der Owner-Auftrag
und die sechs Owner-Entscheide vom 15.07.2026 stammen aus dem genehmigten Wellenplan.

---

## 0 · Auftrag und Owner-Entscheide

### 0.1 · Auftrag

Owner-Befund nach dem v0.8.0-Release: Die UI ist trotz Dock-System «sehr unaufgeräumt»,
Werkzeugtabs/Docks und BodenDock treffen die Design-Absicht nicht. Auftrag: **kompletter Neubau
der visuellen Schicht** («Design-Reset») streng nach den 7 ClaudeDesign-Paketen (v0.7.1 Dossier ·
v0.7.2 Visual · v0.7.3/0.7.31 Gestaltungspaket + `_ds`-Design-System · 0.7.5 Kosmo Viz · v0.7.8
Werkzeugtabs) — **die Software selbst (Kernel, Commands, Stores, Solver, Tests) bleibt vollständig
erhalten.** Die Analyse lief als Ultracode-Workflow (7 Paket-Digests + Ist-UI-Inventar → Synthese →
adversariale Kritik); diese Spez ist die vierte, verbindliche Stufe.

### 0.2 · Owner-Entscheide (15.07.2026, bindend, wörtlich)

1. **testids/E2E-Texte byte-gleich** — alle 953 `data-testid` + 111 aria-labels + wörtliche
   Spec-Texte bleiben; die ~117 E2E-Specs (3523 Locator-Zugriffe) sind das durchgehend grüne
   Sicherheitsnetz. Neues nur additiv.
2. **Wellen mit sofortigem Push** — jedes Paket einzeln gegated, Screenshots je Welle.
3. **Hart ersetzen** — ein Design-System, kein Alt-Fallback; Papier/Orbit bleibt als Hell/Dunkel-
   Paar des NEUEN Systems.
4. **Vis im Themenpaar, mit Viz-ANATOMIE** des 0.7.5-Handoffs (keine eigene Dark-Shell).
5. **Alle 33 Goldens byte-identisch** — reiner UI-Neubau; D1/D4-Plangrafik-Nachschärfungen ehrlich
   vertagt («GOLDEN-CHURN: MITTEL» kommt später als eigene Runde).
6. **0.7.2-Reste vertagt** — Schwarm-Orbs, Schliessen-Choreografie, Viz-Viewport-Vollausbau
   (gespeicherte Ansichten/Review-Pins/GPU-Telemetrie) sind deklarierte spätere Runden.

Owner-Entscheide 4–6 beantworten die drei offenen Fragen der Gegenprüfung — die Zuordnung steht
im Kopf von `docs/V080B-KRITIK.md`.

### 0.3 · Verhältnis zu bestehenden Leitdokumenten

- **`docs/GESTALTUNGSKONZEPT.md`** und **`docs/OWNER-MANDAT.md`** bleiben die übergeordneten
  Grundsatzdokumente (Werkplan-Stil, «Papier ist Papier», Owner-Entscheidtabelle); diese Spez
  widerspricht ihnen nicht, sondern führt sie für den UI-Neubau in ein bau-taugliches Regelwerk
  über.
- **`packages/kosmo-ui/src/aura.css`** bleibt die einzige Wahrheit der Token-Werte; diese Spez
  fixiert nur, welche additiven Tokens W1 einführt (§1) und welche Konflikte zugunsten welcher
  Quelle aufgelöst sind (§6).
- **`packages/kosmo-kernel/src/derive/stilblatt.ts`** und die 33 Goldens bleiben unangetastet
  (§7.2) — der Neubau stylt den Rahmen ums Blatt, nie das Blatt.

---

## 1 · Token-Architektur

**Grundentscheid: `--k-*` bleibt der kanonische Namensraum, aura.css bleibt die einzige Wahrheit.**
Die DS-Namen (`--ink-*`, `--surface-*`, `--space-*`, `--role-*`) werden NICHT eingeführt, sondern
per dokumentierter Mapping-Tabelle übersetzt (bisheriges Muster, `token-spiegel.test.ts` als
Wächter). Begründung: 105 `--k-*`-Tokens sind de-facto API von 10 CSS-Dateien und allen
`.k-*`-Klassen; 975 testids/2891 E2E-Referenzen verbieten einen Namensraum-Bruch. Die rohen
Neon-Werte `--ak-*` bleiben kanonische Referenz, **nie live** (`_ds`).

Mapping (bindend): `--ink-900→--k-field` · `--ink-950→--k-sunken` · `--ink-1000→--k-statusbar` ·
`--ink-850→--k-flaeche-zwischen` · `--ink-800→--k-surface` · `--ink-750→--k-raised` ·
`--surface-sunken→--k-sunken` · `--accent→--k-signal` (Marke) bzw. `--k-accent` (Theme) ·
`--role-*→--k-rolle-*` (database→ak) · `--glass-*→--k-glass-*` · `--space-*→--k-s*` ·
`--radius-card→--k-radius-karte`.

**Bestand (bleibt wörtlich, nicht neu erfinden):**
- Theme-Paar (v0.7.3 D7, Owner-Recht): Papier default `#f5f3ee / #fbfaf6 / #ffffff / #1a1815`,
  Akzent `#3e96a2`; Orbit `#0b0d12 / #14171f / #1a1e27 / #f4f6fa`, Akzent `#57b6c2`, `--k-sunken
  #08090d`, `--k-statusbar #050608`, `--k-flaeche-zwischen #101319`, `--k-ink-muted #8b92a2`,
  `--k-ink-faint #6e7686` (orbit).
- Marke: `--k-signal #57b6c2` · `--k-signal-hell #eaf6f8` · `--k-signal-tinte #06141a`.
- Rollen (dusty, hex-identisch mit `_ds`): manuell `#74C2A0` · pn `#6F9BCF` · pna `#C082B4` · agent
  `#CBB06A` · memory `#CF9466` · generator `#CD7670` · ak `#B08A6E` · office `#8a7b5a`; je `-fill`
  (12 %, `…1f`) und `-line` (40 %, `…66`). Papier-Rollen eine Stufe dunkler (`#3F9B79 / #4B7BB3 /
  #A65E97 / #A8893F / #B0703F / #B25750 / #94704F`).
- Glass: `--k-glass-fill rgba(20,23,31,.62)` · `--k-glass-stroke rgba(255,255,255,.08)` ·
  `.k-glass` = blur(20px) saturate(1.4). Float-Panel-Variante des Werkzeugtab-Prototyps
  (`rgba(16,19,25,.78)` blur(18px)) wird auf diese Tokens gemappt, nicht als Zweitwert eingeführt.
- Glow (nur Info-Zustand): `--k-glow-cyan`, `--k-glow-cyan-sm`.
- Radien: xs 6 · sm 8 · md 12 · karte 14 · lg 16 · node 18 · pill 999.
- Fonts: `--k-font-ui` Lato 400/700/900 · `--k-font-mono` IBM Plex Mono · `--k-font-titel` PT Sans
  Narrow (nur Wortmarke/Plakat, Tracking 0.26–0.34em).
- Akzentfamilien `data-akzent` (kupfer `#a84b2b` · signal `#c8501e` · blau `#2455a4` · gruen
  `#1e6b47`), Modul-Farben `--k-mod-*`, Skizzenpapier-Korn: Repo-Erweiterungen, bleiben.

**Additive Erweiterungen (der Neubau «fragt jetzt danach»):**
1. **Spacing:** `--k-s1…s7` (2/4/8/12/16/24/32) bleiben — 2px ist Repo-Recht; NEU `--k-s8 48px ·
   --k-s9 64px · --k-s10 96px` (`_ds`-Pflichtstufen). Die `_ds`-Lint-Haltung wird übernommen:
   **rohe px- und Hex-Literale in der visuellen Schicht sind Review-Befund** (Ausnahme:
   Plangrafik/`stilblatt.ts`, hart kodiert per Vertrag).
2. **Typo nach oben:** bestehend `--k-t-xs 10.5 / sm 12 / md 13.5 / lg 16 / plakat 20`; NEU
   `--k-t-h3 21 · --k-t-h2 28 · --k-t-h1 42 · --k-t-display 60` (Lato 900/700), `--k-t-code 13`,
   `--k-t-micro 11`, Label-Rezept 11–12px Mono UPPERCASE Tracking `.14em`. Display/H-Ebenen nur für
   Onboarding, OrbitStart, Report/Dossier, Leerzustände — das CAD-Chrome bleibt in der kleinen
   Skala.
3. **Schatten-Skala** (Owner-Vorbehalt v0.7.8 «sobald eine Fläche danach fragt» — Panels, HUDs,
   Karten des Neubaus fragen jetzt): `--k-shadow-xs 0 1px 2px rgba(0,0,0,.30) · sm 0 2px 8px .32 ·
   md 0 8px 24px .38 · lg 0 18px 48px .46 · xl 0 32px 80px .55 · --k-inset-top inset 0 1px 0
   rgba(255,255,255,.08)` — **nur im Orbit-Theme**; Papier behält `--k-shadow-raised/-overlay`
   («Papier kennt kein Glas»).
4. **Border-Dreistufigkeit** im Orbit-Theme auf Alpha-Weiss: `--k-line-subtil rgba(255,255,255,.07)`
   (NEU) · `--k-line rgba(255,255,255,.11)` · `--k-line-strong rgba(255,255,255,.18)` ·
   `--k-hairline rgba(120,140,190,.14)` (NEU, Hintergrundraster). Papier behält warme Volltöne
   `#e4e0d6/#c9c4b6`. Begründung: Alpha trennt auf allen sechs Flächenstufen konsistent (`_ds`,
   0.7.5 «bindend neu»).
5. **Flächenstufe Hover:** NEU `--k-hover #222732` (= ink-700) — komplettiert die 6-Stufen-Semantik
   sunken→field→zwischen→surface→raised→hover.
6. **`--k-radius-hub 26px`** — OrbitStart/Orbit-Hub existiert real und fragt danach.

**Verworfen:** DS-Light-Mode (`#F7F9FC`, Akzent `#2E8794`) — vom jüngeren Owner-Papier-Theme
überholt. `--text-faint #5C6271` (0.7.5) — Repo `#6e7686` gilt. 48px-Grid-Utility als allgemeines
Layout-Raster — bleibt offene Owner-Frage; erlaubt nur als Backdrop der Dock-Bühne (Hairline-Raster,
opacity ≤.5, nie unter Text).

---

## 2 · Die 12 obersten Gestaltungsgesetze

1. **80 · 15 · 5** (alle Pakete, zentral `_ds`/v0.7.3): 80 % ruhige Fläche, 15 % Linien/Panels, 5 %
   Signal. Operationalisiert: pro Viewport **genau eine gefüllte Signal-Fläche** (die
   Primäraktion, z. B. «◉ Rendern»); Akzent nur Primäraktion/aktiv/Auswahl/Link; Rollenfarbe nur
   als 2px-Hairline links an Karten, 2px-Topborder an Dock-Panels, 6px-Punkt, Node-Rahmen — **nie
   flächig**.
2. **Eine Hauptthese pro View, max. drei Sekundärfakten** (`_ds` readme). Das ist das direkte
   Rezept gegen «unaufgeräumt»: alles andere ist versteckt (Rail-Icon, Closed-Chip, Phasen-Guard)
   oder nachgelagert.
3. **Papier ist Papier / 8c-Invarianz** (v0.7.3, unverhandelbar): Plangrafik schwarz/grau auf Weiss
   (`--k-plan-paper #fdfcf9`), theme-invariant; Themes wechseln ausschliesslich UI-Variablen; der
   Druckweg kennt kein Theme.
4. **Nie-Überlappung + feste Zonen** (v0.7.8 Werkzeugtabs + 0.7.5): Panels docken in Zonen (Rail ·
   links · rechts · Streifen), nur Glass-HUDs schweben — streng in den vier Viewport-Ecken mit
   16px Abstand; Wichtigkeits-Rangfolge (viewport 100 > rail 95 > inspector 82 > … > legende 26)
   entscheidet, wer schrumpft/einklappt; Viewport min 380px, schrumpft zuletzt.
5. **Rund statt Block** (v0.7.2): Werkzeuge/Dock-Icons als Kreise, Balken als Pills (999px), keine
   harten 90°-Boxen ausser Tabellen/Code; Ausnahme Neun-Quadrat-Logo (rx ≈ 30 %).
6. **Zwei Schriftstimmen** (Dossier v0.7.1 + `_ds` + D4): Lato Heavy VERSAL für Titel; IBM Plex Mono
   (Tabellenziffern) UPPERCASE mit Tracking `.14em` für **alles Messbare, Status, IDs, Labels**;
   PT Sans Narrow nur Wortmarke. «Retro kommt aus Tracking und Raster, nie aus Display-Schriften.»
7. **Glow ist Informationszustand, Glass ist Schwebe-Sprache** (`_ds` + 0.7.5): Glow nur
   aktiv/gewählt/laufend/kritisch, nie Deko; Glass nur für Overlays/HUDs/Dock/Toolbars, **nie
   Stationsfläche**.
8. **Hierarchie über Flächenstufen + Hairlines statt Kästen** (`_ds`): sunken < field < zwischen <
   surface < raised < hover; Trennung über 1px-Linien, nicht über Rahmenboxen oder Farbtönung.
9. **Sichtbarkeit ist phasen-/datengesteuert, nicht panelgesteuert** (v0.7.3 D3/D6 + v0.7.8):
   Kontext-LOD-Treppe («je näher am Bauen, desto stiller»), Daten-Guards, Stations-Presets;
   geschlossene Panels als gestrichelte «+ NAME»-Chips, eingeklappte als 34px-Tab. Nichts erscheint
   ohne Grund.
10. **Status nie nur Farbe** (alle): immer Punkt/Icon + Mono-Textlabel (● ONLINE, ● SYNC LOKAL).
11. **Morph- und Kanten-Regel + quittierte Automatik** (v0.7.2 + v0.7.8): Symbole verwandeln sich
    über den Signal-Punkt (≈320 ms), nie hart, keine Badges; Rand-Animationen docken an
    Kante/Ecke an; jede automatische Umordnung wird begründet quittiert (2,9s-Chip «‹Checks›
    eingeklappt · Platz geschaffen», goldener Kosmo-Orb).
12. **Disziplin-Klammer:** Schweizer Deutsch (ss), UPPERCASE-Mono-Labels, keine Emoji,
    `prefers-reduced-motion` Pflicht (statischer Zustand voll lesbar), Fokus 2px Akzent-Outline,
    Disabled 40 % Opacity, Hover = Anheben translateY(-1px)/leiser Glow, Press = Zurücksetzen.

---

## 3 · Komponenten-Zielbild (packages/kosmo-ui + Shell)

**Zielbild-Vorbilder im Ist:** DockFlaeche, CursorEbene, BodenDock, KosmoZeichnet, OrbitStart —
klassenbasiert, 0 Inline-Styles. Der Neubau bringt **alle** Komponenten auf dieses Muster; 1850
Inline-Styles werden eliminiert.

**Umbau bestehender kosmo-ui-Komponenten (Werte nach `_ds`-Blaupause):**
- **KButton** → 1px-Border-Prinzip, keine gefüllten Buttons: primary = `--k-accent-wash`-Fill +
  accent-line-Stroke + Akzent-Text, hover + glow-cyan-sm; secondary = Glass; ghost = transparent,
  hover `--k-hover`; danger = 12 %-Fill/45 %-Stroke; Grössen sm 32 / md 40 / lg 48; Lato 700,
  radius-md, hover translateY(-1px).
- **KField/KInput** → Feld auf `--k-sunken` + 1px `--k-line`, radius-md; Mono-Micro-Label 11px
  uppercase darüber; focus-within = accent-line + glow-cyan-sm; NEU Variante `command` (Mono,
  ⌘K-Kbd-Chip, 48px).
- **KTabs** → Segmented-Pill-Anatomie (Container radius 999, 2px-Innenpadding, aktiver Eintrag als
  Chip mit Border + 5px-Akzent-Punkt) — vereinheitlicht PhasenLeiste und Ansichts-Umschalter.
- **KChip** → zusätzlich Closed-Chip-Variante («+ NAME», h 22, dashed glass-stroke, Mono 9.5px,
  hover accent) und Status-Chip (radius 999, padding 2px 8px, Mono).
- **KSelect, KDialog/KMenu, Meldungen** → Optik auf Glass-/Flächenstufen-Rezept, Verhalten
  (Fokusfalle, ESC, Positions-Logik) unverändert.
- **KToolbar/KToolGruppe** → Kreis-Werkzeug-Grammatik (32px-Kreise, Icon-Stroke 1.75, aktiv
  invertiert bzw. 1.5px Akzent-Border + 4px Rollenpunkt).

**Neue kosmo-ui-Komponenten (aus `_ds`/0.7.5, existieren im Repo nicht in dieser Form):**
- **KPill** (Rollen-Tag): 22px, padding 0 10px, Mono 600 11px uppercase .14em, radius 999,
  Rollenfarbe als Text + 12 %-Fill + Stroke, 6px-Dot; solid-Variante mit `--k-signal-tinte`.
- **KKeyValue**: Zeilenstapel gap 1px in Container radius 10 + `--k-line-subtil`; Zeile padding
  10px 12px auf `--k-surface`; Key Mono 11px faint, Wert Mono 12px secondary; optional 4px-
  Fortschrittsbalken in Modusfarbe. (Ersetzt die Label/Wert-Inline-Muster in Inspector,
  KennzahlenPanel, DataWorkspace.)
- **KHud** (Glass-HUD-Karte): `.k-glass`, radius 12–14, Mono-Titel «● NAME» in Modusfarbe, für
  Kennzahlen/Modus-Badge/Achsenkreuz/Zoom.
- **KSegmentPill** (falls nicht via KTabs), **KStatuszeile** (30px, `--k-statusbar`, Mono-11px-
  Chips), **KPipelineNode** (min 220px, 1.5px Rollenborder 55 %, radius-node 18, running-Puls 2s)
  für NodeCanvas/vis, **KVariantenKarte** (4/3, ID-Pill auf rgba(5,6,8,.6)+blur(6),
  RENDERT/FAVORIT-Badges, Scan nur bei running, gewählt = 1.5px accent + glow) für
  KuratierFlaeche.
- **KApprovalCard-Optik** als CSS-Klassensatz mit **deutschen** Aktionen (Einmal erlauben / Für den
  Job erlauben / Nachfragen / Ablehnen) — angewendet auf das **eingefrorene** GovernanceGate.tsx
  nur über Klassen, ohne die Datei strukturell anzufassen (falls unmöglich: Optik bleibt, Neubau
  vertagt).

**Workspaces (G-Dateien):** JSX-Hülle und Styles neu (Klassen statt Inline), Hooks/Store-Aufrufe/
testids/aria-labels/`window.__kosmo` byte-genau erhalten. Reihenfolge nach Risiko aufsteigend:
Icon-Dateien (RV) → kleine Panels (Inspector, KennzahlenPanel, QuellenListe, ReferenzTabelle,
KuratierInspektor, ViewportChromeHuds) → PublishWorkspace/NodeCanvas → KosmoPanel/DataWorkspace/
DesignWorkspace/App.tsx zuletzt, je mit E2E-Lauf als Gate.

---

## 4 · Dock/Werkzeugtabs- und BodenDock-Zielgestalt

**v0.7.8 «Intelligente Werkzeugtabs» ist führend** (jüngstes Verhaltens-Paket, Solver bereits als
`state/dock-kern.ts` portiert). Konzept A «Orbit-Zonen» ist produktiv; der Konzept-Umschalter ist
Studien-Chrome, kein Produkt-Feature. **Solver/State/Befehle (dock-kern.ts, dock-zustand.ts,
dock-befehle.ts) bleiben 1:1** — der Neubau zieht nur die Chrome-Schicht (dock-flaeche.css,
DockPanel-Markup) streng nach Blaupause:

- **DockPanel gedockt:** radius 12, `borderTop 2px solid var(--rolle)` als einzige flächige
  Rollenkennung, 1px `--k-line-subtil` (fokussiert strong + glow-cyan-sm), Grund `--k-surface`,
  shadow-md; Kopf h 28 auf `--k-flaeche-zwischen`: 6px-Rollenpunkt · Mono-Titel **12px/600/.14em/
  uppercase** (Abnahme-Fix F5, nicht die 10px des Prototyps) · KOSMO-Badge (gold) · PIN-Badge
  (teal, + inset-Innenring accent-line, Fix C4) · 20×20-Knöpfe (Chevron/Pin/Pop-out/Redock/Close,
  Close-hover danger).
- **Float/HUD:** gleiche Anatomie auf Glass (Token-gemappt), shadow-lg, Griffpunkte-Icon, Redock
  statt Pop-out.
- **Eingeklappter Tab:** h 34, Zeile «EINGEKLAPPT · TIPPEN ZUM ÖFFNEN» (Mono 9px faint, hover
  accent), ganze Fläche klickbar.
- **Splitter:** 14px Griffzone, sichtbare 2px-Linie, hover 3px accent + glow-cyan-sm; **Snap-
  Zonen:** 1.5px dashed accent-line auf rgba(87,182,194,.04), aktiv accent + accent-quiet, r10,
  Labels ‹← LINKS›/‹RECHTS →›/‹SCHWEBEND›; **Move-Ghost:** Kopf-only, rotate(-1°), opacity .96.
- **Closed-Chips** in der Kommandoleiste; **Auto-Hinweis-Chip** 2,9 s (HINWEIS_DAUER_MS=2900
  existiert); **Kosmo ordnet:** goldener 48px-Orb (Gleitfahrt .55s), Highlight-Ring + KOSMO-Badge,
  goldene Sprechleiste mit STOPP — an reale `ui.*`-Commands gebunden.
- **Shell-Zonen (absolute Zielmasse aus 0.7.5, Anatomie aus 8a/8b):** Header 56px (`--k-sunken`,
  border-bottom subtil; Wortmarke · Mono-Flächenlabel · Pills · Live-Punkt · Ghost/Secondary/
  Primary) · Statuszeile 30px (`--k-statusbar`, Mono 11: links «● Core verbunden» + Breadcrumb,
  rechts Modusfarben-Status + GPU-Metrik) · **Rail 52px fix** mit 30×30-Tools r8 (Solver-Konstante
  v0.7.8; die 64px/44×44 aus 0.7.5 sind dadurch überholt) · rechte Panels 320–340px angedockt/
  sunken · Viewport-HUDs nur in den vier Ecken +16px. Die 8a/8b-Screens (Topbar 36 bei 884px-
  Mockbreite usw.) gelten **proportional** als Abnahme-Referenz für Dichte und Anatomie, nicht als
  absolute px.

**BodenDock (v0.7.3-Blaupause + v0.7.2-Intelligenz):** schwebende Glas-Pill unten Mitte, radius
999, padding 7px 14px, gap 10; Top-Tool **44px**-Kreis mit 1.5px Rollenfarben-Border + 4px-
Rollenpunkt (bottom −7), übrige Tools **36px** mit 1px-Border; 1×26px-Trenner; **Kosmo-Orb 38px** =
1.5px gestrichelter Teal-Ring + 9px-Teal-Punkt. Rang-Formel `RANG(T) = 0.6·PHASE(T) +
0.4·NUTZUNG(T, 7 Tage)` mit Hysterese («stabil vor spontan»), FLIP-Umsortierung 240–500 ms, Hover-
Sog nur Nachbarn, max. eine Subtool-Ebene offen. **Position bottom:96px bleibt** (Spec-Test,
Statusleisten-Kollision — sticht die Mock-12px).

---

## 5 · Motion-System

**Massgeblich sind die Repo-Tokens (jüngste Präzisierung), die `_ds`-/Paket-Werte sind Rahmen:**
- Dauern/Kurven: `--k-motion-fast 120ms` · `--k-motion-base 200ms` · `--k-motion-settle 320ms`
  (cubic-bezier(0.3,0,0.2,1) bzw. (0.22,0.9,0.28,1)); Easing-Trio `--k-ease-standard cubic-
  bezier(0.4,0,0.2,1)` · `-entrance (0.16,1,0.3,1)` · `-bounce (0.34,1.4,0.64,1)`.
- Feder: `--k-feder 260ms linear(0, 0.32 12%, 0.72 28%, 0.95 46%, 1.02 64%, 1 82%, 1)` (+ Fallback
  (0.3,1.25,0.4,1)); Knopfdruck `--k-druck-dauer 80ms` / `--k-druck-skala 0.97`, antwortet auf
  pointerdown.
- Dock-Zeitskala: `--k-dock-reflow .28s` (left/top/width/height) · `--k-dock-orb .55s` (entrance) ·
  `--k-dock-schnell .16s` (Splitter/Snap/Hover).
- Rahmen (0.7.2, bindend): Feedback < 700 ms, Ambient-Loops 1.8–7 s; Rhythmen (`_ds`): Puls
  1.6–2.4 s, Scan-Reveal 0.4–0.7 s, Datenstrahl 0.8–1.2 s, Orbit-Drift 12–24 s; 0.7.5: vizpulse
  2–2.2 s nur an Live-Punkten, vizscan 1.8 s **nur** bei status=running, Orb-Puls-Tempo nach
  Zustand (idle 3.4 / hörend 2.2 / denkt 1.5 / handelt 1.2 s).
- Morph-Regel: Kollaps 140 ms → Punkt-Feder scale 1.6 → Entfaltung 180 ms Overshoot 1.12, ≈320 ms
  Bounce.
- **Was animiert wird:** Zustandswechsel (Border/Glow/Farbe), hover translateY(-1px), FLIP-Reflow,
  Kosmo-Physik-Zustände, Cursor (rAF/transform ohne Re-Render). **Was nicht:** Deko-Loops auf
  Flächen, permanente Glows, Layout-Spielereien. «Papier flattert nicht.»
- `prefers-reduced-motion` global (existiert) + manueller Motion-Toggle (v0.7.8); statischer
  Endzustand immer voll lesbar; während aktivem Drag transition:none.

---

## 6 · Konfliktentscheide (neuestes Owner-Recht gewinnt)

| Konflikt | Entscheid | Begründung |
|---|---|---|
| Namensraum `--ink-*/--space-*` (`_ds`) vs. `--k-*` (Repo) | `--k-*` kanonisch, DS gemappt | API-Stabilität, token-spiegel-Wächter, bisheriges Muster |
| DS-Spacing 4–96 (kein 2px) vs. `--k-s1..s7` (2–32) | s1–s7 bleiben, s8/s9/s10 = 48/64/96 additiv | Repo-Skala ist testgesichert; DS-Pflichtstufen fehlen nur oben |
| DS-Light `#F7F9FC`/`#2E8794` vs. Papier `#f5f3ee`/`#3e96a2` | Papier | v0.7.3 D7 ist jüngeres Owner-Recht als das `_ds`-Tokenpaket |
| `--text-faint #5C6271` (0.7.5) vs. `--k-ink-faint #6e7686` (aura.css orbit Z.257) | `#6e7686` | Repo v0.7.8 jünger; kein Doppelwert (per Stichprobe §7.2 bestätigt) |
| Glass-Fill weiss `.045` (`_ds`) / `rgba(16,19,25,.78)` (Prototyp) vs. `rgba(20,23,31,.62)` (Repo v0.7.6) | Repo-Token | jüngster Abgleich; Prototyp-Werte werden gemappt |
| Rollen-Fill 10 % (README) vs. 12 % (`1f`, Repo) | 12 % | v0.7.6 ist der jüngere Abgleich |
| Borders Alpha-Weiss (`_ds`/0.7.5) vs. Volltöne `#222732/#2a3140` (Repo orbit) | **Umstellung auf Alpha** (.07/.11/.18) im Orbit-Theme | einzige Stelle, an der das Paket das Repo sticht: Alpha trennt auf allen 6 neuen Flächenstufen konsistent; visuell ≈ identisch auf `#0b0d12`; Papier bleibt Voll |
| Schattenskala + 48px-Raster (v0.7.8 «bewusst ausgelassen») | Schatten **jetzt nachziehen** (orbit-only); 48px-Raster bleibt Owner-Frage (nur Dock-Bühnen-Backdrop erlaubt) | Owner-Formel «sobald eine Fläche danach fragt» — Panels/HUDs des Neubaus fragen; ein generelles Layout-Raster fragt niemand |
| Rail 46px (8a/8b) / 64px (0.7.5) / 52px (v0.7.8-Solver) | 52px, 30×30-Tools | Solver-Konstante = Software-Kern, jüngstes Paket |
| Header 36px (8a/8b-Mock 884px) vs. 56px (0.7.5 @1920) | 56px absolut; 8a/8b proportional als Dichte-Abnahme | Mock-Masse skalieren (~36×1.6≈56), kein echter Widerspruch |
| BodenDock bottom 12px (Mock) vs. 96px (Repo) | 96px | per Spec-Test bewiesene Kollisionsvermeidung (per Stichprobe §7.2 bestätigt) |
| Dock-Konzept A vs. B | A produktiv, Umschalter entfällt | Paket-Empfehlung + Repo-Ist |
| ApprovalCard englisch (`_ds`) vs. deutscher Inline-Nachbau (0.7.5) | deutsch | Voice-Vertrag (CH-Deutsch) ist Verfassung |
| `_ds`-Typo 60/42px vs. Repo max 20px | additiv, aber nur ausserhalb des CAD-Chromes | 8a/8b-Dichte bleibt Abnahme-Referenz der Shell |
| v0.7.31 vs. v0.7.3 | byte-identisch, kein Delta | MD5-Befund |
| `--ak-*` Neon | nie live | `_ds`: nur kanonische Referenz |
| Dunkel-only (v0.7.2/0.7.5/v0.7.8) vs. Theme-Paar | Theme-Paar Pflicht; Paket-Hexwerte = Orbit-Soll | D7 ist Owner-Entscheid; jede neue Klasse muss beide Themes bedienen |
| Prototyp-Bühne 1440×900 + scale() | nicht bindend | dock-kern misst reale Leisten (`opts.feld`) — dokumentierter Port-Entscheid |
| Viz-eigene Dark-Shell (0.7.5 §3) vs. Papier/Kosmos-Themenpaar | **Themenpaar Pflicht, Viz-Anatomie übernommen** | Owner-Entscheid 4 (§0.2) — kein zweites Designsystem neben aura.css |

---

## 7 · Unantastbare Verträge (mit Messzahlen) und was NICHT angefasst wird

### 7.1 · Verträge (Prüfraster, aus der Gegenprüfung, gemessen)

- **testids:** 953 `data-testid` in `apps/kosmo-orbit/src`, **3523** Locator-Zugriffe in `e2e/`
  (Hotspots: `module.spec.ts` 155, `dock-interaktion.spec.ts` 82, `dock-layout.spec.ts` 81,
  `vis-oberflaeche.spec.ts` 57). Bestand byte-gleich, Neues additiv.
- **E2E-Texte wörtlich:** z. B. `e2e/module.spec.ts:488` `toContainText('1:500')`; 37
  `getByText/getByRole`-Asserts insgesamt. Versal-/Mono-Konventionen sind testrelevant.
- **`window.__kosmo*`-Brücken:** `state/kosmo-status.ts:117–130` (`__kosmoStatus`), Muster
  `__kosmoBlick`/`__kosmoChat` in `shell/KosmoPanel.tsx`; **611** `__kosmo`-Treffer in
  `e2e/*.spec.ts` — formidentisch zu bedienen.
- **dock-kern-Solver:** `state/dock-kern.ts:1–25`, dokumentierter 1:1-Verhaltens-Port; 67 Tests in
  `test/dock-kern.test.ts`; `solve()/waterfill()/placeFloats()/separate()` dürfen nicht
  «vereinfacht» werden.
- **Goldens:** 33 SVG + 1 IFC in `packages/kosmo-kernel/test/golden/`, byte-identisch (Owner-
  Entscheid 5); Änderungen nur als deklarierter Sammelwechsel.
- **exactOptionalPropertyTypes:** `tsconfig.base.json:10`; naive Prototyp-Ports scheitern im
  Typecheck (8 Workspaces).
- **Token-Wächter:** `packages/kosmo-ui/test/token-spiegel.test.ts` parst `aura.css` (149
  Custom-Properties) gegen `tokens.ts` — dreifach synchron.
- **«Papier ist Papier»:** `docs/GESTALTUNGSKONZEPT.md` — Planblatt theme-invariant weiss; Akzent
  färbt nie Flächen, nie Lauftext.
- **Die 10 riskantesten gemischten Logik/Darstellungs-Dateien** (Zeilen/testids/Hooks/
  runCommand/Inline-Styles gemessen) und die realistische Wellenstruktur stehen vollständig in
  `docs/V080B-KRITIK.md` §2/§4 — diese Spez dupliziert die Tabelle nicht, sondern verweist
  darauf; der Wellenplan in §8 unten folgt ihrer Risiko-Reihenfolge.

### 7.2 · Stichproben-Verifikation gegen aura.css (5 Werte, Repo-Stand 1d29136)

Direkt gegen `packages/kosmo-ui/src/aura.css` geprüft, keine Abweichung gefunden:

1. Papier-Theme `#f5f3ee/#fbfaf6/#ffffff/#1a1815` — Zeilen 10–13, exakt.
2. Orbit-Zusatzstufen `--k-sunken #08090d` (281) · `--k-statusbar #050608` (282) ·
   `--k-flaeche-zwischen #101319` (290) · `--k-ink-muted #8b92a2` (291) · `--k-ink-faint #6e7686`
   (257) — exakt.
3. Radien-Skala xs 6 (124) · sm 8 (114) · md 12 (115) · karte 14 (125) · lg 16 (116) · node 18
   (126) · pill 999 (147) — exakt.
4. Motion: `--k-motion-fast 120ms`/`-base 200ms`/`-settle 320ms` (127–129), `--k-feder 260ms
   linear(...)` (137), Dock-Zeitskala `--k-dock-reflow .28s`/`-orb .55s`/`-schnell .16s`
   (185–187) — exakt.
5. Rail 52 (`state/dock-kern.ts:137` `RAIL: 52`) und BodenDock `bottom: 96px`
   (`shell/boden-dock.css:17`) — exakt.

Zusätzlich bestätigt: Orbit-Borders sind heute `--k-line #222732` / `--k-line-strong #2a3140`
(Volltöne, Zeilen 259–260) — der in §1/§6 beschlossene Alpha-Flip (`.07/.11/.18`) ist damit W1-
Arbeit, keine bereits vorhandene Tatsache. Ebenso bestätigt: `--k-hover`, `--k-radius-hub`,
`--k-s8/s9/s10`, `--k-t-h3/-h2/-h1/-display`, `--k-shadow-*` und `--k-hairline` existieren **noch
nicht** in aura.css — die Synthese beschreibt sie korrekt als additive W1-Erweiterungen, nicht als
Bestand.

### 7.3 · Was NICHT angefasst wird

- **Gesamter `state/`** (40 Dateien, 11'721 Z.) inkl. `dock-kern.ts`-Solver, `dock-zustand.ts`,
  `dock-befehle.ts`, `dock-stationen.ts`, aller Stores; **eingefroren:** `state/ui-befehle.ts` und
  `shell/GovernanceGate.tsx` (trotz 13 Inline-Styles).
- **Plangrafik/Kernel:** `derive/stilblatt.ts`, `beschlag.ts`, D1–D6-Werte (Stifte 0.18/0.25/0.35/
  0.5, Grau-Treppe #111/#3A3A3A/#666/#8A8A8A, Linientypen, mm-Typo), 24 Golden-SVGs (byte-
  identisch, svg-qa Pflicht), `--k-plan-paper #fdfcf9`, SIA-Bemassung mit hochgestelltem mm-Rest,
  `toBe(18)`-Werkzeugzähler (seit v0.8.1: 17, Splat-Fusion §8 Sanktion 1 der
  V081-SPEZ). Der Neubau stylt nur den Rahmen ums Blatt, nie das Blatt.
- **Verträge:** 975 `data-testid` + 111 `aria-label` byte-genau; `window.__kosmo` (App.tsx:427)
  formidentisch; 117 E2E-Specs mit 2891 testid-Referenzen sind der Prüfstein.
- **Packages** kosmo-kernel/-data/-ai/-contracts/-sync/-lizenz; alle reinen Logik-`.ts` in shell/
  (~13 Dateien) und modules/ (~35 Dateien: Worker, Import/Export, PDF, Hit-Tests, Runtimes).
- **Owner-Vorbehalte, die offen bleiben:** allgemeines 48px-Layout-Raster; neue Leisten-Werkzeuge
  (kein 19. Werkzeug ohne Owner-Entscheid); wählbare Akzentfamilien und Modul-Farben bleiben
  unverändert bestehen.

---

## 8 · Wellenplan W0–W9

- **W0 · P0 Spez:** Synthese + Kritik als `docs/V080B-DESIGN-SPEZ.md` + `docs/V080B-KRITIK.md` ins
  Repo (dieses Dokument); Spez ergänzt um die Vollständigkeits-Matrix (§9) über alle 7 Digests
  (Abnahmegrundlage W8) und die 6 Owner-Entscheide (§0.2).
- **W1 · Token-Fundament:** `aura.css` (additive Tokens + Alpha-Border-Flip orbit + Schatten-Skala
  + hover-Stufe, §1) + `tokens.ts` + `token-spiegel.test.ts` SYNCHRON; keinerlei derive-
  Beteiligung; Abnahme über Vorher/Nachher-Screenshots aller Stationen (Token-Flips wirken global)
  + svg-qa 33 byte-identisch als Wächter.
- **W2 · kosmo-ui-Neubau:** Umbau der 7 Bestandskomponenten + 6 neue Komponenten + Klassensätze
  (Approval-Optik), Unit-Tests; noch KEIN Workspace-Umbau (§3).
- **W3 · Shell + Dock-Chrome + BodenDock:** Header/Statuszeile/Rail-Zielmasse, `dock-flaeche.css` +
  DockPanel-Markup nach Blaupause, BodenDock-Gestalt + Rang-Formel/FLIP (als dokumentiert additives
  Verhalten), Closed-Chips, Quittungs-Chip-Optik; volle Dock-E2E-Suite + `boden-dock.spec` als
  Gate. `dock-kern.ts` tabu (§4).
- **W4…W7 · Stationen einzeln, Risiko aufsteigend** (Kritik-Befund: kein «CSS-Durchgang», echte
  Umbauten mit vollem Gate): **W4 publish** (klein, frisch) → **W5 vis** (Viz-Anatomie: Statuszeile,
  HUD-Ecken, KPipelineNode/KVariantenKarte in NodeCanvas/KuratierFlaeche) → **W6 data** (258
  Inline-Styles, KKeyValue-Einsatz) → **W7 design + Shell-Rest** (DesignWorkspace 4460 Z. zuletzt;
  KosmoPanel mit `__kosmoChat`/`__kosmoBlick`-Brücken-Erhalt; App.tsx, Einstellungen). Je Welle:
  JSX-Hülle/Klassen neu, Hooks/Stores/testids/`window.__kosmo` byte-genau, stations-eigener
  E2E-Batch, Screenshot-Abnahme, Push. NICHT parallelisierbar, wo `state/` geteilt wird — Stationen
  laufen sequenziell.
- **W8 · P-Abnahme:** adversariale Matrix-Abnahme gegen die Spez-Matrix (§9, 361er/379er-Muster) +
  Dichte-Abnahme gegen die 8a/8b-Referenzscreens (proportional); Muss-Punkte fixen.
- **W9 · Release v0.8.0B:** Bump «0.8.0B» (Bump-Stellen wie 7b1c1ad), Neuigkeiten,
  STAND/CLAUDE-Stempel, Rundgang-PDF mit VORHER/NACHHER-Gegenüberstellung je Station,
  release-gate, Push, SendUserFile.

**Verifikation je Welle:** typecheck 8 WS · vitest Vollsuiten (Kernel 924 / App 1092+ Basis) ·
svg-qa 33/0 byte-identisch · stations-eigener E2E-Batch grün · Screenshots visuell abgenommen
(Dichte gegen 8a/8b) · testid-Gegenprobe per `git diff` · sofortiger Push, local == origin. Finale:
Matrix-Abnahme → release-gate Exit 0 → Rundgang-PDF Vorher/Nachher → SendUserFile.

---

## 9 · Vollständigkeits-Matrix (Abnahme-Grundlage W8)

Jede `kernaussagen`-, `layoutregeln`- und `komponenten`-Zeile aller 7 Paket-Digests
(`scratchpad/v080b-digests.json`) ist unten einzeln abgehakt, mit Quellpaket(en), Ziel-Welle oder
Vertagungs-Grund. Dies ist die Grundlage, gegen die W8 (Matrix-Abnahme, adversarial) am Ende prüft
— jede Zeile ohne Beleg dort ist ein Muss-Punkt für W8b.

**Quellpaket-Kürzel:** `[P73]` Kosmodesign v0.7.3 Gestaltungspaket (Canvas R2 + Präsentation) ·
`[P731]` v0.7.31 (byte-identisch mit P73 — eigene Zeilen entfallen, jede P73-Zeile gilt 1:1 mit) ·
`[DS]` `_ds` Architekturkosmos-Design-System · `[P72]` KosmoOrbit v0.7.2 Visual Update ·
`[P71]` Dossier v0.7.1 · `[VIZ]` 0.7.5 Kosmo Viz · `[WZT]` v0.7.8 Intelligente Werkzeugtabs.

### 9.1 · Grundgesetze, Dichte, Sprache

- [x] **B-1** 80·15·5-Dichte-Gesetz, operationalisiert als genau eine gefüllte Signal-Fläche pro
  Viewport `[P73,P731,DS,P72,VIZ,WZT]` → **W2** (Gesetz 1, KButton/KChip) + Anwendung **W3–W7**
- [x] **B-2** Eine Hauptthese pro View, max. drei Sekundärfakten `[DS,VIZ]` → **W2** (Gesetz 2) +
  Anwendung je Station
- [x] **B-3** Rund statt Block (Kreis-Werkzeuge, Pills, Ausnahme Neun-Quadrat-Logo)
  `[P72,P73,P731]` → **W2** (Gesetz 5, KToolbar) + **W3** (Rail/Dock)
- [x] **B-4** Kanten-Regel (Rand-Animationen docken an Kante/Ecke) `[P72]` → bereits Repo-Stand
  (CursorEbene/Übernahme-Wächter), Referenz-Verifikation **W7**
- [x] **B-5** Morph-Regel (Symbole verwandeln über Signal-Punkt, ≈320 ms, keine Badges)
  `[P72,WZT]` → **W2** (Gesetz 11) + **W7** (KosmoPanel/Cursor)
- [x] **B-6** Status nie nur Farbe (Punkt/Icon + Mono-Label) `[P73,P731,DS,VIZ,WZT]` → **W2**
  (Gesetz 10) + Anwendung je Station
- [x] **B-7** Zwei Schriftstimmen (Lato Versal Titel / Mono uppercase .14em Messbares)
  `[P73,P731,DS,P71,VIZ]` (D4) → **W2** (Gesetz 6) + Typo-Erweiterung **W1**
- [x] **B-8** Glow = Infozustand, Glass = Schwebe-Sprache, nie Stationsfläche `[DS,VIZ,WZT]` →
  **W2** (Gesetz 7) + **W3** (Dock-HUDs) + **W5** (Vis-HUDs)
- [x] **B-9** Hierarchie über Flächenstufen + Hairlines statt Kästen `[DS,P71]` → **W1**
  (Border-Alpha-Flip + Flächenstufen, Gesetz 8)
- [x] **B-10** Sichtbarkeit phasen-/datengesteuert (LOD-Treppe, Guards, Closed-Chips/34px-Tabs)
  `[P73,P731,P71,WZT]` (D3) → **W2** (Gesetz 9, Chip-Optik) + **W3** (Dock Closed-Chips/Tabs)
- [x] **B-11** CH-Deutsch/UPPERCASE-Mono/keine Emoji/reduced-motion/Fokus/Disabled-Grammatik
  `[P73,P731,DS,P72,P71,VIZ,WZT]` → **W2** (Gesetz 12) + globale Verifikation jede Welle
- [x] **B-12** «Schwarz trägt, Farbe zeigt» — Akzent nie Fläche/Lauftext `[P71]` (GESTALTUNGSKONZEPT-
  Owner-Entscheid) → bereits Repo-Vertrag (§7.3), Referenz-Verifikation jede Welle

### 9.2 · Token-Architektur — Namensraum & Bestand

- [x] **B-13** `--k-*` kanonisch, DS-Namen nur Mapping-Tabelle, token-spiegel-Wächter
  `[DS und alle Pakete implizit]` → **W1**
- [x] **B-14** `--ak-*` Neon nie live, nur kanonische Referenz `[DS]` → **W1** (Referenz bleibt
  Kommentar, kein Einsatz)
- [x] **B-15** Theme-Paar Papier/Kosmos bestätigt bindend (D7), Rollenfarben hex-identisch mit
  DS/VIZ/WZT `[P73,P731,DS,P72,VIZ,WZT]` → bereits Repo-Stand, Referenz-Verifikation **W1**
  (bestätigt, §7.2)
- [x] **B-16** Glass-Rezept (fill/stroke/blur20 saturate1.4); Float-Panel-Variante gemappt statt
  Zweitwert `[P73,VIZ,WZT]` → **W1**
- [x] **B-17** Glow nur Info-Zustand (`--k-glow-cyan`/`-sm`) `[DS,VIZ,WZT]` → bereits Repo-Stand,
  Referenz **W1**
- [x] **B-18** Radien 6/8/12/14/16/18/999 themenübergreifend `[P73,P731,DS,VIZ,WZT]` → bereits
  Repo-Stand, Referenz **W1** (bestätigt, §7.2)
- [x] **B-19** Fonts Lato/IBM Plex Mono/PT Sans Narrow themenübergreifend
  `[P73,P731,DS,P71,VIZ,WZT]` → bereits Repo-Stand, Referenz **W1**
- [x] **B-20** Akzentfamilien (kupfer/signal/blau/gruen), Modul-Farben, Skizzenpapier-Korn bleiben
  unverändert `[P71]` → kein Bauauftrag, Bestandsschutz

### 9.3 · Token-Architektur — additive Erweiterungen

- [x] **B-21** Spacing `--k-s8/s9/s10` = 48/64/96 additiv zu s1–s7 `[DS,P71,VIZ]` → **W1**
- [x] **B-22** Rohe px/Hex-Literale in visueller Schicht = Review-Befund (Ausnahme Plangrafik)
  `[DS]` → **W1** (Prinzip) + jede Welle (Review-Kriterium)
- [x] **B-23** Typo-Leiter h3/h2/h1/display (21/28/42/60) nur ausserhalb CAD-Chrome, Label-Rezept
  11–12px Mono `[DS,VIZ]` → **W1** (Tokens) + **W7** (Einsatz Onboarding/Report/Leerzustände,
  soweit im Scope)
- [x] **B-24** Schatten-Skala xs–xl + inset-top orbit-only, Papier behält shadow-raised/-overlay
  `[DS,P71,VIZ,WZT]` → **W1**
- [x] **B-25** Border-Dreistufigkeit Alpha-Weiss .07/.11/.18 + `--k-hairline` (orbit-only)
  `[DS,VIZ,WZT]` → **W1** (Konfliktentscheid §6: Alpha sticht Repo-Volltöne im Orbit-Theme)
- [x] **B-26** Flächenstufe Hover `--k-hover #222732` (komplettiert sunken→hover) `[DS,VIZ,WZT]` →
  **W1**
- [x] **B-27** `--k-radius-hub 26px` (OrbitStart/Hub fragt jetzt danach) `[DS,P72]` (Orbit-Hub-
  Konzept) → **W7** (App.tsx/OrbitStart)

### 9.4 · Verworfen/überholt (Token-Ebene)

- [x] **B-28** DS-Light-Mode (`#F7F9FC`, Akzent `#2E8794`) verworfen zugunsten Papier-Theme (D7)
  `[DS]` → **Verworfen** (Konfliktentscheid §6)
- [x] **B-29** `--text-faint #5C6271` (VIZ) vs. `--k-ink-faint #6e7686` (Repo) — Repo gilt `[VIZ]`
  → kein Bauauftrag (§6, bestätigt §7.2)
- [x] **B-30** Rollen-Fill 10 % (DS-README) vs. 12 % (Repo) — 12 % gilt `[DS,VIZ]` → kein
  Bauauftrag (§6)
- [x] **B-31** Prototyp-Hexwerte (z. B. agent `#9A7C34`) vs. Token — Token gewinnt immer
  `[Kritik-Präzedenz]` → kein Bauauftrag, Prinzip für alle Wellen
- [x] **B-32** Prototyp-Bühne 1440×900 + `transform:scale()` nicht bindend, dock-kern misst reale
  Leisten `[WZT]` → kein Bauauftrag (`dock-kern.ts` bleibt tabu, §7.3)
- [x] **B-33** 48px-Layout-Raster als generelles Utility bleibt offene Owner-Frage, nur Dock-
  Bühnen-Backdrop erlaubt `[DS,WZT]` → **Offener Punkt** (§9.14), kein Bauauftrag ausser
  Backdrop-Ausnahme **W3**

### 9.5 · Komponenten — Umbau Bestand

- [x] **B-34** KButton 1px-Border-Prinzip (primary/secondary/ghost/danger, sm/md/lg)
  `[DS,VIZ]` → **W2**
- [x] **B-35** KField/KInput sunken + Mono-Label + focus-within, Variante `command`
  `[DS,VIZ]` → **W2**
- [x] **B-36** KTabs Segmented-Pill (PhasenLeiste + Ansichts-Umschalter vereinheitlicht)
  `[P73,P731,P72]` → **W2**
- [x] **B-37** KChip Closed-Chip-Variante + Status-Chip `[WZT,P73]` → **W2**
- [x] **B-38** KSelect/KDialog/KMenu/Meldungen: Optik Glass/Flächenstufen, Verhalten unverändert
  `[DS]` → **W2**
- [x] **B-39** KToolbar/KToolGruppe Kreis-Werkzeug-Grammatik (32px, Stroke 1.75, invertiert/
  Border+Punkt) `[P73,P731,P72,WZT]` → **W2** (Komponente) + **W3** (Rail-Einsatz)

### 9.6 · Komponenten — Neu

- [x] **B-40** KPill (Rollen-Tag 22px + solid-Variante) `[DS,VIZ]` → **W2**
- [x] **B-41** KKeyValue (Zeilenstapel, ersetzt Label/Wert-Inline-Muster) `[VIZ,P71]` → **W2**
  (Komponente) + **W6** (data, 258 Inline-Styles)
- [x] **B-42** KHud (Glass-HUD-Karte, Mono-Titel «● NAME») `[P73,P731,VIZ]` → **W2** (Komponente)
  + **W3**/**W5** (Einsatz)
- [x] **B-43** KStatuszeile (30px, `--k-statusbar`, Mono-11px-Chips) `[P73,P731,VIZ,WZT]` → **W2**
  (Komponente) + **W3** (Shell)
- [x] **B-44** KPipelineNode (min 220px, Rollenborder, running-Puls) `[DS,VIZ]` → **W2**
  (Komponente) + **W5** (NodeCanvas-Einsatz)
- [x] **B-45** KVariantenKarte (4/3, ID-Pill, RENDERT/FAVORIT-Badges, Scan) `[VIZ]` → **W2**
  (Komponente) + **W5** (KuratierFlaeche-Einsatz)
- [x] **B-46** KApprovalCard-Optik deutsch (Einmal erlauben/Für den Job erlauben/Nachfragen/
  Ablehnen), nur Klassen auf GovernanceGate `[DS,VIZ]` → **W2** (Klassensatz) + **W7** (Anwendung,
  Datei strukturell unangetastet)
- [x] **B-47** Workspaces-Umbau allgemein (JSX-Hülle/Klassen statt Inline, Hooks/testids/aria/
  `__kosmo` byte-genau), Reihenfolge RV→kleine Panels→Publish/NodeCanvas→KosmoPanel/
  DataWorkspace/DesignWorkspace/App.tsx `[Synthese §3, Kritik §2]` → **W4–W7**

### 9.7 · Shell-Zonen

- [x] **B-48** Header 56px (sunken, Wortmarke/Mono-Label/Pills/Live-Punkt/Buttons)
  `[P72,VIZ,WZT]` → **W3**
- [x] **B-49** Statuszeile 30px (`--k-statusbar`, Mono 11, Core+Breadcrumb, Modusfarbe+GPU **nur
  mit echten Daten**) `[P73,P731,VIZ,WZT]` → **W3** (GPU-Metrik-Ehrlichkeit, Kritik §3)
- [x] **B-50** Rail 52px fix, 30×30-Tools r8 (Solver-Konstante sticht 46px/64px älterer Pakete)
  `[P73,P731,VIZ,WZT]` → **W3** (Konfliktentscheid §6: 52px gewinnt)
- [x] **B-51** Rechte Panels 320–340px angedockt/sunken `[VIZ,WZT]` → **W3**
- [x] **B-52** Viewport-HUDs nur in den vier Ecken +16px `[VIZ,WZT]` → **W3** (Dock) + **W5**
  (Vis-HUD-Ecken)
- [x] **B-53** 8a/8b-Screens proportional als Dichte-Abnahme-Referenz (nicht absolute px)
  `[P73,P731]` → **W8** (Matrix-/Dichte-Abnahme)

### 9.8 · Dock-Chrome

- [x] **B-54** DockPanel gedockt (radius12, borderTop 2px Rolle, Kopf 28 Mono-Titel 12px, Badges
  KOSMO/PIN, Knöpfe 20×20) `[WZT]` → **W3**
- [x] **B-55** DockPanel Float/HUD (Glass, shadow-lg, Griffpunkte, Redock) `[WZT]` → **W3**
- [x] **B-56** Eingeklappter Tab h34 «EINGEKLAPPT · TIPPEN ZUM ÖFFNEN» `[WZT]` → **W3**
- [x] **B-57** Splitter 14px Griffzone, Snap-Zonen 1.5px dashed, Move-Ghost rotate(-1°)
  `[WZT]` → **W3**
- [x] **B-58** Closed-Chips in der Kommandoleiste `[WZT,P73]` → **W3**
- [x] **B-59** Auto-Hinweis-Chip 2,9 s (HINWEIS_DAUER_MS existiert) `[WZT]` → **W3** (bereits im
  Repo, Chrome-Feinschliff)
- [x] **B-60** Kosmo ordnet (48px Gold-Orb, Highlight-Ring, KOSMO-Badge, Sprechleiste STOPP, an
  `ui.*`-Commands) `[WZT]` → **W3**
- [x] **B-61** Nie-Überlappung/feste Rangfolge (viewport 100 > rail 95 > inspector 82 > …)
  `[WZT]` → bereits im Solver (`dock-kern.ts`, NICHT ANGEFASST), Chrome-Referenz **W3**
- [x] **B-62** Konzept A «Orbit-Zonen» produktiv, Umschalter entfällt (Studien-Chrome)
  `[WZT]` → **W3** (kein Umschalter im Produkt)
- [x] **B-63** Alles manuell übersteuerbar (Pin/Pop-out/Redock/Anheften) `[WZT]` → bereits im
  Solver/State (NICHT ANGEFASST), Chrome-Optik **W3**

### 9.9 · BodenDock

- [x] **B-64** Glas-Pill-Container radius999, padding 7/14, gap 10 `[P73,P731,P72]` → **W3**
- [x] **B-65** Top-Tool 44px-Kreis Rollenborder+Punkt, übrige 36px, 1×26px-Trenner
  `[P73,P731,P72]` → **W3**
- [x] **B-66** Kosmo-Orb 38px gestrichelter Teal-Ring+Punkt `[P73,P731,P72]` → **W3**
- [x] **B-67** Rang-Formel RANG=0.6·PHASE+0.4·NUTZUNG mit Hysterese, FLIP 240–500 ms, Hover-Sog nur
  Nachbarn, max. eine Subtool-Ebene `[P72]` → **W3** (dokumentiert additives Verhalten, Solver-
  Anteil bleibt tabu wo geteilt)
- [x] **B-68** Position bottom:96px bleibt (sticht Mock-12px) `[P73,P731]` → kein Bauauftrag
  (bereits Repo-Stand, bestätigt §7.2), Referenz **W3**

### 9.10 · Motion

- [x] **B-69** Easing-Trio standard/entrance/bounce `[P72,DS,P71,VIZ,WZT]` → bereits Repo-Stand,
  Referenz **W1** (bestätigt §7.2)
- [x] **B-70** Dauern fast120/base200/settle320 `[P71,VIZ,WZT]` → bereits Repo-Stand, Referenz
  **W1**
- [x] **B-71** Feder 260ms + Fallback, Druck 80ms/scale.97 `[P71]` → bereits Repo-Stand, Referenz
  **W1**
- [x] **B-72** Dock-Zeitskala reflow .28/orb .55/schnell .16 `[P71,WZT]` → bereits Repo-Stand,
  Chrome-Nutzung **W3**
- [x] **B-73** Morph-Regel Kollaps140→Feder scale1.6→Entfaltung180 Overshoot1.12 ≈320ms
  `[P72]` → **W2**/**W7** (Referenz-Anwendung Icon-Wechsel)
- [x] **B-74** Ambient-Rhythmen (Puls 1.6–2.4s, Scan-Reveal .4–.7s, Datenstrahl .8–1.2s, Orbit-
  Drift 12–24s) nur an Live-Zuständen `[DS,VIZ,P73]` → **W5** (Vis Live-Punkte/Scan) + globale
  Referenz
- [x] **B-75** Was animiert wird/nicht (Zustandswechsel ja, Deko-Loops/permanente Glows/Layout-
  Spielereien nein, «Papier flattert nicht») `[P71,DS,VIZ]` → Gesetz-Referenz **W2** + jede Welle
- [x] **B-76** `prefers-reduced-motion` Pflicht + manueller Motion-Toggle, transition:none während
  Drag `[alle Pakete]` → bereits Repo-Stand, Referenz jede Welle; Motion-Toggle **W2/W3**

### 9.11 · Kosmo-Charakter/Marke/Cursor

- [x] **B-77** Logo 6a (48er SVG, 4 Zustände, Klein-Variante, App-Icon-Varianten) `[P72]` →
  bereits Repo-Stand (`logo-6a.tsx`), Referenz **W7**
- [x] **B-78** Werkzeug-Icon-Familie (12 Glyphen, 1.75px + 1 Punkt) `[P72,VIZ]` → bereits Repo-
  Stand, Referenz **W2/W3**
- [x] **B-79** Cursor-System (eigener Layer, Richtungs-Rotor, Klick-Feder, Punkt-Morph 5 Symbole)
  `[P72]` → bereits Repo-Stand (`CursorEbene.tsx`), kein Bauauftrag
- [x] **B-80** Kosmo-Zustände (9 Zustands-Animationen, Physik) `[P72]` → bereits Repo-Stand,
  Referenz
- [x] **B-81** Kosmo zeichnet sichtbar (stroke-draw, Tempo-Deckel, Etikett-Chip) `[P72]` → Basis
  bereits Repo-Stand; **Schwarm max 3 = VERTAGT** (Owner-Entscheid 6)
- [x] **B-82** Übernahme-Rahmen (Randpunkte, Eckpulse, 2-stufig Fenster→Desktop) `[P72]` → bereits
  Repo-Stand, Referenz **W7**
- [x] **B-83** Kosmo-Desktop-Charakter (Tauri-Fenster, Tray, Zuhause Ecke) `[P72]` → bereits Repo-
  Stand, ausserhalb Scope B (HomeStation/Tauri)
- [x] **B-84** Schliessen-Choreografie (Fenster saugt sich zur Ecke, Orb schluckt, Sound plopp)
  `[P72, Kritik §3]` → **VERTAGT** (Owner-Entscheid 6, dokumentierte «Ehrliche Grenze» bleibt)
- [x] **B-85** Schwarm-Orbs §11b (max. 3 parallel, Klick = Fokus) `[P72, Kritik §3]` → **VERTAGT**
  (Owner-Entscheid 6)
- [x] **B-86** Orbit-Hub (Modus HUB⇄ENTWURF, Projekt-Kreis 148, 3 Ringe, Werkzeug-Kreise nach
  Nutzung) `[P72]` → **W7** (OrbitStart-Bezug, sofern im Scope), sonst **offener Punkt**
- [x] **B-87** Mobile Companion (300px-Karte, Phasen-Ring, 4er-Dock) `[P72]` → ausserhalb Scope B
  (kein Mobile-Companion-Workstream in W0–W9) — **offener Punkt**
- [x] **B-88** Nutzungszeit-Panel 250px-Seitenleiste `[P72]` → ausserhalb Scope B — **offener
  Punkt** (kann optional in W3 mitlaufen)
- [x] **B-119** Rollen-Farb-Mapping-Inkonsistenz in der P72-Canvas-Demo (Tools teils anders
  gemappt: Viz=clayred, Data=slate, Publish=gold, Kosmo=teal) `[P72]` → **Offener Punkt, nicht
  geglättet**: weicht von der kanonischen `--k-rolle-*`-Zuordnung ab; für B gilt die kanonische
  Zuordnung aus §1, die Canvas-Demo-Abweichung ist nicht bindend

### 9.12 · Vis-Spezifika (Viz-Anatomie, Owner-Entscheid 4)

- [x] **B-89** Rollen→Modus-Mapping (Modellieren=sage, Kamera=clayred, Review=teal, Favorit=gold)
  `[VIZ]` → **W5**
- [x] **B-90** Statusbar-/Header-Grammatik (Core+Breadcrumb, Modusfarbe+GPU-Metrik nur mit echten
  Daten) `[VIZ]` → **W5**
- [x] **B-91** Tool-Rail 64px/44×44 — abgelöst durch Repo-Rail 52px/30×30 `[VIZ,WZT]` → kein
  eigener Bauauftrag, Vis nutzt Shell-Rail (**W3**), keine eigene 64px-Rail
- [x] **B-92** Properties-Panel 320px + Key/Value-Rows + «Gespeicherte Ansichten» 3 Slots
  `[VIZ]` → **W5** (Panel-Optik); Datenlogik «Gespeicherte Ansichten» teils vertagt, s. B-105
- [x] **B-93** Varianten-Karte (KVariantenKarte-Einsatz in KuratierFlaeche) `[VIZ]` → **W5**
- [x] **B-94** Vergleichsmodus 2-up A/B + Parameter-Diff-Tabelle `[VIZ]` → **W5** (existiert
  teilweise als `varianten-diff.ts`, Optik-Umbau)
- [x] **B-95** Kurations-Inspektor/Objekt-Dossier 340px (Herkunft-Chain, Sterne-Bewertung)
  `[VIZ]` → **W5**
- [x] **B-96** Node-Palette 268px (Generatoren/Modifikatoren-Gruppen) `[VIZ]` → **W5**
  (NodeCanvas-Einsatz)
- [x] **B-97** Companion-Orb 196px + Zustands-Map `[VIZ,P72]` (Basis bereits Kosmo-Zustands-Widget)
  → **W7** (KosmoPanel/Companion.tsx, Brücken-Erhalt `__kosmoChat`/`__kosmoBlick`)
- [x] **B-98** Zwei-Stimmen-Konversation (SYSTEM/COMPANION/DU) `[VIZ]` → **W7**
- [x] **B-99** Governance-Gate deutsche ApprovalCard-Optik `[VIZ,DS]` → **W2** (Klassensatz) +
  **W7** (Anwendung, GovernanceGate.tsx nur Klassen)
- [x] **B-100** Composer (48px Eingabefeld + Send-Button, ⌘K-Chip) `[VIZ]` → **W7** (KosmoPanel)
- [x] **B-101** Datenstationen (Quellen-Karten, Facetten, Katalogtabelle, EMBEDDINGS-Live)
  `[VIZ]` → **W6** (data), sofern DataWorkspace betroffen, sonst **offener Punkt**
- [x] **B-102** Onboarding-Stepper (392px, 34px-Kreise) `[VIZ]` → **offener Punkt** (Welle-2-
  Soll-Bild laut Kritik §3, nicht in W0–W9-Kern-Scope fixiert)
- [x] **B-103** Report-Dossier (doc-page A4, Kacheln, Governance-Box) `[VIZ]` → **Welle-2-
  Soll-Bild, nicht Teil des W0–W9-Scopes** (Kritik §3 «Welle-2-Prompt») — **offener Punkt**
- [x] **B-104** Print/«Papier ist Papier» für Reports (ak-light, kein Glass/Glow im Druck)
  `[VIZ]` → an B-103 gekoppelt, damit ebenfalls **offener Punkt**
- [x] **B-105** Gespeicherte Ansichten ISO/NORD/DETAIL, Autosave-Badge, Review-Kommentar-Pins,
  echte GPU-Telemetrie `[VIZ, Kritik §3]` → **VERTAGT** (Owner-Entscheid 6, Viz-Viewport-
  Vollausbau)
- [x] **B-106** Datengetriebenes Baumuster (State+Kataloge in Logic-Klasse, `renderVals()`
  generisch) `[VIZ]` → Implementierungsmuster-Hinweis für **W5**, kein eigenständiger Punkt
- [x] **B-140** Dichte-/Abstands-Feinwerte (Panel-Padding 18, Sektionsabstand 18, Kartenraster
  3-spaltig gap 16, Content-Padding 24) `[VIZ]` → **W5**
- [x] **B-141** Auswahl-Codierung einheitlich (gewählt = 1.5px Accent+Glow, Favorit = Gold,
  Tabellenzeile = Accent-Balken) `[VIZ]` → **W5**
- [x] **B-142** Tabellen-Rezept (CSS-Grid-Spalten, Mono-Spaltenköpfe, Status Punkt+Label)
  `[VIZ]` → **W6** (data, Datenstationen-Tabellen-Optik, KKeyValue-Verwandtschaft)
- [x] **B-143** Sichtbar vs. versteckt: Werkzeuge nur in Rail, Kontextwerkzeuge 3 Chips je Modus
  `[VIZ]` → **W5**, Rail-Breite folgt Repo-Solver 52px (Konfliktentscheid, nicht 64px, s. B-91)

### 9.13 · Plangrafik/Kernel — NICHT ANGEFASST

- [x] **B-107** D1 Strich-Matrix (Stift×Grau×Linientyp) `[P73,P731]` → NICHT ANGEFASST;
  D1-Nachschärfung **VERTAGT** (Owner-Entscheid 5)
- [x] **B-108** D3 Kontext-LOD-Treppe (SIA-Phase) `[P73,P731]` → NICHT ANGEFASST
- [x] **B-109** D4 Zwei Stimmen mm-Skala `[P73,P731]` → NICHT ANGEFASST; D4-Nachschärfung
  **VERTAGT** (Owner-Entscheid 5)
- [x] **B-110** D5 Phase entscheidet (3D-Modus je SIA-Phase, Capture zwingend offizieller Modus)
  `[P73,P731,P71]` → NICHT ANGEFASST (Viewport3D-Capture-Weg bleibt, Kritik §3 R2/D5)
- [x] **B-111** D6 Beschlag S0 (6 Symbole) `[P73,P731]` → NICHT ANGEFASST
- [x] **B-112** Golden-Regime (2 Sammelwechsel D1/D4 im Originalpaket) `[P73,P731]` → für B gilt
  stattdessen «alle 33 byte-identisch» — **VERTAGT** (Owner-Entscheid 5)
- [x] **B-113** SIA-Bemassung/`toBe(18)`-Werkzeugzähler (seit v0.8.1: 17,
  Splat-Fusion §8 Sanktion 1 der V081-SPEZ)/Stiftsystem-Frage Nr. 1 `[P71]` →
  NICHT ANGEFASST, ausserhalb Scope B
- [x] **B-114** 3 Darstellungsmodi 3D (Textur/Weissmodell/Schwarzmodus), Glas immer transparent
  `[P71]` → NICHT ANGEFASST (Kernel/Viewport3D-Logik bleibt; nur Chrome ums Blatt/Viewport neu)
- [x] **B-115** Plan-Symbolik (Tür/Fenster/Bemassung SIA) `[P71]` → NICHT ANGEFASST
- [x] **B-125** Planblatt-Karte (reines Weiss, nur Schatten, Stilblatt-Grafik) `[P73,P731]` →
  NICHT ANGEFASST (Rahmen ja, Blattinhalt nein)
- [x] **B-120** SIA-400-Konflikt: 4 Liniendicken heute vs. max. 3 geforderte Stufen (offene
  Gestaltungsfrage Nr. 1, P71 §11) `[P71]` → ausserhalb Scope B (Plangrafik-Kernel-Frage)

### 9.14 · Shell-Komponenten aus P71/P73/P72 (Ergänzung Komponenten-Listen)

- [x] **B-122** Viewport-Chips (ACHSEN/TRACE/GRAPH, Mono radius999) `[P73,P731]` → **W7**
  (design/DesignWorkspace HUD-Chips)
- [x] **B-123** Varianten-/Geschoss-Floater 86px-Karte `[P73,P731]` → **W7** (design), ggf. **W5**
  (vis-Geschossbezug)
- [x] **B-124** Rendern-Aktion Primäraktions-Pill «◉ Rendern» — konkrete Anwendung von Gesetz 1
  (B-1) `[P73,P731]` → **W5** (Vis-Rendern-Knopf)
- [x] **B-126** KCard-Komponente (solid/glass/sunken, Rollenakzent 2px-Hairline links, «never a
  colored box») `[DS]` → **W2**
- [x] **B-127** KSwitch-Komponente (Track 40×24, Thumb 18px, checked-State) `[DS]` → **W2** (falls
  Toggle-Bedarf, z. B. Einstellungen/Layout-Toggles)
- [x] **B-128** Import-Disziplin (Komponenten nur über `index.js`, nur deklarierte Props)
  `[DS]` → **W2** (Bauprinzip kosmo-ui, als Konvention übernommen, kein Lint-Zwang)
- [x] **B-129** Geschoss-Stapel links (aktives Geschoss weisse Karte) `[P71]` → **W7** (design,
  Optik-Feinschliff, bereits im Ist vorhanden)
- [x] **B-130** Nummerierte Karteikarte (Referenz-Blaupause Kataloge/Checks) `[P71]` → kein
  direkter Bauauftrag (kein Katalog-Feature im Scope) — **offener Punkt**
- [x] **B-131** Kosmo-Auftritt/Leerzustände (isometrische Strichzeichnung im Messrahmen) `[P71]` →
  **W7** (Leerzustände, sofern im Scope), sonst **offener Punkt**
- [x] **B-132** Ordnungs-Matrix K6 (Werkzeuge × 5 Phasen, Punktgrösse = Gewicht) `[P72]` →
  Studien-Chrome, kein Produkt-Feature (analog Konzept-Umschalter B-62) — kein Bauauftrag
- [x] **B-133** Hierarchie-Stack/Subtool-Fächer (Stagger 55 ms, max. 1 Ebene offen) `[P72,WZT]` →
  **W3** (Dock/BodenDock Subtool-Verhalten, dokumentiert additiv)
- [x] **B-134** Z-Ordnung/Rahmen-Masse Kommandoleiste 52/Statuszeile 28 (WZT-Prototyp-spezifisch)
  `[WZT]` → nicht bindend als Absolutwert (Prototyp-Bühne); Prinzip klarer Z-Schichtung bereits im
  Repo (`dock-flaeche.css`) — Referenz **W3**

### 9.15 · Dock-Solver-Verhalten (WZT, NICHT ANGEFASST — Chrome-Referenz nur)

- [x] **B-137** State-Kern (phase/usageMinutes/kosmoState/cursorState State-Machine) `[P72]` →
  NICHT ANGEFASST (`state/` ist Software-Kern, §7.3)
- [x] **B-146** Vertikaler Stack/Waterfill-Algorithmus (min+size, proportionale Schrumpfung,
  Einklapp-Schleife) `[WZT]` → NICHT ANGEFASST (`dock-kern.ts`-Solver, §7.3); Chrome zeigt nur das
  Ergebnis
- [x] **B-147** Floats-Anker-Platzierung + `separate()`-Entzerrung, Float-Magnetik `[WZT]` → NICHT
  ANGEFASST (`dock-kern.ts`)
- [x] **B-148** State/Persistenz je (Konzept+Station), Projekt-Store statt localStorage `[WZT]` →
  NICHT ANGEFASST (`dock-zustand.ts`, bereits als Projekt-Store realisiert)
- [x] **B-149** Tour-Komponente (Spotlight, Wide/Portrait, Zurück/Weiter) `[WZT]` → bereits im Repo
  vorhanden (`DockTour`), Referenz-Optik-Feinschliff **W3**
- [x] **B-150** Regeln-Panel (rechtes Glas-Sheet, Rangfolge-Pillenkette) `[WZT]` → bereits im Repo
  vorhanden (`DockRegeln`), Referenz **W3**
- [x] **B-145** Handy-Hochformat: Tour als Bottom-Sheet, grosse Tap-Ziele 46–56px `[WZT]` →
  ausserhalb Scope B (kein Mobile-Tour-Workstream in W0–W9) — **offener Punkt**

### 9.16 · Weitere DS-/VIZ-Layoutregeln ohne eigenen Produkt-Workstream

- [x] **B-135** Linien-Skala micro 0.5/hair 1/node 2/hero 3 als Primärmaterial, offene Pfeilspitzen
  35–40° `[DS]` → **W1** (ergänzt `--k-line`-Familie um node/hero-Breiten)
- [x] **B-136** Subtile Hintergrund-Texturen (Perspektiv-Grid ≤48px, Starfield max. ~80 Punkte,
  Orbit-Ellipsen), nie über Text `[DS,VIZ]` → **W7** (Onboarding, sofern im Scope), sonst
  **offener Punkt**, verknüpft mit B-33 (48px-Raster)
- [x] **B-138** 12-Spalten-Desktop/4-Spalten-Mobile-Grid, Content-max 1280/1120 `[DS]` →
  **offener Punkt**: kein responsives Multi-Column-Grid-System im heutigen Produkt-Scope
  (Desktop-CAD-Shell), nicht Ziel von W0–W9
- [x] **B-139** Dock in diesem Paket nicht spezifiziert, Dock-Zeitskala bleibt Repo-Recht `[DS]` →
  Klarstellung, kein eigener Bauauftrag (bereits durch WZT/Repo geregelt)
- [x] **B-144** Gold `#CBB06A` exklusiv für Kosmo/Agent-Rolle, Teal einziges System-Signal
  `[WZT]` → bereits Repo-Konvention (`--k-rolle-agent`), Referenz **W2/W3**
- [x] **B-121** Prototyp-Umgebungstechnik (.dc.html, x-import, `_ds_bundle`) ist Design-Runtime,
  keine Implementierungsvorgabe `[VIZ,WZT]` → kein Bauauftrag, Klarstellung für alle Wellen
- [x] **B-116** 48px-Layout-Raster als generelles Utility `[DS,WZT]` → **Offener Punkt** (identisch
  mit B-33, hier als Layoutregel-Beleg geführt)
- [x] **B-117** Wählbare Akzentfamilien/Modul-Farben bleiben unverändert `[P71]` → kein
  Bauauftrag, Bestandsschutz (identisch mit B-20, hier als Layoutregel-Beleg geführt)
- [x] **B-118** Kein 19. Werkzeug ohne Owner-Entscheid (`toBe(18)`) `[P71]` → kein Bauauftrag,
  Bestandsschutz — **Riegel v0.8.1/P4 gezogen:** Owner-Entscheid 5 (V081-SPEZ
  §0.2/§1.3) sanktioniert die Splat-Fusion (`import-splat`+`splat-werkzeug-
  toggle` → EIN `splat-werkzeug`); der Vertrag ist seither `toBe(17)`
  (`e2e/oberflaeche-minimal.spec.ts:132`), einzige testid-Streichung der
  Version (§8 Sanktion 1 der V081-SPEZ).

### 9.17 · Offene Punkte (Sammelliste, nicht in dieser Spez abschliessend geklärt)

> **Fable-Entscheid (15.07., W0-Gate, analog zum planToSvg-Entscheid der v0.8.0):**
> v0.8.0B baut die BESTEHENDEN Oberflächen neu — ganze neue Produktschirme sind
> nicht Scope dieser Runde. Damit gelten: Vis-Onboarding-Stepper (B-102),
> Report-Dossier/Print (B-103/B-104) und Datenstationen-Vollbild (B-101) als
> **VERTAGT** (deklariert im Release-Eintrag); Orbit-Hub (B-86) / Mobile
> Companion (B-87) / Nutzungszeit-Panel (B-88) bekommen KEINEN eigenen
> Workstream — nur die Anatomie/Dichte der existierenden Screens läuft in
> W3/W7 mit. Das 48px-Layout-Raster bleibt Owner-Frage (nur Dock-Backdrop).
> Der Owner kann jeden dieser Punkte jederzeit zurück in den Scope heben.

Diese Punkte sind **bewusst nicht geglättet** — W2/W3/W7 bzw. W8 müssen sie explizit adressieren
oder als Nicht-Scope re-bestätigen:

- [ ] Allgemeines 48px-Layout-Raster (B-33/B-116) — Owner-Frage bleibt offen, nur Dock-Bühnen-
  Backdrop erlaubt.
- [ ] Orbit-Hub-Vollausbau (B-86), Mobile Companion (B-87), Nutzungszeit-Panel (B-88) — kein
  eigener Workstream in W0–W9; W7/W3 müssen bestätigen, ob Teilaspekte mitlaufen oder ganz
  entfallen.
- [ ] Vis-Onboarding-Stepper (B-102), Report-Dossier/Print (B-103/B-104), Datenstationen-Vollbild
  (B-101) — Welle-2-Soll-Bilder des 0.7.5-Handoffs; nicht durch die 6 Owner-Entscheide
  ausdrücklich vertagt, aber auch nicht in W4–W7 verortet. **W0-Empfehlung an den Owner:**
  bei der W5-Freigabe explizit klären, ob diese drei Teil von v0.8.0B oder eigene Runde werden.
  Bis dahin gelten sie als **offen**, nicht als «vertagt» im Sinn von Owner-Entscheid 6 (der nur
  Schwarm/Schliessen-Choreografie/Viz-Viewport-Vollausbau namentlich vertagt).
- [ ] Nummerierte Karteikarte (B-130), Handy-Hochformat-Tour (B-145), 12-Spalten-Grid (B-138) —
  kein Produkt-Bedarf identifiziert, bleiben unbearbeitet bis ein Owner-Anlass entsteht.
- [ ] Rollen-Farb-Mapping-Inkonsistenz der P72-Canvas-Demo (B-119) — Kuriosum des Original-Studien-
  Prototyps, für B irrelevant, aber hier nicht stillschweigend geglättet.

---

*Ende der Spezifikation. Diese Datei wird NICHT während der Umsetzung (W1–W9) verändert — findet
ein Paket einen Widerspruch zu dieser Spez, ist das ein Fall für ein kurzes Owner-Review, kein
stiller Re-Interpretationsspielraum im Code.*
