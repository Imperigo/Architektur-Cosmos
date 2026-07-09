# UI-Konzept v0.6.5 — Fable-Design-Spec für die Gesamt-Überarbeitung

**Stand:** 09.07.2026 · **Autor:** Fable (Chefdenker) · **Verbindlichkeit:** dieses Blatt
ist die Referenz für alle v0.6.5-Workstreams (W0–W6). Es baut auf
`GESTALTUNGSKONZEPT.md` (Papier & Tusche) und `OBERFLAECHE-FOKUS-SYSTEMATIK.md`
(3 Fokus-Familien) auf und ersetzt sie NICHT — es konkretisiert sie für den Bau.

## 1. Diagnose (warum diese Runde)

Der v0.6.4-Rundgang zeigt eine funktional reiche, aber visuell unfertige
Oberfläche. Die fünf Chefbefunde:

1. **KosmoVis wirkt wie ein Prototyp** — Nodes überlappen einander, Prompt-Text
   quillt über die Kartenränder, Kanten kreuzen ohne Ruhe, es gibt weder
   Zoom-Knöpfe noch Fit noch eine gestaltete Palette; die Werkzeugleiste mischt
   vier Bedienparadigmen.
2. **KosmoDesign trägt drei Werkzeugzeilen** mit gemischten Text-/Icon-Knöpfen
   und blassen Inline-Link-Sektionen (ANSICHT/EXPORT/EBENEN); die Geschoss-
   Leiter schwebt kontextlos im Viewport (SK-D1/D3/D4/D5).
3. **Beige-auf-beige ohne Hierarchie**: Panels, Karten und Grund verschmelzen.
   Da «Papier kein Glas kennt» (kaum Schatten), MUSS Hierarchie über
   **Linienstärke, Ton-Abstufung und Dichte** kommen — sie tut es heute nicht.
4. **Komponenten-Wildwuchs**: 31 native ungestylte `<select>`, 10 duplizierte
   `inputStyle`-Konstanten, 3 Badge-Implementierungen, 3 Icon-Welten plus Emoji,
   Phantom-Tokens im Kontextmenü, `tokens.ts` von `aura.css` abgedriftet.
5. **Tote Leerzustände**: KosmoData-Karten zeigen leere beige Flächen statt
   eines gezeichneten, ehrlichen Platzhalters.

## 2. Token-Ordnung (W0)

**`aura.css` ist die einzige Wahrheit.** `tokens.ts` ist ihr TS-Spiegel; ein
Drift-Wächter-Test (`token-spiegel.test.ts`) parst aura.css und bricht bei
Abweichung. Korrekturen: `radius = {xs:2, sm:4, md:6}`; Papier-/Tusche-Hexwerte
aus aura.css übernehmen.

**Neue Skalen (CSS-Vars + TS-Spiegel):**

| Var | Wert | Verwendung |
|---|---|---|
| `--k-s1…--k-s7` | 2 / 4 / 8 / 12 / 16 / 24 / 32 px | ALLE gaps/paddings; rohe px-Literale sind ab jetzt ein Review-Befund |
| `--k-t-xs` | 10.5px | Portlabels, Fussnoten, Chips |
| `--k-t-sm` | 12px | Sekundärtext, Toolbar-Knöpfe, Tabellen |
| `--k-t-md` | 13.5px | Lauftext, Eingaben |
| `--k-t-lg` | 16px | Panel-Titel |
| `--k-t-plakat` | 20px | Plakat-Versalien (Dialog-Köpfe, Stationstitel) |

**Zwei Stimmen bleiben Gesetz:** Plakat (fette, enge Grotesk, VERSAL, gesperrt)
nur für Köpfe/Titel; Technik (Monospace, Tabellenziffern) für alle Masse, Werte,
Status. Lauftext ist die dritte, stille Stimme (`--k-font-ui`).

**Motion:** `.k-uebergang-schnell/-basis/-setzen` als Utility-Klassen ersetzen
die wiederholten Inline-`transition`-Strings. «Papier flattert nicht»: nur
Opazität, Farbe, Linienstärke und kleine Versätze (≤4px) animieren — nie
Grösse springen lassen, nie federn.

**Hierarchie-Rezept (statt Schatten):**
- Grund `--k-field` → Fläche `--k-surface` → Karte `--k-raised` (drei Töne).
- Rahmen: Ruhe = 1px `--k-line` · betont = 1px `--k-line-strong` ·
  aktiv/gewählt = 1.5px `--k-ink` ODER Akzent-Eckpunkt (6px-Quadrat in der
  45°-Ecke), nie beides.
- Der EINE erlaubte Schatten: `--k-shadow-overlay` ausschliesslich an
  schwebenden Overlays (Menü, Dialog, Palette).

## 3. Komponenten-Vertrag (W0 baut, alle konsumieren)

Alle Komponenten reichen `data-testid` durch, sind
`exactOptionalPropertyTypes`-konform und leben in `packages/kosmo-ui/src/`.

- **KSelect** — bleibt ein ECHTES natives `<select>` (E2E bedient 31 Stück per
  `selectOption`). Styling: 1px-Tusche-Rahmen, Radius `--k-radius-sm`, eigener
  SVG-Chevron (background-image), `appearance:none`, Grössen sm/md.
- **KTabs** — `role=tab`-Buttons, Label bleibt sichtbarer TEXT (toHaveText-
  Verträge), Icon additiv. Aktiv: 2px-Akzent-Unterstrich, keine Füllfläche.
- **KTooltip** — CSS-only (Hover/Focus, ~400ms Delay), niemals Ersatz für
  sichtbaren Text, nur Zusatz auf Icon-Knöpfen (zeigt Name + Kurztaste).
- **KMenu** — Trigger + Items (`label`, optional `icon`, `kuerzel`, `gefahr`,
  `disabled`, `testid`, `'trenner'`); Papier-Karte mit `--k-shadow-overlay`;
  öffnet über CSS-Klasse; Esc/Aussenklick schliessen; aria-haspopup/-expanded.
- **KDialog** — gestalteter Kopf (Plakat-Versalien + Schliessen-KIcon +
  Hairline), optionale Fusszeile (Aktionen rechtsbündig), Scrim = Tusche-Lasur;
  Esc + Scrim-Klick schliessen. KEINE 45°-Ecke (die gehört den Karteikarten).
- **KField/KInput** — Label + Hinweis/Fehler; `mono`-Variante für Masse.
  Ersetzt die 10 lokalen `inputStyle`-Konstanten.
- **KChip** — konsolidiert Badge/Statusleisten-Chip/orbit-badge; Ton nur als
  Zeichenfarbe + Rand, nie als Fläche. `Badge` bleibt als Alias bestehen.
- **KToolbar/KToolGruppe** — EINE Zeile, Gruppen durch Hairlines, Überlauf in
  ein KMenu «Mehr»; `dicht`-Variante für Stationen mit wenig Platz.
- **KIcon** — Registry von ~28 selbstgezeichneten Zeichen (16px-Raster,
  1.5px-Stroke, `currentColor`, keine Fremd-Library). Ersetzt die Emoji-Zeichen
  (👍 👎 ⚙ ⚠ ✕ ★ 🔍 ⚑ 🎙 …) überall dort, wo sie BEDIENELEMENT sind;
  Emoji in Meldungs-TEXTEN dürfen bleiben.

## 4. Regeln für die Stations-Streams

1. **Eine Werkzeugzeile pro Station** (KToolbar); kontextabhängige Inhalte in
   eine zweite, klar abgesetzte Kontextzeile — nie drei gestapelte Zeilen.
2. **Link-Reihen werden Menüs**: Export-/Ansicht-/Ebenen-Ketten wandern in
   KMenu-Dropdowns mit Icon + Kurztaste; der Menü-Trigger trägt Text.
3. **Text bleibt Text**: jede per `toHaveText`/`text-is` geprüfte Beschriftung
   ('Treppe', 'Dach', 'Wand', 'Auswahl', 'EG', '1.OG', 'bereit', 'voll', …)
   bleibt sichtbar — Icons sind ADDITIV.
4. **testids sind heilig**: Namen und `^=`-Präfixe unverändert; neue
   Bedienelemente bekommen neue testids; jede Spec-Anpassung trägt einen
   Begründungskommentar.
5. **Leerzustände sind gezeichnet**: isometrische/lineare Tusche-Signets +
   ehrlicher Satz («kein Bild hinterlegt») — nie leere Farbflächen, nie
   Fake-Inhalte.
6. **Werkplan-Grammatik mit Mass**: höchstens 1–2 Zier-Elemente
   (Passermarke, Masskette, Schnittmarke) pro Ansicht.
7. **Adaption bleibt**: die J3-Fokus-Familien (`k-primaer/sekundaer/selten`)
   arbeiten weiter; die Überarbeitung ändert Gestalt, nie Verhalten.

## 5. KosmoVis-Zielbild (W1, Owner-Fokus)

Der Node-Editor wird vom Prototyp zum Werkplan:
- **Karten**: 45°-Ecke bleibt, NODE_W=200 bleibt; NEU je Kategorie
  (Quelle / Wandler / Render / Ausgabe) ein KIcon im Kopf + 2px-Tonstreifen
  unter der Kopfzeile (zurückhaltender Kategorie-Hue, keine Farbflächen).
- **Text**: Prompt-Körper clampt auf 3 Zeilen mit «… mehr»-Expand (lokaler
  UI-State); nichts quillt mehr über (SK-V3).
- **Layout**: «+ Drei Stimmungen» und «+ Node» platzieren überlappungsfrei
  (Versatz aus echter Node-Höhe + Spiral-Platzsuche).
- **Navigation**: schwebende Steuerleiste unten rechts mit − / Fit / + 
  (testids `vis-zoom-minus/-fit/-plus`); Mount-Auto-Fit bleibt.
- **Kanten**: Hover hebt (1→2px), Trenn-✕ erscheint erst bei Hover; Portanker
  4px vom Rahmen; kleine Porttyp-Legende unten links.
- **Werkzeugleiste**: KToolbar mit Gruppen «Graph | Bauen | Automatik».
- **V-H4**: der Render-Node erhält ein semantisches Formular (Fassade / Szene /
  Jahreszeit / Personen / Freitext), das denselben Prompt speist; der erzeugte
  Prompt bleibt sichtbar (Ehrlichkeit + V8-Transparenz).
- Unverändert vertraglich: alle `render-*`-testids und Status-Texte
  («bereit» / «rendert» / …), `node-hinzu` bleibt ein natives Select.

## 6. Ehrlicher Schnitt

**Diese Runde bewusst NICHT** (0.6.6-Kandidaten, nicht vergessen):
Mehrfachauswahl/Snapping/Ausrichten im Node-Editor, orthogonales
Kanten-Routing, Node-Kollaps, Custom-Dropdown-Popups anstelle nativer Selects,
Neuzeichnung der 64×64-Orbit-Icons (nur Stroke-Harmonisierung), Minimap
(bei 3–8 Nodes löst Fit+Zoom das Problem).

**Stufe 2 nur bei dünner Kritik-Runde-1**, Priorität:
V-M1 Render-Knopf im 3D-Viewport → kategorisierte Node-Palette →
V-H5 Kuratier-Fläche → Minimap.
