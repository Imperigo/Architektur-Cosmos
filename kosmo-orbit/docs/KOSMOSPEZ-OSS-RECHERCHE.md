# KosmoSpez — Open-Source-Recherche Simulationsprogramme (K37b)

> **Auftrag:** Owner-Korrekturen-Register `docs/OWNER-KORREKTUREN-2026-07.md`,
> K37 (S.15), Teilauftrag (b): «eine vollumfänlgiche recherche zu opensource
> programmen machst die wir kopieren können (lizenz verfügbar)» — für das
> geplante achte Haupttool **KosmoSpez** (Energie-/Klimadesign, Sonnenstudien,
> Windstudien, physikalische Ingenieursberechnungen, Klimakartenstudien).
>
> **Datum:** 21.07.2026 · **Autor:** Recherche-Agent (Batch B, K37b)
>
> **Quellenlage:** Web-Recherche vom 21.07.2026; jede Lizenz- und
> Sachbehauptung ist mit URL belegt (GitHub-LICENSE-Dateien, offizielle
> Projektseiten, Behördenseiten). Lizenzangaben als SPDX-Kennung, wo eine
> existiert. **Zielkontext:** kommerzielle Büro-Nutzung im Baubüro Andrin,
> UND: KosmoOrbit wird als Installer verteilt (Desktop/iOS-CI) — darum wird
> hier nicht nur «interne Nutzung», sondern auch **Weitergabe** bewertet.
> GPL/AGPL sind deshalb rote bzw. dunkelrote Flaggen; bevorzugt werden
> MIT/Apache-2.0/BSD/MPL.
>
> **Nicht Teil dieses Dokuments:** K37a (Konzept/Framework), K37c
> (ZIP + ClaudeDesign-Prompt), K37d (ETH-Unterlagen, wartet auf Rückfrage R5),
> K37e (Blender-Funktionen — nur dort erwähnt, wo es die Toolwahl berührt).

---

## 1 · Gesamttabelle

Ampel: 🟢 = permissiv, einbaubar · 🟡 = nutzbar mit Auflagen/als externer
Prozess · 🔴 = Copyleft-Risiko oder unfrei, nicht einbetten.

| Kandidat | Feld | Lizenz (SPDX) | Ampel | Integrationsweg | Aufwand Durchstich |
|---|---|---|---|---|---|
| **pvlib-python** | Solar/Besonnung | `BSD-3-Clause` | 🟢 | Python @ Bridge | **S** |
| SunCalc (vorhanden) | Sonnenstand | `BSD-2-Clause` | 🟢 | TS im Client (ist drin) | — |
| ladybug-core | Solar/Klimadaten | `AGPL-3.0` | 🔴 | (keiner) | — |
| **Radiance** | Besonnung + Tageslicht | Radiance Software License 2.0 (BSD-artig, kein SPDX-Kürzel) | 🟢 | CLI @ Bridge | **M** |
| **pyradiance** (LBNL) | Tageslicht | Radiance-Lizenz (Binaries gebündelt) | 🟢 | Python @ Bridge | **M** |
| honeybee-radiance / honeybee-core | Tageslicht | `AGPL-3.0` | 🔴 | (keiner) | — |
| Accelerad | Tageslicht (GPU) | proprietäre EULA, **kein OSS** | 🔴 | — | — |
| **EnergyPlus** | Energie/Thermik | BSD-3-artig (eigener Text, permissiv) | 🟢 | CLI @ Bridge | **L** |
| eppy | Energie (IDF-Scripting) | `MIT` | 🟢 | Python @ Bridge | S (Zusatz zu E+) |
| OpenStudio SDK | Energie (Modellaufbau) | `BSD-3-Clause` | 🟢 | CLI/Ruby-CLI @ Bridge | L |
| OpenFOAM | Wind/CFD | `GPL-3.0` | 🟡 | nur als externer CLI-Prozess | **L** |
| butterfly (Ladybug) | Wind (OpenFOAM-Wrapper) | `GPL-3.0-or-later` | 🔴 | (keiner) | — |
| **XLB** (Autodesk) | Wind/CFD leicht | `Apache-2.0` | 🟢 | Python/GPU @ HomeStation | M/L |
| energyplus.net-Wetterdaten | Klimadaten (EPW) | frei (DOE-Lizenzvereinbarungen) | 🟢 | Download/Bundle | S |
| climate.onebuilding.org | Klimadaten (EPW/TMYx) | frei, ohne formale Lizenz (Haftungsausschluss) | 🟢 | Download | S |
| PVGIS (EU-JRC) | Klimadaten/-karten | frei mit Quellenangabe, API | 🟢 | HTTP-API @ Bridge | S |
| MeteoSchweiz OGD | CH-Klimadaten | frei (OGD, seit 05/2025) | 🟢 | Download; API erst Ende 2026 | M |
| SIA 2028 / Meteonorm-DRY | CH-Normklimadaten | **kostenpflichtig, unfrei** | 🔴 | Kauf + lokale Ablage | — |
| **pythermalcomfort** | Komfort (PMV/UTCI/SET) | `MIT` | 🟢 | Python @ Bridge | **S** |
| ladybug-comfort | Komfort | AGPL-Muster der Ladybug-Kernbibliotheken | 🔴 | (keiner) | — |

---

## 2 · Besonnung / Solar

Vorhanden im Repo: **SunCalc** (Sonnenstand/-bahn im Client,
`BSD-2-Clause`, <https://github.com/mourner/suncalc>) — bleibt die schnelle
Client-Antwort für Sonnenstand und Schattenwurf-Echtzeit im Viewport.

### 2.1 pvlib-python — Empfehlung

- **Zweck:** Sonnenstandsalgorithmen (SPA u.a.), Klarhimmel- und
  Transpositionsmodelle, Einstrahlung auf beliebig geneigte Flächen,
  PV-Ertrag; dazu `iotools` für den Zugriff auf Strahlungsdatenquellen
  (inkl. PVGIS). Quelle: <https://github.com/pvlib/pvlib-python>,
  Paper zu iotools: <https://www.sciencedirect.com/science/article/pii/S0038092X23007260>.
- **Reifegrad:** hoch — community-getragen, wissenschaftlich publiziert
  (IEEE/OSTI: <https://ieeexplore.ieee.org/document/7750303/>), laufende
  Releases (<https://pypi.org/project/pvlib/>).
- **Sprache/Stack:** Python (NumPy/Pandas).
- **Lizenz:** `BSD-3-Clause` — permissiv, kommerzielle Nutzung und
  Weitergabe mit Attribution erlaubt
  (<https://github.com/pvlib/pvlib-python>). 🟢
- **Integrationsweg:** Python an der HomeStation-Bridge
  (`tools/homestation-bridge`), nach dem Blender-Worker-Muster: neuer
  Contract `spez-solar/v1` in `packages/kosmo-contracts`, `--fake`-Modus für
  den Container.
- **Input/Output:** Input Lat/Lon/Zeit + EPW/TMY; Output Zeitreihen
  (Pandas → JSON). **Architektenfreundlich:** Bestrahlungs-Heatmaps auf
  Fassadenflächen (derive-Muster wie Plan/Axo), Jahres-Stundenraster,
  Sonnenbahn-Diagramm über dem KosmoDesign-Modell.
- **Aufwand Durchstich:** **S** — Sonnenstand + Einstrahlung auf eine
  Dachfläche aus EPW, als Kennwert-Karte im UI.

### 2.2 Radiance (gendaylit/rtrace für Bestrahlungsstudien)

Siehe Abschnitt 3 — dieselbe Engine deckt kumulative Besonnung
(Sonnenstunden auf Fassade, Verschattungsstudien) physikalisch korrekt ab.

### 2.3 Ladybug-Tools-Kern (ladybug-core) — ROTE FLAGGE

- **Zweck:** Wetterdaten-Analyse, Sonnenbahn, Windrosen, Komfortkarten —
  fachlich genau unser Zielbild.
- **Lizenz:** `AGPL-3.0` — gilt für `ladybug-core`
  (<https://pypi.org/project/ladybug-core/>,
  <https://github.com/ladybug-tools/ladybug>) und die
  Honeybee-Kernbibliotheken
  (<https://github.com/ladybug-tools/honeybee-core>). 🔴
- **Warnung (deutlich):** AGPL «infiziert» auch Netzwerknutzung; da
  KosmoOrbit als Installer verteilt wird, würde jede Einbettung die
  Offenlegung des eigenen Codes unter AGPL erzwingen. **Nicht einbauen,
  nicht kopieren.** Erlaubt bleibt: die *Konzepte* (welche Diagramme,
  welche Workflows) als Referenz studieren und mit permissiven Bausteinen
  (pvlib, Radiance, pythermalcomfort) selbst bauen.

**Empfehlung erster Durchstich Solar:** pvlib an der Bridge; SunCalc bleibt
Client-seitig. Ladybug nur als konzeptuelle Referenz.

---

## 3 · Tageslicht (Radiance-Klasse)

### 3.1 Radiance — Empfehlung (Engine)

- **Zweck:** validierte Licht-/Tageslichtsimulation per Raytracing; >50
  CLI-Werkzeuge (rtrace, rpict, gendaylit, evalglare …). Referenz-Engine
  der ganzen Branche (<https://www.radiance-online.org/download-install/license>).
- **Reifegrad:** sehr hoch, seit 1990 von LBNL gepflegt.
- **Sprache/Stack:** C, reine CLI-Werkzeuge.
- **Lizenz:** «The Radiance Software License, Version 2.0» — BSD-artig
  permissiv: Redistribution in Source/Binärform erlaubt, Pflichten sind
  Copyright-Hinweis, Acknowledgment in der Doku und Namensschutz
  («Radiance»/LBNL nicht zur Bewerbung nutzen). Kein offizielles
  SPDX-Kürzel; Text: <https://www.radiance-online.org/download-install/license>,
  Übersicht: <https://openhub.net/licenses/The_Radiance_Software_License_Version_1_0>. 🟢
  **Auflage für uns:** Acknowledgment-Satz in Doku/About-Dialog.
- **Integrationsweg:** CLI an der HomeStation-Bridge (Szene aus dem
  kosmo-kernel-`derive/scene` nach `.rad`-Geometrie exportieren).
- **Input/Output:** Input `.rad`-Szenen + Himmelsmodelle (gendaylit aus
  EPW); Output HDR-Bilder und Punktwerte (Lux, DF).
  **Architektenfreundlich:** Falschfarben-Lux-Overlays auf dem Grundriss,
  Tageslichtfaktor-Raster je Raum, «Tageslicht-Ampel» je Zone.
- **Aufwand Durchstich:** **M** — Geometrie-Export → gendaylit-Himmel →
  rtrace-Raster auf einer Raumebene → Falschfarben-Overlay.

### 3.2 pyradiance (LBNL-ETA) — Empfehlung (Anbindung)

- **Zweck:** offizieller Python-Wrapper, **bündelt die Radiance-Binaries
  mit** — kein separates Radiance-Setup auf der HomeStation nötig
  (<https://github.com/LBNL-ETA/pyradiance>,
  <https://lbnl-eta.github.io/pyradiance/>).
- **Lizenz:** unterliegt der Radiance-Lizenz (siehe 3.1). 🟢
- **Aufwand:** in 3.1 enthalten; pyradiance ist der empfohlene Weg, weil
  Bridge-seitig ohnehin Python läuft.
- Erwähnung: `LBNL-ETA/frads` (Radiance+EnergyPlus-Framework,
  <https://github.com/LBNL-ETA/frads>) — interessant, Lizenz vor einem
  allfälligen Einsatz separat prüfen (hier nicht verifiziert).

### 3.3 Honeybee-Radiance — ROTE FLAGGE

`AGPL-3.0` wie der ganze Ladybug-Tools-Kern
(<https://github.com/ladybug-tools/honeybee>,
<https://github.com/ladybug-tools/honeybee-core>). 🔴 Gleiche Konsequenz wie
2.3: nicht einbetten, nur Workflow-Referenz.

### 3.4 Accelerad (GPU-Radiance) — NICHT OSS

Frei nutzbar, aber unter **proprietärer EULA** des MIT Sustainable Design
Lab, nicht Open Source
(<https://web.mit.edu/sustainabledesignlab/projects/Accelerad/accelerad_eula.html>,
<https://github.com/nljones/Accelerad>). 🔴 für Einbettung/Weitergabe;
höchstens später als optionale, vom User selbst installierte Beschleunigung
prüfen.

**Empfehlung erster Durchstich Tageslicht:** Radiance via pyradiance an der
Bridge; ein Raum, ein DF-Raster, ein Overlay.

---

## 4 · Energie / Thermik

### 4.1 EnergyPlus — Empfehlung

- **Zweck:** Weltstandard der thermischen Gebäudesimulation (Heiz-/
  Kühllasten, Energiebedarf, Zonen-Temperaturen, Feuchte, HVAC), gepflegt
  von NREL/DOE (<https://github.com/NREL/EnergyPlus>).
- **Reifegrad:** sehr hoch; regelmässige Releases
  (<https://github.com/NREL/EnergyPlus/releases>).
- **Sprache/Stack:** C++; CLI + eingebaute Python-API.
- **Lizenz:** BSD-3-artiger eigener Lizenztext, ausdrücklich permissiv,
  «no give back», kommerzielle Nutzung erlaubt
  (<https://github.com/NREL/EnergyPlus/blob/develop/LICENSE.txt>). 🟢
- **Integrationsweg:** CLI an der HomeStation-Bridge. Der eigentliche
  Aufwand ist **nicht** der Aufruf, sondern die Übersetzung
  KosmoDesign-Doc → IDF/epJSON (Zonen aus unseren Zonen-Entities, Wände/
  Fenster aus der Fenster-Semantik von K21). Helfer: **eppy** (`MIT`,
  <https://github.com/santoshphilip/eppy>,
  <https://github.com/santoshphilip/eppy/blob/master/LICENSE>) fürs
  IDF-Erzeugen/-Patchen.
- **Input/Output:** Input IDF/epJSON + EPW; Output SQL/CSV-Zeitreihen und
  Reports. **Architektenfreundlich:** Monats-Balken Heiz-/Kühlbedarf,
  Überhitzungsstunden je Raum als Farbkarte auf dem Grundriss,
  «Was-wäre-wenn»-Vergleichskarten (Fensteranteil, Dämmstärke).
- **Aufwand Durchstich:** **L** — ehrlich: eine Ein-Zonen-Box mit einem
  Fenster aus dem Doc generieren, simulieren, eine Kennzahl zurückholen
  ist M; ein nutzbarer Mehrzonen-Pfad über echte Projekte ist L.

### 4.2 OpenStudio SDK

- **Zweck:** Modellbau-SDK über EnergyPlus + Radiance (Übersetzungs- und
  Mess-Infrastruktur, «Measures»), von NREL
  (<https://github.com/NREL/OpenStudio>).
- **Lizenz:** `BSD-3-Clause`
  (<https://github.com/NREL/OpenStudio/blob/develop/LICENSE.md>,
  <https://nrel.github.io/OpenStudio-user-documentation/help/software_license/>). 🟢
- **Einschätzung:** mächtig, aber schwergewichtig (Ruby/C++-SDK). Für
  KosmoSpez v1 **nicht** nötig — wir haben mit dem kosmo-kernel bereits ein
  eigenes Modell und brauchen nur den Weg Doc→IDF. Kandidat für später,
  falls Measures/Standards-Bibliotheken gewünscht sind. **Aufwand:** L.

### 4.3 honeybee-energy — ROTE FLAGGE

`AGPL-3.0` (Ladybug-Tools-Kern, siehe 2.3;
<https://github.com/ladybug-tools/honeybee-grasshopper-energy>). 🔴

**Empfehlung erster Durchstich Energie:** EnergyPlus als CLI + eppy für die
IDF-Erzeugung; Ein-Zonen-Durchstich zuerst, Ausbau entlang der
Fenster-/Bauteil-Semantik aus K21.

---

## 5 · Wind / CFD — mit ehrlicher Rechenlast-Ansage

**Ehrlichkeit zuerst:** Windkomfort-CFD ist die teuerste Simulation in
diesem Dokument. Ein Aussenraum-Fall (Quartier, ein Windrichtungssektor)
bedeutet Vernetzung + Löserlauf im Bereich von zehntausenden Zellen bis
Millionen Zellen und **Minuten bis Stunden** Rechenzeit — auch auf der
RTX-5090-HomeStation. «Fast per Knopfdruck» geht hier nur mit stark
vereinfachten Modellen (LBM/GPU, grobe Gitter) und muss im UI als
Näherung deklariert werden (siehe Abschnitt 8).

### 5.1 OpenFOAM

- **Zweck:** der Open-Source-CFD-Standard (RANS/LES, Aussenströmung um
  Gebäude) (<https://openfoam.org/>).
- **Reifegrad:** sehr hoch, Industrie-erprobt.
- **Sprache/Stack:** C++, CLI-Toolchain (blockMesh/snappyHexMesh, simpleFoam …).
- **Lizenz:** `GPL-3.0` (<https://openfoam.org/licence/>,
  <https://www.openfoam.com/documentation/licencing>). 🟡/🔴
  **Warnung:** GPL — niemals in KosmoOrbit einlinken/einbetten. Zulässig
  ist der Aufruf als **separater CLI-Prozess** auf der HomeStation
  (Nutzung ist frei, auch kommerziell; interne Modifikationen müssen nicht
  veröffentlicht werden, solange nicht distribuiert —
  <https://openfoam.org/licence/enforcing-gpl/>). Wenn wir OpenFOAM-Binaries
  **mitverteilen**, greift die Quellcode-Weitergabepflicht für OpenFOAM
  selbst — sauberer: Installation per Setup-Skript auf der HomeStation,
  nicht im Installer.
- **Integrationsweg:** CLI @ HomeStation (Case-Generator in Python schreiben
  wir selbst — **nicht** butterfly kopieren, siehe 5.2).
- **Input/Output:** STL-Geometrie + Case-Dictionaries; Output VTK-Felder.
  **Architektenfreundlich:** Windkomfort-Farbkarte auf Fussgängerhöhe,
  Vektorpfeile/Stromlinien im Viewport, Windrose je Standort.
- **Aufwand Durchstich:** **L** — ehrlich inklusive Meshing-Robustheit.

### 5.2 butterfly (Ladybug-OpenFOAM-Wrapper) — ROTE FLAGGE

`GPL-3.0-or-later` (<https://github.com/ladybug-tools/butterfly>). 🔴
Kein Kopieren von Code; als Konzept-Referenz («windtunnel»-Case-Aufbau,
<https://github.com/ladybug-tools/butterfly/blob/master/butterfly/windtunnel.py>)
lesbar, Implementation eigenständig.

### 5.3 XLB (Autodesk) — leichte GPU-Alternative, Empfehlung für «schnelle Windstudie»

- **Zweck:** Lattice-Boltzmann-Bibliothek (JAX/Warp), massiv parallel auf
  GPU, für grossskalige Strömungssimulation
  (<https://github.com/Autodesk/XLB>, Paper:
  <https://www.sciencedirect.com/science/article/abs/pii/S0010465524001103>).
- **Reifegrad:** jung/forschungsnah (2024 publiziert) — kein
  Normen-validiertes Windkomfort-Werkzeug; dafür GPU-schnell und
  Python-nativ.
- **Lizenz:** `Apache-2.0` (<https://github.com/Autodesk/XLB>). 🟢
- **Integrationsweg:** Python @ HomeStation (RTX 5090 ist genau das
  Zielgerät für diese Klasse).
- **Input/Output:** Voxel-/Gitterdomäne aus unserer Geometrie; Output
  Geschwindigkeitsfelder → dieselben Windkomfort-Overlays wie 5.1.
- **Aufwand Durchstich:** **M/L** — 2D/2.5D-Quartierschnitt als
  Echtzeit-Näherung ist M; belastbare 3D-Studien bleiben L.

**Empfehlung erster Durchstich Wind:** v1 bewusst OHNE CFD ausliefern
(nur Windrose + Kennwerte aus Klimadaten, ehrlich beschriftet); als erster
Sim-Durchstich danach XLB-Näherung (Apache-2.0, GPU), OpenFOAM erst als
Ausbaustufe für «ernsthafte» Studien.

---

## 6 · Klimadaten / Klimakarten (mit ehrlicher CH-Lage)

### 6.1 Freie EPW-Quellen (weltweit)

- **energyplus.net Wetterdaten:** kostenlose EPW-Dateien; die
  DOE-Lizenzvereinbarungen (ASHRAE/IWEC, ISHRAE, INETI) erlauben die
  kostenlose Nutzung durch die EnergyPlus-Community
  (<https://bigladdersoftware.com/epx/docs/24-1/getting-started/weatherdata.html>). 🟢
- **climate.onebuilding.org:** TMYx-Dateien für >9'850 Standorte, «no
  charge», mit ausdrücklichem Haftungsausschluss; keine formale
  SPDX-Lizenz — für Einzeldownload/Nutzung unproblematisch, ein
  **Massen-Rebundling in unserem Installer wäre vorher schriftlich zu
  klären** (<https://climate.onebuilding.org/>,
  <https://climate.onebuilding.org/about/default.html>). 🟢
- **PVGIS (EU Joint Research Centre):** TMY-Generator mit EPW-Export und
  **freier API**; Nutzung frei bei Quellenangabe
  (<https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/pvgis-tools/pvgis-typical-meteorological-year-tmy-generator_en>,
  <https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/pvgis-data-download_en>). 🟢
  Bonus: pvlib.iotools spricht PVGIS direkt an
  (<https://www.sciencedirect.com/science/article/pii/S0038092X23007260>).
- **EPW-Format selbst:** offen dokumentiert
  (<https://bigladdersoftware.com/epx/docs/8-3/auxiliary-programs/energyplus-weather-file-epw-data-dictionary.html>)
  — ein eigener **TypeScript-EPW-Parser im Client** ist S-Aufwand und
  lizenzfrei; damit werden Klimadiagramme (Temperatur-Band, Windrose,
  Strahlungs-Heatmap) ohne Bridge möglich.

### 6.2 Schweiz — ehrlich, was frei ist und was nicht

- **FREI: MeteoSchweiz OGD** — seit Mai 2025 sind Mess-, Analyse- und
  Vorhersagedaten des Bundes frei zugänglich (Messreihen z.T. bis 1864);
  Downloads laufen, eine **Abfrage-API kommt erst gegen Ende 2026**
  (<https://www.meteoswiss.admin.ch/about-us/media/press-releases/2025/weather-and-climate-data-freely-available.html>,
  <https://opendatadocs.meteoswiss.ch/>). 🟢 Aufwand: M (Aufbereitung
  Rohmessdaten → simulationsfähige Jahresdatensätze ist eigene Arbeit).
- **FREI: SIA-2028-Klimaszenarien (CH2018-Basis)** — der
  MeteoSchweiz-Fachbericht und Szenariodatensätze zum zukünftigen
  Innenraumklima liegen auf opendata.swiss
  (<https://opendata.swiss/de/dataset/klimaszenarien-furs-zukunftige-innenraumklima-sia-2028>,
  <https://www.meteoschweiz.admin.ch/service-und-publikationen/publikationen/verschiedenes/2022/klimaszenarien-fuers-zukuenftige-innenraumklima-sia-2028.html>). 🟢
- **NICHT FREI: die eigentlichen SIA-2028-Stundendatensätze (DRY)** — die
  Norm-Klimadaten für Bauphysik/Energienachweis gibt es **gegen Gebühr**
  im SIA-Shop (<https://shop.sia.ch/normenwerk/architekt/2028_2010_d/D/Product>);
  als Meteonorm-Zusatzoption kosten die Schweizer Testreferenzjahre
  CHF 500 (Standardjahre) bzw. CHF 900 (alle drei Perioden)
  (<https://mn8.meteonorm.com/faq/testreferenzjahre-schweiz>). 🔴
  **Konsequenz:** KosmoSpez arbeitet v1 mit freien TMYx/PVGIS/OGD-Daten
  und deklariert im UI ehrlich: «keine SIA-2028-Normdaten — für
  Normnachweise Daten separat beschaffen». Ein Büro-Kauf der
  SIA-Datensätze bleibt möglich (Import-Slot vorsehen), aber sie dürfen
  nie mit der App weiterverteilt werden.

**Empfehlung erster Durchstich Klimadaten:** TS-EPW-Parser im Client +
PVGIS-EPW-Abruf über die Bridge; Klimadiagramm-Karte («Klimasteckbrief
Parzelle») als erstes sichtbares KosmoSpez-Ergebnis.

---

## 7 · Komfort (PMV / UTCI / SET)

### 7.1 pythermalcomfort — Empfehlung

- **Zweck:** PMV/PPD, adaptiver Komfort, SET, UTCI, Hitze-/Kälteindizes,
  Gagge- und JOS-3-Modelle — genau die Kennzahlenpalette für
  «Komfort-Ampeln» (<https://github.com/pythermalcomfort/pythermalcomfort>,
  <https://pythermalcomfort.readthedocs.io/>).
- **Reifegrad:** hoch — Center for the Built Environment (UC Berkeley),
  publiziert in SoftwareX (Tartarini/Schiavon 2020), aktiv gepflegt
  (<https://pypi.org/project/pythermalcomfort/>).
- **Sprache/Stack:** Python.
- **Lizenz:** `MIT`
  (<https://github.com/pythermalcomfort/pythermalcomfort/blob/master/LICENSE>). 🟢
- **Integrationsweg:** Python @ Bridge; frisst direkt die Zeitreihen aus
  EPW (Klimasteckbrief: UTCI-Jahreskarte des Aussenraums) und später aus
  EnergyPlus (PMV je Raum).
- **Input/Output:** Skalar-/Array-Inputs (Temperatur, Strahlung, Luftfeuchte,
  Wind, clo/met); Output Indizes. **Architektenfreundlich:**
  UTCI-Stundenraster («wann ist der Hof angenehm?»), PMV-Farbkarte je Raum.
- **Aufwand Durchstich:** **S**.

### 7.2 ladybug-comfort — ROTE FLAGGE

Folgt dem AGPL-Lizenzmuster der Ladybug-Tools-Kernbibliotheken (Beleg für
den Kern: <https://pypi.org/project/ladybug-core/>,
<https://github.com/ladybug-tools/honeybee-core>). 🔴 Nicht einbetten.

**Empfehlung erster Durchstich Komfort:** pythermalcomfort (UTCI aus EPW)
— das ist der billigste «Wow-Output» der ganzen Liste.

---

## 8 · Ehrlichkeits-/Warnkonzept (Owner-Vorgabe aus K37)

Der Owner verlangt wörtlich «mehrere sicherheitsebenen und warnrisiken …
das dieses tools nicht fachlich verifiziert sind sondern als entwurfsmittel
für den architetken dienen können/sollen». Vorschlag — drei Ebenen, die in
jedem KosmoSpez-Output leben:

1. **Ebene Kennzeichnung (immer sichtbar):** jedes Resultat trägt ein
   festes Badge «Entwurfsmittel — nicht fachlich verifiziert» plus die
   Angabe von Engine, Version, Datenquelle und Annahmen (z.B.
   «EnergyPlus 24.x · EPW: PVGIS-TMY Zürich · Ein-Zonen-Näherung»).
   Exportierte PDFs/Bilder tragen dasselbe Badge eingebrannt — analog dem
   bestehenden Wasserzeichen-Mechanismus aus Publish (Vorsicht K40:
   Blattspiegel-Wasserzeichen ist dort in Diskussion; das Spez-Badge ist
   ein anderes, fachliches Signal und bleibt).
2. **Ebene Verlässlichkeitsklasse (je Werkzeug):** jede Simulation ist als
   Klasse A/B/C deklariert — A = validierte Engine, normnaher Einsatz
   (Radiance-DF, EnergyPlus-Lasten mit echten Klimadaten); B = validierte
   Engine, vereinfachtes Modell (Ein-Zonen-Thermik, kumulative Besonnung);
   C = Näherung/Experiment (XLB-Windbild, jede GPU-Schnellschätzung).
   Klasse C erzwingt einen expliziten Bestätigungs-Dialog vor dem Export.
3. **Ebene Grenzen-Erklärung (Kosmo spricht):** Kosmo erklärt bei jedem
   Resultat in einem Satz, was das Ergebnis NICHT kann («Diese Windkarte
   ist eine Strömungsnäherung — für Windkomfort-Nachweise braucht es ein
   Fachbüro mit validierter CFD»), inklusive Hinweis, welche Fachperson
   (Bauphysiker/in, Fassadenplaner/in) den Nachweis führt. Für die
   CH-Nachweise zusätzlich der Daten-Hinweis aus 6.2 (keine
   SIA-2028-Normdaten an Bord).

Dazu gehört Prozess-Ehrlichkeit: kein Feld zeigt «berechnet», solange die
HomeStation fehlt — gleiche Regel wie beim Blender-Worker (`--fake` zeigt
offen «Fake-Modus»).

---

## 9 · Empfohlener Stack für KosmoSpez v1 (max. 3 Bausteine)

1. **Python-Leichtschicht an der Bridge: pvlib + pythermalcomfort**
   (`BSD-3-Clause` + `MIT`; ein gemeinsamer `spez-worker` nach
   Blender-Worker-Muster). Begründung: kleinste Rechenlast, null
   Lizenzrisiko, deckt sofort Sonnenstudien, Einstrahlung, Klimasteckbrief
   und Aussenkomfort (UTCI) ab — zusammen mit einem eigenen TS-EPW-Parser
   im Client entsteht daraus der erste sichtbare KosmoSpez-Nutzen in
   S/M-Aufwand.
2. **Radiance via pyradiance** (Radiance Software License 2.0, permissiv
   mit Acknowledgment-Pflicht). Begründung: die validierte Referenz-Engine
   für Tageslicht/Besonnung; pyradiance bündelt die Binaries, die Bridge
   spricht ohnehin Python; Output (DF-Raster, Lux-Overlays) ist der
   architektenfreundlichste Simulations-Output überhaupt.
3. **EnergyPlus als CLI + eppy** (BSD-3-artig + `MIT`). Begründung: ohne
   Thermik ist «Energie- und Klimadesign» nicht glaubwürdig; EnergyPlus
   ist permissiv, CLI-fähig und der einzige Kandidat mit Weltstandard-
   Status. Bewusst als Ein-Zonen-Durchstich beginnen (Klasse B im
   Warnkonzept), Mehrzonen-Ausbau folgt der K21-Bauteilsemantik.

**Bewusst NICHT in v1:** Wind-CFD (Rechenlast + Verlässlichkeit, siehe 5;
v1 zeigt Windrose/Kennwerte aus Klimadaten, XLB-Näherung ist der erste
v2-Kandidat) und alles aus dem Ladybug-/Honeybee-Kern (AGPL) sowie
butterfly (GPL) — Konzept-Referenz ja, Code nein.

---

*Belege: alle URLs inline; Recherche-Stand 21.07.2026. Nächste Schritte
K37a/c (Konzept + ZIP/ClaudeDesign-Prompt) bauen auf Abschnitt 9 auf;
K37d wartet auf Rückfrage R5 (OneDrive-Zugang).*
