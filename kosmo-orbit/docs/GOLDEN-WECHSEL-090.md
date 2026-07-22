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

## Teil 2: Ist-Nachweis (erledigt 22.07.2026, Fable)
**Ist == Prognose: exakt 1 bewegte Golden-Datei** (`masskette-plan.svg`);
Kernel-Suite VOR dem Refresh mit genau EINEM Rotfall (dem Golden-Test),
1179/1180 grün — kein Hard-Stop nötig. Eindeutige Dateimenge des Zugs: 1
(keine Überschneidungen möglich). Aggregat (Rezept aus Teil 1): vorher
`fece758e9b0a89ec…`, nachher `c11f6d448327ba04…`. Umsetzung wie
deklariert: `derive/plan.ts` liefert strukturierte `massketten`
(Messpunkte + formatiertes Mass, Daten-Guard unverändert, Messpunkte in
den Bounds), `derive/plansvg.ts planInnerSvg` zeichnet massstabsbewusst
— Masslinie 8 Papier-mm von den Messpunkten abgerückt,
Verlängerungslinien je Punkt mit 1 mm Luftspalt und 2 mm Überstand,
Label 1.5 mm über der Masslinie; Seitenwahl feste +90°-Normale
(revidierbarer Fable-Entscheid, im Code dokumentiert). Test-Gerüst
deklariert mitgezogen: masskette.test.ts auf `plan.massketten` migriert,
drei PlanGraphic-Literale in dxf-Tests um das Pflichtfeld ergänzt.
Sichtung: masskette-plan vorher/nachher als PNG gerendert und von Fable
geprüft (vorher nackte Linie AUF den Punkten, nachher abgerückte
Masslinie mit Verlängerungslinien an allen drei Kettenpunkten, Masse
über der Linie; Plankopf/Umgebung unverändert). Suiten: Kernel
1180/1180, App 1758/1758, svg-qa Exit 0, Typecheck 0. Bekannter,
BEWUSST offener Folgeteil: der Bildschirm-Spiegel in PlanView (zeichnet
die Entität eigenständig, Cluster B) zieht im E-K27a-Paket nach —
golden-neutral, kein Teil dieses Zugs.
