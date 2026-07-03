---
titel: "GebÑudeautomation Pflegezentren V1"
quelle: "Normen-Bibliothek Andrin"
datei: "GebÑudeautomation Pflegezentren V1.pdf"
seiten: 9
ocr-seiten: 0
tags: [bauwissen, norm]
---

# GebÑudeautomation Pflegezentren V1

## S. 1

Amt für Hochbauten 
Immobilien-Bewirtschaftung 
der Stadt Zürich 
Amtshaus III, Lindenhofstr. 21 
Postfach, 8021 Zürich 
Telefon 01 216 51 11 
Fax 
01 212 19 36 
e-mail 
ahb@hbd.stzh.ch 
 
immo@hbd.stzh.ch 
 
 
 
06.2004 
Pflegezentren der Stadt Zürich/10.06.2005/V1.0/KET/GA-Standard-PZZ.doc 
Qualität 
ISO 9001 
Umwelt 
ISO 14001 
 
Seite 1 von 9 
Hochbaudepartement
 
Pflegezentren der Stadt Zürich 
 
 
 
 
 
Standard 
Gebäudeautomation 
 
 
 
Version: 
1.0 
Dokumentdatum: 
10. Juni 2005

## S. 2

Amt für Hochbauten 
Immobilien-Bewirtschaftung 
der Stadt Zürich 
 
 
 
 
 
 
Pflegezentren der Stadt Zürich/10.06.2005/V1.0/KET/GA-Standard-PZZ.doc 
 
Seite 2 von 9 
Hochbaudepartement
 
Inhaltsverzeichnis 
1 
Einleitung ..................................................................................................3 
1.1 
Ausgangslage ......................................................................................................3 
1.2 
Zweck des Dokuments.........................................................................................3 
1.3 
Gültigkeitsbereich und Anwendung ......................................................................3 
1.4 
Mitgeltende Dokumente .......................................................................................3 
2 
Grundsätze, Rahmenbedingungen .........................................................4 
2.1 
Leitidee ................................................................................................................4 
2.2 
Technische Betriebsführung.................................................................................4 
3 
Funktionale Anforderungen.....................................................................4 
3.1 
Gebäudetechnische Anlagen ...............................................................................4 
3.2 
Raumautomation..................................................................................................5 
3.3 
Bedienung............................................................................................................5 
3.4 
Überwachung, Alarmierung..................................................................................6 
3.5 
Verbrauchsmessungen ........................................................................................7 
4 
Systemanforderungen..............................................................................7 
4.1 
Systemtopologie...................................................................................................7 
4.2 
Automationsstationen (AS)...................................................................................9 
4.3 
Automations-Netzwerk .........................................................................................9 
4.4 
Alarmserver..........................................................................................................9 
4.5 
Verbrauchsmessungen ........................................................................................9 
 
Impressum 
Redaktion und Herausgabe 
Amt für Hochbauten der Stadt Zürich 
Fachstelle Energie und Gebäudetechnik 
Thomas Kessler 
Mitarbeit, Unterstützung 
Pflegezentren der Stadt Zürich: Erwin Zehnder, Regula Pfenninger, 
Daniel Jegerlehner, Christian Berli 
 
Immobilien-Bewirtschaftung der Stadt Zürich: Daniel Zbinden, René 
Büttiker, Jenö Hajas 
 
Amt für Hochbauten der Stadt Zürich: Bernhard Rüegger, Jürg Seiler

## S. 3

Amt für Hochbauten 
Immobilien-Bewirtschaftung 
der Stadt Zürich 
 
 
 
 
 
 
Pflegezentren der Stadt Zürich/10.06.2005/V1.0/KET/GA-Standard-PZZ.doc 
 
Seite 3 von 9 
Hochbaudepartement
 
1 
Einleitung 
1.1 
Ausgangslage 
Die Dienstabteilung Pflegezentren der Stadt Zürich, kurz PZZ genannt, gehört zum Gesundheits- und Umweltdepartement GUD der Stadt Zürich. PZZ umfasst die zehn städtischen 
Pflegezentren und die Schule für Berufe im Gesundheitswesen SGZ. Die Pflegezentren sind 
medizinisch-pflegerische Einrichtungen und Wohnstätten in einem und werden mit grosser 
Fachlichkeit und Professionalität geführt. Sie stehen Patientinnen und Patienten offen, die in 
einem wohnlichen Umfeld innerhalb eines angenehmen sozialen Gefüges nicht nur intensiv 
gepflegt und betreut, sondern auch von den leitenden Ärztinnen und Ärzten behandelt werden. PZZ ist die grösste Institution dieser Art in der Schweiz und beschäftigt rund 1‘800 Voll- 
und Teilzeitangestellte. Für die stationäre Pflege stehen über 1‘500 Betten und in den Tageszentren rund 65 Plätze zur Verfügung. 
Einen besonderen Schwerpunkt setzt PZZ beim bedarfs- und zeitgerechten Wohnen. Im stationären Bereich werden wohnliche Zimmer mit unterschiedlicher Anzahl Betten (Einer- bis 
Vierer-Zimmer) mit oder ohne Nasszelle (Zimmer mit WC/Lavabo evtl. Dusche) angeboten. 
Zur Verbesserung der Komfortsituation wird der Anteil an Einer- und Zweierzimmern mit 
Nasszellen durch laufende Sanierungen ständig erhöht. 
Um der Nachfrage und den sich ändernden Bedürfnissen gerecht zu werden, sind in den 
verschiedenen Pflegezentren laufend Erneuerungen, Umbauten und Erweiterungen erforderlich. Diese Baumassnahmen werden vom Amt für Hochbauten als Baufachorgan im Auftrag 
der Immobilien-Bewirtschaftung als Eigentümervertreterin durchgeführt. 
1.2 
Zweck des Dokuments 
In der Vergangenheit wurden bei den Einrichtungen der Gebäudeautomation (auch als 
Mess-, Steuer-, Regel- und Leittechnik – MSRL – bezeichnet) unterschiedliche Konzepte 
und Ausbaustandards realisiert. Das vorliegende Dokument definiert diesbezüglich einheitliche Vorgaben für alle neuen Bauvorhaben. 
1.3 
Gültigkeitsbereich und Anwendung 
Der Standard ist verbindlich für alle Neubauten und Gesamterneuerungen sowie bei weitgehendem oder vollständigem Ersatz der Gebäudeautomationssysteme. Da solche Vorhaben 
in der Regel in mehreren Etappen ausgeführt werden, ist jeweils ein Konzept für die "Migration" der bestehenden Systeme auszuarbeiten. 
Bei Teilerneuerungen sowie kleineren Umbauten oder Erweitungen sind die Massnahmen im 
Bereich Gebäudeautomation im Sinne dieses Standards und unter Berücksichtigung der 
Verhältnismässigkeit und Wirtschaftlichkeit festzulegen. 
Die Umsetzung des Standards erfordert in jedem Fall eine projektspezifische Planung. Diese 
soll durch einen ausgewiesenen Fachingenieur für Gebäudeautomation erfolgen. 
1.4 
Mitgeltende Dokumente 
Für die Projektierung von gebäudetechnischen Einrichtungen bei städtischen Bauvorhaben 
sind die Richtlinien Gebäudetechnik des Amtes für Hochbauten allgemein verbindlich (können unter www.ahb.stzh.ch heruntergeladen oder bei der Fachstelle Energie und Gebäudetechnik des AHB bezogen werden). 
Bei komplexeren Vorhaben wird überdies in der Regel ein projektspezifisches Pflichtenheft 
Gebäudetechnik erstellt. 
Allfällige Widersprüche zwischen diesem Standard und den obgenannten Dokumenten sind 
mit der Fachstelle Energie und Gebäudetechnik des AHB zu klären.

## S. 4

Amt für Hochbauten 
Immobilien-Bewirtschaftung 
der Stadt Zürich 
 
 
 
 
 
 
Pflegezentren der Stadt Zürich/10.06.2005/V1.0/KET/GA-Standard-PZZ.doc 
 
Seite 4 von 9 
Hochbaudepartement
 
2 
Grundsätze, Rahmenbedingungen 
2.1 
Leitidee 
Aufgrund seiner Grösse und Komplexität verfügt ein Pflegezentrum meist über eine Vielzahl 
technischer Anlagen, die über mehrere Gebäude verteilt sind. Ein einheitliches, durchgängiges Gebäudeautomationssystem (GA-System) soll als Plattform für die Integration all dieser 
Anlagen dienen und damit die Voraussetzungen für eine effiziente Betriebsführung schaffen. 
2.2 
Technische Betriebsführung 
Für Bedienung, Überwachung, Wartung und Unterhalt der technischen Anlagen existiert in 
jedem Pflegezentrum ein Technischer Dienst (TD). Dessen Arbeitszeiten entsprechen den 
üblichen Bürozeiten. 
Ausserhalb der Arbeitszeiten des TD wird die Überwachung der technischen Einrichtungen 
durch das Pflegepersonal (Nachtwache) wahrgenommen. Dieses bietet bei Bedarf den Pikettdienst des TD auf. 
Einzelne spezielle Anlagen (z.B. Blockheizkraftwerke) werden durch den zentralen Technischen Dienst der Immobilien-Bewirtschaftung (TD-IMMO) betreut. 
Die Verbrauchsdaten (Energie und Wasser) werden durch die Immobilien-Bewirtschaftung 
zentral erfasst und ausgewertet. Die Verbrauchsabrechnungen der Lieferwerke werden zu 
diesem Zweck von PZZ an die IMMO weitergeleitet. Letztere stellt PZZ die aufbereiteten 
Verbrauchszahlen zwecks Benchmarking zur Verfügung. 
 
3 
Funktionale Anforderungen 
3.1 
Gebäudetechnische Anlagen 
Folgende Anlagen (sofern vorhanden) werden durch das GA-System automatisch gesteuert, 
geregelt und überwacht: 
• Wärmeerzeugung: Heizkessel, Wärmepumpe, Blockheizkraftwerk 
• Wärmeverteilung (Heizgruppen) 
• Brauchwarmwasseraufbereitung 
• Lüftungsanlagen (Ausnahme: dezentrale Abluftventilatoren ohne WRG) 
• Klimakälteanlagen 
Einige der obigen Anlagen (Wärmepumpen, BHKW, Kältemaschinen) verfügen typischerweise über eigene, werksseitig installierte Steuer- und Regeleinrichtungen. Diese müssen so 
in das GA-System eingebunden werden, dass die betreffende Anlage ihre Funktion im Gesamtsystem optimal erfüllen kann (siehe 4.1). 
Folgende Anlagen (sofern vorhanden) werden über das GA-System überwacht, d.h. mindestens eine Störmeldung wird an dieses übermittelt: 
• Abwasserpumpen (Pumpenstörung und Niveaualarm) 
• Aufzugsanlagen (technische Störung und Personenalarm) 
• Blindstrom-Kompensation 
• Brandmeldeanlage (technische Störung sowie Brandalarm intern und extern) 
• Gaswarnanlagen (technische Störung und Gasalarm) 
• Gewerbliche Kälteanlagen (technische Störung sowie Temperatur- und Personenalarm 
von Kühlzellen) 
• Leckwarnanlagen 
• Notlichtzentrale 
• Unterbruchsfreie Stromversorgung (nur zentrale Anlagen) 
• Wasseraufbereitungsanlagen

## S. 5

Amt für Hochbauten 
Immobilien-Bewirtschaftung 
der Stadt Zürich 
 
 
 
 
 
 
Pflegezentren der Stadt Zürich/10.06.2005/V1.0/KET/GA-Standard-PZZ.doc 
 
Seite 5 von 9 
Hochbaudepartement
 
Die betriebstechnischen Anlagen (Patientenruf, Weglaufschutz, …) werden nicht auf das 
GA-System aufgeschaltet, da deren direkte Überwachung durch das Pflegepersonal während 24h pro Tag gewährleistet ist. 
Eine Überwachung der Telefonanlage durch das GA-System ist nicht sinnvoll, weil bei deren 
Ausfall auch keine Alarme mehr übermittelt werden können (siehe 4.4). 
3.2 
Raumautomation 
Funktion
Raumtyp 
Raumtemperaturregelung 
Beleuchtungssteuerung 
Lüftungssteuerung 
Storensteuerung 
Patientenzimmer 
Thermostatventile 
Manuell (grosse 
Tasten mit Beschriftung) 
Dauerbetrieb 
Gemeinschaftsräume (Saal, 
Restaurant, …) 
Thermostatventile 
Manuell, ev. 
Szenen 
Zeitabhängig; 
grosse Räume 
mit Luftqualitätsregelung 
Verkehrszonen
(Hallen, Korridore, Treppenhäuser) 
Thermostatventile 
Zeit- und tageslichtabhängig; 
reduzierte Beleuchtungsstärke 
während der 
Nacht 
Zeitabhängig 
Funktionsräume (Therapie, 
Küche, Wäscherei, …) 
Thermostatventile 
Manuell 
Zeitabhängig; bei 
Bedarf manuelle 
Übersteuerung 
mit Timer 
Nebenräume 
(Lager, Technik, 
…) 
--- 
Präsenz- und tageslichtabhängig 
(Bewegungsmelder) 
Zeitabhängig 
Manuell 
Je nach Produkt 
mit Sicherheitsfunktion bei Wind 
/ Regen / Frost 
 
 
 
 
 
3.3 
Bedienung 
3.3.1 
Raumbedienung 
Die Bedienung von Beleuchtung, Storen, etc. in den einzelnen Räumen erfolgt mittels konventionellen Schaltern und Tastern. In Gemeinschafträumen mit Präsentations- und/oder 
Audio/Video-Einrichtungen können integrierte Bedieneinheiten (Touchpanels) eingesetzt 
werden. 
3.3.2 
Vorortbedienung 
Für die Anlagen, die durch das GA-System gesteuert, geregelt und überwacht werden (siehe 
3.1), stehen vor Ort folgende Bedienmöglichkeiten zur Verfügung: 
• Pro Anlage ein Anlageschalter mit den Positionen 
 AUTO = Anlage wird vom GA-System automatisch gesteuert 
 AUS 
= Anlage von Hand ausgeschaltet 
 EIN 
= Anlage von Hand eingeschaltet (Dauerbetrieb) 
• Pro Anlage drei Anzeigelampen 
 Betrieb 
(grün) 
 Handeingriff (gelb) 
 Störung 
(rot)

## S. 6

Amt für Hochbauten 
Immobilien-Bewirtschaftung 
der Stadt Zürich 
 
 
 
 
 
 
Pflegezentren der Stadt Zürich/10.06.2005/V1.0/KET/GA-Standard-PZZ.doc 
 
Seite 6 von 9 
Hochbaudepartement
 
• Pro Schaltschrank eine integrierte Bedieneinheit für die detaillierte Anzeige von Betriebszuständen, Messwerten, Störmeldungen, Betriebsstunden- und Verbrauchszählern, etc. 
sowie zum Einstellen von Betriebsparametern (Soll- und Grenzwerte, Schaltzeiten, etc). 
3.3.3 
Zentralbedienung 
Im Büro des TD ist eine zentrale Bedienstation mit Bildschirm, Tastatur, Maus und Drucker 
installiert. Diese bietet folgende Funktionen: 
• Visualisierung aller wichtigen Anlagen mit Anzeige der aktuellen Betriebszustände, Mess- 
und Sollwerte, Stellsignale und Störmeldungen 
• Handeingriffe (Übersteuern des automatischen Betriebs) 
• Anpassen von Vorgabewerten für den automatischen Betrieb (Betriebsparameter), insbesondere komfortables Editieren von Zeitschaltprofilen mit Wochenprogramm und Sondertagfunktion 
• Anzeigen, Quittieren und Protokollieren von Störmeldungen und Alarmen (siehe 3.4) 
• Aufzeichnen und grafische Darstellung von Mess- und Sollwerten, Betriebs- und Schaltzuständen 
3.3.4 
Fernbedienung 
Optional soll der Fernzugriff auf das GA-System via Telefonnetz oder Internet möglich sein. 
Die Funktionalität der Fernbedienung entspricht derjenigen der Zentralbedienung. 
Für komplexe Anlagen (z.B. Blockheizkraftwerk), die vom TD-IMMO oder – im Rahmen eines entsprechenden Servicevertrags – direkt durch den jeweiligen Lieferanten gewartet werden, besteht ein separater, direkter Fernzugriff. 
Ein effizienter Schutz vor Missbrauch muss in beiden Fällen gewährleistet sein. 
3.4 
Überwachung, Alarmierung 
Die auf das GA-System aufgeschalteten Alarme und Störmeldungen werden wie folgt priorisiert: 
Priorität 1: 
Personen und/oder Anlagen sind gefährdet oder Ausfall einer betriebskritischen 
Anlage (z.B. Warmwasserversorgung) → sofortige Reaktion erforderlich 
Priorität 2: 
Anlage oder Anlageteil ausgefallen → Intervention am nächsten Arbeitstag 
Priorität 3: 
Wartungsmeldungen → Behebung im Rahmen der regulären Unterhaltsarbeiten 
Alle Meldungen werden auf der zentralen Bedienstation (siehe 3.3.3) mit Anlagebezeichnung 
und Kurzbeschrieb angezeigt und protokolliert. Ausserdem werden sie automatisch wie folgt 
weitergeleitet (siehe 4.4): 
• Während der Arbeitszeiten des TD werden die Meldungen mit Prioritäten 1 und 2 auf das 
DECT-Handy des TD-Leiters oder dessen Stellvertreters übermittelt. 
• Ausserhalb der Arbeitzeiten des TD werden die Meldungen mit Priorität 1 auf das DECT-
Handy der zuständigen Nachtwache übermittelt und gleichzeitig der Pikettdienst des TD 
per SMS alarmiert. 
Die Alarmliste mit Prioritäten und Meldetexten muss objektspezifisch definiert und mit den 
Verantwortlichen für den Betrieb abgesprochen werden.

## S. 7

Amt für Hochbauten 
Immobilien-Bewirtschaftung 
der Stadt Zürich 
 
 
 
 
 
 
Pflegezentren der Stadt Zürich/10.06.2005/V1.0/KET/GA-Standard-PZZ.doc 
 
Seite 7 von 9 
Hochbaudepartement
 
3.5 
Verbrauchsmessungen 
Für die Erfassung von Energie- und Wasserverbräuchen gilt nachfolgendes Schema, welches den jeweiligen objektspezifischen Gegebenheiten anzupassen ist. 
Dem Areal zugeführt 
(Endenergie)
Umwandlung
Verbraucher (Nutzenergie)
Wärmeerzeugung
*
Gas / Öl / Fernwärme
Heizung
Brauchwarmwasser
Externe Bezüger
Abwärmenutzung
Umweltwärme
*
Wärmepumpe
*
Elektrizität
Allgemein
Lüftung, Kälte
Küche
Wäscherei
*
Trinkwasser
Allgemein
Brauchwarmwasser
Externe Bezüger
*
BHKW
 
 
Werkszähler; Ablesung durch das Lieferwerk 
 
Privatzähler; Ablesung durch den TD 
 
 
4 
Systemanforderungen 
4.1 
Systemtopologie 
Der Aufbau des GA-Systems richtet sich nach den folgenden Prinzipien: 
• Dezentrale, modular aufgebaute, programmierbare Automationsstationen sind die Funktionsträger des Systems. 
• Ein durchgängiges Automations-Netzwerk bildet das „Rückgrat“ des Systems und ermöglicht den direkten Datenaustausch zwischen allen Systemkomponenten. 
• Hoch spezialisierte Systeme wie Brandmeldeanlagen, Audio/Video-Anlagen, etc. werden 
nicht in das GA-System integriert. Ein minimaler Datenaustausch erfolgt über parallele 
Signale (potentialfreie Kontakte). 
• Anlagen mit werksseitig installierter Steuerung/Regelung (Wärmepumpen, BHKW, Kältemaschinen) werden entweder mittels paralleler Signale oder über eine serielle Schnittstelle eingebunden. Die Wahl der Methode richtet sich nach den jeweiligen technischen 
Gegebenheiten sowie nach den Realisierungskosten. 
• In Bezug auf die Alarmierung ist das GA-System gleichberechtigt mit den sicherheitstechnischen (z.B. Brandmeldeanlage) und den betrieblichen (z.B. Patientenruf) Systemen. D.h. die Alarmierung läuft über einen externen Alarmserver, der nicht Bestandteil 
des GA-Systems ist.
*

## S. 8

Amt für Hochbauten 
Immobilien-Bewirtschaftung 
der Stadt Zürich 
 
 
 
 
 
 
Pflegezentren der Stadt Zürich/10.06.2005/V1.0/KET/GA-Standard-PZZ.doc 
 
Seite 8 von 9 
Hochbaudepartement
 
Systemtopologie 
Automations-Netzwerk
Ethernet
Modem
Zentrale Bedienstation
Telefonzentrale 
mit Alarmserver
DECT
Brandmeldeanlage
Patientenrufanlage
...
Fernbedienung
Aöalksjfdssdflkj
Aewrqkl asdlfk asdf
ASDF alkdfj asdf
ASD dfslkj aslkdf
Asd aeiwfölk dfsdfs
Vorort-
Bedieneinheit
T
Automationsstation
M
z.B. Lüftungsanlage
Automationsstation
z.B. Diverses
z.B. Heizungsanlage
T
M
Automationsstation
Öffentl.
Telekom-
Netz
Modem
Öffentl.
Telekom-
Netz
Service
Öffentl.
Telekom-
Netz
SMS
Fernalarmierung
Option
Automations-Netzwerk
Ethernet
Modem
Zentrale Bedienstation
Telefonzentrale 
mit Alarmserver
DECT
DECT
Brandmeldeanlage
Patientenrufanlage
...
Fernbedienung
Aöalksjfdssdflkj
Aewrqkl asdlfk asdf
ASDF alkdfj asdf
ASD dfslkj aslkdf
Asd aeiwfölk dfsdfs
Vorort-
Bedieneinheit
Aöalksjfdssdflkj
Aewrqkl asdlfk asdf
ASDF alkdfj asdf
ASD dfslkj aslkdf
Asd aeiwfölk dfsdfs
Aöalksjfdssdflkj
Aewrqkl asdlfk asdf
ASDF alkdfj asdf
ASD dfslkj aslkdf
Asd aeiwfölk dfsdfs
Vorort-
Bedieneinheit
T
Automationsstation
M
z.B. Lüftungsanlage
T
Automationsstation
M
z.B. Lüftungsanlage
Automationsstation
z.B. Diverses
Automationsstation
z.B. Diverses
z.B. Heizungsanlage
T
M
Automationsstation
z.B. Heizungsanlage
T
M
Automationsstation
Öffentl.
Telekom-
Netz
Öffentl.
Telekom-
Netz
Modem
Öffentl.
Telekom-
Netz
Service
Öffentl.
Telekom-
Netz
Öffentl.
Telekom-
Netz
SMS
Fernalarmierung
Option

## S. 9

Amt für Hochbauten 
Immobilien-Bewirtschaftung 
der Stadt Zürich 
 
 
 
 
 
 
Pflegezentren der Stadt Zürich/10.06.2005/V1.0/KET/GA-Standard-PZZ.doc 
 
Seite 9 von 9 
Hochbaudepartement
 
der Stadt Zürich/10.06.2005/V1.0/KET/GA-Standard-PZZ.doc 
 
Seite 9 von 9 
Hochbaudepartement
4.2 
Automationsstationen (AS) 
Die Automationsstationen werden dezentral, möglichst nahe bei den gebäudetechnischen 
Anlagen platziert. Sie enthalten 
• die Signalschnittstellen zur Peripherie, über die sie mit den angeschlossenen Gewerken 
interagieren. 
• die „Intelligenz“ zur Steuerung, Regelung und Überwachung in Form eines anlagespezifischen Programms. 
• Die Schnittstelle zum Automations-Netzwerk, über das sie Daten mit anderen AS austauschen sowie mit den Vorort-Bedieneinheiten und der zentralen Bedienstation kommunizieren. 
Die AS müssen in Bezug auf ihren jeweiligen Einsatzzweck eine hohe Flexibilität und Skalierbarkeit aufweisen. Ferner müssen die Grundkosten pro Einheit in Form von Hardware- 
und Engineering-Aufwand möglichst gering sein. 
Es sind grundsätzlich alle Automatisierungsaufgaben für die gebäudetechnischen Anlagen 
auf den AS zu implementieren. Konventionelle Steuergeräte, insbesondere Schaltuhren, 
sind nicht gestattet. 
Jede AS verfügt über eine Eigenüberwachung (Watchdog). Eine Fehlfunktion oder ein Ausfall wird zuverlässig erkannt und erzeugt im GA-System eine Störmeldung. Die Priorität dieser Störmeldung (siehe 3.4) entspricht der höchsten Priorität aller Überwachungsfunktionen, 
die auf der betreffenden AS implementiert sind. 
4.3 
Automations-Netzwerk 
Das Automations-Netzwerk bildet die durchgängige Kommunikationsplattform für die Komponenten des GA-Systems. Diese müssen alle direkt an das Netzwerk angeschlossen werden können. Zusätzliche Datenschnittstellen wie Gateways, Routers, etc. sind nicht erlaubt. 
Ebenso nicht gestattet ist der Einsatz zusätzlicher Feldbus-Systeme wie z.B. EIB/KNX. 
Um Synergien zu nutzen und eine hohe Flexibilität zu gewährleisten, soll das Automations-
Netzwerk dieselbe UKV-Infrastruktur (Universelle Kommunikations-Verkabelung) nutzen, wie 
die betrieblichen Daten- und Telekommunikationsnetzwerke. Aus Gründen der Datensicherheit ist jedoch eine physische Verbindung mit Letzteren nicht erlaubt. Damit dies realisiert 
werden kann, muss 
• das Automations-Netzwerk auf der Ethernet-Technologie basieren und 
• dessen Topologie in die Planung der UKV einfliessen. 
4.4 
Alarmserver 
Diejenigen Alarme und Störmeldungen, die vom GA-System weiterzuleiten sind (siehe 3.4), 
werden über eine standardisierte Schnittstelle (z.B. ESPA 4.4.4) an einen externen Alarmserver übermittelt. Letzterer dient als zentrale Drehscheibe für alle gebäude-, sicherheits- 
und betriebstechnischen Meldungen und wird idealerweise als Komponente des Telefonsystems implementiert. 
Die Konfiguration des Alarmservers basiert auf einem objektspezifisch festzulegenden Alarmierungskonzept, das aufgrund der betrieblichen Abläufe festlegt, welche Alarme zu welchen Zeiten an welche internen und externen Stellen zu übermitteln sind. 
Als zentraler Knotenpunkt für die Alarmierung muss der Alarmserver die höchstmögliche 
Verfügbarkeit aufweisen. 
4.5 
Verbrauchsmessungen 
Die Verbrauchszähler werden nicht auf das GA-System aufgeschaltet. Für die Zwecke der 
Betriebsoptimierung sollen sie jedoch mit einer Schnittstelle ausgerüstet sein, die es erlaubt 
einen automatischen Datenlogger anzuschliessen.
