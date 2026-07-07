"""Signierte Lizenz — Python-Verify für die Bridge (Serie I / Batch B6).

Getrennt von `main.py`, damit die reine Entscheidungslogik ohne FastAPI/
Uvicorn-Start unit-testbar bleibt. Muss BYTE-FÜR-BYTE dieselbe kanonische
Nachricht und dasselbe Lizenz-Text-Format bauen wie `@kosmo/lizenz`
(TypeScript, Web Crypto) — sonst würde eine mit dem TS-Signierwerkzeug
ausgestellte Lizenz hier nicht verifizieren. Format:

  lizenzText = base64( utf8( json.dumps({"daten": {...}, "signatur": "<b64>"}) ) )
  Signatur   = Ed25519(kanonische_nachricht(daten)) über:
    "kosmo-lizenz/v1\\ninhaber=...\\nedition=...\\ngueltigBis=...\\nausgestelltAm=...\\nlizenzId=..."

**Kein privater Schlüssel hier oder sonst irgendwo im Repo.** Diese Datei
prüft nur gegen einen ÖFFENTLICHEN Schlüssel (Env `KOSMO_BRIDGE_LIZENZ_PUBKEY`).

**Ed25519-Bibliothek**: nutzt `cryptography`, wenn installiert, sonst
`PyNaCl`, sonst keine — dann lehnt `lizenz_pruefen` bei aktiver Pflicht JEDE
Lizenz ehrlich ab (`grund="keine_ed25519_lib"`), statt eine Prüfung
vorzutäuschen, die gar nicht laufen kann (fail closed, kein Fake-Schutz).
"""

from __future__ import annotations

import base64
import json
import re
from datetime import datetime

ED25519_LIB: str | None
try:
    from cryptography.exceptions import InvalidSignature
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

    ED25519_LIB = "cryptography"
except ImportError:
    try:
        import nacl.exceptions
        import nacl.signing

        ED25519_LIB = "pynacl"
    except ImportError:
        ED25519_LIB = None

LIZENZ_PFLICHTFELDER = ("inhaber", "edition", "gueltigBis", "ausgestelltAm", "lizenzId")


def kanonische_lizenznachricht(daten: dict) -> bytes:
    """Identische Feldreihenfolge wie `kanonischeLizenznachricht()` in
    `@kosmo/lizenz` (TypeScript) — nicht ohne Migrationsplan ändern."""
    zeilen = ["kosmo-lizenz/v1"] + [f"{feld}={daten.get(feld, '')}" for feld in LIZENZ_PFLICHTFELDER]
    return "\n".join(zeilen).encode("utf-8")


def _signatur_gueltig(nachricht: bytes, signatur: bytes, oeffentlicher_schluessel: bytes) -> bool:
    if ED25519_LIB == "cryptography":
        try:
            Ed25519PublicKey.from_public_bytes(oeffentlicher_schluessel).verify(signatur, nachricht)
            return True
        except (InvalidSignature, ValueError, TypeError):
            return False
    if ED25519_LIB == "pynacl":
        try:
            nacl.signing.VerifyKey(oeffentlicher_schluessel).verify(nachricht, signatur)
            return True
        except (nacl.exceptions.BadSignatureError, ValueError, TypeError):
            return False
    return False  # keine Ed25519-Lib verfügbar — ehrlich verweigern


def _gueltig_bis_ms(gueltig_bis: str) -> float:
    """`gueltigBis` → Zeitpunkt (ms seit Epoch), bis zu dem die Lizenz gilt.
    Ein reines Datum (`YYYY-MM-DD`) gilt bis zum Ende dieses Tages (UTC)."""
    nur_datum = bool(re.fullmatch(r"\d{4}-\d{2}-\d{2}", gueltig_bis))
    iso = f"{gueltig_bis}T23:59:59.999+00:00" if nur_datum else gueltig_bis.replace("Z", "+00:00")
    return datetime.fromisoformat(iso).timestamp() * 1000


def _daten_vollstaendig(daten: object) -> bool:
    if not isinstance(daten, dict):
        return False
    return all(isinstance(daten.get(f), str) and daten.get(f, "").strip() for f in LIZENZ_PFLICHTFELDER)


def _dekodiere_lizenztext(lizenz_text: str) -> dict | None:
    try:
        json_bytes = base64.b64decode(lizenz_text, validate=True)
        paket = json.loads(json_bytes.decode("utf-8"))
        if not isinstance(paket, dict) or "daten" not in paket or "signatur" not in paket:
            return None
        if not isinstance(paket["signatur"], str):
            return None
        return paket
    except Exception:
        return None


def lizenz_pruefen(lizenz_text: str, public_key_b64: str, jetzt: datetime) -> dict:
    """Prüft eine signierte Lizenz gegen einen öffentlichen Ed25519-Schlüssel.

    Rückgabe: `{"gueltig": bool, "grund": str | None, "lizenz": dict | None}`.
    `jetzt` ist immer ein Parameter — nie `datetime.now()` intern — damit die
    Funktion deterministisch testbar bleibt (gültig/abgelaufen mit festem
    Testdatum exakt nachstellbar, wie in `@kosmo/lizenz`).
    """
    paket = _dekodiere_lizenztext(lizenz_text)
    if paket is None:
        return {"gueltig": False, "grund": "lizenztext_ungueltig", "lizenz": None}

    daten = paket.get("daten")
    if not _daten_vollstaendig(daten):
        return {"gueltig": False, "grund": "lizenzdaten_unvollstaendig", "lizenz": None}

    try:
        pubkey_bytes = base64.b64decode(public_key_b64, validate=True)
        if len(pubkey_bytes) != 32:
            raise ValueError("falsche Länge")
    except Exception:
        return {"gueltig": False, "grund": "oeffentlicher_schluessel_ungueltig", "lizenz": None}

    try:
        sig_bytes = base64.b64decode(paket["signatur"], validate=True)
        if len(sig_bytes) != 64:
            raise ValueError("falsche Länge")
    except Exception:
        return {"gueltig": False, "grund": "signaturformat_ungueltig", "lizenz": None}

    if ED25519_LIB is None:
        return {"gueltig": False, "grund": "keine_ed25519_lib", "lizenz": None}

    nachricht = kanonische_lizenznachricht(daten)
    if not _signatur_gueltig(nachricht, sig_bytes, pubkey_bytes):
        return {"gueltig": False, "grund": "signatur_ungueltig", "lizenz": daten}

    if jetzt.timestamp() * 1000 > _gueltig_bis_ms(daten["gueltigBis"]):
        return {"gueltig": False, "grund": "abgelaufen", "lizenz": daten}

    return {"gueltig": True, "grund": None, "lizenz": daten}


def lade_widerrufsliste(env: dict) -> list[str]:
    """Widerrufsliste aus Env-Kommaliste + optionaler Datei (eine Lizenz-ID
    pro Zeile ODER JSON-Array) — analog zu `ladeWiderrufsliste()` im
    Sync-Server. Fehlt/kaputt die Datei, wird sie ehrlich ignoriert."""
    ids: set[str] = set()
    for teil in str(env.get("KOSMO_BRIDGE_LIZENZ_WIDERRUF", "")).split(","):
        t = teil.strip()
        if t:
            ids.add(t)
    datei = env.get("KOSMO_BRIDGE_LIZENZ_WIDERRUF_DATEI")
    if datei:
        try:
            from pathlib import Path

            inhalt = Path(datei).read_text(encoding="utf-8").strip()
            werte = json.loads(inhalt) if inhalt.startswith("[") else inhalt.splitlines()
            for w in werte:
                t = str(w).strip()
                if t:
                    ids.add(t)
        except Exception:
            pass
    return list(ids)


def ist_widerrufen(lizenz_id: str, widerrufsliste: list[str]) -> bool:
    return lizenz_id in widerrufsliste
