---
titel: "Release 0.8.9"
tags: [release, "v0.8.9"]
status: "veroeffentlicht"
erstellt: "2026-07-19"
verwandt: ["[[Release-Ablauf]]"]
---
# Release 0.8.9

Automatisch erzeugt aus `ROADMAP.md` (Einträge ab **520**) von
`kosmo-orbit/tools/release-notiz.mjs` — Teil des Release-Ablaufs
[[Release-Ablauf]] (Owner-Auftrag v0.6.2: «bei jedem Update pushe alles auf
git, obsidian und die neuste Installer-Version zum Herunterladen auf der
Website»).

## Enthaltene ROADMAP-Einträge (520–536)

- **520.** v0.8.9 / W0 «Geordnet»: V089-SPEZ mit eingefrorenen Entscheiden (19.07.2026):
- **521.** v0.8.9 / W0b «Blender-Werkbank»: Spez-Nachtrag E9–E13 (19.07.2026):
- **522.** v0.8.9-A · PA5 «Treppen-3D-Griffe» (19.07.2026):
- **523.** v0.8.9-A · PA1 «Wand↔Wand-Schnittverschneidung (A1-Rest)» (19.07.2026):
- **524.** v0.8.9-B' · PBL3 «glTF-Härtung (Blender-Roundtrip)» (19.07.2026):
- **525.** v0.8.9-B' · PBL1 «Blender-Verträge + Bridge» (19.07.2026):
- **526.** v0.8.9-A · PA2 «CAD-Ebenen als DXF-Interop + Sperren» (19.07.2026):
- **527.** v0.8.9 · Fable-Nachzug: griffDragAktiv-Kanal + locked-Guards (Cluster B, atomar) (19.07.2026):
- **528.** v0.8.9-B' · PBL4 «Bake-Rückweg (AO/LOD → Asset-Bibliothek)» (19.07.2026):
- **529.** v0.8.9-B' · PBL2 «Blender-Client (Line-Art · Sonnenstunden · Label-Kette)» (19.07.2026):
- **530.** v0.8.9-B · PB6a «NodeCanvas-Kollaps-Trefferfläche» (19.07.2026):
- **531.** v0.8.9 · Fable-Vorbau Tag B: Blattverzeichnis-Subspez + Golden-Erwartungsliste (19.07.2026):
- **532.** v0.8.9 · E6 «Port-Theme-Paletten» — Owner-Wahl K2 Ausgewogen (19.07.2026):
- **533.** v0.8.9 · E8-Nachzüge: massKetteGeometrieSetzen + Eval-Fokus (19.07.2026):
- **534.** v0.8.9-B · PB3 «Blattverzeichnis + Sammellegende» (19.07.2026):
- **535.** v0.8.9-C · GOLDEN-WECHSEL-089 Teil 2 — Stillstandsnachweis BESTANDEN (19.07.2026):
- **536.** v0.8.9-C · Matrix-Abnahme: 16 Prüfer, 2 Funde, 2 Fixes (19.07.2026):

## Installer

Stabile Download-Links (immer der zuletzt gebaute Installer, drei Editionen ×
drei Plattformen): [[Release-Ablauf]] Abschnitt 4, live auf
architekturkosmos.ch/orbit — sobald die Website-Änderung selbst auf `main`
liegt (siehe [[Release-Ablauf]] Abschnitt 6, DEPLOYMENT.md).

## Volltext je Eintrag

## Installer

Stabile Download-Links (immer der zuletzt gebaute Installer, drei Editionen ×
drei Plattformen): [[Release-Ablauf]] Abschnitt 4, live auf
architekturkosmos.ch/orbit — sobald die Website-Änderung selbst auf `main`
liegt (siehe [[Release-Ablauf]] Abschnitt 6, DEPLOYMENT.md).

## Owner-Testpause (bindender Rahmen 19.07.)

Bis **v0.9.0** gibt es je Version **kein Rundgang-PDF und keine
Installer-Zustellung** (Owner testet erst bei 0.9.0 wieder; Sanktion 10,
in v0.8.9 unverändert weitergeführt). Der `.desktop-build-request` wurde
trotzdem angestossen — die Website-Kette («neuster Installer zum
Herunterladen») läuft weiter, nur die persönliche Zustellung pausiert.
E2E-Gates liefen unverändert voll.

**Smoke-Puffer:** Der Puffer für Owner-Smoke-Funde stand auch in diesem
Zyklus bereit und blieb zum fünften Mal in Folge leer — kein
verschwiegener Aufschub, sondern benannter Leerstand. Eintreffende
Rückmeldungen gehen mit Vorrang in die 0.8.10-Kandidatenliste.

## Ehrliche Grenzen dieser Version

Alle Blender-Werkbank-Ergebnisse im Container sind **markierte Fakes**
(Render-Vorschau «Vorschau (Fake-Render)») oder enden ehrlich auf
**kein-blender-worker** (Sonnenstunden, Bake, Line-Art) — Physik-Zahlen
und Geometrie-Optimierungen werden nie erfunden. Echte Cycles-Renders,
Sonnenstunden-Zahlen und gebackene Modelle brauchen den Blender-Worker
an der HomeStation (RTX 5090, Geräte-Termin).

## 0.8.10-Kandidatenliste (Stand Release)

1. **Python-Worker-Runner-Mittelweg** (Owner-Entscheid 19.07., fest) —
   testbarer Runner nach lora_empfaenger-Vorbild; die bpy-Drehbuch-Regel
   fällt erst damit.
2. **Manuell-Rückbau KosmoVis + E2E-Island-Migration** (Owner-Entscheid
   19.07., fest) — Manuell-Zugang ausbauen/verstecken, ~30 Bestands-Specs
   auf Island-Äquivalente migrieren (Sanktion 2 der Island-Spez bewusst
   aufheben); Screenshot-Praxis ab sofort Island-first.
3. Blatt-Umbenennen-Command (PB3-Befund: fehlt produktweit).
4. Plancode-Spalten-Überlauf im Blattverzeichnis (C-5-Befund, kosmetisch).
5. VERSCHIEBBAR-Erweiterung (D9-Aufschub aus 0.8.9).
6. Line-Art-Node-UI (nach PB6a-Fundament).
7. Inspector-editableFields-Ausbau + massKette-Rest.

### 520

520. **v0.8.9 / W0 «Geordnet»: V089-SPEZ mit eingefrorenen Entscheiden (19.07.2026):** Der Owner-bestätigte Drei-Tages-Schnitt (A «Kern & Ordnung» / B «Blattwerk & Nachzüge» / C «Konsolidierung & Release verschlankt») steht als `docs/V089-SPEZ.md` — neun verifizierte Diagnosen (zwei Explore-Agenten + adversarialer Plan-Agent; u.a. D1: A1-Rest = Wand↔Wand-Eckfälle im Schnitt, section.ts-Drei-Gruppen-Logik; D3: meta.layer/locked sind toter Code, DXF-Layer rein semantisch; D7: ECHTER Produkt-Bug im NodeCanvas — die transparente Kopf-Drag-Rect schluckt Kollaps-Klicks, Ursache der zwei force:true; D8: Port-Szene-Blau 2.69:1 im Orbit-Theme, unter WCAG 3:1; D9: VERSCHIEBBAR-Erweiterung ist M quer durch Cluster B → RAUS aus 0.8.9). **Zentraler Planbefund:** 0.8.9 ist KEIN Golden-Sammelwechsel — Prognose 0 bewegte Bestands-Goldens + N additive (PB3); GOLDEN-WECHSEL-089.md wird zum Konsolidierungs-/Stillstandsnachweis umgewidmet (Erwartungsliste vorab, gemeinsamer Tag-C-Lauf, Prognose-Bruch = Hard-Stop). Acht Entscheide (E1 wandWandVerschneiden additiv, >2-Knoten kontrolliert ausgelassen, Schnitt-Goldens sha256-still mit FRÜHEM Probelauf; E2 ebeneSetzen/sperren nach renovationSetzen-Muster, layerFuer-Override NUR im DXF, locked blockiert Interaktion aber nie die Findbarkeit, kein Schloss im Plan-SVG; E3 Blattverzeichnis+Sammellegende NACH Fable-Subspez, additiv nach 083-Muster; E4 stairHandleGroup nach meshHandleGroup-Muster, x/y-only, Commit über bestehenden Kernel-Command; E5 Konsolidierungsnachweis; E6 Port-Paletten zweistufig — Kandidaten rechnen, Owner wählt; E7 Kollaps-Hit-Rect + force:true-Abbau; E8 Nachzüge nach Kapazität: massKetteGeometrieSetzen Fable-solo, Eval-Fokus), elf Sanktionen, Matrix C-1…C-12, bindende Cluster (Viewport3D nur PA5; DesignWorkspace/PlanView nur Fable; plan-hit-test.ts exklusiv PA2). **Owner-Entscheide per Rückfrage:** CAD-Ebenen = DXF-Interop + Sperren (kein Panel — RE-ARCHICAD-Linie bleibt) · Port-Paletten JA mit Kandidaten-Wahl · Name «Geordnet». Referenzbasis-Korrektur des Plan-Agenten dokumentiert: 37 Golden-Dateien (36 SVG + 1 IFC), nicht 36 — Zahlen gegenzählen. (Fable)

### 521

521. **v0.8.9 / W0b «Blender-Werkbank»: Spez-Nachtrag E9–E13 (19.07.2026):** Owner-Auftrag («baue blender tools … packe es noch in diese version») als eingefrorener Nachtrag in `docs/V089-SPEZ.md` §9 — Faktenbasis 3 Explore-Agenten + adversarialer Plan-Agent. Kernbefunde: die Sonnenstunden-Bridge ist seit ROADMAP 179 KOMPLETT fertig (POST /jobs/blender-sim, Fake→kein-blender-worker) — es fehlte nur der Client; Line-Art braucht KEINEN neuen Job-Typ (neues `style.mode`-Literal auf der vis--Render-Kette — das Feld war bisher überall hartcodiert 'none'); NodeCanvas muss NICHT angefasst werden (Line-Art-Trigger in der AUSTAUSCH-Insel → keine PB6a-Abhängigkeit). Entscheide: E9 Verträge+Bridge (bake-job/v1 Fünfschritt mit Präfix bake-, SonnenstundenResult-Schema, requested_style-Spiegelung, /jobs/bake mit Fake-Zweig VOR dem generischen — SOFORT kein-blender-worker, nie Pass-Through: ein unverändertes GLB als «gebackt» wäre die gefährlichste Fake-Klasse, weil es einen GESCHEHENEN Rechenschritt behauptet), E10 Line-Art erzwingt vis.skip:true, E11 Sonnenstunden-Insel ohne Doc-Feld (Job-Params, design.ts bleibt PA2), E12 glTF-Härtung als reiner Eigenbau (extras/Storey-Hierarchie/doubleSided, KEINE UVs — Unwrap ist Worker-Aufgabe; keine Attribution nötig), E13 Label-Kette (bildLabel(): Fake bleibt «Vorschau (Fake-Render)», Aufnahme wird ehrlich «Aufnahme (Viewport)», der Echt-Zweig ist im Container NIE erreichbar und wird GENAU SO dokumentiert). Sanktionen 12–15, Matrix C-13…C-17, Paketschnitt Tag B' (PBL1‖PBL3, dann PBL2‖PBL4). **Owner-Entscheide:** bpy-Regel (ROADMAP 179) bleibt in 0.8.9 — Drehbuch-only; der testbare Worker-Runner-Mittelweg (lora_empfaenger-Vorbild) wird festes 0.8.10-Paket; EEVEE fällt (praktisch-gratis-Prüfung negativ). Lizenz-Leitplanke bestätigt (OWNER-MANDAT: kein GPL-Link — nur Prozessgrenze + Apache-Teile). (Fable)

### 522

522. **v0.8.9-A · PA5 «Treppen-3D-Griffe» (19.07.2026):** Treppen sind im 3D-Viewport griffbar (E4): neue `stairHandleGroup` nach dem FreeMesh-meshHandle-Muster (Geometrie/Material bewusst WIEDERVERWENDET), AUSWAHL-gated statt modus-gated (Einzel-Auswahl einer Treppe → Kugeln an Antritt/Austritt, bei L-Form zusätzlich Ecke), `{id, revision}`-Cache, Raycast analog meshHandleTrefferAt, Pointer-Capture (0.8.7-Lehre), Drag x/y-only auf horizontaler Ziehebene (kein z-Griff, dokumentiertes Nicht-Ziel). Commit über den BESTEHENDEN `design.treppeGeometrieSetzen` — bewusst DIREKT via `useProject.getState().runCommand` statt des handlers-Callback-Wegs (DesignWorkspace ist Cluster-B-tabu; runCommand bleibt der EINE Schreib-Weg, Undo/Yjs identisch, im Code begründet); Kernel-Wurf → `stairDragZurueck` + meldeFehler, Treppe unangetastet. Esc bricht den Zug lokal ab (kein Commit, KEIN Eingriff in den 0.8.8-marqueeAktiv-Kanal). **Dokumentierte Randwirkung (Übergabe-Punkt an Fable, in Code+Spec-Kopf präzise verortet):** der unabhängige DesignWorkspace-Escape-Listener kennt nur marqueeAktiv als Ausnahme und leert die Auswahl mitten im Zug — betrifft den BESTEHENDEN meshDrag-Vertex-Griff genauso (älter als dieses Paket); Fix-Vorschlag `griffDragAktiv`-Kanal nach dem 0.8.8-Muster. Beweise: Typecheck, App 127/1696, neue `e2e/griffe-treppe-3d.spec.ts` (6: Handles-Sichtbarkeit per stairHandleCount-Hook, a-Drag mit ID/Form/Breite-Stabilität, L-Ecke, Esc-Abbruch, Mehrfachauswahl→keine Handles, Kernel-Wurf→Meldung+unverändert) + viewport3d-marquee(6)+auswahl(6)+occlusion(4) = **22 passed** auf :5183 gegen frischen Build (Fable-Rerun), beide Screenshots selbst gesichtet (2 Griffe gerade Treppe / 3 Griffe L-Form am Knick). (Sonnet-Paket PA5, Gate Fable)

### 523

523. **v0.8.9-A · PA1 «Wand↔Wand-Schnittverschneidung (A1-Rest)» (19.07.2026):** Die letzte benannte Verschneidungslücke aus ROADMAP 150 ist geschlossen (E1): neue `wandWandVerschneiden` läuft VOR `wandDeckeVerschneiden` (löst Wand-interne Konflikte, bevor Decke/Dach mit der bereinigten Form rechnen) — paarweise echte Überlappungen (bestehende Fugen-Schwelle wiederverwendet), Zusammenhangsgruppen per BFS, Rückschnitt nur gegen strikt HÖHERE `materialPrioritaet` (Tie-Break bei Gleichstand = bewusst ungeschnitten, dieselbe Konvention wie der Bestand), **>2-Wand-Gruppen komplett unangetastet** (Sanktion 5). Transparent benannte Abweichung vom wörtlichen «nur additiv»: `RawFace` trägt neu ein `entityId`-Pflichtfeld (drei Push-Stellen befüllt) — ohne Wand-Identität wäre ein mehrschichtiger Zweiwand-Stoss nicht sicher von einem echten >2-Wand-Knoten unterscheidbar; Sanktion 5 verlangt genau diese Trennschärfe (akzeptiertes Fable-Urteil). 9 neue Kernel-Tests (T-Stoss beide Richtungen mit realer Degenerationsstelle |dm|<0.3 empirisch gegengeprüft, Kreuzungs-Stellvertreter beide Richtungen, Gleichstand, byte-stiller 90°-T-Stoss, >2-Knoten, Determinismus-Doppellauf, Undo via invertPatches rückstandslos). Golden-Probelauf FRÜH: die drei Schnitt-Goldens sha256-identisch vor/nach `GOLDEN_UPDATE=1` (Tabelle im Bericht), 0 von 37 Dateien verändert. `RE-ARCHICAD.md` an zwei stalen Stellen nachgezogen (Verschneidungs-Status jetzt Grundriss + Schnitt Wand/Decke/Dach/Wand-Zweierfall; >2-Knoten als offene Grenze benannt). Beweise: Kernel 56/1120 im Worktree, **57/1129 im Hauptbaum-Rerun** (kombiniert mit PBL3), svg-qa 36/0, Typecheck grün. (Sonnet-Paket PA1, Gate Fable)

### 524

524. **v0.8.9-B' · PBL3 «glTF-Härtung (Blender-Roundtrip)» (19.07.2026):** Der handgebaute GLB-Export ist Blender-tauglich gehärtet (E12, reiner Eigenbau — keine Fremd-Portierung, keine Attribution nötig): (1) `extras{entityId, kind, geschoss}` je Bauteil-Node (kind = rohes Entity-kind für Blender-Skripting, das lesbare Label steckt im Namen; Storey-Auflösung als gemeinsame `resolveStorey`-Funktion, keine Duplikation zu objektName); Sonderfall «kein Storey» real getestet (parametrische Fensterprofile mit synthetischer entityId → Felder per konditionalem Spread WEGGELASSEN statt leer). (2) **Geschoss-Hierarchie**: ein Eltern-Node je Storey (storeysOrdered, nur mit ≥1 Kind) mit children-Array — `scenes[0].nodes` enthält nur Wurzeln; Bauteil-Namen byte-gleich (Bestands-Interop-Tests unverändert grün). (3) `doubleSided:true` an allen vier Materialien (einseitige Wand-/Dachflächen wären in Blender sonst unsichtbar). (4) Totes furniture/zone-KIND_LABEL-Mapping ENTFERNT (deriveAll liefert sie nie — mit Begründungs-Kommentar gegen künftige Fehlannahmen). NEUE `test/gltf.test.ts` (9: JSON-Chunk-Rückparse für extras/Hierarchie/doubleSided/Alignment/mm→m, Abwesenheits-Beweis für Möbel-Nodes); KEINE UVs/Texturen (Unwrap = Worker-Aufgabe, Kopfkommentar). Beweise: Kernel 56/1120 im Worktree, 57/1129 im Hauptbaum-Rerun (kombiniert mit PA1), die drei GLB-Bestands-Inline-Tests namentlich grün, svg-qa 36/0, Goldens still, Typecheck grün (inkl. selbst gefundenem storeys→storeysOrdered-Fix). (Sonnet-Paket PBL3, Gate Fable)

### 525

525. **v0.8.9-B' · PBL1 «Blender-Verträge + Bridge» (19.07.2026):** Die Vertrags- und Bridge-Seite der Blender-Werkbank steht (E9): `render-scene.style.mode` additiv um `'lineart'` (mit dokumentierter Client-Pflicht «lineart ⇒ vis.skip:true»), `RenderJob.requested_style?` («hält fest, was BESTELLT wurde») von main.py neben requested_engine gespiegelt, `SonnenstundenResult` (kosmo.sonnenstunden-result/v1: stunden/kriteriumErfuellt/methode) als optionales BlenderSimJob-Ergebnis + präzisierte params-Schlüssel (lat/lon/datum/kriteriumStunden), NEUER Fünfschritt-Contract `bake-job.ts` (kosmo.bake-job/v1, Präfix bake- mit eigener Regex, smart-uv-Unwrap-Literal, CONFIRMED_BAKE_-Token, Status wortgleich inkl. kein-blender-worker, BakeResult mit baked_glb/method/triangles) — Kopfkommentar verankert die Ehrlichkeits-Einordnung wörtlich («ein unverändertes GLB als ‹gebackt› behauptet einen Rechenschritt, der nie stattgefunden hat»). main.py: POST /jobs/bake nach blender-sim-Muster (out serverseitig erzwungen, unwrap-Validierung 400, Deckel 413, Freigabe-Pflicht-Symmetrie), Fake-Worker-Zweig `kind:'bake'` an Position 3 VOR dem generischen Render-Zweig (grep-Beweis :1074/:1088/:1105/:1124) → SOFORT kein-blender-worker, NIE running/done, NIE eine Ergebnis-Datei; get_job liest bake-result.json (schreibt sie nie). README «Worker andocken» um drei Prosa-Drehbücher erweitert (Bake mit Smart-UV-Pflicht, Line-Art auf der vis--Kette, Sonnenstunden-Sampling mit «NIE eine Zahl erfinden») — KEIN bpy-Code (Sanktion 15/ROADMAP 179). Beweise: Contracts 2/54, `test_bridge_haerte.py` Exit 0 mit **118 OK-Checks** (Fable-Rerun im Hauptbaum, u.a. «bake nach Fake-Worker-Pass: NIE 'running'/'done'», requested_style-Spiegelung 'lineart'), py_compile sauber, Typecheck grün, Scope exakt 10 Dateien. (Sonnet-Paket PBL1, Gate Fable)

### 526

526. **v0.8.9-A · PA2 «CAD-Ebenen als DXF-Interop + Sperren» (19.07.2026):** Die toten `meta.layer`/`locked`-Felder sind verdrahtet (E2, Owner-Rahmung: reines Interop-Feld, KEIN Ebenen-Panel — RE-ARCHICAD-Linie bleibt und ist dort nachgeführt): zwei additive Commands nach dem renovationSetzen-Muster — `design.ebeneSetzen` ({entityId, layer: string|null}, getrimmt, leer wirft, null räumt) und `design.sperren` ({entityId, locked}) — je EIN Patch, Undo symmetrisch, storey/assembly/sheet ausgeschlossen. `layerFuer()`-Override im DXF-Export liest `meta.layer` VOR den Semantik-Regeln (nur Export, keine Render-Wirkung), mit unterwegs gefundenem und gefixtem Matching-Bug: `derivePlan` bündelt nicht berührende Wände gleichen Materials als mehrere Ringe EINER Region — die Layer-Entscheidung läuft jetzt PRO RING. `locked`-Durchsetzung im erlaubten Kreis: `istGesperrt()`-Helfer in plan-hit-test.ts (pickEntityAt UNVERÄNDERT — gesperrt bleibt findbar, Sanktion 3), Inspector blockiert Löschen (Einzel+Mehrfach) und deaktiviert alle kind-spezifischen Eigenschaftsfelder, der Sperr-Toggle bleibt immer bedienbar; Hinweistext im Inspector, KEIN Schloss im Plan-SVG (Sanktion 2). **Präziser Übergabe-Punkt an Fable (Cluster B, in plan-hit-test.ts als Kommentar verortet):** onMoveStart :1103-1113, onGriffStart :1192-1213 und der Delete-Keydown :908-933 brauchen die istGesperrt-Guards — bis dahin ist C-3 nur teilweise erfüllt (Inspector ja, Canvas nein — ehrlich benannt, Nachzug folgt direkt). Beweise: Kernel 58/**1141** im Hauptbaum (1111+9 PA1+9 PBL3+12 PA2), App 127/**1698** (+2), svg-qa 36/0, Goldens still, neue `e2e/ebenen-sperren.spec.ts` 4/4 auf :5183 gegen frischen Build (Fable-Rerun), Inspector-Screenshot selbst gesichtet (Ebene-Feld, aktiver Sperr-Toggle, Hinweis, deaktivierter Löschen-Knopf). Ehrliche Grenzen: DXF-Override deckt wall/zone/mass/roof/column/stair (wirtsgebundene Öffnungen/Texte nicht); Überlapp-Randfall = Doc-Reihenfolge. (Sonnet-Paket PA2, Gate Fable)

### 527

527. **v0.8.9 · Fable-Nachzug: griffDragAktiv-Kanal + locked-Guards (Cluster B, atomar) (19.07.2026):** Beide Übergabepunkte aus Tag A sind eingelöst. (1) **PA5-Punkt:** neuer Zustands-Kanal `viewport-chrome-runtime.griffDragAktiv` nach dem marqueeAktiv-Muster — Viewport3D setzt ihn beim Start von `stairDrag` UND des ÄLTEREN `meshDrag`-Vertex-Griffs, räumt bei Commit (synchron), Esc (als Macrotask NACH dem Dispatch — dieselbe Listener-Reihenfolge-Begründung wie 0.8.8) und Unmount; der DesignWorkspace-Escape-Handler prüft jetzt `marqueeAktiv || griffDragAktiv` — Esc mitten im Griff-Zug bricht NUR die Geste ab, die Auswahl bleibt stehen, erst ein zweites Esc feuert die ArchiCAD-Dritte-Stufe. Neuer Testhook `__kosmoViewport.griffDragAktiv()`; der C-8(d)-Test beweist beide Esc-Stufen und pollt den Kanal explizit (erster Lauf war an genau diesem Macrotask-Timing rot — per Diagnose-Probe verifiziert, dass der Mechanismus korrekt war und nur der Test gegen das Timing wettete). (2) **PA2-Punkt:** die drei Canvas-Guards via `istGesperrt` — onMoveStart lehnt den Zug ab (Element bleibt anwählbar, Sanktion 3; gesperrte Gruppen-Mitglieder bleiben beim Gruppen-Zug stehen), onGriffStart liefert keine ziehbaren Griffe, Delete/Backspace filtert Gesperrte heraus (sie BLEIBEN ausgewählt — sichtbar, was stehen blieb). Neuer Test (e) in `e2e/ebenen-sperren.spec.ts` (Klick-Findbarkeit, Drag-Wirkungslosigkeit mit dokumentiertem Gummiband-Fallback des abgelehnten Zugs, Delete-Schutz, Entsperr-Gegenprobe); C-3 der Matrix ist damit VOLL erfüllt. Beweise: Typecheck, App 127/1698, Batch ebenen-sperren(5)+griffe-treppe-3d(6)+viewport3d-marquee(6)+griffe+multi-auswahl = **37 passed** auf :5183 gegen frischen Build; Diagnose-Probe-Spec nach Befund gelöscht. (Fable)

### 528

528. **v0.8.9-B' · PBL4 «Bake-Rückweg (AO/LOD → Asset-Bibliothek)» (19.07.2026):** Der E4-Rückweg steht (E9-Bake-Teil, Sanktion 12): neues `modules/asset/bake-auftrag.ts` mit EIGENEM bakeFetch-Helfer (bewusst kein Import aus vis-jobs — PBL2 lief parallel am selben Modul), `starteBakeAuftrag` (exportGlb → multipart `szene` an /jobs/bake — Feldname wörtlich aus main.py), `holeBakeAuftrag`/`abbrechenBakeAuftrag`, `ladeBakeErgebnis` mit der EINZIGEN Schreib-Bedingung `status==='done' && result.baked_glb` — jeder andere Status (insb. kein-blender-worker) → null, kein Fetch, kein speichereGlb; das Artefakt läuft zusätzlich durch pruefeGlbHeader. AssetWorkspace-Abschnitt «Modell backen (HomeStation)» mit ehrlicher Selbstbeschreibung («Ohne angeschlossenen Blender-Worker endet der Auftrag ehrlich … NIE als unverändertes Modell mit Bake-Etikett»), textureSize/decimateRatio-Feldern, Abbrechen, kein-blender-worker-Endzustand mit wortgleicher Bridge-Message; «Ins Modell laden» bei done über den BESTEHENDEN setGlbContext-Referenzweg (Viewport3D UNBERÜHRT). 9 Unit-Tests (Sanktion-12-Verweigerung je Status; done-Pfad mit künstlichem Blob — Container-unerreichbar, dokumentiert) + neue `e2e/bake-rueckweg.spec.ts` (2: erwartetes kein-blender-worker-Ende mit sichtbarer Message; Kern-Beweis KEIN neues Asset im Vault). Ehrlich Weggelassenes: Abbrechen-während-queued-E2E (das 0–1s-Fake-Worker-Fenster wäre Zufall als Beweis — gemessen und als Spec-Kommentar dokumentiert). Agent-Fund: die geteilte :8600-Bridge war eine VERALTETE Instanz ohne /jobs/bake — die Spec fährt eine eigene, kurzlebige Bridge auf :8604 (afterAll-Kill), die geteilte blieb für parallele Pakete unangetastet. Beweise: Typecheck, App 128/**1707** (+9), 2/2 E2E auf :5183 (Fable-Rerun), Asset-Regressions-Specs 6/6 im Agent-Gate, Screenshot selbst gesichtet. (Sonnet-Paket PBL4, Gate Fable)

### 529

529. **v0.8.9-B' · PBL2 «Blender-Client (Line-Art · Sonnenstunden · Label-Kette)» (19.07.2026):** Der Client-Teil der Blender-Werkbank (E10/E11/E13): `vis-jobs.ts` führt `mode:'lineart'` durch die bestehende Render-Kette — `postRenderJob`/`sendeGraphRenderAuftrag` setzen bei lineart `style.mode='lineart'` UND erzwingen `vis.skip=true` hart (gewinnt über nurCycles; E2E-Netzwerk-Mock beweist es aus der render-scene.json); Trigger ist eine Checkbox in der AUSTAUSCH-Insel (Sanktion 13 eingehalten: NodeCanvas unberührt). `BILD_LABEL_FAKE_RENDER` ist durch die E13-Funktion `bildLabel()` ersetzt (worker fehlt/fake-worker → «Vorschau (Fake-Render)»; requested_style lineart → «Strichzeichnung (Line-Art)»; sonst «Render (Cycles)» — der Echt-Zweig ist im Container NIE erreichbar und NUR per Unit-Test mit künstlichem JobRecord bewiesen, 5 neue Tests in `blender-label.test.ts`); der Aufnahme-Pfad trägt neu ehrlich «Aufnahme (Viewport)» statt des Fake-Render-Labels (bewusste Semantik-Korrektur inkl. Anpassung in vis-publish-bild.spec Test 1). NEU `blender-jobs-runtime.ts` (Laufzeit-Store, Testhook `__kosmoBlenderJobs`) + `postBlenderSimJob`/`postBakeJob`-Familie mit eigenen safeParse-Wegen und client-seitiger Zod-Validierung der Sonnen-Params VOR dem Senden; Agent-Fund dokumentiert: die Bridge erwartet das Formularfeld `szene` (deutsch), nicht `scene`. Die SONNE-Insel (E11, fünfte Insel unten-links mit eigener Rand-Klasse + 2 neuen Glyphen) liest den Standort NUR aus `doc.settings.standort` (Sanktion 14: kein Doc-Feld, kein design.ts) und zeigt den kein-blender-worker-Endzustand mit wortgleicher Bridge-Message («… Physik wird nicht erfunden.»). Beweise: Typecheck alle 8 Workspaces, App 129/**1713**, frischer :5183-Build mit 40/40 E2E (blender-bridge 5 + vis-publish-bild 4 + visgraph 5 + vis-editor 8 + island-verdrahtung/vis-island 18), Screenshots (SONNE-Insel kein-worker, Label-Regression) von Fable selbst gesichtet. (Sonnet-Paket PBL2, Gate Fable)

### 530

530. **v0.8.9-B · PB6a «NodeCanvas-Kollaps-Trefferfläche» (19.07.2026):** Der D7-Befund (Matrix C-9, force:true-Klicks im vis-editor-Spec als zugegebene Hit-Detection-Schwäche) ist behoben: das `node-kollaps`-g trägt vor Glyph/`<title>` eine transparente Hit-Rect 24×20 (x=NODE_W−48, y=3 — deckt die 14px-Icon-Bbox mit Rand, endet 2px VOR der Löschen-Zone, aus den NODE_W/KOPF_H-Konstanten abgeleitet und mit D7-Fundstelle kommentiert); Kopf-Drag bleibt unverändert (stopPropagation im Kollaps-g wie zuvor). `e2e/vis-editor.spec.ts` klickt den Kollaps jetzt OHNE force:true (grep-Beweis: 0 Treffer «force» in der Datei); der Kollaps-Test und die Port-Drag-Regression laufen grün. Beweise: Typecheck, App 129/1713, 13/13 (vis-editor 8 + visgraph 5) im Agent-Gate auf :5176 UND im Fable-Rerun auf :5183 (Teil der 40/40 oben). (Sonnet-Paket PB6a, Gate Fable)

### 531

531. **v0.8.9 · Fable-Vorbau Tag B: Blattverzeichnis-Subspez + Golden-Erwartungsliste (19.07.2026):** Die zwei E3/E5-Pflichtdokumente VOR dem PB3-Start: `docs/SUBSPEZ-BLATTVERZEICHNIS-089.md` friert Dateikreis, Signaturen (`blattverzeichnisZeilen`/`sammellegende`/`blattverzeichnisSvg` — Standalone-A4-Blatt nach kvBlattSvg-Hausmuster, bewusst KEIN SheetPlacement-Umbau, KEIN neuer Command, KEIN Entity-Feld), Tabellen-Layout, Guards (Bestands-Goldens byte-still, Überlauf ehrlich mit «+M weitere»-Zeile, kein new Date() im derive) und die zwei Golden-Namen (`blattverzeichnis.svg`, `blattverzeichnis-legende.svg`) ein — die Sammellegende verallgemeinert die Pro-Blatt-Legenden aus sheet.ts:315-347 über das Publikations-Set, ohne sheet.ts anzufassen. `docs/GOLDEN-WECHSEL-089.md` Teil 1 prognostiziert je Paket: 0 bewegte Bestands-Goldens überall, +2 additiv nur aus PB3 → Ziel 39 Dateien (38 SVG + 1 IFC), svg-qa 38/0; Abweichung beim gemeinsamen Teil-2-Lauf = Hard-Stop. (Fable direkt)

### 532

532. **v0.8.9 · E6 «Port-Theme-Paletten» — Owner-Wahl K2 Ausgewogen (19.07.2026):** Der D8-Befund (szene 2.69:1 auf dem dunklen `--k-field`) ist per Owner-Entscheid geschlossen: aus drei rechnerisch WCAG-konformen Kandidaten (K1 Minimal / K2 Ausgewogen / K3 Leuchtend, alle mit exakten Kontrastzahlen als Swatch-Vergleichsbild zugestellt) wählte der Owner **K2 Ausgewogen** — alle sechs Ports auf ein einheitliches ≥4.6:1-Band gegen `#0b0d12` gehoben, Hue unverändert. Einbau: `[data-theme='orbit']`-Overrides in aura.css für FÜNF Tokens (szene #427ad5 · bild #c95a33 · prompt #278c5d · zahl #8b70ab · material #967740; `kameras` erreichte das Band schon im Bestand und fällt bewusst auf den Basiswert zurück), Papier behält überall die Bestandswerte (alle ≥3.7:1); die Blau-Entkopplung von `--k-graph`/`--k-accent` bleibt (eigene Hexwerte, kein var()-Verweis). Kommentar-Nachzug an beiden dokumentierten Stellen (aura.css-Port-Block: Theme-Invarianz ehrlich als aufgehoben markiert; NodeCanvas.tsx-Kopf: der var()-Kanal zahlt sich genau hier aus). `e2e/vis-token.spec.ts` misst den Wechsel: die zwei Sanity-Assertions folgen dem orbit-Default (#278c5d), NEU ein Theme-Flip-Test (orbit→paper am gerenderten Port-fill: rgb(39,140,93)→rgb(30,107,71)). Beweise: UI-Suite 111, Typecheck, vis-token 5/5 + visgraph 5/5 auf frischem :5183-Build, Node-Editor-Screenshot mit neuer Palette selbst gesichtet. (Fable direkt, Sanktion 8 erfüllt: Einbau erst NACH dokumentierter Owner-Wahl)

### 533

533. **v0.8.9 · E8-Nachzüge: massKetteGeometrieSetzen + Eval-Fokus (19.07.2026):** Der 0.8.8-C-3-Aufschub ist eingelöst: neuer Kernel-Command `design.massKetteGeometrieSetzen` ({entityId, punktIndex, punkt}, Range-Wurf VOR jedem Patch, in-place nach dem wandGeometrieSetzen-Muster — Identität/storeyId bleiben, EIN Patch = EIN Undo-Schritt); der Masskette-Griff-Zweig in DesignWorkspace `onGriffEnd` ist von Löschen+Neusetzen (neue Id, select-Nachführung) auf EINEN Aufruf umgestellt, der verwaiste MassKette-Typ-Import samt C-3-Aufschub-Kommentar entfernt. +5 Kernel-Tests (in place/Undo-Invertierung/Range-Wurf mit unangetasteter Kette/zod-Ablehnungen/summarize nach apply) und die ID-Stabilitäts-Assertion im bestehenden griffe.spec-Masskette-Test (Entity-Id UND Auswahl bleiben nach dem Drag dieselbe — vorher prinzipbedingt unmöglich). Eval-Fokus: `wissen/training/eval/kosmo-zeichner-commands` +10 Prompts (cmd-46…55: verschieben/wandGeometrieSetzen/treppeGeometrieSetzen/massKetteGeometrieSetzen als neue Klasse «geometrie», vis.nodeKollabieren/trennen/nodeLoeschen/graphLoeschen, treppeErstellen+dachErstellen als «baukonstruktion») — `npx tsx pruefe-eval.mts` 55/55, eval-ergebnis.json nachgeführt. Beweise: Typecheck 8 Workspaces, Kernel 59/**1146** (+5), App 129/1713, griffe.spec 14/14 auf frischem :5183-Build. (Fable direkt, Cluster B)

### 534

534. **v0.8.9-B · PB3 «Blattverzeichnis + Sammellegende» (19.07.2026):** Das E3-Paket exakt nach der eingefrorenen Subspez (`docs/SUBSPEZ-BLATTVERZEICHNIS-089.md`): drei additive pure Funktionen in `derive/publikation.ts` — `blattverzeichnisZeilen` (transmittalCsv-Semantik: ohne Set alle Blätter in index-Reihenfolge, Plancode-Spalte nur bei Daten), `sammellegende` (Verallgemeinerung der Pro-Blatt-Legenden aus sheet.ts:315-347 über ALLE Set-Blätter — Themen in Erst-Vorkommens-Reihenfolge, Keynotes de-CH-numerisch dedupliziert — OHNE sheet.ts anzufassen) und `blattverzeichnisSvg` (eigenständiges A4-hoch-Blatt nach kvBlattSvg-Hausmuster, Überlauf ehrlich als «+M weitere Blätter»-Zeile, Legende-Abschnitt entfällt komplett ohne Daten, kein new Date() im derive). Export-Knöpfe je Set an beiden Transmittal-Stellen (PublishWorkspace + Publish-Insel AUSTAUSCH). **+2 Goldens** (`blattverzeichnis.svg`, `blattverzeichnis-legende.svg`) — exakt die GOLDEN-WECHSEL-089-Prognose, git-status-Beweis: kein Bestands-Golden im Diff; svg-qa neu 38/0. +18 Kernel-Tests, 3 E2E (Export+Inhalt, C-5-Aktualisierung über pure Ableitung, Insel-Weg identischer Inhalt). Ehrlich benannt: (a) es gibt produktweit KEINEN Blatt-Umbenennen-Command — der C-5-Test beweist die Aktualisierung über eine Sequenz bestehender Commands, Rename-Weg = 0.8.10-Kandidat; (b) sehr lange Plancodes (19 Zeichen) überschreiten in der Plancode-Spalte die Innenrahmenlinie (bleiben auf dem Papier, svg-qa ohne harten Fehler) — als Befund für die C-5-Matrix-Zelle vorgemerkt; (c) ein roter Regressionstest (island-inhalte-projekt-austausch Deep-Link) wurde per git-stash-Gegenprobe als vorbestehend bewiesen, nicht PB3. Beweise: Typecheck, Kernel 59/**1164**, App 129/1713, svg-qa 38/0, 13/13 E2E auf frischem :5183-Build (blattverzeichnis 3 + publish-island 10), Verzeichnis- und Legenden-Rendering von Fable selbst gesichtet. (Sonnet-Paket PB3, Gate Fable)

### 535

535. **v0.8.9-C · GOLDEN-WECHSEL-089 Teil 2 — Stillstandsnachweis BESTANDEN (19.07.2026):** Der gemeinsame `GOLDEN_UPDATE=1`-Abschlusslauf über alle neun gelandeten Pakete (522–534): Kernel 59/1164 grün mit JEDEM Golden neu geschrieben; aggregierte sha256 über alle 39 Dateien vor und nach dem Lauf **identisch** (`ce144f5c…`), git-Baum leer, svg-qa 38/0. Ist == Teil-1-Prognose (0 bewegt überall, +2 additiv nur PB3) — kein Hard-Stop-Fall, E5 vollständig erfüllt. Details in `docs/GOLDEN-WECHSEL-089.md` Teil 2. (Fable direkt)

### 536

536. **v0.8.9-C · Matrix-Abnahme: 16 Prüfer, 2 Funde, 2 Fixes (19.07.2026):** Adversarialer Fan-out über alle prüfbaren Matrix-Zellen (C-1…C-11, C-13…C-17; C-12 IST das Release-Ritual selbst) — je Zelle ein unabhängiger Prüfer gegen den echten Code mit Datei:Zeile-Pflicht und eigenen Testläufen. Bilanz: **14× PASS, 2× TEIL**, beide Funde noch vor dem Release gefixt (Commit 27d3ab9): (1) **C-2**: der PA2-Commit 89df13e (Worktree-Basis VOR PA1) hatte PA1s RE-ARCHICAD-Nachzug an zwei Stellen wortgleich zurückgedreht — klassischer Parallel-Paket-Konflikt an einer geteilten Doku-Datei, wiederhergestellt; (2) **C-3**: der onGriffStart-Sperr-Guard war nur statisch belegt — neuer E2E-Test (f) in ebenen-sperren.spec (Griff-Drag an gesperrter Wand wirkungslos, entsperrt zieht derselbe Griff; 6/6). Dokumentierte Einordnungen ohne Fix-Bedarf: C-2-Beleglage des frühen GOLDEN_UPDATE-Probelaufs ist Prosa (Kernaussage unabhängig durch byte-stille Dateien + eigene Testläufe gedeckt); C-3-DXF-Override deckt bewusst nur wall/zone/mass/roof/column/stair (Spez-Umfang); C-11-Klick-Beweis trifft die Bbox-Mitte der neuen Trefferfläche (Rand-Klicks implizit durch die 24×20-Geometrie). (Fable-Workflow, 16 Sonnet-Prüfer)

