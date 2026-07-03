---
titel: "Richtlinie-CAD-4.0-2008"
quelle: "Normen-Bibliothek Andrin"
datei: "Richtlinie-CAD-4.0-2008.pdf"
seiten: 17
ocr-seiten: 0
tags: [bauwissen, norm]
---

# Richtlinie-CAD-4.0-2008

## S. 1

CAD-Basisrichtlinie (Version 2.0 - 2007 Architektur und Haustechnik) 
Diese CAD-Richtlinie basiert auf den Vorgaben und der Struktur der CAD-
Basisrichtlinie, welche von CADexchange erarbeitet und gefördert wird. 
 
Weitere Informationen finden Sie unter www.cadexchange.ch 
 
 
 
Richtlinie für den CAD-Datenaustausch 
Version 4.0 
 
 
 
Ausgabe Januar 2008 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
Stadt Zürich 
Amt für Hochbauten 
Lindenhofstrasse 21 
Postfach 
8021 Zürich 
 
Tel +41 44 412 11 11 
Fax +41 44 212 19 36 
www.stadt-zuerich.ch/hochbau

## S. 2

CAD-Basisrichtlinie 
 
 
Interessengemeinschaft CADexchange 
Richtlinie-CAD-4.0-2008.doc 
Erstellungsdatum: 08.01.2008 
Version Basisrichtlinie: 2.0 – 2007 mit HT 
 
Version CAD-Richtlinie: 4.0 
 
 
Autor Basisrichtlinie: Christoph Merz 
Seite 2/17 
Autor: Hans Schlotterbeck 
 
Inhaltsverzeichnis 
1 
Einleitung 
3 
1.1 
Inhalt und Zielsetzung 
3 
1.2 
Verbindlichkeit 
4 
1.3 
Weitere Grundlagen 
4 
1.4 
Begriffsbestimmungen 
4 
2 
Grafische Vorgaben 
5 
2.1 
Planinhalt und Darstellung 
5 
2.2 
Planlayout 
5 
2.3 
Linien- und Stifteinstellungen 
6 
2.4 
Text 
7 
2.5 
Vermassung 
8 
2.6 
Schraffuren 
8 
2.7 
Weitere Zeichnungselemente 
8 
2.8 
Flächenmanagement 
8 
3 
Strukturelle Vorgaben 
9 
3.1 
Struktur 
9 
3.2 
Referenzen 
9 
3.3 
Teilobjekte 
9 
3.4 
Dateibezeichnung 
9 
3.5 
Layerbezeichnung 
12 
3.6 
Zeichnungsmassstab 
14 
4 
Technische Vorgaben 
14 
4.1 
Datenmedien 
14 
4.2 
Datenformate 
15 
4.3 
Datenkomprimierung 
15 
4.4 
CAD-System 
15 
5 
Organisatorische Vorgaben 
15 
5.1 
DXF/DWG-Testdatenaustausch 
15 
5.2 
Definitive Lieferung 
16 
6 
Rechtliche Vorgaben 
16 
6.1 
Nutzungsrecht an CAD-Daten 
16 
6.2 
Virenfreiheit 
16 
7 
Hilfsmittel 
17 
7.1 
Anhang 
17 
7.2 
Vorlagezeichnungen 
17 
7.3 
Support 
17 
 
Vorwort zur CAD-Basisrichtlinie 
Die nachstehenden Abschnitte mit der Überschrift 'Basisrichtlinie' entsprechen den von CADexchange erarbeiteten 
Grundsätzen zu den einzelnen Themen. Diese Inhalte dürfen nicht geändert werden, sofern nicht eine neue Version der 
Basisrichtlinie vorliegt. Sämtliche Ergänzungen und Spezialitäten sind unter der Überschrift 'Angaben des Auftraggebers / der Auftraggeberin' aufzuführen. Diese Angaben dürfen nicht im Widerspruch zu den Festlegungen der Basisrichtlinie stehen. 
Änderungen und Ergänzungen an der CAD-Basisrichtlinie werden auf www.cadexchange.ch publiziert. 
Der Ausdruck 'Auftraggeber / Auftraggeberin' steht in dieser Richtlinie für: 
Stadt Zürich 
CAD-Verantwortlicher: Hans Schlotterbeck 
Amt für Hochbauten 
Tel +41 44 412 29 58, Fax +41 44 270 93 41 
Lindenhofstrasse 21, Postfach 
hans.schlotterbeck@zuerich.ch 
8021 Zürich 
 
 
CAD-Planarchiv: Liliane Salzmann 
 
Tel +41 44 412 45 71, Fax + 41 44 212 19 36 
 
liliane.salzmann@zuerich.ch

## S. 3

CAD-Basisrichtlinie 
 
 
Interessengemeinschaft CADexchange 
Richtlinie-CAD-4.0-2008.doc 
Erstellungsdatum: 08.01.2008 
Version Basisrichtlinie: 2.0 – 2007 mit HT 
 
Version CAD-Richtlinie: 4.0 
 
 
Autor Basisrichtlinie: Christoph Merz 
Seite 3/17 
Autor: Hans Schlotterbeck 
 
1 
Einleitung 
1.1 
Inhalt und Zielsetzung 
1.1.1 
Änderungsnachweis 
Basisrichtlinie: 
• 
Version 2.0 – 2007 
- 
Allgemein: 
Ergänzung der Basisrichtlinie durch spezifische Definitionen für die Haustechnik (Spalte HT) 
- 
Kapitel 1.2: 
Basisrichtlinie als Vertragsbestandteil 
- 
Kapitel 1.3: 
Ergänzung Punkt 6. und 7. 
- 
Kapitel 1.4: 
Anpassung der Beschreibung von Punkt 1. 
- 
Kapitel 2.1: 
Ergänzung der Empfehlungen für Plandarstellung 
- 
Kapitel 2.2.1: Genauere Umschreibung der Referenzpunkte (Punkt 1. und Punkt 2.) 
- 
Kapitel 2.2.3: Anpassung Kapitel-Titel „Planrahmen und Schnittrand“ 
- 
Kapitel 2.3: 
Klarstellung von Punkt 2. 
- 
Kapitel 2.4: 
Klarstellung von Punkt 2. Ergänzung Punkt 5. bezüglich Attribute 
- 
Kapitel 2.7: 
Ergänzung Punkt 2. 
- 
Kapitel 3.1: 
Neudefinition Punkt 5. 
- 
Kapitel 3.2: 
Neues Kapitel 
 
• 
Version 1.1 – 2005 
- 
Allgemein: 
Sprachliche Gleichbehandlung von Frau und Mann. 
- 
Allgemein: 
Entfernung / Ersatz von individuellen Platzhaltern im Text der Basisrichtlinie. 
- 
Vorwort: 
Ergänzung des Änderungsnachweises auf CADexchange. 
- 
Vorwort: 
Ergänzung der Daten des / der CAD-Verantwortlichen. 
- 
Kapitel 1.1: 
Ergänzung Änderungsnachweis. 
- 
Kapitel 1.2: 
Bereinigung / Klarstellung der Punkte 2 und 3. 
- 
Kapitel 1.4: 
Ergänzung Begriff Solid. 
- 
Kapitel 2.2.4: Klarstellung von Punkt 3. 
- 
Kapitel 2.5: 
Bereinigung / Klarstellung des Punktes 2 zu Millimeterangaben. 
- 
Kapitel 2.6: 
Klarstellung / Vereinfachung der Punkte 1 und 3 (enthält Punkt 6). 
- 
Kapitel 2.8: 
Klarstellung von Punkt 1. 
- 
Kapitel 3.4: 
Ergänzung des Punktes 3 zur Layerbenennung. 
CAD-Richtlinie des Auftraggebers / der Auftraggeberin: 
• 
Die vorliegende Richtlinie (Version 4.0) ersetzt die Richtlinie für den CAD-Datenaustausch vom 1. August 2005 
(Version 3.1) und ist Bestandteil der Richtlinie für die Bauwerkdokumentation vom Amt für Hochbauten. 
 
1.1.2 
Allgemeine Bestimmungen 
Basisrichtlinie: 
AR 
HT 
1. 
Durch den Einsatz von CAD- und CAFM-Systemen bei der Planung und Bewirtschaftung von Gebäuden steigen die Anforderungen an jene Daten, die einen Teil der Hauptinformationen liefern. 
Um den effizienten Einsatz dieser Systeme sicherzustellen ist es notwendig, dass wesentliche 
Bestandteile der Daten bezüglich Inhalt, Form und Struktur einem einheitlichen Standard genügen. 
x 
x 
2. 
Diese CAD-Richtlinie bestimmt die notwendigen technischen, inhaltlichen und strukturellen Voraussetzungen für die Erstellung von CAD-Plänen und den Datenaustausch zwischen dem Auftraggeber / der Auftraggeberin und den beauftragten Planern / Planerinnen. 
x 
x 
3. 
Durch die Definition der grundlegenden Voraussetzungen soll erreicht werden, dass der CAD-
Datenaustausch standardisiert wird. 
x 
x 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
a. 
Sämtliche Informationen und Dokumente zu dieser Richtlinie sind unter folgender Internet-
Adresse zu beziehen: 
http://www.stadt-zuerich.ch/internet/hbd/home/beraten/fachstellen/cad_planarchiv.html 
x 
x

## S. 4

CAD-Basisrichtlinie 
 
 
Interessengemeinschaft CADexchange 
Richtlinie-CAD-4.0-2008.doc 
Erstellungsdatum: 08.01.2008 
Version Basisrichtlinie: 2.0 – 2007 mit HT 
 
Version CAD-Richtlinie: 4.0 
 
 
Autor Basisrichtlinie: Christoph Merz 
Seite 4/17 
Autor: Hans Schlotterbeck 
 
b. 
Für Bauingenieurpläne (inkl. Bewehrungs- und Schalungspläne) gelten sinngemäss die gleichen 
Bestimmungen wie für Architekturpläne (AR). 
x 
 
 
 
1.2 
Verbindlichkeit 
Basisrichtlinie: 
AR 
HT 
1. 
Diese Richtlinie ist verbindlich für alle Beauftragten, welche für den Auftraggeber / die Auftraggeberin CAD-Pläne erstellen oder bearbeiten. Sie ist ein integrierender Bestandteil des Vertrages 
zwischen dem Auftraggeber / der Auftraggeberin und dem Auftragnehmer / der Auftragnehmerin 
und muss ausdrücklich als Vertragsbestandteil genannt werden. 
x 
x 
2. 
Spezialfälle und Ausnahmen in der Anwendung der CAD-Richtlinie sind mit dem / der zuständigen CAD-Verantwortlichen zu regeln und entsprechend zu protokollieren. 
x 
x 
3. 
Die Auswertung des CAD-Tests wird in schriftlicher Form den entsprechenden Planern / Planerinnen kommuniziert. 
x 
x 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
a. 
Vor Januar 2008 erstellte CAD-Pläne sind nach Absprache mit dem CAD-Planarchiv AHB abzuliefern. 
x 
x 
b. 
Das Amt für Hochbauten vertritt im Fachbereich CAD alle Interessen der Besteller (Immobilienverwaltung der Stadt Zürich, Liegenschaftsverwaltung der Stadt Zürich usw.). 
x 
x 
c. 
Für die Bewirtschaftungspläne gelten spezielle Bestimmungen (siehe dazu Absatz 2.8 "Flächenmanagement"). 
x 
 
 
1.3 
Weitere Grundlagen 
Basisrichtlinie: 
AR 
HT 
Für die Erstellung von Plänen gelten grundsätzlich folgende Richtlinien und Normen. 
 
 
1. 
SIA 400 Planbearbeitung im Hochbau 
x 
 
2. 
SIA 405 Geoinformationen zu unterirdischen Leitungen 
x 
 
3. 
SIA 406 Inhalt und Darstellung von Bodenverbesserungsprojekten 
x 
 
4. 
SIA 410, 410/1 und 410/2, Kennzeichnung von Installationen in Gebäuden 
x 
x 
5. 
SIA 416 Flächen und Volumen von Gebäuden 
x 
 
6. 
SIA 416/1 Kennzahlen für die Gebäudetechnik 
x 
x 
7. 
SIA D0165 Kennzahlen im Immobilienmanagement 
x 
 
8. 
DIN 277 Grundflächen und Rauminhalte von Bauwerken im Hochbau 
x 
 
9. 
Elementkostengliederung EKG des CRB 
x 
 
10. SIA-Merkblatt 2014 CAD-Layerorganisation (wenn in dieser Richtlinie nicht anders definiert) 
x 
x 
11. SIA-Merkblatt 2007 Qualitätssicherung im Bauwesen 
x 
 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
a. 
Richtlinie für die Bauwerkdokumentation AHB 
x 
x 
b. 
Checkliste Bauwerkdokumentation AHB 
x 
x 
c. 
Richtlinie für die Flächenerfassung und Erstellung von Bewirtschaftungsplänen RFB 
x 
 
 
1.4 
Begriffsbestimmungen 
Basisrichtlinie: 
AR 
HT 
1. 
Die Begriffe Modell und Layout tauchen hauptsächlich im Zusammenhang mit AutoCAD und ähnlichen CAD-Systemen auf. Unter dem Modell verstehen diese Systeme die Konstruktionsumgebung, wo die Modelle z.B. eines Gebäudes (Grundrisse, Ansichten, Details etc.) entwickelt werden. Das Layout dient der Gestaltung des Planes. Plankopf, Legenden, Beschreibungen etc. werden im Layout zusammen mit dem Modell zu einem vollständigen CAD-Plan zusammengeführt. 
Die meisten CAD-Systeme verfügen nur über den Modellbereich, wo die Anwender / Anwenderinnen das Modell und sämtliche Layoutelemente vereinen. 
Wenn diese Begriffe in der Basisrichtline erscheinen, so wird auf AutoCAD und ähnliche CAD-
Systeme hingewiesen. 
x 
x 
2. 
Der Begriff Solid entspricht dem in AutoCAD definierten Schraffurmuster für vollflächige Füllungen. In anderen Anwendungen wird für diesen Begriff z.B. Flächen- oder Füllschraffur verwendet. 
x 
x

## S. 5

CAD-Basisrichtlinie 
 
 
Interessengemeinschaft CADexchange 
Richtlinie-CAD-4.0-2008.doc 
Erstellungsdatum: 08.01.2008 
Version Basisrichtlinie: 2.0 – 2007 mit HT 
 
Version CAD-Richtlinie: 4.0 
 
 
Autor Basisrichtlinie: Christoph Merz 
Seite 5/17 
Autor: Hans Schlotterbeck 
 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
a. 
"AHB" = Amt für Hochbauten der Stadt Zürich 
"IMMO" = Immobilienbewirtschaftung der Stadt Zürich 
"LV" oder "Ligi" = Liegenschaftenverwaltung der Stadt Zürich 
x 
x 
 
 
 
2 
Grafische Vorgaben 
2.1 
Planinhalt und Darstellung 
Basisrichtlinie: 
AR 
HT 
1. 
Es gelten die Empfehlungen der SIA 400 betreffend Darstellung und Bearbeitung von Plänen. 
x 
 
2. 
Es gelten die Empfehlungen der SIA 410, 410/1 und 410/2 betreffend Darstellung und Kennzeichnung von Plänen. 
 
x 
3. 
Haustechnikpläne sind in der Regel so aufgebaut, dass mehrere Gewerke in einer Datei zu einem Konstruktionsmodell zusammengeführt sind und in verschiedenen Layouts ausgedruckt / 
ausgeplottet werden. Diese Richtlinie regelt lediglich die Darstellungsform des Konstruktionsmodells. Die Konsequenz dieser Definition ist, dass der Modellbereich der geöffneten CAD-Datei 
nicht dem ausgedruckten Plan entspricht. 
 
x 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
a. 
Die Verwendung von Layouts ist (in Abweichung zu Punkt 3) nur in Absprache mit dem CAD-
Planarchiv AHB zulässig. Der Modellbereich von Architektur-, Bauingenieur- und Gebäudetechnikplänen hat in der Regel dem ausgedruckten Plan zu entsprechen. 
x 
x 
 
2.2 
Planlayout 
2.2.1 
Referenzpunkt 
Basisrichtlinie: 
AR 
HT 
1. 
Die Referenzpunkte sind auf einen separaten Layer (gemäss Layerstruktur), gekennzeichnet mit 
“REF.PKT” sowie einer fortlaufenden Nummer (z.B. REF.PKT 1) zu legen. 
x 
x 
2. 
Sind die Referenzpunkt definiert und auf den Plänen gesetzt, so dürfen sie während der gesamten Lebensdauer eines CAD-Planes nicht mehr verschoben werden. 
x 
 
x 
3. 
Werden Architekturpläne referenziert, müssen mindestens die vorhandenen Referenzpunkte 
inkl. Beschriftung in den neuen CAD-Plan übernommen werden. 
 
x 
4. 
Die Referenzpunkte sind über alle 3 Gebäudeachsen zu definieren (X/Y-, Z-Koordinate) 
x 
 
5. 
Als Referenzpunkte können in der X/Y-Ebene Rasterschnittpunkte oder Grenzpunkte der Amtlichen Vermessung (aus dem Katasterplan) verwendet werden und in der Z-Achse Koten oder 
Höhenangaben. 
x 
 
6. 
Die Referenzpunkte sind innerhalb des Schnittrahmens zu platzieren. 
x 
 
7. 
Bei Planunterteilungen müssen mindestens 2 Referenzpunkte sichtbar sein. 
x 
 
8. 
Falls es sinnvoll erscheint, andere Referenzpunkte zu verwenden, so sind diese mit dem / der 
CAD-Verantwortlichen zu besprechen und schriftlich festzuhalten. 
x 
 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
a. 
Den Schnittstellen zwischen verschiedenen Gebäuden und Gebäudeteilen ist besondere Aufmerksamkeit zu schenken. In einem Gesamtplan (Bsp. Situation) sind die einzelnen Bauten als 
Umrisse darzustellen und die jeweiligen Ursprungspunkte (Referenzpunkte) zu kennzeichnen. 
x 
 
 
b. 
Die Referenzpunkte sind mit Fadenkreuz und Kreis zu kennzeichnen und sollten sich, sofern 
keine Rasterschnittpunkte vorhanden sind, an den äusseren Gebäudeecken befinden. Sie müssen sich in allen Geschossen an der gleichen Stelle befinden. 
x 
 
x 
c. 
Bei Teilplänen wie Gebäudetechnikplänen oder Ingenieurplänen sind auf einem separaten Layer 
Umrisse und Referenzpunkte zum Hauptplan anzugeben. 
x 
 
x 
 
2.2.2 
Geografische Orientierung 
Basisrichtlinie: 
AR 
HT 
1. 
Die geografische Orientierung bezogen auf angrenzende Gebäude oder auf die Landeskoordinaten wird über mindestens zwei Referenzpunkte definiert. Sie gewähren einerseits die Position 
x

## S. 6

CAD-Basisrichtlinie 
 
 
Interessengemeinschaft CADexchange 
Richtlinie-CAD-4.0-2008.doc 
Erstellungsdatum: 08.01.2008 
Version Basisrichtlinie: 2.0 – 2007 mit HT 
 
Version CAD-Richtlinie: 4.0 
 
 
Autor Basisrichtlinie: Christoph Merz 
Seite 6/17 
Autor: Hans Schlotterbeck 
 
des Gebäudes, aber auch eine saubere Definition / Festlegung der Himmelsrichtung. 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
a. 
Als gemeinsames Koordinatensystem gelten die Schweizerischen Landeskoordinaten. Der Ursprungspunkt (0.0/0.0/0.0) vom Benutzer-Koordinatensystem wird mit Fadenkreuz und Kreis gekennzeichnet und sollte sich an der jeweils unteren linken Gebäudeecke befinden. 
x 
x 
b. 
Zum Ursprungspunkt müssen auf jedem Hauptplan (Grundriss) die Landeskoordinate sowie die 
Höhe über Meer angegeben werden. Auf Gebäudeschnitten ist ein Geschoss (normalerweise 
das Erdgeschoss) mit der Höhe über Meer zu versehen (z.B. +-0.00 = 456.78 muM). 
x 
x 
 
2.2.3 
Planrahmen und Schnittrand 
Basisrichtlinie: 
AR 
HT 
1. 
Die Faltstellen sind im A4-Bereich des Plankopfes innerhalb des Schnittrandes einzuzeichnen. 
x 
 
2. 
Alle CAD-Pläne sind mit einem Schnittrand zu zeichnen, welcher alle anderen Planinformationen 
umschliesst. Der Schnittrand entspricht dem jeweiligen Planformat. 
x 
 
3. 
Ausserhalb des Schnittrahmens dürfen keine weiteren Informationen platziert werden. 
x 
 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
a. 
Im Modellbereich (Zeichnungsbereich) ist ein Zeichnungsrand mit 10 mm Abstand zum Schnittrand vorzusehen. Der Schnittrand umschliesst alle Zeichnungsränder sowie den Plankopf und 
die Legende. 
x 
x 
b. 
Die Faltmarken (Striche) sind innerhalb des Schnittrandes anzubringen. 
x 
x 
c. 
Die Punkte 1 - 3 gelten auch für Gebäudetechnik- und ingenieurpläne (HT). 
 
x 
 
2.2.4 
Plankopf 
Basisrichtlinie: 
AR 
HT 
1. 
Die Darstellung des Plankopfes wird vom Auftraggeber / von der Auftraggeberin vorgegeben 
x 
 
2. 
Jeder Plan trägt zur Vermessung einen grafischen Massstab, welcher wenn möglich im A4-
Bereich des Plankopfes zu platzieren ist. 
x 
 
3. 
Jeder Grundriss-Plan trägt zur Orientierung einen Nordpfeil, welcher wenn möglich im A4-
Bereich des Plankopfes zu platzieren ist. 
x 
 
4. 
Jeder Plan trägt zu Orientierung eine sinnvoll gewählte Übersichtsgrafik des Gebäudes, welche 
im A4-Bereich des Plankopfes zu platzieren ist. 
x 
 
5. 
Das Layout des A4-Plankopfbereiches muss einen Platzhalter für einen individuellen Haustechnik-Plankopf vorsehen (ca. 5-6 cm in der Vertikalen). 
x 
x 
6. 
Inhaltlich muss der oben genannte Haustechnik-Plankopf mindestens folgende Informationen 
enthalten: 
- Plangewerk (z.B. Sanitär) 
- Planinhalt 
Ausführliche Revisionstabellen sind ausserhalb des A4-Plankopfbereichs zu platzieren. 
 
x 
7. 
Pro CAD-Datei ist unabhängig von den Layouts ein Plankopf im Platzhalterbereich zu platzieren, 
welcher den Inhalt der CAD-Datei beschreibt. 
x 
x 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
a. 
Der AHB-Plankopf ist in den Musterplänen AHB enthalten und kann unter folgender Internet-
Adresse bezogen werden: 
http://www.stadt-zuerich.ch/internet/hbd/home/beraten/fachstellen/cad_planarchiv.html 
x 
x 
b. 
Der AHB-Plankopf ist im oberen rechten Modellbereich (21 cm Leerblatt über ganze Planhöhe; 
kann auch verkleinert werden) zu platzieren. Der Plankopf kann stufenlos skaliert werden. 
x 
x 
c. 
Der individuelle Haustechnik-Plankopf (Punkt 5) ist ergänzend zum AHB-Plankopf einzufügen. 
 
x 
 
2.3 
Linien- und Stifteinstellungen 
Basisrichtlinie: 
AR 
HT 
1. 
Grundsätzlich wird empfohlen, möglichst wenige und deutlich abgestufte (dünn, mittel, dick) Linienstärken zu verwenden. Die Vorgaben sind der SIA 400 zu entnehmen. 
x 
 
2. 
Es dürfen nur Linientypen, welche über das DXF-Format ausgetauscht werden können, verwendet werden. Weitere Linientypen sind über den CAD-Test zu prüfen 
x 
 
x 
3. 
Komplexe Linientypen mit eingeschlossenen Mustern oder Symbolen sind nicht erlaubt. 
x

## S. 7

CAD-Basisrichtlinie 
 
 
Interessengemeinschaft CADexchange 
Richtlinie-CAD-4.0-2008.doc 
Erstellungsdatum: 08.01.2008 
Version Basisrichtlinie: 2.0 – 2007 mit HT 
 
Version CAD-Richtlinie: 4.0 
 
 
Autor Basisrichtlinie: Christoph Merz 
Seite 7/17 
Autor: Hans Schlotterbeck 
 
4. 
Vorzugsweise ist ausschliesslich mit Polylinien zu arbeiten. Zusammenhängende Linienfolgen 
(z.B. Wände etc.) sind als geschlossene Polylinie zu zeichnen. 
 
 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
a. 
Echte Strichstärken dürfen nur in Verbindung mit der korrekten Pen-Farbe verwendet werden. 
x 
x 
b. 
Empfohlene Linientypen sind: 
- CONTINUOUS, Von Layer, Von Block 
- ACAD_ISOxxx 
x 
x 
c. 
Im Architekturbereich ist darauf zu achten, dass unterschiedliche Bauelemente mit verschiedenen Stiften (Stiftfarben) dargestellt werden. Für den Haustechnikbereich sind Farben und Symbole gemäss SIA-Empfehlungen 410/1 und 410/2 zu verwenden. 
x 
x 
d. 
Empfohlene Stifteinstellung: 
Stift 
Stiftfarbe 
Verwendung 
Linienstärke 
Plot-Farbe 
1 
rot 
Neu (Baueingabe) 
0.18 mm 
rot 
2 
gelb 
Abbruch (Baueingabe) 
0.18 mm 
gelb 
3 
grün 
- 
0.18 mm 
grün 
4 
cyan 
- 
0.18 mm 
cyan 
5 
blau 
- 
0.18 mm 
blau 
6 
magenta 
- 
0.18 mm 
magenta 
7 
s/w 
Text, Masstext 
0.00 mm 
schwarz 
8 
grau 
Scan, Referenz 
0.10 mm 
grau 
9 
hellgrau 
Vermassung 
0.25 mm 
schwarz 
10, 20, 30 … 
 
Hinweise 
0.00 mm 
- 
11 - 16 
rot 
Neu (Baueingabe) 
0.70 - 0.18 mm 
rot 
31 - 36 
hellbraun 
Baustelle, Markierungen 
0.70 - 0.18 mm 
schwarz 
51 - 56 
gelb 
Abbruch (Baueingabe) 
0.70 - 0.18 mm 
gelb 
71 - 76 
oliv 
Kataster, Grundstück 
0.70 - 0.18 mm 
schwarz 
91 - 96 
grün 
Pflanzen, Grünflächen 
0.70 - 0.18 mm 
schwarz 
111 - 116 
blaugrün 
Fenster, Türen, Leichtbau 
0.70 - 0.18 mm 
schwarz 
131 - 136 
hellblau 
Massivbau, Beton 
0.70 - 0.18 mm 
schwarz 
171 - 176 
blau 
Ausstattung, Möbel 
0.70 - 0.18 mm 
schwarz 
201 - 206 
violett 
Achsen 
0.70 - 0.18 mm 
schwarz 
211 - 216 
lila 
Fugen, Befestigungen 
0.70 - 0.18 mm 
schwarz 
231 - 236 
rosa 
Polygone 
0.70 - 0.18 mm 
gem. Raumtyp 
241 - 246 
weinrot 
Zeichnungsrand, Legende 
0.70 - 0.18 mm 
schwarz 
247 
braunrot 
Hilfslinien 
- 
- 
251 - 256 
grau 
Schraffuren 
0.70 - 0.18 mm 
grau/schwarz 
 
 
x 
x 
 
2.4 
Text 
Basisrichtlinie: 
AR 
HT 
1. 
Grundsätzlich darf nur 1 Schrifttyp verwendet werden. Dieser ist anhand des CAD-Testes zusammen mit dem / der CAD-Verantwortlichen zu definieren. 
x 
x 
2. 
Sonderzeichen und Umlaute dürfen verwendet werden, wenn sie über den CAD-Test geprüft 
worden sind. 
x 
x 
3. 
Beim Planausdruck im Originalformat ist die minimale Schriftgrösse von 2 mm nicht zu unterschreiten. 
x 
x 
4. 
Die Texte sind auf den dafür vorgesehenen Layern abzulegen (siehe Layerstruktur) 
x 
x 
5. 
Attribute (bearbeitbare Textblöcke) dürfen eingesetzt werden, sofern sie in Fremdsystemen als 
Attribute erscheinen oder in Textelemente umgewandelt werden. 
x 
 
x 
Angaben des Auftraggebers / der Auftraggeberin:

## S. 8

CAD-Basisrichtlinie 
 
 
Interessengemeinschaft CADexchange 
Richtlinie-CAD-4.0-2008.doc 
Erstellungsdatum: 08.01.2008 
Version Basisrichtlinie: 2.0 – 2007 mit HT 
 
Version CAD-Richtlinie: 4.0 
 
 
Autor Basisrichtlinie: Christoph Merz 
Seite 8/17 
Autor: Hans Schlotterbeck 
 
a. 
Auf allen Plänen ist der Schrifttyp Arial TT zu verwenden (Stift 7, schwarz/weiss) 
x 
x 
 
2.5 
Vermassung 
Basisrichtlinie: 
AR 
HT 
1. 
Die Vermassung muss nach Möglichkeit als Geometrieblock bearbeitbar sein (Assoziativvermassung). 
x 
x 
2. 
Die Millimeterangaben der Masswerte dürfen nicht als Hochzahlen dargestellt werden. Bei Meter-
Vermassung sind die Millimeter als dritte Nachkommastelle, bei Zentimeter-Vermassung als erste 
Nachkommastelle anzufügen. 
x 
 
3. 
Die Vermassungen sind auf den dafür vorgesehenen Layern abzulegen (siehe Layerstruktur) 
x 
x 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
a. 
Auf allen Plänen ist der Schrifttyp Arial TT zu verwenden (Stift 7 und 9, schwarz/weiss und hellgrau) 
x 
x 
b. 
Die Grundmasseinheit beträgt 1 Meter. 
 
 
 
2.6 
Schraffuren 
Basisrichtlinie: 
AR 
HT 
1. 
Grundsätzlich dürfen nur einfache Linien-Schraffuren verwendet werden, die sich in Abstand, 
Winkel und Linientyp voneinander unterscheiden lassen. Die Kombination zweier solcher Schraffuren ist erlaubt. 
x 
x 
2. 
Aus komplexen Einzelelementen oder Symbolen zusammengesetzte Schraffuren sind nicht erlaubt. 
x 
x 
3. 
Sämtliche zu verwendenden Schraffuren und Solids müssen vorgängig über den CAD-Test geprüft und von dem / der CAD-Verantwortlichen abgenommen werden. 
x 
x 
4. 
Die Schraffur muss nach Möglichkeit als Geometrieblock bearbeitbar sein (Assoziativschraffur). 
x 
x 
5. 
Die Schraffuren sind auf den dafür vorgesehenen Layern abzulegen (siehe Layerstruktur). 
x 
x 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
a. 
Pro Massstab ist ein Schraffur-Layer zu verwenden. 
x 
x 
b. 
Schraffuren und Schraffurbegrenzungslinien sind mit den jeweiligen Elementfarben (siehe Linien- und Stifteinstellungen) in einem dunkleren Farbton zu zeichnen. Vollfarbige Flächen sind 
mit Solids zu zeichnen. 
x 
x 
 
2.7 
Weitere Zeichnungselemente 
Basisrichtlinie: 
AR 
HT 
1. 
Alle eingesetzten Symbole sind über eine Legende zu beschreiben 
 
x 
2. 
Alle eingesetzten Symbole müssen auch in Fremdsystemen bearbeitbar sein. Referenzierte 
Symbolbibliotheken sind nicht erlaubt. 
x 
x 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
 
 
 
 
2.8 
Flächenmanagement 
Basisrichtlinie: 
AR 
HT 
1. 
Die Flächenpolygone müssen aus geschlossenen Polylinien bestehen und dem entsprechenden 
Layer (gemäss Layerstruktur) zugeordnet werden. 
x 
 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
a. 
In den Gebäudeplänen 1:200/100 sind gemäss SIA Ordnung 416 einzutragen: 
- Geschosspolygone (Geschossfläche) 
- Raumpolygone (Netto-Raum-/Geschossflächen) 
- Raumstempel 
x 
 
b. 
Zur Identifikation der Räume ist der AHB-Raumstempel zu verwenden. Pro Raum ist ein 
Raumstempel einzutragen. Bei kleinen Räumen ist der Stempel ausserhalb des Gebäudes zu 
Platzieren und mit einer Verbindungslinie zuzuordnen. Die Raumstempel, Raumnummern und 
Raumtexte sind auf separate Layer zu legen. Für die Gebäudepläne im Massstab 1:200/100 und 
Werkpläne im Massstab 1:50 sind separate Raumstempel zu verwenden. 
x

## S. 9

CAD-Basisrichtlinie 
 
 
Interessengemeinschaft CADexchange 
Richtlinie-CAD-4.0-2008.doc 
Erstellungsdatum: 08.01.2008 
Version Basisrichtlinie: 2.0 – 2007 mit HT 
 
Version CAD-Richtlinie: 4.0 
 
 
Autor Basisrichtlinie: Christoph Merz 
Seite 9/17 
Autor: Hans Schlotterbeck 
 
c. 
Für die Bewirtschaftungspläne gelten spezielle Bestimmungen (siehe dazu die Richtlinie für die 
Flächenerfassung und Erstellung von Bewirtschaftungsplänen RFB). 
x 
 
 
 
 
3 
Strukturelle Vorgaben 
3.1 
Struktur 
Basisrichtlinie: 
AR 
HT 
1. 
Die Basis eines CAD-Planes bildet die Layerstruktur, welche die verschiedenen Elemente organisiert und sauber voneinander trennt, so dass sie beliebig ein- und ausgeschaltet werden können. 
x 
x 
2. 
Die Geometriedaten sind nach Möglichkeit in CAD-Objekte (Blöcke oder Gruppen) zu gliedern, 
welche bautechnischen Einheiten wie Fenster, Türen, Symbole, etc. entsprechen. 
x 
x 
3. 
Konstruktive Elemente und das Planlayout werden grundsätzlich im Modell gezeichnet. 
x 
 
4. 
Die Verwendung von Layouts ist mit dem / der CAD-Verantwortlichen abzusprechen 
x 
 
5. 
Sollten Layouts eingesetzt werden, so muss gewährleistet sein, dass alle wichtigen Informationen gleichzeitig auch im Modell dargestellt sind. Bei fehlerhaftem Datenaustausch ohne Layouts 
dürfen keine inhaltlichen Informationen verloren gehen. 
x 
 
x 
6. 
Konstruktionshilfslinien sind vor der Datenübergabe zu löschen. 
x 
x 
7. 
Das mehrfache Überzeichnen von Objekten auf demselben Layer ist nicht zulässig. 
x 
 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
a. 
Die Verwendung von Layouts ist (in Abweichung zu Punkt 4 und 5) nur in Absprache mit dem 
CAD-Verantwortlichen AHB zulässig. Der Modellbereich von Architektur-, Bauingenieur- und 
Gebäudetechnikplänen hat in der Regel dem ausgedruckten Plan zu entsprechen. 
x 
x 
 
3.2 
Referenzen 
Basisrichtlinie: 
AR 
HT 
1. 
Referenzierte oder eingefügte Fremdpläne (meistens Architekturgrundrisse) sind bei der Abgabe 
zu entfernen. Die eingesetzten Referenzpunkte dienen dazu, diese jederzeit wieder einzufügen. 
 
x 
2. 
Pixelbilddateien ohne konstruktive Relevanz dürfen eingesetzt werden, solange die Referenz in 
der CAD-Datei eindeutig bezeichnet ist und die Bilddatei im Lieferumfang enthalten ist. 
x 
x 
3. 
Bei Mischplänen (unterschiedliche Darstellungstiefen) sollten die Schnitte und Details wenn 
möglich in einer separaten Datei gespeichert werden. Ausnahmen sind mit dem/der CAD-
Verantwortlichen abzusprechen. 
 
x 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
 
 
 
 
3.3 
Teilobjekte 
Basisrichtlinie: 
AR 
HT 
1. 
Müssen Objekte in Teilobjekte gegliedert werden, so sind diese auf einem Übersichtsschema 
mit ihren Referenzpunkten zu bezeichnen. 
x 
 
2. 
Muss ein einzelnes Gebäude auf zwei oder mehrere Pläne aufgeteilt werden, so ist der Bereich 
der Teilung resp. Überlappung auf den angrenzenden Plänen auf einem separaten Layer zu fixieren. 
x 
 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
 
 
 
 
3.4 
Dateibezeichnung 
Basisrichtlinie: 
AR 
HT 
1. 
Auf Umlaute und Sonderzeichen ist bei der Benennung von Dateien und Ordner zu verzichten 
x 
x 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
a. 
Sämtliche Pläne sind nach folgender Regel zu benennen. Fehlende oder unbekannte Stellen 
sind mit "0" zu belegen: 
x 
 
x

## S. 10

CAD-Basisrichtlinie 
 
 
Interessengemeinschaft CADexchange 
Richtlinie-CAD-4.0-2008.doc 
Erstellungsdatum: 08.01.2008 
Version Basisrichtlinie: 2.0 – 2007 mit HT 
 
Version CAD-Richtlinie: 4.0 
 
 
Autor Basisrichtlinie: Christoph Merz 
Seite 10/17 
Autor: Hans Schlotterbeck 
 
 
ooooo-oo_f-aa-ggg-mmm-nnnpv.dwg 
Beispiel: 
29050-00_A-GR-U02-100-001Rc.dwg (31-stellig) 
 
b. 
Legende: 
ooooo-oo = Inventarnummer 
f = Fachbereich 
aa = Planart 
ggg = Geschoss, Ebene 
mmm = Massstab 
nnn = Plannummer 
p = Projektphase 
v = Version, Index 
 
Inventarnummer: 
ooooo-oo 
Inventarnummer 
8-stellig 
 
Fachbereich: 
f 
Fachbereich 
1-stellig 
A 
Architektur 
 
B 
Bauingenieurwesen 
 
C 
Amt für Hochbauten 
(CAD) 
E 
Elektroplanung 
 
F 
Feuerpolizei, Sicherheit 
 
G 
Geologie 
 
H 
Heizungsplanung 
 
K 
Klima-/ Energieplanung 
 
L 
Lüftungsplanung 
 
M 
Mobiliarplanung 
 
Q 
Koordination 
 
R 
MSRL 
 
S 
Sanitärplanung 
 
T 
Transportplanung 
 
U 
Landschaftsarchitektur 
 
V 
Vermessung, Geometer 
 
W 
Werke 
 
Z 
Bewirtschaftung 
 
 
Planart: 
aa 
Planart 
2-stellig 
AN 
Ansicht 
 
DE 
Detail 
 
FA 
Fassade 
 
GR 
Grundriss 
 
KA 
Kanalisation 
 
LA 
Layout 
 
MX 
Mischplan 
(Mehrere Darstellungen) 
SA 
Schema 
 
SC 
Schnitt 
 
SI 
Situation, Umgebung 
 
VZ 
Vermessung

## S. 11

CAD-Basisrichtlinie 
 
 
Interessengemeinschaft CADexchange 
Richtlinie-CAD-4.0-2008.doc 
Erstellungsdatum: 08.01.2008 
Version Basisrichtlinie: 2.0 – 2007 mit HT 
 
Version CAD-Richtlinie: 4.0 
 
 
Autor Basisrichtlinie: Christoph Merz 
Seite 11/17 
Autor: Hans Schlotterbeck 
 
 
Ebene: 
ggg 
Ebene, Geschoss 
3-stellig 
A01-99 
Ansicht 1-99 
 
F01-99 
Fassade 1-99 
 
N00 
Neutral, nicht definiert 
 
S01-99 
Schnitt 1-99 
 
G00-99/ A0-Z0 
Geschoss 1-99 oder A0-Z0 
(G00 = Umgebung) 
E00 
Erdgeschoss 
 
U01-99 
Untergeschoss 1-99 
 
O01-99 
Obergeschoss 1-99 
 
Z01-99 
Zwischengeschoss 1-99 
 
D01-99 
Dachgeschoss 1-99 
 
 
Massstab: 
mmm 
Massstab 
3-stellig 
25k 
1 : 25'000 
 
2k5 
1 : 2'500 
 
1k0 
1 : 1'000 
 
500 
1 : 500 
 
200 
1 : 200 
 
100 
1 : 100 
 
050 
1 : 50 
 
020 
1 : 20 
 
005 
1 : 5 
 
 
Pannummer: 
nnn 
Plannummer 
3-stellig 
 
Projektphase: 
p 
Projektphase 
1-stellig 
A 
Ausführung 
 
B 
Baueingabe 
 
C 
Bestandesplan 
 
E 
Entwurf 
 
P 
Projekt 
 
R 
Revision 
 
S 
Studie 
 
T 
Transfer 
 
V 
Vorprojekt 
 
W 
Wettbewerb 
 
 
Version: 
v 
Version, Index 
1-stellig

## S. 12

CAD-Basisrichtlinie 
 
 
Interessengemeinschaft CADexchange 
Richtlinie-CAD-4.0-2008.doc 
Erstellungsdatum: 08.01.2008 
Version Basisrichtlinie: 2.0 – 2007 mit HT 
 
Version CAD-Richtlinie: 4.0 
 
 
Autor Basisrichtlinie: Christoph Merz 
Seite 12/17 
Autor: Hans Schlotterbeck 
 
3.5 
Layerbezeichnung 
Basisrichtlinie: 
AR 
HT 
1. 
Grundlage für die CAD-Layerstruktur bildet das SIA-Merblatt 2014 
x 
 
2. 
Die ersten 2 Zeichen des EKG (Elementkosten-Gliederung gemäss SIA Merkblatt 2014) werden 
in den ersten 4 Zeichnen des Layernamens dargestellt 
x 
 
3. 
Firmeneigene Layerstrukturen dürfen verwendet werden, müssen aber die vom Auftraggeber / 
von der Auftraggeberin definierte SIA-Codierung zu Beginn des Layernamens anfügen. 
 
x 
4. 
Sollte das eingesetzte CAD-System keine individuellen Layerstrukturen akzeptieren, so ist mit 
dem Lieferumfang eine Übersetzungstabelle beizulegen 
 
x 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
a. 
Die Layerbezeichnung AHB ist wie folgt definiert: 
 
nn(xx)_qqqqqqqq 
 
Beispiele: E2_STUETZEN; E51_FENSTER; E511_HOLZFENSTER 
 
b. 
Legende: 
nn = Haupt-/Untergruppe nach EKG (2-stellig), obligatorisch 
xx = Erweiterungs-Code nach BEK (fakultativ; 2-stellig) 
qqqqqqqq = Bezeichnung nach SIA 2014 (max. 26-stellig) 
 
Basislayer: 
nn(xx) 
Bezeichnung 
Stift (Grundeinstellung) 
00 
REFERENZ 
7 
A0 
GRUNDSTUECK 
73 
A9 
NACHBARGRUNDSTUECK 
73 
B0 
BAUSTELLENEINRICHTUNG 
33 
D0 
AUSHUB 
93 
D2 
FUNDAMENTE 
133 
D3 
KANALISATION-GEBAEUDE 
84 
E01 
DECKEN 
135 
E02 
UNTERZUEGE 
135 
E03 
BALKONE 
133 
E04 
TREPPEN 
135 
E1 
DAECHER 
113 
E13 
DACHENTWAESSERUNG 
113 
E2 
STUETZEN 
131 
E3 
AUSSENWAENDE-UG 
131 
E4 
AUSSENWAENDE-EGOG 
131 
E44 
ISOLATION 
135 
E51 
FENSTER 
113 
E52 
AUSSENTUEREN 
113 
E53 
AUSSENTORE 
113 
E61 
INNENWAENDE-TRAGEND 
131 
E62 
INNENWAENDE-NICHTTRG 
133 
I0 
STARKSTROM 
44 
I1 
TELEKOM 
44 
I2 
HEIZUNG 
24 
I3 
LUEFTUNG-KLIMA-KAELTE 
154 
I4 
SANITAER 
84 
I6 
TRANSPORTANLAGEN 
113 
x 
x

## S. 13

CAD-Basisrichtlinie 
 
 
Interessengemeinschaft CADexchange 
Richtlinie-CAD-4.0-2008.doc 
Erstellungsdatum: 08.01.2008 
Version Basisrichtlinie: 2.0 – 2007 mit HT 
 
Version CAD-Richtlinie: 4.0 
 
 
Autor Basisrichtlinie: Christoph Merz 
Seite 13/17 
Autor: Hans Schlotterbeck 
 
M11 
TRENNWAENDE 
113 
M16 
INNENTUEREN 
113 
M2 
SCHUTZELEMENTE 
113 
M3 
BODENBELAEGE 
115 
M4 
WANDBEKLEIDUNGEN 
115 
M5 
DECKENBEKLEIDUNGEN 
115 
M6 
EINBAUTEN 
113 
M7 
KUECHEN 
113 
Q0 
AUSRUESTUNG 
115 
R0 
MOEBEL 
173 
R3 
BELEUCHTUNG 
44 
R4 
MARKIERUNGEN 
35 
T1 
TERRAINGESTALTUNG 
91 
T2 
UMGEBUNGSBAUWERKE 
31 
T3 
WERKLEITUNGEN 
84 
T4 
GRUENFLAECHEN 
93 
T5 
HARTFLAECHEN 
35 
T6 
EINFRIEDUNGEN 
73 
SB 
SCAN 
8 
UB 
050-BEMASSUNG 
9 
UB 
100-BEMASSUNG 
9 
UH 
HINWEISE 
10 (10, 20, 30…) 
UT 
050-TEXT 
7 
UT 
100-TEXT 
7 
VS 
050-SCHRAFFUREN 
252 
VS 
100-SCHRAFFUREN 
251 
WH 
HILFSLINIEN 
247 
WI 
INFORMATIONEN 
10 (10, 20, 30…) 
XK 
LEGENDE 
245 
XK 
PLK 
245 
XK 
RAND 
247 
XK 
RASTER 
245 
YA 
ACHSEN 
205 
Z1 
POLYGONE 
231 
Z2 
RAUMSTEMPEL 
7 (Rahmen = 6) 
 
Basislayer Elektro: 
nn(xx) 
Bezeichnung 
Stift (Grundeinstellung) 
I0 
AUSSPARUNGEN 
30 
I03 
POTENTIAL 
20 
I04 
KANAL 
42 
I051 
LICHT 
150 
I052 
KRAFT 
10 
I053 
HLK 
10 
I061 
LEUCHTEN 
170 
I062 
NOTLEUCHTEN 
124 
I11 
TELEFON 
100 
I12 
AKKUSTIK 
22

## S. 14

CAD-Basisrichtlinie 
 
 
Interessengemeinschaft CADexchange 
Richtlinie-CAD-4.0-2008.doc 
Erstellungsdatum: 08.01.2008 
Version Basisrichtlinie: 2.0 – 2007 mit HT 
 
Version CAD-Richtlinie: 4.0 
 
 
Autor Basisrichtlinie: Christoph Merz 
Seite 14/17 
Autor: Hans Schlotterbeck 
 
I13 
RTV 
210 
I14 
UKV 
100 
I15 
SICHERHEIT 
32 
I16 
UEBERWACHUNG 
32 
X0 
PLK 
243 
X1 
PLK 
243 
X0 
LEGENDE 
243 
X1 
LEGENDE 
243 
 
Basislayer Heizung: 
nn(xx) 
Bezeichnung 
Stift (Grundeinstellung) 
I232 
RL 
180 
I232 
VL 
10 
I241 
RAD 
20 
X2 
PLK 
243 
X2 
LEGENDE 
243 
 
Basislayer Lüftung: 
nn(xx) 
Bezeichnung 
Stift (Grundeinstellung) 
I341 
ABL 
40 
I341 
AUL 
90 
I341 
FOL 
30 
I341 
ZUL 
10 
X3 
PLK 
243 
X3 
LEGENDE 
243 
 
Basislayer Sanitär: 
nn(xx) 
Bezeichnung 
Stift (Grundeinstellung) 
I41 
APP 
80 
I441 
KWRD 
90 
I442 
WW 
10 
I451 
WAS 
42 
X4 
PLK 
243 
X4 
LEGENDE 
243 
 
 
 
3.6 
Zeichnungsmassstab 
Basisrichtlinie: 
AR 
HT 
1. 
Im DXF/DWG-Format werden betreffend Massstab keine Informationen übermittelt. Der Planmassstab ist beim Datenimport einheitlich für das ganze Dokument (File) einzustellen, d.h. alle 
Layer inkl. Schnittrand und Plankopf müssen den gleichen Massstab aufweisen. 
x 
x 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
a. 
Die Grundmasseinheit beträgt 1 Meter. 
x 
x 
b. 
Die Massstabswahl richtet sich nach den SIA-Ordnungen. 
 
 
 
 
 
4 
Technische Vorgaben

## S. 15

CAD-Basisrichtlinie 
 
 
Interessengemeinschaft CADexchange 
Richtlinie-CAD-4.0-2008.doc 
Erstellungsdatum: 08.01.2008 
Version Basisrichtlinie: 2.0 – 2007 mit HT 
 
Version CAD-Richtlinie: 4.0 
 
 
Autor Basisrichtlinie: Christoph Merz 
Seite 15/17 
Autor: Hans Schlotterbeck 
 
4.1 
Datenmedien 
Basisrichtlinie: 
AR 
HT 
Keine Angaben 
x 
x 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
a. 
Folgende Datenträger werden für den Datenaustausch akzeptiert (lesbar mit Microsoft Windows 
XP): 
- CD-R (CD Recordable ISO 9660; Joliet-Erweiterung) 
- E-Mail (Attachment) für Vorabzüge 
x 
x 
 
4.2 
Datenformate 
Basisrichtlinie: 
AR 
HT 
Keine Angaben 
x 
x 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
a. 
Folgende Datenformate sind für die Datenübermittlung verbindlich: 
- DWG 2000 und höher 
- PDF (Plotfile) 
- Microsoft Office-Formate (XLS, DOC, PPT usw.) 
- TIF, JPG 
x 
x 
b. 
Sämtliche Daten, die auf einem anderen Betriebssystem als Microsoft Windows erstellt worden 
sind, müssen Microsoft-DOS/Windows formatiert werden. Dabei ist den Sonderzeichen und Umlauten Beachtung zu schenken. 
x 
x 
 
4.3 
Datenkomprimierung 
Basisrichtlinie: 
AR 
HT 
Keine Angaben 
x 
x 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
a. 
Datenkomprimierung ist nur für den Datenaustausch via E-Mail zu verwenden. Als Format werden ZIP-Archive empfohlen (nicht selbstentpackend) 
x 
x 
b. 
Dateien dürfen nicht auf mehrere Datenträger verteilt werden (Splitting, Spanning). 
x 
x 
 
4.4 
CAD-System 
Basisrichtlinie: 
AR 
HT 
Keine Angaben 
x 
x 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
a. 
Die Planenden verwenden für die digitale Datenbearbeitung ein CAD-System ihrer Wahl. 
x 
x 
b. 
Im Amt für Hochbauten wird als Betriebssystem Microsoft Windows XP Professional benutzt. 
x 
x 
c. 
Das Amt für Hochbauten setzt als Basissoftware Microsoft Office 2003 und AutoCAD 2005 ein. 
x 
x 
 
 
 
5 
Organisatorische Vorgaben 
5.1 
DXF/DWG-Testdatenaustausch 
Basisrichtlinie: 
AR 
HT 
1. 
Beauftragte, welche CAD-Daten liefern, müssen einen DXF/DWG-Testdatenaustausch durchführen. Mit dem Test soll die Datenübertragungsqualität erhöht, der Konfigurationsaufwand vermindert und eine Grundlage für die Zusammenarbeit geschaffen werden. 
x 
x 
2. 
Der Auftraggeber / die Auftraggeberin behält sich das Recht vor, jederzeit und ohne Begründung 
die Durchführung eines Testes zu verlangen. 
x 
x 
Der Test läuft wie folgt ab: 
- 
Nach der Auftragserteilung hat der / die Beauftragte auf dem zum Einsatz kommenden CAD-
System eine Testgrafik gemäss Vorlage zu erstellen. 
- 
Die Testgrafik ist mit der DXF/DWG-Schnittstelle des Quellsystems in eine DXF/DWG-Datei umzuwandeln und in Absprache mit dem / der CAD-Verantwortlichen dem Auftraggeber / der Auf-

## S. 16

CAD-Basisrichtlinie 
 
 
Interessengemeinschaft CADexchange 
Richtlinie-CAD-4.0-2008.doc 
Erstellungsdatum: 08.01.2008 
Version Basisrichtlinie: 2.0 – 2007 mit HT 
 
Version CAD-Richtlinie: 4.0 
 
 
Autor Basisrichtlinie: Christoph Merz 
Seite 16/17 
Autor: Hans Schlotterbeck 
 
traggeberin abzuliefern. 
- 
Der Auftraggeber / die Auftraggeberin wird die DXF/DWG-Datei auf dem Zielsystem importieren 
und mit der Vorgabe vergleichen. 
- 
Dem / der Beauftragten wird das Testergebnis anhand eines Protokolls mitgeteilt, welches gleichzeitig als erweiterte CAD-Richtlinie gilt. Allfällige Korrekturen und/oder Ergänzungen auf Grund 
von Fehlermeldungen resp. Qualitätsmängeln sind umgehend nachzubessern. 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
a. 
Der Testdatenaustausch (Plausibilitätstest) ist während der Projektierung, jedoch spätestens vor 
der Baueingabe durchzuführen. 
x 
x 
b. 
Als Testgrafik ist ein repräsentativer Projektplan (Grundriss) zu verwenden. 
x 
x 
c. 
Der Testdatenaustausch ist mit dem CAD-Planarchiv vom Amt für Hochbauten vorzunehmen. 
Aufgrund vom Testresultat wird die definitive Datenübergabe formuliert und in einem Protokoll 
festgehalten. Die Planprüfung kann auch durch eine - vom AHB beauftragte - externe Prüfstelle 
erfolgen. 
x 
x 
 
5.2 
Definitive Lieferung 
Basisrichtlinie: 
AR 
HT 
Keine Angaben 
x 
x 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
a. 
Die Datenübergabe erfolgt zu den vereinbarten Zwischen- und Endterminen. Die Daten sind 
vollständig auf einer CD-R zu brennen und zusammen mit der Bauwerkdokumentation der/dem 
Projektleitenden AHB abzugeben. 
x 
x 
b. 
Der Umfang der Planlieferung richtet sich nach der Richtlinie für die Bauwerkdokumentation 
AHB und ist in der Checkliste Bauwerkdokumentation AHB schriftlich mit der Projektleitung AHB 
zu vereinbaren. 
x 
x 
c. 
Alle Plandaten sind inhaltlich vollständig mit sämtlichen damit verknüpften Elementen zu übergeben. Pro Darstellungsebene (Geschoss, Fassade, Perspektive) ist eine CAD-Datei zu erstellen. Pro geplotteter Plan ist zusätzlich eine Druckdatei (PDF) zu erstellen. 
x 
x 
d. 
Sämtliche Pläne sind auch in Papierform abzugeben. Die Plotträger (Papier, Folie) müssen qualitativ der Richtlinie für die Bauwerkdokumentation AHB entsprechen. 
x 
x 
e. 
Spezifische Ploteinstellungen (Plotstiltabellen) sowie Plotfiles sind als separate Dateien mitzuliefern, sofern sie nicht in der CAD-Datei mitgespeichert sind. 
x 
x 
 
 
 
6 
Rechtliche Vorgaben 
6.1 
Nutzungsrecht an CAD-Daten 
Basisrichtlinie: 
AR 
HT 
1. 
Der Auftragnehmer / die Auftragnehmerin übergibt dem Auftraggeber / der Auftraggeberin mit 
dem Datenträger das vollständige Nutzungsrecht, insbesondere jegliche Verwertungsrechte an 
den darauf gespeicherten Daten. Dies gilt auch für Daten, die durch den externen Planenden / die 
externe Planende von Dritten übernommen worden sind. Der Auftragnehmer / die Auftragnehmerin darf keine Plansymbole oder Informationen in die CAD-Daten übernehmen, an welchen Urheber- oder Nutzungsrechte bei Dritten liegen könnten. 
x 
x 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
a. 
Die Planenden dürfen keine Zeichnungselemente verwenden, die Design-, Marken- oder Patentrechte Dritter verletzen. 
x 
x 
b. 
Die Planenden haben die Datenschutzbestimmungen zu beachten, die für Private gelten, wie 
auch jene, die für die Stadt Zürich gelten. 
x 
x 
 
6.2 
Virenfreiheit 
Basisrichtlinie: 
AR 
HT 
1. 
Die zu liefernden Daten müssen mit einem aktuellen Virenscanner geprüft werden, bevor sie versendet werden. 
x 
x 
Angaben des Auftraggebers / der Auftraggeberin:

## S. 17

CAD-Basisrichtlinie 
 
 
Interessengemeinschaft CADexchange 
Richtlinie-CAD-4.0-2008.doc 
Erstellungsdatum: 08.01.2008 
Version Basisrichtlinie: 2.0 – 2007 mit HT 
 
Version CAD-Richtlinie: 4.0 
 
 
Autor Basisrichtlinie: Christoph Merz 
Seite 17/17 
Autor: Hans Schlotterbeck 
 
 
 
 
 
 
 
 
 
7 
Hilfsmittel 
7.1 
Anhang 
Basisrichtlinie: 
AR 
HT 
Anhang 1: 
CAD-Test für den Datenaustausch 
x 
x 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
a. 
Als Testplan ist ein repräsentativer Projektplan (Grundriss) zu verwenden (kein Anhang). 
x 
x 
 
7.2 
Vorlagezeichnungen 
Basisrichtlinie: 
AR 
HT 
Keine Angaben 
x 
x 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
1. 
Sämtliche Vorlagezeichnungen (Musterpläne) zu dieser Richtlinie sind unter folgender Internet-
Adresse zu beziehen: 
http://www.stadt-zuerich.ch/internet/hbd/home/beraten/fachstellen/cad_planarchiv.html 
x 
x 
 
7.3 
Support 
Basisrichtlinie: 
AR 
HT 
1. 
Bei Fragen und Anregungen zur CAD-Richtlinie wenden Sie sich bitte an den CAD-
Verantwortlichen / die CAD-Verantwortliche. 
x 
x 
Angaben des Auftraggebers / der Auftraggeberin: 
 
 
2. 
Bei Fragen zum CAD-Testdatenaustausch (Plausibilitätstest) und zur CAD-Archivierung wenden 
Sie sich bitte an das CAD-Planarchiv AHB. 
x 
x
