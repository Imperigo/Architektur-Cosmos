# Die Kette — vom Raumprogramm zum Massivhaus in vier Klicks

> Owner-Anleitung, Stand 03.07.2026 (ROADMAP 48–85). Alles hier läuft offline
> und ist ein Undo-Schritt pro Klick. Kosmo kann jeden Schritt auch per
> Sprache fahren — die Command-Namen stehen jeweils dabei.

## Schnellstart: «Demo laden»

Der schnellste Weg, alles zu sehen: **Zentrale → Demo laden**. Neben der
TKB-Bibliothek steht der **Wohnhof** — ein per Kette generiertes EG mit
Treppenhaus, Wohnungen, Möbeln, massiven Wänden und gestanzten Fenstern.
Von dort: 2D-Ansicht, «Graph»-Knopf (Topologie), Liste-Panel (Kennzahlen),
oder EG mit **⧉** stapeln.

## Die Kette von Hand

1. **Raumprogramm** — Liste-Panel («Liste» in der Werkzeugleiste):
   HNF-Soll je Wohnungstyp eintippen oder **CSV importieren**
   (Wettbewerbs-Beilage direkt, Typnamen werden tolerant erkannt).
   *Kosmo: `design.raumprogrammSetzen`*

2. **Korridor + Geschossfläche zeichnen** — Zone-Werkzeug: eine grosse
   Zone als Footprint, eine schmale mit Raumtyp «korridor» als Erschliessung.
   Beim Ziehen zeigt die Hinweisleiste live die m².

3. **Wohnungen schneiden** — Liste-Panel, Sektion «Wohnungen schneiden»:
   Checkbox **Kern** an (reserviert Treppenhaus samt Lauf und Tür),
   **Vorschlag** → Slider für Min-Breite/Wohnungsgrösse rechnen sofort neu,
   Mix-Erfüllung und Diagnose zeigen ehrlich, was nicht passt →
   **Übernehmen** (1 Undo).

4. **Grundrisse füllen** — jede Wohnung bekommt Zimmer + Möbel + Türen:
   Zuerst prüft die **Plan-Library** (gespeicherte Muster-Wohnungen, deren
   Name den Typ enthält — sie decken gedreht/gespiegelt alle 8 Lagen ab),
   sonst das **CH-Rezept v2** (Eingangsband Diele/Bad/Küche, interner Flur
   ab 2 Zimmern, Wohnen + Zimmer an der Fassade).
   *Kosmo: `design.grundrissGenerieren`; Vorlagen: `design.vorlageSpeichern/Setzen`*

5. **Wände bauen** — Raumkanten werden echte Wände: innen IW KS 10,
   Wohnungsgrenzen automatisch **TW KS 20 (Schallschutz)**, aussen AW;
   Zonentüren werden echte Türöffnungen. *Kosmo: `design.waendeAusZonen`*

6. **Fenster stanzen** — das im **Modul-Editor** gezeichnete Fassadenmodul
   (Studien-Panel → «Editor»: Fenster/Paneele aufziehen) rastert die
   Aussenwände und stanzt echte Fensteröffnungen — die Tageslicht-Checks
   werden grün. *Kosmo: `design.fensterAusModulen`*

7. **Stapeln** — **⧉** beim Geschoss-Umschalter kopiert das Regelgeschoss
   samt allem nach oben (Treppenhaus deckungsgleich); Kennzahlen und
   Berechnungsliste wachsen mit. *Kosmo: `design.geschossKopieren` (bis ×20)*

## Wächter, die immer mitlaufen

- **Berechnungsliste**: ausgezogen vs. Ziel je Typ, %-Erfüllung, Δ Max —
  mit gesetzter **Zonenregel** (`design.zonenRegelSetzen`, Katalog ZG/LU)
  ist das Maximum rechtlich verankert (AZ × Parzellenfläche).
- **Grundriss-Checks**: Raumregeln (Preset «CH-Wohnbau»), Tageslicht,
  SIA-500-Bewegungsflächen der Möbel, Fluchtweg über den Raumgraph
  (Türen zählen echt), Grenzabstände, Zonenhöhe/-geschosse.
- **Standort** (Sonne-Panel): Adresse suchen → echte Koordinaten für die
  Schattenstudie, AV-Parzelle als Zone; einmal geholt, offline im Projekt.

## Ausgabe

- **Werkplan**: Grundriss-SVG/PDF mit Poché, Türanschlägen, gestanzten
  Fenstern, Bemassung (mm hochgestellt), Nordpfeil, SIA-Plankopf.
- **IFC**: Wände, Öffnungen (jedes Fenster ein echtes Void), Räume als
  IfcSpace, Möbel als IfcFurnishingElement.
- **Elementliste** (Fassaden-Module): CSV mit Eckenregel, Passstücken und
  Wiederholungsgrad; Module je Fassade zuweisbar.
- **KosmoVis**: der finale Render-Prompt zeigt Materialien + Fassadenraster
  und ist überschreibbar.

## Ehrliche Grenzen (Stand heute)

- Generator kann nur **achsparallele Rechteck-Wohnungen**; Schrägen werden
  gemeldet und übersprungen.
- Zonen bleiben als Flächen liegen (SIA-Zahlen kommen aus den Zonen, nicht
  aus den Wandachsen) — bewusst, damit Kennzahlen stabil bleiben.
- Wohnungs-Trennwand «TW KS 20» ist ein Richtwert-Aufbau, kein Nachweis.
- Fluchtweg ist pro Geschoss gerechnet (keine vertikale Verkettung).
