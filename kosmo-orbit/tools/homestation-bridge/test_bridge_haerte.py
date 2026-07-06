"""Leichte Prüfung für die Bridge-Härtung (Serie I / Batch B4) — kein pytest
nötig (im Cloud-Container ist nur `python3` mit fastapi/httpx verkabelt,
`pytest` läuft in einer separaten uv-Toolchain ohne diese Pakete).

Deckt die drei Fälle aus dem Bauplan-Abnahmekriterium B4 ab:
  1. Client-geliefertes `scene.out` wird ignoriert — die Bridge erzwingt das
     Schreibziel serverseitig auf <job_dir>/out.
  2. Der Nachbarordner-Trick (`/tmp/kosmo-jobs-evil` neben `/tmp/kosmo-jobs`)
     und `..`/`/`-Ausbrüche in job_id/name werden abgewiesen, sowohl am
     Helfer `_safe_store_path` direkt als auch über die echten Endpoints
     `/jobs/{id}` und `/jobs/{id}/artifacts/{name}`.
  3. Uploads über dem konfigurierten Deckel liefern 413 statt unbegrenzt auf
     Platte geschrieben zu werden (model.glb + STT-Audio).

Aufruf:
    python3 tools/homestation-bridge/test_bridge_haerte.py

Exit-Code 0 = alle Prüfungen grün. Exit-Code != 0 (mit Liste der
fehlgeschlagenen Prüfungen) sonst.
"""

from __future__ import annotations

import json
import os
import shutil
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

# Kleine Deckel fürs Prüfskript (schnell reproduzierbar, ohne echte 200-MB-
# Dateien schreiben zu müssen) — vor dem Import von kosmo_bridge.main setzen,
# da main.py die Env-Werte beim Modul-Import in Konstanten einliest.
os.environ["KOSMO_BRIDGE_MAX_UPLOAD_MODEL"] = str(2 * 1024 * 1024)  # 2 MB
os.environ["KOSMO_BRIDGE_MAX_UPLOAD_AUDIO"] = str(1 * 1024 * 1024)  # 1 MB
os.environ.pop("KOSMO_BRIDGE_TOKEN", None)

TMP_STORE = Path(tempfile.mkdtemp(prefix="kosmo-bridge-test-"))
os.environ["KOSMO_JOB_STORE"] = str(TMP_STORE)

from fastapi.testclient import TestClient  # noqa: E402

from kosmo_bridge import main as bridge  # noqa: E402

bridge.STORE = TMP_STORE
client = TestClient(bridge.app)

failures: list[str] = []


def check(name: str, cond: bool) -> None:
    status = "OK" if cond else "FEHLER"
    print(f"[{status}] {name}")
    if not cond:
        failures.append(name)


def make_job(out_value: str = "/tmp/böse-schreibstelle", model_bytes: bytes = b"glb-daten") -> dict:
    scene = {
        "schema": "kosmovis.render-scene/v1",
        "out": out_value,
        "geometry": {"path": "irrelevant", "format": "glb"},
    }
    res = client.post(
        "/jobs",
        data={"scene": json.dumps(scene)},
        files={"model": ("model.glb", model_bytes, "model/gltf-binary")},
    )
    return {"response": res}


# ---------------------------------------------------------------------------
# 1) Client-`out` wird ignoriert, Schreibziel serverseitig erzwungen
# ---------------------------------------------------------------------------
result = make_job(out_value="/etc/passwort-ueberschreiben")
res = result["response"]
check("POST /jobs mit bösem client-out antwortet 200", res.status_code == 200)
job_id = res.json().get("job_id", "")
scene_path = TMP_STORE / job_id / "render-scene.json"
written = json.loads(scene_path.read_text()) if scene_path.exists() else {}
check(
    "Schreibziel serverseitig auf <job_dir>/out erzwungen",
    written.get("out") == str(TMP_STORE / job_id / "out"),
)
check(
    "Client-geliefertes 'out' NICHT übernommen",
    written.get("out") != "/etc/passwort-ueberschreiben",
)

# ---------------------------------------------------------------------------
# 2) Pfad-Ausbruch: Nachbarordner-Trick + "..`/`"-Segmente
# ---------------------------------------------------------------------------

# 2a) Direkter Helfer-Test: Nachbarordner mit geteiltem Präfix (der klassische
#     startswith()-Bug: "<STORE>-evil" beginnt mit "<STORE>" OHNE Trenner).
evil_dir = Path(str(TMP_STORE) + "-evil")
evil_dir.mkdir(exist_ok=True)
(evil_dir / "geheim.txt").write_text("Betriebsgeheimnis")
try:
    bridge._safe_store_path("..", evil_dir.name, "geheim.txt")
    helper_blocked = False
except Exception:
    helper_blocked = True
check("_safe_store_path weist Nachbarordner-Trick ab ('..' + Segment mit Slash)", helper_blocked)

try:
    bridge._safe_store_path("nachbar/../../evil")
    helper_blocked_slash = False
except Exception:
    helper_blocked_slash = True
check("_safe_store_path weist Segment mit '/' und '..' ab", helper_blocked_slash)

# 2b) Über den echten Endpoint: gültiger Job existiert, ein Artefaktname mit
#     ".." wird trotzdem abgewiesen (kein Durchschlüpfen über die Route).
#     Hinweis: literales ".." als eigenes URL-Segment wird schon vom
#     HTTP-Client (RFC-3986-Pfadnormalisierung) vor dem Versand weg-
#     "aufgelöst" — genau wie es ein Browser/curl ohne Sonderflags täte. Ein
#     Angreifer, der das umgehen will, url-encodiert die Punkte (%2e%2e);
#     das bleibt auf dem Draht erhalten und wird erst serverseitig dekodiert
#     — dort muss unsere Prüfung greifen.
res = client.get(f"/jobs/{job_id}/artifacts/%2e%2e")
check("GET /jobs/{id}/artifacts/%2e%2e (== '..') abgewiesen (400/404)", res.status_code in (400, 404))

res = client.get("/jobs/%2e%2e")
check("GET /jobs/%2e%2e (== '..') abgewiesen (400/404)", res.status_code in (400, 404))

# 2c) Gegenprobe: ein echtes, existierendes Artefakt bleibt erreichbar (die
#     Härtung darf den normalen Fluss nicht kaputt machen).
(TMP_STORE / job_id / "cam-01.png").write_bytes(b"\x89PNG\r\n\x1a\n")
res = client.get(f"/jobs/{job_id}/artifacts/cam-01.png")
check("Normales Artefakt weiterhin erreichbar (200)", res.status_code == 200)

res = client.get(f"/jobs/{job_id}")
check("Normaler Job weiterhin erreichbar (200)", res.status_code == 200)

# ---------------------------------------------------------------------------
# 3) Upload-Deckel → 413
# ---------------------------------------------------------------------------
big_model = b"x" * (3 * 1024 * 1024)  # 3 MB > 2-MB-Testdeckel
res = client.post(
    "/jobs",
    data={"scene": json.dumps({"schema": "kosmovis.render-scene/v1"})},
    files={"model": ("model.glb", big_model, "model/gltf-binary")},
)
check("Upload über Modell-Deckel liefert 413", res.status_code == 413)

small_model = b"x" * (1024 * 1024)  # 1 MB < 2-MB-Testdeckel — muss weiter gehen
res = client.post(
    "/jobs",
    data={"scene": json.dumps({"schema": "kosmovis.render-scene/v1"})},
    files={"model": ("model.glb", small_model, "model/gltf-binary")},
)
check("Upload unter dem Deckel bleibt 200 (kein Fehlalarm)", res.status_code == 200)

big_audio = b"x" * (2 * 1024 * 1024)  # 2 MB > 1-MB-Testdeckel
res = client.post("/stt", files={"audio": ("audio.wav", big_audio, "audio/wav")})
check("STT-Upload über Audio-Deckel liefert 413", res.status_code == 413)

# ---------------------------------------------------------------------------
# Aufräumen + Ergebnis
# ---------------------------------------------------------------------------
shutil.rmtree(TMP_STORE, ignore_errors=True)
shutil.rmtree(evil_dir, ignore_errors=True)

print()
if failures:
    print(f"{len(failures)} Prüfung(en) fehlgeschlagen:")
    for name in failures:
        print(f"  - {name}")
    sys.exit(1)
print("Alle Prüfungen grün.")
sys.exit(0)
