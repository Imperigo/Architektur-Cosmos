---
titel: "Release 0.8.10"
tags: [release, "v0.8.10"]
status: "veroeffentlicht"
erstellt: "2026-07-20"
verwandt: ["[[Release-Ablauf]]"]
---
# Release 0.8.10

Automatisch erzeugt aus `ROADMAP.md` (Einträge ab **538**) von
`kosmo-orbit/tools/release-notiz.mjs` — Teil des Release-Ablaufs
[[Release-Ablauf]] (Owner-Auftrag v0.6.2: «bei jedem Update pushe alles auf
git, obsidian und die neuste Installer-Version zum Herunterladen auf der
Website»).

## Enthaltene ROADMAP-Einträge (538–550)

- **538.** v0.8.10 / W0 «Inselrein»: V0810-SPEZ mit eingefrorenen Entscheiden (19.07.2026):
- **539.** v0.8.10 · Z6 «Deep-Link-Rottest» — Diagnose + Fix (19.07.2026):
- **540.** v0.8.10-A · P-A «Blender-Worker-Runner» (19.07.2026):
- **541.** v0.8.10-A · Z5 «Inspector-Ausbau» (19.07.2026):
- **542.** v0.8.10-A · P-B1 «vis-Spec-Migration auf Island» (20.07.2026):
- **543.** v0.8.10-A · P-B1b «Rest-Bootstrap-Migration» (20.07.2026):
- **544.** v0.8.10 · Fable-Nachzug «Kosmo-Blick war im Island-Modus blind» + Orb-Gesetz-Testfixes (20.07.2026):
- **545.** v0.8.10 · Z2 «Plancode als zweite Zeile» — der einzige sanktionierte Golden-Beweger (20.07.2026):
- **546.** v0.8.10 · Z3 «Klickbarkeit + VERSCHIEBBAR» für Unterzug/Möbel/Baugrenze/Etikett (20.07.2026):
- **547.** v0.8.10 · Z1/E4 «Blatt-Umbenennen» (20.07.2026):
- **548.** v0.8.10 · E3/P-B2 Teil 1: Manuell-Rückbau KosmoVis — Werkzeug raus, Einstellungs-Schalter rein, Seed-Absicherungen (20.07.2026):
- **549.** v0.8.10 · E3/P-B2 Teil 2: der Seed-Flip — vis-Station testet ab jetzt den Produktions-Default (20.07.2026):
- **550.** v0.8.10 · Tag C: GOLDEN-WECHSEL Teil 2 + adversariale Matrix-Abnahme C-1…C-11 (20.07.2026):

## Installer

Stabile Download-Links (immer der zuletzt gebaute Installer, drei Editionen ×
drei Plattformen): [[Release-Ablauf]] Abschnitt 4, live auf
architekturkosmos.ch/orbit — sobald die Website-Änderung selbst auf `main`
liegt (siehe [[Release-Ablauf]] Abschnitt 6, DEPLOYMENT.md).

## Volltext je Eintrag

### 538

538. **v0.8.10 / W0 «Inselrein»: V0810-SPEZ mit eingefrorenen Entscheiden (19.07.2026):** Die Konsolidierungs-Version nach dem Owner-genehmigten Plan (Explorer-Fan-out + Plan-Agent + vier Owner-Wahlen: Name «Inselrein», Schnitt Z1/Z2/Z5 drin + Z3 nach Kapazität + Z4 raus, Manuell-Codepfad bleibt stehen, Plancode-Fix als zweite Zeile). `docs/V0810-SPEZ.md` friert E1–E8 ein: **E1** Blender-Worker-Runner als bpy-freier Store-Poller nach lora_empfaenger-Hausmuster (Pflichtflag --fake-worker, pluggables Berechner-Interface, vis-Fake markiert/bake+bsim SOFORT kein-blender-worker, Exklusivitäts-Regel zum Bridge-internen Fake, main.py TABU — ROADMAP 179 wird präzisiert, nicht gekippt); **E2/E3** zweistufiger Manuell-Rückbau KosmoVis (P-B1: Audit + Spec-für-Spec-Migration auf Island per test.use nach blender-bridge-Vorbild, Node-Ebene-Assertions unverändert; P-B2: Werkzeug/Rückweg raus, normalisiere()-Koerzierung 'manuell'→'island' mit Unit-Test, Seed-Flip als eigener Commit mit Voll-Lauf davor/danach, ISLAND-UI-SPEZ-§6-Sanktion-2-Nachtrag datiert); **E4** Blatt-Umbenennen (sheet:['name'] in die eigenschaftSetzen-allowed-Map + Klick-zu-Edit in der Blattliste — schliesst den 534a-Befund); **E5** Plancode als zweite Zeile im Blattverzeichnis (einziger Golden-Beweger: exakt 2 Dateien, Fable-solo — schliesst 534b); **E6** Inspector-Ausbau (column/beam/furniture-Zweige + fehlende zone/mass/wall/freemesh-Felder, die der Kernel schon kann); **E7** GOLDEN-WECHSEL-0810 (Teil 1 committet: 2 bewegt nur aus E5, 37 still, +0); **E8** nach Kapazität Z3 (Klickbarkeit+VERSCHIEBBAR furniture/beam/boundary/etikett, Cluster B = Fable) + Z6 (timeboxte Diagnose des vorbestehenden Deep-Link-Rottests). Sanktionen 1–8 (u.a. bpy-Import = Mandats-Bruch, Runner-Physik-Zahl = ungültig, Seed-Flip vor leerem Audit = ungültig), Matrix C-1…C-12, Nicht-Ziele (Line-Art-Node-UI → 0.9.0 wegen Ein-Quellen-Entscheid im P-B-Konfliktkreis; Codepfad-Löschung → 0.9.0). (Fable direkt)

### 539

539. **v0.8.10 · Z6 «Deep-Link-Rottest» — Diagnose + Fix (19.07.2026):** Der seit den 084er-vis-Islands vorbestehend rote Test (island-inhalte-projekt-austausch «Rendern→KosmoVis», von PB3-089 per git-stash-Gegenprobe als vorbestehend bewiesen) ist geklärt: **der Stationswechsel funktionierte immer** (Failure-Screenshot zeigt die geöffnete KosmoVis-Station) — die Assertion `island-austausch-root → count 0` war seit KosmoVis eigene Islands trägt mehrdeutig, weil `IslandShell` die testids stations-agnostisch als `island-<id>-root` generiert und BEIDE Stationen eine AUSTAUSCH-Insel führen: die Zählung traf die frisch gemountete vis-Insel. Fix (Fable, innerhalb der E8-Timebox): positive Assertion auf die vis-exklusive GRAPH-Insel + Null-Assertion auf die design-exklusive ZEICHNEN-Insel, mit Ursachen-Kommentar. Beweis: 6/6 in zwei unabhängigen Läufen auf :5183. (Fable direkt, E8/Z6)

### 540

540. **v0.8.10-A · P-A «Blender-Worker-Runner» (19.07.2026):** Das erste feste Owner-Paket (E1): NEU `kosmo_bridge/blender_worker.py` — bpy-freier, stdlib-only Dateisystem-Poller nach dem lora_empfaenger-Hausmuster (argparse, Pflichtflag `--fake-worker` mit Exit 2, `--einmal`/`--intervall`), der das normative 4-Schritt-Worker-Protokoll aus dem README wörtlich spricht: queued idle-gated claimen (höchstens EIN running-Job je Runner-Prozess), running+worker+progress, Record VOR dem Ergebnis frisch lesen (cancelled bricht kooperativ ab, keine Ergebnisdatei), Ergebnis je Typ + done. Pluggables `Berechner`-Protokoll (render/bake/blender_sim) — im Repo NUR der `FakeBerechner`: vis-Jobs bekommen ein markiertes FAKE-Bild als render-result.json inkl. requested_style-Spiegelung, bake/bsim landen SOFORT auf kein-blender-worker (nie running/done — Sanktionen 4+5 als Code); der echte bpy-Berechner entsteht am Gerät gegen dasselbe Interface (ROADMAP 179 präzisiert, nicht gekippt: Repo bleibt bpy-frei). Begründete Duplikation zu `_fake_worker_step` und die Exklusivitätsregel (Runner NIE gegen eine --fake-Bridge, Doppel-Claim-Gefahr) sind im Kopfkommentar + README-Abschnitt normativ dokumentiert. NEU `test_blender_worker.py` (Haus-Muster, HTTP-frei gegen temp-Store): **53 Prüfungen grün** — inkl. Injektions-Hook, der den literalen Protokollschritt 3 (Race zwischen Berechnen und Frisch-Lesen) schärfer prüft als ein Vorher-Überschreiben. Ehrlich benannt: das Idle-Gate wirkt prozess-lokal (kein Multi-Prozess-Lock — Nicht-Ziel, Single-Runner-Betrieb). Beweise (Fable-Rerun im Hauptbaum): test_blender_worker 53/53 Exit 0, test_bridge_haerte Exit 0 unverändert, test_lora_empfaenger Exit 0, bpy-grep 0 Treffer, main.py/test_bridge_haerte.py byte-still (git diff leer). (Sonnet-Paket P-A, Gate Fable)

### 541

541. **v0.8.10-A · Z5 «Inspector-Ausbau» (19.07.2026):** E6 komplett — der Inspector kann jetzt alles editieren, was die Kernel-allowed-Map schon konnte: NEUE Zweige **Stütze** (Material aus dem bestehenden @kosmo/data-materialkatalog, Breite b, Tiefe t, Rotation), **Unterzug** (breite/hoehe/Material) und **Möbel** (Rotation); ergänzte Felder zone (Nutzung program, Raumnummer number, Raumtyp als KSelect — Werteliste lokal mit design.ts-Verweis, weil RAUMTYP_WERTE im Kernel bewusst nicht exportiert ist und design.ts für Z5 tabu war), mass (program), wall (Höhe fix — wirkt nur bei heightMode 'fix', ehrlich kommentiert), freemesh (Name — landet kernel-seitig in meta.name, dokumentiert). Der gemeinsame Umbau/Ebene(DXF)/Gesperrt-Block greift unverändert für alle neuen Kinds. NEU e2e/inspector-ausbau.spec.ts (8 Tests): je Zweig ein Setz-Beweis über echte DOM-Interaktion + sichtbare Kernel-Wurf-Fälle (column b<80, beam breite<80, wall negative Höhe); Island-first-Beweis via Rechtsklick→Eigenschaften am schwebenden Inspector. Ehrlich benannt: beam/furniture sind im 2D-Plan noch nicht klickbar (bekannter E8/Z3-Befund, Cluster B tabu — Spec wählt per Testhook an, editiert aber über echte UI); furniture.rotationGrad normalisiert statt zu werfen (Kernel-Entscheid); Freitextfelder validierungsfrei. Beweise (Fable-Rerun): Typecheck, App 129/1713, frischer :5183-Build mit 8/8 E2E, Island-Screenshot (STÜTZE-Zweig) selbst gesichtet. (Sonnet-Paket Z5, Gate Fable)

### 542

542. **v0.8.10-A · P-B1 «vis-Spec-Migration auf Island» (20.07.2026):** E2 mit verbindlichem Audit als Gate-Artefakt (grep über alle Manuell-Chrome-testids): **7 Specs migriert** (visgraph, vis-editor, vis-publish-bild, vis-token (2 von 3 Tests), vis-automatik, kosmo-journey-efh/mfh (Vis-Kapitel)) — je Spec per test.use auf den leeren storageState (blender-bridge-Vorbild), Bootstrap auf Island-Bedienung (visisl-graph-erstellen, island-palette-eintrag-*, island-drei-stimmungen, AUSTAUSCH kamera-vorschlagen), Node-Ebene-Assertions unverändert; stationsübergreifende Tests mit TEIL-Seed (design/publish/prepare bleiben manuell). Deklarierte Änderungen einzeln begründet (u.a. Testpunkt-Verschiebung wegen Insel-Kopf-Overlay, Grid-Snap-aria-pressed entfällt am Insel-Toggle); der C-11-Test betritt Manuell weiterhin ABSICHTLICH über den Insel-Rückweg (beweist den alten Pfad). **Audit-Korrekturen:** render-knopf/sim-ki-imaging gehörten NIE in den Mindestbestand (betreten die vis-Station nicht); 4 weitere Bootstrap-Specs (cursor-ebene, homestation-kette, kosmo-blick-2, vis-report-dossier) sind migrierbar, aber noch offen (P-B1b VOR dem Seed-Flip, Sanktion 7); 5 Manuell-only-Features ohne Insel-Äquivalent als Entscheidungsbedarf an den Owner (vis-Legende, VisOnboarding, Vis-Dock-Panels, GespeicherteAnsichten). **Vorbestand-Fund:** kosmo-journey-mfh ist schon auf dem unveränderten Basisstand rot (Zug 1 hängt am PB4-Orb-Gesetz, KosmoSymbol nie in der Journey nachgezogen) — per doppelter stash-Gegenprobe (Agent + Fable) bewiesen, Vis-Kapitel strukturell identisch zur grünen EFH-Migration migriert, aber End-zu-End unverifizierbar bis zum Journey-Fix. Beweise: Agent-Gate 3× solo grün je Spec; Fable-Rerun 25/25 auf :5183, Typecheck, diff-stat NUR die 7 Specs (NodeCanvas/VisWorkspace/Seed/Config byte-still), Island-Screenshots gesichtet. (Sonnet-Paket P-B1, Gate Fable)

### 543

543. **v0.8.10-A · P-B1b «Rest-Bootstrap-Migration» (20.07.2026):** Die vier im P-B1-Audit als migrierbar-offen klassifizierten Specs sind auf Island: cursor-ebene (nur der eine vis-Test, eigenes describe mit leerem storageState — die 11 design/dock-Tests unangetastet), homestation-kette (beide Tests, STIMMUNG-Insel), kosmo-blick-2 (nur die 2 vis-kreuzenden Tests, TEIL-Seed), vis-report-dossier (tab-ansichten → AUSTAUSCH-Insel report-Sofort-Aktion, dieselbe VisReportDossier-Komponente). KEINE Assertion-Änderung nötig. **Zweiter Orb-Gesetz-Vorbestand-Fund:** kosmo-blick-2 ist auf HEAD KOMPLETT rot (alle 5 Tests, auch die reinen Design-Fälle) — kosmoMitSkriptOeffnen klickt kosmo-symbol EINFACH, seit PB4-084 öffnet das nur die Konversationskarte (Doppelklick = Panel); identisches Muster wie der MFH-Journey-Fund (542), per Original-Gegenprobe des Agenten bewiesen und von Fable statisch bestätigt (KosmoSymbol.tsx useKlickVsDoppelklick; Spec :99 Einfachklick). Fix folgt als Fable-Nachzug. Beweise: Agent 3×-Reruns (12/2/1 grün, kosmo-blick-2-Vorbestand dokumentiert), Fable-Rerun 15/15 auf :5183, Typecheck, diff-stat NUR die 4 Specs. (Sonnet-Paket P-B1b, Gate Fable)

### 544

544. **v0.8.10 · Fable-Nachzug «Kosmo-Blick war im Island-Modus blind» + Orb-Gesetz-Testfixes (20.07.2026):** Beim Nachziehen der zwei Orb-Gesetz-Vorbestände (542/543) deckte die Tiefendiagnose einen ECHTEN Produktfehler auf: `erkenneAktiveStation()` (state/kosmo-blick.ts) erkannte Stationen ausschliesslich über die `station-einstellungen-*`-Anker des MANUELL-Chromes — im Island-Modus (seit v0.8.2 der Produktions-Default!) fand sie keine Station, `blickErfassen` lieferte null und **jede Kosmo-Nachricht ging ohne Bild-/Text-Kontext raus** (design, vis, publish, prepare gleichermassen betroffen; unbemerkt, weil die E2E-Suite bis P-B1 global Manuell seedete — genau die Testlücke, die «Inselrein» schliesst). Fix: jede Island-Station trägt zusätzlich einen station-EXKLUSIVEN Insel-Anker (design island-zeichnen-root · vis island-graph-root · publish island-blatt-root · prepare island-aufnahme-root; geteilte Insel-Ids wie ansicht/projekt/austausch bewusst ausgeschlossen), +4 Unit-Tests. Dazu die Testfixes: kosmoMitSkriptOeffnen (kosmo-blick-2) öffnet das Panel jetzt modus-bewusst (Island: Doppelklick kosmo-orb-knopf nach pb4-orb-gesetz-Hausmuster; Manuell: Doppelklick kosmo-symbol), Island-Sentinel statt Manuell-Zahnrad, dispatchEvent-Fallback am MFH-Fassade-Select (Insel-Overlay-Überdeckung, P-B1-Hausmuster), Doppelklick-Nachzug an drei stalen Einfachklick-Stellen. Ergebnis: **kosmo-blick-2 5/5 und kosmo-journey-mfh 1/1 erstmals seit dem PB4-084-Orb-Gesetz wieder grün** (6/6 in zwei Läufen auf :5183 mit frischem Build), Typecheck, App 129/**1717** (+4). (Fable direkt)

### 545

545. **v0.8.10 · Z2 «Plancode als zweite Zeile» — der einzige sanktionierte Golden-Beweger (20.07.2026):** Owner-Wahl E5 umgesetzt (Planungs-Runde 19.07., Fable-solo): die Plancode-SPALTE des Blattverzeichnisses (x=182, nur 18 mm bis zur Rahmenlinie — reale 6-Teile-Codes mit 20–24 Zeichen liefen drüber, C-5-Befund 0.8.9) ist ersetzt durch eine kleine Sekundärzeile UNTER dem Blattnamen (`derive/publikation.ts`: `BV_SPALTE_PLANCODE` raus, `BV_PLANCODE_ZEILE_H = 3.5` rein; Zeilenhöhe dynamisch `mitPlancode ? 6+3.5 : 6`, Zweitzeile am Blatt-Anker x=24 in `textSekundaer`, Überlauf/`maxDatenzeilen`/Legenden-Top alle auf die dynamische Höhe umgestellt — robust gegen beliebig lange Codes, Anker 24 statt 182). Daten-Guard unverändert: ohne Plancode keine Zweitzeile, Zeilenhöhe bleibt 6. Ehrlicher Prognose-Befund im Gate: statt der in GOLDEN-WECHSEL-0810 Teil 1 erwarteten 2 bewegte sich nur **1** Golden (`blattverzeichnis-legende.svg`) — `blattverzeichnis.svg` (ohne Stammdaten) blieb dank der Guard byte-identisch; Ist-Korrektur datiert im Wechsel-Protokoll, kein Sanktions-1-Fall (nur deklarierte Datei bewegt). Beweise: sha256-Vorher/Nachher 37/38 + Golden 1 identisch, svg-qa 38/0, Chromium-PNG-Sichtung (Zweitzeile grau unter «Grundriss EG», Blatt 2 ohne, alles im Rahmen), Tests nachgezogen (+1 Zweitzeilen-Unit, Spalten-Assertions umgestellt; `transmittalCsv` behält seine Plancode-Spalte — CSV hat keine Rahmenlinie), Typecheck, Kernel **1165** (+1). (Fable direkt)

### 546

546. **v0.8.10 · Z3 «Klickbarkeit + VERSCHIEBBAR» für Unterzug/Möbel/Baugrenze/Etikett (20.07.2026):** Der Kapazitäts-Posten aus dem Inselrein-Plan (Cluster B, Fable-exklusiv): `design.verschieben` kann beam/furniture/boundary/etikett seit v0.8.8 E1 — im Plan waren die vier aber weder klickbar noch ziehbar (`pickEntityAt` kannte sie nicht, `VERSCHIEBBAR` schloss sie aus). Jetzt in `plan-hit-test.ts`: Etikett als Anker-Punktzone (300 mm, VOR den Wänden — der Anker sitzt oft auf seinem Bauteil und würde sonst nie gewinnen), Unterzug wie Treppe (Achse ± halbe Breite + Toleranz, vor den Flächigen), Möbel-Korpus per `moebelGeometrie` (vor Zone/Decke — Bewegungsfläche bleibt bewusst untreffbar, sie ist Prüf-Overlay), Baugrenze ZULETZT und nur an der LINIE (Punkt-in-Polygon hätte jeden Klick auf leerer Parzellenfläche geschluckt). `outlineOf` liefert für alle vier Highlight-/Zieh-Vorschau-Umrisse, `VERSCHIEBBAR` + PlanView-`rechteckKinds` (Rubber-Band-Spiegel) um die vier erweitert — der bestehende onMoveStart/onMoveEnd-Pfad im DesignWorkspace greift damit ohne eigene Änderung (ein `design.verschieben` je Element, Gruppe/Sperren/Undo inklusive). Beweise auf der Geometrie-Ebene: +6 Unit-Tests (Prioritäts-Nachweise am Klickpunkt: Etikett-vor-Wand, Korpus-vor-Zone, Grenzlinie-statt-Fläche, plus outlineOf- und Verschiebe-Smoke), Typecheck, App 129/**1723** (+6), Kernel/Goldens unberührt (reine App-Ebene, kein derivePlan-Eingriff — Sanktion-1-Risiko null). (Fable direkt)

### 547

547. **v0.8.10 · Z1/E4 «Blatt-Umbenennen» (20.07.2026):** Der 0.8.9-Befund «produktweit KEIN Blatt-Umbenennen-Weg» (C-5 dokumentierte den Delete+Neu-Anlegen-Umweg) ist geschlossen. Kernel: `sheet: ['name']` additiv in der allowed-Map von `design.eigenschaftSetzen` (commands/design.ts), Blattname als DIREKTES Top-Feld (name→meta-Ausnahme um `sheet` erweitert, wie storey/assembly/zone — Blattverzeichnis/Transmittal/Export lesen `s.name` unverändert), getrimmt mit Leer-Wurf VOR jedem Patch; +5 Kernel-Tests (setzen, Undo-Invertierung byte-genau, Leer-/Whitespace-Wurf, Trim, Fremdfeld-Wurf). UI: Klick-zu-Edit am Blattnamen der Blattkarten-Liste (PublishWorkspace.tsx, testid `sheet-name-<index>`, KInput mit autoFocus/Vorselektion, Enter/Blur committet, Escape bricht per Ref-Guard gegen den Unmount-Blur ab — kein Klick-zu-Edit-Bestandsmuster im Repo, ehrlich als Neubau kommentiert) + Hover-Affordanz in publish.css. Gegenprüfungs-Fund des Agenten: die neue testid kollidierte mit dem Präfix-Selektor `[data-testid^="sheet-"]…last()` in baugesuch/sim-vollprojekt-phase4 — behoben durch `setActiveSheetId` im Edit-Klick (fachlich richtig: Name bearbeiten = mit diesem Blatt arbeiten). E2E NEU `blatt-umbenennen.spec.ts` (3 Tests: UI+Undo, Leer-Name+Toast, Blattverzeichnis-Export zeigt neuen Namen — bewusst Manuell-Chrome: die Blattkarten-Liste hat kein Insel-Äquivalent, 0.9.0-Kandidat). Fable-Gate im Hauptbaum: Typecheck 8 WS, Kernel **1170** (+5), App 1723, Golden-Probelauf 0 bewegt (Sanktion 1 ✓), E2E 9/9 auf :5183 (neue Spec + beide Kollisions-Specs + blattverzeichnis nach Z2-Golden-Wechsel), Screenshot gesichtet. (Sonnet-Paket Z1, Fable-Gate)

### 548

548. **v0.8.10 · E3/P-B2 Teil 1: Manuell-Rückbau KosmoVis — Werkzeug raus, Einstellungs-Schalter rein, Seed-Absicherungen (20.07.2026):** Owner-Entscheid vom 20.07. («insel logik default und ui standard, andere ui einfach 'manuelle ansicht' in den einstellungen») umgesetzt: das Insel-Werkzeug `'manuell'` fällt aus dem AUSTAUSCH-Katalog (vis-island-katalog.ts, 14→13 Werkzeuge; case + Setter-Bezug in VisWorkspace.tsx entfernt, verwaistes Glyph in vis-glyphen.tsx mit), NEU der Schalter «Manuelle Ansicht (KosmoVis)» im Einstellungs-Panel (shell/Einstellungen.tsx, testid `einstellung-vis-manuell`, reiner useUiZustand-Spiegel, KEINE normalisiere()-Koerzierung — 'manuell' bleibt legitime Einstellung, Rückweg `island-zurueck` bleibt). E2E-Fundament für den Flip: `visManuellStorageState()` in manuell-seed.ts (additiv) + Per-Spec-`test.use`-Köpfe für die sechs Manuell-Feature-Specs (vis-onboarding, dock-layout, dock-presets, vis-ansichten, p8-081-screenshots, vis-token-Legende) UND — **ehrlicher Audit-Fund des Bauagenten** — zehn weitere implizit vis-Seed-abhängige Dateien, die P-B1s Migrationsliste nicht kannte (autopilot-drehbuecher, faehigkeiten-phasen, nutzungszeit-panel, vis-aufnahme, die fünf sim-*-Journeys via bausteine.ts-Baustein 14, zwei module.spec-Tests) — ohne diese Köpfe hätte der Flip sie stumm von grün auf rot gekippt. vis-oberflaeche.spec auf «Werkzeug existiert nicht + Island ist Default + Schalter schaltet hin und zurück» umgebaut (3× solo 12/12), ISLAND-UI-SPEZ §6 Sanktion 2 mit datiertem Nachtrag. Zweiter ehrlicher Befund: die Vorbestands-Rotliste auf der Worktree-Basis d169f02 umfasst 33 Fälle in 20 Dateien (nicht nur die 6 angekündigten) — identisch VOR und NACH allen P-B2-Änderungen (Voll-Suiten-Vergleich 737 passed/33 failed beidseitig, Netto-Regression 0), keine davon im P-B2-Dateikreis; Abgleich gegen den Hauptbaum-Fixstand ist Tag-C-Posten. Fable-Gate im Hauptbaum: Scope exakt 28 Dateien, Typecheck, App 1724, gezielte E2E 47/47 auf :5183 (inkl. kosmo-blick-2 5/5 + mfh 1/1 im gemergten Stand), Screenshots selbst gesichtet. (Sonnet-Paket P-B2, Fable-Gate; Seed-Flip folgt als eigener Commit 549)

### 549

549. **v0.8.10 · E3/P-B2 Teil 2: der Seed-Flip — vis-Station testet ab jetzt den Produktions-Default (20.07.2026):** Der EIGENE Commit für die eine heikle Zeile (Sanktion-7-Schutz, Zwei-Commit-Muster aus dem Plan): `kosmoUiV1SeedMitManuell()` erzwingt `visOberflaeche` NICHT mehr — jede Spec ohne eigenen Seed sieht die vis-Station jetzt im echten Island-Default, design/publish/prepare bleiben unverändert 'manuell' (Owner-Auftrag betraf nur KosmoVis). Kommentar-Nachzüge in manuell-seed.ts + playwright.config.ts. Beweis des Bauagenten in seinem Worktree: Voll-Suite VOR dem Flip (737 passed/33 failed/5 skipped) und NACH dem Flip (identische Zahlen, identische Rotliste — Netto-Regression exakt 0); die sechs Manuell-Feature-Specs und alle zehn Audit-Fund-Dateien einzeln grün über ihre neuen Per-Spec-Köpfe. Damit ist die 0.8.9-Kernlehre («Test-Seed ≠ Produkt-Default») für die vis-Station geschlossen — genau die Lücke, die den Kosmo-Blick-Island-Fehler (544) drei Versionen lang versteckt hatte. (Sonnet-Paket P-B2 Teil 2, Fable-Gate)

### 550

550. **v0.8.10 · Tag C: GOLDEN-WECHSEL Teil 2 + adversariale Matrix-Abnahme C-1…C-11 (20.07.2026):** Teil 2 des Golden-Wechsels lief auf HEAD 3c71f10 mit allen zwölf Paketen im Baum: EIN gemeinsamer GOLDEN_UPDATE-Lauf (Kernel 59/1170 grün), git status danach leer, aggregierte sha256 aller 39 Golden-Dateien vor/nach byte-identisch, svg-qa 38/0 — **exakt 1 bewegte Golden-Datei über die ganze Version** (blattverzeichnis-legende.svg aus Z2/545, Ist == korrigierte Prognose), Protokoll in docs/GOLDEN-WECHSEL-0810.md vervollständigt. Danach die Matrix als 11-Prüfer-Workflow-Fan-out (je Zelle ein adversarialer Sonnet-Prüfer mit Widerlegungs-Auftrag und Datei:Zeile-Pflicht): **C-1 bis C-11 alle GRÜN**, null Rot. Ehrliche Randbefunde der Prüfer, dokumentiert statt weggelassen: (a) test_blender_worker.py asserted das progress-Feld nirgends — die Implementation schreibt es korrekt (vom Prüfer empirisch verifiziert), aber eine Nur-progress-Regression finge der Test nicht; Folgeposten für 0.8.11. (b) Die GPU-idle-Regel des Protokolls ist im bpy-freien Runner als Runner-Level-Gate übersetzt (max. EIN eigener running-Job) — ein echter Geräte-Worker muss das echte GPU-Fenster selbst nachrüsten. (c) 17 statt 16 Per-Spec-Seed-Köpfe gezählt — der 17. ist der dokumentierte vis-oberflaeche-Umbau selbst. (d) Zwei dispatchEvent-Fallbacks in migrierten Specs als bewusste Actionability-Aufweichungen benannt (Insel-Overlay-Überdeckung, Chrome-Ebene, Folge-Assertions unverändert). C-12 (verschlanktes Ritual) wird mit dem Release-Eintrag selbst abgeschlossen. (Fable + 11 Sonnet-Prüfer)

## Owner-Testpause (bindender Rahmen, fortgeltend aus 0.8.8/0.8.9)

Bis **v0.9.0** gibt es je Version **kein Rundgang-PDF und keine
Installer-Zustellung** (Owner testet erst bei 0.9.0 wieder; Sanktion 8 der
V0810-SPEZ, unverändert aus v0.8.9 fortgeführt — `docs/V0810-SPEZ.md` §3/§4).
Der `.desktop-build-request` wird trotzdem angestossen — die Website-Kette
(«neuster Installer zum Herunterladen») läuft weiter, nur die persönliche
Zustellung pausiert. E2E-Gates liefen unverändert voll.

**Smoke-Puffer:** wie in v0.8.5–v0.8.9 stand der Puffer für Owner-Smoke-Funde
bereit — in diesem Fenster gingen keine Smoke-Rückmeldungen ein (die
Owner-Screenshot-Rückfrage vom 19.07. war der Auslöser DIESER Version und
ist mit E3/548-549 beantwortet); der Puffer blieb leer.

## Ehrliche Grenzen dieser Version

- **Python-Worker-Runner (E1) ist eine Gerätevorlage, kein Beweis:** der
  Runner läuft im Container ausschliesslich mit `--fake-worker`, liefert
  markierte FAKE-Bilder und beendet Bake-/Sonnenstunden-Aufträge sofort
  ehrlich auf `kein-blender-worker` — kein bpy-Import, keine erfundene
  Physik-Zahl, kein „gebacktes" GLB ohne echten Rechenschritt (ROADMAP 540,
  Sanktionen 3–5 der V0810-SPEZ). Der echte bpy-Berechner an der HomeStation
  bleibt ein späterer Geräte-Termin.
- **Der Seed-Flip legte eine grössere Vorbestands-Rotliste frei, als
  angekündigt — und bewies sie als unverändert:** beim Voll-Suiten-Vergleich
  vor/nach dem vis-Seed-Flip (549) liefen **33 Rotfälle in 20 Dateien**
  (nicht nur die 6 angekündigten Manuell-Feature-Specs) — auf beiden Seiten
  **identisch** (737 passed/33 failed, Netto-Regression exakt 0), keiner
  davon im P-B2-Dateikreis. Der Abgleich dieser 33 Fälle gegen den bereits
  gefixten Hauptbaum-Stand ist ein offener **Tag-C-Posten** (ROADMAP 548/549)
  — nicht stillschweigend erledigt, sondern bewusst als nächster Schritt
  benannt.
- **Zehn implizit seed-abhängige Specs, die kein Audit-Grep gefunden hätte:**
  das P-B1-Audit (542) fand seine Migrationsliste über testids; erst der
  Seed-Flip selbst deckte zehn weitere, nur indirekt (über den geteilten
  `bausteine.ts`-Baustein 14 bzw. eigene module.spec-Tests) vom vis-Seed
  abhängige Dateien auf. Ehrlich benannt: Seed-Abhängigkeit ist mit
  statischer Suche allein nicht vollständig auffindbar — nur der
  Vor/Nach-Voll-Suiten-Vergleich zeigt sie zuverlässig (ROADMAP 548).
- **>2-Wand-Knoten im Schnitt bleiben weiterhin kontrolliert ausgelassen**
  (seit v0.8.9, E1/ROADMAP 523) — kein Rückschritt, aber auch in 0.8.10
  nicht geschlossen.
- **Treppen bleiben im 3D-Viewport x/y-only ziehbar** — kein z-Griff für die
  Geschosshöhe (dokumentiertes Nicht-Ziel seit v0.8.9 E4, unverändert).

## 0.9.0-Kandidatenliste (Stand Release-Entwurf)

1. **Manuell-Codepfad-Löschung in KosmoVis** — durch den jetzt gelandeten
   Einstellungs-Schalter (E3/548-549) erst rechtlich sauber freigeschaltet:
   der Codepfad ist die Heimat der 4 audit-gefundenen Features und bleibt
   deshalb bewusst stehen, bis der Schalter sich eine Version lang bewährt
   hat; als eigener Aufräum-Posten für **0.8.11** vorgesehen.
2. **Line-Art-Node-UI** — wegen des Ein-Quellen-Entscheid-Konflikts
   (NodeCanvas/vis-jobs/austausch.tsx, gleicher Dateikreis wie P-B) bewusst
   aus 0.8.10 herausgehalten (`docs/V0810-SPEZ.md` §5, ROADMAP 538); **wird
   in 0.8.11 gebaut** — kein stiller Aufschub, sondern ein terminierter
   nächster Schritt.
3. **Island-Tour** — eine geführte Einführung in die Insel-Bedienung analog
   der 0.7.8-Dock-Tour, jetzt wo Island der alleinige Standard ist.
4. **>2-Wand-Knoten im Schnitt** — die seit v0.8.9 kontrolliert ausgelassenen
   Mehrwand-Knoten (ROADMAP 523) bleiben ein offener Geometrie-Posten.
5. **Insel-Äquivalente für die Publish-Blattliste** — die Blattkarten-Liste
   (PublishWorkspace.tsx) hat weiterhin kein Insel-Äquivalent (0.9.0-Vermerk
   aus ROADMAP 547); **Zielversion 0.8.11**.
6. **Treppen-z-Griff** — Geschosshöhen-Editing am 3D-Handle, seit v0.8.9 E4
   dokumentiertes Nicht-Ziel (ROADMAP 522), weiterhin offen.
7. **Figma Weave als KosmoVis-Vorlage/Referenz** (Reverse Engineering der
   Node-Editor-UX) — Owner-Notiz 20.07.2026, fester Posten für die nächste(n)
   Version(en): vor der weiteren Node-UI-Arbeit (insb. vor Line-Art-Node-UI,
   Punkt 2 dieser Liste) einzuplanen, damit die NodeCanvas-Weiterentwicklung
   an einer bewusst gewählten UX-Referenz gemessen wird statt ad hoc zu
   wachsen.
