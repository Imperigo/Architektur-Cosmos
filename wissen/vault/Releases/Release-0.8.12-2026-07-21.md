---
titel: "Release 0.8.12"
tags: [release, "v0.8.12"]
status: "veroeffentlicht"
erstellt: "2026-07-21"
verwandt: ["[[Release-Ablauf]]"]
---
# Release 0.8.12

Automatisch erzeugt aus `ROADMAP.md` (Einträge ab **587**) von
`kosmo-orbit/tools/release-notiz.mjs` — Teil des Release-Ablaufs
[[Release-Ablauf]] (Owner-Auftrag v0.6.2: «bei jedem Update pushe alles auf
git, obsidian und die neuste Installer-Version zum Herunterladen auf der
Website»).

## Enthaltene ROADMAP-Einträge (587–596)

- **587.** W0 v0.8.12 «Zentralwerk»: Spez + Golden-Prognose (21.07.2026, Fable).
- **588.** VPN-Anleitung Home-PC: Remote-Verbindung wieder aufnehmen (21.07.2026, Fable).
- **589.** Golden-Zug 0.8.12 Teil A: die Tusche verlässt das rohe Schwarz (21.07.2026, Fable — deklarierter Wechsel).
- **590.** P-M Phasen-Matrix deklarativ: Werkzeuge folgen der Projektphase (21.07.2026, Sonnet + Fable-Gate, V0812-SPEZ §E-M).
- **591.** Golden-Zug 0.8.12 Teil C — K41: einheitlicher Rahmen am Blattrand (21.07.2026, Fable, deklarierter Wechsel).
- **592.** P-Z Projekt-Tableiste: die Zentrale bekommt das letzte Package-Stück (21.07.2026, Sonnet + Fable-Gate, V0812-SPEZ §E-Z).
- **593.** E-G Golden-Zug Teil B: Dämmschraffur folgt der Bauteilachse (21.07.2026, Fable, V0812-SPEZ §E-G / Owner-Korrektur K23).
- **594.** E-F Härtungsrunde: Repro-Disziplin + 3D-Raster-Nahbereich (21.07.2026, Sonnet + Fable-Gate, V0812-SPEZ §E-F).
- **595.** E-K5 Phase wird Projekt-Eigenschaft (21.07.2026, Sonnet + Fable-Gate, V0812-SPEZ §E-K5 / Owner-Korrektur K5).
- **596.** E-H Ein-Klick-HomeServer (21.07.2026, Sonnet + Fable-Gate, V0812-SPEZ §E-H / Owner-Order «oneklick ganze verbindung mit home pc»).

## Installer

Stabile Download-Links (immer der zuletzt gebaute Installer, drei Editionen ×
drei Plattformen): [[Release-Ablauf]] Abschnitt 4, live auf
architekturkosmos.ch/orbit — sobald die Website-Änderung selbst auf `main`
liegt (siehe [[Release-Ablauf]] Abschnitt 6, DEPLOYMENT.md).

## Volltext je Eintrag

### 587

587. **W0 v0.8.12 «Zentralwerk»: Spez + Golden-Prognose (21.07.2026, Fable).** Owner-Startschuss nach vier Richtungsentscheiden (Golden-Zug gebündelt freigegeben · KosmoSpez wartet auf R5 · Phasen-Matrix zuerst · Vis-Manuell bleibt gleichwertig): `docs/V0812-SPEZ.md` (E-Z Projekt-Tableiste, E-M Phasen-Matrix, E-G Golden-Zug Fable-exklusiv, E-K5 Phase als Projekt-Eigenschaft, E-F Härtung; 6 Sanktionen, C-1…C-10) + `docs/GOLDEN-WECHSEL-0812.md` Teil 1 (Prognose: 26/40 Goldens via Tusche inkl. deklariertem parzelle-Mitzug, Schraffur/Blattrand je Commit präzisiert, sha-Methode).

### 588

588. **VPN-Anleitung Home-PC: Remote-Verbindung wieder aufnehmen (21.07.2026, Fable).** Owner-Auftrag «schritt für schritt … über vpn wieder verbindung mit home pc»: `docs/VPN-HOMEPC-ANLEITUNG.md` — Tailscale als empfohlener Weg (8 Schritte: Install Home-PC/Zweitgerät, 100.x-Adresse, Dienste-Start Bridge/Sync/Ollama, Remote-Betriebsart in der App, ufw-Härtung nach FIREWALL-KONZEPT auf tailscale0, Prüfliste), ehrliche Klarstellungen: der Hauptchat (claude.ai) braucht kein VPN, und die Cloud-Session selbst kann nicht ins Tailnet (Funnel als bewusst abgeratene Option dokumentiert). Baut auf docs/FIREWALL-KONZEPT.md + docs/BETRIEBSARTEN.md auf.

### 589

589. **Golden-Zug 0.8.12 Teil A: die Tusche verlässt das rohe Schwarz (21.07.2026, Fable — deklarierter Wechsel).** `BLATT.tinte` und `SCHWARZPLAN_FARBEN.parzelle` (stilblatt.ts) von `'black'` auf die Gestaltungskonzept-Tusche `#1A1815`; Zusatzfund deklariert mitgezogen: das Test-Gerüst plankopf.test.ts:484 trug ein eigenes hartes black. **Ist == Prognose: exakt 26 bewegte Goldens** (GOLDEN-WECHSEL-0812 Teil 2A), Substitutions-Beweis 235+/235− paarig (reine Farb-Substitution), Sichtung durch Fable, Kernel 1180/1180, svg-qa 0, kein `black` mehr in irgendeinem Golden. Teil B (Schraffur) und C (Blattrand) folgen je als eigener dokumentierter Commit.

### 590

590. **P-M Phasen-Matrix deklarativ: Werkzeuge folgen der Projektphase (21.07.2026, Sonnet + Fable-Gate, V0812-SPEZ §E-M).** Owner-Entscheid «Matrix zuerst»: NEU `state/phasen-matrix.ts` — EIN deklaratives Register über die 19 real existierenden Werkzeug-Ids (8 Stationen + 11 ZEICHNEN-Inselwerkzeuge; die 16 Konzept-Zeilen ohne heutige Id bewusst NICHT als Attrappen eingetragen, ehrliches Scoping im Bericht), Helfer `werkzeugInPhaseSichtbar()`, Vollständigkeits-Unit-Test. Konsum: BodenDock.tsx:288ff (verdrahtet, heute No-op) + IslandShell.tsx:324ff (harte Ausblendung in der Insel-Leiste; defensiv true für fremde Inseln). Wirkung: Volumen ab Phase 4 aus, Mesh in Phase 4 aus (R7-Kern) — Phase-4-Screenshot von Fable gesichtet (9 statt 11 Werkzeuge). Kein Cluster-B-Kontakt (Filterung sitzt in der geteilten IslandShell, DesignWorkspace byte-gleich). Zwischenfund dokumentiert: im Island-Default ist die PROJEKT-Insel der einzige siaPhase-Schreibweg (Kopfbalken samt PhasenLeiste ist dort ausgeblendet) — stützt den kommenden E-K5-Umzug. Gates Hauptbaum: TC 0 · App 1742/1742 (+8) · Build 0 · E2E 30/30 (phasen-matrix 4/4 + boden-dock + island-ui unverändert) · Goldens byte-still.

### 591

591. **Golden-Zug 0.8.12 Teil C — K41: einheitlicher Rahmen am Blattrand (21.07.2026, Fable, deklarierter Wechsel).** Owner wörtlich «einheitlicher rahmen am blattrand!»: der Blatt-Default dreht vom asymmetrischen ISO-838-Heftrand (20mm links) auf den einheitlichen 10mm-Rahmen rundum — bestehender Plakat-Codepfad wird der Standard, Heftrand bleibt Opt-in (`layout.heftrand === true`). Hard-Stop-Disziplin gelebt: Erst-Prognose (3 Dateien) wich vom Ist ab → Analyse VOR Refresh, korrigierte Erwartung mit Begründungen in GOLDEN-WECHSEL-0812 Teil 2C (Ist = 2: blatt-autofuellung + rolle-leer; rolle-plankopf-Gegenprobe byte-still, blattverzeichnis rahmenlos). Sichtung durch Fable, Kernel 1180/1180, svg-qa 0. Register: K41 → erledigt.

### 592

592. **P-Z Projekt-Tableiste: die Zentrale bekommt das letzte Package-Stück (21.07.2026, Sonnet + Fable-Gate, V0812-SPEZ §E-Z).** Owner-Startsequenz-Package («Projekt-Tableiste — nur Projekte, kein AI-Slop»): die ProjektListe (App.tsx) ist jetzt eine horizontale, einzeilig scrollende Tab-Leiste — ein Tab je Tresor-Projekt, aktives mit AKTIV-Badge + Akzentlinie, Tab-Klick lädt via oeffneProjekt(), «+ Neues Projekt» als letzter Tab; Katalog-Export/-Import in ruhiger Zeile darunter (wirken aufs geladene Projekt, nicht auf einen Tab — begründeter Entscheid), Löschen als stilles ✕ je Tab (der eingefrorene module.spec-Bestätigungs-Vertrag verlangt den Knopf ohne Menü-Zwischenklick — dokumentiert). Alle projekt-*/katalog-*-Testids wörtlich erhalten; vollständige Grep-Rechenschaft inkl. Abgrenzung der Namenskollisionen (projekt-menu-* = anderes Feature) im Agentenbericht. Neue Spec `e2e/projekt-tableiste.spec.ts` (5 Beweise inkl. iPad-Describe). Agent bewies Vorbestand des cursor-ebene-Lastflakes per Stash-Gegenprobe auf Basisstand. Gates Hauptbaum: Interferenz leer · TC 0 · App 1742/1742 · Build 0 · E2E 19/19 + module.spec 71/71 unverändert · Goldens byte-still · Screenshots von Fable gesichtet.

### 593

593. **E-G Golden-Zug Teil B: Dämmschraffur folgt der Bauteilachse (21.07.2026, Fable, V0812-SPEZ §E-G / Owner-Korrektur K23).** Owner wörtlich: «diese muss immer sich an der orientierung anpassen … z.b bei beton ist es weniger wichtig». `derive/schraffur.ts`: `SchraffurSpec.folgtBauteilachse` (nur `FUNKTION.daemmung`), `schraffurLinien()` leitet den Basiswinkel aus der LÄNGSTEN Loop-Kante ab (`bauteilachseWinkelGrad()`, atan2 normiert auf [0°,180°) — exakt horizontale Schichten ergeben exakt 0 und bleiben darum byte-still, Beton/45° unverändert fix). Prognose VOR der Änderung präzisiert (GOLDEN-WECHSEL-0812: nur 3 der 39 SVGs tragen Schraffur-Polylines, 2 davon Dämm-Wellen), Ist == Prognose: exakt `schnitt-fenster-parametrisch.svg` + `schnitt-satteldach-querschnitt.svg` bewegt, alle Wellen stehen jetzt 90° in der Wand (Richtungs-Nachweis nach Refresh), PNG-Sichtung vorher/nachher durch Fable. Damit ist der EINE deklarierte Golden-Zug v0.8.12 komplett (A 26 + C 2 + B 2). Nebenher: VPN-HOMEPC-ANLEITUNG §4 auf venv-Python gehoben (Owner-Fund PEP 668; Bridge auf dem Home-PC verifiziert, /health 200). Gates: Kernel 1180/1180 · svg-qa 39/0 · Typecheck 8 Workspaces 0.

### 594

594. **E-F Härtungsrunde: Repro-Disziplin + 3D-Raster-Nahbereich (21.07.2026, Sonnet + Fable-Gate, V0812-SPEZ §E-F).** Drei Flake-Kandidaten mit Stash-Beweis-Pflicht: PD4-reduced-motion **kein Repro** (88/88 unter --workers=4 --repeat-each=8 — nicht angefasst, Sanktion-5-konform) · project-io-haerte **kein Repro** (Klarstellung: Vitest-Datei, keine e2e-Spec; unter gepinnter CPU-Last nie über 5000ms) · viewport3d-auswahl C-14a **echter Flake** (6/10 rot unter Last): Wurzelursache Playwright-Default-Poll 5000ms gegen den rAF-applyArtifacts-Tick unter SwiftShader-Mehrfachlast (gemessen 1553–8490ms) → expect.poll-Timeout 20s (Präzedenz 472), Assertion wortgleich; danach 20/20 grün, Stash-Gegenprobe zeigt 7/10 rot. Dazu K20-Restposten aus Befund 581: `bauSegmentiertesRaster()` ersetzt beide `THREE.GridHelper` in Viewport3D (Ein-Zellen-Segmente statt 200-Einheiten-GL_LINES, Optik identisch, golden-neutral) — Nahbereichs-Raster beweisbar sichtbar (Bild-Paar vorher leer/nachher Linien, von Fable gesichtet), Vermerk Hardware-Gegenprobe beim Owner-Rundgang im Code. Gates Hauptbaum: Interferenz leer · TC 0 · App 1742/1742 · Build 0 · E2E viewport3d 6/6 + PD4 11/11 auf :5183 · Goldens byte-still.

### 595

595. **E-K5 Phase wird Projekt-Eigenschaft (21.07.2026, Sonnet + Fable-Gate, V0812-SPEZ §E-K5 / Owner-Korrektur K5).** Owner wörtlich: «man stellt die projektphase … in den einstellungen dann um und transformiert das z.b wettbewerbsprojekt ins vorprojekt». Die PhasenLeiste verlässt Kopfzeile UND Zentrale-Eck (App.tsx, beide Renderorte + Import) und zieht als Sektion «Projekt-Phase (SIA 112)» in die Projekt-Einstellungen (Einstellungen.tsx, testid einstellungen-phase) — dieselbe Komponente, derselbe design.siaPhaseSetzen-Weg, kein Funktionsverlust (Sanktion 4). NEU «Transformieren»-Knopf: EIN bestätigter Schritt zur nächsten SIA-Teilphase über den bestehenden bestaetigen()-Weg, Undo-fähig. Spec-Migration mit voller Grep-Rechenschaft (phasen-leiste.spec komplett über die Einstellungen, phasen-matrix Boden-Dock-Zweig; kritik-shots-072-r2.mts als de-facto-veraltet gemeldet). Deklarierter Zusatzfund (Bauagent): KBestaetigung rendert jetzt via createPortal nach document.body (z 900) — aura.css' #root-Stacking-Context hielt den Dialog bisher unter jedem body-portalten Scrim, der Transformieren-Weg machte es erstmals sichtbar; genereller Fix für alle bestaetigen()-Aufrufer, zwei Unit-Tests aufs DOM-Render-Muster gehoben. NEU e2e/phasen-projekt.spec.ts (4 Beweise). Gates Hauptbaum: Interferenz leer · TC 0 · App 1742/1742 · UI 111/111 · Build 0 · E2E phasen-Trio+einstellungen 25/25 + module.spec 71/71 unverändert · Goldens byte-still · Sektions- und Dialog-Screenshot von Fable gesichtet.

### 596

596. **E-H Ein-Klick-HomeServer (21.07.2026, Sonnet + Fable-Gate, V0812-SPEZ §E-H / Owner-Order «oneklick ganze verbindung mit home pc»).** Neue Einstellungen-Sektion «HomeServer» (direkt unter der Projekt-Phase): EIN Knopf «Mit Home-PC verbinden» setzt Betriebsart+Bridge+Sync+Ollama in einem Zug über die BESTEHENDEN Konfig-Wege (dieselbe betriebKonfig()-Abbildung und localStorage-Schlüssel wie KosmoPanels wechsleBetriebsart — kein Parallel-Zustand) und führt echte Probes (Bridge /health mit X-Kosmo-Token, echter Sync-WebSocket-Handshake, Ollama /api/tags, je 1.5s). Drei Status-Chips zeigen NUR nach echtem Probe-Erfolg «VERBUNDEN» (Sanktion 7; Default-Host 100.88.48.73 aus kosmo.homeserver.host, Token-Feld schreibt kosmo.bridge.token); Tailscale-Hinweis + tailscale://-Link nur bei Bridge-/Sync-Fehlschlag (Ollama-Absenz ist der gewollte Ehrlichkeitsbeweis). Trennen = deterministischer Rückweg auf Standard-Betrieb; «war verbunden»-Merker treibt nur die Auto-Reprobe, nie einen Chip. NEU state/home-server.ts + 16 Unit-Tests + e2e/home-server.spec.ts (6 Beweise inkl. gemischtem Ehrlichkeitsbild und iPad-Describe). Gates Hauptbaum: Interferenz leer · TC 0 · App 1758/1758 · Build 0 · E2E home-server+einstellungen+phasen-projekt+start-sequenz 26/26 auf :5183 · Goldens byte-still · Screenshots (verbunden mit ehrlichem Misch-Bild / nicht-verbunden) von Fable gesichtet.

