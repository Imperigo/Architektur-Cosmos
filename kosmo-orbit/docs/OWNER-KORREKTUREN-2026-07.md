# OWNER-KORREKTUREN — Rundown-PDF v0.8.10 (annotiert 21.07.2026)

> **Quelle:** annotiertes `KosmoOrbitRundownv0.8.10.pdf` (Owner-Upload
> 21.07.2026, 00:00Z, vor dem 14h-Autonomiefenster). Die Kommentare sind
> als Textlayer eingebettet und hier **verlustfrei, wortwörtlich**
> übernommen (Schreibweise unverändert — Zitate sind Owner-Original).
> **Owner-Order (wörtlich):** «behande dort jeden einzlenen kommentar
> als einzelner sehr wichtiger punkt zum erfüllen, jeder punkt muss
> akribisch von als goldwert empfunden werden. das heisst das wird nicht
> nur ein paar wenige batche arbeit sondern mehrere wochen in anspruch
> nehmen.»
>
> **Betriebsregeln dieses Registers:**
> 1. Ein Punkt gilt erst als erledigt, wenn er mit Beweis geschlossen
>    ist (Test/Screenshot/ROADMAP-Eintrag mit Nummer) — Status wird hier
>    nachgeführt.
> 2. Kein Punkt wird stillschweigend weggewichtet oder zusammengelegt.
> 3. Rückfragen an den Owner werden je Punkt gesammelt (Abschnitt
>    «Rückfragen» am Ende), blockieren aber nur den einzelnen Punkt.
> 4. Owner-Ansage S.2 (K8): das kommende **ClaudeDesign-Package hat
>    VORRANG vor den Layout-Notizen** — layoutnahe Punkte der Zentrale
>    werden vorbereitet, aber erst mit dem Package final gebaut.
> 5. Das «Gestaltungskonzept vom Hauptmenü» liefert der Owner nach —
>    bis dahin gilt Regel 4 auch dort.
>
> **Aufwandsklassen:** S (< 1 Paket) · M (1 Paket) · L (mehrere Pakete)
> · XL (eigener Versions-Strang). **Status:** offen · in Arbeit ·
> erledigt (mit ROADMAP-Nr.) · Rückfrage.

---

## Zentrale / Startbildschirm (Seite 2)

### K1 · S.2 — Phasen-Insel zentriert oben Mitte
> «insel zentriert oben mitte»
**Deutung:** die obere Leisten-Insel (Phasen/Aktionen) horizontal
zentrieren. **Bereich:** shell/OrbitStart. **Aufwand:** S.
**Einordnung:** mit K5/K8 zusammen bauen (Zentrale-Umbau unter
ClaudeDesign-Package-Vorrang). **Status:** PACKAGE EINGETROFFEN
(21.07. ~12:25Z, ROADMAP 583, docs/owner-packages/2026-07-21-startsequenz/)
— Zentrale-/Start-Umbau damit entblockt, Bau = 0.8.12-Hauptposten.

### K2 · S.2 — Willkommenstext ohne Punkte, unter dem Logo
> «willkommenstext ohne punkte, angeordnet unter kosmoorbit logo,
> mittig zentral unter der insel»
**Deutung:** Begrüssung als reiner Satz (keine Bullet-Punkte), Position:
Logo → darunter Willkommenstext, alles mittig. **Bereich:**
shell/OrbitStart. **Aufwand:** S. **Status:** offen (Package-Vorrang K8).

### K3 · S.2 — Projektauswahl als zentrale Tableiste, kein «AI-Slop»
> «interface upgraden und intelligenter projektauswahl tableiste machen,
> ebenfalls mittig zentral unter willkommenstext, tableiste beinhaltet
> nur die projekte, kein ai slop „womit beginnen wir) kosmo design ist
> zum zeichnen bereit.. das ist shit»
**Deutung:** die linke Projektspalte wird zu einer mittigen, intelligenten
Projekt-Tableiste; Floskeln wie «Womit beginnen wir? KosmoDesign ist
bereit zum Zeichnen.» fliegen raus. **Bereich:** shell/OrbitStart.
**Aufwand:** M. **Status:** offen (Package-Vorrang K8).

### K4 · S.2 — «Rolle: neutral» hinterfragen
> «was ist das hier rolle neutral? ist es wichtig? wenn ja, baue es in
> inseltab als auswahl ein»
**Deutung:** der Rollen-Chip (design.rolleSetzen, entwurf/ausfuehrung/
admin) ist unerklärt; entweder als Auswahl in den Insel-Tab integrieren
oder von der Startfläche nehmen. **Aufwand:** S. **Status:** offen —
**Rückfrage R1** (behalten als Insel-Auswahl oder ganz raus?).

### K5 · S.2 — SIA-Phasen-Tableiste raus aus der Kopfzeile, Phase wird Projekt-Eigenschaft
> «die aktuelle insel hier ist eigendlich projektbezogen… die bauphase
> wird nur 1x im halbjahr oder jahr gewechselt…das heisst man stellt die
> projektphase in der projektdatei in den einstellungen dann um und
> transformiert das z.b wettbewerbsprojekt ins vorprojekt um…diese
> tableiste ist so eigendlich nutzlos»
**Deutung:** die permanenten Phasen-Buttons (1 Strategie … 5
Realisierung) verschwinden aus dem Kopf; die Phase lebt in den
Projekt-Einstellungen, mit einem «Transformieren»-Schritt (Wettbewerb →
Vorprojekt). Hängt eng mit K29 (phasengebundene Werkzeuge) zusammen.
**Bereich:** shell/Kopfzeile + Projekt-Einstellungen + Kernel
(Phase ist bereits Doc-Setting). **Aufwand:** M. **Status:** offen.

### K6 · S.2 — Speichern/Öffnen projektbezogen, Auto-Save als Default
> «speicher öffnen ist ebenfalls nur nötig wenn projekt geöffnet ist,
> wir speichern die einzelnen projekte und nicht die ganze software.
> projektspeichern ist default jeder schritt»
**Deutung:** Speichern/Öffnen-Knöpfe nur im Projektkontext zeigen;
Semantik: Projekte werden gespeichert, nicht «die Software»; Auto-Save
je Schritt ist der Normalfall (Autosave existiert — die UI muss es so
erzählen). **Aufwand:** S/M. **Status:**
ERLEDIGT (ROADMAP 579 — Zentrale ohne Speichern/Öffnen, «Weitergeben
(.kosmo)»/«Projekt öffnen», Auto-Save-Indikator `autosave-status`).

### K7 · S.2 — Einstellungen + Hilfe präsenter, Sync daneben
> «einstellung ist KosmoOrbit grundeinstellungen und fragenzeichen, die
> beiden dürfen präsenter sein. sync aus ist daneben»
**Deutung:** ⚙ und ? sind Grundfunktionen und dürfen sichtbarer sein;
Sync-Status gruppiert daneben. **Aufwand:** S. **Status:** ERLEDIGT
(ROADMAP 577 — 44px-Kreisknöpfe im Werkplan-Duktus, Sync in der
Grundfunktionen-Gruppe direkt daneben).

### K8 · S.2 — ClaudeDesign-Package hat VORRANG (Meta-Regel)
> «du bekommst noch ein claudedesign package für startanimationen etc.
> nutze primär um startmenü etc. mitzuentwickeln. vorrang hat das
> designkonzept vom package, nicht die notizen hier drin, die sind
> zweitrangig.l»
**Deutung:** Meta-Regel für alle Zentrale-Punkte (K1–K3, K9–K12):
vorbereiten ja, final bauen erst mit dem Package. Owner liefert das
Gestaltungskonzept vom Hauptmenü nach (Ansage 21.07.). **Status:**
wartet auf Owner-Lieferung — als Regel SOFORT gültig.

### K9 · S.2 — KosmoOrbit-Logo grösser
> «logo darf grösser sein (kosmoorbit)»
**Aufwand:** S. **Status:** offen (Package-Vorrang).

### K10 · S.2 — Tool-Logos gegen Logokonzepte prüfen
> «prüfe in den gestaltungskonzepten ob die logos der einzelnen tools
> die richtigen sind, die sehen aktuell nicht gut aus und stimmen nicht
> mit den anderen logokonzepten zusammen. entweder fordere von mir neue
> logo desings an dann mach ich das noch mit claudedesign oder wenn du
> die findest setze sei ein»
**Deutung:** Abgleich Kachel-Logos ↔ `docs/GESTALTUNGSKONZEPT.md` +
Logo-Assets; Befund erstellen; fehlende Logos beim Owner anfordern.
**Aufwand:** S (Befund) + M (Umsetzung). **Status:** offen —
Befund ist Sofort-Arbeit, Ergebnis wird **Rückfrage R2** (neue Logos
nötig?).

### K11 · S.2 — Kosmo als präsenter Leiter der Startsequenz
> «interface von kosmo darf ins startsequenz mithineinanimiert werden
> und soll präsent auf dem startmenü werden alles klarer leiter der
> software. er soll ebenfalls zentral mittig irgendwo grösser platz
> bekommen und direkt startseqzenzen einleiten wie willkommenstexte und
> kommunikatikonsstart mit user, eine minimaler rundwon der
> grundlegenden infos wie tag, projekstand, zusammenfassung der
> arbeitswoche, der letzten grossen änderungen im projekt etc.»
**Deutung:** Kosmo wird auf der Zentrale zur zentralen, animierten
Figur: begrüsst, startet die Kommunikation, liefert ein Mini-Rundown
(Tag, Projektstand, Wochen-Zusammenfassung, letzte grosse Änderungen —
Datenquellen existieren: Journal/Lernjournal/ROADMAP der Projekte).
**Aufwand:** L. **Status:** offen (Package-Vorrang für die Optik;
Daten-Rundown-Logik kann vorbereitet werden).

### K12 · S.2 — Die vier Haupttools präsenter in der Mitte
> «die vier tools dürfen mehr präsent in der mitte sein»
**Aufwand:** S. **Status:** offen (Package-Vorrang).

## Fächer (Seite 3)

### K13 · S.3 — Fächer-Untertools als gerade, nüchterne Blöcke mit ganzen Logos
> «entwerfen modeliieren , draw, prepare, vis und so bitte sauber
> machen, gerade und nüchterne blöcke und ganze logos bitte»
**Deutung:** die Hover-Fächer-Einträge (Draw/Prepare/Vis/Publish/
Modellbaum) neu als saubere, gerade Blockliste mit vollständigen Logos
statt der aktuellen kleinen Kacheln. **Aufwand:** M. **Status:** offen.

## Einstellungen (Seite 4)

### K14 · S.4 — Darstellungs-Einstellungen ausbauen, ArchiCAD-Arbeitsumgebung als Referenz
> «farbakzente in darstellung dürfen mehr vibrant sein, und ergänze um
> ein paar farbakzente mehr, baue allgemein die darstellungsabteil
> weiter aus und entwickle intelligente einstellungsinterface die viel
> individualität zulassen in der dar darstellung, dazu gehört auch die
> werkezug anordlung und oberflächen presetzs. archicad hat da eine gute
> arbeitsumgebung entwickelt, recherchiere diese und baue dieselbe auf»
**Deutung:** (a) vibrantere + mehr Farbakzente, (b) Darstellungs-Sektion
ausbauen, (c) individuelle Oberflächen-Presets + Werkzeuganordnung,
(d) **Recherche ArchiCAD-Arbeitsumgebungen** (Profile/Paletten-Sets) als
Referenzbericht, dann nachbauen. **Aufwand:** L (Recherche S vorab).
**Status:** offen.

### K15 · S.4 — Manuelle Ansicht ist ein ALLE-Tools-Konzept
> «die manuelle ansicht gilt für alle tools, es ist nicht eine ätlere
> einstellung sondern es ist einfach eine klassische cad oberfläche zum
> manuell zeichnen wenn man möchte die island ui ist die intelligente
> standard oberfläche.. das heist nicht nur bei kosmovis sondern auch
> bei anderen tools» · «die werkzeug anordnung ist unterkategorie der
> manuellen ansicht»
**Deutung:** WICHTIGE Kurskorrektur: «Manuelle Ansicht» ist kein
Vis-Altlasten-Schalter, sondern ein gleichwertiges klassisches
CAD-Oberflächen-Konzept für ALLE Stationen (Design/Publish/Prepare
haben es heute implizit als Werkzeugleisten-Modus — es wird als EIN
konsistenter Schalter je Station geführt); die Werkzeuganordnung (K14c)
ist Unterkategorie davon. **Konsequenz:** die geplante 0.9.0-
«Manuell-Codepfad-Löschung» in Vis wird NEU BEWERTET — nicht löschen,
sondern als gepflegte klassische Ansicht führen. **Aufwand:** L.
**Status:** offen — **Rückfrage R3** (bestätigt das die Rücknahme der
Vis-Codepfad-Löschung? Ich lese es so).

## Arbeitsbuch / KosmoDesign (Seiten 5–12)

### K16 · S.5 — Fehlendes Symbol oben rechts
> «hier ist das symbol weg»
**Deutung:** auf dem Screenshot fehlt oben rechts ein Icon (leerer
weisser Kreis) — Icon-Regression im Viewport-Chrome finden und fixen.
**Aufwand:** S. **Status:** ERLEDIGT (ROADMAP 574 — Doppelwurzel
app-druck-reset-Override + Textzeichen statt KIcon, E2E-Beweis).

### K17 · S.5 — Insel-Randabstand uneinheitlich
> «wieso ist diese island nicht gleicher abstand wie die anderen zum
> rand?»
**Deutung:** ZEICHNEN-Insel hat anderen Randabstand als die übrigen
Inseln — Token/CSS vereinheitlichen. **Aufwand:** S. **Status:**
ERLEDIGT (ROADMAP 574 — Token --isl-rand-abstand 14px, E2E-Messtest).

### K18 · S.6 — Massketten: Verlängerungslinien + Abstand als Default
> «die massketten sollen default mässig verlängerungslinien haben und
> einen gesunden abstand zur verlinkten kante oder ecke haben»
**Bereich:** kernel derive/plan (Golden-relevant! deklarierter
Golden-Zug nötig). **Aufwand:** M. **Status:** offen.

### K19 · S.6 — Umrandungslinien/Texturen im Plan prüfen
> «was ist mit den umrandungslinien passiert? und stimmen die texturen?»
**Deutung:** im 2D-Plan wirken Wandkonturen/Schraffur-Texturen anders
als erwartet — Diagnose gegen ältere Stände, Befund vorlegen.
**Aufwand:** S (Diagnose). **Status:** BEFUND GELIEFERT (ROADMAP 570,
`docs/BEFUNDE-KORREKTUREN-2026-07.md` Befund 2 — Erklärung LOD/
Darstellungszustand je Phase; Statuszeile hier war nachhinkend).

### K20 · S.6 — 3D-Viewer-Hintergrund weiss
> «auch bei der kosmo darstellung sollte der 3d viewer der hintergrund
> weiss sein, nicht schwarz bitte»
**Deutung:** heller Viewport-Hintergrund als Standard (mindestens für
die Modell-Darstellung; Betrifft Screenshot-/Blick-Darstellung ebenso).
**Aufwand:** S/M (Golden-neutral, aber E2E-Screens ändern sich).
**Status:** ERLEDIGT (ROADMAP 580 — orbit-Override von `--k-viewport-sky`
entfernt, beide Themes hell `#edeae2`; Restposten: Bodenraster auf
hellem Himmel kaum sichtbar — Fable-Diagnoseversuch 21.07. dokumentiert:
dunklere Linienfarben UND +y-Offset gegen Z-Fighting änderten das Bild
NICHT (Bundle-Stand + SW-Bypass verifiziert), nur das verdichtete
Fernfeld-Band rendert; Nahbereich-Ursache DIAGNOSTIZIERT
(ROADMAP 581, docs/BEFUND-RASTER-NAHBEREICH.md): SwiftShader-
Rasterisierung verliert kameranahe Abschnitte der 200-Einheiten-
GridHelper-Linien; Fix = segmentiertes Raster (0.8.12), Vorbehalt:
echte GPU-Hardware evtl. gar nicht betroffen).

### K21 · S.6 — ArchiCAD-Werkzeugtiefe für Fenster/Türen (Werkzeug-Einstellungsmenüs)
> «grundsätzliche frage: wie weit bist du mit dem werkzeugnachbau von
> archicad für fenster türen etc. da muss auch für jedes tool ein
> einstellungsmenü da sein wo man fenster z.b komplett verändern kann,
> siehe einstellungs menü der archicad werkzeuge. implementiere alles.
> kosmo soll dann z.b super einfach das fenster verstehen ob es z.b ein
> holzmetallfenster ist oder kunstoff, 3-fach verglast wo das fenster in
> der laibung sitzt, was für fensterbank es ist etc. etc. das findest du
> in archicad werkzeugen und aber auch in den hochbauzeichner
> lehrmittel. baue alles ein.»
**Deutung:** grosser Fachbau-Strang: vollständige Fenster-/Tür-Semantik
(Rahmenmaterial, Verglasung, Laibungsposition, Fensterbank, Beschläge …
— Teilfelder existieren seit 0.8.8 E2), je Werkzeug ein echtes
Einstellungsmenü; Kosmo versteht die Semantik. Quellenarbeit:
ArchiCAD-Werkzeuge + Hochbauzeichner-Lehrmittel. **Aufwand:** XL
(eigener Strang, mehrere Versionen). **Status:** K37c GELIEFERT+
FREIGABE-Package eingetroffen (21.07., ROADMAP 583,
docs/owner-packages/2026-07-21-kosmospez-k37c/ — UI-Sprache, Token,
17 Symbole, Screens beide Farbwelten); E1-Bau weiterhin — Antwort auf
die «wie weit»-Frage gehört in den nächsten Statusbericht.

### K22 · S.6 — Kosmo-Orb-Optik: glasig, Tool-Farbe, freie Orbs, grösser
> «beim kosmologo gefällt mir der graue kreis nicht, mach den
> transparenter und in der farbe des jeweiligen tools ganz fein (glasig)
> die kleinen orbs sind ganz fein animiert und können auch ausserhalb
> dieses kreis sein, kosmo darf etwas grösser sein. frage; sind alle
> animationen für kosmo eingebaut gem. gestaltungskonzept?»
**Aufwand:** M. **Status:** ERLEDIGT (ROADMAP 575 — glasige Token,
Tool-Tönung, 40px, freie Schwarm-Orbs); Animations-Restlücken
(Panel-Eintritt, Gemini-Rim) laufen unter K50 (Befund 570).

### K23 · S.6 — Dämmschraffur orientierungsabhängig
> «wenn das hier dämmung sein sollte, dann stimmt die schraffur so
> nicht. diese muss immer sich an der orientierung anpassen, je nach dem
> wo sie ist, sie muss leserlich z.b immer horizontal oder vertikal sein
> wenn es dämmung ist, z.b bei beton ist es weniger wichtig weil dort es
> in beide richtungen gleich ist.»
**Bereich:** kernel derive/plan Schraffur (Golden-Zug nötig).
**Aufwand:** M. **Status:** offen.

### K24 · S.8 — Werkzeug-Vollständigkeit vs. ArchiCAD (Bewusstsein)
> «hier haben wir noch lange nicht alle werkzeuge von archicad
> nachgebaut, einfach das dus schon mal weist, müssen wir dann machen»
**Deutung:** Standing-Auftrag; konkretisiert sich in K21/K30/K31.
Erster Schritt: Werkzeug-Lückenliste ArchiCAD↔KosmoDesign als
Inventar. **Aufwand:** S (Inventar), XL (Ausbau). **Status:** offen.

### K25 · S.8 — Skizze-Button raus, stift-intelligente Aktivierung
> «skizze button gibt es eigendlich nicht, gezeichnet wird auf ipad oder
> per scan, wird intuitiv intelligent selbständig aktiviert wenn stift
> z.b auf ipad zeichnet»
**Deutung:** der explizite Skizzen-Modus-Knopf verschwindet; Pencil-
Input aktiviert das Skizzieren automatisch (Pencil-Erkennung existiert
im Viewport seit Serie J). **Aufwand:** M (iPad-Beweis Pflicht).
**Status:** offen.

### K26 · S.8 — Mesh-Werkzeug hinterfragen
> «mesh braucht es eigendlich auch nicht…für was ist das da?»
**Deutung:** FreeMesh-Werkzeug erklären oder aus der Insel nehmen.
**Status:** offen — **Rückfrage R4** (Antwort: FreeMesh trägt
Terrain-/Sonderkörper; Vorschlag: aus ZEICHNEN-Insel in ein
Spezial-Untermenü verschieben — ok?).

### K27 · S.8 — Textgrössen im Plan massstabsgerecht (1.8–5 mm) + intelligente Verdichtung
> «hier sind die texte viel zu gross je nach ansicht muss du text
> kleiner oder grösser machen solche textfelde sind mind 1.8mm bis max.
> 5mm gross (wie archicad, das es leserlich ist). wenn sich texte
> beginnen zu überlagern wie hier wird intelligent textmenge
> zusammengefasst oder symbole oder pop up blasen gemacht wo infos
> geöffnet werden können z.b»
**Bereich:** PlanView-Anzeige (Zoom-abhängige Textskalierung) + derive
(Druckmass) — zwei Ebenen sauber trennen. **Aufwand:** L. **Status:**
offen.

### K28 · S.8 — Raumstempel-Umrahmung zu massiv, Farbe prüfen
> «raumstempel umrahmung aktuell sehr massiv, und warum diese farbe?»
**Bereich:** PlanView/derive Zonen-Stempel. **Aufwand:** S. **Status:**
GEMILDERT (ROADMAP 574): Hypothese korrigiert — die orange Umrahmung
ist der F3-Warn-Overlay zone-verletzt (Dauerzustand bei Raumregel-
Befund), NICHT die Selektion (teal). CSS-Milderung gelandet (1.25px
zoomstabil, Tönung halbiert), Warn-Semantik bleibt. Grundsatz-Umbau
bräuchte PlanView (Cluster B) → Rückfrage R13.

### K29 · S.9 — Werkzeuge an Bauphasen binden (Analyse + Konzept)
> «okay hier z.b gutes beispiel für ein tool das man nicht in jeder
> phase benötigt… ab dem moment wo ja die baueingabe gemacht wird wird
> konzeptionell so ein entwurfstool nicht mehr benutzt weil es
> logischerweise schon defineirt ist. ich möchte das du eine solche
> analyse aufbaust und ein konzept entwickelst und strategisch
> intelligent auslegst (kosmo kann das dann auch und automatisiert) das
> tool an die bauphaser gebunden werden und je nach stadium erst dann
> auswählbar sind..verstehst du?»
**Deutung:** Phasen-Werkzeug-Matrix (welches Werkzeug in welcher
SIA-Phase aktiv/ausgeblendet), als Konzeptdokument + Kosmo-Automation;
verbindet sich mit K5. Die bestehende Werkzeug-Staffelung (082-P6) ist
der Anknüpfpunkt. **Aufwand:** M (Konzept) + L (Umsetzung). **Status:**
offen.

### K30 · S.9 — Stützen-Grundrissdetail + ArchiCAD-Profil-Manager
> «hier muss noch ein grundrissdetail von der sttüze rein. der profil-
> manager von archicad unbedingt bauen um solche profile entwickeln zu
> können und hier direkt auch als stütze verwenden zu können.»
**Deutung:** (a) Inspector zeigt Grundriss-Schnittdetail der Stütze,
(b) Profil-Editor (Profile definieren, als Stütze/Träger verwenden).
**Aufwand:** (a) S/M, (b) L. **Status:** offen.

### K31 · S.9 — Ebenen-Konzept nach ArchiCAD (Ebenen + Kombinationen), Kosmo-Autokategorisierung
> «mit ebene allgemein meine ich nicht ob es ifc oder dxf ist,
> analysiere das „ebenen-tool und ebenen kombinationen von archicad…das
> meine ich mit ebenen… kosmo kategorisiert automatisch z.b alle stützen
> nach bkp nummer auf „(bkp-nummer) Stütze“ z.b»
**Deutung:** echtes Ebenen-System (Sichtbarkeits-/Sperr-Ebenen +
Kombinationen als benannte Sets) statt nur DXF-Exportebene (0.8.9 E2
war bewusst nur Interop); Kosmo kategorisiert automatisch (BKP).
**Aufwand:** L. **Status:** offen.

### K32 · S.12 — Kosmo-Panel als glasiges Overlay mit Sprechblasen
> «kosmo ist nach wie vor gestalterisch noch nicht so wie ich es
> möchte… aktuell ist es ein balken rechts, ich möchte kosmo immer als
> overlay (glasig) also es liegt über den anderen dingen (achtung pass
> auf überlagerungen auf… die textkommunikatikon ist auch mit
> sprechblasen, hintergrund ist glasig oder als overlay gedacht nicht so
> ein massiver grauer block…» · «logischerweise entspringt das ganze aus
> dem kosmo logo rechts unten…und nicht als separates»
**Deutung:** KosmoPanel-Redesign: glasiges Overlay statt Seitenbalken,
Sprechblasen-Duktus, Entfaltung aus dem Orb rechts unten
(Choreografie-Basis existiert). **Aufwand:** L. **Status:** offen.

## KosmoVis (Seiten 13–16)

### K33 · S.13 — GRAPH-Insel: Bestätigung
> «ja ist gut, hier einfach fleissig weiterentwickeln»
**Status:** zur Kenntnis — Weiterentwicklung läuft über den
Weave-Strang (`docs/REFERENZ-FIGMA-WEAVE.md`, ROADMAP 563).

### K34 · S.14 — Stimmungen NEU: HDRI-Grundlage + beschreibende Kosmo-Stimmungen
> «das mit den drei stimmungen hast du falsch verstanden… ich möchte
> hdri als grundlage für das cycles und evee render nutzen, das soll im
> nodetree auswählbar sein, zusätzlich sollen dann „beschreibende“
> stimmungen per kosmo erstellt werden könnnen. bsp ein bildauschnitt
> innenraum, aussen sonnig atmosphäre ist wohnraum, raum ist ruhig. oder
> ein ausschnitt draussen, standort ist an haupstrasse, hier ist es laut
> man fühlt sich unwohl etc etc. das ist die raumstimmung, ich möchte
> das z.b so an kosmo formulieren können. „okay kosmo für diese szene
> möchte ich eine ruhige raumatmosphäre, wohnsituation, sonniger tag 3
> uhr nachmittags, draussen spielen kinder etc. etc“ Kosmo nimmt das
> ganze auf. bezieht sich auf sein spezialwissen der architektur für z.b
> raumatmosphären die in büchern schon ähnlich beschrieben sind er sucht
> nach referenzprojekten, schlägt sie vor, und nimmt aus lora training
> massnahmen für wie das ai imaging den output steuert um dann z.b 3
> varianten mitgenerieren zu können.»
**Deutung:** Korrektur des Stimmungs-Konzepts: (a) HDRI-Auswahl als
Node-Parameter für Cycles/Eevee, (b) natürlichsprachliche
Raumatmosphären → Kosmo übersetzt in Render-/Prompt-Massnahmen
(Architektur-Fachwissen, Referenzprojekte, LoRA), 3 Varianten.
**Aufwand:** XL (Vis-Strang 0.9.0, verbindet sich mit Weave-W-Liste).
**Status:** offen.

### K35 · S.14 — Graph-Übersicht (Minimap) raus
> «diese übersicht raus, die bringt nichts»
**Bereich:** NodeCanvas-Minimap. **Aufwand:** S. **Status:** ERLEDIGT
(ROADMAP 574 — beide Modi ersatzlos entfernt, Insel-Legende lebt
eigenständig weiter als K36-Vorleistung).

### K36 · S.14 — Node-Legende um Fähigkeits-Infos erweitern
> «legende ist gut, erweitere sie an infos und was der jeweilige node
> alles kann (infos)»
**Deutung:** die (neue Insel-)Legende zeigt je Node-Typ zusätzlich, was
er kann — passt zur P-B1-Legende von 0.8.11. **Aufwand:** S/M.
**Status:** ERLEDIGT (ROADMAP 576 — Node-Infos-Akkordeon mit Zweck/
Ports/Parametern, alle 12 Typen invariant-gedeckt).

### K37 · S.15 — NEUES HAUPTTOOL «KosmoSpez» (Energie-/Klimadesign, Simulationen)
> «hier habe ich eine neue idee: wir entwickeln ein neues haupttool
> namens „KosmoSpez“. das neu neben kosmodesign, kosmodata und so ist.
> ein ganz neuer strang. […] alles was Spezialisierungen in der
> Architekturbranche ist. dazu gehört für mich das ganze Energie und
> Klimadesign eines Gebäudes, Sonnenstudien, Windstudien physikalische
> ingenieursberechnungen klimakartenstudien. Dazu habe ich an der eth
> ein ganzes fach belegt. schaue in meinem onedrive im ausbildung master
> eth architektur ordner finde ordner Energie-und Klimadesign 1 und 2
> dort drin lies alles zum Fach also vorlesungsfolien also basically
> analysiere dokumentiere erfasse alles von diesem modul und füge es dem
> lora hinzu. Das ist die grundlage für dieses Haupttool. Ergänzend alle
> funktionen die blender zu diesen themen bieten kann. wir müssen uns
> für dieses tool eine neue innovative ui konzipieren und entwickeln.
> mach mir bitte dafür eine saubere grundlage als zip und ein prompt den
> ich für claudesign geben kann damit er uns eine ui sprache für dieses
> tool entwickeln kann. du machst parallel ein sauberes framework und
> toolentwicklung der oben genannten toolsets und werkzeugen (natürlich
> auch mit insel logik). Dieses haupttool wird das technischste tool
> aller tools […] eine vollumfänlgiche recherche zu opensource
> programmen machst die wir kopieren können (lizenz verfügbar). […] ziel
> ist es dass Kosmo dieser spezialist wird und diese tools als
> spezialist bedienen kann der output ist dann immer
> „architekten-freundlich“ […] fast per knopfdruck diese simulationen
> erstellen zu können (automatisiert und kosmo intelligenz) […] dieses
> gebiet ist sehr heikel da ich architekt bin und das fachwissen nicht
> habe darum dringnst sehr grosses datenwissen aufbauen lora mit homepc,
> damit du der fachspezialist wirst, wir müssen auch mehrere
> sicherheitsebenen und warnrisiken einbauen das dieses tools nicht
> fachlich verifiziert sind sondern als entwurfsmittel für den
> architetken dienen können/sollen.»
**Deutung — Teilaufträge:** (a) Konzept/Framework «KosmoSpez» als
achtes Haupttool (Insellogik), (b) **Open-Source-Simulations-Recherche
mit Lizenzprüfung** (Ladybug/Radiance/EnergyPlus/OpenFOAM-Klasse), (c)
ZIP-Grundlage + ClaudeDesign-Prompt für die UI-Sprache, (d)
ETH-Unterlagen aus OneDrive (Energie- und Klimadesign 1+2) erfassen →
LoRA-Wissensbasis (braucht OneDrive-Zugang!), (e) Blender-Funktionen zu
den Themen, (f) Ehrlichkeits-/Warnebenen «Entwurfsmittel, nicht
fachlich verifiziert». **Aufwand:** XL — eigener Versions-Strang.
**Status:** offen — Sofort machbar: (b) Recherche + (a) Konzept + (c)
ZIP/Prompt; (d) braucht **Rückfrage R5** (OneDrive-Zugang/Export).

### K38 · S.16 — Report-Dossier: Bestätigung
> «gut, weiterentwickeln»
**Status:** zur Kenntnis.

## KosmoPublish (Seiten 17–20)

### K39 · S.17 — Publish sofort auf Insel-Darstellung
> «kosmopublish scheint noch die manuelle darstellung aktiviert zu haben
> logischerweise sofort auf inseldarstellung entwickeln wenn nicht schon
> erledigt.»
**Deutung:** der Rundown zeigte die manuelle Blattliste (für Z1);
Insel-Parität ist seit 0.8.11 P-A1 einen Schritt weiter (Blatt
umbenennen/entfernen island-only, ROADMAP 553). Rest-Lücken zur vollen
Publish-Insel-Parität inventarisieren und schliessen. **Aufwand:** M.
**Status:** teilweise erledigt (553) — Restinventar offen.

### K40 · S.17 — Wasserzeichen «STUDIE — NICHT FÜR AUSFÜHRUNG» raus
> «der text „studie- nicht für ausführung“ kann raus»
**Deutung:** das phasengebundene Wasserzeichen (VS-Vorstudien-Preset)
nicht mehr gross übers Blatt legen — ACHTUNG: hängt am Plankopf-
Phasen-Preset; Klärung ob generell raus oder nur dezenter.
**Golden-relevant.** **Aufwand:** S/M. **Status:** offen —
**Rückfrage R6** (ganz raus oder dezent in den Plankopf?).

### K41 · S.17 — Einheitlicher Rahmen am Blattrand
> «einheitlicher rahmen am blattrand!»
**Bereich:** derive/blattlayout (Golden-Zug). **Aufwand:** S/M.
**Status:** offen.

### K42 · S.17 — Blattdarstellung gegen Gestaltungskonzept prüfen
> «ist die darstellung des blattes aktuell gemäss gestaltungskonzept?»
**Deutung:** Abgleich Blatt-Optik ↔ GESTALTUNGSKONZEPT; Befund.
**Aufwand:** S. **Status:** BEFUND GELIEFERT (570) + Abweichung 3
ERLEDIGT (ROADMAP 582, flacher Papier-Schatten); Abweichung 1
(Tusche #1A1815, stilblatt.ts:189) = Golden-Zug 0.8.12; Abweichung 4
(Passermarken) mit K41 gebündelt; Prüf-Punkt 2 (Grundschrift) offen.

### K43 · S.17 — Blatt-Module ein-/ausschaltbar: ausbauen
> «die module wie zonen bemassungen etc. ein ausschaltbar zu machen
> finde ich super! unbedinngt ausbauen :)»
**Deutung:** die Vorschau-Toggles (Zonen/Aussenbemassung) um weitere
Ebenen erweitern (Möbel, Raumstempel, Schraffuren, Etiketten …) —
verbindet sich mit K31 (Ebenen-System). **Aufwand:** M. **Status:**
offen.

### K44 · S.18 — Plankopf-Editor: Bestätigung
> «ah hier ist die inseldarstellung, gut:) bitte weiterentwickeln»
**Status:** zur Kenntnis.

### K45 · S.19 — Blattverzeichnis: Bestätigung
> «gut, weiterenwickeln»
**Status:** zur Kenntnis.

### K46 · S.20 — Exporte: Bestätigung
> «sieht gut aus, weiterentwickeln bitte»
**Status:** zur Kenntnis.

## KosmoPrepare / KosmoData / Kosmo / Export-Hub / Diagnose (Seiten 21–26)

### K47 · S.21 — KosmoPrepare visueller aufbauen (Ideen entwickeln)
> «denke für kosmoprepare können wir evtg auch als visuelle anschauung
> aufbauen, hast du da eine idee?»
**Deutung:** Owner-Frage — Konzeptvorschlag liefern (z.B. Grundlagen als
visuelles Dossier-Board: Karten für Dokumente/GIS/Parzelle/Recht statt
Listen; Standort-Karte prominent). **Aufwand:** S (Konzept). **Status:**
offen — Antwort in den nächsten Statusbericht.

### K48 · S.22 — KosmoData: Insellogik + Label-Bereinigung + UI-Ideen
> «hier bitte auch insellogik, rest finde ich aber gut mit dem übersicht
> referenzen tab etc. links neben dem tab steht noch kosmodata, das kann
> raus kannst du dir noch weitere intuitive ui ideen konzhepte
> überlegen? wie wir das weiterenwickeln können?»
**Deutung:** (a) Data-Station auf Insel-Bedienung heben (bisher bewusst
Nicht-Ziel «Data-Islands» — Owner dreht das jetzt), (b) redundantes
«KosmoData»-Label neben den Tabs entfernen (S, Sofort-Batch), (c)
UI-Ideen-Konzept. **Aufwand:** (a) L, (b) S — ERLEDIGT (ROADMAP 574), (c) S — Konzept geliefert
(ROADMAP 573). **Status:** (a) offen.

### K49 · S.23 — Karten-System erweitern (AskUserQuestion-Karten u.a.)
> «ja finde ich gut, solche karten auch weiterenwickeln fü¨r andere
> usecases wie die von claude also z.b askuserquestion karten etc.»
**Deutung:** Kosmo bekommt strukturierte Frage-Karten (Optionen wählbar
statt Freitext) und weitere Karten-Typen nach dem Diff-Karten-Muster.
**Aufwand:** M. **Status:** offen.

### K50 · S.24 — Kosmo-Animationen aus dem Gestaltungskonzept einbauen
> «hier sehe ich die animationen des gestaltungskonzept nicht aktiv..
> baue alle animationen vom konzept ein für kosmo falls noch nicht»
**Deutung:** Animations-Inventur + Nachbau (zusammen mit K22).
**Aufwand:** M. **Status:** offen.

### K51 · S.25 — Export-Hub visuell intuitiver (kein Kachelraster)
> «ja hier natürlich auch insel ui, und die darstellung bitte visuell
> intuitiver gestalten ncith einfach als kacheln auflistung, überlege
> dir gestaltugskonzept für ui»
**Deutung:** Export-Hub bekommt Insel-Bedienung + ein eigenes
Gestaltungskonzept statt Kachelliste. **Aufwand:** M. **Status:** offen.

### K52 · S.26 — Developer- vs. Consumer-Diagnose trennen
> «hier einfach wichtiger unterschied, was developer kosmodorbit anzeigt
> und was normale komsumer kosmoorbit anzeigt …macht unterschied..denn
> user muss nur sehen was kosmo durch alltagsnutzung und wünsche des
> users erfasst»
**Deutung:** Selbstdiagnose in zwei Sichten: technische
Developer-Diagnose vs. Consumer-Sicht («was hat Kosmo aus meiner
Nutzung gelernt/erfasst»). **Aufwand:** M. **Status:** offen.

---

## Rückfragen an den Owner (sammeln sich hier, blockieren nur den Einzelpunkt)

- **R1 (K4):** «Rolle: neutral» — behalten als Insel-Tab-Auswahl oder
  von der Zentrale entfernen?
- **R2 (K10):** Ich erstelle den Logo-Befund; falls Logos fehlen —
  lieferst du neue via ClaudeDesign (deine Präferenz?) oder soll ich
  aus den vorhandenen Assets setzen?
- **R3 (K15):** «Manuelle Ansicht für alle Tools» — ich lese das als
  RÜCKNAHME der geplanten 0.9.0-Löschung des Vis-Manuell-Codepfads
  (er wird stattdessen gepflegte klassische Ansicht). Richtig?
- **R4 (K26):** Mesh/FreeMesh trägt Terrain- und Sonderkörper-Arbeit.
  Vorschlag: aus der ZEICHNEN-Insel in ein Spezial-Untermenü — ok, oder
  ganz raus?
- **R5 (K37d):** Für die ETH-Unterlagen (Energie-/Klimadesign 1+2)
  brauche ich Zugang: OneDrive-Freigabe-Link oder Export als ZIP-Upload
  — was ist dir lieber?
- **R13 (K28):** Der orange Warn-Overlay für Raumregel-Befunde ist
  jetzt dezenter — soll er grundsätzlich anders werden (z.B. nur bei
  aktivem Prüfen-Fokus sichtbar statt dauerhaft)? Das bräuchte
  PlanView-Änderungen (Cluster B).
- **R6 (K40):** Wasserzeichen «STUDIE — NICHT FÜR AUSFÜHRUNG»: ganz
  weg für alle Phasen, oder nur vom Blattspiegel runter und dezent als
  Plankopf-Vermerk behalten (SIA-üblich)?

## Arbeitsplanung (erster Schnitt, wird fortgeschrieben)

- **Sofort-Batch A (kleine, eindeutige Fixes):** K16, K17, K28, K35,
  K48b — plus Befunde K10, K19, K42, Animations-Inventur K22/K50.
- **Konzept-/Recherche-Batch B (liefert Berichte):** K14 (ArchiCAD-
  Arbeitsumgebung), K24 (Werkzeug-Lückenliste), K29 (Phasen-Matrix),
  K47 (Prepare-Konzept), K48c (Data-UI-Ideen), K37b (Open-Source-
  Simulations-Recherche), K37a/c (KosmoSpez-Konzept + ZIP/Prompt).
- **Versions-Stränge (0.9.x, mit Owner-Kompass F9 verwoben):** K5+K29
  (Phasen-System), K21+K24+K30+K31 (ArchiCAD-Tiefe), K32+K49+K22+K50
  (Kosmo-Erlebnis), K34+K35+K36+Weave (Vis), K39–K43 (Publish-Politur),
  K48a (Data-Inseln), K51 (Export-Hub), K52 (Diagnose), K37 (KosmoSpez —
  eigener Strang), K11+K1–K3+K9+K12+K13 (Zentrale, nach
  ClaudeDesign-Package).
- **Golden-Disziplin:** K18, K23, K40, K41 bewegen derive-Ausgaben —
  je Version maximal der EINE deklarierte Golden-Zug bleibt Gesetz;
  diese Punkte werden entsprechend auf Versionen verteilt.
