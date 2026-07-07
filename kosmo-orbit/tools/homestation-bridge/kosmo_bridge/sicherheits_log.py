"""Sicherheits-Logging (Serie I / Batch B9 — Betrieb & Notfall).

Analog zum Sync-Server-Gegenstück (`tools/sync-server/src/sicherheits-log.mjs`):
rein additiv, ändert **kein** bestehendes Verhalten — `main.py` schreibt an
den bestehenden Ablehnungsstellen (Token, Lizenz, Upload-Deckel) nur eine
zusätzliche strukturierte JSON-Log-Zeile auf stderr, die Statuscodes bleiben
exakt wie in B4/B6.

Format: eine JSON-Zeile pro Ereignis — ``{"ts", "ereignis", "quelle", "detail"}``.

**Keine Geheimnisse im Log**: nie ein Token oder eine Lizenz-Signatur im
Klartext — nur ehrliche Kurzbeschreibungen ("Token fehlt oder falsch"). Eine
Lizenz-ID ist kein Geheimnis (sie steht auch auf der Widerrufsliste im
Klartext) und darf im ``detail`` erscheinen — die Signatur nie.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone


def formatiere_sicherheitsereignis(ereignis: str, quelle: str, detail: str = "", ts: str | None = None) -> str:
    """Reine Formatierungsfunktion — testbar ohne laufenden Bridge-Prozess."""
    zeitstempel = ts if ts is not None else datetime.now(timezone.utc).isoformat()
    return json.dumps(
        {"ts": zeitstempel, "ereignis": ereignis, "quelle": quelle, "detail": detail},
        ensure_ascii=False,
    )


def protokolliere_sicherheitsereignis(ereignis: str, quelle: str, detail: str = "") -> None:
    """Schreibt die formatierte Zeile auf stderr — getrennt vom normalen
    Betriebslog (Startmeldungen etc. bleiben auf stdout)."""
    print(formatiere_sicherheitsereignis(ereignis, quelle, detail), file=sys.stderr)
