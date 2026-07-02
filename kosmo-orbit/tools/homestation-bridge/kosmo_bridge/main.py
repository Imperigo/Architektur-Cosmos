"""Kosmo-Bridge — läuft auf der HomeStation neben der KosmoVis-Pipeline.

Endpoints (Vertrag: @kosmo/contracts bridge-api.ts):
  GET  /health                     Dienste-Status
  POST /jobs                       Render-Job (multipart: scene + model.glb)
  GET  /jobs                       Jobliste
  GET  /jobs/{id}                  Job-Record + render-result.json falls fertig
  GET  /jobs/{id}/artifacts/{name} Artefakt (Bild, glb, ...)
  POST /stt                        Audio → Text (faster-whisper, Schweizerdeutsch-Modell)
  POST /ollama/...                 Reverse-Proxy zur lokalen Ollama-Instanz

Start:   kosmo-bridge --store /mnt/data/ArchitekturKosmos/render-jobs
Test:    kosmo-bridge --store /tmp/kosmo-jobs --fake-worker
Sicherheit: KOSMO_BRIDGE_TOKEN setzen → Header X-Kosmo-Token wird verlangt.
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
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response

app = FastAPI(title="Kosmo-Bridge", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Büronetz; Zugriff wird über Token gesteuert
    allow_methods=["*"],
    allow_headers=["*"],
)

STORE = Path(os.environ.get("KOSMO_JOB_STORE", "/tmp/kosmo-jobs"))
OLLAMA = os.environ.get("KOSMO_OLLAMA_URL", "http://127.0.0.1:11434")
TOKEN = os.environ.get("KOSMO_BRIDGE_TOKEN", "")
FAKE_WORKER = False

_whisper_model = None


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@app.middleware("http")
async def token_guard(request: Request, call_next):
    if TOKEN and request.url.path != "/health":
        if request.headers.get("x-kosmo-token") != TOKEN:
            return Response(status_code=401, content="Token fehlt oder falsch")
    return await call_next(request)


@app.get("/health")
async def health():
    ollama_ok = False
    try:
        async with httpx.AsyncClient(timeout=2) as client:
            r = await client.get(f"{OLLAMA}/api/tags")
            ollama_ok = r.status_code == 200
    except Exception:
        pass
    return {
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

    model_path = job_dir / "model.glb"
    model_path.write_bytes(await model.read())
    scene_obj.setdefault("geometry", {})
    scene_obj["geometry"] = {"path": str(model_path), "format": "glb"}
    scene_obj.setdefault("out", str(job_dir / "out"))
    (job_dir / "render-scene.json").write_text(json.dumps(scene_obj, indent=2))

    record = {
        "job_id": job_id,
        "status": "queued",
        "scene": str(job_dir / "render-scene.json"),
        "approval_token": f"CONFIRMED_RENDER_{secrets.token_hex(4)}",
        "idle_window_only": True,
        "created_at": _now(),
    }
    (job_dir / "job.json").write_text(json.dumps(record, indent=2))
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
    job_dir = STORE / job_id
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
    p = (STORE / job_id / name).resolve()
    if not str(p).startswith(str(STORE.resolve())) or not p.exists():
        raise HTTPException(404, "Artefakt unbekannt")
    return FileResponse(p)


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
    tmp.write_bytes(await audio.read())
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


def _fake_worker_loop():
    while True:
        time.sleep(1.5)
        if not STORE.exists():
            continue
        for d in STORE.iterdir():
            f = d / "job.json"
            if not f.exists():
                continue
            record = json.loads(f.read_text())
            if record.get("status") != "queued":
                continue
            record["status"] = "running"
            f.write_text(json.dumps(record, indent=2))
            time.sleep(1.0)
            img = d / "cam-01.png"
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
            (d / "render-result.json").write_text(json.dumps(result, indent=2))
            record["status"] = "done"
            record["updated_at"] = _now()
            f.write_text(json.dumps(record, indent=2))


def cli():
    global STORE, OLLAMA, FAKE_WORKER, TOKEN
    ap = argparse.ArgumentParser(description="Kosmo-Bridge")
    ap.add_argument("--store", default=str(STORE), help="Job-Store-Verzeichnis")
    ap.add_argument("--ollama", default=OLLAMA, help="Ollama-URL")
    ap.add_argument("--host", default="0.0.0.0")
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
    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    cli()
