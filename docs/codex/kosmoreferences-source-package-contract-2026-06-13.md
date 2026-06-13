# KosmoReferences Source-Package Contract

Stand: 2026-06-13

`schema/kosmo-source-package.schema.json` fuehrt einen kleinen Vertrag fuer
Quellenpakete ein. Der Vertrag ist fuer lokale Review-Pakete gedacht, nicht
fuer oeffentliche Wiedergabe von Buchseiten, Vorlesungsunterlagen oder
geschuetzten Plaenen.

## Zweck

KosmoReferences braucht eine belastbare Kette:

```text
source file
  -> extraction artifact
  -> candidate project
  -> review gates
  -> entry draft / asset plan
```

Der Vertrag speichert deshalb:

- Quellen mit Pfad, Typ, Rolle, Rechten, Hash und Dateigroesse.
- Extraktionsartefakte wie Markdown, OCR-JSON oder Layout-JSON.
- Kandidatenprojekte mit Confidence und Promotion-Status.
- Review-Gates fuer Rechte, Textqualitaet, Layoutqualitaet, Entry-Mapping,
  Asset-Mapping und Public/Private-Split.

## Beispiel

Beispielpaket:

```text
examples/kosmo-references/source-packages/codex-markitdown-smoke-2026-06-13/source-package.json
```

Dieses Paket dokumentiert den MarkItDown-Smoke vom 2026-06-13:

- ArchitekturKosmos Workflow-PDF: gute Markdown-Extraktion.
- Villa Savoye UNESCO-Maps-PDF: schwache Text-Extraktion, weil kartenlastig.

Die eigentlichen Markdown-Outputs bleiben unter `out/` und sind gitignored.

## Pipeline-Regel

Dokumenttyp entscheidet die erste Verarbeitung:

| Dokumenttyp | Erste Spur | Zweite Spur |
|---|---|---|
| textbasierte PDF | MarkItDown | manuelle Quellenpruefung |
| Office-Dokument | MarkItDown | manuelle Quellenpruefung |
| Buchscan | OCR/Vision | Layout-/Caption-Erkennung |
| Plan/Karte | Layout/Vision | Geometrie-/Planlayer-Erkennung |
| Web-/Office-Quelle | Link/Metadaten | Rechtepruefung |

## Public/Private Split

Private Quellen duerfen intern genutzt werden fuer:

- OCR;
- private Markdown-Artefakte;
- Quellenkarten;
- eigene Zusammenfassungen;
- private Drafts.

Oeffentlich erlaubt ist erst nach Review:

- Metadaten;
- Links/Zitationen;
- eigene Analyse;
- public-safe Medien/Modelle/Assets.

Der Vertrag verhindert nicht alle Fehler automatisch, aber er macht sie
sichtbar genug, dass Claude, Codex, lokale LLMs und KosmoOverseer dieselbe
Quellenlage lesen koennen.
