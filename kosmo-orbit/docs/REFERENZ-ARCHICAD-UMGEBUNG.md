# REFERENZ — ArchiCAD-Arbeitsumgebung, Ebenen-System, Renovation-Filter

> **Auftrag:** Recherche-Bericht zu den Owner-Punkten **K14** (Arbeitsumgebung/
> Oberflächen-Presets), **K31** (Ebenen + Ebenenkombinationen) und **K29-
> Anschluss** (Phasen-Logik) aus `docs/OWNER-KORREKTUREN-2026-07.md`.
> Erstellt 21.07.2026 (Recherche-Agent, Batch B). Reiner Befund + Empfehlung —
> **keine Code-Änderung**, Umsetzung gatet Fable.

## Quellenlage

- **Primär:** offizielle Graphisoft-Hilfe (`help.graphisoft.com`, Versionen
  AC24–AC28 — die Konzepte sind über die Versionen stabil, zitiert wird die
  jeweils konkret geprüfte Seite) und Graphisoft-Community-Artikel (offizielle
  «Tips»-Beiträge des Community-Teams).
- **Sekundär (Vergleichsbasis):** eigener Code-Stand v0.8.11 — Datei:Zeile-
  Angaben unten beziehen sich auf den Stand vom 21.07.2026.
- **Ehrlichkeits-Regel:** jede Web-Behauptung trägt eine URL. Was ich nicht
  direkt auf einer geprüften Seite belegen konnte, ist ausdrücklich als
  **[nicht direkt belegt]** markiert (Modellwissen/Community-Konsens, vor der
  Umsetzung nachprüfen).

Geprüfte Quellen (alle am 21.07.2026 abgerufen):

| # | Quelle | URL |
|---|--------|-----|
| Q1 | Work Environment Dialog Box (AC28) | https://help.graphisoft.com/AC/28/INT/_AC28_Help/140_UserInterfaceDialogBoxes/140_UserInterfaceDialogBoxes-3.htm |
| Q2 | Work Environment Schemes (AC24) | https://help.graphisoft.com/AC/24/INT/_AC24_Help/130_UserInterfaceDialogBoxes/130_UserInterfaceDialogBoxes-4.htm |
| Q3 | Work Environment Profiles (AC20) | https://help.graphisoft.com/AC/20/INT/AC20Help/Appendix_Settings/Appendix_Settings-5.htm |
| Q4 | Tips to set up Work Environment (Graphisoft Community) | https://community.graphisoft.com/t5/Project-data-BIM/Tips-to-set-up-Work-Environment/ta-p/303388 |
| Q5 | Layers (AC27) | https://help.graphisoft.com/AC/27/INT/_AC27_Help/025_Attributes/025_Attributes-2.htm |
| Q6 | Layer status (AC27) | https://help.graphisoft.com/AC/27/INT/_AC27_Help/025_Attributes/025_Attributes-5.htm |
| Q7 | Layer Combinations (AC27) | https://help.graphisoft.com/AC/27/INT/_AC27_Help/025_Attributes/025_Attributes-6.htm |
| Q8 | Layer Combinations and Layers, Attribute Manager (AC25) | https://help.graphisoft.com/AC/25/INT/_AC25_Help/020_Configuration/020_Configuration-70.htm |
| Q9 | Renovation Filters (AC27) | https://help.graphisoft.com/AC/27/INT/_AC27_Help/050_ViewsVB/050_ViewsVB-123.htm |
| Q10 | Renovation Filter Options (AC27) | https://help.graphisoft.com/AC/27/INT/_AC27_Help/050_ViewsVB/050_ViewsVB-126.htm |
| Q11 | Tips to work with Renovation (Graphisoft Community) | https://community.graphisoft.com/t5/Documentation/Tips-to-work-with-Renovation/ta-p/303425 |

---

## Teil 1 — Arbeitsumgebung / Work Environment (K14)

> Owner (K14, wörtlich): «… dazu gehört auch die werkezug anordlung und
> oberflächen presetzs. archicad hat da eine gute arbeitsumgebung entwickelt,
> recherchiere diese und baue dieselbe auf»

### ArchiCAD-Befund

**Grundmodell: Schemes → Profile, lokal gespeichert, projekt-unabhängig.**

1. **Sechs Scheme-Typen** bündeln je einen Einstellungs-Bereich (Q2):
   *User Preference Schemes* (persönliche Vorlieben: Dialoge/Paletten-
   Verhalten, Tracker, Eingabe-Hilfen, Bildschirm-Optionen …),
   *Company Standard Schemes* (Datensicherheit, Netzwerk, Spezialordner),
   *Shortcut Schemes* (Tastatur), *Tool Schemes* (Werkzeugkasten-,
   Werkzeugdialog- und Infobox-Anpassung), *Command Layout Schemes*
   (Menü-/Toolbar-INHALTE) und *Workspace Schemes* (Paletten-/Toolbar-
   SICHTBARKEIT und -Anordnung, Tab-Leiste, Docking-Status). Bemerkenswert:
   Workspace-Schemes erfassen den **manuell hergestellten** Zustand der
   Oberfläche («store as»-Prinzip), nicht Dialog-Einstellungen (Q2).
2. **Profile enthalten selbst keine Einstellungen** — sie sind reine
   Sammlungen von Schemes («Profiles themselves do not contain settings;
   they are just a collection of schemes», Q1). Ein Profil wird über
   «Apply Schemes of Profile» als Ganzes angewendet (Q2, Q3).
3. **Speicherort: lokal, nicht im Projekt.** Work-Environment-Einstellungen
   liegen in einem lokalen Ordner auf dem Rechner, nicht in der Projektdatei
   (Q4). Beim Programmstart lässt sich das Profil im Start-Dialog wählen (Q4).
4. **Scheme-Verwaltung:** Store as / Redefine / Delete / Rename je Scheme;
   Export/Import über die Scheme-Options-Seite (Ordner-basiert), gedacht für
   CAD-Manager, die Büro-Standards auf mehrere Arbeitsplätze verteilen
   (Q1, Q2). Plattformwechsel Windows↔Mac ist möglich, wird aber nicht
   empfohlen (Q2).
5. **Auslieferung:** ArchiCAD bringt vordefinierte Profile mit (in AC20 z.B.
   «Standard Profile»; die genauen Profilnamen je Version variieren) (Q3).

**Kern-Einsicht für KosmoOrbit:** ArchiCAD trennt sauber (a) *was* die
Oberfläche zeigt (Workspace/Command Layout), (b) *wie* Werkzeuge bedient
werden (Tool/Shortcut) und (c) *persönliche vs. Büro-Standards* (User
Preference vs. Company Standard) — und alles davon ist **Maschinen-Zustand,
nie Projekt-Zustand**.

### KosmoOrbit-Ist

- **Darstellungs-Sektion:** `apps/kosmo-orbit/src/shell/Einstellungen.tsx:336-381`
  — Thema (2 Segmente Papier/Kosmos) + Akzent-Swatches (`AKZENTE`). Persistenz
  lokal via `localStorage` (`kosmo.thema`/`kosmo.akzent`, `src/App.tsx:181-183,
  490-495`) — bereits die richtige Seite der Laufzeit≠Modell-Grenze.
- **Werkzeug-Anordnung:** `Einstellungen.tsx:383-416` — Dock-Modus A
  (Orbit-Zonen) / B (Raster-Kachel), EIN Solver (`state/dock-kern.ts`).
- **Oberflächen-Presets existieren bereits im Kleinen:**
  `apps/kosmo-orbit/src/state/dock-presets.ts` — drei kuratierte Presets
  (`fokus`/`arbeiten`/`pruefen`) je Station (`design`/`vis`/`publish`),
  Zwei-Schichten-Modell (Ziel-Daten vs. Anwenden), Wähler in
  `Einstellungen.tsx:428-453`, Kosmo-Command `ui.dockPresetSetzen`
  (`state/dock-befehle.ts:290-322`), Persistenz in `state/dock-zustand.ts`
  (`aktivesPreset` seit v0.8.0 PD1).
- **Lücken gegenüber ArchiCAD:** (a) Presets bündeln nur Panel-Layout — Thema/
  Akzent/Dock-Modus/Manuell-Ansicht sind NICHT Teil eines Presets; (b) keine
  benutzerdefinierten Presets («Store as» fehlt — nur die drei kuratierten);
  (c) kein Export/Import (Büro-Standard verteilen); (d) keine Tastatur-Schemes
  (Shortcut-Anpassung gibt es produktweit nicht als Einstellungs-Bereich);
  (e) kein Profil-Begriff, der Schemes bündelt.

### Empfehlung (K14)

**«Oberflächen-Preset»-System nach dem Scheme/Profil-Muster, als lokale
Einstellung:**

1. **Datenmodell:** ein `OberflaechenProfil` = benannte Sammlung von vier
   Schemes: `darstellung` (Thema, Akzent, künftig mehr Akzente/Vibranz),
   `anordnung` (Dock-Modus A/B, Dock-Preset je Station + gespeicherte
   Overrides), `ansicht` (Insel vs. manuelle Ansicht je Station — Anschluss
   K15) und später `tastatur`. Genau wie ArchiCAD: **Laufzeit, nicht Modell**
   — Ablage `localStorage`/lokale Datei, NIE im Doc, NIE über Yjs/Undo
   (bestätigt durch den heutigen Ist-Zustand: Thema/Akzent sind schon lokal).
   Doc-Settings (siaPhase, Poché-Modus …) bleiben strikt draussen.
2. **«Store as»-Prinzip:** aktuellen Zustand unter eigenem Namen sichern
   (wie Workspace-Schemes, Q2) statt nur kuratierte Presets; die drei
   kuratierten bleiben als mitgelieferte Profile (ArchiCAD-Analogie:
   Default-Profile, Q3).
3. **Export/Import als JSON** (Büro-Standard, Q1-Use-Case «CAD manager») —
   passt zum lokal-first-Prinzip des Repos.
4. Der bestehende Preset-Wähler in den Einstellungen wird zum Profil-Wähler
   erweitert; `ui.dockPresetSetzen` bekommt ein Geschwister
   `ui.profilAnwenden` (gleiches Muster, kein Doc-Patch).

**Aufwand:** **M** für Profil-Datenmodell + Store-as + Wähler (baut auf
PD1/PD2 auf); **L** inklusive Export/Import, Ansicht-Scheme (K15-Kopplung)
und mehr Akzenten/Vibranz (K14a/b). Die Recherche-Teilaufgabe (K14d) ist mit
diesem Bericht erledigt.

---

## Teil 2 — Ebenen-System (K31)

> Owner (K31, wörtlich): «analysiere das „ebenen-tool und ebenen kombinationen
> von archicad…das meine ich mit ebenen… kosmo kategorisiert automatisch z.b
> alle stützen nach bkp nummer auf „(bkp-nummer) Stütze“ z.b»

### ArchiCAD-Befund

1. **Ein Layer-Set je Projekt**, verwaltet im Layer-Settings-Dialog; die
   Spezial-Ebene «Archicad» kann nie gelöscht/versteckt/gesperrt werden und
   fängt Elemente ohne Ebenen-Definition auf (Q5, Q6).
2. **Vier Status je Ebene** (Q6):
   - **Show/Hide** — Elemente versteckter Ebenen werden nicht dargestellt;
   - **Lock/Unlock** — gesperrte Ebenen: nichts editieren/löschen, nichts
     Neues darauf platzieren;
   - **3D-Darstellungsmodus** — solid (schattiert) oder Drahtmodell je Ebene
     (z.B. Operator-Körper für Verschneidungen als Wireframe);
   - **Verschneidungs-Gruppennummer (Intersection Group)** — nur Elemente
     mit gleicher Gruppennummer verschneiden sich automatisch (Wirkung der
     Nummer auf die Verschneidung: **[nicht direkt belegt]** auf der
     geprüften Seite, dort nur als Status genannt; Community-Konsens).
3. **Ebenenkombinationen = benannte Sets aller Ebenen-Status** («named sets
   of layers with varying statuses», Q7): dieselbe Ebene kann je Kombination
   sichtbar/versteckt/gesperrt sein. Neu anlegen: «New» → Name → Status
   stellen → «Update» (Q7). ArchiCAD liefert einen Default-Satz mit (typisch
   nach Planart: Entwurf, Ausführung, Deckenspiegel … — konkrete Namen:
   **[nicht direkt belegt]**).
4. **Ansichts-Verknüpfung:** jede View wird MIT einer Ebenenkombination
   gespeichert (Q7) — der eigentliche Hebel: «Grundriss 1:100 Baueingabe»
   ist View + Kombination, nie manuelles Klicken. Anwenden auch über
   Quick-Options-Leiste, Layer-Settings, Menü Document > Layers (Q7);
   Übertrag zwischen Projekten über den Attribute Manager (Q8).
5. **Alles ist Projekt-Zustand** (Attribute im Projekt, Q8) — im Gegensatz
   zur Work Environment (Teil 1, lokal). Diese Trennung ist exakt unsere
   Laufzeit≠Modell-Grenze, nur auf der anderen Seite.

### KosmoOrbit-Ist

- **`design.ebeneSetzen`** (`packages/kosmo-kernel/src/commands/design.ts:4138-4166`)
  patcht NUR `meta.layer` — bewusst reines **DXF-Interop-Feld** (0.8.9 E2,
  Owner-Entscheid damals «CAD-Ebenen = DXF-Interop + Sperren», Sanktion 4:
  keine Sichtbarkeits-/Render-Wirkung). Der Override gewinnt im Export vor
  den Semantik-Regeln (`dxf/export.ts:58-96`, `LAYER_REGELN`: STUETZEN,
  TRAGEND, DAEMMUNG, NEUBAU, ABBRUCH, FENSTER …).
- **`design.sperren`** (`design.ts:4177-4198`) patcht `meta.locked` — Sperre
  je **Element**, nicht je Ebene; Durchsetzung am Interaktionspfad
  (`plan-hit-test.ts` `istGesperrt()`), Element bleibt sicht- und wählbar.
- **Sichtbarkeits-Schalter im Plan sind Ad-hoc-Booleans, keine Ebenen:**
  `apps/kosmo-orbit/src/modules/design/PlanView.tsx` — Unternehmerplan-
  Overlay (`:945`), Beziehungs-Graph (`:957`), Achsen (`:964`), Kommentar-
  Filter (`:979`, lokales `useState` `:284`) — alle «nur Bildschirm», ohne
  benannte Sets, ohne Sperr-Wirkung, ohne Ansichts-Verknüpfung. Dazu die
  Blatt-Vorschau-Toggles in Publish (Zonen/Aussenbemassung — Owner lobt sie
  in K43 und will GENAU DAS ausgebaut sehen).
- **BKP existiert im Kernel nur als Kosten-Gliederung** (BKP-2-Stellen-Niveau
  in `derive/kostenschaetzung.ts:25-26,80ff`, `derive/kvblatt.ts`) — es gibt
  KEINE BKP-Klassifikation am Bauteil.

**Delta:** uns fehlt der komplette Ebenen-Kern (Ebene als benanntes Ding mit
Status, Kombinationen, Ansichts-Verknüpfung); vorhanden sind nur die zwei
Rand-Bausteine Element-Sperre und DXF-Ebenenname.

### Empfehlung (K31)

**Minimaler echter Ebenen-Kern + Kosmo-Autokategorisierung nach BKP:**

1. **Doc-seitig (Modell, nicht Laufzeit — wie ArchiCAD):**
   `Ebene { id, name, sichtbar, gesperrt, drahtIn3d }` als Doc-Bestand plus
   `EbenenKombination { name, statusJeEbene }` als benannte Sets; Commands
   `design.ebeneAnlegen/…Status/…KombinationAnwenden` nach dem bestehenden
   Patch-Muster (`design.renovationSetzen` als Vorbild). `meta.layer` wird
   NICHT gebrochen: das DXF-Override-Feld bleibt, neue Element-Zuordnung
   läuft über `meta.ebeneId`; der DXF-Export kann später Ebenenname statt
   Semantik-Regel schreiben (additiv).
   Sichtbarkeit/Sperre wirken an denselben Stellen wie heute
   (`plansvg`-Filter bzw. `istGesperrt()`-Pfad) — hinter «nur wenn Daten
   vorhanden»-Guards, damit die 39 Goldens byte-stabil bleiben.
2. **Kosmo-Autokategorisierung:** kuratierte Regeltabelle `kind/Kontext →
   Ebene mit BKP-Prefix` (z.B. alle `column` → Ebene «(BKP-Nr.) Stütze» —
   die konkrete BKP-Nummerntabelle je Bauteilklasse ist Fach-Kuration und
   wird als eigene Datenquelle geführt, analog `LAYER_REGELN`, nicht
   hartcodiert im Command). Kosmo führt sie als Command aus
   (`design.ebenenAutoKategorisieren`) → Diff-Karte → Undo-fähig; manuelle
   Umhängung gewinnt (Override-Prinzip wie im DXF-Export heute).
3. **Ansichts-Verknüpfung** (Kombination je View/Blatt, ArchiCAD-Hebel Nr. 1)
   als zweiter Schritt — verbindet sich direkt mit den K43-Blatt-Toggles:
   die Publish-Toggles werden dann Ebenenkombinationen statt Einzel-Booleans.

**Aufwand:** **L** gesamt (Owner-Schätzung im Register bestätigt). Schnitt:
M für Ebenen-Kern + Status-Wirkung (Schritt 1), M für Autokategorisierung +
BKP-Tabelle (Schritt 2), M für Kombinationen an Views/Blättern (Schritt 3).

---

## Teil 3 — Phasen-Logik: Renovation-Filter als Muster (K29-Anschluss)

> Owner (K29, wörtlich): «…ein konzept entwickelst und strategisch intelligent
> auslegst … das tool an die bauphaser gebunden werden und je nach stadium
> erst dann auswählbar sind»

### ArchiCAD-Befund

1. **Element-Status + View-Filter, zwei getrennte Dinge:** jedes Element
   trägt einen Renovation-Status (Bestand/Abbruch/Neu — die englischen
   Statusnamen «Existing / To be Demolished / New» sind auf den geprüften
   Seiten nur teilweise wörtlich belegt, das Dreier-Modell selbst ist es:
   Q9/Q10 sprechen von Status-abhängiger Behandlung, die Palette setzt den
   Status, Q11); der **Renovation Filter** entscheidet je Ansicht, was mit
   jedem Status passiert.
2. **Drei Behandlungen je Status: Show / Hide / Override** (Q10) — zeigen
   wie eingestellt, ganz verstecken, oder zeigen MIT grafischer Übersteuerung
   (Farbe/Schraffur/Linie aus den Graphic-Override-Regeln). Das ist die
   entscheidende Design-Idee: **nicht nur an/aus, sondern «sichtbar, aber
   anders erzählt»**.
3. **Filter ist View-Zustand:** der Renovation Filter wird mit der View
   gespeichert und wirkt bis in die Planablage/Drawings (Q9). Vordefinierte
   Filter werden mitgeliefert und sind editierbar (Q10) — typisch
   «Bestandsplan», «Abbruchplan», «Neubauplan» als benannte Arbeitskontexte
   (konkrete Default-Namen: **[nicht direkt belegt]**).
4. **Werkzeug-Kopplung über den Default-Status:** die Renovation-Palette
   bestimmt, mit welchem Status NEUE Elemente entstehen (Q11) — d.h. der
   aktive Arbeitskontext steuert das Zeichnen, ohne Werkzeuge zu verbieten.
   ArchiCAD blendet also **keine Werkzeuge aus**, es verändert deren Wirkung
   und die Sicht — Owner-Ziel K29 (Werkzeuge erst ab Phase wählbar) geht
   einen Schritt weiter als das ArchiCAD-Vorbild.

### KosmoOrbit-Ist

- **Renovation-Status existiert bereits 1:1:** `design.renovationSetzen`
  (`design.ts:1363-1391`) setzt `meta.renovation` = `bestand|neu|abbruch`
  nach SIA 400 (Bestand grau, Neu rot, Abbruch gelb); Darstellung in
  `derive/bestand.ts`, DXF-Ebenen NEUBAU/ABBRUCH (`dxf/export.ts:62-63`).
- **Die Phase ist bereits Doc-Setting:** `doc.settings.siaPhase` (8 Werte,
  `model/doc.ts`), abgeleitet u.a. `siaZuMatrixStufe()`
  (`derive/plankopf.ts:194`), phasenabhängiges Poché (`derive/poche.ts`),
  phasenabhängige Möbel-Druckschwelle (`derive/moebel.ts:21`),
  Phasen-Wasserzeichen (K40). Das deckt ArchiCADs «Filter wirkt bis ins
  Druckbild» für einen Teil der Darstellung schon ab.
- **Was fehlt: phasenabhängige WERKZEUG-Verfügbarkeit.** Die im Register
  als Anknüpfpunkt genannte Staffelung 082-P6 ist die **Rollen**-Staffelung
  (Kosmo-Meister/-Leiter/-Zeichner, `shell/KosmoPanel.tsx:875-879,1119-1120`,
  `e2e/staffelung-kuratier.spec.ts`) — sie staffelt Modelle nach
  Aufgabenklasse, nicht Werkzeuge nach Bauphase. Eine Werkzeug×Phase-Logik
  gibt es heute nirgends (Werkzeug-Inseln zeigen immer alles).

### Befund für die Phasen-Werkzeug-Matrix (kurz)

Das ArchiCAD-Muster übersetzt sich so:

1. **Deklarative Matrix statt Code-Verzweigung:** eine kuratierte Tabelle
   `Werkzeug × SIA-Phase → aktiv | gedimmt | aus` (analog Renovation-Filter:
   Show/Override/Hide) als eigene Datendatei — Kosmo kann sie lesen,
   erklären und (K29-Wunsch) automatisiert pflegen.
2. **«Override» dem «Hide» vorziehen:** ArchiCAD versteckt nie Werkzeuge,
   nur Elemente. Empfehlung für KosmoOrbit: Werkzeuge ausserhalb ihrer Phase
   **gedimmt mit Begründungs-Tooltip** («Entwurfstool — Phase ist schon
   Baueingabe») statt kommentarlos weg; hartes «aus» nur wo der Owner es je
   Werkzeug explizit bestätigt. Das hält die Matrix erklärbar und vermeidet
   «wo ist mein Werkzeug hin»-Verwirrung.
3. **Phase bleibt Doc-Setting, Matrix-Auswertung ist Ableitung:** die Matrix
   wertet `doc.settings.siaPhase` aus (pure Funktion, derive-Stil) — kein
   neuer Zustand, kein Golden-Risiko (reine UI-Verfügbarkeit). Verbindet
   sich direkt mit K5 (Phase in die Projekt-Einstellungen + «Transformieren»-
   Schritt): der Transformier-Moment ist genau der Punkt, an dem Kosmo die
   Werkzeug-Änderungen als Karte erklären kann.

**Aufwand:** **M** für Matrix-Konzept + Dimm-Verdrahtung an den Inseln
(Konzept-Teil von K29); **L** für die volle Umsetzung inkl. Kosmo-Automation
(deckt sich mit dem Register).

---

## Offene Owner-Fragen

1. **(K14) Profil-Umfang:** sollen Oberflächen-Profile NUR Darstellung +
   Anordnung bündeln, oder auch die Insel/Manuell-Wahl je Station (K15)?
   Empfehlung: inklusive — bitte bestätigen.
2. **(K14) Büro-Standard:** brauchst du Export/Import von Profilen schon
   jetzt (Mehrplatz/Büro), oder reicht vorerst lokal je Gerät?
3. **(K31) BKP-Tabelle:** die Zuordnung Bauteilklasse → BKP-Nummer (z.B.
   welche Nummer eine Stütze im Büro-Standard trägt) ist Fach-Kuration —
   lieferst du die Nummernliste, oder soll Kosmo einen Vorschlag aus dem
   BKP-Normkatalog erarbeiten, den du abnimmst?
4. **(K31) Ebenen-Granularität:** reichen automatische Ebenen je
   Bauteilklasse (Stützen, Wände tragend/nichttragend, Fenster …), oder
   willst du zusätzlich freie, manuell angelegte Ebenen wie in ArchiCAD?
5. **(K29) Hide vs. Dimmen:** dürfen phasenfremde Werkzeuge gedimmt sichtbar
   bleiben (mit Erklärung), oder willst du sie — wie im Zitat «erst dann
   auswählbar» — komplett ausgeblendet? Empfehlung: dimmen als Default,
   ausblenden je Werkzeug per Matrix-Eintrag.
