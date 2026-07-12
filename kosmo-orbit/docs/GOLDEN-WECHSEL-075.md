# Golden-Wechsel 075 — Neues Golden «Beschlag-Katalog S2» (v0.7.5 Welle 1 A1)

Golden-Regime (Grundsatz 4 der `V073-GESTALTUNG-SPEZ.md`): **kein Sammelwechsel,
kein einziger Bestands-Golden berührt** — dieser Eintrag dokumentiert
ausschliesslich das EINE neue Golden `werkplan-beschlag-s2.svg`, das die neue
Funktion Beschlag-Katalog Stufe 2 (Beschläge einer Öffnung zuweisen,
`design.beschlaegeSetzen`, additives Feld `Opening.beschlaege`) beweist.

## 0 · Warum kein Bestandswechsel nötig ist

Alle S2-Emit-Stellen (`derive/plan.ts` Text-Primitive, `derive/plansvg.ts`
Piktogramme, `ifc/export.ts` `IFCDISCRETEACCESSORY`) hängen ausschliesslich
hinter dem Daten-Guard `o.beschlaege?.length`. Kein bestehendes Fixture
(`test/fixtures.ts`) setzt `beschlaege` — der Guard bleibt für alle 28
bisherigen Goldens (inkl. `werkplan-beschlag.svg`, das S0-Golden) wirkungslos.
Bewiesen durch: `npm test -w @kosmo/kernel` (777/777 grün, 0 verändert) +
`npm run svg-qa` (29 geprüft, 28 unverändert + 1 neu, 0 harte Fehler).

## 1 · Erwartung (VOR der Regeneration geschrieben)

Fixture `testhausBeschlagS2()` (`test/fixtures.ts`): 10×6 m Haus, Südwand mit
ZWEI Türen —

- Tür 1 (Mitte 2500): `design.beschlaegeSetzen` mit
  `['tuerdruecker-garnitur', 'tuerband-scharnier', 'einsteckschloss']`.
- Tür 2 (Mitte 7500): KEINE Zuweisung (Daten-Guard-Beweis, wie das 4. Fenster
  in `testhausBeschlag()`).

Erwartetes Bild:

- Tür 1 zeigt DREI Piktogramme (Rosette+Drückerstange, zwei Bandlappen+Achse,
  Schlosskasten+Nuss+Falle — `beschlagSymbol()`, Pfad B, `plansvg.ts`) in
  einer Reihe, PLUS eine Textzeile mit den drei vollen Katalognamen
  (Pfad A, `plan.ts` → automatisch auch im SVG, da `plansvg.ts` jeden
  `plan.texte`-Eintrag zeichnet).
- Tür 2 zeigt NICHTS Beschlag-Bezogenes (weder Piktogramm noch Text) —
  einzig die Tür-Symbolik selbst (Bogen) bleibt.
- Kein S0-Beschlag-Symbol (Band/Griffseite/BRH/…) an irgendeiner Tür, da
  keine S0-Felder gesetzt sind.
- Beide Reihen (Piktogramme, Text) liegen ausserhalb der Bemassungsketten
  (Aussen-/Innenkette, ~1100–2000mm ab Wandkante) — sonst Text-Overlap.

## 2 · Nachtrag während der Umsetzung: Text-Overlap-Fund

Erste Regeneration (Text-Zeile 900mm, Piktogramme 1300mm ab Wandkante) ergab
in `svg-qa` **2 Text-Overlap-Warnungen** auf dem neuen Golden — der
zusammengesetzte Katalog-Namenstext («Türdrücker (Garnitur) · Türband /
Scharnier · Einsteckschloss») ist ein langer String und reichte breit genug,
um horizontal UND vertikal die Bemassungs-Beschriftung («100», «200» bei
y≈1140) zu überlappen. Fix: beide Reihen weiter aus der Wand geschoben
(Piktogramme 2200mm, Text 2700mm) — jenseits beider Bemassungsketten
(~1100–2000mm). Zweite Regeneration: **0 Overlap-Warnungen** auf dem neuen
Golden (einzige verbleibende Warnung im gesamten Bestand: die vorbestehende,
dokumentierte `abnahmeprotokoll.svg`-Warnung, unverändert seit D1/D4).

## 3 · Nachtrag: DXF-Text-Layer-Routing (kleine, additive Korrektur)

Der ursprüngliche Auftrag ging davon aus, ein `PlanText` mit Klasse
`beschlag` lande „automatisch" auf dem DXF-Layer BESCHLAG — das stimmte
NICHT: `dxf/export.ts` routete JEDEN `plan.texte`-Eintrag pauschal auf
`LAYER_TEXT`, unabhängig von seinen Klassen (nur Regionen/Linien/Bögen liefen
durch `layerFuer(classes)`). Kleine, gezielte Korrektur: neue Funktion
`layerFuerText(classes)` — Text mit Klasse `beschlag` → `LAYER_BESCHLAG`,
sonst unverändert `LAYER_TEXT`. **Nebenwirkung (bewusst, geprüft)**: das
bestehende S0-BRH-Etikett (Klasse `beschlag`/`beschlag-brh`,
`werkplan-beschlag.svg`) wandert damit in der DXF-Ausgabe ebenfalls von
TEXT auf BESCHLAG — es gibt aber KEIN DXF-Golden (nur 28 SVG + 1 IFC im
Golden-Bestand) und keinen bestehenden Test, der die BRH-Text-Layer-Lage
prüft (`test/dxf-export.test.ts`, `test/dxf-import.test.ts`,
`test/interop-dxf-roundtrip.test.ts` durchsucht — keine Zeile hängt daran).
Alle DXF-Tests bleiben grün.

## 4 · Ist-Vergleich nach Regeneration (12.07.2026)

`git status --porcelain -- packages/kosmo-kernel/test/golden/` zeigt genau
EINE neue Datei (`werkplan-beschlag-s2.svg`), null geänderte. Erwartung exakt
getroffen.

## 5 · Gates

- `npm run typecheck` (alle Workspaces): grün.
- `npm test -w @kosmo/kernel`: 36/36 Testdateien, 777/777 Tests grün
  (inkl. 12 neue Assertions in `test/beschlag-s2.test.ts`).
- `npm run svg-qa`: 29 Goldens geprüft, 0 harte Fehler, 1 Text-Overlap-Warnung
  (vorbestehend, `abnahmeprotokoll.svg`).
- `npm test -w @kosmo/orbit-app`: 64/64 Testdateien, 848/848 Tests grün
  (inkl. neuer `test/beschlag-inspector.test.tsx`).

---

# Anhang A2 (Welle 2) — Neues Golden «Plankopf-Stammdaten» (v0.7.5 A2)

Golden-Regime (Grundsatz 4): **kein Sammelwechsel, kein einziger Bestands-Golden berührt** — dieser
Anhang dokumentiert ausschliesslich das EINE neue Golden `plankopf-stammdaten.svg`, das die neue
Plankopf-Zeile aus dem Projekt-Stammdatenmodell (`design.projektInfoSetzen`, additives Feld
`DocSettings.projekt`) beweist. Beleg der Modellseite: `docs/V075-STAMMDATEN.md`.

## 0 · Warum kein Bestandswechsel nötig ist

Beide Emit-Stellen (`derive/plansvg.ts` `planToSvg`, `derive/sheet.ts` `sheetToSvg`) hängen die neue
Bauherr-/Verfasser-Zeile ausschliesslich hinter `plankopfStammdatenZeile(doc.settings.projekt)`
(`derive/stilblatt.ts`) — die Funktion liefert `null`, solange weder `projekt.bauherr` noch
`projekt.verfasser` gesetzt sind, und beide Renderer pushen dann schlicht keine zusätzliche Zeile.
Kein bestehendes Fixture (`test/fixtures.ts`) setzt `projekt` — der Guard bleibt für alle 29
bisherigen Goldens wirkungslos. In `sheet.ts` wächst zusätzlich die Plankopf-Box (`kh`) nur, wenn die
Zeile erscheint; ohne Daten bleibt `kh = 26` wie bisher.

## 1 · Erwartung (VOR der Regeneration geschrieben)

Fixture `testhausStammdaten()` (`test/fixtures.ts`): 8×6 m Testhaus (vier Wände, keine Öffnungen),
Projektname umbenannt auf «Wohnhaus Ahornweg» (`design.projektNameSetzen`), Stammdaten gesetzt
(`design.projektInfoSetzen`): Bauherr «Baugenossenschaft Ahorn», Adresse «Ahornweg 12, 6000 Luzern»,
Parzellennummer «1847», Verfasser «Baubüro Andrin».

Erwartetes Bild: Plankopf-Titel zeigt versal «WOHNHAUS AHORNWEG» (wie bisher), darunter (neu, in der
Messbar-Stimme IBM Plex Mono, kleiner als die bestehenden Meta-Zeilen) genau eine Zeile
`Bauherr: Baugenossenschaft Ahorn · Verfasser: Baubüro Andrin`. Adresse/Parzellennummer erscheinen
NICHT im Plankopf (nur Bauherr/Verfasser sind Plankopf-Felder, s. `plankopfStammdatenZeile`) — sie
sind trotzdem gesetzt, um den additiven Merge über mehrere Felder gleichzeitig zu beweisen.

## 2 · Ist-Vergleich nach Regeneration (12.07.2026)

`git status --porcelain -- packages/kosmo-kernel/test/golden/` zeigt genau EINE neue Datei
(`plankopf-stammdaten.svg`), null geänderte. Erwartung exakt getroffen — die generierte Zeile lautet
wörtlich `Bauherr: Baugenossenschaft Ahorn · Verfasser: Baubüro Andrin`, wie vorab notiert.

## 3 · Gates

- `npm run typecheck` (alle Workspaces): grün.
- `npm test -w @kosmo/kernel`: 37/37 Testdateien, 788/788 Tests grün (inkl. 11 neue Assertions in
  `test/projekt-stammdaten.test.ts`).
- `npm run svg-qa`: 30 Goldens geprüft, 0 harte Fehler, 1 Text-Overlap-Warnung (vorbestehend,
  `abnahmeprotokoll.svg`) — das neue Golden selbst ist warnungsfrei.
- `npm test -w @kosmo/orbit-app`: 65/65 Testdateien, 849/849 Tests grün (inkl. neuer
  `test/stammdaten-panel.test.tsx`).
