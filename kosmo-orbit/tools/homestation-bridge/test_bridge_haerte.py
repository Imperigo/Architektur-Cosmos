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
# 4) Signierte Lizenz + Server-Bindung (Serie I / Batch B6)
#    (a) die reine Verify-Funktion (gültig/abgelaufen/manipuliert/widerrufen);
#    (b) `token_guard` mit aktivierter Lizenz-Pflicht (Modul-Reload mit neuen
#        Env-Werten — main.py liest sie als Modul-Konstanten beim Import);
#    (c) Default (keine Pflicht) bleibt danach unverändert offen wie in B4.
# ---------------------------------------------------------------------------
import base64  # noqa: E402
import importlib  # noqa: E402
from datetime import datetime, timezone  # noqa: E402

from kosmo_bridge.lizenz import ist_widerrufen, kanonische_lizenznachricht, lizenz_pruefen  # noqa: E402


def _lizenz_testkeypaar():
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

    priv = Ed25519PrivateKey.generate()
    pub = priv.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
    return priv, base64.b64encode(pub).decode("ascii")


def _signiere_test_lizenz(priv, daten: dict) -> str:
    nachricht = kanonische_lizenznachricht(daten)
    sig = priv.sign(nachricht)
    paket = {"daten": daten, "signatur": base64.b64encode(sig).decode("ascii")}
    return base64.b64encode(json.dumps(paket).encode("utf-8")).decode("ascii")


if bridge.ED25519_LIB is None:
    check("Ed25519-Lib (cryptography/pynacl) verfügbar für Lizenztests", False)
else:
    priv, pub_b64 = _lizenz_testkeypaar()
    lizenz_daten = {
        "inhaber": "Baubüro Andrin",
        "edition": "standard",
        "gueltigBis": "2026-12-31",
        "ausgestelltAm": "2026-01-01T00:00:00.000Z",
        "lizenzId": "lz-bridge-test-0001",
    }
    lizenz_text = _signiere_test_lizenz(priv, lizenz_daten)

    # --- (a) reine Verify-Funktion ---
    r = lizenz_pruefen(lizenz_text, pub_b64, datetime(2026, 6, 1, tzinfo=timezone.utc))
    check("lizenz_pruefen: gültige Lizenz wird akzeptiert", r["gueltig"] is True)

    r_abgelaufen = lizenz_pruefen(lizenz_text, pub_b64, datetime(2027, 3, 1, tzinfo=timezone.utc))
    check(
        "lizenz_pruefen: abgelaufene Lizenz wird abgelehnt",
        r_abgelaufen["gueltig"] is False and r_abgelaufen["grund"] == "abgelaufen",
    )

    priv_fremd, _ = _lizenz_testkeypaar()
    lizenz_text_fremd_signiert = _signiere_test_lizenz(priv_fremd, lizenz_daten)
    r_manipuliert = lizenz_pruefen(lizenz_text_fremd_signiert, pub_b64, datetime(2026, 6, 1, tzinfo=timezone.utc))
    check(
        "lizenz_pruefen: mit fremdem Key signierte Lizenz wird abgelehnt",
        r_manipuliert["gueltig"] is False and r_manipuliert["grund"] == "signatur_ungueltig",
    )

    r_kaputt = lizenz_pruefen("***kein-base64***", pub_b64, datetime.now(timezone.utc))
    check("lizenz_pruefen: kaputter Text wird ehrlich abgewiesen (kein Crash)", r_kaputt["grund"] == "lizenztext_ungueltig")

    check("ist_widerrufen erkennt eine gelistete Lizenz-ID", ist_widerrufen("lz-bridge-test-0001", ["lz-bridge-test-0001"]) is True)
    check("ist_widerrufen: nicht gelistete ID bleibt False", ist_widerrufen("lz-andere", ["lz-bridge-test-0001"]) is False)

    # --- (b) Integration über token_guard: Lizenz-Pflicht per Env aktivieren ---
    os.environ["KOSMO_BRIDGE_LIZENZ_PFLICHT"] = "1"
    os.environ["KOSMO_BRIDGE_LIZENZ_PUBKEY"] = pub_b64
    importlib.reload(bridge)
    bridge.STORE = TMP_STORE
    lizenz_client = TestClient(bridge.app)

    res = lizenz_client.get("/jobs")
    check("Lizenz-Pflicht aktiv, kein Lizenz-Header: 401", res.status_code == 401)

    res = lizenz_client.get("/jobs", headers={"x-kosmo-lizenz": lizenz_text})
    check("Lizenz-Pflicht aktiv, gültige Lizenz im Header: 200", res.status_code == 200)

    res = lizenz_client.get("/jobs", headers={"x-kosmo-lizenz": lizenz_text_fremd_signiert})
    check("Lizenz-Pflicht aktiv, fremd signierte Lizenz im Header: 401", res.status_code == 401)

    res = lizenz_client.get("/health")
    check("/health bleibt auch bei Lizenz-Pflicht ohne Header erreichbar", res.status_code == 200)

    # Widerruf: dieselbe (sonst gültige) Lizenz-ID auf die Widerrufsliste setzen
    os.environ["KOSMO_BRIDGE_LIZENZ_WIDERRUF"] = lizenz_daten["lizenzId"]
    importlib.reload(bridge)
    bridge.STORE = TMP_STORE
    widerruf_client = TestClient(bridge.app)
    res = widerruf_client.get("/jobs", headers={"x-kosmo-lizenz": lizenz_text})
    check("Widerrufene Lizenz-ID wird trotz gültiger Signatur abgelehnt", res.status_code == 401)
    os.environ.pop("KOSMO_BRIDGE_LIZENZ_WIDERRUF", None)

    # Pflicht an, aber kein Public Key konfiguriert → fail closed statt offen
    os.environ.pop("KOSMO_BRIDGE_LIZENZ_PUBKEY", None)
    importlib.reload(bridge)
    bridge.STORE = TMP_STORE
    fail_closed_client = TestClient(bridge.app)
    res = fail_closed_client.get("/jobs", headers={"x-kosmo-lizenz": lizenz_text})
    check("Pflicht an ohne Public Key: fail closed (kein 200)", res.status_code != 200)

    # --- (c) zurück auf Default: KEINE Lizenz-Pflicht verhält sich wie B4 ---
    os.environ.pop("KOSMO_BRIDGE_LIZENZ_PFLICHT", None)
    importlib.reload(bridge)
    bridge.STORE = TMP_STORE
    default_client = TestClient(bridge.app)
    res = default_client.get("/jobs")
    check("Default (keine Lizenz-Pflicht): Zugriff bleibt offen wie in B4", res.status_code == 200)

# ---------------------------------------------------------------------------
# 5) Sicherheits-Logging (Serie I / Batch B9) — reine Formatierung +
#    Verdrahtung an den bestehenden Ablehnungsstellen. Additiv: die
#    Statuscodes (401/413) MÜSSEN unverändert bleiben, nur eine zusätzliche
#    stderr-Zeile kommt dazu.
# ---------------------------------------------------------------------------
import contextlib  # noqa: E402
import io  # noqa: E402

from kosmo_bridge.sicherheits_log import formatiere_sicherheitsereignis  # noqa: E402

# (a) reine Formatierungsfunktion: ein Ereignis → eine JSON-Zeile mit den vier
#     erwarteten Feldern, testbar ohne laufenden Bridge-Prozess.
log_zeile_rein = formatiere_sicherheitsereignis(
    "auth_fehlgeschlagen", "bridge:/jobs", "Token fehlt oder falsch", ts="2026-07-07T12:00:00+00:00"
)
log_geparst_rein = json.loads(log_zeile_rein)
check(
    "formatiere_sicherheitsereignis: erwartete vier Felder",
    log_geparst_rein
    == {
        "ts": "2026-07-07T12:00:00+00:00",
        "ereignis": "auth_fehlgeschlagen",
        "quelle": "bridge:/jobs",
        "detail": "Token fehlt oder falsch",
    },
)
check("formatiere_sicherheitsereignis: kein Testtoken-Wert im Text", "geheimes-testtoken-xyz" not in log_zeile_rein)

# (b) verdrahtet: eine echte 401-Ablehnung (falscher Token) schreibt eine
#     passende JSON-Zeile auf stderr, OHNE den echten Token preiszugeben.
os.environ["KOSMO_BRIDGE_TOKEN"] = "geheimes-testtoken-xyz"
importlib.reload(bridge)
bridge.STORE = TMP_STORE
log_client = TestClient(bridge.app)

puffer_auth = io.StringIO()
with contextlib.redirect_stderr(puffer_auth):
    res = log_client.get("/jobs", headers={"x-kosmo-token": "falsch"})
check("Falscher Token weiterhin 401 (Verhalten unverändert)", res.status_code == 401)
log_zeile_auth = puffer_auth.getvalue().strip()
log_geparst_auth = json.loads(log_zeile_auth) if log_zeile_auth else {}
check("Log-Zeile für fehlgeschlagene Auth geschrieben", log_geparst_auth.get("ereignis") == "auth_fehlgeschlagen")
check("Log-Zeile enthält NICHT den echten Token", "geheimes-testtoken-xyz" not in log_zeile_auth)

# (c) Upload über dem Deckel schreibt ebenfalls eine Log-Zeile (413 bleibt 413).
os.environ.pop("KOSMO_BRIDGE_TOKEN", None)
importlib.reload(bridge)
bridge.STORE = TMP_STORE
deckel_client = TestClient(bridge.app)
puffer_deckel = io.StringIO()
with contextlib.redirect_stderr(puffer_deckel):
    res = deckel_client.post(
        "/jobs",
        data={"scene": json.dumps({"schema": "kosmovis.render-scene/v1"})},
        files={"model": ("model.glb", b"x" * (3 * 1024 * 1024), "model/gltf-binary")},
    )
check("Übergrosser Upload weiterhin 413 (Verhalten unverändert)", res.status_code == 413)
log_zeile_deckel = puffer_deckel.getvalue().strip()
log_geparst_deckel = json.loads(log_zeile_deckel) if log_zeile_deckel else {}
check(
    "Log-Zeile für verworfenen Übergrossen-Upload geschrieben",
    log_geparst_deckel.get("ereignis") == "upload_deckel_abgelehnt",
)

# zurück auf einen sauberen Default-Zustand
os.environ.pop("KOSMO_BRIDGE_TOKEN", None)
importlib.reload(bridge)
bridge.STORE = TMP_STORE

# ---------------------------------------------------------------------------
# 6) Job-Lebenszyklus (V2-Technik Block 1 / HS2): Freigabe-Pflicht, Idle-Gate,
#    kooperativer Abbruch, Fortschritts-/Worker-Marker. Additiv — der
#    Default-Pfad (keine Freigabe-Pflicht, GPU idle) MUSS byte-kompatibel
#    bleiben: ein neuer Job startet weiter in "queued" (Anker der bestehenden
#    E2E-/Contract-Fläche). Die Zustandsfelder-Verträge (worker/progress/
#    requested_engine, approve/cancel-Routen) prüft die TS-Suite
#    packages/kosmo-contracts/test/contracts.test.ts — hier das Verhalten.
# ---------------------------------------------------------------------------
hs2_stores: list[Path] = []


def _hs2_store() -> Path:
    p = Path(tempfile.mkdtemp(prefix="kosmo-hs2-"))
    hs2_stores.append(p)
    return p


def _hs2_reload(store: Path):
    importlib.reload(bridge)
    store.mkdir(parents=True, exist_ok=True)
    bridge.STORE = store
    return TestClient(bridge.app)


def _hs2_render_job(cl, vis_skip: bool = False):
    scene = {"schema": "kosmovis.render-scene/v1", "geometry": {"path": "x", "format": "glb"}, "out": "x"}
    if vis_skip:
        scene["vis"] = {"skip": True}
    return cl.post(
        "/jobs",
        data={"scene": json.dumps(scene)},
        files={"model": ("model.glb", b"glb-daten", "model/gltf-binary")},
    )


# --- (a) Default (Pflicht AUS, GPU idle): "queued" bleibt der Anker ---
for _k in ("KOSMO_BRIDGE_APPROVAL_PFLICHT", "KOSMO_BRIDGE_GPU_IDLE"):
    os.environ.pop(_k, None)
store_default = _hs2_store()
cl = _hs2_reload(store_default)

res = _hs2_render_job(cl)
check("HS2 Default-Create: Status bleibt 'queued' (Anker)", res.status_code == 200 and res.json().get("status") == "queued")
check("HS2 Default-Create: requested_engine 'ki' (KI-Veredelung)", res.json().get("requested_engine") == "ki")

res_cyc = _hs2_render_job(cl, vis_skip=True)
check("HS2 vis.skip → requested_engine 'cycles'", res_cyc.json().get("requested_engine") == "cycles")

# --- (b) Health meldet GPU NUR im Fake-Modus, ehrlich als Simulation ---
bridge.FAKE_WORKER = True
gpu = cl.get("/health").json().get("gpu", {})
check("HS2 Health (Fake): gpu.name als Simulation benannt", gpu.get("name") == "fake-gpu (Simulation)")
check("HS2 Health (Fake): gpu.idle spiegelt GPU_IDLE (True)", gpu.get("idle") is True)
bridge.FAKE_WORKER = False
check("HS2 Health ohne Fake-Worker: KEIN gpu-Feld (nichts vorgetäuscht)", "gpu" not in cl.get("/health").json())

# --- (c) Fortschritt: queued → running (worker/progress) → done (pct 1.0) ---
res = _hs2_render_job(cl)
jid = res.json()["job_id"]
bridge._fake_worker_pass()
rec = json.loads((store_default / jid / "job.json").read_text())
check(
    "HS2 Fake-Worker Schritt 1: queued → running mit worker + progress 0.5",
    rec.get("status") == "running" and rec.get("worker") == "fake-worker" and rec.get("progress", {}).get("pct") == 0.5,
)
bridge._fake_worker_pass()
rec = json.loads((store_default / jid / "job.json").read_text())
check("HS2 Fake-Worker Schritt 2: running → done, progress pct 1.0", rec.get("status") == "done" and rec.get("progress", {}).get("pct") == 1.0)
check("HS2 done bettet render-result ein (GET /jobs/{id})", cl.get(f"/jobs/{jid}").json().get("result", {}).get("job_id") == jid)

# --- (d) Freigabe-Pflicht AN: awaiting_approval + approve richtig/falsch ---
store_pflicht = _hs2_store()
os.environ["KOSMO_BRIDGE_APPROVAL_PFLICHT"] = "1"
clp = _hs2_reload(store_pflicht)
res = _hs2_render_job(clp)
rec = res.json()
jid = rec["job_id"]
tok = rec.get("approval_token", "")
check("HS2 Pflicht AN: neuer Job startet 'awaiting_approval'", rec.get("status") == "awaiting_approval")

res_bad = clp.post(f"/jobs/{jid}/approve", json={"approval_token": "CONFIRMED_RENDER_falsch99"})
check("HS2 approve mit FALSCHEM Token → 403", res_bad.status_code == 403)
check("HS2 nach falscher Freigabe bleibt 'awaiting_approval'", clp.get(f"/jobs/{jid}").json().get("status") == "awaiting_approval")

res_ok = clp.post(f"/jobs/{jid}/approve", json={"approval_token": tok})
check("HS2 approve mit RICHTIGEM Token → 200 + 'queued'", res_ok.status_code == 200 and res_ok.json().get("status") == "queued")

check("HS2 approve unbekannter Job → 404", clp.post("/jobs/vis-1-abcdef/approve", json={"approval_token": "x"}).status_code == 404)

# --- (e) Idle-Gate: GPU belegt (GPU_IDLE=0) hält Render-Jobs in 'queued' ---
store_idle = _hs2_store()
os.environ.pop("KOSMO_BRIDGE_APPROVAL_PFLICHT", None)
os.environ["KOSMO_BRIDGE_GPU_IDLE"] = "0"
cli_i = _hs2_reload(store_idle)
res = _hs2_render_job(cli_i)
jid = res.json()["job_id"]
check("HS2 Idle 0: Job startet 'queued'", res.json().get("status") == "queued")
bridge._fake_worker_pass()
rec = json.loads((store_idle / jid / "job.json").read_text())
check("HS2 Idle 0 hält Job in 'queued' (GPU belegt, kein Render)", rec.get("status") == "queued")
os.environ.pop("KOSMO_BRIDGE_GPU_IDLE", None)

# --- (f) Abbruch aus jedem Zustand + kooperativer Abbruch im Lauf ---
store_cancel = _hs2_store()
os.environ["KOSMO_BRIDGE_APPROVAL_PFLICHT"] = "1"
clc = _hs2_reload(store_cancel)

res = _hs2_render_job(clc)  # awaiting_approval
jid = res.json()["job_id"]
res_x = clc.post(f"/jobs/{jid}/cancel")
check("HS2 cancel aus 'awaiting_approval' → 'cancelled'", res_x.status_code == 200 and res_x.json().get("status") == "cancelled")

os.environ.pop("KOSMO_BRIDGE_APPROVAL_PFLICHT", None)
clc = _hs2_reload(store_cancel)

res = _hs2_render_job(clc)  # queued
jid = res.json()["job_id"]
check("HS2 cancel aus 'queued' → 'cancelled'", clc.post(f"/jobs/{jid}/cancel").json().get("status") == "cancelled")
check("HS2 cancel unbekannter Job → 404", clc.post("/jobs/vis-1-abcdef/cancel").status_code == 404)

# kooperativer Abbruch: running → cancel → nächster Pass schreibt KEIN Ergebnis
res = _hs2_render_job(clc)
jid = res.json()["job_id"]
bridge._fake_worker_pass()  # queued → running
check("HS2 kooperativer Abbruch: Job ist vor Abbruch 'running'", json.loads((store_cancel / jid / "job.json").read_text()).get("status") == "running")
check("HS2 cancel aus 'running' → 'cancelled'", clc.post(f"/jobs/{jid}/cancel").json().get("status") == "cancelled")
bridge._fake_worker_pass()  # darf nichts mehr rechnen
rec = json.loads((store_cancel / jid / "job.json").read_text())
check("HS2 nach Abbruch bleibt 'cancelled' (kein Zustandssprung)", rec.get("status") == "cancelled")
check("HS2 kooperativer Abbruch schreibt KEIN render-result.json", not (store_cancel / jid / "render-result.json").exists())

# zurück auf einen sauberen Default-Zustand
for _k in ("KOSMO_BRIDGE_APPROVAL_PFLICHT", "KOSMO_BRIDGE_GPU_IDLE"):
    os.environ.pop(_k, None)
importlib.reload(bridge)
bridge.STORE = TMP_STORE
for _s in hs2_stores:
    shutil.rmtree(_s, ignore_errors=True)

# ---------------------------------------------------------------------------
# 7) Blender-Sim-Jobs (V2-Technik Block 1 / HS4): /jobs/blender-sim, ehrliche
#    Grenze "kein-blender-worker" (Physik wird NIE gefakt, Fable-Urteil §3.2),
#    `out`-Injektion abgewiesen, ungültige `art` → 400, Deckel → 413. Eigener
#    temp-Store (Modul-Reload), wie die HS2-Prüfungen oben.
# ---------------------------------------------------------------------------
bsim_stores: list[Path] = []


def _bsim_store() -> Path:
    p = Path(tempfile.mkdtemp(prefix="kosmo-bsim-"))
    bsim_stores.append(p)
    return p


def _bsim_job(cl, art: str = "wind", out_value: str = "/tmp/böse-schreibstelle", model_bytes: bytes = b"glb-daten"):
    szene = {
        "schema": "kosmo.blender-sim/v1",
        "art": art,
        "geometry": {"path": "irrelevant", "format": "glb"},
        "params": {},
        "out": out_value,
    }
    return cl.post(
        "/jobs/blender-sim",
        data={"szene": json.dumps(szene)},
        files={"model": ("model.glb", model_bytes, "model/gltf-binary")},
    )


store_bsim = _bsim_store()
for _k in ("KOSMO_BRIDGE_APPROVAL_PFLICHT", "KOSMO_BRIDGE_GPU_IDLE"):
    os.environ.pop(_k, None)
cl_bsim = _hs2_reload(store_bsim)

# --- (a) gültiger Job: 200, kind/job_id/status wie erwartet ---
res = _bsim_job(cl_bsim, art="wind", out_value="/etc/böse")
check("POST /jobs/blender-sim (gültige art) antwortet 200", res.status_code == 200)
rec = res.json()
check("blender-sim-Record: kind == 'blender-sim'", rec.get("kind") == "blender-sim")
check("blender-sim-Record: job_id beginnt mit 'bsim-'", rec.get("job_id", "").startswith("bsim-"))
check("blender-sim-Record: Status 'queued'", rec.get("status") == "queued")
check("blender-sim-Record: art 'wind' übernommen", rec.get("art") == "wind")

bsim_job_id = rec["job_id"]

# --- (b) out-Injektion: Client-Pfad wird verworfen, Schreibziel erzwungen ---
szene_path = store_bsim / bsim_job_id / "blender-sim.json"
szene_geschrieben = json.loads(szene_path.read_text()) if szene_path.exists() else {}
check(
    "blender-sim: Schreibziel serverseitig auf <job_dir>/out erzwungen",
    szene_geschrieben.get("out") == str(store_bsim / bsim_job_id / "out"),
)
check("blender-sim: Client-geliefertes 'out' NICHT übernommen", szene_geschrieben.get("out") != "/etc/böse")

# --- (c) Fake-Worker: queued → 'kein-blender-worker' mit ehrlicher Begründung ---
bridge._fake_worker_pass()
rec_nach = json.loads((store_bsim / bsim_job_id / "job.json").read_text())
check("blender-sim nach Fake-Worker-Pass: Status 'kein-blender-worker'", rec_nach.get("status") == "kein-blender-worker")
msg = rec_nach.get("message", "")
check("blender-sim Begründung enthält 'Blender'", "Blender" in msg)
check("blender-sim Begründung enthält 'HomeStation'", "HomeStation" in msg)

# --- (d) ungültige art → 400 ---
res_bad_art = _bsim_job(cl_bsim, art="erdbeben")
check("blender-sim mit ungültiger art → 400", res_bad_art.status_code == 400)

# --- (e) Deckel: Modell über der Testgrenze (2 MB) → 413 ---
res_big = _bsim_job(cl_bsim, model_bytes=b"x" * (3 * 1024 * 1024))
check("blender-sim Modell-Upload über Deckel → 413", res_big.status_code == 413)

for _s in bsim_stores:
    shutil.rmtree(_s, ignore_errors=True)
importlib.reload(bridge)
bridge.STORE = TMP_STORE

# ---------------------------------------------------------------------------
# 8) Fable-Phase-3-Auflagen (HS3-Nachbesserung):
#    - Freigabe-Pflicht gilt auch für blender-sim (Auflage 4): mit Pflicht AN
#      startet der Job awaiting_approval, der generische /approve gibt ihn frei.
#    - Fake-QA trägt auch beim Stil "fake-worker" statt "dinov3" (Auflage 6).
# ---------------------------------------------------------------------------
fable_stores: list[Path] = []


def _fable_store() -> Path:
    p = Path(tempfile.mkdtemp(prefix="kosmo-fable-"))
    fable_stores.append(p)
    return p


# --- (a) Freigabe-Pflicht für blender-sim ---
store_fp = _fable_store()
os.environ["KOSMO_BRIDGE_APPROVAL_PFLICHT"] = "1"
os.environ.pop("KOSMO_BRIDGE_GPU_IDLE", None)
cl_fp = _hs2_reload(store_fp)
res = _bsim_job(cl_fp, art="wind", out_value="/tmp/x")
rec = res.json()
jid = rec["job_id"]
tok = rec.get("approval_token", "")
check("Auflage 4: blender-sim mit Pflicht AN startet 'awaiting_approval'", rec.get("status") == "awaiting_approval")
check("Auflage 4: blender-sim trägt approval_token", tok.startswith("CONFIRMED_SIM_"))
res_ok = cl_fp.post(f"/jobs/{jid}/approve", json={"approval_token": tok})
check("Auflage 4: /approve gibt blender-sim frei → 'queued'", res_ok.status_code == 200 and res_ok.json().get("status") == "queued")
res_bad = cl_fp.post(f"/jobs/{jid}/cancel")
check("Auflage 4: /cancel bricht blender-sim ab → 'cancelled'", res_bad.json().get("status") == "cancelled")

# --- (b) Fake-QA-Stilmethode ist ehrlich "fake-worker" (Auflage 6) ---
store_qa = _fable_store()
for _k in ("KOSMO_BRIDGE_APPROVAL_PFLICHT", "KOSMO_BRIDGE_GPU_IDLE"):
    os.environ.pop(_k, None)
cl_qa = _hs2_reload(store_qa)
res = cl_qa.post(
    "/jobs",
    data={"scene": json.dumps({"schema": "kosmovis.render-scene/v1"})},
    files={"model": ("model.glb", b"glb", "model/gltf-binary")},
)
jid = res.json()["job_id"]
bridge._fake_worker_pass()  # queued → running
bridge._fake_worker_pass()  # running → done + render-result.json
result = json.loads((store_qa / jid / "render-result.json").read_text())
check("Auflage 6: Fake-QA style.method == 'fake-worker' (kein vorgetäuschtes dinov3)", result["qa"]["style"]["method"] == "fake-worker")

for _k in ("KOSMO_BRIDGE_APPROVAL_PFLICHT", "KOSMO_BRIDGE_GPU_IDLE"):
    os.environ.pop(_k, None)
importlib.reload(bridge)
bridge.STORE = TMP_STORE
for _s in fable_stores:
    shutil.rmtree(_s, ignore_errors=True)

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
