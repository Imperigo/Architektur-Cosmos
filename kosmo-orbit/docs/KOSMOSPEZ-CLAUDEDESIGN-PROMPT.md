# Prompt an ClaudeDesign — UI-Sprache für «KosmoSpez» (K37c)

> **Verwendung:** dieses Dokument wird 1:1 als Prompt an ClaudeDesign
> gegeben. Es ist eigenständig — ClaudeDesign kennt weder das Repo noch
> die bisherigen Konzeptdokumente; alles Nötige steht hier drin.
> Quelle der Fakten: `docs/GESTALTUNGSKONZEPT.md`, `docs/ISLAND-UI-SPEZ.md`,
> `docs/KOSMOSPEZ-KONZEPT.md`, `docs/KOSMOSPEZ-OSS-RECHERCHE.md`.

---

## Der Prompt (ab hier kopieren)

Du entwickelst die **UI-Sprache für «KosmoSpez»** — die neue
Simulations-Station unserer Architektursoftware **KosmoOrbit**. Du
bekommst hier den vollständigen Kontext; halte dich strikt an die
bestehende Gestaltungsfamilie und liefere die unten genannten
Lieferobjekte.

### 1 · Kontext: Was ist KosmoOrbit

KosmoOrbit ist die lokale Architektursoftware eines Schweizer Baubüros:
BIM-Modell, 2D-Werkpläne, Visualisierung, Wissensverwaltung — gesteuert
von einer Büro-KI namens **Kosmo**, die als goldener Orb unten rechts
lebt. Es gibt eine Familie von Werkstationen, jede mit eigenem
Farb-Punkt:

- **KosmoDesign** (Entwerfen/Zeichnen) — Grün `#74C2A0`
- **KosmoData** (Referenz-/Projektdaten) — Braun `#B08A6E`
- **KosmoVis** (Visualisierung/Rendering) — Rot `#CD7670`
- **KosmoPrepare** (Grundlagen/Parzelle) — Orange `#CF9466`
- **KosmoPublish** (Planlayout/Blätter) — Blau `#6F9BCF`
- **KosmoSpez** (NEU — deine Aufgabe) — Farbe offen, siehe Frage 1

### 2 · Die bestehende Gestaltungssprache «Werkplan» (verbindlich)

KosmoOrbit sieht aus wie ein technisches Werkplan-Poster, nicht wie eine
Web-App. Zwei Farbwelten, beide von dir zu bedienen:

- **PAPIER (Standard, hell):** warmes Weiss mit subtiler Korn-Textur
  (Grund `#F5F3EE`, Flächen `#FBFAF6`, Karten `#FFFFFF`), fast alles in
  Tusche-Schwarz `#1A1815`, feine 1px-Linien, kaum Schatten («Papier
  kennt kein Glas»), Radien technisch klein (2/4/6px).
- **KOSMOS (dunkel):** tiefdunkler Grund `#0B0D12`, helle Schrift
  `#F4F6FA`, glasige Flächen mit Blur — die dunkle Nachtwelt derselben
  Grammatik.

Gemeinsame Regeln: **Schwarz trägt, Farbe zeigt** (Akzentfarbe nur für
aktive Zustände, Auswahl, Primär-Aktionen — nie für Flächen oder
Lauftext). Zwei Schriftstimmen: fette, enge Versal-Grotesk für Titel;
**Monospace für alles Technische** (Zahlen, Status, Masse, Labels —
Zahlen immer mit Tabellenziffern). Werkplan-Grammatik als Zierde mit
Mass: Passermarken, Massketten, Koordinatenkreuze, geschnittene
Karten-Ecken (45°), maximal 1–2 pro Ansicht. Plangrafik (Grundrisse)
bleibt IMMER Schwarz auf Papier — nie von UI-Farben eingefärbt.

### 3 · Die Insel-Bedienung (verbindlich)

Die Stationen werden über **vier «Dynamic Islands»** an den
Bildschirmrändern bedient — beim Öffnen ist nur der Viewer sichtbar,
alle Werkzeuge liegen in schwebenden dunklen Glas-Pills (die Pill ist in
BEIDEN Farbwelten dunkles Glas — das Wiedererkennungssignal):

- Grammatik: **Erzeugen links · Sehen oben · Prüfen rechts · Übergeben
  unten.**
- Vier Stufen je Werkzeug: Pill (Ruhe) → Leiste (Hover/Tap: Symbole +
  Mono-Titel) → Mini-Popup (2–4 Schnelleinstellungen) →
  Einstellungsfenster (alles). Kein Werkzeug endet bei Stufe 1.
- Oben links: Stationen-Orb (Wechsel zwischen Stationen, mit den
  Farb-Punkten aus Abschnitt 1) + Ansichts-Info in Monospace.
- Unten rechts: der goldene Kosmo-Orb (KI), mit Sprechblasen-Karte.
- Touch/iPad ist erste Klasse: alle Ziele ≥ 44px, Tap = Hover-Ersatz.

### 4 · Was KosmoSpez ist

KosmoSpez ist das **technischste Tool der Familie**: Energie- und
Klimadesign als Entwurfswerkzeug. Der Architekt fragt («bekommt der Hof
im Winter Sonne?», «überhitzt das Eckzimmer?»), Kosmo führt validierte
Simulationen aus (Sonnenstand/Einstrahlung, Klimadaten, Tageslicht via
Radiance, thermische Ein-Zonen-Simulation via EnergyPlus,
Aussenkomfort-Index UTCI) und antwortet mit Karten und Overlays auf dem
eigenen Gebäudemodell.

**Der heikle Kern — und deine wichtigste Design-Aufgabe:** diese
Ergebnisse sind **Entwurfsmittel, nicht fachlich verifizierte
Nachweise**. Der Architekt ist kein Bauphysiker. Jedes Ergebnis trägt
darum verpflichtend:

1. ein **Badge «Entwurfsmittel — nicht fachlich verifiziert»** plus
   Engine/Version/Datenquelle/Annahmen (z.B. «EnergyPlus 24.x ·
   EPW: PVGIS-TMY Zürich · Ein-Zonen-Näherung») — auf dem Bildschirm und
   in jeden Export eingebrannt;
2. eine **Verlässlichkeitsklasse A/B/C** (A = validiert & normnah,
   B = validierte Engine mit vereinfachtem Modell, C = Näherung —
   C erzwingt einen Bestätigungs-Dialog vor dem Export);
3. einen **Grenzen-Satz von Kosmo** («für den Nachweis braucht es eine
   Bauphysikerin»).

Diese Ehrlichkeits-Elemente sind KEIN Kleingedrucktes — sie müssen
prominent, selbstverständlich und schön sein, ohne die Ergebnisse zu
entwerten. Das ist die gestalterische Kernspannung dieses Auftrags.

Die vier KosmoSpez-Inseln (nach der Grammatik aus Abschnitt 3):

- **STUDIE** (links): Sonnenstudie · Klimasteckbrief · Aussenkomfort ·
  Tageslicht · Thermik — stossen Simulationen an.
- **DARSTELLUNG** (oben): Overlay-Wahl · Falschfarben-Skala ·
  Zeitpunkt/Zeitraum-Regler · A/B-Vergleich.
- **BEFUND** (rechts): Ergebnisliste mit Klassen · Annahmen &
  Datenquellen · Grenzen · Kennwerte.
- **AUSTAUSCH** (unten): Export (mit Badge) · Klimadaten-Import ·
  HomeStation-Status · klassische Ansicht.

### 5 · Welche Outputs du gestalten musst

1. **Sonnenstunden-Heatmap** auf Fassade (3D) und Grundriss (2D) —
   kontinuierliche Farbskala auf einem Schwarz-Weiss-Werkplan, mit
   Legende, Datum/Zeitraum-Angabe und Badge.
2. **Klimasteckbrief-Karte** einer Parzelle: Temperatur-Jahresband,
   Windrose, Strahlungs-Heatmap, Kennwerte — als eine kompakte,
   druckbare Karte im Karteikarten-Stil der Familie (laufende Nummer,
   geschnittene Ecke).
3. **Komfort-Skalen** (UTCI-Jahresraster «wann ist der Hof angenehm?»,
   Überhitzungsstunden je Raum): Stunden×Monate-Raster mit
   Komfort-Farbskala.
4. **Falschfarben-Overlays** (Tageslicht: Lux/Tageslichtfaktor) über
   der exakten Plangrafik — das Overlay muss als «Ergebnis-Schicht»
   lesbar sein, ohne den Plan zu übertönen; der Plan darunter bleibt
   Schwarz auf Papier.
5. **Warn-Badges und Verlässlichkeitsklassen** als System: Badge,
   Klassen-Zeichen A/B/C, Annahmen-Zeile, C-Bestätigungsdialog — in
   beiden Farbwelten, auch in der Export-/Druckfassung.

Dazu die Insel-Ikonografie: 13 Werkzeug-Symbole (Linienstil 1px,
monochrom, im Duktus technischer Plansymbole) für die vier Inseln oben.

### 6 · Constraints

- **Konsistenz zur Familie:** KosmoSpez muss sofort als KosmoOrbit
  erkennbar sein — gleiche Tokens, gleiche Schriftstimmen, gleiche
  Insel-Mechanik. Du erweiterst die Sprache, du ersetzt sie nicht.
- **Beide Farbwelten:** jeder Screen in PAPIER und KOSMOS denkbar;
  Falschfarben-Skalen müssen auf hellem UND dunklem Grund funktionieren.
- **Touch/iPad erste Klasse:** Regler (Zeitpunkt/Zeitraum), Skalen und
  Vergleiche müssen mit dem Finger bedienbar sein, Ziele ≥ 44px.
- **Ehrlichkeits-Badges prominent:** siehe Abschnitt 4 — nie versteckt,
  nie wegklickbar, auch im Export.
- **Schweizer Sachlichkeit statt Dashboard-Kitsch:** keine Gauges,
  keine 3D-Torten, keine Glow-Effekte auf Zahlen. Die Referenz ist der
  technische Werkplan und die wissenschaftliche Abbildung: beschriftete
  Skalen, klare Einheiten, Monospace-Zahlen, zurückhaltende Animation.
  Farbe ist Information (Falschfarben-Skala), nie Dekoration.
- **Plangrafik ist tabu:** Grundrisse/Schnitte bleiben exaktes
  Schwarz-Weiss; Ergebnisse liegen als klar abgesetzte Schicht darüber.

### 7 · Gewünschte Lieferobjekte

1. **Moodboard** — Haltung von KosmoSpez innerhalb der Familie
   (technisch-wissenschaftlich, ehrlich, ruhig), Referenzen erlaubt aus
   wissenschaftlicher Visualisierung/Kartografie.
2. **Farb- und Typo-Erweiterung der Aura-Token** — konkret: (a) die
   KosmoSpez-Stationsfarbe (passend zur Punktreihe in Abschnitt 1),
   (b) 2–3 Falschfarben-Skalen (sequenziell für Sonnenstunden/Lux,
   divergierend für Komfort warm/kalt) mit Hex-Stützwerten für beide
   Farbwelten, (c) Badge-/Klassen-Farben (A/B/C), (d) allfällige
   Typo-Ergänzungen für Skalen-Beschriftung — alles als Token-Tabelle,
   additiv zur bestehenden Palette.
3. **3–4 Schlüssel-Screens** (1920×1148, je PAPIER und KOSMOS):
   (1) Sonnenstunden-Heatmap auf dem Modell mit DARSTELLUNG-Insel offen,
   (2) Klimasteckbrief-Karte, (3) Tageslicht-Falschfarben über dem
   Grundriss mit BEFUND-Insel (Klassen sichtbar), (4) optional:
   C-Klasse-Bestätigungsdialog vor einem Export.
4. **Insel-Ikonografie** — die 13 Werkzeug-Symbole plus das
   KosmoSpez-Stationssymbol für den Stationen-Orb.

### 8 · Die 5 wichtigsten Fragen an dich

1. **Stationsfarbe:** welche Farbe bekommt KosmoSpez neben Grün/Braun/
   Rot/Orange/Blau — und trägt sie auch als Basis der Ergebnis-Akzente,
   oder trennst du Stationsfarbe und Ergebnisfarben strikt?
2. **Falschfarben auf Werkplan:** wie legst du kontinuierliche
   Farbskalen über eine bewusst monochrome Plangrafik, ohne dass der
   Plan stirbt oder die Skala lügt — Transparenz, Raster, Konturbänder?
3. **Ehrlichkeit als Gestalt:** wie sieht ein Warn-Badge aus, das
   prominent und dauerhaft sichtbar ist, aber nach Werkplan-Stempel
   aussieht statt nach Fehlermeldung — und wie skaliert dasselbe Badge
   vom Bildschirm in den PDF-Druck?
4. **Zeit als Dimension:** fast jedes Ergebnis hat eine Zeitachse
   (Tag/Jahr) — welches durchgängige Bedienmuster (Regler, Raster,
   Scrubbing) gibst du der DARSTELLUNG-Insel dafür, touch-tauglich?
5. **A/B-Vergleich:** wie stellst du zwei Simulationsstände nebeneinander
   dar (geteilter Viewport, Overlay-Blende, Karten-Paar), sodass der
   Unterschied — nicht die Einzelwerte — die Hauptaussage ist?

Liefere zuerst Moodboard + Token-Vorschlag (Lieferobjekte 1–2) zur
Freigabe, dann die Screens und die Ikonografie.

*(Ende des Prompts)*
