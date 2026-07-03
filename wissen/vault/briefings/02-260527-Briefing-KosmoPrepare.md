---
titel: "02 260527 Briefing KosmoPrepare"
quelle: "Kosmos-Briefing V0.1"
datei: "02 260527 Briefing KosmoPrepare.pdf"
seiten: 8
ocr-seiten: 0
tags: [projekt, briefing]
---

# 02 260527 Briefing KosmoPrepare

## S. 1

Architecture Cosmos · KosmosPrepare · Briefing
KosmosPrepare
Briefing für das Architekturbüro
Ein Werkzeug für die Vorbereitungsphase eines Architekturwettbewerbs — von der Standortanalyse
bis zum fertigen Wettbewerbs-Dossier, in Blender, mit KI-Unterstützung, lokal & wo möglich gratis.
Andrin Baumann
Architecture Cosmos — KosmosPrepare-Modul (v0.34)
27. Mai 2026

## S. 2

KosmosPrepare
Briefing für das Architekturbüro
Seite 2
Andrin Baumann · Architecture Cosmos
Was ist KosmosPrepare?
Ein Werkzeug, das die ersten Tage eines Wettbewerbs abnimmt.
KosmosPrepare ist ein Werkzeug für die Vorbereitungsphase eines Architektur-wettbewerbs
(Phase 0). Es nimmt die Arbeit ab, die normalerweise in den ersten Tagen eines Wettbewerbs anfällt:
das Sammeln und Aufbereiten aller Standortgrundlagen, das Lesen und Strukturieren des
Pflichtenhefts, die Recherche zu Bauzonen und Ortsbild — und liefert ein vollständig aufgesetztes
3D-Modell des Standorts samt Recherche-Dossier, Schwarzplan, Bauzonen-Übersicht und
Terminplan.
Es läuft als Erweiterung in Blender — dem freien 3D-Programm, das viele Büros bereits für
Visualisierung nutzen. Statt zu programmieren, baut der Architekt einen visuellen Arbeitsablauf aus
Knoten (wie ein Flussdiagramm) und drückt auf Start. Jeder Knoten ist ein Werkzeug; sie lassen sich
für jeden Wettbewerb neu zusammenstecken.
Wo es im Wettbewerbsablauf sitzt:
1. Wettbewerbsstart
2. Phase 0
VORBEREITUNG
3. Konzept
4. Entwurf
5. Pläne / Modell
6. Abgabe
KosmosPrepare deckt Phase 0 ab. Die Phase, in der konventionell mehrere Tage in das
Sortieren von Dateien, Recherchieren und Modellieren des Standorts fließen — Zeit, die später für
den Entwurf fehlt.

## S. 3

KosmosPrepare
Briefing für das Architekturbüro
Seite 3
Andrin Baumann · Architecture Cosmos
Was es konkret kann
Neun Werkzeuggruppen, alle in einer Oberfläche.
Standort in 3D aufsetzen
Schwarzplan, Katasterplan, Höhenkurven, Geländemesh, Orthofoto-Drape, LOD2-Gebäudemodelle
der Nachbarschaft — alles automatisch importiert und LV95-koordinatentreu positioniert.
Analysen
Sonnenstandsstudien, Hangneigungs-Heatmap, Dachformen-Statistik der Umgebung, Bestand auf
der Parzelle finden und transparent markieren, BZO-Volumen-Hülle (das maximal zulässige
Bauvolumen als 3D-Box).
KI-Recherche
Pflichtenheft-PDF wird automatisch ausgewertet (Programm, Flächen, Termine). Baugesetze von
Gemeinde, Kanton und Bund werden geladen. Deep Research in zwei Modi: »physische Fakten«
(Geologie, Material, Klima) und »Genius Loci« (Sagen, Geschichte, Atmosphäre).
Splat-Aufnahmen (Video → 3D)
Mit dem Handy einmal um oder durch ein Gebäude gehen → vollständige 3D-Aufnahme als
Gaussian-Splat. Komplett lokal, keine Cloud, kein Dienstleister.
BIM-Klassifikation
Importierte IFC-/Bestandsmodelle werden automatisch nach Bauteil (Wand, Decke, Stütze, Träger,
Dach) klassifiziert und farbig markiert — auch aus deutschen Bauteilnamen (»Wand-004«,
»Unterzug-024«).
Verortung & Foto-Textur
Aufgenommene Splats werden via 3-Punkt-Ausrichtung oder automatischem Einpassen exakt im
Modell platziert. Video-Frames können als Foto-Textur auf Bestandsmeshes projiziert werden.
Cosmos-Referenzbibliothek
Kuratierte Architekturreferenzen mit 3D-Modellen, Materialien und Tragwerk. Per 4 Schieberegler
nach Standort / Material / Struktur / Programm matchen.
Output
Plan-PDF mit Auto-Layout, Wettbewerbs-Dossier (PDF), ArchiCAD-Bundle (IFC), strukturierter
Splat-/Mesh-Export.
Terminplanung
Aus Start- + Abgabedatum werden Meilensteine rückwärts aufgebaut — inkl. »Entwurf fertig«
(Design-Freeze) mit Puffer für Pläne, Modell und Druck.

## S. 4

KosmosPrepare
Briefing für das Architekturbüro
Seite 4
Andrin Baumann · Architecture Cosmos
Wie es funktioniert
Visueller Workflow, keine Programmierung.
Der Knoten-Workflow
Im Node-Editor von Blender zieht der Architekt Knoten zusammen und verbindet sie:
Atelierblaupause
laden
→
DXF / CityGML /
XYZ importieren
→
Parzelle definieren
+ Hang/Sonne analysieren
→
Dossier
generieren
Beliebig erweiterbar: jedes der derzeit 32 Werkzeuge ist ein Knoten. Für jeden Wettbewerb neu
zusammensteckbar — ohne eine Zeile Code zu schreiben.
Lokal & gratis wo möglich
Was läuft wo?
Wo
Kosten
Datenimport + Geometrie-Analysen + Splat-Aufnahme + BIM-Klassifikation
Lokal (eigener Rechner)
0 CHF
KI-Pflichtenheft + Baugesetz + Deep Research
API (Anthropic Claude)
5–15 ¢/Run
Alternativ: gleiche KI-Aufgaben mit Google Gemini
API (gratis Free-Tier)
0 CHF
Dense-3D-Mesh aus Video (zukünftig)
Eigene Workstation (RTX 5090)0 CHF
Datenhoheit bleibt im Büro. Pläne, Pflichtenhefte und Wettbewerbsinhalte verlassen den
Rechner nur, wenn die KI-Recherche-Knoten explizit benutzt werden — und auch dann nur die
Recherche-Frage, nicht die Wettbewerbsunterlagen selbst.

## S. 5

KosmosPrepare
Briefing für das Architekturbüro
Seite 5
Andrin Baumann · Architecture Cosmos
Aktueller Stand vs. Vision
v0.34 · 32 Werkzeuge · live einsetzbar.
Bereich
Stand heute
Vision (komplett)
Datenimport (DXF / CityGML / XYZ / Orthofoto)
live
live
Analysen (Sonne / Hang / Dächer / Bestand / BZO)live
live
KI-Pflichtenheft + Baugesetz + Deep Research (2 Modi)
live
live
Gaussian-Splat aus Video (lokal)
live
live + Cloud-Optionen
BIM-Klassifikator (Name + IFC + Geometrie)
live
live
Splat-Verortung + Foto-Textur (Vertex-Farben)
live
live + UV-Bake (RTX)
Plan-PDF / Dossier / ArchiCAD-Bundle / Terminplanung
live
live
Cosmos-Referenzdatenbank (4-Slider-Matching)
Kern fertig, UI in Arbeit
live + 50–100 Pilot-Einträge
Dense-Mesh aus Video (richtige Geometrie)
vorbereitet, braucht GPU-Station live mit RTX 5090
LiDAR-Integration (iPhone Pro) + Splat-Kombi
Import vorhanden
vollintegrierter Workflow
Stand zusammengefasst: Der gesamte Phase-0-Workflow — vom Standort-Import über die
Analysen, die KI-Recherche und die Splat-Aufnahme bis zum Wettbewerbs-Dossier — ist
arbeitsfähig und live verifiziert. Was noch fehlt, sind Komfort-Erweiterungen (saubere UV-Texturen,
Dense-Mesh) und die Anreicherung der Referenzdatenbank — beides läuft.

## S. 6

KosmosPrepare
Briefing für das Architekturbüro
Seite 6
Andrin Baumann · Architecture Cosmos
Vergleich: konventionell vs. KosmosPrepare
Für einen typischen Schweizer Wettbewerb in einer Gemeinde.
Arbeitsschritt (Phase 0)
Konventionell
Mit KosmosPrepare
Ersparnis
Atelierblaupause-Paket aufbereiten
(DXF / CityGML / XYZ / Orthofoto)
1–2 Tage manuell
5 Min Knopfdruck
~95 % Zeit
Pflichtenheft lesen + strukturieren
(Programm, Flächen, Termine)
4–6 Std
2 Min + Review
~90 % Zeit
Baugesetz / BZO recherchieren
2–4 Std
automatisch
~90 % Zeit
3D-Aufnahme Bestandsgebäude
(Photogrammetrie via Dienstleister)
800–2 500 CHF
0 CHF + 1 Std
~100 % Kosten
Standort-Recherche (Geschichte, Genius Loci,
Material, Klima)
4–8 Std bei mehreren Quellen
5 Min (KI mit Quellen)
~95 % Zeit
Plan-Layout-Vorlage für Eingabe
2–4 Std
10 Min
~90 % Zeit
Wettbewerbs-Terminplan
manuell im Kalender
automatisch rückwärts vom Abgabetermin
qualitativer Sprung
GESAMTE PHASE 0
3–5 Tage + ~1 500 CHF ~4 Std + 0–3 CHF
≈ 85 % Zeit, ≈ 99 % Kosten
Was zusätzlich besser wird (Qualität):
• Präzision: alle Daten LV95-koordinatentreu im selben Modell — keine Übertragungsfehler
zwischen Programmen.
• Vollständigkeit: nichts wird vergessen, weil der Workflow alle Schritte erzwingt (Knoten haben
Eingänge, die gefüllt sein müssen).
• Wiederverwendbarkeit: einmal aufgebaut, gilt der Workflow für jeden weiteren Wettbewerb —
nur Inputs ändern sich.
• Datenhoheit: nichts liegt in einer fremden Cloud (außer dem, was die KI-Recherche bewusst
extern fragt).

## S. 7

KosmosPrepare
Briefing für das Architekturbüro
Seite 7
Andrin Baumann · Architecture Cosmos
Roadmap
Wo es hingeht.
Kurz (nächste Wochen)
• Multi-View Foto-Textur auf realem Bestandsmesh produktiv testen
• Cosmos-Referenzbibliothek mit 50–100 kuratierten Pilot-Einträgen befüllen
• Realen Wettbewerb komplett durch das Tool laufen lassen
Mittel (Monate, mit der Home-Workstation / RTX 5090)
• Dense-MVS-Mesh aus Video — echte geometrische Rekonstruktion des Bestands (»LiDAR aus
Video«)
• Gaussian-Splat → bearbeitbares Mesh (für Rendering in Cycles)
• Vollintegrierte LiDAR-Pipeline (iPhone Pro Scan + Splat kombiniert)
Lang (Vision)
• KI-gestützte Bauteilerkennung aus reinen Scans (Scan → IFC)
• KI-Konzept-Generator, gespeist aus der Cosmos-Referenzbibliothek
• Echtzeit-Wettbewerbsmodell-Konfigurator (Volumen-Studien im Browser)
Wichtig: Diese Roadmap baut auf einem heute arbeitsfähigen Tool auf. Jeder neue Schritt
ergänzt — nichts ist auf »später« angewiesen, um produktiv zu sein.

## S. 8

KosmosPrepare
Briefing für das Architekturbüro
Seite 8
Andrin Baumann · Architecture Cosmos
Fazit
Was bleibt nach der Präsentation hängen.
KosmosPrepare ist kein Prototyp — es ist ein arbeitsfähiges Werkzeug (v0.34, 32 Knoten, live
verifiziert), das die Vorbereitungsphase eines Wettbewerbs von Grund auf neu denkt.
Was es realistisch einspart, pro Wettbewerb:
Zeit
3–5 Tage Vorbereitungsarbeit
Kosten
typisch 1 000–2 000 CHF an externen Dienstleistungen (Photogrammetrie etc.)
Mentale Last
kein Datei-Suchen, kein Zeichnungs-Importieren, kein PDF-Parsen von Hand
Bei zwei Wettbewerben pro Jahr rechnet sich die Einarbeitung sofort. Bei fünf oder mehr wird
KosmosPrepare zum strategischen Vorteil — der Entwurf bekommt die Tage zurück, die sonst der
Vorbereitung verloren gingen.
Was zur Einführung nötig wäre
• Blender 4.2+ (gratis), Add-on installieren — fertig.
• Optional: ein API-Key für die KI-Recherche (Anthropic ~5–15 ¢/Run, oder Google Gemini
gratis).
• Kurze Einarbeitung (~½ Tag), dann sofort produktiv für den nächsten Wettbewerb.
Mein Vorschlag: KosmosPrepare beim nächsten realen Wettbewerb in einem kontrollierten Pilot
mitlaufen lassen — parallel zum gewohnten Workflow. Nach einem Wettbewerb ist die Zeit- und
Kostenrechnung gemacht.
