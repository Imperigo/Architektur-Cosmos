# GOLDEN-WECHSEL 090 — Teil 1: Prognose (VOR der Landung)

**Der EINE deklarierte Golden-Zug von v0.9.0** (Owner-Entscheid 22.07.:
Zweitstrang K18): Massketten bekommen default Verlängerungslinien und
einen gesunden Abstand zur verlinkten Kante (Registertext K18 wörtlich,
docs/OWNER-KORREKTUREN-2026-07.md Z.205ff). Ausgangsbestand: **40
Golden-Dateien** (39 SVG + 1 IFC), svg-qa 39/0, Stand ROADMAP 601.

## Prognose

**Es bewegt sich exakt EINE Datei: `masskette-plan.svg`.**
Beleg VOR der Änderung (22.07.): die MassKette-Ableitung trägt seit
v0.8.3 E2 einen Daten-Guard (`derive/plan.ts:1069–1074` — Linien NUR,
wenn eine `masskette`-Entität im Geschoss existiert; «keines der 35
Bestands-Fixtures hat eine masskette-Entität»), und der einzige
Golden-Test, der eine MassKette-Entität anlegt, ist
`test/masskette.test.ts` (pruefeGolden Z.262 → masskette-plan.svg;
grep-belegt: kein weiterer kernel-Test kombiniert masskette+Golden;
verschieben-symmetrie.test.ts nutzt masskette ohne Golden). Alle übrigen
38 SVG + 1 IFC bleiben byte-still — jede weitere Bewegung ist
Sanktion 1 (V090-SPEZ).

## Entwurfsentscheid (deklariert)
Heute rendert die MassKette als nackte Linie AUF den geklickten Punkten
mit Mittellabel (`plan.ts:1075–1086`). Neu: die Masslinie rückt um einen
gesunden, PAPIER-bezogenen Abstand von der verlinkten Kante ab, je
Messpunkt läuft eine Verlängerungslinie vom Punkt zur Masslinie (mit
kleinem Luftspalt am Punkt). Weil der Abstand papierbezogen ist, braucht
der Renderer den Massstab — darum wandert die MassKette-Darstellung von
den generischen `lines`/`texte` in einen strukturierten
PlanGraph-Anteil, den `plansvg.ts` massstabsbewusst zeichnet (exakte
Masse — Abstand/Überstand/Luftspalt — werden beim Bau am Bestand
entschieden und im Teil 2 dokumentiert; die PROGNOSE der bewegten
Dateien hängt nicht davon ab). Undo/Commands/Entität bleiben unberührt.

## Methode (wörtlich wie 0812, inkl. Abnahme-Lehren)
Aggregierte Prüfsumme vorher/nachher mit dokumentiertem Rezept:
`cd packages/kosmo-kernel/test/golden && sha256sum *.svg *.ifc |
sha256sum` (Hash über die sha256sum-Textliste). Ablauf: diese Prognose →
Änderung → Kernel-Suite (erwarteter Rotfall: NUR masskette-plan) →
Ist==Prognose sonst Hard-Stop mit Analyse VOR jedem Refresh →
GOLDEN_UPDATE-Refresh → PNG-Sichtung vorher/nachher durch Fable →
Teil 2 mit Ist-Nachweis, eindeutiger Dateimenge (hier trivial: 1) und
beiden Aggregat-Hashes → EIN Commit.

## Teil 2: Ist-Nachweis
_(beim K18-Commit auszufüllen)_
