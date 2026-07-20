# HomeStation andocken — Schritt für Schritt

> **Owner-Kompass F12 (20.07.2026): Geräte-Termin in 2 Tagen.** Diese Anleitung
> ist das Andock-Paket dafür — am Gerät soll NICHTS mehr nachrecherchiert
> werden müssen. Sie ergänzt, nicht ersetzt:
> - `tools/homestation-bridge/README.md` («Worker andocken», Zeilen 189–311) —
>   das normative Protokoll, hier in Betreiber-Sprache nacherzählt.
> - `docs/ABNAHME-DREHBUCH.md` — der volle App-seitige Abnahme-Loop (Projekt
>   öffnen, Wand zeichnen, IFC-Export, …), inklusive der Kette-scharf-Schritte
>   1–7 unter «Kette scharf — HomeStation-Job-Lebenszyklus». Diese Anleitung
>   hier ist der Vorlauf davor: Bridge installieren, produktiv starten, Worker
>   andocken, ein PNG auf dem Bildschirm sehen — DANACH übernimmt das
>   Abnahme-Drehbuch.
> - `docs/HOMESTATION-AUFTRAG.md` — die Gesamtübersicht aller HomeStation-
>   Aufträge (GPU, Training, Netz/Konto), nicht nur die Render-Kette.

## 0. Was hier steht — und was bewusst NICHT

Diese Anleitung beschreibt **wie man den Worker andockt**: Bridge starten,
App verbinden, den Datei-Poller (`blender_worker.py`) andocken, und wie ein
**echter** `bpy`-Berechner **aussehen muss**, damit er ins bestehende
Protokoll passt. Sie enthält **keinen lauffähigen `bpy`-Code** — dieses Repo
bleibt bewusst vollständig `bpy`-frei (ROADMAP 179, in v0.8.9 per
Owner-Rückfrage bestätigt, in `blender_worker.py` nochmals präzisiert: kein
`bpy`-Import, kein GPL-Link). Abschnitt 5 unten ist **Drehbuch, kein Code** —
Signaturen und erwartete Rückgaben wörtlich, aber die eigentliche
`bpy`-Implementierung schreibst du lokal auf der HomeStation, ausserhalb
dieses Repos (oder in einem separaten, nicht ins Repo gepushten Ordner).

## 1. Voraussetzungen

| Was | Anforderung | Warum |
|---|---|---|
| **Python** | ≥ 3.10 (`tools/homestation-bridge/pyproject.toml: requires-python`) | Die Bridge (`fastapi`/`uvicorn`) und der Poller (`blender_worker.py`) laufen als eigenständiger Python-Prozess, unabhängig von Blender. |
| **Blender (headless)** | Eine aktuelle LTS-Version mit funktionierendem `--background`-Modus und dem eingebauten glTF-Importer (`bpy.ops.import_scene.gltf`, seit Blender 2.8 Standard) | Der künftige echte Berechner lädt `model.glb` in eine leere Szene und rendert/simuliert headless — ohne UI, ohne X-Server. Prüfen: `blender --version` UND `blender --background --python-expr "import bpy; print('ok')"` müssen fehlerfrei laufen, BEVOR du anfängst, den Berechner zu schreiben. |
| **GPU-Treiber** | Aktueller NVIDIA-Treiber + CUDA/OptiX für die RTX 5090, von Blender erkannt (Cycles-Präferenzen → GPU-Gerät sichtbar) | Ohne erkannte GPU rendert Cycles auf der CPU — technisch lauffähig, aber nicht das, was der Owner unter «echtem Rendering» versteht. |
| **Job-Store-Pfad** | Ein Verzeichnis, das die Bridge (`--store`) UND dein Berechner-Prozess LESEN+SCHREIBEN können, auf DEMSELBEN Rechner (keine Netzwerkfreigabe nötig, aber möglich) | Die Bridge und der Worker reden ausschliesslich über Dateien in diesem Ordner — kein RPC, kein zweiter Port. |
| **Firewall/Port** | Port `8600` (oder dein gewählter `--port`) offen für dein Büronetz, falls die App von einem anderen Gerät (iPad) zugreifen soll | Siehe README «Sicherheit» — `--host 0.0.0.0` ist eine bewusste Option, kein Default. |
| **Node.js** | Nur nötig, falls du zusätzlich den Sync-Server (`tools/sync-server`) für iPad-Tests brauchst — nicht Teil der Bridge selbst | Siehe `docs/ABNAHME-DREHBUCH.md` Vorbereitung Punkt 4. |

## 2. Installation (einmalig)

```bash
cd kosmo-orbit/tools/homestation-bridge
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -e ".[stt]"          # Basis + Whisper-STT (faster-whisper)
```

Optional, nur falls du die Serie-I-Lizenzprüfung (`KOSMO_BRIDGE_LIZENZ_PFLICHT`)
scharf schalten willst:

```bash
pip install -e ".[lizenz]"        # cryptography, bevorzugt
# oder, falls cryptography auf diesem System nicht baubar ist:
pip install -e ".[lizenz-pynacl]" # PyNaCl-Alternative
```

Ohne eine der beiden Bibliotheken bleibt `KOSMO_BRIDGE_LIZENZ_PFLICHT`
**fail closed** wirkungslos — jede Anfrage wird abgelehnt statt eine
Prüfung vorzutäuschen (README «Signierte Lizenz + Server-Bindung»). Das
betrifft NUR die optionale Lizenzprüfung, nicht den normalen Betrieb — für
den reinen Andock-Test unten ist dieser Schritt nicht nötig.

**Blender** installierst du separat (offizieller Installer/Paketmanager
deiner Wahl) — es ist keine Python-Abhängigkeit der Bridge, sondern ein
eigenständiger Prozess, den dein künftiger Berechner startet oder aus dem
heraus er läuft (`bpy`-Modul innerhalb von Blender selbst, siehe Abschnitt 5).

## 3. Bridge produktiv starten (OHNE `--fake-worker`)

**Es gibt kein separates «Echt»-Flag.** Der reale Betrieb ist der Default —
`--fake-worker` ist die AUSNAHME, die du für den Andock-Test in diesem
Container/zum Demo nutzt, aber am Gerät am Ende weglässt:

```bash
export KOSMO_BRIDGE_TOKEN=dein-geheimes-token          # nötig sobald --host 0.0.0.0
export KOSMO_OLLAMA_URL=http://127.0.0.1:11434
export KOSMO_WHISPER_MODEL=jayr23/whisper-large-v3-turbo-swiss-german-ct2
export KOSMO_BRIDGE_ORIGIN="http://homestation:5183"   # oder mehrere, komma-getrennt

kosmo-bridge --store /mnt/data/ArchitekturKosmos/render-jobs --host 0.0.0.0
```

- **`--store`**: derselbe Ordner, den dein Berechner/Poller unten überwacht.
  Ohne explizites `--store` (und ohne `KOSMO_JOB_STORE`) landet Port 8600
  bewusst bei `/tmp/kosmo-jobs` (Alt-Verhalten, H-31) — für den Dauerbetrieb
  am Gerät setzt du `--store` trotzdem explizit auf einen dauerhaften Pfad
  (nicht `/tmp`, das räumt das OS irgendwann leer).
- **Ohne `KOSMO_BRIDGE_TOKEN` verweigert `--host 0.0.0.0` den Start**
  (Exit-Code 1, Serie I / I2-Nachtrag) — Token setzen (wie oben) oder bewusst
  `--offen-ohne-token` / `KOSMO_BRIDGE_OFFEN=1`. Rein lokal (`--host
  127.0.0.1`, Default) ist kein Token nötig.
- **`--fake-worker` NICHT setzen** — das ist der einzige Unterschied zwischen
  Demo/Test und produktivem Start. Ohne dieses Flag beantwortet die Bridge
  Jobs NICHT selbst (kein `_fake_worker_step`/`_fake_worker_loop`) — sie
  wartet auf einen externen Worker (Abschnitt 4).
- **Freigabe-Pflicht** (`KOSMO_BRIDGE_APPROVAL_PFLICHT=1`, empfohlen für den
  Produktivbetrieb): jeder teure Job (Render, Blender-Sim, Video→Splat)
  startet in `awaiting_approval` und läuft erst nach explizitem `POST
  /jobs/{id}/approve` — kein GPU-Lauf ungefragt.
- **GPU-Leerlauf-Fenster** (`KOSMO_BRIDGE_GPU_IDLE`, im Container simuliert
  — am Gerät ist das die Stelle, an der dein Worker `nvidia-smi`-Auslastung +
  ein Zeitfenster prüft, BEVOR er einen `queued`-Job claimt, s. Abschnitt 4
  Schritt 1).

**App-Verbindung:** KosmoOrbit → KosmoVis → Einstellungen → Bridge-URL
eintragen, z. B. `http://homestation:8600` (oder `http://127.0.0.1:8600` bei
lokalem Test). Ist ein Token gesetzt, gehört er ins selbe Einstellungsfeld —
die App schickt ihn dann als `X-Kosmo-Token`-Header mit.

## 4. Runner andocken (4-Schritt-Protokoll)

Das normative Protokoll steht wörtlich in `README.md` («Worker andocken»,
Zeilen 189–208) — hier in Betreiber-Sprache, plus die eine harte Regel, die
am Gerät am leichtesten übersehen wird.

1. **`queued`-Job holen — nur wenn die GPU frei ist.** Dein Worker
   überwacht den `--store`-Ordner. `render-scene.json` + `model.glb` liegen
   bereits im Job-Ordner (die Bridge hat sie beim `POST /jobs` dort
   abgelegt) — dein Worker muss sie nur LESEN, nicht selbst entgegennehmen.
2. **Auf `running` setzen, `worker` + `progress` schreiben.** Ab jetzt zeigt
   die App am Render-Node deinen Worker-Namen (NICHT `"fake-worker"`!) und
   den Fortschritt live. `progress.pct` läuft von 0 bis 1 — je öfter du es
   während des Renderns aktualisierst, desto flüssiger sieht es im UI aus.
3. **Vor dem Ergebnis-Schreiben den Job-Record FRISCH von der Platte
   lesen.** Steht dort inzwischen `cancelled` (ein Nutzer hat währenddessen
   abgebrochen), brichst du ab — KEIN `render-result.json` schreiben, der
   Status bleibt `cancelled`. Das ist der kooperative Abbruch — er
   funktioniert nur, wenn du WIRKLICH neu von der Platte liest und nicht den
   Stand von Schritt 1 weiterbenutzt.
4. **`render-result.json` (Vertrag `kosmovis.render-result/v2`) neben das
   `job.json` legen, dann `status: done` + `progress.pct: 1.0` setzen.**
   `GET /jobs/{id}` bettet die Ergebnisdatei automatisch in den
   zurückgegebenen Record ein — dein Worker muss die App nicht separat
   benachrichtigen.

**Exklusivitätsregel (verbindlich):** pro Job-Store läuft **entweder**
`kosmo-bridge --fake-worker` **oder** dein Runner (z. B. `blender_worker.py
--fake-worker` im Demo-Fall, oder dein echter Berechner-Prozess) — **niemals
beide gleichzeitig gegen denselben `--store`-Ordner**. Beide Wege claimen
Jobs nach demselben Muster; laufen sie parallel, entstehen Doppel-Claims und
gegenseitig überschriebene `running`-Zustände. Für den produktiven Start in
Abschnitt 3 heisst das konkret: **`--fake-worker` bleibt weg**, sobald ein
echter Worker an demselben Store hängt.

**Zum Kennenlernen des Protokolls ohne eigenen Code:** die im Repo
mitgelieferte Referenzimplementierung (`kosmo_bridge/blender_worker.py`,
komplett `bpy`-frei) bedient genau dieses 4-Schritt-Protokoll gegen einen
Test-Store:

```bash
python3 kosmo_bridge/blender_worker.py /tmp/kosmo-jobs --fake-worker --einmal
```

Das ist die GERÄTE-VORLAGE, nicht der echte Worker — sie zeigt nur den
Datei-Poller (claim → running → frisch lesen → Ergebnis schreiben), rechnet
aber nie echt (siehe Abschnitt 5).

## 5. Echten `bpy`-Berechner schreiben (Interface-Doku, kein Code)

Der Poller in `kosmo_bridge/blender_worker.py` bleibt **unverändert** — er
ruft nur eine Implementierung des `Berechner`-Protokolls auf. Ein echter
Worker tauscht **ausschliesslich** diese eine Klasse aus. Das Protokoll
(`typing.Protocol`, wörtlich aus `kosmo_bridge/blender_worker.py`):

```python
class Berechner(Protocol):
    def render(self, job_dir: Path, record: dict) -> ErgebnisEntscheid: ...
    def bake(self, job_dir: Path, record: dict) -> ErgebnisEntscheid: ...
    def blender_sim(self, job_dir: Path, record: dict) -> ErgebnisEntscheid: ...
```

Der Rückgabetyp, ebenfalls wörtlich (Dataclass-Felder):

```python
@dataclass
class ErgebnisEntscheid:
    ziel_status: str                              # z.B. "done" oder "kein-blender-worker"
    worker: str                                    # DEIN Worker-Name — NIE "fake-worker"/"blender-worker-fake"
    ergebnis_dateiname: str | None = None          # z.B. "render-result.json"
    ergebnis_inhalt: dict | None = None            # der JSON-Inhalt dieser Datei
    binaerdateien: dict[str, bytes] = field(default_factory=dict)  # {dateiname: rohe Bytes}
    nachricht: str | None = None                   # menschenlesbarer Log-Text
```

Der Poller ruft `render()`/`bake()`/`blender_sim()` mit `job_dir` (dem
Job-Ordner, in dem `model.glb` + die Szenen-JSON bereits liegen) und
`record` (dem frisch gelesenen `job.json`-Inhalt) auf — deine Methode liest
daraus, was sie zum Rechnen braucht, und gibt eine `ErgebnisEntscheid`
zurück; der Poller kümmert sich um Pfad-Sicherheit (`sicherer_zielpfad`) und
ums Schreiben.

### Was `render()` konkret zurückgeben muss

Zieljob: `vis-…`-Jobs, Szene in `job_dir/render-scene.json`
(`scene.geometry.path` zeigt auf `job_dir/model.glb`).

- `ziel_status="done"`.
- `ergebnis_dateiname="render-result.json"`, `ergebnis_inhalt` nach
  `kosmovis.render-result/v2` (`packages/kosmo-contracts/src/render-result.ts`):
  `schema` (Literal `"kosmovis.render-result/v2"`), `job_id`, `images: string[]`
  (Dateinamen, die du auch in `binaerdateien` mitlieferst), optional
  `ai_variant`, `qa: {style?, geometry?, verdict: {passed, reason?}}`.
- `binaerdateien={dein_bildname: <PNG/JPG-Bytes>}` — der Dateiname MUSS mit
  einem Eintrag in `images` übereinstimmen.
- **Ehrlichkeitsregel:** `qa.style.method`/`qa.geometry.method` tragen den
  NAMEN DES ECHTEN VERFAHRENS (z. B. `"dinov3"`/`"depthanything-v2-redepth"`,
  siehe Contract-Defaults), NIE `"fake-worker"` oder `"blender-worker-fake"`
  — und `result["fake"]` bleibt UNGESETZT (kein `"fake": True`-Schlüssel).
  Das ist genau das Merkmal, an dem `verifiziere_andocken.py` (Abschnitt 6)
  FAKE von echt unterscheidet.
- **`requested_style`-Spiegelung** (v0.8.9 §9 E9): `record.get("requested_style")`
  ins Ergebnis übernehmen, unverändert — was BESTELLT wurde, nicht neu
  interpretiert. Bei `style.mode == "lineart"` (aus der Szene, nicht aus
  `requested_style` allein) rechnest du entweder über Cycles + Freestyle-
  Kantenrenderer oder über einen Grease-Pencil-Line-Art-Modifier — beide
  liefern ein Bild, keinen separaten Datentyp (README «Line-Art»).
- `requested_engine` (`"cycles"` vs. `"ki"`, aus dem Job-Record) bestimmt, ob
  du nach dem Cycles-Render zusätzlich eine KI-Veredelung anstösst oder das
  reine Cycles-Bild als Endergebnis lieferst.

### Was `bake()` konkret zurückgeben muss

Zieljob: `bake-…`-Jobs, Szene in `job_dir/bake-job.json`
(`kosmo.bake-job/v1`, `packages/kosmo-contracts/src/bake-job.ts`).

- Feste Reihenfolge: ist `params.decimateRatio` gesetzt, ZUERST decimieren,
  DANN Smart-UV-Unwrap, ERST DANACH den AO-Bake — ein Bake auf ein noch
  unentfaltetes oder noch nicht reduziertes Mesh erzeugt eine Textur, die
  zur falschen Geometrie passt.
- Erfolgreich: `ziel_status="done"`, `ergebnis_dateiname` z. B.
  `"bake-result.json"`, Inhalt nach `kosmo.bake-result/v1`: `schema`
  (Literal), `baked_glb` (Pfad/Name des fertigen GLB), `method`, optional
  `triangles_before`/`triangles_after` (nur gesetzt, wenn tatsächlich
  decimiert wurde). Das fertige GLB gehört in `binaerdateien` (oder wird von
  dir direkt unter `out` abgelegt — beides muss innerhalb von `job_dir`
  bleiben, `sicherer_zielpfad` prüft das).
- **Ehrlichkeitsregel, schärfer als beim Bild:** ein unverändertes
  Eingangs-GLB, das kommentarlos als `baked_glb` zurückgereicht wird, ist
  eine UNSICHTBARE Falschbehauptung — die Geometrie sähe exakt gleich aus.
  Kein Pass-Through, niemals.

**Bekannte Lücke im heutigen Poller (wichtig, bevor du hier Zeit
investierst):** die Poller-Funktion, die `bake()`/`blender_sim()` aufruft
(`_schritt_sofort_kein_worker`), übernimmt aus deiner `ErgebnisEntscheid`
aktuell NUR `ziel_status`, `worker` und `nachricht` ins `job.json` — sie
schreibt `ergebnis_dateiname`/`ergebnis_inhalt`/`binaerdateien` NICHT auf
die Platte (empirisch geprüft: ein `Berechner`, dessen `bake()`/
`blender_sim()` `ziel_status="done"` mit vollem `ergebnis_inhalt`
zurückgibt, hinterlässt trotzdem NUR ein `job.json` mit `status: "done"` —
ohne Ergebnisdatei, ohne Binärdatei). Zusätzlich bettet `GET /jobs/{id}`
in `main.py` bislang nur `render-result.json` und `bake-result.json` ein,
keine `sonnenstunden-result.json`. **Für `bake()` bedeutet das:** dein
`ergebnis_dateiname`/`ergebnis_inhalt` wird vom Poller zwar ignoriert, aber
`bake-result.json` wird trotzdem korrekt eingebettet, WENN du sie zusätzlich
selbst direkt in `job_dir` schreibst (statt dich auf den Rückweg über
`ErgebnisEntscheid` zu verlassen) — das ist ein Workaround, kein
sauberer Weg, aber er funktioniert innerhalb des heutigen, unveränderten
Pollers. **Für `blender_sim()` fehlt sogar dieser Einbettungsweg** (kein
Merge-Code in `main.py` für einen Sim-Ergebnis-Dateinamen) — ein reales
`done`-Sonnenstunden-Ergebnis würde heute NICHT über `GET /jobs/{id}`
sichtbar. Bevor du produktiv Bake/Blender-Sim ans Laufen bringst, gehört
diese Poller-/Bridge-Lücke geschlossen (`blender_worker.py`/`main.py` sind
für DIESES Andock-Paket bewusst tabu — das ist ein eigenes, kleines
Folgepaket). Render ist von dieser Lücke NICHT betroffen: der volle
`running → done`-Zyklus mit Ergebnisdatei ist dort bereits verdrahtet und
funktioniert (Abschnitt 6 beweist das).

### Was `blender_sim()` konkret zurückgeben muss

Zieljob: `bsim-…`-Jobs, Szene in `job_dir/blender-sim.json`
(`kosmo.blender-sim/v1`, `packages/kosmo-contracts/src/blender-sim.ts`),
`record["art"]` ∈ `{"wind", "sonnenstunden", "gebaeude-energie"}`.

- **`art == "sonnenstunden"`**: `params` enthält mindestens `lat`, `lon`,
  ein ISO-`datum`, optional `kriteriumStunden` (Default 3). Tastet den
  Sonnenstand über den Tag in einer festen Sampling-Konvention ab (z. B.
  minütlich oder in festen Zeitschritten über die Tageslichtstunden) und
  prüft je Abtastpunkt, ob die Zielfläche unverschattet besonnt ist — die
  Summe ergibt `stunden`. Ergebnis nach `kosmo.sonnenstunden-result/v1`:
  `schema` (Literal), `stunden: number`, `kriteriumErfuellt: boolean`
  (`stunden >= kriteriumStunden`), `methode: string` (der ECHTE
  Verfahrensname, nie `"fake-worker"`-artig).
- **`art == "wind"` / `"gebaeude-energie"`**: noch kein Ergebnis-Contract im
  Repo definiert (nur `sonnenstunden` hat heute `SonnenstundenResult`) —
  bevor du hier rechnest, ein passendes Result-Schema in
  `packages/kosmo-contracts/src/blender-sim.ts` ergänzen (additiv, analog
  `SonnenstundenResult`), sonst hat die App kein Format, das sie anzeigen
  kann.
- **Ehrlichkeitsregel, die härteste im ganzen System:** eine Platzhalter-
  SIMULATIONSZAHL sähe aus wie ein echtes Analyseergebnis und könnte eine
  Bau-Entscheidung verseuchen. `ziel_status="kein-blender-worker"` bleibt
  IMMER die richtige Antwort, solange du dir bei einem Zwischenschritt nicht
  sicher bist — nie eine Zahl raten oder interpolieren, um „irgendein"
  Ergebnis zu liefern.
- Siehe auch die Poller-Lücke oben (gilt hier genauso, plus der fehlende
  `main.py`-Einbettungsweg).

### Pseudocode-Skizze (Drehbuch, kein `bpy`-Import)

Nur zur Orientierung, WELCHE Schritte ein echter `render()` typischerweise
macht — kein gültiges Python, absichtlich nicht copy-paste-fähig:

```
FUNKTION render(job_dir, record):
    szene := lies_json(job_dir / "render-scene.json")
    STARTE eine leere Blender-Szene (headless)
    IMPORTIERE szene.geometry.path als glTF hinein
    SETZE Kamera(s), Licht, Materialien gemäss szene
    WENN szene.style.mode == "lineart":
        RECHNE über Freestyle-Kantenrenderer ODER Grease-Pencil-Line-Art
    SONST:
        RECHNE über Cycles (GPU, OptiX) — reines Bild
        WENN record.requested_engine == "ki":
            VEREDLE das Cycles-Bild über die KI-Pipeline (Qwen-Backbone)
    SCHREIBE das/die fertige(n) Bild(er) als Bytes
    BERECHNE echte QA-Werte (Stil-Score, Geometrie-Treue) — KEINE erfundenen Zahlen
    GIB ErgebnisEntscheid(
        ziel_status="done",
        worker="<dein-worker-name>",
        ergebnis_dateiname="render-result.json",
        ergebnis_inhalt={... kosmovis.render-result/v2 ...},
        binaerdateien={"cam-01.png": <bildbytes>},
        nachricht="echt gerendert",
    ) ZURÜCK
```

## 6. Verifikations-Checkliste — woran erkennt man, dass es läuft

1. **Bridge erreichbar:** `curl http://<host>:8600/health` → `"ok": true`,
   `"gpu"`-Feld FEHLT (kein `--fake-worker` mehr) bzw. zeigt den echten
   GPU-Namen, falls dein Worker das später an `/health` anschliesst.
2. **Job-Status-Kette:** `GET /jobs/{id}` zeigt den Übergang
   `queued → running → done` — NICHT sofort `done` (ein echter Render
   braucht Sekunden bis Minuten) und `worker` ist NICHT `"fake-worker"`.
3. **Echtes Bild statt FAKE-Markierung:** `render-result.json` hat KEIN
   `"fake": true`, `qa.style.method`/`qa.geometry.method` sind KEIN
   `"fake-worker"`/`"blender-worker-fake"`, und das heruntergeladene PNG ist
   NICHT die bekannte einfarbige Kupferfläche.
4. **App zeigt das Bild:** am Render-Node in KosmoVis erscheint das Bild
   (nicht der Platzhalter-Rahmen), Worker-Name + 100 % Fortschritt sichtbar.
5. **Automatisiert nachprüfen:**

   ```bash
   python3 tools/homestation-bridge/verifiziere_andocken.py --url http://<host>:8600
   ```

   Das Skript fährt genau diese Kette automatisch ab (Bridge erreichbar →
   Job einstellen → Statuskette beobachten → Schema validieren → FAKE vs.
   echt unterscheiden) und meldet am Ende klar, welcher Fall zutrifft.
   Exit-Code 0 heisst „die Mechanik funktioniert" — lies die Ausgabe
   trotzdem: bei einem noch nicht angeschlossenen echten Worker meldet es
   ehrlich den FAKE-Fall (siehe Abschnitt 7 unten für den Testlauf gegen die
   Container-Fake-Bridge).

## 7. Fehlerbild-Tabelle — die 5 wahrscheinlichsten Probleme

| # | Symptom | Wahrscheinlichste Ursache | Diagnose-Kommando |
|---|---|---|---|
| 1 | Bridge startet nicht / `Address already in use` | Port 8600 ist schon belegt (alte Bridge-Instanz läuft noch, oder ein anderer Dienst) | `lsof -i :8600` (Linux/macOS) bzw. `netstat -ano \| findstr 8600` (Windows); alten Prozess beenden oder `--port` wechseln. |
| 2 | Job bleibt für immer `queued`, Runner claimt nie | (a) Store-Pfad von Bridge und Worker stimmen nicht überein, (b) `KOSMO_BRIDGE_GPU_IDLE=0`/GPU als belegt erkannt | Bridge-Log prüfen: Startzeile `Job-Store: <pfad>` — läuft dein Worker gegen GENAU diesen Pfad? `ls <store>/<job_id>/job.json` muss existieren. GPU-Idle-Fenster/`nvidia-smi`-Schwelle deines Worker-Codes prüfen. |
| 3 | Runner claimt nicht, oder claimt denselben Job doppelt/überschreibt `running` | Exklusivitätsregel verletzt — Bridge selbst UND externer Runner laufen mit `--fake-worker`/echtem Worker gleichzeitig gegen denselben Store | `ps aux \| grep -E "main.py \|blender_worker.py\|<dein-worker-prozess>"` — es darf nur EIN Prozess gegen diesen `--store` claimen. |
| 4 | Job hängt in `cancelled`, obwohl er eigentlich weiterlaufen sollte — oder umgekehrt: `cancel` wird ignoriert, Job landet trotzdem auf `done` | Worker liest den Record vor dem Ergebnis-Schreiben NICHT frisch von der Platte (Schritt 3 des Protokolls übersprungen) — Race zwischen `/cancel` und dem teuren Schritt | `GET /jobs/{id}` mehrfach kurz hintereinander pollen, `updated_at`-Zeitstempel vergleichen; im eigenen Worker-Code sicherstellen, dass der Record UNMITTELBAR vor dem Schreiben neu von der Platte gelesen wird, nicht der Stand vom Claim-Zeitpunkt. |
| 5 | Ergebnis ist da (`status: done`), aber die App zeigt kein Bild | (a) falsche/veraltete Bridge-URL in den Einstellungen, (b) CORS blockiert (`KOSMO_BRIDGE_ORIGIN` passt nicht zum tatsächlichen App-Origin), (c) Token falsch/fehlt | Artefakt direkt testen: `curl -H "X-Kosmo-Token: …" http://<host>:8600/jobs/{id}/artifacts/<bild>.png -o test.png` — kommt ein gültiges PNG an? Browser-Devtools → Netzwerk-Tab auf 401/403/CORS-Fehler prüfen; `KOSMO_BRIDGE_ORIGIN` auf den tatsächlichen App-Origin (Protokoll+Host+Port) setzen. |

Allgemeiner Fallback: `Kosmo-Panel → Zahnrad → Diagnose` in der App prüft
Kern, Ableitung, LLM, Bridge, Wissensbasis, Speicher und benennt konkret, was
fehlt (`docs/ABNAHME-DREHBUCH.md` «Wenn etwas klemmt»).
