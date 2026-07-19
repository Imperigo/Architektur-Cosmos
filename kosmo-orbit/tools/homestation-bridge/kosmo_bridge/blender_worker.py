"""blender_worker.py — bpy-freier Dateisystem-Poller/Worker-Runner für den
Job-Store der Kosmo-Bridge (v0.8.10 / E1, `docs/V0810-SPEZ.md` §2, Matrix-
Zeilen C-1…C-3).

**Was das ist:** ein eigenständiger Python-Prozess, der NEBEN der Bridge
läuft (nicht Teil von `main.py`) und den `--store`-Ordner nach dem
normativen 4-Schritt-Worker-Protokoll bearbeitet
(`README.md` §«Worker andocken», :189-208):

    1. `queued`-Job claimen — aber nur, wenn DIESER Runner gerade keinen
       anderen Job `running` hat (Idle-Gate auf Runner-Ebene: höchstens EIN
       Job gleichzeitig `running` durch diesen Prozess).
    2. Auf `running` setzen, `worker` + `progress` eintragen.
    3. VOR dem Schreiben eines Ergebnisses den Job-Record FRISCH von der
       Platte lesen — steht dort `cancelled`, kooperativ abbrechen (KEINE
       Ergebnisdatei, der Status bleibt `cancelled`).
    4. Ergebnisdatei je Job-Art + `status: done` schreiben.

**Warum eine eigene Datei statt eines Imports aus main.py:** `main.py`
kennt bereits einen Fake-Worker (`_fake_worker_step`, `main.py:1063-1173`)
für den EINGEBAUTEN Bridge-Server-Prozess (dessen In-Prozess-Loop, gedacht
für E2E-Läufe der App). Dieser Runner hier ist die GERÄTE-Vorlage: ein
externer, eigenständig gestarteter Prozess, wie ihn ein künftiger echter
Blender-Worker auf der HomeStation sein wird (`docs/HOMESTATION-AUFTRAG.md`).
`main.py` ist ausdrücklich TABU für dieses Paket (V0810-SPEZ Sanktion 2) —
es wird bewusst NICHT refaktoriert, damit die bestehende E2E-Fake-Bridge
(deren Verhalten 3416 Tests + 81 E2E-Specs voraussetzen) nicht destabilisiert
wird. Die inhaltliche Ähnlichkeit zu `_fake_worker_step` (Platzhalter-PNG,
QA-Objekt-Form, Status-Automat) ist darum BEGRÜNDETE Duplikation, kein
Versehen — es gibt bewusst KEIN gemeinsames Modul zwischen Bridge-internem
Fake-Worker und diesem externen Runner.

**Exklusivitätsregel (normativ, s. README.md):** dieser Runner darf NIE
gleichzeitig gegen eine Bridge laufen, die selbst mit `--fake-worker`
gestartet wurde — beide Fake-Wege würden sich denselben Job-Store streitig
machen (Doppel-Claims, wechselseitig überschriebene `running`-Zustände).
Interner Fake-Worker der Bridge und dieser externe Runner sind wechselseitig
exklusiv: entweder `kosmo-bridge --fake-worker` ODER
`blender_worker.py --fake-worker <store>`, nie beides auf demselben Store.

**Ehrlichkeit (Sanktionen 3-5, V0810-SPEZ §4):**
- KEIN `bpy`-Import, KEIN GPL-Link — ROADMAP 179 bleibt bpy-frei, dieser
  Runner ist reines Python-stdlib.
- `vis-`-Jobs (Render/KosmoVis) bekommen ein markiertes FAKE-Bild als
  `render-result.json`, inkl. `requested_style`-Spiegelung aus dem
  Job-Record (Sanktion 5: jede Erfolgsausgabe trägt "FAKE").
- `bake-`/`bsim-`-Jobs werden NIE gerechnet — sie bekommen SOFORT den
  ehrlichen Status `kein-blender-worker`, nie `running`/`done`, nie eine
  Ergebnisdatei (Sanktion 4: Physik-Zahlen und Geometrie-Optimierungen
  werden NIE gefakt — exakt dieselbe Grenze wie main.py:1088-1122).

**Pluggables Berechner-Interface:** die eigentliche "Berechnung" läuft
hinter dem `Berechner`-Protokoll (`typing.Protocol`) — in DIESEM Repo gibt
es nur `FakeBerechner`. Ein künftiger echter Worker auf der HomeStation
tauscht nur die Implementierung aus (`bpy`, Blender headless), der
Poller/Zustandsautomat in dieser Datei bleibt unverändert.

Aufruf:
    python3 kosmo_bridge/blender_worker.py <store> --fake-worker --einmal
    python3 kosmo_bridge/blender_worker.py <store> --fake-worker --intervall 2.0

Exit-Code 0 = Poller lief (im `--einmal`-Modus: genau ein Pass; sonst bis
  Abbruch per Strg+C).
Exit-Code 2 = Aufruf-Fehler (fehlendes `--fake-worker`, Store kein
  Verzeichnis, …) — dieselbe Konvention wie `lora_empfaenger.py`
  (`kosmo_bridge/lora_empfaenger.py:37-42`).
"""

from __future__ import annotations

import argparse
import json
import struct
import sys
import time
import zlib
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Protocol

# ---------------------------------------------------------------------------
# Konstanten
# ---------------------------------------------------------------------------

WORKER_NAME = "blender-worker-fake"

# Job-Art wird über den job_id-Präfix erkannt (main.py erzeugt die Präfixe
# beim Anlegen: "vis-" für Render-Jobs (main.py:331, kein "kind"-Feld auf dem
# Record), "bake-" für Bake-Jobs (main.py:841, "kind": "bake"), "bsim-" für
# Blender-Simulationen (main.py:784, "kind": "blender-sim")). Andere Präfixe
# (z.B. "dev-", "vsplat-") gehören nicht zu diesem Runner — er lässt sie
# unangetastet.
PRAEFIX_RENDER = "vis-"
PRAEFIX_BAKE = "bake-"
PRAEFIX_BSIM = "bsim-"


def _jetzt() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Pfad-Disziplin — Ausbruchs-Abwehr nach dem lora_empfaenger-/main.py-Muster
# (lora_empfaenger.py:236-263 pruefe_dateien, main.py:252-271
# _safe_store_path): jedes Segment wird gegen "/", "\\" und ".." geprüft,
# UND das Ergebnis muss nach resolve() ein echtes Kind des erlaubten
# Wurzelordners sein (relative_to, try/except ValueError) — schliesst den
# Nachbarordner-Trick, den ein reiner startswith()-Vergleich durchliesse.
# ---------------------------------------------------------------------------


class PfadAusbruchFehler(Exception):
    """Ein Job-Ordner- oder Ergebnis-Schreibziel läge ausserhalb des
    erlaubten Wurzelordners."""


def sicherer_job_ordner(store: Path, job_id: str) -> Path:
    """Baut `<store>/<job_id>` und weist Ausbruchsversuche im job_id-Segment
    ab. Der Poller iteriert normalerweise echte Verzeichniseinträge (kein
    Ausbruch über `Path.iterdir()` möglich) — dieser Guard ist zusätzliche
    Verteidigungstiefe für jeden Aufrufer, der eine job_id als Text
    entgegennimmt (z.B. ein künftiger HTTP-/CLI-Zugang), und bewusst separat
    testbar."""
    if not job_id or "/" in job_id or "\\" in job_id or ".." in job_id:
        raise PfadAusbruchFehler(f"ungültige job_id: {job_id!r}")
    kandidat = store.joinpath(job_id)
    try:
        kandidat.resolve().relative_to(store.resolve())
    except ValueError:
        raise PfadAusbruchFehler(f"Job-Ordner ausserhalb des Stores: {job_id!r}")
    return kandidat


def sicherer_zielpfad(job_dir: Path, name: str) -> Path:
    """Erzwingt, dass ein Ergebnis-/Artefaktname innerhalb von `<job_dir>`
    bleibt (Ergebnis nur in `<job_dir>` bzw. `<job_dir>/out`, nie
    aussserhalb) — dieselbe Zwei-Schichten-Prüfung wie `sicherer_job_ordner`,
    hier auf Dateiebene."""
    if not name or "\\" in name or ".." in Path(name).parts:
        raise PfadAusbruchFehler(f"ungültiger Ergebnis-Dateiname: {name!r}")
    ziel = (job_dir / name).resolve()
    try:
        ziel.relative_to(job_dir.resolve())
    except ValueError:
        raise PfadAusbruchFehler(f"Schreibziel verlässt den Job-Ordner: {name!r}")
    return ziel


# ---------------------------------------------------------------------------
# Platzhalter-PNG — bewusste Duplikation von main.py:_placeholder_png
# (main.py:1047-1060, s. Kopfkommentar). Minimales valides PNG ohne
# Abhängigkeiten, deutlich als Fake erkennbar (einfarbige Kupferfläche).
# ---------------------------------------------------------------------------


def platzhalter_png(width: int = 640, height: int = 400) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c))

    row = b"\x00" + bytes([194, 94, 58] * width)
    raw = row * height
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 6))
        + chunk(b"IEND", b"")
    )


# ---------------------------------------------------------------------------
# Pluggables Berechner-Interface (E1) — im Repo NUR FakeBerechner. Ein
# künftiger echter Worker (bpy, Blender headless auf der HomeStation) tauscht
# ausschliesslich diese Klasse aus; der Poller/Zustandsautomat unten bleibt
# unverändert (ROADMAP-179-Präzisierung: DIESES Repo bleibt bpy-frei, der
# echte Berechner entsteht am Gerät gegen genau dieses Protokoll).
# ---------------------------------------------------------------------------


@dataclass
class ErgebnisEntscheid:
    """Was ein Berechner für einen Job-Schritt entscheidet — der Poller setzt
    das um, ohne die fachliche Logik zu kennen."""

    ziel_status: str  # z.B. "done" oder "kein-blender-worker"
    worker: str
    ergebnis_dateiname: str | None = None
    ergebnis_inhalt: dict | None = None
    binaerdateien: dict[str, bytes] = field(default_factory=dict)
    nachricht: str | None = None


class Berechner(Protocol):
    """Eine Methode je Job-Art — ein echter Blender-Worker implementiert
    dieselbe Schnittstelle, ohne den Poller anzufassen."""

    def render(self, job_dir: Path, record: dict) -> ErgebnisEntscheid: ...

    def bake(self, job_dir: Path, record: dict) -> ErgebnisEntscheid: ...

    def blender_sim(self, job_dir: Path, record: dict) -> ErgebnisEntscheid: ...


class FakeBerechner:
    """Der einzige Berechner in diesem Repo. Rechnet NIE echt — spiegelt nur
    das main.py-Fake-Verhalten (`_fake_worker_step`, main.py:1063-1173), auf
    den externen Runner übertragen:

    - `render()`: markiertes FAKE-Bild + FAKE-QA-Verdikt, `requested_style`
      direkt aus dem Job-Record gespiegelt (main.py trägt es dort seit
      v0.8.9 §9 E9 ein, main.py:353/364).
    - `bake()`/`blender_sim()`: SOFORT `kein-blender-worker`, NIE eine Zahl
      oder ein "gebacktes" GLB — Physik und Geometrie-Optimierung werden nie
      gefakt (Sanktion 4, main.py:1088-1122)."""

    def render(self, job_dir: Path, record: dict) -> ErgebnisEntscheid:
        requested_style = record.get("requested_style", "none")
        bild_name = "cam-01.png"
        inhalt = {
            "schema": "kosmovis.render-result/v2",
            "job_id": record.get("job_id", job_dir.name),
            "images": [bild_name],
            "ai_variant": bild_name,
            # requested_style-Spiegelung (E1, wörtlich verlangt) — was
            # BESTELLT wurde, nicht neu interpretiert.
            "requested_style": requested_style,
            "fake": True,
            "qa": {
                "style": {
                    "style_score": 0.42,
                    "threshold": 0.3,
                    "passed": True,
                    "method": WORKER_NAME,
                },
                "geometry": {
                    "geometry_fidelity": 0.87,
                    "spearman": 0.93,
                    "geom_iou": 0.81,
                    "threshold": 0.65,
                    "passed": True,
                    "method": WORKER_NAME,
                },
                "verdict": {
                    "passed": True,
                    "reason": f"FAKE — {WORKER_NAME} (Demo ohne Blender, style={requested_style})",
                },
            },
        }
        return ErgebnisEntscheid(
            ziel_status="done",
            worker=WORKER_NAME,
            ergebnis_dateiname="render-result.json",
            ergebnis_inhalt=inhalt,
            binaerdateien={bild_name: platzhalter_png()},
            nachricht=f"FAKE-Bild erzeugt (requested_style={requested_style})",
        )

    def bake(self, job_dir: Path, record: dict) -> ErgebnisEntscheid:
        return ErgebnisEntscheid(
            ziel_status="kein-blender-worker",
            worker=WORKER_NAME,
            nachricht=(
                "FAKE — kein Blender-Worker angeschlossen: Smart-UV-Unwrap + AO-Bake "
                "braucht Blender headless auf der HomeStation. Ein unverändertes Modell "
                "wird nicht als gebackt ausgegeben (Sanktion 4)."
            ),
        )

    def blender_sim(self, job_dir: Path, record: dict) -> ErgebnisEntscheid:
        art = record.get("art", "?")
        return ErgebnisEntscheid(
            ziel_status="kein-blender-worker",
            worker=WORKER_NAME,
            nachricht=(
                f"FAKE — kein Blender-Worker angeschlossen: Simulation '{art}' braucht "
                "Blender headless auf der HomeStation. Physik wird nicht erfunden "
                "(Sanktion 4)."
            ),
        )


# ---------------------------------------------------------------------------
# Job-Erkennung + Einsammeln — kaputte/fehlende job.json überspringen die
# Datei, nicht den ganzen Pass (normativ, E1).
# ---------------------------------------------------------------------------


@dataclass
class JobEintrag:
    job_dir: Path
    record: dict


def job_art(job_id: str) -> str:
    """"render" | "bake" | "bsim" | "unbekannt" (letzteres z.B. für "dev-"/
    "vsplat-"-Jobs — nicht Teil dieses Runners, bleibt unangetastet)."""
    if job_id.startswith(PRAEFIX_RENDER):
        return "render"
    if job_id.startswith(PRAEFIX_BAKE):
        return "bake"
    if job_id.startswith(PRAEFIX_BSIM):
        return "bsim"
    return "unbekannt"


def _lade_job_json(job_dir: Path) -> dict | None:
    """Frisches Lesen von `<job_dir>/job.json` — `None`, wenn die Datei
    fehlt, kein lesbares JSON ist oder kein Objekt ist. Wird sowohl beim
    Einsammeln als auch unmittelbar vor jedem Ergebnis-Schreiben verwendet
    (Schritt 3 des Protokolls: FRISCH lesen, nicht den eingesammelten Stand
    von vorhin wiederverwenden)."""
    f = job_dir / "job.json"
    if not f.exists():
        return None
    try:
        rohtext = f.read_text(encoding="utf-8")
        geladen = json.loads(rohtext)
    except (OSError, json.JSONDecodeError):
        return None
    if not isinstance(geladen, dict):
        return None
    return geladen


def _schreibe_job_json(job_dir: Path, record: dict) -> None:
    (job_dir / "job.json").write_text(json.dumps(record, indent=2, ensure_ascii=False), encoding="utf-8")


def sammle_jobs(store: Path, log: list[str]) -> list[JobEintrag]:
    """Ein Durchlauf über alle unmittelbaren Unterordner von `store`. Ein
    fehlendes/kaputtes `job.json` wird übersprungen und in `log` vermerkt —
    der Pass bricht NICHT ab (E1, wörtlich). Container-Ordner ohne eigenes
    `job.json` (z.B. `STORE/dev/`) sind kein Fehler, einfach kein Job hier."""
    eintraege: list[JobEintrag] = []
    if not store.exists():
        return eintraege
    for d in sorted(store.iterdir()):
        if not d.is_dir():
            continue
        try:
            sicherer_job_ordner(store, d.name)
        except PfadAusbruchFehler as e:
            log.append(f"{d.name}: übersprungen ({e})")
            continue
        f = d / "job.json"
        if not f.exists():
            continue
        try:
            rohtext = f.read_text(encoding="utf-8")
            geladen = json.loads(rohtext)
        except (OSError, json.JSONDecodeError) as e:
            log.append(f"{d.name}/job.json: übersprungen, kaputt oder unlesbar ({e})")
            continue
        if not isinstance(geladen, dict):
            log.append(f"{d.name}/job.json: übersprungen, kein JSON-Objekt")
            continue
        eintraege.append(JobEintrag(d, geladen))
    return eintraege


# ---------------------------------------------------------------------------
# Die vier Protokollschritte
# ---------------------------------------------------------------------------


def _schritt_claimen(job_dir: Path) -> bool:
    """Schritt 1+2: NUR aus `queued` claimen, `running` + `worker` +
    `progress` schreiben. `False`, wenn der Job zwischen dem Einsammeln und
    hier nicht mehr `queued` war (Race, z.B. von aussen abgebrochen)."""
    aktuell = _lade_job_json(job_dir)
    if aktuell is None or aktuell.get("status") != "queued":
        return False
    aktuell["status"] = "running"
    aktuell["worker"] = WORKER_NAME
    aktuell["progress"] = {"phase": "rendern", "pct": 0.5}
    aktuell["updated_at"] = _jetzt()
    _schreibe_job_json(job_dir, aktuell)
    return True


def _schritt_render_fertigstellen(job_dir: Path, record: dict, berechner: Berechner) -> str | None:
    """Schritt 3+4 für Render-Jobs: Ergebnis berechnen, dann FRISCH lesen —
    steht dort `cancelled`, kooperativ abbrechen (keine Ergebnisdatei,
    Status bleibt `cancelled`). Gibt eine Log-Nachricht zurück oder `None`
    bei Abbruch."""
    entscheid = berechner.render(job_dir, record)

    # Schritt 3 — normativ VOR dem Ergebnis-Schreiben: frisch lesen.
    aktuell = _lade_job_json(job_dir)
    if aktuell is None or aktuell.get("status") == "cancelled":
        return None  # kooperativer Abbruch — nichts geschrieben, Status bleibt cancelled

    for name, daten in entscheid.binaerdateien.items():
        ziel = sicherer_zielpfad(job_dir, name)
        ziel.write_bytes(daten)
    if entscheid.ergebnis_dateiname is not None and entscheid.ergebnis_inhalt is not None:
        ziel = sicherer_zielpfad(job_dir, entscheid.ergebnis_dateiname)
        ziel.write_text(json.dumps(entscheid.ergebnis_inhalt, indent=2, ensure_ascii=False), encoding="utf-8")

    aktuell["status"] = entscheid.ziel_status
    aktuell["worker"] = entscheid.worker
    aktuell["progress"] = {"phase": "fertig", "pct": 1.0}
    aktuell["updated_at"] = _jetzt()
    _schreibe_job_json(job_dir, aktuell)
    return entscheid.nachricht


def _schritt_sofort_kein_worker(job_dir: Path, berechner_entscheid_fn) -> str | None:
    """Bake/Blender-Sim: NIE `running`, SOFORT `kein-blender-worker` — frisch
    lesen, nur aus `queued` übernehmen (respektiert einen zwischenzeitlichen
    externen `cancelled`), keine Ergebnisdatei."""
    aktuell = _lade_job_json(job_dir)
    if aktuell is None or aktuell.get("status") != "queued":
        return None
    entscheid = berechner_entscheid_fn(job_dir, aktuell)
    aktuell["status"] = entscheid.ziel_status
    aktuell["worker"] = entscheid.worker
    aktuell["message"] = entscheid.nachricht
    aktuell["updated_at"] = _jetzt()
    _schreibe_job_json(job_dir, aktuell)
    return entscheid.nachricht


# ---------------------------------------------------------------------------
# Ein Pass über den gesamten Store
# ---------------------------------------------------------------------------


@dataclass
class PassBericht:
    geclaimt: list[str] = field(default_factory=list)
    fertiggestellt: list[str] = field(default_factory=list)
    abgebrochen: list[str] = field(default_factory=list)
    sofort_kein_worker: list[str] = field(default_factory=list)
    uebersprungen: list[str] = field(default_factory=list)


def fuehre_pass_aus(store: Path, berechner: Berechner) -> PassBericht:
    """Ein Durchlauf über den gesamten Job-Store:

    1. Läuft für DIESEN Runner (worker == WORKER_NAME) bereits ein Job
       (`status == "running"`)? Dann NUR den fertigstellen (Schritt 3+4) —
       kein neuer Claim in diesem Pass (Idle-Gate auf Runner-Ebene, testbar
       über "zwei queued Jobs → nach einem Pass genau einer running").
    2. Sonst: genau EINEN `queued`-Render-Job claimen (Schritt 1+2,
       deterministisch der alphabetisch erste job_id).
    3. UNABHÄNGIG davon: alle `queued`-Bake-/Blender-Sim-Jobs SOFORT auf
       `kein-blender-worker` setzen — die gehen nie durch `running`, brauchen
       also kein Idle-Gate."""
    bericht = PassBericht()
    jobs = sammle_jobs(store, bericht.uebersprungen)

    laufender = next(
        (j for j in jobs if j.record.get("status") == "running" and j.record.get("worker") == WORKER_NAME),
        None,
    )
    if laufender is not None:
        if job_art(laufender.job_dir.name) == "render":
            nachricht = _schritt_render_fertigstellen(laufender.job_dir, laufender.record, berechner)
            if nachricht is None:
                bericht.abgebrochen.append(laufender.job_dir.name)
            else:
                bericht.fertiggestellt.append(f"{laufender.job_dir.name}: {nachricht}")
    else:
        queued_render = sorted(
            (j for j in jobs if j.record.get("status") == "queued" and job_art(j.job_dir.name) == "render"),
            key=lambda j: j.job_dir.name,
        )
        if queued_render:
            ziel = queued_render[0]
            if _schritt_claimen(ziel.job_dir):
                bericht.geclaimt.append(ziel.job_dir.name)

    for j in jobs:
        art = job_art(j.job_dir.name)
        if art == "bake" and j.record.get("status") == "queued":
            nachricht = _schritt_sofort_kein_worker(j.job_dir, berechner.bake)
            if nachricht is not None:
                bericht.sofort_kein_worker.append(f"{j.job_dir.name}: {nachricht}")
        elif art == "bsim" and j.record.get("status") == "queued":
            nachricht = _schritt_sofort_kein_worker(j.job_dir, berechner.blender_sim)
            if nachricht is not None:
                bericht.sofort_kein_worker.append(f"{j.job_dir.name}: {nachricht}")

    return bericht


def _drucke_bericht(bericht: PassBericht) -> None:
    for name in bericht.geclaimt:
        print(f"FAKE — {WORKER_NAME} claimt {name} (queued -> running)")
    for eintrag in bericht.fertiggestellt:
        print(f"FAKE — {WORKER_NAME} fertig: {eintrag}")
    for eintrag in bericht.sofort_kein_worker:
        print(f"FAKE — {WORKER_NAME}: {eintrag}")
    for name in bericht.abgebrochen:
        print(f"FAKE — {WORKER_NAME}: {name} kooperativ abgebrochen (cancelled), keine Ergebnisdatei")
    for eintrag in bericht.uebersprungen:
        print(f"[UEBERSPRUNGEN] {eintrag}", file=sys.stderr)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def cli(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        prog="blender_worker.py",
        description=(
            "bpy-freier Dateisystem-Poller für den Job-Store einer Kosmo-Bridge-Instanz — "
            "pollt <store> nach dem normativen 4-Schritt-Worker-Protokoll (README.md "
            "'Worker andocken'). Macht NIE einen echten Blender-/GPU-Lauf; ohne "
            "--fake-worker verweigert das Werkzeug den Lauf komplett. NIE gleichzeitig "
            "gegen eine Bridge betreiben, die selbst mit --fake-worker läuft "
            "(Exklusivitätsregel)."
        ),
    )
    ap.add_argument("store", type=Path, help="Pfad zum Job-Store (derselbe Ordner wie kosmo-bridge --store)")
    ap.add_argument(
        "--fake-worker",
        action="store_true",
        help=(
            "Pflicht: dieser Runner macht NIE einen echten Blender-/GPU-Lauf (kein bpy-"
            "Import, kein GPL-Link, ROADMAP 179 bleibt bpy-frei) — ohne dieses Flag "
            "verweigert er den Start komplett, damit jede Ausgabe unmissverständlich als "
            "FAKE gekennzeichnet ist. Dieselbe Konvention wie lora_empfaenger.py "
            "--fake-worker und main.py --fake-worker."
        ),
    )
    ap.add_argument(
        "--einmal",
        action="store_true",
        help="Nur EIN Pass über den Store statt Endlos-Loop (für Tests/Cron statt Dauerbetrieb).",
    )
    ap.add_argument(
        "--intervall",
        type=float,
        default=1.0,
        help="Sekunden zwischen zwei Pässen im Endlos-Loop (Default 1.0, ohne --einmal).",
    )
    args = ap.parse_args(argv)

    if not args.fake_worker:
        print(
            "FEHLER: --fake-worker fehlt. Dieser Runner macht NIE einen echten Blender-/"
            "GPU-Lauf (kein bpy-Import, kein GPL-Link) — im Container/als Demo läuft er NUR "
            "mit explizit gesetztem --fake-worker, damit jede Ausgabe unmissverständlich als "
            "FAKE gekennzeichnet ist. Ausserdem NIE gleichzeitig gegen eine Bridge betreiben, "
            "die selbst --fake-worker gesetzt hat (Exklusivitätsregel, README).",
            file=sys.stderr,
        )
        return 2

    store: Path = args.store
    if not store.is_dir():
        print(f"FEHLER: Store-Pfad ist kein Verzeichnis: {store}", file=sys.stderr)
        return 2

    berechner = FakeBerechner()
    print(f"FAKE — {WORKER_NAME} startet gegen Store {store} (kein bpy, kein echter Blender-Lauf).")
    while True:
        bericht = fuehre_pass_aus(store, berechner)
        _drucke_bericht(bericht)
        if args.einmal:
            break
        time.sleep(max(0.0, args.intervall))
    return 0


if __name__ == "__main__":
    raise SystemExit(cli())
