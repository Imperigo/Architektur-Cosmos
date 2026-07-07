# V2-Technik-Block 1 — Buildplan: HomeStation-Kette scharf + Blender-Worker (Fable, 07.07.2026)

> Orchestrierbarer Bauplan für den ersten technischen V2-Block
> (`docs/V2-AUFTAKT.md` Teil 2, Prioritäten 1+2). Fable legt hier Protokoll,
> Contracts, Zustandsmaschine, Blender-Nahtstelle, Batches, Reihenfolge und
> Abnahme fest; Opus zerlegt 1:1 in Sonnet-/Opus-Aufträge.
>
> **Harte Realität dieses Environments (prägt jeden Batch):** Der Cloud-
> Container hat **keine GPU, kein Blender, kein ComfyUI, keine RTX-5090-
> HomeStation**. Die echte GPU-Kette (SDXL-Render, Cycles-Bake, SfM/Splat,
> LoRA) kann hier NICHT laufen. Deshalb ist jede Aufgabe einsortiert als:
>
> - **(A) im Container baubar UND testbar** — Client, Protokoll/Contract,
>   Zustandsmaschinen, Fake-Worker-Erweiterungen, App-UI, Kernel. Voller
>   Batch mit Gate + E2E.
> - **(B) HomeStation/GPU-gated** — hier entsteht nur Client + Contract +
>   ehrliche «wartet auf HomeStation»-Markierung; die echte GPU-Seite wird
>   als `HOMESTATION-AUFTRAG`-Ergänzung dokumentiert, **nie vorgetäuscht**.
>   Landepunkt jeder (B)-Grenze ist eine Ehrlichkeits-Assertion in
>   `e2e/sim-ki-imaging.spec.ts`.
>
> Owner-Mandat gilt je Batch: Feature → Tests (+E2E) → ROADMAP-Eintrag (vor
> dem Phase-3-Marker) → deutscher Commit mit Trailern → Push auf den
> Entwicklungs-Branch. **Ehrlichkeit vor Politur**: nichts als «fertig»
> ausweisen, was die HomeStation braucht. `exactOptionalPropertyTypes` ist an.

---

## 1. Ist-Zustand (verbindlich gelesen, Stand ROADMAP 176)

### 1.1 Die Render-Kette heute (Client → Bridge → Fake-Worker → Artefakt → Blatt)

1. **Client sendet**: `NodeCanvas.tsx` `ausfuehren()` (Z. 176–191) →
   `postRenderJob()` in `apps/kosmo-orbit/src/modules/vis/vis-jobs.ts`:
   `exportGlb(doc)` + hart verdrahtete `render-scene/v1`-Szene (`cameras:
   'auto'`, `vis: { skip: false, backbone: 'qwen' }`) als multipart
   (`scene` + `model.glb`) an `POST {bridgeBase()}/jobs`. `bridgeBase()` =
   localStorage `kosmo.bridge`, Default `http://localhost:8600`.
2. **Bridge nimmt an** (`tools/homestation-bridge/kosmo_bridge/main.py`,
   `create_job` Z. 250–281): Job-Ordner unter `STORE`, `out` wird seit
   Serie I/B4 **serverseitig erzwungen**, Record mit `status: "queued"`,
   `approval_token: "CONFIRMED_RENDER_…"`, `idle_window_only: true`.
   **Befund:** `approval_token` und `idle_window_only` werden geschrieben,
   aber **von niemandem geprüft oder verwendet** — tote Felder. Es gibt
   keinen Approve-, keinen Cancel-, keinen Progress-Weg.
3. **Fake-Worker** (`_fake_worker_loop` Z. 552–603, Flag exakt
   `--fake-worker`): pollt 1.5 s, `queued` → `running` → Platzhalter-PNG
   `cam-01.png` + `render-result.json` mit ehrlichem QA-Verdict
   (`qa.geometry.method: "fake-worker"`, `verdict.reason: "Fake-Worker
   (Demo ohne GPU)"`) → `done`. `video-splat`-Jobs enden ehrlich als
   `status: "kein-sfm-worker"` mit Begründung — **kein** Platzhalter-Splat.
4. **Client pollt** (`NodeCanvas.tsx` Z. 96–120 und noch einmal separat
   `VisWorkspace.tsx` Z. 248–273, je 2.5 s): Zustandsmaschine in
   `vis-runtime.ts` kennt nur `gesendet | rendert | fertig | fehler`;
   verspätete Antworten sind geguarded (P6-Review #7). `catch(() =>
   undefined)` beim Poll: **eine tote Bridge dreht den Poll stumm ewig
   weiter** — kein Timeout, keine Offline-Meldung, kein Abbruch-Knopf.
5. **Blatt**: `bildAufsBlatt()` (vis-jobs.ts Z. 66–95) holt das Artefakt
   (`cache: 'no-store'`), legt es als EIN Undo-Schritt über
   `publish.blattErstellen/bildFuellen/bildPlatzieren` aufs Blatt.

### 1.2 Contracts und Endpunkte (packages/kosmo-contracts)

- `render-scene.ts` — **kosmovis.render-scene/v1**, unverändert seit V1.
  Wichtig: `vis.skip: boolean` existiert bereits = «nur Cycles, keine
  KI-Veredelung». Der Client setzt es hart auf `false` — der **Cycles-Pfad
  ist im Vertrag schon da, aber unbedienbar**.
- `render-result.ts` — **kosmovis.render-result/v2** (Doppel-QA) und
  `RenderJob` mit `RenderJobStatus`-Enum, das `awaiting_approval` **schon
  enthält**, plus `approval_token`/`idle_window_only`. **Der Vertrag kennt
  die Freigabe — Bridge erzwingt sie nicht, Client kennt sie nicht.**
  `job_id`-Regex ist hart `^vis-\d+-[0-9a-f]{6}$` (neue Job-Arten brauchen
  eigene Schemata, nicht diese Regex aufweichen).
- `bridge-api.ts` — `bridgeRoutes` als eine Quelle für Client und
  Server-Tests: `/health`, `/jobs`, `/jobs/{id}`,
  `/jobs/{id}/artifacts/{name}`, `/jobs/video-splat`, `/stt`, `/tts`,
  `/ollama`, `/validate-ifc`, `/embed`. **Befunde:** `BridgeHealth.services`
  kennt `embed` nicht (die Bridge liefert es längst); `gpu.idle` ist im
  Contract vorgesehen, die Bridge liefert es nie; für den
  `video-splat`-Record existiert kein zod-Schema.
- **Client-Doppelung:** `vis-jobs.ts` definiert eigene `JobRecord`/`JobQa`-
  Interfaces von Hand statt die Contracts zu parsen — zwei Wahrheiten.

### 1.3 Serie-I-Härtung (bereits geleistet — nicht erneut bauen)

`main.py` trägt seit B4/B6/B9: serverseitig erzwungenes `out` (Schreibziel-
Injektion zu), `_safe_store_path()` (resolve/relative_to statt startswith),
Upload-Deckel `_read_capped()` (413, Env `KOSMO_BRIDGE_MAX_UPLOAD_*`),
timing-sicherer Token (`secrets.compare_digest`), Bind-Default `127.0.0.1`,
CORS-Allowlist aus `KOSMO_BRIDGE_ORIGIN`, optionale Lizenz-Pflicht
(`KOSMO_BRIDGE_LIZENZ_PFLICHT`, fail closed) und strukturiertes
`sicherheits_log`. Prüfschiene: `tools/homestation-bridge/test_bridge_haerte.py`
(FastAPI-TestClient, eigenständig lauffähig, im Container grün).
**Befund:** Der **Client sendet nirgends `X-Kosmo-Token`** — eine
Token-geschützte Bridge sperrt die eigene App aus. Serie I hat die Tür
gebaut, der Client hat keinen Schlüsselbund.

### 1.4 Was für «scharf» fehlt (die Lücken, die dieser Block schliesst bzw. ehrlich markiert)

| Lücke | Ort | (A)/(B) |
| --- | --- | --- |
| Freigabe/Idle-Window wird nicht erzwungen und ist unbedienbar | Bridge + Client | (A) Protokoll + Fake-Idle-Simulation; (B) echte GPU-Idle-Erkennung |
| Kein Abbruch, kein Fortschritt, kein Timeout, keine Offline-Meldung | Client + Bridge | (A) |
| Client sendet keinen Bridge-Token | `vis-jobs.ts` u. a. | (A) |
| Contracts hinken der Bridge hinterher (embed, gpu, video-splat-Record) | `@kosmo/contracts` | (A) |
| Cycles-Pfad (`vis.skip`) unbedienbar | Kernel `derive/visgraph.ts` + Client | (A), Kernel-Berührung mit Golden-Urteil (§4 HS5) |
| Blender nirgends angebunden (Render/Bake/Simulationen) | Bridge + Contract | (A) Contract + Fake/ehrliche Grenze; (B) echter Blender headless |
| Echte Renders, echte QA (dinov3/DepthAnything), SfM, LoRA | HomeStation | (B) — bleibt `HOMESTATION-AUFTRAG` |

### 1.5 Regressionsnetz (bleibt byte-für-byte verbindlich)

- `e2e/sim-ki-imaging.spec.ts` — die fünf Ehrlichkeits-Assertions gegen die
  Fake-Bridge: TTS-Prüfton, **STT-501** mit Installationshinweis,
  Embed-`fake-trigram-64`, QA-Verdict `method:"fake-worker"`, video-splat
  `kein-sfm-worker`. **Harter Anker:** `POST /jobs` liefert dort
  `status: "queued"` (Z. 122) — die Freigabe-Pflicht muss also **opt-in per
  Env** sein, Default-Verhalten unverändert.
- `e2e/visgraph.spec.ts` — Kette Drei-Stimmungen → Ausführen → Bild →
  Aufs Blatt (Timeout 25 s) + Canvas-Handwerk. Läuft gegen die
  Default-Bridge; darf durch keinen Batch langsamer/kaputt werden.
- `e2e/splat.spec.ts` — lokaler Splat-Werkzeugweg, disjunkt; nicht anfassen.
- Goldens `packages/kosmo-kernel/test/golden/*.svg` — byte-identisch; einzige
  Kernel-Berührung dieses Blocks ist HS5 (Golden-Urteil dort erteilt).

---

## 2. Zielbild: HomeStation-Kette scharf

Das Protokoll Client↔HomeStation wird **vollständig im Container gebaut und
getestet** (die Bridge ist reines Python/FastAPI und läuft hier), die
GPU-Seite wird ehrlich markiert übergeben. Kein neues Schema-Versionieren:
alles ist **additiv** auf `render-scene/v1` / `render-result/v2`.

### 2.1 Der Job-Lebenszyklus (Soll)

```
                 (Freigabe-Pflicht aktiv)                    (Idle-Gate)
POST /jobs ──► awaiting_approval ──approve──► queued ──idle──► running ──► done
   │                    │                        │                │          │
   │ (Default: direkt   └──cancel──► cancelled ◄─┴────cancel──────┘        error
   │  queued, wie heute)                                    (kooperativ)
   └─ Record trägt: approval_token, idle_window_only, worker, progress
```

1. **Auftrag stellen** — unverändert `POST /jobs` (multipart scene+model).
   Neu im Record: `worker` (wer den Job übernommen hat, z. B.
   `"fake-worker"`; echte Worker tragen sich ein) und `progress`
   (`{phase, pct}`). **(A)**
2. **Freigabe/Idle-Window** — `POST /jobs/{id}/approve` mit dem
   `approval_token` aus dem Create-Response (compare_digest; falscher Token
   403 + `sicherheits_log`). Freigabe-Pflicht **opt-in** via
   `KOSMO_BRIDGE_APPROVAL_PFLICHT=1` (Default aus → `sim-ki-imaging`-Anker
   `status:"queued"` bleibt grün). Idle-Gate: der Worker nimmt `queued`-Jobs
   nur, wenn die GPU frei ist. Im Fake-Modus wird «frei/belegt» ehrlich
   **simuliert** (`KOSMO_BRIDGE_GPU_IDLE=0|1`, `/health` liefert dann
   `gpu: { name: "fake-gpu (Simulation)", idle: … }` — der Name sagt selbst,
   dass er Fake ist). **(A)** — Die **echte** Idle-Erkennung (nvidia-smi,
   Auslastungsschwelle, Nachtfenster) ist **(B)**: HomeStation-Auftrag,
   im Container nie vorgetäuscht (ohne GPU fehlt `gpu` im Health ganz).
3. **Fortschritt** — Worker schreibt `progress` in `job.json`; der bestehende
   2.5-s-Poll des Clients zeigt Phase/Prozent am Node. Fake-Worker schreibt
   eine ehrliche Mini-Progression (`rendern`, 0.5 → 1.0). **(A)** — echte
   ComfyUI-/Cycles-Phasen **(B)**.
4. **Artefakt-Abholung** — unverändert `GET /jobs/{id}/artifacts/{name}`;
   der Client parst Record/Result neu **über die zod-Contracts** statt
   Hand-Interfaces (eine Wahrheit). **(A)**
5. **Fehler / Timeout / Offline** — drei getrennte, ehrliche Wege im Client:
   `status:"error"` → Fehlertext des Records; **Client-Timeout** (Default
   10 min ohne Statuswechsel, für E2E via localStorage
   `kosmo.render.timeoutMs` überschreibbar) → Zustand `zeitueberschreitung`
   mit Meldung «keine Antwort seit … — HomeStation prüfen; der Job bleibt
   unter seiner Nummer abrufbar» (kein stilles Weiterdrehen); **Offline**
   (mehrere Poll-Fetches in Folge scheitern) → sichtbarer Hinweis «Bridge
   nicht erreichbar — läuft die HomeStation? (Betriebsart: …)». **(A)**
6. **Abbruch** — `POST /jobs/{id}/cancel`: `awaiting_approval|queued` →
   sofort `cancelled`; `running` → kooperativ (der Fake-Worker prüft vor dem
   Ergebnis-Schreiben; für echte Worker ist kooperatives Abbrechen im
   Worker-Protokoll dokumentiert). UI: Abbrechen-Knopf an wartenden/
   laufenden Nodes. **(A)**
7. **Token** — der Client sendet `X-Kosmo-Token` aus localStorage
   `kosmo.bridge.token` (leer = kein Header), auf **allen** Bridge-Wegen
   (Jobs, Artefakte, approve/cancel). Ablage in localStorage ist dieselbe
   ehrlich benannte Design-Entscheidung wie `kosmo.llm` (Serie-I-Befund,
   im Code kommentiert). **(A)**
8. **Cloud-Fallback ehrlich** — Betriebsart `cloud` (`betriebKonfig()` →
   `bridgeUrl: ''`): der Render-Knopf ist deaktiviert mit dem ehrlichen
   Titel «Cloud-Betrieb: Rendern braucht die HomeStation-Bridge» — es gibt
   **keinen** vorgetäuschten Cloud-Render. **(A)**

### 2.2 Worker-Protokoll (die Übergabe an die echte HomeStation)

Der Job-Store IST das Protokoll — genau die Schleife, die
`_fake_worker_loop` vorlebt: ein Worker pollt den Store, nimmt
`queued`-Jobs (nur bei GPU-Idle, wenn `idle_window_only`), trägt sich als
`worker` ein, schreibt `progress`, legt Artefakte in `out/`, schreibt
`render-result.json` (render-result/v2) und setzt `done|error`; `cancelled`
respektiert er vor jedem teuren Schritt. Dieses Protokoll wird in
`tools/homestation-bridge/README.md` («Worker andocken») normativ
beschrieben — **das** ist der Übergabepunkt für ComfyUI (SDXL) und Blender
(Cycles). Es entsteht **kein** unlauffähiger ComfyUI-/Blender-Code im Repo:
ein hier nicht ausführbares GPU-Skript wäre «fertig aussehen ohne fertig zu
sein» — stattdessen präzises Protokoll + Abnahme-Drehbuch. **(B, ehrlich
dokumentiert)**

---

## 3. Blender-Worker

Entscheid V1-Finish (TECH-RADAR 04.07., `HOMESTATION-AUFTRAG.md` §2b):
**kein Fork** — Blender bleibt Werkbank + Worker. Zwei getrennte Job-Arten,
zwei getrennte Ehrlichkeits-Regime:

### 3.1 Cycles-Render: KEIN neuer Vertrag nötig (A + B)

`render-scene/v1` hat den Cycles-Pfad bereits: `vis.skip = true` heisst
«reiner Cycles-Render, keine KI-Veredelung». Scharf schalten heisst hier:

- **Client (A):** Der Render-Node bekommt den Param `nurCycles` (bestehendes
  generisches `VisNode.params`-Record — **kein Modell-Umbau**), eine
  Checkbox «Nur Cycles (ohne KI-Veredelung)» und `postRenderJob` setzt
  `vis.skip` entsprechend. `memoKey` MUSS den Param aufnehmen, sonst zeigt
  ein KI-Bild nach dem Umschalten fälschlich «aktuell».
- **Bridge/Fake (A):** Der Fake-Worker liefert weiterhin das markierte
  Platzhalter-PNG (`method:"fake-worker"`), trägt aber zusätzlich
  `requested_engine: "cycles" | "ki"` in den Record ein — ehrlich: *was
  bestellt wurde*, nicht *was gerendert wurde*.
- **HomeStation (B):** Das echte Routing (`vis.skip` → Blender headless
  Cycles statt ComfyUI) ist Worker-Arbeit am echten Gerät — dokumentiert,
  nie simuliert.

### 3.2 Simulationen (Wind/Sonne/Gebäude): eigener Vertrag, harte Ehrlichkeitsgrenze

- **Contract (A):** neu `kosmo.blender-sim/v1` in `@kosmo/contracts`
  (eigene Datei `blender-sim.ts`):
  `{ schema, art: 'wind' | 'sonnenstunden' | 'gebaeude-energie',
  geometry: {path, format:'glb'}, params: Record, out }` plus
  `BlenderSimJob`-Record (`job_id`-Präfix `bsim-`, eigenes Schema — die
  `vis-`-Regex von `RenderJob` bleibt unangetastet; Status inkl.
  `kein-blender-worker`).
- **Bridge (A):** `POST /jobs/blender-sim` (multipart szene+model, gleiche
  Serie-I-Disziplin: `out` serverseitig erzwingen, `_read_capped`,
  `_safe_store_path`).
- **Fake-Variante (A) — Fable-Urteil, verbindlich:** Der Fake-Worker
  beantwortet `blender-sim`-Jobs **NIE mit erfundenen Zahlen**, sondern —
  exakt nach dem `kein-sfm-worker`-Muster — mit
  `status: "kein-blender-worker"` + Begründung («braucht Blender headless
  auf der HomeStation»). Begründung: ein Platzhalter-**Bild** ist sichtbar
  ein Platzhalter und markiert; eine Platzhalter-**Simulationszahl** sieht
  aus wie ein Analyseergebnis und könnte eine Bau-Entscheidung verseuchen.
  Bilder dürfen markierte Fakes sein, Physik nie.
- **HomeStation (B):** echter Blender-headless-Worker (Cycles-Render des
  GLB — der Export trägt schon lesbare Namen + Material-Slots in Metern,
  `derive/gltf.ts` — danach Wind-/Sonnen-/Gebäudesimulation) nach dem
  Worker-Protokoll §2.2. Client-UI für Simulations-Ergebnisse folgt erst,
  wenn echte Ergebnisse existieren (ehrliche Restgrenze §6) — in diesem
  Block enden Sim-Jobs sichtbar als «wartet auf HomeStation».

---

## 4. Batches (Build-Order)

Konvention wie Serie H/I: je Batch Ziel, Dateien, Umfang (S/M/L), Typ
(A)/(B), Abnahmekriterium, Gate-/Golden-Risiko, Restgrenze. Klein genug für
einen Sonnet-Worktree; HS3 ist der härteste und geht an Opus oder an Sonnet
mit engem Review.

### HS1 — Contract-Schärfung «Job-Lebenszyklus + Blender-Sim» · S–M · (A)
- **Ziel:** `@kosmo/contracts` wird die EINE Wahrheit für alles, was danach
  kommt — additiv, kein Breaking Change.
- **Dateien:** `packages/kosmo-contracts/src/render-result.ts` (RenderJob +
  `progress?: {phase: string; pct: number(0..1)}`, `worker?: string`,
  `requested_engine?: 'cycles'|'ki'`, `message?: string`),
  `bridge-api.ts` (`BridgeHealth.services.embed?: boolean`; `bridgeRoutes`
  + `jobApprove(id)`, `jobCancel(id)`, `jobsBlenderSim`; neues
  `VideoSplatJob`-Schema mit Status `kein-sfm-worker`), NEU
  `blender-sim.ts` (§3.2), `index.ts`-Exporte, Contract-Tests.
- **Verbote:** `RenderJob.job_id`-Regex und `RenderJobStatus` unverändert
  (nur optionale Felder ergänzen); nichts required machen, was die Bridge
  heute nicht liefert.
- **Abnahme:** Contract-Tests decken jede neue Form (gültig + je ein
  Ablehnfall); heutige Bridge-Antworten (Fixtures aus einem Live-Lauf der
  Fake-Bridge) parsen unverändert; `npm run typecheck` + `npm test` grün.
- **Gate/Golden:** kein Kernel-Diff → Goldens trivial byte-identisch.
- **Restgrenze:** Contracts beschreiben auch, was erst die HomeStation
  liefert (`gpu`, echte `worker`-Namen) — als optionale Felder, ehrlich.

### HS2 — Bridge: Freigabe, Idle-Gate, Abbruch, Fortschritt · M · (A)
- **Ziel:** Der Job-Lebenszyklus aus §2.1 läuft in der Bridge — Default-
  Verhalten byte-kompatibel zu heute (Regressions-Anker `sim-ki-imaging`
  Z. 122: Create → `queued`).
- **Dateien:** `tools/homestation-bridge/kosmo_bridge/main.py`,
  `tools/homestation-bridge/test_bridge_haerte.py` (erweitern),
  `tools/homestation-bridge/README.md` (Abschnitt «Worker andocken», §2.2).
- **Schritte:** (1) `KOSMO_BRIDGE_APPROVAL_PFLICHT=1` → Create-Status
  `awaiting_approval`; `POST /jobs/{id}/approve` (Body `{approval_token}`,
  `secrets.compare_digest`, falsch → 403 + `sicherheits_log`-Ereignis
  `freigabe_fehlgeschlagen`). (2) `POST /jobs/{id}/cancel` →
  `awaiting_approval|queued|running` → `cancelled` (+`updated_at`); der
  Fake-Worker prüft `cancelled` vor JEDEM Schreiben (kooperativ). (3)
  Idle-Gate im Fake-Worker: `queued` wird nur übernommen, wenn
  `KOSMO_BRIDGE_GPU_IDLE` nicht `0` ist; `/health` liefert im Fake-Modus
  `gpu: {name: "fake-gpu (Simulation)", idle: …}` — **nur** im Fake-Modus;
  ohne Fake-Worker und ohne echte GPU fehlt `gpu` ganz (nichts vortäuschen).
  (4) `progress` + `worker: "fake-worker"` + `requested_engine` (aus
  `scene.vis.skip`) im Record. (5) `_safe_store_path`-Disziplin für die
  neuen Routen.
- **Abnahme:** `test_bridge_haerte.py` erweitert und grün: Default-Create
  bleibt `queued` (Anker!); Pflicht an → `awaiting_approval`; richtiger/
  falscher approval_token; cancel aus jedem Zustand; Idle 0 hält Jobs in
  `queued`; `render-result`/Record parsen gegen die HS1-Contracts (Fixture).
  Danach die bestehende E2E-Fläche: `sim-ki-imaging` + `visgraph` gegen die
  Default-Bridge unverändert grün.
- **Gate/Golden:** reines Python + Contracts-Read — npm-Gates unberührt,
  Goldens unberührt.
- **Restgrenze:** Idle ist Simulation; kooperatives Abbrechen echter
  GPU-Prozesse ist Worker-Pflicht (README), hier nur spezifiziert.

### HS3 — Client: Zustandsmaschine, Token, Timeout/Offline, Cloud-Ehrlichkeit · M–L · (A) — Opus-Kandidat
- **Ziel:** Der Client bedient und zeigt den vollen Lebenszyklus ehrlich.
- **Dateien:** `apps/kosmo-orbit/src/modules/vis/vis-jobs.ts`,
  `vis-runtime.ts`, `NodeCanvas.tsx`, `VisWorkspace.tsx`,
  `apps/kosmo-orbit/src/shell/Diagnose.tsx` (Worker-/GPU-Zeile aus
  `/health` anzeigen), NEU `e2e/homestation-kette.spec.ts`; App-Unit-Tests.
- **Schritte:** (1) `vis-jobs.ts`: Records/Results via
  `@kosmo/contracts` `safeParse` (Hand-Interfaces raus); `bridgeToken()`
  aus `kosmo.bridge.token`, Header `X-Kosmo-Token` konditional auf ALLEN
  Bridge-Fetches; neu `freigebenJob()`, `abbrechenJob()`; EIN gemeinsamer
  Status-Mapper `mappeJobStatus(record)` für beide Poll-Stellen (NodeCanvas
  UND VisWorkspace — die Doppelung von heute stirbt). (2) `vis-runtime.ts`:
  `NodeLauf.status` + `wartetFreigabe | wartetGpu | abgebrochen |
  zeitueberschreitung`; `approvalToken?`, `gestartetUm`; pure Funktion
  `istZeitUeberschritten(lauf, jetzt, limitMs)` (unit-getestet; Limit
  Default 10 min, E2E-Override `kosmo.render.timeoutMs`). (3) UI: Knopf
  «Freigeben» (testid `render-freigeben`) bei `wartetFreigabe`, Text
  «wartet auf GPU-Leerlauf …» bei `wartetGpu`, Knopf «Abbrechen»
  (`render-abbrechen`) bei wartend/laufend, ehrliche Timeout-/Offline-
  Meldungen (§2.1 Punkt 5), Poll-Filter um die neuen Wartezustände
  erweitert. (4) Cloud: `bridgeUrl === ''` → `render-ausfuehren` disabled
  + ehrlicher Titel (§2.1 Punkt 8).
- **E2E `homestation-kette.spec.ts`:** startet sich eine EIGENE Bridge auf
  Port **8601** (`child_process.spawn('python3', [....../main.py,
  '--fake-worker', '--port', '8601'], env: {KOSMO_BRIDGE_APPROVAL_PFLICHT:
  '1', KOSMO_BRIDGE_GPU_IDLE: '0', KOSMO_JOB_STORE: <tmp>})`, afterAll
  kill; bei fehlendem python3/fastapi **ehrlicher Skip** mit Anleitung,
  Muster `bridgeVerfuegbar`). localStorage `kosmo.bridge` → `:8601`.
  Ablauf: senden → `render-status` «wartet auf Freigabe» → Freigeben →
  «wartet auf GPU-Leerlauf» (Idle 0 hält den Job beweisbar) → Abbrechen →
  «abgebrochen». Zweiter Test: `kosmo.bridge` auf toten Port `:8699` →
  senden → ehrliche Offline-Meldung. Die Default-Bridge :8600 und alle
  bestehenden Specs bleiben unberührt.
- **Abnahme:** neue E2E grün UND `visgraph.spec.ts` + `sim-ki-imaging`
  unverändert grün (kein Assertion-Diff); Unit für Timeout-Funktion und
  Status-Mapper; `npm run typecheck`/`npm test`/App-Build grün; kein
  `waitForTimeout` im Spec.
- **Gate/Golden:** reine App — Goldens unberührt.
- **Restgrenze:** Freigabe-UI ist gebaut, aber die *Pflicht* schaltet erst
  der Owner auf der HomeStation ein (Env) — Default bleibt der heutige
  Ein-Klick-Weg.

### HS4 — Bridge: Blender-Nahtstelle (`/jobs/blender-sim` + Engine-Marker) · M · (A)
- **Ziel:** §3 in der Bridge — Fake bleibt markiert, Physik wird nie erfunden.
- **Dateien:** `main.py`, `test_bridge_haerte.py`,
  `tools/homestation-bridge/README.md` (Job-Typ-Tabelle + Worker-Protokoll
  um Blender-Abschnitt ergänzen).
- **Schritte:** (1) `POST /jobs/blender-sim` (multipart `szene`
  = blender-sim/v1-JSON + `model.glb`): validieren, `out` serverseitig
  erzwingen, `_read_capped` (Model-Deckel), Record `kind: "blender-sim"`,
  `job_id`-Präfix `bsim-`, Status `queued`. (2) Fake-Worker:
  `blender-sim` → `status: "kein-blender-worker"` + Begründungstext mit
  «Blender» und «HomeStation» (Muster `kein-sfm-worker`; **niemals**
  Zahlen erfinden — Fable-Urteil §3.2, als Kommentar in den Code). (3)
  `requested_engine` aus `vis.skip` in Render-Records (falls nicht schon
  in HS2 gelandet — Opus koordiniert, wer von beiden es trägt).
- **Abnahme:** TestClient-Fälle: blender-sim-Job endet als
  `kein-blender-worker` mit Begründung; `out`-Injektion abgewiesen; Deckel
  → 413; ungültige `art` → 400; bestehende Suite grün.
- **Gate/Golden:** Python — npm/Goldens unberührt.
- **Restgrenze:** Es existiert bewusst KEIN Blender-Python-Skript im Repo
  (unlauffähig ≠ fertig); der echte Worker entsteht am Gerät nach README-
  Protokoll (§2.2) — `HOMESTATION-AUFTRAG` (HS7).

### HS5 — Client/Kernel: «Nur Cycles»-Schalter am Render-Node · S–M · (A, Kernel-Berührung)
- **Ziel:** §3.1 — der schon vertragliche Cycles-Pfad wird bedienbar.
- **Dateien:** `packages/kosmo-kernel/src/derive/visgraph.ts`
  (Render-Node-Param `nurCycles` → `RenderAuftrag.nurCycles: boolean`,
  Default `false`), Kernel-Unit-Test; `apps/…/vis/NodeCanvas.tsx`
  (Checkbox, testid `render-nur-cycles`), `vis-jobs.ts`
  (`vis: {skip: auftrag.nurCycles, …}`), `vis-runtime.ts` (`memoKey` nimmt
  `nurCycles` auf — Pflicht, sonst lügt «aktuell»).
- **Golden-Urteil (Fable, hiermit erteilt):** `derive/visgraph.ts` speist
  keine Golden-SVGs (Goldens = `plansvg`-Ausgaben); der Param ist
  default-false hinter «nur wenn gesetzt»-Guard → verhaltensgleich. Die
  Berührung ist freigegeben **unter der Bedingung**: volle Kernel-Suite +
  Golden-Vergleich byte-identisch im Gate; **jeder** Golden-Diff = Stopp
  und zurück an Fable, nicht committen.
- **Abnahme:** Kernel-Unit (evaluiereGraph reicht `nurCycles` durch;
  memoKey ändert sich mit dem Schalter); E2E-Erweiterung in
  `homestation-kette.spec.ts` ODER `visgraph.spec.ts` **append-only**
  (Schalter an → `render-scene.json` des Jobs trägt `vis.skip: true`,
  per Artefakt-GET beweisbar); Goldens byte-identisch; volle Suiten grün.
- **Restgrenze:** Der Schalter bestellt Cycles ehrlich (`requested_engine:
  "cycles"`); geliefert wird im Container weiterhin der markierte Fake —
  die Assertion dazu landet in HS6.

### HS6 — Landepunkt: `sim-ki-imaging`-Erweiterung · S–M · (A)
- **Ziel:** Jede neue (B)-Grenze und jeder neue Ehrlichkeitsmarker dieses
  Blocks ist eine Assertion — das Regressionsnetz wächst mit.
- **Dateien:** `e2e/sim-ki-imaging.spec.ts` (append-only — die fünf
  bestehenden Assertions bleiben zeichengenau).
- **Neue Assertions (gegen die Default-Fake-Bridge :8600):**
  (6) `POST /jobs/blender-sim` → Poll endet `kein-blender-worker`, Message
  enthält «Blender» und «HomeStation»; (7) Render-Record trägt
  `approval_token` mit Präfix `CONFIRMED_RENDER_`, `idle_window_only:
  true`, nach `done` `worker: "fake-worker"` — die Kette sagt selbst, wer
  gerendert hat; (8) Job mit `vis.skip: true` → `requested_engine:
  "cycles"` UND das Ergebnis bleibt als `method: "fake-worker"` markiert
  (Cycles wird nicht vorgetäuscht); (9) cancel: Job anlegen → sofort
  cancel → Status `cancelled`, es entsteht KEIN `render-result.json`
  (404 aufs Artefakt). Freigabe-Pflicht/Idle-Gate sind hier bewusst NICHT
  dupliziert — die decken `test_bridge_haerte.py` (HS2) und
  `homestation-kette.spec.ts` (HS3) mit eigener Bridge-Instanz.
- **Abnahme:** alle 5 alten + 4 neuen Assertions grün gegen die laufende
  `--fake-worker`-Bridge; kein Diff an den alten; Grep-Abnahmetest
  (Render-Segment je Journey) unverändert.
- **Gate/Golden:** Test-only — unberührt.

### HS7 — `HOMESTATION-AUFTRAG`-Ergänzung + Abnahme-Drehbuch · S · (B-Doku)
- **Ziel:** Die GPU-Seite ist so präzise übergeben, dass der erste Abend am
  Home-PC ein Abarbeiten ist, kein Rätseln.
- **Dateien:** `docs/HOMESTATION-AUFTRAG.md` (§1 «Echte Renders» um das
  Lebenszyklus-Protokoll schärfen: approve/cancel/progress/worker-Feld,
  Idle via nvidia-smi mit Schwelle+Fenster als Owner-Parameter; §2b um die
  Job-Typ-Tabelle aus §3: `vis.skip`-Routing → Cycles, `blender-sim`-Arten,
  Verweis aufs README-Worker-Protokoll), `docs/ABNAHME-DREHBUCH.md`
  (Abnahme-Schritte «Kette scharf»: Bridge ohne `--fake-worker` +
  `APPROVAL_PFLICHT=1` starten, Job aus der App freigeben, Fortschritt
  sehen, abbrechen, echtes Bild aufs Blatt, `worker` ≠ fake-worker,
  blender-sim liefert echte Werte), ggf. Verweis-Sätze in `V2-AUFTAKT.md`.
- **Abnahme:** jede (B)-Zeile aus §6 dieses Plans hat ihren Eintrag mit
  Übergabepunkt (Datei/Endpoint/Env); keine Doku behauptet Gebautes, das
  nur die HomeStation kann.
- **Gate/Golden:** reine Doku.

---

## 5. Orchestrierungs-Plan (für Opus)

**Heisse Dateien:** `packages/kosmo-contracts/src/*` (HS1; danach
**eingefroren, append-only**), `tools/homestation-bridge/kosmo_bridge/main.py`
(HS2 und HS4 — **seriell**, nie parallel), `apps/…/modules/vis/*`
(HS3 und HS5 — seriell), `e2e/sim-ki-imaging.spec.ts` (nur HS6, allein).
`test_bridge_haerte.py` wächst append-only.

| Phase | parallel? | Batches | Begründung |
| --- | --- | --- | --- |
| 1 | nein | **HS1** | das Vokabular aller anderen Batches |
| — | | **Fable-Review 1** nach HS1 | Contract-Freeze: Formen sind die Fundament-API; erst nach Freigabe weiter |
| 2 | nein | **HS2** | main.py zentral; liefert die Endpunkte, gegen die HS3 testet |
| 3 | ja | **HS3 ∥ HS4** | Client-Dateien vs. main.py — disjunkt; Contracts eingefroren; Absprache: `requested_engine` trägt genau EINER (Opus entscheidet und schreibt es in beide Aufträge) |
| — | | **Fable-Review 2** nach Phase 3 | Ehrlichkeits-Urteil: Zustands-/Fehlertexte, `kein-blender-worker`-Grenze, Fake-Idle klar als Simulation benannt, Cloud-Knopf ehrlich |
| 4 | nein | **HS5** | einzige Kernel-Berührung — allein, mit Golden-Gate (Urteil in §4/HS5) |
| 5 | nein | **HS6** | fasst das gemeinsame Regressionsnetz an → allein |
| 6 | ja | **HS7** (∥ ab Phase 4 möglich) | reine Doku, konfliktarm |
| — | | **Fable-Schlussreview** | Gesamtbild: deckt `sim-ki-imaging` jede (B)-Grenze? `HOMESTATION-AUFTRAG` konsistent? ROADMAP-Einträge ehrlich formuliert («Protokoll scharf», nicht «Kette scharf», solange kein echter Worker lief)? |

**Die `sim-ki-imaging`-Assertions als Landepunkte:** Jede (B)-Grenze dieses
Blocks existiert dreifach — (1) als ehrliches Laufzeit-Verhalten
(Bridge/UI-Meldung), (2) als Assertion in `sim-ki-imaging.spec.ts` (HS6),
(3) als `HOMESTATION-AUFTRAG`-Eintrag (HS7). Wenn die HomeStation eine
Grenze später schliesst (echter Worker), wird die zugehörige Assertion
**bewusst umgebaut** (dann prüft sie den echten Marker, z. B.
`worker: "comfyui"`, in einer Heim-Umgebung — bzw. skippt ehrlich im
Container). Bis dahin ist eine grün laufende Ehrlichkeits-Assertion der
Beweis, dass nichts vorgetäuscht wird.

**Je Batch (Opus-Harness):** cwd `kosmo-orbit/`; Gate `npm run typecheck` +
`npm test` + `npm run build -w @kosmo/orbit-app`; für Bridge-Batches
zusätzlich `python3 tools/homestation-bridge/test_bridge_haerte.py`; Helfer
mit `setsid` starten (`python3 tools/homestation-bridge/kosmo_bridge/main.py
--fake-worker --port 8600`, `node tools/sync-server/src/server.mjs`); dann
seriell Playwright: erst die berührten Specs einzeln
(`sim-ki-imaging`, `visgraph`, `homestation-kette`), dann die volle Suite;
ROADMAP-Eintrag; deutscher Commit mit Trailern; Push auf den
Entwicklungs-Branch.

**Sonnet-Auftrags-Schablone:** Kontext = dieser Plan (Batch-Abschnitt +
§§1–3) + `kosmo-orbit/CLAUDE.md` + für Bridge-Batches der Kopf von
`main.py`. Verbote: keine neuen npm-/pip-Abhängigkeiten; keine bestehenden
`data-testid`s ändern; keine Assertion-Abschwächung (insbesondere die fünf
`sim-ki-imaging`-Assertions und `visgraph.spec.ts` zeichengenau);
`RenderJobStatus`/`job_id`-Regex unangetastet; Default-Verhalten der Bridge
byte-kompatibel (Create → `queued` ohne Env); kein Kernel-/`derive/`-Code
ausser HS5; `exactOptionalPropertyTypes`-konforme Spreads; **nichts
GPU-Echtes simulieren, das nicht als Simulation beschriftet ist**. Jeder
Befund → `docs/SIM-BEFUNDE.md`-Eintrag (Schema Serie H §5), nicht
stillschweigend um-asserten.

---

## 6. Ehrliche Restgrenzen (bleibt HomeStation — `HOMESTATION-AUFTRAG`, via HS7)

1. **Echtes KI-Rendering + echte QA.** SDXL/ComfyUI-Bilder, DINOv3-Stil-
   und DepthAnything-Geometrie-QA laufen nur auf der 5090. Im Container
   liefert die Kette markierte Platzhalter (`method: "fake-worker"`,
   `worker: "fake-worker"`) — Assertion sim-ki-imaging #4/#7.
2. **Echter Blender-Worker.** Cycles-Render (Routing von `vis.skip`) und
   alle Simulationen. Wind-/Sonnen-/Gebäudewerte werden **niemals** gefakt:
   `blender-sim` endet im Container beweisbar als `kein-blender-worker`
   (Assertion #6). Es liegt bewusst kein unlauffähiges Blender-Skript im
   Repo — Übergabepunkt ist das Worker-Protokoll im Bridge-README.
3. **Echte GPU-Idle-Erkennung + Freigabe-Betrieb.** Das Idle-Gate ist im
   Container eine beschriftete Simulation (`fake-gpu (Simulation)`,
   Env-gesteuert); nvidia-smi-Telemetrie, Schwellen und das Einschalten der
   Freigabe-Pflicht (`KOSMO_BRIDGE_APPROVAL_PFLICHT=1`) sind Owner-/
   HomeStation-Arbeit. Ohne GPU fehlt `gpu` im `/health` ganz.
4. **Unverändert offen aus früheren Serien** (hier nur referenziert, nicht
   Teil dieses Blocks): Whisper/Piper scharf (STT-501-Assertion bleibt),
   bge-m3 (`fake-trigram-64`-Assertion bleibt), SfM/Video→Splat
   (`kein-sfm-worker` bleibt), LoRA-Lauf, signierte Updates, Backup.

**Sprachregelung für ROADMAP/Commits (verbindlich):** Dieser Block macht das
**Protokoll** der HomeStation-Kette scharf und testfest — «Kette scharf»
im Sinne echter Bilder ist erst nach der HomeStation-Abnahme
(`docs/ABNAHME-DREHBUCH.md`, HS7) wahr und wird bis dahin nirgends behauptet.
