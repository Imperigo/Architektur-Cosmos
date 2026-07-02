# Gestaltungskonzept «Werkplan» — KosmoOrbit ab V1.1

> Owner-Vorgabe (02.07.2026, mit 5 Referenzbildern): das ganze System im Stil
> technischer Werkplan-Poster — skizzenhaftes Papier, Schwarz/Weiss als
> Standard, Farbakzent frei wählbar. «Das Skizzenhafte beim CAD finde ich schön.»

## Analyse der Referenz (Command-Panel-Poster)

Was die Vorlage trägt — und was wir daraus übernehmen:

1. **Papier, nicht Bildschirm.** Der Grund ist nie reinweiss, sondern warmes,
   leicht körniges Skizzen-/Zeitungspapier (≈ #ECE7DB) mit sichtbarer Textur.
   → Papier-Textur als Grundfläche der ganzen App (subtil, nie laut).
2. **Tusche auf Papier.** Fast alles ist Schwarz (#1A1815) in feinen,
   technischen Linien (1px) — Farbe ist die Ausnahme, nicht die Regel.
   → Standard-Akzent = Schwarz/Weiss (monochrom). Farbakzent wählbar.
3. **Werkplan-Grammatik.** Passermarken (⌖), Massketten mit Pfeilspitzen,
   Koordinatenkreuze, Schnittmarken in den Ecken, gestrichelte Trennlinien.
   → Als Zier- und Orientierungselemente in Panel-Köpfen, Karten, Viewport.
4. **Zwei Schriftstimmen.** Plakat-Titel: fette, enge Grotesk, VERSAL.
   Technik-Beschriftung: Monospace (COMMAND PANEL, SYSTEM.STATUS: ONLINE).
   → Titel-Utility (versal, eng, schwer) + Mono für alle Status/Masse/Labels.
5. **Nummerierte Karten mit geschnittener Ecke.** Listen als Karteikarten:
   laufende Nummer (01., 02., …) in eigener Spalte, Titel mono-fett,
   Unterzeile klein; eine Ecke 45° gekappt.
   → Karten-Stil für Kataloge, Checks, Befunde, Paletten.
6. **Das Maskottchen als Bauzeichnung.** Die Figur steht in einem
   orthogonalen Messrahmen mit Achsen (X/Z), Masslinien (128/256/64) und
   Koordinatenangabe — Gegenstand wie ein Bauteil vermassst.
   → Kosmo-Auftritt & Leerzustände: isometrische Strichzeichnungen im
   Messrahmen, nie Foto-Illustration. Der 3D-Viewport erbt die Stimmung
   (Papier-Himmel, Linienkanten, dezente Schraffur).

## Tokens (verbindlich, in `kosmo-ui/src/aura.css`)

| Token | Papier (Standard) | Tinte |
|---|---|---|
| Grund `--k-field` | #ECE7DB + Korntextur | #0C0B09 |
| Fläche `--k-surface` | #F2EEE3 | #14130F |
| Karte `--k-raised` | #F7F4EA | #1B1A15 |
| Tusche `--k-ink` | #1A1815 | #F2EFE6 |
| Technik-Linie `--k-technik` | #1A1815 | #F2EFE6 |
| Akzent (Standard «Tusche») | #1A1815 / Schrift #F7F4EA | #F2EFE6 / Schrift #14120E |
| Radien | 2 / 4 / 6 px (technisch, kaum gerundet) | gleich |

**Wählbare Akzente** (`data-akzent`, localStorage `kosmo.akzent`):
`tusche` (Standard, monochrom) · `kupfer` (bisheriges Aura) · `signal`
(Plakat-Orange #C8501E der Referenz) · `blau` (#2455A4) · `gruen` (#1E6B47).
Der Akzent färbt NUR: Primär-Buttons, aktive Zustände, Auswahl, Links,
Modul-Punkt. Nie Flächen, nie Text im Lauftext.

## Regeln

- Schwarz trägt, Farbe zeigt. Im Standard ist die App eine Tuschezeichnung.
- Jede Zahl ist Mono mit Tabellenziffern; jedes Label VERSAL + gesperrt.
- Linien 1px, Kontrast hoch; Schatten fast keine (Papier kennt kein Glas).
- Geschnittene Ecke nur an Karten/Listen (clip-path), nie an Eingabefeldern.
- Passermarken/Massketten sind Zierde mit Mass: max. 1–2 pro Ansicht.
- Animation bleibt zurückhaltend-präzise (Q20) — Papier flattert nicht.
- Der Grundriss bleibt SIA-symbolisch; der «Skizzen-Look» kommt aus Papier,
  Stiften und Kanten — nie aus Wackellinien auf Plänen (Pläne sind exakt).

## Werkzeuge/«Connectoren» aus der Referenz — ehrlicher Befund

Die 42 gezeigten Namen sind das private Skill-Set des Posters (Claude-Code-
Skills), kein installierbarer Katalog in dieser Umgebung. Vorhanden und aktiv
genutzt werden die Entsprechungen: **Figma MCP** (verbunden; für
Design-Sync/Referenzen), **Playwright + Screenshot-Loop** (unser visueller
Test seit M0, = «playwright-mcp»), **artifact-design** (Skill). Die Konzepte
`theme-factory`/`brandkit` sind mit diesem Dokument + den Akzent-Tokens
selbst gebaut; `canvas-design`/`generative-ui` entstehen im Produkt.
