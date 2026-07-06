# V2-Auftakt — Übergabe an den neuen Worker (HomeStation Linux)

> **⚑ Aktueller Auftrag (04.07.2026): siehe `docs/AUFTRAG-FABLE-2026-07-06.md`.**
> Fable 5 übernimmt ab 06.07. die Codex-Aufgabe: KosmoReference + KosmoAsset
> fertig bauen (wie KosmoData) **plus** die Website www.architekturkosmos.ch,
> in zwei Tagen. Opus hat nur notiert — Fable legt den Plan aus.

Diese Datei ist die Brücke von V1 (fertig, 04.07.2026) zu V2. Sie enthält den
fertigen **Erst-Prompt** für den neuen Worker, die **Prioritätenliste** und die
**Nahtstellen**, an denen V2 andockt. Alles kam per git (Repo) und Obsidian
(`wissen/vault/`) an — nichts liegt nur im Kopf.

---

## Teil 1 — Der Erst-Prompt (so an den neuen Worker geben)

> Du übernimmst KosmoOrbit, die Architektur-Designzentrale des Baubüros Andrin,
> für die V2-Entwicklung auf der HomeStation (Linux, RTX 5090). V1 ist fertig
> und grün. **Lies zuerst `kosmo-orbit/CLAUDE.md`** (Setup, Architektur,
> Eigenheiten), **dann `kosmo-orbit/ROADMAP.md` von unten** (die jüngsten 40
> Einträge sind der V1-Finish), **dann diese Datei ab Teil 2**.
>
> Arbeitsweise wie dein Vorgänger: je Block Feature → Tests (+E2E) →
> ROADMAP-Eintrag → deutscher Commit mit Trailern → Push auf einen
> Feature-Branch. Volle Suiten je Batch. **Ehrlichkeit vor Politur**: was ein
> Konto/Schlüssel/die GPU braucht, wird im UI offen benannt. Golden-Tests
> byte-stabil halten. exactOptionalPropertyTypes ist an.
>
> Deine ersten drei Handgriffe: (1) `npm install && npm run build && npm test`
> muss grün sein. (2) Die echte HomeStation-Kette scharf schalten — den
> Fake-Worker in `tools/homestation-bridge` durch ComfyUI/Cycles ersetzen
> (Schnittstelle `packages/kosmo-contracts` render-scene/v1 bleibt). (3) Danach
> nach Prioritätenliste (Teil 2) arbeiten. Frag den Owner, wenn eine Entscheidung
> architektonisch bedeutsam ist.

---

## Teil 2 — Prioritätenliste V2

Reihenfolge = Nutzen × Owner-Wunsch. Aufwand grob (S/M/L).

1. **HomeStation-Kette scharf (L)** — Fake-Worker → echt: ComfyUI-KI-Renders und
   Cycles über render-scene/v1; Whisper (de-CH) an `/stt`, echte Stimme an `/tts`;
   Embeddings (bge-m3) für KosmoPrepare statt Trigramm-Fallback. Nahtstelle:
   `tools/homestation-bridge/kosmo_bridge/main.py` (`_fake_worker_loop` ersetzen).
2. **Blender als Worker (M)** — headless Cycles-Render + Wind-/Sonnen-/
   Gebäudesimulation als Job-Typen. **Kein Fork** (Begründung TECH-RADAR
   04.07.). GLB-Export trägt schon lesbare Namen + Material-Slots in Metern.
3. **Selbst-entwickelnd: Auftragsbuch → Ausführung (M)** — KosmoDev sammelt heute
   Aufträge und exportiert die Fable-Workorder (`state/auftragsbuch.ts`). V2
   schliesst den Kreis: der Worker liest `docs/auftraege/*.md` und arbeitet sie
   ab (der Owner spricht die Verbesserung, zeigt wo, KosmoDev/ein Fable-Worker
   setzt sie um).
4. **FreeMesh-Modellieren Stufe 3 (L, Owner-Q9)** — freies Mesh im Viewport;
   bis dahin ist Blender die externe Werkbank (GLB-Roundtrip via KosmoAsset).
5. **Signierte Builds + Auto-Update (S/M)** — mit Apple-Konto und Tauri-Updater-
   Schlüsseln; heute «Update = neuer Installer» (INSTALL.md).
6. **LoRA-Training aus dem Lernjournal (M)** — KosmoTrain exportiert JSONL; die
   HomeStation trainiert die Büro-LoRA. «Das System lernt DICH.»
7. **Journal in SQLite (S)** — heute localStorage + IndexedDB-Spiegel; auf Tauri
   nativ SQLite (Kommentar in `state/journal-store.ts`).
8. **Wand↔Decke-Verschneidung im Schnitt** ✅ erledigt (ROADMAP 150).
9. **Serie H — Vollständige Benutzersimulation (L, Owner 06.07.)** — Testprogramm,
   das je SIA-Phase ein ganzes Projekt über viele Haustypen durchspielt, jedes Tool
   von Anfang bis Ende, lokale KI/AI-Imaging mitsimuliert. Konzept + Saat:
   `docs/SERIE-H-VOLLSIMULATION.md` (grüne Saat `e2e/sim-umbau/-mfh.spec.ts`,
   Befunde in `docs/V1-TESTLAUF-BEFUNDE.md`).
10. **Serie I — Cybersecurity / Anti-Copy / Firewall (L, Owner 06.07., ultracode)** —
    Bedrohungsmodell → Härtung → Lizenz/Anti-Copy → Firewall/Netz → Betrieb/Notfall.
    Ehrlich «so hart wie sinnvoll», rein defensiv. Konzept: `docs/SERIE-I-SICHERHEIT.md`.
11. **Serie E/F/G (geparkt)** — Erlebnis/Animationen (E), Rollenprofile/Abteilungen
    (F, `docs/SERIE-F-ROLLENPROFILE-ABTEILUNGEN.md`), Kosmo als Benutzer-Guide
    (G, `docs/SERIE-G-KOSMO-ALS-BENUTZERGUIDE.md`).
12. **A4 — 3D-Skizze auf jede Fläche (M/L, Owner-Entscheid «Beides/Raycast»)** ✅
    erledigt, mit ehrlich benannter Restgrenze (ROADMAP 155): Raycast trifft jede
    Szene-Fläche; eine Wandfläche ergibt eine Öffnung (`design.oeffnungSetzen`,
    Fenster/Tür nach Brüstungshöhe), alles andere (Boden/Decke/Volumen/Dach/
    Treppe) weiterhin einen Wand-Zug, jetzt auf die echte Fläche projiziert statt
    nur die flache Ebene. **Offen bleibt**: ein echtes Terrain-Mesh (schräge
    Geländefläche) existiert im 3D-Viewport nicht — `Terrain`-Entities fliessen
    bisher nur in Schnitt/Plan, nicht in `derive/scene.ts`; «Boden/Terrain»
    bedeutet im Raycast-Weg daher «alles ausser Wand», nicht buchstäblich Hang-
    Geometrie. Ein Terrain-Mesh im Viewport (eigener, kleinerer Folgeauftrag)
    würde denselben Weg automatisch mitbedienen.
13. **Serie J — Intuitive Bedienung & adaptive Oberfläche (L, Owner 06.07.)** —
    intuitive **Touch-/Gestensteuerung im 3D** (iPad/Screen: 1-Finger Orbit,
    2-Finger Pan+Pinch+Rotate, Trägheit), intuitiver **Maus-Umgang im 3D**
    (mittlere Taste Orbit/Pan, Rad = Zoom-zum-Cursor, Kontextcursor/Hover), und
    eine **dynamisch adaptive Zeichnungsoberfläche**, die sich nach Tätigkeit und
    Nutzer neu ordnet (baut auf T7-Fokus-Konzept `state/fokus.ts` + T3-Nav auf).
    Fable legt zuerst das Interaktions-Konzept, dann Sonnet-Batches J1/J2/J3.
    Konzept: `docs/SERIE-J-INTUITIVE-BEDIENUNG.md`.

> Reihenfolge-Hinweis Owner (06.07.): ab 6 Uhr mit Fable **erst Serie H + Serie I
> als Konzept** (liegen vor), dann bauen. **Serie J** reiht sich als nächster
> grosser UX-Block ein (nach den technischen V2-Blöcken 1–7); wegen der Tiefe in
> jede Oberfläche zuerst Fable-Interaktionskonzept, dann Bau.

## Teil 3 — Nahtstellen, an denen V2 andockt (bereits vorbereitet in V1)

| V2-Thema | V1-Nahtstelle |
| --- | --- |
| Echte Renders | `packages/kosmo-contracts/src/render-scene.ts` (v1, unverändert) |
| Node-Graph → Job | `apps/kosmo-orbit/src/modules/vis/vis-jobs.ts` |
| Blender/Cycles | `tools/homestation-bridge` `_fake_worker_loop`; GLB `derive/gltf.ts` |
| Verbesserungs-Pipeline | `state/auftragsbuch.ts` → `docs/auftraege/YYYY-MM-DD.md` |
| Sprache (Whisper) | `shell/KosmoPanel.tsx` `toggleMic` (Bridge-Weg + Browser-Fallback) |
| Trainingsdaten | KosmoTrain JSONL-Export; `packages/kosmo-ai/src/memory.ts` |
| OneDrive-Ablage | `wissen/tools/onedrive.py push` (Files.ReadWrite.All-Token nötig) |

## Teil 4 — Wie die Infos zum neuen Worker kommen

- **git**: das ganze Repo (Code, ROADMAP, docs/, abgabe/) — der primäre Kanal.
- **Obsidian** (`wissen/vault/`): das Bau-Fachwissen + die Landing-Notiz
  `KosmoOrbit.md`, die Vault und Software verknüpft. Der Vault ist zugleich
  Kosmos Trainingskorpus.
- **Abgabeordner** (`kosmo-orbit/abgabe/`): Handbuch-PDF, INSTALL, Übergaben,
  Galerie, CI-Artefakt-Links — die menschenlesbare Zusammenfassung.
