# Vorform-UI-Konzept — Tiefenanalyse aus der Video-Zerlegung + 1:1-Bauplan für die Oberfläche

**Stand 09.07.2026 (v0.6.4-Nacht).** Grundlage: die vollständige Zerlegung
beider Vorform-Demovideos — 270 Szenen, 36 Befehle/Werkzeuge im Inventar,
Volltranskript (`abgabe/VORFORM-ZERLEGUNG.pdf`, ROADMAP 260). Dieses Dokument
baut auf `VORFORM-KONZEPT.md` (Grundkonzept-These, Lücken L1–L6) und
`RE-VORFORM.md` (Feature-Landkarte F1–F15) auf und beantwortet die
Owner-Frage dahinter: **warum und wie macht er es — und was davon bauen wir
1:1 nach, vor allem an der Oberfläche.**

---

## 1 · Der Kern, den die Videos zeigen (nicht die Feature-Liste)

Die Feature-Landkarte kannten wir schon. Was erst die Frame-für-Frame-Analyse
zeigt, ist das **Interaktions-Skelett** — fünf Entscheidungen, die fast jede
Szene tragen:

### 1.1 · EIN unendliches Canvas, alles ist ein Frame
Pläne, Fassadenmodule, Treppen, Layout-/Präsentationsseiten, Tabellen — alles
sind **Frames auf derselben Zeichenfläche** (Frame-Typ-Menü: Plan · Module ·
Elevation · Volume · Profile · Object · Stair · Layout · Table). Es gibt keine
Workspaces, keine Tabs, keinen Kontextwechsel: der Demonstrator PANNT vom
Grundriss zum Fassadenmodul zum fertigen Rendering-Layout. Navigation =
«Zoom to frame»-Dropdown. Das ist das Figma-Muster, konsequent auf Architektur
angewandt — und der tiefste Unterschied zu KosmoOrbit (Stationen-Modell).
*Beleg: intro Szenen 1–10, render 000/„Layout 01"-Frames, Befehl «Zoom to
frame» in beiden Inventaren.*

### 1.2 · Ein Zeichenwerkzeug, der TYP macht die Semantik
Es gibt im Kern EIN Formwerkzeug (Linie/Rechteck/Kreis/Stift in einer
schmalen unteren Leiste). Eine gezeichnete Fläche wird per Dropdown
**umgewidmet**: Shape → Opening → Wall → Slab → Circulation→Stair →
Program Area. Der Nutzer lernt einmal «Form ziehen» und deckt damit den
ganzen Rohbau ab; die Werkzeuglast bleibt winzig. *Beleg: intro 2:05–2:25
(«Shape-Tool mit Typ-Wechsel»), render Treppen-Frames («Typ ‹Stair›
zuweisen»).*

### 1.3 · Der 3D-Spiegel ist IMMER da und antwortet sofort
Rechts steht permanent die 3D-Ansicht; jede 2D-Aktion (Raster ändern,
Farbe füllen, Modul verbinden) erscheint dort im selben Moment. Kein
«Berechnen», kein Ansicht-Wechseln. Dazu Shift+Space: 3D ausblenden, wenn
man es nicht braucht. *Beleg: durchgängig; explizit intro «3D-Live-Update
der Ansicht beim Bearbeiten».*

### 1.4 · Zahlen kommen zur Hand, nicht in Dialoge
Beim Frame-Aufziehen erscheinen W/L-Zahlenfelder AM RAHMEN; beim Zeichnen
läuft eine **blaue Live-Masszahl** am Cursor mit («3.5», «3.2»); Wandstärke
ist ein kleines Feld NEBEN dem Werkzeug. Präzision ohne Eigenschaften-Dialog
— tippen, wenn man es exakt will, sonst einfach ziehen. *Beleg: intro 0:09
(W/L-Eingabe), render 548s («Live-Bemassung beim Zeichnen»).*

### 1.5 · KI-Rendering ist ein SEMANTISCHES Formular + Kuratier-Fläche
Das Render-Panel fragt nicht nach einem Prompt, sondern nach **benannten
architektonischen Entscheiden**: Facade (Windows/Ground floor/Roof/Sun
protection/Balconies/PV/Begrünung), Structure & Circulation (Material/Form/
Lage), Scene (Landschaft/Tageslicht/Region/Jahreszeit/Möblierung/Menschen),
dazu Variations-Anzahl und ein freies Instructions-Feld («street in
foreground»). Ergebnisse landen als Bilder in **Layout-Frames**, schlechte
Varianten schiebt er in ein «Layout 02» als Ablage, auf ein Bild ZEICHNET er
einen Baum, beschriftet ihn «tree» und lässt gezielt nachrendern (Custom-
Rerender). Rendern-Prüfen-Verwerfen ist EIN Fluss auf EINER Fläche. *Beleg:
render 743–882s (Panel-Sektionen wörtlich), Teil 3 (Annotation + Custom),
Teil 4 (Kuratieren, Layout 02, drei finale Bilder).*

**Warum das zusammen funktioniert:** Vorform minimiert die *Distanz zwischen
Absicht und Bild* — räumlich (ein Canvas), begrifflich (eine Form, ein Typ),
zeitlich (Live-3D, Sekunden-Render). Die Software verhält sich wie Papier
mit einem sehr guten Assistenten dahinter — genau das «intuitive Spiel»,
das der Owner benennt.

### 1.6 · Was die Videos AUCH zeigen (ehrliche Gegenseite)
- **Kein BIM darunter:** Typ-Wechsel Shape→Wall erzeugt Kulissen, keine
  Bauteile mit Aufbauten/Mengen/IFC-Identität. Für Vorprojekt-Bilder ideal,
  für Werkplan/Devis/Submission (unser Vollprojekt-Pfad) unbrauchbar.
- **KI-Artefakte werden manuell wegkuratiert** (Baumklumpen, «Kran» aus
  Street View, fliegende Bäume) — der Workflow lebt davon, dass Rendern
  billig ist und der Mensch aussortiert.
- **Cloud-Zwang + Kreditsystem** — jede Bildgenerierung läuft über ihren
  Dienst (RE-VORFORM F15). Unser Gegenmodell (lokal-first, HomeStation,
  ehrliche Cloud-Option) bleibt richtig.

---

## 2 · Abgleich: was KosmoOrbit schon hat, was fehlt

| Vorform-Muster (aus §1) | KosmoOrbit heute | Verdikt |
|---|---|---|
| Live-3D-Spiegel | Splitscreen 3D\|Plan, 4er — dasselbe Modell, sofort | ✅ gleichwertig |
| Ein-Werkzeug/Typ-Semantik | eigene Werkzeuge je Bauteil (Wand/Zone/…) mit echter BIM-Semantik | ◐ bewusst anders (BIM statt Kulisse) — aber die WERKZEUGLAST ist bei uns höher; J3-Adaption mildert |
| Front/Side/Top-Module aufs Raster | Modul-Editor v1 + Fassaden-Zuweisung (ROADMAP 52–54, V7) | ◐ vorhanden, weniger direkt (kein Live-Verschmelzen dreier Ansichten) |
| Raster + Elements-Menü (Stützen/Träger aus Grid) | rasterSetzen, stuetzenAusRaster, Magnetfang, seit heute Element-Fang (254) | ✅ gleichwertig |
| Live-Masszahl + Zahleneingabe beim Ziehen | Live-m²/GF-Label (V6) — aber KEINE Längen-Masszahl am Gummiband, keine Direkteingabe | ❌ Lücke → **V-H1, heute Nacht** |
| Kürzel-Sprache (F/M/Shift+R/Shift+M) | J1/J2-Eingabekern; Werkzeug-Kurztasten kommen heute Nacht (F5-Batch) | ◐ → schliesst sich heute |
| Standort als Karte mit Layern | V4 CH-Standort (Adresse, Parzelle, Sonne) — ohne Karten-Layer-Steuerung | ◐ (V-M5 bleibt der grosse Wurf: swisstopo statt OSM) |
| Semantisches Render-Formular | Render-Presets (K20), Material→Prompt, Prompt-Transparenz (V8) | ◐ Presets ja, aber keine architektonischen SEKTIONEN (Fassade/Szene/Jahreszeit) |
| Rendern→Kuratieren auf einer Fläche | Vis-Node-Graph (mächtiger: QA, Serien) + Blattslots in Publish | ❌ als ERLEBNIS: Kontextwechsel statt Fluss (= L1 aus VORFORM-KONZEPT) |
| Ein Canvas, alles Frames | Stationen-Modell (T7-Hierarchie, Orbit-Startmenü ab heute) | ✘ bewusst NICHT 1:1 — Begründung §3 |

## 3 · 1:1 nachbauen — aber richtig: was wir übernehmen und was nicht

Der Owner-Auftrag heisst «Konzept, wie wir dies 1:1 nachbauen können,
vor allem von der Oberfläche her». Die ehrliche Chefdenker-Antwort:

**Wir bauen die fünf ERLEBNIS-Muster 1:1 nach (§1.2–§1.5 als Gefühl), aber
NICHT das Canvas-Betriebssystem (§1.1).** Grund: KosmoOrbit ist ein
BIM-Werkzeug mit Vollprojekt-Anspruch (Werkplan, Mengen, Submission,
Abnahme). Ein einziges unendliches Canvas trägt 15 Frames einer Demo,
aber nicht 40 Werkpläne, 6 Kataloge und eine Büro-KI. Was wir vom
Canvas-Muster übernehmen, ist seine WIRKUNG — «kein Kontextwechsel im
Entwurfsfluss»: der Orbit-Start (F3) reduziert die Einstiegslast auf 4
Hauptwerkzeuge, das Entwurfs-Dock (K16) hält Sprechen/Skizzieren/CAD in
einem Raum, und V-M1 (Render-Knopf im Viewport) holt das Bild zum Modell
statt umgekehrt. Ein «alles ist ein Frame»-Umbau wäre ein V2-Grossprojekt
mit unklarem Gewinn — als Owner-Entscheid notiert, nicht heimlich begraben.

### Bauplan (Oberflächen-Hebel, priorisiert)

| # | Hebel (Vorform-Muster) | Umfang | Wann |
|---|---|---|---|
| **V-H1** | **Zahlen zur Hand**: blaue Live-Masszahl am Zeichen-Gummiband (Wand/Zone/Volumen, Länge in m) + **Direkteingabe**: Zahl tippen während des Ziehens setzt die exakte Länge in der aktuellen Richtung (ArchiCAD-Tracker-Gefühl, Vorform §1.4) | S–M | **heute Nacht (0.6.4)** |
| **V-H2** | **Kürzel-Sprache**: Werkzeug-Kurztasten + Space-Pan + Kontext-Cursor | M | **heute Nacht (F5/F9-Batch, läuft)** |
| **V-H3** | **Einstiegslast runter**: 4 Hauptwerkzeuge im Orbit-Start, Untertools bei Hover (Vorform-Wirkung «eine Fläche, wenig Werkzeuge») | M | **heute Nacht (F3-Batch, läuft)** |
| **V-H4** | **Semantisches Render-Formular**: die K20-Presets zu architektonischen Sektionen ausbauen (Fassade / Szene / Jahreszeit / Personen / freie Instruktion), als Formular über dem bestehenden Prompt-Compositing (`renderprompt.ts`) — Prompt-Transparenz (V8) bleibt | M | 0.6.5 |
| **V-H5** | **Render-Kuratier-Fläche**: Bildergebnisse als Karten-Raster mit «behalten / verwerfen / auf Blatt», Verworfenes in eine Ablage statt gelöscht (Vorform «Layout 02»); Annotations-Rerender («Baum einzeichnen») ist 🔒 modellabhängig — erst mit echtem Bildweg | M–L | 0.6.5 (Kuratieren), 🔒 (Annotation) |
| **V-M1** | Render-Knopf im 3D-Viewport (aus VORFORM-KONZEPT, unverändert der grösste Erlebnis-Hebel) | M | 0.6.5, vor V-H4 |
| **V-H6** | Modul-Editor: «Struktur einblenden»-Toggle (Tragraster hinter dem Modul, Vorform «Show structure») + Live-Verschmelzung Front/Side | M | 0.6.5 |
| **V-M5** | CH-Standort-Karte mit Layer-Steuerung (swisstopo > OSM) | L | Owner-Entscheid (unverändert) |

**Nicht übernommen (begründet):** Canvas-OS (§3 oben) · Kulissen-Wände
(BIM-Bruch) · Kreditsystem/Cloud-Zwang (Gegenmodell lokal-first) ·
Street-View-Fotorealismus (Artefakte «Kran», Datenschutz; unser Weg:
swisstopo + eigener Render).

---

## 4 · Ehrlichkeits-Zusammenfassung

- Die Zerlegung ist vollständig (270 Szenen, beide Videos, Transkript), die
  Analyse hier ist MEINE Interpretation dieser Belege — jede §1-These trägt
  ihre Szenen-Referenz.
- V-H1 wird heute Nacht gebaut und getestet; V-H2/V-H3 laufen als eigene
  Batches (F5/F9, F3) mit eigenen Beweisen. Alles andere ist geplant, nicht
  gebaut — die Tabelle sagt wann.
- Sekunden-Rendering und Annotations-Rerender bleiben 🔒 von echter
  GPU/Cloud abhängig (BETRIEBSARTEN/KOSMOVIS-OHNE-HOMEPC) — kein UI-Batch
  kann das wegzaubern, und dieses Dokument behauptet es nicht.
