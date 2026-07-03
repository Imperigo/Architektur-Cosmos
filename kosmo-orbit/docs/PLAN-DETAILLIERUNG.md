# Plan-Detaillierung nach SIA-Phase

> Owner-Auftrag 03.07.2026: «erfasse auch den detaillierungsgrad in den plänen
> je nach bauphase sia … nutze meine hochbauzeichnerlehrhefte».
>
> **Quellenlage, ehrlich:** Die Hochbauzeichner-Lehrhefte liegen in der
> OneDrive-Bibliothek, die aus diesem Container nicht erreichbar ist (kein
> Tenant-Login ohne HomeStation). Dieses Regelwerk ist darum nach
> SIA-102-Phasenlogik und der üblichen Hochbauzeichner-Konvention
> (Plandarstellung nach Massstab/Phase) aufgesetzt — als **lebendes, im Repo
> korrigierbares Dokument**. Sobald die Lehrhefte über KosmoPrepare
> aufgenommen sind (OneDrive-Anbindung existiert in der App), gleicht Kosmo
> diese Tabelle gegen die Originale ab («quellen_suchen» zitiert dann direkt
> aus den Heften) und wir schärfen die Regeln nach.

Die Phase ist eine **Projekteinstellung** (`DocSettings.phase`, Command
`design.phaseSetzen` — auch für Kosmo per Sprache) und wirkt überall gleich:
App-Grundriss, Schnitt/Ansicht, Druck-SVG/PDF, Plankopf.

## Regelwerk (implementiert)

| Element | Vorprojekt (SIA 31) · 1:200/1:500 | Bauprojekt (SIA 32/33) · 1:100 | Werkplan (SIA 51) · 1:50/1:20 |
|---|---|---|---|
| **Wände im Grundriss** | EIN Poché über die Gesamtdicke, keine Schichten | Schichten getrennt: Tragschicht dunkel, Dämmung hell | wie Bauprojekt (Leibungs-/Anschlagdetail folgt) |
| **Fenster** | Aussparung + EINE Glaslinie | Leibungen + zwei Glaslinien | wie Bauprojekt |
| **Türen** | Aussparung ohne Symbol | Flügel + 90°-Schwenkbogen | wie Bauprojekt |
| **Schnitt-Poché** | einheitlich grau, ein Face je Bauteil | Material-Tönung je Schicht (Bänder), ohne Strichschraffur | volle SIA-Materialschraffur (Beton-Diagonale, Dämmwellen, Holz-Kreuz …) |
| **Bemassung** (Kopplung im Phase-Select; via «Masse» übersteuerbar) | nur Gesamtmasse | Öffnungs- + Gesamtketten | zusätzlich Innenketten auf den Innenwand-Achsen |
| **Höhenkoten** | an | an | an |
| **Plankopf** | «Vorprojekt (SIA 31)» | «Bauprojekt (SIA 32/33)» | «Werkplan (SIA 51)» |

Default eines neuen Projekts: **Werkplan** (volle Detaillierung = bisheriges
Verhalten; nichts wird still reduziert).

## Offen (nach Lehrheft-Abgleich zu schärfen)

- Möblierung/Sanitärsymbolik je Phase (heute nicht Teil des Modells).
- Leibungs-/Anschlagdetail der Fenster im Werkplan (Anschlagtiefe zeichnen).
- Massstabs-Automatik: Phase-Wechsel könnte den Blatt-Massstab vorschlagen
  (1:200/1:100/1:50) — bewusst noch Handarbeit.
- Bodenaufbau-/Deckenränder im Schnitt (Werkplan zeigt Beläge getrennt).
