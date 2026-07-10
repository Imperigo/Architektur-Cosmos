# Docling-Wissens-Ingest

Stream D (v0.6.8) — Übernahme aus der AI-Scan-Auswertung 0.6.8
(`docs/AI-SCAN-AUSWERTUNG-0.6.8.md` §1.1 und §2a): **Docling v2**
(IBM, Apache 2.0 laut Scan — nicht selbst verifiziert) ist eine lokale,
halluzinationsarme PDF→Markdown/JSON-Extraktion (VLM-gestützt, kein
gesonderter OCR-Vorschritt). Dieses Werkzeug ist der lokal-first
Ingest-Unterbau: PDF hinein, eine Markdown-Notiz im Wissens-Vault heraus —
nach dem Vorbild von `tools/homestation-bridge` (Python-Werkzeug im
`tools/`-Ordner, reines stdlib-Gerüst, schwere Abhängigkeit nur lazy
importiert).

## Zweck

`wissen/vault/Import/` ist der Sammelort für alles, was Andrin (oder Kosmo)
aus einem PDF ins Vault holt, bevor es kuratiert/verschoben wird. Der
KosmoData-Wissen-Tab (`apps/kosmo-orbit/src/modules/data/DataWorkspace.tsx`,
`KosmoWissenView`) zeigt diese Importe als eigene Sektion — jeder Eintrag mit
einer Herkunftszeile «Import · ‹werkzeug› · ‹datum›» aus der Frontmatter.

## Aufruf

```bash
cd kosmo-orbit
python3 tools/docling-ingest/ingest.py <pdf-pfad>              # echte Konvertierung (braucht Docling)
python3 tools/docling-ingest/ingest.py <pdf-pfad> --fake        # deterministische Fixture, kein Docling nötig
python3 tools/docling-ingest/ingest.py <pdf-pfad> --ziel <ordner>  # anderes Ziel als wissen/vault/Import/
```

Ausgabe je Lauf, im Zielordner (Default `wissen/vault/Import/`, Repo-Wurzel —
Geschwister von `kosmo-orbit/`):

- `<slug>-<zeitstempel>.md` — Markdown-Notiz mit Frontmatter
  (`titel`, `quelle-dateiname`, `importiert-am`, `werkzeug`, optional
  `seiten`, `tags: [import]`) im Stil der Release-Notizen unter
  `wissen/vault/Releases/`.
- `<slug>-<zeitstempel>.meta.json` — Werkzeug, Version, Dauer (s), Seitenzahl,
  Warnungen.

Zusätzlich regeneriert jeder Lauf
`apps/kosmo-orbit/public/wissen/import.json` — ein schlankes Manifest über
ALLE Notizen im Zielordner (Vollregeneration wie
`wissen/tools/export-webbasis.py`), das der Wissen-Tab per `fetch()` lädt.

## Die drei Ehrlichkeitsstufen (kein stilles Weiterlaufen, nichts vorgetäuscht)

1. **Docling installiert → echte Konvertierung.**
   `from docling.document_converter import DocumentConverter` (lazy, nur in
   diesem Zweig importiert), `DocumentConverter().convert(pdf).document
   .export_to_markdown()`. Frontmatter trägt `werkzeug: docling`, Meta-JSON
   die echte Docling-Version, gemessene Dauer und — wenn Docling sie liefert
   — die Seitenzahl.
2. **Docling NICHT installiert (Standardfall ohne `--fake`) → Fehlausgang.**
   Klare deutsche Meldung auf stderr:
   `Docling ist nicht installiert — pip install docling; für Tests: --fake`,
   Exit-Code ≠ 0. Es wird **keine** Datei angelegt — kein Zielordner, kein
   Manifest-Update. Kein Vortäuschen einer Extraktion.
3. **`--fake` → deterministische Fixture, bewusst OHNE Docling und OHNE das
   PDF wirklich zu lesen.** Fester Beispiel-Markdown-Inhalt, der nur den
   Dateinamen des PDFs einbettet (der Pfad muss dafür nicht einmal
   existieren). Frontmatter trägt `werkzeug: fixture` — wird **nie** als
   echte Extraktion ausgegeben. Für Tests/Demos, wenn kein Docling zur
   Verfügung steht.

## Echtlauf-Beleg (Stream-D-Auftrag: Scheitern wird dokumentiert, nicht kaschiert)

`pip install docling` wurde **in einer isolierten venv** ausserhalb des
Repos versucht (`pip install --cert /root/.ccr/ca-bundle.crt docling`, über
den vorkonfigurierten Egress-Proxy) — **gelungen**: `docling==2.111.0` samt
Abhängigkeiten (Torch, docling-core, docling-ibm-models, RapidOCR-Modelle
…) installierte vollständig, keine Proxy-/PyPI-Blockade.

Danach ein aus reinem Python erzeugtes Mini-PDF (eine Seite, handgeschriebene
PDF-Struktur ohne externe Bibliothek, siehe unten) **ohne `--fake`** durch
`ingest.py` geschickt — die echte Stufe (a):

```
$ python3 tools/docling-ingest/ingest.py mini-testdokument.pdf --ziel /tmp/real-out
Notiz geschrieben: mini-testdokument-20260710-131854.md (1 Seiten, 26.07s)
Metadaten: mini-testdokument-20260710-131854.meta.json
```

Ergebnis-Notiz (gekürzt):

```markdown
---
titel: "mini-testdokument"
quelle-dateiname: "mini-testdokument.pdf"
importiert-am: "2026-07-10T13:18:54Z"
werkzeug: docling
seiten: 1
tags: [import]
---

## KosmoOrbit Docling Testdokument

Diese Seite belegt die echte Docling-Konvertierung.

Stream D, v0.6.8, Baubuero Andrin.
```

`.meta.json`: `{"werkzeug": "docling", "version": "2.111.0", "dauer_s": 26.07,
"seiten": 1, "warnungen": []}` — Text wurde ECHT aus dem PDF gelesen (Titel,
beide Absätze exakt wie im Quell-PDF), Version über
`importlib.metadata.version('docling')` ermittelt, Dauer real gemessen.

**Ehrlich eingeordnet:** dieser Beleg lief in einer separaten venv unter
`/tmp`, NICHT in `kosmo-orbit/`s eigener Python-Umgebung (das Projekt hat
keine eigene) — Docling ist damit **nicht** Teil des committeten Repo-Setups
und muss vor einer echten Nutzung lokal installiert werden (`pip install
docling`). Zusätzlich wurde `test_ingest.py` mit **installiertem** Docling
erneut durchlaufen (26/26 Prüfungen weiterhin grün) — die
`sys.modules`-Injektion in Fall 2 erzwingt den Fehlausgang unabhängig vom
tatsächlichen Installationsstand, das Werkzeug wechselt also verlässlich
zwischen Stufe (a) und (b) je nach Umgebung, nicht nur in der Theorie.

`--fake` (Stufe c) bleibt trotzdem der Pfad, mit dem `v0.6.8` im Haupt-
Container gebaut und in den Gates getestet wurde — Docling ist bewusst KEINE
neue Projekt-Abhängigkeit (kein `pyproject.toml`/`requirements.txt`-Eintrag
in diesem Ordner), damit `npm install && npm run build` weiterhin ohne
Python-ML-Stack durchläuft.

## Tests

```bash
python3 tools/docling-ingest/test_ingest.py
```

Reines `assert`/Exit-Code-Skript ohne pytest (gleiches Muster wie
`tools/homestation-bridge/test_bridge_haerte.py`) — im Cloud-Container läuft
nur `python3` mit den Standardpaketen verlässlich. Deckt ab: Determinismus
von `--fake` (zwei Läufe mit demselben injizierten Zeitstempel `--jetzt`
erzeugen byte-identische Markdown- **und** Metadaten-Dateien), den
Fehlausgang ohne Docling (Exit-Code ≠ 0, deutsche stderr-Meldung, keine
Datei wird angelegt — Docling-Abwesenheit wird über einen
`sys.modules`-Eintrag erzwungen, damit der Test unabhängig vom
tatsächlichen Installationsstand im Container bleibt), vollständige
Frontmatter-Felder und die Manifest-Regeneration.

## HomeStation-Hinweis: Granite-Docling-258M (VLM) — dokumentiert, nicht eingebaut

Die AI-Scan-Auswertung nennt **Granite-Docling-258M** (IBM, Apache 2.0 laut
Scan) als VLM-gestützte Docling-Variante — potenziell präziser bei
Layout/Tabellen, aber ein eigenes lokales Vision-Language-Modell (mehrere
hundert MB, GPU-Inferenz sinnvoll). Das ist ein **HomeStation-Posten**
(RTX 5090), analog zu Whisper/Ollama in `tools/homestation-bridge`: hier NUR
benannt, nicht angeschlossen. Der Standard-Docling-Pfad oben läuft ohne VLM
und ohne GPU (CPU-Modelle für Layout/OCR).

## Markitdown (dokumentierte Alternative, kein zweiter Pfad)

Die AI-Scan-Auswertung nennt zusätzlich **Markitdown** (Microsoft, MIT) als
leichten PDF/Office→Markdown-Konverter — eine mögliche Fallback-/Vorstufe für
Dateitypen, die Docling nicht abdeckt (z.B. reine Office-Formate). In v0.6.8
bewusst **nur dokumentiert**, kein zweiter Ingest-Pfad: ein Werkzeug, eine
Ehrlichkeitsleiter, damit `wissen/vault/Import/` nicht zwei unterschiedliche
Qualitätsversprechen gleichzeitig trägt.

## Siehe auch

- `docs/AI-SCAN-AUSWERTUNG-0.6.8.md` — Quelle des Auftrags, Lizenz-/Quellenlage.
- `wissen/tools/export-webbasis.py` — dasselbe Grundmuster (Vault → statisches
  JSON-Bündel → App lädt es), hier für Trainings-Korpora statt Importe.
- `tools/homestation-bridge/README.md` — Vorbild für Struktur und
  Ehrlichkeits-Ton dieses Werkzeugs.
