# KONZEPT — Phasen-Werkzeug-Matrix (K29+K5) · KosmoPrepare visuell (K47) · KosmoData-UI-Ideen (K48c)

> **Auftrag:** Konzept-Batch B aus `docs/OWNER-KORREKTUREN-2026-07.md`
> (Punkte K5, K29, K47, K48c) — reines Konzeptdokument, **keine
> Code-Änderung**, Umsetzung gatet Fable. Erstellt 21.07.2026
> (Sonnet-Konzeptagent).
>
> **Quellen:**
> - `docs/OWNER-KORREKTUREN-2026-07.md` — Owner-Zitate K5/K29/K47/K48.
> - `docs/REFERENZ-ARCHICAD-UMGEBUNG.md` Teil 3 — Renovation-Filter als
>   Muster (Show/Override/Hide → aktiv/gedimmt/aus). **Wird hier
>   weitergebaut, nicht gedoppelt** — die dortigen Befunde 1–3 gelten
>   unverändert als Fundament.
> - `docs/WERKZEUG-LUECKENLISTE-ARCHICAD.md` Teil 1 (IST-Inventar) —
>   Werkzeug-Zeilen der Matrix.
> - Code-Stand v0.8.11: `packages/kosmo-kernel/src/model/doc.ts`
>   (`SiaPhase`, 8 Werte), `apps/kosmo-orbit/src/shell/PhasenLeiste.tsx`
>   (Kopfzeilen-Tableiste, 5 SIA-112-Gruppen),
>   `apps/kosmo-orbit/src/state/orbit-rang.ts` (`sia112Gruppe()`,
>   BASE-Matrix), `packages/kosmo-kernel/src/derive/plankopf.ts`
>   (`siaZuMatrixStufe()`, Wasserzeichen),
>   `apps/kosmo-orbit/src/modules/design/island/island-katalog.ts`,
>   `apps/kosmo-orbit/src/modules/prepare/` (Workspace + Inseln),
>   `apps/kosmo-orbit/src/modules/data/DataWorkspace.tsx`.
> - `docs/OWNER-KOMPASS-2026-07-20.md` — F25 (1.0-Demobeweis-Latte),
>   F6/F9.

---

## TEIL 1 — K29+K5: Phasen-Werkzeug-Matrix und Phase als Projekt-Eigenschaft

> Owner (K29): «…ich möchte das du eine solche analyse aufbaust und ein
> konzept entwickelst und strategisch intelligent auslegst (kosmo kann
> das dann auch und automatisiert) das tool an die bauphaser gebunden
> werden und je nach stadium erst dann auswählbar sind…»
>
> Owner (K5): «…man stellt die projektphase in der projektdatei in den
> einstellungen dann um und transformiert das z.b wettbewerbsprojekt ins
> vorprojekt um…diese tableiste ist so eigendlich nutzlos»

### 1.1 Vorentscheid aus der ArchiCAD-Referenz (gilt hier durchgehend)

`REFERENZ-ARCHICAD-UMGEBUNG.md` Teil 3 hat das Muster gesetzt:
**deklarative Matrix statt Code-Verzweigung**, drei Zustände analog
Show/Override/Hide, und **«gedimmt mit Begründungs-Tooltip» als Default
statt hartem Ausblenden**. Dieses Konzept füllt die Matrix konkret aus
und legt den K5-Umbau daneben — beides gehört zusammen: der
«Transformieren»-Moment (K5) ist genau der Punkt, an dem sich die
Matrix-Spalte (K29) sichtbar ändert.

### 1.2 (a) Die Matrix — Werkzeug × SIA-112-Phase

**Spalten** = die 5 Gruppen der bestehenden Kopfzeile
(`PhasenLeiste.tsx`, SEGMENTE): **1 STRATEGIE · 2 VORSTUDIE ·
3 PROJEKTIERUNG · 4 AUSSCHREIBUNG · 5 REALISIERUNG**. Die feineren 8
`SiaPhase`-Werte bleiben die Wahrheit im Doc (`sia112Gruppe()` bildet
8→5 ab); wo die Gruppe zu grob ist (Gruppe 3 deckt Vorprojekt UND
Baueingabe), steht es in der Begründung — die Feinauflösung ist
Etappe L (§1.5).

**Zeilen** = das IST-Inventar aus `WERKZEUG-LUECKENLISTE-ARCHICAD.md`
Teil 1: 13 Zeichenwerkzeuge mit eigenem UI-Werkzeug (§1.2) + 14
Werkzeuge über Command/Panel/Kosmo-Weg (§1.3) = **27 Werkzeuge**.
Künftige Werkzeuge (Geländer, 2D-Zeichenschicht, Detail …) werden bei
Geburt eingetragen — das ist bereits Beschluss der Lückenliste §4.2.

**Zustände je Zelle:**

| Zeichen | Zustand | Bedeutung |
|---|---|---|
| ● | **aktiv** | normal sichtbar und bedienbar |
| ◐ | **gedimmt** | sichtbar, per Klick weiterhin nutzbar, aber optisch zurückgenommen + **Begründungs-Tooltip** («Entwurfswerkzeug — das Projekt ist schon in der Ausschreibung») |
| — | **aus** | aus der Insel/Leiste entfernt; NUR wo der Owner es je Werkzeug bestätigt (R7) — der Weg über Kosmo/Command bleibt immer offen (kein Kernel-Verbot) |

| Werkzeug | 1 STR | 2 VOR | 3 PROJ | 4 AUS | 5 REAL | Begründung (Architektensicht) |
|---|:-:|:-:|:-:|:-:|:-:|---|
| Auswahl | ● | ● | ● | ● | ● | Selektion/Eigenschaften braucht jede Phase — nie einschränken. |
| Wand | ◐ | ● | ● | ◐ | ● | In der Strategie gibt es noch keine Bauteile (Volumen genügt); ab Wettbewerb Kernwerkzeug; in der Ausschreibung ist die Substanz eingefroren (Änderung = Nachtrag → gedimmt); Werkplanung passt Wände wieder real an. |
| Öffnung (Fenster/Tür) | ◐ | ● | ● | ◐ | ● | Wie Wand; Fensterteilung ist ab Wettbewerb Entwurfsthema, in der Ausschreibung ausgeschriebene Ware. |
| Volumen (Baukörper) | ● | ● | ◐ | — | — | DAS Owner-Beispiel aus K29: reines Entwurfstool. Machbarkeit/Wettbewerb leben davon; im Bauprojekt ist der Baukörper definiert (gedimmt, Varianten-Ausnahmen); ab Baueingabe/Ausschreibung «konzeptionell schon definiert» → aus. |
| Zone (Raum) | ● | ● | ● | ◐ | ◐ | Raumprogramm (`raumprogrammSetzen`) beginnt in der Strategie; ab Ausschreibung sind Räume fix, die Zonen-AUSWERTUNG (Listen) bleibt selbstverständlich lesbar. |
| Dach | ◐ | ● | ● | ◐ | ● | Dachform ist Wettbewerbs-/Projektierungsthema; Werkplanung detailliert sie erneut (Anschlüsse). |
| Treppe | ◐ | ● | ● | ◐ | ● | Erschliessung/Fluchtwege ab Wettbewerb zwingend; Werkplanung braucht die Treppe wieder voll (Steigungsverhältnis, Details). |
| Stütze | ◐ | ● | ● | ◐ | ● | Tragraster ab Vorstudie. **Owner-Beispiel «Stützen-Detail-Tools erst ab Baueingabe»:** das betrifft die zweite Ebene — die DETAIL-Sektionen des Werkzeugs (Grundriss-Schnittdetail K30a, Profil-Manager K30b) erscheinen erst ab Baueingabe/Realisierung. Die Matrix staffelt also auch Werkzeug-TIEFE, nicht nur Sichtbarkeit (§1.5, Etappe L). |
| Schnitt/Ansicht | ◐ | ● | ● | ● | ● | In der Strategie entstehen kaum Pläne; ab Wettbewerb Pflicht, bis zur Abnahme gebraucht. |
| Skizze | ● | ● | ● | ◐ | ◐ | Skizzieren gehört den frühen Phasen; K25 (Pencil-Auto-Aktivierung) bleibt davon unberührt — der Stift aktiviert auch in späten Phasen, nur der Insel-Platz tritt zurück. |
| Mesh (Terrain/FreeMesh) | ● | ● | ◐ | — | ◐ | Terrain/Standortkörper sind Strategie-/Wettbewerbsarbeit; ab Bewilligung ist das Gelände festgeschrieben. R4 (Spezial-Untermenü) gilt zusätzlich. Realisierung gedimmt (Aushub-/Umgebungsanpassungen kommen vor). |
| Messen | ● | ● | ● | ● | ● | Nachmessen ist phasenlos. |
| Kommentar | ● | ● | ● | ● | ● | Koordination/Anmerkungen in jeder Phase — nie einschränken. |
| Decke | ◐ | ● | ● | ◐ | ● | Wie Wand (Konstruktionsbauteil). |
| Träger/Unterzug | — | ◐ | ● | ◐ | ● | In der Strategie existiert kein Tragwerk; im Wettbewerb höchstens konzeptionell (gedimmt); ab Projektierung mit dem Ingenieur real. |
| Fassade (Curtain Wall) | — | ◐ | ● | ◐ | ● | Fassadensystem ist Projektierungs-/Werkplanungsarbeit; im Wettbewerb nur als Bild (gedimmt). |
| Achsraster | ◐ | ● | ● | ● | ● | Raster entsteht mit dem Tragkonzept und bleibt Referenz bis auf die Baustelle. |
| Aussparung/Durchbruch | — | — | ◐ | ◐ | ● | Durchbruchsplanung ist Koordination mit HLKSE — vor dem Bauprojekt gibt es nichts zu durchbrechen; Kernthema der Ausführungsplanung. |
| Möbel/Objekt | ◐ | ● | ● | ◐ | ◐ | Möblierung gehört zum Wettbewerbs-Grundriss (1:200-Konvention) und zur Projektierung; danach dokumentarisch. |
| Masskette/Bemassung | — | ◐ | ● | ● | ● | Wettbewerbspläne sind konventionsgemäss kaum vermasst (Hauptmasse gedimmt möglich); ab Vorprojekt Pflichtwerkzeug bis zum Werkplan. |
| Etikett/Keynote | — | ◐ | ● | ● | ● | Beschriftungssystematik beginnt mit der Projektierung (Baueingabe-Vermerke, Werkplan-Keynotes). |
| Geschoss | ● | ● | ● | ◐ | ◐ | Geschosse anlegen/kopieren ist Strukturarbeit der frühen Phasen; später strukturfest. |
| Baugrenze/Parzelle/Standort | ● | ● | ● | ◐ | ◐ | Parzelle, Nachbarn, Standort sind DIE Strategie-/Wettbewerbsgrundlage; nach der Bewilligung amtlich fixiert. |
| Mangel (Bauleitung) | — | — | — | — | ● | Mängel gibt es erst auf der Baustelle — das klarste «aus»-Beispiel der ganzen Matrix (Gegenstück zum Volumen-Beispiel des Owners). |
| Renovation-Status | ● | ● | ● | ● | ● | Bestand/Abbruch/Neu ist PROJEKTART-abhängig (Umbau vs. Neubau), nicht phasenabhängig — die Matrix lässt ihn bewusst überall aktiv; eine spätere Projektart-Dimension bleibt möglich, wird hier nicht erfunden. |
| Text/Bild auf Blättern (publish) | ◐ | ● | ● | ● | ● | Blattlayout beginnt mit der ersten Abgabe (Wettbewerb) und bleibt bis zur Revision auf der Baustelle. |
| Kamera/Blick (vis) | ● | ● | ● | ◐ | ◐ | Visualisierung trägt Strategie (Machbarkeitsbilder), Wettbewerb und Projektmitwirkung; in Ausschreibung/Ausführung Nebenrolle. |

**Zählung:** 27 Werkzeuge × 5 Phasen = **135 Zellen** — davon
**83 aktiv · 39 gedimmt · 13 aus**. Die 13 «aus»-Zellen betreffen nur 8
Werkzeuge (Volumen, Mesh, Träger, Fassade, Aussparung, Masskette,
Etikett, Mangel) und brauchen die Owner-Bestätigung je Werkzeug (R7) —
bis dahin verhalten sie sich wie «gedimmt».

**Strategische Auslegung (der «intelligent»-Teil des K29-Zitats):**

1. Die Matrix ist **kein Verbot, sondern eine Erzählung**: gedimmte
   Werkzeuge erklären im Tooltip, WARUM sie zurücktreten — dieselbe
   Design-Idee wie ArchiCADs Override («sichtbar, aber anders erzählt»,
   Referenz Teil 3 Befund 2). Das erzieht ohne zu bevormunden.
2. Sie ist **die Insel-Schwester der bestehenden Stations-Matrix**:
   `orbit-rang.ts` staffelt heute schon die 8 STATIONEN je SIA-112-Gruppe
   (BASE-Matrix, wörtlich aus der v0.7.2-Spec). Die Werkzeug-Matrix
   wendet exakt dasselbe Prinzip eine Ebene tiefer an — gleiche
   Gruppenlogik (`sia112Gruppe()`), gleicher deklarativer Stil. Kein
   zweites Paradigma.
3. **Kosmo liest dieselbe Datei**: weil die Matrix Daten sind (kein
   Code), kann Kosmo sie zitieren («Volumen ist ab Ausschreibung aus,
   weil …»), beim Transformieren die Differenz erklären und — K29-Wunsch
   — Pflege-Vorschläge machen (§1.4).

### 1.3 (b) K5-Umzug: Phase raus aus der Kopfzeile, rein in die Projekt-Einstellungen

**Was verschwindet:** die permanente Segmented-Pill `PhasenLeiste.tsx`
(«1 STRATEGIE … 5 REALISIERUNG») aus der Kopfzeile. Der Owner hat recht:
die Phase wechselt «1x im halbjahr oder jahr» — ein Dauer-Schnellzugriff
ist Platzverschwendung und lädt zu versehentlichen Klicks ein (jeder
Pill-Klick SCHREIBT heute sofort `design.siaPhaseSetzen`).

**Wohin sie zieht:** Phase wird sichtbare **Projekt-Eigenschaft** an zwei
bestehenden Orten (kein dritter Zustand, kein neuer Schreibweg):

1. **Projekt-Einstellungen** (Projekt-Menü, wo heute schon der feine
   `sia-phase-select` lebt): neue Sektion **«Phase & Transformation»** —
   aktuelle Phase gross, Label aus `siaPhaseLabel()`, daneben der eine
   Knopf **«Projekt transformieren …»**.
2. **PROJEKT-Insel, Werkzeug `phase`** (existiert im Insel-Katalog):
   Stufe 2 zeigt die Phase read-only + Sprung zu den Projekt-
   Einstellungen. Die Insel bleibt der Ort für «wo steht das Projekt»,
   die Einstellungen der Ort für «umstellen».

Empfohlen als Rest in der Kopfzeile: ein **kleiner, read-only
Phasen-Chip** (Klick öffnet die Projekt-Einstellungen) — die Phase
bleibt ablesbar, ohne Tableiste, ohne Schreibrisiko. Ob der Chip bleibt
oder auch er fällt, ist Owner-Geschmack → R8.

**Der «Projekt transformieren»-Schritt (Beispiel Wettbewerb → Vorprojekt),
konkret und vollständig:**

Der Schritt ist EIN bestätigter Dialog mit Vorschau (Diff-Karten-Muster)
— nichts passiert still. Er zeigt vier Blöcke:

| Block | Was konkret passiert | Ist-Anbindung |
|---|---|---|
| **1 · Phase** | `doc.settings.siaPhase: 'wettbewerb' → 'vorprojekt'` — der einzige Schreibweg bleibt `design.siaPhaseSetzen` (`design.ts:2992`), damit Undo/Yjs/`.kosmo` unverändert stimmen. | bestehender Command |
| **2 · Werkzeuge** | Matrix-Spaltenwechsel Gruppe 2→3, als Liste erzählt: «Masskette und Etikett werden aktiv (vorher gedimmt) · Träger und Fassade werden aktiv · Volumen und Mesh treten zurück (gedimmt) — Begründungen im Tooltip.» | Matrix (§1.2), reine Ableitung |
| **3 · Plankopf-Preset** | Matrix-Stufe `VS → VP` (`siaZuMatrixStufe()`, `derive/plankopf.ts:194`) — damit fällt insbesondere das VS-Wasserzeichen «STUDIE — NICHT FÜR AUSFÜHRUNG» (`plankopf.ts:114`) weg. Der Dialog benennt das explizit (K40/R6 hängt hier dran und wird im selben Moment sichtbar statt überraschend). | bestehende Ableitung, folgt automatisch aus Block 1 |
| **4 · Massstabs-/Darstellungs-Empfehlung** | `empfohlenePlanPhase('vorprojekt') = 'vorprojekt'` (`doc.ts:122`) — Vorschlag: Plan-Darstellung von Wettbewerbs-Poché (1:500/1:200-Duktus) auf Vorprojekt (1:200/1:100, Regelwerk `PLAN-DETAILLIERUNG.md`). **Als vorangekreuzte, abwählbare Option** — `BauPhase` und `SiaPhase` sind heute BEWUSST entkoppelt (`doc.ts`-Kommentar «Owner-Kontrolle, keine Überraschungen»); der Dialog macht die Kopplung erstmals bequem, ohne sie zu erzwingen → R9. | bestehende Empfehlungsfunktion + `design.eigenschaftSetzen`-Weg für `phase` |

Bestätigen führt die Schritte als **eine atomare Undo-Gruppe** über den
bestehenden `runCommand`-Weg aus (dasselbe Muster wie Kosmo-Diff-Karten
beim «Anwenden»). «Transformieren» ist damit kein neues Kernel-Konzept,
sondern ein benannter, erklärter Bündel-Moment über bestehenden Commands.

Rückwärts-Transformationen (Vorprojekt → Wettbewerb, z.B. für eine
Studie) bleiben erlaubt — derselbe Dialog, umgekehrte Erzählung. Keine
Einweg-Schranke erfinden.

### 1.4 (c) Technischer Schnitt — OHNE Kernel-Erfindungen

Grundsatz: **die Phase ist bereits Doc-Setting, alles Weitere ist pure
Ableitung.** Es entsteht kein neues Entity, kein neuer Kernel-Command,
kein Golden-Risiko (reine UI-Verfügbarkeit).

1. **Quelle (Ist, per grep verifiziert):** `doc.settings.siaPhase`
   (`model/doc.ts:362`, 8 Werte; einziger Schreibweg
   `design.siaPhaseSetzen`). Die App liest sie heute schon rein
   ableitend an drei Stellen in `state/`:
   `state/orbit-rang.ts` (`sia112Gruppe()`/BASE — Stations-Rang),
   `state/oberflaeche-adaption.ts:134-136,270` (Adaptions-Kontext,
   dimmt Gruppen u.a. bei `siaPhase==='ausfuehrung'`),
   `state/arbeitsmodi-kern.ts:86-159` (Arbeitsmodus-Scoring je Phase).
   Die Werkzeug-Matrix wird die vierte Lese-Stelle — gleiches Muster,
   kein neuer Zustand.
2. **Matrix als Datendatei:** neu
   `apps/kosmo-orbit/src/state/phasen-werkzeug-matrix.ts` — analog
   `oberflaeche-adaption-data.ts` (reine Daten-Konfiguration, ohne
   React/DOM/Doc). Je Eintrag: `werkzeugId`, 5 Zustände, `grund`
   (Tooltip-Text, deutsch). Dazu EINE pure Funktion
   `werkzeugPhasenZustand(werkzeugId, siaPhase): 'aktiv'|'gedimmt'|'aus'`
   über `sia112Gruppe()`. Voll testbar ohne Fixtures.
3. **Anzeige-Logik in den Insel-Katalogen:** die Kataloge
   (`island-katalog.ts`, `vis-`/`prepare-`/`publish-`Pendants) bleiben
   **unverändert statisch** — der Phasen-Zustand wird beim Rendern
   angeheftet, nicht in die Katalogdaten geschrieben (Katalog = was es
   gibt; Matrix = was die Phase davon zeigt). `IslandBuehne`/die
   Insel-Leiste wertet je Werkzeug `werkzeugPhasenZustand()` aus:
   gedimmt = bestehende Dimm-Optik (das Adaptions-System dimmt heute
   schon Gruppen — gleiche visuelle Sprache, `fokusKlasse`-Muster) +
   `title`-Tooltip aus `grund`; aus = Werkzeug wird nicht gerendert.
4. **«Gedimmt + Begründungs-Tooltip» als Default** (Referenz Teil 3,
   Empfehlung 2): hartes «aus» nur für die 13 owner-bestätigten Zellen.
   Ein gedimmtes Werkzeug bleibt klickbar — erster Klick zeigt die
   Begründung an Ort (Popup-Kopf), zweiter Klick arbeitet normal. Kein
   «wo ist mein Werkzeug hin».
5. **Kosmo-Automation als Command-Vorschlag:** Kosmo erfindet nichts
   Neues — er schlägt `design.siaPhaseSetzen` als Diff-Karte vor (der
   Command ist via `commandTools()` bereits Kosmo-Werkzeug), z.B. wenn
   Projektsignale nicht zur Phase passen («Baugesuch-Blätter existieren,
   Phase steht noch auf Wettbewerb — transformieren?»). Die Karte
   listet die Werkzeug-/Plankopf-Konsequenzen aus der Matrix (App-seitig
   berechnet). Matrix-PFLEGE durch Kosmo (K29 «automatisiert») ist
   Vorschlagswesen: Kosmo formuliert Matrix-Änderungen als Text-Vorschlag
   an den Owner — die Datei ändert nur ein Mensch/Commit. Ehrlich: keine
   sich selbst umschreibende Konfiguration.
6. **Verträge, die sich bewegen:** `e2e/phasen-leiste.spec.ts` (und der
   Neuigkeiten-Eintrag zur Leiste) hängen an der Kopfzeilen-Pill — der
   K5-Umzug ist ein deklarierter E2E-Vertragswechsel, im Bauauftrag als
   Sanktion zu führen. Goldens bleiben unberührt (das Plankopf-Preset
   wechselt nur, wenn der Nutzer wirklich transformiert — wie heute beim
   Pill-Klick auch).

### 1.5 (d) Etappierung

| Etappe | Inhalt | Aufwand |
|---|---|---|
| **S** (< 1 Paket) | Matrix-Datei + `werkzeugPhasenZustand()` + Tests; Dimmen inkl. Tooltip NUR in der design-ZEICHNEN-Insel (11 Werkzeuge — der sichtbarste Beweis); PROJEKT-Insel `phase` zeigt die Konsequenzen der aktuellen Phase read-only. Kopfzeile bleibt vorerst. | S |
| **M** (1 Paket) | K5 komplett: PhasenLeiste raus (E2E-Vertragswechsel deklariert), Sektion «Phase & Transformation» in den Projekt-Einstellungen, Transformieren-Dialog mit den vier Vorschau-Blöcken (§1.3) als atomare Undo-Gruppe; Matrix auf alle vier design-Inseln + read-only Phasen-Chip (falls R8 = behalten). | M |
| **L** (mehrere Pakete) | Kosmo-Automation (proaktive Transformations-Karten, Matrix-Erklärungen im Chat); **Werkzeug-TIEFEN-Staffelung** (Detail-Sektionen der Einstellungsdialoge je Phase — Stützen-Detail/Profil ab Baueingabe, K30; setzt den Dialog-Rahmen aus Lückenliste §4.1-1 voraus); Matrix-Anschluss der übrigen Stationen (vis/publish/prepare-Inseln); Feinauflösung 8 Teilphasen, wo Gruppe 3 zu grob ist (Entwurfstools bis Bauprojekt aktiv, ab Bewilligung gedimmt). | L |

---

## TEIL 2 — K47: KosmoPrepare als visuelle Anschauung

> Owner (K47): «denke für kosmoprepare können wir evtg auch als visuelle
> anschauung aufbauen, hast du da eine idee?»

### 2.1 Ist-Zustand (quer gelesen)

`modules/prepare/` hat zwei Gesichter:

- **Manuell** (`PrepareWorkspace.tsx` ab Z.176): eine vertikale
  Formular-Strecke — Drag&Drop-Aufnahmezone, Wissenssuche, «Nachträglich
  vektorisieren», Basis-Import, Dokumentliste (Name/Seiten/Abschnitte/
  Datum), Wettbewerbsdossier «Phase 0» (Do/No-go/Fakt-Karteikarten,
  `design.dossierSetzen`), OneDrive-Browser. Funktional ehrlich, aber
  eine LISTE — nichts daran ist anschaulich.
- **Island** (Default, `prepare-island-katalog.ts`): vier Inseln
  (AUFNAHME/WISSEN/BESTAND/AUSTAUSCH, 9 Werkzeuge) um eine **fast leere
  Bühne** — `prepare-island-stand` zeigt nur «N Dokumente · M
  Abschnitte» als Zahl (bewusster PC4-Schnitt: «Prepare hat keine
  Zeichenfläche wie design/vis»).

Genau diese leere Bühnenmitte ist die Chance: K47 heisst, der Station
eine **Bühne** zu geben, ohne die Insel-Logik anzufassen. Wichtig ist
auch, was an Daten SCHON existiert und nur nicht gezeigt wird: die
Dossier-Einträge (Doc-Setting), `KnowledgeDoc`-Metadaten (Name, Seiten,
Abschnitte, `addedAt`, Quelle datei/onedrive/basis) und die
Parzellen-/Standort-Commands aus dem Kernel (`baugrenzeSetzen`,
`nachbarnUebernehmen`, `standortSetzen` — heute nur über
Stammdaten/Kosmo bedient, Lückenliste §1.3).

### 2.2 Variante A — **Dossier-Board** (Karten je Grundlagen-Kategorie)

**Skizze in Worten:** die Bühnenmitte wird ein ruhiges Board aus fünf
Karten-Stapeln: **Dokumente** (aufgenommene PDFs/Texte, je Karte
Titelblatt-Miniatur oder Typ-Signet, Seiten-/Abschnittszahl),
**Parzelle & Standort** (Miniatur des Baugrenzen-Polygons aus den
echten Doc-Daten, Adresse/Koordinaten, Nachbarn-Stand), **Recht &
Regeln** (die Phase-0-Dossier-Einträge als Do/No-go/Fakt-Karten — sie
sind heute im Manuell-Modus versteckt), **GIS & Behörden** (ehrlicher
Platzhalter-Stapel: benennt, was fehlt und wo es herkäme — kein
vorgetäuschter Inhalt), **Fotos** (Bild-Assets, sobald vorhanden). Jede
Karte trägt einen kleinen Reife-Punkt (vorhanden/lückenhaft/leer, rein
aus Zähldaten), das Board wird so zur **Grundlagen-Checkliste, die man
ansieht statt liest**. Klick auf einen Stapel öffnet das zugehörige
Insel-Popup (AUFNAHME/BESTAND) — das Board ist Anzeige, die Inseln
bleiben die Bedienung.

**Aufwand:** M (Board + Doc-Miniaturen S/M; Parzellen-Miniatur nutzt
bestehende derive-Geometrie; keine neue Datenquelle nötig).

### 2.3 Variante B — **Standort-Karte als Bühne**

**Skizze in Worten:** die Bühne IST die Karte: Parzelle zentriert
(Baugrenzen-Polygon), Nachbargebäude aus `nachbarnUebernehmen`,
Nordpfeil, Massstabsbalken; die Grundlagen docken als Pins/Chips an der
Karte an (Dokumente unten als Ablageband, Dossier-Regeln als
Regel-Fähnchen an der Parzelle: «Grenzabstand», «No-go Nordwohnungen»).
Das ist die stärkste «Anschauung» — der Ort wird zum Ordnungsprinzip
der Grundlagen. **Ehrlichkeitsgrenze:** echte Hintergrund-Karten
(swisstopo/OSM-Kacheln) brauchen Netz und Lizenz-Klärung — lokal-first
heisst der Default ist die **abstrakte Karte aus eigenen Doc-Daten**
(Polygon + Nachbarn), Online-Kacheln nur als zuschaltbare, offen
benannte Option (R10).

**Aufwand:** L (Karten-Bühne, Pin-Layout, Leerzustand ohne Parzelle;
Online-Variante zusätzlich Lizenz/Proxy-Arbeit).

### 2.4 Variante C — **Zeitstrahl der Aufnahme** (Chronik)

**Skizze in Worten:** unter der Bühne ein horizontaler Zeitstrahl aus
`addedAt`: wann welche Grundlage kam (Datei/OneDrive/Basis farblich
unterschieden), gruppiert nach Tag — «die Geschichte der Wissensbasis».
Passt zu K52 (Consumer-Sicht «was Kosmo erfasst hat») und macht die
Station lebendig, trägt aber allein keine Bühne.

**Aufwand:** S (Daten liegen vollständig vor).

### 2.5 Empfehlung

**A als Kern, C als Unterzeile, B abstrakt in A integriert:** das
Dossier-Board wird die Bühne (M), der Zeitstrahl seine Fusszeile (S),
und die Parzellen-/Standort-Karte startet als EINE Board-Karte aus
echten Doc-Daten statt als eigene Karten-Bühne — sie kann später zur
Vollvariante B wachsen, wenn der Owner die Online-Kartenfrage (R10)
entschieden hat. So entsteht sichtbarer Demo-Wert (F25: jede Station
muss im Demobeweis tragen) ohne Netz-Abhängigkeit und ohne die frische
Insel-Logik umzubauen.

---

## TEIL 3 — K48c: KosmoData-UI-Ideen (jenseits der Insellogik)

> Owner (K48): «…kannst du dir noch weitere intuitive ui ideen konzhepte
> überlegen? wie wir das weiterenwickeln können?»
> (K48a Insellogik = eigener Bauposten, K48b Label-Fix = Sofort-Batch —
> beides hier NICHT behandelt.)

### 3.1 Ist-Zustand (quer gelesen)

`DataWorkspace.tsx`: **acht Reiter** (Übersicht · Referenzen ·
Bauteilkatalog CH · Materialien · Wissen · Training · Gedächtnis ·
Archiv). Referenzen ist eine 3-Spalten-Tabellenfläche (Facetten-Rail,
`ReferenzTabelle`, Dossier mit Medien/Analyse-Ebenen/Querverweisen);
Hero-Bilder laufen lazy über einen Blob-Store (`RefHeroBild`);
Gedächtnis↔Wissen↔Referenz sind bereits verknüpft
(`gedaechtnisQuerverweise`, `searchKnowledge` im Dossier). Der Charakter
ist durchgehend **tabellarisch-textlich** — fachlich stark, visuell eine
Datenbank. Für eine Referenz-BIBLIOTHEK eines Architekturbüros ist das
die falsche Erzählform: Referenzen wirken über Bilder.

### 3.2 Idee 1 — **Referenz-Wand** (Moodboard-Modus statt nur Tabelle)

Zweiter Anzeigemodus im Referenzen-Reiter (Umschalter Tabelle ⇄ Wand):
eine Bilderwand aus Hero-Bildern, Facetten/Suche wirken identisch weiter
(dieselbe `filtered`-Liste), Hover zeigt Titel/Jahr/Architekt, Klick
öffnet das bestehende Dossier. Ehrlich mit dem Seed umgehen: Einträge
ohne Bild erscheinen als typografische Kachel (Signet + Titel — das
`DataLeerbild`-Muster), nicht als kaputtes Bild. **Nutzen:** die
Bibliothek wird zum Schaufenster — im 1.0-Demobeweis (F25) ist «Referenzen
zeigen» eine Bilder-Szene statt einer Tabellen-Szene. **Aufwand:** M.

### 3.3 Idee 2 — **Material-Kacheln mit echten Texturen**

Der Materialien-Reiter zeigt Kacheln mit realer Textur-Vorschau, wo ein
Material-Asset existiert (`asset-bibliothek`/`erfasseMaterial`), sonst
Farbfeld+Signet; U-Wert/Dicke/Schraffur-Vorschau als Overlay, Sprung in
den Bauteilkatalog, wo das Material in Aufbauten vorkommt. **Nutzen:**
Materialwahl wird sinnlich statt tabellarisch und füttert direkt die
Design-/Vis-Erzählung (F6 «Kosmo als Partner» + Plansatz-Qualität).
**Aufwand:** M (Kachel-UI S; Textur-Beschaffung ist ehrlich benannt
Owner-/Asset-Arbeit, keine erfundenen Texturen).

### 3.4 Idee 3 — **«Was Kosmo gelernt hat»-Feed** (Übersicht wird lebendig, K52-Anschluss)

Der Übersicht-Reiter bekommt einen chronologischen Feed aus vorhandenen
Quellen: neue Lernjournal-Einträge (`LearningJournal`), neu aufgenommene
Wissensdokumente, importierte eigene Referenzen, Trainings-Stand — als
freundliche Konsumenten-Erzählung («Kosmo hat aus deinem Feedback zu
‹Therme Vals› gelernt», «3 Dokumente zur Wissensbasis dazugekommen»).
Das ist exakt die Consumer-Sicht, die K52 von der Diagnose fordert, nur
am richtigen Wohnort (KosmoData = Gedächtnis-Station). **Nutzen:** macht
das unsichtbarste 1.0-Versprechen («Kosmo lernt mit») täglich sichtbar —
Demo-Gold für F25. **Aufwand:** S/M (alle Quellen existieren; nur
Aggregation + Feed-UI).

### 3.5 Idee 4 — **Wissens-Graph** (Referenz↔Wissen↔Gedächtnis als Netz)

Die bestehenden Querverweise als klickbares Netz visualisieren (Knoten =
Referenzen/Dokumente/Lerneinträge, Kanten = die echten `refId`-/
Text-Match-Verknüpfungen). **Aber:** K35 hat gerade eine Übersichts-
Visualisierung als «bringt nichts» gestrichen — ein Graph überzeugt nur,
wenn er BEDIENUNG ist (Klick navigiert, Filter wirken), nicht Deko.
**Nutzen:** hoch für Wissensarbeit, unklar für den Alltag. **Aufwand:** L.
Empfehlung: zurückstellen, bis Ideen 1+3 gelandet sind und zeigen, ob
die Querverweise überhaupt intensiv genutzt werden.

### 3.6 Empfehlung (an der F25-Latte gemessen)

Reihenfolge **Idee 3 → Idee 1 → Idee 2 → (Idee 4 nur nach Beweis)**:
der Lern-Feed ist der billigste sichtbare Fortschritt und bedient K52
gleich mit; die Referenz-Wand ist der grösste Demo-Sprung der Station;
Material-Kacheln folgen, sobald echte Texturen als Assets da sind. Alles
vier ist additiv zur kommenden Insellogik (K48a) — die Inseln bedienen,
diese Flächen erzählen.

---

## Schluss — Owner-Entscheide, die es braucht (R7 ff., anschliessend an R1–R6)

- **R7 (K29):** Die 13 vorgeschlagenen «aus»-Zellen (Volumen ab
  Ausschreibung, Mesh in der Ausschreibung, Träger/Fassade/Masskette/
  Etikett/Aussparung in frühen Phasen, Mangel vor der Realisierung) —
  je Werkzeug bestätigen, oder sollen einzelne davon nur «gedimmt»
  bleiben? (Default bis zur Antwort: alles nur gedimmt — deckt sich mit
  der offenen Frage 5 der ArchiCAD-Referenz.)
- **R8 (K5):** Kopfzeile nach dem Umzug — kleiner read-only Phasen-Chip
  (Klick führt zu den Projekt-Einstellungen) behalten, oder Phase ganz
  aus der Kopfzeile?
- **R9 (K5):** Darf der Transformieren-Dialog die Plan-Darstellung
  (`BauPhase`, Massstabs-/Poché-Empfehlung) als vorangekreuzte,
  abwählbare Option MIT umstellen? Die Entkopplung SiaPhase↔BauPhase war
  ein bewusster Owner-Schutz («keine Überraschungen») — der Dialog würde
  sie erstmals bequem, aber sichtbar koppeln.
- **R10 (K47):** Dossier-Board als Prepare-Bühne bestätigen — und für
  die Standort-Karte: reicht die abstrakte Parzellen-Darstellung aus
  eigenen Doc-Daten (offline), oder willst du zuschaltbare
  Online-Kartenkacheln (swisstopo — braucht Netz + Lizenzklärung)?
- **R11 (K48c):** Reihenfolge Lern-Feed → Referenz-Wand → Material-
  Kacheln bestätigen; Wissens-Graph bewusst zurückgestellt (K35-Lehre:
  keine Deko-Visualisierung) — einverstanden?
- **R12 (K29/K30):** Zweite Matrix-Ebene «Werkzeug-Tiefe» (Detail-
  Sektionen der Einstellungsdialoge erst ab Baueingabe — dein
  Stützen-Beispiel) als Etappe L bestätigen? Sie setzt den
  Einstellungsdialog-Rahmen (Lückenliste Teil 4.1, Punkt 1) voraus.
