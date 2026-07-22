# HOMEPC-RENDER-WORKER — ComfyUI scharf schalten (andrins-workstation)

**Zweck:** Runbook für den lokalen Home-PC-Worker, der den echten
Render-Worker (`tools/homestation-bridge/kosmo_bridge/kosmo_worker_comfyui.py`,
V090-SPEZ §E-R) auf der Hardware ans Laufen bringt. Muster/Stil wie
`docs/HOMEPC-WORKER-PROMPT.md` (Auftrag B dort — Bridge/Sync/App — bleibt
unverändert gültig, dieses Dokument ergänzt NUR den ComfyUI-Render-Worker).
Repo liegt unter `~/Architektur-Cosmos` (`kosmo-orbit/`), Branch
`claude/kosmo-orbit-v1-build-pzxkbj`, Tailnet-IP dieser Maschine
`100.88.48.73`, Benutzer `andrin-baumann`.

**Ehrliche Arbeitsteilung (V090-SPEZ, «fortgeltende Grenze»):** der
Cloud-Worker hat den Code, die Tests und dieses Runbook gebaut — er erreicht
das Tailnet NICHT und hat KEINE GPU. Alles unten (ComfyUI installieren,
Modell wählen, systemd, GPU-Beweis) macht der lokale Home-PC-Worker oder der
Owner im Hardware-Rundgang (E-V). Ein Hardware-Beweis ist NIE durch einen
Container-Beweis ersetzbar.

## 0. Referenzen (lesen, sie sind die Wahrheit)

- `tools/homestation-bridge/README.md` §«Worker andocken» — das normative
  4-Schritt-Protokoll, das dieser Worker exakt bedient.
- `tools/homestation-bridge/kosmo_bridge/kosmo_worker_comfyui.py` — der
  Worker selbst (ausführlicher Modul-Docstring, deckt Idle-Gate,
  ComfyUI-Adapter, Prompt-Graph, Ehrlichkeitsgrenzen).
- `docs/VPN-HOMEPC-ANLEITUNG.md` §9/§10 — Bridge/Sync/App als systemd,
  Tailnet-Firewall. Dieser Render-Worker kommt als **fünfter** Dienst dazu.
- `docs/HOMEPC-WORKER-PROMPT.md` — Auftrag B (Bridge/Sync/App-systemd) läuft
  bereits; dieses Dokument ist der Nachtrag NUR für ComfyUI + den
  Render-Worker.

## 1. OFFENE OWNER-FRAGE — Modellwahl (zuerst klären, bevor gerendert wird)

**Der Cloud-Worker kann diese Entscheidung nicht treffen** — er hat weder
GPU noch Zugriff auf Modell-Lizenzen/Downloads. Vor dem ersten echten Render
muss der Owner (oder der Home-PC-Worker mit dem Owner) festlegen:

1. **Welcher Checkpoint** in `ComfyUI/models/checkpoints/` installiert wird
   (z. B. ein SDXL-Base-Derivat, Flux-Krea oder Flux2-Klein — der Vertrag
   `render-scene.ts` kennt `vis.backbone: 'qwen' | 'flux2-klein' |
   'flux-krea' | 'sdxl'`, aber der minimale Txt2Img-Adapter in diesem
   Worker (Stand E-R) rendert IMMER über den EINEN konfigurierten
   `--checkpoint`-Dateinamen — eine backbone-abhängige Modellwahl ist NICHT
   Teil dieses Pakets, siehe §5 Ehrlichkeitsgrenzen).
2. **Lizenz/Herkunft** des Checkpoints (kommerzielle Nutzung? Architektur-
   Renderings sind ein gewerblicher Kontext).
3. **VRAM-Budget** der RTX 5090 (32 GB) — ein grosses Flux-Modell braucht
   deutlich mehr als ein SDXL-Turbo-Derivat; Owner entscheidet Qualität vs.
   Geschwindigkeit.

Bis diese Frage beantwortet ist, bleibt `KOSMO_RENDER_WORKER_CHECKPOINT`
UNGESETZT — der Worker meldet dann ehrlich jeden Job als
`kein-render-worker` mit der Begründung "Modellwahl ist eine offene
Owner-Frage" (siehe `kosmo_worker_comfyui.py::pruefe_faehigkeit`). Das ist
KEIN Fehler, sondern die vorgesehene Ehrlichkeitsgrenze, solange §1 offen
ist.

## 2. ComfyUI installieren (Ubuntu, eigener venv)

**PEP-668-Lehre (Owner-Fund 21.07., bereits in `VPN-HOMEPC-ANLEITUNG.md`
§Schritt 4 dokumentiert):** neuere Ubuntu-Versionen sperren `pip install`
ins System-Python. ComfyUI bekommt einen **eigenen** venv, getrennt vom
Bridge-venv (`kosmo-orbit/.venv`) — die GPU-Torch-Abhängigkeiten von ComfyUI
sind schwer und haben ein eigenes Versions-Regime, das nicht mit
`fastapi`/`uvicorn`/`httpx` der Bridge vermischt werden soll.

```bash
cd ~
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
python3 -m venv .venv        # falls es meckert: sudo apt install python3-venv
.venv/bin/pip install --upgrade pip
```

**RTX-5090-Achtung (Blackwell, sehr neue Karte):** Standard-`pip install
torch` kann für die 5090 zu alt sein (fehlende `sm_120`-Kernel). Zuerst
prüfen, welche CUDA-Version der installierte Treiber meldet
(`nvidia-smi` → oben rechts "CUDA Version"), dann die passende Torch-Version
von https://pytorch.org/get-started/locally/ wählen (ggf. den `cu12x`- oder
Nightly-Kanal). Danach erst ComfyUIs eigene Abhängigkeiten:

```bash
# Beispiel — die EXAKTE Torch-Zeile hängt vom Treiber ab, siehe oben:
.venv/bin/pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
.venv/bin/pip install -r requirements.txt
```

Modell ablegen (nach der Owner-Entscheidung aus §1):

```bash
# Datei muss GENAU so heissen, wie sie später --checkpoint bekommt:
cp <heruntergeladene-datei>.safetensors ~/ComfyUI/models/checkpoints/
```

Probelauf (im Vordergrund, NICHT im Tailnet erreichbar machen — ComfyUI
selbst bekommt keinen Bridge-Token-Schutz, darum nur `127.0.0.1`):

```bash
cd ~/ComfyUI
.venv/bin/python main.py --listen 127.0.0.1 --port 8188
```

Verifikation von einem zweiten Terminal:

```bash
curl -s http://127.0.0.1:8188/system_stats | head -c 200
curl -s http://127.0.0.1:8188/object_info/CheckpointLoaderSimple | python3 -c \
  "import json,sys; d=json.load(sys.stdin); print(d['CheckpointLoaderSimple']['input']['required']['ckpt_name'][0])"
```

Der zweite Befehl muss den installierten Checkpoint-Dateinamen auflisten —
genau dieser String geht später in `KOSMO_RENDER_WORKER_CHECKPOINT`.

## 3. Den Render-Worker gegen ComfyUI + die Bridge testen (Vordergrund)

Bridge und Worker teilen sich den `--store`-Ordner — derselbe Pfad, den
`kosmo-bridge --store …` überwacht (README, Abschnitt "Start"):

```bash
cd ~/Architektur-Cosmos/kosmo-orbit
# Terminal 1 — die echte Bridge (kein --fake-worker!):
.venv/bin/python tools/homestation-bridge/kosmo_bridge/main.py \
  --store /mnt/data/ArchitekturKosmos/render-jobs --port 8600

# Terminal 2 — der Render-Worker:
.venv/bin/python tools/homestation-bridge/kosmo_bridge/kosmo_worker_comfyui.py \
  --store /mnt/data/ArchitekturKosmos/render-jobs \
  --comfyui-url http://127.0.0.1:8188 \
  --checkpoint <DATEINAME-AUS-SCHRITT-2>.safetensors \
  --worker-name comfyui-worker-andrins-workstation
```

Ein Job über `curl` anstossen (ohne App, reiner Protokolltest — braucht ein
`model.glb`, notfalls ein triviales Test-GLB):

```bash
curl -s -X POST http://127.0.0.1:8600/jobs \
  -F 'scene={"schema":"kosmovis.render-scene/v1","style":{"prompt":"Sichtbeton-Fassade, Morgenlicht"},"render":{"resolution":[1024,640],"samples":30}}' \
  -F 'model=@/pfad/zu/irgendeinem/model.glb;type=model/gltf-binary'
```

Erwartung: `job.json` durchläuft `queued → running → done`, `progress.pct`
klettert sichtbar (`curl http://127.0.0.1:8600/jobs/<id>` wiederholt
aufrufen), am Ende liegt ein echtes PNG im Job-Ordner und
`render-result.json` trägt `qa.verdict.passed: true` mit einer Begründung,
die den Checkpoint nennt (kein erfundener Stil-/Geometrie-Score, siehe §5).

## 4. systemd — Dauerbetrieb

**Zwei neue Units** (zusätzlich zu den vieren aus
`docs/HOMEPC-WORKER-PROMPT.md` Auftrag B): ComfyUI selbst und der
Render-Worker. Beide NUR lokal (`127.0.0.1`) — ComfyUI hat keinen eigenen
Auth-Schutz, darum bleibt es hinter der Bridge verborgen, nie direkt im
Tailnet.

`sudo tee /etc/systemd/system/kosmo-comfyui.service`:
```ini
[Unit]
Description=ComfyUI (lokal, :8188 — NICHT im Tailnet, nur vom Render-Worker erreicht)
After=network.target

[Service]
User=andrin-baumann
WorkingDirectory=/home/andrin-baumann/ComfyUI
ExecStart=/home/andrin-baumann/ComfyUI/.venv/bin/python main.py --listen 127.0.0.1 --port 8188
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

`sudo tee /etc/systemd/system/kosmo-render-worker.service`:
> **VOR dem Kopieren lesen (Matrix-C-2-Befund 22.07.2026):** **`--store`-Pfad muss WORTGLEICH mit dem `kosmo-bridge.service`-`--store`
> übereinstimmen** (`docs/VPN-HOMEPC-ANLEITUNG.md` §9 zeigt die Bridge-Unit
> — falls sie dort ohne explizites `--store` läuft, prüfen, welchen Pfad
> `_store_fuer()`/`KOSMO_JOB_STORE` tatsächlich wählt, und denselben hier
> eintragen — sonst bleibt jeder Job für immer `queued`, der Worker sieht ihn
> nie, siehe `docs/HOMESTATION-ANDOCKEN.md` Fehlertabelle Zeile 2).

```ini
[Unit]
Description=KosmoOrbit Render-Worker (ComfyUI-Adapter, V090-SPEZ E-R)
After=network-online.target kosmo-bridge.service kosmo-comfyui.service
Wants=kosmo-comfyui.service

[Service]
User=andrin-baumann
WorkingDirectory=/home/andrin-baumann/Architektur-Cosmos/kosmo-orbit
# Checkpoint erst setzen, NACHDEM §1 (Modellwahl) mit dem Owner geklärt ist —
# ungesetzt bleibt jeder Job ehrlich "kein-render-worker" (kein Fehler).
Environment=KOSMO_RENDER_WORKER_CHECKPOINT=HIER-CHECKPOINT-DATEINAME-EINSETZEN
ExecStart=/home/andrin-baumann/Architektur-Cosmos/kosmo-orbit/.venv/bin/python \
  tools/homestation-bridge/kosmo_bridge/kosmo_worker_comfyui.py \
  --store /mnt/data/ArchitekturKosmos/render-jobs \
  --comfyui-url http://127.0.0.1:8188 \
  --worker-name comfyui-worker-andrins-workstation
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```


**GPU-Idle-Fenster als Owner-Parameter** (Default im Worker: Zeitfenster
22–06 Uhr, Auslastungsschwelle 10 % via `nvidia-smi`) — überschreibbar:

```ini
ExecStart=... --idle-fenster-start 20 --idle-fenster-ende 7 --idle-schwelle-prozent 15
```

Aktivieren + prüfen:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now kosmo-comfyui kosmo-render-worker
systemctl status kosmo-comfyui kosmo-render-worker --no-pager | head -30
journalctl -u kosmo-render-worker -f     # Live-Log, sollte Claims/Fertigstellungen zeigen
```

## 5. Prüfreihe (Pflicht vor dem Owner-Rundgang E-V)

1. **Dienste laufen**: `systemctl status kosmo-bridge kosmo-comfyui
   kosmo-render-worker --no-pager` — alle drei `active (running)`.
2. **Job über die App anstossen**: KosmoOrbit → KosmoVis → Render-Node →
   Senden. `GET /jobs/<id>` (oder der App-Node selbst) zeigt
   `status: "running"`, `worker: "comfyui-worker-andrins-workstation"`
   (**Abnahme-Beweis, `docs/HOMESTATION-AUFTRAG.md` §1c: `worker` ≠
   `"fake-worker"`**).
3. **Progress live**: `progress.pct` steigt sichtbar zwischen zwei
   `GET /jobs/<id>`-Aufrufen (oder am Node in der App) — der Wert ist eine
   Zeit-Schätzung während des Wartens, siehe §6, aber `pct: 1.0` bei `done`
   ist exakt.
4. **Echtes Bild im Client**: die App zeigt das gerenderte Bild (kein
   Kupferton-Platzhalter des Fake-Workers) am Node/Blatt.
5. **Abbruch-Probe**: einen laufenden Job über den App-Knopf/`POST
   /jobs/<id>/cancel` abbrechen — Job endet `cancelled`, KEIN Bild
   erscheint nachträglich.
6. **Idle-Fenster-Probe**: `sudo systemctl stop kosmo-render-worker`,
   Testlauf mit `--idle-override belegt` von Hand starten, Job bleibt
   `queued` — dann wieder den normalen systemd-Dienst starten.
7. **Ehrlichkeits-Probe**: `sudo systemctl stop kosmo-comfyui`, neuen Job
   schicken → Status muss `kein-render-worker` werden (nie `running`/
   `done`) — dann ComfyUI wieder starten.

Ergebnisse (rohe `systemctl status`-/`curl`-Ausgaben, Screenshot des
Bildes im Client) gehören in den Owner-/Worker-Bericht für E-V
(`docs/V090-SPEZ.md` Sanktion 5: Hardware-Behauptungen ohne Rundgang-Beleg
sind ungültig).

## 6. Ehrlichkeitsgrenzen (was dieser Worker NICHT tut — bewusst, nicht vergessen)

- **Kein Websocket-Fortschritt.** ComfyUI meldet Fortschritt offiziell über
  Websocket-Events ODER `GET /history`-Polling — dieser Worker verdrahtet
  NUR Polling (weder `websockets` noch `websocket-client` sind im
  Cloud-Container installierbar/testbar gewesen). `progress.pct` während
  des Wartens ist eine zeitbasierte SCHÄTZUNG (linear zwischen 0.05 und
  0.95 über die konfigurierte `--comfyui-timeout`-Spanne), kein von
  ComfyUI gemeldeter Ist-Wert. Nur `pct: 1.0` bei `status: done` ist exakt.
  Ein künftiger Ausbau auf echte Websocket-Progress-Events ist offen.
- **Keine geometrie-treue Konditionierung.** `render.faithful`
  (ControlNet-Stärke laut Vertrag) wird von diesem minimalen Adapter derzeit
  komplett ignoriert (`baue_prompt_graph` liest das Feld nicht einmal aus),
  und der Txt2Img-Graph reicht das GLB/die
  Geometrie NICHT an ComfyUI weiter (kein Tiefen-/Normalen-Pass, kein
  ControlNet-Node). Der Render folgt aktuell nur dem Text-Prompt — eine
  geometrie-treue Veredelung (das eigentliche KosmoVis-Zielbild) braucht
  einen zusätzlichen Cycles-Tiefenpass + ControlNet-Node, der NICHT Teil
  dieses Pakets ist. Dokumentierte Lücke, keine verschwiegene.
- **Kein Doppel-QA-Verfahren.** `qa.style`/`qa.geometry` (DINOv3-Cosine
  bzw. DepthAnything-Spearman/IoU laut Vertrag) werden von diesem Worker
  NICHT berechnet — beide Felder sind im Vertrag optional und bleiben
  bewusst WEG statt erfundener Zahlen. `qa.verdict.reason` sagt das
  wörtlich. Ein künftiger QA-Worker (eigenes ML-Verfahren) müsste diese
  Felder ehrlich nachliefern.
- **Ein Bild je Kamera, synchron.** Der Worker rendert Kameras nacheinander
  (kein paralleler ComfyUI-Batch) — bei `cameras: 'auto'`/`'saved'` genau
  EIN Bild (`cam-01.png`, dieselbe Konvention wie der Fake-Worker).
- **Modellwahl ist offen** (§1) — ohne `--checkpoint` bleibt JEDER Job
  ehrlich `kein-render-worker`, das ist Absicht, kein Bug.
- **Crash-Resume nicht abgesichert:** stürzt der Worker-Prozess MITTEN in
  einem Render ab, bleibt der Job `running` mit diesem Worker-Namen stehen
  — ein Neustart des Dienstes claimt KEINEN neuen Job, solange dieser Eintrag
  so aussieht (Idle-Gate auf Runner-Ebene, verhindert Doppel-Claims). Ein
  manueller `POST /jobs/<id>/cancel` räumt den Zustand auf. Ein
  automatisches Resume/Retry ist nicht gebaut.
