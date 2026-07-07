"""Kosmo-Bridge — läuft auf der HomeStation neben der KosmoVis-Pipeline.

Endpoints (Vertrag: @kosmo/contracts bridge-api.ts):
  GET  /health                     Dienste-Status
  POST /jobs                       Render-Job (multipart: scene + model.glb)
  GET  /jobs                       Jobliste
  GET  /jobs/{id}                  Job-Record + render-result.json falls fertig
  GET  /jobs/{id}/artifacts/{name} Artefakt (Bild, glb, ...)
  POST /jobs/video-splat           Video→Splat-Job (multipart: frames[] + meta) —
                                    ehrliche Übergabe; braucht einen echten SfM-
                                    Worker (HomeStation/Web-Konverter), sonst
                                    meldet der Status "kein-sfm-worker" statt
                                    ein Splat-Ergebnis vorzutäuschen.
  POST /stt                        Audio → Text (faster-whisper, Schweizerdeutsch-Modell)
  POST /ollama/...                 Reverse-Proxy zur lokalen Ollama-Instanz

Start:   kosmo-bridge --store /mnt/data/ArchitekturKosmos/render-jobs
Test:    kosmo-bridge --store /tmp/kosmo-jobs --fake-worker
Sicherheit: KOSMO_BRIDGE_TOKEN setzen → Header X-Kosmo-Token wird verlangt.
  Ohne Token bleibt die Bridge im erreichbaren Netz offen (ehrlich benannt,
  kein Vortäuschen von Schutz, siehe Startlog). --host 0.0.0.0 und
  KOSMO_BRIDGE_ORIGIN=* sind bewusste Büronetz-Optionen, keine Defaults.

Serie I / Batch B6 (Server-Bindung, der wirksame Anti-Copy-Hebel — siehe
  docs/SERIE-I-BUILDPLAN.md §3): KOSMO_BRIDGE_LIZENZ_PFLICHT schaltet
  zusätzlich zum Token eine signierte Lizenz scharf (Header X-Kosmo-Lizenz,
  öffentlicher Schlüssel KOSMO_BRIDGE_LIZENZ_PUBKEY). Default AUS — ohne die
  Env-Variable verhält sich die Bridge exakt wie in B4 (nur Token zählt).

Serie I / Batch B9 (Betrieb & Notfall): fehlgeschlagene Auth, Lizenz-
  Fehlschläge und über den Deckel verworfene Uploads schreiben zusätzlich
  eine strukturierte JSON-Zeile auf stderr (`sicherheits_log.py`) — additiv,
  ändert keinen Statuscode. Siehe docs/INCIDENT-PLAYBOOK.md.
"""

from __future__ import annotations

import argparse
import json
import os
import secrets
import struct
import threading
import time
import zlib
from datetime import datetime, timezone
from pathlib import Path

import httpx
import uvicorn
from fastapi import Body, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response

try:  # als Paket (python3 -m kosmo_bridge.main) UND als Skript (python3 …/main.py)
    from kosmo_bridge.lizenz import ED25519_LIB, ist_widerrufen, lade_widerrufsliste, lizenz_pruefen
except ModuleNotFoundError:  # Skript-Modus: das eigene Verzeichnis liegt auf sys.path
    from lizenz import ED25519_LIB, ist_widerrufen, lade_widerrufsliste, lizenz_pruefen

try:  # dieselbe Skript-/Paket-Robustheit wie beim Lizenz-Import oben (B9)
    from kosmo_bridge.sicherheits_log import protokolliere_sicherheitsereignis
except ModuleNotFoundError:
    from sicherheits_log import protokolliere_sicherheitsereignis


def _cors_origins() -> list[str]:
    """CORS-Allowlist aus Env, Default eng (nur lokale Dev-/Preview-Ports der
    App). `KOSMO_BRIDGE_ORIGIN=*` ist eine bewusste Büronetz-Option (Owner
    setzt sie aktiv, z.B. für ein iPad im selben Netz) — kein Default, sonst
    wäre jede beliebige Website im Browser des Nutzers ein potenzieller
    Bridge-Client."""
    raw = os.environ.get(
        "KOSMO_BRIDGE_ORIGIN",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5183,http://127.0.0.1:5183",
    )
    if raw.strip() == "*":
        return ["*"]
    return [o.strip() for o in raw.split(",") if o.strip()]


app = FastAPI(title="Kosmo-Bridge", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_methods=["*"],
    allow_headers=["*"],
)

STORE = Path(os.environ.get("KOSMO_JOB_STORE", "/tmp/kosmo-jobs"))
OLLAMA = os.environ.get("KOSMO_OLLAMA_URL", "http://127.0.0.1:11434")
TOKEN = os.environ.get("KOSMO_BRIDGE_TOKEN", "")
FAKE_WORKER = False

# Lizenz-Pflicht (Serie I / Batch B6) — additiv, Default AUS. Erst wenn der
# Owner sie per Env einschaltet, verlangt die Bridge zusätzlich zum Token
# eine gültige, nicht widerrufene signierte Lizenz.
LIZENZ_PFLICHT = os.environ.get("KOSMO_BRIDGE_LIZENZ_PFLICHT", "").strip().lower() in ("1", "true", "ja")
LIZENZ_PUBKEY = os.environ.get("KOSMO_BRIDGE_LIZENZ_PUBKEY", "")
LIZENZ_WIDERRUFSLISTE = lade_widerrufsliste(os.environ)

# Upload-Grössen-Deckel (Env-überschreibbar) — schützt vor Platten-DoS über
# unbegrenzte multipart-Uploads. Defaults sind grosszügig für echte
# Render-Modelle/Audiodateien, aber weit unter "unbegrenzt".
MAX_UPLOAD_MODEL_BYTES = int(os.environ.get("KOSMO_BRIDGE_MAX_UPLOAD_MODEL", str(200 * 1024 * 1024)))  # ~200 MB
MAX_UPLOAD_AUDIO_BYTES = int(os.environ.get("KOSMO_BRIDGE_MAX_UPLOAD_AUDIO", str(50 * 1024 * 1024)))  # ~50 MB
# Für einen künftigen Frame-Upload-Weg (z.B. Video→Splat) vorgesehen, damit ein
# einzelner Env-Namensraum reicht — aktuell von keinem Endpoint genutzt.
MAX_UPLOAD_FRAME_BYTES = int(os.environ.get("KOSMO_BRIDGE_MAX_UPLOAD_FRAME", str(500 * 1024)))  # ~500 KB
MAX_FRAME_COUNT = int(os.environ.get("KOSMO_BRIDGE_MAX_FRAMES", "400"))

# V2-Technik Block 1 / HS2 — Job-Lebenszyklus.
# Freigabe-Pflicht: additiv, Default AUS. Bleibt sie aus, wird ein neuer Job
# wie bisher direkt "queued" angelegt (Anker der bestehenden E2E-/Contract-
# Fläche). Erst wenn der Owner sie einschaltet, landet ein Job zuerst in
# "awaiting_approval" und wartet auf einen expliziten /approve mit dem
# approval_token — kein teurer Render läuft dann ungefragt an.
APPROVAL_PFLICHT = os.environ.get("KOSMO_BRIDGE_APPROVAL_PFLICHT", "").strip().lower() in ("1", "true", "ja")
# Idle-Fenster (simuliert im Container): steht die GPU auf "belegt"
# (KOSMO_BRIDGE_GPU_IDLE=0), lässt der Fake-Worker "queued"-Render-Jobs liegen,
# statt sie sofort zu rechnen — spiegelt das echte "nur im Leerlauf rendern".
GPU_IDLE = os.environ.get("KOSMO_BRIDGE_GPU_IDLE", "1").strip() != "0"

_whisper_model = None


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@app.middleware("http")
async def token_guard(request: Request, call_next):
    # Serie I / Batch B9: jede Ablehnung unten schreibt zusätzlich eine
    # strukturierte JSON-Log-Zeile auf stderr (additiv — kein Statuscode
    # ändert sich gegenüber B4/B6).
    if TOKEN and request.url.path != "/health":
        supplied = request.headers.get("x-kosmo-token", "")
        # secrets.compare_digest statt `!=`: konstante Laufzeit, kein
        # Byte-für-Byte-Timing-Seitenkanal auf den Token-Vergleich.
        if not secrets.compare_digest(supplied, TOKEN):
            protokolliere_sicherheitsereignis(
                "auth_fehlgeschlagen", f"bridge:{request.url.path}", "Token fehlt oder falsch"
            )
            return Response(status_code=401, content="Token fehlt oder falsch")

    # Lizenz-Pflicht (Serie I / Batch B6) — additiv, NUR wenn per Env aktiv.
    # Default (LIZENZ_PFLICHT=False): dieser Block tut nichts, exakt B4-Verhalten.
    if LIZENZ_PFLICHT and request.url.path != "/health":
        if not LIZENZ_PUBKEY:
            # Pflicht an, aber kein Public Key konfiguriert — ehrlich ablehnen
            # (fail closed) statt eine Prüfung vorzutäuschen, die nicht laufen kann.
            protokolliere_sicherheitsereignis(
                "lizenz_fehlgeschlagen", f"bridge:{request.url.path}", "Lizenzpruefung nicht konfiguriert"
            )
            return Response(status_code=503, content="Lizenzpruefung nicht konfiguriert (KOSMO_BRIDGE_LIZENZ_PUBKEY fehlt)")
        lizenz_text = request.headers.get("x-kosmo-lizenz", "")
        if not lizenz_text:
            protokolliere_sicherheitsereignis("lizenz_fehlgeschlagen", f"bridge:{request.url.path}", "Lizenz fehlt")
            return Response(status_code=401, content="Lizenz fehlt")
        ergebnis = lizenz_pruefen(lizenz_text, LIZENZ_PUBKEY, datetime.now(timezone.utc))
        if not ergebnis["gueltig"]:
            protokolliere_sicherheitsereignis(
                "lizenz_fehlgeschlagen", f"bridge:{request.url.path}", f"Lizenz abgelehnt: {ergebnis['grund']}"
            )
            return Response(status_code=401, content=f"Lizenz abgelehnt: {ergebnis['grund']}")
        lizenz_id = (ergebnis["lizenz"] or {}).get("lizenzId", "")
        if ist_widerrufen(lizenz_id, LIZENZ_WIDERRUFSLISTE):
            protokolliere_sicherheitsereignis(
                "lizenz_fehlgeschlagen", f"bridge:{request.url.path}", f"Lizenz widerrufen (lizenzId={lizenz_id})"
            )
            return Response(status_code=401, content="Lizenz widerrufen")

    return await call_next(request)


async def _read_capped(upload: UploadFile, max_bytes: int, label: str) -> bytes:
    """Liest einen Upload in Blöcken und bricht mit 413 ab, sobald der Deckel
    überschritten ist — statt die Datei erst unbegrenzt auf Platte/in den
    Speicher zu lesen und danach zu prüfen."""
    chunks: list[bytes] = []
    total = 0
    chunk_size = 1024 * 1024
    while True:
        chunk = await upload.read(chunk_size)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            protokolliere_sicherheitsereignis(
                "upload_deckel_abgelehnt", "bridge:_read_capped", f"{label} über Deckel von {max_bytes} Bytes"
            )
            raise HTTPException(413, f"{label} überschreitet Deckel von {max_bytes} Bytes")
        chunks.append(chunk)
    return b"".join(chunks)


def _safe_store_path(*segments: str) -> Path:
    """Baut einen Pfad unterhalb von STORE und weist Ausbruchsversuche ab.

    Zwei Schutzschichten: (1) jedes Segment wird gegen "/", "\\" und ".."
    geprüft — kein Verstecken eines Fremdpfads in job_id/name; (2) das
    Ergebnis muss nach resolve() ein echtes Kind von STORE sein
    (`relative_to`, try/except ValueError) — schliesst den Nachbarordner-Trick
    (z.B. `/tmp/kosmo-jobs-evil` neben `/tmp/kosmo-jobs`), den ein reines
    `startswith()`-Präfixvergleich durchlässt, weil er keine Trenner-Grenze
    kennt.
    """
    for seg in segments:
        if not seg or "/" in seg or "\\" in seg or ".." in seg:
            raise HTTPException(400, "ungültiger Pfad-Teil (job_id/name)")
    candidate = STORE.joinpath(*segments)
    try:
        candidate.resolve().relative_to(STORE.resolve())
    except ValueError:
        raise HTTPException(404, "Pfad ausserhalb des Job-Stores")
    return candidate


@app.get("/health")
async def health():
    ollama_ok = False
    try:
        async with httpx.AsyncClient(timeout=2) as client:
            r = await client.get(f"{OLLAMA}/api/tags")
            ollama_ok = r.status_code == 200
    except Exception:
        pass
    health = {
        "ok": True,
        "version": "1.0.0",
        "services": {
            "jobstore": STORE.exists(),
            "ollama": ollama_ok,
            "stt": _stt_available(),
            "tts": FAKE_WORKER or _tts_available(),
            "embed": FAKE_WORKER or _embed_available(),
        },
    }
    # GPU-Status NUR im Fake-Modus ehrlich als Simulation melden. Ohne echte
    # GPU-Abfrage (nvidia-smi auf der HomeStation) fehlt das Feld ganz — nie
    # vorgetäuscht (Ehrlichkeit vor Politur).
    if FAKE_WORKER:
        health["gpu"] = {"name": "fake-gpu (Simulation)", "idle": GPU_IDLE}
    return health


def _tts_available() -> bool:
    import shutil

    if shutil.which("piper"):
        return True
    try:
        import chatterbox  # type: ignore # noqa: F401
        return True
    except ImportError:
        return False


def _embed_available() -> bool:
    try:
        import sentence_transformers  # type: ignore # noqa: F401
        return True
    except ImportError:
        return False


# ---------- Render-Jobs (KosmoVis-Job-Store-Naht) ----------

@app.post("/jobs")
async def create_job(scene: str = Form(...), model: UploadFile = File(...)):
    try:
        scene_obj = json.loads(scene)
    except json.JSONDecodeError as e:
        raise HTTPException(400, f"render-scene ist kein JSON: {e}")

    job_id = f"vis-{int(time.time())}-{secrets.token_hex(3)}"
    job_dir = STORE / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    model_bytes = await _read_capped(model, MAX_UPLOAD_MODEL_BYTES, "model.glb")
    model_path = job_dir / "model.glb"
    model_path.write_bytes(model_bytes)
    scene_obj["geometry"] = {"path": str(model_path), "format": "glb"}
    # Schreibziel IMMER serverseitig erzwingen — ein vom Client geliefertes
    # `out` (z.B. "/etc/…" oder ein anderer Job-Ordner) wird verworfen statt
    # per setdefault() durchgelassen. Das schliesst die Schreibziel-Injektion
    # aus dem Bauplan-Befund (R4).
    scene_obj["out"] = str(job_dir / "out")
    (job_dir / "render-scene.json").write_text(json.dumps(scene_obj, indent=2))

    # requested_engine: was BESTELLT wurde, nicht was gerendert wird. `vis.skip`
    # im Szenen-Vertrag heisst „reines Cycles, keine KI-Veredelung“ — der Client
    # zeigt es am Node, der Contract kennt beide Werte (render-result.ts).
    requested_engine = "cycles" if (scene_obj.get("vis") or {}).get("skip") else "ki"
    # Status-Anker: Default (Pflicht AUS) bleibt "queued" — exakt das heutige
    # Verhalten, auf das die E2E-/Contract-Fläche pinnt. Nur mit Pflicht AN
    # startet der Job in "awaiting_approval".
    record = {
        "job_id": job_id,
        "status": "awaiting_approval" if APPROVAL_PFLICHT else "queued",
        "scene": str(job_dir / "render-scene.json"),
        "approval_token": f"CONFIRMED_RENDER_{secrets.token_hex(4)}",
        "idle_window_only": True,
        "requested_engine": requested_engine,
        "created_at": _now(),
    }
    (job_dir / "job.json").write_text(json.dumps(record, indent=2))
    return record


@app.post("/jobs/{job_id}/approve")
async def approve_job(job_id: str, payload: dict = Body(default={})):
    """Gibt einen wartenden Job frei — nur bei aktiver Freigabe-Pflicht sinnvoll.
    Verlangt den `approval_token` aus dem Create-Response; falscher Token wird
    mit 403 (konstante Laufzeit) abgewiesen und protokolliert. Ein Job, der gar
    nicht auf Freigabe wartet, bleibt unverändert (kein stiller Zustandssprung)."""
    job_dir = _safe_store_path(job_id)
    f = job_dir / "job.json"
    if not f.exists():
        raise HTTPException(404, "Job unbekannt")
    record = json.loads(f.read_text())
    supplied = str(payload.get("approval_token", ""))
    expected = str(record.get("approval_token", ""))
    if not expected or not secrets.compare_digest(supplied, expected):
        protokolliere_sicherheitsereignis(
            "freigabe_fehlgeschlagen", f"bridge:/jobs/{job_id}/approve", "approval_token fehlt oder falsch"
        )
        raise HTTPException(403, "approval_token fehlt oder falsch")
    if record.get("status") != "awaiting_approval":
        # Idempotent/ehrlich: nur ein wartender Job wird freigegeben.
        return record
    record["status"] = "queued"
    record["updated_at"] = _now()
    f.write_text(json.dumps(record, indent=2))
    return record


@app.post("/jobs/{job_id}/cancel")
async def cancel_job(job_id: str):
    """Kooperativer Abbruch. awaiting_approval/queued werden sofort abgebrochen;
    ein bereits laufender Job wird als "cancelled" markiert — der Worker sieht
    das vor dem nächsten teuren Schritt und schreibt kein Ergebnis mehr. done/
    error/cancelled bleiben unverändert (Endzustände)."""
    job_dir = _safe_store_path(job_id)
    f = job_dir / "job.json"
    if not f.exists():
        raise HTTPException(404, "Job unbekannt")
    record = json.loads(f.read_text())
    if record.get("status") in ("awaiting_approval", "queued", "running"):
        record["status"] = "cancelled"
        record["updated_at"] = _now()
        record["message"] = "Vom Nutzer abgebrochen."
        f.write_text(json.dumps(record, indent=2))
    return record


@app.get("/jobs")
async def list_jobs():
    jobs = []
    if STORE.exists():
        for d in sorted(STORE.iterdir(), reverse=True):
            f = d / "job.json"
            if f.exists():
                jobs.append(json.loads(f.read_text()))
    return jobs[:50]


@app.get("/jobs/{job_id}")
async def get_job(job_id: str):
    job_dir = _safe_store_path(job_id)
    f = job_dir / "job.json"
    if not f.exists():
        raise HTTPException(404, "Job unbekannt")
    record = json.loads(f.read_text())
    result_file = job_dir / "render-result.json"
    if result_file.exists():
        record["result"] = json.loads(result_file.read_text())
    return record


@app.get("/jobs/{job_id}/artifacts/{name}")
async def get_artifact(job_id: str, name: str):
    p = _safe_store_path(job_id, name)
    if not p.exists():
        raise HTTPException(404, "Artefakt unbekannt")
    return FileResponse(p)


# ---------- Video→Splat-Jobs (ehrliche Übergabe, keine SfM hier) ----------
#
# Owner-Korrektur 05.07.: Gaussian-Splats sind NICHT HomeStation-exklusiv.
# Konvertieren/Zuschneiden/Anzeigen läuft lokal im Browser (siehe
# apps/kosmo-orbit .../splat-import.ts); nur die Video→Splat-Erzeugung (SfM +
# Splat-Optimierung) ist rechenintensiv. Dieser Endpoint nimmt die lokal
# extrahierten Frames entgegen und legt einen echten Job an — er täuscht aber
# KEIN Splat-Ergebnis vor: ohne angeschlossenen SfM-Worker (COLMAP/nerfstudio
# o.ä. auf der HomeStation/5090 oder ein Web-Konverter) bleibt der Job ehrlich
# als "kein-sfm-worker" bzw. "queued" stehen.

@app.post("/jobs/video-splat")
async def create_video_splat_job(frames: list[UploadFile] = File(...), meta: str = Form("{}")):
    try:
        meta_obj = json.loads(meta)
    except json.JSONDecodeError as e:
        raise HTTPException(400, f"meta ist kein JSON: {e}")
    if not frames:
        raise HTTPException(400, "keine Frames übergeben")

    job_id = f"vsplat-{int(time.time())}-{secrets.token_hex(3)}"
    job_dir = STORE / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    frame_names = []
    for i, fr in enumerate(frames):
        p = job_dir / f"frame-{i:04d}.jpg"
        p.write_bytes(await fr.read())
        frame_names.append(p.name)

    record = {
        "job_id": job_id,
        "kind": "video-splat",
        "status": "queued",
        "frame_count": len(frame_names),
        "meta": meta_obj,
        "created_at": _now(),
    }
    (job_dir / "job.json").write_text(json.dumps(record, indent=2))
    return record


# ---------- STT (Speak-to-Kosmo) ----------

def _stt_available() -> bool:
    try:
        import faster_whisper  # noqa: F401
        return True
    except ImportError:
        return False


@app.post("/stt")
async def stt(audio: UploadFile = File(...)):
    global _whisper_model
    # Deckel zuerst prüfen, unabhängig davon, ob faster-whisper installiert
    # ist — sonst liesse sich die Bridge über grosse Audio-Uploads schon vor
    # der 501-Antwort zum unbegrenzten Plattenschreiben zwingen.
    audio_bytes = await _read_capped(audio, MAX_UPLOAD_AUDIO_BYTES, "audio")
    if not _stt_available():
        raise HTTPException(
            501,
            "faster-whisper fehlt: pip install 'kosmo-bridge[stt]' und Modell "
            "jayr23/whisper-large-v3-turbo-swiss-german-ct2 laden",
        )
    from faster_whisper import WhisperModel

    if _whisper_model is None:
        model_id = os.environ.get(
            "KOSMO_WHISPER_MODEL", "jayr23/whisper-large-v3-turbo-swiss-german-ct2"
        )
        _whisper_model = WhisperModel(model_id, device="auto", compute_type="auto")

    tmp = STORE / f"stt-{secrets.token_hex(4)}.audio"
    tmp.write_bytes(audio_bytes)
    try:
        segments, info = _whisper_model.transcribe(str(tmp), language="de", vad_filter=True)
        text = " ".join(s.text.strip() for s in segments).strip()
        return {"text": text, "language": info.language, "duration_s": info.duration}
    finally:
        tmp.unlink(missing_ok=True)


# ---------- TTS (Owner-Q7: Kosmo spricht — Chatterbox/Piper, Schalter in der App) ----------

_tts_model = None


def _wav_header(n_samples: int, rate: int = 22050) -> bytes:
    import struct

    data_len = n_samples * 2
    return (
        b"RIFF" + struct.pack("<I", 36 + data_len) + b"WAVEfmt " +
        struct.pack("<IHHIIHH", 16, 1, 1, rate, rate * 2, 2, 16) +
        b"data" + struct.pack("<I", data_len)
    )


def _fake_tts_wav(text: str) -> bytes:
    """Deterministischer Prüfton (Länge folgt dem Text) — nur --fake-worker."""
    import math
    import struct

    rate = 22050
    seconds = min(0.3 + len(text) * 0.01, 2.0)
    n = int(rate * seconds)
    samples = bytearray()
    for i in range(n):
        v = int(12000 * math.sin(2 * math.pi * 440 * i / rate) * (1 - i / n))
        samples += struct.pack("<h", v)
    return _wav_header(n, rate) + bytes(samples)


@app.post("/tts")
async def tts(payload: dict):
    global _tts_model
    text = str(payload.get("text", "")).strip()[:800]
    if not text:
        raise HTTPException(400, "text fehlt")
    if FAKE_WORKER:
        return Response(content=_fake_tts_wav(text), media_type="audio/wav")

    engine = os.environ.get("KOSMO_TTS_ENGINE", "piper")
    if engine == "piper":
        import shutil
        import subprocess

        if not shutil.which("piper"):
            raise HTTPException(
                501,
                "piper fehlt: pip install piper-tts und deutsche Stimme laden "
                "(KOSMO_PIPER_VOICE=/pfad/de_DE-thorsten-high.onnx)",
            )
        voice = os.environ.get("KOSMO_PIPER_VOICE", "de_DE-thorsten-high.onnx")
        out = STORE / f"tts-{secrets.token_hex(4)}.wav"
        try:
            subprocess.run(
                ["piper", "--model", voice, "--output_file", str(out)],
                input=text.encode(), check=True, timeout=60,
            )
            return Response(content=out.read_bytes(), media_type="audio/wav")
        finally:
            out.unlink(missing_ok=True)

    # Chatterbox (mehrsprachig, braucht GPU sinnvollerweise)
    try:
        from chatterbox.tts import ChatterboxTTS  # type: ignore
    except ImportError:
        raise HTTPException(501, "chatterbox fehlt: pip install chatterbox-tts")
    import io

    import torchaudio  # type: ignore

    if _tts_model is None:
        _tts_model = ChatterboxTTS.from_pretrained(device=os.environ.get("KOSMO_TTS_DEVICE", "cuda"))
    wav = _tts_model.generate(text)
    buf = io.BytesIO()
    torchaudio.save(buf, wav, _tts_model.sr, format="wav")
    return Response(content=buf.getvalue(), media_type="audio/wav")


# ---------- Embeddings (Kosmo-RAG: bge-m3 auf der HomeStation) ----------

_embed_model = None


def _fake_embed(text: str, dim: int = 64) -> list[float]:
    """Zeichen-Trigramm-Hashing, normalisiert — deterministisch, für Tests.
    Ähnliche Texte teilen Trigramme und landen nahe beieinander."""
    import hashlib
    import math

    vec = [0.0] * dim
    t = f"  {text.lower()}  "
    for i in range(len(t) - 2):
        h = int.from_bytes(hashlib.blake2s(t[i : i + 3].encode(), digest_size=4).digest(), "little")
        vec[h % dim] += 1.0 if (h >> 16) % 2 == 0 else -1.0
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


@app.post("/embed")
async def embed(payload: dict):
    global _embed_model
    texts = [str(t)[:4000] for t in payload.get("texts", [])][:256]
    if not texts:
        raise HTTPException(400, "texts fehlt")
    if FAKE_WORKER:
        return {"model": "fake-trigram-64", "vectors": [_fake_embed(t) for t in texts]}
    try:
        from sentence_transformers import SentenceTransformer  # type: ignore
    except ImportError:
        raise HTTPException(501, "sentence-transformers fehlt: pip install 'kosmo-bridge[embed]'")
    if _embed_model is None:
        _embed_model = SentenceTransformer(os.environ.get("KOSMO_EMBED_MODEL", "BAAI/bge-m3"))
    vectors = _embed_model.encode(texts, normalize_embeddings=True).tolist()
    return {"model": os.environ.get("KOSMO_EMBED_MODEL", "BAAI/bge-m3"), "vectors": vectors}


# ---------- Ollama-Proxy (fürs iPad im Büronetz) ----------

@app.api_route("/ollama/{path:path}", methods=["GET", "POST"])
async def ollama_proxy(path: str, request: Request):
    async with httpx.AsyncClient(timeout=None) as client:
        upstream = await client.request(
            request.method,
            f"{OLLAMA}/{path}",
            content=await request.body(),
            headers={"content-type": request.headers.get("content-type", "application/json")},
        )
        return Response(
            content=upstream.content,
            status_code=upstream.status_code,
            media_type=upstream.headers.get("content-type"),
        )


# ---------- Fake-Worker (Tests/Demo ohne GPU) ----------

def _placeholder_png(width: int = 640, height: int = 400) -> bytes:
    """Minimales valides PNG (Kupferton) ohne Abhängigkeiten."""
    def chunk(tag: bytes, data: bytes) -> bytes:
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c))

    row = b"\x00" + bytes([194, 94, 58] * width)
    raw = row * height
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 6))
        + chunk(b"IEND", b"")
    )


def _fake_worker_step(job_dir: Path) -> None:
    """Bringt EINEN Job-Ordner um höchstens einen Zustand weiter — die
    testbare Einheit des Fake-Workers (HS2). Ein Schritt je Aufruf hält den
    `running`-Zustand (mit worker/progress) für einen Poll sichtbar und macht
    Idle-Gate + kooperativen Abbruch deterministisch prüfbar."""
    f = job_dir / "job.json"
    if not f.exists():
        return
    record = json.loads(f.read_text())
    status = record.get("status")

    if status == "queued" and record.get("kind") == "video-splat":
        # Ehrlich statt gefälscht: der Fake-Worker hat keinen SfM/Splat-
        # Optimierer (COLMAP/nerfstudio) — kein Platzhalter-Splat, sondern ein
        # klarer Status + Grund. (Nicht idle-gated: hier wird nichts gerechnet.)
        record["status"] = "kein-sfm-worker"
        record["message"] = (
            "Frames liegen bereit — diese Bridge hat keinen SfM/"
            "Splat-Worker angeschlossen. Braucht die HomeStation "
            "(5090) oder einen Web-Konverter."
        )
        record["updated_at"] = _now()
        f.write_text(json.dumps(record, indent=2))
        return

    if status == "queued":
        # Idle-Fenster: steht die GPU auf "belegt", lassen wir Render-Jobs in
        # "queued" liegen (spiegelt "nur im Leerlauf rendern"). Kein
        # Zustandssprung — der Job wird beim nächsten Idle-Durchlauf geholt.
        if not GPU_IDLE:
            return
        record["status"] = "running"
        record["worker"] = "fake-worker"
        record["progress"] = {"phase": "rendern", "pct": 0.5}
        record["updated_at"] = _now()
        f.write_text(json.dumps(record, indent=2))
        return

    if status == "running":
        # Kooperativer Abbruch wird als eigener Zustand ("cancelled") vom
        # /cancel-Endpoint gesetzt; ein laufender Job, der nicht abgebrochen
        # wurde, rechnet hier fertig. Da Abbruch einen anderen Status schreibt,
        # kommen wir bei "cancelled" gar nicht erst hierher — kein Ergebnis.
        img = job_dir / "cam-01.png"
        img.write_bytes(_placeholder_png())
        result = {
            "schema": "kosmovis.render-result/v2",
            "job_id": record["job_id"],
            "images": [img.name],
            "ai_variant": img.name,
            "qa": {
                "style": {"style_score": 0.42, "threshold": 0.3, "passed": True, "method": "dinov3"},
                "geometry": {
                    "geometry_fidelity": 0.87,
                    "spearman": 0.93,
                    "geom_iou": 0.81,
                    "threshold": 0.65,
                    "passed": True,
                    "method": "fake-worker",
                },
                "verdict": {"passed": True, "reason": "Fake-Worker (Demo ohne GPU)"},
            },
        }
        (job_dir / "render-result.json").write_text(json.dumps(result, indent=2))
        record["status"] = "done"
        record["progress"] = {"phase": "fertig", "pct": 1.0}
        record["updated_at"] = _now()
        f.write_text(json.dumps(record, indent=2))


def _fake_worker_pass() -> None:
    """Ein Durchlauf über alle Job-Ordner (jeder um höchstens einen Schritt)."""
    if not STORE.exists():
        return
    for d in STORE.iterdir():
        try:
            _fake_worker_step(d)
        except Exception:
            # Ein einzelner kaputter Job-Ordner darf den Worker nicht anhalten.
            continue


def _fake_worker_loop():
    while True:
        time.sleep(1.0)
        _fake_worker_pass()


def cli():
    global STORE, OLLAMA, FAKE_WORKER, TOKEN
    ap = argparse.ArgumentParser(description="Kosmo-Bridge")
    ap.add_argument("--store", default=str(STORE), help="Job-Store-Verzeichnis")
    ap.add_argument("--ollama", default=OLLAMA, help="Ollama-URL")
    # Default eng: nur lokal erreichbar. 0.0.0.0 (alle Interfaces, inkl.
    # Büronetz/LAN) ist eine bewusste Owner-Option — muss explizit gesetzt
    # werden, damit die Bridge nicht aus Versehen netzweit offen startet.
    ap.add_argument("--host", default="127.0.0.1", help="0.0.0.0 nur bewusst fürs Büronetz setzen")
    ap.add_argument("--port", type=int, default=8600)
    ap.add_argument("--fake-worker", action="store_true", help="Jobs ohne GPU beantworten (Demo/CI)")
    args = ap.parse_args()
    STORE = Path(args.store)
    STORE.mkdir(parents=True, exist_ok=True)
    OLLAMA = args.ollama
    if args.fake_worker:
        FAKE_WORKER = True
        threading.Thread(target=_fake_worker_loop, daemon=True).start()
        print("⚠ Fake-Worker aktiv — Render/TTS/Embeddings sind Platzhalter")
    if not TOKEN:
        print("Hinweis: KOSMO_BRIDGE_TOKEN nicht gesetzt — Bridge ist im Netz offen")
    if args.host not in ("127.0.0.1", "localhost"):
        print(f"⚠ Bind an {args.host} — bewusste Büronetz-Option, im LAN erreichbar")
    if LIZENZ_PFLICHT and ED25519_LIB is None:
        print(
            "⚠ KOSMO_BRIDGE_LIZENZ_PFLICHT gesetzt, aber weder 'cryptography' noch 'pynacl' "
            "installiert — JEDE Anfrage wird abgelehnt (fail closed). 'pip install cryptography' nachholen."
        )
    elif LIZENZ_PFLICHT and not LIZENZ_PUBKEY:
        print("⚠ KOSMO_BRIDGE_LIZENZ_PFLICHT gesetzt, aber KOSMO_BRIDGE_LIZENZ_PUBKEY fehlt — JEDE Anfrage wird abgelehnt (fail closed)")
    elif LIZENZ_PFLICHT:
        print(f"Lizenz-Pflicht aktiv (Serie I / B6, Ed25519 via {ED25519_LIB}) — {len(LIZENZ_WIDERRUFSLISTE)} widerrufene Lizenz-ID(s) geladen.")
    else:
        print("Lizenz-Pflicht aus (Default) — nur der Token entscheidet, wie in B4.")
    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    cli()
