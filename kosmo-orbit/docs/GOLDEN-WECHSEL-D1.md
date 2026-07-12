# Golden-Wechsel D1 — Sammelwechsel «Strich-Matrix» (v0.7.3, Stream S1)

EIN bewusster, dokumentierter Golden-Wechsel (Golden-Regime, Grundsatz 4 der
`V073-GESTALTUNG-SPEZ.md`): Grau-Achse der Strich-Matrix (§D1, Soll 2b)
geflippt PLUS die D2-Leibungslinie (0.25 ab Vorprojekt, §D2 — in diesen
Sammelwechsel gefaltet, weil die Ansicht-Goldens auf dem werkplan-Default
laufen und sonst ein dritter Golden-Bruch entstünde). Diese Datei wurde VOR
der Regeneration geschrieben (Erwartungsliste), der Ist-Teil danach ergänzt.

## 1 · Wert-Flips im Stilblatt (`derive/stilblatt.ts`)

| Token | Alt | Neu | Begründung |
| --- | --- | --- | --- |
| `GRAU.geschnitten` | `black` | `#111` | Matrix: #111 geschnitten. |
| `GRAU.gesehen` | `#111` | `#3A3A3A` | Matrix: #3A3A3A gesehen (reine Ansicht/Axo). |
| `GRAU.projiziert` | `#444` | `#666` | Matrix-Fussnote: «Projektionen werden heller (#444→#666)». |
| `GRAU.kontext` | `#8a8a8a` | `#8a8a8a` (unverändert) | Bereits der Matrix-Ton; Kleinschreibung bewusst behalten (farbidentisch mit #8A8A8A, hält Schwarzplan/Situationsplan byte-stabil). |
| `GRAU_SONDER.symbolik` | `#333` | `= GRAU.gesehen` (#3A3A3A) | Flügelsymbolik liegt auf der GESEHENEN Fassade; #333 ist kein Matrix-Ton. |
| `GRAU_SONDER.schraffur` | `#333` | `= GRAU.gesehen` (#3A3A3A) | Urteilsentscheid: Schraffur ist Feinzeichnung, nicht Kante — der mittlere Ton (fast identisch zu #333) statt #111, das die Schraffur zur Kantenstärke aufwerten würde. Als Grundsatzfrage im Abschlussbericht. |
| `GRAU_SONDER.terrainNeu` | `#333` | `= GRAU.geschnitten` (#111) | Matrix nennt «Terrain neu» explizit in der 0.35er-Klasse «sekundär geschnitten» → geschnitten-Ton. |
| `GRAU_SONDER.terrainGewachsen` | `#777` | `= GRAU.kontext` (#8a8a8a) | Gewachsenes Terrain/flache Bodenlinie = Kontext (wird abgetragen bzw. ist Referenz). |
| `GRAU_SONDER.ideell` | `#555` | `= GRAU.projiziert` (#666) | Rasterachsen/Tür-Fensterbögen sind ideelle Zeichen (nicht körperlich) → der helle Nicht-Körper-Ton; #555 ist kein Matrix-Ton. |

BEWUSST NICHT geflippt (dokumentierte Abweichungen, s. Abschnitt 5):

- **Stift-Werte**: bleiben 0.50/0.35/0.25/0.18 wie heute verdrahtet. Die
  reine Ansicht zeichnet Sichtkanten weiterhin mit 0.35 (Bestand «sonst
  verschwindet die Fassade»), obwohl die Matrix für Sichtkanten 0.25 nennt
  — Grundsatzfrage, kein stiller Mehrbruch in diesem Wechsel.
- **Linientyp-Kadenzen**: Bestands-Kadenzen (`DASH`) bleiben; das normative
  Matrix-Vokabular (3–1.5 / 8–1.5–0.5–1.5 / 0.5–2) ist als `LINIENTYP_SOLL`
  deklariert. Normalisierung = eigene Folgeentscheidung (betrifft auch
  semantische Unterscheidungen wie Haupt-/Wohnachse).
- **Poché-FÜLLUNGEN** (`derive/poche.ts`, #1a1a1a/#c9c9c9/…): nicht S1-Besitz,
  nicht Teil der Linien-Grau-Achse — unverändert.
- **Blatt-Chrome** (`BLATT.tinte` black, Text-Grau `#444`, Platzhalter
  #666/#bbb): Blattrahmen/Plankopf/Typografie sind nicht Plangrafik-Linien
  (Typografie = D4/S3-Revier) — unverändert.
- **Schwarzplan-Farben** (parzelle black, eigen #1a1a1a, nachbar #8a8a8a):
  D3 «Schwarzplan-Modul bleibt wie heute» — unverändert.
- **Umbau-Stifte** (#b3261e/#8a7500): SIA-Signalfarben, keine Grau-Achse —
  unverändert.

## 2 · Neue Linien: D2-Leibung (löst §11.3 «konturlose Lochungen»)

- Neue Weiche `abVorprojekt(phase)` im Stilblatt: wahr für vorprojekt,
  bauprojekt, baueingabe, werkplan — NICHT `fruehePhase()` (die umfasst
  vorprojekt und meint das Gegenteil).
- `deriveSection` liefert neu den Kanal `leibungen`: für JEDE Öffnung
  (Fenster UND Türen), die wie die Flügelsymbolik vollständig im
  Sichtbereich vor der Schnittebene liegt (0 < t ≤ depth an beiden Enden),
  das Öffnungsrechteck (4 Linien, Klasse `leibung`). Im Werkplan zusätzlich
  die Rahmenlinie: Innenrechteck mit Inset `rahmenbreite ?? 60`
  (`FENSTER_RAHMEN_DEFAULT_MM` aus `derive/scene.ts`), Klasse `rahmen`.
- Renderer (`plansvg.sectionInnerSvg`): Leibung Stift 0.25 (`STIFT.kante`),
  Rahmen 0.18 (`STIFT.fein`), Grau `GRAU.gesehen`, Linientyp voll —
  gezeichnet VOR der Flügelsymbolik. `SectionView.tsx` zeichnet denselben
  Kanal am Bildschirm (Theme-Tinte, Stilblatt-Bildschirmstifte).
- Ehrliche Grenzen (wie Flügelsymbolik-Bestand): keine Hidden-Line-
  Verdeckung gegen davorstehende Bauteile; GESCHNITTENE Öffnungen
  (t-Vorzeichenwechsel) erhalten KEINE Leibung (sie sind Schnitt, nicht
  Ansicht). Bei Fenstern mit Rahmenprofil (fensterTyp gesetzt) überzeichnet
  die Leibung die bestehenden Hidden-Line-Profilkanten deckungsgleich —
  bewusst in Kauf genommen (D2: «Standard für ALLE Öffnungen»).

## 3 · Regenerationsweg

Neu: `test/golden-helfer.ts` (`pruefeGolden`) — alle Golden-Assertions
laufen darüber. `GOLDEN_UPDATE=1 npx vitest run` (im Paket
`packages/kosmo-kernel`) schreibt die Goldens neu; ohne die Variable bleibt
der harte Byte-Vergleich. Bewusste Wechsel: regenerieren → `git diff`
Zeile für Zeile gegen die Erwartungsliste → svg-qa → volle Suite.

## 4 · Erwartungsliste (VOR der Regeneration geschrieben)

Legende: «Chrome bleibt» = Nordpfeil-/Plankopf-/Blattrahmen-Strokes
`black` bleiben black (BLATT.tinte, kein Plangrafik-Flip).

| Golden | Erwartung |
| --- | --- |
| `grundriss-testhaus.svg` | Alle Plangrafik-Strokes black→#111 (Wand-Poché-Kanten, Öffnungs-/Türsymbole, Bemassungsgruppe inkl. deren Text-Fill). Türbogen #555→#666. Chrome bleibt. Füllungen unverändert. |
| `grundriss-testhaus-wettbewerb.svg` | black→#111 (Ein-Poché-Kanten, Glaslinie, Leibungen, Bemassung); Poché-Füllung #1a1a1a unverändert. Kein Bogen (frühe Phase). Chrome bleibt. |
| `grundriss-testhaus-baueingabe.svg` | black→#111; Türbogen #555→#666; Füllungen (#c9c9c9 u.a.) unverändert. Chrome bleibt. |
| `grundriss-walmdach-flach.svg` | Dachkanten (First/Traufe/Ortgang/Grat) + Wände + Bemassung black→#111. Chrome bleibt. |
| `grundriss-satteldach-first.svg` | Wie walmdach: black→#111. Chrome bleibt. |
| `grundriss-satteldach-eg-darunter.svg` | black→#111, auch die gestrichelten «ueber-schnitt»-Traufenlinien (Kadenz 1.5-0.6-0.3-0.6 unverändert). Chrome bleibt. |
| `grundriss-kipp.svg` | black→#111 (Wände, Glaslinien, Kipp-Doppelstriche, Schiebe-Doppellinien, Leibungen, Bemassung). Chrome bleibt. |
| `grundriss-fenster-zweifluegel.svg` | black→#111; ZWEI Flügelbögen #555→#666. Chrome bleibt. |
| `grundriss-fensterband.svg` | black→#111 (Pfostentakt im Doppellinien-Band). Chrome bleibt. |
| `ansicht-sued-testhaus.svg` | Fassaden-Sichtkanten #111→#3A3A3A (Stift bleibt 0.35·14=4.9); Bodenlinie #777→#8a8a8a; Höhenkoten-Dreieck black→#111. KEINE Leibung (keine Öffnungen). Kein Chrome (rahmenloses Ansicht-SVG). |
| `ansicht-sued-satteldach.svg` | Wie ansicht-sued-testhaus. |
| `ansicht-fluegeltypen.svg` | #111→#3A3A3A (Fassade + Rahmenprofilkanten); Flügelsymbolik #333→#3A3A3A; Bodenlinie #777→#8a8a8a; Koten black→#111. NEU 32 Linien: 4 Fenster × (4 Leibung 0.25 + 4 Rahmen 0.18, Inset 60), alle #3A3A3A — Rahmen deckungsgleich mit bestehenden Profilkanten (bewusste Überzeichnung). |
| `ansicht-curtainwall.svg` | Wie fluegeltypen, aber ohne #333-Symbolik (kein fluegelTyp). NEU 8 Linien: 1 Fensterband-Öffnung × (4 Leibung + 4 Rahmen, rahmenbreite 60). |
| `schnitt-satteldach-querschnitt.svg` | Schnittkanten black→#111; Projektionen #444→#666; Schraffur #333→#3A3A3A; Bodenlinie #777→#8a8a8a; Koten black→#111. Keine Öffnungen → keine Leibung. |
| `schnitt-satteldach-baueingabe.svg` | black→#111; #444→#666; Bodenlinie #777→#8a8a8a (keine Schraffur in Baueingabe). |
| `schnitt-fenster-parametrisch.svg` | black→#111; #444→#666; Schraffur #333→#3A3A3A; Bodenlinie #777→#8a8a8a. KEINE Leibung: das Fenster wird von der Schnittlinie GESCHNITTEN (t-Vorzeichenwechsel an den Öffnungsenden). |
| `blatt-autofuellung.svg` | Platzierungen flippen: Grundriss/Schnitt black→#111, Schnitt-Projektionen #444→#666, Schraffur #333→#3A3A3A, Axo #111→#3A3A3A, Bodenlinie #777→#8a8a8a. UNVERÄNDERT: Situationsplan-Platzierung (D3), Blattrahmen/Plankopf (Chrome), Text-Grau-FILLS #444, Platzhalter #666/#bbb. Keine Öffnungen → keine Leibung. |
| `schwarzplan.svg` | UNVERÄNDERT (D3: Modul bleibt wie heute). |
| `schwarzplan-nachbarn.svg` | UNVERÄNDERT. |
| `abnahmeprotokoll.svg` | UNVERÄNDERT (Report-Modul, kein D1-Revier). |
| `ausnuetzungsnachweis.svg` | UNVERÄNDERT. |
| `bauablaufblatt.svg` | UNVERÄNDERT. |
| `kvblatt.svg` | UNVERÄNDERT. |
| `studienbericht.svg` | UNVERÄNDERT. |
| `interop-referenz-normalisiert.ifc` | UNVERÄNDERT (kein SVG). |

Erwartete Summe: **17 geänderte Goldens, 7 SVG + 1 IFC unverändert.**

## 5 · Offene Abweichungen von der Matrix (Eskalation an den Leiter)

1. Sichtkanten-Stift der reinen Ansicht: 0.35 statt Matrix-0.25 (Bestands-
   entscheid «sonst verschwindet die Fassade»). Entscheid nötig, ob ein
   weiterer bewusster Wechsel auf 0.25 folgen soll.
2. Linientyp-Kadenzen nicht auf das Matrix-Vokabular normalisiert (s. §1).
3. Grundriss-Projektionsregionen (Treppe/Decke/Volumen/Zone, Klasse
   `projection`) zeichnen weiterhin im geschnitten-Ton (#111, Stift 0.18):
   die Ton-Trennung je Region braucht eine Klassen-Weiche im Renderer,
   nicht nur einen Token-Flip — Kandidat für die volle Tripel-Deklaration
   (S4-Koordination nötig, plan.ts-Klassenlogik).
4. Schraffur-Ton = «gesehen» (#3A3A3A) statt #111 — Urteilsentscheid, s. §1.
5. Poché-Füllung «schwarz» bleibt #1a1a1a (poche.ts, fremdes Revier) neben
   neu #111-Kanten — minimal hellere Kante auf dunklerer Füllung, visuell
   unauffällig; Vereinheitlichung wäre poche.ts-Arbeit.

## 6 · Ist-Vergleich nach Regeneration (12.07.2026)

**Erwartung vs. Ist: exakt getroffen — 17 geänderte Goldens, 7 SVG + 1 IFC
unverändert** (`schwarzplan*`, alle Report-Goldens, IFC-Referenz: kein Byte
Diff). Maschineller Zeile-für-Zeile-Abgleich: jede entfernte Diff-Zeile
bildet sich unter GENAU der Flip-Tabelle aus §1 (black→#111 · #111→#3A3A3A ·
#444→#666 · #333→#3A3A3A · #777→#8a8a8a · #555→#666, plus fill
black→#111 der Koten/Bemassung) 1:1 auf eine hinzugefügte Zeile ab —
**0 unerklärte Entfernungen über alle 17 Dateien**; keinerlei
Geometrie-/Koordinatenänderung.

Echte Neuzeilen: **genau 40**, alle D2-Leibung:

- `ansicht-fluegeltypen.svg`: 32 Linien = 4 Fenster × (4 Leibung
  stroke-width 3.5 = 0.25·14 + 4 Rahmen 2.52 = 0.18·14, Inset 60 mm),
  alle `#3A3A3A` — wie erwartet deckungsgleich mit den bestehenden
  Rahmenprofilkanten.
- `ansicht-curtainwall.svg`: 8 Linien = 1 Fensterband-Öffnung × (4 Leibung
  3.5 + 4 Rahmen 2.52), Band 5150–12850 / −800…−2700 (Brüstung 800,
  Sturz 300) — plausibel.
- Wie erwartet KEINE Leibung in `ansicht-sued-*` (keine Öffnungen),
  `schnitt-fenster-parametrisch` (Öffnung wird geschnitten),
  `blatt-autofuellung` (Fixture ohne Öffnungen).

Invarianten-Stichproben (Ist): `grundriss-testhaus.svg` = 21×#111 + 1×#666
(Türbogen) + 2×black (Chrome: Nordpfeil/Plankopf) ✓ ·
`ansicht-sued-testhaus.svg` = 21×#3A3A3A + 1×#111 (Kote) + 1×#8a8a8a
(Bodenlinie) ✓ · `blatt-autofuellung.svg` = 139×#3A3A3A (115 Schraffur +
24 Axo), 25×#666 (24 Schnitt-Projektionen + 1 Platzhalter), 4×black
(Blattrahmen, Plankopf ×2, Situationsplan-Parzelle strichpunktiert),
Text-Grau-Fills #444 6× und Situationsplan-Fill #1a1a1a erhalten ✓.

Zwei Unit-Tests prüften die alten Literale und wurden bewusst mitgezogen
(kein Golden, reine Matcher-Strings): `kernel.test.ts` «Möbel-Phasen»
(`stroke="black"`→`#111`) und «Koten roh/fertig»
(`fill="black" stroke="black"`→`#111`).

**Gates:** svg-qa `npx tsx tools/svg-qa/pruefe-goldens.mts` → Exit 0,
24 Goldens geprüft, 0 harte Fehler, 1 Text-Overlap-Warnung (bekannter
Bestand `abnahmeprotokoll.svg`, im Tool-Kopf dokumentiert) ·
`npm test -w @kosmo/kernel` 728/728 grün · App-Suite 847/847 grün ·
Typecheck aller Workspaces grün.
