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
kosmo-bridge --store /mnt/data/ArchitekturKosmos/render-jobs
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
