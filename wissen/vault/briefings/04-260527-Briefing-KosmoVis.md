---
titel: "04 260527 Briefing KosmoVis"
quelle: "Kosmos-Briefing V0.1"
datei: "04 260527 Briefing KosmoVis.pdf"
seiten: 13
ocr-seiten: 0
tags: [projekt, briefing]
---

# 04 260527 Briefing KosmoVis

## S. 1

KosmoVis
Visualisierungs-Werkzeug fuer die Entwurfsphase
Cycles-Render des TKB-Modells (Pipeline V7, 512 Samples, AgX) - Ausgangspunkt fuer alle KI-Stilvarianten.
Briefing fuer die Buerobereiche-Leitung
27. May 2026
Andrin Baumann - ETH Master in Architektur

## S. 2

Kapitel 01
Worum geht es?
KosmoVis ist ein Software-Werkzeug, das die Visualisierung in der
Entwurfsphase stark beschleunigt - von der ersten Idee bis zum
fertigen Wettbewerbsbild.
Das Werkzeug arbeitet in Blender, der etablierten Open-Source-3D-Software, und
kombiniert klassisches Rendering (Cycles, vergleichbar mit V-Ray oder Corona) mit
Kuenstlicher Intelligenz, die in Sekunden mehrere Stilvarianten desselben Entwurfs
erzeugt.
Statt fuenf Tage an einem Hero-Bild fuer einen Wettbewerb zu arbeiten, liefert KosmoVis
in einer halben Stunde einen ersten kompletten Bilderpool mit verschiedenen
Atmosphaeren, Materialvarianten und Tageszeiten - alle vom gleichen 3D-Modell
ausgehend. Der Architekt entscheidet, welche Variante zur Identitaet des Projekts passt.
Der zweite Hebel: Datenfluss. Modelle, Materialien, Referenzbilder und Varianten landen
nicht in einzelnen Dateien auf verschiedenen Festplatten - alles wird projektweise
verknuepft, versioniert und ist fuer die naechste Phase (Bauprojekt, Plangenerierung,
Wettbewerbslayout) wiederverwendbar.
„KI macht Varianten billig. Wert entsteht bei Verantwortung, Orchestrierung und
Ausfuehrung.“
Aus dem Strategiebericht „Architekturbuero 2045“ - Leitprinzip des Werkzeugs.

## S. 3

Kapitel 02
Was kann das Werkzeug heute?
Das Werkzeug deckt den kompletten Visualisierungs-Workflow ab -
von der ersten Massierung bis zum ArchiCAD-Roundtrip.
Eingang: das 3D-Modell
Das Werkzeug erkennt automatisch das Hauptgebaeude im Modell (auch wenn rundherum
Bestand oder Topographie liegt), errechnet die genaue Bauhuelle und schlaegt zwoelf
Standardkameras vor - vier frontale Augenhoehen-Perspektiven plus acht diagonale im
klassischen 2/3-Bildaufbau, wie sie in Wettbewerben ueblich sind.
Materialien: schneller als per Hand
Materialien aus dem 3D-Modell werden automatisch mit hochaufloesenden Texturen aus
einer kuratierten Bibliothek belegt. Was nicht in der Bibliothek ist, wird per KI nachgeneriert
(Beton-Roh, gestockter Sichtbeton, Eichenholz-Diele, etc.). Pro Material gibt es
Mini-Vorschauen direkt im Werkzeug, sodass die Wahl visuell statt textbasiert getroffen
werden kann.
Rendering + KI-Varianten
Cycles rendert wie gewohnt das fotorealistische Bild. Parallel produziert die integrierte
KI-Pipeline fuenf Stilvarianten desselben Bildes - etwa „Olgiati-typisch monolithisch,
Mittag“, „Caruso-Backstein, Abendsonne“, „skandinavisch luftig, Morgenstimmung“. Die
Varianten sind keine wilden KI-Halluzinationen: sie behalten Geometrie und Bauhuelle
exakt bei und aendern nur Material, Licht und Atmosphaere.
Nachbearbeitung: gezielt korrigieren
Wenn ein Detail nicht passt - eine Fassadenpartie ist zu kalt, die Bank im Vordergrund
stoert, die Atmosphaere will Regen statt Sonne - markiert der Architekt die Region,
schreibt einen kurzen Wunsch („dunkler Sichtbeton“, „Person laeuft links durchs Bild“), und
das Werkzeug ersetzt nur die markierte Stelle, ohne den Rest neu zu rendern.
Ausgang: Pakete fuer die naechsten Phasen
Das Werkzeug exportiert nicht nur Bilder, sondern auch ArchiCAD-kompatible
IFC-Modelle. Damit fliessen die Erkenntnisse aus der Visualisierungsphase sauber
zurueck in die BIM-Welt - kein doppeltes Modellieren, kein Versionschaos.

## S. 4

Kapitel 03
Wie funktioniert es im Hintergrund?
Das Werkzeug ist ein Add-on innerhalb von Blender mit einer eigenen,
visuellen Knoten-Oberflaeche - vergleichbar mit dem
Grasshopper-Editor in Rhino.
Jede Aufgabe entspricht einem „Knoten“ (deutsch: Node): Eingang, Gebaeudeerkennung,
Kamerasetzung, Materialkatalog, Rendering, KI-Varianten, Nachbearbeitung, Export.
Diese Knoten werden in der gewuenschten Reihenfolge verbunden. Wer schon einmal in
Grasshopper, ArchiCAD-Eigenschaften oder Photoshop-Aktionen gearbeitet hat, kennt
das Prinzip.
Das Add-on laeuft lokal auf dem eigenen Rechner. Fuer die Bild-KI-Verarbeitung ist eine
separate Software namens ComfyUI integriert - sie verwendet Open-Source-Modelle
(Stable Diffusion, FLUX), die einmalig heruntergeladen werden und dann ohne
Internet-Verbindung funktionieren. Es entstehen keine laufenden Cloud-Kosten.
Optional kann das Werkzeug auf Cloud-Dienste zurueckgreifen, wenn die lokale Hardware
nicht 
ausreicht 
- 
etwa 
fuer 
extrem 
hochaufloesende 
Renderings 
oder 
fuer
3D-Punkt-Welten, die in Echtzeit durchwandert werden koennen (Marble-Technologie).
Diese externen Aufrufe werden vorher angezeigt und muessen explizit freigegeben
werden, damit es keine unerwarteten Rechnungen gibt.
Sicherheit + Nachvollziehbarkeit
Zu jedem KI-generierten Bild speichert das Werkzeug automatisch eine Begleitdatei mit
Zeitstempel, verwendeten Stilreferenzen, Random-Seed und Quellprompt. Damit ist
jederzeit nachvollziehbar, wie ein Bild entstanden ist - wichtig fuer Wettbewerbe
(Urheberschaftsfragen) und fuer die spaetere Reproduzierbarkeit.

## S. 5

Kapitel 03b
Demonstration - vom Cycles-Bild zur begehbaren
Welt
Konkrete Veranschaulichung der Cloud-Bruecke. Diese Woche live
getestet, Kosten: 0.15 CHF fuer den ganzen Lauf.
Aus dem auf der Titelseite gezeigten Cycles-Render hat das Werkzeug am 27. Mai 2026 in
zwei Minuten eine vollstaendige begehbare 3D-Welt erzeugt (World Labs Marble). Die KI
hat die Szene wie folgt selbst eingeordnet:
The scene is a photorealistic depiction of a modern Swiss architectural plaza, imbued
with the warm glow of golden hour, casting long, soft shadows and highlighting the
textural details of the urban environment ...
Automatische Bildbeschreibung der Marble-KI - dient gleichzeitig als Beleg der Bild-Interpretation.
Marble-Welt aus dem Cycles-Render - 25 MB Gaussian-Splats + kollisionsfaehiges 3D-Mesh + Panoramabild,
alles in 2 Minuten.
Was bedeutet das praktisch?
Statt einem statischen Hero-Bild zeigt der Architekt der Bauherrschaft eine Welt, durch die
sie via Browser oder VR-Brille selbst fliegen kann. Sie sieht die Proportionen aus jedem
Winkel, ohne dass das Atelier zehn Renderings nachschiessen muss. Die Wirkung auf
Praesentations-Gespraeche ist betraechtlich - und der Run kostet weniger als ein Kaffee.

## S. 6

Kapitel 04
Projektstand
Das Werkzeug deckt aktuell alle fuenfzehn urspruenglich definierten
Anforderungen ab. Erste Live-Tests sind durchgelaufen, ein erster
Cloud-Bezug zu „Marble“ (eine begehbare 3D-Welt aus einem einzigen
Bild) wurde diese Woche erfolgreich validiert.
Spezifikations-Erfuellung
Modul
Stand
Modell-Import + Gebaeudeerkennung
Vollstaendig
Kameras (12 vorgefertigt + freie)
Vollstaendig
Materialkatalog mit HQ-Texturen
Vollstaendig
Materialgenerierung per KI
Vollstaendig
Referenz-Stilbibliothek
Vollstaendig
Cycles-Mehrfachrendering
Vollstaendig
Automatische Asset-Platzierung (Baeume / Menschen / Moebel)
Vollstaendig
KI-Bildvarianten
Vollstaendig
Korrektur per Region-Skizze
Vollstaendig
Bauteilersatz in fertigen Bildern
Vollstaendig
ArchiCAD-IFC-Export
Vollstaendig
Projekt-Gedaechtnis (cross-session)
Vollstaendig
Anbindung an Architekturkosmos-DB
Schnittstelle bereit
Wettbewerbs-Layout-Generator
Anderer Worker (Sibling-Projekt)
Stand gegenueber der Vision
Die 
Gesamt-Vision 
umfasst 
neun 
Module 
ueber 
zwei 
Phasen 
- 
von 
der
Wettbewerbsvorbereitung bis zum fertigen Plakatlayout. KosmoVis ist eines davon: das

## S. 7

Modul fuer Bild- und Variantenproduktion.
Innerhalb dieses Moduls steht das Projekt bei 100 % Spezifikations-Coverage. Die
naechsten Wochen dienen der Stabilisierung, der Anbindung an die Referenzdatenbank
(sobald das Schwester-Modul liefert) und der Aktivierung weiterer Cloud-Dienste, sobald
deren Schnittstellen offiziell verfuegbar sind (etwa Googles neues Video-aus-Bild-Modell).

## S. 8

Kapitel 05
Klassisch vs. KosmoVis
Der eigentliche Vergleich. Vier Achsen: Zeit, Qualitaet / Konsistenz,
Verfuegbare Auswahl, Kosten.
Zeit pro typischer Aufgabe
Aufgabe
Klassisch
KosmoVis
Erstes Massierungs-Rendering (Vorstudie) 1-2 Tage
20 Minuten
5 Wettbewerbs-Stilvarianten
3-5 Tage
30 Minuten
Materialwechsel + Re-Render
0.5-1 Tag
5 Minuten (KI-Re-Run)
Detailkorrektur (Region statt Re-Render)
0.5 Tag
2 Minuten
ArchiCAD-Export + Rueckfluss
1 Tag (manuelle Datei-Pflege)
10 Minuten (Roundtrip)
Komplettes Erstpaket Vorstudie
1 Woche
1 Tag
Werte konservativ, basierend auf Erfahrung in vergleichbaren Workflows.
Qualitaet + Konsistenz
Achse
Klassisch
KosmoVis
Materialtreue im Render
abhaengig vom Render-Profi
Material-ID-Pass verifiziert
Stilkonsistenz ueber Bilder
manuell zu pflegen
automatisch ueber Referenz-Skills
Variantenvergleichbarkeit
schwer (Lichtstimmung schwankt)gleicher Seed garantiert
BIM-Synchronitaet
oft schon vor Render veraltet
live ueber IFC-Roundtrip
Nachvollziehbarkeit
Datei-Versionen in Hand
automatisches Logbuch pro Bild

## S. 9

Kosten (typisches Projekt, geschaetzt)
Posten
Klassisch
KosmoVis
Render-Programm (V-Ray / Corona pro Jahr)
800-1.500 CHF
0 (Blender + Cycles)
Render-Farm (Hero-Shot 4K)
60-200 CHF / Bild
0 (lokal RTX 5090)
KI-Bildgenerierung (5 Varianten)
30-60 CHF (Midjourney / DALL-E)
0 (lokal)
Externe Visualisierungs-Agentur
5.000-15.000 CHF / Wettbewerb
intern produzierbar
Cloud-Sondereinsaetze (3D-Welt, Video)n / a
1-10 CHF pro Run, optional
Lizenzmodell
Subskription pro Person
Open-Source, einmaliges Setup
Die laufenden Kosten sinken stark, weil das Werkzeug auf Open-Source-Modellen (Stable
Diffusion, FLUX) basiert, die nach einmaligem Download lokal laufen. Externe
Cloud-Dienste werden nur dort eingesetzt, wo sie wirklich Mehrwert bringen (z.B.
begehbare 
3D-Welten 
fuer 
Bauherrenpraesentationen), 
und 
der 
Aufruf 
jedes
kostenpflichtigen Dienstes wird vorher angezeigt und bestaetigt.
Verfuegbare Auswahl
Beim klassischen Workflow muss man sich auf ein bis zwei Varianten festlegen, weil jede
zusaetzliche 
Renderzeit 
kostet. 
Mit 
KosmoVis 
sind 
fuenf 
Stilvarianten 
plus
Detailkorrekturen die Norm - die Diskussion mit dem Bauherrn wird konkreter, weil mehr
Optionen vorliegen, und das Atelier verbringt mehr Zeit beim Entscheiden statt beim
Produzieren.

## S. 10

Kapitel 06
Wo stehen wir im Markt?
Der Markt fuer KI-Visualisierungs-Werkzeuge ist 2026 aktiv - aber fuer
Architekturbueros mit BIM-Anschluss gibt es kein gleichwertiges Tool.
Werkzeug
Staerke
Schwaeche fuer unser Profil
Visoid (SaaS)
Schnell, 3D-zu-AI in Sekunden
Cloud-only, kein IFC, kein lokales Modell
D5 Render 3.0
Echtzeit + KI-Assets
Eigene 3D-Engine, kein Blender, kein BIM-Roundtrip
Magnific
Sehr hohe Bildqualitaet
Reines Bild-Upscaling, kein Modellbezug
Krea-2 (Mai 2026)
Foundation-Style-Model
Cloud-only, Subskription
Twinmotion 2026
Unreal-Basis, photorealistisch
Bewusst zurueckhaltend bei generativer KI
KosmoVis (wir)
Blender-nativ, lokal, BIM-Anschluss, Open-Source
Aufsetzen erfordert technisches Initial-Setup
Differenzierungs-Saeulen, die in der Kombination einzigartig sind: Blender-nativ (alles im
gleichen Programm wie das Modellieren) - BIM-Anschluss (IFC zu ArchiCAD ohne
Umwege) - Korrektur-Schleife (Region markieren, Wunsch eintippen, neues Bild) -
Projekt-Gedaechtnis (Materialien, Referenzen, Varianten bleiben verknuepft) - Lokale
Hoheit (eigene Daten bleiben im Haus, kein Cloud-Lock-in).

## S. 11

Kapitel 07
Was bedeutet das fuers Atelier?
Drei konkrete Geschaefts-Hebel - nicht in fuenf Jahren, sondern ab Q3
dieses Jahres.
Hebel 1 - Schnellere Vorstudien
Eine Bauherren-Anfrage in der Fruehphase „Ist das auf dieser Parzelle ueberhaupt
sinnvoll?“ wird in einem Tag mit drei Visualisierungs-Varianten beantwortet, statt in einer
Woche mit einer. Die Vorstudie wird als Pauschal-Produkt verkaufbar (zum Beispiel CHF
2.000 fix statt Stundensatz), weil der Aufwand kalkulierbar wird.
Hebel 2 - Mehr Wettbewerbe pro Quartal
Wenn das Erstpaket fuer einen Wettbewerb (5-6 Bilder, Konzeptbeschrieb, IFC-Modell) in
zwei Tagen statt in einer Woche steht, sind doppelt so viele Wettbewerbsteilnahmen mit
gleichem Personalbestand realistisch. Strategie-Bericht 2045 nennt dies „Outcome statt
Output verkaufen“.
Hebel 3 - Juengere Mitarbeiter behalten Anschluss
Das Werkzeug enthaelt bewusst eine Korrektur-Schleife („was passt nicht?“) und
Side-by-side-Vergleiche zwischen Cycles- und KI-Bildern. Junioren lernen weiterhin,
fotorealistische Bilder zu beurteilen, statt nur KI-Output abzunicken - Ausbildung bleibt
erhalten.
„Das Zukunftsbuero verkauft keine Plaene, sondern Handlungsfaehigkeit.“
Strategiebericht 2045 - zentrale These.

## S. 12

Kapitel 08
Roadmap der naechsten Monate
Zeitraum
Schritt
Juni 2026
Neue Workstation in Betrieb. Render-Geschwindigkeit x3-5 gegenueber Laptop. Lokale Hochleistun
Juli 2026
Erste reale Anwendung in einem Projekt - wahlweise eine Vorstudie oder ein kleinerer Wettbewerb.
August 2026
Google-Video-aus-Bild-Schnittstelle aktivieren (sobald oeffentlich), erlaubt 8-Sekunden-Walkthrough
September 2026
Bilanzgespraech: Was laeuft, was nicht? Anpassung des Buerobereiche-Honorarmodells (Pauschal
Q4 2026
Anbindung an das Schwester-Modul „Architekturkosmos-Datenbank“ - Referenzprojekte fliessen au
Was die Buerobereiche-Leitung jetzt entscheiden koennte
Eine konkrete Diskussionsrunde mit drei Punkten:
1. Wird eines der naechsten Projekte (Vorstudie oder kleinerer Wettbewerb) als Pilot durch
das Werkzeug geschickt? Aufwand: einmaliges Mehr von etwa drei Tagen Setup. Ertrag:
erstes Echtzeit-Feedback aus realer Anwendung.
2. Soll das Werkzeug intern als Buerobereiche-Standard etabliert werden, oder bleibt es
vorerst als Spezial-Werkzeug fuer Wettbewerbe? Auswirkung auf Honorar-Modell und
Personalstruktur.
3. Welche Schwester-Module aus der Gesamt-Vision (Wettbewerbsvorbereitung,
Planlayout, Architekturkosmos-Datenbank) sind fuer die Buerobereiche relevant - und
sollen ebenfalls weiterentwickelt werden, mit welcher Prioritaet?

## S. 13

Kapitel 09
Wenn die IT-Abteilung fragt ...
Eine kurze technische Zusammenfassung fuer den Fall, dass die Frage aufkommt, auf
welcher Basis das alles laeuft:
Komponente
Was wird verwendet
3D-Software
Blender 5.1 LTS (Open-Source)
Renderer
Cycles (Blender-integriert, vergleichbar mit Corona)
Bild-KI lokal
ComfyUI mit SDXL + FLUX + ControlNet
BIM-Schnittstelle
ifcopenshell + Bonsai-Bruecke
3D-Welten (optional cloud)
World Labs Marble (~0.15 CHF / Run)
Video-Walkthrough (geplant)
Google Gemini Omni (sobald API verfuegbar)
Lokale Hardware
Mac M1 Max (Daily-Driver) + RTX 5090 Workstation (ab Juni)
Lizenz
MIT-Lizenz, kein Vendor-Lock-in
Codebase
ca. 28.000 Zeilen Python, voll dokumentiert
Daten + Vertraulichkeit
Alle Modelle, Materialien und Visualisierungen liegen lokal beim Mitarbeiter oder auf der
Buerobereiche-Workstation. Es gibt keinen unkontrollierten Cloud-Upload. Externe Aufrufe
(Marble-3D-Welt, spaeter Gemini-Video) muessen im Werkzeug explizit pro Aufruf
bestaetigt werden und werden mit Kosten angezeigt. Mandantengeheimnis bleibt gewahrt.
Wer pflegt das Werkzeug?
Aktuell: Andrin Baumann (ETH Master in Architektur) im Rahmen der Master-Arbeit und
parallel zur Atelierarbeit. Geplant ist eine schrittweise Uebergabe an die Buerobereiche,
sobald die Stabilitaet in echten Projekten validiert ist - voraussichtlich ab Q4 2026.
- Ende des Briefings -
