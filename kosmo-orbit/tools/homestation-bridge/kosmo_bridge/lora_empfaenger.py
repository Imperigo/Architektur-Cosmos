"""lora_empfaenger.py — HomeStation-seitiger Empfänger für ein
`kosmo.lora-train/v1`-Trainingspaket (v0.8.3 / E9, `docs/V083-SPEZ.md` §9,
Matrix-Zeile C-22).

**Woher/wohin:** KosmoTrain (`apps/kosmo-orbit/.../modules/train/TrainWorkspace.tsx`,
`packages/kosmo-ai/src/lora-training.ts#baueLoraTrainManifest`) schnürt im
Browser ein Trainingspaket — ein `kosmo.lora-train/v1`-Manifest
(`packages/kosmo-contracts/src/lora-train.ts`, `LoraTrainManifest`) plus
sha256-gehashte JSONL-Datensatz-Dateien — und bietet es als Browser-Download
an (kein Bridge-Endpunkt, `docs/HOMESTATION-AUFTRAG.md` §2). Dieses Skript
ist die GEGENSTELLE auf der HomeStation: es nimmt das entpackte Paket
entgegen, prüft es GEGEN GENAU DASSELBE SCHEMA wie der TypeScript-Contract
(Schema-Version, Adapter-Enum, sha256 je Datei, Rezept-Muster, der
`visibility`-Deckel-Guard aus `LoraTrainManifest.superRefine`) und bereitet
bei Erfolg ein Unsloth-Laufskript-TEMPLATE vor.

**Ehrlichkeits-Kern (wie überall in diesem Repo, s. `main.py`-Kopfkommentar):**
- Dieses Skript macht NIE einen echten GPU-/Unsloth-Lauf — das ist erklärte
  HomeStation-Grenze (`docs/HOMESTATION-AUFTRAG.md` §2 «Trainer-Contract»).
  Es validiert nur, prüft Hashes und schreibt ein TEMPLATE mit Platzhaltern
  (`{{GPU_HOST}}` etc.) — kein Platzhalter wird als echter Wert ausgegeben.
- Dieselbe `--fake-worker`-Konvention wie der Bridge-Server
  (`kosmo_bridge/main.py:1253`, dort der volle Flagname; `--fake` funktioniert
  nur über `argparse`s `allow_abbrev`-Präfixmatching): im Container/als Demo
  läuft dieses Werkzeug NUR mit explizit gesetztem `--fake-worker` — ohne das
  Flag verweigert es den Lauf komplett, statt irgendeinen GPU-Schritt
  vorzutäuschen. JEDE erfolgreiche Ausgabe trägt darum unmissverständlich das
  Wort FAKE.

**Was NICHT in diese Datei gehört (Ehrlichkeit statt Vortäuschung):**
- kein echter Unsloth-Import/-Aufruf (die Bibliothek ist auf der HomeStation
  installiert, nicht im Container),
- kein echtes GPU-Scheduling — das übernimmt ein künftiger echter Worker,
  analog zum Fake-Worker-Muster in `main.py` (`_fake_worker_step` etc.).

Aufruf:
    python3 tools/homestation-bridge/kosmo_bridge/lora_empfaenger.py \\
        <pfad-zum-entpackten-paket> --fake-worker

Exit-Code 0 = Manifest gültig, Hashes stimmen, Skript-Template erzeugt.
Exit-Code 1 = Paket ehrlich abgelehnt (Manifest-Fehler oder sha256-Bruch).
Exit-Code 2 = Aufruf-Fehler (fehlendes `--fake-worker`, kein Verzeichnis, …).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

try:  # als Paket (python3 -m kosmo_bridge.lora_empfaenger) UND als Skript
    from kosmo_bridge.sicherheits_log import protokolliere_sicherheitsereignis
except ModuleNotFoundError:  # Skript-Modus: das eigene Verzeichnis liegt auf sys.path
    from sicherheits_log import protokolliere_sicherheitsereignis


# ---------------------------------------------------------------------------
# Schema-Spiegel von packages/kosmo-contracts/src/lora-train.ts — bei einer
# Schema-Änderung dort MUSS dieser Block hier nachgezogen werden (kein
# gemeinsamer Codepfad zwischen Python und TypeScript, darum Duplikation
# bewusst statt eines geteilten Generators — dieselbe Wahl wie
# `kosmo_bridge/lizenz.py`, das ebenfalls den TS-Contract von Hand spiegelt).
# ---------------------------------------------------------------------------

SCHEMA = "kosmo.lora-train/v1"

ADAPTER_IDS: tuple[str, ...] = (
    "kosmo-buero",
    "kosmo-zeichner-grundriss",
    "kosmo-zeichner-commands",
    "kosmo-buero-dpo",
    "whisper-ch",
    "kosmo-werkplan",
)

DATEI_FORMATE: tuple[str, ...] = ("kosmo-sft/v1", "kosmo-dpo/v1", "kosmo-signal/v1")
VISIBILITIES: tuple[str, ...] = ("public", "private")

_SHA256_MUSTER = re.compile(r"^[0-9a-f]{64}$")
# Identisch zu REZEPT_MUSTER in lora-train.ts.
_REZEPT_MUSTER = re.compile(r"^docs/(KOSMOTRAIN|LORA-KONZEPT)\.md §\S")


@dataclass
class ManifestPruefung:
    """Ergebnis der reinen Schema-Prüfung — Spiegel von `LoraTrainManifest.parse()`
    inkl. des `superRefine`-Guards, aber als gesammelte Fehlerliste statt eines
    einzelnen geworfenen Fehlers (leichter testbar, ehrlicher gegenüber dem
    Aufrufer: alle Mängel auf einmal, nicht nur der erste)."""

    gueltig: bool
    fehler: list[str] = field(default_factory=list)


def validiere_manifest(manifest: object) -> ManifestPruefung:
    """Prüft Schema-Version, Adapter-Enum, Datei-Einträge, Rezept-Muster und
    den `visibility`-Deckel-Guard — GENAU die Regeln aus `LoraTrainManifest`
    (`packages/kosmo-contracts/src/lora-train.ts`), hier ohne zod
    nachgebildet."""
    fehler: list[str] = []
    if not isinstance(manifest, dict):
        return ManifestPruefung(False, ["Manifest ist kein JSON-Objekt"])

    schema = manifest.get("schema", SCHEMA)
    if schema != SCHEMA:
        fehler.append(f"unbekannte Schema-Version: {schema!r} (erwartet {SCHEMA!r})")

    adapter = manifest.get("adapter")
    if adapter not in ADAPTER_IDS:
        fehler.append(f"unbekannter Adapter: {adapter!r} (erlaubt: {', '.join(ADAPTER_IDS)})")

    erzeugt_um = manifest.get("erzeugt_um")
    if not isinstance(erzeugt_um, str) or not erzeugt_um.strip():
        fehler.append("erzeugt_um fehlt oder ist leer")

    dateien = manifest.get("dateien")
    if not isinstance(dateien, list) or len(dateien) == 0:
        fehler.append("dateien fehlt oder ist leer (mindestens 1 Datei nötig)")
        dateien = []

    enthaelt_private = False
    for i, d in enumerate(dateien):
        praefix = f"dateien[{i}]"
        if not isinstance(d, dict):
            fehler.append(f"{praefix}: kein Objekt")
            continue
        if not isinstance(d.get("pfad"), str) or not d["pfad"].strip():
            fehler.append(f"{praefix}.pfad fehlt oder ist leer")
        sha = d.get("sha256")
        if not isinstance(sha, str) or not _SHA256_MUSTER.match(sha):
            fehler.append(f"{praefix}.sha256 muss 64 Hex-Zeichen (kleingeschrieben) sein, war: {sha!r}")
        if d.get("format") not in DATEI_FORMATE:
            fehler.append(f"{praefix}.format unbekannt: {d.get('format')!r} (erlaubt: {', '.join(DATEI_FORMATE)})")
        visibility_d = d.get("visibility")
        if visibility_d not in VISIBILITIES:
            fehler.append(f"{praefix}.visibility unbekannt: {visibility_d!r} (erlaubt: {', '.join(VISIBILITIES)})")
        elif visibility_d == "private":
            enthaelt_private = True
        if "anzahlZeilen" in d and d["anzahlZeilen"] is not None:
            anzahl = d["anzahlZeilen"]
            if not isinstance(anzahl, int) or isinstance(anzahl, bool) or anzahl < 0:
                fehler.append(f"{praefix}.anzahlZeilen muss eine nichtnegative Ganzzahl sein")

    rezept = manifest.get("rezept")
    if not isinstance(rezept, str) or not _REZEPT_MUSTER.match(rezept):
        fehler.append("rezept muss auf docs/KOSMOTRAIN.md oder docs/LORA-KONZEPT.md mit § verweisen")

    visibility = manifest.get("visibility")
    if visibility not in VISIBILITIES:
        fehler.append(f"visibility unbekannt: {visibility!r} (erlaubt: {', '.join(VISIBILITIES)})")
    elif enthaelt_private and visibility != "private":
        # Owner-Entscheid 1 (lora-train.ts superRefine): nur public verlässt je das Repo.
        fehler.append(
            "visibility-Deckel muss 'private' sein, sobald eine Datei privat ist "
            "(Owner-Entscheid 1 — nur public verlässt je das Repo)."
        )

    eval_suite = manifest.get("evalSuite")
    if eval_suite is not None and not isinstance(eval_suite, str):
        fehler.append("evalSuite muss Text sein, wenn gesetzt")

    hinweis = manifest.get("hinweis")
    if hinweis is not None and not isinstance(hinweis, str):
        fehler.append("hinweis muss Text sein, wenn gesetzt")

    return ManifestPruefung(len(fehler) == 0, fehler)


# ---------------------------------------------------------------------------
# Datei-Auffinden + sha256-Prüfung
# ---------------------------------------------------------------------------


class ManifestNichtGefunden(FileNotFoundError):
    """Kein lesbares/gültiges Manifest im Paketordner gefunden."""


def finde_manifest(paket_pfad: Path, override: Path | None) -> Path:
    """Sucht das Manifest im Paketordner. KosmoTrain lädt das Manifest im
    Browser als `<adapter>-manifest.json` herunter (`TrainWorkspace.tsx`,
    `ladeManifestUndJsonl`); ein manuell zusammengestelltes Testpaket darf
    auch schlicht `manifest.json` heissen. Bei Mehrdeutigkeit verlangt das
    Werkzeug `--manifest` statt zu raten."""
    if override is not None:
        if not override.exists():
            raise ManifestNichtGefunden(f"--manifest zeigt auf eine nicht existierende Datei: {override}")
        return override

    direkt = paket_pfad / "manifest.json"
    if direkt.exists():
        return direkt

    kandidaten = sorted(paket_pfad.glob("*-manifest.json"))
    if len(kandidaten) == 1:
        return kandidaten[0]
    if len(kandidaten) > 1:
        namen = ", ".join(k.name for k in kandidaten)
        raise ManifestNichtGefunden(f"mehrere *-manifest.json im Paket gefunden ({namen}) — --manifest angeben")
    raise ManifestNichtGefunden(f"kein manifest.json und keine *-manifest.json in {paket_pfad}")


def lade_manifest(manifest_pfad: Path) -> dict:
    try:
        rohtext = manifest_pfad.read_text(encoding="utf-8")
    except OSError as e:
        raise ManifestNichtGefunden(f"Manifest nicht lesbar: {manifest_pfad} ({e})") from e
    try:
        geladen = json.loads(rohtext)
    except json.JSONDecodeError as e:
        raise ManifestNichtGefunden(f"Manifest ist kein gültiges JSON: {manifest_pfad} ({e})") from e
    return geladen


def sha256_datei(pfad: Path) -> str:
    """sha256 über die rohen Bytes der Datei — identisch zu `sha256Hex()`
    (`packages/kosmo-ai/src/lora-training.ts`, Web Crypto über
    `TextEncoder().encode(text)`), solange die Datei unverändert (kein
    Zeilenenden-/Encoding-Umbau) vom Browser-Download bis hierher transportiert
    wurde — darum bewusst Binärlesen (`read_bytes`), kein Textmodus."""
    return hashlib.sha256(pfad.read_bytes()).hexdigest()


@dataclass
class DateiPruefung:
    pfad: str
    ok: bool
    erwartet: str
    tatsaechlich: str | None
    grund: str | None = None


def pruefe_dateien(paket_pfad: Path, manifest: dict) -> list[DateiPruefung]:
    """Prüft jede in `dateien[]` gelistete Datei: existiert sie im Paket
    (innerhalb des Paketordners — kein `..`-Ausbruch, dieselbe Vorsicht wie
    `main.py#_safe_store_path`, hier unabhängig nachgebaut) und stimmt ihr
    tatsächlicher sha256-Hash mit dem Manifest-Wert überein."""
    paket_root = paket_pfad.resolve()
    ergebnisse: list[DateiPruefung] = []
    for d in manifest.get("dateien", []):
        if not isinstance(d, dict):
            continue
        rel = str(d.get("pfad", ""))
        erwartet = str(d.get("sha256", ""))
        if not rel:
            ergebnisse.append(DateiPruefung(rel, False, erwartet, None, "kein Pfad im Manifest-Eintrag"))
            continue
        ziel = (paket_pfad / rel).resolve()
        try:
            ziel.relative_to(paket_root)
        except ValueError:
            ergebnisse.append(DateiPruefung(rel, False, erwartet, None, "Pfad verlässt das Paketverzeichnis"))
            continue
        if not ziel.is_file():
            ergebnisse.append(DateiPruefung(rel, False, erwartet, None, "Datei fehlt im Paket"))
            continue
        tatsaechlich = sha256_datei(ziel)
        ok = tatsaechlich == erwartet
        ergebnisse.append(DateiPruefung(rel, ok, erwartet, tatsaechlich, None if ok else "sha256 stimmt nicht überein"))
    return ergebnisse


# ---------------------------------------------------------------------------
# Unsloth-Laufskript-TEMPLATE — Platzhalter, kein ausführbares Trainingsskript
# ---------------------------------------------------------------------------


def _dateien_kommentarblock(manifest: dict) -> str:
    zeilen = []
    for d in manifest.get("dateien", []):
        if not isinstance(d, dict):
            continue
        kurzhash = str(d.get("sha256", ""))[:12]
        zeilen.append(f"#   - {d.get('pfad')}  ({d.get('format')}, {d.get('visibility')}, sha256 {kurzhash}…)")
    return "\n".join(zeilen) if zeilen else "#   (keine Dateien)"


def baue_unsloth_skript(manifest: dict, manifest_pfad: Path, paket_pfad: Path) -> str:
    """Baut das Unsloth-Laufskript-TEMPLATE (V083-SPEZ §9.1). Jeder GPU-/Pfad-
    Platzhalter ist als `{{...}}` markiert und im Kommentarkopf als Platzhalter
    benannt — nichts davon ist ein echter Wert. Das Grundrezept (Modell laden,
    QLoRA-Adapter, SFTTrainer, GGUF-Export) folgt `docs/KOSMOTRAIN.md` §3
    wörtlich; dieses Skript füllt nur die Datensatz-Dateien aus dem geprüften
    Manifest ein."""
    adapter = str(manifest.get("adapter", "unbekannt"))
    dateien_relativ = [str(d.get("pfad", "")) for d in manifest.get("dateien", []) if isinstance(d, dict)]
    dateien_python_literal = json.dumps(dateien_relativ, ensure_ascii=False)

    whisper_hinweis = ""
    if adapter == "whisper-ch":
        whisper_hinweis = (
            "\n# ACHTUNG: adapter == 'whisper-ch' ist ein ASR-Feintuning (faster-whisper/ct2),\n"
            "# KEIN Unsloth-LLM-SFT — dieses Template zeigt nur die geprüfte Manifest-\n"
            "# Nahtstelle. Das eigentliche Whisper-Feintuning-Rezept ist NICHT Teil dieses\n"
            "# Skripts (ehrliche Grenze, kein vorgetäuschtes Rezept für ein anderes Verfahren).\n"
        )

    return f"""#!/usr/bin/env bash
# =============================================================================
# UNSLOTH-LAUFSKRIPT-TEMPLATE — NUR EIN PLATZHALTER, KEIN AUSFÜHRBARES SKRIPT
# =============================================================================
# Erzeugt von lora_empfaenger.py (v0.8.3 / E9) aus einem geprüften
# kosmo.lora-train/v1-Manifest — Schema/Adapter/sha256 sind bereits gegen das
# Manifest verifiziert (sonst würde dieses Skript gar nicht erst entstehen).
#
# Dieses Skript läuft NIE im Container — der echte GPU-Lauf ist erklärte
# HomeStation-Grenze (RTX 5090, docs/HOMESTATION-AUFTRAG.md §2 «Trainer-
# Contract»). Vor einem echten Lauf JEDEN {{{{...}}}}-Platzhalter von Hand
# ersetzen und {manifest.get('rezept')} lesen.
#
# Adapter:      {adapter}
# Rezept:       {manifest.get('rezept')}
# Eval-Suite:   {manifest.get('evalSuite') or '(keine angegeben)'}
# Visibility:   {manifest.get('visibility')}
# Erzeugt um:   {manifest.get('erzeugt_um')}
# Manifest:     {manifest_pfad.name}
# Paket:        {paket_pfad}
#
# Datensatz-Dateien (aus dem Manifest, sha256 bereits gegen die Datei geprüft):
{_dateien_kommentarblock(manifest)}
{whisper_hinweis}
# -----------------------------------------------------------------------------
set -euo pipefail

GPU_HOST="{{{{GPU_HOST}}}}"              # z.B. ssh-Alias der HomeStation (RTX 5090) — HIER kein echter Wert
BASIS_MODELL="{{{{BASIS_MODELL}}}}"      # z.B. Qwen/Qwen3-Coder-30B-A3B-Instruct für kosmo-buero (docs/KOSMOTRAIN.md §3)
AUSGABE_ADAPTER="{{{{AUSGABE_ADAPTER_PFAD}}}}"   # Zielordner für den LoRA-Adapter auf der HomeStation

echo "Dies ist ein TEMPLATE — {{{{Platzhalter}}}} zuerst von Hand ersetzen,"
echo "danach auf der echten HomeStation ausführen. 'pip install unsloth' vorausgesetzt."
exit 1

# --- Ab hier das eigentliche Unsloth-Rezept (Platzhalter, docs/KOSMOTRAIN.md §3) ---
python3 - <<'PYEOF'
from unsloth import FastLanguageModel
import json

model, tokenizer = FastLanguageModel.from_pretrained(
    "{{{{BASIS_MODELL}}}}", load_in_4bit=True, max_seq_length=4096,
)
model = FastLanguageModel.get_peft_model(
    model, r=16, lora_alpha=32,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
)

# Datensatz-Dateien dieses Manifests (Pfade relativ zum Paket-Root, sha256 bereits geprüft):
dateien = {dateien_python_literal}
rows = [json.loads(zeile) for pfad in dateien for zeile in open(pfad, encoding="utf-8") if zeile.strip()]

# … SFTTrainer nach dem Standardrezept, 1-3 Epochen, lr 2e-4 (docs/KOSMOTRAIN.md §3)
# model.save_pretrained_gguf("{{{{AUSGABE_ADAPTER_PFAD}}}}", tokenizer, quantization_method="q4_k_m")
PYEOF
"""


# ---------------------------------------------------------------------------
# Gesamt-Pipeline
# ---------------------------------------------------------------------------


@dataclass
class Ergebnis:
    ok: bool
    manifest_fehler: list[str]
    datei_fehler: list[str]
    skript_pfad: Path | None


def verarbeite_paket(paket_pfad: Path, manifest_override: Path | None = None) -> Ergebnis:
    """Die reine Verarbeitungs-Pipeline — unabhängig vom `--fake-worker`-CLI-
    Gate testbar (die vier Selbsttest-Fälle rufen genau diese Funktion auf):
    Manifest finden/laden → Schema/Adapter/Rezept/visibility-Guard prüfen →
    je Datei sha256 gegen den tatsächlichen Inhalt prüfen → bei vollem Erfolg
    das Unsloth-Skript-Template schreiben."""
    try:
        manifest_pfad = finde_manifest(paket_pfad, manifest_override)
        manifest = lade_manifest(manifest_pfad)
    except ManifestNichtGefunden as e:
        return Ergebnis(False, [str(e)], [], None)

    pruefung = validiere_manifest(manifest)
    if not pruefung.gueltig:
        return Ergebnis(False, pruefung.fehler, [], None)

    datei_pruefungen = pruefe_dateien(paket_pfad, manifest)
    datei_fehler = [
        f"{p.pfad}: {p.grund} (Manifest: {p.erwartet}, tatsächlich: {p.tatsaechlich or '—'})"
        for p in datei_pruefungen
        if not p.ok
    ]
    if datei_fehler:
        for f in datei_fehler:
            protokolliere_sicherheitsereignis("lora_manifest_hash_bruch", f"lora_empfaenger:{paket_pfad.name}", f)
        return Ergebnis(False, [], datei_fehler, None)

    skript = baue_unsloth_skript(manifest, manifest_pfad, paket_pfad)
    skript_pfad = paket_pfad / f"unsloth-lauf-{manifest.get('adapter', 'unbekannt')}.sh"
    skript_pfad.write_text(skript, encoding="utf-8")
    return Ergebnis(True, [], [], skript_pfad)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def cli(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        prog="lora_empfaenger.py",
        description=(
            "Nimmt ein entpacktes kosmo.lora-train/v1-Trainingspaket entgegen, prüft "
            "Schema-Version/Adapter/sha256 je Datei und bereitet ein Unsloth-Laufskript-"
            "Template vor. Der echte GPU-/Unsloth-Lauf bleibt HomeStation-Grenze "
            "(docs/HOMESTATION-AUFTRAG.md §2)."
        ),
    )
    ap.add_argument("paket", type=Path, help="Pfad zum entpackten Trainingspaket (Ordner mit Manifest + Datensatz-Dateien)")
    ap.add_argument(
        "--manifest",
        type=Path,
        default=None,
        help="Manifest-Datei explizit angeben (sonst wird manifest.json bzw. genau eine *-manifest.json gesucht)",
    )
    ap.add_argument(
        "--fake-worker",
        action="store_true",
        help=(
            "Pflicht im Container/als Demo (kein echter GPU-Host hier): führt NUR Manifest-"
            "Validierung + sha256-Prüfung + Skript-Template-Erzeugung aus, NIE einen echten "
            "Unsloth-Lauf. Ohne dieses Flag verweigert das Werkzeug den Lauf komplett — "
            "dieselbe Ehrlichkeitskonvention wie main.py --fake-worker (kosmo_bridge/main.py:1253)."
        ),
    )
    args = ap.parse_args(argv)

    if not args.fake_worker:
        print(
            "FEHLER: --fake-worker fehlt. Dieses Werkzeug macht NIE einen echten GPU-/"
            "Unsloth-Lauf (das bleibt HomeStation-Grenze, docs/HOMESTATION-AUFTRAG.md §2) — "
            "im Container/als Demo läuft es NUR mit explizit gesetztem --fake-worker, damit "
            "jede Ausgabe unmissverständlich als FAKE gekennzeichnet ist.",
            file=sys.stderr,
        )
        return 2

    paket_pfad: Path = args.paket
    if not paket_pfad.is_dir():
        print(f"FEHLER: Paketpfad ist kein Verzeichnis: {paket_pfad}", file=sys.stderr)
        return 2

    ergebnis = verarbeite_paket(paket_pfad, manifest_override=args.manifest)

    for fehler in ergebnis.manifest_fehler:
        print(f"[MANIFEST-FEHLER] {fehler}", file=sys.stderr)
    for fehler in ergebnis.datei_fehler:
        print(f"[SHA256-BRUCH] {fehler}", file=sys.stderr)

    if not ergebnis.ok:
        print("FAKE — Ergebnis: kein Skript-Template erzeugt (Paket abgelehnt, siehe Fehler oben).")
        return 1

    print(f"FAKE — Manifest gültig, alle sha256-Hashes stimmen. Skript-Template geschrieben: {ergebnis.skript_pfad}")
    print("FAKE — kein echter Unsloth-/GPU-Lauf. Echter Lauf ist HomeStation-Sache (docs/HOMESTATION-AUFTRAG.md §2).")
    return 0


if __name__ == "__main__":
    raise SystemExit(cli())
