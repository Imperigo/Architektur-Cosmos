#!/usr/bin/env python3
"""Docling-Wissens-Ingest — PDF → Markdown-Notiz im Wissens-Vault.

Stream D (v0.6.8) — Übernahme aus der AI-Scan-Auswertung 0.6.8
(`docs/AI-SCAN-AUSWERTUNG-0.6.8.md` §1.1): Docling v2 (IBM, Apache 2.0 laut
Scan) ist eine lokale, halluzinationsarme PDF→Markdown/JSON-Extraktion.
Dieses Skript ist der lokal-first Ingest-Unterbau nach dem Vorbild von
`tools/homestation-bridge`: reines Python-3-stdlib-Gerüst, Docling nur lazy
importiert — kein Docling nötig, um das Skript überhaupt zu starten.

Aufruf:
    python3 ingest.py <pdf-pfad> [--fake] [--ziel <ordner>]

Drei Ehrlichkeitsstufen (kein stilles Weiterlaufen, kein Vortäuschen):

  (a) Docling installiert  → echte Konvertierung
      (`docling.document_converter.DocumentConverter`).
  (b) Docling NICHT installiert (Standardfall ohne --fake) → klare deutsche
      Fehlermeldung auf stderr + Exit-Code ≠ 0. KEINE Datei wird angelegt.
  (c) `--fake` → deterministische Fixture-Ausgabe OHNE Docling und OHNE das
      PDF wirklich zu lesen — fester Beispielinhalt, der den Dateinamen des
      PDFs einbettet. Frontmatter trägt `werkzeug: fixture` — wird NIE als
      echte Extraktion ausgegeben.

Ausgabe je Lauf: eine Markdown-Notiz (Frontmatter + Inhalt) plus eine
`.meta.json`-Datei (Werkzeug, Version, Dauer, Seitenzahl, Warnungen) im
Zielordner (Default `wissen/vault/Import/`). Zusätzlich wird ein schlankes
JSON-Manifest unter `apps/kosmo-orbit/public/wissen/import.json`
regeneriert — derselbe «wissen/-Bündel»-Weg, über den die App auch die
Bauwissen-Basis-Korpora lädt (`apps/kosmo-orbit/src/modules/prepare/
knowledge.ts`, `basisIndex()`), hier additiv für Import-Notizen. Der
KosmoData-Wissen-Tab liest dieses Manifest direkt (siehe
`DataWorkspace.tsx`, `KosmoWissenView`).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# .../kosmo-orbit/tools/docling-ingest/ingest.py
#   parents[0] = docling-ingest, [1] = tools, [2] = kosmo-orbit, [3] = Repo-Wurzel
REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_ZIEL = REPO_ROOT / "wissen" / "vault" / "Import"
DEFAULT_MANIFEST = (
    REPO_ROOT / "kosmo-orbit" / "apps" / "kosmo-orbit" / "public" / "wissen" / "import.json"
)

UMLAUT_ERSATZ = {"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss"}


def slug(text: str) -> str:
    """Slugify wie `basisDocId` in knowledge.ts — stabile, dateisystemtaugliche Basis."""
    s = text.lower()
    for k, v in UMLAUT_ERSATZ.items():
        s = s.replace(k, v)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-")[:60]
    return s or "dokument"


def jetzt_iso_default() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def jetzt_kompakt(jetzt: str) -> str:
    """'2026-07-10T12:00:00Z' -> '20260710-120000' — für Dateinamen."""
    ziffern_und_t = re.sub(r"[^0-9T]", "", jetzt)
    return ziffern_und_t.replace("T", "-")


def build_frontmatter(
    titel: str,
    quelle_dateiname: str,
    importiert_am: str,
    werkzeug: str,
    seiten: int | None,
    tags: tuple[str, ...] = ("import",),
) -> str:
    zeilen = ["---"]
    zeilen.append(f'titel: "{titel}"')
    zeilen.append(f'quelle-dateiname: "{quelle_dateiname}"')
    zeilen.append(f'importiert-am: "{importiert_am}"')
    zeilen.append(f"werkzeug: {werkzeug}")
    if seiten is not None:
        zeilen.append(f"seiten: {seiten}")
    zeilen.append(f"tags: [{', '.join(tags)}]")
    zeilen.append("---")
    return "\n".join(zeilen)


def parse_frontmatter(text: str) -> dict[str, Any]:
    """Schlanker Parser für UNSER eigenes, flaches Frontmatter (kein YAML nötig)."""
    if not text.startswith("---"):
        return {}
    ende = text.find("\n---", 3)
    if ende == -1:
        return {}
    block = text[3:ende].strip("\n")
    daten: dict[str, Any] = {}
    for zeile in block.splitlines():
        if ":" not in zeile:
            continue
        schluessel, _, wert = zeile.partition(":")
        schluessel = schluessel.strip()
        wert = wert.strip()
        if wert.startswith("[") and wert.endswith("]"):
            inhalt = wert[1:-1]
            daten[schluessel] = [x.strip().strip('"') for x in inhalt.split(",") if x.strip()]
        else:
            daten[schluessel] = wert.strip('"')
    return daten


def fixture_body(quelle_dateiname: str) -> str:
    return (
        "## Zusammenfassung (Fixture)\n\n"
        f"Dies ist ein deterministischer Beispielinhalt aus `--fake` — «{quelle_dateiname}» "
        "wurde NICHT wirklich gelesen oder geparst. Für eine echte Extraktion: Docling "
        "installieren (`pip install docling`) und den Befehl ohne `--fake` erneut ausführen.\n\n"
        "## Abschnitt 1\n\n"
        "Platzhaltertext für den ersten Abschnitt — Docling liefert hier echten, "
        "strukturierten Inhalt (Überschriften, Tabellen, Absätze) aus der Quelle.\n\n"
        "## Abschnitt 2\n\n"
        "Platzhaltertext für den zweiten Abschnitt.\n"
    )


def schreibe_notiz(
    ziel: Path,
    basis_dateiname: str,
    frontmatter: str,
    body: str,
    meta: dict[str, Any],
) -> tuple[Path, Path]:
    ziel.mkdir(parents=True, exist_ok=True)
    md_pfad = ziel / f"{basis_dateiname}.md"
    meta_pfad = ziel / f"{basis_dateiname}.meta.json"
    md_pfad.write_text(f"{frontmatter}\n\n{body}", encoding="utf-8")
    meta_pfad.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return md_pfad, meta_pfad


def regenerate_manifest(ziel: Path, manifest_pfad: Path) -> list[dict[str, Any]]:
    """Scannt ALLE Notizen im Zielordner neu (wie `export-webbasis.py`: idempotente
    Vollregeneration) und schreibt das App-Manifest, das `DataWorkspace.tsx`
    (Wissen-Tab, Import-Sektion) direkt per `fetch()` lädt."""
    eintraege: list[dict[str, Any]] = []
    if ziel.exists():
        for md_pfad in sorted(ziel.glob("*.md")):
            try:
                fm = parse_frontmatter(md_pfad.read_text(encoding="utf-8"))
            except OSError:
                continue
            if not fm:
                continue
            seiten_roh = fm.get("seiten")
            seiten = int(seiten_roh) if isinstance(seiten_roh, str) and seiten_roh.isdigit() else None
            eintraege.append(
                {
                    "titel": fm.get("titel", md_pfad.stem),
                    "quelleDateiname": fm.get("quelle-dateiname", ""),
                    "importiertAm": fm.get("importiert-am", ""),
                    "werkzeug": fm.get("werkzeug", "unbekannt"),
                    "seiten": seiten,
                    "tags": fm.get("tags", []),
                }
            )
    eintraege.sort(key=lambda e: e["importiertAm"], reverse=True)
    manifest_pfad.parent.mkdir(parents=True, exist_ok=True)
    manifest_pfad.write_text(json.dumps(eintraege, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return eintraege


def ingest_fake(pdf_pfad: Path, ziel: Path, jetzt: str, manifest_pfad: Path) -> int:
    """Stufe (c): deterministische Fixture — bewusst OHNE Docling, OHNE das PDF zu lesen."""
    titel = pdf_pfad.stem
    quelle_dateiname = pdf_pfad.name
    basis_dateiname = f"{slug(titel)}-{jetzt_kompakt(jetzt)}"
    frontmatter = build_frontmatter(titel, quelle_dateiname, jetzt, "fixture", None)
    body = fixture_body(quelle_dateiname)
    meta = {
        "werkzeug": "fixture",
        "version": "fixture",
        "dauer_s": 0.0,
        "seiten": None,
        "warnungen": [
            "--fake: kein echtes PDF gelesen — deterministischer Beispielinhalt, keine echte Extraktion",
        ],
    }
    md_pfad, meta_pfad = schreibe_notiz(ziel, basis_dateiname, frontmatter, body, meta)
    regenerate_manifest(ziel, manifest_pfad)
    print(f"Fixture-Notiz geschrieben: {md_pfad}")
    print(f"Metadaten: {meta_pfad}")
    return 0


def ingest_real(pdf_pfad: Path, ziel: Path, jetzt: str, manifest_pfad: Path) -> int:
    """Stufe (a): echte Docling-Konvertierung."""
    try:
        from docling.document_converter import DocumentConverter  # type: ignore[import-not-found]
    except ImportError:
        print(
            "Docling ist nicht installiert — pip install docling; für Tests: --fake",
            file=sys.stderr,
        )
        return 1

    version = "unbekannt"
    try:
        from importlib.metadata import version as paket_version

        version = paket_version("docling")
    except Exception:  # noqa: BLE001 — Version ist Beiwerk, kein Abbruchgrund
        try:
            import docling  # type: ignore[import-not-found]

            version = getattr(docling, "__version__", "unbekannt")
        except ImportError:
            pass

    start = time.time()
    try:
        converter = DocumentConverter()
        ergebnis = converter.convert(str(pdf_pfad))
        dokument = ergebnis.document
        markdown = dokument.export_to_markdown()
    except Exception as exc:  # noqa: BLE001 — Docling-Fehler ehrlich melden, nicht schlucken
        print(f"Docling-Konvertierung fehlgeschlagen: {exc}", file=sys.stderr)
        return 1
    dauer_s = time.time() - start

    seiten: int | None = None
    try:
        seiten = len(dokument.pages)  # type: ignore[attr-defined]
    except (AttributeError, TypeError):
        seiten = None

    titel = pdf_pfad.stem
    quelle_dateiname = pdf_pfad.name
    basis_dateiname = f"{slug(titel)}-{jetzt_kompakt(jetzt)}"
    frontmatter = build_frontmatter(titel, quelle_dateiname, jetzt, "docling", seiten)
    meta = {
        "werkzeug": "docling",
        "version": str(version),
        "dauer_s": round(dauer_s, 3),
        "seiten": seiten,
        "warnungen": [],
    }
    md_pfad, meta_pfad = schreibe_notiz(ziel, basis_dateiname, frontmatter, markdown, meta)
    regenerate_manifest(ziel, manifest_pfad)
    print(f"Notiz geschrieben: {md_pfad} ({seiten if seiten is not None else '?'} Seiten, {dauer_s:.2f}s)")
    print(f"Metadaten: {meta_pfad}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="ingest.py",
        description=(
            "Docling-Wissens-Ingest: PDF -> Markdown-Notiz im Wissens-Vault "
            "(wissen/vault/Import/)."
        ),
    )
    p.add_argument("pdf", help="Pfad zur Quell-PDF")
    p.add_argument(
        "--fake",
        action="store_true",
        help="Deterministische Fixture-Ausgabe ohne Docling und ohne das PDF zu lesen (Tests/Demo)",
    )
    p.add_argument(
        "--ziel",
        default=None,
        help="Zielordner für die Notiz (Default: wissen/vault/Import/)",
    )
    # Test-/Automations-Haken, bewusst ohne Werbung im --help-Text:
    p.add_argument("--jetzt", default=None, help=argparse.SUPPRESS)
    p.add_argument("--manifest", default=None, help=argparse.SUPPRESS)
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    jetzt = args.jetzt or jetzt_iso_default()
    ziel = Path(args.ziel) if args.ziel else DEFAULT_ZIEL
    manifest_pfad = Path(args.manifest) if args.manifest else DEFAULT_MANIFEST
    pdf_pfad = Path(args.pdf)

    if args.fake:
        return ingest_fake(pdf_pfad, ziel, jetzt, manifest_pfad)

    if not pdf_pfad.exists():
        print(f"Fehler: PDF nicht gefunden — {pdf_pfad}", file=sys.stderr)
        return 2

    return ingest_real(pdf_pfad, ziel, jetzt, manifest_pfad)


if __name__ == "__main__":
    sys.exit(main())
