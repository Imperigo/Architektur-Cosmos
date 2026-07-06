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
export KOSMO_BRIDGE_TOKEN=dein-geheimes-token          # empfohlen
export KOSMO_OLLAMA_URL=http://127.0.0.1:11434
export KOSMO_WHISPER_MODEL=jayr23/whisper-large-v3-turbo-swiss-german-ct2
export KOSMO_BRIDGE_ORIGIN="http://homestation:5183"   # oder mehrere, komma-getrennt
kosmo-bridge --store /mnt/data/ArchitekturKosmos/render-jobs --host 0.0.0.0
```

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

- **Ohne `KOSMO_BRIDGE_TOKEN` bleibt die Bridge offen** — jeder Client im
  erreichbaren Netz kann Jobs anlegen/abrufen. Token setzen, sobald mehr als
  dein eigener Rechner Zugriff hat. Der Token-Vergleich läuft über
  `secrets.compare_digest` (timing-sicher).
- **Bind-Default `127.0.0.1`**: die Bridge ist standardmässig nur vom eigenen
  Rechner erreichbar. `--host 0.0.0.0` (alle Interfaces, z.B. damit ein iPad
  im Büronetz zugreifen kann) ist eine **bewusste Option**, kein Default —
  beim Start erscheint dazu ein Hinweis im Log.
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
Nachbarordner-Trick abgewiesen, Upload über Deckel → 413) ohne pytest.
