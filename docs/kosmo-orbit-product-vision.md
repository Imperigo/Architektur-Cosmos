# KosmoOrbit Product Vision

Stand: 2026-06-02
Status: kanonische Produktergaenzung fuer die Rolle von KosmoOrbit.

## 1. Entscheidung

KosmoOrbit ist die Hauptsoftware von Architektur Kosmos.

Architektur Kosmos ist als Produkt nicht nur eine Website, nicht nur ein CAD
und nicht nur ein einzelnes Blender-Add-on. Das Zielprodukt besteht aus:

- einer starken lokalen Kosmo Zentrale als Hardware im Architekturbuero;
- der lokalen KI Kosmo als steuerndem, pruefendem und helfendem System;
- KosmoOrbit als installierter Hauptsoftware auf der Zentrale und auf den
  Arbeitsstationen;
- spezialisierten Untertools wie KosmoDesign, KosmoPrepare, KosmoDraw,
  KosmoViz, KosmoPublish, KosmoData und KosmoAsset.

KosmoOrbit ist die Software, ueber die Kosmo alle Tools nutzt, verbindet,
ueberwacht, aktualisiert, repariert und rollengerecht fuer Menschen im Buero
bereitstellt.

## 2. Produktbild

Wenn ein Buero Architektur Kosmos kauft, soll es perspektivisch nicht nur einen
Online-Zugang erhalten, sondern ein lokales System:

1. Kosmo Zentrale: leistungsstarker lokaler Rechner fuer KI, Daten, Jobs,
   Modelle, Blender-/ArchiCAD-Pipelines und Buero-Gedaechtnis.
2. KosmoOrbit: Hauptsoftware auf der Zentrale und auf jeder Arbeitsstation.
3. Kosmo: lokale KI, die ueber KosmoOrbit beobachtet, hilft, prueft,
   repariert, updated und Tools bedient.
4. Untertools: spezialisierte Arbeitsbereiche fuer Entwurf, Plan, Visualisierung,
   Vorbereitung, Publishing, Daten und Assets.

Die Vision ist ein lokales Architektur-Betriebssystem fuer ein Buero.

## 3. Rollenprofile

KosmoOrbit muss nicht fuer alle Menschen gleich aussehen. Die Oberflaeche,
Zugriffe und Tool-Tiefe werden an Rolle, Verantwortung und Erfahrungsstand
angepasst.

Erste Zielprofile:

- Chef / Buero-Inhaber: Admin, Strategie, Kosten, Public-Gates, finale
  Freigaben, Produkt-/Buero-Standards.
- IT-/KI-Spezialist: Admin, lokale Modelle, Infrastruktur, Updates,
  Integrationen, Sicherheit, Reparatur.
- Projektleiter Architekt: Projektsteuerung, Aufgaben, Koordination,
  Entscheidungen, Review, Abgabe.
- Entwurfsarchitekt: KosmoDesign, Varianten, Referenzen, Modell, Material,
  Visualisierung.
- Zeichner EFZ: Planwerk, Layer, Details, Ausfuehrungslogik, Korrekturen,
  Modellpflege.
- Praktikant: gefuehrte Recherche, einfache Modell- und Planassistenz,
  begrenzte Schreibrechte.
- Lehrling: Lernmodus, Schulstoff, Erklaerungen, sichere Uebungen,
  Buero-Standards.
- Schnupperstift: sehr einfache, gefuehrte Oberflaeche ohne riskante Aktionen.

Diese Rollenlogik gilt nicht nur fuer IT-Administration, sondern direkt fuer
die architektonischen Tools. KosmoDesign kann fuer einen Lehrling erklaerend
und gefuehrt sein, fuer einen Projektleiter entscheidungs- und revieworientiert
und fuer einen Entwurfsarchitekten frei, schnell und variantenstark.

## 4. KosmoDesign als wichtigste Untersoftware

KosmoDesign ist die wichtigste architektonische Untersoftware von KosmoOrbit.

KosmoOrbit stellt die zentrale Shell, Benutzerprofile, Rechte, Pakete,
Monitoring, Updates, Reparatur, Freigaben und Orchestrierung. KosmoDesign ist
die raeumliche Werkbank, in der Architektur entsteht:

- Entwurf aus Skizze, Text, Referenz, Foto, AR-Geste oder Sprache;
- bearbeitbare Modelle, Raeume, Geschosse, Bauteile und Varianten;
- Verbindung zu KosmoPrepare, KosmoDraw, KosmoViz und KosmoPublish;
- Grundlage fuer Plan, Visualisierung, Abgabe und spaetere BIM-nahe Workflows.

Die Entwicklung von KosmoDesign soll in Kooperation mit den bestehenden
Claude-Code-/Cowork-Straengen KosmoDraw, KosmoViz, KosmoPrepare und
KosmoPublish entstehen. KosmoOrbit haelt die Produkt- und Integrationslogik
zusammen.

## 5. Was KosmoOrbit koennen muss

Langfristige Kernfaehigkeiten:

- Tool-Launcher und Modul-Hub fuer alle Kosmo-Untertools.
- Rollen- und Rechteverwaltung fuer Menschen im Buero.
- Lokale KI-Kontrolle fuer Kosmo: Start, Stop, Diagnose, Jobs, Memory.
- Monitoring fuer Tools, Daten, Modelle, Deployments, lokale Services und
  Arbeitsstationen.
- Update- und Reparaturlogik fuer lokale Software und Connectoren.
- Projektpakete, Review-Packs, Decision-Records und Freigabegates.
- Rechte-, Quellen-, Sicherheits- und Qualitaetsstatus pro Projekt/Asset.
- Lern- und Assistenzmodus fuer Ausbildung, Buero-Standards und Schulstoff.
- Handoffs zwischen KosmoData, KosmoAsset, KosmoDesign, KosmoPrepare,
  KosmoDraw, KosmoViz, KosmoPublish und KosmoZentrale.

## 6. MVP-Konsequenz

Der erste MVP bleibt klein, aber die Richtung ist klar:

- nicht nur einzelne Scripts bauen;
- nicht nur Website-UI verbessern;
- nicht nur Blender-Add-ons isoliert testen;
- sondern einen ersten sichtbaren KosmoOrbit-Kern schaffen, der Projektpakete,
  Tools, Rollen, Review-Gates und Handoffs zusammenbringt.

KosmoOrbit ist damit die Produktmitte. Alles andere kreist nicht lose, sondern
geordnet um diese Hauptsoftware.

## 7. Aktueller sichtbarer MVP-Kern

Der aktuelle Stand in diesem Worker ist noch keine lokale Kosmo-Zentrale und
kein CAD-Ersatz. Sichtbar existiert ein statischer, review-only
KosmoOrbit-Kern unter `/orbit`.

Dieser Kern zeigt:

- KosmoOrbit als installierte Hauptsoftware-Zentrale, nicht als Website-Seite
  und nicht als CAD;
- ein lokales Projektpaket mit Risiko, Shell-Smoke und Paketpfad;
- sichtbare Kosmo-Module wie KosmoData, KosmoAsset, KosmoDesign, Prepare,
  Draw, Viz, Publish und Zentrale;
- Rollenprofile fuer Chef/Admin, IT/KI, Projektleitung, Entwurf, Zeichnung,
  Praktikum, Lehre und Schnupperstift;
- pro Rolle Zweck, Oberflaechentiefe, Entscheidungsradius und naechsten
  sicheren Schritt;
- den 3-Minuten-Demo-Pfad:
  Projektpaket pruefen, KosmoDesign Review Mode oeffnen, Blocker menschlich
  entscheiden;
- eine lokale Rollenumschaltung, mit der sichtbar wird, wie Chef/Admin,
  Projektleitung, Entwurf, Zeichnung und Ausbildung dieselbe Software anders
  sehen;
- einen gefuehrten Demo-Review-Pfad fuer Projektleitung, Entwurf und Admin,
  der den Ablauf vom Projektblocker zum sicheren KosmoDesign Review Mode
  erklaert;
- eine Projektpaket-Tagesansicht, die Artefakte, Reviewlast, Modellprofil,
  Gates und naechste sichere Aktion zusammenfuehrt;
- eine KosmoDesign Handoff Console, die Open Mode, Rolle, Modellprofil,
  Blocker, erlaubte Review-Aktionen, Kontextinputs und Guardrails als
  sicheren Uebergang von KosmoOrbit zu KosmoDesign sichtbar macht;
- einen Buero-Routine-Vertrag fuer Morgenstart, Projektfokus, KosmoDesign
  Review Session, Lernmodus, Abendabschluss und Not-Stopp, ohne echte
  Automationen oder externe Aktionen zu starten;
- einen Ausbildungsmodus, der Praktikant, Lehrling und Schnupperstift mit
  Schulstoff/Buero-Standards, gefuehrter Projektbeobachtung und Review statt
  Aktion unterstuetzt;
- ein Workflow-Delta, das heutigen verstreuten Bueroablauf und KosmoOrbit-
  Zielarbeitsweise vergleicht, ohne unbewiesene ROI-Zahlen zu behaupten;
- eine Pilotmessung, die Suchzeit, Blocker-Frueherkennung, Rollenpassung und
  Wiederholbarkeit als echte Buero-Evidenz pruefbar macht;
- ein Pilot-Messkit, das Baseline, Evidenzrunde, Rollenrunde, Entscheidung und
  leere Messkarten vorbereitet, ohne bereits Resultate zu behaupten;
- einen Presenter-Modus fuer eine 3-Minuten-Erklaerung, der die
  Buero-Argumente besser, schneller und guenstiger ohne Informatik-Sprache
  zusammenfasst;
- einen Demo-Fragen-Block, der typische Chef-/Buero-Fragen direkt im Tool
  beantwortet und auf sichtbare Evidenz-Panels verweist;
- einen nicht-schreibenden Review Decision Draft, der zeigt, wie KosmoOrbit
  spaeter evidenzbasierte menschliche Review-Entscheide vorbereiten soll;
- eine klare MVP-/Runtime-Grenze zwischen heute sichtbarer Preview,
  MVP-Vertrag und spaeterer KosmoZentrale-Runtime;
- einen Runtime-Vertrag, der KosmoZentrale Health, lokale KI Kosmo,
  Tool-Launch, Job-Orchestrierung und Repair/Update als spaetere lokale
  Steuerbereiche sichtbar macht, aber heute Modellstart, Prozessstarts,
  Queue, Memory-Writes und Systemaenderungen blockiert;
- einen Runtime-Adapter-Vertrag, der Health Telemetry, lokales Kosmo-Modell,
  Tool Launch, Job Queue, Audit Log und Publish/External Sync als spaetere
  Adapter-Lanes beschreibt, inklusive Human Gates, Promotion Requirements und
  Kill-Switch-Pflicht, ohne irgendeinen Adapter auszufuehren;
- ein Installationsbild, das KosmoZentrale als lokale Appliance, KosmoOrbit
  auf Arbeitsstationen, lokales Wissen, Architektur-Tools, menschliche
  Freigabe und spaetere externe Zusammenarbeit als Buero-System ordnet;
- eine Health-Readiness-Schicht, die spaetere lokale Signale fuer Hardware,
  Modelle, Speicher, Tool-Connectoren, Job Queue und Logs/Reparatur als
  read-only Telemetrievertrag mit eigenem lokalem JSON-Vertrag vorbereitet;
- ein Risiko-Register, das Runtime, Design-Generation, Quellen/Rechte,
  Rollen/Profile, Buero-Daten und externe Zusammenarbeit als menschlich zu
  entscheidende Freigabegates sichtbar macht;
- ein Command-Vertrag, der review-faehige Kommandos von gesperrten Runtime-,
  Generierungs-, Write-, Publish-, Reparatur- und Netzwerkkommandos trennt;
- ein Audit-Trail-Vertrag, der fuer spaetere Kommandos Rolle, Intent,
  Evidenz, Gate, Outcome und Schreibverhalten nachvollziehbar macht;
- ein Pruefevidenz-Panel, das Full Review, Route-Smoke, Reviewlast und Open
  Mode direkt an der Oberflaeche belegt;
- eine Demo-Bereitschaft, die Full Review, Route-Smoke und Static-Smoke zu
  einer menschlich vorfuehrbaren, aber weiterhin gesperrten Produktdemo
  zusammenzieht;
- einen Launch Decision Brief, der lokalen Gruenstand, Owner-Go, Push-Grenze,
  Command Evidence und Pilot-Evidenz als menschliche Entscheidung sichtbar
  macht;
- eine Buero-Pilot Szene, die den ersten sicheren Alltagstest in einem kleinen
  Architekturbuero erklaert: Projektpaket oeffnen, KosmoDesign lesen,
  Rollen vergleichen und erst beobachtete Evidenz festhalten;
- ein Tool-Orchestrierungsregister, das KosmoData, KosmoAsset, KosmoDesign,
  KosmoPrepare, KosmoDraw, KosmoViz, KosmoPublish und KosmoZentrale als lokale
  Software-Zentrale mit Rollen, Gates, Status und Runtime-Sperren sichtbar
  macht;
- einen KosmoDesign Pilotpfad, der den Review Mode bewusst vor jede
  Design-Generation stellt und damit keine Geometrie-Writes, keine
  automatischen Varianten und keine unbewiesenen Zeit-/Kostenclaims erlaubt;
- einen statischen Demo-Audit, der Vorfuehrreihenfolge, Navigation,
  Freigabelinie und sichtbare Render-Artefakte im exportierten `/orbit`
  prueft;
- eine Vision Bridge, die KosmoZentrale, KosmoPrepare, KosmoDesign,
  KosmoDraw/Viz/Publish und KosmoData/KosmoAsset als gesperrte bzw.
  reviewfaehige Pipeline sichtbar macht;
- Arbeitsstations-Prioritaeten, die zeigen, welche Panels Chef, Projektleitung,
  Entwurf, Zeichnung und Ausbildung zuerst brauchen;
- eine Rechte-Matrix, die sichtbar macht, welche Rolle Design Review,
  lokale Freigabe, Public Gate, Read-only und Generation sehen oder nicht
  nutzen darf;
- klare Sperre gegen Design-Generation, Public-Publish, externe Netzwerke,
  Uploads und echte User-Schreibaktionen.
- einen stabilen Push-Readiness-Report, der ohne fluechtige Commitlisten
  auskommt und lokale Evidence wie `git diff --check`, Lint und TypeScript
  in die menschliche Pushentscheidung einbindet.

Damit ist der erste pruefbare Produktkern vorhanden: KosmoOrbit beweist die
Steuerzentralen-Logik mit geprueftem Tool-Register und Runtime-Adapter-
Vertrag, ohne schon echte lokale Runtime, Auth, Blender-Start,
Geometrie-Generierung oder Cloud-Integrationen zu aktivieren.
