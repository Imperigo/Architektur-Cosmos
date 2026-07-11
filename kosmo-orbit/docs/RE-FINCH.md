# RE-FINCH — Reverse-Engineering-Dossier zu Finch (finch3d.com)

> Stand 03.07.2026. Erstellt ausschliesslich aus **öffentlichen Quellen** (Website,
> offizielle GitBook-Dokumentation inkl. `llms.txt`-Index, Fachpresse). Kein Zugriff
> hinter Logins, kein Code- oder Binär-Reverse-Engineering. Jede Aussage ist als
> **[belegt]** (mit Quelle) oder **[Hypothese]** (meine technische Rekonstruktion)
> markiert. Zweck: Bau-Grundlage für äquivalente Funktionen in KosmoOrbit —
> Owner-Mandat Q12 nennt «Finch-Grundriss-Checks» bereits als Anforderung.
>
> Quellenkürzel: **[W]** finch3d.com · **[D]** docs.finch3d.com · **[AEC]** AEC Magazine
> 30.01.2023 · **[AT]** Architosh 18.09.2024 · **[DZ]** Dezeen 27.06.2019 ·
> **[IL]** illustrarch-Review 16.04.2026 · **[S]** Web-Such-Snippets (schwächste
> Belegstufe, einzeln markiert). Vollverzeichnis in Abschnitt 8.

---

## 1 · Was Finch ist

**Firma.** Finch3D, Malmö (Schweden). Gegründet von den Architekten **Pamela Nunez
Wallgren** und **Jesper Wallgren** (Wallgren Arkitekter) zusammen mit **Martin Kretz**
(Mathematik/Algorithmen). [belegt: AEC, W]

**Ursprung.** Finch begann 2019 als internes Werkzeug von Wallgren Arkitekter mit der
Baufirma BOX Bygg: ein parametrischer Grundriss-Generator als Grasshopper/Rhino-Plugin,
der Pläne an Parzellen-Constraints anpasst — «parametric design ohne Grasshopper-
Kenntnisse». Ging nach Features in Financial Times, Dezeen und ArchDaily viral;
12'000er-Warteliste. [belegt: DZ, AEC] Daraus wurde eine eigenständige **Cloud-/Web-
Plattform** mit nativen Zwei-Weg-Anbindungen an Rhino, Grasshopper und Revit (dazu
Forma; Archicad via Grasshopper). [belegt: AEC, D-FAQ]

**Finanzierung.** Seed **€2.5 Mio.** (Nov 2022, Lead Inventure; Angels u.a. Peter
Neubauer/Neo4j). [belegt: AEC] Weitere Runde ~€1 Mio. April 2025 (Ampli Ventures)
— nur aus Such-Snippets (Tracxn/Crunchbase), nicht direkt verifiziert. [S]

**Positionierung.** «AI for how the world builds» — AI-native Plattform für
Gebäudeentwurf. Selbstbeschreibung: *«from first sketch through design development
until schematic design»* — also exakt die **Frühphase** (SIA-Analogie: Phasen 21–32,
Machbarkeit bis Vorprojekt/Bauprojekt-Beginn; Enterprise verspricht «LOD 300-level
precision»). Kernjob: **Volumen erkunden und dieses Volumen mit Grundrissen
bevölkern**, Unit-Mix testen, Compliance prüfen, Kennzahlen in Echtzeit zurückgeben.
[belegt: AEC-Zitat Nunez Wallgren, W]

**Fokus-Typologie.** Generative Werkzeuge funktionieren **nur für mehrgeschossigen
Wohnungsbau** (multi-family residential); Massing/Kennzahlen für alle Programme.
Geometrisch: rechtwinklige Formen, Voids, Winkel «ideal»; Höfe und H/T-Formen «mit
Workaround»; **gekrümmte Bauten und Schrägdächer nicht unterstützt**. [belegt: D-About]

**Marktstellung.** Referenzkunden: White Arkitekter, Herzog & de Meuron (strategische
Frühkunden 2023), Sweco Denmark, Sheppard Robson, Dark Arkitekter, Nordic Office of
Architecture. Website-Zahlen (Marketing, unverifiziert): 130'000+ Projekte, 70+ Länder,
100'000+ Enterprise-Warteliste. [belegt als *Aussage*: W, AEC]

**Preismodell** (Website 07/2026): **Free** (alle Editier-Werkzeuge + Echtzeit-
Kennzahlen, 1 User) · **Basic €49/Mt.** (+ generativer Unit-Mix & Zirkulation) ·
**Enterprise €14'500/Jahr ab 3 Seats** (+ firmweite Plan-Library, KI-Grundriss-
Generierung, Code/Compliance-Checks, eigene BIM-Exports, «Archie» AI-Agent, SSO).
[belegt: W-Get-started] Lesart: das Editier-Werkzeug ist der Köder, die **Generierung
aus der eigenen Planbibliothek** ist das teure Kernprodukt.

---

## 2 · Feature-Inventar

Reifegrad-Skala: ● ausgereift (dokumentiert + länger im Produkt) · ◐ neu/im Ausbau ·
○ Beta/nur Enterprise-Nische.

### 2.1 Import & Massing

| Feature | Beschreibung | Quelle | Reife |
|---|---|---|---|
| Mass-Import Rhino/Revit/Forma | Baumasse + Kontext hochladen; Rhino über Finch-Layer (Mass, Context, Grid lines, Attractor points, Centerlines, Custom geometry/Blocks), Revit über Conceptual Mass, Forma per Extension | D-First-Steps, D-FAQ | ● |
| Zwei-Weg-Sync | «Auto receive changes from web app»: Rhino-Modell synct laufend; Mass in Rhino ändern → Finch-Daten aktualisieren, **alle Zuweisungen bleiben erhalten** | D-Calculate-Data | ● |
| Multiple Towers/Tunnels/Voids | Ein Upload, mehrere Baukörper mit Durchgängen/Löchern | D-New-Features 03/2024 | ● |
| Massing Studio | Geschosshöhen je Auswahl setzen (Rest wird oben aufgerechnet), Aussenwand-Dicke, Programme (Presets + eigene, mit Farbe) je Geschossbereich | D-Massing-Studio | ● |
| Upload Walls | Vordefinierte Wände (Bestand!) aus Rhino/Revit hochladen und trotzdem Adaptive Plans + KI-Generierung nutzen | D-New-Features | ◐ |
| Grid-Import | Strukturraster aus Revit-Grids/Rhino-Layer, in Finch als Snap zuschaltbar | D-New-Features 03/2024 | ● |

### 2.2 Kennzahlen & Daten (Live-Feedback)

| Feature | Beschreibung | Quelle | Reife |
|---|---|---|---|
| Key Figures | GFA, GIA (GFA minus Aussenwände), NIA (bis Innenkante, wanddickenabhängig, als %GFA), UFA (Raumflächen); Aufteilung nach Programm; **Echtzeit-Update** bei Masse-, Geschosshöhen-, Wanddicken-Änderung | D-Calculate-Data | ● |
| Programm-Ausschluss | Programme aus NIA/GFA-Rechnung ausschliessen (Toggle) | D-Calculate-Data | ● |
| Custom Properties | Eigene Kennzahlen als lineare Ableitung: Wert × (NIA oder GFA) × Einheit — Beispiele der Doku: 1500 €/m² NIA (Budget), 70 kg CO2e/m² GFA (Emissionen) | D-Calculate-Data | ● |
| Unit-Mix-Soll/Ist | Zielmix (Grössen + Anteile) eingeben; Einheiten färben sich, wenn sie ihr Ziel treffen, Nichterfüller werden **grau**; «Size Match»/«Area Difference»-Balken | D-Story-Editor | ● |
| Parallel Axis Diagram | Parallelkoordinaten-Diagramm zum Vergleich von Varianten bzw. Plan-Ergebnissen über mehrere Metriken | D-Feature-Bank, D-Unit-Editor | ● |
| Scoring-Transparenz | (Enterprise) Aufschlüsselung, warum ein Plan vorgeschlagen wird: Tageslicht-Metriken, Regel-Compliance, Optimierung | D-New-Features | ◐ |
| CSV/PNG-Export | Statistiken je Variante/Programm als CSV, Screenshots als PNG | D-Export | ● |

### 2.3 Generative Werkzeuge (das Herzstück)

| Feature | Beschreibung | Quelle | Reife |
|---|---|---|---|
| Generate Floor Plate — 3 Modi | **(a) Around existing circulation** (Kern vorgezeichnet/hochgeladen — Retrofit), **(b) Generate Cores** (Finch findet Zahl+Lage der Kerne, z.B. L-förmige Riegel), **(c) Generate Corridors** (blank slate: Korridore+Kerne aus Egress-Distanzen, Kernmassen, Orientierung) | D-101-Algorithms | ● (2.0 seit 09/2024) |
| Centerline-Steuerung | Gezeichnete/hochgeladene Mittellinie bestimmt Korridorlage (Offset beidseitig = halbe Korridorbreite) | D-Generate-Corridors | ● |
| Unit-Mix-Generierung | Wohnungen um Korridor/Kern «gewickelt», Zielgrössen + Verhältnis; ein «Rest-Apartment» pro Treppenhaus nimmt die Flächendifferenz auf (ehrliche Arithmetik) | D-Algorithm-Theory | ● |
| Weights/Trade-off-Slider | Gewichte für Metriken (Unit Size, Ratio, Daylight, Squareness, Grid Lines …) **live während der Generierung** verstellbar; Non-negotiables (Zugang, Mindestbreite, Treppenhauszahl) sind harte Filter davor | D-Algorithm-Theory | ● |
| Egress-Live-Ampel | Max. Fluchtdistanzen (ein Ausgang z.B. 18 m / mehrere 30 m) als Parameter; Einheiten färben sich grün/grau/rot **in Echtzeit** | D-101-Corridor | ● |
| Stairwell Attractors | Pfeile je Fassade: wohin Treppenhäuser orientiert werden (Hof vs. Strasse); auch als Punkte aus Rhino/Revit | D-New-Features 04/2024 | ● |
| Grid-aware Generation | Weight «Grid Lines»: Generierung snappt auf hochgeladenes Stützenraster | D-New-Features 04/2024 | ◐ |
| Generieren in Abschnitten | Floor Plate durch gezeichnete Trennwände teilen, je Abschnitt eigener Mix/eigene Gewichte (aussen grosse Wohnungen, innen tageslicht-optimierte kleine) | D-Generate-Circulation | ● |
| Fine-tune-Phasen | Zweistufig: erst Story-Segmentierung (Resolution story), dann Units (Resolution units) mit eigenen Fine-tune-Läufen; Flächenfehler werden in eine Einheit konsolidiert | D-Unit-Mix-Stairwells | ● |
| Erklärende Fehler | Passt der Mix nicht ins Geschoss, sagt der Algorithmus **warum** (z.B. Einheiten zu gross für Floor Plate) und wie man es löst | D-New-Features 09/2024, AT | ● |
| Unit-Plan-Generierung | (Enterprise) Pro Wohnung: Ergebnisse in zwei Rängen — **eigene Library-Pläne** (adaptiert) über **Finch-generierten Plänen** («AI generates unique plans based on your adaptive plan library's design style and rules»); Filter Zimmer/Bäder/Region, Score-Schwelle 75% | D-Enterprise-Generate | ◐ |
| Daylight-Fassaden-Steuerung | Je Aussenwand Tageslicht-Emission an/aus togglen → Regenerate | D-New-Features | ◐ |
| AI Copilot (Plan Studio) | Beim Zeichnen von Innenwänden schlägt die KI Raumtypen vor (Bad, Schlafzimmer …), Klick übernimmt | D-Copilot-Kurs | ◐ |
| Archie (AI-Agent) | Übernimmt «repetitive Präzisionsarbeit»: exakte Türplatzierung, Compliance-Checks, konsistente Updates über verknüpfte Einheiten | W-Product | ○ (2025/26, Enterprise) |

### 2.4 Adaptive Plan Library (der strategische Graben)

| Feature | Beschreibung | Quelle | Reife |
|---|---|---|---|
| Plan speichern | Jede gezeichnete/generierte Wohnung als Vorlage in die (persönliche oder firmweite) Library | D-Adaptive-Library | ● |
| Stretch-Constraints | «Stretch Preview» zeigt Dehnverhalten; Wände anklicken = **locked** (rot, stretcht nie), zweimal klicken = **extendable** (darf wachsen, nie schrumpfen — für Türen, Mindestbreiten) | D-Adaptive-Library | ● |
| Adaptivity Score | Wie gut eine Vorlage in eine neue Wohnungsform passt / wie stark Finch sie verformen muss; Anzeige je Raum (rot = starke Abweichung) | D-Assign-Adaptive | ● |
| Assign / Assign as-is / Adapt | Perfekter Match wird 1:1 eingesetzt; sonst wahlweise unverändert einsetzen oder mit Auto-Rotation + Constraint-Stretching anpassen | D-Assign-Adaptive | ● |
| Library-Aufbau als Service | Enterprise: Finch digitalisiert die Firmenpläne aus beliebigen Formaten (.dwg, .pdf, .jpg) in die private Library | D-Enterprise-Generate | ● |
| Plan Groups | Copy/Paste in identische Einheiten (Spiegelung wird automatisch erkannt) → **verknüpft**: Änderung an einem Plan wirkt auf alle; «Make Unique» löst | D-101-Unit-Plans | ● |

### 2.5 Regeln & Compliance

| Feature | Beschreibung | Quelle | Reife |
|---|---|---|---|
| Graph Rules | Mindestraumgrössen u.a. Regeln in ein Compliance-Panel eingeben → **Live-Warnungen** im Projekt (rote Räume), auch beim Zeichnen im Plan Studio zuschaltbar | D-New-Features 06/2024, D-Copilot | ● |
| Graph Studio | (Enterprise) Graph-Regeln je Raumtyp definieren, konforme Pläne generieren, verfeinern, wiederverwenden | D-New-Features 08/2024 | ○ |
| Accessibility Bounds | Möbel tragen Bewegungsflächen; Accessibility-Kreise (Tür-Manövrierflächen); Wand über Bewegungsfläche schieben → **Kollisionswarnung** | D-Furniture-Kurs | ● |
| Egress-Compliance | siehe 2.3 — Fluchtdistanzen als generatives Constraint UND Live-Anzeige | D-101-Corridor | ● |

### 2.6 Editor, Varianten, Sonstiges

| Feature | Beschreibung | Quelle | Reife |
|---|---|---|---|
| 2D-Editor komplett | Wall (w) / Space Divider (s) / Door (t, parametrisch, Stile) / Mirror (shift+m) / Array / Smart Rotate (bleibt senkrecht zur Fassade) / Auto-Trim+Extend / Distanz tippen beim Ziehen / Bemassung anklicken + Wert eintippen / Punkt-, Wand-, Gruppen-Selektion | D-Tools | ● |
| «Alles bleibt editierbar» | Doku wiederholt es mantrahaft: jede Generierung ist danach voll editierbar | D-passim | ● |
| Varianten | Duplicate/New Variant, Kennzahlen beim Hovern vergleichen, gemeinsame Kamera für Thumbnails; Variant Bundles fürs Masterplanning (mehrere Gebäude aus Forma) | D-Iterate, D-Site-to-BIM | ● |
| Time Machine | Versions-Historie, in Sekunden zu früheren Ständen zurück | D-Feature-Bank | ● |
| Sonne/Schatten | Sonnenstand nach Ort/Datum/Zeit-Slider, Schattenwurf auf Site | D-Feature-Bank | ● |
| Export BIM→Revit | Komplettes BIM mit Familien je Objekt inkl. Möbel-Familien; Archicad; 2D+3D-Layerbäume nach Rhino; Grasshopper-Datenstream; Objekt-Upload aus Revit (Inner/Outer Bounds) | D-Export, D-101 | ● |
| Metrisch/Imperial, Chat-Support in-App | — | D-Feature-Bank | ● |

---

## 3 · Kern-Algorithmen-Analyse

### 3.1 Der Raumgraph («Finch Graph»)

**Belegt.** O-Ton Nunez Wallgren [AEC]: Der User setzt grobe Regeln («zwischen diesen
Räumen soll X generiert werden», «dieser Raum braucht min. X m²», «dieser Raum braucht
X Tageslicht») — *«the graph is always working behind the design. **The user is not
building the graph, that is generated automatically.** And the graph's job is basically
to map out the architecture … to understand the relationship between different
functions for different spaces and different objects to generate an optimal floor
plan.»* Das Review [IL] bestätigt: Graph-System statt Pixel-Training — deshalb
architektonisch kohärent statt nur «visuell plausibel».

**Hypothese (Rekonstruktion).** Ein **automatisch abgeleiteter Adjazenz-/Zugangsgraph**:
Knoten = Räume/Spaces (mit Typ, Flächen-Soll, Tageslicht-Bedarf), Kanten = Türen,
Separator-Übergänge und Wand-Adjazenzen; Sonderknoten Korridor/Treppe/Lift. Der Graph
wird bei jeder Geometrieänderung aus der Parametrik neu abgeleitet (wie unsere
Derive-Pipeline) und dient drei Zwecken: (1) **Constraint-Prüfung** (Graph Rules =
Prädikate über Knoten/Kanten: Minfläche, Erreichbarkeit vom Korridor, Tageslicht-Kante
zur Fassade), (2) **Bewertung** (Scores je Metrik), (3) **Matching** (Vorlagen-Graph ≅
Zielraum-Graph beim Adaptieren). Dass Angel-Investor Peter Neubauer **Neo4j-Mitgründer**
ist [AEC], stützt die Graph-Zentrierung kulturell, beweist aber nichts über die
Implementierung.

### 3.2 Floor-Plate-Generierung (Korridor, Kerne, Unit-Mix)

**Belegt** [D-Algorithm-Theory — Finchs eigene Erklärseite]:
- **Custom-Core-Algorithmus:** betrachtet die Form des Korridors und sucht «natürliche
  Verbindungslinien» zu den Fassadenwänden; prüft, dass jede Wohnung Zugang zu einem
  **Korridor**-Space hat (nicht nur zu Lift/Treppe). Zielgrössen + Verhältnis werden
  übers ganze Gebäude angestrebt; **ein «geopfertes» Rest-Apartment** pro Treppenhaus
  nimmt die Divisionsreste auf.
- **Blank-Slate-Algorithmus (Beta):** teilt das Gebäude in «**Buckets**» je Treppenhaus
  (3 Treppenhäuser = 3 Buckets) und optimiert den Mix in jedem Bucket.
- **Scoring:** Jede Iteration wird gegen Metriken gescort, **nachdem** Non-negotiables
  (Zugang, Mindestbreite, Treppenhauszahl) als harte Bedingungen erfüllt sind. Gewichte
  wirken als **Multiplikatoren** auf Einzel-Scores (dokumentiertes Beispiel: Unit-Size
  ×3 → Gesamtscore 19 schlägt 13); alle Gewichte hoch = alle tief (nur Relationen
  zählen).
- **Prozess:** sichtbar iterativ, «je länger, desto genauer», pausierbar, Gewichte
  während des Laufs verstellbar, «Apply/Assign to Story» bakt das Resultat; zweistufig
  Story-Segmente → Units mit je eigenen Fine-tune-Läufen; Auflösungs-Parameter
  (Resolution story/units) und Size Error Tolerance steuern Präzision. [D-Unit-Mix-
  Stairwells]

**Hypothese (wie das technisch funktioniert).** Das Gesamtbild — anytime, stochastisch
verbessernd, gewichtete Additiv-Scores, harte Filter, live veränderbare Gewichte —
passt auf eine **klassische metaheuristische Suche** (evolutionär / simulated
annealing / lokale Suche mit Restarts) über einer **niederdimensionalen
Segmentierungs-Parametrisierung**, nicht auf ein neuronales Layout-Netz:
1. Korridor-Skelett (Centerline oder generiert aus der Medialachse des Footprints,
   beschnitten durch Egress-Distanzen entlang des Skeletts).
2. Kandidaten-Schnittlinien = Senkrechten vom Korridorrand zur Fassade an diskreten
   Stationen («natural connecting lines»); eine Lösung = Auswahl von Schnittstationen
   + Zuordnung Segment→Wohnungstyp.
3. Score = Σ wᵢ·scoreᵢ (Flächentreffer, Mix-Verhältnis, Tageslicht ≈ Fassadenlänge/
   Fläche, Squareness ≈ Kompaktheit, Grid-Nähe); Reparatur-Schritt konsolidiert
   Flächenfehler in die Opfer-Einheit.
4. «Fine-tune» = lokale Optimierung (Wände in kleinen Schritten verschieben) auf der
   besten Lösung. Die dokumentierte Grid-Snap-**Gewichtung** (statt harte Bedingung)
   bestätigt den Soft-Constraint-Ansatz.
Die Egress-Ampel ist dabei ein **Pfadlängen-Check auf dem Korridorgraphen** (kürzester
Weg Wohnungstür → nächstes Treppenhaus), grün/grau/rot nach ein/zwei Ausgängen.

### 3.3 Adaptive Pläne (Vorlagen, die sich verformen)

**Belegt.** Vorlage = Wohnung mit Bounds, Wänden, Türen, Möbeln, Tags; Constraints pro
Wand: **locked** (fix) oder **extendable** (nur wachsen). «Stretch Preview» zeigt das
Dehnverhalten; beim Zuweisen: Auto-Rotation + Stretching gemäss Constraints, Adaptivity
Score je Raum (rot = starke Deformation), Tageslicht-Räume müssen an emittierende
Fassaden geraten. Spiegelung wird beim Einfügen automatisch erkannt (Korridorseite).
[D-Adaptive-Library, D-Assign-Adaptive, D-101-Unit-Plans]

**Hypothese.** Achsweise **lineare Constraint-Löser** (x und y getrennt): Wandpositionen
als Variablen, locked-Wände = fixe Abstände, extendable = Ungleichungen (≥ Original),
Rest skaliert proportional — mathematisch dasselbe Muster wie unser affines
Wand-Rückzugs-System (t = A + B·o) in Punkt 35 der ROADMAP. Matching der Vorlage auf
die Zielform: Normalisierung der Orientierung (Korridor-Kante als Anker, 4 Rotationen
× Spiegelung testen), dann Score aus (a) Polygon-Ähnlichkeit nach Stretch, (b) Summe
der Raum-Deformationen, (c) Tageslicht-Kanten-Erfüllung. Die «Finch-generierten Pläne
im Stil der Library» [D-Enterprise-Generate] sind vermutlich **Rekombination +
Constraint-Perturbation** über der Library plus gelernte Präferenzen (Raumproportionen,
Türlagen) — ob dort ein trainiertes Modell (Graph-NN o.ä.) mitläuft, ist öffentlich
**nicht** belegt.

### 3.4 Adaptivität bei Geometrieänderung

**Belegt.** Masse in Rhino ändern → Sync → «die Daten haben sich aktualisiert, aber
**alle Anpassungen und Zuweisungen bleiben**». [D-Calculate-Data] Plan Groups
propagieren Edits über verknüpfte, gespiegelte Einheiten. [D-101-Unit-Plans]

**Hypothese.** Stabile IDs je Story/Programmzone + Re-Mapping über Geometrie-Nähe;
Wohnungszuweisungen hängen an Story-Segmenten, nicht an absoluten Koordinaten; Pläne in
Plan Groups sind **eine** Definition mit Transformations-Instanzen (Spiegelmatrix) —
darum ist «edit one, update all» billig. Genau das Muster unserer Command/Derive-
Trennung: Nutzereingaben als semantische Referenzen speichern, Geometrie neu ableiten.

### 3.5 Kennzahlen-Live-Feedback

**Belegt.** GFA/GIA/NIA/UFA aus Masse, Geschosshöhen, Wanddicken, Programmen; Custom
Properties als lineare Funktion über NIA/GFA; Update in Echtzeit. [D-Calculate-Data]

**Hypothese.** Reine synchrone Parametrik-Ableitung (Footprint-Fläche × Geschosse,
NIA = GIA − Innenwandabzug …), kein Solver — dieselbe Klasse wie unser sia416.ts +
Kennzahlen-Panel. Die «CO2/Light-Dashboards» [AEC] sind Proxy-Metriken (kg CO2e/m²,
Fassaden/Flächen-Verhältnis als Tageslicht-Proxy), keine Simulation — die Doku nennt
bei Tageslicht konsequent Fassadenzugang, nie Raytracing.

### 3.6 Regel-Checks (Graph Rules)

**Belegt.** Regeln = Mindestgrössen je Raumtyp u.ä. im Compliance-Panel; Verstösse
färben Räume live rot, auch während des Zeichnens; Accessibility über Möbel-
Bewegungsflächen + Kollisionswarnung; Enterprise-Scoring legt Compliance offen.
[D-New-Features 06/2024, D-Copilot, D-Furniture]

**Hypothese.** Deklarative Regel-Sätze (Raumtyp → Prädikate über Graph+Geometrie),
ausgewertet bei jeder Ableitung — strukturell identisch zu unserem `pruefeGrundriss()`,
nur (a) **pro Raumtyp konfigurierbar statt hart kodiert**, (b) in die **Generierung
rückgekoppelt** (Regeln = Non-negotiables/Scores), (c) **regional parametrisiert**
(Region-Filter der Plan-Library).

---

## 4 · UX-Muster, die Finch stark machen

1. **Anytime-Optimierung zum Zuschauen.** Die Generierung läuft sichtbar, verbessert
   sich, der Architekt dreht **währenddessen** an Trade-off-Slidern, pausiert, bakt.
   Kein Blackbox-Batch, kein «Bitte warten». → Passt zu KosmoOrbit: unser Muster
   «Vorschlag als gated Diff-Karte» bleibt, aber der Generator darf ein *lebendes
   Panel* sein (wie unsere Volumenstudien-Karten, nur iterierend).
2. **Harte Regeln und weiche Wünsche getrennt.** Non-negotiables vs. Weights — der
   User versteht sofort, was verhandelbar ist. → Direkt übernehmbar (Fehler/Warnung/
   Hinweis-Dreistufigkeit haben wir schon; Gewichts-Slider fehlen).
3. **Ampel-Live-Feedback im Plan** statt Report daneben: Egress grün/grau/rot,
   Ziel-Treffer als Farbe, Nichterfüller grau. → Passt perfekt zur Werkplan-Ästhetik
   (Befunde als Karteikarten + Färbung im Plan; heute springen wir nur zur Entity).
4. **Erklärende Fehlschläge.** «Der Mix passt nicht, weil … — so löst du es.» Ehrliche
   Diagnose statt leerem Resultat — deckungsgleich mit unserer «ehrlich markieren»-
   Kultur (Volumenstudien-Flags).
5. **Alles bleibt editierbar.** Generieren erzeugt normale Bürger des Modells, kein
   Spezialobjekt. → Bei uns garantiert die Command/Undo-Architektur das bereits.
6. **Generieren in Abschnitten.** Lokale Kontrolle schlägt globale Automatik — der
   Architekt zäunt Bereiche ein und füttert den Algorithmus stückweise.
7. **Die Bibliothek als Gedächtnis des Büros.** «Never again start from a blank
   slate»: eigene Pläne + Constraints + Tags werden zum privaten Datensatz, der jede
   Generierung prägt. → Das ist die Finch-Fassung unseres Kosmo-Lernversprechens
   (Journal/RAG/LoRA) — nur auf Geometrie statt Sprache.
8. **Zwei Ebenen, klare Kontexte.** Story-Level ↔ Unit-Level mit deutlichen
   Kontexthinweisen und Linked-Plan-Menü; Doppelklick als Abstieg. → Unser Modul-Dock
   + Inspector können das Muster «Ebene betreten» übernehmen (Zone doppelklicken →
   Wohnungs-Editor).
9. **Tastatur-Vokabular + Zahlen-Tippen beim Ziehen** (w/s/t/d, Distanz eintippen
   während des Drags — haben wir; shift+c Constraints, b Bounds fehlen uns).
10. **Parallelkoordinaten für Variantenentscheid** — ein einziges, dichtes Diagramm
    statt Tabellenwald. → Ideal für unsere Volumenstudien/Varianten und KosmoVis-Scores.

**Nicht** in die KosmoOrbit-Formensprache passt: Finchs Cloud-Zwang (wir sind
local-first), der Enterprise-Gate vor den besten Funktionen und die Beschränkung der
Pläne auf möblierte 2D-Welt ohne Schnitte/Ansichten — unsere Stärke (SIA-Plansätze,
Poché, Axo) beginnt genau dort, wo Finch aufhört.

---

## 5 · Datenmodell-Hypothese

Aus Doku-Begriffen rekonstruiert (Begriffe in `Code` sind belegte Finch-Namen):

```
Organisation (Enterprise: firmweite Datasets, SSO)
└─ `Project` (Messsystem, Ort/Sonne, Kamera)
   └─ `Variant` (+ `Variant Bundle` fürs Masterplanning)   ← vergleichbar, Time Machine je Variante
      └─ Building Mass (mehrere Körper, Voids, Tunnels; aus Rhino/Revit/Forma; Layer:
         `Mass` `Context` `Grid lines` `Attractor points` `Centerlines` `Custom geometry`)
         └─ `Story` (Höhe, `Program`-Zuweisung, Outer-Wall-Dicke)
            └─ Floor Plate (2D-Editor-Ebene)
               ├─ Circulation: `Corridor` / `Stairs` / `Elevator` (= `Space Types`)
               ├─ `Centerline`, `Stairwell Attractors` (Steuer-Geometrie)
               └─ `Unit` (Wohnung; gehört zu `Unique Units`-Gruppen)
                  └─ `Plan` (ggf. in `Plan Group` = verknüpfte Instanzen mit Spiegel-Transform)
                     ├─ `Walls` / `Doors` (parametrisch) / `Space Dividers`
                     ├─ `Spaces` (Raumtyp, Fläche) ── abgeleiteter GRAPH (Knoten/Kanten)
                     ├─ `Furniture`-Instanzen (Objekt-Library, Inner/Outer `Bounds`)
                     └─ `Constraints` (locked / extendable je Wand)
Bibliotheken (projekt-übergreifend):
├─ `Adaptive Plan Library` (Pläne + Constraints + `Tags` + Region + Zimmer/Bad-Zahl)
├─ `Object Library` (Möbel + Accessibility-Bounds; Upload aus Revit-Familien)
└─ `Graph Rules` (Regel-Sätze je Raumtyp; Enterprise: `Graph Studio`)
Ableitungen: Key Figures (GFA/GIA/NIA/UFA, Custom Properties), Scores, Egress-Ampeln,
Parallel-Axis-Daten, BIM-Export (Revit-Familien), CSV.
```

Kernaussagen der Hypothese: **zwei Vokabulare** («Programs» grob am Geschoss, «Space
Types» fein in der Einheit — bei uns: Zonen-SIA-Klasse vs. Raumtyp wäre die Analogie);
**Steuer-Geometrie ist Modell-Bürger** (Centerlines, Attractors — wie unsere
GridAxis/Boundary); **Vorlagen tragen ihre Verformungsregeln selbst** (Constraints
gehören zum Plan, nicht zum Projekt); **Instanzen statt Kopien** für identische
Wohnungen.

---

## 6 · Abgleich mit dem KosmoOrbit-Bestand

### Existiert schon (und teils über Finch hinaus)

| Finch-Funktion | KosmoOrbit-Bestand | Befund |
|---|---|---|
| Key Figures live | Kennzahlen-Panel GF/aGF/HNF (sia416.ts, Faktoren einstellbar), Berechnungsliste (ROADMAP 25) mit Soll/Ist je Wohnungstyp, Farbcodes, Tie-out | **≥ Finch** fürs CH-Vokabular; Finchs Custom Properties (€/m², CO2e/m²) fehlen als freie Nutzerformel |
| Grundriss-Checks | `derive/checks.ts`: Zimmerbreite, Zimmerfläche, Türbreite SIA 500, Brüstung, Treppen (Schrittmass/Steigung/Laufbreite/Podest), Raumhöhe, Baugrenze inkl. Höhe | vorhanden, aber **hart kodiert** — Finch hat konfigurierbare Regeln je Raumtyp; und uns fehlt der **Fluchtdistanz-Check** (Mandat Q12 nennt Fluchtwege!) |
| Massing / Volumen | Volumenstudien-Generator (Teppich/Riegel/Turm/Zeilen/Winkel/Blockrand, Geschosshöhen-Logik, Spänner-Tiefen, 3h-Kriterium, Baugrenzen) | **≥ Finch** bei Regelwissen; Finch generiert nicht selbst Massen, wir schon — aber Finch vergleicht Varianten stärker (Parallel-Axis) |
| Raster | Raster-Assistent (VSS) + GridAxis im Modell + magnetischer Fang (ROADMAP 26, 39) | ebenbürtig zu Finchs Grid-Import/Snap; Finch nutzt das Raster zusätzlich **als Generierungs-Gewicht** |
| Schatten/Sonne | Schattenstudie (suncalc, Datum/Zeit) | ebenbürtig |
| Varianten/Versionen | Projekt-Tresor je Variante, Undo/Journal, Yjs | Finchs Time Machine ≈ vorhanden; echter **Varianten-Vergleich in einer Ansicht fehlt** |
| Editierbarkeit, 2D-Werkzeuge | Wände/Türen/Zonen, Distanz-Tippen, Undo, Bemassung anklicken | ebenbürtig; Mirror/Array/Smart-Rotate fehlen als Komfort |
| «Alles editierbar + gated» | Command-System, Diff-Karten, Aktionsketten | unser Muster ist sogar strenger (Review-Gate) |
| BIM-Export | IFC4-Export (verifiziert), DXF, Pläne | anderer Weg (offen statt Revit-Familien), gleichwertig fürs Büro |
| Raumtyp-Wissen | Zone mit SIA-416-Klasse; Berechnungsliste mit Wohnungstypen | Basis da — aber **kein Raumtyp unterhalb der Zone** (Bad/Küche/Zimmer) und **kein Graph** |

### Fehlt (die eigentliche Finch-Essenz)

1. **Raumgraph als abgeleitete Struktur** (Zugang/Adjazenz/Tageslicht je Zone) — Fundament für alles Weitere.
2. **Fluchtweg-/Egress-Distanzcheck** mit Ampel — explizit im Owner-Mandat (Q12), noch offen.
3. **Generativer Grundriss**: Korridor/Kern-Vorschlag + Wohnungs-Segmentierung nach Soll-Mix (unsere Berechnungsliste liefert den Soll-Mix bereits!).
4. **Gewichts-Scoring + Anytime-Loop** (Trade-off-Slider, Score-Transparenz).
5. **Adaptive Plan-Vorlagen** (Wohnungs-Layouts mit Stretch-Constraints, Adaptivity-Score, Auto-Spiegelung) + Plan-Gruppen (linked units).
6. **Konfigurierbare Regel-Sätze** je Raumtyp (statt hart kodierter Checks) mit Live-Färbung im Plan.
7. **Parallel-Axis-Variantenvergleich** über Kennzahlen/Scores.
8. **Möbel mit Bewegungsflächen** (SIA 500-Manövrierflächen) + Kollisionswarnung.
9. **Raumtyp-Vorschlag beim Zeichnen** (Copilot-Moment — bei uns natürlicher Kosmo-Job).
10. **Custom-Kennzahlen** als Nutzerformel (CHF/m², kg CO2e/m² auf GF/HNF).

---

## 7 · Priorisierte Bau-Blöcke (Stil V2-Entscheidungsvorlage)

> Aufwand in Blöcken: S = 1, M = 2–4, L = 5+. Alle Blöcke sind container-machbar
> (reine Kernel/UI-Arbeit); HomeStation nirgends zwingend. Reihenfolge = mein
> Vorschlag für maximalen Hebel bei minimalem Risiko.

| # | Block | Inhalt (konkret) | Nutzen fürs Büro | Aufwand | HomeStation? |
|---|---|---|---|---|---|
| F1 | **Raumgraph im Kernel** | `derive/raumgraph.ts`: Knoten = Zonen (+ Raumtyp-Feld auf Zone: zimmer/küche/bad/korridor/treppe …), Kanten aus Tür-Öffnungen + Zonen-Adjazenz; Erreichbarkeits-Abfragen (Zone→Treppe). Reine Ableitung, testbar mit Fixtures | Fundament für F2–F5; macht Checks «verstehend» statt geometrisch | **M** | nein |
| F2 | **Fluchtweg-Check (Egress)** | Kürzester Weg Zonentür→Treppenhaus über Korridor-Zonen (Pfad auf F1-Graph, Länge entlang Korridor-Mittelachse); Parameter ein Ausgang/mehrere (Default 20 m/35 m, einstellbar, VKF-Richtwert prüfen); Ampelfärbung im Grundriss + Befund in checks.ts | schliesst die **explizite Q12-Lücke** «Fluchtwege»; jeden Wettbewerb prüfbar | **M** | nein |
| F3 | **Regel-Sätze statt Hardcode** | `DocSettings.regeln`: je Raumtyp Minfläche/Minbreite/Tageslicht-Pflicht, dreistufige Schwere, Presets «CH-Wohnbau / Wettbewerb / aus»; checks.ts liest Regeln; Live-Färbung verletzter Zonen im Plan (nicht nur Panel) | Checks werden büro-konfigurierbar (Finchs Graph-Rules-Essenz); Kosmo kann Regeln per Sprache setzen | **S–M** | nein |
| F4 | **Varianten-Vergleich (Parallel-Axis)** | Panel im Design-Modul: Varianten/Volumenstudien als Linien über Achsen (GF, aGF-Δ, HNF, Kompaktheit, Besonnung, Regelverstösse); SVG, Hover-Highlight; Export aufs Blatt | Entscheid-Grafik für Owner + Jury; nutzt nur Bestehendes | **S–M** | nein |
| F5 | **Wohnungs-Segmentierer v1** (Finch-Kern, ehrlich klein geschnitten) | Eingabe: Geschoss-Footprint + Korridor-Zone (gezeichnet) + Soll-Mix aus der Berechnungsliste. Algorithmus: Schnittstationen senkrecht zur Fassade, gewichtete Score-Suche (Flächentreffer/Mix/Tageslicht-Proxy/Raster-Nähe), Non-negotiables (Korridorzugang, Minbreite aus F3), Rest-Wohnung ehrlich ausgewiesen; Resultat als **gated Aktionskette** (Zonen anlegen), «Warum passt es nicht»-Diagnose | der eigentliche Finch-Moment: Soll-Programm → Wohnungen im Geschoss, in Minuten statt Stunden | **L** | nein |
| F6 | **Weights-Panel + Anytime-Loop für F5** | Slider (Grösse/Mix/Licht/Raster), Iterationen im Worker, Live-Vorschau, Pause/Übernehmen; Score-Aufschlüsselung je Wohnung (Transparenz) | macht F5 vom Batch zum Dialog — das UX-Muster, das Finch gross gemacht hat | **M** (setzt F5 voraus) | nein |
| F7 | **Adaptive Zonen-Vorlagen** | Wohnungs-Layout (Zonen+Türen) als Vorlage speichern; je Wand locked/extendable; achsweiser linearer Stretch (Verallgemeinerung unseres affinen Wand-Systems); Einsetzen mit Auto-Rotation/Spiegelung + Passungs-Score; Vorlagen-Katalog als Karteikarten | «nie mehr beim weissen Blatt anfangen» — Büro-Gedächtnis auf Geometrie-Ebene; Vorstufe: TKB- und Wettbewerbs-Grundrisse als Erst-Bibliothek | **L** | nein |
| F8 | **Bewegungsflächen-Möblierung** | Möbel-Katalog (Bett/Küche/WC, parametrisch gezeichnet wie Materialkarten) mit SIA-500-Manövrierflächen; Kollisionswarnung Wand↔Bewegungsfläche als Check | hindernisfreies Bauen wird sichtbar statt Checkliste | **M** | nein |
| F9 | **Custom-Kennzahlen** | Nutzerformeln Wert × (GF/aGF/HNF) × Einheit (CHF/m², kg CO2e/m²) im Kennzahlen-Panel + Berechnungsliste + CSV | Kostenschätzung/Ökobilanz-Proxy gratis aus Bestehendem | **S** | nein |
| F10 | **Raumtyp-Copilot** | Beim Zonen-Zeichnen schlägt Kosmo den Raumtyp vor (Heuristik: Fläche/Lage/Nasszellen-Nähe; optional LLM); Klick übernimmt — gated wie alles | kleiner Zauber-Moment, füttert F1–F3 mit Typen | **S** | nein (Ollama optional) |

**Empfehlung.** (1) **F1+F2 zuerst** — sie schliessen die einzige noch offene
Q12-Teilforderung (Fluchtwege) und legen das Graph-Fundament; (2) dann **F3+F4** als
schnelle, sichtbare Gewinne; (3) dann der grosse Block **F5→F6** (Segmentierer) —
er macht aus der vorhandenen Berechnungsliste einen Generator und ist das eigentliche
Finch-Äquivalent; (4) **F7** danach, wenn erste eigene Wohnungslayouts als Vorlagen
existieren; F8–F10 als Politur dazwischenschieben, wo Luft ist. Bewusst NICHT bauen:
Finchs Cloud-Architektur, Revit-Familien-Export und der Anspruch «alle Typologien» —
unser Graben ist CH-Regelwissen + SIA-Pläne + local-first, nicht Breite.

---

## 8 · Quellenverzeichnis + Lückenliste

### Quellen (alle öffentlich, abgerufen 03.07.2026)

**Erste Hand (Finch):**
- [W] https://www.finch3d.com/ · /product · /get-started · /customers (Positionierung, Archie, Pricing, Kundenzitate Sweco/Sheppard Robson/Dark/Nordic, Kennzahlen 130k/70+)
- [D] https://docs.finch3d.com/ — vollständiger Index via https://docs.finch3d.com/llms.txt; zentral ausgewertete Seiten (jeweils als `.md` abrufbar):
  - `/docs/projects-and-variants/story-editor/algorithm-theory` (Kern-Algorithmus, Buckets, Scoring/Weights — Finchs eigene Erklärung)
  - `/docs/projects-and-variants/story-editor/generate-unit-mix-and-stairwells`, `…-and-corridors`, `…-around-circulation`
  - `/docs/projects-and-variants/unit-editor/adaptive-plan-library`, `assign-adaptive-plans`, `enterprise-generate-unit-plan`
  - `/docs/projects-and-variants/massing-studio/customize-your-mass`, `calculate-data` (GFA/GIA/NIA/UFA, Custom Properties)
  - `/docs/projects-and-variants/feature-bank`, `export`, `tools-and-commands`, `iterate-with-variants`
  - `/readme/new-features` (datierter Changelog 09/2023–heute: Graph Studio 08/2024, Graph Rules 06/2024, Floor Plate 2.0 09/2024, Grid-aware 04/2024 …)
  - `/readme/about` (Typologie-Matrix), `/readme/faq` (Kompatibilität)
  - Kurse: `finch-101-generate-floor-plate-algorithms`, `finch-101-generate-corridor`, `finch-101-generating-unit-plans`, `drawing-a-floor-plan-with-ai-co-pilot`, `adding-furniture-and-constraints`
- [AEC] aecmag.com/ai/finch3d-starts-to-sing/ (30.01.2023 — Gründung, Seed €2.5M, White/HdM, O-Ton-Zitate zum Graph)
- [AT] architosh.com/2024/09/finch3d-advances-ai-based-floor-plan-generator/ (Floor Plate 2.0: Ranges, Transparenz, Dual-Aspect)
- [DZ] dezeen.com/2019/06/27/adaptive-floor-plans-wallgren-arkitekter-box-bygg-parametric-tool/ (Ursprung)
- [IL] illustrarch.com/articles/75056-finch3d-review.html (16.04.2026 — «Finch Graph» statt Pixel-Training, Einordnung vs. Forma/Maket)
- [S] Web-Such-Snippets: Crunchbase/Tracxn (Runde 2025, ~€1M Ampli Ventures) — **nicht direkt verifiziert**.

### Ehrliche Lückenliste

1. **Kein App-Zugriff.** Die Web-App liegt hinter Login — bewusst nicht betreten. Alle UI-Abläufe stammen aus Doku/Tutorial-Texten; Screenshots/Videos konnte ich nicht ansehen (YouTube über den Proxy nicht abrufbar). Feinheiten der Interaktion (z.B. wie die Weights-Slider exakt beschriftet sind) können abweichen.
2. **Algorithmen-Interna sind Hypothesen.** Finch publiziert keine Paper; Optimierer-Typ (evolutionär vs. annealing), Graph-Repräsentation und ob beim Enterprise-Plan-Generator ein trainiertes Modell mitläuft, sind aus Verhalten/Doku rekonstruiert und in Abschnitt 3 als [Hypothese] markiert.
3. **Keine Finch-Patente gefunden.** Suche nach einschlägigen Patenten ergab nur namensgleiche Fremd-Patente (u.a. US4912657A, 1990, anderes Gebiet). Negativbefund, keine Garantie auf Vollständigkeit.
4. **Graph Studio** nur aus Changelog-Absatz + Videotitel bekannt — Detailtiefe (Regel-Editor-Syntax) unbekannt.
5. **Finanzierung 2025** nur Sekundär-Snippets [S]; die Roadmap-Seite der Doku ist ein toter Link («broken://»), Prioritäten der Firma daher unbekannt.
6. **Proxy-Blockaden dokumentiert:** WebFetch auf finch3d.com/aecmag/architosh lieferte 403 — umgangen via direktem curl über den Session-Proxy (erlaubter Weg); docs.finch3d.com brauchte Retries. Nicht erreichbar blieben: YouTube-Transkripte, Vimeo, LinkedIn-Posts der Gründer, Medium-Artikel (nicht versucht nach 403-Serie).
7. **Preise/Zahlen sind Momentaufnahme** 07/2026 und Marketing-Angaben der Website.

---

## 8 · Nachtrag 11.07.2026 — Product-Page-Analyse & v0.7.0-Abdeckung

> Stream 6A (v0.7.0 Welle 6, «BIM-Export-Härtung + Interop-Doku»). Anlass:
> `docs/V070-KONZEPT.md` E5 wertet die aktuelle finch3d.com/product-Seite
> (Text + Videos, 10.07.2026) neu aus — ein sechs Punkte umfassender Katalog,
> der bündelt, was Finch heute als Kernprodukt bewirbt. Dieser Nachtrag hält
> den Katalog fest, gleicht ihn gegen den v0.7.0-Stand von KosmoOrbit ab und
> begründet die eine bewusste Auslassung (Enterprise/SSO). Append-only —
> Abschnitte 1–7 oben bleiben unverändert.

### (a) Der 6-Punkte-Katalog der Product-Page (10.07.2026)

Aus `docs/V070-KONZEPT.md` E5 übernommen (dort bereits mit Quelle
finch3d.com/product, Text+Videos, belegt):

1. **Plan Library mit eingebetteten Regeln** (Accessibility/Code/Constraints)
   als Generierungs-Basis.
2. **Generierung** — «feasibility → detailed layouts in minutes», tausende
   Echtzeit-Varianten, Instant-Feedback.
3. **Agent «Archie»** — Türplatzierung, Compliance-Checks, verkettete
   Einheiten-Updates.
4. **BIM-Modell + Export** ohne Neuzeichnen.
5. **Interop Rhino/Revit/Grasshopper.**
6. **Enterprise/SSO/Teams.**

### (b) Abdeckungstabelle: Finch-Claim → KosmoOrbit-v0.7.0-Stand

| # | Finch-Claim | KosmoOrbit v0.7.0 | Befund |
|---|---|---|---|
| 1 | Plan Library mit eingebetteten Regeln | ✅ Vorlagen-Feld `regeln: string[]` (Regelpreset-Ids, ROADMAP 318, Stream 4B/v) + Adaptive Zonen-Vorlagen (F7-Locks, `dehnung: 'fest'\|'dehnbar'`, Stream 4B/ii) | Vorlagen tragen jetzt ihre eigenen Regeln UND ihre eigenen Verformungs-Constraints — beide Finch-Bausteine (Adaptive Plan Library + Graph Rules) sind im Vorlagen-Objekt vereint |
| 2 | Generierung: feasibility → Layouts in Minuten, Echtzeit-Varianten | ✅ `derive/variantensuche.ts` (ROADMAP 317, Stream 4A/i): seeded synchroner Anytime-Generator (Greedy-DP-Start + Ruin-&-Recreate-Züge), Score = gewichtete Kennzahlensumme, deterministisch bei fixem Seed; dazu `VariantenPanel.tsx` + die verallgemeinerte `kennzahlMatrix()` (Stream 5A, «Echtzeit-Varianten-UI + Kennzahl-Matrix», Commit 8b3e7a6 — eigener ROADMAP-Eintrag dort noch offen), UI zieht in `requestIdleCallback`-Zeitscheiben — Echtzeit-Feedback wie Finchs Weights/Trade-off-Slider, aber ohne Worker-Infrastruktur | ✅ 317 (+ 5A) |
| 3 | Agent «Archie»: Türplatzierung, Compliance-Checks, verkettete Updates | ✅ **Kosmo-Präzisier** (Stream 5B/iv): 3 Commands `design.tuerenPlatzieren` (Raumgraph-Erschliessung), `design.komplianzFixes` (Checks-Befunde → Diff-Karten-Patches via `runCommand`), `design.einheitTypAktualisieren` (eine Änderung → alle Instanzen, EINE Undo-Gruppe) — exakt Archies drei genannte Aufgaben, aber gated durch dieselbe Diff-Karten-Architektur wie jeder andere Kosmo-Vorschlag (kein stiller Agenten-Autopilot) | ✅ Kosmo-Präzisier |
| 4 | BIM-Modell + Export ohne Neuzeichnen | ✅ IFC4 (`ifc/export.ts`, ifcopenshell-verifiziert) + DXF (`dxf/export.ts`, ezdxf-verifiziert, roundtrip-gehärtet in diesem Stream) — beide aus derselben Parametrik abgeleitet wie SVG/PDF, kein Neuzeichnen | ✅ IFC/DXF-Brücke mit Grenzen (s. `docs/INTEROP.md` §6) |
| 5 | Interop Rhino/Revit/Grasshopper | ◐ `docs/INTEROP.md` (neu, dieser Stream): konkrete, ehrliche Wege über IFC/DXF für alle drei Werkzeuge — kein natives `.3dm`/`.rvt`, keine Revit-Familien, kein Live-Grasshopper-Endpunkt | ➜ `docs/INTEROP.md` |
| 6 | Enterprise/SSO/Teams | ✖ bewusst ausgelassen | Begründung (c) unten |

### (c) Begründete Enterprise/SSO-Auslassung

KosmoOrbit baut **keine** SSO-/Mandanten-/Teams-Fassade nach — drei
unabhängige, jede für sich hinreichende Gründe:

1. **Lokal-first Einzelbüro statt Mandanten-Backend.** Der ganze Kernel ist
   auf ein einzelnes Büro/einen einzelnen `.kosmo`-Datenraum ausgelegt
   (`KosmoDoc` + Yjs-Dokument, kein serverseitiges Multi-Tenant-Modell, kein
   Nutzerverzeichnis, keine Rollen-/Berechtigungstabelle im Datenmodell).
   Ein «SSO-Knopf» ohne dahinterliegendes Mandanten-Backend wäre reine
   Fassade — ein Login-Dialog, der auf nichts einzahlt, das im Modell
   existiert.
2. **Yjs-Sync deckt die reale Team-Kollaboration bereits ab.** Das
   Kernbedürfnis hinter Finchs «Enterprise/Teams» — mehrere Personen arbeiten
   gemeinsam am selben Projekt — ist in KosmoOrbit bereits gelöst
   (`tools/sync-server`, Yjs-Dokument-Sync, Journal/Undo geteilt). Was fehlt,
   ist nicht Kollaboration, sondern eine Enterprise-IT-Anbindung (SSO/SCIM/
   Verzeichnisdienst) — die für ein «einzelnes Büro mit einem HomeStation-
   Server» keinen Gegenwert hat, den es einzukaufen gäbe.
3. **Owner-Mandat «Ehrlichkeit vor Politur» (CLAUDE.md) verbietet
   SSO-Fassaden.** Ein SSO-Button, der auf keinen echten Identity-Provider-
   Vertrag, kein Abo-Backend und kein Mandantenmodell trifft, wäre exakt das,
   was das Owner-Mandat ausdrücklich untersagt: «was die HomeStation/ein
   Konto/ein Schlüssel braucht, wird im UI offen benannt, nicht vorgetäuscht.»
   Enterprise/SSO bleibt daher **kein GEPLANT-Punkt, sondern ein bewusster
   architektonischer Nicht-Bau** — wie `.pln`/`.psd`/`.idml`/`.3dm` in
   `docs/INTEROP-KONZEPT.md` §4: kein Rückstand, sondern ein Entscheid gegen
   Lock-in-Nachbau von etwas, das ausserhalb des lokal-first-Modells liegt.
