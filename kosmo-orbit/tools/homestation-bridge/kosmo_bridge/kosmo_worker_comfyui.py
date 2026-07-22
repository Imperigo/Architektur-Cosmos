"""kosmo_worker_comfyui.py — echter Render-Worker (ComfyUI-Adapter) für den
Job-Store der Kosmo-Bridge (V090-SPEZ §E-R, `docs/V090-SPEZ.md`).

**Was das ist:** ein eigenständiger Python-Prozess, der NEBEN der Bridge auf
der HomeStation läuft (nicht Teil von `main.py`, genau wie
`blender_worker.py`) und `--store`-Render-Jobs (`vis-…`) nach dem normativen
4-Schritt-Worker-Protokoll bearbeitet (`README.md` §«Worker andocken»):

    1. `queued`-Job holen — NUR wenn das GPU-Idle-Fenster es erlaubt UND
       (Store/Record-Mechanik, `RenderJob.idle_window_only`,
       `packages/kosmo-contracts/src/render-result.ts:69`) der Job selbst
       das Idle-Gate nicht per `idle_window_only:false` abbestellt hat.
    2. Auf `running` setzen, `worker` + `progress.pct` schreiben — und
       während des ComfyUI-Laufs live nachführen (Poll-Fortschritt).
    3. VOR dem Schreiben eines Ergebnisses den Job-Record FRISCH von der
       Platte lesen — steht dort `cancelled`, kooperativ abbrechen (KEINE
       `render-result.json`, kein Bild-Artefakt).
    4. `render-result.json` (`kosmovis.render-result/v2`, Doppel-QA-Objekt)
       neben `job.json` legen, dann `status: done` + `progress.pct: 1.0`.

**Fähigkeits-Ehrlichkeit (README, Sanktion 2 V090-SPEZ):** fehlt ComfyUI
(nicht erreichbar) oder der konfigurierte Checkpoint (Modell nicht in
ComfyUI installiert), bekommt der Job NIEMALS `running`/`done` vorgetäuscht
— er bleibt/wird ehrlich `status: "kein-render-worker"` mit Begründung,
exakt die Namenskonvention der Nachbar-Worker (`kein-sfm-worker`,
`kein-blender-worker`, `main.py`).

**Doppel-QA ehrlich gefüllt:** `qa.style`/`qa.geometry` sind im Vertrag
BEIDE optional (`RenderResult`, `render-result.ts:31-38`) — dieser Worker
rechnet keinen DINOv3-Stil-Score und keinen DepthAnything-Geometrie-Score
(das sind eigene ML-Verfahren, kein ComfyUI-Adapter-Auftrag), lässt sie
darum bewusst WEG statt Zahlen zu erfinden, die wie ein echtes Verfahren
aussähen. `qa.verdict` bleibt Pflicht und sagt genau das: ein Bild wurde
erzeugt, Stil-/Geometrie-QA ist NICHT gelaufen.

**Wiederverwendung, keine Diffs:** die Pfad-Ausbruch-Abwehr
(`sicherer_job_ordner`/`sicherer_zielpfad`) wird aus `blender_worker.py`
importiert (bereits getestete, identische Logik) statt dupliziert — diese
Datei fasst `blender_worker.py` NICHT an, sie liest nur zwei Funktionen.
`main.py` (Fake-Worker-Codepfad) wird an keiner Stelle importiert oder
verändert (TABU, V090-SPEZ Sanktion 2).

**GPU-Idle-Fenster (Owner-Parameter, `docs/HOMESTATION-AUFTRAG.md`
§«GPU-Leerlauf-Fenster»):** nvidia-smi-Auslastungsschwelle (Default 10 %)
+ Tages-Zeitfenster (Default 22–06 Uhr). Beides injizierbar
(`IdleGate(..., jetzt_fn=..., auslastung_fn=...)`) für deterministische
Tests ohne GPU; `--idle-override {idle,belegt}` erzwingt eine Entscheidung
fürs Container-/Demo-Umfeld (kein `nvidia-smi` vorhanden), spiegelt
`KOSMO_BRIDGE_GPU_IDLE` im Sinn, ohne den Bridge-Prozess anzufassen — dieser
Worker läuft unabhängig direkt gegen den `--store`-Ordner.

**ComfyUI-Adapter:** schmale `ComfyUIClient`-Klasse mit injizierbarer
Basis-URL (`--comfyui-url`, Default `http://127.0.0.1:8188`) — HTTP-API
(`POST /prompt`, `GET /history/{id}` fürs Fortschritts-Polling,
`GET /view` fürs Bild, `GET /object_info` für den Fähigkeits-Check,
`GET /system_stats` für die Erreichbarkeit). Websocket-Events sind in
ComfyUI der zweite offizielle Fortschritts-Weg (README-Auftrag nennt beide
Optionen) — dieser Worker verdrahtet bewusst NUR HTTP-Polling, weil weder
`websockets` noch `websocket-client` im Container installiert sind (siehe
`docs/HOMEPC-RENDER-WORKER.md` §Ehrlichkeitsgrenzen: `progress.pct` während
des Wartens ist eine Zeit-basierte SCHÄTZUNG, kein von ComfyUI gemeldeter
Ist-Wert — nur `pct: 1.0` bei `done` ist exakt).

**Prompt-Graph aus Job-Feldern:** `render.resolution`/`render.samples` aus
`render-scene.json` (`kosmovis.render-scene/v1`,
`packages/kosmo-contracts/src/render-scene.ts`) sowie `style.prompt`
(vom Client aus `derive/renderprompt.ts::finalerRenderPrompt` gebaut, siehe
`apps/kosmo-orbit/.../VisWorkspace.tsx::postJob`) werden in einen minimalen
Txt2Img-ComfyUI-Graph (Checkpoint → CLIPTextEncode ×2 → EmptyLatentImage →
KSampler → VAEDecode → SaveImage) übersetzt. **Offene Owner-Frage
(`docs/HOMEPC-RENDER-WORKER.md`):** welcher Checkpoint installiert wird —
dieser Worker rendert NUR, wenn `--checkpoint`/`KOSMO_RENDER_WORKER_CHECKPOINT`
gesetzt UND in ComfyUI vorhanden ist, sonst `kein-render-worker`. Eine
geometrie-treue ControlNet-/Tiefenpass-Konditionierung aus dem GLB ist NICHT
Teil dieses minimalen Adapters (`render.faithful` wird derzeit komplett
ignoriert — weder gelesen noch weitergereicht, Matrix-C-2-Praezisierung) — dokumentierte Lücke, kein verschwiegenes
Verhalten.

Aufruf:
    python3 kosmo_bridge/kosmo_worker_comfyui.py --store /tmp/kosmo-jobs \
        --comfyui-url http://127.0.0.1:8188 --checkpoint sd_xl_base_1.0.safetensors

Exit-Code 0 = Poller lief (im `--einmal`-Modus: genau ein Pass; sonst bis
  Abbruch per Strg+C).
Exit-Code 2 = Aufruf-Fehler (Store kein Verzeichnis) — dieselbe Konvention
  wie `blender_worker.py`/`lora_empfaenger.py`.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

import httpx

try:  # als Paket (python3 -m kosmo_bridge.kosmo_worker_comfyui) UND als Skript
    from kosmo_bridge.blender_worker import PfadAusbruchFehler, sicherer_job_ordner, sicherer_zielpfad
except ModuleNotFoundError:  # Skript-Modus: das eigene Verzeichnis liegt auf sys.path
    from blender_worker import PfadAusbruchFehler, sicherer_job_ordner, sicherer_zielpfad

__all__ = [
    "IdleGate",
    "ComfyUIClient",
    "ComfyUIFehler",
    "pruefe_faehigkeit",
    "baue_prompt_graph",
    "kamera_namen",
    "fuehre_pass_aus",
    "PassBericht",
    "cli",
]

# ---------------------------------------------------------------------------
# Konstanten
# ---------------------------------------------------------------------------

DEFAULT_WORKER_NAME = "comfyui-worker"
DEFAULT_COMFYUI_URL = "http://127.0.0.1:8188"
PRAEFIX_RENDER = "vis-"


def _jetzt() -> str:
    return datetime.now(timezone.utc).isoformat()


def _lade_job_json(job_dir: Path) -> dict | None:
    """Frisches Lesen von `<job_dir>/job.json` — dieselbe Funktion wie
    `blender_worker._lade_job_json` (bewusst separat gehalten, kein Import
    aus einer privaten `_`-Funktion eines Nachbarmoduls)."""
    f = job_dir / "job.json"
    if not f.exists():
        return None
    try:
        geladen = json.loads(f.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return geladen if isinstance(geladen, dict) else None


def _schreibe_job_json(job_dir: Path, record: dict) -> None:
    (job_dir / "job.json").write_text(json.dumps(record, indent=2, ensure_ascii=False), encoding="utf-8")


# ---------------------------------------------------------------------------
# GPU-Idle-Fenster (Owner-Parameter, docs/HOMESTATION-AUFTRAG.md
# §«GPU-Leerlauf-Fenster»): nvidia-smi-Auslastungsschwelle + Zeitfenster.
# Vollständig injizierbar für deterministische Tests ohne GPU/nvidia-smi.
# ---------------------------------------------------------------------------


def _nvidia_smi_auslastung(pfad: str = "nvidia-smi") -> float | None:
    """Fragt die GPU-Auslastung in Prozent ab — `None`, wenn `nvidia-smi`
    fehlt oder fehlschlägt (z. B. dieser Container ohne GPU). Der Aufrufer
    behandelt `None` als "nicht messbar", NIE als "idle" (Sanktion-2-Geist:
    lieber ehrlich warten als eine Idle-Zusage vortäuschen, die nicht
    geprüft werden konnte)."""
    import shutil
    import subprocess

    if shutil.which(pfad) is None:
        return None
    try:
        out = subprocess.run(
            [pfad, "--query-gpu=utilization.gpu", "--format=csv,noheader,nounits"],
            capture_output=True,
            text=True,
            timeout=5,
            check=True,
        )
        erste_zeile = out.stdout.strip().splitlines()[0]
        return float(erste_zeile.strip())
    except (OSError, subprocess.SubprocessError, ValueError, IndexError):
        return None


def _in_zeitfenster(stunde: int, start: int, ende: int) -> bool:
    """Zeitfenster erlaubt Über-Mitternacht-Spannen (z. B. 22–06 Uhr)."""
    if start == ende:
        return True  # ganztägig
    if start < ende:
        return start <= stunde < ende
    return stunde >= start or stunde < ende


class IdleGate:
    """Entscheidet, ob 'jetzt' als GPU-Leerlauf-Fenster gilt. Injizierbar
    (`jetzt_fn`, `auslastung_fn`, `override`) — die Tests brauchen dafür
    keine echte GPU. `override` (True/False) erzwingt eine Entscheidung
    OHNE Zeitfenster/Auslastung zu prüfen (Container-/Demo-Betrieb ohne
    `nvidia-smi`, spiegelt den Sinn von `KOSMO_BRIDGE_GPU_IDLE` — dieser
    Worker läuft aber unabhängig vom Bridge-Prozess, darum ein eigener,
    injizierbarer Mechanismus statt eines geteilten Envs)."""

    def __init__(
        self,
        schwelle_prozent: float = 10.0,
        fenster_start_stunde: int = 22,
        fenster_ende_stunde: int = 6,
        jetzt_fn: Callable[[], datetime] | None = None,
        auslastung_fn: Callable[[], float | None] | None = None,
        override: bool | None = None,
    ) -> None:
        self.schwelle_prozent = schwelle_prozent
        self.fenster_start_stunde = fenster_start_stunde
        self.fenster_ende_stunde = fenster_ende_stunde
        self._jetzt_fn = jetzt_fn or (lambda: datetime.now())
        self._auslastung_fn = auslastung_fn or _nvidia_smi_auslastung
        self.override = override

    def ist_idle(self) -> tuple[bool, str]:
        if self.override is not None:
            return self.override, f"Override erzwingt {'idle' if self.override else 'belegt'} (Test-/Demo-Betrieb)."
        stunde = self._jetzt_fn().hour
        if not _in_zeitfenster(stunde, self.fenster_start_stunde, self.fenster_ende_stunde):
            return False, (
                f"ausserhalb des Zeitfensters ({self.fenster_start_stunde}–{self.fenster_ende_stunde} Uhr, "
                f"jetzt {stunde} Uhr)"
            )
        auslastung = self._auslastung_fn()
        if auslastung is None:
            return False, "GPU-Auslastung nicht messbar (nvidia-smi fehlt/fehlgeschlagen) — sicherheitshalber nicht idle."
        if auslastung > self.schwelle_prozent:
            return False, f"GPU belegt ({auslastung:.0f}% > Schwelle {self.schwelle_prozent:.0f}%)."
        return True, f"idle (Zeitfenster passt, Auslastung {auslastung:.0f}% ≤ Schwelle {self.schwelle_prozent:.0f}%)."


# ---------------------------------------------------------------------------
# ComfyUI-Adapter — schmale Klasse, injizierbare Basis-URL, HTTP-API
# ---------------------------------------------------------------------------


class ComfyUIFehler(Exception):
    """ComfyUI antwortete nicht wie erwartet (Netzwerk-/HTTP-/Formatfehler)
    — der Aufrufer übersetzt das in einen ehrlichen Job-Status, NIE in ein
    vorgetäuschtes Ergebnis."""


class ComfyUIClient:
    """Dünner HTTP-Adapter auf die ComfyUI-API. Jeder Aufruf öffnet einen
    eigenen kurzlebigen `httpx.Client` (gleiches Muster wie `main.py`s
    `httpx.AsyncClient`-Aufrufe in `health()`/`ollama_proxy()`) — kein
    langlebiger Verbindungszustand, den ein Poll-Loop über Minuten pflegen
    müsste."""

    def __init__(self, base_url: str = DEFAULT_COMFYUI_URL, timeout: float = 15.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def erreichbar(self) -> bool:
        try:
            with httpx.Client(timeout=self.timeout) as c:
                r = c.get(f"{self.base_url}/system_stats")
            return r.status_code == 200
        except httpx.HTTPError:
            return False

    def object_info(self, node_class: str | None = None) -> dict | None:
        pfad = f"/object_info/{node_class}" if node_class else "/object_info"
        try:
            with httpx.Client(timeout=self.timeout) as c:
                r = c.get(f"{self.base_url}{pfad}")
            if r.status_code != 200:
                return None
            return r.json()
        except (httpx.HTTPError, ValueError):
            return None

    def submit(self, graph: dict, client_id: str) -> str:
        """`POST /prompt` — gibt die `prompt_id` zurück oder wirft
        `ComfyUIFehler` (Netzwerk, Nicht-200, fehlende `prompt_id` — z. B.
        ein `node_errors`-Validierungsfehler von ComfyUI selbst)."""
        try:
            with httpx.Client(timeout=self.timeout) as c:
                r = c.post(f"{self.base_url}/prompt", json={"prompt": graph, "client_id": client_id})
        except httpx.HTTPError as e:
            raise ComfyUIFehler(f"ComfyUI /prompt nicht erreichbar: {e}") from e
        if r.status_code != 200:
            raise ComfyUIFehler(f"ComfyUI /prompt antwortet {r.status_code}: {r.text[:300]}")
        try:
            daten = r.json()
        except ValueError as e:
            raise ComfyUIFehler(f"ComfyUI /prompt antwortet kein JSON: {e}") from e
        prompt_id = daten.get("prompt_id")
        if not prompt_id:
            raise ComfyUIFehler(f"ComfyUI /prompt ohne prompt_id (node_errors={daten.get('node_errors')}): {daten}")
        return str(prompt_id)

    def history(self, prompt_id: str) -> dict | None:
        """`GET /history/{id}` — `None` (leer/`{}`), solange ComfyUI den
        Prompt noch nicht abgeschlossen hat; wirft `ComfyUIFehler` bei
        Netzwerk-/HTTP-Problemen (unterscheidet "noch nicht fertig" von
        "ComfyUI ist weg")."""
        try:
            with httpx.Client(timeout=self.timeout) as c:
                r = c.get(f"{self.base_url}/history/{prompt_id}")
        except httpx.HTTPError as e:
            raise ComfyUIFehler(f"ComfyUI /history nicht erreichbar: {e}") from e
        if r.status_code != 200:
            raise ComfyUIFehler(f"ComfyUI /history antwortet {r.status_code}")
        try:
            daten = r.json()
        except ValueError:
            return None
        eintrag = daten.get(prompt_id) if isinstance(daten, dict) else None
        return eintrag if isinstance(eintrag, dict) else None

    def bild_holen(self, filename: str, subfolder: str, typ: str) -> bytes:
        try:
            with httpx.Client(timeout=self.timeout) as c:
                r = c.get(f"{self.base_url}/view", params={"filename": filename, "subfolder": subfolder, "type": typ})
        except httpx.HTTPError as e:
            raise ComfyUIFehler(f"ComfyUI /view nicht erreichbar: {e}") from e
        if r.status_code != 200:
            raise ComfyUIFehler(f"ComfyUI /view antwortet {r.status_code} für {filename}")
        return r.content


def pruefe_faehigkeit(comfy: ComfyUIClient, checkpoint: str) -> tuple[bool, str]:
    """Fähigkeits-Check (README/Sanktion 2): erst der Checkpoint-Parameter,
    dann die Erreichbarkeit, dann ob der konfigurierte Checkpoint in
    ComfyUI tatsächlich installiert ist. Jede Stufe liefert eine konkrete,
    im Job-Record lesbare Begründung statt eines stummen `False`."""
    if not checkpoint:
        return False, (
            "Kein Checkpoint konfiguriert (--checkpoint / KOSMO_RENDER_WORKER_CHECKPOINT) — "
            "Modellwahl ist eine offene Owner-Frage, siehe docs/HOMEPC-RENDER-WORKER.md."
        )
    if not comfy.erreichbar():
        return False, f"ComfyUI nicht erreichbar unter {comfy.base_url} — kein Render-Worker angeschlossen."
    info = comfy.object_info("CheckpointLoaderSimple")
    if info is None:
        return False, f"ComfyUI object_info nicht lesbar unter {comfy.base_url} — Fähigkeit nicht bestätigt."
    try:
        werte = info["CheckpointLoaderSimple"]["input"]["required"]["ckpt_name"][0]
    except (KeyError, TypeError, IndexError):
        return False, "ComfyUI object_info hat unerwartetes Format (CheckpointLoaderSimple/ckpt_name fehlt)."
    if checkpoint not in werte:
        vorhanden = ", ".join(werte) if werte else "—"
        return False, f"Modell fehlt: Checkpoint '{checkpoint}' nicht in ComfyUI verfügbar (vorhanden: {vorhanden})."
    return True, "ComfyUI erreichbar, Checkpoint verfügbar."


# ---------------------------------------------------------------------------
# Prompt-Graph aus Job-Feldern (kosmovis.render-scene/v1)
# ---------------------------------------------------------------------------


def kamera_namen(scene: dict) -> list[str]:
    """`cameras` ist 'auto' | 'saved' | eine Liste von `CameraSpec`
    (`render-scene.ts:25-27`). 'auto'/'saved' rendern GENAU EINE
    Standardansicht (dieselbe Konvention wie der Fake-Worker: ein Bild
    `cam-01.png`); eine explizite Liste rendert je Eintrag ein Bild, benannt
    nach `CameraSpec.name` (Fallback `cam-NN`)."""
    cams = scene.get("cameras", "auto")
    if isinstance(cams, list) and cams:
        namen = []
        for i, cam in enumerate(cams):
            name = cam.get("name") if isinstance(cam, dict) else None
            namen.append(str(name) if name else f"cam-{i + 1:02d}")
        return namen
    return ["cam-01"]


def _stabiler_seed(job_id: str, index: int) -> int:
    h = hashlib.blake2s(f"{job_id}:{index}".encode("utf-8"), digest_size=8).digest()
    return int.from_bytes(h, "little") % (2**31)


def baue_prompt_graph(scene: dict, checkpoint: str, seed: int) -> dict:
    """Übersetzt `render-scene.json`-Felder in einen minimalen ComfyUI-
    Txt2Img-Graph (Checkpoint → 2× CLIPTextEncode → EmptyLatentImage →
    KSampler → VAEDecode → SaveImage). `render.resolution`/`render.samples`
    kommen direkt aus dem Job, `style.prompt` ist der von
    `derive/renderprompt.ts::finalerRenderPrompt` gebaute Text (Client baut
    ihn, dieser Worker interpretiert ihn nicht neu). ComfyUI-Latents
    brauchen Vielfache von 8 — wird gerundet/geklemmt, nicht stillschweigend
    verworfen. `render.samples` (Pfadverfolgungs-Samples in der
    Cycles-Denkwelt des Vertrags) wird auf KSampler-`steps` abgebildet und
    auf ein sinnvolles Maximum geklemmt (60) — eine Näherung, kein
    1:1-Konzept (ComfyUI kennt keine Cycles-Samples), dokumentiert statt
    verschwiegen."""
    render = scene.get("render") or {}
    resolution = render.get("resolution") or [1600, 1000]
    breite = max(64, (int(resolution[0]) // 8) * 8)
    hoehe = max(64, (int(resolution[1]) // 8) * 8)
    samples = render.get("samples") or 128
    steps = max(1, min(int(samples), 60))
    style = scene.get("style") or {}
    prompt_text = str(style.get("prompt") or "")
    negativ = "blurry, low quality, distorted geometry, watermark"
    return {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": checkpoint}},
        "2": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt_text, "clip": ["1", 1]}},
        "3": {"class_type": "CLIPTextEncode", "inputs": {"text": negativ, "clip": ["1", 1]}},
        "4": {"class_type": "EmptyLatentImage", "inputs": {"width": breite, "height": hoehe, "batch_size": 1}},
        "5": {
            "class_type": "KSampler",
            "inputs": {
                "seed": seed,
                "steps": steps,
                "cfg": 7.0,
                "sampler_name": "euler",
                "scheduler": "normal",
                "denoise": 1.0,
                "model": ["1", 0],
                "positive": ["2", 0],
                "negative": ["3", 0],
                "latent_image": ["4", 0],
            },
        },
        "6": {"class_type": "VAEDecode", "inputs": {"samples": ["5", 0], "vae": ["1", 2]}},
        "7": {"class_type": "SaveImage", "inputs": {"filename_prefix": "kosmo", "images": ["6", 0]}},
    }


def _bild_aus_history(eintrag: dict) -> dict | None:
    """Erstes Bild aus `outputs.<node>.images[]` — ComfyUI-Historyformat."""
    outputs = eintrag.get("outputs")
    if not isinstance(outputs, dict):
        return None
    for out in outputs.values():
        if not isinstance(out, dict):
            continue
        bilder = out.get("images")
        if isinstance(bilder, list) and bilder:
            erstes = bilder[0]
            if isinstance(erstes, dict) and erstes.get("filename"):
                return erstes
    return None


class _AbgebrochenWaehrendPoll(Exception):
    """Interner Signal-Typ: der Job wurde WÄHREND des History-Pollings auf
    `cancelled` gesetzt — der Poll-Loop bricht sofort ab (Reaktionszeit),
    statt bis zum Timeout weiterzuwarten. Der harte, protokollverbindliche
    Cancel-Check bleibt UNABHÄNGIG davon der frische Read unmittelbar vor
    dem Ergebnis-Schreiben (Schritt 3) — dies hier ist nur eine
    Compute-Spar-Optimierung, keine Ersatz-Prüfung."""


def _poll_bis_fertig(
    comfy: ComfyUIClient,
    prompt_id: str,
    timeout_s: float,
    poll_intervall: float,
    on_tick: Callable[[float], bool] | None = None,
) -> dict | None:
    """Fragt `GET /history/{id}` im Abstand `poll_intervall`, bis ComfyUI
    `completed` meldet. `on_tick(geschaetztes_pct) -> weiter?` wird vor
    jedem Warten gerufen (Live-Fortschritt schreiben + frühe
    Abbruch-Erkennung) — liefert `on_tick` `False`, bricht der Poll-Loop
    sofort ab (`_AbgebrochenWaehrendPoll`). `None` = Timeout ohne
    Abschluss (ehrlicher Fehlerfall, KEIN gefälschtes Ergebnis)."""
    start = time.monotonic()
    while True:
        eintrag = comfy.history(prompt_id)
        if eintrag is not None and eintrag.get("status", {}).get("completed"):
            return eintrag
        vergangen = time.monotonic() - start
        if vergangen > timeout_s:
            return None
        if on_tick is not None:
            geschaetzt = min(0.05 + (vergangen / max(timeout_s, 0.001)) * 0.9, 0.95)
            if not on_tick(geschaetzt):
                raise _AbgebrochenWaehrendPoll()
        time.sleep(poll_intervall)


# ---------------------------------------------------------------------------
# Job-Einsammeln
# ---------------------------------------------------------------------------


@dataclass
class JobEintrag:
    job_dir: Path
    record: dict


def sammle_queued_render_jobs(store: Path, log: list[str]) -> list[JobEintrag]:
    """Nur `vis-`-Jobs mit `status == 'queued'`, deterministisch sortiert
    (alphabetisch nach `job_id` == Anlagezeitpunkt-Präfix). Kaputte/fehlende
    `job.json` werden übersprungen und in `log` vermerkt — der Pass bricht
    NICHT ab."""
    eintraege: list[JobEintrag] = []
    if not store.exists():
        return eintraege
    for d in sorted(store.iterdir()):
        if not d.is_dir() or not d.name.startswith(PRAEFIX_RENDER):
            continue
        try:
            sicherer_job_ordner(store, d.name)
        except PfadAusbruchFehler as e:
            log.append(f"{d.name}: übersprungen ({e})")
            continue
        record = _lade_job_json(d)
        if record is None:
            log.append(f"{d.name}/job.json: übersprungen, kaputt/unlesbar oder kein JSON-Objekt")
            continue
        if record.get("status") == "queued":
            eintraege.append(JobEintrag(d, record))
    return eintraege


def _lade_render_scene(job_dir: Path, record: dict) -> dict | None:
    pfad_str = record.get("scene")
    pfad = Path(pfad_str) if pfad_str else (job_dir / "render-scene.json")
    if not pfad.exists():
        return None
    try:
        geladen = json.loads(pfad.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return geladen if isinstance(geladen, dict) else None


# ---------------------------------------------------------------------------
# Ein Pass über den Store — die vier Protokollschritte
# ---------------------------------------------------------------------------


@dataclass
class PassBericht:
    geclaimt: list[str] = field(default_factory=list)
    fertiggestellt: list[str] = field(default_factory=list)
    abgebrochen: list[str] = field(default_factory=list)
    kein_worker: list[str] = field(default_factory=list)
    fehler: list[str] = field(default_factory=list)
    wartend: list[str] = field(default_factory=list)
    uebersprungen: list[str] = field(default_factory=list)


def fuehre_pass_aus(
    store: Path,
    comfy: ComfyUIClient,
    idle_gate: IdleGate,
    worker_name: str,
    checkpoint: str,
    poll_intervall: float,
    timeout_s: float,
    nach_uebernahme_hook: Callable[[Path], None] | None = None,
) -> PassBericht:
    """EIN Durchlauf: höchstens EIN Render-Job wird in diesem Pass
    bearbeitet (synchron — Claim, ComfyUI-Submit, Poll-bis-fertig,
    Ergebnis-Schreiben laufen für einen Job komplett durch, bevor der
    nächste Pass startet). `nach_uebernahme_hook` ist eine reine
    Test-Nahtstelle (wird nach Schritt 2, VOR dem ComfyUI-Submit, gerufen —
    Tests können hier deterministisch `cancelled` setzen, um Schritt 3 zu
    prüfen, ohne echtes Timing zu erraten)."""
    bericht = PassBericht()
    jobs = sammle_queued_render_jobs(store, bericht.uebersprungen)
    if not jobs:
        return bericht

    ziel = jobs[0]
    job_dir, record = ziel.job_dir, ziel.record
    name = job_dir.name

    # Schritt 1a — Idle-Gate: Store/Record-Mechanik zuerst (RenderJob.
    # idle_window_only, Default true) — ein Job kann das Fenster explizit
    # abbestellen; erst dann greift die eigentliche GPU-Idle-Prüfung.
    if record.get("idle_window_only", True) is not False:
        idle_ok, grund = idle_gate.ist_idle()
        if not idle_ok:
            bericht.wartend.append(f"{name}: wartet auf GPU-Leerlauf ({grund})")
            return bericht

    # Schritt 1b — Fähigkeits-Check VOR dem Claim (wie bake-/bsim-Jobs bei
    # main.py: fehlt die Fähigkeit, wird NIE running/done vorgetäuscht).
    faehig, grund = pruefe_faehigkeit(comfy, checkpoint)
    if not faehig:
        aktuell = _lade_job_json(job_dir)
        if aktuell is None or aktuell.get("status") != "queued":
            return bericht  # Race — ein anderer Prozess hat den Job schon bewegt
        aktuell["status"] = "kein-render-worker"
        aktuell["message"] = grund
        aktuell["updated_at"] = _jetzt()
        _schreibe_job_json(job_dir, aktuell)
        bericht.kein_worker.append(f"{name}: {grund}")
        return bericht

    # Schritt 2 — Claim: queued -> running, worker + progress schreiben.
    aktuell = _lade_job_json(job_dir)
    if aktuell is None or aktuell.get("status") != "queued":
        return bericht  # Race
    aktuell["status"] = "running"
    aktuell["worker"] = worker_name
    aktuell["progress"] = {"phase": "an ComfyUI übergeben", "pct": 0.0}
    aktuell["updated_at"] = _jetzt()
    _schreibe_job_json(job_dir, aktuell)
    bericht.geclaimt.append(name)

    if nach_uebernahme_hook is not None:
        nach_uebernahme_hook(job_dir)

    scene = _lade_render_scene(job_dir, aktuell)
    if scene is None:
        aktuell = _lade_job_json(job_dir)
        if aktuell is not None and aktuell.get("status") == "cancelled":
            bericht.abgebrochen.append(name)
            return bericht
        if aktuell is not None:
            aktuell["status"] = "error"
            aktuell["message"] = "render-scene.json fehlt oder ist kein lesbares JSON."
            aktuell["updated_at"] = _jetzt()
            _schreibe_job_json(job_dir, aktuell)
        bericht.fehler.append(f"{name}: render-scene.json fehlt/kaputt")
        return bericht

    job_id = aktuell.get("job_id", name)
    namen = kamera_namen(scene)
    gesammelte_bilder: list[tuple[str, bytes]] = []
    start = time.monotonic()

    def tick(kamera_index: int, geschaetzt_lokal: float) -> bool:
        fortschritt = (kamera_index + geschaetzt_lokal) / len(namen)
        frisch = _lade_job_json(job_dir)
        if frisch is None or frisch.get("status") == "cancelled":
            return False
        frisch["progress"] = {"phase": f"rendert {namen[kamera_index]}", "pct": round(min(fortschritt, 0.99), 3)}
        frisch["updated_at"] = _jetzt()
        _schreibe_job_json(job_dir, frisch)
        return True

    try:
        for i, kamera_name in enumerate(namen):
            graph = baue_prompt_graph(scene, checkpoint, seed=_stabiler_seed(job_id, i))
            try:
                prompt_id = comfy.submit(graph, client_id=f"{worker_name}-{job_id}-{i}")
                eintrag = _poll_bis_fertig(
                    comfy, prompt_id, timeout_s, poll_intervall, on_tick=lambda p, i=i: tick(i, p)
                )
            except ComfyUIFehler as e:
                aktuell = _lade_job_json(job_dir)
                if aktuell is not None and aktuell.get("status") == "cancelled":
                    bericht.abgebrochen.append(name)
                    return bericht
                if aktuell is not None:
                    aktuell["status"] = "kein-render-worker"
                    aktuell["message"] = f"ComfyUI ist während des Renderns weggefallen: {e}"
                    aktuell["updated_at"] = _jetzt()
                    _schreibe_job_json(job_dir, aktuell)
                bericht.kein_worker.append(f"{name}: ComfyUI während des Laufs verloren ({e})")
                return bericht

            if eintrag is None:
                aktuell = _lade_job_json(job_dir)
                if aktuell is not None and aktuell.get("status") == "cancelled":
                    bericht.abgebrochen.append(name)
                    return bericht
                if aktuell is not None:
                    aktuell["status"] = "error"
                    aktuell["message"] = f"ComfyUI-Timeout nach {timeout_s:.0f}s bei Kamera '{kamera_name}'."
                    aktuell["updated_at"] = _jetzt()
                    _schreibe_job_json(job_dir, aktuell)
                bericht.fehler.append(f"{name}: Timeout bei {kamera_name}")
                return bericht

            bild_meta = _bild_aus_history(eintrag)
            if bild_meta is None:
                aktuell = _lade_job_json(job_dir)
                if aktuell is not None and aktuell.get("status") == "cancelled":
                    bericht.abgebrochen.append(name)
                    return bericht
                if aktuell is not None:
                    aktuell["status"] = "error"
                    aktuell["message"] = f"ComfyUI lieferte kein Bild in der History für '{kamera_name}'."
                    aktuell["updated_at"] = _jetzt()
                    _schreibe_job_json(job_dir, aktuell)
                bericht.fehler.append(f"{name}: kein Bild in History bei {kamera_name}")
                return bericht

            try:
                daten = comfy.bild_holen(
                    bild_meta["filename"], bild_meta.get("subfolder", ""), bild_meta.get("type", "output")
                )
            except ComfyUIFehler as e:
                aktuell = _lade_job_json(job_dir)
                if aktuell is not None and aktuell.get("status") == "cancelled":
                    bericht.abgebrochen.append(name)
                    return bericht
                if aktuell is not None:
                    aktuell["status"] = "kein-render-worker"
                    aktuell["message"] = f"ComfyUI /view fehlgeschlagen: {e}"
                    aktuell["updated_at"] = _jetzt()
                    _schreibe_job_json(job_dir, aktuell)
                bericht.kein_worker.append(f"{name}: /view fehlgeschlagen ({e})")
                return bericht

            gesammelte_bilder.append((f"{kamera_name}.png", daten))
    except _AbgebrochenWaehrendPoll:
        bericht.abgebrochen.append(name)
        return bericht

    # Schritt 3 — VOR dem Ergebnis-Schreiben den Record FRISCH lesen. Die
    # gerenderten Bild-Bytes liegen bis hierhin NUR im Speicher (bewusst
    # nicht vorab auf Platte geschrieben) — cancelled heisst: kein einziges
    # Artefakt landet im Job-Ordner.
    aktuell = _lade_job_json(job_dir)
    if aktuell is None or aktuell.get("status") == "cancelled":
        bericht.abgebrochen.append(name)
        return bericht

    # Schritt 4 — render-result.json (kosmovis.render-result/v2) + Bilder
    # schreiben, dann done + pct 1.0.
    for dateiname, daten in gesammelte_bilder:
        ziel = sicherer_zielpfad(job_dir, dateiname)
        ziel.write_bytes(daten)

    bild_namen = [n for n, _ in gesammelte_bilder]
    ergebnis = {
        "schema": "kosmovis.render-result/v2",
        "job_id": job_id,
        "images": bild_namen,
        "ai_variant": bild_namen[0] if bild_namen else None,
        "qa": {
            # style/geometry BEWUSST weggelassen (beide optional im Vertrag)
            # — dieser Worker rechnet kein DINOv3-/DepthAnything-Verfahren,
            # eine erfundene Zahl sähe wie ein echtes Ergebnis aus.
            "verdict": {
                "passed": True,
                "reason": (
                    f"Bild von ComfyUI erzeugt (Checkpoint '{checkpoint}'); Stil-/Geometrie-QA nicht "
                    "berechnet — kein DINOv3-/DepthAnything-Worker angeschlossen."
                ),
            },
        },
        "timings": {"gesamt_s": round(time.monotonic() - start, 2)},
    }
    (job_dir / "render-result.json").write_text(json.dumps(ergebnis, indent=2, ensure_ascii=False), encoding="utf-8")

    aktuell["status"] = "done"
    aktuell["worker"] = worker_name
    aktuell["progress"] = {"phase": "fertig", "pct": 1.0}
    aktuell["updated_at"] = _jetzt()
    _schreibe_job_json(job_dir, aktuell)
    bericht.fertiggestellt.append(name)
    return bericht


def _drucke_bericht(bericht: PassBericht, worker_name: str) -> None:
    for eintrag in bericht.geclaimt:
        print(f"{worker_name}: claimt {eintrag} (queued -> running)")
    for eintrag in bericht.fertiggestellt:
        print(f"{worker_name}: fertig — {eintrag}")
    for eintrag in bericht.kein_worker:
        print(f"{worker_name}: {eintrag}")
    for eintrag in bericht.abgebrochen:
        print(f"{worker_name}: {eintrag} kooperativ abgebrochen (cancelled), keine Ergebnisdatei")
    for eintrag in bericht.fehler:
        print(f"{worker_name}: FEHLER — {eintrag}")
    for eintrag in bericht.wartend:
        print(f"{worker_name}: {eintrag}")
    for eintrag in bericht.uebersprungen:
        print(f"[UEBERSPRUNGEN] {eintrag}", file=sys.stderr)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def cli(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        prog="kosmo_worker_comfyui.py",
        description=(
            "Echter Render-Worker (ComfyUI-Adapter) für den Kosmo-Bridge-Job-Store — pollt "
            "<store> nach dem normativen 4-Schritt-Worker-Protokoll (README.md 'Worker "
            "andocken'). Fehlt ComfyUI oder der konfigurierte Checkpoint, bleibt der Job "
            "ehrlich 'kein-render-worker' statt ein Ergebnis vorzutäuschen (Sanktion 2)."
        ),
    )
    ap.add_argument(
        "--store",
        type=Path,
        default=Path(os.environ.get("KOSMO_JOB_STORE", "/tmp/kosmo-jobs")),
        help="Job-Store-Verzeichnis (derselbe Ordner wie kosmo-bridge --store). Default: KOSMO_JOB_STORE oder /tmp/kosmo-jobs.",
    )
    ap.add_argument(
        "--comfyui-url",
        default=os.environ.get("KOSMO_RENDER_WORKER_COMFYUI_URL", DEFAULT_COMFYUI_URL),
        help=f"Basis-URL der ComfyUI-Instanz (Default {DEFAULT_COMFYUI_URL}).",
    )
    ap.add_argument(
        "--worker-name",
        default=os.environ.get("KOSMO_RENDER_WORKER_NAME", DEFAULT_WORKER_NAME),
        help=f"Name, den dieser Worker in job.json['worker'] einträgt (Default {DEFAULT_WORKER_NAME}).",
    )
    ap.add_argument(
        "--checkpoint",
        default=os.environ.get("KOSMO_RENDER_WORKER_CHECKPOINT", ""),
        help=(
            "ComfyUI-Checkpoint-Dateiname (muss in ComfyUI installiert sein). Offene "
            "Owner-Frage — ohne gesetzten Wert bleibt jeder Job ehrlich 'kein-render-worker'."
        ),
    )
    ap.add_argument("--poll-intervall", type=float, default=1.0, help="Sekunden zwischen zwei Pässen/ComfyUI-Polls (Default 1.0).")
    ap.add_argument("--comfyui-timeout", type=float, default=300.0, help="Sekunden, bis ein ComfyUI-Lauf als Timeout gilt (Default 300).")
    ap.add_argument("--idle-schwelle-prozent", type=float, default=10.0, help="GPU-Auslastungs-Schwelle für 'idle' (Default 10).")
    ap.add_argument("--idle-fenster-start", type=int, default=22, help="Start-Stunde des Idle-Zeitfensters (Default 22).")
    ap.add_argument("--idle-fenster-ende", type=int, default=6, help="End-Stunde des Idle-Zeitfensters (Default 6).")
    ap.add_argument(
        "--idle-override",
        choices=("auto", "idle", "belegt"),
        default="auto",
        help="'idle'/'belegt' erzwingt eine Idle-Entscheidung ohne nvidia-smi (Container-/Demo-Betrieb). Default 'auto'.",
    )
    ap.add_argument("--einmal", action="store_true", help="Nur EIN Pass über den Store statt Endlos-Loop.")
    args = ap.parse_args(argv)

    if not args.store.is_dir():
        print(f"FEHLER: Store-Pfad ist kein Verzeichnis: {args.store}", file=sys.stderr)
        return 2

    override = {"auto": None, "idle": True, "belegt": False}[args.idle_override]
    idle_gate = IdleGate(
        schwelle_prozent=args.idle_schwelle_prozent,
        fenster_start_stunde=args.idle_fenster_start,
        fenster_ende_stunde=args.idle_fenster_ende,
        override=override,
    )
    comfy = ComfyUIClient(args.comfyui_url)

    if not args.checkpoint:
        print(
            "⚠ Kein --checkpoint/KOSMO_RENDER_WORKER_CHECKPOINT gesetzt — jeder Job bleibt "
            "ehrlich 'kein-render-worker' (Modellwahl ist eine offene Owner-Frage, siehe "
            "docs/HOMEPC-RENDER-WORKER.md).",
            file=sys.stderr,
        )

    print(f"{args.worker_name} startet gegen Store {args.store} (ComfyUI: {args.comfyui_url}).")
    while True:
        bericht = fuehre_pass_aus(
            args.store,
            comfy,
            idle_gate,
            args.worker_name,
            args.checkpoint,
            args.poll_intervall,
            args.comfyui_timeout,
        )
        _drucke_bericht(bericht, args.worker_name)
        if args.einmal:
            break
        time.sleep(max(0.0, args.poll_intervall))
    return 0


if __name__ == "__main__":
    raise SystemExit(cli())
