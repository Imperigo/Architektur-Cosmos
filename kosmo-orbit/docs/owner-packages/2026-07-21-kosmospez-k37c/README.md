# KosmoSpez — UI-Sprache K37c · Übergabe-Package

**Stand:** 21.07.2026 · **Auftrag:** K37c (Owner-Register `OWNER-KORREKTUREN-2026-07.md`)
**Grundlage:** `KOSMOSPEZ-CLAUDEDESIGN-PROMPT.md` (Brief), `KOSMOSPEZ-KONZEPT.md` (K37a),
`GESTALTUNGSKONZEPT.md` (Werkplan-Tokens), `KOSMOSPEZ-OSS-RECHERCHE.md` (K37b).

## Inhalt

| Datei | Inhalt |
|---|---|
| `K37c-1_UI-Sprache.html` | Blatt 1: Haltung/Moodboard · Stationsfarbe · Falschfarben-Token · Badge-/Klassen-System · Typo · Antworten auf die 5 Fragen (standalone, offline lauffähig) |
| `K37c-2_Screens.html` | Blatt 2: Ikonografie (17 Werkzeug-Symbole + Stationssymbol) · 7 Schlüssel-Screens 1920×1148 in PAPIER und KOSMOS (standalone, offline lauffähig) |
| `README.md` | dieses Dokument — Token-Tabellen maschinenlesbar |

## Token-Erweiterung (additiv zu `kosmo-ui/src/aura.css`)

### Stationsfarbe KosmoSpez

| Token | Papier | Kosmos | Verwendung |
|---|---|---|---|
| `--spez-station` | `#9C84C4` | `#B4A0DB` | Stationspunkt, aktive Werkzeuge, Auswahl, Primär-Aktion |
| `--spez-station-ink` | `#6B5691` | — | Linien/Text auf hellem Grund |

**Regel:** Die Stationsfarbe navigiert, die Ergebnisfarben messen — Violett erscheint NIE in einer Falschfarben-Skala.

### Falschfarben-Skalen (5 Stützwerte, Stufe 0 = Grund der Welt)

Regel: die Skala steigt immer vom Grund weg — auf Papier dunkelt sie ein, im Kosmos glüht sie auf. Reihenfolge/Beschriftung identisch. Auf dem Plan: multipliziert UNTER der Tusche, Deckkraft 80 %, 1px-Isolinien an den Legendenstufen. Zwei Darstellungsgrade: kontinuierlich (Bildschirm) und gestuft/gerastert (Druck, grobe Datenlage).

| Token | Einsatz | Papier (20/40/60/80/100 %) | Kosmos |
|---|---|---|---|
| `--spez-seq-sonne` | Sonnenstunden, Einstrahlung, Überhitzung (h, kWh/m²) | `#F0E2BA #E2B95A #C9822F #A04A28 #6B2A22` | `#46351B #8A5F25 #C08630 #E3A83E #F6CC71` |
| `--spez-seq-licht` | Lux, Tageslichtfaktor (lx, DF %) | `#E4E7DC #AFCDBD #6BA491 #337165 #1B4547` | `#1F2E2B #2F5B50 #478574 #6FB39A #A8DEC2` |
| `--spez-div-komfort` | UTCI kalt↔behaglich↔heiss (°C UTCI) | `#3F5F8F #8FA6BF #E9E4D8 #CE9C66 #AF4E33` | `#8FB4E8 #51719B #272C34 #A06B3C #E08A5A` |

### Verlässlichkeitsklassen

| Klasse | Bedeutung | Papier | Kosmos |
|---|---|---|---|
| A | validierte Engine, normnaher Einsatz | `#3F6B54` | `#86C2A3` |
| B | validierte Engine, vereinfachtes Modell | `#A3761F` | `#D9AE54` |
| C | Näherung/Experiment — erzwingt Bestätigungsdialog vor Export | `#A93C30` | `#E07B63` |

v1-Zuordnung: Klimasteckbrief A (mit Pflicht-Hinweis «keine SIA-2028-Normdaten») · Tageslicht-DF A/B · Sonnenstudie B · UTCI B · Thermik B.

### Badge («Werkplan-Stempel»)

- Wortlaut: **«ENTWURFSMITTEL — NICHT FACHLICH VERIFIZIERT»** + Engine · Version · Datenquelle · Annahmen.
- Gestalt: Doppelrahmen 1px, Mono-Versalien, Klassen-Zeichen vorangestellt; fix an der Ergebnis-Legende, nie wegklickbar.
- Export: in die Fusszeile eingebrannt, reine Tusche, graustufenfest, min. 6pt Mono.
- Klasse C: Pflichtdialog vor jedem Export, keine «Nicht mehr anzeigen»-Option; Checkbox «Ich verwende das Ergebnis nur als Entwurfsmittel.»
- Grenzen-Satz von Kosmo bei jedem Resultat (inkl. Nennung der Fachperson).

### Typo-Ergänzung (keine neuen Schriften)

- Skalen-Beschriftung: Mono 10px/500, Versal, gesperrt 0.08em, Tabellenziffern, Einheit nachgestellt.
- Kennwert: grosse Zahl Mono 600 + kleine Einheit; immer mit Datum/Zeitraum.
- Delta: gleiche Grösse wie Kennwert, immer mit Vorzeichen.

## Muster (Antworten auf die 5 Brief-Fragen)

1. **Stationsfarbe:** Spektralviolett `#9C84C4`, strikt getrennt von Ergebnisfarben.
2. **Falschfarben auf Werkplan:** Schicht unter der Tusche (multiply, 80 %), Isolinien, gestufter Druckmodus.
3. **Ehrlichkeit:** Werkplan-Stempel (siehe oben).
4. **Zeit:** EIN Muster «Zeitraster» — Tag-/Jahr-Band in der DARSTELLUNG-Insel, Stunden×Monate-Raster ist Anzeige UND Bedienelement (Zelle=Zeitpunkt, Ziehen=Zeitraum), Griff 44px.
5. **A/B:** Blattpaar mit EINER Legende + Δ-Spalte als Hauptaussage; Wisch-Blende (44px-Griff) für 3D.

## Ikonografie

17 Werkzeug-Symbole (STUDIE 5 · DARSTELLUNG 4 · BEFUND 4 · AUSTAUSCH 4) + Stationssymbol «Messbogen» (Sonnenbahn + Messpunkt + Baukörper). 1px-Linien, 24px-Raster, Butt-Caps, monochrom. SVG-Pfaddaten stehen im Quelltext von `K37c-2_Screens.html` (Logik-Klasse, Objekt `ico`).
Hinweis: der Brief nennt 13 Symbole, das K37a-Inventar ergibt 17 — alle 17 sind geliefert.

## Schriften

PT Sans Narrow (Titel, versal) · Lato (Lauftext) · IBM Plex Mono (alles Technische, Tabellenziffern) — via Google Fonts, in den HTML-Dateien eingebettet.
