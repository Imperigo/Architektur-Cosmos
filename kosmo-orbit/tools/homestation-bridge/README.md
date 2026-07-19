# Kosmo-Bridge — Installation auf der HomeStation

Die Bridge ist die einzige Naht zwischen KosmoOrbit (Desktop/iPad) und deiner
lokalen Pipeline: Render-Jobs in den KosmoVis-Job-Store, Whisper-STT
(Schweizerdeutsch), Ollama-Proxy fürs iPad.

## Setup (einmalig)

```bash
cd kosmo-orbit/tools/homestation-bridge
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[stt]"
```

## Start (im Büronetz)

```bash
export KOSMO_BRIDGE_TOKEN=dein-geheimes-token          # nötig für --host 0.0.0.0 (sonst Startverweigerung, siehe unten)
export KOSMO_OLLAMA_URL=http://127.0.0.1:11434
export KOSMO_WHISPER_MODEL=jayr23/whisper-large-v3-turbo-swiss-german-ct2
export KOSMO_BRIDGE_ORIGIN="http://homestation:5183"   # oder mehrere, komma-getrennt
kosmo-bridge --store /mnt/data/ArchitekturKosmos/render-jobs --host 0.0.0.0
```

Ohne `KOSMO_BRIDGE_TOKEN` verweigert `--host 0.0.0.0` seit dem I2-Nachtrag
(08.07.2026) den Start (Exit-Code 1) — entweder Token setzen (wie oben) oder
den bewussten Offen-Betrieb explizit bestätigen: `--offen-ohne-token` bzw.
`KOSMO_BRIDGE_OFFEN=1`. Details unten unter «Sicherheit».

In KosmoOrbit dann unter KosmoVis → Einstellungen die Bridge-URL eintragen
(z.B. `http://homestation:8600`).

- Der `--store`-Pfad soll auf denselben Ordner zeigen, den dein
  `render_scheduler.py` überwacht — die Bridge schreibt render-scene.json +
  model.glb + job.json im Job-Store-Format; dein Scheduler rendert im
  GPU-Leerlauf-Fenster wie gehabt.
- **Ohne GPU testen:** `kosmo-bridge --store /tmp/kosmo-jobs --fake-worker`
  beantwortet Jobs mit Platzhalter-Bild + bestandenem QA-Verdikt.
- STT: erstes Transkript lädt das Whisper-Modell (einige GB). Fallback ohne
  Dialekt-Modell: `KOSMO_WHISPER_MODEL=large-v3`.
- TTS (Chatterbox) folgt als eigener Dienst — Endpoint ist im Vertrag reserviert.

## Sicherheit (Serie I / Batch B4 — Bridge-Härtung)

Die Bridge ist für das vertrauenswürdige Büronetz gebaut, nicht fürs offene
Internet. **Ehrlich benannt, keine "unhackbar"-Behauptung:**

- **Bind-Default `127.0.0.1`**: die Bridge ist standardmässig nur vom eigenen
  Rechner erreichbar — egal ob ein Token gesetzt ist. `--host 0.0.0.0` (alle
  Interfaces, z.B. damit ein iPad im Büronetz zugreifen kann) ist eine
  **bewusste Option**, kein Default.
- **Serie I / I2-Nachtrag (08.07.2026) — sicherer Standard, laute Ausnahme**:
  ein nicht-lokaler `--host` OHNE `KOSMO_BRIDGE_TOKEN` verweigert jetzt den
  Start (Exit-Code 1), sofern nicht explizit bestätigt via
  `--offen-ohne-token` bzw. `KOSMO_BRIDGE_OFFEN=1` — dann startet die Bridge
  mit einer unübersehbaren Warnzeile im Log. **Mit** Token bleibt der Host frei
  konfigurierbar wie gehabt (LAN-Betrieb ist der Sinn der Bridge); der
  Token-Vergleich läuft über `secrets.compare_digest` (timing-sicher). Token
  setzen, sobald mehr als dein eigener Rechner Zugriff haben soll.
- **CORS-Allowlist über `KOSMO_BRIDGE_ORIGIN`** (Default: nur die lokalen
  Dev-/Preview-Ports der App). `KOSMO_BRIDGE_ORIGIN=*` ist eine bewusste
  Büronetz-Option (z.B. mehrere Geräte/Ports), kein Default — `*` öffnet die
  Bridge für JEDE Website im Browser eines Nutzers, der sie erreichen kann.
- **Upload-Deckel** (`KOSMO_BRIDGE_MAX_UPLOAD_MODEL` ~200 MB,
  `KOSMO_BRIDGE_MAX_UPLOAD_AUDIO` ~50 MB, `KOSMO_BRIDGE_MAX_UPLOAD_FRAME`
  ~500 KB + `KOSMO_BRIDGE_MAX_FRAMES` für einen künftigen Frame-Upload-Weg):
  Uploads über dem Deckel brechen mit `413` ab, statt unbegrenzt auf Platte zu
  landen (Platten-DoS-Schutz).
- **Job-Store-Pfadprüfung**: `/jobs/{id}` und `/jobs/{id}/artifacts/{name}`
  akzeptieren keine `job_id`/`name` mit `/`, `\` oder `..` und verifizieren
  zusätzlich per `resolve()/relative_to()`, dass der aufgelöste Pfad wirklich
  unter dem Job-Store liegt — schliesst den Nachbarordner-Trick
  (z.B. `/tmp/kosmo-jobs-evil` neben `/tmp/kosmo-jobs`), den ein reiner
  `startswith()`-Vergleich durchlässt.
- **Schreibziel (`out`)** wird bei `/jobs` (POST) immer serverseitig auf
  `<job_dir>/out` gesetzt — ein vom Client mitgeliefertes `out` im
  `render-scene`-JSON wird ignoriert, nicht übernommen.
- **Restgrenze (ehrlich)**: das alles härtet die Bridge fürs Büronetz, macht
  sie aber nicht internettauglich. Kein TLS, keine Pro-Nutzer-ACL, kein
  Rate-Limit. Reale Netzsegmentierung (Firewall/VPN) ist Aufgabe der
  HomeStation/des Routers, nicht der Bridge selbst (siehe Serie-I-Bauplan B8).

Prüfskript: `python3 tools/homestation-bridge/test_bridge_haerte.py` (siehe
unten) deckt die drei kritischsten Fälle ab (client-`out` ignoriert,
Nachbarordner-Trick abgewiesen, Upload über Deckel → 413) sowie die
Lizenzprüfung (siehe unten) ohne pytest.

## Signierte Lizenz + Server-Bindung (Serie I / Batch B6)

Der **einzige wirklich harte Anti-Copy-Hebel** (siehe
`docs/SERIE-I-BUILDPLAN.md` §3 und `docs/LIZENZ.md`) — eine rein clientseitige
Prüfung ist immer umgehbar, die Server-Bindung hier nicht.

- **Additiv, Default unverändert.** Ohne `KOSMO_BRIDGE_LIZENZ_PFLICHT`
  verhält sich `token_guard` exakt wie in B4 — nur der Token (falls gesetzt)
  zählt.
- Aktiviert (`KOSMO_BRIDGE_LIZENZ_PFLICHT=1`), verlangt jede Anfrage
  (ausser `/health`) zusätzlich zum Token einen gültigen, nicht widerrufenen
  Header `X-Kosmo-Lizenz: <lizenzText>` (Ed25519-signiert, siehe
  `@kosmo/lizenz`/`docs/LIZENZ.md`), geprüft gegen den öffentlichen Schlüssel
  `KOSMO_BRIDGE_LIZENZ_PUBKEY`.
- **Ed25519-Bibliothek**: `kosmo_bridge/lizenz.py` nutzt `cryptography`
  (bevorzugt) oder `PyNaCl`, je nachdem was installiert ist —
  `pip install -e ".[lizenz]"` (cryptography) oder `".[lizenz-pynacl]"`
  (PyNaCl). Ist **keine** der beiden Bibliotheken installiert, bleibt
  `KOSMO_BRIDGE_LIZENZ_PFLICHT` ehrlich wirkungslos in dem Sinn, dass sie
  **fail closed** greift: jede Anfrage wird abgelehnt (Startlog warnt
  explizit), statt eine Prüfung vorzutäuschen, die technisch nicht laufen kann.
- **Widerrufsliste**: `KOSMO_BRIDGE_LIZENZ_WIDERRUF` (Komma-Liste) und/oder
  `KOSMO_BRIDGE_LIZENZ_WIDERRUF_DATEI` (eine Lizenz-ID pro Zeile oder
  JSON-Array) — zusammengeführt, fehlende/kaputte Datei wird ignoriert statt
  die Bridge crashen zu lassen.
- Env-Übersicht:

  | Variable | Standard | Bedeutung |
  |---|---|---|
  | `KOSMO_BRIDGE_LIZENZ_PFLICHT` | aus | `1`/`true`/`ja` schaltet die Lizenzprüfung scharf. |
  | `KOSMO_BRIDGE_LIZENZ_PUBKEY` | — | Öffentlicher Ed25519-Schlüssel (32 Rohbytes, base64) — kein Secret. |
  | `KOSMO_BRIDGE_LIZENZ_WIDERRUF` | — | Komma-Liste widerrufener Lizenz-IDs. |
  | `KOSMO_BRIDGE_LIZENZ_WIDERRUF_DATEI` | — | Zusätzliche Datei mit Lizenz-IDs. |

## Job-Lebenszyklus (V2-Technik Block 1 / HS2)

Der Job-Store ist die einzige Naht zwischen KosmoOrbit und dem GPU-Worker. Die
Bridge legt Jobs an und pflegt ihren Zustand; ein **Worker** (der Fake-Worker
im Container oder dein echter `render_scheduler.py` auf der 5090) übernimmt sie.
**Additiv — der Default-Pfad ist unverändert**: ohne die zwei neuen Env-Schalter
startet ein Job wie bisher direkt `queued`.

- **Zustände** (`status` im `job.json`): `awaiting_approval` → `queued` →
  `running` → `done` | `error` | `cancelled`. Video→Splat-Jobs enden ehrlich
  als `kein-sfm-worker`, Blender-Simulationen als `kein-blender-worker`, wenn
  kein passender Worker angeschlossen ist (Physik/Splats werden nie gefälscht).
- **Freigabe-Pflicht** (`KOSMO_BRIDGE_APPROVAL_PFLICHT=1`, Default aus): ein
  neuer Job startet in `awaiting_approval` und rechnet erst nach
  `POST /jobs/{id}/approve` mit `{"approval_token": "CONFIRMED_…"}` aus dem
  Create-Response. Falscher Token → `403` (timing-sicher, protokolliert). Gilt
  für **alle teuren Job-Typen** — Render (`CONFIRMED_RENDER_…`), Blender-Sim
  (`CONFIRMED_SIM_…`) und Video→Splat (`CONFIRMED_SPLAT_…`); der generische
  `/approve`/`/cancel`-Weg bedient alle drei. So läuft kein teurer/bezahlter
  Job ungefragt an.
- **Abbruch**: `POST /jobs/{id}/cancel` setzt `awaiting_approval`/`queued`/
  `running` sofort auf `cancelled`. Kooperativ: ein laufender Worker sieht den
  Abbruch **vor** dem nächsten teuren Schritt und schreibt kein Ergebnis mehr.
- **Fortschritt/Worker**: der Worker trägt `worker` (wer den Job hält) und
  `progress: {phase, pct}` (0..1) in den Record; der Client zeigt Phase +
  Prozent am Node. `requested_engine` (`cycles` | `ki`) hält fest, was
  **bestellt** wurde (Cycles-only vs. KI-Veredelung) — nicht was gerendert wird.
- **Idle-Fenster** (`KOSMO_BRIDGE_GPU_IDLE`, Default `1`): steht die GPU auf
  belegt (`0`), lässt der Fake-Worker Render-Jobs in `queued` liegen, statt sie
  sofort zu rechnen — spiegelt das „nur im GPU-Leerlauf rendern" deines echten
  Schedulers. `GET /health` meldet im Fake-Modus ehrlich
  `gpu: {name: "fake-gpu (Simulation)", idle}`; ohne echte GPU-Abfrage fehlt das
  Feld ganz (nie vorgetäuscht).

  | Variable | Standard | Bedeutung |
  |---|---|---|
  | `KOSMO_BRIDGE_APPROVAL_PFLICHT` | aus | `1`/`true`/`ja` → neuer Job startet `awaiting_approval`, braucht `/approve`. |
  | `KOSMO_BRIDGE_GPU_IDLE` | `1` | `0` = GPU belegt → Render-Jobs bleiben `queued` (Idle-Gate). |

### Blender-Simulationen (V2-Technik Block 1 / HS4)

`POST /jobs/blender-sim` (multipart: Form-Feld `szene` = JSON nach
`kosmo.blender-sim/v1`, siehe `packages/kosmo-contracts/src/blender-sim.ts`,
+ File `model` = `model.glb`) legt einen Job für eine der drei Simulations-
arten an: `wind`, `sonnenstunden`, `gebaeude-energie` (jede andere `art` →
`400`). Genau wie bei `/jobs` wird das Schreibziel `out` **immer serverseitig**
auf `<job_dir>/out` erzwungen — ein vom Client mitgeliefertes `out` wird
ignoriert. Der Job-Record trägt `kind: "blender-sim"`, `job_id`-Präfix
`bsim-` (eigene Regex, unabhängig von `vis-`/`vsplat-`), Status startet
`queued`.

Diese Simulationen sind eine **harte Ehrlichkeitsgrenze**: ein Platzhalter-
BILD ist sichtbar ein Platzhalter, aber eine Platzhalter-SIMULATIONSZAHL
(Windlast, Sonnenstunden, Energiebedarf) sähe aus wie ein echtes
Analyseergebnis und könnte eine Bau-Entscheidung verseuchen. Darum erfindet
der Fake-Worker hier **niemals** Zahlen: ohne angeschlossenen Blender-Worker
endet der Job beweisbar als `status: "kein-blender-worker"` mit einer
Begründung, die «Blender» und «HomeStation» nennt — kein Simulationsergebnis
wird vorgetäuscht.

Ein echter Blender-Worker (headless auf der HomeStation, 5090) dockt nach
demselben Worker-Protokoll unten an: `queued`-Job holen, `blender-sim.json` +
`model.glb` aus dem Job-Ordner lesen, Simulation rechnen, Ergebnis unter
`out` ablegen und den Record auf `done` setzen. Bis dieser Worker existiert,
ist die grün laufende `kein-blender-worker`-Meldung der Beweis, dass nichts
gefälscht wird.

### Worker andocken (normatives Protokoll)

Ein echter Worker überwacht den `--store`-Ordner und bewegt jeden Job durch
denselben Zustandsautomaten wie der Fake-Worker (`kosmo_bridge/main.py`,
`_fake_worker_step`):

1. `queued`-Job holen — aber **nur wenn die GPU idle ist** (dein bestehendes
   Leerlauf-Fenster). `render-scene.json` + `model.glb` liegen im Job-Ordner.
2. Auf `running` setzen und `worker` + `progress` schreiben; `progress.pct`
   während des Renderns aktualisieren (der Client zeigt es live).
3. Vor dem Schreiben des Ergebnisses den Record **frisch lesen**: steht dort
   `cancelled`, abbrechen ohne `render-result.json` zu schreiben (kooperativer
   Abbruch).
4. `render-result.json` (Vertrag `kosmovis.render-result/v2`, Doppel-QA) neben
   das `job.json` legen, dann `status: done` + `progress.pct: 1.0` setzen.
   `GET /jobs/{id}` bettet `render-result.json` in den Record ein.

Kein Ergebnis vortäuschen: fehlt die Fähigkeit (kein Blender, kein SfM),
gehört der Job auf einen ehrlichen `kein-…-worker`-Status mit Begründung, nicht
auf `done`.

Drei weitere Werkbank-Arten (v0.8.9 §9, Owner-Shortlist «Blender-Verträge»)
reiten auf demselben Zustandsautomaten oder auf der bestehenden Render-Kette.
Ein bpy-Skript liegt dafür bewusst NICHT in diesem Repo (ROADMAP 179, in
0.8.9 per Owner-Rückfrage bestätigt) — die folgenden Absätze sind Drehbuch,
kein Code: sie beschreiben, was ein künftiger Blender-Worker tun muss, nicht
wie er es tut.

#### Bake (Smart-UV-Unwrap + AO-Bake)

`POST /jobs/bake` (Vertrag `kosmo.bake-job/v1`, siehe
`packages/kosmo-contracts/src/bake-job.ts`) legt einen Job für einen
Textur-Bake an. Ein echter Worker holt ihn nach demselben Protokoll wie oben
(`queued` → `running` → `done`), rechnet aber in einer festen Reihenfolge:
zuerst das Smart-UV-Unwrap, ERST DANACH den AO-Bake — ein Bake auf ein noch
unentfaltetes Mesh würde eine Textur erzeugen, die auf dem entfalteten Modell
nicht mehr passt. Ist `params.decimateRatio` gesetzt, geschieht die
Dreiecksreduktion vor dem Unwrap, damit die gebackene Textur zur endgültigen
(reduzierten) Geometrie passt, nicht zur ursprünglichen. Das fertige Modell
landet als `baked_glb` unter dem serverseitig erzwungenen `out`-Verzeichnis;
der Record trägt zusätzlich ein `kosmo.bake-result/v1`-Objekt
(`baked_glb`, `method`, optional `triangles_before`/`triangles_after`) analog
zur eingebetteten `render-result.json` oben. Die Ehrlichkeitsgrenze ist hier
schärfer als beim Bild-Platzhalter: ein Bake behauptet eine GEOMETRIE-
Optimierung, und ein unverändertes Eingangs-GLB, das kommentarlos als
gebackt zurückgereicht würde, wäre unsichtbar falsch — die Geometrie sähe
exakt gleich aus wie vorher. Darum gibt es für diesen Job-Typ keinen
Fake-Zwischenschritt: ohne Worker bleibt er sofort und für immer
`kein-blender-worker`.

#### Line-Art (Strichzeichnung)

Line-Art bekommt bewusst KEINEN eigenen Job-Typ — eine Strichzeichnung ist
technisch ein Render mit `style.mode: "lineart"` auf der ganz normalen
`kosmovis.render-scene/v1`-Kette. Ein echter Worker erkennt den Modus im
Szenen-Vertrag und rechnet headless entweder über Cycles mit dem
Freestyle-Kantenrenderer oder über einen Grease-Pencil-Line-Art-Modifier —
beide Wege liefern ein Bild, kein separates Datenformat. Das Ergebnis wird
wie jedes andere Render-Bild als normales Artefakt der bestehenden
`vis-`-Job-Kette abgelegt (`render-result.json`, `GET /jobs/{id}/artifacts/
{name}`) — kein neuer Endpoint, kein neuer Job-Präfix. Der Vertrag hält im
Client-seitigen Kopplungshinweis fest, dass `style.mode: "lineart"` stets mit
`vis.skip: true` einhergeht (`packages/kosmo-contracts/src/render-scene.ts`):
eine Strichzeichnung wartet nie auf eine KI-Veredelung, sie IST bereits das
fertige Bild.

#### Sonnenstunden

`art: "sonnenstunden"` auf `POST /jobs/blender-sim` (Vertrag
`kosmo.blender-sim/v1`) verlangt in `params` mindestens `lat`, `lon` und ein
ISO-Datum `datum`; optional `kriteriumStunden` (Default 3) als Schwelle für
das Bestehen-Kriterium. Ein echter Worker tastet den Sonnenstand über den Tag
in einer festen Sampling-Konvention ab (z. B. minütlich oder in festen
Zeitschritten über die Tageslichtstunden) und prüft je Abtastpunkt, ob die
Zielfläche unverschattet besonnt ist — die Summe der besonnten Zeit ergibt
`stunden`. Das Ergebnis landet als `kosmo.sonnenstunden-result/v1`
(`stunden`, `kriteriumErfuellt`, `methode`) im Job-Record
(`BlenderSimJob.result`, siehe `packages/kosmo-contracts/src/blender-sim.ts`).
Dieselbe Ehrlichkeitsregel wie bei Wind/Gebäude-Energie gilt unverändert und
uneingeschränkt: NIE eine Sonnenstunden-Zahl erfinden. Ohne echten
Blender-Worker bleibt der Job `kein-blender-worker` — eine erfundene Zahl
sähe aus wie ein Analyseergebnis und könnte eine Bau-Entscheidung
verseuchen.

#### Blender-Worker-Runner (Fake-Referenzimplementierung, v0.8.10 / E1)

`kosmo_bridge/blender_worker.py` ist ein eigenständiger, **`bpy`-freier**
Dateisystem-Poller, der den `--store`-Ordner GENAU nach dem 4-Schritt-
Protokoll oben bearbeitet — als Prozess ausserhalb der Bridge, nicht als
Teil von `main.py`. Er ist die GERÄTE-Vorlage für das, was ein künftiger
echter Blender-Worker auf der HomeStation (5090) tun wird; im Repo steckt
dahinter ausschliesslich ein `FakeBerechner` (Pluggables
`Berechner`-Protokoll, `typing.Protocol`): `vis-`-Jobs bekommen ein
markiertes FAKE-Bild als `render-result.json` inkl. gespiegeltem
`requested_style`, `bake-`/`bsim-`-Jobs werden NIE gerechnet und landen
SOFORT auf `kein-blender-worker` (nie `running`/`done`, keine
Ergebnisdatei) — dieselbe Ehrlichkeitsgrenze wie überall in diesem Kapitel.

Aufruf gegen einen Test-Store (ein Pass, für Cron/Tests statt Dauerbetrieb):

```bash
python3 kosmo_bridge/blender_worker.py /tmp/kosmo-jobs --fake-worker --einmal
```

Ohne Angabe von `--einmal` pollt der Runner im Dauerbetrieb (`--intervall`,
Default 1.0 s) — geeignet als Vorlage für einen künftigen `systemd`-Dienst
auf der HomeStation.

**Exklusivitätsregel (verbindlich):** dieser Runner läuft NIE gleichzeitig
gegen eine Bridge, die selbst mit `--fake-worker` gestartet wurde. Der
interne Fake-Worker der Bridge (`main.py`, `_fake_worker_step`) und dieser
externe Runner sind **wechselseitig exklusiv** — beide würden sich denselben
Job-Store streitig machen (Doppel-Claims, gegenseitig überschriebene
`running`-Zustände). Für einen Store gilt also entweder
`kosmo-bridge --fake-worker` **oder** `blender_worker.py --fake-worker`,
nie beides zusammen.

Ein echter `bpy`-Berechner (headless Blender auf der HomeStation) entsteht
künftig als eigene Implementierung des `Berechner`-Protokolls — der Poller
selbst bleibt dabei unverändert. Dieses Repo bleibt weiterhin vollständig
`bpy`-frei (ROADMAP 179, hier nur präzisiert: der Runner *ruft* keinen
`bpy`-Code auf, er *definiert nur die Schnittstelle*, gegen die ein echter
Worker am Gerät später programmiert wird).

### Dev-Worker andocken (Auftragsbuch → Ausführung)

V2-Technik Block 2 (`docs/V2-TECHNIK-BLOCK2-BUILDPLAN.md`, Entscheid E3):
KosmoDev sammelt Aufträge im App-Auftragsbuch; der Owner übergibt sie per
Knopf «An HomeStation übergeben» als **Workorder** (`kosmodev.workorder/v1`,
Job-Typ `dev-`, eigenes Store-Verzeichnis `STORE/dev/<job_id>/`) an die
Bridge. Die Bridge speichert und vermittelt **nur Text** — sie führt NIE
selbst Code aus. Das folgende Protokoll ist normativ: **Claude Code an der
HomeStation** bedient es ohne Rückfragen.

1. **Offene Workorders sehen** — `GET /jobs/dev?status=queued` (Token-Header
   wie überall):

   ```bash
   curl -s -H "X-Kosmo-Token: GEHEIM" \
     "http://localhost:8600/jobs/dev?status=queued"
   ```

2. **Die Workorder holen** — `GET /jobs/dev/{id}/workorder` liefert die
   Aufträge als JSON (`kosmodev.workorder/v1`: `projekt`, `erzeugt_um`,
   `auftraege[]` mit `id`/`ts`/`text`/`quelle`/`station`/`ort?`). Dieselbe
   Workorder liegt daneben auch menschlich lesbar im Store unter
   `dev/<id>/workorder.md`, mit YAML-Frontmatter (`schema`, `job_id`,
   `projekt`, `erzeugt_um`, `auftrag_ids`) — praktisch, wenn du die Datei
   direkt im Store liest statt über die Bridge zu fragen.

   ```bash
   curl -s -H "X-Kosmo-Token: GEHEIM" \
     http://localhost:8600/jobs/dev/dev-1720000000-a1b2c3/workorder
   ```

3. **Claimen** — `POST /jobs/dev/{id}/claim` mit `{"worker": "<name>"}` setzt
   den Job von `queued` auf `running` und trägt den Worker-Namen ein
   (verhindert Doppelarbeit). Derselbe Name claimt idempotent nach (liefert
   den bestehenden `running`-Record zurück); ein **zweiter** Worker-Name auf
   einen bereits `running`-Job bekommt `409`.

   ```bash
   curl -s -X POST -H "X-Kosmo-Token: GEHEIM" -H "Content-Type: application/json" \
     -d '{"worker": "claude-code-homestation"}' \
     http://localhost:8600/jobs/dev/dev-1720000000-a1b2c3/claim
   ```

4. **Arbeiten — ausserhalb der Bridge.** Die Bridge ist an dieser Stelle
   fertig: sie hat vermittelt, sie rechnet nichts. Die eigentliche Arbeit
   läuft im Repo nach dem üblichen Arbeitsmuster dieses Projekts — je Auftrag
   Feature → Tests → ROADMAP-Eintrag → deutscher Commit. Kein Bridge-Aufruf
   in diesem Schritt.

5. **Ergebnis melden** — `POST /jobs/dev/{id}/result` mit einem
   `DevJobResult` (`worker`, `abgeschlossen_um`, `ergebnisse[]`; je Eintrag
   `auftrag_id`, `umgesetzt`, optional `commit`, optional `notiz`) setzt den
   Job auf `done`.

   ```bash
   curl -s -X POST -H "X-Kosmo-Token: GEHEIM" -H "Content-Type: application/json" \
     -d '{
       "worker": "claude-code-homestation",
       "abgeschlossen_um": "2026-07-07T21:00:00Z",
       "ergebnisse": [
         {"auftrag_id": "a-1", "umgesetzt": true, "commit": "a1b2c3d", "notiz": "Tests grün"}
       ]
     }' \
     http://localhost:8600/jobs/dev/dev-1720000000-a1b2c3/result
   ```

   **Ehrlichkeits-Regeln, serverseitig erzwungen** (Buildplan E5 — Belege
   werden nie gefaked, wie bei den Blender-Simulationen oben): `commit` ist
   NUR ein Beleg echter Arbeit — ein Result mit `worker: "fake-worker"` und
   gesetztem `commit`-Feld wird mit `400` abgewiesen. Auf einen bereits
   `cancelled`-Job wird gar kein Ergebnis mehr angenommen (`409`) — der
   Abbruch gewinnt.

**Env-Variablen dieses Protokolls:**

- `KOSMO_BRIDGE_MAX_WORKORDER` (Default 1 MB) — Deckel für den
  JSON-Body von `POST /jobs/dev` (reine Text-Payload, weit über jeder realen
  Auftragsliste, aber ein harter Riegel gegen Speicher-DoS).
- `KOSMO_BRIDGE_AUFTRAEGE_DIR` (Default aus) — optionaler Spiegel: ist der
  Pfad gesetzt, legt die Bridge die menschliche `workorder.md` zusätzlich
  dort ab (z. B. ein Repo-Verzeichnis `docs/auftraege/`). Ein kaputter
  Spiegelpfad verhindert die Job-Annahme nicht, wird aber in `message`
  benannt — best effort, kein stiller Fehlschlag.
