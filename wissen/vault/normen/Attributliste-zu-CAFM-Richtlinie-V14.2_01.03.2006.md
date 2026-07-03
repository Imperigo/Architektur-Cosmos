---
titel: "Attributliste zu CAFM Richtlinie V14.2_01.03.2006"
quelle: "Normen-Bibliothek Andrin"
datei: "Attributliste zu CAFM Richtlinie V14.2_01.03.2006.pdf"
seiten: 5
ocr-seiten: 0
tags: [bauwissen, norm]
---

# Attributliste zu CAFM Richtlinie V14.2_01.03.2006

## S. 1

Attributliste zu CAFM-Richtlinie IMMO
Legende: Alphanumerisch = Datenbank
Legende Register (Spalt C):
Erfassung durch MOVE = Aufnahme, Vermassung; X* = nur soweit erkennbar/erfassbar -> wo nicht möglich frei lassen
Graphisch = CAFM / CAD
A
Nutzer / Kunde
SA
SAP-Daten
Daten System = automatisch generiert oder berechnet
Muss = Feld muss ausgefüllt werden, sonst kein abspeichern möglich
FR
Flächen / Belegung
R
Reinigung / Ausbau
Daten von IMMO = diese Daten kommen von der IMMO und können z.B. aus Excel ins CAFM importiert werden
Typ = Datentyp: B=berechnet, K=Klasse, Z=Zahl, L=Logisch J/N, D=Datum, V=Verknüpfung, ohne Angabe=Text)
K
Kontakte
T
Technik / Energie
Über Schnittstelle = Schnittstelle und System dahinter geben Terminplan vor
Editieren = Feld kann editiert werden (z.B. Berechnete Felder: Nein)
S
Stammdaten
F
Flächen
IMMO später = Daten können noch nicht eingepflegt werden; Felder aber schon vorsehen
Historisierung = dieses Datenfeld muss automatisch historisiert werden
S1
Stammdaten: Seite 1+2
** = im Datenobjekt "Arbeitsplatz" enthalten!!
Ordn. Nr.
Datenobjekt
Reg.
Nr. 
Attr.
Attribut
Beschreibung
Alpha.
Graph.
Muss
Typ
edit.
Hist.
CAFM
SAP
GIS
BUS2000
Erf. d. 
MOVE
Daten 
System
Daten v.
IMMO
Import
Schn.st.
IMMO
später
Erfassung 
gefordert
Datenfeld 
vorgesehen
neue Datenfelder
zus. Erf.
d. Move
gelöschte Datenfelder
letzte Mutation 
am
durchgeführt von
betrifft Spalte
alter Eintrag
neuer Eintrag
1 01 Welt
Welt
Hierarchische Stufe zur Navigation
X
X
Ja
X
X
X
X
2 02 Land
Land
Pop-up: Schweiz, Deutschland, Österreich, Italien, Frankreich; H
X
X
Ja
X
X
X
X
3 03 Region / Kanton
Region / Kanton
Pop-up: Aargau, Appenzell Innerrhoden, Appenzell 
Ausserrhoden, Bern, Basel-Land, Basel-Stadt, Freiburg, Genf, 
Glarus, Graubünden, Jura, Luzern, Neuenburg, Nidwalden, 
Obwalden, St. Gallen, Schaffhausen, Schwyz, Solothurn, 
Tessin, Thurgau, Uri, Waadt, Wallis, Zug, Zürich; Hierarchische 
Stufe zur Navigation
X
Ja
X
X
X
X
4 04 Gemeinde
Gemeinde
Alle in der Standortliste aufgezählten Gemeinden / Katalog 
X
(X)
X
Ja
X
(X)
X
X
X
5 05 Stadtkreis
Stadtkreis
Übernommen von Quelle "Stadtkreis" bei Gebäude IMMO; 
Hierarchische Stufe zur Navigation
X
X
B
Nein
X
X
X
X
6 05.5 Quartier
Quartier
7 06 Vermessungsbezirk
Vermessungsbezirk
Übernommen von Quelle "Vermessungsbezirk" bei Gebäude 
IMMO; Hierarchische Stufe zur Navigation
X
X
B
X
X
X
X
8 07 Standort
Standort
Entität/Klasse, Situationsplan
X
X
nein
X
X
X
X
9 07 Standort
Standort-ID
Eineindeutige System-ID; Vergabe automatisch
X
X
Z
nein
X
X
X
X
X
10 07 Standort
Standort-Nr
"S1234" aus der Standortliste
X
X
nein
X
X
X
X
X
30.10.2006
BAB
K
Ja
nein
11 07 Standort
Standort-Name
z.B. "Kollerhof" aus der Standortliste
X
X
Ja
X
X
X
X
X
12 07 Standort
Standort-Adresse
Adresse des Hauptgebäudes am Standort
X
Ja
X
X
X
X
X
13 07 Standort
Standort-Kennzeichen
setzt sich zusammen aus Standort-Nr und Standort-Name, z.B. 
X
X
B
Ja
X
X
X
X
X
14 07 Standort
gültig ab
Datum
X
D
Ja
X
X
X
X
15 07 Standort
gültig bis
Datum
X
D
Ja
X
X
X
X
16 07 Standort
letzte Änderung
automatisch
X
X
D
Ja
X
X
X
X
X
17 07 Standort
Änderung durch
automatisch
X
X
Ja
X
X
X
X
X
18 07 Standort
Bemerkungen
Freitext
X
Ja
X
X
X
X
19 07 Standort
Schulkreis
zB: Glattal, Schwamendingen, Uto, …..
X
Ja
X
X
X
X
20 07 Standort
Stadtkreis
Übernommen von Quelle "Stadtkreis" bei Gebäude IMMO
X
B
Ja
X
X
X
X
21 07 Standort
Vermessungsbezirk
Übernommen von Quelle "Vermessungsbezirk" bei Gebäude 
X
B
Ja
X
X
X
X
Neu: 21.1
07 Standort
BBA Gebäude
m2; Bodenbedeckungsart im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
alle
(nichts)
neues Attribut
Neu: 21.2
07 Standort
BBA befestigt
m2; Bodenbedeckungsart im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
alle
(nichts)
neues Attribut
Neu: 21.3
07 Standort
BBA humusiert
m2; Bodenbedeckungsart im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
alle
(nichts)
neues Attribut
Neu: 21.4
07 Standort
BBA Gewässer
m2; Bodenbedeckungsart im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
alle
(nichts)
neues Attribut
Neu: 21.5
07 Standort
BBA bestockt
m2; Bodenbedeckungsart im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
alle
(nichts)
neues Attribut
Neu: 21.6
07 Standort
BBA vegetationslos
m2; Bodenbedeckungsart im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
alle
(nichts)
neues Attribut
22 08 Parzelle
Parzelle
Entität/Klasse Parzelle
X
Ja
X
X
X
23 08 Parzelle
Parzellen-ID
Eineindeutige System-ID; Vergabe automatisch, nicht sichtbar
X
X
Z
Ja
X
X
X
X
24 08 Parzelle
Parzellen-Nr
"OE1234", 1-4 Ziffern
X
X
nein
X
X
X
X
30.10.2006
BAB
K
Ja
nein
25 08 Parzelle
Kataster-Nr
"12345", variable Anzahl Ziffern - Vorlage !
X
X
Z
Ja
X
X
X
X
26 08 Parzelle
Quartier
X
Ja
X
X
X
27 08 Parzelle
Vermessungsbezirk
Übernommen von Quelle "Vermessungsbezirk" bei Gebäude 
X
X
B
Ja
X
X
X
X
28 08 Parzelle
Vermessungsbezirk Kzb
X
Ja
X
X
X
29 08 Parzelle
Grundstücksfläche GIS
m2
X
Z
X
X
GIS
X
X
30 08 Parzelle
BB Verwaltung
m2; Bodenbedeckungen im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
E / K
Ja / BB 1-6 Gebäude GIS
nichts / BB Verwaltung
31 08 Parzelle
BB Wohngebäude
m2; Bodenbedeckungen im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
E / K
Ja / BB 7 Nebengebäude GIS
nichts / BB Wohngebäude
32 08 Parzelle
BB Land-Forstwirtschaft-Gärtnerei
m2; Bodenbedeckungen im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
E / K
Ja / BB 8 Strasse Weg GIS
nichts / BB Land-Forstwirtschaft-Gärtnerei
33 08 Parzelle
BB Verkehr
m2; Bodenbedeckungen im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
E / K
Ja / BB 9 Veloweg, Fussweg GIS
nichts / BB Verkehr
34 08 Parzelle
BB Handel
m2; Bodenbedeckungen im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
E / K
Ja / BB 12 Trottoir GIS
nichts / BB Handel
35 08 Parzelle
BB Industrie-Gewerbe
m2; Bodenbedeckungen im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
E / K
Ja / BB 16 Wasserbecken GIS
nichts / BB Industrie-Gewerbe
36 08 Parzelle
BB Gastgewerbe
m2; Bodenbedeckungen im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
E / K
Ja / BB 17 Parkplatz GIS
nichts / BB Gastgewerbe
37 08 Parzelle
BB Nebengebäude
m2; Bodenbedeckungen im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
E / K
Ja / BB 18 Hausumschwung befestigt GIS
nichts / BB Nebengebäude
38 08 Parzelle
BB Strasse (Fahrbahn)
m2; Bodenbedeckungen im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
E / K
Ja / BB 19 Sportanlage befestigt GIS
nichts / BB Strasse (Fahrbahn)
39 08 Parzelle
BB Veloweg-Fussweg
m2; Bodenbedeckungen im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
E / K
Ja / BB 20 Befestigte Fläche (übrige) GIS
nichts / BB Veloweg-Fussweg
40 08 Parzelle
BB Landwirtschaftsstrasse
m2; Bodenbedeckungen im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
E / K
Ja / BB 24 Gartenanlage Hausumschwung GIS
nichts / BB Landwirtschaftsstrasse
41 08 Parzelle
BB Waldstrasse
m2; Bodenbedeckungen im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
E / K
Ja / BB 25 Parkanlage GIS
nichts / BB Waldstrasse
42 08 Parzelle
BB Trottoir
m2; Bodenbedeckungen im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
E / K
Ja / BB 26 Sportanalge humusiert GIS
nichts / BB Trottoir
43 08 Parzelle
BB Verkehrsinsel
m2; Bodenbedeckungen im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
E / K
Ja / BB 27 Friedhof GIS
nichts / BB Verkehrsinsel
44 08 Parzelle
BB Bahn (Bahnareal)
m2; Bodenbedeckungen im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
E / K
Ja / BB 32 See, Weiler GIS
nichts / BB Bahn (Bahnareal)
45 08 Parzelle
BB Wasserbecken
m2; Bodenbedeckungen im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
E / K
Ja / BB 35 Wald GIS
nichts / BB Wasserbecken
46 08 Parzelle
BB Parkplatz
m2; Bodenbedeckungen im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
E / K
Ja / BB 39 Geröll, Sand GIS
nichts / BB Parkplatz
47 08 Parzelle
BB Hausumschwung
m2; Bodenbedeckungen im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
E / K
Ja / BB 42 Vegetationslose Fläche GIS
nichts / BB Hausumschwung
Neu: 47.1
08 Parzelle
BB Sportanlage (befestigt)
m2; Bodenbedeckungen im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
E / K
Ja / BB 17 Parkplatz GIS
nichts / BB Sportanlage (befestigt)
Neu: 47.2
08 Parzelle
BB andere-befestigte
m2; Bodenbedeckungen im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
E / K
Ja / BB 18 Hausumschwung befestigt GIS
nichts / BB andere-befestigte
Neu: 47.3
08 Parzelle
BB Gartenanlage
m2; Bodenbedeckungen im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
E / K
Ja / BB 19 Sportanlage befestigt GIS
nichts / BB Gartenanlage
Neu: 47.4
08 Parzelle
BB Parkanlage
m2; Bodenbedeckungen im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
E / K
Ja / BB 20 Befestigte Fläche (übrige) GIS
nichts / BB Parkanlage
Neu: 47.5
08 Parzelle
BB Sportanlage (humusiert)
m2; Bodenbedeckungen im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
E / K
Ja / BB 24 Gartenanlage Hausumschwung GIS
nichts / BB Sportanlage (humusiert)
Neu: 47.6
08 Parzelle
BB Friedhof
m2; Bodenbedeckungen im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
E / K
Ja / BB 25 Parkanlage GIS
nichts / BB Friedhof
Neu: 47.7
08 Parzelle
BB Gewässer (stehend)
m2; Bodenbedeckungen im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
E / K
Ja / BB 26 Sportanalge humusiert GIS
nichts / BB Gewässer (stehend)
Neu: 47.8
08 Parzelle
BB Gewässer (fliessend)
m2; Bodenbedeckungen im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
E / K
Ja / BB 27 Friedhof GIS
nichts / BB Gewässer (fliessend)
Neu: 47.9
08 Parzelle
BB geschlossener Wald
m2; Bodenbedeckungen im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
E / K
Ja / BB 32 See, Weiler GIS
nichts / BB geschlossener Wald
Neu: 47.10 08 Parzelle
BB vegetationslos
m2; Bodenbedeckungen im GIS
X
Z
X
X
GIS
X
X
01.09.2006
BAB
E / K
Ja / BB 35 Wald GIS
nichts / BB vegetationslos
48 08 Parzelle
gültig ab
Datum
X
D
Ja
X
X
X
X
49 08 Parzelle
gültig bis
Datum
X
D
Ja
X
X
X
X
50 08 Parzelle
letzte Änderung
automatisch
X
X
D
Ja
X
X
X
X
X
51 08 Parzelle
Änderung durch
automatisch
X
X
Ja
X
X
X
X
X
52 08 Parzelle
Bemerkungen
Freitext
X
Ja
X
X
X
X
53 08 Parzelle
Altlasten Beschrieb
Datenblatt anfügen
X
Ja
X
X
X
X
54 08 Parzelle
Altlasten vorhanden
Ja / Nein
X
Ja
X
X ?
X
X
X
55 08 Parzelle
Parkplätze aussen Summe
Anzahl, ganze Zahl
X
Z
Ja
X
X
X
X
56 09 Gebäude IMMO
Entität/Klasse Gebäude mit Polygon im 
Situationsplan
X
X
X
X
57 09 Gebäude IMMO
S
Gebäude-ID
Eineindeutige System-ID; Vergabe automatisch, nicht sichtbar
X
X
Z
Ja
X
X
X
X
58 09 Gebäude IMMO
SA
Mandant SAP
nicht sichtbar
X
Ja
X
X
SAP
X
X
59 09 Gebäude IMMO
SA
Buchungskreis SAP
nicht sichtbar
X
Ja
X
X
SAP
X
X
60 09 Gebäude IMMO
SA
WE-Nr SAP
z.B. "01234"
X
Z
Ja
X
X
X
X
61 09 Gebäude IMMO
A
Gebäude-Komplex
"Nein": Identisch mit Gebäude STZH = 1 EGID-Nr
X
X
Ja
X
X
GIS
X
X
X
02.11.2006
BAB
ATTRIBUT LÖSCHEN
62 09 Gebäude IMMO
A
Status
Werteliste: geplant, bewilligt, bestehend, im Umbau, 
X
Ja
X
X
SAP
X
X
63 09 Gebäude IMMO
SA
Update-Kz SAP
 
X
Ja
X
X
SAP
X
X
64 09 Gebäude IMMO
SA
Status SAP
SAP angelegt, aktiv, inaktiv, Löschvormerkung, gelöscht, neu 
X
Ja
X
X
SAP
X
X
65 09 Gebäude IMMO
S
Gebäude-Nr
z.B. "G01225"
X
X
nein
X
X
X
X
X
30.10.2006
BAB
K
Ja
nein
66 09 Gebäude IMMO
SA
Gebäude-Nr SAP
nur aktiv, falls Abgleich mit SAP, z.B. "01234/0/1001", erfolgt 
X
Ja
X
X
SAP
X
X
67 09 Gebäude IMMO
EGID-Nr. (Gebäude STZH)
Link zu Datenobjekt "Gebäude STZH"
X
V
nein
X
X
GIS
X
X
X
02.11.2006
BAB
E / F / J
EGID-Nr. / Beschreibung / Z
EGID-Nr. (STZH) / Beschreibung / V
68 09 Gebäude IMMO
Versicherungs-Nr. (Gebäude STZH)
Link zu Datenobjekt "Gebäude STZH"
X
V
nein
X
X
SAP
X
X
X
02.11.2006
BAB
E / F / J / K
 Versicherungs-Nr. / Beschreibung / (nichts) / Ja
Versicherungs-Nr. (STZH) / Besch. / V / nein
69 09 Gebäude IMMO
Vermögens-Art
FV, VV, Verm.Dritter
X
Ja
X
X
X
X
X
70 09 Gebäude IMMO
Quartier
Werteliste Quartiere in Zürich
X
Ja
X
X
X
X
X
71 09 Gebäude IMMO
SA
Grundstücks-Nr SAP
Parzellen- oder Katasternummern, auf dem das Gebäude steht
X
Ja
X
X
SAP
X
X
72 09 Gebäude IMMO
Kataster-Nr. (Gebäude STZH)
Link zu Datenobjekt "Gebäude STZH"
X
X
V
nein
X
X
X
X
X
02.11.2006
BAB
E / F / J / K
 Kataster-Nr. / Beschreibung / (nichts) / Ja
Kataster-Nr. (STZH) / Besch. / V / nein
73 09 Gebäude IMMO
S
Gebäude-Name
Freitext, z.B "Schulhaus Kügeliloo"
X
X
Ja
X
X
X
X
X
74 09 Gebäude IMMO
SA
Gebäude-Name SAP
 
X
Ja
X
X
SAP
X
X
75 09 Gebäude IMMO
A
Gebäude-Kennzeichen 
z.B "Maienstrasse 9-G01220-Schulhaus Kügeliloo"
X
X
B
Ja
X
X
X
X
X
76 09 Gebäude IMMO
SA
Gebäude-Art SAP
gemäss Katalog SAP
X
Ja
X
X
SAP
X
X
X
77 09 Gebäude IMMO
SA
Überwiegende Nutzungsart SAP
gemäss Katalog SAP
X
Ja
X
X
SAP
X
X
78 09 Gebäude IMMO
Gebäude-Kategorie
Codeliste gemäss GeoZ
X
Ja
X
X
X
79 09 Gebäude IMMO
Gebäude-Nutzung
Codeliste gemäss GeoZ
X
Ja
X
X
X
80 09 Gebäude IMMO
A
Baujahr
z.B. 1958
X
Z
Ja
ALBIS ?
X
X
X
81 09 Gebäude IMMO
A
Letztes Umbaujahr
z.B. 1995
X
Ja
ALBIS ?
X
X
X
82 09 Gebäude IMMO
SA
Abbruchjahr SAP
m3
X
Ja
X
X
SAP
X
X
83 09 Gebäude IMMO
SA
Versicherungswert SAP
Ganzzahl
X
Ja
X
X
SAP
X
X
84 09 Gebäude IMMO
A
Geschosse Anzahl
z.B. 8
X
X
B
Ja
X
(X)
X
X
X
85 09 Gebäude IMMO
FR
Räume Anzahl
z.B. 25, berechnet
X
X
B
nein
X
(X)
X
X
X
02.11.2006
BAB
K
Ja
nein
86 09 Gebäude IMMO
FR
Türen Anzahl
z.B. 35, berechnet
X
X
B
nein
X
(X)
X
X
X
02.11.2006
BAB
K
Ja
nein
87 09 Gebäude IMMO
FR
Parkplätze Summe
z.B. 46, berechnet, Anzahl Parkplätze Innen
X
X
B
nein
X
(X)
X
X
X
02.11.2006
BAB
K
Ja
nein
88 09 Gebäude IMMO
FR
GGF sia d0165
m2, Gebäudegrundfläche
X
X
B
nein
X
(X)
X
X
X
02.11.2006
BAB
K
Ja
nein
89 09 Gebäude IMMO
FR
GV berechnet
m3 (Gebäudevolumen)
X
X
B
Ja
X
(X)
X
X
X
20.06.2006
BAB
ATTRIBUT LÖSCHEN
90 09 Gebäude IMMO
FR
GV sia 416
m3 (Gebäudevolumen)
X
X
B
nein
X
(X)
X
X
X
20.06.2006
BAB
Beschreibung
m3 (Gebäudevolumen)
m3 (Gebäudevolumen inkl Konstruktionsfläche)
GV=GF (Geschossfläche) x Gebäudehöhe
90 09 Gebäude IMMO
FR
GV sia 416
m3 (Gebäudevolumen)
X
X
B
nein
X
(X)
X
X
X
02.11.2006
BAB
K
Ja
nein
90 09 Gebäude IMMO
FR
GV sia 416
m3 (Gebäudevolumen)
X
X
B
nein
X
(X)
X
X
X
02.11.2006
BAB
J
Z
B
91 09 Gebäude IMMO
FR
m3
m3 Realvolumen
X
X
B
nein
X
(X)
X
X
X
20.06.2006
BAB
Attribut
m3
GV Nettofläche
91 09 Gebäude IMMO
FR
m3
m3 Realvolumen
X
X
B
nein
X
(X)
X
X
X
Beschreibung
m3 Realvolumen
m3 (Raumvolumen exkl. Konstruktionsfläche)
GV=RF (Raumfläche) x Raumhöhe
91 09 Gebäude IMMO
FR
m3
m3 Realvolumen
X
X
B
nein
X
(X)
X
X
X
02.11.2006
BAB
K
Ja
nein
92 09 Gebäude IMMO
FR
GF berechnet
m2
X
X
B
nein
X
(X)
X
X
X
02.11.2006
BAB
K
Ja
nein
93 09 Gebäude IMMO
FR
GF sia d0165
m2
X
X
B
nein
X
(X)
X
X
X
02.11.2006
BAB
K
Ja
nein
94 09 Gebäude IMMO
FR
HNF Summe
m2 (Hauptnutzfläche)
X
X
B
nein
X
(X)
X
X
X
02.11.2006
BAB
K
Ja
nein
95 09 Gebäude IMMO
FR
HNF2.1 Summe
m2 (Hauptnutzfläche Büroräume), wird für die Berechnung von 
X
X
B
nein
X
(X)
X
X
X
02.11.2006
BAB
K
Ja
nein
96 09 Gebäude IMMO
FR
NF Summe
m2 (Nutzfläche)
X
X
B
nein
X
(X)
X
X
X
02.11.2006
BAB
K
Ja
nein
97 09 Gebäude IMMO
FR
FF Summe
m2 (Funktionsfläche)
X
X
B
nein
X
(X)
X
X
X
02.11.2006
BAB
K
Ja
nein
98 09 Gebäude IMMO
FR
VF Summe
m2 (Verkehrsfläche)
X
X
B
nein
X
(X)
X
X
X
02.11.2006
BAB
K
Ja
nein
99 09 Gebäude IMMO
FR
KF sia d0165
Konstruktionsfläche, berechnet
X
X
B
nein
X
(X)
X
X
X
02.11.2006
BAB
K
Ja
nein
Mutationen/Korrekturen
Zeitpunkt Submission
Differenzen
Datenart
System CAFM
System Lead
Datenquelle
Attributliste zu CAFM Richtlinie V14.2_01.12.2006.xls, 01.03.2007, RAP, Seite 1 von 5

## S. 2

Ordn. Nr.
Datenobjekt
Reg.
Nr. 
Attr.
Attribut
Beschreibung
Alpha.
Graph.
Muss
Typ
edit.
Hist.
CAFM
SAP
GIS
BUS2000
Erf. d. 
MOVE
Daten 
System
Daten v.
IMMO
Import
Schn.st.
IMMO
später
Erfassung 
gefordert
Datenfeld 
vorgesehen
neue Datenfelder
zus. Erf.
d. Move
gelöschte Datenfelder
letzte Mutation 
am
durchgeführt von
betrifft Spalte
alter Eintrag
neuer Eintrag
Mutationen/Korrekturen
Zeitpunkt Submission
Differenzen
Datenart
System CAFM
System Lead
Datenquelle
100 09 Gebäude IMMO
FR
AGF sia 416
Aussengeschossfläche sia 416
X
X
B
nein
X
(X)
X
X
X
02.11.2006
BAB
K
Ja
nein
101 09 Gebäude IMMO
FR
ANGF sia 416
Aussennettogeschossfläche sia 416
X
X
B
nein
X
(X)
X
X
X
02.11.2006
BAB
K
Ja
nein
102 09 Gebäude IMMO
FR
EBF Summe
m2, Energiebezugsfläche, gemäss sia d0165
X
X
B
nein
X
(X)
X
X
X
02.11.2006
BAB
K
Ja
nein
103 09 Gebäude IMMO
FR
Flächenquote
m2/Quoteneinheit, gemäss Standard IMMO abhängig von der 
X
X
Z
Ja
X
X
X
X
104 09 Gebäude IMMO
FR
APT berechnet
(Arbeitsplatz Theoretisch), 0 Nachkommastelle, gemäss 
X
X
B
nein
X
(X)
X
X
X
02.11.2006
BAB
K
Ja
nein
105 09 Gebäude IMMO
FR
APG Summe
(Arbeitsplatz Geplant), Ganzzahl
X
X
B
nein
X
X
X
X
27.09.2006
BAB
J
(nichts)
B
105 09 Gebäude IMMO
FR
APG Summe
(Arbeitsplatz Geplant), Ganzzahl
X
X
B
nein
X
X
X
X
02.11.2006
BAB
K
Ja
nein
106 09 Gebäude IMMO
FR
API Summe
(Arbeitsplatz Ist), 0 Nachkommastellen, berechnet aus 
X
X
B
nein
X
(X)
X
X
X
02.11.2006
BAB
K
Ja
nein
107 09 Gebäude IMMO
FR
Leerstand Summe
m2
X
X
B
nein
X
(X)
X
X
X
02.11.2006
BAB
K
Ja
nein
108 09 Gebäude IMMO
FR
Leerstand zu VMF165
%
X
X
B
nein
X
(X)
X
X
X
02.11.2006
BAB
K
Ja
nein
109 09 Gebäude IMMO
SA
Strasse 1 SAP
 
X
Ja
X
X
SAP
X
X
110 09 Gebäude IMMO
SA
Strasse 2 SAP
 
X
Ja
X
X
SAP
X
X
111 09 Gebäude IMMO
SA
PLZ SAP
 
X
Ja
X
X
SAP
X
X
112 09 Gebäude IMMO
SA
Ort SAP
 
X
Ja
X
X
SAP
X
X
113 09 Gebäude IMMO
SA
Land SAP
 
X
Ja
X
X
SAP
X
X
114 09 Gebäude IMMO
A
Lokalisations-ID
X
Ja
X
X
GIS
X
X
115 09 Gebäude IMMO
SA
Haus-Nr
 
X
X
Ja
X
X
SAP
X
X
116 09 Gebäude IMMO
A
Koordinaten
 
X
Ja
X
X
GIS
X
X
117 09 Gebäude IMMO
A
PLZ6
sechstellige Postleitzahl
X
Ja
X
X
GIS
X
X
118 09 Gebäude IMMO
A
Quelle
gemäss GeoZ, Codeliste
X
Ja
X
X
GIS
X
X
119 09 Gebäude IMMO
A
Beschreibung
Freitext
X
Ja
X
X
GIS
X
X
120 09 Gebäude IMMO
SA
gültig ab
Ja
X
X
X
121 09 Gebäude IMMO
SA
gültig ab SAP
 
X
Ja
X
X
SAP
X
X
122 09 Gebäude IMMO
SA
gültig bis
falls Gebäude noch nicht in SAP erfasst
X
Ja
X
X
X
X
123 09 Gebäude IMMO
SA
gültig bis SAP
 
X
Ja
X
X
SAP
X
X
124 09 Gebäude IMMO
S
letzte Änderung
automatisch
X
X
D
Ja
X
X
X
X
125 09 Gebäude IMMO
S
Änderung durch
automatisch
X
X
Ja
X
X
X
X
126 09 Gebäude IMMO
Bemerkungen
Ja
X
X
X
127 09 Gebäude IMMO
K
Ansprechperson Ausstattung
Name, Vorname, Tel, Mail
X
Ja
X
X
X
X
128 09 Gebäude IMMO
K
Ansprechperson Reinigung
Name, Vorname, Tel, Mail
X
Ja
X
X
X
X
129 09 Gebäude IMMO
K
Ansprechperson Verwaltung
Name, Vorname, Tel, Mail
X
Ja
X
X
X
X
130 09 Gebäude IMMO
FR
API Summe aus FlmRP
(Arbeitsplatz Ist), 0 Nachkommastellen, berechnet aus 
tatsächlicher Belegung
X
B
Ja
X
X
X (FlmRP)
X
20.06.2006
BAB
ATTRIBUT LÖSCHEN
131 09 Gebäude IMMO
Arbeitsplätze Anzahl FlmRP
Gesamt Arb.pl. im Gebäude laut FlmRP
X
Z
Ja
X
X
X (FlmRP)
X
132 09 Gebäude IMMO
A
Aufzüge Anzahl
z.B. 2
X
X
B
Ja
X
(X)
X
X
X
X
133 09 Gebäude IMMO
A
Denkmalschutz
ja / nein, freies Textfeld für Bemerkungen
X
Ja
X
X
GIS
X
134 09 Gebäude IMMO
S
Eigentumsverhältnisse
gemäss Werteliste Vorlage !
X
X
Ja
X
X
X
X
135 09 Gebäude IMMO
FR
FF Summe aus FlmRP
m2 (Funktionsfläche)
X
B
Ja
X
X
X (FlmRP)
X
136 09 Gebäude IMMO
Foto Haupteingang
Bild des Gebäudes mit Haupteingang ersichtlich
X
Ja
X
X
X
X
X
137 09 Gebäude IMMO
FR
GF sia d0165 aus FlmRP
m2
X
B
Ja
X
X
X (FlmRP)
X
138 09 Gebäude IMMO
A
Graffiti Prävention
Wann wurde welcher Schutz aufgetragen
X
Ja
X
X
X
X
29.01.2007
BAB
ATTRIBUT LÖSCHEN
139 09 Gebäude IMMO
A
Graffiti Schäden
Lage, Grösse des Schadens, Datum, Kosten, Foto
X
Ja
X
X
X
X
29.01.2007
BAB
ATTRIBUT LÖSCHEN
NEU: 139
09 Gebäude IMMO
GD
Graffiti Auftragsart
Einzel- oder Dauerauftrag (+Anzeige)
X
Ja
X
X
X
X
29.01.2007
BAB
NEUES ATTRIBUT
NEU: 139
09 Gebäude IMMO
GD
Graffiti Untergründe
Pop-up: siehe Werteliste
X
Ja
X
X
X
X
29.01.2007
BAB
NEUES ATTRIBUT
NEU: 139
09 Gebäude IMMO
GD
Graffiti Geschützt bis
Datum
X
Ja
X
X
X
X
29.01.2007
BAB
NEUES ATTRIBUT
NEU: 139
09 Gebäude IMMO
GD
Graffiti Verw. Produkte
Pop-up: KEIM Flagranti, Dispersion, Afracolor
X
Ja
X
X
X
X
29.01.2007
BAB
NEUES ATTRIBUT
NEU: 139
09 Gebäude IMMO
GD
Graffiti Bemerkungen
Lage, Grösse des Schadens, Datum, Kosten, Foto
X
Ja
X
X
X
X
29.01.2007
BAB
NEUES ATTRIBUT
NEU: 139
09 Gebäude IMMO
Graffiti Foto
Bild des Graffiti
X
Ja
X
X
X
X
29.01.2007
BAB
NEUES ATTRIBUT
140 09 Gebäude IMMO
S
Hausnummer
gemäss Standortliste
X
X
Ja
X
X
X
X
141 09 Gebäude IMMO
K
Hauswart
Name, Vorname, Tel, Mail
X
X
Ja
X
X
X
X
142 09 Gebäude IMMO
S
History
Textfeld für Informationen über das Gebäude (Umbauten, 
X
Ja
X
X
X
X
143 09 Gebäude IMMO
FR
HNF Summe aus FlmRP
m2 (Hauptnutzfläche)
X
B
Ja
X
X
X (FlmRP)
X
144 09 Gebäude IMMO
FR
HNF2.1 Summe aus FlmRP
m2 (Hauptnutzfläche Büroräume), wird für die Berechnung von 
X
B
Ja
X
X
X (FlmRP)
X
145 09 Gebäude IMMO
FR
KF sia d0165 aus FlmRP
Konstruktionsfläche, berechnet
X
B
Ja
X
X
X (FlmRP)
X
146 09 Gebäude IMMO
FR
NF Summe aud FlmRP
m2 (Nutzfläche)
X
B
Ja
X
X
X (FlmRP)
X
147 09 Gebäude IMMO
K
Objektmanager
Name, Vorname, Kurzzeichen, Tel, Mail
X
X
Ja
X
X
X
X
148 09 Gebäude IMMO
K
Organisationseinheit IMMO
Pop-up: I, IA, IAP, IAV, IAH, IS, ISS, ISG (berechnet aus 
X
X
B
Ja
X
X
X
X
149 09 Gebäude IMMO
S
Ort
gemäss Standortliste IMMO
X
X
Ja
X
X
X
X
150 09 Gebäude IMMO
S
PLZ 
gemäss Standortliste IMMO
X
X
Ja
X
X
X
X
151 09 Gebäude IMMO
K
Portfoliomanager
Name, Vorname, Kurzzeichen, Tel, Mail
X
X
Ja
X
X
X
X
152 09 Gebäude IMMO
FR
Räume Anzahl aus FlmRP
z.B. 25, berechnet
X
B
Ja
X
X
X (FlmRP)
X
153 09 Gebäude IMMO
S
Stadtkreis
Stadtkreis, in dem sich das Gebäude befindet - Vorlage !
X
X
Ja
X
X
X
X
154 09 Gebäude IMMO
S
Standort-Kennzeichen
Berechnet aus Gebäude ID
X
X
B
Ja
X
X
X
155 09 Gebäude IMMO
S
Strasse
gemäss Standortliste
X
X
Ja
X
X
X
X
156 09 Gebäude IMMO
S
Vermessungsbezirk
Werteliste, siehe Anhang "Quartiere in Zürich" - Vorlage !
X
X
Ja
X
X
X
X
157 09 Gebäude IMMO
FR
VF Summe aus FlmRP
m2 (Verkehrsfläche)
X
B
Ja
X
X
X (FlmRP)
X
158 09 Gebäude IMMO
FR
NGF sia d0165 
m2 (Nettogeschossfläche NGF), berechnet
X
X
B
Ja
X
(X)
X
X
X
159 09 Gebäude IMMO
Vollverglasung Fassade
Ja / nein
X
X
Ja
X
X
X
X
Neu: 159
09 Gebäude IMMO
Link-Verbindungen zu Geschosspläne
Link anfügen
X
X
X
X
12.09.2006
BAB
ganze Zeile
(nichts)
NEUES ATTRIBUT
Neu: 159
09 Gebäude IMMO
Portfolio 1
gemäss Werteliste IMMO 
X
Ja
X
X
X
X
18.09.2006
BAB
ganze Zeile
(nichts)
NEUES ATTRIBUT
Neu: 159
09 Gebäude IMMO
Subportfolio 1
gemäss Werteliste IMMO 
X
Ja
X
X
X
X
18.09.2006
BAB
ganze Zeile
(nichts)
NEUES ATTRIBUT
Neu: 159
09 Gebäude IMMO
Portfolio 2
gemäss Werteliste IMMO 
X
Ja
X
X
X
X
18.09.2006
BAB
ganze Zeile
(nichts)
NEUES ATTRIBUT
Neu: 159
09 Gebäude IMMO
Subportfolio 2
gemäss Werteliste IMMO 
X
Ja
X
X
X
X
18.09.2006
BAB
ganze Zeile
(nichts)
NEUES ATTRIBUT
Neu: 159
09 Gebäude IMMO
S
Objekttyp
gemäss Werteliste IMMO
X
Ja
X
X
X
X
13.10.2006
VEB
ganze Zeile
(nichts)
NEUES ATTRIBUT
Neu: 159
09 Gebäude IMMO
K
Kundenbetreuer
gemäss Werteliste IMMO inkl. Kurzzeichen
X
X
Ja
X
X
X
X
13.10.2006
VEB
ganze Zeile
(nichts)
NEUES ATTRIBUT
Neu:159
09 Gebäude IMMO
Abnahme-Datum
Abnahme der Datenerfassung und CAD-Zeichnung
X
T
X
X
X
18.10.2006
BAB
ganze Zeile
(nichts)
NEUES ATTRIBUT
Neu:159
09 Gebäude IMMO
AbnahmE durch:
Verantwortlicher/In der Abnahme der Datenerfassung und CAD-
Zeichnung
X
T
X
X
X
18.10.2006
BAB
ganze Zeile
(nichts)
NEUES ATTRIBUT
160 10 Gebäude STZH
Entität/Klasse Gebäude
X
Ja
X
X
161 10 Gebäude STZH
1
Gebäude STZH-ID
Eineindeutige System-ID; Vergabe automatisch, nicht sichtbar
X
X
Z
Ja
X
X
X
162 10 Gebäude STZH
AV-Gebäude
gibt an, ob Gebäude in amtlicher Vermessung vorhanden ist
X
X
L
Ja
X
X
GIS
X
163 10 Gebäude STZH
Hauptgebäude-STZH
Ja/Nein; Massgebend für die Geschossbezeichnung
X
X
L
Ja
X
X
X
X
164 10 Gebäude STZH
EGID-Nr
z.B. "123.345.345" - Vorlage !
X
Z
nein
X
X
GIS
X
X
165 10 Gebäude STZH
Versicherungs-Nr
entspricht GVZ-Nr GIS z.B. "2252"
X
Ja
X
X
SAP
X
X
166 10 Gebäude STZH
Gebäude-Name
Ja
X
X
X
167 10 Gebäude STZH
Baujahr
z.B. 1958
X
Z
Ja
ALBIS ?
X
ALBIS ?
X
168 10 Gebäude STZH
Letztes Umbaujahr
z.B. 1995
X
Z
Ja
ALBIS ?
X
ALBIS ?
X
169 10 Gebäude STZH
Geschosse Anzahl
Ja
X
X
170 10 Gebäude STZH
gültig ab
 
X
D
Ja
X
X
X
171 10 Gebäude STZH
gültig bis
 
X
D
Ja
X
X
X
172 10 Gebäude STZH
letzte Änderung
automatisch
X
X
D
Ja
X
X
X
173 10 Gebäude STZH
S
Änderung durch
automatisch
X
X
Ja
X
X
X
174 10 Gebäude STZH
S
Bemerkungen
Freitext
X
Ja
X
X
X
175 10 Gebäude STZH
Standort-Kennzeichen
Berechnet aus Gebäude STZH-ID
X
X
B
Ja
X
X
X
X
176 10.5 Gebäudeeingang / H
 
Eingang
X
Ja
X
X
X
177 10.5 Gebäudeeingang / H
 
Eingangs-nr.
X
Ja
X
X
X
178 10.5 Gebäudeeingang / H
 
EDID
X
Ja
X
X
X
179 10.5 Gebäudeeingang / H
 
Haupteingang IMMO
X
Ja
X
X
X
180 10.5 Gebäudeeingang / H
 
Lokalisations-ID
X
Ja
X
X
X
181 10.5 Gebäudeeingang / H
 
Strasse
X
Ja
X
X
X
182 10.5 Gebäudeeingang / H
 
Hausnummer
X
Ja
X
X
X
183 10.5 Gebäudeeingang / H
 
PLZ6
X
Ja
X
X
X
184 10.5 Gebäudeeingang / H
 
Ort
X
Ja
X
X
X
185 10.5 Gebäudeeingang / H
 
Land SAP
X
Ja
X
X
X
186 10.5 Gebäudeeingang / H
 
Koordinaten
X
Ja
X
X
X
187 10.5 Gebäudeeingang / H
 
Quelle
X
Ja
X
X
X
188 10.5 Gebäudeeingang / H
 
gültig ab
X
Ja
X
X
X
189 10.5 Gebäudeeingang / H
 
gültig bis
X
Ja
X
X
X
190 10.5 Gebäudeeingang / H
 
letzte Änderung
X
Ja
X
X
X
191 10.5 Gebäudeeingang / H
 
Änderung durch
X
Ja
X
X
X
192 10.5 Gebäudeeingang / H
 
Bemerkungen
X
Ja
X
X
X
193 11 Geschoss
Geschoss 
Entität/Klasse Geschoss, Geschossplan
X
Ja
X
X
194 11 Geschoss
S1
Geschoss-Nr SD
X
X
Ja
X
X
X
X
195 11 Geschoss
S1
Geschoss-Nr
4-stellig mit folgenden Werten: OG01-OG20, ZG01-ZG20, 
X
X
nein
X
X
X
X
X
30.10.2006
BAB
K
Ja
nein
196 11 Geschoss
S
Geschoss-Bezeichnung
Zeiger auf Katalog anhand Geschoss-Nr und frei wählbar: 
X
X
 
Ja
X
X
X
X
197 11 Geschoss
S
Geschoss-ID
automatisch, nicht sichtbar
X
X
Z
Ja
X
X
X
198 11 Geschoss
S
Geschoss-Kennzeichen
z.B. "04-EG00"
X
X
B
Ja
X
X
X
X
199 11 Geschoss
Geschoss-Nr STZH
gemäss GeoZ
X
Ja
X
X
X
200 11 Geschoss
Status
gemäss GeoZ
X
Ja
X
X
X
201 11 Geschoss
FR
GF berechnet
m2
X
X
B
Ja
X
(X)
X
X
202 11 Geschoss
FR
GF sia d0165
m2
X
X
B
Ja
X
(X)
X
X
203 11 Geschoss
GF
X
Ja
X
X
X
204 11 Geschoss
FR
Geschoss-Höhe sia 416
m
X
X
B
Ja
X
(X)
X
X
X
205 11 Geschoss
FR
HNF Summe
m2 (Hauptnutzfläche)
X
X
B
Ja
X
(X)
X
X
206 11 Geschoss
FR
NF Summe
m2 (Nutzfläche)
X
X
B
Ja
X
(X)
X
X
207 11 Geschoss
FR
FF Summe
m2 (Funktionsfläche)
X
X
B
Ja
X
(X)
X
X
208 11 Geschoss
FR
VF Summe
m2 (Verkehrsfläche)
X
X
B
Ja
X
(X)
X
X
209 11 Geschoss
FR
KF sia d0165
Konstruktionsfläche, berechnet
X
X
B
Ja
X
(X)
X
X
210 11 Geschoss
FR
AGF sia 416
Aussengeschossfläche sia 416
X
X
B
Ja
X
(X)
X
X
211 11 Geschoss
FR
ANGF sia 416
Aussennettogeschossfläche sia 416
X
X
B
Ja
X
(X)
X
X
212 11 Geschoss
FR
EBF Summe
m2, Energiebezugsfläche, gemäss sia d0165
X
X
B
Ja
X
(X)
X
X
213 11 Geschoss
FR
NGF sia d0165 
m2 (Nettogeschossfläche NGF), berechnet
X
X
B
Ja
X
(X)
X
X
214 11 Geschoss
A
gültig ab
 
X
D
Ja
X
X
X
215 11 Geschoss
A
gültig bis
 
X
D
Ja
X
X
X
216 11 Geschoss
S
letzte Änderung
automatisch
X
X
D
Ja
X
X
X
217 11 Geschoss
S
Änderung durch
automatisch
X
X
 
Ja
X
X
X
218 11 Geschoss
A
Bemerkungen
Freitext
X
Ja
X
X
X
219 11 Geschoss
S
Geschoss-Bezeichnung vor Ort
Frei wählbar
X
X
 
Ja
X
X
X
X
X
X
220 11 Geschoss
S
Standort-Kennzeichen
Berechnet aus Geschoss-ID
X
X
B
Ja
X
X
X
X
Attributliste zu CAFM Richtlinie V14.2_01.12.2006.xls, 01.03.2007, RAP, Seite 2 von 5

## S. 3

Ordn. Nr.
Datenobjekt
Reg.
Nr. 
Attr.
Attribut
Beschreibung
Alpha.
Graph.
Muss
Typ
edit.
Hist.
CAFM
SAP
GIS
BUS2000
Erf. d. 
MOVE
Daten 
System
Daten v.
IMMO
Import
Schn.st.
IMMO
später
Erfassung 
gefordert
Datenfeld 
vorgesehen
neue Datenfelder
zus. Erf.
d. Move
gelöschte Datenfelder
letzte Mutation 
am
durchgeführt von
betrifft Spalte
alter Eintrag
neuer Eintrag
Mutationen/Korrekturen
Zeitpunkt Submission
Differenzen
Datenart
System CAFM
System Lead
Datenquelle
Neu: 220.1 11 Geschoss
FR
Anzahl Räume
Anzahl, ganze Zahl
X
X
B
Ja
X
X
X
X
05.09.2006
BAB
alle
(nichts)
neues Attribut Geschoss
Neu: 220.2 11 Geschoss
FR
Fluchtwegpläne in PDF
Datenblatt anfügen
X
Ja
X
X
X
X
08.09.2006
BAB
ganze Zeile
(nichts)
NEUES ATTRIBUT
221 12 Raum
Raum
X
Ja
X
X
222 12 Raum
S1
Raum-Nr
Nr. gemäss systematischer CAFM-Raumnummerierung 
Beispiel: OG01001
X
X
Ja
X
X
X
X
02.11.2006
BAB
E
Raumsystem-Nr.
Raum-Nr.
223 12 Raum
S
Raum-Nr Ist
vor Ort
X
Ja
X
X
X
X
X
16.08.2006
BAB
I
X (Mussfeld)
nichts (Kein Mussfeld)
224 12 Raum
S
Raum-Name
optional, z.B. "Büro", mit noch zu def. Werteliste als 
Vorschlagswert, jedoch individueller Eingabemöglichkeit
X
Ja
X
X
X
X
X
16.08.2006
02.11.2006
BAB
BAB
I
E
X (Mussfeld)
Raum-Name Ist
nichts (Kein Mussfeld)
Raum-Name
225 12 Raum
S
Raum-Kennzeichen
="Raum-Nr Ist" "(Raumsystem-Nr)" "Raum-Name", z.B. "324 
(319) Büro" (automatisch generiert). Feld für Strukturbaum und 
grafische Darstellung.
X
X
B
Ja
X
X
X
X
226 12 Raum
FR
Raum-Aufteilung
Standard: Nein, 
wenn ja: "Mieter/Nutzer" 2-n %-Aufteilungen angeben
X
X
L
Ja
X
X
X
X
02.11.2006
BAB
F
Standard: Nein, wenn ja: 
 2-n %-Aufteilungen angeben
Standard: Nein, wenn ja: 
"Mieter/Nutzer" 2-n %-Aufteilungen angeben
227 12 Raum
FR
Raum beheizt
ja/nein
X
Ja
X
X
X
X
23.06.2006
VEB
C
(nichts)
FR
227 12 Raum
FR
Raum beheizt
ja/nein
X
Ja
X
X
X
X
04.07.2006
BAB
ATTRIBUT LÖSCHEN
228 12 Raum
FR
Raumfläche grafisch
Einheit in m2; zwei Nachkommastellen durch automatische 
Übernahme
X
X
Z
Ja
X
X
X
X
X
229 12 Raum
FR
Raumfläche
Einheit in m2; zwei Nachkommastellen; Enthält ebenfalls den 
Inhalt der Raumfläche grafisch, kann jedoch geändert werden.
X
X
B
Ja
X
X
X
230 12 Raum
FR
Mietfläche 
Nachkommastellen und Rundungen noch zu präzisieren; nach 
Vermietungspolitik IMMO
X
Z
Ja
X
X
SAP
X
02.11.2006
BAB
I
X
(nichts)
231 12 Raum
FR
Raum-Höhe sia 416
Einheit in m; zwei Nachkommastellen
X
X
 
Ja
X
X
X
X
X
232 12 Raum
FR
Raum-Volumen
Einheit in m3; drei Nachkommastellen
X
X
B
Ja
X
X
X
233 12 Raum
S
Raumgruppe IMMO
Werteliste durch Zuordnungstabelle auf Basis der Nutzungsart 
nach sia d0165 (Raumgruppe 1 bis 6)
X
Ja
X
X
X (FlmRP)
13.10.2006
02.11.2006
VEB
BAB
F
E
B
ergänzt (Raumgruppe 1-6)
(nichts)
234 12 Raum
S
Flächentyp gemäss sia d0165
Werteliste: Verkehrsfläche, Nutzfläche, Funktionsfläche, andere
X
B
Ja
X
X
X
X
02.11.2006
BAB
I
X
(nichts)
235 12 Raum
S
Nutzungsart gemäss sia d0165 (Ist)
Werteliste (siehe Kataloge) Beispiel HNF 2.1 Büroräume
X
X
 
Ja
X
X
X
X
X
05.09.2006
NEU 235.1 12 Raum
S
Nutzungsart gemäss sia d0165 (gebaut als)
Werteliste (siehe Kataloge) Beispiel HNF 2.1 Büroräume
X
 
Ja
X
X
X
05.09.2006
02.11.2006
BAB
BAB
alle
I
(nichts)
X
neues Attribut Raum
(nichts)
236 12 Raum
S
Portfolio
gemäss Werteliste IMMO 
X
Ja
X
X
X
X
16.08.2006
BAB
I
X (Mussfeld)
nichts (Kein Mussfeld)
237 12 Raum
A
Quartierbezug
ja/nein; Ja für standortgebundene Nutzung, z.B. Kreisbüro 7 
X
X
L
Ja
X
X
X (FlmRP)
X
238 12 Raum
T
EBF sia d0165
m2, Energiebezugsfläche
X
X
B
Ja
X
(X)
X
X
05.09.2006
BAB
C
FR
T
239 12 Raum
S
Raum-Kategorie
Gemäss Standrad IMMO für Raumgruppe 1: A, B, C, D, E
Ja
X
X
X
240 12 Raum
FR
APT sia d0165
(Arbeitsplatz Theoretisch), 1 Nachkommastellen, gemäss 
Standard IMMO = Raumfläche / Flächenquote (siehe Gebäude 
IMMO)
X
X
B
Ja
X
X
X
241 12 Raum
FR
APG sia d0165 
(Arbeitsplatz Geplant) geplantes zu lieferndes Mobiliar, 0 
X
 
Ja
X
X
X
242 12 Raum
FR
API Summe
(Arbeitsplatz Ist), 0 Nachkommastellen, automatisch durch 
X
B
Ja
X
X
X
02.11.2006
BAB
J / S
Z / X(FlmRP)
B / X
243 12 Raum
A
EGID-Nr
Eidgenössiche Gebäude-Identifikations-Nr falls mehrere 
Gebäude STZH pro Gebäude IMMO
X
 
nein
X
X
GIS
X
X
244 12 Raum
A
Gebäude-Nr SAP
temporär: Gebäudenummer aus SAP
X
 
Ja
X
X
SAP
X
245 12 Raum
A
Hauptkostenstelle
nach institutioneller Gliederung Nutzer, später Mieter
X
 
Ja
X
X
X
246 12 Raum
A
Unterkostenstelle
wird durch Mieter gepflegt, nach institutioneller Gliederung 
Nutzer, später Mieter
X
 
Ja
X
X
X
247 12 Raum
A
gültig ab
Datum
X
D
Ja
X
X
X
248 12 Raum
A
gültig bis
Datum
X
D
Ja
X
X
X
249 12 Raum
S
letzte Änderung
automatisch
X
X
D
Ja
X
X
X
250 12 Raum
S
Änderung durch
automatisch
X
X
 
Ja
X
X
X
251 12 Raum
Bemerkungen
Freitext
X
 
Ja
X
X
X
252 12 Raum
A
Abteilung
aus FlmRP
X
B
Ja
X
X
X (FlmRP)
X
05.09.2006
BAB
C
FR
A
253 12 Raum
S
Anteil Glaseinsätze Innen
m2 Glaseinsätze
X
Ja
X
X
X
X
22.06.2006
BAB
Q
x
keine Aufnahme durch Move gefordert
253.1 12 Raum
S
Anteil Glaseinsätze Innen
m2 Glaseinsätze
X
Ja
X
X
X
X
22.06.2006
BAB
C
TR
S
253.2 12 Raum
R
Anteil Glaseinsätze Innen
m2 Glaseinsätze
X
Ja
X
X
X
X
05.09.2006
BAB
C
S
R
254 12 Raum
S
Anzahl Glaseinsätze Innen
Anzahl 
X
 
Ja
X
X
X
X
22.06.2006
VEB
Q
x
keine Aufnahme durch Move gefordert
254.1 12 Raum
S
Anzahl Glaseinsätze Innen
Anzahl 
X
 
Ja
X
X
X
X
22.06.2006
BAB
C
TR
S
254.2 12 Raum
R
Anzahl Glaseinsätze Innen
Anzahl 
X
 
Ja
X
X
X
X
05.09.2006
BAB
C
S
R
255 12 Raum
T
Aufzugs-Bewilligung-Nr
Freitext (zu finden im Lift, ausgest. d. Büro f. Aufzugsanl.))
X
D
Ja
X
X
X
X
X
X
22.06.2006
BAB
C
TR
T
256 12 Raum
T
Aufzugs-Nr. Hersteller
Freitext (zu finden im Liftmaschinenraum)
X
D
Ja
X
X
X
X
22.06.2006
BAB
C
TR
T
257 12 Raum
T
Beleuchtung
Pop-up:Fluoreszenzlampe, Fluoreszenzlampe Ringform, 
Fluoreszenzlampe 2Pin, Fluoreszenzlampe 4Pin, 
Fluoreszenzlampe E27, Fluoreszenzlampe, 
Halogenreflektorlampe, Standardglühlampe, 
Standardglühlampe stoofest, Natriumdampfhochdrucklampe
X
 
Ja
X
X
X
X
22.06.2006
BAB
C
TR
T
258 12 Raum
FR
Belüftung
Freitext
X
 
Ja
X
X
X
X
22.06.2006
BAB
C
TR
FR
258.1 12 Raum
T
Belüftung
Freitext
X
 
Ja
X
X
X
X
05.09.2006
BAB
C
FR
T
259 12 Raum
A
Bereich
aus FlmRP
X
B
Ja
X
X
X (FlmRP)
X
05.09.2006
BAB
C
FR
A
260 12 Raum
R
Bodenbelag
Pop-up: Parkett, Laminat, Linol, PVC, Beton, Teppich, Stein, 
Zement, Vinyl, Schiefer, Klinker, Plättli Sanitär, Keramik, 
Epoxyharz, Schmutzschleuse, Gitter, andere
**vom Corradi (Reinigung) kann pro Gebäude eine Liste der 
Bodenbeläge mitgegeben werden (RaumNr. nicht zu 100 % 
korrekt, aber grossenteils nachvollziehbar)
X
Ja
X
X
X
X
22.06.2006
BAB
C
(nicht ausgefüllt!)
R
261 12 Raum
T
Bodendosen
Anzahl
X
Ja
X
X
X
X
22.06.2006
BAB
C
TR
T
262 12 Raum
T
Brandmeldeanlage
Anzahl
X
Z
Ja
X
X
X
X
29.06.2006
VEB
Y
X
263 12 Raum
T
Brandmeldeanlage Art
Pop-up: automatischer Melder, Handtaster, Raumanzeige 
X
Ja
X
X
X
X
29.06.2006
VEB
Y
X
264 12 Raum
A
DLV-Nr.
Referenznummer zu DLV
X
Ja
X
X
X
X
265 12 Raum
S
Eigentumsverhältnisse
Als Vorschlag Übernommen von "Eigentumsverhältnise" bei 
Gebäude IMMO
X
B
Ja
X
X
X (FlmRP)
X
16.08.2006
BAB
I
X (Mussfeld)
nichts (Kein Mussfeld)
266 12 Raum
T
Elektroverteilung
Pop-up: Brüstungskanal, Deckenkanal, Bodenkanal
X
 
Ja
X
X
X
X
22.06.2006
BAB
C
TR
T
267 12 Raum
FR
Energiemanagement
Pop-up (Mehrfachauswahl): beheizt, nicht beheizt, gekühlt, 
befeuchtet, klimatisiert
X
 
Ja
X
X
X
X
22.06.2006
BAB
C
TR
FR
267.1 12 Raum
T
Energiemanagement
Pop-up (Mehrfachauswahl): beheizt, nicht beheizt, gekühlt, 
befeuchtet, klimatisiert
X
 
Ja
X
X
X
X
05.09.2006
BAB
C
FR
T
268 12 Raum
R
Fensterfläche
Lichtmass x Lichtmass (inkl. Rahmen, von Wand zu Wand und 
von Fenstersims bis und mit Oberkante Rahmen)
X
 
Ja
X
X
X
X
22.06.2006
BAB
C
TR
R
269 12 Raum
T
Fluchtwegmarkierung
Pop-up:Fluchtwegmarkierung selbstleuchtend (USZ), 
Fluchtwegmarkierung (nachtleuchtend), keine
X
 
Ja
X
X
X
X
X
X
22.06.2006
BAB
C
TR
T
270 12 Raum
T
Hersteller Aufzug
Freitext (zu finden im Lift)
X
Ja
X
X
X
X
22.06.2006
BAB
C
TR
T
271 12 Raum
FR
Jahrgang Klima
Freitext
X
 
Ja
X
X
X
X
22.06.2006
BAB
C
TR
FR
271.1 12 Raum
T
Jahrgang Klima
Freitext
X
 
Ja
X
X
X
X
05.09.2006
BAB
C
FR
T
272 12 Raum
FR
Klimatisierungsart
Freitext
X
 
Ja
X
X
X
X
22.06.2006
BAB
C
TR
FR
272.1 12 Raum
T
Klimatisierungsart
Freitext
X
 
Ja
X
X
X
X
05.09.2006
BAB
C
FR
T
273 12 Raum
A
Kunde
aus FlmRP
X
B
Ja
X
X
X (FlmRP)
X
05.09.2006
BAB
C
FR
A
274 12 Raum
A
Kunde Departement
Organisation Kunde
X
Ja
X
X
X
X
275 12 Raum
A
Kunde Dienstabteilung
Organisation Kunde
X
Ja
X
X
X
X
276 12 Raum
T
Sicherheitseinrichtung
Pop-up:Löschposten, Feuerlöscher, Löschdecke, Sprinkler, 
keine
X
 
Ja
X
X
X
X
29.06.2006
02.11.2006
VEB
BAB
Y
E
X
Löscheinrichtungen
Löscheinrichtungen
277 12 Raum
FR
Luftmenge in m3
Freitext
X
 
Ja
X
X
X
X
22.06.2006
BAB
C
TR
FR
277.1 12 Raum
T
Luftmenge in m3
Freitext
X
 
Ja
X
X
X
X
05.09.2006
BAB
C
FR
T
278 12 Raum
A
Mieter / Nutzer
Organisation Mieter / Nutzer
X
Ja
X
X
X
X
02.11.2006
BAB
E / F
Mieter / Organisation Mieter
Mieter/Nutzer / Organisation Mieter/Nutzer
279 12 Raum
T
Notbeleuchtung
Pop-up:Notbeleuchtung weiss, nicht vorhanden
X
 
Ja
X
X
X
X
29.06.2006
VEB
Y
X
280 12 Raum
T
Notfalltelefon vorhanden
Pop-up: ja, nein
X
 
Ja
X
X
X
X
X
X
22.06.2006
BAB
C
TR
T
280.1 12 Raum
T
Notfalltelefon
Anzahl
X
 
Ja
X
X
X
X
X
X
15.08.2006
BAB
F
Pop up: ja, nein
Anzahl
281 12 Raum
A
Nutzer
Organisation Nutzer
X
Ja
X
X
X
X
02.11.2006
BAB
ganze Zeile
ATTRIBUT LÖSCHEN
282 12 Raum
A
Nutzerausbau
Pop-up: Ja / Nein
X
Ja
X
X
X
X
283 12 Raum
A
Nutzerausbau
Bemerkungsfeld Freitext
X
Ja
X
X
X
X
284 12 Raum
R
Oberlichter Decke
ja / nein
X
 
Ja
X
(x) in 
Zeichnung
X
X
X
22.06.2006
BAB
C
TR
R
285 12 Raum
S
Portfolio SAP
gemäss Werteliste aus SAP, z.B. "11 Schulhäuser" 
X
 
Ja
X
X
SAP
X
X
286 12 Raum
T
Anzahl UKV Anschlüsse TT 83 6pol
Stückzahl
X
Ja
X
X
X
X
22.06.2006
BAB
C
TR
T
287 12 Raum
T
Anzahl UKV Anschlüsse TT83 12pol
Stückzahl
X
Ja
X
X
X
X
22.06.2006
BAB
C
TR
T
288 12 Raum
T
Anzahl UKV Anschlüsse Kat. 5E/RJ45
Stückzahl
X
Ja
X
X
X
X
22.06.2006
BAB
C
TR
T
289 12 Raum
T
Anzahl UKV Anschlüsse Kat. 6/RJ45
Stückzahl
X
Ja
X
X
X
X
22.06.2006
BAB
C
TR
T
290 12 Raum
T
Anzahl UKV Anschlüsse Typ 1
Stückzahl
X
Ja
X
X
X
X
22.06.2006
BAB
C
TR
T
291 12 Raum
A
Quartierbezug
aus FlmRP
X
B
Ja
X
X
X (FlmRP)
X
05.09.2006
BAB
C
FR
A
292 12 Raum
FR
Raumfläche aus FlmRP
Einheit in m2; zwei Nachkommastellen; Enthält ebenfalls den 
Inhalt der Raumfläche grafisch, kann jedoch geändert werden.
X
B
Ja
X
X
X (FlmRP)
X
293 12 Raum
S
Raumgruppe IMMO aus FlmRP
Werteliste durch Zuordnungstabelle auf Basis der Nutzungsart 
nach sia d0165
X
B
Ja
X
X
X (FlmRP)
X
294 12 Raum
FR
Raumsolltemperatur
Freitext
X
 
Ja
X
X
X
X
22.06.2006
BAB
C
TK
FR
294.1 12 Raum
T
Raumsolltemperatur
Freitext
X
 
Ja
X
X
X
X
05.09.2006
BAB
C
FR
T
295 12 Raum
R
Sanitäre Einrichtung Dusche
Anzahl
X
 
Ja
X
X
X
X
X
22.06.2006
BAB
C
TR
R
296 12 Raum
R
Sanitäre Einrichtung Lavabo
Anzahl
X
 
Ja
X
X
X
X
X
22.06.2006
BAB
C
TR
R
297 12 Raum
R
Sanitäre Einrichtung Lavabo
Pop-up: Warmwasser ja, nein
X
 
Ja
X
X
X
X
22.06.2006
BAB
C
TR
R
298 12 Raum
R
Sanitäre Einrichtung Pissoir
Anzahl
X
 
Ja
X
X
X
X
X
22.06.2006
BAB
C
TR
R
299 12 Raum
R
Sanitäre Einrichtung Toilette
Anzahl
X
 
Ja
X
X
X
X
X
22.06.2006
BAB
C
TR
R
300 12 Raum
R
Scheibenart
Pop-up (Mehrfachauswahl): Isolierverglasung, 
Einfachverglasung, Doppelverglasung, Dreichverglasung
X
 
Ja
X
X
X
X
22.06.2006
BAB
C
TR
R
301 12 Raum
T
Sicherheitszone
Pop-up: Zone 1, Zone 2, Zone 3, Zone 4, Zone 5
X
 
Ja
X
X
X
X
22.06.2006
BAB
C
TR
T
302 12 Raum
S
Sonnenschutz innen
Pop-up: Lamellenstore, Rollladen, Holzläden, Markisen
X
 
Ja
X
X
X
X
X
X
22.06.2006
BAB
C
TR
S
302.1 12 Raum
R
Sonnenschutz innen
Pop-up: Lamellenstore, Rollladen, Holzläden, Markisen
X
 
Ja
X
X
X
X
X
X
05.09.2006
BAB
C
S
R
303 12 Raum
S
Sonnenschutz aussen
Pop-up: Lamellenstore, Rollladen, Holzläden, Markisen
X
 
Ja
X
X
X
X
X
X
22.06.2006
BAB
C
TR
S
303.1 12 Raum
R
Sonnenschutz aussen
Pop-up: Lamellenstore, Rollladen, Holzläden, Markisen
X
 
Ja
X
X
X
X
X
X
05.09.2006
BAB
C
S
R
Attributliste zu CAFM Richtlinie V14.2_01.12.2006.xls, 01.03.2007, RAP, Seite 3 von 5

## S. 4

Ordn. Nr.
Datenobjekt
Reg.
Nr. 
Attr.
Attribut
Beschreibung
Alpha.
Graph.
Muss
Typ
edit.
Hist.
CAFM
SAP
GIS
BUS2000
Erf. d. 
MOVE
Daten 
System
Daten v.
IMMO
Import
Schn.st.
IMMO
später
Erfassung 
gefordert
Datenfeld 
vorgesehen
neue Datenfelder
zus. Erf.
d. Move
gelöschte Datenfelder
letzte Mutation 
am
durchgeführt von
betrifft Spalte
alter Eintrag
neuer Eintrag
Mutationen/Korrekturen
Zeitpunkt Submission
Differenzen
Datenart
System CAFM
System Lead
Datenquelle
304 12 Raum
S
Krawallschutzgitter
ja / nein
X
 
Ja
X
X
X
X
22.06.2006
BAB
C
TR
S
304.1 12 Raum
S
Krawallschutzgitter
ja / nein
X
 
Ja
X
X
X
X
22.06.2006
BAB
Q
x
keine Aufnahme durch Move gefordert
304.2 12 Raum
R
Krawallschutzgitter
ja / nein
X
 
Ja
X
X
X
X
05.09.2006
BAB
C
S
R
305 12 Raum
S1
Standort-Kennzeichen
Berechnet aus Raum-ID
X
X
B
Ja
X
X
X
X
306 12 Raum
S
Subportfolio
gemäss Werteliste IMMO 
X
 
Ja
X
X
X
X
16.08.2006
BAB
I
X (Mussfeld)
nichts (Kein Mussfeld)
307 12 Raum
S
UKV Anschlüsse
Anzahl
X
Ja
X
X
X
X
X
22.06.2006
BAB
ATTRIBUT LÖSCHEN
307.1 12 Raum
S
UKV Anschlüsse
Anzahl
X
Ja
X
X
X
X
X
X
22.06.2006
BAB
Z
(nichts!)
X
308 12 Raum
T
Wartungs-Vertrags-Nr
X
Z
Ja
X
X
X
22.06.2006
BAB
C
(nichts!)
T
309 12 Raum
T
Wartungsfirma Lift
Freitext
X
 
X
X
X
X
22.06.2006
BAB
C
TR
T
310 12 Raum
FR
API Summe aus FlmRP
(Arbeitsplatz Ist), 0 Nachkommastellen, automatisch durch 
X
B
Nein
X
X
X (FlmRP)
X
02.11.2006
BAB
ganze Zeile
ATTRIBUT LÖSCHEN
311 12 Raum
S1
Raum-ID
automatisch, nicht sichtbar
X
X
Z
X
X
X
X
312 12 Raum
Raum-Kategorie
Werteliste gemäss Standard-IMMO - bei Verwaltungsbauten 
für Raumgruppe 1: A Einzelbüro Leitung, B Einzelbüro, C 
Sachbearbeitung, D Sachbearbeitung erweitert, E 
Sachbearbeitung begrenzt
X
X
X
X
X
312.11 12 Raum
T
Feuerlöscher
Anzahl
X
Ja
X
X
X
X
X
X
15.08.2006
BAB
ganze Zeile
(nichts)
NACHTRAG
312.12 12 Raum
T
Fluchtweg
ja / nein
X
Ja
X
X
X
X
15.08.2006
BAB
ganze Zeile
(nichts)
NEUES ATTRIBUT
312.13 12 Raum
T
In EBF einrechnen
ja / nein
X
Ja
X
X
X
X
05.09.2006
BAB
ganze Zeile
(nichts)
NEUES ATTRIBUT
NEU: 312.1312 Raum
Nutzung
Hauptkategorie gemäss sai d0165 (z.B. HNF 2 Büroarbeit)
X
X
Ja
X
X
X
X
13.10.2006
VEB
alle
(nichts)
NEUES ATTRIBUT
313 13 Tür
Tür
Freitext
X
X
X
314 13 Tür
Tür-Nr
z.B. "OG01001.1"
X
X
B
X
(X)
X
X
X
315 13 Tür
Funktion
Werteliste für Sondertüren: Notausgang; Haupteingang
X
X
X
X
X
X
X
316 13 Tür
EDID-Nr.
 
X
Z
X
X
GIS
X
X
317 13 Tür
Türen Brandschutz
Pop-up: EI 30, EI 30-c, EI 60, EI 60-c, EI 90, EI 90-c, andere 
X
X
X
X
X
16.08.2006
BAB
I
X (Mussfeld)
nichts (Kein Mussfeld)
318 13 Tür
gültig ab
 
X
X
X
X
319 13 Tür
gültig bis
 
X
X
X
X
320 13 Tür
letzte Änderung
automatisch
X
X
X
X
X
321 13 Tür
Änderung durch
automatisch
X
X
X
X
X
322 13 Tür
Bemerkungen
Freitext
X
X
X
X
323 13 Tür
Glasanteil Türfläche
in %
X
X
X
X
X
324 13 Tür
Standort-Kennzeichen
Berechnet aus Tür ID
X
X
B
Nein
X
X
X
X
325 13 Tür
Türart
p
p
g
g
Faltschiebetüre, Drehtüre, Kipptor, Schiebetüre, 
X
X
(x) in 
X
X
X
X
19.07.2006
BAB
F
nichts
ergänzt durch Lifttüre
326 13 Tür
Tür-ID
automatisch, nicht sichtbar
X
X
Z
X
X
X
X
327 13 Tür
Türmaterial
Pop-up: Holz, Holz mit Glaseinsatz, Metall, Metall mit 
Glaseinsatz, Glastüre ohne Rahmen
X
X
X
X
X
328 13 Tür
Brandfallgesteuerte Türe
Ja / nein
X
X
X
X
329 14 Umgebungsfläche
Umgebungsfläche
X
X
X
X
330 14 Umgebungsfläche
S
Umgebungsfläche-ID
Eineindeutige System-ID; Vergabe automatisch, nicht sichtbar
X
X
Z
X
X
X
331 14 Umgebungsfläche
S
Umgebungsfläche-Nr
Parzellen-Nr.+ U1 (Generell)
X
X
 
Nein
X
X
GIS
X
02.11.2006
BAB
F
"AU1234U0123"
Parzellen-Nr.+ U1 (Generell)
332 14 Umgebungsfläche
Umgebungsfläche-Art
Werteliste: Aufenthaltsplatz, Grünfläche, Lagerfläche, 
X
 
X
X
X
GIS
X
31.08.2006
BAB
ATTRIBUT LÖSCHEN
333 14 Umgebungsfläche
S
Umgebungsfläche-
Kennzeichen
z.B. "AU1234U0123-Sportplatz"
X
X
B
Nein
X
X
GIS
X
334 14 Umgebungsfläche
Quartier
Wertelise Quartiere in Zürich
X
X
X
X
X
335 14 Umgebungsfläche
S
Portfolio
gemäss Werteliste IMMO
X
 
Ja
X
X
X
X
17.08.2006
BAB
I
X (Mussfeld)
nichts (Kein Mussfeld)
336 14 Umgebungsfläche
Quartierbezug
ja/nein
X
X
X
X
X
337 14 Umgebungsfläche
S
Grundstücksnutzung 
sia d0165
Werteliste: BUF 10 Verschiedene Nutzungen, 10.1 
Aussenliegende Fahrzeugabstellflächen, UUF Unbearbeitete 
X
 
X
X
GIS
X
17.08.2006
BAB
I
X (Mussfeld)
nichts (Kein Mussfeld)
338 14 Umgebungsfläche
BA Summe
Bodenart berechnet im m2
X
Z
X
X
GIS
X
01.09.2006
BAB
ATTRIBUT LÖSCHEN
339 14 Umgebungsfläche
BA Hardbelag
Geteerte und betonierte Flächen in m2
X
Z
X
X
GIS
X
01.09.2006
BAB
ATTRIBUT LÖSCHEN
340 14 Umgebungsfläche
BA Rasen, Wiese
in m2
X
Z
X
X
GIS
X
01.09.2006
BAB
ATTRIBUT LÖSCHEN
341 14 Umgebungsfläche
BA Kies, Schotter
in m2
X
Z
X
X
GIS
X
01.09.2006
BAB
ATTRIBUT LÖSCHEN
342 14 Umgebungsfläche
BA Sonstige
in m2 >>>> -Portfolioliste
X
Z
X
X
GIS
X
01.09.2006
BAB
ATTRIBUT LÖSCHEN
Neu 338.1
14 Umgebungsfläche
F
GFI: nicht zugeordnet
in m2
X
Z
X
X
GIS
X
01.09.2006
BAB
alle
(nichts)
neues Attribut Raum
Neu 338.2
14 Umgebungsfläche
F
GFI: Arten-und Lebensraumförderung
in m2
X
Z
X
X
GIS
X
01.09.2006
BAB
alle
(nichts)
neues Attribut Raum
Neu 338.3
14 Umgebungsfläche
F
GFI: Erholungswald
in m2
X
Z
X
X
GIS
X
01.09.2006
BAB
alle
(nichts)
neues Attribut Raum
Neu 338.4
14 Umgebungsfläche
F
GFI: Friedhöfe
in m2
X
Z
X
X
GIS
X
01.09.2006
BAB
alle
(nichts)
neues Attribut Raum
Neu 338.5
14 Umgebungsfläche
F
GFI: Parkanlagen
in m2
X
Z
X
X
GIS
X
01.09.2006
BAB
alle
(nichts)
neues Attribut Raum
Neu 338.6
14 Umgebungsfläche
F
GFI: Verkehrsgrün
in m2
X
Z
X
X
GIS
X
01.09.2006
BAB
alle
(nichts)
neues Attribut Raum
Neu 338.7
14 Umgebungsfläche
F
GFI: Schulgrün
in m2
X
Z
X
X
GIS
X
01.09.2006
BAB
alle
(nichts)
neues Attribut Raum
Neu 338.8
14 Umgebungsfläche
F
GFI: Sportanlagen
in m2
X
Z
X
X
GIS
X
01.09.2006
BAB
alle
(nichts)
neues Attribut Raum
Neu 338.9
14 Umgebungsfläche
F
GFI: Badeanlagen
in m2
X
Z
X
X
GIS
X
01.09.2006
BAB
alle
(nichts)
neues Attribut Raum
Neu 338.10 14 Umgebungsfläche
F
GFI: Extensive Grünflächen
in m2
X
Z
X
X
GIS
X
01.09.2006
BAB
alle
(nichts)
neues Attribut Raum
Neu 338.11 14 Umgebungsfläche
F
GFI: Landwirtschaft
in m2
X
Z
X
X
GIS
X
01.09.2006
BAB
alle
(nichts)
neues Attribut Raum
Neu 338.12 14 Umgebungsfläche
F
GFI: Vermietete Flächen
in m2
X
Z
X
X
GIS
X
01.09.2006
BAB
alle
(nichts)
neues Attribut Raum
Neu 338.13 14 Umgebungsfläche
F
GFI: Landwirtschaftliche Pachten
in m2
X
Z
X
X
GIS
X
01.09.2006
BAB
alle
(nichts)
neues Attribut Raum
Neu 338.14 14 Umgebungsfläche
F
GFI: Vermietete Immobilien
in m2
X
Z
X
X
GIS
X
01.09.2006
BAB
alle
(nichts)
neues Attribut Raum
343 14 Umgebungsfläche
Mietart
fest zugeteilt / nicht zugeteilt
X
X
X
X
344 14 Umgebungsfläche
S
Eigentumsverhältnisse
Als Vorschlag Übernommen von "Eigentumsverhältnise" bei 
X
B
Ja
X
X
GIS
X
17.08.2006
BAB
I
X (Mussfeld)
nichts (Kein Mussfeld)
345 14 Umgebungsfläche
S
bewilligt am
Datum
X
D
X
X
GIS
X
346 14 Umgebungsfläche
gültig ab
Datum
X
D
X
X
GIS
X
347 14 Umgebungsfläche
gültig bis
Datum
X
D
X
X
GIS
X
348 14 Umgebungsfläche
letzte Änderung
automatisch
X
X
D
X
X
GIS
X
349 14 Umgebungsfläche
Änderung durch
automatisch
X
X
 
X
X
GIS
X
350 14 Umgebungsfläche
S
Bemerkungen
Freitext
X
X
X
X
351 14 Umgebungsfläche
S
Standort-Kennzeichen
Berechnet aus Umgebungsfläche-ID
X
X
B
Nein
X
X
X
X
352 14 Umgebungsfläche
S
Subportfolio
gemäss Werteliste IMMO
X
 
X
X
X
X
17.08.2006
BAB
I
X (Mussfeld)
nichts (Kein Mussfeld)
353 15 Parkplatz
Parkplatz
X
X
X
X
X (Mussfeld)
nichts (Kein Mussfeld)
354 15 Parkplatz
Parkplatz-ID
Eineindeutige System-ID; Vergabe automatisch
X
X
Z
X
X
X
X (Mussfeld)
nichts (Kein Mussfeld)
355 15 Parkplatz
Parkplatz-Bezeichnung
"AU1234P0123" (für PP innen), "AU1234P123" (für PP aussen)
X
X
X
X
X
X
X
X (Mussfeld)
nichts (Kein Mussfeld)
Neu: 355
15 Parkplatz
Parkplatz-Nr.
AU1234P"0123" (für PP innen), "AU1234P123" (für PP aussen)
X
X
X
X
X
X
X
02.11.2006
BAB
ganze Zeile
(nichts)
neues Attribut (Nachtrag)
356 15 Parkplatz
Quartier
X
X
X
X
X
X (Mussfeld)
nichts (Kein Mussfeld)
357 15 Parkplatz
Quartierbezug
ja/nein; Ja für standortgebundene Nutzung, z.B. 
X
L
X
X
X
X
X (Mussfeld)
nichts (Kein Mussfeld)
358 15 Parkplatz
Parkplatz-Schild
"ZH 294353", gemäss Stadtratsbeschluss
X
X
X
X
X
X
X (Mussfeld)
nichts (Kein Mussfeld)
359 15 Parkplatz
Parkplatz-Kategorie
Werteliste: fremdvermietete Parkplätze, 
X
X
X
X
X
17.08.2006
BAB
I
X (Mussfeld)
nichts (Kein Mussfeld)
360 15 Parkplatz
Parkplatz-Typ
Werteliste: Kleinst-PW, PW, Car/LKW, Motorrad, Fahrrad
X
X
X
X
X
X
17.08.2006
BAB
I
X (Mussfeld)
nichts (Kein Mussfeld)
361 15 Parkplatz
Portfolio
X
X
X
X
X
X (Mussfeld)
nichts (Kein Mussfeld)
362 15 Parkplatz
Mietart
fest zugeteilt / nicht zugeteilt
X
X
X
X
X
X
X (Mussfeld)
nichts (Kein Mussfeld)
363 15 Parkplatz
Eigentumsverhältnisse
Als Vorschlag Übernommen von "Eigentumsverhältnise" bei 
X
X
X
X
X
17.08.2006
BAB
I
X (Mussfeld)
nichts (Kein Mussfeld)
364 15 Parkplatz
bewilligt am
Datum
X
D
X
X
X
X (Mussfeld)
nichts (Kein Mussfeld)
365 15 Parkplatz
Hauptkostenstelle
 
X
X
X
SAP
X
X (Mussfeld)
nichts (Kein Mussfeld)
366 15 Parkplatz
Unterkostenstelle
 
X
X
X
SAP
X
X (Mussfeld)
nichts (Kein Mussfeld)
367 15 Parkplatz
gültig ab
Datum
X
D
X
X
X
X (Mussfeld)
nichts (Kein Mussfeld)
368 15 Parkplatz
gültig bis
Datum
X
D
X
X
X
X (Mussfeld)
nichts (Kein Mussfeld)
369 15 Parkplatz
letzte Änderung
automatisch
X
X
D
X
X
X
X (Mussfeld)
nichts (Kein Mussfeld)
370 15 Parkplatz
Änderung durch
automatisch
X
X
X
X
X
X (Mussfeld)
nichts (Kein Mussfeld)
371 15 Parkplatz
Bemerkungen
Freitext
X
X
X
X
X (Mussfeld)
nichts (Kein Mussfeld)
372 15 Parkplatz
Mieter
Mieter / Nutzer
X
X
X
X
X
X (Mussfeld)
nichts (Kein Mussfeld)
373 15 Parkplatz
Parkplatz- Lage
Werteliste: offener Parkplatz, gedeckter Parkplatz, Einzelbox, 
X
X
X
X
X
X
X
17.08.2006
BAB
I
X (Mussfeld)
nichts (Kein Mussfeld)
374 15 Parkplatz
Parkplatz- Schutz
Werteliste: abschliessbar, geschlossenes Areal, geschlossenes 
X
X
X
X
X
X
X
17.08.2006
BAB
I
X (Mussfeld)
nichts (Kein Mussfeld)
375 15 Parkplatz
Standort-Kennzeichen
Berechenet aus Parkplatz-ID
X
X
B
Nein
X
X
X
X
376 16 Exoten
Exoten
Freitext
X
X
X
377 16 Exoten
Exoten-ID
Eineindeutige System-ID; Vergabe automatisch, nicht sichtbar
X
X
Z
X
X
X
X
378 16 Exoten
Exoten-Nr.
z.B. "E12345"
X
X
X
X
X
X
02.11.2006
BAB
E
Exoten-Bezeichnung
Exoten-Nr.
379 16 Exoten
Parzellen-Nr.
"OE1234" 1-4 Ziffern
X
X
X
X
X
X
380 16 Exoten
Standort-Kennzeichen
Berechnet aus Exoten-ID
X
X
B
Nein
X
X
X
X
381 16 Exoten
Exoten-Art
Pop-up: Brunnen, Lift, Fahnenmasten, Plakat- und 
Anschlagstellen, Telefonkabinen
X
X
X
X
X
X
382 16 Exoten
Strasse 
gemäss Standortliste IMMO
X
X
X
X
X
X
383 16 Exoten
Hausnummer 
gemäss Standortliste IMMO
X
X
X
X
X
X
384 16 Exoten
PLZ 
gemäss Standortliste IMMO
X
X
X
X
X
X
385 16 Exoten
Ort 
gemäss Standortliste IMMO
X
X
X
X
X
X
386 16 Exoten
Foto
Bilde des Exoten
X
X
X
X
X
387 16 Exoten
Typ Anschlagkasten
Fotos / Schema hinterlegen
X
X
X
X
X
388 16 Exoten
Material Anschlagkasten
Werteliste: Holz/Glas, Metall/Glas
X
X
X
X
X
389 16 Exoten
Schliessung Anschlagkasten
Werteliste: Dreikant, Vierkant, Schlüssel
X
X
X
X
X
390 neu
16 Exoten
Typ Beflaggung
Werteliste: freistehend, am Gebäude
X
X
X
X
28.06.2007
RAP
alle
(nichts)
neues Attribut Exoten
390 neu
16 Exoten
Anzahl Beflaggung
Anzahl
X
Z
X
X
X
28.06.2007
RAP
alle
(nichts)
neues Attribut Exoten
390 neu
16 Exoten
Brunnen-Nr. WVZ
Brunnen-ID der Wasserversorgung
X
Z
X
X
X
28.06.2007
RAP
alle
(nichts)
neues Attribut Exoten
390 16 Exoten
Bemerkungen
Freitext
X
X
X
X
X
392 17 Organisation **
Departement
z.B. "Hochbaudepartement"
X
X
X
X
393 17 Organisation **
Organisations-Kzb
z.B. HBD
X
X
393.1 17 Organisation **
Organisations-Kennzeichen
z.B. HBD-IMMO
X
X
416 17 Organisation **
Dienstabteilung
z.B. "Immobilien-Bewirtschaftung"
X
X
X
X
X
417 17 Organisation **
Bereich
z.B. "Zentrale Dienste"
X
X
X
X
X
418 17 Organisation **
Abteilung
z.B. "Datenamangement, Informatik"
X
X
X
X
X
420 18 Person **
Person
X
X
X
421 18 Person **
Personen-ID
automatisch
X
X
X
X
422 18 Person **
Anrede
Frau, Herr
X
X
X
X
423 18 Person **
Vorname(n)
z.B. "Peter"
X
X
X
X
424 18 Person **
Nachname
z.B. "Muster"
X
X
X
X
425 18 Person **
Personen-Kennzeichen
Nachname, Vorname - z.B. Muster, Peter. Grafisch beim 
Arbeitsplatz dargestellt.
X
Z
X
X
X
426 18 Person **
Personal-Nr
123456
X
X
X
X
427 18 Person **
Kürzel
z.B. "MUP"
X
X
X
X
430 18 Person **
Funktion
nicht standardisiert
X
X
X
X
463 20 Arbeitsplatz
Arbeitsplatz
X
X
X
464 20 Arbeitsplatz
Belegung-ID
automatisch
X
Z
X
X
X
465 20 Arbeitsplatz
Belegung-Nr
z.B. "B001" 
X
X
X
X
466 20 Arbeitsplatz
AP-Typ
Hauptarbeitsplatz, Nebenarbeitsplatz oder Desksharing 
X
X
X
X
Attributliste zu CAFM Richtlinie V14.2_01.12.2006.xls, 01.03.2007, RAP, Seite 4 von 5

## S. 5

Ordn. Nr.
Datenobjekt
Reg.
Nr. 
Attr.
Attribut
Beschreibung
Alpha.
Graph.
Muss
Typ
edit.
Hist.
CAFM
SAP
GIS
BUS2000
Erf. d. 
MOVE
Daten 
System
Daten v.
IMMO
Import
Schn.st.
IMMO
später
Erfassung 
gefordert
Datenfeld 
vorgesehen
neue Datenfelder
zus. Erf.
d. Move
gelöschte Datenfelder
letzte Mutation 
am
durchgeführt von
betrifft Spalte
alter Eintrag
neuer Eintrag
Mutationen/Korrekturen
Zeitpunkt Submission
Differenzen
Datenart
System CAFM
System Lead
Datenquelle
467 20 Arbeitsplatz
AP-Kategorie
Werteliste gemäss Standard-IMMO - bei Verwaltungsbauten 
für Raumgruppe 1: A Einzelbüro Leitung, B Einzelbüro, C 
Sachbearbeitung, D Sachbearbeitung erweitert, E 
Sachbearbeitung begrenzt - wird übernommen vom 
Datenobjekt "Raum"
X
X
X
X
468 20 Arbeitsplatz
AP-Art
Arbeitsplatz-Art: siehe Anhang, Werteliste 
X
X
X
X
469 20 Arbeitsplatz
gültig ab
 
X
D
X
X
X
470 20 Arbeitsplatz
gültig bis
 
X
D
X
X
X
471 20 Arbeitsplatz
letzte Änderung
automatisch
X
D
X
X
X
472 20 Arbeitsplatz
Änderung durch
automatisch
X
X
X
473 20 Arbeitsplatz
Bemerkungen
Freitext
X
X
X
474 21 Sicherheit
Typ
PopUp-Menü: Feuerlöscher, Löschposten etc.
X
X
(x) in 
Zeichnung
X
X
475 21 Sicherheit
Feuerlöscher-ID
Freitext
X
X
X
476 21 Sicherheit
gültig ab
Freitext
X
X
X
477 21 Sicherheit
gültig bis
Freitext
X
X
X
478 21 Sicherheit
letzte Änderung
Freitext
X
X
X
X
479 21 Sicherheit
Änderung durch
Freitext
X
X
X
X
480 21 Sicherheit
Bemerkungen
Freitext
X
X
X
Attributliste zu CAFM Richtlinie V14.2_01.12.2006.xls, 01.03.2007, RAP, Seite 5 von 5
