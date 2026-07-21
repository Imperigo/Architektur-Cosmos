# BEFUNDE zu OWNER-KORREKTUREN 2026-07 — K10 · K19 · K22+K50 · K42

> **Auftrag:** Sofort-Befunde aus `docs/OWNER-KORREKTUREN-2026-07.md`
> (Arbeitsplanung «Sofort-Batch A»: Befunde K10, K19, K42 sowie die
> Animations-Inventur K22/K50). **Datum:** 21.07.2026.
> **Methode:** lastfreie Analyse — reine Lese-/Code-/git-Arbeit plus
> vorhandene Screenshots aus `e2e-results/` und `test-results/`.
> **Keine neuen Läufe:** während dieser Analyse lief der beweiskräftige
> Voll-E2E-Lauf; es wurden keine Builds, keine Playwright-Läufe und keine
> Suiten gestartet. Alles, was deshalb nicht abschliessend beurteilbar
> ist, ist unten ehrlich als «offen» markiert.

---

## Befund 1 · K10 — Tool-Logos der Zentrale gegen die Logokonzepte

**Owner-Zitat (K10, S.2):** «prüfe in den gestaltungskonzepten ob die
logos der einzelnen tools die richtigen sind, die sehen aktuell nicht gut
aus und stimmen nicht mit den anderen logokonzepten zusammen. entweder
fordere von mir neue logo desings an … oder wenn du die findest setze sei
ein»

### Ist — was die Zentrale heute rendert

Vier Hauptwerkzeug-Kacheln (`apps/kosmo-orbit/src/shell/OrbitStart.tsx:105-110`):

| Kachel | Icon-Komponente | Glyphe (Quelle) | Punkt-/Ring-Farbe |
|---|---|---|---|
| KosmoDesign | `IconHauptDesign` | `draw` (Zirkel-Zug) | `--k-rolle-manuell` (Mint) |
| KosmoData | `IconHauptData` | `data` (Zylinder) | `--k-rolle-pn` (Blau) |
| Kosmo | `IconHauptKosmo` | `chat` (Fadenkreuz) | `--k-signal` (Teal) |
| KosmoOffice | `IconHauptOffice` | `office` (Ordner) | `--k-rolle-office` |

- Icon-Definitionen: `apps/kosmo-orbit/src/shell/orbit-icons.tsx:80-102`
  (64-px-Rahmen, Akzent-Puls-Ring `k-orbit-icon-puls`,
  `packages/kosmo-ui/src/aura.css:1162-1170`).
- Glyphen-Bibliothek: `apps/kosmo-orbit/src/shell/werkzeug-glyphen.tsx:46-135`
  (24er-ViewBox, Stroke `--k-ink` sw 1.75, genau EIN Akzent-Punkt);
  Stations-Zuordnung `STATION_GLYPHE` ebd. Zeilen 192-210.
- Fächer-Untertools (Draw/Prepare/Vis/Publish/Modellbaum …): dieselbe
  Bibliothek via `WerkzeugGlyphe` in Rang-Kreisen 28/24/20 px
  (`OrbitStart.tsx:205-208` und `:495-501`); die Fächer-Karten stehen
  bewusst leicht rotiert/versetzt ±2-4° (`OrbitStart.tsx:133-137`) — genau
  das, was K13 als «gerade und nüchterne blöcke» kritisiert.
- Kachel-Akzent zusätzlich aus `moduleHue`
  (`OrbitStart.tsx:112-117`; `packages/kosmo-ui/src/tokens.ts:77-99`) —
  ein ZWEITES Farbsystem neben den Rollenfarben.
- Asset-Verzeichnisse: `apps/kosmo-orbit/public/icons/` enthält NUR die
  vier App-Icons (`icon-180/192/512/512-maskable.png`, alle = Logo «6a»);
  ein `src/assets/`-Verzeichnis existiert nicht. **Es gibt keine
  eigenständigen Logo-Dateien je Tool** — alle Tool-Zeichen sind Code-SVGs.

### Soll — was die Konzepte definieren

1. `docs/GESTALTUNGSKONZEPT.md` (Werkplan-Duktus) definiert **keine
   Tool-Logos** — nur Papier/Tusche-Regeln, Werkplan-Grammatik und das
   Maskottchen «als Bauzeichnung» (Z. 30-35).
2. Das einzige verbindliche Logokonzept ist
   `docs/V072-VISUELLES-UPDATE-SPEZ.md` (ClaudeDesign-Handoff 11.07.):
   §2 Logo «6a» (Z. 68-108) und §3 Werkzeug-Glyphen mit exakten Pfaden
   (Z. 110-131). **Abgleich: die implementierten Glyphen stimmen
   pfadgenau mit §3 überein** (Stichproben `chat`/`draw`/`data`/`office`
   identisch mit `werkzeug-glyphen.tsx:46-112`).
3. Daneben lebt aber eine ÄLTERE, dritte Logo-Familie weiter:
   `packages/kosmo-ui/src/Logo.tsx:15-101` («Orbital-Logo-System»,
   Ring + Trabant je Modul, eigener `orbitAngle`) — noch aktiv in
   `App.tsx:775` (Stations-Badge im Kopfbalken), `KosmoPanel.tsx:1784`,
   `OnboardingWizard.tsx:243`, `ErsteStartFrage.tsx:30`.

### Befund

Die Kachel-Logos sind NICHT «falsch» gegenüber ihrem eigenen Konzept —
sie entsprechen exakt V072-§3. Der Eindruck «stimmen nicht zusammen»
ist trotzdem berechtigt, denn es koexistieren **drei Zeichensprachen**:
(a) Logo 6a als App-Marke, (b) die V072-Glyphen auf Kacheln/Fächern/Docks,
(c) die alte OrbitMark-Ring+Trabant-Familie in Panel/Onboarding/Kopfbalken
— dasselbe Tool trägt je nach Ort ein anderes Zeichen. Dazu zwei
konkurrierende Farbwelten (moduleHue-Akzent vs. Rollenfarben-Punkt) auf
derselben Kachel. Ein Logokonzept, das die vier HAUPTWERKZEUGE als eigene
Marken definiert (nicht nur als Stations-Glyphen), existiert nirgends.

### Fixvorschlag

- **Sofort (S):** OrbitMark-Modulvarianten in Panel/Onboarding/Kopfbalken
  durch `WerkzeugGlyphe`/`STATION_GLYPHE` ersetzen → EINE Zeichensprache;
  Farbquelle je Kachel auf EIN System festlegen (Empfehlung: Rollenfarbe,
  moduleHue nur noch als Modul-Punkt gem. GESTALTUNGSKONZEPT).
- **Mit ClaudeDesign-Package (M, K8-Vorrang):** eigene Haupttool-Logos
  (KosmoDesign/Data/Kosmo/Office als Marken) vom Owner anfordern und die
  Fächer gem. K13 als gerade Blöcke mit «ganzen Logos» neu bauen
  (Rotation `KARTEN_ROTATION_DEG` entfernen).

### Offene Fragen (→ Rückfrage R2)

- Es GIBT keine fertigen, unbenutzten Logo-Assets im Repo, die man
  «einsetzen» könnte — für eigenständige Haupttool-Logos braucht es neue
  Designs. Empfehlung: **ja, neue Logos via ClaudeDesign anfordern**
  (die Glyphen bleiben als Klein-/Funktionszeichen bestehen).
- Owner-Entscheid nötig: OrbitMark-Familie ganz abloesen (sie ist vor-V072)?
- Farbwelt der Kacheln: Rollenfarben oder moduleHue?

---

## Befund 2 · K19 — Umrandungslinien/Texturen im 2D-Plan

**Owner-Zitat (K19, S.6):** «was ist mit den umrandungslinien passiert?
und stimmen die texturen?»

### Ist — wie Kontur und Schraffur entstehen

Der Kernel liefert nur Geometrie + semantische Klassen, die Stile setzt
der Aufrufer (`packages/kosmo-kernel/src/derive/plan.ts:45-57`):

- Wand-Konturen: Klassen `cut/tragend/material-<mat>/renovation-abbruch`
  je Region (`plan.ts:353`, `:546`, `:555`); Eck-Gehrungen
  (`plan.ts:153-232`, `:249-284`).
- Live-Plan-Stifte (`apps/kosmo-orbit/src/modules/design/PlanView.tsx:1516-1517`):
  `strokeWidth` in **Welt-mm** aus `BILDSCHIRM_PLAN`
  (`packages/kosmo-kernel/src/derive/stilblatt.ts:284-291` —
  geschnitten 24 / sekundär 12 / Projektion 8). **Kein
  `vector-effect="non-scaling-stroke"`** — die Kontur wird beim
  Rauszoomen visuell dünner.
- Texturen als SVG-Pattern (`PlanView.tsx:1307-1324`): `hatch-beton`
  (45°, Tint `--k-print-tint` #dad7d1, Linie `--k-print-linie` #333) und
  `hatch-daemmung` (-45°-Wellenersatz).
- **Zwei bewusste Ausblendungs-Gates:** (a) LOD — Schraffur nur bei
  `lod === 'voll'` (≥ 40 px/m), bei `mittel`/`fern` flaches Poché
  (`PlanView.tsx:1502-1511`; Schwellen
  `packages/kosmo-kernel/src/derive/planLod.ts:17-22`); (b) Phase — in
  Wettbewerb/Vorprojekt/Baueingabe zeichnet der Plan die tragende Schicht
  SIA-konform solid schwarz, ganz ohne Materialschraffur
  (`PlanView.tsx:1494-1501`).
- Kein CSS-Override: `design*.css`/`plan-view-chrome.css` enthalten
  KEINE Selektoren auf die Konturklassen (Grep leer) — die Darstellung
  hängt allein an den Inline-Stiften.

### Geschichte (git) — keine Regression

- Stiftbreiten stabil seit 12.07. (`8f143e0`, Stilblatt-Refactor).
- Schraffur-LOD-Gate seit 08.07. (`b9b5ab1`), Phasen-Weiche seit 11.07.
  (`31c45c8`/`4663db6`), Beton-Pattern seit 06.07. (`9e932b3`).
- Einzige jüngere Berührung: Token-Sweep 18.07. (`d8ac2c5`) —
  **wertidentisch** (#dad7d1/#333 blieben gleich), optisch keine Änderung.
- Golden-Seite: der letzte Kontur-/Schraffur-relevante Wechsel war der
  deklarierte Strich-Matrix-Sammelwechsel D1 vom 12.07. (`946e83c`,
  `docs/GOLDEN-WECHSEL-D1.md`), Druckpfad; die Plan-Goldens erfassen die
  Live-Pattern gar nicht.

### Screenshot-Vergleich (Bestand, ohne neuen Lauf)

- `test-results/p3-083-oeffnung-klickmodus.png` (20.07., Nahzoom):
  Beton-Schraffur und kräftige Konturen klar sichtbar — korrekt.
- `e2e-results/abnahme-grundriss.png` (21.07., weit rausgezoomt,
  Statusleiste «fern … Wettbewerb/Studie»): keine Schraffur, feine
  Konturen — exakt der LOD-fern- + Wettbewerbs-Zustand.
- Beide Bilder stammen aus demselben aktuellen Lauf; ein echter
  Alt-vs.-Neu-Zeitvergleich existiert im Bildmaterial nicht.

### Befund

**Mit hoher Wahrscheinlichkeit ein Darstellungszustand, keine
Code-Regression:** die Kombination aus Welt-mm-Stiften ohne
non-scaling-stroke (Umrandung wird beim Rauszoomen dünn), LOD-Gate
(Schraffur weg unter 40 px/m) und Phasen-Weiche (Wettbewerb = solid statt
Textur) erklärt beide Owner-Beobachtungen vollständig; git zeigt seit
Wochen keine Änderung an Konturbreite oder Schraffur.

### Fixvorschlag

- **S:** Owner-Antwort mit den zwei Gates erklären (LOD + Phase) und
  fragen, welcher Zustand auf S.6 gemeint war.
- **S (optional, app-seitig, golden-neutral):** zoomstabile
  Mindest-Kontur als Option — `vector-effect="non-scaling-stroke"` oder
  eine untere Pixel-Klemme in `PlanView.tsx:1516-1517`.
- **M (falls gewünscht):** LOD-Schwellen/Poché-Ton als
  Darstellungs-Einstellung (passt zu K14 Darstellungs-Ausbau).

### Offene Fragen

- Ohne frischen Screenshot im Owner-Zustand (Werkplan-Phase, LOD «voll»,
  echte Beton-Wand) ist nicht 100 % ausgeschlossen, dass ein Nahzoom-Fall
  betroffen ist — der vorhandene Nahzoom-Beweis spricht dagegen. Nach dem
  laufenden E2E-Lauf einen gezielten Shot nachziehen.
- Dämmschraffur-Orientierung ist ein EIGENER Punkt (K23, Golden-Zug) —
  hier bewusst nicht behandelt.

---

## Befund 3 · K22 + K50 — Animations-Inventur Kosmo (Soll ↔ Ist)

**Owner-Zitate:** K22 (S.6): «beim kosmologo gefällt mir der graue kreis
nicht, mach den transparenter und in der farbe des jeweiligen tools ganz
fein (glasig) die kleinen orbs … können auch ausserhalb dieses kreis
sein, kosmo darf etwas grösser sein. frage; sind alle animationen für
kosmo eingebaut gem. gestaltungskonzept?» · K50 (S.24): «hier sehe ich
die animationen des gestaltungskonzept nicht aktiv.. baue alle
animationen vom konzept ein für kosmo falls noch nicht»

### Soll-Quellen

Das «Gestaltungskonzept» für Kosmo-Animationen ist verteilt:
`docs/GESTALTUNGSKONZEPT.md:68` (zurückhaltend-präzise),
`docs/MOTION-KONZEPT-066.md` (Tokens, `.k-druck`, Choreografie-Regeln),
`docs/V072-VISUELLES-UPDATE-SPEZ.md` §2/§5-§9 (Orb-Zustände, Feedback,
Abspiel, Cursor, Charakter) und `docs/SERIE-E-ERLEBNIS-GESTALTUNG.md:55-56`
(Gemini-Rim-Auftritt).

### Tabelle Soll ↔ Ist ↔ Lücke

| Soll (Quelle) | Ist (Datei:Zeile) | Lücke |
|---|---|---|
| Orb-Zustände 1-8: idle/thinking-Drift+Kernpuls, listening-Atmen, speaking-Equalizer, writing-Wortfall, dispatching-Punktschuss, done-Nachfedern, error-Ausbruchspunkt, takeover-Randlauf (V072 §6, Z. 244-260) | ALLE verdrahtet: `shell/kosmo-feedback.css:361-518` ff. (23 Keyframes), `shell/KosmoOrb.tsx:128-188` | keine |
| §5-Feedback: Pop, Ring-Burst, Punkt-Burst | `kosmo-feedback.css:64-115` + Verdrahtung Werkzeugleiste | `k-fb-chip-serie` + `k-fb-orbit-loader` bewusst UNVERDRAHTET (`kosmo-feedback.css:14-25`) |
| Logo-6a-Zustände + Splash (V072 §2) | `packages/kosmo-ui/src/logo-6a.tsx:37-118`, `aura.css:573-593`, Splash `apps/kosmo-orbit/index.html:62` | keine |
| «Kosmo zeichnet sichtbar» (V072 §7) | `src/state/abspiel-ebene.ts` + `abspiel-anschluss.ts` (Stufe 1) | Schwarm-Stufe 2 offen (geplant) |
| Cursor-Morph inkl. Kosmo-Orb-Cursor (V072 §8) | `shell/CursorEbene.tsx` | keine wesentliche |
| Panel-Choreografie: «entspringt aus dem Kosmo-Logo unten rechts» (K32; V072 §6.2 Plopp) | NUR der AUSTRITT saugt zum Orb: `aura.css:887-894` (`k-panel-austritt-orb`); der EINTRITT ist ein seitlicher Slide `aura.css:864-870` | **Eintritt-aus-dem-Orb fehlt** — Kern der Owner-Wahrnehmung |
| Gemini-Rim: «Kosmo kommt ins Bild» als Rand-Glühen (SERIE-E) | nicht vorhanden (nur takeover-Rahmen, anderes Konzept) | **fehlt** |
| Charakter-Orb + Aufstart-/Schliess-Choreografie (V072 §9) | `shell/KosmoCharakterFenster.tsx` — NUR Desktop/Tauri | im Web/Rundown prinzipiell unsichtbar |
| Neben-Orbs (Schwarm, max. 3) | `shell/SchwarmOrbs.tsx` | keine |
| Insel-Orb-Puls (ISLAND-UI §4.3) | `modules/design/island/island.css:884-914` | keine |

**Ehrlicher Kernpunkt zu K50:** der Rundown ist ein PDF aus
E2E-Screenshots, und die E2E-Läufe erzwingen `prefers-reduced-motion`
(MOTION-KONZEPT §7; `kosmo-feedback.css:57-61`) — **statische Bilder
KÖNNEN keine laufenden Animationen zeigen**. Ein Grossteil des
Soll-Katalogs ist gebaut und im Live-Betrieb aktiv; die zwei echten
Lücken sind die Entfaltungs-Choreografie aus dem Orb und der
Rim-Auftritt.

### K22-Detail: der «graue Kreis»

Zwei Definitionen, beide lesen sich als massiver grauer Kreis:

1. **Insel-Modus (Rundown S.6):** `.isl-orb`,
   `apps/kosmo-orbit/src/modules/design/island/island.css:860-878` —
   `background: var(--f-glass)` mit `--f-glass = --k-insel-glas-papier`
   `= rgba(255,255,255,0.82)` (`packages/kosmo-ui/src/aura.css:91`):
   82 % deckendes Weissgrau, Rand `--k-glass-stroke`-Fallback.
2. **Zentrale/Boden-Dock:** `.ks-knopf`,
   `apps/kosmo-orbit/src/shell/kosmo-symbol.css:205-217` —
   `background: var(--k-glass-fill, var(--k-surface))`; im Papier-Theme
   ist `--k-glass-fill` UNGESETZT (lebt nur im orbit-Block,
   `aura.css:497-498`) → Fallback opakes `--k-surface` #FBFAF6.

**Token-Vorschlag (glasig + tool-farbig):** neues, themeübergreifendes
Paar in `aura.css`, gespiesen aus einer Stations-Variable:

```css
--k-orb-glas: color-mix(in srgb, var(--k-orb-tool, var(--k-signal)) 8%, rgba(255, 255, 255, 0.30));
--k-orb-glas-rand: color-mix(in srgb, var(--k-orb-tool, var(--k-signal)) 35%, transparent);
```

`--k-orb-tool` setzt der Konsument inline aus `moduleHue[station]`
(`tokens.ts:77-99`); `.isl-orb` und `.ks-knopf` wechseln auf
`background: var(--k-orb-glas)` bei bestehendem `backdrop-filter` —
der Kreis wird transparent-glasig und fein tool-getönt. Orbit-Theme
bekommt eine dunkle Spiegelvariante (Basis rgba(20,23,31,0.35)).

**«Kleine Orbs auch ausserhalb» + «Kosmo grösser»:** der Orb wird mit
`size 30` in der 52-px-Hülle gerendert (`shell/KosmoSymbol.tsx:233`,
`island/KosmoOrb.tsx:180`), Drift nur ±10 px
(`kosmo-feedback.css:423-458`) — die Punkte bleiben immer innerhalb.
Vorschlag: Orb 30→40 px, Hülle 52→64 px, Drift-Amplitude erhöhen und die
Punkt-Ebene (`.kosmo-orb-punkte`) mit `overflow` sichtbar über den
Hüllenrand hinaus animieren. **Aufwand:** Token/Glas/Grösse S,
Choreografie-Lücken (Eintritt-aus-Orb, Rim-Auftritt) M.

### Offene Fragen

- Definiert das angekündigte ClaudeDesign-Package (K8) eine NEUE
  Kosmo-Animationssprache? Dann nur die S-Fixe (Glas/Grösse) sofort und
  die Choreografien mit dem Package bauen.
- Charakter-Fenster-Animationen (§9) sind nur per Desktop-Build/
  Owner-Rundgang beweisbar — im Container nicht.

---

## Befund 4 · K42 — Blattdarstellung vs. Gestaltungskonzept

**Owner-Zitat (K42, S.17):** «ist die darstellung des blattes aktuell
gemäss gestaltungskonzept?»

### Ist ↔ Soll (Werkplan-Duktus, `docs/GESTALTUNGSKONZEPT.md`)

| Soll (Konzept) | Ist (Datei:Zeile) | Urteil |
|---|---|---|
| Papier weiss/Karten reinweiss | Blattfläche `fill white` (`packages/kosmo-kernel/src/derive/sheet.ts:230-231`) | konform |
| Tusche #1A1815, nie reines Schwarz | `BLATT.tinte: 'black'` (`packages/kosmo-kernel/src/derive/stilblatt.ts:189`) | **Abweichung 1** |
| Linien 1 px fein, technisch | Rahmen/Falzmarken über `BLATT.rahmenStift` (`sheet.ts:235` ff.) | konform |
| Mono + VERSAL für Labels/Masse | Plankopf Mono/VERSAL konform; die SVG-Grundschrift des Blatts ist aber `Helvetica, Arial` (`sheet.ts:229`) | **Prüf-Punkt 2** (Nicht-Plankopf-Beschriftungen) |
| «Schatten fast keine» — nur der EINE flache Blattschatten | `.k-publish-blatt` trägt `box-shadow: 0 8px 30px rgba(0,0,0,0.12)` (`apps/kosmo-orbit/src/modules/publish/publish.css:326-330`) | **Abweichung 3** (Tiefe 8/30 wirkt wie schwebendes Glas, nicht wie Papier auf Tisch) |
| Passermarken/Massketten als Zierde mit Mass (max. 1-2) | am Blatt keine Passermarken | **Abweichung 4** (schwach) |
| Falz-/Werkplan-Grammatik | Faltmarken DIN 824 Default AN (`sheet.ts:236-240`) | konform |

### Abgrenzung (nicht als K42 doppeln)

- **K40 Wasserzeichen** «STUDIE — NICHT FÜR AUSFÜHRUNG»: eigener Punkt +
  Rückfrage R6 — Stellen `derive/plankopf.ts:81-101` ff. und
  `derive/sheet.ts` (Wasserzeichen-Aufruf); hier nur verortet.
- **K41 einheitlicher Blattrand-Rahmen**: eigener Punkt (Golden-Zug) —
  Heftrand-/Plakat-Weiche `sheet.ts:212-235`, Rahmengeometrie
  `derive/blattlayout.ts` (`rahmenRect`); hier nur verortet.

### Befund

Die Blattdarstellung ist im Grundsatz konzepttreu (weisses Papier, feine
Hairlines, Mono/VERSAL-Plankopf, Falzmarken). Echte K42-Abweichungen sind
die reine `black`-Tinte statt der Tusche #1A1815, der zu tiefe
Blattschatten in der Publish-Vorschau und die fehlende
Werkplan-Zierde (Passermarken); die Grundschrift ausserhalb des
Plankopfs ist zu prüfen.

### Fixvorschlag

- **S/M (Golden-Zug!):** `BLATT.tinte` auf `#1A1815` — bewegt
  derive-Ausgaben und gehört darum in DENSELBEN deklarierten Golden-Zug
  wie K40/K41 (ein Zug je Version, Registers-Regel).
- **S (app-seitig, golden-neutral):** Blattschatten in `publish.css` auf
  den einen flachen Papier-Schatten reduzieren (z. B.
  `0 1px 3px rgba(0,0,0,0.10)`).
- **S (golden-relevant, mit K41 bündeln):** dezente Passermarken in den
  Blattecken via `blattlayout`.

### Offene Fragen

- Der einzige vorhandene Publish-Screenshot ist dunkel gethemt und bildet
  die weisse Zielpalette nicht ab — Schatten- und Tintenwirkung sind nur
  aus dem Code belegt. Nach dem laufenden E2E-Lauf einen frischen
  Publish-Screenshot (Papier-Theme) ziehen.
- Reicht die Tusche-Korrektur im Stilblatt, oder wünscht der Owner auch
  im PDF-Export #1A1815 (Drucknorm spricht eher für Schwarz im Export —
  Owner-Entscheid)?

---

## Empfohlene Fix-Pakete (nach Dateikreisen, S/M/L)

| Paket | Dateikreis | Inhalt | Aufwand |
|---|---|---|---|
| **A «Orb-Glas»** | `packages/kosmo-ui/src/aura.css` + `shell/kosmo-symbol.css` + `modules/design/island/island.css` (+ `tokens.ts`-Spiegel) | Token-Paar `--k-orb-glas/-rand`, Tool-Tönung, Orb 30→40 / Hülle 52→64, Drift-Amplitude | **S** — Sofort-Batch-A-tauglich, golden-neutral |
| **B «Befund-Antworten»** | nur Doku/Statusbericht | K19-Erklärung (LOD/Phase) + R2-Rückfrage (Logos via ClaudeDesign) + K50-Hinweis (PDF zeigt keine Animationen) an den Owner | **S** |
| **C «Kosmo-Choreografie»** | `aura.css` + `shell/KosmoPanel.tsx` + `shell/KosmoSymbol.tsx` | Panel-EINTRITT entspringt dem Orb (Umkehrung von `k-panel-austritt-orb`), Gemini-Rim-Auftritt, unverdrahtete §5-Klassen anschliessen | **M** — verbindet K22/K32/K50 |
| **D «Logo-Konsolidierung»** | `shell/OrbitStart.tsx` + `kosmo-ui/src/Logo.tsx`-Konsumenten + `orbit-065.css` | OrbitMark-Ablösung, EINE Farbquelle, Fächer als gerade Blöcke (K13) | **M** — WARTET auf ClaudeDesign-Package (K8-Vorrang) |
| **E «Blatt-Tusche»** | `packages/kosmo-kernel/src/derive/stilblatt.ts` + `blattlayout.ts`/`sheet.ts` + `modules/publish/publish.css` | Tinte #1A1815 + Passermarken (Golden-Zug, mit K40/K41 als EIN deklarierter Zug bündeln); Blattschatten flach (golden-neutral, sofort) | **S/M** |
| **F «Zoomstabile Kontur»** (optional) | `modules/design/PlanView.tsx` | non-scaling-stroke bzw. Pixel-Klemme für Wandkonturen — NUR falls der Owner die dünne Fern-Kontur als Mangel bestätigt | **S** |

Reihenfolge-Empfehlung: B sofort (kostet nichts, entblockt R2/R6) →
A + E-Schattenteil in den Sofort-Batch A → C als eigenes Paket →
E-Golden-Teil in die nächste Version mit freiem Golden-Zug → D nach
Owner-Lieferung des ClaudeDesign-Packages.
