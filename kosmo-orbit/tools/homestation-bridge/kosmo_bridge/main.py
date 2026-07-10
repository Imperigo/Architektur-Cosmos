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
  POST /jobs/blender-sim           Blender-Simulation (multipart: szene +
                                    model.glb; art: wind/sonnenstunden/
                                    gebaeude-energie) — braucht einen echten
                                    Blender-Worker headless auf der HomeStation
                                    (5090), sonst meldet der Status
                                    "kein-blender-worker" statt eine
                                    Simulationszahl zu erfinden (Physik wird
                                    NIE gefakt, Fable-Urteil §3.2).
  POST /jobs/dev                   KosmoDev-Workorder (kosmodev.workorder/v1,
                                    JSON-Body) — die Bridge speichert und
                                    vermittelt NUR Text, sie führt NIE Code
                                    aus. Ohne angedockten Dev-Worker (Claude
                                    Code an der HomeStation) bleibt der Job
                                    ehrlich "queued".
  GET  /jobs/dev                   Dev-Jobliste (optional ?status=queued)
  GET  /jobs/dev/{id}              Dev-Job-Record + dev-result.json falls da
  POST /jobs/dev/{id}/claim        Worker übernimmt ({worker}) → running
  POST /jobs/dev/{id}/result       Worker meldet Ergebnis (DevJobResult) → done
  POST /jobs/dev/{id}/cancel       Kooperativer Abbruch (queued/running)
  POST /stt                        Audio → Text (faster-whisper, Schweizerdeutsch-Modell)
  POST /ollama/...                 Reverse-Proxy zur lokalen Ollama-Instanz

Start:   kosmo-bridge --store /mnt/data/ArchitekturKosmos/render-jobs
Test:    kosmo-bridge --store /tmp/kosmo-jobs --fake-worker
Sicherheit: Default-Bind ist `127.0.0.1` (nur die eigene Maschine erreicht die
  Bridge, egal ob ein Token gesetzt ist). Ein nicht-lokaler `--host` (z.B.
  `0.0.0.0` fürs Büronetz) verlangt entweder KOSMO_BRIDGE_TOKEN (Header
  X-Kosmo-Token wird dann geprüft) ODER die bewusste Bestätigung
  `--offen-ohne-token` / `KOSMO_BRIDGE_OFFEN=1` — ohne eines von beiden
  VERWEIGERT die Bridge den Start (sicherer Standard, laute Ausnahme statt
  stillem Offen; Serie I / I2-Nachtrag, 08.07.2026, siehe
  docs/SERIE-I-SICHERHEIT.md). KOSMO_BRIDGE_ORIGIN=* ist eine weitere bewusste
  Büronetz-Option, kein Default.

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
import re
import secrets
import struct
import sys
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
# Workorder-Deckel (Block 2 / AB2): reine Text-Payload — 1 MB ist weit über
# jeder realen Auftragsliste, aber ein harter Riegel gegen Speicher-DoS.
MAX_WORKORDER_BYTES = int(os.environ.get("KOSMO_BRIDGE_MAX_WORKORDER", str(1024 * 1024)))
# Optionaler Spiegel (Buildplan E6): ist der Pfad gesetzt, legt die Bridge je
# Workorder zusätzlich die menschlich lesbare .md dort ab (z.B. das Repo-
# Verzeichnis docs/auftraege/). Default AUS — nur der Job-Store zählt.
AUFTRAEGE_DIR = os.environ.get("KOSMO_BRIDGE_AUFTRAEGE_DIR", "").strip()

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


# ---------- KosmoDev-Workorders (Block 2 / AB2, kosmodev.workorder/v1) ----------
#
# Der Kreis «Owner erfasst → Worker setzt um»: die Bridge nimmt die Workorder
# als reinen TEXT an, legt sie im Store ab (STORE/dev/…, eigenes Unter-
# verzeichnis — Dev-Jobs verschmutzen die /jobs-Render-Liste nicht) und
# vermittelt sie an einen Dev-Worker (Claude Code an der HomeStation) über
# das Protokoll claim→result. Die Bridge führt NIE selbst Code aus.
#
# WICHTIG (FastAPI-Routing): diese Routen stehen VOR /jobs/{job_id}, sonst
# fängt der {job_id}-Platzhalter den Literal-Pfad "dev" ab.

_DEV_ID_RE = re.compile(r"^dev-\d+-[0-9a-f]{6}$")
_QUELLEN = ("gesprochen", "getippt", "kosmo")


async def _read_body_capped(request: Request, max_bytes: int, label: str) -> bytes:
    """Streamt den Request-Body mit Deckel — dieselbe Idee wie _read_capped,
    aber für JSON-Bodies statt multipart-Uploads."""
    chunks: list[bytes] = []
    total = 0
    async for chunk in request.stream():
        total += len(chunk)
        if total > max_bytes:
            protokolliere_sicherheitsereignis(
                "upload_deckel_abgelehnt", "bridge:_read_body_capped", f"{label} über Deckel von {max_bytes} Bytes"
            )
            raise HTTPException(413, f"{label} überschreitet Deckel von {max_bytes} Bytes")
        chunks.append(chunk)
    return b"".join(chunks)


def _dev_job_file(job_id: str) -> Path:
    """Job-Datei eines Dev-Jobs — erzwingt das dev-Präfix (kein Vermischen mit
    vis-/vsplat-/bsim-Jobs) und die Store-Pfad-Sicherheit."""
    if not _DEV_ID_RE.match(job_id):
        raise HTTPException(404, "Dev-Job unbekannt (ungültige Job-ID)")
    return _safe_store_path("dev", job_id) / "job.json"


def _validiere_workorder(payload: dict) -> dict:
    """Validiert die Workorder gegen kosmodev.workorder/v1 (Spiegel des
    zod-Contracts in @kosmo/contracts) — ehrliche 400er statt stillem Raten."""
    if payload.get("schema", "kosmodev.workorder/v1") != "kosmodev.workorder/v1":
        raise HTTPException(400, f"unbekanntes Workorder-Schema: {payload.get('schema')}")
    projekt = payload.get("projekt")
    if not isinstance(projekt, str) or not projekt.strip():
        raise HTTPException(400, "Workorder braucht ein Projekt")
    auftraege = payload.get("auftraege")
    if not isinstance(auftraege, list) or not (1 <= len(auftraege) <= 200):
        raise HTTPException(400, "Workorder braucht 1–200 Aufträge")
    for a in auftraege:
        if not isinstance(a, dict):
            raise HTTPException(400, "Auftrag muss ein Objekt sein")
        for feld in ("id", "ts", "text", "station"):
            if not isinstance(a.get(feld), str) or not a[feld].strip():
                raise HTTPException(400, f"Auftrag ohne gültiges Feld «{feld}»")
        if a.get("quelle") not in _QUELLEN:
            raise HTTPException(400, f"unbekannte Auftrag-Quelle: {a.get('quelle')}")
        if "ort" in a and a["ort"] is not None and not isinstance(a["ort"], str):
            raise HTTPException(400, "Auftrag-Feld «ort» muss Text sein")
    return {
        "schema": "kosmodev.workorder/v1",
        "projekt": projekt,
        "erzeugt_um": str(payload.get("erzeugt_um", _now())),
        "auftraege": auftraege,
    }


def _workorder_md(workorder: dict, job_id: str) -> str:
    """Menschlich lesbare Workorder mit YAML-Frontmatter (maschinell greifbar)
    — dasselbe Checkbox-Format wie der App-Export (alsWorkorderMd), plus
    Frontmatter, damit ein Worker die Datei ohne die Bridge parsen kann."""
    auftraege = workorder["auftraege"]
    ids = ", ".join(a["id"] for a in auftraege)
    zeilen = [
        "---",
        "schema: kosmodev.workorder/v1",
        f"job_id: {job_id}",
        f"projekt: {json.dumps(workorder['projekt'], ensure_ascii=False)}",
        f"erzeugt_um: {workorder['erzeugt_um']}",
        f"auftrag_ids: [{ids}]",
        "---",
        "",
        f"# Workorder {job_id} — {workorder['projekt']}",
        "",
        f"{len(auftraege)} Aufträge. Arbeitsmuster: je Auftrag Feature → Tests → ROADMAP-Eintrag → deutscher Commit.",
        f"Rückmeldung: POST /jobs/dev/{job_id}/result (kosmodev.workorder/v1, DevJobResult).",
        "",
    ]
    stationen: dict[str, list[dict]] = {}
    for a in auftraege:
        stationen.setdefault(a["station"], []).append(a)
    for station, liste in stationen.items():
        zeilen.append(f"## {station}")
        for a in liste:
            ort = f" — _wo: {a['ort']}_" if a.get("ort") else ""
            zeilen.append(f"- [ ] {a['text']}{ort} `{a['quelle']} · {a['id']}`")
        zeilen.append("")
    return "\n".join(zeilen)


@app.post("/jobs/dev")
async def create_dev_job(request: Request):
    raw = await _read_body_capped(request, MAX_WORKORDER_BYTES, "workorder")
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(400, f"Workorder ist kein JSON: {e}")
    if not isinstance(payload, dict):
        raise HTTPException(400, "Workorder muss ein JSON-Objekt sein")
    workorder = _validiere_workorder(payload)

    job_id = f"dev-{int(time.time())}-{secrets.token_hex(3)}"
    job_dir = _safe_store_path("dev", job_id)
    job_dir.mkdir(parents=True, exist_ok=True)
    (job_dir / "workorder.json").write_text(json.dumps(workorder, indent=2, ensure_ascii=False))
    md = _workorder_md(workorder, job_id)
    (job_dir / "workorder.md").write_text(md)

    # Optionaler Spiegel ins Owner-Verzeichnis (E6) — best effort: ein kaputter
    # Spiegelpfad darf die Job-Annahme nicht verhindern, wird aber benannt.
    record_message = None
    if AUFTRAEGE_DIR:
        try:
            spiegel = Path(AUFTRAEGE_DIR)
            spiegel.mkdir(parents=True, exist_ok=True)
            (spiegel / f"{workorder['erzeugt_um'][:10]}-{job_id}.md").write_text(md)
        except OSError as e:
            record_message = f"Spiegel nach KOSMO_BRIDGE_AUFTRAEGE_DIR fehlgeschlagen: {e}"

    record = {
        "job_id": job_id,
        "status": "queued",
        "kind": "dev-workorder",
        "created_at": _now(),
        "projekt": workorder["projekt"],
        "anzahl_auftraege": len(workorder["auftraege"]),
        **({"message": record_message} if record_message else {}),
    }
    (job_dir / "job.json").write_text(json.dumps(record, indent=2, ensure_ascii=False))
    return record


@app.get("/jobs/dev")
async def list_dev_jobs(status: str | None = None):
    jobs = []
    dev_dir = STORE / "dev"
    if dev_dir.exists():
        for d in sorted(dev_dir.iterdir(), reverse=True):
            f = d / "job.json"
            if f.exists():
                record = json.loads(f.read_text())
                if status is None or record.get("status") == status:
                    jobs.append(record)
    return jobs[:50]


@app.get("/jobs/dev/{job_id}")
async def get_dev_job(job_id: str):
    f = _dev_job_file(job_id)
    if not f.exists():
        raise HTTPException(404, "Dev-Job unbekannt")
    record = json.loads(f.read_text())
    result_file = f.parent / "dev-result.json"
    if result_file.exists():
        record["result"] = json.loads(result_file.read_text())
    return record


@app.get("/jobs/dev/{job_id}/workorder")
async def get_dev_workorder(job_id: str):
    """Die Workorder selbst (JSON) — der Weg, über den ein Worker den vollen
    Auftrags-Text holt (die .md liegt daneben im Store)."""
    f = _dev_job_file(job_id).parent / "workorder.json"
    if not f.exists():
        raise HTTPException(404, "Workorder unbekannt")
    return json.loads(f.read_text())


@app.post("/jobs/dev/{job_id}/claim")
async def claim_dev_job(job_id: str, payload: dict = Body(default={})):
    """Worker übernimmt den Job — queued→running + Worker-Name (verhindert
    Doppelarbeit). Idempotent für denselben Worker; ein zweiter Worker wird
    mit 409 abgewiesen statt still zu überschreiben."""
    worker = str(payload.get("worker", "")).strip()
    if not worker:
        raise HTTPException(400, "claim braucht einen Worker-Namen")
    f = _dev_job_file(job_id)
    if not f.exists():
        raise HTTPException(404, "Dev-Job unbekannt")
    record = json.loads(f.read_text())
    if record.get("status") == "running" and record.get("worker") == worker:
        return record
    if record.get("status") != "queued":
        raise HTTPException(409, f"Job ist {record.get('status')} — claim nur aus queued")
    record["status"] = "running"
    record["worker"] = worker
    record["updated_at"] = _now()
    f.write_text(json.dumps(record, indent=2, ensure_ascii=False))
    return record


@app.post("/jobs/dev/{job_id}/result")
async def report_dev_result(job_id: str, payload: dict = Body(default={})):
    """Worker meldet das Ergebnis (DevJobResult) → done. Ehrlichkeits-Regeln
    serverseitig erzwungen: Worker-Name Pflicht; ein fake-worker darf NIE
    einen Commit-Beleg liefern (Belege werden nicht erfunden, Buildplan E5)."""
    worker = str(payload.get("worker", "")).strip()
    if not worker:
        raise HTTPException(400, "Result braucht einen Worker-Namen")
    ergebnisse = payload.get("ergebnisse")
    if not isinstance(ergebnisse, list) or not ergebnisse:
        raise HTTPException(400, "Result braucht mindestens ein Ergebnis")
    for e in ergebnisse:
        if not isinstance(e, dict) or not isinstance(e.get("auftrag_id"), str) or not isinstance(e.get("umgesetzt"), bool):
            raise HTTPException(400, "Ergebnis braucht auftrag_id (Text) und umgesetzt (bool)")
        if worker == "fake-worker" and e.get("commit"):
            raise HTTPException(400, "fake-worker darf keinen Commit-Beleg erfinden (E5)")
    f = _dev_job_file(job_id)
    if not f.exists():
        raise HTTPException(404, "Dev-Job unbekannt")
    record = json.loads(f.read_text())
    if record.get("status") == "cancelled":
        # Abbruch gewann — kein Ergebnis mehr für einen abgebrochenen Job.
        raise HTTPException(409, "Job ist cancelled — Ergebnis wird nicht angenommen")
    if record.get("status") not in ("running", "queued"):
        raise HTTPException(409, f"Job ist {record.get('status')} — Ergebnis nur aus running")
    if record.get("status") == "queued":
        # Ein Result ohne vorherigen claim ist erlaubt, aber der Worker-Name
        # wird nachgetragen — das Protokoll bleibt nachvollziehbar.
        record["worker"] = worker
    result = {
        "worker": worker,
        "abgeschlossen_um": str(payload.get("abgeschlossen_um", _now())),
        "ergebnisse": ergebnisse,
    }
    (f.parent / "dev-result.json").write_text(json.dumps(result, indent=2, ensure_ascii=False))
    record["status"] = "done"
    record["updated_at"] = _now()
    f.write_text(json.dumps(record, indent=2, ensure_ascii=False))
    record["result"] = result
    return record


@app.post("/jobs/dev/{job_id}/cancel")
async def cancel_dev_job(job_id: str):
    """Kooperativer Abbruch — queued/running → cancelled; Endzustände bleiben."""
    f = _dev_job_file(job_id)
    if not f.exists():
        raise HTTPException(404, "Dev-Job unbekannt")
    record = json.loads(f.read_text())
    if record.get("status") in ("queued", "running"):
        record["status"] = "cancelled"
        record["updated_at"] = _now()
        record["message"] = "Vom Nutzer abgebrochen."
        f.write_text(json.dumps(record, indent=2, ensure_ascii=False))
    return record


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
        # Freigabe-Pflicht gilt auch hier (HS3-Nachbesserung/Fable-Auflage 4):
        # Video→Splat ist rechenintensiv — ohne Freigabe kein SfM-Lauf.
        "status": "awaiting_approval" if APPROVAL_PFLICHT else "queued",
        "frame_count": len(frame_names),
        "meta": meta_obj,
        "created_at": _now(),
    }
    if APPROVAL_PFLICHT:
        record["approval_token"] = f"CONFIRMED_SPLAT_{secrets.token_hex(4)}"
    (job_dir / "job.json").write_text(json.dumps(record, indent=2))
    return record


# ---------- Blender-Sim-Jobs (ehrliche Übergabe, keine Physik hier) ----------
#
# V2-Technik Block 1 / HS4: Wind-, Sonnenstunden- und Gebäude-Energie-
# Simulationen (Vertrag kosmo.blender-sim/v1, siehe
# packages/kosmo-contracts/src/blender-sim.ts) laufen NUR mit Blender headless
# auf der HomeStation (5090). Dieser Endpoint nimmt Szene + Modell entgegen
# und legt einen echten Job an — er täuscht aber KEIN Simulationsergebnis vor:
# ohne angeschlossenen Blender-Worker bleibt der Job ehrlich als
# "kein-blender-worker" stehen (siehe _fake_worker_step unten).

BLENDER_SIM_ARTEN = {"wind", "sonnenstunden", "gebaeude-energie"}


@app.post("/jobs/blender-sim")
async def create_blender_sim_job(szene: str = Form(...), model: UploadFile = File(...)):
    try:
        szene_obj = json.loads(szene)
    except json.JSONDecodeError as e:
        raise HTTPException(400, f"szene ist kein JSON: {e}")

    art = szene_obj.get("art")
    if art not in BLENDER_SIM_ARTEN:
        raise HTTPException(400, f"ungültige art: {art!r} (erlaubt: {sorted(BLENDER_SIM_ARTEN)})")

    job_id = f"bsim-{int(time.time())}-{secrets.token_hex(3)}"
    job_dir = STORE / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    model_bytes = await _read_capped(model, MAX_UPLOAD_MODEL_BYTES, "model.glb")
    model_path = job_dir / "model.glb"
    model_path.write_bytes(model_bytes)
    szene_obj["geometry"] = {"path": str(model_path), "format": "glb"}
    # Schreibziel IMMER serverseitig erzwingen — ein vom Client geliefertes
    # `out` wird verworfen statt übernommen, exakt wie bei /jobs (R4).
    szene_obj["out"] = str(job_dir / "out")
    (job_dir / "blender-sim.json").write_text(json.dumps(szene_obj, indent=2))

    record = {
        "job_id": job_id,
        "kind": "blender-sim",
        # Freigabe-Pflicht gilt auch für die (teure) Blender-Simulation
        # (HS3-Nachbesserung/Fable-Auflage 4) — ohne Freigabe kein Worker-Lauf.
        "status": "awaiting_approval" if APPROVAL_PFLICHT else "queued",
        "art": art,
        "scene": str(job_dir / "blender-sim.json"),
        "created_at": _now(),
    }
    if APPROVAL_PFLICHT:
        record["approval_token"] = f"CONFIRMED_SIM_{secrets.token_hex(4)}"
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

    if status == "queued" and record.get("kind") == "blender-sim":
        # Fable-Urteil §3.2: ein Platzhalter-BILD ist sichtbar ein Platzhalter
        # (markiert), aber eine Platzhalter-SIMULATIONSZAHL (Wind/Sonnenstunden/
        # Energie) sähe aus wie ein echtes Analyseergebnis und könnte eine
        # Bau-Entscheidung verseuchen. Darum wird hier NIEMALS eine Zahl
        # erfunden — ohne echten Blender-Worker bleibt der Job ehrlich auf
        # "kein-blender-worker" stehen, mit Begründung statt Fake-Physik.
        record["status"] = "kein-blender-worker"
        record["message"] = (
            "Diese Bridge hat keinen Blender-Worker angeschlossen — Wind/"
            "Sonnenstunden/Energie brauchen Blender headless auf der "
            "HomeStation (5090). Physik wird nicht erfunden."
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
        # Kooperativer Abbruch (normatives Worker-Protokoll, README Punkt 3):
        # VOR dem teuren Schreiben den Status frisch lesen. Ein /cancel, das
        # zwischen dem Schrittbeginn und hier eintraf, darf nicht überschrieben
        # werden — sonst entstünde ein Ergebnis für einen abgebrochenen Job.
        img = job_dir / "cam-01.png"
        img.write_bytes(_placeholder_png())
        result = {
            "schema": "kosmovis.render-result/v2",
            "job_id": record["job_id"],
            "images": [img.name],
            "ai_variant": img.name,
            "qa": {
                # Alle Fake-Werte tragen "fake-worker" als method — kein
                # vorgetäuschtes echtes Verfahren (auch nicht beim Stil).
                "style": {"style_score": 0.42, "threshold": 0.3, "passed": True, "method": "fake-worker"},
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
        aktuell = json.loads(f.read_text())
        if aktuell.get("status") == "cancelled":
            # Abbruch gewann das Rennen — kein render-result.json, kein done.
            img.unlink(missing_ok=True)
            return
        (job_dir / "render-result.json").write_text(json.dumps(result, indent=2))
        record["status"] = "done"
        record["progress"] = {"phase": "fertig", "pct": 1.0}
        record["updated_at"] = _now()
        f.write_text(json.dumps(record, indent=2))


def _fake_dev_worker_step(job_dir: Path) -> None:
    """Der Fake-DEV-Worker schliesst nur den PROTOKOLL-Kreis (Buildplan E5):
    claim → result, aber das Result sagt ehrlich `umgesetzt: false` mit
    Simulation-Notiz und OHNE Commit-Beleg — anders als das Platzhalter-Bild
    könnte ein erfundener Hash für echte Arbeit gehalten werden. Jobs, die ein
    ECHTER Worker geclaimt hat, fasst er nie an."""
    f = job_dir / "job.json"
    if not f.exists():
        return
    record = json.loads(f.read_text())
    status = record.get("status")

    if status == "queued":
        record["status"] = "running"
        record["worker"] = "fake-worker"
        record["updated_at"] = _now()
        f.write_text(json.dumps(record, indent=2, ensure_ascii=False))
        return

    if status == "running" and record.get("worker") == "fake-worker":
        workorder_file = job_dir / "workorder.json"
        auftraege = []
        if workorder_file.exists():
            auftraege = json.loads(workorder_file.read_text()).get("auftraege", [])
        result = {
            "worker": "fake-worker",
            "abgeschlossen_um": _now(),
            "ergebnisse": [
                {
                    "auftrag_id": a.get("id", "?"),
                    "umgesetzt": False,
                    "notiz": "Simulation — keine echte Umsetzung (Fake-Worker ohne Code-Zugriff)",
                }
                for a in auftraege
            ]
            or [{"auftrag_id": "?", "umgesetzt": False, "notiz": "Simulation — Workorder nicht lesbar"}],
        }
        # Abbruch-Rennen wie beim Render-Worker: Status frisch lesen.
        aktuell = json.loads(f.read_text())
        if aktuell.get("status") == "cancelled":
            return
        (job_dir / "dev-result.json").write_text(json.dumps(result, indent=2, ensure_ascii=False))
        record["status"] = "done"
        record["updated_at"] = _now()
        f.write_text(json.dumps(record, indent=2, ensure_ascii=False))


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
    dev_dir = STORE / "dev"
    if dev_dir.exists():
        for d in dev_dir.iterdir():
            try:
                _fake_dev_worker_step(d)
            except Exception:
                continue


def _fake_worker_loop():
    while True:
        time.sleep(1.0)
        _fake_worker_pass()


LOKALE_HOSTS = ("127.0.0.1", "localhost")


class BridgeBindFehler(RuntimeError):
    """Start wird verweigert: --host ist nicht-lokal, kein Token gesetzt und der
    bewusste Offen-Betrieb wurde nicht explizit bestätigt (--offen-ohne-token /
    KOSMO_BRIDGE_OFFEN=1). Serie I / I2-Nachtrag (08.07.2026): sichere
    Standards, laute Ausnahmen — kein stilles Offen mehr."""


def bind_entscheidung(host: str, token: str, offen_bewusst: bool) -> list[str]:
    """Reine, ohne Serverstart testbare Entscheidungsfunktion für das Startlog.

    Regeln (Serie I / I2-Nachtrag, 08.07.2026):
      - Host lokal (127.0.0.1/localhost): läuft immer, Token optional — die
        Meldung ist präzise (kein "im Netz offen", weil es das schlicht nicht
        ist).
      - Host nicht-lokal + Token gesetzt: LAN-Betrieb wie gehabt, nur ein
        informativer Hinweis.
      - Host nicht-lokal + KEIN Token + KEIN --offen-ohne-token/KOSMO_BRIDGE_OFFEN:
        Start wird verweigert (`BridgeBindFehler`) — sicherer Standard.
      - Host nicht-lokal + KEIN Token + bewusst bestätigt: startet, aber mit
        unübersehbarer Warnung im Log.
    """
    ist_lokal = host in LOKALE_HOSTS
    zeilen: list[str] = []

    if ist_lokal:
        if token:
            zeilen.append("Token gesetzt — Header X-Kosmo-Token wird verlangt (zusätzlich zum lokalen Bind).")
        else:
            zeilen.append(
                f"Hinweis: KOSMO_BRIDGE_TOKEN nicht gesetzt — Bind bleibt bei {host} "
                "(nur diese Maschine erreicht die Bridge, kein Netzzugriff)."
            )
        return zeilen

    # Host nicht-lokal ab hier:
    if token:
        zeilen.append(f"Token gesetzt — Bind an {host} ist eine bewusste Büronetz-Option, im LAN erreichbar.")
        return zeilen

    if not offen_bewusst:
        raise BridgeBindFehler(
            f"Start verweigert: --host {host} ohne KOSMO_BRIDGE_TOKEN würde die Bridge "
            "ungeschützt im Netz erreichbar machen (jeder Client im Netz kann Jobs anlegen/"
            "abrufen). Entweder KOSMO_BRIDGE_TOKEN setzen, oder den bewussten Offen-Betrieb "
            "explizit bestätigen: --offen-ohne-token (bzw. Env KOSMO_BRIDGE_OFFEN=1)."
        )

    zeilen.append("!" * 70)
    zeilen.append(
        f"⚠⚠⚠ BRIDGE OFFEN OHNE TOKEN AN {host} — JEDER CLIENT IM ERREICHBAREN NETZ "
        "KANN JOBS ANLEGEN/ABRUFEN ⚠⚠⚠"
    )
    zeilen.append("Bewusst per --offen-ohne-token / KOSMO_BRIDGE_OFFEN=1 bestätigt (Serie I / I2-Nachtrag).")
    zeilen.append("!" * 70)
    return zeilen


def _store_fuer(port: int, store_arg: str | None) -> Path:
    """H-31 (docs/SIM-BEFUNDE.md): ohne explizites `--store`/`KOSMO_JOB_STORE`
    landeten bislang ALLE Bridge-Instanzen — unabhängig vom `--port` — im
    selben `/tmp/kosmo-jobs` (der `--store`-Default war `str(STORE)`, aus dem
    port-unabhängigen Modul-Default berechnet, BEVOR `--port` überhaupt
    geparst wird). Parallele Test-/Journey-Läufe, die je einen eigenen Port
    wählen (um Port-Kollisionen zu vermeiden), teilten sich dadurch trotzdem
    EINEN Job-Ordner — `_fake_worker_pass()` iteriert je Sekunde über ALLE
    Jobs im Store, unabhängig davon, welcher Prozess sie angelegt hat, also
    bremsten sich fremde Läufe gegenseitig aus (Befund: 52 Jobs in einem
    gemeinsamen Store, eine Journey blieb >25s ohne Bild).

    Minimaler, additiver Fix: der Store wird — wenn nicht explizit gesetzt —
    vom PORT abgeleitet, damit unterschiedliche Bridge-Instanzen automatisch
    getrennte Job-Ordner bekommen. Die zentrale, von allen geteilte Bridge
    (Port 8600, s. CLAUDE.md/Setup) bleibt dabei BEWUSST beim alten, festen
    Pfad `/tmp/kosmo-jobs` — ihr Verhalten für Einzel-Läufe ändert sich nicht.
    Nur andere Ports (isolierte Test-/Parallel-Instanzen) bekommen einen
    eigenen `/tmp/kosmo-jobs-<port>`. Ein explizites `--store` oder
    `KOSMO_JOB_STORE` hat weiterhin immer Vorrang vor dieser Ableitung.
    """
    if store_arg is not None:
        return Path(store_arg)
    env_store = os.environ.get("KOSMO_JOB_STORE")
    if env_store:
        return Path(env_store)
    if port == 8600:
        return Path("/tmp/kosmo-jobs")
    return Path(f"/tmp/kosmo-jobs-{port}")


def cli():
    global STORE, OLLAMA, FAKE_WORKER, TOKEN
    ap = argparse.ArgumentParser(description="Kosmo-Bridge")
    ap.add_argument(
        "--store",
        default=None,
        help="Job-Store-Verzeichnis (Default: portabhängig — s. _store_fuer/H-31)",
    )
    ap.add_argument("--ollama", default=OLLAMA, help="Ollama-URL")
    # Default eng: nur lokal erreichbar. 0.0.0.0 (alle Interfaces, inkl.
    # Büronetz/LAN) ist eine bewusste Owner-Option — muss explizit gesetzt
    # werden, damit die Bridge nicht aus Versehen netzweit offen startet.
    ap.add_argument("--host", default="127.0.0.1", help="0.0.0.0 nur bewusst fürs Büronetz setzen")
    ap.add_argument("--port", type=int, default=8600)
    ap.add_argument("--fake-worker", action="store_true", help="Jobs ohne GPU beantworten (Demo/CI)")
    # Serie I / I2-Nachtrag (08.07.2026): expliziter, bewusster Offen-Betrieb
    # ohne Token bei nicht-lokalem Host — sonst wird der Start verweigert.
    ap.add_argument(
        "--offen-ohne-token",
        action="store_true",
        help="Bestätigt bewusst: nicht-lokaler Host OHNE Token (sonst verweigert die Bridge den Start).",
    )
    args = ap.parse_args()
    STORE = _store_fuer(args.port, args.store)
    STORE.mkdir(parents=True, exist_ok=True)
    print(f"Job-Store: {STORE}")
    OLLAMA = args.ollama
    if args.fake_worker:
        FAKE_WORKER = True
        threading.Thread(target=_fake_worker_loop, daemon=True).start()
        print("⚠ Fake-Worker aktiv — Render/TTS/Embeddings sind Platzhalter")
    offen_bewusst = args.offen_ohne_token or os.environ.get("KOSMO_BRIDGE_OFFEN", "").strip().lower() in (
        "1",
        "true",
        "ja",
    )
    try:
        for zeile in bind_entscheidung(args.host, TOKEN, offen_bewusst):
            print(zeile)
    except BridgeBindFehler as fehler:
        print(f"FEHLER: {fehler}", file=sys.stderr)
        raise SystemExit(1) from fehler
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
