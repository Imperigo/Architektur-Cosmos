# 0.9er-Serie — Fahrplan 0.9.3–0.9.10 + Platzhalter bis 0.9.50

> **Owner-Entscheide 23.07.2026** (drei AskUserQuestion-Runden, 12 Fragen —
> bindend): (1) Reihenfolge 0.9.3–0.9.6 = Detail → Bemassung → Fassade →
> SEO. (2) Alle 8 Zusatzthemen in 0.9.7–0.9.10, Paarung wie unten.
> (3) Claude-Abo-Fix (lokale claude-CLI als Motor) noch in 0.9.2.
> (4) Kosmo-Kachel auf Home entfällt — der Orb rechts unten übernimmt die
> 8 Unter-Stationen per Menü. (5) Grosse Versionen ok (2–3 Arbeitstage).
> (6) KosmoSpez wird NEUE Station (0.9.9). (7) Listen 0.9.7: alle vier.
> (8) Gelände 0.9.8: manuell UND swisstopo. (9) Deutsche Namen für jede
> Version. (10) HomeStation-Versionen mit Fallbacks (Fake/Cloud-Wege;
> RTX-5090-Anbindung zuschaltbar, sobald der Home-PC bereit ist).
> Serienrahmen (Owner): Serie läuft lang — «sicherlich bis z.B. 0.9.50»,
> v1.0 erst in ~einem Monat.

## Feste Regeln über die ganze Serie

Genau EIN deklarierter Golden-Zug (GZ) pro Version (Golden-Beweger nach
089-Regime mit Erwartungsliste; Versionen ohne GZ sind erlaubt) ·
release-gate light + E2E nur der angefassten Bereiche (Voll-E2E/Installer
erst v1.0, `../../STAND.md`) · laufendes Owner-Feedback wird im jeweils
offenen Versions-Batch miterledigt (stehende Regel 23.07.) ·
Beschnitt-Sonde ab 0.9.3 fester Gate-Schritt · Fable = Urteil/Spez/Gates/
Goldens/Commits, Sonnet = Ausführung in disjunkten Dateikreisen · je
Version ein W0 mit Owner-Entscheiden.

## Versionen 0.9.3–0.9.10

**v0.9.3 «Detailtreu»** — Detail v2 + Treppe/Geländer-Vollausbau
- Detail v2: Zeichnen im Ausschnitt (2D-Primitive im Detail-Kontext),
  Detail-Marker-Symbol im Druck (**GZ**, seit 0.9.2 deklariert),
  Marker-Griffe/hit-test, Editier-UI name/massstab.
- Treppen-Vollausbau: L-/U-Läufe, Podeste (Wendelung nur bei vertretbarem
  Zerlegungsaufwand — sonst ehrlich in einen Platzhalter-Slot);
  Bestands-Fixtures bleiben gerade Läufe → Goldens byte-still (Daten-Guard).
- Assoziatives Geländer AUF Treppe/Rampe (Bauteil-Bindung; ohne
  Bindungs-Feld exakt heutiges Verhalten — Golden-Guard).

**v0.9.4 «Kotenfest»** — Bemassungs-Vollausbau + Normprofile
- Höhenkoten im Grundriss + Winkel-/Radialmass (**GZ**: Koten/Winkel im
  Druckweg, Masskette-Grammatik).
- Normprofil-Katalog HEA/HEB/IPE/UNP als Datenposten für den
  Profil-Manager (Daten + Auswahl-UI, Goldens 0).

**v0.9.5 «Rasterklar»** — Fassade v2
- Echtes Pfosten/Riegel-Raster mit Paneel-Typen auf der
  Curtain-Wall-v1-Basis (**GZ**: Fassadendarstellung Plan/Schnitt).

**v0.9.6 «Durchdrungen»** — Solid-Operationen (SEO)
- Boolesches Abziehen/Verschneiden zwischen Bauteilen; GZ-Zuschnitt beim
  W0 (vermutlich Schnitt-Darstellung verschnittener Bauteile).

**v0.9.7 «Aufgelistet»** — Listen & Raumbuch + iPad/Touch
- Türliste, Fensterliste, Raumbuch (aus Zonen), Bauteilliste/Mengen+ —
  als druckbare Blätter (**GZ**: Listen-Blattdarstellung; voraussichtlich
  nur NEUE Goldens, 0 bewegte).
- iPad & Touch-Polish (Inseln/Griffe; gerätefreie Anteile zuerst,
  Hardware-Beweise ehrlich markiert).

**v0.9.8 «Geerdet»** — Gelände & Umgebung + Vis/Render
- Terrain-Werkzeug: manuelle Höhenpunkte UND swisstopo-Höhenmodell am
  gesetzten Standort (passt zur Standort/ÖREB-Anbindung), Baugrube,
  Gelände im Schnitt (**GZ**: Gelände in Plan/Schnitt).
- Vis/Render-Vertiefung MIT Fallback (Fake-Bridge/Cloud; 5090-Weg
  zuschaltbar — Owner-Entscheid 10).

**v0.9.9 «Sonnenklar»** — Station KosmoSpez + Kosmo-KI
- NEUE Station KosmoSpez: Sonnenstudien (Sonnenstand/Verschattung übers
  Jahr am Standort) als erster Nachweis-Baustein.
- Kosmo-KI-Vertiefung: Autopilot-Ausbau, lokale Modell-Staffelung mit
  Fallback. GZ voraussichtlich KEINER (Bildschirm/Report) — W0 entscheidet.

**v0.9.10 «Angebunden»** — Interop + Team
- IFC/DWG-Import-Vertiefung (IFC-Rundlauf, DWG als Zeichnungsunterlage).
- Team & Sync: Mehrbenutzer-Härtung (gleichzeitig zeichnen,
  Konfliktverhalten, Rechte). GZ voraussichtlich KEINER (Guards).

## IDC-Nachbau-Welle 0.9.11–0.9.30 (Owner-Auftrag 23.07.: «alles nur
## umsetzung der tools von der idc academy»)

Quelle: `../wissen/training/idc-academy/archicad-lernpfade.md` (öffentliche
Struktur der 12 Lernpfade, 111 eindeutige Module, erfasst 22.07.) — die
Modul-Detailseiten sind LOGIN-GESCHÜTZT. Darum gilt für JEDE Version
dieser Welle der **Platzhalter «Übungstiefe: Home-PC»**: die Feinspez je
Posten wird beim W0 aus der Home-PC-Erfassung nachgeschärft
(`../docs/HOMEPC-KOSMOTRAIN-PROMPT.md` Teil A — eigene Worte, keine
Inhalts-Rekonstruktion vorher; bis dahin tragen nur die öffentlichen
Titel/Kurzbeschreibungen die Richtung). Nicht gedoppelt wird, was
0.9.1–0.9.10 schon baut (Geländer/Rampe-Basis, Profil-Manager, Detail
v1+v2, Treppen-Vollausbau, assoziatives Geländer, Höhenkoten, Normprofile,
Fassade v2, SEO, Listen, Freifläche/Gelände, Sonnenstudie, DWG/IFC,
Vis-Basis). Golden-Züge (GZ) je Version beim W0 final.

- **0.9.11 «Zugriffig»** — Bearbeitungshilfen I: Pipette/Spritze
  (Element-Einstellungen aufnehmen/übergeben) · Zauberstab
  (Kontur-Übernahme von Bestandsgeometrie beim Zeichnen) · Suchen &
  aktivieren (Kriterien-Suche → Auswahl). GZ: keiner. Übungstiefe: Home-PC.
- **0.9.12 «Umrissen»** — Bearbeitungshilfen II: Markierungsrahmen
  (geschossübergreifende Rahmen-Auswahl inkl. 3D-Ausschnitt) ·
  Transparentpause (Projektsicht transparent hinterlegen) · Gruppieren.
  GZ: keiner. Übungstiefe: Home-PC.
- **0.9.13 «Zugeschnitten»** — Konstruktionshilfen I: Schere/Verbinden/
  Anpassen (Trimmen) · Splitten (mehrere Sichten) · Abrunden/Abschrägen.
  GZ: keiner. Übungstiefe: Home-PC.
- **0.9.14 «Versetzt»** — Konstruktionshilfen II: Versatz/mehrfacher
  Versatz (Polylinien-Offsets) · Ausrichten/Verteilen · Grössenänderung
  (grafisch+numerisch) · Strecken mit Markierungsrahmen/Stossen.
  GZ: keiner. Übungstiefe: Home-PC.
- **0.9.15 «Fangfest»** — Präzision: Abstandshilfe (Pop-up-Hilfslinien) ·
  Achsen-fixieren/Fangpunkte-Vertiefung · Vereinigen/Zerlegen von
  Polylinien. GZ: keiner. Übungstiefe: Home-PC.
- **0.9.16 «Wendelsicher»** — Treppen-Spezialisierung I: die drei
  Wendungstypen mit Optionen · «verschiedene Formen» inkl. Lösungen für
  nicht generierbare Treppen · nachträgliche Bearbeitung
  (Bearbeitungsmodus am Bestand). Baut auf 0.9.3. GZ: keiner.
  Übungstiefe: Home-PC.
- **0.9.17 «Treppenfein»** — Treppen-Spezialisierung II: Traggerüste
  massiv/Holm/Kragarm/Wangen · Tritt-/Setzstufen-Bekleidung ·
  Treppen-Plandarstellung (Symbolbestandteile). GZ: voraussichtlich
  Treppen-Plandarstellung im Druck. Übungstiefe: Home-PC.
- **0.9.18 «Geländerfein»** — Geländer-Spezialisierung: Musterverteilung ·
  Verbindungen/Enden je Handlauf/Gurt · Handlauf mehrfach pro Geländer ·
  Geländer+Profil-Manager (eigene Profile für Pfosten/Handlauf/Gurt).
  GZ: keiner. Übungstiefe: Home-PC.
- **0.9.19 «Paneelfrei»** — Fassade-Tiefe: gedreht/geneigt/gebogen direkt
  im 3D · eigene Fassadenpaneele · erweiterte Bearbeitung/Zubehör ·
  Fassaden-Darstellung (Hybrid-Grundriss). GZ: voraussichtlich
  Fassaden-Grundrissdarstellung. Übungstiefe: Home-PC.
- **0.9.20 «Kurvengängig»** — Rampen-Kurven (swissTools-Vorbild):
  90°-Kurve + S-Kurve normorientiert · Bodenplatte mit Gefälle ·
  Tiefgaragen-Erschliessung als Workflow-Beweis. GZ: Rampen-Kurven im
  Plan. Übungstiefe: Home-PC.
- **0.9.21 «Ausschnittklar»** — Ausschnitt-Konfiguration I: gespeicherte
  Ansichten mit echter Einstellungsebene (Zoom, Massstab, Ebenen,
  Stift-Set je Ausschnitt statt global). GZ: W0. Übungstiefe: Home-PC.
- **0.9.22 «Überschrieben»** — Ausschnitt II: Modelldarstellung ·
  Strukturdarstellung · Grafische Überschreibungen (Eigenschaft →
  visuelle Hervorhebung). GZ: W0 (Druck-Überschreibungen wären einer).
  Übungstiefe: Home-PC.
- **0.9.23 «Schnittscharf»** — Ausschnitt III: Umbaufilter je Ausschnitt ·
  Variantenplanung je Ausschnitt · Grundriss-Schnittebene einstellbar
  (**GZ**: die Schnittebene bewegt den Grundriss-Druck — deklarierter
  Golden-Beweger mit Erwartungsliste). Übungstiefe: Home-PC.
- **0.9.24 «Stapelweise»** — Publisher: PDF/DWG/Druck als Publisher-Sets
  (Stapel-Export ganzer Mappen) · Layoutbuch-/Organisations-Vertiefung
  (Projektmappe/Ausschnittmappe-Parität). GZ: keiner. Übungstiefe: Home-PC.
- **0.9.25 «Etikettiert»** — Beschriftung: intelligentes Etiketten-
  Werkzeug (liest Elementinfos) · Beschriftungsboxen (swissTools-Vorbild)
  · Text-Vertiefung. GZ: Etiketten im Druck. Übungstiefe: Home-PC.
- **0.9.26 «Nachgeführt»** — Detail-Workflow-Rest: Detail erweitern
  (Linien-Ausarbeitung/Dichtungsbahnen im Detail-Kontext, baut auf 0.9.3)
  · Detail als DWG/DXF einlesen (Fachplaner-Detail) · Tekturblatt
  (Abdeck-Mechanismus über 3D-Ableitungen). GZ: W0. Übungstiefe: Home-PC.
- **0.9.27 «Stempelecht»** — Raumstempel & Materialien (Zonen-Stempel mit
  Eigenschaften) · 3D-Dokument (Markierungsrahmen → beschriftbare
  3D-Ansicht als Dokument). GZ: W0 (Raumstempel im Druck wäre einer).
  Übungstiefe: Home-PC.
- **0.9.28 «Öffnungsklar»** — Öffnungs-/Fenster-/Tür-Tiefe: Grundlagen
  Öffnungs-Werkzeug (Durchbrüche) · Fenster-Werkzeug detailliert ·
  Türe/mehrschichtiges Bauteil (Boden-Durchlauf) ·
  Auswertung-Formatierung (baut auf 0.9.7). GZ: W0. Übungstiefe: Home-PC.
- **0.9.29 «Stofflich»** — Vis-Material-Tiefe: Materialkanäle
  (Bump/Diffusion) für Holz/Beton/Glas/Asphalt/Rasen im
  Node-Graph/Blender-Weg · Kamera-aussen/Szenen-Vertiefung. GZ: keiner.
  Übungstiefe: Home-PC.
- **0.9.30 «Ausgeleuchtet»** — Vis-Abschluss: Licht aussen
  (Lichtquellen-Familie) · Umgebung (Hintergrund/Bepflanzung) ·
  Freiflächen mit Dach ersetzen · Konsolidierung: ehrlicher Abgleich der
  ganzen Welle gegen die Lernpfad-Liste (Rest → 0.9.31+). GZ: keiner.
  Übungstiefe: Home-PC.

**Bewusst offen in dieser Welle:** GDL-Äquivalent («Geländer und GDL» —
eigene Bibliothekselement-Sprache ist ein Architektur-Grundsatzentscheid)
· Solibri/BIMcloud-Lernpfade (eigener Erfassungsteil 2/3, keine
ArchiCAD-Werkzeuge) · alles Login-Geschützte, dessen Richtung aus den
öffentlichen Beschreibungen nicht ableitbar ist.

## Platzhalter 0.9.31–0.9.50 (noch offen — Owner füllt per W0)

IDC-Welle-Reste aus dem 0.9.30-Abgleich · laufendes Owner-Feedback ·
Werkzeug-Vertiefungen (u.a. L-Treppen-Z-Fighting-Folgeposten,
Objekt-/Möbel-Bibliothek, Werkplan-Vertiefungen) · HomeStation-Vollausbau
(sobald Home-PC bereit: Worker/Render/lokale Modelle in echt) · KosmoTrain
(bleibt bedingt: Worker-Bericht) · v1.0-Vorbereitung am Serienende
(Voll-E2E-Generalprobe).

**v1.0** (~in einem Monat, Owner 23.07.): Rückkehr von
Voll-E2E-Komplettlauf + Installer-Zustellung, Konsolidierung, keine neuen
Werkzeuge.
