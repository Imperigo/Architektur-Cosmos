"""Protokoll-Konformitätstest für den echten Render-Worker
`kosmo_bridge/kosmo_worker_comfyui.py` (V090-SPEZ §E-R) — kein pytest nötig,
gleicher Stil wie `test_blender_worker.py`/`test_bridge_haerte.py` (kein
Test-Framework, nur `check(name, cond)` + Exit-Code). Läuft OHNE GPU und
OHNE echtes ComfyUI: ein minimaler HTTP-Mock-Server (`http.server`, stdlib,
keine neue Dependency) spielt ComfyUI auf einem freien lokalen Port.

Deckt die im Auftrag verlangten Mindestfälle ab (V090-SPEZ §E-R Punkt 3):
  (a) voller Lebenszyklus queued → running → done mit echtem PNG-Bytes-
      Artefakt, das über den Mock-HTTP-Roundtrip lief (kein
      selbstgemaltes Byte-Array, sondern eine Antwort von `GET /view`).
  (b) kooperativer Abbruch: `cancelled` zwischen Claim und Ergebnis-
      Schreiben → KEINE render-result.json, KEIN Bild-Artefakt.
  (c) ComfyUI unerreichbar ⇒ ehrlicher `kein-render-worker`-Status,
      NIE `running`/`done`.
  (d) Modell (Checkpoint) fehlt in ComfyUI ⇒ derselbe ehrliche Status,
      andere Begründung (nennt den Checkpoint-Namen).
  (e) Idle-Fenster respektiert: `IdleGate`-Override `belegt` → Job bleibt
      `queued`, kein Claim.
  (f) `idle_window_only: false` überspringt das Idle-Fenster bewusst
      (Store/Record-Mechanik).
  (g) CLI ohne existierenden `--store` → Exit 2.
  (h) Mehrkamera-Job (Liste in `cameras`) liefert je Kamera ein benanntes
      Bild.

Aufruf:
    python3 tools/homestation-bridge/test_kosmo_worker_comfyui.py

Exit-Code 0 = alle Prüfungen grün. Exit-Code != 0 (mit Liste der
fehlgeschlagenen Prüfungen) sonst.
"""

from __future__ import annotations

import base64
import io
import json
import shutil
import sys
import tempfile
import threading
from contextlib import redirect_stderr, redirect_stdout
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))

from kosmo_bridge import kosmo_worker_comfyui as w  # noqa: E402

failures: list[str] = []
_zaehler = 0


def check(name: str, cond: bool) -> None:
    global _zaehler
    _zaehler += 1
    status = "OK" if cond else "FEHLER"
    print(f"[{status}] {name}")
    if not cond:
        failures.append(name)


# ---------------------------------------------------------------------------
# Minimale, aber ECHTE PNG-Bytes (1×1 Pixel, öffentlich bekannte gültige
# PNG-Konstante) — der Mock liefert damit ein tatsächlich valides Bild über
# GET /view, kein Platzhalter-Text, der nur wie ein Bild aussieht.
# ---------------------------------------------------------------------------
_ECHTES_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)
assert _ECHTES_PNG[:8] == b"\x89PNG\r\n\x1a\n", "PNG-Signatur der Test-Konstante ist kaputt"


# ---------------------------------------------------------------------------
# Mock-ComfyUI: http.server (stdlib), keine neue Dependency.
# ---------------------------------------------------------------------------


class MockComfyUIHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, format, *args):  # noqa: A002 - stdlib-Signatur
        pass  # kein Test-Rauschen auf stderr

    def _json(self, status: int, payload) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):  # noqa: N802 - stdlib-Signatur
        parsed = urlparse(self.path)
        server: MockComfyUIServer = self.server  # type: ignore[assignment]

        if parsed.path == "/system_stats":
            self._json(200, {"system": {"comfyui_version": "mock"}})
            return

        if parsed.path.startswith("/object_info"):
            self._json(200, server.object_info)
            return

        if parsed.path.startswith("/history/"):
            prompt_id = parsed.path.rsplit("/", 1)[-1]
            with server.lock:
                zustand = server.prompts.get(prompt_id)
                if zustand is None:
                    self._json(200, {})
                    return
                zustand["versuche"] += 1
                if zustand["versuche"] < zustand["bereit_nach"]:
                    self._json(200, {})
                    return
                self._json(200, {prompt_id: zustand["ergebnis"]})
            return

        if parsed.path == "/view":
            qs = parse_qs(parsed.query)
            filename = qs.get("filename", [""])[0]
            with server.lock:
                server.view_aufrufe.append(filename)
            self.send_response(200)
            self.send_header("Content-Type", "image/png")
            self.send_header("Content-Length", str(len(_ECHTES_PNG)))
            self.end_headers()
            self.wfile.write(_ECHTES_PNG)
            return

        self._json(404, {"error": "unbekannter Mock-Pfad"})

    def do_POST(self):  # noqa: N802 - stdlib-Signatur
        parsed = urlparse(self.path)
        server: MockComfyUIServer = self.server  # type: ignore[assignment]
        if parsed.path == "/prompt":
            laenge = int(self.headers.get("Content-Length", "0"))
            _ = self.rfile.read(laenge)  # Body wird nicht validiert, reicht für den Adapter-Test
            with server.lock:
                server.zaehler += 1
                prompt_id = f"p{server.zaehler}"
                server.prompts[prompt_id] = {
                    "versuche": 0,
                    "bereit_nach": server.bereit_nach,
                    "ergebnis": {
                        "status": {"completed": True},
                        "outputs": {"7": {"images": [{"filename": f"{prompt_id}.png", "subfolder": "", "type": "output"}]}},
                    },
                }
            self._json(200, {"prompt_id": prompt_id, "number": 1, "node_errors": {}})
            return
        self._json(404, {"error": "unbekannter Mock-Pfad"})


class MockComfyUIServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, checkpoints: list[str], bereit_nach: int = 1) -> None:
        super().__init__(("127.0.0.1", 0), MockComfyUIHandler)
        self.lock = threading.Lock()
        self.prompts: dict[str, dict] = {}
        self.zaehler = 0
        self.bereit_nach = bereit_nach  # wie viele /history-Polls, bis "completed"
        self.view_aufrufe: list[str] = []
        self.object_info = {
            "CheckpointLoaderSimple": {"input": {"required": {"ckpt_name": [checkpoints]}}},
        }

    @property
    def base_url(self) -> str:
        return f"http://127.0.0.1:{self.server_address[1]}"


def starte_mock(checkpoints: list[str], bereit_nach: int = 1) -> MockComfyUIServer:
    server = MockComfyUIServer(checkpoints, bereit_nach=bereit_nach)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


def stoppe_mock(server: MockComfyUIServer) -> None:
    server.shutdown()
    server.server_close()


# ---------------------------------------------------------------------------
# Store-/Job-Helfer
# ---------------------------------------------------------------------------

CHECKPOINT = "sd_xl_base_1.0.safetensors"


def neuer_store() -> Path:
    return Path(tempfile.mkdtemp(prefix="kosmo-render-worker-test-"))


def neue_scene(**overrides) -> dict:
    scene = {
        "schema": "kosmovis.render-scene/v1",
        "geometry": {"path": "model.glb", "format": "glb"},
        "out": "out",
        "cameras": "auto",
        "render": {"resolution": [1600, 1000], "samples": 128, "faithful": 0.8},
        "style": {"mode": "none", "refs": [], "prompt": "Sichtbeton-Fassade, Morgenlicht"},
        "vis": {"skip": False, "backbone": "qwen", "upscale": False},
    }
    scene.update(overrides)
    return scene


def neuer_job(store: Path, suffix: str, scene: dict, **record_felder) -> tuple[str, Path]:
    job_id = f"vis-{suffix}"
    job_dir = store / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    (job_dir / "render-scene.json").write_text(json.dumps(scene, indent=2), encoding="utf-8")
    record = {
        "job_id": job_id,
        "status": "queued",
        "scene": str(job_dir / "render-scene.json"),
        "idle_window_only": True,
        "created_at": "2026-07-22T00:00:00Z",
        **record_felder,
    }
    (job_dir / "job.json").write_text(json.dumps(record, indent=2), encoding="utf-8")
    return job_id, job_dir


def lies_record(job_dir: Path) -> dict:
    return json.loads((job_dir / "job.json").read_text(encoding="utf-8"))


def idle_immer() -> w.IdleGate:
    return w.IdleGate(override=True)


def idle_nie() -> w.IdleGate:
    return w.IdleGate(override=False)


# ---------------------------------------------------------------------------
# (a) voller Lebenszyklus queued → running → done, echtes PNG aus dem Mock
# ---------------------------------------------------------------------------
mock_a = starte_mock([CHECKPOINT])
try:
    store_a = neuer_store()
    job_id_a, dir_a = neuer_job(store_a, "1000-aaa", neue_scene())
    comfy_a = w.ComfyUIClient(mock_a.base_url)

    bericht_a = w.fuehre_pass_aus(store_a, comfy_a, idle_immer(), "comfyui-worker", CHECKPOINT, 0.01, 5.0)
    record_a = lies_record(dir_a)

    check("(a) Bericht nennt genau einen Fertigstellungs-Eintrag", len(bericht_a.fertiggestellt) == 1)
    check("(a) Status done", record_a["status"] == "done")
    check("(a) worker-Feld gesetzt", record_a.get("worker") == "comfyui-worker")
    check("(a) progress.pct == 1.0", record_a.get("progress", {}).get("pct") == 1.0)
    check("(a) render-result.json existiert", (dir_a / "render-result.json").exists())
    check("(a) Bild-Artefakt cam-01.png existiert", (dir_a / "cam-01.png").exists())
    check("(a) Bild-Artefakt trägt echte PNG-Signatur aus dem Mock", (dir_a / "cam-01.png").read_bytes()[:8] == b"\x89PNG\r\n\x1a\n")
    check("(a) Bild-Bytes identisch zur Mock-Antwort (echter HTTP-Roundtrip)", (dir_a / "cam-01.png").read_bytes() == _ECHTES_PNG)
    check("(a) GET /view wurde tatsächlich vom Worker aufgerufen", len(mock_a.view_aufrufe) == 1)

    ergebnis_a = json.loads((dir_a / "render-result.json").read_text(encoding="utf-8"))
    check("(a) render-result.json: schema kosmovis.render-result/v2", ergebnis_a.get("schema") == "kosmovis.render-result/v2")
    check("(a) render-result.json: images == [cam-01.png]", ergebnis_a.get("images") == ["cam-01.png"])
    check("(a) render-result.json: qa.verdict.passed True", ergebnis_a.get("qa", {}).get("verdict", {}).get("passed") is True)
    check("(a) render-result.json: qa.style FEHLT (ehrlich, kein erfundener Stil-Score)", "style" not in ergebnis_a.get("qa", {}))
    check("(a) render-result.json: qa.geometry FEHLT (ehrlich, kein erfundener Geometrie-Score)", "geometry" not in ergebnis_a.get("qa", {}))
    check(
        "(a) qa.verdict.reason nennt den Checkpoint und die fehlende QA ehrlich",
        CHECKPOINT in ergebnis_a["qa"]["verdict"]["reason"] and "nicht berechnet" in ergebnis_a["qa"]["verdict"]["reason"],
    )
finally:
    stoppe_mock(mock_a)


# ---------------------------------------------------------------------------
# (b) kooperativer Abbruch: cancelled zwischen Claim und Ergebnis-Schreiben
#     → KEINE render-result.json, KEIN Bild-Artefakt.
# ---------------------------------------------------------------------------
mock_b = starte_mock([CHECKPOINT])
try:
    store_b = neuer_store()
    job_id_b, dir_b = neuer_job(store_b, "2000-bbb", neue_scene())
    comfy_b = w.ComfyUIClient(mock_b.base_url)

    def abbrechen_nach_claim(job_dir: Path) -> None:
        aktuell = json.loads((job_dir / "job.json").read_text(encoding="utf-8"))
        aktuell["status"] = "cancelled"
        aktuell["message"] = "Vom Nutzer abgebrochen (Test-Hook)."
        (job_dir / "job.json").write_text(json.dumps(aktuell, indent=2), encoding="utf-8")

    bericht_b = w.fuehre_pass_aus(
        store_b, comfy_b, idle_immer(), "comfyui-worker", CHECKPOINT, 0.01, 5.0,
        nach_uebernahme_hook=abbrechen_nach_claim,
    )
    record_b = lies_record(dir_b)

    check("(b) Bericht vermerkt den Abbruch", job_id_b in bericht_b.abgebrochen)
    check("(b) Status bleibt cancelled (nicht von done überschrieben)", record_b["status"] == "cancelled")
    check("(b) KEINE render-result.json geschrieben", not (dir_b / "render-result.json").exists())
    check("(b) KEIN Bild-Artefakt cam-01.png geschrieben", not (dir_b / "cam-01.png").exists())
finally:
    stoppe_mock(mock_b)


# ---------------------------------------------------------------------------
# (c) ComfyUI unerreichbar ⇒ ehrlicher kein-render-worker-Status, NIE
#     running/done.
# ---------------------------------------------------------------------------
store_c = neuer_store()
job_id_c, dir_c = neuer_job(store_c, "3000-ccc", neue_scene())
# Port, auf dem garantiert nichts lauscht (Mock erst gar nicht gestartet).
comfy_c = w.ComfyUIClient("http://127.0.0.1:1")

bericht_c = w.fuehre_pass_aus(store_c, comfy_c, idle_immer(), "comfyui-worker", CHECKPOINT, 0.01, 5.0)
record_c = lies_record(dir_c)

check("(c) Bericht vermerkt kein-render-worker", len(bericht_c.kein_worker) == 1)
check("(c) Status kein-render-worker", record_c["status"] == "kein-render-worker")
check("(c) Status NIE running gewesen (kein worker-Feld gesetzt)", "worker" not in record_c or record_c.get("worker") is None)
check("(c) message nennt 'ComfyUI'", "ComfyUI" in record_c.get("message", ""))
check("(c) KEINE render-result.json geschrieben", not (dir_c / "render-result.json").exists())
check("(c) Bericht nennt keinen Claim", bericht_c.geclaimt == [])


# ---------------------------------------------------------------------------
# (d) Modell (Checkpoint) fehlt in ComfyUI ⇒ derselbe ehrliche Status,
#     andere Begründung.
# ---------------------------------------------------------------------------
mock_d = starte_mock(["irgendein-anderes-modell.safetensors"])
try:
    store_d = neuer_store()
    job_id_d, dir_d = neuer_job(store_d, "4000-ddd", neue_scene())
    comfy_d = w.ComfyUIClient(mock_d.base_url)

    bericht_d = w.fuehre_pass_aus(store_d, comfy_d, idle_immer(), "comfyui-worker", CHECKPOINT, 0.01, 5.0)
    record_d = lies_record(dir_d)

    check("(d) Bericht vermerkt kein-render-worker", len(bericht_d.kein_worker) == 1)
    check("(d) Status kein-render-worker", record_d["status"] == "kein-render-worker")
    check("(d) message nennt 'Modell fehlt' + Checkpoint-Namen", "Modell fehlt" in record_d.get("message", "") and CHECKPOINT in record_d.get("message", ""))
    check("(d) KEINE render-result.json geschrieben", not (dir_d / "render-result.json").exists())
finally:
    stoppe_mock(mock_d)


# ---------------------------------------------------------------------------
# (e) Idle-Fenster respektiert: GPU 'belegt' → Job bleibt queued, kein
#     Claim, kein ComfyUI-Zugriff überhaupt nötig.
# ---------------------------------------------------------------------------
store_e = neuer_store()
job_id_e, dir_e = neuer_job(store_e, "5000-eee", neue_scene())
comfy_e = w.ComfyUIClient("http://127.0.0.1:1")  # dürfte nie kontaktiert werden

bericht_e = w.fuehre_pass_aus(store_e, comfy_e, idle_nie(), "comfyui-worker", CHECKPOINT, 0.01, 5.0)
record_e = lies_record(dir_e)

check("(e) Status bleibt queued (Idle-Fenster respektiert)", record_e["status"] == "queued")
check("(e) Bericht nennt den Job als wartend", len(bericht_e.wartend) == 1)
check("(e) kein Claim ausgelöst", bericht_e.geclaimt == [])
check("(e) kein-render-worker NICHT ausgelöst (Idle-Gate greift VOR dem Fähigkeits-Check)", bericht_e.kein_worker == [])


# ---------------------------------------------------------------------------
# (f) idle_window_only: false überspringt das Idle-Fenster bewusst.
# ---------------------------------------------------------------------------
mock_f = starte_mock([CHECKPOINT])
try:
    store_f = neuer_store()
    job_id_f, dir_f = neuer_job(store_f, "6000-fff", neue_scene(), idle_window_only=False)
    comfy_f = w.ComfyUIClient(mock_f.base_url)

    bericht_f = w.fuehre_pass_aus(store_f, comfy_f, idle_nie(), "comfyui-worker", CHECKPOINT, 0.01, 5.0)
    record_f = lies_record(dir_f)

    check("(f) idle_window_only=false: Job wird trotz 'belegt' fertiggestellt", record_f["status"] == "done")
    check("(f) idle_window_only=false: Bericht nennt keinen Wartend-Eintrag", bericht_f.wartend == [])
finally:
    stoppe_mock(mock_f)


# ---------------------------------------------------------------------------
# (g) CLI ohne existierenden --store → Exit 2, kein Store angefasst.
# ---------------------------------------------------------------------------
kaputter_store = Path(tempfile.mkdtemp(prefix="kosmo-render-worker-test-")) / "existiert-nicht"
stdout_g = io.StringIO()
stderr_g = io.StringIO()
with redirect_stdout(stdout_g), redirect_stderr(stderr_g):
    exit_g = w.cli(["--store", str(kaputter_store), "--checkpoint", CHECKPOINT, "--einmal"])
check("(g) CLI ohne existierenden Store: Exit-Code 2", exit_g == 2)
check("(g) CLI ohne existierenden Store: FEHLER-Meldung auf stderr", "FEHLER" in stderr_g.getvalue())
check("(g) Store wurde nicht angelegt", not kaputter_store.exists())


# ---------------------------------------------------------------------------
# (h) Mehrkamera-Job: eine Liste in `cameras` liefert je Kamera ein
#     benanntes Bild.
# ---------------------------------------------------------------------------
mock_h = starte_mock([CHECKPOINT])
try:
    store_h = neuer_store()
    scene_h = neue_scene(cameras=[{"name": "vorne", "position": [0, 0, 5], "target": [0, 0, 0]}, {"position": [5, 0, 5], "target": [0, 0, 0]}])
    job_id_h, dir_h = neuer_job(store_h, "7000-hhh", scene_h)
    comfy_h = w.ComfyUIClient(mock_h.base_url)

    bericht_h = w.fuehre_pass_aus(store_h, comfy_h, idle_immer(), "comfyui-worker", CHECKPOINT, 0.01, 5.0)
    record_h = lies_record(dir_h)
    ergebnis_h = json.loads((dir_h / "render-result.json").read_text(encoding="utf-8")) if (dir_h / "render-result.json").exists() else {}

    check("(h) Status done", record_h["status"] == "done")
    check("(h) zwei Bilder im Ergebnis", ergebnis_h.get("images") == ["vorne.png", "cam-02.png"])
    check("(h) Bild 'vorne.png' existiert", (dir_h / "vorne.png").exists())
    check("(h) Bild 'cam-02.png' existiert", (dir_h / "cam-02.png").exists())
finally:
    stoppe_mock(mock_h)


# ---------------------------------------------------------------------------
# (i) fehlender Checkpoint-Parameter (leerer String) ⇒ ehrlich
#     kein-render-worker mit Hinweis auf die offene Owner-Frage, OHNE
#     ComfyUI überhaupt anzufragen.
# ---------------------------------------------------------------------------
store_i = neuer_store()
job_id_i, dir_i = neuer_job(store_i, "8000-iii", neue_scene())
comfy_i = w.ComfyUIClient("http://127.0.0.1:1")  # dürfte nie kontaktiert werden

bericht_i = w.fuehre_pass_aus(store_i, comfy_i, idle_immer(), "comfyui-worker", "", 0.01, 5.0)
record_i = lies_record(dir_i)
check("(i) Status kein-render-worker ohne Checkpoint", record_i["status"] == "kein-render-worker")
check("(i) message nennt die offene Owner-Frage", "Owner-Frage" in record_i.get("message", ""))


# ---------------------------------------------------------------------------
# (j) Idle-Gate-Einheitstest (ohne ComfyUI/Store): Zeitfenster + Auslastung
#     sind injizierbar und werden korrekt kombiniert.
# ---------------------------------------------------------------------------
gate_zeit_ausserhalb = w.IdleGate(fenster_start_stunde=22, fenster_ende_stunde=6, jetzt_fn=lambda: __import__("datetime").datetime(2026, 7, 22, 14, 0))
ok_1, grund_1 = gate_zeit_ausserhalb.ist_idle()
check("(j) ausserhalb Zeitfenster (14 Uhr, Fenster 22-06) ⇒ nicht idle", ok_1 is False)
check("(j) Begründung nennt Zeitfenster", "Zeitfenster" in grund_1)

gate_gpu_belegt = w.IdleGate(
    fenster_start_stunde=22, fenster_ende_stunde=6,
    jetzt_fn=lambda: __import__("datetime").datetime(2026, 7, 22, 23, 0),
    auslastung_fn=lambda: 87.0,
)
ok_2, grund_2 = gate_gpu_belegt.ist_idle()
check("(j) im Zeitfenster, aber GPU-Auslastung über Schwelle ⇒ nicht idle", ok_2 is False)
check("(j) Begründung nennt Auslastung", "belegt" in grund_2 or "%" in grund_2)

gate_idle = w.IdleGate(
    fenster_start_stunde=22, fenster_ende_stunde=6,
    jetzt_fn=lambda: __import__("datetime").datetime(2026, 7, 22, 23, 0),
    auslastung_fn=lambda: 3.0,
)
ok_3, grund_3 = gate_idle.ist_idle()
check("(j) im Zeitfenster + Auslastung unter Schwelle ⇒ idle", ok_3 is True)

gate_nicht_messbar = w.IdleGate(
    fenster_start_stunde=22, fenster_ende_stunde=6,
    jetzt_fn=lambda: __import__("datetime").datetime(2026, 7, 22, 23, 0),
    auslastung_fn=lambda: None,
)
ok_4, grund_4 = gate_nicht_messbar.ist_idle()
check("(j) Auslastung nicht messbar (kein nvidia-smi) ⇒ sicherheitshalber nicht idle", ok_4 is False)


# ---------------------------------------------------------------------------
# Aufräumen (Verzeichnisse dieser Tests) + Abschluss
# ---------------------------------------------------------------------------
for pfad in (store_a, store_b, store_c, store_d, store_e, store_f, store_h, store_i, kaputter_store.parent):
    shutil.rmtree(pfad, ignore_errors=True)

print(f"\n{_zaehler - len(failures)}/{_zaehler} Prüfungen bestanden.")
if failures:
    print("FEHLGESCHLAGEN:")
    for f in failures:
        print(f"  - {f}")
    sys.exit(1)
sys.exit(0)
