"""Fehlermeldeweg (v0.9.0, Owner-Auftrag 22.07.2026) — POST /fehlerbericht.

Muster wie `test_bridge_haerte.py`: TestClient gegen die echte App, Pfad
über KOSMO_FEHLERBERICHT_PFAD in ein tmp-Verzeichnis gelenkt (kein Git-Weg
im Test — KOSMO_FEHLERBERICHT_GIT bleibt ungesetzt).
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

_TMP = tempfile.mkdtemp(prefix="kosmo-fehlerbericht-")
os.environ["KOSMO_FEHLERBERICHT_PFAD"] = str(Path(_TMP) / "eingang.jsonl")
os.environ.pop("KOSMO_FEHLERBERICHT_GIT", None)
os.environ.pop("KOSMO_BRIDGE_TOKEN", None)

from fastapi.testclient import TestClient  # noqa: E402

from kosmo_bridge import main as bridge  # noqa: E402

client = TestClient(bridge.app)


def _pfad() -> Path:
    return Path(os.environ["KOSMO_FEHLERBERICHT_PFAD"])


def test_bericht_wird_angehaengt() -> None:
    r = client.post(
        "/fehlerbericht",
        json={"berichte": [{"zeit": "2026-07-22T09:00:00Z", "text": "Bridge nicht erreichbar", "quelle": "meldung", "version": "0.9.0"}]},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True and body["angenommen"] == 1
    zeilen = _pfad().read_text(encoding="utf-8").strip().splitlines()
    eintrag = json.loads(zeilen[-1])
    assert eintrag["text"] == "Bridge nicht erreichbar"
    assert eintrag["quelle"] == "meldung"
    assert eintrag["version"] == "0.9.0"
    assert eintrag["empfangen_um"]


def test_buendel_und_kappung() -> None:
    berichte = [{"zeit": f"2026-07-22T09:00:{i:02d}Z", "text": f"Fehler {i}", "quelle": "window", "version": "0.9.0"} for i in range(3)]
    r = client.post("/fehlerbericht", json={"berichte": berichte})
    assert r.status_code == 200 and r.json()["angenommen"] == 3


def test_leere_liste_und_muell_ehrlich_abgelehnt() -> None:
    assert client.post("/fehlerbericht", json={"berichte": []}).status_code == 400
    assert client.post("/fehlerbericht", json={}).status_code == 400
    assert client.post("/fehlerbericht", content=b"kein json", headers={"Content-Type": "application/json"}).status_code == 400
    # Berichte ohne brauchbaren Text: angenommen == 0 → 400, Datei unveraendert
    vorher = _pfad().read_text(encoding="utf-8") if _pfad().exists() else ""
    r = client.post("/fehlerbericht", json={"berichte": [{"text": "   "}]})
    assert r.status_code == 400
    nachher = _pfad().read_text(encoding="utf-8") if _pfad().exists() else ""
    assert vorher == nachher


def test_ueber_50_berichte_abgelehnt() -> None:
    berichte = [{"text": f"x{i}"} for i in range(51)]
    assert client.post("/fehlerbericht", json={"berichte": berichte}).status_code == 400
