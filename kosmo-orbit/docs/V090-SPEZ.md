# V090-SPEZ «Heimkraft» — HomeStation scharf · Massketten · Manuell-Konzept · Zoom-Text

**Owner-Entscheide 22.07.2026 (~05:50Z, AskUserQuestion):** 0.9.0 gross ·
Hauptstrang HomeStation JA · Renders zuerst · Zweitstränge K18 + K15 +
K27 + KosmoSpez-falls-R5. Grundlage: `docs/V090-VORPLAN.md`,
`docs/HOMESTATION-AUFTRAG.md` (Kopfblock = Betriebs-Novum),
`tools/homestation-bridge/README.md` §«Worker andocken» (normatives
Protokoll). Zeitrahmen: 2–3 Arbeitstage (Tag A/B/C).

## Arbeitsteilung (fortgeltend, ehrliche Grenze)
Cloud-Worker baut Repo-Seite (Code, Tests, Runbooks) — er erreicht das
Tailnet NICHT. Maschinenseite (ComfyUI/Ollama/Modelle installieren,
systemd, GPU) macht der lokale Home-PC-Worker nach Runbook; der Owner
verifiziert im Hardware-Rundgang (E-V). Ein Hardware-Beweis ist NIE durch
einen Container-Beweis ersetzbar — im Zweifel steht «wartet auf
Owner-Rundgang» ehrlich im Ergebnisblock.

## E-Punkte

### E-R «Echter Render-Worker» (Tag A, Sonnet, Dateikreis tools/ — Renders zuerst, Owner-Wahl)
1. NEU `tools/homestation-bridge/kosmo_worker_comfyui.py`: echter Worker
   nach dem normativen Protokoll (README wörtlich): queued nur bei
   GPU-Idle-Fenster holen → running + worker + progress.pct live →
   VOR Ergebnis-Schreiben Record frisch lesen (cancelled = kooperativer
   Abbruch ohne Result) → `render-result.json` (Vertrag
   `kosmovis.render-result/v2`, Doppel-QA) → done + pct 1.0. Adapter an
   die ComfyUI-HTTP-API (Prompt-Graph aus `derive/renderprompt.ts`-Feldern
   des Jobs); fehlende Fähigkeit = ehrlicher `kein-render-worker`-Status,
   NIE done vortäuschen (README-Ehrlichkeitsregel).
2. Testbarkeit OHNE GPU im Container: (a) Protokoll-Konformitätstests
   gegen einen echten `--store`-Ordner (Job-Lebenszyklus, Abbruch,
   Ehrlichkeitsstatus) mit gemocktem ComfyUI-HTTP-Endpunkt; (b) der
   bestehende Fake-Worker bleibt unverändert Referenz und Default im
   Container.
3. NEU `docs/HOMEPC-RENDER-WORKER.md`: Runbook für den lokalen Worker
   (ComfyUI-Installation, Modellwahl mit Owner, systemd
   `kosmo-render-worker` mit Idle-Fenster, Prüfreihe) — Muster
   HOMEPC-WORKER-PROMPT.
- TABU: kernel, apps (kein Client-Umbau nötig — Client/QA sind fertig),
  bestehender Fake-Worker-Codepfad (nur lesen).

### E-L «Kosmo-LLM: Ollama als Remote-Default» (Tag B, Sonnet)
1. Betriebsart Remote wählt als Default den Ollama-Provider
   (bestehende Provider-Infra `packages/kosmo-ai`; `betriebKonfig()`
   ist die EINE Quelle — kein Parallel-Zustand, Muster E-H/596).
2. HomeServer-Sektion (596) zeigt beim LLM-Chip zusätzlich ehrlich das
   erreichbare Modell (`/api/tags`-Ergebnis, z. B. «llama3.2») — kein
   Modell = ehrlich «NICHT VERBUNDEN» wie bisher.
3. Latenz-/Qualitäts-Messlauf über den bestehenden Eval-Bestand als
   Runbook-Schritt des lokalen Workers (Zahlen in den Rundgang-Bericht).
- TABU: Cluster B, kernel, StartSequenz-Verhalten.

### E-K18 «Massketten-Defaults» (FABLE-exklusiv, kernel — der EINE deklarierte Golden-Zug 0.9.0)
Registertext wörtlich: «default mässig verlängerungslinien … gesunden
abstand zur verlinkten kante». Umsetzung in `derive/` (Masskette-Zweig,
Fundort per grep masskette in derive/plansvg.ts + Nachbarn), Prognose
VOR der Änderung in NEU `docs/GOLDEN-WECHSEL-090.md` (Methode wörtlich
wie 0812 inkl. sha-Rezept und Überschneidungs-Ausweis; Kandidaten:
masskette-tragende Goldens per grep erheben). Ablauf: Prognose → Änderung
→ Kernel-Suite → Ist==Prognose (Hard-Stop-Regel) → PNG-Sichtung
vorher/nachher → Refresh in EINEM Commit.

### E-K15 «Manuelle Ansicht = EIN Konzept für alle Stationen» (Tag A Schritt 1 + Tag B Schritt 2, Sonnet)
Owner wörtlich: «die manuelle ansicht gilt für alle tools … klassische
cad oberfläche … island ui ist die intelligente standard oberfläche».
1. Schritt 1 (Tag A): verbindliche Bestandsaufnahme als Dokument
   `docs/KONZEPT-MANUELL-ALLE-STATIONEN.md` — wo existiert heute ein
   Manuell-/Werkzeugleisten-Modus (Vis explizit; Design/Publish/Prepare
   implizit), welcher Schalter/Persistenz-Mechanismus wird der EINE
   (Vis-Muster `kosmo.vis.*`? Grep-Beleg), was fehlt je Station.
   **Schritt-1-Ergebnis (22.07.): Hypothese widerlegt — der EINE
   Persistenz-Mechanismus existiert schon (`kosmo.ui.v1`,
   state/ui-zustand.ts, vier `*Oberflaeche`-Felder); Tag B
   vereinheitlicht nur den ZUGANG (additive Einstellungen-Checkboxen
   nach Vis-Vorbild), Fable-Entscheide im Konzeptdokument.**
2. Schritt 2 (Tag B): Vereinheitlichung GEMÄSS Schritt-1-Dokument:
   EIN Schalter-Mechanismus + Persistenz je Station, Island bleibt
   Standard, KEIN Verhaltens-/Testid-Bruch bestehender Specs
   (Island-Verträge, vis-Manuell-Specs). NEU e2e-Spec: Manuell-Schalter
   je Station beweisbar, Island-Rückweg, Reload-Persistenz.
- TABU: kernel, Cluster B (liegt ein Schalter-Ort dort: STOPP, Fable).

### E-K27a «Zoom-Text: Anzeige-Ebene» (Tag B, FABLE-exklusiv — Cluster B)
Registertext hat ZWEI Ebenen; 0.9.0 baut die ANZEIGE-Ebene (PlanView):
Text im Plan zoom-abhängig so skaliert, dass er auf dem Bildschirm im
Band 1.8–5 mm Papier-Äquivalent leserlich bleibt; bei Überlagerung
intelligente Verdichtung (Zusammenfassen/Symbol, Aufklappen bei Fokus —
konkrete Mechanik entscheidet Fable am Bestand). **Die derive-/
Druckmass-Ebene ist deklariertes NICHT-Ziel** (eigener Golden-Zug einer
Folgeversion — Regel «genau EIN Zug pro Version», der gehört K18).
Goldens müssen byte-still bleiben (reine Anzeige!).

### E-S «Sync-Server ohne tsx» (Tag B, Sonnet, klein — Server-Bericht 22.07.)
Befund des lokalen Workers: `tools/sync-server` importiert das TS-only-
Paket `@kosmo/lizenz`; Ubuntu-Node 22.22 kann kein Type-Stripping
(ERR_NO_TYPESCRIPT) — der Server läuft dort nur über global installiertes
tsx (Abweichung von §9, `docs/HOMESERVER-STATUS.md`). Repo-Fix: der
Sync-Server wird mit purem `node` lauffähig — bevorzugt via JS-Build
(dist) für `@kosmo/lizenz` (oder des Sync-Einstiegs), Weg am Bestand
entscheiden (bestehende Build-Muster der packages nutzen, kein neues
Build-System). Beweis: `node tools/sync-server/src/server.mjs` (bzw. der
neue Einstieg) startet in einer Node-only-Umgebung ohne tsx; Runbook §9
und HOMESERVER-STATUS nachführen; systemd-Unit-Vorlage zurück auf node.
- TABU: Sync-Protokoll/Verhalten (nur Lauffähigkeit), kernel, apps.

### E-KS «KosmoSpez» (BEDINGT — nur falls R5 eintrifft)
Nur wenn der Owner den ETH-OneDrive-Zugang (R5) während des Fensters
liefert: eigener Spez-Nachtrag auf Basis der K37c-Token
(`docs/owner-packages/2026-07-21-kosmospez-k37c/`). Trifft R5 nicht ein:
Punkt entfällt ersatzlos für 0.9.0 (kein Sanktionsfall).

### E-V «Hardware-Verifikations-Rundgang» (Tag C, Owner + lokaler Worker)
Fester Abnahme-Punkt (neu im Ritual seit HomeStation-Entscheid):
Raster-Fix 594 auf echter GPU · Ein-Klick-HomeServer am Mac/iPad gegen
den systemd-Server (BRIDGE — VERBUNDEN) · ERSTES ECHTES RENDER auf dem
iPad sichtbar (E-R-Beweis) · Ollama-Antwortzeit (E-L-Beweis). Ergebnisse
kommen als Owner-/Worker-Bericht in den Chat und in den Ergebnisblock.

## Sanktionen
1. Golden-Bewegung ausserhalb des deklarierten K18-Zugs = Paket ungültig
   (gilt ausdrücklich auch für E-K27a — Anzeige-Ebene ist golden-still).
2. E-R täuscht ein Render-Ergebnis vor (done ohne echtes Artefakt, Result
   ohne Worker-Fähigkeit) = ungültig (README-Ehrlichkeitsregel).
3. E-L erfindet einen Parallel-Konfig-Zustand statt betriebKonfig() =
   ungültig.
4. E-K15 bricht einen bestehenden Island-/Manuell-Spec-Vertrag = ungültig.
5. Hardware-Behauptung ohne Rundgang-Beleg («läuft auf der GPU» aus dem
   Container heraus) = ungültig — ehrlich «wartet auf E-V» schreiben.
6. Flake-/Testfixes weiterhin nur mit Vorbestands-Repro (Stash-Beweis).

## Vollständigkeits-Matrix
C-1 Worker protokollkonform inkl. Abbruch + Ehrlichkeitsstatus (Tests) →
E-R · C-2 Runbook vollständig (Installation→systemd→Prüfreihe) → E-R ·
C-3 Ollama-Default über die EINE Quelle + Modell-Anzeige ehrlich → E-L ·
C-4 K18 mit GOLDEN-WECHSEL-090 Ist==Prognose + Sichtung → E-K18 ·
C-5 Konzeptdokument mit Grep-Belegen je Station → E-K15/1 ·
C-6 EIN Schalter-Mechanismus, bestehende Specs unverändert grün →
E-K15/2 · C-7 Zoom-Text-Band 1.8–5mm beweisbar (E2E misst Schriftgrösse
bei zwei Zoomstufen) + Verdichtung beweisbar + Goldens byte-still →
E-K27a · C-8 Rundgang-Protokoll mit vier Hardware-Beweisen → E-V ·
C-9 verschlanktes Release inkl. Doppel-Zustellung §7 (Mac+iPad synchron,
Lockfile als siebter Bump-Träger!) → Fable.

## Nicht-Ziele (mit Begründung)
K27-Druckmass/derive (eigener Golden-Zug, Folgeversion) · bpy-Skript im
Repo (ROADMAP 179, Owner-bestätigt — Blender-Worker bleibt Drehbuch) ·
K21/K24-Werkzeugtiefe-Vollausbau (XL, braucht R8–R12) · Gaussian-
Splatting-Rendering (GPU-Forschungsposten) · HDD-Voll-Index (eigener
Bridge-Endpunkt, Folgeversion) · Serie H/I/J.


## Ergebnisblock (Release 22.07.2026, ROADMAP 613)

- E-R ✓ (601, Worker+Runbook; Matrix-C-1-Fund `kein-render-worker`-Vertrag
  in 610 gefixt, Live-Poll-Abbruch-Test nachgerüstet) · E-K18 ✓ (602,
  GW-090 Ist==Prognose exakt masskette-plan.svg) · E-S ✓ (603) ·
  E-K15 ✓ (599+604) · E-L ✓ (605) · E-K27a ✓ (607, zoom-text.spec 3/3) ·
  Nachträge: 606 CSP-Freigabe (Owner-Live-Befund), 608 Cursor-Owner-Punkte,
  609 Fehlermeldeweg, 611 KosmoTrain-Fundament, 612 E2E-Härtung.
- Matrix: C-1/C-2/C-5-Funde gefixt (610+f00499d), C-3/C-4/C-6/C-7 bestanden.
  **C-8 EHRLICH OFFEN** (Hardware-Rundgang E-V braucht Owner+Geräte; Reste:
  4 Beweise + OLLAMA_ORIGINS + sync-Unit tsx→node + Fehlermeldeweg-Env —
  Worker-Punkte 23.07.). C-9 = dieses Release.
- E-KS: entfallen wie deklariert (R5/ETH-Material erst via KosmoTrain-Worker
  unterwegs). §0b: eingang.jsonl existiert noch nicht (Scharfschaltung 23.07.).
- Suiten beim Release: Kernel 1180 · App 1771 · KI 330 · Contracts 54 ·
  Data 44 · Lizenz 8 · UI 111 = 3498; Voll-E2E 848 grün + 5 aufgelöst
  (2 Umgebung/Sync-Lizenz-Build, 2 Lastflakes isoliert grün, 1 Test-Härtung
  612); svg-qa 39/0; Goldens 40 Dateien byte-still ausser dem EINEN Zug.
