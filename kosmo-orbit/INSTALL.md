# KosmoOrbit — Installation (Ergänzungen)

Die vollständige Installationsanleitung (Desktop-Installer je Plattform,
iPad, Betriebsarten) steht in `docs/INSTALL.md`. Dieser Datei sammelt
kurze, werkzeugspezifische Ergänzungsabschnitte.

## Wissens-Import (Docling)

Stream D (v0.6.8) — lokal-first PDF→Markdown-Wissens-Ingest, siehe
`tools/docling-ingest/README.md` für Details.

**Aufruf:**

```bash
cd kosmo-orbit
python3 tools/docling-ingest/ingest.py <pdf-pfad>            # echte Konvertierung (braucht Docling)
python3 tools/docling-ingest/ingest.py <pdf-pfad> --fake      # deterministische Fixture, kein Docling nötig
```

Ergebnis landet standardmässig in `wissen/vault/Import/` (Markdown-Notiz +
`.meta.json`) und erscheint danach in KosmoOrbit unter **KosmoData → Wissen
→ Import**.

**Die drei Ehrlichkeitsstufen:**

1. Docling installiert → echte Konvertierung, `werkzeug: docling` in der Notiz.
2. Docling fehlt (Standardfall ohne `--fake`) → deutliche Fehlermeldung auf
   stderr, Exit-Code ≠ 0, **keine** Datei wird angelegt.
3. `--fake` → deterministische Fixture-Notiz (`werkzeug: fixture`) ohne
   Docling und ohne das PDF wirklich zu lesen — für Tests/Demos.

**Optionaler Docling-Install** (nicht Teil der Projekt-Abhängigkeiten,
eigene virtuelle Umgebung empfohlen):

```bash
python3 -m venv .venv-docling && source .venv-docling/bin/activate
pip install docling
```

Granite-Docling-258M (VLM-Variante) ist ein dokumentierter HomeStation-
Posten (GPU-Inferenz), in v0.6.8 nicht angeschlossen.
