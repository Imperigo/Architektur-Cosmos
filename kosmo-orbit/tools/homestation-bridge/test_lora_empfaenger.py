"""Leichte Prüfung für den LoRA-Trainingspaket-Empfänger (v0.8.3 / E9,
`docs/V083-SPEZ.md` §9, Matrix-Zeile C-22) — kein pytest nötig, gleicher Stil
wie `test_bridge_haerte.py` (kein Test-Framework, nur `check(name, cond)` +
Exit-Code).

Deckt die vier im Auftrag verlangten Fälle ab, jeweils gegen die reine
`verarbeite_paket()`-Pipeline (unabhängig vom `--fake-worker`-CLI-Gate):
  (a) gültiges Manifest + passende Hashes → Skript-Template erzeugt.
  (b) sha256-Bruch (Datei geändert, Manifest-Hash veraltet) → harter Fehler,
      kein Skript-Template.
  (c) falsche Schema-Version → harter Fehler.
  (d) unbekannter Adapter → harter Fehler.
Dazu Zusatzprüfungen: `visibility`-Deckel-Guard, `--fake-worker`-CLI-Gate
(Verweigerung ohne Flag / FAKE-Kennzeichnung mit Flag), Manifest-Auffinden
(`manifest.json` vs. `<adapter>-manifest.json`), Pfad-Ausbruch-Abwehr.

Aufruf:
    python3 tools/homestation-bridge/test_lora_empfaenger.py

Exit-Code 0 = alle Prüfungen grün. Exit-Code != 0 (mit Liste der
fehlgeschlagenen Prüfungen) sonst.
"""

from __future__ import annotations

import hashlib
import io
import json
import shutil
import sys
import tempfile
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from kosmo_bridge import lora_empfaenger as le  # noqa: E402

failures: list[str] = []


def check(name: str, cond: bool) -> None:
    status = "OK" if cond else "FEHLER"
    print(f"[{status}] {name}")
    if not cond:
        failures.append(name)


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def neues_paket() -> Path:
    return Path(tempfile.mkdtemp(prefix="kosmo-lora-empfaenger-test-"))


def schnuere_mini_paket(ordner: Path, adapter: str = "kosmo-buero") -> dict:
    """Baut ein winziges, aber gültiges kosmo.lora-train/v1-Paket: zwei
    kleine JSONL-Dateien + ein Manifest mit korrekten sha256-Hashes — genau
    das im Auftrag verlangte «selbst geschnürte Mini-Manifest (2 kleine
    JSONL + korrekte Hashes)»."""
    datei_a = "kosmo-buero-sft.jsonl"
    inhalt_a = '{"prompt": "Wie hoch darf ein Geländer sein?", "antwort": "Mind. 1.00 m (SIA 358)."}\n'
    datei_b = "kosmo-buero-sft-2.jsonl"
    inhalt_b = '{"prompt": "Was ist ein Vorprojekt?", "antwort": "SIA-Phase 31."}\n'

    (ordner / datei_a).write_text(inhalt_a, encoding="utf-8")
    (ordner / datei_b).write_text(inhalt_b, encoding="utf-8")

    manifest = {
        "schema": "kosmo.lora-train/v1",
        "adapter": adapter,
        "erzeugt_um": "2026-07-17T12:00:00.000Z",
        "dateien": [
            {
                "pfad": datei_a,
                "sha256": sha256(inhalt_a),
                "format": "kosmo-sft/v1",
                "visibility": "public",
                "anzahlZeilen": 1,
            },
            {
                "pfad": datei_b,
                "sha256": sha256(inhalt_b),
                "format": "kosmo-sft/v1",
                "visibility": "public",
                "anzahlZeilen": 1,
            },
        ],
        "rezept": "docs/KOSMOTRAIN.md §3",
        "evalSuite": "wissen/training/eval/kosmo-buero/",
        "visibility": "public",
        "hinweis": "Mini-Testpaket für lora_empfaenger.py.",
    }
    (ordner / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    return manifest


# ---------------------------------------------------------------------------
# (a) gültiges Manifest + passende Hashes → Skript-Template erzeugt
# ---------------------------------------------------------------------------
paket_gueltig = neues_paket()
manifest_gueltig = schnuere_mini_paket(paket_gueltig)
ergebnis_gueltig = le.verarbeite_paket(paket_gueltig)

check("(a) gültiges Paket: ok == True", ergebnis_gueltig.ok is True)
check("(a) gültiges Paket: keine Manifest-Fehler", ergebnis_gueltig.manifest_fehler == [])
check("(a) gültiges Paket: keine Datei-Fehler", ergebnis_gueltig.datei_fehler == [])
check("(a) gültiges Paket: Skript-Template-Pfad gesetzt", ergebnis_gueltig.skript_pfad is not None)
if ergebnis_gueltig.skript_pfad is not None:
    check("(a) Skript-Template-Datei existiert auf Platte", ergebnis_gueltig.skript_pfad.exists())
    skript_inhalt = ergebnis_gueltig.skript_pfad.read_text(encoding="utf-8")
    check("(a) Skript-Template nennt sich selbst TEMPLATE (kein ausführbares Skript)", "TEMPLATE" in skript_inhalt)
    check("(a) Skript-Template trägt {{GPU_HOST}}-Platzhalter (kein echter Wert)", "{{GPU_HOST}}" in skript_inhalt)
    check("(a) Skript-Template referenziert das Rezept aus dem Manifest", "docs/KOSMOTRAIN.md §3" in skript_inhalt)
    check("(a) Skript-Template listet beide Datensatz-Dateien", "kosmo-buero-sft.jsonl" in skript_inhalt and "kosmo-buero-sft-2.jsonl" in skript_inhalt)
    check("(a) Skript-Template nennt die HomeStation-Grenze", "HomeStation" in skript_inhalt)


# ---------------------------------------------------------------------------
# (b) sha256-Bruch: Datei nach dem Schnüren geändert, Manifest-Hash veraltet
# ---------------------------------------------------------------------------
paket_shabruch = neues_paket()
schnuere_mini_paket(paket_shabruch)
# Datei nachträglich manipulieren — der Manifest-Hash bleibt der alte.
(paket_shabruch / "kosmo-buero-sft.jsonl").write_text(
    '{"prompt": "Wie hoch darf ein Geländer sein?", "antwort": "MANIPULIERT — 0.10 m"}\n', encoding="utf-8"
)
ergebnis_shabruch = le.verarbeite_paket(paket_shabruch)

check("(b) sha256-Bruch: ok == False", ergebnis_shabruch.ok is False)
check("(b) sha256-Bruch: kein Skript-Template-Pfad", ergebnis_shabruch.skript_pfad is None)
check("(b) sha256-Bruch: keine .sh-Datei im Paket geschrieben", not any(paket_shabruch.glob("*.sh")))
check("(b) sha256-Bruch: mindestens ein Datei-Fehler gemeldet", len(ergebnis_shabruch.datei_fehler) >= 1)
check(
    "(b) sha256-Bruch: Fehlermeldung nennt die betroffene Datei + 'sha256'",
    any("kosmo-buero-sft.jsonl" in f and "sha256" in f for f in ergebnis_shabruch.datei_fehler),
)

# Sicherheits-Log: ein sha256-Bruch schreibt eine strukturierte Zeile auf stderr.
paket_shabruch_log = neues_paket()
schnuere_mini_paket(paket_shabruch_log)
(paket_shabruch_log / "kosmo-buero-sft.jsonl").write_text("manipuliert\n", encoding="utf-8")
log_puffer = io.StringIO()
with redirect_stderr(log_puffer):
    le.verarbeite_paket(paket_shabruch_log)
log_zeilen = [z for z in log_puffer.getvalue().splitlines() if z.strip()]
log_ereignisse = [json.loads(z).get("ereignis") for z in log_zeilen if z.strip().startswith("{")]
check(
    "(b) sha256-Bruch schreibt 'lora_manifest_hash_bruch' ins Sicherheits-Log",
    "lora_manifest_hash_bruch" in log_ereignisse,
)


# ---------------------------------------------------------------------------
# (c) falsche Schema-Version → harter Fehler
# ---------------------------------------------------------------------------
paket_schema = neues_paket()
manifest_schema = schnuere_mini_paket(paket_schema)
manifest_schema["schema"] = "kosmo.lora-train/v2"
(paket_schema / "manifest.json").write_text(json.dumps(manifest_schema, indent=2, ensure_ascii=False), encoding="utf-8")
ergebnis_schema = le.verarbeite_paket(paket_schema)

check("(c) falsche Schema-Version: ok == False", ergebnis_schema.ok is False)
check("(c) falsche Schema-Version: kein Skript-Template", ergebnis_schema.skript_pfad is None)
check(
    "(c) falsche Schema-Version: Manifest-Fehler nennt die unbekannte Version",
    any("kosmo.lora-train/v2" in f for f in ergebnis_schema.manifest_fehler),
)
check(
    "(c) falsche Schema-Version: verarbeitet nicht bis zur Datei-Prüfung (keine Datei-Fehler)",
    ergebnis_schema.datei_fehler == [],
)


# ---------------------------------------------------------------------------
# (d) unbekannter Adapter → harter Fehler
# ---------------------------------------------------------------------------
paket_adapter = neues_paket()
manifest_adapter = schnuere_mini_paket(paket_adapter)
manifest_adapter["adapter"] = "kosmo-unbekannt"
(paket_adapter / "manifest.json").write_text(json.dumps(manifest_adapter, indent=2, ensure_ascii=False), encoding="utf-8")
ergebnis_adapter = le.verarbeite_paket(paket_adapter)

check("(d) unbekannter Adapter: ok == False", ergebnis_adapter.ok is False)
check("(d) unbekannter Adapter: kein Skript-Template", ergebnis_adapter.skript_pfad is None)
check(
    "(d) unbekannter Adapter: Manifest-Fehler nennt 'kosmo-unbekannt'",
    any("kosmo-unbekannt" in f for f in ergebnis_adapter.manifest_fehler),
)


# ---------------------------------------------------------------------------
# Zusatz: validiere_manifest() direkt — reine Funktion, alle sechs erlaubten
# Adapter werden akzeptiert (Gegenprobe zu Fall d).
# ---------------------------------------------------------------------------
for adapter_id in le.ADAPTER_IDS:
    basis = {
        "schema": "kosmo.lora-train/v1",
        "adapter": adapter_id,
        "erzeugt_um": "2026-07-17T12:00:00.000Z",
        "dateien": [
            {"pfad": "x.jsonl", "sha256": "a" * 64, "format": "kosmo-sft/v1", "visibility": "public"},
        ],
        "rezept": "docs/KOSMOTRAIN.md §3",
        "visibility": "public",
    }
    pruefung = le.validiere_manifest(basis)
    check(f"validiere_manifest akzeptiert Adapter '{adapter_id}'", pruefung.gueltig is True)

check(
    "validiere_manifest lehnt einen siebten, erfundenen Adapter ab",
    le.validiere_manifest({**basis, "adapter": "kosmo-erfunden"}).gueltig is False,
)


# ---------------------------------------------------------------------------
# Zusatz: visibility-Deckel-Guard (Owner-Entscheid 1 / superRefine-Spiegel) —
# sobald eine Datei privat ist, MUSS die Paket-visibility ebenfalls 'private' sein.
# ---------------------------------------------------------------------------
manifest_privat_ohne_deckel = {
    "schema": "kosmo.lora-train/v1",
    "adapter": "kosmo-buero",
    "erzeugt_um": "2026-07-17T12:00:00.000Z",
    "dateien": [
        {"pfad": "x.jsonl", "sha256": "a" * 64, "format": "kosmo-sft/v1", "visibility": "private"},
    ],
    "rezept": "docs/KOSMOTRAIN.md §3",
    "visibility": "public",  # falsch — muss 'private' sein, sobald eine Datei privat ist
}
pruefung_deckel = le.validiere_manifest(manifest_privat_ohne_deckel)
check("visibility-Deckel-Guard: private Datei + visibility public wird abgelehnt", pruefung_deckel.gueltig is False)
check(
    "visibility-Deckel-Guard: Fehlermeldung nennt Owner-Entscheid 1",
    any("Owner-Entscheid 1" in f for f in pruefung_deckel.fehler),
)
manifest_privat_mit_deckel = {**manifest_privat_ohne_deckel, "visibility": "private"}
check(
    "visibility-Deckel-Guard: private Datei + visibility private wird akzeptiert",
    le.validiere_manifest(manifest_privat_mit_deckel).gueltig is True,
)


# ---------------------------------------------------------------------------
# Zusatz: rezept-Muster — muss auf docs/KOSMOTRAIN.md oder docs/LORA-KONZEPT.md
# mit § zeigen (identisch zu REZEPT_MUSTER in lora-train.ts).
# ---------------------------------------------------------------------------
manifest_falsches_rezept = {**manifest_privat_mit_deckel, "visibility": "private", "rezept": "irgendwas ohne Paragraph"}
check("rezept-Muster: freier Text ohne § wird abgelehnt", le.validiere_manifest(manifest_falsches_rezept).gueltig is False)
manifest_lora_konzept = {**manifest_privat_mit_deckel, "rezept": "docs/LORA-KONZEPT.md §1.3"}
check("rezept-Muster: docs/LORA-KONZEPT.md §… wird akzeptiert", le.validiere_manifest(manifest_lora_konzept).gueltig is True)


# ---------------------------------------------------------------------------
# Zusatz: Manifest-Auffinden — manifest.json vs. <adapter>-manifest.json vs.
# Mehrdeutigkeit (KosmoTrain lädt real als '<adapter>-manifest.json' herunter,
# TrainWorkspace.tsx#ladeManifestUndJsonl).
# ---------------------------------------------------------------------------
paket_benannt = neues_paket()
manifest_benannt = schnuere_mini_paket(paket_benannt)
(paket_benannt / "manifest.json").unlink()
(paket_benannt / "kosmo-buero-manifest.json").write_text(
    json.dumps(manifest_benannt, indent=2, ensure_ascii=False), encoding="utf-8"
)
ergebnis_benannt = le.verarbeite_paket(paket_benannt)
check("Manifest-Auffinden: '<adapter>-manifest.json' wird gefunden, wenn 'manifest.json' fehlt", ergebnis_benannt.ok is True)

paket_mehrdeutig = neues_paket()
manifest_mehrdeutig = schnuere_mini_paket(paket_mehrdeutig)
(paket_mehrdeutig / "manifest.json").unlink()
(paket_mehrdeutig / "kosmo-buero-manifest.json").write_text(
    json.dumps(manifest_mehrdeutig, indent=2, ensure_ascii=False), encoding="utf-8"
)
(paket_mehrdeutig / "kosmo-werkplan-manifest.json").write_text(
    json.dumps({**manifest_mehrdeutig, "adapter": "kosmo-werkplan"}, indent=2, ensure_ascii=False), encoding="utf-8"
)
ergebnis_mehrdeutig = le.verarbeite_paket(paket_mehrdeutig)
check(
    "Manifest-Auffinden: bei mehreren *-manifest.json wird ehrlich abgelehnt (keine Ratelogik)",
    ergebnis_mehrdeutig.ok is False and any("mehrere" in f for f in ergebnis_mehrdeutig.manifest_fehler),
)


# ---------------------------------------------------------------------------
# Zusatz: Pfad-Ausbruch in dateien[].pfad wird abgewiesen.
# ---------------------------------------------------------------------------
paket_ausbruch = neues_paket()
manifest_ausbruch = schnuere_mini_paket(paket_ausbruch)
geheim = paket_ausbruch.parent / "geheim-ausserhalb.txt"
geheim.write_text("nicht Teil des Pakets", encoding="utf-8")
manifest_ausbruch["dateien"].append(
    {"pfad": "../geheim-ausserhalb.txt", "sha256": sha256("nicht Teil des Pakets"), "format": "kosmo-sft/v1", "visibility": "public"}
)
(paket_ausbruch / "manifest.json").write_text(json.dumps(manifest_ausbruch, indent=2, ensure_ascii=False), encoding="utf-8")
ergebnis_ausbruch = le.verarbeite_paket(paket_ausbruch)
check("Pfad-Ausbruch ('../…') wird abgewiesen, kein Skript-Template", ergebnis_ausbruch.ok is False)
check(
    "Pfad-Ausbruch: Fehlermeldung nennt den Grund",
    any("verlässt das Paketverzeichnis" in f for f in ergebnis_ausbruch.datei_fehler),
)
geheim.unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# Zusatz: --fake-worker-CLI-Gate — ohne Flag wird der Lauf komplett verweigert
# (Exit-Code 2, kein Skript-Template), mit Flag läuft er durch und jede
# Erfolgsmeldung trägt das Wort FAKE.
# ---------------------------------------------------------------------------
paket_cli = neues_paket()
schnuere_mini_paket(paket_cli)

stdout_ohne_flag, stderr_ohne_flag = io.StringIO(), io.StringIO()
with redirect_stdout(stdout_ohne_flag), redirect_stderr(stderr_ohne_flag):
    exit_ohne_flag = le.cli([str(paket_cli)])
check("CLI ohne --fake-worker: Exit-Code 2 (verweigert)", exit_ohne_flag == 2)
check("CLI ohne --fake-worker: keine .sh-Datei geschrieben", not any(paket_cli.glob("*.sh")))
check("CLI ohne --fake-worker: Fehlermeldung nennt --fake-worker", "--fake-worker" in stderr_ohne_flag.getvalue())

stdout_mit_flag = io.StringIO()
with redirect_stdout(stdout_mit_flag):
    exit_mit_flag = le.cli([str(paket_cli), "--fake-worker"])
ausgabe_mit_flag = stdout_mit_flag.getvalue()
check("CLI mit --fake-worker (gültiges Paket): Exit-Code 0", exit_mit_flag == 0)
check("CLI mit --fake-worker: Ausgabe enthält 'FAKE'", "FAKE" in ausgabe_mit_flag)
check("CLI mit --fake-worker: .sh-Datei jetzt vorhanden", any(paket_cli.glob("*.sh")))

# CLI mit --fake-worker gegen ein sha-gebrochenes Paket: Exit-Code 1 (abgelehnt), FAKE bleibt in der Ausgabe.
paket_cli_bruch = neues_paket()
schnuere_mini_paket(paket_cli_bruch)
(paket_cli_bruch / "kosmo-buero-sft.jsonl").write_text("manipuliert\n", encoding="utf-8")
stdout_bruch, stderr_bruch = io.StringIO(), io.StringIO()
with redirect_stdout(stdout_bruch), redirect_stderr(stderr_bruch):
    exit_bruch = le.cli([str(paket_cli_bruch), "--fake-worker"])
check("CLI mit --fake-worker gegen sha-Bruch: Exit-Code 1", exit_bruch == 1)
check("CLI mit --fake-worker gegen sha-Bruch: kein Skript-Template geschrieben", not any(paket_cli_bruch.glob("*.sh")))
check("CLI mit --fake-worker gegen sha-Bruch: Ausgabe bleibt FAKE-gekennzeichnet", "FAKE" in stdout_bruch.getvalue())
check("CLI mit --fake-worker gegen sha-Bruch: SHA256-BRUCH auf stderr gemeldet", "SHA256-BRUCH" in stderr_bruch.getvalue())


# ---------------------------------------------------------------------------
# Aufräumen + Ergebnis
# ---------------------------------------------------------------------------
for pfad in (
    paket_gueltig,
    paket_shabruch,
    paket_shabruch_log,
    paket_schema,
    paket_adapter,
    paket_benannt,
    paket_mehrdeutig,
    paket_ausbruch,
    paket_cli,
    paket_cli_bruch,
):
    shutil.rmtree(pfad, ignore_errors=True)

print()
if failures:
    print(f"{len(failures)} Prüfung(en) fehlgeschlagen:")
    for name in failures:
        print(f"  - {name}")
    sys.exit(1)
print("Alle Prüfungen grün.")
sys.exit(0)
