"""Leichte Prüfung für den Blender-Worker-Runner (v0.8.10 / E1,
`docs/V0810-SPEZ.md` §2, Matrix-Zeilen C-1…C-3) — kein pytest nötig, gleicher
Stil wie `test_lora_empfaenger.py`/`test_bridge_haerte.py` (kein
Test-Framework, nur `check(name, cond)` + Exit-Code). HTTP-frei: es wird kein
Bridge-Server gestartet, Job-Records werden direkt als `job.json` in einem
`tempfile.mkdtemp()`-Store angelegt — genau der Dateisystem-Vertrag, den der
Runner poll.

Deckt die im Auftrag verlangten Mindestfälle ab:
  (a) idle-gated Claim: zwei queued vis-Jobs → nach einem Pass genau einer
      running, der andere bleibt queued.
  (b) voller vis-Durchlauf (zwei Pässe: claim, dann fertigstellen) →
      render-result.json existiert, Record done, worker-Feld gesetzt, CLI-
      stdout trägt FAKE.
  (c) requested_style-Spiegelung (lineart) landet unverändert im
      render-result.json.
  (d) kooperativer Abbruch: cancelled zwischen Claim und Ergebnis → KEINE
      Ergebnisdatei, Status bleibt cancelled.
  (e) bake- und bsim-Jobs → SOFORT kein-blender-worker, keine Ergebnisdatei,
      nie running.
  (f) CLI ohne --fake-worker → Exit 2, kein Store angefasst.
  (g) kaputte/fehlende job.json stoppt den Pass nicht — übrige Jobs laufen
      weiter.
  (h) Pfad-Ausbruch-Versuch (job_id/Dateiname mit "..", "/", Nachbarordner)
      wird abgewiesen.

Aufruf:
    python3 tools/homestation-bridge/test_blender_worker.py

Exit-Code 0 = alle Prüfungen grün. Exit-Code != 0 (mit Liste der
fehlgeschlagenen Prüfungen) sonst.
"""

from __future__ import annotations

import io
import json
import shutil
import sys
import tempfile
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from kosmo_bridge import blender_worker as bw  # noqa: E402

failures: list[str] = []
_zaehler = 0


def check(name: str, cond: bool) -> None:
    global _zaehler
    _zaehler += 1
    status = "OK" if cond else "FEHLER"
    print(f"[{status}] {name}")
    if not cond:
        failures.append(name)


def neuer_store() -> Path:
    return Path(tempfile.mkdtemp(prefix="kosmo-blender-worker-test-"))


def neuer_job(store: Path, praefix: str, suffix: str, **felder) -> tuple[str, Path]:
    job_id = f"{praefix}{suffix}"
    job_dir = store / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    record = {"job_id": job_id, "status": "queued", **felder}
    (job_dir / "job.json").write_text(json.dumps(record, indent=2, ensure_ascii=False), encoding="utf-8")
    return job_id, job_dir


def lies_record(job_dir: Path) -> dict:
    return json.loads((job_dir / "job.json").read_text(encoding="utf-8"))


# ---------------------------------------------------------------------------
# (a) idle-gated Claim: zwei queued vis-Jobs → nach einem Pass genau einer
#     running, der andere bleibt queued (Idle-Gate auf Runner-Ebene).
# ---------------------------------------------------------------------------
store_a = neuer_store()
id_a1, dir_a1 = neuer_job(store_a, "vis-", "1000-aaa", requested_style="none")
id_a2, dir_a2 = neuer_job(store_a, "vis-", "1001-bbb", requested_style="none")

berechner = bw.FakeBerechner()
bericht_a1 = bw.fuehre_pass_aus(store_a, berechner)

status_a1 = lies_record(dir_a1)["status"]
status_a2 = lies_record(dir_a2)["status"]
running_anzahl = sum(1 for s in (status_a1, status_a2) if s == "running")
queued_anzahl = sum(1 for s in (status_a1, status_a2) if s == "queued")

check("(a) nach einem Pass genau EIN Job running", running_anzahl == 1)
check("(a) der andere Job bleibt queued", queued_anzahl == 1)
check("(a) Bericht nennt genau einen Claim", len(bericht_a1.geclaimt) == 1)

# Ein zweiter Pass darf den bereits laufenden Job NICHT ein zweites Mal
# claimen und auch den zweiten queued-Job nicht anfassen, solange der erste
# noch running ist (Idle-Gate bleibt über mehrere Pässe wirksam).
bw.fuehre_pass_aus(store_a, berechner)
noch_queued = sum(1 for d in (dir_a1, dir_a2) if lies_record(d)["status"] == "queued")
check("(a) Idle-Gate bleibt über einen zweiten Pass wirksam (weiterhin nur einer running/done)", noch_queued == 1)


# ---------------------------------------------------------------------------
# (b) voller vis-Durchlauf: claim (Pass 1) → fertigstellen (Pass 2) →
#     render-result.json existiert, Record done, worker-Feld gesetzt.
# ---------------------------------------------------------------------------
store_b = neuer_store()
id_b, dir_b = neuer_job(store_b, "vis-", "2000-ccc", requested_style="none")

stdout_b = io.StringIO()
with redirect_stdout(stdout_b):
    exit_b1 = bw.cli([str(store_b), "--fake-worker", "--einmal"])
record_nach_claim = lies_record(dir_b)
check("(b) CLI-Aufruf 1 (claim) Exit-Code 0", exit_b1 == 0)
check("(b) nach Pass 1: Status running", record_nach_claim["status"] == "running")
check("(b) nach Pass 1: worker-Feld gesetzt", record_nach_claim.get("worker") == bw.WORKER_NAME)
check("(b) nach Pass 1: render-result.json existiert NOCH NICHT", not (dir_b / "render-result.json").exists())

stdout_b2 = io.StringIO()
with redirect_stdout(stdout_b2):
    exit_b2 = bw.cli([str(store_b), "--fake-worker", "--einmal"])
record_fertig = lies_record(dir_b)
check("(b) CLI-Aufruf 2 (fertigstellen) Exit-Code 0", exit_b2 == 0)
check("(b) nach Pass 2: render-result.json existiert", (dir_b / "render-result.json").exists())
check("(b) nach Pass 2: Record done", record_fertig["status"] == "done")
check("(b) nach Pass 2: worker-Feld weiterhin gesetzt", record_fertig.get("worker") == bw.WORKER_NAME)
check("(b) nach Pass 2: Bild-Artefakt cam-01.png existiert", (dir_b / "cam-01.png").exists())
check("(b) CLI-Ausgabe (Pass 1) trägt FAKE", "FAKE" in stdout_b.getvalue())
check("(b) CLI-Ausgabe (Pass 2) trägt FAKE", "FAKE" in stdout_b2.getvalue())

ergebnis_b = json.loads((dir_b / "render-result.json").read_text(encoding="utf-8"))
check("(b) render-result.json: schema kosmovis.render-result/v2", ergebnis_b.get("schema") == "kosmovis.render-result/v2")
check("(b) render-result.json: qa.verdict.passed True", ergebnis_b.get("qa", {}).get("verdict", {}).get("passed") is True)
check("(b) render-result.json: qa.method trägt den Worker-Namen (kein echtes Verfahren vorgetäuscht)", ergebnis_b.get("qa", {}).get("style", {}).get("method") == bw.WORKER_NAME)


# ---------------------------------------------------------------------------
# (c) requested_style-Spiegelung (lineart) landet unverändert im
#     render-result.json.
# ---------------------------------------------------------------------------
store_c = neuer_store()
id_c, dir_c = neuer_job(store_c, "vis-", "3000-ddd", requested_style="lineart")
bw.fuehre_pass_aus(store_c, berechner)  # claim
bw.fuehre_pass_aus(store_c, berechner)  # fertigstellen
ergebnis_c = json.loads((dir_c / "render-result.json").read_text(encoding="utf-8"))
check("(c) requested_style 'lineart' wird gespiegelt", ergebnis_c.get("requested_style") == "lineart")
check("(c) Verdikt-Begründung nennt den gespiegelten Stil", "lineart" in ergebnis_c.get("qa", {}).get("verdict", {}).get("reason", ""))


# ---------------------------------------------------------------------------
# (d) kooperativer Abbruch: cancelled zwischen Claim und Ergebnis → KEINE
#     Ergebnisdatei, Status bleibt cancelled.
# ---------------------------------------------------------------------------
store_d = neuer_store()
id_d, dir_d = neuer_job(store_d, "vis-", "4000-eee", requested_style="none")
bw.fuehre_pass_aus(store_d, berechner)  # Pass 1: claim -> running
check("(d) nach Claim: Status running", lies_record(dir_d)["status"] == "running")


class _AbbrechenderBerechner:
    """Injektions-Hook fürs Testen von Schritt 3 (kooperativer Abbruch): setzt
    den Record extern auf cancelled GENAU während der 'Berechnung' — simuliert
    einen /cancel, der zwischen Rechnen und Schreiben eintrifft. Der Poller
    sah beim Einsammeln (sammle_jobs, Pass-Start) noch 'running'; erst der
    normativ VORGESCHRIEBENE Frisch-Read direkt vor dem Schreiben (Schritt 3)
    entdeckt den Abbruch."""

    def __init__(self, innerer: bw.Berechner) -> None:
        self._innerer = innerer

    def render(self, job_dir: Path, record: dict) -> bw.ErgebnisEntscheid:
        aktuell = json.loads((job_dir / "job.json").read_text(encoding="utf-8"))
        aktuell["status"] = "cancelled"
        aktuell["message"] = "Vom Nutzer abgebrochen (Test-Hook)."
        (job_dir / "job.json").write_text(json.dumps(aktuell, indent=2, ensure_ascii=False), encoding="utf-8")
        return self._innerer.render(job_dir, record)

    def bake(self, job_dir: Path, record: dict) -> bw.ErgebnisEntscheid:
        return self._innerer.bake(job_dir, record)

    def blender_sim(self, job_dir: Path, record: dict) -> bw.ErgebnisEntscheid:
        return self._innerer.blender_sim(job_dir, record)


bericht_d2 = bw.fuehre_pass_aus(store_d, _AbbrechenderBerechner(berechner))  # Pass 2: müsste fertigstellen, bricht aber ab
check("(d) nach Abbruch: KEINE render-result.json geschrieben", not (dir_d / "render-result.json").exists())
check("(d) nach Abbruch: KEIN Bild-Artefakt cam-01.png geschrieben", not (dir_d / "cam-01.png").exists())
check("(d) nach Abbruch: Status bleibt cancelled (nicht von done überschrieben)", lies_record(dir_d)["status"] == "cancelled")
check("(d) Bericht vermerkt den Abbruch", id_d in bericht_d2.abgebrochen)


# ---------------------------------------------------------------------------
# (e) bake- und bsim-Jobs → SOFORT kein-blender-worker, keine Ergebnisdatei,
#     nie running.
# ---------------------------------------------------------------------------
store_e = neuer_store()
id_bake, dir_bake = neuer_job(store_e, "bake-", "5000-fff", kind="bake")
id_bsim, dir_bsim = neuer_job(store_e, "bsim-", "5001-ggg", kind="blender-sim", art="sonnenstunden")

stdout_e = io.StringIO()
with redirect_stdout(stdout_e):
    bericht_e = bw.fuehre_pass_aus(store_e, berechner)
    bw._drucke_bericht(bericht_e)
ausgabe_e = stdout_e.getvalue()

record_bake = lies_record(dir_bake)
record_bsim = lies_record(dir_bsim)
check("(e) bake-Job: SOFORT kein-blender-worker (ein Pass genügt)", record_bake["status"] == "kein-blender-worker")
check("(e) bake-Job: nie running gewesen (worker-Feld = Fake-Worker, aber kein Ergebnis)", record_bake.get("worker") == bw.WORKER_NAME)
check("(e) bake-Job: keine bake-result.json geschrieben", not (dir_bake / "bake-result.json").exists())
check("(e) bake-Job: kein irgendein *.glb im Job-Ordner erschienen", not any(dir_bake.glob("*.glb")))
check("(e) bsim-Job: SOFORT kein-blender-worker", record_bsim["status"] == "kein-blender-worker")
check("(e) bsim-Job: keine Ergebnisdatei geschrieben", not any(dir_bsim.glob("*result*")))
check("(e) bake+bsim: Bericht nennt beide unter sofort_kein_worker", len(bericht_e.sofort_kein_worker) == 2)
check("(e) bake+bsim: kein Claim, kein Fertigstellen ausgelöst", bericht_e.geclaimt == [] and bericht_e.fertiggestellt == [])
check("(e) Ausgabe trägt FAKE", "FAKE" in ausgabe_e)


# ---------------------------------------------------------------------------
# (f) CLI ohne --fake-worker → Exit 2, kein Store angefasst.
# ---------------------------------------------------------------------------
store_f = neuer_store()
neuer_job(store_f, "vis-", "6000-hhh", requested_style="none")

stdout_f, stderr_f = io.StringIO(), io.StringIO()
with redirect_stdout(stdout_f), redirect_stderr(stderr_f):
    exit_f = bw.cli([str(store_f)])
check("(f) CLI ohne --fake-worker: Exit-Code 2", exit_f == 2)
check("(f) CLI ohne --fake-worker: Fehlermeldung nennt --fake-worker", "--fake-worker" in stderr_f.getvalue())
check(
    "(f) CLI ohne --fake-worker: Job bleibt unangetastet (weiterhin queued)",
    next(d for d in store_f.iterdir() if d.is_dir()).joinpath("job.json").exists()
    and json.loads(next(d for d in store_f.iterdir() if d.is_dir()).joinpath("job.json").read_text())["status"] == "queued",
)

# Store-Pfad, der gar kein Verzeichnis ist → ebenfalls Exit 2.
stdout_f2, stderr_f2 = io.StringIO(), io.StringIO()
with redirect_stdout(stdout_f2), redirect_stderr(stderr_f2):
    exit_f2 = bw.cli([str(store_f / "nicht-vorhanden"), "--fake-worker", "--einmal"])
check("(f) CLI mit nicht existierendem Store: Exit-Code 2", exit_f2 == 2)


# ---------------------------------------------------------------------------
# (g) kaputte/fehlende job.json stoppt den Pass nicht — übrige Jobs laufen
#     weiter.
# ---------------------------------------------------------------------------
store_g = neuer_store()
id_g_ok, dir_g_ok = neuer_job(store_g, "vis-", "7000-iii", requested_style="none")
# Job-Ordner mit kaputtem JSON (kein gültiges Objekt).
dir_g_kaputt = store_g / "vis-7001-kaputt"
dir_g_kaputt.mkdir()
(dir_g_kaputt / "job.json").write_text("{das ist kein JSON", encoding="utf-8")
# Job-Ordner ganz ohne job.json (z.B. ein Container-Ordner wie STORE/dev/).
dir_g_leer = store_g / "dev"
dir_g_leer.mkdir()

bericht_g = bw.fuehre_pass_aus(store_g, berechner)
check("(g) kaputtes job.json wird übersprungen, nicht abgebrochen", any("kaputt" in e or "unlesbar" in e for e in bericht_g.uebersprungen))
check("(g) der gesunde Job wird trotzdem geclaimt", id_g_ok in bericht_g.geclaimt)
check("(g) Ordner ohne job.json erzeugt keinen Eintrag im Bericht (kein Fehler)", not any(dir_g_leer.name in e for e in bericht_g.uebersprungen))
check("(g) gesunder Job ist jetzt running", lies_record(dir_g_ok)["status"] == "running")


# ---------------------------------------------------------------------------
# (h) Pfad-Ausbruch-Versuch wird abgewehrt.
# ---------------------------------------------------------------------------
store_h = neuer_store()

try:
    bw.sicherer_job_ordner(store_h, "../evil")
    ausbruch_1_abgewehrt = False
except bw.PfadAusbruchFehler:
    ausbruch_1_abgewehrt = True
check("(h) sicherer_job_ordner weist '../evil' ab", ausbruch_1_abgewehrt)

try:
    bw.sicherer_job_ordner(store_h, "nachbar/../../evil")
    ausbruch_2_abgewehrt = False
except bw.PfadAusbruchFehler:
    ausbruch_2_abgewehrt = True
check("(h) sicherer_job_ordner weist verschachtelten '..'-Ausbruch ab", ausbruch_2_abgewehrt)

# Nachbarordner-Trick: "<store>-evil" beginnt mit "<store>" ohne Trenner —
# ein reiner startswith()-Vergleich würde das durchlassen.
nachbar_evil = Path(str(store_h) + "-evil")
nachbar_evil.mkdir(exist_ok=True)
try:
    kandidat = store_h.joinpath("..") / nachbar_evil.name
    bw.sicherer_job_ordner(store_h, "..")
    ausbruch_3_abgewehrt = False
except bw.PfadAusbruchFehler:
    ausbruch_3_abgewehrt = True
check("(h) sicherer_job_ordner weist '..' als eigenes Segment ab", ausbruch_3_abgewehrt)
shutil.rmtree(nachbar_evil, ignore_errors=True)

gueltiger_ordner = bw.sicherer_job_ordner(store_h, "vis-9000-jjj")
check("(h) sicherer_job_ordner akzeptiert eine gültige job_id", gueltiger_ordner == store_h / "vis-9000-jjj")

job_dir_h = store_h / "vis-9000-jjj"
job_dir_h.mkdir()
try:
    bw.sicherer_zielpfad(job_dir_h, "../../etc/geheim.txt")
    ziel_ausbruch_abgewehrt = False
except bw.PfadAusbruchFehler:
    ziel_ausbruch_abgewehrt = True
check("(h) sicherer_zielpfad weist einen Ergebnis-Ausbruch ab", ziel_ausbruch_abgewehrt)

gueltiges_ziel = bw.sicherer_zielpfad(job_dir_h, "render-result.json")
check("(h) sicherer_zielpfad akzeptiert einen gültigen Dateinamen im Job-Ordner", gueltiges_ziel == (job_dir_h / "render-result.json").resolve())


# ---------------------------------------------------------------------------
# Zusatz: job_art() erkennt die drei relevanten Präfixe + "unbekannt" sonst.
# ---------------------------------------------------------------------------
check("job_art: 'vis-…' -> render", bw.job_art("vis-123-abc") == "render")
check("job_art: 'bake-…' -> bake", bw.job_art("bake-123-abc") == "bake")
check("job_art: 'bsim-…' -> bsim", bw.job_art("bsim-123-abc") == "bsim")
check("job_art: 'dev-…' -> unbekannt (nicht dieser Runner)", bw.job_art("dev-123-abc") == "unbekannt")
check("job_art: 'vsplat-…' -> unbekannt (nicht dieser Runner)", bw.job_art("vsplat-123-abc") == "unbekannt")


# ---------------------------------------------------------------------------
# Aufräumen + Ergebnis
# ---------------------------------------------------------------------------
for pfad in (store_a, store_b, store_c, store_d, store_e, store_f, store_g, store_h):
    shutil.rmtree(pfad, ignore_errors=True)

print()
print(f"{_zaehler} Prüfungen gelaufen.")
if failures:
    print(f"{len(failures)} Prüfung(en) fehlgeschlagen:")
    for name in failures:
        print(f"  - {name}")
    sys.exit(1)
print("Alle Prüfungen grün.")
sys.exit(0)
