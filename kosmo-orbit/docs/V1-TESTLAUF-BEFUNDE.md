# V1-Testläufe — Vollsimulation über Haustypen (06.07.2026)

Owner-Auftrag: «mache V1-Testläufe» — die Software extrem penibel als Architekt
durchspielen, pro Phase ein vollständiges Projekt, jedes Werkzeug von Anfang bis
Ende, verschiedene Haustypen und echte CH-Parzellenszenarien. Dies ist zugleich
die **Saat für V2-Serie H** (vollautomatische Benutzersimulation).

## Methode

Vier Agenten haben je ein komplettes Architektenprojekt eines Haustyps als
zusammenhängende End-to-End-Journey durch die echte App entworfen; Opus fährt sie
seriell als Playwright-E2E und triagiert jeden Fehlschlag (echter Bug vs.
Test-Artefakt). Szenarien:

- **Umbau** — Altbau-Sanierung Zürich-Aussersihl (Bestand/Abbruch/Neu, Terrain,
  Durchbruch, Umbau-Blattfilter, Kosmo, IFC-Export). → `e2e/sim-umbau.spec.ts`, grün.
- **MFH** — Ersatzneubau Zürich-Altstetten (Raumprogramm, Wohnungs-Segmentierer,
  Grundriss-Generator, Geschosse stapeln, Fluchtweg, %-Erfüllung, Themenplan,
  Publish). → `e2e/sim-mfh.spec.ts`, grün. Erster E2E-Beleg für Themenplan-Overrides.
- **EFH** — Hanglage Emmental (Volumen, Wände/Dach/Treppe, Möblierung, Schnitt/
  Ansicht, SIA-416, Publish). Journey entworfen; als Coverage noch zu hart
  (Selektor-/Timing-Feinschliff) → für V2-Serie-H-Härtung vorgemerkt.
- **Hochhaus/Blockrand** — Punkthochhaus Zürich-West (Raster/Stützen,
  Fassadenmodule, AZ, viele Geschosse stapeln, Fluchtweg, Publikations-Set).
  Journey entworfen; wie EFH für Serie H vorgemerkt.

**Wichtigste Gesamtaussage:** Rendering und Rechenkette sind **korrekt** — die
anfänglichen Fehlschläge der grünen Specs waren durchweg zu strikte Test-
Assertions (das Poché rendert korrekt einen Pfad je Materialschicht), kein
Produktfehler.

## Behobene Befunde (dieser Batch)

1. **`design.geschossKopieren` stapelte die Tragstruktur nicht mit** (Hochhaus).
   Kopiert wurden Zonen/Möbel/Türen/Wände+Öffnungen/Decken/Treppen — aber **nicht
   Stützen und Unterzüge**. Ein Skelettbau verlor in jedem gestapelten OG seine
   Tragstruktur. Fix: `column`/`beam` werden mitgestapelt (`commands/design.ts`),
   +1 Kernel-Test.
2. **Raster-Querachsen-Labels schlugen bei Z um** (Hochhaus). `String.fromCharCode
   (65 + j % 26)` gab Achse 1 und 27 beide «A» (querAnzahl bis 40). Fix: bijektive
   Basis-26-Beschriftung (A…Z, AA, AB …), +1 Kernel-Test.
3. **Geschossleiste lief bei vielen Geschossen aus dem Viewport** (Hochhaus).
   Fix: `maxHeight` + `overflowY:auto` (`DesignWorkspace.tsx`).
4. **Aussparung/Durchbruch im Plan war nicht anwählbar** (Umbau): `plan-hit-test.ts`
   kannte keinen `aussparung`-Fall — platzierbar (`inspector-aussparung`), aber
   danach nicht mehr anklickbar/verschiebbar/löschbar. Fix: eigene Weltpositions-
   Berechnung je Wirt (Wand: `a + dir·center`; Decke: `at` direkt,
   `aussparungWeltpos`), Aussparungen werden in `pickEntityAt` VOR den Wänden
   geprüft, aber mit engem Kästchen (halbe grösste Kante + 40 mm Toleranz —
   bewusst klein, nicht die grosse Wand-Toleranz von 120 mm), damit ein Klick
   daneben weiterhin die Wand wählt. `outlineOf` liefert das Symbol-Rechteck
   (breite×hoehe, an der Wirt-Achse ausgerichtet) fürs Auswahl-Highlight.
   Löschen lief bereits generisch über `design.loeschen` (kein Fix nötig,
   nur Selektierbarkeit fehlte). Verschieben bewusst nicht Teil dieses Fixes.
   +7 Tests (`apps/kosmo-orbit/test/plan-hit-test.test.ts`).

## Offen / bewusst nicht in diesem Batch

**Behebbar, aber Regressionsrisiko oder grösser — als eigener Auftrag:**
- **Fassaden-Zuweisung ≠ gestanzte Fenster** (Hochhaus): `fassadenModulZuweisen`
  (Süd/Nord am MassBody) und `fensterAusModulen` (nimmt immer das erste Modul für
  alle Aussenwände) sind zwei unverbundene Systeme. Vereinheitlichung = grösserer
  Auftrag.

**Modellierungs-/Feature-Lücken → V2:**
- **Grenzabstand — teilerledigt (ROADMAP 153).** Klarstellung zu diesem
  Befund: `Boundary.grenzabstand` (Polygonkante, Punkt-Kante-Distanz,
  Mehrhöhenzuschlag) war schon **vor** diesem Testlauf in `pruefeGrundriss()`
  aktiv durchgesetzt. Die tatsächliche Lücke war die **zweite** Quelle:
  `zonenRegelSetzen` speichert `grenzabstandKlein/Gross`
  (`doc.settings.zonenRegel`), `pruefeGrundriss()` las davon bislang nur
  `maxHoehe`/`maxVollgeschosse`. **Jetzt geschlossen**: trägt eine `Boundary`
  keinen eigenen `grenzabstand`, greift ersatzweise `grenzabstandKlein` der
  aktiven Zonenregel als konservatives Minimum (Befundtext benennt die
  Zonenregel als Quelle). **Ehrlich offen bleibt**: `grenzabstandGross`
  (seitenabhängig, für die «grosse» Fassadenseite) wird nicht geprüft — das
  Modell kennt keine Zuordnung, welche Boundary-Kante «klein»/«gross» ist
  (bräuchte eine Kanten-Klassierung im `Boundary`-Entity); ohne jede
  `Boundary`-Geometrie auf dem Geschoss bleibt der Zonenregel-Grenzabstand
  ebenfalls ungeprüft (keine Parzellenlinie zum Messen). Beides → V2.
- **Kein eigener Parzellen-/Site-Zonentyp** (EFH): Parzellen werden als
  `sia:'KF'`-Zonen behelfsmässig modelliert und verunreinigen dann SIA-416-NGF
  und Δ Max mit ihrer Fläche. Braucht einen Site/Boundary-Zonentyp ohne
  SIA-416-Klassierung → V2.
- **Kein 2D-Plansymbol fürs Dach** (EFH): `derive/plan.ts` hat keinen `roof`-Fall;
  Dach nur in 3D-Szene/Schnitt sichtbar → V2.
- **Wohnungs-Typologie grob** (MFH/EFH): nur marktgerecht/preisgünstig/
  alterswohnen/…, keine 2.5/3.5/4.5-Zimmer-Granularität → V2 (mit Serie F).

**Kein Bug (geprüft):**
- Berechnungsliste summiert Zonen **gebäudeweit** über alle Geschosse — korrekt,
  weil ein Wettbewerbs-Raumprogramm ein Gebäude-Total ist (nicht per Geschoss).

## Coverage-Lücken (Testids), die auffielen
- `RasterPanel`: Querachsen-Feld ohne `data-testid` (nur Hauptachsen).
- Checks-Panel: Fluchtweg/Zonenregel-Befunde nur als Freitext, kein strukturiertes
  `regel`/`schwere`-Attribut je Eintrag.
- Kein UI-Knopf für `design.deckeZeichnen` (nur programmatisch).
