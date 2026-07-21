# V0812-SPEZ «Zentralwerk» — Zentrale-Vollausbau · Phasen-Matrix · Golden-Zug

**Owner-Startschuss 21.07.2026 (~15:30Z):** «ja starte parallel mit 0.8.12».
Grundlage: Plan «Zentralwerk» (Owner-Entscheide vom 21.07.: Golden-Zug
freigegeben/gebündelt · KosmoSpez wartet auf R5 · Phasen-Matrix zuerst ·
Vis-Manuell bleibt gleichwertig). `docs/V0812-START-SPEZ.md` ist **Teil 1,
bereits gelandet** (Startsequenz 584, Zentrale-Blöcke 585, iPad 586).

## E-Punkte

### E-Z «Projekt-Tableiste der Zentrale» (P-Z, Sonnet, :5179)
Letztes Stück des Owner-Startsequenz-Packages («Projekt-Tableiste — nur
Projekte, kein AI-Slop»):
1. `App.tsx`: die lokale Komponente `ProjektListe` (Z.1485–1624) wird von
   der vertikalen Karten-Liste zur **horizontalen Projekt-Tableiste**:
   ein Tab je Tresor-Projekt (`listeProjekte()`), aktives Projekt markiert
   (`aktivesProjektId()`, bestehender «aktiv»-Badge-Gedanke), Tab-Klick =
   `oeffneProjekt()`, «+ Neues Projekt» als letzter Tab (öffnet die
   bestehende Name-Eingabe). Katalog-Export/-Import und Projekt-Löschen
   wandern in ein ruhiges Sekundär-Menü (ein ⋯-Knopf je Tab ODER eine
   Zeile unter der Leiste — Entscheid des Agenten, im Bericht begründen).
   Kein Funktionsverlust.
2. Layout-Anker `.orbit065-home-grid`/`.orbit065-home-links`
   (App.tsx:1215/1227) bleiben; nur ProjektListe-Binnenstruktur + CSS.
3. **HARTE Verträge:** testids `projekt-<id>`, `projekt-oeffnen-<id>`,
   `projekt-neu`, `projekt-neu-name`, `katalog-export`, `katalog-import`
   bleiben wörtlich und klickbar (Nutzer: `e2e/module.spec.ts`,
   `e2e/kosmo-zeichnet.spec.ts` — beide müssen UNVERÄNDERT grün bleiben).
   `state/project-vault.ts` TABU (nur bestehende Exporte).
4. NEU `e2e/projekt-tableiste.spec.ts`: Tabs erscheinen je Projekt,
   aktiv-Markierung, Wechsel lädt das Projekt beweisbar (Projektname im
   Doc), Anlegen über den +-Tab, Touch-Höhe ≥44px, iPad-Describe
   (1024×768, hasTouch — Muster 586).
- TABU: OrbitStart.tsx, StartSequenz.*, kopfWerkzeuge(), PhasenLeiste,
  project-vault.ts, kernel.

### E-M «Phasen-Matrix deklarativ» (P-M, Sonnet, :5180)
Owner-Entscheid «Matrix zuerst» (K5/K29-Konzept,
`docs/KONZEPT-PHASEN-PREPARE-DATA.md`, 27 Werkzeuge × 5 SIA-Phasen):
1. NEU `apps/…/src/state/phasen-matrix.ts`: EIN deklaratives Register
   `PHASEN_MATRIX: Record<WerkzeugId, { sichtbar: SiaPhase[] }>` — die
   Werkzeug-Ids aus `state/orbit-rang.ts` (`ALLE_TOOL_IDS`) + den
   Insel-Werkzeug-Ids; Helfer `werkzeugInPhaseSichtbar(toolId, phase)`.
   Zellen-Belegung aus dem Konzeptdokument; wo dort eine R8–R12-Frage
   markiert ist: Konzept-Default + Kommentar-Marker `// Rn-offen`.
   Unit-Test auf Vollständigkeit (jede Id genau ein Eintrag — Muster
   `stations-werkzeuge`-Test).
2. Konsum an den Werkzeug-Render-Orten: BodenDock-Knöpfe (`shell/
   BodenDock.tsx`) und ZEICHNEN-Insel-Leiste — Werkzeuge ausserhalb der
   aktiven `doc.settings.siaPhase` werden HART AUSGEBLENDET (kein Dimmen;
   die 13 R7-Fälle fallen automatisch heraus). Liegt ein Konsum-Ort in
   Cluster B (PlanView/DesignWorkspace/plan-hit-test): STOPP + Meldung,
   Fable übernimmt diesen Teil.
3. NEU `e2e/phasen-matrix.spec.ts`: Phasenwechsel (über den bestehenden
   siaPhase-Weg) ändert den sichtbaren Werkzeugbestand beweisbar; Phase 4
   zeigt Werkplan-Werkzeuge, Phase 1 nicht; Undo stellt zurück.
- TABU: App.tsx-Kopfzeile/PhasenLeiste (K5-Umzug = eigener Tag-B-Posten),
  kernel/derive, Cluster B.

### E-G «Golden-Zug» (FABLE-exklusiv, kernel — der EINE deklarierte Wechsel)
Owner-Freigabe 21.07.: K42-Tusche + K18/K23-Schraffur + K41 gebündelt.
Teil 1 (Tag A): `derive/stilblatt.ts:189` `BLATT.tinte 'black'→'#1A1815'`
(Entscheid zu `parzelle:'black'` Z.179 im GOLDEN-WECHSEL deklarieren);
K41 nach Registertext über die Heftrand-Weiche `sheet.ts:212–235` +
`blattlayout.ts`. Teil 2 (Tag B): `derive/schraffur.ts` — Dämmung
(`FUNKTION.daemmung`, fix `winkelGrad:0`) wird bauteilrichtungs-bewusst
(Welle ENTLANG der Wandachse; Beton-45° bleibt fix). Jeder Teil: Änderung →
Kernel-Suite → bewegte Goldens SICHTEN (PNG-Stichprobe) → Refresh in EINEM
Commit mit `docs/GOLDEN-WECHSEL-0812.md`-Nachweis.

### E-K5 «Phase wird Projekt-Eigenschaft» (Tag B, Sonnet, nach E-M-Gate)
PhasenLeiste raus aus Kopf/`app-heim-werkzeuge` (App.tsx:1194ff) → Phase in
den Projekt-Einstellungen (shell/Einstellungen.tsx) + «Transformieren»-
Dialog (Wettbewerb→Vorprojekt, `bestaetigen()`-Weg, bestehender
siaPhase-Command). Bestands-Specs mit `phasen-leiste-*` migrieren
(Grep-Rechenschaft). NEU `e2e/phasen-projekt.spec.ts`.

### E-H «Ein-Klick-HomeServer» (Tag B, Sonnet, NACH E-K5-Gate — Owner-Order 21.07. ~20:45Z)
Owner wörtlich: «ziel ist es das ich synchro auf ipad per oneklick
aktivieren kann, dieser automatisch … onecklick ganze verbindung mit home
pc aktiv macht». Ehrliche Grenze (in der UI offen benennen): das
Tailscale-VPN selbst kann eine Web-App auf iOS nicht einschalten — der
Knopf verlinkt in dem Fall auf die Tailscale-App (`tailscale://`).
1. NEU `state/home-server.ts`: Preset aus EINER Quelle
   (`kosmo.homeserver.host`, Default `100.88.48.73`) → Bridge
   `http://<host>:8600`, Sync `ws://<host>:8700`, Ollama
   `http://<host>:11434`. `verbindeHomeServer()`: setzt die BESTEHENDE
   Betriebsart-/Remote-Konfiguration (grep betriebsart/remoteHost —
   bestehende Wege nutzen, keinen Parallel-Zustand erfinden) in EINEM
   Zug auf alle drei Endpunkte und führt echte Probes aus: Bridge
   `/health` (mit `X-Kosmo-Token` aus `kosmo.bridge.token`),
   Sync-WebSocket-Handshake, Ollama `/api/tags`; Timeout je 1.5s;
   Rückgabe je Kanal `verbunden|nicht-verbunden`. `trenneHomeServer()`
   stellt die lokale Betriebsart wieder her.
2. UI in `shell/Einstellungen.tsx` (darum NACH E-K5, gleiche Datei):
   Abschnitt «HomeServer» — EIN grosser Knopf «Mit Home-PC verbinden»
   (testid `homeserver-verbinden`, Touch ≥44px), drei ehrliche
   Status-Chips BRIDGE/SYNC/KOSMO-LLM (testid `homeserver-status-*`),
   Host- und Token-Feld (Quellen oben), bei gescheiterten Probes
   Hinweiszeile «Tailscale-VPN auf diesem Gerät einschalten» + Link
   `tailscale://` (öffnet die App auf dem iPad). Beim App-Start: war
   zuletzt verbunden, Probes automatisch wiederholen (die
   Startsequenz-BRIDGE-Zeile aus 584 zeigt das Ergebnis mit).
3. NEU `e2e/home-server.spec.ts`: Ein Klick setzt beweisbar alle drei
   Endpunkte; gegen die laufende Fake-Bridge :8600 wird BRIDGE
   «VERBUNDEN», Ollama ohne Server ehrlich «NICHT VERBUNDEN» (gemischtes
   Bild = Ehrlichkeitsbeweis); Trennen stellt lokal wieder her; Neuladen
   behält den Zustand; iPad-Describe (1024×768, hasTouch, Muster 586).
- TABU: kernel/derive, Cluster B, project-vault.ts, OrbitStart.tsx,
  StartSequenz-Verhalten (nur lesen).

### E-F «Härtungsrunde» (Tag B, Sonnet, klein)
PD4-reduced-motion-Lastflake · project-io-haerte-Timeout ·
viewport3d-auswahl C-14a — je frischer Repro VOR Fix (Stash-Beweis).
Dazu Raster-Fix aus `docs/BEFUND-RASTER-NAHBEREICH.md`:
`bauSegmentiertesRaster()` statt `GridHelper` in Viewport3D
(golden-neutral) + Vermerk «Hardware-Gegenprobe beim Owner-Rundgang».

## Sanktionen
1. Golden-Bewegung ausserhalb der in GOLDEN-WECHSEL-0812 deklarierten
   Zug-Teile = Paket ungültig.
2. P-Z bricht einen `projekt-*`/`katalog-*`-Vertrag oder fasst
   `project-vault.ts` an = ungültig.
3. P-M fasst Cluster B oder derive an = Scope-Bruch (Fable übernimmt).
4. E-K5 entfernt die Phasen-Funktion statt sie umzuziehen = ungültig.
5. Flake-Fix ohne dokumentierten Vorbestands-Repro = ungültig.
6. Tusche-/Schraffur-Commit ohne von Fable gesichtete Golden-Stichprobe
   = ungültig.
7. E-H zeigt einen Kanal «VERBUNDEN» ohne echten Probe-Erfolg = ungültig
   (Ehrlichkeits-Grundsatz; gilt auch für den Tailscale-Hinweis).

## Vollständigkeits-Matrix
C-1 Projekt-Tableiste mit allen Alt-Funktionen + iPad → P-Z ·
C-2 module.spec/kosmo-zeichnet unverändert grün → P-Z ·
C-3 PHASEN_MATRIX vollständig (Unit-Test) + harte Ausblendung beweisbar →
P-M · C-4 Tusche #1A1815 mit Teil-2-Nachweis → E-G ·
C-5 Schraffur-Orientierung mit Teil-2-Nachweis → E-G ·
C-6 K41 gemäss Registertext → E-G · C-7 Phase in Projekt-Einstellungen +
Transformieren, Kopf ohne PhasenLeiste → E-K5 · C-8 Härtungsrunde mit
Repro-Belegen → E-F · C-9 GOLDEN-WECHSEL Teil 1 vor Landungen, Teil 2
Ist==Prognose → Fable · C-11 Ein-Klick-HomeServer mit ehrlichen
Kanal-Stati + gemischtem Ehrlichkeitsbeweis im E2E → E-H ·
C-10 verschlanktes Release-Ritual komplett
(lehren, Sechs-Träger-Bump, release-gate 0, Build-Request; kein PDF,
keine Installer-Zustellung unaufgefordert) → Fable.

## Nicht-Ziele (mit Begründung)
KosmoSpez-Station/UI (Owner 21.07.: warten auf R5; K37c-Token liegen
bereit) · K15-Manuell-Ausbau (Owner: eigener Posten → 0.9.0) · K25 Pencil
(iPad-Hardware-Beweis erst am Gerät) · K27 Zoom-Text (Cluster B, L —
0.9.0-Kandidat) · Serie H/I/J · Feder-Revision (nur falls Owner sie
zurückverlangt).
