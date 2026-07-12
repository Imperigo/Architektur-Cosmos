# Golden-Wechsel 074 — Sammelwechsel «Drei Druck-Fixes» (v0.7.4 Welle 1)

EIN bewusster, dokumentierter Golden-Wechsel (Golden-Regime, Grundsatz 4 der
`V073-GESTALTUNG-SPEZ.md`, hier auf 0.7.4 fortgeführt): drei golden-berührende
Druck-Fixes in einem Sammelwechsel, weil alle drei denselben Renderer
(`derive/plansvg.ts`) und denselben Golden-Bestand betreffen und ein
Dreifach-Bruch mehr Rauschen als drei Einzelwechsel erzeugen würde:

- **P1** — SIA-Hochzahl 4–9 im PDF: Unicode-Hochzahlen (`dimensionLabel`) auf
  echte hochgestellte `<tspan>` umgestellt (Lato/IBM Plex Mono besitzen keine
  Glyphen für ⁴–⁹, s. `apps/kosmo-orbit/public/fonts/pdf/README.md`).
- **P4** — Untertitel + Nordpfeil «N»: explizite `SCHRIFT_TITEL` (Lato-Kette)
  statt geerbtem Root-Helvetica-Fallback (schliesst die in
  `GOLDEN-WECHSEL-D4.md` §7 offen gelassene 0.7.4-Zeile).
- **P5a** — Projektions-Ton: Grundriss-Projektionsregionen (Treppe/Decke/
  Volumen/Zone/FreeMesh, Klasse `projection`) zeichnen neu im
  `GRAU.projiziert`-Ton (#666) statt weiterhin im geschnittenen #111
  (schliesst `GOLDEN-WECHSEL-D1.md` §5 Punkt 3).
- **P5b** — EINE Kadenz-Normalisierung: die Abbruch-Region-Dash-Referenz
  (`plansvg.ts`) auf `LINIENTYP_SOLL.strich` (normatives Matrix-Vokabular,
  `stilblatt.ts`) umgestellt statt der gewachsenen `DASH.abbruch`-Kadenz.

Diese Datei wurde VOR der Regeneration geschrieben (Abschnitt 1–3,
Erwartungsliste), der Ist-Teil (Abschnitt 4) danach ergänzt.

## 1 · Code-Änderungen im Detail

### P1 — `derive/dimensions.ts` + `derive/plansvg.ts`

- Neu `dimensionLabelParts(a, b): { cm: string; rest: string }` — dieselbe
  Zentimeter/mm-Rest-Rechnung wie `dimensionLabel`, aber ALS PAAR statt als
  Unicode-String. `dimensionLabel` selbst bleibt **unverändert** (andere
  Aufrufer: `derive/dimensions.ts`s eigener `wandOeffSegs`-Zusatz-Label-Bau
  ruft weiterhin `dimensionLabel`, s.u.).
- Neu ein lokaler Helfer `hochzahlSvg(s, fs)` in `plansvg.ts`: erkennt
  Unicode-Hochzahl-Zeichen (⁰–⁹, inkl. der Latin-1-Sonderfälle ¹²³) in einem
  beliebigen String und ersetzt sie durch `<tspan dy="…" font-size="…">`
  (normale Ziffer, kleiner, angehoben; `dy` in Nutzereinheiten, nicht `em`).
  Danach folgender Normaltext bekommt einen `<tspan dy="+…" font-size="fs">`
  zur Grundlinien-Rückkehr. Kein Hochzahl-Zeichen → No-op (`escapeXml(s)`).
  Nur EINE Hochzahl-Ziffer je String wird unterstützt (SIA-Realfall).
- Emit-Stellen umgestellt:
  - Aussenketten-Haupttext (x- und y-Kette, vormals `dimensionLabel(...)`):
    jetzt `dimensionLabelParts(...)` → `escapeXml(cm)` + bedingter
    `<tspan>` für den Rest (Hochzahl steht am STRINGENDE, kein Reset nötig).
  - Öffnungs-Zusatzzeile («h/BH», z.B. «150⁵/90», KANN eine Hochzahl in der
    MITTE tragen — Rest folgt Normaltext) — beide Ketten: jetzt
    `hochzahlSvg(z, 2.0*scale)` statt `escapeXml(z)`.
- **Bewusst NICHT geändert**: der `label`-Bau in `dimensions.ts`s
  `wandOeffSegs` selbst ruft weiterhin `dimensionLabel` (liefert den
  Unicode-String, der dann von `hochzahlSvg` in `plansvg.ts` in Tspans
  zerlegt wird) — die SIA-Rundungslogik lebt unverändert an einer Stelle,
  nur die DARSTELLUNG des Rests ändert sich am Renderer.

### P4 — `derive/plansvg.ts`

- Nordpfeil-«N» (Zeile ~578, `planToSvg`): `font-family="${SCHRIFT_TITEL}"`
  ergänzt (vorher Root-Fallback `Helvetica, Arial, sans-serif` geerbt).
- Plankopf-Untertitel `planTitle · storey` (Zeile ~588): `font-family="
  ${SCHRIFT_TITEL}"` ergänzt (derselbe Grenzfall, den `GOLDEN-WECHSEL-D4.md`
  §7 «Offene 0.7.4-Zeile» ausdrücklich vertagt hatte).
- Import ergänzt: `SCHRIFT_TITEL` aus `./stilblatt` (war noch nicht
  importiert).

### P5a — `derive/plansvg.ts`

- Die Grundriss-Stroke-Kaskade (Zeilen ~132–144: Default `GRAU.geschnitten`,
  überschrieben nur für `neu`/`abbruch`/`bestand`) bekommt einen vierten
  Zweig: `else if (isProjection) stroke = GRAU.projiziert;` — Projektions-
  regionen (Treppe/Decke/Volumen/Zone/FreeMesh) liegen NICHT in der
  Schnittebene, sondern darüber/darunter, tragen darum denselben helleren
  Ton wie die Projektions-Linien im Schnitt (`sectionInnerSvg` hatte
  `GRAU.projiziert` für Projektionen bereits seit D1).
- Poché-Füllung (`pocheEntscheid`) UNVERÄNDERT — nur der Stift wechselt.

### P5b — `derive/plansvg.ts`

- Region-Dash-Kaskade (Zeile ~166, `abbruch`-Zweig): `DASH.abbruch` (lokale
  Bestandskadenz `[1.5, 0.8]`) → `LINIENTYP_SOLL.strich` (normatives
  Matrix-Vokabular `[3, 1.5]`, `stilblatt.ts` Achse 3).
- **Bewusst NICHT normalisiert** (je Zeile begründet, wie vom Auftrag
  verlangt):
  - `DASH.strichpunktBestand` (Parzelle/Baugrenze/Haupt-Rasterachse):
    koppelt mehrere Renderer-Stellen (`zone-parzelle`-Regionen, Baugrenze-
    Linien, Haupt-Rasterachsen — je zweimal in `plansvg.ts`) an DENSELBEN
    Bestandswert; eine Normalisierung auf `LINIENTYP_SOLL.strichpunkt`
    wäre ein Mehrfach-Bruch über mind. 4 Stellen, keine «eine Zeile».
  - `DASH.volumen` (Massenmodell-Kontur): hat KEINEN Matrix-Typ — die
    Matrix kennt nur voll/Strich/Strichpunkt/Punkt, kein eigenes
    Massenmodell-Vokabular; eine Zuordnung wäre Auslegungssache, keine
    normative Ableitung.
  - `DASH.ueberSchnitt` (Feinstrichpunkt für Überzeichnungen wie Treppe/
    First darüber): bewusst FEINER als die Bestands-Strichpunkt-Kadenz
    gehalten (Unterscheidung zu `strichpunktBestand`); eine Zuordnung auf
    `LINIENTYP_SOLL.strichpunkt` würde diese Unterscheidung einebnen.
  - `DASH.unterzug`, `DASH.terrainGewachsen`, `DASH.achseWohn`, `DASH.bogen`,
    `DASH.platzhalter`: ausserhalb des Mandats («EINE Kadenz-
    Normalisierung»), keine Berührung.
  - `apps/kosmo-orbit/src/modules/design/PlanView.tsx` (Bildschirm-Rendering,
    referenziert `DASH.abbruch` ebenfalls): NICHT angefasst — Auftrag
    betrifft explizit nur `plansvg.ts:166` (Druckpfad), `DASH.abbruch`
    selbst bleibt im Stilblatt bestehen (Bildschirm-Konsistenz eigene
    Folgeentscheidung).

## 2 · Golden-Coverage-Lücke (Grundsatzfrage, VOR der Regeneration erkannt)

Vor der Regeneration per Fixture-Analyse geprüft (nicht erst nach dem Diff):
**kein bestehender Golden übt P1 oder P5b aus.**

- **P1**: Alle Fixture-Wände/-Öffnungen im Golden-Bestand liegen auf vollen
  Zentimetern bzw. Höhen/Brüstungen ohne mm-Rest — `dimensionLabelParts`
  liefert überall `rest === ''`. Verifiziert per Skript (kein einziges
  Unicode-Hochzahl-Zeichen U+2070/U+00B9/U+00B2/U+00B3/U+2074–U+2079 in
  irgendeinem der 27 SVG-Goldens, weder vorher noch nachher). Der
  Tspan-Umbau ist daher für JEDEN bestehenden Golden ein reines No-op
  (`rest === ''` → kein `<tspan>`, `escapeXml(cm)` liefert denselben String
  wie vorher `dimensionLabel(...)`).
- **P5b**: Kein Golden-Fixture markiert ein Bauteil `renovation: 'abbruch'`
  (die einzigen `renovation-abbruch`-Referenzen im Testbaum sind
  Unit-Assertions in `kernel.test.ts`, die nur `plan.regions`/`classes`
  prüfen, nie über `planInnerSvg`/einen Golden laufen).

Das ist eine ECHTE, vor der Regeneration erkannte Lücke — kein stiller
Blindfleck: `packages/kosmo-kernel/test/w1-nachweis-074.test.ts` schliesst sie
mit gezielten Assertions (rot vor dem Fix, grün danach, per `git stash`
verifiziert, s. §5). **P5a** dagegen WIRD von einem Golden geübt
(`blatt-autofuellung.svg` platziert Decke/Volumen/Zone-Projektionen, s.
`GOLDEN-WECHSEL-D1.md` §5 Punkt 3) — dort ist ein echter Byte-Diff zu
erwarten.

## 3 · Erwartungsliste (VOR der Regeneration geschrieben)

Vorab per Testlauf ermittelt (ohne `GOLDEN_UPDATE`, nur zur Diff-Sichtung):
**15 golden-tragende Tests schlagen fehl**, alle mit demselben Muster —
Diff beschränkt auf die Plankopf-Zeilen (N + Untertitel). Kein einziger
Diff ausserhalb dieser zwei Zeilen in den 14 `planToSvg`-Goldens.

| Golden | Erwartung |
| --- | --- |
| `grundriss-testhaus.svg` | NUR P4: Nordpfeil-«N» + Untertitel `font-family="'Lato', …"`. |
| `grundriss-testhaus-wettbewerb.svg` | NUR P4. |
| `grundriss-testhaus-baueingabe.svg` | NUR P4. |
| `grundriss-walmdach-flach.svg` | NUR P4. |
| `grundriss-satteldach-first.svg` | NUR P4. |
| `grundriss-satteldach-eg-darunter.svg` | NUR P4. |
| `grundriss-kipp.svg` | NUR P4. |
| `grundriss-fenster-zweifluegel.svg` | NUR P4. |
| `grundriss-fensterband.svg` | NUR P4. |
| `grundriss-kontext-wettbewerb.svg` | NUR P4. |
| `grundriss-kontext-baueingabe.svg` | NUR P4. |
| `grundriss-kontext-werkplan.svg` | NUR P4. |
| `werkplan-beschlag.svg` | NUR P4. |
| `blatt-autofuellung.svg` | NUR P5a: exakt 3 Pfad-Zeilen `stroke="#111"`→`stroke="#666"` (Decke/Volumen/Zone-Projektionsregionen aus der Fixtur, inkl. der bereits gestrichelten `DASH.volumen`-Kontur). KEIN P4 (das Blatt bettet `planInnerSvg` OHNE den `planToSvg`-Plankopf ein, s. `GOLDEN-WECHSEL-D4.md` §0). |
| Alle 12 übrigen (`ansicht-*` ×4, `schnitt-*` ×3, `schwarzplan*` ×2, die 5 Report-Blätter, `interop-referenz-normalisiert.ifc`) | UNVERÄNDERT — keine Plankopf-Zeile (Ansicht/Schnitt sind Plankopf-lose Fragmente), keine Projektionsregion mit falschem Ton, keine Abbruch-/Hochzahl-Fixtur. |

**Erwartete Summe: 14 geänderte Goldens (13 reines P4 + 1 mit P5a), 13
unverändert. P1/P5b: 0 Goldens (Lücke, s. §2 — geschlossen durch die
Nachweis-Fixture).**

## 4 · Ist-Vergleich nach Regeneration (12.07.2026)

**Erwartung vs. Ist: exakt getroffen — genau 14 geänderte Goldens, 14
unverändert** (`git status --porcelain -- packages/kosmo-kernel/test/golden/`
zeigt exakt die 14 in §3 vorhergesagten Dateien, kein einziges der
14 unverändert erwarteten Goldens tauchte im Diff auf).

**Maschineller Zeile-für-Zeile-Abgleich** (`git diff --numstat`):

- 13 Dateien (alle `grundriss-*` + `werkplan-beschlag.svg`) je exakt
  **2 entfernte / 2 hinzugefügte Zeilen** — die Nordpfeil-«N»-Zeile
  (`font-family="'Lato', Helvetica, Arial, sans-serif"` ergänzt) und die
  Untertitel-Zeile (`planTitle · storey`, dieselbe `font-family` ergänzt).
  Koordinaten, `font-size`, Textinhalt: 0 Diff ausserhalb der beiden
  ergänzten `font-family`-Attribute.
- `blatt-autofuellung.svg`: exakt **3 entfernte / 3 hinzugefügte Zeilen**,
  alle drei `stroke="#111"` → `stroke="#666"` an den Decke-/Volumen-/
  Zone-Projektionsregionen der Fixtur (eine davon zusätzlich mit
  `stroke-dasharray="300 150"`, `DASH.volumen`, unverändert). Koordinaten,
  `fill`, `stroke-width`: 0 Diff.
- 0 unerklärte Zeilen über alle 14 Dateien, 0 Geometrie-/Koordinaten-Diff.

**Invarianten-Stichprobe (Ist):** `grundriss-testhaus.svg` unverändert bis
auf die zwei Plankopf-Zeilen (Poché-Flächen, Bemassung, Türsymbole, Achsen
byte-identisch); `blatt-autofuellung.svg` behält seinen EIGENEN Plankopf
(`sheet.ts`, D4-Revier) unverändert — kein `SCHRIFT_TITEL` an «N»/Untertitel
dort, weil `planToSvg`s Plankopf in diesem Golden gar nicht eingebettet ist.

`schwarzplan.svg`/`schwarzplan-nachbarn.svg`: **0 Diff** (`git diff --stat`
leer) — schwarzplan.ts wurde nicht angefasst, eigenes «N». Alle 5
Report-Blätter (`abnahmeprotokoll`/`ausnuetzungsnachweis`/`bauablaufblatt`/
`kvblatt`/`studienbericht`) UND alle `ansicht-*`/`schnitt-*`-Goldens: **0
Diff** — keine Plankopf-Zeile (Plankopf-lose Fragmente bzw. eigener
Report-Renderer), keine Projektionsregion, kein Abbruch/Hochzahl-Rest in
diesen Fixturen. `interop-referenz-normalisiert.ifc`: 0 Diff (kein SVG).

## 5 · Beweis-Fixture (schliesst die P1/P5b-Golden-Lücke)

`packages/kosmo-kernel/test/w1-nachweis-074.test.ts` — 5 gezielte
Assertions, KEIN Byte-Golden:

1. `dimensionLabelParts`-Unit: 3615→{cm:'361',rest:'5'}, 3600→{cm:'360',
   rest:''}, 3611→{cm:'361',rest:'1'}.
2. P1 Aussenkette: mm-Rest 4–9 (hier 5) erscheint als `<tspan dy="-…"
   font-size="…">5</tspan>`, KEIN Unicode-Hochzahl-Zeichen mehr im
   SVG-Fragment.
3. P1-Komposit: Zusatzzeile «150⁵/90» — Hochzahl NICHT am Stringende,
   Normaltext danach (`/90`) auf zurückgesetzter Grundlinie (`dy>0`, volle
   `font-size`) in eigenem `<tspan>`.
4. P5a: Volumenkörper-Projektionsregion trägt `stroke="#666"`, während die
   geschnittenen Wände weiterhin `stroke="#111"` tragen (kein pauschaler
   Flip).
5. P5b: Abbruch-Wand trägt `stroke-dasharray` nach `LINIENTYP_SOLL.strich`
   (`"300 150"` bei scale 100), NICHT mehr die alte `[1.5,0.8]`-Kadenz
   (`"150 80"`).

Verifiziert per `git stash push -- dimensions.ts plansvg.ts` (Code auf
Vor-Fix-Stand, Test-Datei bleibt) → alle 5 Assertions **rot** (Import-
Fehler bzw. falscher Stift/Dash/Unicode-String) → `git stash pop` (Fix
zurück) → alle 5 Assertions **grün**.

## 6 · Gates

`npx tsx tools/svg-qa/pruefe-goldens.mts` → Exit 0, 28 Goldens geprüft,
**0 harte Fehler**, 1 bekannte `abnahmeprotokoll.svg`-Text-Overlap-Warnung
(unverändert seit D1/D4, im Tool-Kopf dokumentiert) · Kernel-Suite
(`npx vitest run` in `packages/kosmo-kernel`) **34/34 Testdateien, 757/757
Tests grün** (752 Bestand + 5 neue Nachweis-Fixture-Assertions) ·
Typecheck aller Workspaces (`npm run typecheck`) grün.
