# Owner-Befunde aus dem Rundgang-PDF (08.07.2026) — Auftragsliste 0.6.2/0.6.3

> Quelle: kommentiertes `RUNDGANG-NOTIZEN-0.6.1.pdf` (18 Seiten, alle Notizen
> vollständig ausgelesen). Jeder Befund trägt eine K-Nummer, die Priorität und
> das Ziel-Release. «Serie K» = das grosse UI-Transformationsprogramm, das aus
> den Seiten 2–6 spricht — es konkretisiert `SERIE-J2-IMMERSIVE-OBERFLAECHE.md`
> mit den Owner-Leitplanken und wird batch-weise gebaut, nicht auf einmal.

## Sofort (0.6.2, heute) — Qualität & Ärgernisse

| K | Befund (PDF-Seite) | Massnahme |
|---|---|---|
| **K1** | **Grundlagenstudie-Bericht «ultra schlecht»** (S. 9) — sagt nichts aus, vermischt Themen | Bericht v2: echte architektonische Beurteilung je Variante (Ausnützung, Besonnung, Programm, Körnung/Setzung aus den Regeldaten), klare Blatt-Dramaturgie: Empfehlung zuerst, Kennwerte als Tabelle, ehrliche Grenzen am Schluss |
| **K2** | Umbau-Plan: Achslinie sichtbar, Kreuz in Abbruchwand, Bestandwand hälftig grau (S. 18) | SIA-konforme Umbau-Darstellung bereinigen (Abbruch gelb-kreuzlos nach SIA, Bestand grau-voll, keine Achslinien im Druckbild) |
| **K3** | Popup-Texte laufen aus dem Block, Blöcke überlappen (S. 8, Bsp. Verschieben/Volumenstudie) | UI-Regel: Text bleibt im Block (overflow/clamp), Panels kollisionsfrei; Audit über StudienPanel + Overlays |
| **K4** | Geschosshöhe ist projektspezifisch (S. 8) — Wettbewerbsvorgabe / Architekt / Norm / minimale Raumhöhe | Studien-Optionen: Geschosshöhen-Herkunft wählbar + ehrlich beschriftet («aus Wettbewerbsvorgabe» / «SIA-Minimum» / «Standard Wohnen 2.80») |
| **K5** | Unternehmerplan-Textblöcke nutzlos (S. 10) | One-Click-Upload-Fläche, Kosmo erledigt Vergleich selbst, Meldungen statt Erklär-Textblöcke |
| **K6** | 2× «KosmoDesign» im Kopf (S. 3) | Doppelte Beschriftung entfernen |
| **K7** | KosmoData-Datenbezug bestätigen (S. 13) | Beleg zusammenstellen: Referenz→3D-Environment-Ladepfad ist E2E-bewiesen (ref3d-laden.spec); Kurzbestätigung an Owner |

## 0.6.2-Stretch (wenn der Abend reicht)

| K | Befund | Massnahme |
|---|---|---|
| **K8** | Kosmo-Vorschläge zu klein/banal (S. 7) | Vorschlagskarten visuell (Mini-Plan/3D-Diff statt Text), fürs grosse Bild (Typologien statt Einzelwand) — Stufe 1: visuelle Karte |
| **K9** | Grundriss aus Distanz schlecht (S. 4) | Zoomabhängiges Level-of-Detail im Plan (weiter weg = simpler) |
| **K10** | Publish-Blätter halb leer (S. 12) | Kosmo-Auto-Befüllung: fehlende Ansichten/Schnitte selbst wählen, Blatt immer vollständig; Vektor-Qualität prüfen |

## Serie K — UI-Transformation (Konzept jetzt, Batches ab 0.6.2/0.6.3)

Owner-Leitplanken aus S. 2–6, verbindlich für alle Serie-K-Batches:
- **Kosmo als Copilot-Symbol**, nicht Dauerchat: Hover = Mini-Popup (letzte Aktivität), Klick = entfaltet, volle Interaktion = grosses Panel; Animation wenn Kosmo arbeitet; Speak aktiviert das Symbol. (K11)
- **Startmenü neu**: personalisierte, dynamische Icons mit Tiefenlayern, Hover zeigt enthaltene Tools, Info-Icon je Kachel; Startanimation; Farbakzente + stromsparende Idle-Animationen. (K12)
- **Erster Start**: Kosmo fragt «neu hier?» → Guide; sonst nie wieder (Einstellung reaktivierbar). (K13)
- **Einstellungsmenüs**: zentral in der Übersicht + je Station (Design/Data/Kosmo/Büro/V2) — Funktionen & Neues. (K14)
- **Oberfläche minimal**: kein Text wo möglich, Werkzeuge nach Nutzungsmenge in Menüs/Popups einsortiert (Adaption ist die Basis), One-Click/Zero-Click, alle vier Bildschirmkanten nutzen; Ziel Vollautomatisierung der Tools — wichtig bleiben die **architektonischen Entscheidungsmeldungen**. (K15)
- **Drei Entwurfs-Icons in KosmoDesign**: (1) Sprechen/Schreiben → Kosmo zeichnet; (2) Skizzieren → Live-Verständnis + 3 Preview-Annäherungen, Bestätigung (Entscheid füttert die LoRA), Kosmo modelliert in 3D/Grundriss/Schnitt/Ansicht; (3) manuelles CAD → klassische Werkzeugleisten, Anordnung wie ArchiCAD. (K16)
- **Spezialfähigkeiten** (Sonnenstudie etc.) hinter Icons, von Kosmo vollautomatisiert oder volles Einstellungsmenü; Grundicons KosmoDraw/Vis/Publish/Prepare in KosmoDesign integriert. (K17)
- **Bauphasen-Kopplung**: Tools/Icons/Fähigkeiten je Bauphase; «Umgebungstool» in den Einstellungen: anpassbare Oberflächen, ausdefinierte Presets je Phase; Ausschnitt-Set, Ebenen-, Umbaufilter-, Grafikanpassungs-Tool wie ArchiCAD, aber Kosmo-automatisiert. (K18)
- **Leistungs-Autotuning**: beim Start Freigabe «Kosmo darf Systemleistung prüfen» → Bericht, Kosmo drosselt selbst (Cycles-Preview-Synchro, AI-Imaging-Synchro, Render-Qualität, lokale LLM-Wahl, Host-PC-Client, sonst Claude-Cloud). Desktop-Layout: Cycles-Preview gross + Nodetree + 3 synchronisierte AI-Image-Varianten; iPad: 4er-Split als Default. (K19)
- **KosmoVis-Umfang**: Kamerapositionierung, Cycles-Einstellungen, Bildkomposition — automatisiert wo möglich. (K20)

## Material-Programm (Konzept + erste Stufe)

**K21** (S. 14): Materialbibliothek ausbauen — Texturen als 3D-Würfel mit richtigen
Dimensionen; 2D-Texturen per 3D-Texture-Generator (ETH-Ansatz oder Open Source)
zu Depth+Maps vervollständigen; beste 4k/8k-Quellen aus offenen Bibliotheken;
HSLU-Materialdatenbank einpflegen; Rohmaterial vs. Baumaterial, regionale
Eigenschaften, lieferbare Grössen/Dicken; **Quelle immer in der Erfassung**.
→ Stufe 1 (0.6.2/0.6.3): 3D-Würfel-Vorschau + Quellen-/Dimensions-Felder im
Datenmodell; Stufe 2: Quellen-Ingest (Lizenzlage je Bibliothek prüfen — nur
frei lizenzierte Texturen einlagern).

## v0.6.3 — Hauptaufgabe (Owner, S. 6)

**K22**: Vollständiger Testlauf eines spezifischen Projekts durch **jede Phase**
— vollständiger Entwurf vom Wettbewerb bis zur Gebäudeabnahme, gemeinsam
durchgespielt. Konzept + Plan entsteht JETZT (`docs/V063-VOLLPROJEKT-KONZEPT.md`),
Ausführung ist die 0.6.3-Hauptaufgabe.

---
Arbeitsmodus: K1–K7 heute (0.6.2), K8–K10 Stretch, Serie K als Konzept-Update
von SERIE-J2 + erste Batches (K11–K13 zuerst — sichtbarster Effekt), K21/K22
als Konzepte heute, Bau folgt. Jeder Batch wie gehabt: Gates, ROADMAP, Push.
