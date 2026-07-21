# KosmoSpez — Konzept für das achte Haupttool (K37a)

> **Auftrag:** Owner-Korrekturen-Register `docs/OWNER-KORREKTUREN-2026-07.md`,
> K37 (S.15), Teilauftrag (a): «mach mir bitte dafür eine saubere grundlage» —
> Konzept und Framework für das neue Haupttool **KosmoSpez**
> (Energie-/Klimadesign, Sonnenstudien, Aussenkomfort, Tageslicht, Thermik),
> «natürlich auch mit insel logik».
>
> **Datum:** 21.07.2026 · **Ebene:** Konzept — dieses Dokument erfindet
> keine Kernel-Details; jede Implementationsentscheidung unterhalb der
> Vertragsebene fällt erst in der jeweiligen Etappen-Spez (Muster
> `docs/V08x-SPEZ.md`).
>
> **Quellen:** `docs/KOSMOSPEZ-OSS-RECHERCHE.md` (K37b, Lizenz- und
> Stack-Wahrheit — hier per §-Nummer referenziert), `docs/ISLAND-UI-SPEZ.md`
> (Insel-Grammatik, 4-Stufen-Modell), `docs/GESTALTUNGSKONZEPT.md`
> (Werkplan-Ästhetik), `CLAUDE.md` (alles ist ein Command; Bridge-Muster),
> `packages/kosmo-contracts/src/render-scene.ts` (Contract-Vorbild).
>
> **Schwester-Dokument:** `docs/KOSMOSPEZ-CLAUDEDESIGN-PROMPT.md` (K37c,
> UI-Sprache — geht 1:1 an ClaudeDesign).

---

## a · Zweck und Leitbild

**Kosmo wird der Spezialist — der Architekt bleibt Entwerfer.**

KosmoSpez ist die Station für alles, was in der Architekturbranche
Spezialistenwissen ist: Energie- und Klimadesign, Sonnenstudien,
Tageslicht, Aussenraumkomfort, thermisches Verhalten — später Wind und
weitere physikalische Studien. Der Architekt formuliert eine Entwurfsfrage
(«bekommt der Hof im Winter Sonne?», «überhitzt das Eckzimmer?»); Kosmo
übersetzt sie in Simulationen, führt sie über die HomeStation aus und
antwortet **architektenfreundlich**: als Karte, Overlay oder Kennwert auf
dem eigenen Modell — nie als Rohdaten-Tabelle.

Drei Leitsätze, direkt aus dem Owner-Auftrag (K37):

1. **Fast per Knopfdruck.** Simulationen laufen automatisiert und mit
   Kosmo-Intelligenz; der Architekt stellt Fragen, keine Solver-Parameter.
2. **Entwurfsmittel, nicht Nachweis.** Das Gebiet ist heikel — der Owner
   ist Architekt, nicht Bauphysiker. Jedes Resultat trägt das
   Ehrlichkeits-Badge (Abschnitt e); KosmoSpez ersetzt kein Fachbüro und
   behauptet das auch nirgends.
3. **Das technischste Tool bleibt das ehrlichste.** Kein Feld zeigt
   «berechnet», solange die HomeStation fehlt — dieselbe Regel wie beim
   Blender-Worker (`--fake` zeigt offen «Fake-Modus», Recherche §8).

---

## b · Werkzeug-Inventar v1

Der v1-Umfang folgt exakt dem empfohlenen Stack der OSS-Recherche §9
(pvlib + pythermalcomfort als Bridge-Leichtschicht, Radiance via
pyradiance, EnergyPlus + eppy) plus dem eigenen TS-EPW-Parser im Client
(Recherche §6.1). **Bewusst NICHT in v1:** Wind-CFD (Recherche §5/§9 —
v1 zeigt nur Windrose/Kennwerte aus Klimadaten, ehrlich beschriftet) und
alles aus dem AGPL-/GPL-Umfeld (Ladybug/Honeybee/butterfly — Konzept-
Referenz ja, Code nein, Recherche §2.3/§3.3/§5.2).

Jedes Werkzeug in derselben Dreiteilung: **Input aus dem Doc → Rechenweg
→ Output für Architekten.** «@ Bridge» heisst: neuer zod-Contract in
`packages/kosmo-contracts` nach dem `render-scene/v1`-Muster, Ausführung
auf der HomeStation, `--fake`-Modus im Container (Abschnitt f).

### b1 · Sonnenstudie (Besonnung/Verschattung)

| | |
|---|---|
| **Input aus dem Doc** | Geometrie aus `derive/scene` (Baukörper + Nachbarkontext), Standort (Lat/Lon aus den Projekt-Stammdaten), Datum/Zeitraum; Klimadatei (EPW) für Einstrahlung |
| **Rechenweg** | Zweistufig. Sofort im Client: Sonnenstand/-bahn und Echtzeit-Schattenwurf über das vorhandene SunCalc (Recherche §2, bereits im Repo). Belastbar @ Bridge: pvlib (BSD-3-Clause) für Einstrahlung auf beliebig geneigte Flächen aus EPW (Recherche §2.1); kumulative Sonnenstunden auf Fassaden später über Radiance (Recherche §2.2/§3.1) |
| **Output** | Sonnenstunden-Heatmap auf Fassade und Grundriss (derive-Muster wie Plan/Axo), Sonnenbahn-Diagramm über dem Modell, Jahres-Stundenraster; Kennwert «Besonnungsdauer 21.12.» je Fassade |
| **Verlässlichkeit** | Klasse B (Client-Sonnenstand: geometrisch exakt, Einstrahlung: validierte Engine, vereinfachtes Modell — Recherche §8.2) |

### b2 · Klimasteckbrief Parzelle

| | |
|---|---|
| **Input aus dem Doc** | Standort aus den Projekt-Stammdaten; EPW-Datei (PVGIS-Abruf via Bridge oder lokaler Import; freie Quellen und CH-Lage: Recherche §6.1/§6.2) |
| **Rechenweg** | Eigener TS-EPW-Parser im Client (S-Aufwand, lizenzfrei, Recherche §6.1) — der Steckbrief braucht KEINE HomeStation; PVGIS-EPW-Abruf läuft über die Bridge (pvlib.iotools, Recherche §2.1/§6.1) |
| **Output** | Eine Steckbrief-Karte je Parzelle: Temperatur-Jahresband, Windrose, Strahlungs-Heatmap, Niederschlag/Feuchte-Kennwerte — das erste sichtbare KosmoSpez-Ergebnis (Recherche §6-Empfehlung) |
| **Verlässlichkeit** | Klasse A für die Daten selbst (Messdaten/TMY), mit Pflicht-Hinweis «keine SIA-2028-Normdaten — für Normnachweise Daten separat beschaffen» (Recherche §6.2) |

### b3 · Aussenkomfort (UTCI)

| | |
|---|---|
| **Input aus dem Doc** | EPW-Zeitreihen (wie b2); optional Verschattungsmaske aus b1 für «Hof im Schatten»-Varianten |
| **Rechenweg** | pythermalcomfort (MIT) @ Bridge — UTCI direkt aus EPW-Zeitreihen (Recherche §7.1: «der billigste Wow-Output der ganzen Liste») |
| **Output** | UTCI-Stundenraster («wann ist der Hof angenehm?») als Jahreskarte mit Komfort-Skala; Vergleich zweier Aussenräume nebeneinander |
| **Verlässlichkeit** | Klasse B (validierter Index, aber Mikroklima-Vereinfachung: Wind/Strahlung aus der Wetterstation, nicht aus dem Quartier) |

### b4 · Tageslicht-Falschfarben (DF/Lux)

| | |
|---|---|
| **Input aus dem Doc** | Raumgeometrie + Öffnungen aus `derive/scene` (Export als `.rad`), Himmelsmodell aus EPW (gendaylit); Raster-Messebene je Raum |
| **Rechenweg** | Radiance via pyradiance @ Bridge (Radiance Software License 2.0, Acknowledgment-Pflicht in Doku/About — Recherche §3.1/§3.2); pyradiance bündelt die Binaries, kein separates Setup |
| **Output** | Falschfarben-Lux-Overlay auf dem Grundriss, Tageslichtfaktor-Raster je Raum, «Tageslicht-Ampel» je Zone (Recherche §3.1) |
| **Verlässlichkeit** | Klasse A bei DF mit Standard-Himmel (validierte Referenz-Engine, normnaher Einsatz — Recherche §8.2), Klasse B bei vereinfachter Möblierung/Materialannahme |

### b5 · Ein-Zonen-Thermik

| | |
|---|---|
| **Input aus dem Doc** | EIN Raum/eine Zone aus den Zonen-Entities, Hüllflächen + Fensteranteile aus dem Doc (später verfeinert über die K21-Fenstersemantik), EPW |
| **Rechenweg** | EnergyPlus als CLI @ Bridge (BSD-3-artig), IDF-Erzeugung über eppy (MIT) — bewusst als Ein-Zonen-Durchstich (Recherche §4.1/§9.3: Ein-Zonen-Box ist M, Mehrzonen ehrlich L) |
| **Output** | Monats-Balken Heiz-/Kühlbedarf, Überhitzungsstunden als Farbkarte auf dem Grundriss, «Was-wäre-wenn»-Vergleichskarten (Fensteranteil, Dämmstärke — Recherche §4.1) |
| **Verlässlichkeit** | Klasse B (validierte Engine, Ein-Zonen-Näherung — explizit so im Badge deklariert, Recherche §8.2/§9.3) |

### b6 · Wind-Kennwerte (bewusste v1-Grenze, kein Simulationswerkzeug)

Windrose + Standort-Kennwerte aus den Klimadaten (Teil von b2), ehrlich
beschriftet «aus Wetterstationsdaten — keine Strömungssimulation».
CFD (XLB als Klasse-C-Näherung, OpenFOAM als Ausbaustufe) ist erster
v2-Kandidat (Recherche §5-Empfehlung/§9).

---

## c · Insel-Schnitt (Owner-Pflicht: Insellogik)

KosmoSpez übernimmt die verbindliche Insel-Grammatik aus
`docs/ISLAND-UI-SPEZ.md` §2 — *«Erzeugen links · Sehen oben · Prüfen
rechts · Übergeben unten»*, vier Pills an den Rändern, 4-Stufen-Modell
(Pill → Leiste → Mini-Popup → Einstellungsfenster, KEIN Werkzeug endet
bei Stufe 1), Stationen-Orb oben links, Kosmo-Orb unten rechts. Ein
Werkzeug gehört in genau eine Insel.

| Insel | Rand | Werkzeuge (v1) | Logik |
|---|---|---|---|
| **STUDIE** | links | Sonnenstudie (b1) · Klimasteckbrief (b2) · Aussenkomfort (b3) · Tageslicht (b4) · Thermik (b5) | Erzeugt Ergebnisse: jedes Werkzeug stösst eine Studie an (Stufe 2 = 2–4 Kernparameter wie Datum/Raum/Zeitraum, Stufe 3 = alle Annahmen + Datenquelle) |
| **DARSTELLUNG** | oben | Overlay-Wahl (welche Studie liegt auf dem Modell) · Falschfarben-Skala (Bereich/Stufen/Einheit) · Zeitpunkt/Zeitraum-Regler · Vergleich A/B (zwei Stände nebeneinander) | Ändert die Darstellung, nie Modell oder Ergebnis |
| **BEFUND** | rechts | Ergebnisliste (alle Studien des Projekts, mit Klasse A/B/C) · Annahmen & Datenquellen (Engine, Version, EPW-Herkunft) · Grenzen (Kosmos Grenzen-Erklärung, Abschnitt e3) · Kennwerte (Kernzahlen je Studie) | Liest/prüft: hier lebt die Ehrlichkeit — Verlässlichkeit ist ein eigenes Werkzeug, kein Kleingedrucktes |
| **AUSTAUSCH** | unten | Export (PDF/PNG mit eingebranntem Badge) · Klimadaten-Import (EPW laden, SIA-2028-Import-Slot — nie mitverteilen, Recherche §6.2) · HomeStation (Bridge-Status, Job-Queue, ehrlicher Fake-Hinweis) · Manuell (klassische Ansicht, K15-Regel: gilt für ALLE Stationen) | Verlässt/betritt die Station |

Total v1: **13 Werkzeuge** (5+4+4, plus Manuell in AUSTAUSCH). Die
Windrose ist Teil des Klimasteckbriefs, kein eigenes Insel-Werkzeug —
erst ein echtes Windwerkzeug (v2) bekäme einen eigenen Platz in STUDIE.

**Abgrenzung zum Sonne-Werkzeug der Design-Station:** das bestehende
«Sonne»-Werkzeug der ANSICHT-Insel in KosmoDesign (Datum/Zeit/Schatten,
ISLAND-UI-SPEZ §3.2) bleibt der schnelle Entwurfs-Schalter beim
Zeichnen. Die KosmoSpez-Sonnenstudie ist die dokumentierte Studie mit
Ergebnis-Karte und Badge. Gleiches Modell, zwei Rollen — Doppelspurigkeit
ist Owner-Frage h4.

---

## d · Kosmo-Rolle

**Natürlichsprachliche Aufträge → Commands.** Es gilt das Kernprinzip aus
`CLAUDE.md`: alles ist ein Command; jedes zod-Schema wird über
`commandTools()` automatisch ein Kosmo-LLM-Tool. Die `spez.*`-Commands
(Abschnitt f) sind damit ohne Zusatzarbeit Kosmos Werkzeugkasten:
«Kosmo, bekommt der Hof am 21. Dezember Sonne?» → Kosmo wählt
`spez.sonnenstudie`, setzt Datum und Zielfläche, startet den Job und
erklärt das Ergebnis. Schreibende Vorschläge laufen als Diff-Karten durch
denselben `runCommand`-Weg wie überall.

Kosmos drei Aufgaben in KosmoSpez:

1. **Übersetzer:** Entwurfsfrage → Werkzeug + Parameter + Datenquelle
   (inkl. Rückfrage, wenn die Frage unterbestimmt ist — Karten-Muster K49).
2. **Erklärer:** jedes Ergebnis in Architektensprache zusammenfassen, mit
   dem Pflicht-Grenzen-Satz (Abschnitt e3).
3. **Automatisierer:** wiederkehrende Studienpakete («bei jedem
   Variantenwechsel Klimasteckbrief + Besonnung neu») als Abläufe führen.

**Spezialwissen-Aufbau (K37d) — späterer Geräte-Posten.** Der Owner will,
dass Kosmo über die ETH-Unterlagen «Energie- und Klimadesign 1+2»
(OneDrive, Master ETH Architektur) zum Fachspezialisten wird —
Erfassung/Analyse der Vorlesungsunterlagen und Aufnahme in die
LoRA-Wissensbasis auf der HomeStation (Muster `docs/LORA-KONZEPT.md`,
Contract `lora-train`). Das ist bewusst KEIN v1-Blocker: die
v1-Werkzeuge rechnen mit validierten Engines und brauchen kein
trainiertes Modell. Der Posten wartet auf **Rückfrage R5**
(OneDrive-Freigabe oder ZIP-Export, siehe Register) und läuft dann als
eigener Geräte-/Trainings-Posten auf dem HomePC. Bis dahin gilt: Kosmo
argumentiert nur mit dem, was Engine und Datenquelle hergeben — kein
vorgetäuschtes Fachwissen.

---

## e · Ehrlichkeits-/Warnkonzept (UI-Pflicht)

Übernahme des dreistufigen Konzepts aus der OSS-Recherche §8 — hier als
**verbindliche UI-Pflicht** für jede Etappe (E1-Bestandteil, nicht
Politur am Schluss):

1. **Badge (immer sichtbar):** jedes Resultat — auf dem Bildschirm UND in
   jedem Export eingebrannt — trägt «**Entwurfsmittel — nicht fachlich
   verifiziert**» plus Engine, Version, Datenquelle und Annahmen (z.B.
   «EnergyPlus 24.x · EPW: PVGIS-TMY Zürich · Ein-Zonen-Näherung»).
   Abgrenzung zu K40: das Spez-Badge ist ein fachliches Signal, kein
   Blattspiegel-Wasserzeichen — es bleibt, unabhängig vom K40-Entscheid
   (Recherche §8.1).
2. **Verlässlichkeitsklassen A/B/C (je Werkzeug deklariert):**
   A = validierte Engine, normnaher Einsatz · B = validierte Engine,
   vereinfachtes Modell · C = Näherung/Experiment. Klasse C erzwingt
   einen Bestätigungs-Dialog vor dem Export (Recherche §8.2). Die
   v1-Zuordnung steht je Werkzeug in Abschnitt b; die Klasse ist in der
   BEFUND-Insel ein eigenes, sichtbares Werkzeug — kein Tooltip.
3. **Grenzen-Erklärung (Kosmo spricht):** zu jedem Resultat ein Satz, was
   es NICHT kann, inkl. Nennung der zuständigen Fachperson
   (Bauphysiker/in, Fassadenplaner/in) und — für CH-Nachweise — dem
   Hinweis «keine SIA-2028-Normdaten an Bord» (Recherche §8.3/§6.2).

Dazu Prozess-Ehrlichkeit (Recherche §8, Schluss): kein «berechnet» ohne
HomeStation; der Fake-Modus der Bridge zeigt sich offen als Fake-Modus.

---

## f · Architektur-Einbettung

Konzept-Ebene — Verträge und Orte, keine Kernel-Details:

- **Neue Station `spez`** neben design/vis/publish/prepare/data:
  `apps/kosmo-orbit/src/modules/spez/` nach dem bestehenden
  Stationen-Muster; Aufnahme in Stationen-Orb und Modulliste. Die Station
  ist Insel-first (Abschnitt c) mit Manuell-Schalter (K15-Regel).
- **Commands `spez.*`** in `packages/kosmo-kernel/src/commands/`
  (registerCommand mit zod-Schema, `summarize`, `run` → `AnyPatch[]`) —
  eine Command-Familie je Werkzeug (b1–b5) plus Darstellungs-Commands
  für die DARSTELLUNG-Insel. Damit sind Undo, Yjs-Sync, `.kosmo`-Pakete
  und die Kosmo-Tool-Ableitung geschenkt. Welche Ergebnisse ins Doc
  gehören (Studien-Definition, Kennwerte) und was Laufzeit bleibt
  (Raster-Bilder, Job-Status — Regel «Laufzeit ≠ Modell», CLAUDE.md),
  entscheidet die E1-Spez.
- **Contracts-Erweiterung** in `packages/kosmo-contracts` nach dem
  `render-scene/v1`-Vorbild (zod, `schema`-Literal mit Version, Defaults,
  non-strict für additive Erweiterung): je ein Vertrag pro Rechenweg —
  Arbeits-Titel `spez-klima/v1` (pvlib + pythermalcomfort, ein
  gemeinsamer Leichtschicht-Job, Recherche §9.1), `spez-tageslicht/v1`
  (pyradiance, Recherche §9.2), `spez-thermik/v1` (EnergyPlus + eppy,
  Recherche §9.3). Endgültige Schnitte und Felder definiert die
  jeweilige Etappen-Spez.
- **Bridge-Erweiterung** in `tools/homestation-bridge/kosmo_bridge/`:
  ein `spez_worker` nach dem `blender_worker`-Muster — inklusive
  `--fake`-Modus für Container/E2E und Lizenz-/Acknowledgment-Pflege
  (Radiance-Acknowledgment in Doku/About, Recherche §3.1; bestehendes
  `lizenz.py` als Anknüpfpunkt).
- **Klimadaten im Client:** TS-EPW-Parser als eigenes, bridge-freies
  Modul (Recherche §6.1) — der Klimasteckbrief funktioniert damit auch
  ohne HomeStation; nur der PVGIS-Abruf braucht die Bridge.
- **Nicht verteilen:** SIA-2028-Datensätze (Import-Slot ja, Bundling
  nie — Recherche §6.2); OpenFOAM-Binaries (falls v2, Setup-Skript auf
  der HomeStation statt Installer — Recherche §5.1).

---

## g · Etappierung E1–E4

Aufwandsklassen wie im Register: S (< 1 Paket) · M (1 Paket) ·
L (mehrere Pakete) · XL (eigener Versions-Strang). K37 gesamt bleibt XL;
die Etappen sind vertikale Schnitte — jede endet mit einem sichtbaren,
ehrlichen Ergebnis.

| Etappe | Inhalt | Aufwand |
|---|---|---|
| **E1 — Station + Klimasteckbrief** | Station `spez` mit Insel-Gerüst (4 Inseln, 4 Stufen), TS-EPW-Parser im Client, Klimasteckbrief-Karte (b2) mit Windrose; Badge + Klassen-Anzeige von Anfang an (Abschnitt e als E1-Gate); Sonnenstand/-bahn client-seitig (SunCalc, b1-Sofortteil) | **M** |
| **E2 — Bridge-Leichtschicht** | Contract `spez-klima/v1` + `spez_worker` (pvlib + pythermalcomfort, Recherche §9.1), PVGIS-EPW-Abruf, Einstrahlungs-Heatmap (b1 belastbar), UTCI-Jahreskarte (b3); `--fake`-Modus + E2E | **M** |
| **E3 — Tageslicht** | Contract `spez-tageslicht/v1`, `.rad`-Export aus `derive/scene`, DF-Raster + Falschfarben-Overlay für einen Raum (b4); Radiance-Acknowledgment (Recherche §3.1) | **M/L** |
| **E4 — Thermik-Durchstich** | Contract `spez-thermik/v1`, Ein-Zonen-IDF via eppy, Monats-Balken + Überhitzungs-Farbkarte (b5), Was-wäre-wenn-Vergleich | **L** |

**Nach v1 (bewusst ausserhalb):** Wind-Näherung XLB als Klasse C
(M/L, Recherche §5.3), OpenFOAM-Ausbaustufe (L, §5.1), Mehrzonen-Thermik
entlang der K21-Bauteilsemantik (L), LoRA-Spezialwissen K37d (nach R5,
eigener Geräte-Posten, Abschnitt d), ClaudeDesign-UI-Sprache einarbeiten
(nach Owner-Lieferung, analog K8-Vorrangregel).

---

## h · Offene Owner-Fragen

1. **(= R5 im Register)** ETH-Unterlagen «Energie- und Klimadesign 1+2»:
   OneDrive-Freigabe-Link oder ZIP-Export-Upload — was ist dir lieber?
2. **Insel-Schnitt bestätigen:** STUDIE / DARSTELLUNG / BEFUND /
   AUSTAUSCH (Abschnitt c) — trägt diese Vier-Teilung, oder willst du
   einen anderen Schnitt (z.B. Klimadaten als eigene Insel)?
3. **Priorität E3 vs. E4:** Tageslicht vor Thermik (vorgeschlagen, weil
   der Output der architektenfreundlichste ist — Recherche §9.2), oder
   Thermik zuerst?
4. **Sonne doppelt:** das schnelle Sonne-Werkzeug in KosmoDesign bleibt
   neben der KosmoSpez-Sonnenstudie bestehen (Abschnitt c, Abgrenzung) —
   einverstanden, oder soll Design künftig in die Spez-Studie verlinken?
5. **SIA-2028-Kauf:** soll das Büro die SIA-Normklimadaten beschaffen
   (CHF 500–900, Recherche §6.2)? Der Import-Slot kommt so oder so;
   ohne Kauf bleibt der Pflicht-Hinweis «keine Normdaten» stehen.
6. **Badge-Wortlaut:** «Entwurfsmittel — nicht fachlich verifiziert» —
   passt dieser Wortlaut für Bildschirm UND Export, auch gegenüber
   Bauherren?
7. **Stationsfarbe/Name:** die Stationen tragen je einen Farb-Punkt
   (Design #74C2A0, Data #B08A6E, Vis #CD7670, Prepare #CF9466,
   Publish #6F9BCF) — die KosmoSpez-Farbe wird mit ClaudeDesign bestimmt
   (Frage 1 im Prompt-Dokument). Bleibt es beim Namen «KosmoSpez»?

---

*K37a — Stand 21.07.2026. Rechenwege und Lizenzampeln:
`docs/KOSMOSPEZ-OSS-RECHERCHE.md`; UI-Sprache: ClaudeDesign-Prompt in
`docs/KOSMOSPEZ-CLAUDEDESIGN-PROMPT.md`; Umsetzung je Etappe erst nach
eigener Spez (Muster `docs/tiefplanung`-Skill / V08x-SPEZ).*
