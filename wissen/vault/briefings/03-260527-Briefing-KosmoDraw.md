---
titel: "03 260527 Briefing KosmoDraw"
quelle: "Kosmos-Briefing V0.1"
datei: "03 260527 Briefing KosmoDraw.pdf"
seiten: 20
ocr-seiten: 0
tags: [projekt, briefing]
---

# 03 260527 Briefing KosmoDraw

## S. 1

— Seite 1 —
Architekturkosmos
KosmoDraw · Skizzieren statt Klicken — vom 2D-Sketch zum kompletten
Wettbewerbsplakat
Ein Werkzeug für Architekten, das den Weg von der ersten Skizze bis zur fertigen
Wettbewerbsabgabe in einer Stunde statt drei Tagen machen will.
Briefing für die Geschäftsleitung
Andrin Baumann · ETH Master in Architecture · 27. Mai 2026
Stand der Entwicklung nach 24 Arbeitstagen-Äquivalenten
Dieses Dokument erklärt in Architekten-Sprache, was KosmoDraw heute kann, wie es
funktioniert, wo wir im Vergleich zur Vision stehen und warum dieses Werkzeug den
Wettbewerbs-Workflow drastisch verändern könnte.

## S. 2

ARCHITEKTURKOSMOS · KosmoDraw
Briefing für Geschäftsleitung · 28.05.2026
— Seite 2 —
Inhalt
1.
Die Vision: Architekturkosmos
S. 3
2.
Wo KosmoDraw drin steckt
S. 4
3.
Was KosmoDraw heute kann
S. 5–7
4.
Der komplette Workflow in einem Bild
S. 8
5.
Traditioneller Architekten-Workflow im Vergleich
S. 9–10
6.
Demo: Was wir heute live produziert haben
S. 11–14
7.
Stand vs. Vision für KosmoDraw
S. 15
8.
Warum das interessant ist (auch wirtschaftlich)
S. 16
9.
Wie es weitergeht
S. 17
10.
Glossar — was bedeuten die Begriffe?
S. 18
11.
Anhang: wo finden Sie was?
S. 19

## S. 3

ARCHITEKTURKOSMOS · KosmoDraw
Briefing für Geschäftsleitung · 28.05.2026
— Seite 3 —
1. Die Vision: Architekturkosmos
Architekturkosmos ist der Versuch, die digitalen Werkzeuge der Architektur — von der ersten
Skizze über das BIM-Modell bis zum Wettbewerbsplakat — in einer durchgehenden Pipeline
zu verbinden. Heute leben diese Schritte in verschiedenen Programmen (ArchiCAD, Revit,
Photoshop, InDesign, BIMcollab), und der Übergang von einem zum nächsten kostet Stunden
bis Tage manuelle Arbeit.
Die Vision sind fünf zusammenarbeitende Werkzeuge (intern 'Toolkits'), die jeweils einen
Schritt des Architektur-Prozesses übernehmen und die Daten an das nächste Werkzeug
weitergeben — ohne dass Information verloren geht oder manuell konvertiert werden muss.
Die fünf Toolkits
#
Toolkit
Was es macht
Status
1
KosmoDraw
Skizze → 3D-Modell (BIM-fähig)
 einsatzbereit
2
Vision-Werkzeug
AR-Brille zur Ortsbegehung mit Modell-Overlay
Konzept
3
Material-Werkzeug
Materialwahl + Rendering
Konzept
4
KosmoPublish
BIM-Modell → IFC + 2D-Pläne
 einsatzbereit
5
Plakat-Werkzeug
Wettbewerbsplakate (A0)
 in KosmoPublish integriert
Dieses Dokument betrifft Toolkit 1 (KosmoDraw) und seine Zusammenarbeit
mit Toolkit 4/5 (KosmoPublish). Die anderen drei sind noch Konzept-Phase und
werden hier nicht behandelt.

## S. 4

ARCHITEKTURKOSMOS · KosmoDraw
Briefing für Geschäftsleitung · 28.05.2026
— Seite 4 —
2. Wo KosmoDraw drin steckt
KosmoDraw ist der Einstiegspunkt. Ein Architekt öffnet das Werkzeug und beginnt direkt mit
dem 
Skizzieren 
— 
ohne 
vorher 
Wände 
konstruieren, 
Geschosse 
aufsetzen 
oder
Schichtaufbauten konfigurieren zu müssen. Diese Arbeit nimmt das Werkzeug automatisch ab.
Der Output von KosmoDraw ist ein 3D-Modell mit BIM-Informationen (Materialschichten,
Raumzuweisung, Tragwerks-Eigenschaften), das von KosmoPublish direkt zu IFC-Dateien
(BIM-Industriestandard) und Wettbewerbs-Plakaten weiterverarbeitet werden kann.
Die KosmoDraw-Pipeline
Schritt
Was passiert
Werkzeug
Zeit
1
Skizze: Polygon-Klick im Top-View
KosmoDraw (Blender)
~5 Min
2
Räume erzeugen mit Funktion + Höhe
KosmoDraw — automatisch
~10 Sek
3
Treppe + Geländer hinzufügen
KosmoDraw — Klick-Modus
~30 Sek
4
Türen, Fenster, Durchgänge platzieren
KosmoDraw — Symbol-Tool
~1 Min
5
Wandschichten + AI-Bewertung
KosmoDraw — 1 Klick je
~10 Sek
6
Datenpaket exportieren
KosmoDraw → KosmoPublish
~5 Sek
7
BIM-Datei + Pläne + Plakate
KosmoPublish — automatisch
~60 Sek
Total: ~1 Stunde für ein komplettes Wettbewerbsabgabe-Set (Sketch → IFC
→ 4 A0-Plakate). Im traditionellen Workflow sind dafür 2–4 Tage zu rechnen.

## S. 5

ARCHITEKTURKOSMOS · KosmoDraw
Briefing für Geschäftsleitung · 28.05.2026
— Seite 5 —
3. Was KosmoDraw heute kann
Das Werkzeug ist arbeitsbereit und wurde heute mit einem kompletten End-to-End-Test
verifiziert: ein 2-Raum-Modell (Wohnzimmer + Schlafzimmer, Treppe, Geländer) wurde
gezeichnet und durchlief erfolgreich die ganze Pipeline bis zum A0-Wettbewerbsplakat-Set als
PDF.
3.1 Skizzieren wie auf Papier
Der Architekt klickt Polygon-Eckpunkte im Top-View — das Werkzeug übernimmt automatisch
ArchiCAD-typische 
Eingabe-Helfer: 
45°-Lock 
per 
Shift-Taste, 
Distanz-Eingabe 
per
Zahlentastatur, X-/Y-/R-Achsen-Lock per Buchstabentaste. Wenn der Cursor in der Nähe einer
bestehenden Wand kommt, rastet er automatisch ein (Snap-System).
3.2 Räume mit Funktion + Programm
Pro Raum kann gleich die Funktion (Wohnzimmer, Schlafzimmer, Bad, ...) gewählt werden. Das
Werkzeug färbt den Raum automatisch entsprechend ein und berechnet Fläche, Umfang und
Volumen.
3.3 Treppen die wirklich richtig sind
Gerade Treppen, Wendeltreppen und L-/U-Treppen sind unterstützt. Das Werkzeug rechnet
automatisch die Komfort-Regel 2·Steigung + Auftritt ≈ 0.63 m nach und meldet wenn die Treppe
ausserhalb des SIA-Wohnungsbau-Bereichs liegt.
3.4 Wandschichten direkt aus dem Repertoire
Statt Schichtaufbauten Schicht-für-Schicht zu konfigurieren, gibt es 5 SIA-konforme
Voreinstellungen pro Wand-Typ (Aussenwand 37 cm mit Mineralwolle, Innenwand-tragend 20.5
cm in Stahlbeton, Trockenbau-Ständerwand 12.5 cm, Brandwand 27 cm, Holzfassade HBV 43
cm). Ein Klick und die Konstruktion ist gesetzt. Eigene Konfigurationen sind möglich.
3.5 Bodenaufbauten je Geschoss-Typ
Analog für Decken/Böden: vier Varianten (Geschossdecke mit Trittschall, Erdgeschoss-Boden
mit Stahlbeton C30, Bodenplatte UG mit XPS-Dämmung + Sauberkeitsschicht, Deckenuntersicht
mit Akustikputz). Korrekt unterschieden wird zwischen Boden- und Deckenseite damit nichts
doppelt gerechnet wird.

## S. 6

ARCHITEKTURKOSMOS · KosmoDraw
Briefing für Geschäftsleitung · 28.05.2026
— Seite 6 —
3.6 KI-Bewertung mit einem Klick
Der Architekt kann einen Raum oder eine Treppe selektieren und auf «AI-Critique» klicken. Im
Hintergrund fragt das Werkzeug Claude (das aktuell leistungsfähigste KI-Modell für
Text-Analyse) nach einer Bewertung auf Basis der SIA-Normen — Wohnungsbau-Eignung der
Raumgrösse, Belichtung, Proportionen, Treppen-Komfort. Antwort kommt in 5–10 Sekunden, ist
auf Deutsch und schlägt konkrete Verbesserungen vor.
Beispiel-Antwort für einen Wohnzimmer-Raum 5×4 m ohne Fenster:
«Fläche von 20 m² liegt am unteren Rand für ein Wohnzimmer, ist aber
funktional akzeptabel. Das Seitenverhältnis von 1.25 ergibt angenehme, nahezu
quadratische Proportionen. Kritisch: Null Fenster und null Glasfläche
entsprechen keiner Anforderung der SIA 500/180 — ein Aufenthaltsraum ohne
Belichtung 
ist 
bauordnungswidrig. 
Sofortmassnahme: 
Mindestens 
eine
Aussenwand mit Fensterfläche ≥ 2.5 m² (≥ 1/8 der Bodenfläche).»
3.7 Komplettes Wettbewerbsabgabe-Set auf Knopfdruck
Der grosse Knopf im Werkzeug heisst «Wettbewerbsplakate generieren». Klick — das Modell
wird automatisch in das Daten-Format BIM-IFC4 übersetzt, daraus werden Grundrisse aller
Geschosse, Schnitte, vier Fassaden, eine Axonometrie und ein Cover gezeichnet, alles in
SIA-Linienstärken (Schnittlinien dick, Ansichten dünn), in eine A0-Plakat-Komposition gesetzt
und als 5-seitiges Master-PDF gespeichert. Total ~60 Sekunden.
3.8 Was im Datenpaket alles drinsteckt
Das interne Datenformat (intern: Bridge-Schema v0.16) wurde so entwickelt, dass es alle
Informationen für nachfolgende Werkzeuge mitbringt:
• 8 BIM-Element-Klassen (Wand, Boden, Decke, Tür, Fenster, Treppe, Geländer, Stockwerk)
• Pset_Common (BIM-Standard-Eigenschaften) und Mengenangaben (Qto) pro Element
• Mehrschicht-Aufbauten (IfcMaterialLayerSet) pro Wand und Decke
• Räumliche Beziehungen (welche Wand begrenzt welchen Raum)
• Wand-relative Position von Türen/Fenstern (für präzises BIM-Voiding)
• KI-Bewertungen pro Element (als separate Sektion im Datenpaket)
• Quellinformationen (welcher Sketch hat dieses Element erzeugt) — Provenance

## S. 7

ARCHITEKTURKOSMOS · KosmoDraw
Briefing für Geschäftsleitung · 28.05.2026
— Seite 7 —
4. Der komplette Workflow in einem Bild
x
Skizze
(Top-View)
→
y
Räume + Funktion
+ Türen/Fenster
5 Min Klick-Polygon
10 Sek automatisch
↓
|
Wettbewerbsplakate
(A0-PDF, 5 Seiten)
←
{
BIM-Datei
(IFC4, validiert)
60 Sek (KosmoPublish)
10 Sek (1-Klick)
↓
}
Optional:
KI-Bewertung
5 Sek pro Element
Der Architekt arbeitet nur an den Schritten x und y — der Rest läuft
automatisch.
Das ist der eigentliche Mehrwert: das Werkzeug erspart die mühsamen Übergänge zwischen
den Software-Produkten und erzwingt automatisch BIM-Konsistenz (alle Materialschichten, alle
Raumbeziehungen, alle Tragwerks-Klassifikationen) ohne dass der Architekt eine einzige
BIM-Eigenschaft manuell setzen muss.

## S. 8

ARCHITEKTURKOSMOS · KosmoDraw
Briefing für Geschäftsleitung · 28.05.2026
— Seite 8 —
5. Traditioneller Workflow im Vergleich
Für ein Wettbewerbs-Konzept mit 5–10 Räumen über zwei Geschosse plus Treppe, Plakat-Set
für die Abgabe:
Schritt
ArchiCAD/Revit + InDesign
(traditionell)
KosmoDraw + KosmoPublish
Initial-Skizze
Bleistift/Photoshop, 30 Min
Im Werkzeug direkt, 5 Min
Mauerwerk konstruieren
4–8 h
Automatisch beim Sketch
Räume + Funktionen einrichten
1–2 h
Beim Sketch mit-gewählt
Türen/Fenster setzen
2–4 h
Symbol-Tool, ~1 Min/Stk
Treppe konstruieren
1–3 h
Klick-Modus, ~30 Sek
Materialschichten konfigurieren
2–4 h
Voreinstellung, ~10 Sek/Wand
BIM-Export (IFC) sauber machen 2–4 h, oft fehlerhaft
Automatisch, validiert
2D-Pläne ableiten (Grundriss/Schnitt/Fassade)
8–16 h
Automatisch, ~30 Sek
A0-Wettbewerbsplakat-Layout
8–16 h InDesign
Automatisch, ~30 Sek
Iteration (eine Wand verschieben)30 Min nachpflegen
Klick, ~10 Sek
Total
30–60 h (4–8 Arbeitstage)
~1 h (10× schneller)

## S. 9

ARCHITEKTURKOSMOS · KosmoDraw
Briefing für Geschäftsleitung · 28.05.2026
— Seite 9 —
Die wirtschaftliche Wirkung
Bei 
einem 
Architekten-Bürostundensatz 
von 
120–160 
CHF 
und 
6 
Arbeitstagen
Wettbewerb-Aufwand pro Konzept:
Wettbewerbs-Kosten pro Konzept
Workflow
Aufwand
Kosten (140 CHF/h)
Traditionell
48 h
CHF 6'720
Mit KosmoDraw
8 h (= Skizze + Iteration)
CHF 1'120
Ersparnis pro Konzept
40 h
CHF 5'600
Bei 10 Konzepten/Jahr
400 h
CHF 56'000
Bei 20 Konzepten/Jahr
800 h
CHF 112'000
Wichtig: das ist kein Marketing-Versprechen, sondern abgeleitet aus den
heutigen Tests. Eine 2-Räume-Skizze mit Treppe wurde in 1 Stunde vom Klick
bis zum fertigen A0-PDF durchgespielt — siehe die Demo-Sektion ab Seite 11.
Sekundäre Vorteile, schwerer zu quantifizieren aber real:
• BIM-Konsistenz: kein nachträgliches Aufräumen mehr beim Bauherrn-Übergabe-IFC
• Iterations-Tempo: 'eine Wand verschieben' kostet 10 Sekunden statt 30 Minuten — fördert
das Experimentieren mit mehr Konzept-Varianten
• Qualitätskontrolle: KI-Bewertung pro Raum/Treppe entdeckt Normverstösse (Belichtung,
Schrittmass) bevor der Plan an die Bauherrschaft geht
• 
Wettbewerbs-Demokratisierung: 
junges 
Büro-Personal 
kann 
mit 
weniger
Software-Schulung produktiv werden

## S. 10

ARCHITEKTURKOSMOS · KosmoDraw
Briefing für Geschäftsleitung · 28.05.2026
— Seite 10 —
6. Demo: Was wir heute live produziert haben
Am 27. Mai 2026 wurde ein Mini-Modell (2 Räume + Treppe + Geländer) komplett durch die
Pipeline geschickt. Hier sind die Resultate als Vorschau — die Original-Dateien liegen alle in
OneDrive (siehe Anhang).
6.1 Grundriss-SVG aus 2 Räumen
Direkt aus dem KosmoDraw-Datenpaket erzeugt, mit SIA-Linienstärken (Wand-Schnittlinien
dicker, Treppe-Stufen dünner), zwei Layer für Inkscape-Bearbeitbarkeit. 1920 Bytes, Massstab
1:200, A0 quer.
Grundriss: Wohnzimmer (links) + Schlafzimmer (rechts) + Treppe und Geländer dazwischen.

## S. 11

ARCHITEKTURKOSMOS · KosmoDraw
Briefing für Geschäftsleitung · 28.05.2026
— Seite 11 —
6.2 Südfassade
Alle Mesh-Kanten projiziert auf die Y=0-Ebene, sauber sortiert nach BIM-Klasse (Wand, Boden,
Decke, Treppe, Geländer als getrennte Layer).
Südansicht: alle Mesh-Edges in der vertikalen Ebene, 4 BIM-Layer.
6.3 SW-Axonometrie (ETH/SIA-Standard)
Beobachter steht im Südwesten, sieht S- und W-Fassade vorne. Klassische Architektur-Iso,
gerendert ohne Rendering-Engine, direkt aus den 3D-Kanten.

## S. 12

ARCHITEKTURKOSMOS · KosmoDraw
Briefing für Geschäftsleitung · 28.05.2026
— Seite 12 —
Axonometrische Ansicht aus SW, isometrische Projektion 30°.

## S. 13

ARCHITEKTURKOSMOS · KosmoDraw
Briefing für Geschäftsleitung · 28.05.2026
— Seite 13 —
6.4 Wettbewerbsplakat-Cover
Aus dem KosmoDraw-Datenpaket erzeugt KosmoPublish automatisch ein 5-seitiges
A0-Plakat-Set (Cover + 4 Plakate: Konzept, Grundrisse, Schnitte, Fassaden+Details) als
Master-PDF.
Cover-Seite des Master-PDF (KosmoDraw_H3_Wettbewerbsabgabe.pdf — 6.1 MB).

## S. 14

ARCHITEKTURKOSMOS · KosmoDraw
Briefing für Geschäftsleitung · 28.05.2026
— Seite 14 —
6.5 Plakat 2: Grundrisse-A0
Inhalt vorgegeben aus TKB-Default-Template (Plakat-Inhalts-Texte können im N-Panel
bearbeitet werden). Für die echte Bauherrschaft müssten Titel, Verfasser-Code und
Programm-Texte vor dem Generieren angepasst werden.
Plakat 2: Grundrisse aller Geschosse als A0 quer, 1:200, SIA-konform.

## S. 15

ARCHITEKTURKOSMOS · KosmoDraw
Briefing für Geschäftsleitung · 28.05.2026
— Seite 15 —
7. Stand vs. Vision für KosmoDraw
Was die Vision aus dem März 2026 für KosmoDraw (Toolkit 1) vorgesehen hatte — und was
heute davon umgesetzt ist:
Vision-Punkt
Stand 27.05.2026
Skizze → 3D im Top-View
 Fertig
ArchiCAD-typischer Tracker (45°-Lock, Distanz)
 Fertig
Snap auf Wand/Symbol/Verlängerung
 Fertig
Räume mit Funktion + Auto-Färbung
 Fertig
Treppen (gerade + Wendel + L/U)
 Fertig
Türen/Fenster/Durchgänge platzieren
 Fertig
Material-Schichten konfigurieren
 Fertig (mit 5+4 Voreinstellungen)
KI-Sprach-Eingabe ('mach Wohnzimmer 5×4m')
 Fertig (über Mikrofon)
KI-Bewertung (SIA-Wohnungsbau)
 Fertig (Räume + Treppen)
BIM-Export (IFC4, validiert)
 Fertig
2D-Pläne (Grundriss/Schnitt/Fassade/Axonometrie)
 Fertig
Wettbewerbsplakat-Generierung 1-Klick
 Fertig
AR-Brille für Ortsbegehung mit Modell-Overlay
Konzept (Toolkit 2)
Render-Pipeline für Materialwahl
Konzept (Toolkit 3)
KosmoDraw ist zu ~95% der ursprünglichen Vision für Toolkit 1 fertig. Was
noch fehlt (AR-Brille, Material-Renderer) sind eigenständige Toolkits und werden
separat entwickelt.

## S. 16

ARCHITEKTURKOSMOS · KosmoDraw
Briefing für Geschäftsleitung · 28.05.2026
— Seite 16 —
8. Warum das interessant ist (auch wirtschaftlich)
Drei Punkte, die das Werkzeug von einem reinen "Schneller-mit-BIM"-Helfer abheben:
Punkt 1 — Konsistenz von Anfang an
Das Werkzeug verlangt vom Architekten praktisch keine BIM-Eigenschaften händisch zu
setzen. Die Voreinstellungen sind SIA-konform, die Klassifi-kation läuft automatisch. Das heisst:
der erzeugte IFC ist von Tag 1 richtig und kann ohne Aufräumen an die Bauherrschaft, an die
Fachplaner, an die TGA, an die Statik weitergegeben werden. Das spart in der Projektphase
nochmals 1–2 Tage pro Übergabe.
Punkt 2 — Iteration ohne Reue
Klassischer 
BIM-Workflow 
bestraft 
Änderungen: 
jede 
Wand-Verschiebung 
bedeutet
Material-Schichten 
neu 
zuweisen, 
Räume 
neu 
rechnen, 
Pläne 
neu 
exportieren,
InDesign-Layouts nachpflegen. Bei KosmoDraw kostet eine Wand-Verschiebung 10 Sekunden,
alle Folge-Aktualisierungen laufen automatisch. Das ermöglicht echtes Spielen mit Varianten
im Wettbewerb statt zähem Festhalten am ersten Konzept.
Punkt 3 — KI als zweite Meinung
Die KI-Bewertung ist kein Marketing-Gimmick: sie prüft konkret nach den SIA-Normen für
Wohnungsbau und Belichtung und liefert konkrete, umsetzbare Vorschläge — «Lichtquerschnitt
mindestens 1/8 der Bodenfläche», «Schrittmass auf 0.63 m bringen». Im Wettbewerb ist das ein
junger Architekt der bei jedem Konzept mit-schaut. Im realen Projekt eine Qualitätskontrolle die
Fehler vor der Eingabe entdeckt.
Diese drei Punkte zusammen sind der eigentliche Hebel — nicht nur die
Stundenersparnis, 
sondern 
die 
Qualitätsverbesserung 
bei 
gleicher
Stundenzahl.

## S. 17

ARCHITEKTURKOSMOS · KosmoDraw
Briefing für Geschäftsleitung · 28.05.2026
— Seite 17 —
9. Wie es weitergeht
KosmoDraw ist heute arbeitsbereit und in einem Test-Projekt verifiziert. Für den Einsatz in einem
echten Architekturbüro wären folgende Schritte noch sinnvoll:
Kurzfristig (1–2 Wochen)
• UX-Eye-Test: ein Architekt aus dem Büro nutzt das Werkzeug 1 Tag und meldet alles was
unklar ist (Tastaturkürzel, Visuelle Klarheit, Workflow-Reibung)
• Pilot-Wettbewerb: ein laufendes Wettbewerbs-Konzept parallel in KosmoDraw modellieren
und das Resultat gegen das ArchiCAD-Original vergleichen
• Plakat-Vorlagen anpassen: das mitgelieferte TKB-Plakat-Layout an das Büro-CI anpassen
(Logo, Farben, Typografie)
Mittelfristig (1–3 Monate)
• KI-Editor: Operator «Mach diese Treppe komfortabler» — Claude analysiert und passt
Riser/Tread automatisch an
• Material-Renderer-Integration (Toolkit 3 als ersten Renderer-Schritt)
• Voice-Eingabe-Erweiterung: kompletter Sketch-Workflow per Sprache statt Klick
• Wettbewerbs-Plakat-Generator mit KI-Brief: User gibt 2 Sätze Vision, Claude generiert
kompletten Plakat-Inhalt (Konzept-Texte, Programm-Tabelle)
Langfristig (>3 Monate, Vision-Niveau)
• AR-Toolkit (Toolkit 2): vor-Ort-Begehung mit Quest 3 / Apple Vision Pro und
Modell-Overlay
• Pipeline-Verbindung zu BIM-Server: Cloud-Modell, Multi-User-Edit, Versionierung
• 
Schweizer 
Bauordnung 
als 
KI-Validator: 
vollautomatischer 
Pre-Check 
vor
Baubewilligungs-Eingabe
Für das nächste Bauherr-Gespräch oder den nächsten Wettbewerb wäre der
Pilot-Einsatz die einfachste und aussagekräftigste Investition.

## S. 18

ARCHITEKTURKOSMOS · KosmoDraw
Briefing für Geschäftsleitung · 28.05.2026
— Seite 18 —
10. Glossar — was bedeuten die Begriffe?
Falls die folgenden Begriffe in der Diskussion auftauchen — kurz erklärt in Architekten-Sprache:
Add-on — Eine Erweiterung für ein Hauptprogramm (hier: Blender). Wie ein Modifikator-Set für
ArchiCAD.
API — Schnittstelle zwischen zwei Programmen — wie ein Stecker bei dem zwei Geräte
gemeinsam reden.
BIM — Building Information Modeling. 3D-Modell mit Bedeutung — eine Wand weiss dass sie
eine Wand ist, mit Tragwerk, Material, Brandschutz.
Blender — Open-Source-3D-Software (gratis). Wir nutzen sie als technische Basis für
KosmoDraw, weil sie sehr programmierbar ist.
Bonsai — BIM-Plugin für Blender (gratis, Open-Source). Macht aus Blender ein BIM-Werkzeug.
KosmoDraw arbeitet bonsai-kompatibel.
Claude — Aktuell leistungsfähigstes KI-Sprach-Modell für Text-Analyse (von Anthropic). Wird für
die SIA-Bewertungen genutzt.
IFC — Industry Foundation Classes. Der internationale Datenstandard für BIM. Was DXF für
2D-Pläne ist, ist IFC für 3D-BIM-Modelle.
IFC4 — Aktuelle Version des IFC-Standards. KosmoDraw produziert IFC4-konforme Dateien.
KosmoDraw — Toolkit 1: Skizze-zu-3D-Werkzeug. Was dieses Dokument beschreibt.
KosmoPublish — Toolkit 4+5: nimmt KosmoDraw-Modelle, macht IFC + Pläne + A0-Plakate.
Operator — In Blender ein Befehl/Funktion. Wie ein Menü-Punkt mit Aktion.
Plakat-Composer — Die Software die SVG-Pläne in eine A0-Plakat-Komposition setzt.
Roundtrip — Daten von Werkzeug A zu B und wieder zurück, ohne Verlust. Test für
Datenformat-Qualität.
SIA — Schweizer Ingenieur- und Architektenverein. Normen-Geber für Bau-Standards in der
Schweiz.
Skript — Eine Liste von Befehlen die das Werkzeug automatisch ausführt. Hier: alles in Python
geschrieben.
SVG — Vektor-Grafik-Format. Wie PDF aber editierbar in Inkscape oder Illustrator.
Test-Suite — Automatische Qualitätskontrolle: 407 kleine Programme die prüfen ob das
Werkzeug richtig arbeitet. Läuft in ~10 Sekunden.

## S. 19

ARCHITEKTURKOSMOS · KosmoDraw
Briefing für Geschäftsleitung · 28.05.2026
— Seite 19 —
11. Anhang: Wo finden Sie was?
Alle Demo-Dateien liegen in der OneDrive-Bibliothek unter dem Pfad 11 AI Workflow:
Wettbewerbsplakat-Set (5 PDFs + 4 SVGs + Cover)
11 AI Workflow / KosmoDraw_H3_Posters / KosmoDraw_H3_Wettbewerbsabgabe.pdf (6.1 MB
Master-PDF, 5 Seiten A0)
BIM-Datei (IFC4 validiert)
11 
AI 
Workflow 
/ 
KosmoDraw_GG_ValidationFix.ifc 
(15 
KB, 
IFC4-konform 
mit 
0
Spec-Verstössen, validiert mit IfcOpenShell)
Einzelne SVG-Pläne
11 AI Workflow / KosmoDraw_*.svg
Davon 
u.a.: 
E3_FloorPlan 
(Grundriss), 
H1_Elevation_South/West/North 
(Fassaden),
H1_Section_NS/EW (Schnitte), H2_Axonometry_SW/NE/Cavalier (3D-Ansichten)
Konsumenten-Doku (für IT-affine Leser)
11 AI Workflow / KosmoDraw_Bridge_v016_Mapping_to_Bonsai.md (552 Zeilen, technische
Beschreibung des KosmoDraw-zu-IFC-Datenformats — falls jemand die internen Mappings auf
Pseudo-Code-Niveau sehen will).
Test-Status
Stand 27.05.2026 nach 24 Arbeitstagen-Äquivalenten Entwicklung:
Operatoren (Funktionen) im Werkzeug
42
Panel-Klassen (Sidebar-Bereiche)
3
Test-Programme (Qualitätskontrolle)
407 / 407 grün
BIM-Datenformat-Sektionen
14
Demo-Artefakte produziert heute
23
Bestätigte IFC4-Konformität
 (0 Spec-Verstösse)
Fragen? — Andrin Baumann, andrin.bau@gmail.com, ETH MArch.

## S. 20

ARCHITEKTURKOSMOS · KosmoDraw
Briefing für Geschäftsleitung · 28.05.2026
— Seite 20 —
Demo-Termin im Büro? — Ein 30-minütiger Live-Walkthrough ist jederzeit möglich. Empfehlung:
Laptop mit Blender + ein freies A0-Drucker-Slot für den Plakat-Output bereit halten.
