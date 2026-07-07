# HomeStation-Auftrag — was NUR am Home-PC geht (Stand 04.07.2026)

> Diese Datei war in `wissen/README.md` versprochen und fehlte — hier ist sie.
> Sie konsolidiert ALLES, was HomeStation- (RTX 5090, 4-TB-SSD, Büro-Netz)
> oder Owner-gebunden ist, mit den **Übergabepunkten**: welcher Code im Repo
> wartet bereits, sodass am Home-PC nur noch «eingesteckt» wird. Alles andere
> ist gebaut — siehe ROADMAP 88–105 («Vision 100 % Container»).

## 1. GPU-gebunden (RTX 5090 / ComfyUI / lokale Modelle)

| Auftrag | Übergabepunkt im Repo |
|---|---|
| **Echte Renders** (ComfyUI-Worker) | Bridge nimmt Jobs an: `tools/homestation-bridge/kosmo_bridge/main.py` (`/jobs`, Artefakt-Store). Der `--fake-worker` (`_fake_worker_loop`) zeigt exakt die Nahtstelle: gleiche Job-Schleife, statt Platzhalter-PNG ComfyUI aufrufen. Client/QA-Verdikt/Serien sind fertig (KosmoVis), Render-Prompt kommt transparent aus `derive/renderprompt.ts`. |
| **Render-Slots im Plakat mit echten Bildern** | KosmoPublish-Bildslots (`publish.bild*`) sind gebaut — sie warten nur auf echte Renders. |
| **Gaussian-Splatting im Viewport** (V2-C3) | Splat-Import (`design/splat-import.ts`) zeigt heute die Punktwolke; echtes GS-Rendering braucht GPU. |
| **Foto-Texturmaps** (V2-C2) | Parametrische PBR-Kacheln stehen (`design/texturen.ts`, Materialkatalog in `@kosmo/data`) — Foto-Maps ersetzen nur die Prozeduren. |
| **Whisper/Piper scharf** (KosmoSpeak) | Bridge-Endpoints `/stt` (faster-whisper) und `/tts` sind real implementiert; Ablauf + UI (Push-to-Talk im Kosmo-Panel) fertig. Am Home-PC: Modelle laden, Qualität hören, Wortliste CH-Deutsch nachziehen. |
| **Embedding-RAG bge-m3** (KosmoPrepare) | `/embed` ist real in der Bridge, der Client-Pfad (`prepare/knowledge.ts: embedTexts`) und der Contract (`EmbedRequest/Response` in `@kosmo/contracts`) stehen; ohne Bridge trägt BM25. Am Home-PC: bge-m3 in die Bridge, fertig. |
| **HDD-Voll-Index** (KosmoData-Archiv, V2-D5) | Bridge-Endpunkt `/archiv` (Ordner scannen, Grössen/Dateilisten, später Einbetten via bge-m3) — heute nur Manifest im Client (`state/archiv.ts`, IndexedDB `kosmo-archiv`); das echte Scannen/Indexieren der HDD läuft auf der HomeStation. Die Bridge hat heute keinen HDD-Endpunkt, nur `/health`, `/jobs`, `/stt`, `/tts`, `/embed`. |

## 2. Training / Wissen (KOSMOTRAIN.md §5)

| Auftrag | Übergabepunkt |
|---|---|
| **Erster LoRA-Lauf** (Unsloth → GGUF → Ollama) | Rezept + Datensatz-Export fertig: KosmoTrain-Panel exportiert JSONL, `docs/KOSMOTRAIN.md` beschreibt den Lauf Schritt für Schritt. Gemeinsam mit dem Owner fahren. |
| **DPO-Präferenzpaare** | Daumen-runter-Journal sammelt bereits (`@kosmo/ai memory`); Paar-Bildung + Training = V2-Ausbau am Home-PC. |
| **7 Gross-Atlanten (~3.8 GB) ingesten** | `wissen/tools/ingest.py <ordner> <sammlung>` ist resumierbar (OCR als Subprozess); OneDrive-Pull der Über-250-MB-Scans braucht das Büro-Netz. |
| **GoodNotes-Handschrift (~60 PDFs)** | tesseract scheitert an Handschrift — Vision-OCR (Qwen-VL lokal) am Home-PC; danach normaler `ingest.py`-Weg in `wissen/vault`. |
| **Handschrift-ZFs der 567 Vorlesungsquellen** | dito Vision-OCR; die Vorlesungs-Sammlung selbst ist bereits in der Webbasis. |

## 2b. Blender als Worker (Entscheid V1-Finish, 04.07.2026)

- **Blender headless an der Bridge-Nahtstelle** (`_fake_worker_loop` ersetzen):
  Cycles-Render des GLB (der Export trägt lesbare Objektnamen + deutsche
  Material-Slots in Metern), danach Wind-/Sonnen-/Gebäudesimulationen als
  eigene Job-Typen. Kein Fork — Blender bleibt Werkbank + Worker
  (Begründung: TECH-RADAR Nachtrag 04.07.).
- Modellier-Roundtrip: GLB aus KosmoOrbit → Blender bearbeiten → GLB in die
  KosmoAsset-Bibliothek («Ins Modell» als Referenz-Kontext). FreeMesh nativ
  bleibt V2 (Owner-Q9 Stufe 3).

## 3. Netz-/Konto-gebunden (Owner)

| Auftrag | Übergabepunkt |
|---|---|
| **OneDrive-Datenabruf** (KosmoPrepare) | Device-Code-Login funktioniert (`wissen/tools/onedrive.py`, `KOSMO_GRAPH_TOKEN_DATEI`); der eigentliche Abruf wartet auf die Netzfreigabe des Tenants. |
| **Tauri-Auto-Update** (V2-D1) | Desktop-Build steht; Updater braucht Signatur-Keys des Owners. |
| **iOS aufs Gerät** (V2-D3) | Simulator-Build läuft in CI; TestFlight/Signierung braucht Apple-Konto + Mac. |
| **KosmoData-Schreibpfad** | Lesen ist live (E2, read-only + Cache); Schreiben Richtung architekturkosmos.ch braucht einen Auth-Entscheid. |

## 4. Bewusst vertagt (Owner-Entscheid, nicht Technik)

- **KosmoAR** (V2-E1): braucht Gerät + Anlass.
- **OS-Übernahme / «Kosmo empfängt am Morgen»** (V2-E2, Q31): sicherheitskritisch, erst nach gelebtem Ein-Büro-Betrieb.
- **Mehr-Büro-Betrieb** (V2-E3): erst wenn der Ein-Büro-Betrieb gelebt ist.
- **ONLV/CRB-Devis-Export**: NPK-nahes Ausmass + CSV sind da (C1); das echte Devis-Format ist eine Lizenz-/Normfrage.
- **DGM/swisstopo-Terrain**: das handgesetzte Terrainprofil (A2) steht; Höhenmodell-Download ist V4-Ausbaustufe 2.

## 5. Sicherheit & Betrieb (Serie I / Batch B9) — ehrlich benannte Infrastruktur

Zwei Punkte aus dem Bauplan (`docs/SERIE-I-BUILDPLAN.md` §4, R11), die **keine
Cloud-Build-Umgebung** herstellen kann — beide brauchen die HomeStation
und/oder Owner-Entscheidungen, die ausserhalb von Code liegen:

| Auftrag | Übergabepunkt |
|---|---|
| **Signierte Tauri-Updates** (V2-D1, R11) | Der Desktop-Build läuft (CI, `.desktop-build-request`), aber ohne Signatur-Keys prüft kein Betriebssystem die Echtheit eines Updates. Ein Tauri-Updater braucht einen **Owner-Signing-Key** (Ed25519, generiert und verwahrt beim Owner, NIE in der Cloud/im Repo) plus einen Update-Manifest-Endpunkt, der signierte Release-Metadaten ausliefert. **Bis dahin ist «Update» ehrlich: ein neuer Installer** (kein `null`-CSP-artiges Vortäuschen einer Signaturprüfung, die nicht läuft) — Nutzer laden den neuen Installer manuell, wie im aktuellen V1-Betrieb. Übergabepunkt für den ersten echten Signatur-Lauf: `src-tauri/tauri.conf.json` (`bundle.createUpdaterArtifacts`/`plugins.updater`), Tauri-Doku «Signing Updater Artifacts». |
| **Verschlüsseltes, versioniertes Büro-Backup** | Die einzige Persistenz, die heute existiert, ist die Sync-SQLite-Datei (`tools/sync-server`, `KOSMO_SYNC_DB`) plus lokale `.kosmo`-Dateien/IndexedDB im Browser — **kein automatisches Backup**. Ein echtes Backup läuft auf der HomeStation: (1) regelmässiger, versionierter Snapshot der SQLite-Datei + des Projektordners (z.B. `restic`/`borg` — beide bringen client-seitige Verschlüsselung UND Deduplizierung/Versionierung mit, kein Aufwand für ein eigenes Verschlüsselungsschema); (2) der Verschlüsselungs-Schlüssel/das Repository-Passwort gehört **ausschliesslich dem Owner** (Passwort-Manager/Papier-Backup, nie im Repo); (3) ein Restore-Test gehört zur Owner-Routine — ein ungetestetes Backup ist kein Backup. Dieses Repo liefert dafür keinen Code, weil es reine Betriebs-/Owner-Infrastruktur ausserhalb der App ist — ehrlich benannt statt als «Backup-Feature» vorgetäuscht. |

Beide Punkte hängen mit dem Incident-Playbook zusammen
(`docs/INCIDENT-PLAYBOOK.md`): ein Schlüssel-Leak braucht eine Rotation (die
Playbook-Schritte laufen unabhängig vom Backup/Update-Stand), ein Restore
nach einem Vorfall braucht ein tatsächlich vorhandenes, getestetes Backup.

## Erster Abend am Home-PC (empfohlene Reihenfolge)

1. Bridge echt starten (ohne `--fake`), `docs/ABNAHME-DREHBUCH.md` fahren — Befunde notieren.
2. bge-m3 in `/embed` einstecken → KosmoPrepare-Suche wird semantisch (alles Weitere ist schon verdrahtet).
3. Whisper/Piper hören, CH-Wortliste nachziehen.
4. ComfyUI-Worker an die Job-Schleife hängen → KosmoVis rendert echt, Plakat-Slots füllen sich.
5. OneDrive-Pull → `ingest.py` für Atlanten; GoodNotes via Qwen-VL.
6. Erster LoRA-Lauf nach `docs/KOSMOTRAIN.md`.
