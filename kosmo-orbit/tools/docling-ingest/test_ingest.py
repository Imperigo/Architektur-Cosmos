"""Leichte Prüfung für den Docling-Wissens-Ingest (Stream D, v0.6.8) — kein
pytest nötig (Muster wie `tools/homestation-bridge/test_bridge_haerte.py`):
`python3 test_ingest.py`, Exit-Code 0 = alle Prüfungen grün.

Deckt die drei Ehrlichkeitsstufen ab:
  1. `--fake` ist deterministisch (zwei Läufe mit demselben `--jetzt`-Zeitstempel
     erzeugen byte-identische Markdown- UND Metadaten-Dateien) und legt NIE
     Docling-Code auf den Ausführungspfad.
  2. Fehlt Docling (simuliert über `sys.modules`, unabhängig davon, ob Docling
     im Container tatsächlich installiert ist) und ist `--fake` NICHT gesetzt,
     liefert der Lauf Exit-Code ≠ 0, eine deutsche Fehlermeldung auf stderr
     UND legt KEINE Datei an.
  3. Die Frontmatter-Felder der `--fake`-Notiz sind vollständig
     (titel, quelle-dateiname, importiert-am, werkzeug, tags — seiten bewusst
     nicht gesetzt, weil im Fixture-Pfad unbekannt).
  4. Das App-Manifest (`import.json`) wird nach jedem Lauf aus dem Zielordner
     neu aufgebaut und enthält den frischen Eintrag.
"""

from __future__ import annotations

import io
import json
import sys
import tempfile
from contextlib import redirect_stderr
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import ingest  # noqa: E402

failures: list[str] = []


def check(name: str, cond: bool) -> None:
    status = "OK" if cond else "FEHLER"
    print(f"[{status}] {name}")
    if not cond:
        failures.append(name)


# ---------------------------------------------------------------------------
# 1) --fake ist deterministisch
# ---------------------------------------------------------------------------
with tempfile.TemporaryDirectory() as tmp:
    ziel = Path(tmp) / "Import"
    manifest = Path(tmp) / "import.json"
    JETZT = "2026-07-10T09:00:00Z"
    pdf = "irgendwo/Bauteilkatalog Muster.pdf"

    code1 = ingest.main([pdf, "--fake", "--ziel", str(ziel), "--jetzt", JETZT, "--manifest", str(manifest)])
    dateien_nach_lauf1 = sorted(p.name for p in ziel.glob("*"))
    md_dateien = sorted(ziel.glob("*.md"))
    inhalt1 = md_dateien[0].read_text(encoding="utf-8") if md_dateien else ""
    meta_dateien = sorted(ziel.glob("*.meta.json"))
    meta1 = meta_dateien[0].read_text(encoding="utf-8") if meta_dateien else ""

    check("--fake: Exit-Code 0", code1 == 0)
    check("--fake: genau eine .md + eine .meta.json angelegt", len(md_dateien) == 1 and len(meta_dateien) == 1)

    # Zweiter Lauf in einen frischen Ordner, identische Eingaben (inkl. --jetzt)
    ziel2 = Path(tmp) / "Import2"
    manifest2 = Path(tmp) / "import2.json"
    code2 = ingest.main([pdf, "--fake", "--ziel", str(ziel2), "--jetzt", JETZT, "--manifest", str(manifest2)])
    md_dateien2 = sorted(ziel2.glob("*.md"))
    inhalt2 = md_dateien2[0].read_text(encoding="utf-8") if md_dateien2 else ""
    meta_dateien2 = sorted(ziel2.glob("*.meta.json"))
    meta2 = meta_dateien2[0].read_text(encoding="utf-8") if meta_dateien2 else ""

    check("--fake: zweiter Lauf ebenfalls Exit-Code 0", code2 == 0)
    check("--fake: Dateiname beim zweiten Lauf identisch (deterministisch aus --jetzt)", [p.name for p in md_dateien] == [p.name for p in md_dateien2])
    check("--fake: Markdown-Inhalt byte-identisch über zwei Läufe", inhalt1 == inhalt2 and inhalt1 != "")
    check("--fake: Metadaten byte-identisch über zwei Läufe", meta1 == meta2 and meta1 != "")
    check("--fake: Dateiname trägt den Quell-Dateinamen (slugifiziert)", "bauteilkatalog-muster" in md_dateien[0].name)
    check("--fake: Inhalt bettet den PDF-Dateinamen ein", "Bauteilkatalog Muster.pdf" in inhalt1)
    check("--fake: PDF wurde NICHT vom Dateisystem gelesen (Pfad existiert nicht, Lauf trotzdem erfolgreich)", code1 == 0)

    # -----------------------------------------------------------------
    # 3) Frontmatter vollständig
    # -----------------------------------------------------------------
    fm = ingest.parse_frontmatter(inhalt1)
    check("Frontmatter: titel gesetzt", fm.get("titel") == "Bauteilkatalog Muster")
    check("Frontmatter: quelle-dateiname gesetzt", fm.get("quelle-dateiname") == "Bauteilkatalog Muster.pdf")
    check("Frontmatter: importiert-am gesetzt", fm.get("importiert-am") == JETZT)
    check("Frontmatter: werkzeug=fixture (NIE als echte Extraktion ausgegeben)", fm.get("werkzeug") == "fixture")
    check("Frontmatter: tags enthält 'import'", fm.get("tags") == ["import"])
    check("Frontmatter: seiten im Fixture-Pfad bewusst nicht gesetzt", "seiten" not in fm)

    meta_json = json.loads(meta1)
    check("Meta: werkzeug=fixture", meta_json.get("werkzeug") == "fixture")
    check("Meta: Warnung nennt --fake", any("--fake" in w for w in meta_json.get("warnungen", [])))
    check("Meta: seiten=null im Fixture-Pfad", meta_json.get("seiten") is None)

    # -----------------------------------------------------------------
    # 4) App-Manifest wird regeneriert und enthält den Eintrag
    # -----------------------------------------------------------------
    check("Manifest: Datei wurde geschrieben", manifest.exists())
    manifest_daten = json.loads(manifest.read_text(encoding="utf-8"))
    check("Manifest: genau ein Eintrag", len(manifest_daten) == 1)
    check(
        "Manifest: Eintrag trägt Titel + werkzeug=fixture",
        manifest_daten[0].get("titel") == "Bauteilkatalog Muster" and manifest_daten[0].get("werkzeug") == "fixture",
    )


# ---------------------------------------------------------------------------
# 2) Fehlt Docling (ohne --fake): Exit-Code != 0, deutsche Meldung, keine Datei
# ---------------------------------------------------------------------------
# sys.modules-Eintrag None erzwingt ImportError beim `from docling.… import …`
# — unabhängig davon, ob Docling im Container tatsächlich installiert ist
# (z.B. weil dieser Testlauf NACH einem erfolgreichen `pip install docling`
# passiert). So bleibt Fall (b) beweisbar, egal was Fall (a) im Container tut.
_alte_docling_module = {k: v for k, v in sys.modules.items() if k == "docling" or k.startswith("docling.")}
sys.modules["docling"] = None  # type: ignore[assignment]
sys.modules["docling.document_converter"] = None  # type: ignore[assignment]

try:
    with tempfile.TemporaryDirectory() as tmp:
        ziel = Path(tmp) / "Import"
        manifest = Path(tmp) / "import.json"
        # Echte, existierende Datei, damit die Existenzprüfung nicht schon vorher greift.
        pdf_pfad = Path(tmp) / "echtes-dokument.pdf"
        pdf_pfad.write_bytes(b"%PDF-1.4 platzhalter, absichtlich kein valides PDF\n")

        stderr_puffer = io.StringIO()
        with redirect_stderr(stderr_puffer):
            code = ingest.main([str(pdf_pfad), "--ziel", str(ziel), "--manifest", str(manifest)])

        check("Fehlendes Docling (ohne --fake): Exit-Code != 0", code != 0)
        check(
            "Fehlendes Docling: deutsche Fehlermeldung auf stderr",
            "Docling ist nicht installiert" in stderr_puffer.getvalue()
            and "pip install docling" in stderr_puffer.getvalue()
            and "--fake" in stderr_puffer.getvalue(),
        )
        check("Fehlendes Docling: KEIN Zielordner angelegt (kein stilles Weiterlaufen)", not ziel.exists())
        check("Fehlendes Docling: KEIN Manifest angelegt", not manifest.exists())
finally:
    for key in ("docling", "docling.document_converter"):
        sys.modules.pop(key, None)
    sys.modules.update(_alte_docling_module)


# ---------------------------------------------------------------------------
# Ergebnis
# ---------------------------------------------------------------------------
print()
if failures:
    print(f"{len(failures)} Prüfung(en) fehlgeschlagen:")
    for name in failures:
        print(f"  - {name}")
    sys.exit(1)
print("Alle Prüfungen grün.")
sys.exit(0)
