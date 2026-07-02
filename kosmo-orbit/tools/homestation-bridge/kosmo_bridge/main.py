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
            "tts": False,
        },
    }


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
        threading.Thread(target=_fake_worker_loop, daemon=True).start()
        print("⚠ Fake-Worker aktiv — Render-Ergebnisse sind Platzhalter")
    if not TOKEN:
        print("Hinweis: KOSMO_BRIDGE_TOKEN nicht gesetzt — Bridge ist im Netz offen")
    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    cli()
