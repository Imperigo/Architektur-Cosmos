"""verifiziere_andocken.py — bpy-freie, stdlib-only Live-Prüfung fürs
HomeStation-Andock-Paket (Owner-Kompass F12, `docs/HOMESTATION-ANDOCKEN.md`).

**Was das ist:** anders als `test_blender_worker.py` (das den Poller
`kosmo_bridge/blender_worker.py` OHNE laufenden Server prüft, direkt gegen
`job.json`-Dateien in einem `tempfile.mkdtemp()`-Store) prüft dieses Skript
eine ECHT LAUFENDE Bridge über HTTP — genau die Kette, die am Gerät (oder
schon jetzt hier im Container gegen `--fake-worker`) tatsächlich läuft:

  (a) Bridge erreichbar (`GET /health`).
  (b) Render-Job einstellen (`POST /jobs`, multipart `scene` + `model.glb`),
      inkl. Freigabe (`POST /jobs/{id}/approve`), falls
      `KOSMO_BRIDGE_APPROVAL_PFLICHT=1` aktiv ist.
  (c) Statuskette beobachten (`GET /jobs/{id}` gepollt) —
      queued → running → done (oder ein ehrlicher Abbruch-/Fehlerzustand).
  (d) Ergebnis-Schema validieren gegen `kosmovis.render-result/v2`
      (`packages/kosmo-contracts/src/render-result.ts`): `schema`, `job_id`,
      `images[]`, `qa.verdict.passed`. Zusätzlich wird das erste Bild aus
      `images[]` über `GET /jobs/{id}/artifacts/{name}` geholt und auf eine
      gültige PNG-Signatur geprüft.
  (e) FAKE vs. ECHT ehrlich unterscheiden — anhand der bekannten
      Ehrlichkeits-Marker, die BEIDE heutigen Fake-Wege im Repo setzen
      (`main.py:_fake_worker_step` UND `kosmo_bridge/blender_worker.py:
      FakeBerechner`): `result.fake is True`, `qa.*.method` bzw.
      `qa.verdict.reason` enthält "fake" (Gross/klein egal), oder der
      `worker`-Name ist einer der bekannten Fake-Worker-Namen
      ("fake-worker", "blender-worker-fake"). Trifft KEINER dieser Marker zu,
      gilt das Ergebnis als (vermutlich) echt — das Skript kann Echtheit
      nicht kryptografisch beweisen, nur die bekannte Unehrlichkeit
      ausschliessen.

**Warum stdlib-only:** dieselbe Haus-Konvention wie `test_blender_worker.py`/
`test_bridge_haerte.py` — kein zusätzliches `pip install` nötig, um die
Andock-Prüfung sofort laufen zu lassen (auch auf einem frischen HomeStation-
Setup, bevor überhaupt `pip install -e .` gelaufen ist). Nur `urllib`/`json`/
`zlib`/`argparse` aus der Standardbibliothek.

**Läuft gegen die Fake-Kette genauso wie gegen eine echte Bridge** (Auftrag):
gegen `kosmo-bridge --fake-worker` (oder den externen `blender_worker.py
--fake-worker`-Runner) meldet es ehrlich «Kette funktioniert, Ergebnis ist
markierter FAKE — am Gerät muss hier ein echtes Bild stehen» statt einen
falschen Erfolg vorzutäuschen.

Aufruf:
    python3 tools/homestation-bridge/verifiziere_andocken.py
    python3 tools/homestation-bridge/verifiziere_andocken.py --url http://homestation:8600 --token GEHEIM

Exit-Code 0 = die Kette funktioniert (queued→…→done, gültiges Schema) —
  UNABHÄNGIG davon, ob das Ergebnis FAKE oder echt ist (das Skript prüft die
  Mechanik, nicht die Bildqualität). Ein FAKE-Ergebnis wird laut als WARNUNG
  gemeldet, ist aber kein Skript-Fehlschlag.
Exit-Code 1 = Bridge nicht erreichbar / Verbindungsfehler.
Exit-Code 2 = Job-Anlage schlug fehl (HTTP-Fehler, kaputte Antwort).
Exit-Code 3 = Statuskette bricht ab: Job bleibt im Timeout hängen, oder
  endet auf einem nicht behandelten/ehrlichen Fehlerzustand.
Exit-Code 4 = Ergebnis-Schema ungültig (fehlende Pflichtfelder,
  Artefakt-Download schlägt fehl oder ist keine gültige PNG-Datei).
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import struct
import sys
import time
import urllib.error
import urllib.request
import uuid
import zlib
from typing import Any

# ---------------------------------------------------------------------------
# Bekannte Ehrlichkeits-Marker der beiden heutigen Fake-Wege im Repo — siehe
# main.py:_fake_worker_step (worker="fake-worker", qa.*.method="fake-worker",
# qa.verdict.reason="Fake-Worker (Demo ohne GPU)") und
# kosmo_bridge/blender_worker.py:FakeBerechner (WORKER_NAME=
# "blender-worker-fake", result["fake"]=True, qa.verdict.reason enthält
# "FAKE — blender-worker-fake …").
# ---------------------------------------------------------------------------
BEKANNTE_FAKE_WORKER_NAMEN = {"fake-worker", "blender-worker-fake"}


class AndockFehler(Exception):
    """Ein Prüfschritt konnte nicht sauber abgeschlossen werden — trägt den
    beabsichtigten Exit-Code."""

    def __init__(self, exit_code: int, meldung: str) -> None:
        super().__init__(meldung)
        self.exit_code = exit_code


def _log(status: str, text: str) -> None:
    print(f"[{status}] {text}")


# ---------------------------------------------------------------------------
# stdlib-HTTP-Helfer (kein requests/httpx nötig)
# ---------------------------------------------------------------------------


def _headers(token: str | None) -> dict[str, str]:
    h = {}
    if token:
        h["X-Kosmo-Token"] = token
    return h


def _http_get_json(url: str, headers: dict[str, str], timeout: float = 10.0) -> dict[str, Any]:
    req = urllib.request.Request(url, headers=headers, method="GET")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _http_get_bytes(url: str, headers: dict[str, str], timeout: float = 15.0) -> bytes:
    req = urllib.request.Request(url, headers=headers, method="GET")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def _http_post_json(url: str, payload: dict[str, Any], headers: dict[str, str], timeout: float = 10.0) -> dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")
    req_headers = {**headers, "Content-Type": "application/json"}
    req = urllib.request.Request(url, data=body, headers=req_headers, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _multipart_body(fields: dict[str, str], files: dict[str, tuple[str, bytes, str]]) -> tuple[bytes, str]:
    """Baut einen minimalen multipart/form-data-Body von Hand (stdlib-only —
    kein `requests`, das den Boilerplate sonst übernehmen würde)."""
    boundary = "kosmoAndockGrenze" + uuid.uuid4().hex
    teile: list[bytes] = []
    for name, value in fields.items():
        teile.append(f"--{boundary}\r\n".encode())
        teile.append(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode())
        teile.append(value.encode("utf-8") + b"\r\n")
    for name, (dateiname, daten, content_type) in files.items():
        teile.append(f"--{boundary}\r\n".encode())
        teile.append(
            f'Content-Disposition: form-data; name="{name}"; filename="{dateiname}"\r\n'.encode()
        )
        teile.append(f"Content-Type: {content_type}\r\n\r\n".encode())
        teile.append(daten + b"\r\n")
    teile.append(f"--{boundary}--\r\n".encode())
    return b"".join(teile), boundary


def _http_post_multipart(
    url: str, fields: dict[str, str], files: dict[str, tuple[str, bytes, str]], headers: dict[str, str], timeout: float = 20.0
) -> dict[str, Any]:
    body, boundary = _multipart_body(fields, files)
    req_headers = {**headers, "Content-Type": f"multipart/form-data; boundary={boundary}"}
    req = urllib.request.Request(url, data=body, headers=req_headers, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _minimales_glb() -> bytes:
    """Kein echtes GLB nötig — die Bridge liest den Modell-Inhalt für den
    Render-Job-Vertrag nicht inhaltlich aus (main.py:create_job schreibt ihn
    nur ab), nur Grösse/Vorhandensein zählen hier. Ein paar Bytes reichen."""
    return b"glTF" + b"\x00" * 16


# ---------------------------------------------------------------------------
# (a) Bridge erreichbar
# ---------------------------------------------------------------------------


def pruefe_erreichbarkeit(base_url: str, headers: dict[str, str]) -> dict[str, Any]:
    try:
        health = _http_get_json(f"{base_url}/health", headers)
    except urllib.error.HTTPError as e:
        raise AndockFehler(1, f"Bridge antwortet mit HTTP {e.code} auf /health — {e.reason}") from e
    except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
        raise AndockFehler(
            1,
            f"Bridge unter {base_url} nicht erreichbar ({e}). Läuft der Prozess? "
            f"Stimmt Host/Port? Siehe Fehlerbild-Tabelle 'Port belegt/nicht erreichbar' "
            f"in docs/HOMESTATION-ANDOCKEN.md.",
        ) from e
    if not health.get("ok"):
        raise AndockFehler(1, f"/health meldet ok=false: {health}")
    _log("OK", f"(a) Bridge erreichbar unter {base_url} — {health}")
    return health


# ---------------------------------------------------------------------------
# (b) Render-Job einstellen (+ Freigabe, falls APPROVAL_PFLICHT aktiv ist)
# ---------------------------------------------------------------------------


def stelle_render_job(base_url: str, headers: dict[str, str]) -> dict[str, Any]:
    scene = json.dumps({"style": {"mode": "none"}})
    try:
        record = _http_post_multipart(
            f"{base_url}/jobs",
            fields={"scene": scene},
            files={"model": ("model.glb", _minimales_glb(), "model/gltf-binary")},
            headers=headers,
        )
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        raise AndockFehler(2, f"POST /jobs schlug fehl: HTTP {e.code} — {detail}") from e
    except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
        raise AndockFehler(2, f"POST /jobs: Verbindung schlug fehl ({e})") from e

    job_id = record.get("job_id")
    if not job_id:
        raise AndockFehler(2, f"POST /jobs lieferte keinen job_id: {record}")
    _log("OK", f"(b) Job angelegt: {job_id} (status={record.get('status')})")

    if record.get("status") == "awaiting_approval":
        token = record.get("approval_token", "")
        try:
            freigegeben = _http_post_json(
                f"{base_url}/jobs/{job_id}/approve", {"approval_token": token}, headers
            )
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", errors="replace")
            raise AndockFehler(
                2, f"KOSMO_BRIDGE_APPROVAL_PFLICHT ist aktiv, aber /approve schlug fehl: HTTP {e.code} — {detail}"
            ) from e
        _log("OK", f"(b) Freigabe-Pflicht aktiv erkannt, Job automatisch freigegeben (status={freigegeben.get('status')})")

    return record


# ---------------------------------------------------------------------------
# (c) Statuskette beobachten
# ---------------------------------------------------------------------------

TERMINAL_ERFOLG = {"done"}
TERMINAL_EHRLICH_OHNE_ERGEBNIS = {"cancelled", "error", "kein-blender-worker", "kein-sfm-worker"}


def beobachte_statuskette(
    base_url: str, headers: dict[str, str], job_id: str, timeout_sekunden: float, intervall: float
) -> dict[str, Any]:
    gesehene_status: list[str] = []
    start = time.monotonic()
    letzter_status: str | None = None
    while True:
        try:
            record = _http_get_json(f"{base_url}/jobs/{job_id}", headers)
        except urllib.error.HTTPError as e:
            raise AndockFehler(3, f"GET /jobs/{job_id} schlug fehl: HTTP {e.code}") from e
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            raise AndockFehler(3, f"GET /jobs/{job_id}: Verbindung schlug fehl ({e})") from e

        status = record.get("status")
        if status != letzter_status:
            gesehene_status.append(str(status))
            _log("OK", f"(c) Status-Übergang: {' -> '.join(gesehene_status)}")
            letzter_status = status

        if status in TERMINAL_ERFOLG:
            return record
        if status in TERMINAL_EHRLICH_OHNE_ERGEBNIS:
            raise AndockFehler(
                3,
                f"Job endete ehrlich auf '{status}' statt 'done' "
                f"(message={record.get('message')!r}) — das ist bei diesem "
                f"Job-Typ ohne echten Worker ERWARTET, aber kein 'done'-Ergebnis "
                f"zum Prüfen. Siehe README 'Job-Lebenszyklus' für die Bedeutung "
                f"von '{status}'.",
            )

        if time.monotonic() - start > timeout_sekunden:
            raise AndockFehler(
                3,
                f"Timeout nach {timeout_sekunden:.0f}s — Job hängt bei Status "
                f"'{status}'. Mögliche Ursachen: KOSMO_BRIDGE_GPU_IDLE=0 (GPU gilt "
                f"als belegt, Render-Jobs bleiben 'queued'), kein Worker claimt "
                f"(prüfe, ob ein Runner überhaupt gegen DIESEN --store läuft), "
                f"oder ein hängender 'running'-Zustand ohne Fortschritt. Siehe "
                f"Fehlerbild-Tabelle in docs/HOMESTATION-ANDOCKEN.md.",
            )
        time.sleep(intervall)


# ---------------------------------------------------------------------------
# (d) Ergebnis-Schema validieren (kosmovis.render-result/v2) + Artefakt-Check
# ---------------------------------------------------------------------------

PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


def validiere_ergebnis_schema(record: dict[str, Any]) -> dict[str, Any]:
    result = record.get("result")
    if not isinstance(result, dict):
        raise AndockFehler(4, "Record hat status=done, aber kein eingebettetes 'result' (render-result.json fehlt).")

    fehlende = [f for f in ("schema", "job_id", "images", "qa") if f not in result]
    if fehlende:
        raise AndockFehler(4, f"'result' fehlen Pflichtfelder aus kosmovis.render-result/v2: {fehlende}")
    if result.get("schema") != "kosmovis.render-result/v2":
        raise AndockFehler(4, f"result.schema ist {result.get('schema')!r}, erwartet 'kosmovis.render-result/v2'")
    if not isinstance(result.get("images"), list) or not result["images"]:
        raise AndockFehler(4, "result.images ist leer oder kein Array — kein Bild zum Prüfen.")
    verdict = (result.get("qa") or {}).get("verdict")
    if not isinstance(verdict, dict) or "passed" not in verdict:
        raise AndockFehler(4, "result.qa.verdict.passed fehlt — Doppel-QA-Verdikt unvollständig.")

    _log("OK", f"(d) Ergebnis-Schema kosmovis.render-result/v2 vollständig, qa.verdict.passed={verdict.get('passed')}")
    return result


def _png_ist_bekannter_platzhalter(png_bytes: bytes) -> bool:
    """Best-effort-Heuristik (KEIN Ersatz für den qa.method-/fake-Flag-Check
    unten): der bekannte KosmoBridge-Platzhalter (main.py:_placeholder_png UND
    kosmo_bridge/blender_worker.py:platzhalter_png, byte-identisches Format)
    ist ein RGB-PNG (Farbtyp 2, 8 Bit) ohne Zeilenfilter, dessen sämtliche
    Pixel exakt (194, 94, 58) sind — kein echter Render sieht zufällig
    genauso aus. Gibt False zurück, sobald irgendetwas nicht passt (auch bei
    Parse-Fehlern) statt eine Vermutung zu erzwingen."""
    try:
        if not png_bytes.startswith(PNG_MAGIC):
            return False
        pos = len(PNG_MAGIC)
        width = height = None
        idat = b""
        while pos < len(png_bytes):
            (length,) = struct.unpack(">I", png_bytes[pos : pos + 4])
            tag = png_bytes[pos + 4 : pos + 8]
            data = png_bytes[pos + 8 : pos + 8 + length]
            if tag == b"IHDR":
                width, height, bitdepth, colortype = struct.unpack(">IIBB", data[:10])
                if bitdepth != 8 or colortype != 2:
                    return False
            elif tag == b"IDAT":
                idat += data
            pos += 12 + length
        if width is None or height is None:
            return False
        raw = zlib.decompress(idat)
        zeilenbreite = 1 + width * 3
        erwartete_zeile = b"\x00" + bytes([194, 94, 58] * width)
        for y in range(height):
            zeile = raw[y * zeilenbreite : (y + 1) * zeilenbreite]
            if zeile != erwartete_zeile:
                return False
        return True
    except Exception:
        return False


def pruefe_artefakt(base_url: str, headers: dict[str, str], job_id: str, result: dict[str, Any]) -> bool:
    bild_name = result.get("images", [None])[0]
    if not bild_name:
        raise AndockFehler(4, "Kein Bildname in result.images zum Herunterladen.")
    url = f"{base_url}/jobs/{job_id}/artifacts/{bild_name}"
    try:
        daten = _http_get_bytes(url, headers)
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ConnectionError) as e:
        raise AndockFehler(4, f"Artefakt-Download {url} schlug fehl: {e}") from e
    if not daten.startswith(PNG_MAGIC):
        raise AndockFehler(4, f"Artefakt {bild_name} ist keine gültige PNG-Datei (falsche Signatur).")
    ist_platzhalter = _png_ist_bekannter_platzhalter(daten)
    _log(
        "OK" if not ist_platzhalter else "WARN",
        f"(d) Artefakt {bild_name} heruntergeladen ({len(daten)} Bytes), gültige PNG-Signatur"
        + (" — sieht aus wie der bekannte einfarbige Platzhalter (Verdachtsmoment, s.u.)" if ist_platzhalter else ""),
    )
    return ist_platzhalter


# ---------------------------------------------------------------------------
# (e) FAKE vs. echt ehrlich unterscheiden
# ---------------------------------------------------------------------------


def unterscheide_fake_vs_echt(record: dict[str, Any], result: dict[str, Any], artefakt_sieht_platzhalter_aus: bool) -> bool:
    """Gibt True zurück, wenn das Ergebnis nach den bekannten Ehrlichkeits-
    Markern als FAKE erkannt wird. False heisst NICHT bewiesen echt — nur
    'keiner der bekannten Fake-Marker wurde gefunden'."""
    gruende: list[str] = []

    if result.get("fake") is True:
        gruende.append("result.fake == True")

    worker = str(record.get("worker") or "")
    if worker in BEKANNTE_FAKE_WORKER_NAMEN:
        gruende.append(f"worker == {worker!r} (bekannter Fake-Worker-Name)")

    qa = result.get("qa") or {}
    for teil in ("style", "geometry"):
        methode = str((qa.get(teil) or {}).get("method") or "")
        if "fake" in methode.lower():
            gruende.append(f"qa.{teil}.method == {methode!r}")

    verdict_reason = str((qa.get("verdict") or {}).get("reason") or "")
    if "fake" in verdict_reason.lower():
        gruende.append(f"qa.verdict.reason enthält 'FAKE': {verdict_reason!r}")

    if artefakt_sieht_platzhalter_aus:
        gruende.append("Bilddatei ist byte-identisch mit dem bekannten einfarbigen Platzhalter")

    if gruende:
        _log("WARN", "(e) Kette funktioniert, Ergebnis ist markierter FAKE — am Gerät muss hier ein echtes Bild stehen.")
        for g in gruende:
            _log("WARN", f"    Marker: {g}")
        return True

    _log(
        "OK",
        "(e) Keiner der bekannten Fake-Marker gefunden (kein fake-Flag, kein "
        "'fake' in qa.method/verdict.reason, kein bekannter Fake-Worker-Name, "
        "Bild ist kein bekannter Platzhalter) — Ergebnis gilt als (vermutlich) "
        "echt. Das Skript kann Bildqualität/Echtheit nicht inhaltlich "
        "beurteilen, nur die bekannte Unehrlichkeit ausschliessen.",
    )
    return False


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def fuehre_pruefung_aus(
    base_url: str, token: str | None, timeout_sekunden: float, intervall: float
) -> tuple[bool, bool]:
    """Gibt (kette_funktioniert, ist_fake) zurück. Wirft AndockFehler bei
    einem echten Abbruch (Bridge unerreichbar, Job-Anlage schlägt fehl,
    Statuskette hängt/bricht ehrlich ab, Schema ungültig)."""
    headers = _headers(token)
    pruefe_erreichbarkeit(base_url, headers)
    erstellt = stelle_render_job(base_url, headers)
    job_id = erstellt["job_id"]
    fertiger_record = beobachte_statuskette(base_url, headers, job_id, timeout_sekunden, intervall)
    result = validiere_ergebnis_schema(fertiger_record)
    artefakt_ist_platzhalter = pruefe_artefakt(base_url, headers, job_id, result)
    ist_fake = unterscheide_fake_vs_echt(fertiger_record, result, artefakt_ist_platzhalter)
    return True, ist_fake


def cli(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        prog="verifiziere_andocken.py",
        description=(
            "Live-Prüfung der Kosmo-Bridge-Job-Kette gegen einen laufenden Server "
            "(Bridge erreichbar -> Job einstellen -> Statuskette beobachten -> "
            "Ergebnis-Schema validieren -> FAKE vs. echt unterscheiden). Läuft "
            "gegen die --fake-worker-Kette genauso wie gegen eine echte "
            "HomeStation-Bridge; unterscheidet ehrlich zwischen beiden. Siehe "
            "docs/HOMESTATION-ANDOCKEN.md."
        ),
    )
    ap.add_argument("--url", default="http://127.0.0.1:8600", help="Basis-URL der Bridge (Default: %(default)s)")
    ap.add_argument(
        "--token",
        default=os.environ.get("KOSMO_BRIDGE_TOKEN"),
        help="X-Kosmo-Token-Header (Default: $KOSMO_BRIDGE_TOKEN, falls gesetzt)",
    )
    ap.add_argument("--timeout-sekunden", type=float, default=30.0, help="Timeout fürs Warten auf 'done' (Default: %(default)s)")
    ap.add_argument("--intervall", type=float, default=1.0, help="Sekunden zwischen zwei Polls (Default: %(default)s)")
    args = ap.parse_args(argv)

    print(f"Prüfe Bridge unter {args.url} …")
    try:
        _kette_ok, ist_fake = fuehre_pruefung_aus(args.url, args.token, args.timeout_sekunden, args.intervall)
    except AndockFehler as e:
        _log("FEHLER", str(e))
        print()
        print(f"Kette FEHLGESCHLAGEN (Exit-Code {e.exit_code}).")
        return e.exit_code

    print()
    if ist_fake:
        print(
            "ERGEBNIS: Kette funktioniert, Ergebnis ist markierter FAKE — "
            "am Gerät muss hier ein echtes Bild stehen."
        )
    else:
        print(
            "ERGEBNIS: Kette funktioniert, keine bekannten Fake-Marker gefunden "
            "— Ergebnis gilt als (vermutlich) echt."
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(cli())
