---
titel: "Release 0.8.6"
tags: [release, "v0.8.6"]
status: "veroeffentlicht"
erstellt: "2026-07-19"
verwandt: ["[[Release-Ablauf]]"]
---
# Release 0.8.6

Automatisch erzeugt aus `ROADMAP.md` (Einträge ab **486**) von
`kosmo-orbit/tools/release-notiz.mjs` — Teil des Release-Ablaufs
[[Release-Ablauf]] (Owner-Auftrag v0.6.2: «bei jedem Update pushe alles auf
git, obsidian und die neuste Installer-Version zum Herunterladen auf der
Website»).

## Enthaltene ROADMAP-Einträge (486–495)

- **486.** v0.8.6 / W0 «Verlässlich»: V086-SPEZ mit eingefrorenen Entscheiden (19.07.2026):
- **487.** v0.8.6-A · PA4 «Wächter rückwärts + Eval-LaufPlan-Format» (19.07.2026):
- **488.** v0.8.6-A · PA1 «Kernel: design.wandGeometrieSetzen + zonenArt nachbar» (19.07.2026):
- **489.** v0.8.6-A · PA3 «Raumtyp-Sichtbarkeit als Opt-in» — Owner-Feature ohne Golden-Sammelwechsel (19.07.2026):
- **490.** v0.8.6-A · PA2 «Griff-Umbau auf die neuen Commands» + Tag-1-Quergate (19.07.2026):
- **491.** v0.8.6-B · PB3 «Öffnungs-Griffe» (19.07.2026):
- **492.** v0.8.6-B · PB1 «Autopilot-Dialog + Lauf-Bibliothek» + Fable-Nachzug Orb-Gesetz-Altlast (19.07.2026):
- **493.** v0.8.6-B · PB2 «3D-Shift-Klick-Auswahl» (19.07.2026):
- **494.** v0.8.6-C · PC1 «Standort-Persistenz» + Fable-Nachzug Undo-Gruppe (19.07.2026):
- **495.** v0.8.6-C · Matrix-Abnahme (16 Prüfer) + zwei Autopilot-Härtungen: echter Abbruch, keine erfundenen Commands (19.07.2026):

## Installer

Stabile Download-Links (immer der zuletzt gebaute Installer, drei Editionen ×
drei Plattformen): [[Release-Ablauf]] Abschnitt 4, live auf
architekturkosmos.ch/orbit — sobald die Website-Änderung selbst auf `main`
liegt (siehe [[Release-Ablauf]] Abschnitt 6, DEPLOYMENT.md).

## Volltext je Eintrag

### 486

486. **v0.8.6 / W0 «Verlässlich»: V086-SPEZ mit eingefrorenen Entscheiden (19.07.2026):** Der Owner-bestätigte Drei-Tages-Schnitt (Plan A «Substanz & Schulden» / B «Kosmo führt» / C «Standort & Release», EIN Release am Tag C) steht als `docs/V086-SPEZ.md` — neun verifizierte Diagnosen (D1–D9 mit Fundstellen), acht Entscheide (E1 `design.wandGeometrieSetzen` verlustfrei inkl. Öffnungs-Clamp-Regel; E2 `zonenArt:'nachbar'`; E3 Raumtyp-Sichtbarkeit als `opts.datenAttribute`-Opt-in statt Golden-Sammelwechsel; E4 `lauf_planen`-Vorschlags-Tool ohne jede Selbst-Ausführung; E5 Öffnungs-Griffe mit App-Clamp; E6 `design.standortSetzen`-Doc-Setting; E7 Scan-Wächter rückwärts; E8 Eval-LaufPlan-Format), sieben Sanktionen, Matrix C-1…C-18, bindende Hotspot-Wellen. Der Schnitt wurde vor dem Einfrieren adversarial gegengeprüft (Plan-Agent): drei Plan-Korrekturen daraus übernommen — Kernel-Command statt verlustbehaftetem App-Re-Setzen (oeffnungSetzen kennt fensterTyp/teilung/leibung nicht), Opt-in-Flag statt Sammelwechsel (planInnerSvg-opts existiert), Standort-PERSISTENZ statt ÖREB-Neuland (halbe Kette existiert seit v0.7.x). (Fable)

### 487

487. **v0.8.6-A · PA4 «Wächter rückwärts + Eval-LaufPlan-Format» (19.07.2026):** Der §0-Scan-Wächter (`tools/ai-scan-delta.mjs`) prüft jetzt RÜCKWÄRTS alle 🚀-Release-Versionen der ROADMAP (beide historischen Schreibweisen des Markers) statt nur der aktuellen — die Auswertungs-Lücke 0.8.0–0.8.4 ist als «historisch, durch 0.8.5 abgedeckt» einmalig und begründet im Skript dokumentiert, Exit 1 kommt nur noch bei einer NICHT-historischen Lücke (E7; Fixture-Beweis für den 0.8.6-Fehlfall, Unit-Tests um drei Fälle erweitert). Die Zeichner-Eval versteht neu `erwartung.typ:'laufplan'` (E8): Schritt-Folgen-Vergleich commandId+Kernparameter über den bestehenden Mehrfach-Proposal-Weg der echten ChatSession (Aktionskette/paket), drei neue Prompts (drei Geschosse / Vier-Wände-Rechteck / vis-Kette) — **38/38 bestanden**, `pruefe-laufplaene.mts` unverändert 3/3, Website-Sync und SFT-Validator grün. Ehrliche Grenze dokumentiert: E8 prüft Schema/Sequenz/Parameter, nicht die Doc-Ausführung (bleibt bei pruefe-laufplaene) und noch nicht das PB1-`lauf_planen`-Tool-Format (Tag 2). (Sonnet-Paket PA4, Gate Fable)

### 488

488. **v0.8.6-A · PA1 «Kernel: design.wandGeometrieSetzen + zonenArt nachbar» (19.07.2026):** Das neue Kernel-Command setzt Wand-Endpunkte IN PLACE — Identität, height, Umbau-/Phasen-Felder, assemblyId, alignment und ALLE gehosteten Öffnungen bleiben (Objekt-Spread, nur a/b überschrieben). Öffnungs-Regel bei kürzerer Wand exakt nach E1: passt → byte-gleich; clampbar → center rutscht bündig an die nähere Kante (Breite bleibt); breiter als die neue Wand → im SELBEN Command entfernt und im summarize genannt («… N Öffnung(en) entfernt»; Bilanz über einen konsumierenden Modul-Zwischenspeicher, weil summarize vertragsgemäss NACH doc.apply läuft — im Code begründet). Null-Länge wirft vor jedem Patch; alles ein Patch-Bündel = ein Undo-Schritt (invertPatches stellt Geometrie + geclampte + entfernte Öffnungen gemeinsam wieder her). Dazu E2: `zoneErstellen.zonenArt` akzeptiert jetzt `'nachbar'` (das Entity-Modell konnte es schon — nur das zod-Enum war zu eng; alle derive-Konsumenten prüften den Wert bereits). Beweise: 11 neue Kernel-Tests, Kernel-Suite 1030 (Hauptbaum mit PA3-Beimischung), svg-qa 36/0, Golden-Verzeichnis git-sauber (Sanktion 1), App 125/1674. Ehrliche Lücke: der veraltete zonenArt-Kommentar in model/entities.ts liegt ausserhalb des Kreises → Fable-Nachzug mit PA2. (Sonnet-Paket PA1, Gate Fable)

### 489

489. **v0.8.6-A · PA3 «Raumtyp-Sichtbarkeit als Opt-in» — Owner-Feature ohne Golden-Sammelwechsel (19.07.2026):** Der Owner-bestätigte Raumtyp-Toggle ist da, und zwar über den in der Gegenprüfung gefundenen Guard-Weg statt des ursprünglich angebotenen Golden-Sammelwechsels: `planInnerSvg`-`opts` kennt neu `datenAttribute?: boolean` (Default AUS → alle Goldens byte-still, git-sauberes Golden-Verzeichnis als Beweis), bei `true` tragen Raumtyp-Füllungen `data-raumtyp="<typ>"`; `derive/sheet.ts` reicht das Flag nur für Grundriss-Platzierungen durch, und AUSSCHLIESSLICH die zwei Publish-Blatt-Renderpfade in `PublishWorkspace.tsx` aktivieren es (Export/PDF/DXF/.kosmo unangetastet). Die DARSTELLUNG-Insel hat den dritten KSwitch «Raumtypen» (publish-runtime-Store, Default AN), `publish.css` blendet per Modifier-Klasse alle `[data-raumtyp]`-Flächen aus — unabhängig vom «Zonen»-Toggle (Parzellen-Kontext), C-7-bewiesen. Beweise: 9 neue Kernel-Tests (`raumtyp-datenattribut.test.ts`, inkl. Default-Byte-Identität und thema-Koexistenz), Kernel 1030/svg-qa 36/0/Goldens sauber (Fable-Rerun im Hauptbaum mit PA1-Beimischung), App 125/1674, `publish-toggles`+`publish-island` 21 passed auf :5183 gegen frischen Build (5 neue Tests), Screenshots gesichtet (drei Switches, Raumtyp-Fläche verschwindet). (Sonnet-Paket PA3, Gate Fable)

### 490

490. **v0.8.6-A · PA2 «Griff-Umbau auf die neuen Commands» + Tag-1-Quergate (19.07.2026):** Der Wand-Zweig von `onGriffEnd` läuft jetzt über `design.wandGeometrieSetzen` — kein Löschen+Neusetzen mehr: die Wand behält ihre ID (die Auswahl muss ihr nicht mehr nachlaufen), height/Umbau-Felder und alle Öffnungen bleiben, die Kürzer-Wand-Regel lebt im Kernel. Der Zonen-Zweig reicht `zonenArt` jetzt 1:1 durch (der v0.8.5-Sonderfall-Kommentar samt Marker-Verlust fällt); der veraltete `entities.ts`-Kommentar («entsteht NUR über nachbarnUebernehmen») ist nachgezogen (PA1s deklarierte Lücke). Zwei neue E2E-Tests in `griffe.spec.ts`: Wand-Endpunkt-Drag erhält Öffnung UND Wand-Identität (gleiche IDs, Auswahl bleibt, EIN Undo stellt die Geometrie wieder her) · nachbar-Zone behält den Marker beim Eck-Zug. Tag-1-Quergate: Kernel 1030, svg-qa 36/0, App 125/1674, griffe(11)+multi-auswahl(6)+pb5(8) = 25 passed auf :5183 gegen frischen Build. Damit ist Plan A («Substanz & Schulden», 487–490) komplett. (Fable)

### 491

491. **v0.8.6-B · PB3 «Öffnungs-Griffe» (19.07.2026):** Einzeln gewählte Fenster/Türen zeigen jetzt EINEN Griff auf dem Öffnungs-Mittelpunkt (achsen-projiziert aus `center` entlang der Wirtswand, testid `griff-oeffnung`); Ziehen schiebt die Öffnung entlang der Wandachse — die Live-Vorschau projiziert bereits auf die Achse (bewusstes WYSIWYG statt frei schwebendem Cursorpunkt), das Drag-Ende ruft EIN `design.eigenschaftSetzen('center')` mit App-seitigem Clamp gegen `width/2 … wandLänge−width/2` (E5/D6: der Kernel validiert center nicht — der Clamp ist der Schutz), keine Identitätsänderung, ein Undo-Schritt. Öffnungs-Pick existierte bereits (plan-hit-test.ts pickt Öffnungen VOR der Wirtswand — Befund, kein Neubau). Drei neue `griffe.spec.ts`-Tests (Drag+Undo, Clamp-Beweis am Wandende, Griff weg bei Mehrfach-Auswahl). Beweise: App 125/1674, Kernel 1030 unangetastet (git-sauber), griffe(14)+pb5(8) = 22 passed auf :5183 gegen frischen Build, Screenshot gesichtet (Griff auf dem Fenster, Inspector ÖFFNUNG). Ehrlich: die Projektionsformel lebt bewusst dupliziert in PlanView+DesignWorkspace (gemeinsames Util läge ausserhalb des Kreises — Kandidat für eine spätere Politur); kein Gummiband am Öffnungs-Griff (die Wand zeigt die Achse selbst). (Sonnet-Paket PB3, Gate Fable)

### 492

492. **v0.8.6-B · PB1 «Autopilot-Dialog + Lauf-Bibliothek» + Fable-Nachzug Orb-Gesetz-Altlast (19.07.2026):** Der Autopilot hat seinen Dialog-Einstieg (E4): das neue Nicht-Command-Tool `lauf_planen` (params = laufPlanSchema) wird von der ChatSession NIE ausgeführt, sondern als **Lauf-Vorschlagskarte** gerendert (Titel + Schrittliste mit Begründungen, «Lauf starten»/«Ablehnen») — erst der Start-Klick ruft `lauf-runtime.starte()`, denselben Weg wie der Testhook; ungültige Pläne weist zod als Tool-Fehler ab. Dazu die **Lauf-Bibliothek** im KosmoPanel: die drei kuratierten Drehbücher wählbar über DIESELBE Vorschlagskarte (kein zweiter Startweg), und die @ref-Platzhalter-Auflösung lebt jetzt als getestete Funktion `loeseLaufPlanRefs` in `@kosmo/ai` — mit dem wichtigen Design-Entscheid der **progressiven Auflösung je Schritt** gegen das fortgeschrittene Live-Doc (die Drehbücher sind selbst-referenzierend: Schritt 2 referenziert das in Schritt 1 erzeugte Geschoss); `pruefe-laufplaene.mts` konsumiert dieselbe Funktion (eine Wahrheit). Beweise: kosmo-ai 308 (+18), App 126/1683 (+9), Drehbücher 3/3, `autopilot-dialog`(3)+`autopilot-kern`(5)+`autopilot-drehbuecher`(3)+`vis-demolauf` = 12 passed auf :5183 (Bridge/Sync von Fable neu gestartet), Vorschlagskarten-Screenshot gesichtet. **Fable-Nachzug (PB1-Fund):** `e2e/kosmo-scripted.spec.ts` war seit dem v0.8.4-Orb-Gesetz still rot — der Sim-Helfer öffnete das Panel per Einfachklick (öffnet seither nur die Konversationskarte); drei Stellen auf Doppelklick umgestellt → kosmo-scripted 3/3, sim-mfh-Stichprobe grün. (Sonnet-Paket PB1, Nachzug + Gate Fable)

### 493

493. **v0.8.6-B · PB2 «3D-Shift-Klick-Auswahl» (19.07.2026):** Der seit PA1 (v0.8.5) deklarierte, 3D-seitig aber nie verdrahtete Auswahl-Vertrag ist geschlossen: Viewport3D ruft `onPick` jetzt mit `{toggle: ev.shiftKey}` — Shift-Klick toggelt Elemente in der 3D-Ansicht, Shift-Klick ins Leere lässt die Auswahl stehen (der DesignWorkspace-Handler war bereits toggle-fähig, nichts doppelt gebaut), Escape leert auch bei 3D-Fokus (D10-Weg von v0.8.5, nur bewiesen). Für testbares 3D-Picking kam `entityMeshCount()` in den `__kosmoViewport`-Testhook (Muster `glbMeshCount`). Neue `e2e/viewport3d-auswahl.spec.ts` (4 Tests) mit zwei ehrlich erkämpften, im Spec-Kopf dokumentierten Gruben: dem **Mesh-Sync-Race** (Doc-Entities erscheinen nicht im selben Tick in `model.children` → Poll vor dem Kamera-Setup) und der **HUD-Karte über der rechten Canvas-Hälfte** (Klickpunkte bewusst in die linke Hälfte projiziert; per `elementFromPoint` bewiesen, nicht geraten). Beweise: App 126/1683, `viewport3d-auswahl`(4)+`multi-auswahl`(6)+`griffe`(14) = 24 passed auf :5183 gegen frischen Build, Screenshot gesichtet (2 Elemente im Inspector). Ehrliche Grenze: das 3D-Auswahl-Highlight (Kupfer-Glut, emissiv 0.35) ist visuell SUBTIL — per Pixel-Readback messbar (+22 R), aber fürs Auge schwach; Kandidat für eine Sichtbarkeits-Politur. (Sonnet-Paket PB2, Gate Fable)

### 494

494. **v0.8.6-C · PC1 «Standort-Persistenz» + Fable-Nachzug Undo-Gruppe (19.07.2026):** Der Projektstandort überlebt jetzt den Reload — mit einem echten Kollisions-Fund als Kern: `design.standortSetzen`/`DocSettings.standort` existierten bereits seit V2 (WGS84-Fundament für Sonnenstudie/Schwarzplan/Baugesuch), eine wörtliche E6-Umsetzung hätte den Kernel beim Modul-Load zerlegt (`Command doppelt registriert`). Der Adressbeleg lebt darum als eigenes Setting `standortAdresse` mit Command `design.standortAdresseSetzen` (Shape exakt nach E6: adresse/lv95/quelle:'geoadmin'/abgerufenAm; SettingsPatch-Muster wie `schnittSetzen`, `before` explizit `?? null` — Object-Spread-Undo löscht keine Keys). Die StandortSuche schreibt BEIDE Commands seit dem Fable-Nachzug in EINER history-Gruppe (PC1s ehrlich gemeldete Zwei-Undo-Schritte-Lücke geschlossen: ein Ctrl+Z nimmt den Treffer-Klick als Ganzes zurück); KosmoData zeigt den Standort als Karte (`data-projekt-standort`, LV95 + Adresse + Abrufdatum, ehrlicher Leer-Zustand). Beweise: 13 neue Kernel-Tests (inkl. fromJSON-Roundtrip und Koexistenz beider Settings), Kernel 1043, svg-qa 36/0, Goldens git-sauber, App 127/1686, `standort-persistenz`(2)+`nachbarn-import`(1) = 3 passed auf :5183 gegen frischen Build (voller Fluss inkl. Reload+Autosave+Undo), Screenshot gesichtet (PROJEKT-STANDORT-Karte mit echtem Lauf-Datum). ÖREB bleibt planmässig Kandidat. (Sonnet-Paket PC1, Nachzug + Gate Fable)

### 495

495. **v0.8.6-C · Matrix-Abnahme (16 Prüfer) + zwei Autopilot-Härtungen: echter Abbruch, keine erfundenen Commands (19.07.2026):** 16 adversariale Prüfer haben C-1…C-16 am Live-Build zu widerlegen versucht — **14 bestanden, 2 echte Funde, beide gefixt**. **C-11:** «Abbrechen» war für ECHTE Klicks nie erreichbar — alle Kernel-Commands sind synchron, der Runner lief in einem einzigen Task durch (0/400 Abbruch-Versuchen des Prüfers landeten; nur der Sync-Trick der Unit-Tests kam je an). Fix: `LaufRunner.starte()` yieldet vor JEDEM Schritt einen Macrotask — der Browser verarbeitet Klicks und Renders zwischen den Schritten, die Schrittliste läuft sichtbar mit, und der neue E2E-Test beweist den Abbruch **per echtem Klick** gegen einen 400-Schritt-Lauf (dazu Runner-Unit-Test fürs Zeitfenster; zwei bestehende Sync-Trick-Tests ehrlich auf die neue Semantik angepasst: synchroner Abbruch greift jetzt VOR Schritt 0, Doc bleibt unberührt). **C-12:** eine erfundene commandId überstand die Schema-Prüfung (laufPlanSchema prüft bewusst nur nicht-leere Strings) — die Karte erschien, und ein Mehrschritt-Lauf committete echte Schritte, bevor der kaputte ihn riss. Fix: die ChatSession prüft jede Schritt-commandId zur VORSCHLAGS-Zeit gegen die reale Command-Registry (`bekannteCommandIds` aus `commandTools()`); unbekannte IDs gehen als benannter Tool-Fehler an Kosmo zurück, KEINE Karte, kein halber Lauf (neuer ScriptedProvider-Test). Beweise: kosmo-ai 310 (+2), App 127/1686, Autopilot-E2E-Batch 12 passed auf :5183 inkl. des neuen Klick-Abbruch-Tests. C-1…C-17 in `docs/V086-SPEZ.md` abgehakt (C-17 Standort war durch die PC1-E2E bereits bewiesen). (Fable + 16 Sonnet-Prüfer)

