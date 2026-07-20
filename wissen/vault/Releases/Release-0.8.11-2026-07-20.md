---
titel: "Release 0.8.11"
tags: [release, "v0.8.11"]
status: "veroeffentlicht"
erstellt: "2026-07-20"
verwandt: ["[[Release-Ablauf]]"]
---
# Release 0.8.11

Automatisch erzeugt aus `ROADMAP.md` (Einträge ab **552**) von
`kosmo-orbit/tools/release-notiz.mjs` — Teil des Release-Ablaufs
[[Release-Ablauf]] (Owner-Auftrag v0.6.2: «bei jedem Update pushe alles auf
git, obsidian und die neuste Installer-Version zum Herunterladen auf der
Website»).

## Enthaltene ROADMAP-Einträge (552–561)

- **552.** v0.8.11 · W0 «Inselgleich»: V0811-SPEZ + GOLDEN-WECHSEL-0811 Teil 1 (20.07.2026):
- **553.** v0.8.11 · P-A1/E1 «Publish-Insel-Parität»: Blatt umbenennen + entfernen in der BLATT-Insel (20.07.2026):
- **554.** v0.8.11 · P-A2/E2 «Line-Art als Node-Parameter» — der Ein-Quellen-Entscheid ist eingelöst (20.07.2026):
- **555.** Owner-Kompass 20.07.2026 — 25 Richtungsantworten vor dem Autonomiefenster (docs/OWNER-KOMPASS-2026-07-20.md):
- **556.** HomeStation-Andock-Readiness — das Geräte-Paket für den F12-Termin in 2 Tagen (20.07.2026):
- **557.** v0.8.11 · P-A3/E3 «Plan-Griffe Runde 2»: Decken-Ecken + Unterzug-a/b, in place (20.07.2026, Fable/Cluster B):
- **558.** v0.8.11 · P-B1/E4 «Vis-Insel-Äquivalente: Ansichten + Legende» (20.07.2026):
- **559.** v0.8.11 · P-B3/E5 «Schloss-Symbol im Plan» — der EINE Golden-Zug der Version, strengste Form (20.07.2026, Fable-solo):
- **560.** v0.8.11 · E7 «Treppen-z-Griff» — Kapazitäts-Posten, Owner-Wahl (20.07.2026, Fable-solo):
- **561.** v0.8.11 · P-B2/E6 «Flake-Härtung» — Beweis vor Fix, eine Datei statt zwei (20.07.2026, Sonnet-Paket + Fable-Gate):

## Installer

Stabile Download-Links (immer der zuletzt gebaute Installer, drei Editionen ×
drei Plattformen): [[Release-Ablauf]] Abschnitt 4, live auf
architekturkosmos.ch/orbit — sobald die Website-Änderung selbst auf `main`
liegt (siehe [[Release-Ablauf]] Abschnitt 6, DEPLOYMENT.md).

## Volltext je Eintrag

### 552

552. **v0.8.11 · W0 «Inselgleich»: V0811-SPEZ + GOLDEN-WECHSEL-0811 Teil 1 (20.07.2026):** Ultraplan nach Owner-Auftrag («ultraplan für v0.8.11 nach fable empfehlung»): 3 Explorer (Kandidaten-Inventar mit 39 Posten, Island-Lücken je Station, Vis-Node-UI/Technik) + Plan-Agent + vier Owner-Entscheide (Name **«Inselgleich»** · Vis-Insel-Äquivalente **Ansichten + Legende** · Dock-Tour **ehrlich Manuell-only dokumentiert** · Kapazitäts-Posten **Treppen-z-Griff**). Schnitt: P-A1 Publish-Insel-Parität (Blatt umbenennen+entfernen in der BLATT-Insel) ‖ P-A2 Line-Art als persistenter Node-Param (Z4-Schuld, Ein-Quellen-Entscheid — beleg-geprüft OHNE Kernel-Änderung möglich, vis.ts:78-82 offenes Record) ‖ P-A3 Plan-Griffe slab/beam (Fable, Cluster B) → Tag B: P-B1 Vis-Inseln ‖ P-B2 Flake-Härtung (dock-tour/dock-interaktion, Vorbestehend-Beweis VOR Fix als Gate-Pflicht) ‖ P-B3 Schloss-Symbol als EINZIGER Golden-Zug in strengster Form (0 bewegt, +1 neu). Nicht-Ziele mit Begründung (u.a. >2-Wand-Knoten = zweiter Golden-Zug, kein weiterer Manuell-Rückbau, Dock-Tour-Owner-Entscheid, **Figma-Weave-Owner-Notiz als fester Folgeposten VOR weiterer Node-UI-Arbeit**), 8 Sanktionen, Matrix C-1…C-10, §8-Belegliste komplett am HEAD verifiziert (10/10, Explorer-Protokoll). Anm.: Tag A wurde auf Owner-Befehl «mach soviel parallel wie möglich» bereits während des 0.8.10-Endspurts in Worktrees vorgezogen (P-A1/P-A2 gebaut, Gates folgen jetzt NACH diesem W0 — Spez-vor-Landung eingehalten). (Fable)

### 553

553. **v0.8.11 · P-A1/E1 «Publish-Insel-Parität»: Blatt umbenennen + entfernen in der BLATT-Insel (20.07.2026):** Der 547-Insel-Rest ist geschlossen — die BLATT-Insel (publish/island/inhalte/blatt.tsx) kann Blätter jetzt UMBENENNEN (Klick-zu-Edit `blattisl-name-<index>`, exakt das 547-Muster: KInput autoFocus/Vorselektion, Enter/Blur committet via design.eigenschaftSetzen feld:'name', Escape bricht per Ref-Guard gegen den Unmount-Blur ab, Kernel-Wurf als Toast) und ENTFERNEN (`blattisl-entfernen-<index>` via publish.blattEntfernen, OHNE Bestätigungsdialog — Owner-Entscheid 20.07. «Ohne Dialog», identisch zum Manuell-Vorbild, Undo via Ctrl+Z; war das Blatt aktiv, räumt setAktiverSheetId(null) den Runtime-Store). Eintrag von button auf div umgebaut (verschachtelte Klickbereiche) — ehrlich notierte Lücke: keine native Tastatur-Fokussierbarkeit des Gesamteintrags mehr (Folgeposten). KEINE Kernel-Änderung (Weg existiert seit 547; Sanktion 2 eingehalten, git status beweist 3 Dateien exakt). NEU e2e/blattisl-paritaet.spec.ts (4 Tests: Umbenennen+Verzeichnis-Nachweis, Entfernen+Undo, Escape, Leer-Name-Toast; im Agent-Worktree 4× grün). Fable-Gate im Hauptbaum: Typecheck, App 1724, frischer Build + E2E 10/10 auf :5183 (neue Spec + blatt-umbenennen + blattverzeichnis), Agent-Golden-Probelauf 0/0 mit sha-Beweis (aggregiert d3c2586f… identisch), Screenshot selbst gesichtet (KInput offen in der Insel). C-1/C-2 der V0811-Matrix erfüllt. (Sonnet-Paket P-A1, Fable-Gate)

### 554

554. **v0.8.11 · P-A2/E2 «Line-Art als Node-Parameter» — der Ein-Quellen-Entscheid ist eingelöst (20.07.2026):** Die Z4-Schuld aus 0.8.10 ist beglichen: Line-Art lebt jetzt als persistenter Render-Node-Parameter `node.params.lineart` (gesetzt über den BESTEHENDEN Command vis.nodeParametrieren — **0 Zeilen Kernel-Diff**, das offene Record-Schema vis.ts:78-82 trug wie beleg-geprüft) statt als flüchtiger Insel-useState. vis-jobs.ts liest den Node-Param (der transiente opts.mode-Pfad ist ersatzlos gefallen), NodeCanvas.tsx zeigt die Checkbox «als Strichzeichnung (Line-Art)» im Render-Node-Körper nach dem nurCycles-Muster (`render-lineart`), der Insel-KSwitch sitzt jetzt PRO Render-Node (`island-render-lineart-<nodeId>` — nötig, weil der Wert node-gebunden persistiert; bei einem Render-Node verhält sich das UI unverändert) und liest/schreibt den Node — der useState (austausch.tsx:32 alt) ist weg, grep-Beweis im Gate (einziger Resttreffer 'offline'). +4 Unit-Tests (Param→Job, vis.skip hart, Default, Undo), +2 E2E in vis-island.spec (Persistenz über Reload, Bridge-Beweis style.mode). Ehrlich notiert: Undo ist nur in der Live-Sitzung testbar (project-vault setzt beim Reload bewusst frische History, Muster standort-persistenz). Fable-Gate im Hauptbaum: 3-Wege-Merge für vis-island.spec.ts (P-B2 hatte die Datei nach der Worktree-Basis berührt — git merge-file, 0 Konflikte), Typecheck, App **1728** (+4), Kernel 1170, Golden-Probelauf 0/0, frischer Build + vis-E2E 36/37 auf :5183 — der eine Rotfall (vis-publish-bild:291, Manuell/Einfach-Weg) ist per Stash-Gegenprobe auf sauberem HEAD identisch rot bewiesen: Vorbestand von der 549-Rotliste (Seed-Flip-Folge), NICHT P-A2 — Fix folgt in der autorisierten Rotlisten-Runde. C-3/C-4 der V0811-Matrix erfüllt. (Sonnet-Paket P-A2, Fable-Gate)

### 555

555. **Owner-Kompass 20.07.2026 — 25 Richtungsantworten vor dem Autonomiefenster (docs/OWNER-KOMPASS-2026-07-20.md):** Der Owner hat vor Abflug 25 Fragen in 7 Runden beantwortet; das Dokument ist ab jetzt die verbindliche Mess-Latte jeder Planung. Kernpunkte: **1.0 = Demobeweis** (jedes Werkzeug, ganze UI, Desktop UND iPad, alle SIA-Phasen von Wettbewerb bis Abgaben — wörtlich zitiert im Dokument) · **HomeStation-Gerätetermin in 2 Tagen** (Andock-Readiness wird Sofort-Posten) · **iPad erste Klasse** (Touch-Lücken sind ab jetzt Bugs) · **Team-Betrieb 2–3 Personen mit getrennten Projekten** (Wissens-/Vorlagen-Teilung vor Live-Sync) · **Release-Kurswechsel auf grössere Sprünge** (0.8.11 ist der letzte Kleintakt; 0.9.0 wird ein grosser Bogen mit allen vier Strängen Härten/Team/Weave/Publish-Eingabe, Budget 30/70) · Kosmo bleibt Werkzeugmacher · KosmoData ausbauen · Onboarding fürs Team (Island-Tour = echter Posten) · Figma Weave in allen Aspekten Vorbild (Referenzbericht vor weiterer Node-UI-Arbeit, Web-Recherche freigegeben) · Rundown-PDFs bei Meilensteinen, Korrektur-Rückgabe Text+annotiertes PDF. (Fable, Owner-Befragung)

### 556

556. **HomeStation-Andock-Readiness — das Geräte-Paket für den F12-Termin in 2 Tagen (20.07.2026):** Owner-Kompass F12 umgesetzt: NEU `docs/HOMESTATION-ANDOCKEN.md` (Schritt-für-Schritt in Betreiber-Sprache: Voraussetzungen inkl. Blender-headless-Vorprüfung, Installation, Bridge produktiv OHNE --fake, App-Verbindung, Runner-Andocken mit Exklusivitäts-Regel, **Abschnitt 5 als Drehbuch für den echten bpy-Berechner** — Signaturen/Rückgaben/Schemata wörtlich, aber bewusst OHNE lauffähigen bpy-Code, ROADMAP 179 bleibt gewahrt; Verifikations-Checkliste; Fehlerbild-Tabelle) + NEU `tools/homestation-bridge/verifiziere_andocken.py` (stdlib-Prüfskript im Haus-Muster: Bridge erreichbar → Job einstellen → Statuskette → Schema-Validierung kosmovis.render-result/v2 → ehrliche FAKE-vs-echt-Unterscheidung über fünf Marker; gegen die Fake-Bridge :8600 von Agent UND Fable unabhängig grün gelaufen, toter Port → Exit 1 statt Scheinerfolg) + additiver README-Verweis. **Empirischer Agenten-Fund, dokumentiert statt Tabu-Bruch:** der Poller schreibt bei bake()/blender_sim() die ErgebnisEntscheid-Dateifelder nicht auf Platte (nur status/worker/message) und main.py:get_job() bettet keine sonnenstunden-result.json ein — render() ist voll funktionsfähig (bewiesen), der bake/bsim-Gap steht als Warnung mit Workaround in Abschnitt 5 der Anleitung und ist ein 0.9.0-Posten (main.py/blender_worker.py waren TABU). Ehrliche Geräte-Lücken benannt (GPU/Treiber/Netz nur am Gerät prüfbar). (Sonnet-Paket HS-READY, Fable-Gate)

### 557

557. **v0.8.11 · P-A3/E3 «Plan-Griffe Runde 2»: Decken-Ecken + Unterzug-a/b, in place (20.07.2026, Fable/Cluster B):** slab war das einzige Outline-Element ohne Ecken-Griffe, beam hatte keine a/b-Griffe. Jetzt beides — mit einer BEGRÜNDETEN Dateikreis-Erweiterung gegenüber der Spez (die nur PlanView/DesignWorkspace/plan-hit-test nannte): das zone/mass/roof-Griff-Muster (Löschen+Neusetzen) wäre für beide Kinds DATENVERLUST gewesen — design.loeschen kaskadiert die Aussparungen einer Decke und die Etiketten eines Unterzugs mit. Darum zwei additive In-Place-Kernel-Setter nach der 0.8.6-E1/0.8.9-E8-Linie: **design.deckeGeometrieSetzen** (ein Umriss-Eckpunkt; Identität, thickness, holes, Aussparungen bleiben; punktIndex-Wurf ohne Patch) und **design.unterzugGeometrieSetzen** (a und/oder b; breite/hoehe/material/Etiketten bleiben; 10-cm-Mindestachse wirft). PlanView: slab-Ecken im zone-Muster (holes bewusst grifflos, eigener 0.9.x-Posten), beam-a/b im wall-Muster inkl. testid-Zweig griff-endpunkt-a/b; DesignWorkspace: griffFaehig + zwei In-Place-onGriffEnd-Zweige. Beweise: +7 Kernel-Tests (test/geometrie-setzen-0811.test.ts — darunter die BEWEISE für in place: Aussparung überlebt Ecken-Zug, Etikett überlebt Achsen-Zug; Undo-Invertierung; Wurf-Fälle byte-still), NEU e2e/plan-griffe-runde2.spec.ts (3 Tests: Decken-Zug+Aussparung+Undo, Unterzug-Zug+Etikett+Undo, Griff-Klick-ohne-Zug bleibt byte-gleich), Bestands-Griffe-Spec 14/14 mit — E2E 17/17 auf :5183. Kernel **1177** (+7), App 1728 (ein bekannter Volllast-Flake im Parallel-Lauf, Solo-Bestätigung 1728/1728), Golden-Probelauf 0 Treffer (Sanktion 1 ✓). C-5 der V0811-Matrix erfüllt. (Fable direkt)

### 558

558. **v0.8.11 · P-B1/E4 «Vis-Insel-Äquivalente: Ansichten + Legende» (20.07.2026):** Owner-Wahl «Ansichten + Legende» umgesetzt — die zwei nutzwertigen Manuell-only-Features haben Insel-Äquivalente, die 0.9.0-Löschung des toten Manuell-Codepfads ist damit fachlich freigeschaltet. NEU `vis/island/inhalte/ansichten.tsx` (importiert die BESTEHENDE GespeicherteAnsichten-Komponente unverändert — Zugang, kein Nachbau; testid visisl-ansichten-stufe2) und NEU `inhalte/legende.tsx` (eigene Datei, kein Anbau — Sanktion 4 eingehalten). Ehrlich dokumentierte Spez-Abweichung des Agenten: die Legende lebt im Bestand zweimal INLINE in NodeCanvas.tsx (TABU — ein Re-Export hätte einen verbotenen Edit gebraucht); legende.tsx zieht darum die Fachlogik aus dem exportierten VIS_NODE_KATALOG nach identischer distinct-Porttypen-Schleife, Präsentationstabellen wortgleich lokal, CSS aus vis-visual.css — im Kopfkommentar begründet. Katalog 13→15 Werkzeuge (ANSICHT-Insel, additiv), 2 Glyphen, Verdrahtung über island/index.ts (registry.ts brauchte 0 Zeilen — benannte Wortlaut-Abweichung). NEU e2e/visisl-ansichten-legende.spec.ts (4 Tests: 2 Island-only ohne Seed, 2 Manuell-Bestandsschutz). Gates: Agent-Worktree (3× solo, vis-island 14/14, vis-ansichten 4/4, vis-token 5/5, Golden 0, TABU-Dateien per git diff byte-still) + Fable-Hauptbaum (Interferenz-Check leer, Typecheck, App 1728, frischer Build + E2E 18/18 auf :5183, Screenshot gesichtet — zeigt nebenbei auch P-A2s Line-Art-Checkbox im Render-Node). C-6 der V0811-Matrix erfüllt. (Sonnet-Paket P-B1, Fable-Gate)

### 559

559. **v0.8.11 · P-B3/E5 «Schloss-Symbol im Plan» — der EINE Golden-Zug der Version, strengste Form (20.07.2026, Fable-solo):** Das V089-Nicht-Ziel ist eingelöst: gesperrte Elemente (meta.locked, 0.8.9 E2) waren im Plan unsichtbar gesperrt — jetzt zeichnet derive/plan.ts ein kleines Vorhängeschloss (7 Welt-mm-Segmente: Körper 280×220 + Bügel, Klasse ['symbol','schloss'] für spätere Druck-Filter) am Element-Anker (Wand/Unterzug/Treppe: Achsen-Mitte · Stütze/Möbel: at · flächige inkl. Baugrenze: Zentroid), +150/150 versetzt. HARTER Daten-Guard: ohne gesperrtes Element entsteht keine Linie. Golden-Politik exakt nach GOLDEN-WECHSEL-0811 Teil 1: **0 bewegte Bestands-Goldens, +1 NEUER** (`plan-schloss.svg`, Walmdach-Testhaus mit einer gesperrten Wand) — Beweis in einem Zug: aggregierte sha256 der 38 Bestands-SVG vor dem Lauf == nach dem Lauf ohne den Neuen (67cee224…), git status zeigt ausschliesslich die neue Datei, 40 Golden-Dateien total, svg-qa **39/0**. NEU test/plan-schloss.test.ts (3 Tests: Bestands-Guard über Fixture, 7-Segment+Anker+Entsperren-Räumung, Golden), PNG selbst gesichtet (Schloss klar lesbar an der Wandmitte, keine Kollision). **Gate-Ehrlichkeit:** der volle Kernel-Lauf fing nach dem Commit einen echten Konflikt — der 0.8.9-Test dxf-layer-lock («Sperren hat KEINE Render-Wirkung») verankerte genau die Invariante, die E5 sanktioniert ändert; der Test ist im Nachzug-Commit PRÄZISIERT statt abgeschwächt (Element byte-gleich, exakt +7 Schloss-Segmente, Entsperren stellt alles wieder her — die Assertion ist damit STRENGER als vorher). Kernel **1180/1180** nach Nachzug. C-8 der V0811-Matrix erfüllt. (Fable direkt)

### 560

560. **v0.8.11 · E7 «Treppen-z-Griff» — Kapazitäts-Posten, Owner-Wahl (20.07.2026, Fable-solo):** Das dokumentierte 0.8.9-Nicht-Ziel (PA5-Kopfkommentar Viewport3D.tsx «x/y-only») ist eingelöst: ein VIERTER Treppen-Griff `'z'` sitzt an der Lauflinien-Mitte auf der Geschoss-OBERKANTE (elevation + storey.height) und editiert per vertikalem Zug die Geschosshöhe. Ziehebene: kamerazugewandte Vertikal-Ebene durch den Handle (byte-gleiches Muster wie der Shift-Vertikal-Zug der FreeMesh-Handles), Move lässt x/z am Ursprung, nur die Höhe folgt. Commit über den BESTEHENDEN `design.eigenschaftSetzen` storey/height (allowed-Map seit jeher, KEIN neuer Kernel-Command, 0 Kernel-Zeilen) — direkt via runCommand wie der PA5-x/y-Commit; keine echte Bewegung = kein Commit; Zug unter die Geschossunterkante wird mit sichtbarem Fehler verworfen (Guard hält die `geschossErstellen`-Untergrenze height>0 ein, die eigenschaftSetzen historisch bei 0 durchliesse — Bestands-Command unangetastet), Kernel-Wurf → stairDragZurueck + meldeFehler, Esc-Abbruch erbt den PA5-Pfad unverändert. Der Testhaken stairHandleCount zählt sanktioniert eins höher (3 bzw. 4 mit ecke); alle Zähl-Erwartungen in e2e/griffe-treppe-3d.spec.ts mit E7-Beleg angepasst, +2 neue Beweise: E7 (g) z-Zug → Geschosshöhe 3000→4200, Treppe byte-gleich, Auswahl steht, EIN Undo zurück; E7 (h) Zug unter die Unterkante → meldung-fehler, Höhe bleibt, Griff nutzbar. Typecheck 8 Workspaces, Kernel 1180/1180, App 1728/1728, Goldens 40 byte-still (reine App-Ebene), E2E-Spec 8/8 auf frischem Build :5183, Screenshot selbst gesichtet (Fusszeile «height → 4200», Treppen-Mesh folgt der neuen Höhe, Prüfhinweise reagieren ehrlich). C-9-Beitrag der V0811-Matrix. (Fable direkt)

### 561

561. **v0.8.11 · P-B2/E6 «Flake-Härtung» — Beweis vor Fix, eine Datei statt zwei (20.07.2026, Sonnet-Paket + Fable-Gate):** Die zwei 27-min-Batch-Kandidaten (V-NAECHSTE-KANDIDATEN:53-56/104-106, v0.8.1-Funde) nach Sanktion 5 abgearbeitet — Vorbestehend-Beweis war Gate-Bedingung. **dock-tour «7 Schritte»: KEIN Fix** — 43/43 grün über drei eskalierende Repro-Stufen (isoliert 8×, Fremdlast-Endlosschleife 15×, Volllast npm test + zweiter Unit-Loop 20×): die zwei früheren Härtungsrunden (warteAufSolveStabilitaet C1/0.8.2, wartenAufUeberlappungsfreieBoxen PE1/0.8.4) haben den Fund offenbar längst gelöst, der Kandidaten-Eintrag ist stale — Datei bewusst unangetastet (kein Fix ohne Beweis), trotzdem 30/30 Gate-Läufe grün. **dock-interaktion «Tab (c)»: Vorbestand REPRODUZIERT** (34/35 unter Fremdlast, 1 echter Riss: dock-snap-schwebend «element not found», Screenshot zeigt den Tab unbewegt — der Drag griff nie; Ursache: ein NACH dem 300ms-Ruhefenster eintreffender feld-getriebener Re-Solve überholt die stabileBox-Messung zwischen Messen und mouse.down, hinter BEIDEN bestehenden Härtungsrunden). Fix `ziehTabInSchwebendZoneMitRetry()`: bis zu 3 volle Versuche, JEDER mit frischer Solve-Warten+Boxen-Messung, missglückter Zwischenversuch löst den Zeiger und misst neu; letzter Versuch mit der echten Assertion im unveränderten 5000ms-Default — nichts gelockert, kein Timeout angehoben. Fable-Nachbesser im Gate: auch der Zwischenversuchs-Treffer läuft durch die harte data-aktiv-Assertion (kein Erfolgspfad überspringt den Original-Beweis). Agent-Gates: Tab (c) 5/5, Datei 85/85 (5×), beide Specs 23/23 unter Unit-Suite-Parallellast, svg-qa 0 bewegt; Fable-Gate im Hauptbaum: Datei 17/17 + Tab (c) 5/5 auf frischem :5183-Build. Scope exakt 1 Datei == Deklaration. C-7 der V0811-Matrix erfüllt; Nachzug-Kandidat: V-NAECHSTE-KANDIDATEN-Bereinigung des stale dock-tour-Eintrags (Tag C). (Team Fable+Sonnet)


## Owner-Testpause (bindender Rahmen, fortgeltend aus 0.8.8–0.8.10)

Bis **v0.9.0** gibt es je Version **kein Rundgang-PDF und keine
Installer-Zustellung** (Sanktion 7 der V0811-SPEZ). Der
`.desktop-build-request` wird trotzdem angestossen — die Website-Kette
(«neuster Installer zum Herunterladen») läuft weiter, nur die persönliche
Zustellung pausiert. Ausnahme dieser Version auf ausdrückliche
Owner-Bestellung: das **KosmoOrbit-Rundown-PDF v0.8.10** (27 Seiten, alle
Stationen/Werkzeuge) wurde VOR dem Abflug zugestellt — es ist ein
Korrektur-Arbeitsdokument (Rückgabe «Text + annotiertes PDF»,
Owner-Kompass F16), kein Release-Ritual-PDF. E2E-Gates liefen unverändert
voll. Diese Version entstand fast vollständig im owner-abwesenden
14h-Autonomiefenster (Flug) — alle Entscheide im Rahmen von
`docs/V0811-SPEZ.md` + `docs/OWNER-KOMPASS-2026-07-20.md`.

## Ehrliche Grenzen dieser Version

- **Der 549-Rotlisten-Abgleich ist weiterhin offen:** der volle
  E2E-Abgleich der 0.8.10-Vorbestände gegen den Hauptbaum wurde von einem
  Container-Neustart gekillt und ist noch nicht neu gelaufen; der eine in
  0.8.11 direkt belegte Fall (vis-publish-bild:291, Stash-Gegenprobe auf
  sauberem HEAD identisch rot, ROADMAP 554) wartet mit den übrigen auf die
  vom Owner freigegebene Rotlisten-Fix-Runde (je Fix mit
  Stash-Vorbestand-Beweis). Nächster Schritt nach diesem Release.
- **Decken-AUSSPARUNGEN haben weiterhin keine eigenen Griffe** — P-A3 gab
  bewusst nur dem Decken-Umriss Ecken-Griffe; die holes bleiben ein
  eigener 0.9.x-Posten (ROADMAP 557).
- **Der z-Griff editiert die Geschosshöhe, nicht die Treppengeometrie** —
  bewusster Schnitt: er committet storey.height über den bestehenden
  eigenschaftSetzen-Weg; eine treppen-eigene Höhenlogik (z.B. abweichende
  Austritts-Ebenen) existiert nicht (ROADMAP 560).
- **bake()/blender_sim() der HomeStation-Bridge tragen den dokumentierten
  Poller-Gap** (Ergebnisfelder landen nicht auf Platte, ROADMAP 556) —
  render() ist bewiesen funktionsfähig, der Gap steht mit Workaround in
  `docs/HOMESTATION-ANDOCKEN.md` §5 und ist ein 0.9.0-Posten
  (main.py/blender_worker.py TABU-geschützt).
- **>2-Wand-Knoten im Schnitt bleiben kontrolliert ausgelassen** (seit
  v0.8.9, ROADMAP 523) — als einziger Kandidat für einen ZWEITEN
  Golden-Zug bewusst nicht in dieser Version (Golden-Politik: maximal
  einer, `docs/GOLDEN-WECHSEL-0811.md`).
- **P-A1-Randnotiz:** der Blatt-Eintrag der Insel ist seit dem
  div-Umbau nicht mehr als GANZES tastatur-fokussierbar (die inneren
  Bedienelemente schon) — ehrlich notierter Folgeposten (ROADMAP 553).

## 0.9.0-Kandidatenliste (Stand Release-Entwurf; 0.9.0 wird der erste
GROSSE Bogen nach dem Owner-Kurswechsel — vier F9-Stränge Härten/Team/
Weave/Publish-Eingabe, iPad-Beweise als Gate-Pflicht)

1. **Figma-Weave-Referenzbericht** (`docs/REFERENZ-FIGMA-WEAVE.md`,
   Web-Recherche owner-freigegeben) — VOR jeder weiteren
   NodeCanvas/Node-UI-Arbeit; direkt nach diesem Release fällig.
2. **Rotlisten-Fix-Runde** — 549-Vorbestände gegen den Hauptbaum
   abgleichen und fixen, je mit Stash-Vorbestand-Beweis (beginnend mit
   vis-publish-bild:291); owner-freigegeben.
3. **Manuell-Codepfad-Löschung in KosmoVis** (~600 Zeilen, Inventar
   liegt vor) — der Einstellungs-Schalter hat sich mit 0.8.11 eine
   Version lang bewährt, die letzten zwei Manuell-only-Features
   (Ansichten, Legende) haben jetzt Insel-Äquivalente (ROADMAP 558).
4. **Island-Tour** — geführte Einführung in die Insel-Bedienung; die
   Dock-Tour bleibt ehrlich Manuell-only dokumentiert (Owner-Entscheid
   20.07., V0811-SPEZ Nicht-Ziele).
5. **>2-Wand-Knoten im Schnitt** — der reservierte zweite Golden-Zug.
6. **Decken-Aussparungs-Griffe** (holes) — Fortsetzung von P-A3.
7. **bake/bsim-Poller-Gap der HomeStation-Bridge** — Ergebnisfelder auf
   Platte + main.py-Einbettung (TABU-Aufhebung nötig, Geräte-Termin
   liefert die echte bpy-Gegenprobe).
8. **progress-Asserts in test_blender_worker.py** — offener Randbefund
   aus der 0.8.10-Matrix (C-1), weiterhin unerledigt.
9. **Tastatur-Fokussierbarkeit des Insel-Blatt-Eintrags** — P-A1-Folge-
   posten (ROADMAP 553).
