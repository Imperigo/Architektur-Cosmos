# V0.8.10-SPEZ «Inselrein» — Worker-Runner + Manuell-Rückbau KosmoVis

Eingefroren 19.07.2026 (Fable, nach Owner-Plan-Freigabe). Format-Vorbild
`docs/V089-SPEZ.md`. Basis: HEAD `419fce7` (Release v0.8.9), Suiten 3416,
Goldens 39 Dateien (38 SVG + 1 IFC), svg-qa 38.

## 1 · Herkunft der Pakete

- **P-A Worker-Runner**: Owner-Entscheid 19.07. (V089-SPEZ §9, «der
  testbare Python-Worker-Runner-Mittelweg (lora_empfaenger-Vorbild) ist
  festes 0.8.10-Paket»).
- **P-B Manuell-Rückbau KosmoVis**: Owner-Entscheid 19.07. (Screenshot-
  Rückfrage: «alle Tools mit eigener UI haben die Island-UI»; Wahl
  «0.8.10-Paket: Rückbau»).
- **Z1/Z2/Z5**: 0.8.9-Befunde (ROADMAP 534 a/b, Inspector-Lücken).
- Owner-Wahlen zur Planung (AskUserQuestion 19.07.): Name «Inselrein» ·
  Schnitt Z1/Z2/Z5 drin, Z3 nach Kapazität, Z4 raus · Manuell-Codepfad
  stehen lassen · Plancode-Fix als zweite Zeile.

## 2 · Entscheide (E1–E8, bindend)

- **E1 Blender-Worker-Runner** (P-A, Sonnet): NEU
  `tools/homestation-bridge/kosmo_bridge/blender_worker.py` nach dem
  lora_empfaenger-Hausmuster — argparse-CLI, Pflichtflag `--fake-worker`
  (ohne → Exit 2), jede Erfolgsausgabe trägt «FAKE», KEIN bpy-Import,
  kein GPL-Link. Dateisystem-Poller des `--store`-Ordners nach dem
  normativen 4-Schritt-Protokoll (README:189-271): queued idle-gated
  claimen → running+worker/progress → Record vor Ergebnis FRISCH lesen
  (cancelled bricht kooperativ ab) → Ergebnisdatei je Typ + done.
  Protokoll-Vorbild `_fake_worker_step` (main.py:1063-1173) — bewusst
  NICHT refactored (main.py bleibt Container-Vorbild; Duplikation
  begründet kommentiert). Pluggables Berechner-Interface
  (Protocol-Klasse); im Repo NUR der Fake-Berechner: `vis-` → markiertes
  FAKE-Bild als render-result.json inkl. requested_style-Spiegelung;
  `bake-`/`bsim-` → SOFORT kein-blender-worker, nie running/done.
  Exklusivitäts-Regel: der Runner läuft NIE gegen eine `--fake`-Bridge
  (interner Fake-Worker und externer Runner wechselseitig exklusiv,
  README dokumentiert es). NEU `test_blender_worker.py` (plain check()
  + Exit-Code, HTTP-frei gegen temp-Store). ROADMAP 179 wird
  präzisiert, nicht gekippt (Runner ist bpy-frei).
- **E2 vis-Spec-Migration** (P-B1, Sonnet, Tag A): Schritt 1 =
  verbindliches Audit ALLER Specs mit vis-Manuell-Bootstrap
  (Gate-Artefakt mit grep-Belegen; Mindestbestand: visgraph, vis-editor,
  vis-publish-bild, vis-token (Setup), vis-automatik, render-knopf,
  sim-ki-imaging, vis-Kapitel kosmo-journey-efh/mfh). Migration JE SPEC
  per `test.use({storageState:{cookies:[],origins:[]}})` nach dem
  blender-bridge.spec:49-Vorbild — KEIN globaler Seed-Flip in dieser
  Stufe. Bootstrap auf Island-testids (visisl-graph-erstellen,
  island-palette-eintrag-<typ>, AUSTAUSCH render-senden,
  island-drei-stimmungen); Node-Ebene (vis-node-*/port-*/
  render-ausfuehren) bleibt identisch — Kern-Assertions unverändert.
  Journey-Specs zuletzt, Teilabnahme je Spec. vis-oberflaeche.spec
  bleibt in P-B1 unberührt.
- **E3 Manuell-Rückbau** (P-B2, Sonnet, Tag B, NACH P-B1b-Gate) —
  **NACHTRAG 20.07.2026 (Owner-Entscheid nach P-B1-Audit, ersetzt die
  ursprüngliche E3-Fassung):** Das P-B1-Audit fand vier Manuell-only-
  Funktionen ohne Insel-Äquivalent (vis-Legende, VisOnboarding,
  Vis-Dock-Panels, gespeicherte Ansichten). Owner-Wahl: «Insel bleibt
  Default und UI-Standard; die andere UI (manuelle Ansicht) kann in den
  Einstellungen geändert werden.» Konkret: (1) Vorwärts-Werkzeug
  'manuell' aus vis-island-katalog.ts:96 + case in VisWorkspace.tsx
  entfernen — der PROMINENTE Zugang fällt; (2) NEU ein Schalter
  «Manuelle Ansicht (KosmoVis)» im Einstellungs-Panel
  (shell/Einstellungen.tsx, bestehende Sektions-Muster), der
  visOberflaeche setzt — Island bleibt Default; (3) island-zurueck-
  Knopf im Manuell-Chrome BLEIBT (Rückweg); (4) **KEINE
  normalisiere()-Koerzierung** — 'manuell' ist jetzt eine legitime
  Einstellung, kein Strand-Zustand; (5) die vier Manuell-only-Features
  bleiben damit erreichbar — kein Funktionsverlust, keine
  0.9.0-Ersatzpflicht; (6) Globaler Seed: manuell-seed.ts verliert das
  vis-Feld (design/publish/prepare bleiben); die Manuell-Feature-Specs
  (vis-onboarding, dock-layout, dock-presets, vis-ansichten,
  p8-081-screenshots, vis-token-Legende-Teil) bekommen je einen
  PER-SPEC-Manuell-Seed (test.use), deklariert; der Flip ist ein
  EIGENER Commit mit Voll-Suiten-Lauf davor/danach (Sanktion 7
  unverändert); (7) vis-oberflaeche.spec wird deklariert umgebaut:
  Umschalt-Beweis läuft neu über den Einstellungs-Schalter (hin UND
  zurück), Pan/Fit-Tests bleiben; (8) ISLAND-UI-SPEZ-§6-Sanktion-2-
  Nachtrag datiert wie gehabt. Der Manuell-Codepfad bleibt stehen
  (jetzt wieder legitim erreichbar).
- **E4 Blatt-Umbenennen** (Z1, Sonnet, Tag B): design.eigenschaftSetzen
  lernt `sheet: ['name']` (allowed-Map design.ts:788-813 + Direktfeld in
  der name→meta-Ausnahme :900-903); Kernel-Test. UI: Klick-zu-Edit am
  Blattnamen (PublishWorkspace.tsx:772, testid `sheet-name-<index>`);
  Inspector schliesst sheet weiterhin aus (Inspector.tsx:388 bleibt).
  E2E inkl. «Blattverzeichnis zeigt den neuen Namen». FRÜHER
  GOLDEN_UPDATE-Probelauf, Prognose 0 bewegt.
- **E5 Plancode zweite Zeile** (Z2, Fable-solo, Tag B — der EINZIGE
  Golden-Beweger): Owner-Wahl «zweite Zeile» — der Plancode wandert als
  kleine zweite Zeile unter den Blattnamen (derive/publikation.ts,
  BV_*-Konstanten; die Plancode-SPALTE samt BV_SPALTE_PLANCODE=182
  entfällt). Bewegt EXAKT `blattverzeichnis.svg` +
  `blattverzeichnis-legende.svg` (Mini-Golden-Wechsel: Erwartungsliste
  vorab, aggregierte sha256 der übrigen 37 vor/nach identisch, svg-qa
  38/0). blattverzeichnis.test.ts nachziehen.
- **E6 Inspector-Ausbau** (Z5, Sonnet, Tag A): fehlende Zweige/Felder,
  die die Kernel-allowed-Map SCHON kann — column (material/b/t/
  rotationGrad), beam (breite/hoehe/material), furniture (rotationGrad),
  zone (program/number/raumTyp), mass (program), wall (height),
  freemesh (name) — nach dem Muster der Bestandszweige. Dateikreis NUR
  Inspector.tsx + Spec.
- **E7 GOLDEN-WECHSEL-0810** (Fable): Teil 1 VOR den Landungen
  (Prognose: 2 bewegt nur aus E5, 37 still, +0 neu); Teil 2 am Tag C
  (gemeinsamer GOLDEN_UPDATE=1-Lauf, Ist == Prognose, Hard-Stop bei
  Bruch). Referenzbasis 39 Dateien / svg-qa 38.
- **E8 Nach Kapazität** (Z3, Fable, kein Kernversprechen): Klickbarkeit
  furniture/beam/boundary/etikett (pickEntityAt + PlanView-Pointer-
  Handler), dann VERSCHIEBBAR-Set (plan-hit-test.ts:276-278) erweitern —
  design.verschieben kann die Kinds seit 0.8.8. Fällt bei Zeitmangel
  ersatzlos auf 0.9.0. · Z6 Deep-Link-Diagnose (island-inhalte-projekt-
  austausch «Rendern→KosmoVis», vorbestehend rot dokumentiert):
  timeboxt, Fix nur wenn trivial, sonst Befund hier nachgetragen.

## 3 · Betrieb (bindend)

- **Dateikreis-Exklusivitäten:** P-A: blender_worker.py +
  test_blender_worker.py + README (main.py/test_bridge_haerte.py TABU).
  P-B: auditierten e2e-Specs, manuell-seed.ts, playwright.config.ts,
  VisWorkspace.tsx, vis-island-katalog.ts, ui-zustand.ts,
  ISLAND-UI-SPEZ.md-Nachtrag (NodeCanvas.tsx/vis-jobs.ts/island/inhalte/
  austausch.tsx + design/publish/prepare-Manuell TABU). Z1: design.ts +
  PublishWorkspace.tsx + Tests. Z2: publikation.ts + Goldens +
  blattverzeichnis.test.ts (Fable). Z5: Inspector.tsx + Spec.
  Cluster B (plan-hit-test/PlanView/DesignWorkspace) exklusiv Fable.
  ROADMAP nur additiv je Paket, Konflikt löst Fable.
- Worktrees + npm install; Agenten-Ports 5174–5177, Fable 5183; Preview
  IMMER aus apps/kosmo-orbit/ solo; Copy-back-Zielpfade beginnen mit
  `kosmo-orbit/` (benannte 0.8.9-Falle, cmp vor rm); Worktree fällt
  SOFORT nach dem Gate.
- Gate-Screenshots **Island-first** (Owner-Praxis seit 19.07.).
- Owner-Testpause bis 0.9.0: kein Rundgang-PDF, keine Installer-
  Zustellung; Build-Request-Push läuft (Website-Kette).

## 4 · Sanktionen (Paket ungültig bei Verstoss)

1. Bewegter Golden ausser den 2 deklarierten E5-Dateien.
2. P-A fasst main.py oder test_bridge_haerte.py an.
3. bpy-Import oder GPL-Link im Runner (ROADMAP-179-/Mandats-Bruch).
4. Runner liefert eine Physik-Zahl oder ein «gebacktes» GLB statt
   kein-blender-worker (Sanktion-12-Erbe 0.8.9).
5. Runner-Erfolgsausgabe ohne FAKE-Markierung.
6. P-B fasst NodeCanvas.tsx, vis-jobs.ts, island/inhalte/austausch.tsx
   oder den Manuell-Modus von design/publish/prepare an.
7. Seed-Flip vor leerem Audit ODER Assertion-Änderung an einer nicht
   deklarierten Spec.
8. Rundgang-PDF/Installer-Zustellung = Ritualverstoss; Build-Request
   nicht gepusht = Matrix-Zelle rot.

## 5 · Nicht-Ziele

- **Line-Art-Node-UI (Z4)** — RAUS auf 0.9.0: der nötige
  Ein-Quellen-Entscheid (Node-Param via vis.nodeParametrieren vs.
  Insel-useState in austausch.tsx:32) verlangt NodeCanvas+vis-jobs+
  austausch.tsx, während P-B genau diese Nachbarschaft neu verankert
  (0.8.9-RE-ARCHICAD-Konfliktmuster).
- Löschung des Manuell-Codepfads in VisWorkspace (0.9.0-Posten,
  Owner-Entscheid).
- Manuell-Rückbau für design/publish/prepare (Owner-Auftrag war NUR
  KosmoVis).
- Echte bpy-Berechner, Daemon-/Service-Setup, HTTP-Client-Modus oder
  dev-Worker-Support im Runner.
- Rundgang-PDF/Installer-Zustellung (Sanktion 8).

## 6 · Vollständigkeits-Matrix (Abnahme Tag C)

- [ ] **C-1** Runner: 4-Schritt-Protokoll nachgewiesen (idle-gated
  Claim, running+progress, kooperativer Abbruch ohne Ergebnisdatei,
  Ergebnis je Typ + done) → P-A
- [ ] **C-2** Runner-Ehrlichkeit: vis-Fake trägt FAKE-Markierung +
  requested_style-Spiegelung; bake/bsim enden SOFORT kein-blender-worker;
  ohne --fake-worker Exit 2; kein bpy-Import (grep-Beweis) → P-A
- [ ] **C-3** main.py + test_bridge_haerte.py byte-still (git diff);
  beide Bestands-Python-Tests grün; README-Exklusivitäts-Regel steht → P-A
- [ ] **C-4** Audit-Artefakt: vollständige Spec-Liste mit grep-Belegen;
  jede migrierte Spec läuft island-only (test.use-Beweis) und 3× solo
  grün → P-B1
- [ ] **C-5** Node-Ebene-Assertions unverändert (Diff zeigt nur
  Anfahrtswege); NodeCanvas.tsx byte-still → P-B1
- [ ] **C-6** Rückbau (E3-Nachtrag 20.07.): Werkzeug 'manuell' weg,
  Einstellungs-Schalter «Manuelle Ansicht (KosmoVis)» schaltet hin UND
  zurück (E2E-Beweis), island-zurueck bleibt, KEINE Koerzierung, die
  vier Manuell-only-Features bleiben über den Schalter erreichbar → P-B2
- [ ] **C-7** Seed-Flip als eigener Commit mit Voll-Suiten-Lauf
  davor/danach; design/publish/prepare-Seeds unangetastet;
  ISLAND-UI-SPEZ-Nachtrag datiert → P-B2
- [ ] **C-8** Blatt-Umbenennen: Kernel-Weg (allowed-Map + Wurf bei
  fremden Feldern), UI-Edit, Blattverzeichnis zeigt neuen Namen,
  Goldens 0 bewegt (Probelauf-Beweis) → Z1
- [ ] **C-9** Plancode zweite Zeile: exakt 2 Goldens bewegt, übrige 37
  sha256-identisch, svg-qa 38/0, langer Plancode (19+ Zeichen) bleibt
  innerhalb des Rahmens (Test) → Z2/Fable
- [ ] **C-10** Inspector: alle E6-Felder editierbar mit Wurf-Weg über
  design.eigenschaftSetzen, Spec-Beweis je neuem Zweig → Z5
- [ ] **C-11** GOLDEN-WECHSEL-0810: Teil 1 VOR den Landungen (Commit-
  Reihenfolge), Teil 2 Ist == Prognose, vierstufige Verifikation → Fable
- [ ] **C-12** Verschlanktes Ritual komplett: Matrix, lehren/v0.8.10.md,
  Sechs-Träger-Bump, Neuigkeiten (ehrliche Grenzen), STAND/CLAUDE,
  Ergebnisblock, Release-Notiz mit 0.9.0-Kandidatenliste, release-gate
  Exit 0, Build-Request-Push — NACHWEISLICH kein PDF/keine Zustellung
  → Fable
