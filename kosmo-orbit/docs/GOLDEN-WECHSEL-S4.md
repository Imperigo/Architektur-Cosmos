# Golden-Wechsel S4 — D2/D3/D6 (v0.7.3, Stream S4)

Nach dem Muster von `docs/GOLDEN-WECHSEL-D1.md`: Erwartungsliste VOR der
Regeneration, Ist-Abgleich danach. Anders als die zwei dokumentierten
**Sammelwechsel** (D1, D4 — Grundsatz 4 der `V073-GESTALTUNG-SPEZ.md`) ist
dies **kein** Sammelwechsel: es ist der reguläre S4-Auftrag, der genau EIN
bestehendes Golden verfeinert (`ansicht-fluegeltypen` v2, D2) und VIER neue,
additive Goldens einführt (D3 ×3, D6 ×1). „Alt-Goldens ändern nie" bleibt
gewahrt — alle 23 SVG- + 1 IFC-Golden ausserhalb dieser 4 bleiben
unangetastet (s. Abschnitt 4, Beweis nach Regeneration).

## 1 · Was ändert sich (Code) — Zusammenfassung

- **D2** (`derive/section.ts`, `derive/plansvg.ts`, `model/entities.ts`,
  `commands/design.ts`, `Inspector.tsx`):
  - Schiebe-Doppelpfeil in der Ansicht spannt neu die **volle Flügelbreite**
    (vorher auf `min(0.7×Breite, 400mm)` gekappt — auf einem 1600mm breiten
    Fenster war das ein winziger Pfeil in der Mitte statt der SIA-üblichen
    Vollbreiten-Konvention, Soll 3a).
  - Neues additives Feld `Opening.oeffnetNachAussen?: boolean`. Durchgezogen
    (Default/`false`) = öffnet zum Betrachter (innen); gestrichelt (Kadenz
    **2–1 mm**, lokal in `plansvg.ts` deklariert — **nicht** in
    `derive/stilblatt.ts`, das bleibt S1-Revier) = öffnet weg (aussen).
    Gilt für JEDE Flügellinie der Öffnung (Dreh/Kipp/Drehkipp/Schiebe
    gleichermassen).
  - Dreh/Kipp/Drehkipp waren bereits Eckpunkt→Eckpunkt über die volle
    Flügelfläche (verifiziert vor der Änderung, s. Abschnitt 5) — dort war
    keine Geometrieänderung nötig, nur die neue Strichelung.
- **D3** (`derive/plan.ts`, `derive/plansvg.ts`): Zonen mit `zonenArt`
  tragen neu eine `zone-<art>`-Klasse; `planInnerSvg` rendert
  `zone-nachbar`/`zone-parzelle` über eine **neue, reine Funktion**
  `nachbarKontextStufe(phase)` (`derive/plan.ts`) — Wettbewerb/Vorprojekt
  gefüllt `#C9C9C9` (Stilblatt-Token `UMBAU_FLAECHEN.bestand`,
  wiederverwendet statt neu erfunden), Bauprojekt/Baueingabe nur Umriss
  0.18 `#8A8A8A` (`GRAU.kontext`), Werkplan aus. Parzelle: **in jeder
  Phase** strichpunktiert 0.35 (dieselben Token wie `baugrenze`). Das
  Schwarzplan-Modul (`derive/schwarzplan.ts`) ist unverändert (D3: „bleibt
  wie heute").
- **D6** (`derive/plan.ts`, `derive/plansvg.ts`, `dxf/export.ts`,
  `model/entities.ts`, `commands/design.ts`, `Inspector.tsx`): additive
  Opening-Felder `band?`/`griffseite?`/`antrieb?`/`absturzsicherung?`, neuer
  Command `design.beschlagSetzen`, sechs Katalogsymbole NUR im Werkplan
  (Daten-Guard `hatBeschlag()`), BRH aus `sill` etikettiert (kein eigenes
  Feld), Schiebe-Lauf aus `fluegelTyp === 'schiebe'` (kein eigenes Feld),
  neuer DXF-Layer `BESCHLAG` (aci 5, Regel vor `'symbol'`).

## 2 · Erwartungsliste (VOR der Regeneration geschrieben)

| Golden | Erwartung |
| --- | --- |
| `ansicht-fluegeltypen.svg` | **Einziges geändertes Alt-Golden.** Zwei Effekte, sonst nichts: (1) die Schiebe-Fensterlinien (rechtestes Fenster, `fluegel-schiebe`) verschieben sich — Schaft + beide Pfeilspitzenpaare spannen jetzt die volle 1600mm-Breite statt der alten 400mm-Kappung; (2) die BEIDEN `fluegel-kipp`-Linien des Kipp-Fensters (zweites von links) bekommen `stroke-dasharray="28 14"` (= `[2,1]×14`), IHRE Koordinaten/Farbe/Stift bleiben unverändert. Die Dreh-, Drehkipp- (dessen `fluegel-kipp`-Linien bleiben OHNE Dasharray) und Leibungs-/Rahmen-Linien bleiben zeilenidentisch. |
| `grundriss-kontext-wettbewerb.svg` | NEU. Testhaus 8×6 + Parzelle (strichpunktiert 0.35) + 2 Nachbar-Footprints GEFÜLLT `#c9c9c9` (Stift 0.18 `#8a8a8a`). |
| `grundriss-kontext-baueingabe.svg` | NEU. Gleiche Fixture, Phase `baueingabe`: Nachbarn nur Umriss (`fill="none"`) 0.18 `#8a8a8a`, Parzelle weiterhin strichpunktiert. |
| `grundriss-kontext-werkplan.svg` | NEU. Gleiche Fixture, Phase `werkplan` (Default): Nachbarn erscheinen NICHT im SVG (Stufe `'aus'`), NUR die Parzellenlinie bleibt. |
| `werkplan-beschlag.svg` | NEU. Testhaus 16×6 mit 4 Fenstern: Fenster 1 (Band links + Griffseite rechts + BRH 90), Fenster 2 (Schiebe-Lauf aus `fluegelTyp:'schiebe'` + Motorantrieb „M"+ BRH 90), Fenster 3 (Absturzsicherung + BRH 90), Fenster 4 OHNE jegliches Beschlag-Feld → KEINE Katalogsymbole (Daten-Guard-Beweis, nur die üblichen Fenster-/Leibungslinien). |

**Alle anderen 23 SVG- + 1 IFC-Golden: byte-identisch** (kein D2/D3/D6-Pfad
berührt ihre Fixtures — Beweis in Abschnitt 4 nach der Regeneration).

## 3 · Additiv, kein Sammelwechsel-Bruch

Die drei `grundriss-kontext-*` und `werkplan-beschlag` sind **komplett neue**
Goldens (neue Fixtures `testhausMitKontext`/`testhausBeschlag`,
`test/fixtures.ts`) — sie ersetzen nichts Bestehendes und verletzen darum
„Alt-Goldens ändern nie" nicht. `ansicht-fluegeltypen` ist ein **bewusster
v2-Wechsel** dieses EINEN Goldens (die Fixture `testhausFluegeltypen()`
bekommt eine zusätzliche `oeffnetNachAussen:true`-Zeile auf dem
Kipp-Fenster, s. `test/fixtures.ts`) — dokumentiert, mit Erwartungsliste vor
der Regeneration wie hier. Kein zweiter „Sammelwechsel" im Sinne von
Grundsatz 4 (die zwei dort reservierten Sammelwechsel bleiben D1 und D4).

## 4 · Regenerationsweg

```
cd packages/kosmo-kernel
GOLDEN_UPDATE=1 ../../node_modules/.bin/vitest run
git status --porcelain -- test/golden
git diff --stat -- test/golden
git diff -- test/golden/ansicht-fluegeltypen.svg
```

## 5 · Ist-Vergleich nach Regeneration (12.07.2026)

**Erwartung vs. Ist: exakt getroffen.** `git status --porcelain -- test/golden`
zeigt genau die vorab erwartete Menge — **1 geändert, 4 neu, 0 sonst**:

```
 M packages/kosmo-kernel/test/golden/ansicht-fluegeltypen.svg
?? packages/kosmo-kernel/test/golden/grundriss-kontext-baueingabe.svg
?? packages/kosmo-kernel/test/golden/grundriss-kontext-werkplan.svg
?? packages/kosmo-kernel/test/golden/grundriss-kontext-wettbewerb.svg
?? packages/kosmo-kernel/test/golden/werkplan-beschlag.svg
```

**`ansicht-fluegeltypen.svg` — Zeile-für-Zeile-Diff, 0 unerklärte Änderungen:**

- Zwei entfernte/hinzugefügte Zeilenpaare bei den `fluegel-kipp`-Linien des
  Kipp-Fensters: **identische Koordinaten/Farbe/Stift**, einzige Änderung
  `stroke-dasharray="28 14"` (= `[2,1]×14`, `FLUEGEL_AUSSEN_DASH`) neu
  angehängt — exakt wie erwartet (Kipp-Fenster trägt `oeffnetNachAussen:
  true`).
- Fünf entfernte/hinzugefügte Zeilenpaare bei den `fluegel-schiebe`-Linien:
  Schaft `17000/17400` → `16400/18000` (spannt jetzt die volle 1600mm statt
  der alten 400mm-Kappung), beide Pfeilspitzenpaare entsprechend verschoben
  — Farbe/Stift unverändert, reine Koordinatenverschiebung.
- Dreh-, Drehkipp- (dessen `fluegel-kipp`-Linien bleiben bewusst OHNE
  Dasharray — nur das Kipp-Fenster trägt `oeffnetNachAussen`) und alle
  Leibungs-/Rahmen-/Fassaden-/Koten-Zeilen: **byte-identisch**, kein Diff.

**Die vier neuen Goldens** (Stichprobe, s. Abschnitt 2 für die volle
Erwartung): `grundriss-kontext-wettbewerb.svg` trägt 2× `fill="#c9c9c9"
stroke="#8a8a8a"` (Nachbarn gefüllt); `grundriss-kontext-baueingabe.svg`
trägt dieselben 2 Nachbar-Umrisse nur mit `stroke="#8a8a8a"`, KEIN
`#c9c9c9`-Fill; `grundriss-kontext-werkplan.svg` enthält **keinen**
`#8a8a8a`-Stroke mehr (Nachbarn ganz weg) — in allen drei bleibt exakt EINE
`stroke-dasharray="300 90 60 90"`-Linie (Parzelle, unverändert über alle
Phasen). `werkplan-beschlag.svg` zeigt drei `BRH 90`-Etiketten (Fenster 1–3)
+ ein `M`-Etikett (Fenster 2, Motorantrieb) und KEIN Beschlag-Symbol beim
vierten Fenster (Daten-Guard-Beweis).

**Invarianten-Beweis (Schutzliste):** `git status --porcelain -- test/golden`
zeigt keine der anderen 23 SVG- + 1 IFC-Golden — Beweis, dass D2/D3/D6 keinen
fremden Golden-Pfad berühren.

## 6 · Gates (ehrlich)

- `../../node_modules/.bin/vitest run` (Kernel, volles Paket): **747/747
  grün**, 33 Testdateien (inkl. der 2 neuen `grundriss-kontext.test.ts` und
  `werkplan-beschlag.test.ts` sowie der erweiterten `fluegeltyp.test.ts`).
- Gezielt `fluegeltyp fenster schwarzplan blattfuellung dxf-export
  grundriss-kontext werkplan-beschlag`: **113/113 grün** (7 Dateien).
- `npx tsx tools/svg-qa/pruefe-goldens.mts`: **Exit 0**, 28 Goldens geprüft
  (24 Alt + 4 neu), **0 harte Fehler**, 1 Text-Overlap-Warnung (bekannter
  Bestand `abnahmeprotokoll.svg`, im Tool-Kopf dokumentiert — unverändert).
- `../../node_modules/.bin/tsc --noEmit -p tsconfig.json` (Kernel):
  **sauber, keine Ausgabe**.
- App-weiter Typecheck (wegen `Inspector.tsx`): NICHT von mir gefahren
  (Leiter-Gate laut Auftrag) — `Inspector.tsx` folgt bewusst dem
  bestehenden `FensterAbschnitt`-Muster (native `<input type="checkbox">`
  für Booleans wie an anderen Stellen der App, konditionale Spreads für
  `exactOptionalPropertyTypes`, keine neuen Abhängigkeiten).

## 7 · Grundsatzfragen / offene Punkte (Eskalation an den Leiter)

1. **D2 innen/aussen-Datenquelle:** Es gab bislang **kein** Feld, das die
   Öffnungsrichtung (innen/aussen) trägt — `swing` ist die Anschlag-
   /Bandseite, nicht die Öffnungsrichtung. Ich habe additiv
   `Opening.oeffnetNachAussen?: boolean` ergänzt (Default/fehlend =
   `false` = innen = durchgezogen, konservativ). Zod in
   `commands/design.ts` (`design.fensterParametrieren`), Inspector-Checkbox
   in `FensterAbschnitt`. Golden-Wechsel entsprechend dokumentiert (§5).
2. **D3 / PlanView.tsx-Eingriff:** Die Spec verlangt, dass der
   PlanView-`plan-kontext`-Layer (Live-Plan) **erstmals die Phasen-Weiche**
   bekommt. `PlanView.tsx` ist **nicht mein Besitz** (S1-Revier). Ich habe
   die volle Stufen-Logik als reine, exportierte Funktion
   `nachbarKontextStufe(phase)` in `derive/plan.ts` bereitgestellt (auch
   vom Druckweg `plansvg.ts` genutzt) — **aber `PlanView.tsx` selbst liest
   seine Kontext-Zonen bislang NICHT über `derivePlan`, sondern direkt aus
   dem Doc** (eigener Overlay, Kommentar dort: „fliessen nicht durch
   derivePlan"). Die Live-Ansicht zeigt Nachbarn also weiterhin **immer**
   gefüllt (unverändertes Bestandsverhalten), unabhängig von der Phase —
   nur der Druck-/SVG-Export (`planToSvg`/`planInnerSvg`) hat die volle
   LOD-Treppe. **Das ist eine Grundsatzfrage für den Leiter/S1**: entweder
   S1 verdrahtet `nachbarKontextStufe()` in `PlanView.tsx` nach, oder der
   Live-Plan bleibt bewusst bei der heutigen «immer sichtbar»-Konvention
   (auch vertretbar: «gerade weit rausgezoomt ist der Kontext das Thema»,
   Bestandskommentar dort). Ich habe `PlanView.tsx` NICHT angefasst.
3. **D6 Beschlag-Geometrie ist eine ehrliche Vereinfachung (S0):** die
   Katalogsymbole sind Linien-/Text-Piktogramme (keine echten Kreise) neben
   der Öffnung im Grundriss — näherungsweise an Soll 7b angelehnt, nicht
   pixelgenau nachgebaut (S0-Minimalstufe, „Ehrlichkeit vor Politur").
4. **IFC-Abbildung Beschlag:** bewusst vertagt, s. `docs/INTEROP.md` §6
   Zeile 8.
5. **`ansicht-curtainwall.svg`** trägt kein `fluegelTyp` (vorab geprüft,
   `fenster.test.ts`/`fixtures.ts`) — bleibt darum unberührt von D2, wie
   erwartet.
