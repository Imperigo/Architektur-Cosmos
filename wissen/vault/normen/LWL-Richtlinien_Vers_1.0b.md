---
titel: "LWL-Richtlinien_Vers_1.0b"
quelle: "Normen-Bibliothek Andrin"
datei: "LWL-Richtlinien_Vers_1.0b.pdf"
seiten: 34
ocr-seiten: 0
tags: [bauwissen, norm]
---

# LWL-Richtlinien_Vers_1.0b

## S. 1

Stadt Zürich
Organisation und Informatik (OIZ)
Immobilien-Bewirtschaftung (IMMO)
OIZ
Pfingstweidstr. 85
CH-8022 Zürich
IMMO
Amtshaus III, Lindenhofstr. 21
CH-8021 Zürich
LWL-Richtlinien
Richtlinien
 für Singlemode-Strecken
 im WAN-Bereich
Autoren:
Projektteam
LWL-Richtlinien
Version:
1.0
Dokumentdatum:
6. Juni 2007
Inkraftsetzung:
22. Juni 2007

## S. 2

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
2 / 34
Inhaltsverzeichnis
Herausgeber........................................................................................................................4
Revisionsgeschichte............................................................................................................4
Zusammenfassung............................................................................................................5
Projektteam..........................................................................................................................5
Verdankung .........................................................................................................................5
1
Einführung..............................................................................................................6
1.1
Zweck des Dokuments.............................................................................................6
1.2
Ziele .........................................................................................................................6
1.3
Inkraftsetzung...........................................................................................................6
2
Rahmenbedingungen ............................................................................................7
2.1
Grundlagen ..............................................................................................................7
2.2
Geltungsbereich.......................................................................................................7
2.3
Ausnahmen..............................................................................................................7
2.4
Abgrenzung..............................................................................................................7
2.5
Zuständigkeit............................................................................................................7
2.6
Nutzung von LWL-Strecken .....................................................................................7
2.7
Stand der Technik....................................................................................................8
2.7.1
Passive Komponenten..................................................................................8
2.7.2
Aktive Komponenten ....................................................................................8
3
Elemente und Struktur...........................................................................................9
3.1
Grundelemente ........................................................................................................9
3.2
Weitere Elemente.....................................................................................................9
3.3
Typen von LWL-Strecken.......................................................................................10
3.4
Netzstruktur............................................................................................................11
3.5
Systemgrenze ........................................................................................................11
3.6
Dimensionierung ....................................................................................................12
3.7
Patch- und Anschlusskabel....................................................................................12
3.8
Fasertyp .................................................................................................................12
4
Anforderungen an LWL-Komponenten..............................................................13
4.1
LWL-Fasern ...........................................................................................................13
4.2
LWL-Kabel .............................................................................................................13
4.3
LWL-Strecken ........................................................................................................14
4.3.1
Generelle Anforderung ...............................................................................14
4.3.2
Dämpfung...................................................................................................14
4.3.3
Dispersion...................................................................................................14
4.3.4
Unterstützte Aktivtechnologien...................................................................15
4.4
LWL-Stecksystem ..................................................................................................15
4.5
LWL-Kabelendverteiler (KEV)................................................................................15
4.6
LWL-Patchkabel.....................................................................................................15
4.7
Spleissverbindungen..............................................................................................15

## S. 3

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
3 / 34
5
Ausführung der Installation ................................................................................16
6
Beschriftung.........................................................................................................17
6.1
Beschriftung generell .............................................................................................17
6.2
Tool ........................................................................................................................17
6.3
Prinzip ....................................................................................................................17
7
Messtechnik..........................................................................................................19
7.1
Abnahmekontrolle ..................................................................................................19
7.2
LWL-Messungen....................................................................................................19
7.2.1
Kalibrierung ................................................................................................19
7.2.2
Rückstreumessung (OTDR) .......................................................................19
7.2.3
Weitere Messungen....................................................................................20
8
Dokumentation.....................................................................................................21
8.1
Anlagedokumentation ............................................................................................21
8.2
Dokumentation der Messergebnisse......................................................................21
Anhang .............................................................................................................................22
Anhang A: Technische Grundlagen...............................................................................23
A.1 
LWL-Fasern ...........................................................................................................23
A.1.1 Wahl des Fasertyps....................................................................................23
A.1.2 Farbcodes...................................................................................................23
A.2 
Aktivtechnologien: Übersicht Ethernet ...................................................................24
A.3 
Aktivtechnologien: Gigabit Ethernet.......................................................................25
A.4 
Aktivtechnologien: 10 Gigabit Ethernet..................................................................26
A.5 
Aktivtechnologien: 100 Gigabit Ethernet................................................................27
Anhang B: Referenzen ....................................................................................................28
B.1 
Allgemeine Referenzen..........................................................................................28
B.2 
Normen ..................................................................................................................29
Anhang C: Abnahmeprotokoll........................................................................................30
Anhang D: Abkürzungen und Fachbegriffe ..................................................................34

## S. 4

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
4 / 34
© 2007 Stadt Zürich, IMMO / OIZ.
Alle Rechte vorbehalten. Ohne schriftliche Genehmigung der Urheber ist es nicht gestattet,
die Richtlinien oder Teile daraus mit Hilfe irgendeines Verfahrens zu kopieren, zu vervielfältigen oder in Maschinensprache zu übertragen.
 Herausgeber
OIZ
Pfingstweidstr. 85
Postfach
CH-8022 Zürich
Telefon
044 279 91 11
Fax
044 272 56 64
Web
www.stadt-zuerich.ch/oiz
IMMO
Amtshaus III
Lindenhofstr. 21
Postfach
CH-8021 Zürich
Telefon
044 412 11 11
Fax
044 412 21 53
Web
www.stadt-zuerich.ch/immo
Anregungen sind zu richten an immo-zueri@zuerich.ch mit dem Vermerk LWL-Richtlinien.
Revisionsgeschichte
Tabelle 1 gibt eine Übersicht über die verschiedenen Ausgaben dieses Dokuments:
Version
Datum
Änderungen
1.0
6. Juni 2007
Erste Ausgabe dieser Richtlinien.
Tabelle 1: Ausgaben dieses Dokuments.

## S. 5

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
5 / 34
Zusammenfassung
Dieses Dokument enthält Richtlinien für die Planung und Ausführung von Singlemode-Glasfaserverbindungen im WAN-Bereich.
Mit diesen Richtlinien soll erreicht werden, dass LWL-Verbindungen im WAN-Bereich
• kostenoptimiert erstellt und betrieben werden.
• die Anforderungen bezüglich Funktion, Qualität und Dokumentation erfüllen.
• eine Nutzungsdauer von mindestens 15 Jahren haben.
• internationalen Normen entsprechen.
Die zentralen Anforderungen dieser Richtlinien sind:
• Es werden Singlemodefasern gemäss ITU-T Rec. G.652.D eingesetzt.
• Die Dämpfung von LWL-Strecken muss geringer als die Planungsdämpfung sein.
• Es wird das Stecksystem E-2000 APC mit 8 Grad Schrägschliff eingesetzt.
• Die Ausführung der LWL-Installation soll gemäss LWL-Handbuch des ewz [1] erfolgen.
• An jeder Strecke wird eine zweiseitige OTDR-Messung bei 1310 nm und 1550 nm
durchgeführt.
Projektteam
Diese Richtlinien wurden von folgendem Projektteam erarbeitet:
• Urs Hänseler, OIZ (Projektleiter).....................................urs.haenseler@zuerich.ch
• Andreas Kalasch, OIZ.....................................................andreas.kalasch@zuerich.ch
• Ulrich Torgler, IMMO.......................................................ulrich.torgler@zuerich.ch
• Martin Saner, SNT ..........................................................martin.saner@snt.ch
Im erweiterten Projektteam haben mitgearbeitet:
• Reto Aus der Au, IMMO..................................................reto.ausderau@zuerich.ch
• Felix Uttinger, OIZ...........................................................felix.uttinger@zuerich.ch
Verdankung
Das Projektteam dankt Herrn Alex Gretener, ewz, und seinem Team für die zahlreichen
Unterlagen im LWL-Handbuch [1], welches für dieses Projekt zur Verfügung gestellt wurde.

## S. 6

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
6 / 34
1 
Einführung
1.1 
Zweck des Dokuments
Dieses Dokument enthält Richtlinien für die Planung und Ausführung von Glasfaserstrecken
im WAN-Bereich. Diese werden für standortübergreifende Netzwerkverbindungen genutzt.
Das Dokument richtet sich an
• Projektleiter von Organisation und Informatik Zürich (OIZ)
• Projektleiter der Immobilien-Bewirtschaftung (IMMO)
• Projektleiter des Amts für Hochbauten (AHB)
• Planer und Ingenieure, welche Glasfaserstrecken im Auftrag der Stadt Zürich projektieren
und ausschreiben.
• Unternehmer, welche Glasfaserstrecken im Auftrag der Stadt Zürich neu erstellen,
umlegen oder reparieren.
• Anbieter und Nutzer von Dark-Fiber-Verbindungen.
Das Dokument soll in der Praxis einfach anwendbar sein. Es soll Bestandteil von
Ausschreibungen sein können. Sinngemäss soll es auch bei der Miete von Dark-Fiber-
Verbindungen zur Anwendung kommen.
Im Gegensatz zum LWL-Handbuch des ewz [1] gehen diese Richtlinien weniger stark ins
Detail, sondern konzentrieren sich auf die zentralen Anforderungen.
1.2 
Ziele
Mit diesen Richtlinien sollen folgende Ziele erreicht werden:
Die LWL-Verbindungen im WAN-Bereich
• können kostenoptimiert erstellt und betrieben werden.
• erfüllen die funktionalen Anforderungen.
• erfüllen die Anforderungen an Qualität und Dokumentation.
• haben eine Nutzungsdauer von mindestens 15 Jahren.
• entsprechen internationalen Normen.
• sind einheitlich ausgeführt und weisen eine geringe Produktevielfalt auf.
1.3 
Aktualisierung
Dieses Dokument wird ca. alle 3-4 Jahre aktualisiert.

## S. 7

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
7 / 34
2 
Rahmenbedingungen
Dieses Kapitel hält die massgebenden Rahmenbedingungen für diese Richtlinien fest.
2.1 
Grundlagen
Diese Richtlinien beruhen auf folgenden Grundlagen:
• LWL-Handbuch ewz [1]
• Richtlinien Kommunikationsverkabelung [2]
• Richtlinien Kommunikationsverkabelung für Schulgebäude [3]
• Richtlinien für Kommunikationsräume [4].
2.2 
Geltungsbereich
Diese Richtlinien gelten für alle LWL-Verbindungen, die von der Stadt Zürich erstellt oder
genutzt werden.
2.3 
Ausnahmen
Ausnahmen von diesen Richtlinien sind nur mit Zustimmung der Abteilung Operations Telekommunikation (HA-O/T) der OIZ zulässig.
2.4 
Abgrenzung
Diese Richtlinien beschreiben ausschliesslich standortübergreifende LWL-Strecken, also
Strecken im WAN-Bereich. LWL-Verbindungen auf Arealen oder innerhalb von Gebäuden
werden in den UKV-Richtlinien [2] und [3] beschrieben.
Diese Richtlinien beschreiben ausschliesslich fest installierte, passive Komponenten. LWL-
Verstärker (EDFA, Raman Amplifier) sollen nicht Teil der festen Installation sein und werden
daher nicht behandelt.
2.5 
Zuständigkeit
Bei der Planung und Realisierung von LWL-Verbindungen arbeiten die zuständigen Projektleiter von AHB, IMMO und OIZ eng zusammen.
2.6 
Nutzung von LWL-Strecken
Angesichts der angestrebten Lebensdauer (vgl. Abschnitt 1.2, S. 6) sollen die LWL-Strecken
für eine möglichst universelle Nutzung geplant und realisiert werden.
Aktuell (2007) stehen folgende Nutzungsarten im Vordergrund:
• Gigabit Ethernet als Standardnutzung
• 10 Gigabit Ethernet (erste operative Verbindungen)
• 2-Mbit/s-Verbindungen für ISDN-Primäranschlüsse
• CWDM-Verbindungen mit Gigabit Ethernet
(CWDM: Coarse Wavelength Division Multiplexing)

## S. 8

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
8 / 34
Absehbar sind folgende künftigen Nutzungsarten:
• 10 Gigabit Ethernet als Standardnutzung
• evtl. 40-Gbit/s-Verbindungen
• 100 Gigabit Ethernet
• DWDM-Verbindungen.
2.7 
Stand der Technik
2.7.1 Passive Komponenten
Fasern: Aktuelle Singlemodefasern zeichnen sich durch folgende Eigenschaften aus:
• Kein Wasser-Peak, dadurch nutzbar in einem grossen Wellenlängenbereich von 1310 nm
bis 1625 nm
• Dispersions-Parameter werden immer wichtiger bei hohen Datenraten:
 
Chromatic Dispersion (CD)
 
Polarization Mode Dispersion (PMD).
Stecksysteme: Die heute eingesetzten Systeme sind auf einem hohen Stand (geringe
Dämpfung, hoher Return Loss). Sie werden kontinuierlich weiterentwickelt. In den letzten
Jahren waren aber – im Gegensatz zu den Fasern – keine markanten Verbesserungen zu
verzeichnen.
2.7.2 Aktive Komponenten
Aktivkomponenten in der Datenkommunikation haben heute fast ausnahmslos Ethernet-
Schnittstellen. Ethernet umfasst viele Technologievarianten, aktuell mit Datenraten von
10 Mbit/s bis 10 Gbit/s.
Im WAN-Bereich haben vor allem folgende Varianten eine Bedeutung:
• Gigabit Ethernet gemäss 1000Base-LX (vgl. Anhang, S. 25)
• 10 Gigabit Ethernet gemäss 10GBase-LR und 10GBase-ER (vgl. Anhang, S. 26).
Inzwischen hat der IEEE bereits mit der Standardisierung von 100 Gigabit Ethernet
begonnen und eine Higher Speed Study Group (HSSG) gegründet (vgl. Anhang, S. 27).
Der künftige Standard – geplant für das Jahr 2010 – soll primär auf Glasfasern als Übertragungsmedium beruhen.

## S. 9

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
9 / 34
3 
Elemente und Struktur
Dieses Kapitel beschreibt stark vereinfacht Elemente und Struktur einer LWL-Verkabelung.
3.1 
Grundelemente
Abbildung 1 zeigt die Grundelemente einer LWL-Verkabelung:
• Faserstrecke: das einfachste Element, eine einfache Faser von A nach B. Sie endet auf
beiden Seiten auf einem Mittelstück.
• LWL-Verbindung: eine Gruppe von mehreren Faserstrecken von A nach B.
Faserstrecke A-B
LWL-Verbindung A-B
A
B
Faser
Mittelstück
Stecker
n Faserstrecken
A
B
Abbildung 1: Grundelemente einer LWL-Verkabelung.
3.2 
Weitere Elemente
Wie Abbildung 2 zeigt, werden folgende Elemente unterschieden:
• LWL-Verteiler: Der Endpunkt einer LWL-Verbindung, er besteht aus einem oder
mehreren Verteilerschränken (Racks).
Ein Spezialfall ist ein LWL-Verteiler, zu dem nur eine LWL-Verbindung führt. Er wird als
LWL-Anschlusskasten bezeichnet.
• LWL-Rack: Ein LWL-Rack ist ein 19-Zoll-Schrank.
• Kabelendverteiler (KEV): Ein optisches Patchpanel (19-Zoll-Element) in einem Verteilerschrank mit einer bestimmten Anzahl LWL-Mittelstücke, auf denen die Fasern enden.
• LWL-Faser: eine einzelne Faser, die Teil eines Kabels ist.
• LWL-Kabel: Ein optisches Kabel mit einer bestimmten Anzahl Fasern. Die Teilstücke
eines Kabels zwischen Schächten werden als Kabel-Abschnitte bezeichnet.
• Schacht: Ein abgeschlossener Hohlraum im Boden, in dem sich eine Muffe oder eine
LWL-Kabelschleife befindet.
• Muffe: enthält Spleisskassetten bei Verzweigungen.

## S. 10

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
10 / 34
LWL-Verteiler
LWL-Kabel
Schacht
Schacht
Muffe
LWL-Mittelstück
LWL-Kabel
LWL-Anschlusskasten
LWL-Verteiler
Kabelendverteiler
LWL-Kabel
LWL-Faser
LWL-Rack
LWL-Rack
LWL-Rack
Detailansicht
Kabelendverteiler (KEV)
LWL-Rack
LWL-Rack
Abbildung 2: Funktionale Elemente.
3.3 
Typen von LWL-Strecken
Wie Abbildung 3 zeigt, werden folgende 2 Fälle unterschieden:
• LWL-Strecke ohne Abzweigung
Sie bildet eine LWL-Verbindung, die Verbindung A-B mit n Fasern.
• LWL-Strecke mit Abzweigung
Sie bildet 3 LWL-Verbindungen: die LWL-Verbindung A-B (n-k Fasern),
die LWL-Verbindung A-C (k Fasern) und die LWL-Verbindung B-C (k Fasern).
a) LWL-Strecke ohne Abzweigung
n Fasern
n Fasern
LWL-Verteiler A
b) LWL-Strecke mit Abzweigung
n Fasern
n Fasern
k Fasern
k Fasern
n-k Fasern
n = 144...216 (typ.)
n = 144...216 (typ.)
k = 12, 24, 36 ... (typ.)
LWL-Kabel
Muffe
LWL-Kabel
LWL-Kabel
LWL-Verteiler B
LWL-Verteiler A
LWL-Verteiler B
LWL-Verteiler C
Abbildung 3: Die 2 Arten von LWL-Strecken.

## S. 11

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
11 / 34
3.4 
Netzstruktur
Abbildung 4 zeigt – stark vereinfacht – die Struktur des LWL-Netzes. Sie lässt sich wie folgt
charakterisieren:
• Sie besteht aus LWL-Verteilern und LWL-Verbindungen.
• Zu jedem LWL-Verteiler führt mindestens eine LWL-Verbindung.
• Grössere LWL-Verteiler sind vermascht, d. h. sie sind an mindestens 2 LWL-Verbindungen angeschlossen.
• LWL-Anschlusskästen werden sternförmig erschlossen, d. h. sie sind nur an eine LWL-
Verbindung angeschlossen.
A
B
C
nAB
nAC
D
E
nBC
nBD
nBE
F
nCF
nCG
G
LWL-Verteiler
LWL-Anschlusskasten
LWL-Verbindung
mit n Fasern
n
1
2
3
4
5
6
7
Abbildung 4: Struktur des LWL-Netzes.
Wie Tabelle 2 zeigt, lässt sich diese Struktur für betriebliche Belange abbilden auf eine
Tabelle von LWL-Verbindungen. Jede LWL-Verbindung ist definiert durch ihre 2 Endpunkte
und die Anzahl Fasern dazwischen.
LWL-Verbindung
Endpunkt 1
Endpunkt 2
Anzahl Fasern
1
A
B
nAB
2
A
C
nAC
3
B
C
nBC
4
B
D
nBD
5
B
E
nBE
6
C
F
nCF
7
C
G
nCG
Tabelle 2: Darstellung des LWL-Netzes in Tabellenform.
3.5 
Systemgrenze
Jede Faserstrecke endet beidseitig auf dem Stecksystem (Mittelstück) im Kabelendverteiler.

## S. 12

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
12 / 34
3.6 
Dimensionierung
Die genaue Dimensionierung von LWL-Verbindungen wird im Rahmen der Detailplanung
eines konkreten Projekts festgelegt. Dabei gilt:
• Zwischen LWL-Verteilern werden in der Regel LWL-Kabel mit 144 Fasern verlegt.
• Zu LWL-Anschlusskästen werden in der Regel LWL-Kabel mit 12 Fasern verlegt.
• Für Abzweigungen werden in der Regel LWL-Kabel mit 24 Fasern eingesetzt (12 Fasern
hin, 12 Fasern zurück).
3.7 
Patch- und Anschlusskabel
Für Patch- und Anschlusskabel gilt:
Patchkabel: Sie dienen dazu, 2 Faserstrecken passiv zusammenzukoppeln. Sie gehören
daher ebenfalls zur LWL-Verkabelung. Ihre Eigenschaften werden in Abschnitt 4.7 (S. 15)
spezifiziert.
Anschlusskabel: Sie dienen dazu, eine Faserstrecke mit dem Eingangsport einer Aktivkomponente zu verbinden. Oft sind sie mit unterschiedlichen Stecksystemen an den beiden
Enden versehen (Hybridkabel). Sie gehören zur entsprechenden Aktivkomponente, nicht zur
LWL-Verkabelung.
Faserstrecke
Faserstrecke
Patchkabel
Anschlusskabel
Aktivkomponente
LWL-Verkabelung
LWL-Verkabelung
Aktivkomponente
Systemgrenze
Abbildung 5: Patch- und Anschlusskabel.
3.8 
Fasertyp
Im Rahmen dieser Richtlinien wird davon ausgegangen, dass alle Faserstrecken aus Fasern
des gleichen Typs (vgl. Abschnitt 4.1, S. 13) bestehen.
Fasern zur Dispersionskompensation (DCF = Dispersion Compensating Fiber) sollen nicht
Teil der festen Installation sein.

## S. 13

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
13 / 34
4 
Anforderungen an LWL-Komponenten
Dieses Kapitel enthält Anforderungen an die LWL-Komponenten, also insbesondere an
Fasern, Kabel und Stecksysteme. Es werden ausschliesslich Singlemode-Komponenten
spezifiziert.
4.1 
LWL-Fasern
Die LWL-Fasern müssen folgende Anforderungen erfüllen:
• Die Spezifikationen von Abschnitt 9.4 der Norm ISO/IEC 11801 [17] sollen eingehalten
werden.
• Es sollen Singlemodefasern vom Typ G.652.D gemäss [8] eingesetzt werden.
(Die Norm G.652 verweist auf IEC 60793-2-50 [11].)
• Die Fasereigenschaften müssen durch ein Prüfzertifikat nachgewiesen werden.
4.2 
LWL-Kabel
Die LWL-Kabel müssen folgende Anforderungen erfüllen:
• Die Anforderungen von Abschnitt 9.4 von ISO/IEC 11801:2002 [17] sollen eingehalten
werden.
• Kabelaufbau gemäss IEC 60794-2 [12] (Indoor) bzw. IEC 60794-3 [13] (Outdoor).
• Brandverhalten: halogenfrei gemäss IEC 60754-2 [10],
flammwidrig gemäss IEC 60332 [9], geringe Rauchdichte gemäss IEC 61034 [14].
• Metallfreie Konstruktion
• PE-Aussenmantel mit Zugentlastung
• Nagetierschutz
• geeignet für den vorgesehenen Verwendungszweck: Der Auftraggeber informiert den
Unternehmer über die zu erwartenden Umweltbedingungen. Der Unternehmer bietet ein
LWL-Kabel an, dass unter diesen Bedingungen die vorgesehene Lebensdauer erreicht.
• querwasserdicht oder Dampfsperre, längswasserdicht
• Gel darf nicht auslaufen
• Querdruckfestigkeit > 150 N/cm
• Biegeradius bei Verlegung < 50 cm
• Minimale Verlegetemperatur 0 °C
• Temperaturbereich Betrieb -20 °C bis 60 °C
• Farbcode für Fasern und Bündeladern: gemäss [1], vgl. Anhang S. 23;
(Grund: Kompatibilität zum LWL-Netz des ewz)
• Zugfestigkeit: geeignet für geplante Verlegungsart, mindestens 2500 N.
• Die Kabeleigenschaften sollen durch ein Zertifikat nachgewiesen werden.

## S. 14

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
14 / 34
4.3 
LWL-Strecken
Diese Anforderungen gelten für sämtliche Faserstrecken der LWL-Verkabelung.
4.3.1 Generelle Anforderung
Die LWL-Strecken müssen die Anforderungen von Kapitel 8, Performance of Optical Fibre
Cabling, von ISO/IEC 11801 [17] erfüllen.
4.3.2 Dämpfung
Die Dämpfung muss kleiner sein als die Planungsdämpfung A. Diese ist gegeben durch (vgl.
Anhang I.1 von G.652 [8]):
A = αL + αs x + αc y
dabei sind:
A
Planungsdämpfung [dB]
α
Dämpfungsbelag der Faser [dB/km]
L
Länge der Faserstrecke [km]
αs
Mittelwert der Spleissdämpfung [dB]
x
Anzahl Spleissverbindungen
αc
Mittelwert der Steckerdämpfung [dB]
y
Anzahl Steckverbindungen
Begründung: Die Planungsdämpfung wird ermittelt, damit schlechte Spleissungen oder
unzulässig enge Biegeradien entdeckt werden.
Beispiel: Singlemode-Faserstrecke (vgl. Abbildung 1, S. 9) bei 1310 nm, Strecke von 10 km
Länge, an jedem Ende ein Stecker angespleisst, sonst keine Spleissverbindungen.
Faserdämpfung (G.652.D) < 0,4 dB/km, Spleissdämpfung < 0,1 dB,
Steckerdämpfung < 0,4 dB:
Æ die Planungsdämpfung beträgt:
A = 4 dB + 0,2 dB + 0,8 dB = 5 dB
4.3.3 Dispersion
Die Anforderungen bezüglich Dispersion ergeben sich aus der geplanten Nutzung der LWL-
Strecke. Das heisst
• Chromatic Dispersion (CD)
• Polarization Mode Dispersion (PMD)
müssen so gering sein, dass die Nutzungsarten gemäss Abschnitt 4.4 (S. 15) möglich sind.
Insbesondere müssen Gigabit Ethernet und 10 Gigabit Ethernet unterstützt werden.
Bei der Nutzung von Dark-Fiber-Strecken werden die Anforderungen bezüglich Dispersion
projektspezifisch festgelegt.

## S. 15

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
15 / 34
4.4 
Unterstützte Aktivtechnologien
Sämtliche LWL-Strecken müssen folgende Übertragungstechnologien unterstützen:
• 
Gigabit Ethernet
 1000Base-LX: mindestens 5 km
 1000Base-ZX: mindestens 50 km
(proprietäre Technologie, für spezielle Anwendungsfälle)
• 10 Gigabit Ethernet
 10GBASE-LR: mindestens 10 km
 10GBASE-ER: mindestens 40 km
• 100 Gigabit Ethernet
Die Unterstützung von 100 Gigabit Ethernet wird angestrebt. Sobald ein Standard vorliegt,
wird er in diese Anforderungsliste aufgenommen.
4.5 
LWL-Stecksystem
Das LWL-Stecksystem soll folgende Anforderungen erfüllen:
• E-2000-Stecksystem mit 8 Grad Schrägschliff (APC: Angled Physical Contact)
gemäss IEC 61754-15 [15] (Type LSH)
bzw. CECC 86 275-802 [16] (LSH-HRL)
• Einfügedämpfung: ≤ 0,4 dB
• Return Loss: ≥ 70 dB
• Repetibilität: besser als ± 0,2 dB
• Farbe: grün
4.6 
LWL-Kabelendverteiler (KEV)
Die Kabelendverteiler sollen folgende Anforderungen erfüllen:
• Konstruktion: 19-Zoll-Einschub, Höhe = 1 HE
• Packungsdichte von 24 Mittelstücken pro Höheneinheit
• ausziehbare Ausführung (erlaubt den Zugang zur Spleisskassette im Betrieb)
4.7 
LWL-Patchkabel
Für Patchkabel gelten folgende Anforderungen:
• Fasertyp: wie fest installierte Fasern gemäss Abschnitt 4.1 (S. 13).
• Stecksystem: wie fest installiertes Stecksystem gemäss Abschnitt 4.5.
• Farbe: gelb
4.8 
Spleissverbindungen
Die maximal zulässige Dämpfung von geschweissten Spleissverbindungen beträgt 0,1 dB.
Mechanische Spleissverbindungen werden nicht eingesetzt.

## S. 16

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
16 / 34
5 
Ausführung der Installation
Die praktische Ausführung der Installation soll gemäss LWL-Handbuch des ewz [1] erfolgen.
Es ist jeweils die aktuelle Ausgabe zu verwenden.
Tabelle 3 zeigt eine Zusammenstellung wichtiger Themenbereiche.
Beschrieb
Dok-Nummer
Kapitel
Netzaufbau
00001-03-2002
4
Patchung am FMDF
00003-05-2002
3
Netzbau, Faserzahl
00005-03-2003
4
Wann VK oder FMDF?
00006-01-2003
4
Montage der Etiketten
00007-03-2003
3
Abdichtung der Hauseinführung
00008-06-2003
4
Kabelabnahme im Werk
00009-06-2003
2
Prozess Kabelabnahme
00010-06-2003
2
Schlaufenlänge
00011-08-2003
4
Bilddokumentation Schacht und Muffe
00012-10-2003
4
Anleitung zur Beschriftung der KTN-Kabel
00015-02-2004
4
Anleitung zur Kabelaufnahme im Schacht
00016-02-2004
4
Anleitung zu Spleissarbeiten in Schacht
00017-03-2004
3
IL-Messung (IL: Insertion Loss)
00019-09-2004
1
Grundregeln für Spleissarbeiten
00020-09-2004
1
PMD- und CD-Messung
00021-09-2004
1
Messberichte
00022-09-2004
1
Grundwerte Glasfaser
00023-09-2004
1
Fasercode und Kabelaufbau
00024-10-2004
1
Grundlagen KBZ
00025-11-2004
3
Kabelvorbereitung im FMDF
00027-12-2004
3
Spleissbox für FMDF
00028-12-2004
3
Kabelführung Rack FMDF
00029-12-2004
3
Belegung FMDF-Schrank
00030-12-2004
3
Brechen von Fasern im Loop
00031-02-2005
1
Stecker und Assemblies
00033-05-2005
2
Montage Aluplatte mit KTN-Nr. an Rack/ Wandkasten
00034-05-2005
4
Auflegen des LWL-Kabel in TS auf Kabelhalter
00035-05-2005
4
Montage Wandverteiler
00036-06-2005
4
Aufteilung der LWL-Fasern in Muffe
00037-06-2005
4
Fotodokumentationen
00038-07.2005
4
Muffenaufbau Fist-Muffe für 216 und 144 Fasern
00039-10-2005
3
Messprinzip, Richtlinien, Werte
00041-01-2006
1
Bearbeitung vom Kabelloop
00043-08-2006
3
Tabelle 3: Wichtige Themenbereiche im LWL-Handbuch [1].

## S. 17

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
17 / 34
6 
Beschriftung
6.1 
Beschriftung generell
Alle Elemente der LWL-Verkabelung werden dauerhaft beschriftet. Es sind dies:
• LWL-Racks
• Kabelendverteiler (KEV) im Rack
• LWL-Mittelstücke im KEV
• LWL-Kabel
• die einzelnen Fasern in einem Kabel (Unterscheidung durch Farbcode, Beschriftung nur
bei Spleissungen)
• LWL-Muffen
• LWL-Schächte
Die Beschriftungen werden vor Beginn der Ausführung vom Auftraggeber festgelegt bzw.
genehmigt. Sämtliche Messungen und die gesamte Dokumentation sollen auf den definitiven
Beschriftungen beruhen.
6.2 
Tool
Alle Bezeichnungen werden in der Applikation NeDocS Light (vgl. [7]) erfasst. Daher müssen
sämtliche Beschriftungen kompatibel zu dieser Applikation sein.
6.3 
Prinzip
Tabelle 4 und Abbildung 6 (S. 18) zeigen das Prinzip.
Element
Prinzip
Beispiele
LWL-Rack
Alle LWL-Racks werden global
durchnummeriert.
R-1001, R-1002, ...
Kabelendverteiler
(KEV)
Die Kabelendverteiler werden pro
Rack durchnummeriert.
KEV-01, KEV-02, ... (von oben nach unten)
Mittelstücke
Die Mittelstücke werden pro KEV
durchnummeriert.
1, 2, ... 24 (von links nach rechts)
LWL-Kabel
Alle LWL-Kabel werden global
durchnummeriert.
Besteht ein Kabel aus mehreren
Kabel-Abschnitten, werden die
Abschnitte des Kabels zusätzlich
durchnummeriert.
LWL-Kabel: K-1001, K-1002, ...
Kabel-Abschnitte: K-1001:1, K-1001:2, ...
Faser
Die Fasern in einem LWL-Kabel
werden pro Kabel durchnummeriert.
1, 2, ... 144 oder
1, 2, ... 216
LWL-Schacht
Alle LWL-Schächte werden global
durchnummeriert.
SCH-1001, SCH-1002, ...
LWL-Muffe
Alle Muffen werden global
durchnummeriert.
M-1001, M-1002, ...
Tabelle 4: Beschriftungsprinzip.

## S. 18

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
18 / 34
Erläuterungen:
• LWL-Racks, LWL-Kabel, LWL-Schächte und Muffen werden global durchnummeriert.
Durch die Applikation NeDocS light wird dabei sichergestellt, dass jede Bezeichnung nur
einmal vergeben wird.
Besteht ein LWL-Kabel aus mehreren Kabel-Abschnitten, so werden die Abschnitte des
Kabels zusätzlich durchnummeriert.
• Für die globale Nummerierung werden 4stellige Nummern verwendet. Die tiefste Nummer
ist jeweils die Zahl 1001.
• Die Kabelendverteiler werden pro Rack durchnummeriert. Ein bestimmter KEV ist somit
eindeutig definiert durch die Angabe von Rack-ID und KEV-ID.
• Die Mittelstücke – die Anschlusspunkte an die LWL-Verkabelung – werden pro KEV
durchnummeriert. Ein bestimmtes Mittelstück – und damit das Ende einer Faserstrecke –
ist somit eindeutig definiert durch die Angabe von Rack-ID, KEV-ID und Mittelstück-ID.
LWL-Rack
R-1001
R-1003
K-2001
R-1002
SCH-1001
SCH-1002
LWL-Kabel
Schacht
Schacht
Muffe
R-1004
Kabelendverteiler
KEV-01
KEV-02
KEV-03
KEV-04
LWL-Rack
LWL-Kabel
KEV-01
KEV-02
KEV-03
KEV-04
K-2001
M-7002
K-2007:1
K-2007:1
K-2007:2
K-2007:3
1
24
Abbildung 6: Beschriftungsprinzip.

## S. 19

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
19 / 34
7 
Messtechnik
Die messtechnische Überprüfung hat im Anschluss an die Installation sicherzustellen, dass
sämtliche LWL-Strecken den Anforderungen entsprechen.
7.1 
Abnahmekontrolle
Die Abnahme erfolgt gemäss dem Abnahmeprotokoll in Anhang C (S. 30).
7.2 
LWL-Messungen
7.2.1 Kalibrierung
Die für die Messung verwendeten Geräte müssen gemäss Herstellervorgaben, mindestens
aber alle 2 Jahre, kalibriert werden. Die letzte Kalibrierung ist durch ein entsprechendes
Protokoll nachzuweisen. Dieses ist Teil der Dokumentation.
7.2.2 Rückstreumessung (OTDR)
Eine OTDR-Messung (Rückstreumessung) ist für alle LWL-Verbindungen dieser Richtlinien
durchzuführen. Sie soll bei folgenden Wellenlängen erfolgen:
• 1310 nm
• 1550 nm
• 1625 nm (nach Bedarf)
Dabei sollen folgende Parameter bestimmt werden:
• Der Dämpfungsverlauf entlang der Fasern
• die Spleissdämpfungen
• die Steckerdämpfungen
• die Gesamtdämpfung
• die Länge der Fasern (rechnerisch, es ist der Brechungsindex gemäss Angabe des
Faserherstellers einzugeben)
Wie Abbildung 7 zeigt, müssen die Messungen mit einer Vorspann- und einer Nachspann-
Faser von je mindestens 1 km Länge durchgeführt werden.
Die Fasern sind immer von beiden Enden aus zu vermessen. Dabei bleiben Vor- und
Nachspann an Ort, lediglich das OTDR wird ans andere Ende angeschlossen. Für die
Dämpfungen ist jeweils der Mittelwert aus beiden Messungen anzugeben.
Folgende Werte sind zu ermitteln:
• Die Summe der Dämpfungswerte für Faser und Steckerübergänge von A nach B
(Gesamtdämpfung)
• Die Summe der Dämpfungswerte für Faser und Steckerübergänge von B nach A
(Gesamtdämpfung)
• Der Mittelwert beider Messungen.

## S. 20

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
20 / 34
Die Messwerte (Dämpfung, Dämpfungsverlauf, Kabellänge usw.) und die für die Messung
spezifischen Parameter (Typ des Messgeräts, Kalibrierprotokoll, korrekte Faserbezeichnung,
Brechungsindex der Fasern usw.) sind in Protokollen festzuhalten.
Vor-/Nachspann 1
zu prüfende Faserstrecke
1. Messung
A
B
OTDR
2. Messung
A
B
OTDR
zu prüfende Faserstrecke
Vor-/Nachspann 2
Vor-/Nachspann 1
Vor-/Nachspann 2
bleibt an Ort
bleibt an Ort
Abbildung 7:
LWL-Messungen mit einem OTDR.
7.2.3 Weitere Messungen
Die Parameter
• Chromatic Dispersion (CD)
• Polarization Mode Dispersion (PMD)
werden nur bei Bedarf gemessen.

## S. 21

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
21 / 34
8 
Dokumentation
Die Dokumentation soll sicherstellen, dass die relevante Information über die LWL-
Verkabelung (eingesetzte Komponenten, optische Eigenschaften) während der gesamten
Lebensdauer zur Verfügung steht.
Damit soll zu jedem Zeitpunkt klar ersichtlich sein, ob eine bestimmte LWL-Verbindung eine
Aktivtechnologie unterstützt oder nicht.
8.1 
Anlagedokumentation
Zur Anlagedokumentation einer LWL-Verkabelung gehören folgende Dokumente:
• Kurzbeschreibung (1 Seite)
• Prinzipschema
• Verteiler-Layout (Anzahl und Lage der Kabelendverteiler)
• Liste der eingesetzten Komponenten (Fasern, Kabel, Stecksysteme) mit genauer
Bezeichnung von Typ und Hersteller
• Datenblätter der eingesetzten Komponenten
• Dokumentation der Messungen gemäss Abschnitt 7.2 (ab S. 19).
Die Anlagedokumentation ist in 3facher Ausführung auf Papier (Ordner) und in elektronischer
Form auf CD oder DVD zu erstellen. Sie ist bei der Abnahme dem Auftraggeber zu übergeben.
8.2 
Dokumentation der Messergebnisse
Die Messergebnisse sind wie folgt zu dokumentieren:
• Messbedingungen: Typ des Messgeräts, Kalibrierprotokoll, Messanordnung,
Umgebungsbedingungen, Brechungsindex der Fasern usw.)
• Zusammenfassung der Messungen: Eine Liste aller gemessenen Strecken (1 Zeile pro
Strecke) mit der korrekten Faserbezeichnung, der Länge und einer Zusammenfassung
des Messresultats.
• Detailresultate: In elektronischer Form abzugeben sind die detaillierten Messprotokolle
aller Strecken. Das Messprotokoll muss alle Angaben zur Identifikation der Strecke
enthalten sowie die detaillierten Messresultate. Der verwendete Brechungsindex ist in
jedem Messprotokoll aufzuführen.
Sämtliche Unterlagen sind in elektronischer Form abzugeben. Zusätzlich soll die
Zusammenfassung der Messungen auch auf Papier abgegeben werden.
* * *

## S. 22

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
22 / 34
Anhang
Anhang A: Technische Grundlagen
Anhang B: Referenzen
Anhang C: Abnahmeprotokoll
Anhang D: Abkürzungen und Fachbegriffe

## S. 23

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
23 / 34
Anhang A: Technische Grundlagen
Dieser Anhang enthält Begründungen wichtiger Entscheide und allgemeine technische
Grundlagen.
A.1 
LWL-Fasern
A.1.1 Wahl des Fasertyps
Der Fasertyp G.652.D wurde aus folgenden Gründen gewählt:
• Der Typ G.652 (ohne D) wird auch in ISO/IEC 11801 [17] empfohlen.
• Der Typ G.652 wird auch in [2] spezifiziert.
• Der Typ G.652 unterstützt Gigabit Ethernet (1310 nm) und 10 Gigabit Ethernet (1310 nm
und 1550 nm).
• Der Typ G.652.D öffnet das Fenster für WDM-Anwendungen im Wellenlängenbereich von
1310 nm bis 1625 nm.
• Nur der Typ G.652.D hat keinen Wasser-Peak und eine reduzierte PMD.
A.1.2 Farbcodes
Abbildung 8 zeigt die geforderten Farbcodes für Bündeladern und Fasern in einem
LWL-Kabel.
Bündel 1
Rot
Bündel 2
Grün
alle anderen
Weiss
Blindbündel
Schwarz
1
rot
7
orange
2
grün
8
schwarz
3
gelb
9
grau
4
blau
10
braun
5
weiss
11
pink
6
violett
12
türkis
Bündeladercode
Fasercode ( Analog zu Swisscom )
Abbildung 8: Farbcodes (Quelle: [1]).

## S. 24

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
24 / 34
A.2 
Aktivtechnologien: Übersicht Ethernet
Tabelle 5 zeigt eine Übersicht über die verschiedenen Technologievarianten von Ethernet.
Datenrate
Varianten
10BASE-
10 Mbit/s: Klassisches Ethernet
• 10Base-T: Twisted Pair, Klasse C / Kat. 3
100BASE-
100 Mbit/s: Fast Ethernet
• 100Base-TX: Twisted Pair, Klasse D (1995) / Kat. 5
• 100Base-FX: Glasfasern
1000BASE-
1 Gbit/s: Gigabit Ethernet
• 1000Base-LX: Long Wavelength Laser (1310 nm)
• 1000Base-SX: Short Wavelength Laser (850 nm)
• 1000Base-T: Twisted Pair, Klasse D (2002) / Kat. 5
10GBASE-
10 Gbit/s: 10 Gigabit Ethernet
• 10GBase-SR, -LR, -ER, -LX4: Glasfasern
• 10GBase-CX4: Twinax-Kabel, nur 15 m
• 10GBase-T: Twisted Pair
100GBASE-
100 Gbit/s: 100 Gigabit Ethernet (geplant)
• 10 km über Singlemode
• 40 km über Singlemode
• 100 m über Multimode
Tabelle 5: Technologievarianten von Ethernet.

## S. 25

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
25 / 34
A.3 
Aktivtechnologien: Gigabit Ethernet
Abbildung 9 zeigt Gigabit Ethernet in der Übersicht. Im WAN ist vor allem die Variante
1000BASE-LX (ohne CSMA/CD) von Bedeutung.
Wie Tabelle 6 zeigt, beträgt die Maximaldistanz für 1000BASE-LX über Singlemodefasern
gemäss IEEE-Standard 5 km.
Datenrate:
1 Gbit/s
Verkabelung:
Glasfasern: Multimode (MMF), Monomode (SMF)
symmetrisches Kupferkabel, 100 Ohm, Kat. 5
Regeln:
bei CSMA/CD: nur 1 Repeater
bei Switching: Maximaldistanzen abhängig vom Medium
Besonderes:
bei CSMA/CD max. Netzwerkdurchmesser 200 m
CSMA/CD
Switching
100 m
LX: 550-5000 m
SX: 220-550 m
T: 100 m
CX: 25 m
Abbildung 9: Gigabit Ethernet in der Übersicht.
Bezeichnung
Wellenlänge
Medium
Distanz
1000Base-SX
850 nm
MMF 62,5 (160 MHz ⋅ km)
MMF 62,5 (200 MHz ⋅ km)
MMF 50 (400 MHz ⋅ km)
MMF 50 (500 MHz ⋅ km)
2-220 m
2-275 m
2-500 m
2-550 m
1000Base-LX
1300 nm
MMF 62,5 (500 MHz ⋅ km)
MMF 50 (400 MHz ⋅ km)
MMF 50 (500 MHz ⋅ km)
SMF (1310 nm)
2-550 m
2-550 m
2-550 m
2-5000 m
1000Base-CX
-
Twinaxial-Kabel
25 m
1000Base-T
-
Twisted Pair, Klasse D
100 m
Tabelle 6: 
Technologievarianten und Distanzen von Gigabit Ethernet;
(Quelle: IEEE 802.3 [18], Table 38-11 für 1000Base-SX und -LX);
MMF: Multimode Fiber,
SMF: Singlemode Fiber.

## S. 26

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
26 / 34
A.4 
Aktivtechnologien: 10 Gigabit Ethernet
Abbildung 10 zeigt die optischen Varianten von 10 Gigabit Ethernet in der Übersicht.
Wie Tabelle 7 zeigt, beträgt die Maximaldistanz gemäss IEEE-Standard 10 km für die
Variante 10GBASE-LR (1310 nm) und 40 km für 10GBASE-ER (1550 nm).
Standard:
IEEE 802.3ae (2002)
Datenrate:
10 Gbit/s bzw. 9.58464 Gbit/s (SONET OC 192c)
Verkabelung:
nur Glasfasern: Multimode (MMF) oder Monomode (SMF)
Eigenschaften:
- nur Switching, kein CSMA/CD
- nicht nur LAN-, sondern auch WAN-Technologie
- max. 300 m über Multimode, max. 40 km über Singlemode
- immer Full Duplex
Switching
bis 300 m (MMF)
bis 10 km (SMF)
bis 40 km (SMF)
LAN, Campus
MAN, WAN
Abbildung 10: Optische Varianten von 10 Gigabit Ethernet in der Übersicht.
Bezeichnung
Wellenlänge
Medium
Distanz
10GBase-SR
10GBase-SW
850 nm
MMF 62,5 (160 MHz ⋅ km)
MMF 62,5 (200 MHz ⋅ km)
MMF 50 (400 MHz ⋅ km)
MMF 50 (500 MHz ⋅ km)
MMF 50 (2‘000 MHz ⋅ km)
2-26 m
2-33 m
2-66 m
2-82 m
2-300 m
10GBase-LR
10GBase-LW
1310 nm
SMF
2 m - 10 km
10GBase-ER
10GBase-EW
1550 nm
SMF
2 m - 30 km
2 m - 40 kma
10GBase-LX4
10GBase-LW4
WWDM:
1275-1349 nm
MMF 62,5 (500 MHz ⋅ km)
MMF 50 (400 MHz ⋅ km)
MMF 50 (500 MHz ⋅ km)
SMF
2-300 m
2-240 m
2-300 m
2 m - 10 km
10GBase-CX4
-
Twinaxial-Kabel
15 m
10GBase-T
-
Twisted Pair, Klasse EA
100 m
a) falls die Maximaldämpfung nicht überschritten wird.
Tabelle 7: 
Technologievarianten und Distanzen von 10 Gigabit Ethernet;
Quelle: IEEE 802.3 [18], Table 52-6 für 10GBase-S, Table 52-14 für 10GBase-L, Table 52-15 für
10GBase-E und Table 53-13 für 10GBase-LX4/LW4.

## S. 27

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
27 / 34
Tabelle 8 zeigt schliesslich die verschiedenen Physical Coding Sublayers (PCS) und die
Physical Layers (PHY) der optischen Varianten von 10 Gigabit Ethernet.
Im WAN-Bereich sind vor allem die Varianten 10GBASE-L und 10GBASE-E (ohne SDH-
Mapping) von Bedeutung.
PCS / PHY
Möglichkeiten
3 Physical Coding
Sublayers (PCS)
• 10GBASE-X: 8b/10b, 8 Bit Æ 10 Bit
• 10GBASE-R: 64b/66b, 64 Bit Æ 66 Bit
• 10GBASE-W: 64b/66b, Mapping in SDH-Container
4 Physical Layers
(PHY)
• 10GBASE-S: Short Wavelength, 850 nm, Serial, nur MMF
• 10GBASE-L4: Long Wavelength / 4W-WDM, 1300 nm, MMF / SMF
• 10GBASE-L: Long Wavelength, 1310 nm, Serial
• 10GBASE-E: Extra Long Wavelength, 1550 nm, Serial
Tabelle 8: PCS- und PHY-Layer von 10 Gigabit Ethernet.
A.5 
Aktivtechnologien: 100 Gigabit Ethernet
Die Standardisierung für 100 Gigabit Ethernet ist immer noch in einer sehr frühen Phase
(Study Group).
Abbildung 11 zeigt den aktuellen Stand der sogenannten Objectives (Ziele) für 100 Gigabit
Ethernet. Der Fokus liegt ganz klar auf optischer Übertragung.
Abbildung 11: Objectives für 100 Gigabit Ethernet (Quelle: [6]).

## S. 28

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
28 / 34
Anhang B: Referenzen
In diesem Anhang sind die wichtigsten Dokumente aufgeführt, auf die in den vorliegenden
Richtlinien Bezug genommen wird.
B.1 
Allgemeine Referenzen
[1] 
ewz: LWL-Handbuch
Spezifikationen für die Verarbeitung von Lichtwellenleiterkabeln und der passiven
Komponenten, Ausgabe vom 16. Juni 2005,
Alex Gretener, Roman Dürr, Stephan Senn, Abt. MTF, ewz.
[2] 
Richtlinien für Kommunikationsverkabelung
Herausgeber: IMMO / OIZ.
http://www.stadtzuerich.ch/internet/hbd/home/beraten/fachstellen/energie_gebaeudetechnik.Paragraph
ContainerList.ParagraphContainer1.ParagraphList.0019.File.pdf/IMMO_RL_Verwaltung
_V3.pdf
[3] 
Richtlinien Kommunikationsverkabelung für Schulgebäude
Herausgeber: IMMO / OIZ.
http://www.stadtzuerich.ch/internet/hbd/home/beraten/fachstellen/energie_gebaeudetechnik.Paragraph
ContainerList.ParagraphContainer1.ParagraphList.0018.File.pdf/immooiz_ri_schule_v2_0End.pdf
[4] 
Richtlinien für Kommunikationsräume
Herausgeber: IMMO / OIZ.
http://www.stadtzuerich.ch/internet/hbd/home/beraten/fachstellen/energie_gebaeudetechnik.Paragraph
ContainerList.ParagraphContainer1.ParagraphList.0011.File.pdf/RL_Verteiler_E5.pdf
[5] 
Higher Speed Study Group (HSSG)
Public Website: www.ieee802.org/3/hssg
[6] 
Higher Speed Study Group
Agenda and General Information, Orlando, Florida, March 2007.
[7] 
NeDocS
Komplettbeschreibung, Stand Nov. 2005.
http://www.binsoft.de/Produkte/NeDocS.zip

## S. 29

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
29 / 34
B.2 
Normen
[8] 
ITU-T Rec. G.652 (06/2005)
Characteristics of a single-mode optical fibre and cable.
[9] 
IEC 60332
Tests on electric and optical fibre cables under fire conditions.
[10] IEC 60754-2
Test on gases evolved during combustion of electric cables - Part 2: Determination of
degree of acidity of gases evolved during the combustion of materials taken from
electric cables by measuring pH and conductivity.
[11] IEC 60793-2-50
Optical fibres - Part 2-50: Product specifications -
Sectional specification for class B single-mode fibres.
[12] IEC 60794-2
Optical fibre cables - Part 2: Indoor cables - Sectional specification.
[13] IEC 60794-3
Optical fibre cables - Part 3: Outdoor cables - Sectional specification.
[14] IEC 61034
Measurement of smoke density of cables burning under defined conditions.
[15] IEC 61754-15 (1999-09)
Fibre optic connector interfaces - Part 15: Type LSH connector family.
[16] CECC 86 275-802:1999
CLC/TC 86BXA Detail Specification: Connector sets of assessed quality for optical
fibres and cables - Type LSH-HRL universal.
[17] ISO/IEC 11801:2002
Information Technology – Generic Cabling for Customer Premises.
[18] IEEE 802.3-2005
Part 3: Carrier Sense Multiple Access with Collision Detection (CSMA/CD)
Access Method and Physical Layer Specifications.

## S. 30

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
30 / 34
Anhang C: Abnahmeprotokoll
Abnahmeprotokoll: LWL-Infrastruktur
Auftraggeber:
________________________
Objekt: ___________________
Bauvorhaben (BAV): __________________________
Bereich: __________________
Unternehmer: ________________________________
Offerte vom: _______________
Elektroingenieur / Planer: _______________________
Nutzer: ___________________
 Teilabnahme Nr. _____ 
 Schlussabnahme
 Keine Mängel, Arbeit gilt als abgenommen
 unwesentliche Mängel, Arbeit gilt als abgenommen
 nicht abgenommen
 Datum neuer Abnahme: ______________________
 2. Abnahme: Mängel behoben, Arbeit gilt als abgenommen,
Datum / Visum: ______________
Bemerkungen
1. 
Die LWL-Infrastruktur wurde am Abnahmeort betriebsbereit übergeben und von der
IMMO/OIZ ordnungsgemäss auf ihre Beschaffenheit und der Kongruenz mit den
geltenden LWL-Richtlinien geprüft.
2. 
Aufgrund dieser Prüfung bestätigt die IMMO/OIZ die Abnahme der LWL-Infrastruktur.
3. 
Sind nach der Prüfung der LWL-Infrastruktur Vorbehalte anzubringen, werden diese in
der Mängelliste (Beilage zum Abnahmeprotokoll) vollständig aufgeführt.
4. 
Der Unternehmer ist verpflichtet, die Vorbehalte der Mängelliste in der vereinbarten
Zeit zu beheben. Die Behebung der Mängel ist durch folgende Person
_______________________________________________________________________
an nachfolgende Stelle zu melden:
_______________________________________________________________________

## S. 31

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
31 / 34
Checkliste für Abnahme
&
'
gemäss
19“ Verteiler
Schrankmontage


Abschnitt 4.4, RL-UKV (*)
Beschriftung Verteiler


Kapitel 6, RL-LWL (*)
230-V-Anschluss


Abschnitt 4.4.11, RL-UKV
Beschriftung 230-V-Sicherung


Abschnitt 4.4.11, RL-UKV
Anschluss Potentialausgleich


Kapitel 6, RL-UKV
Kabelbeschriftung UKV / LWL


Kapitel 6, RL-LWL
Panelbeschriftung UKV / LWL


Kapitel 6, RL-LWL
Kabelführung i. O.


Racks sauber


UKV + LWL-
Verkabelung:
Anschlussstellen fachgerecht


Beschriftung UKV- / LWL-Dosen


Kapitel 6, RL-LWL
Kabelführung i. O.


Trasseebelegung i. O.


Spezifische
Telefonieinstall.: Montage Verteiler VS83


Abschnitt 4.4.8, RL-UKV
Patchkabel


Abschnitt 4.4.10, RL-UKV
230-V-Anschluss TVA


Abschnitt 4.4.11, RL-UKV
Anschlüsse / Aufschaltung


Abschnitt 5.1.2, RL-UKV
Kabelbeschriftung


Abschnitt 8.2, RL-UKV
Verteilerbeschriftung


Abschnitt 8.5, RL-UKV
Messungen:
LWL-Kabel Multimode (Protokoll schriftlich)


Abschnitt 9.2, RL-UKV
LWL-Kabel Singlemode (Protokoll schriftl.)


Kapitel 7, RL-LWL
UKV-Kabel (Protokoll schriftlich + CD)


Abschnitt 9.3, RL-UKV
Dokumente:
Verkabelungsprinzip Passivnetzwerk


Kapitel 8, RL-LWL
Schrankbelegungen (El. Ing.)


Abschnitt 9.5, RL-UKV
LWL-Kabel Multimode Dokumentation


Abschnitt 9.5, RL-UKV
LWL-Kabel Singlemode Dokumentation


Kapitel 8, RL-LWL
Dokumentation vollständig vorhanden


Kapitel 8, RL-LWL
Zertifikat UKV-Systemgarantie


Abschnitt 7.1, RL-UKV
Dokumentationen Telefonie-Installationen


Abschnitt 9.5, RL-UKV
Bemerkungen:
(*) Abkürzungen:
RL-UKV: Richtlinien für Kommunikationsverkabelung [2].
 
RL-LWL: LWL-Richtlinien (dieses Dokument).

## S. 32

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
32 / 34
Sonstige Mängel
Bemerkungen:
Zuständig
Termin
Mängel behoben
Datum:
Unterschrift: Unternehmer
Mängel behoben
Datum:
Unterschrift:  IMMO /  OIZ

## S. 33

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
33 / 34
Unterschriften-Dokument
1
Elektroingenieur / Planer: ________________
Ort, Datum:
________________
Name: _______________
Unterschrift: _______________
2
Unternehmer: ________________
Starkstrominstallationen
Ort, Datum: ________________
Name: _______________
Unterschrift: _______________
3
Unternehmer: ________________
Schwachstrominstallation
Ort, Datum: ________________
Name: _______________
Unterschrift: _______________
4
OIZ
Telekommunikation
Ort, Datum: ________________
Name: _______________
Unterschrift: _______________
5
IMMO
Telekommunikation
Ort, Datum: ________________
Name: _______________
Unterschrift: _______________
6
AHB
Ort, Datum: ________________
Name: _______________
Unterschrift: _______________

## S. 34

Stadt Zürich
Organisation und Informatik
Immobilien-Bewirtschaftung
LWL-Richtlinien
OIZ
IMMO
lwl-richtlinien_vers_1.0b.doc
34 / 34
Anhang D: Abkürzungen und Fachbegriffe
AHB
Amt für Hochbauten der Stadt Zürich
APC
Angled Physical Contact: Schrägschliff
ARV
Arealverteiler
CD
Chromatic Dispersion (auch: Compact Disc)
CECC
CENELEC Electronic Components Committee
CENELEC
Comité Européen de Normalisation Electrique
CWDM
Coarse Wavelength Division Multiplexing
DGD
Differential Group Delay
DWDM
Dense Wavelength Division Multiplexing
EDFA
Erbium-doped Fiber Amplifier
EDV
Elektronische Datenverarbeitung
EV
Etagenverteiler
GV
Gebäudeverteiler
HBD
Hochbaudepartement der Stadt Zürich
HE
Höheneinheit in einem 19-Zoll-Schrank
HKV
Handbuch für Kommunikationsverkabelung
HRLC
High Return Loss Connector
IEC
International Electrotechnical Commission
IEEE
Institute of Electrical and Electronics Engineers
IL 
Insertion Loss
IMMO
Stadt Zürich – Immobilien-Bewirtschaftung
ISO
International Organization for Standardization
ITU
International Telecommunication Union (früher CCITT)
IT
Informationstechnologie
JTC1
(ISO/IEC) Joint Technical Committee 1
KS
Kommunikationssteckdose
LSOH
Low Smoke Zero Halogen
LWL
Lichtwellenleiter
MMF
Multimode Fiber
OIZ
Stadt Zürich – Organisation und Informatik
OTDR
Optical Time Domain Reflectometer
PMD
Polarization Mode Dispersion
RL 
Return Loss (Rückflussdämpfung)
SMF
Singlemode Fiber
UKV
Universelle Kommunikationsverkabelung
WDM
Wavelength Division Multiplexing
* * *
