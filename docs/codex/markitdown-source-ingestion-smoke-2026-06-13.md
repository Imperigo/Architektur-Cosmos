# MarkItDown Source-Ingestion Smoke

Stand: 2026-06-13

## Installation

MarkItDown wurde lokal und isoliert installiert:

```text
/mnt/data/ArchitekturKosmos/tools/markitdown-venv
```

Installation:

```bash
uv venv /mnt/data/ArchitekturKosmos/tools/markitdown-venv --python 3.12
uv pip install --python /mnt/data/ArchitekturKosmos/tools/markitdown-venv/bin/python 'markitdown[all]'
```

Hinweis:

- `uv venv` erstellte das Venv ohne `pip`; Installation lief deshalb ueber
  `uv pip`.
- `markitdown --help` meldet eine harmlose `pydub`-Warnung zu fehlendem
  `ffmpeg`. Fuer PDF/Office-Konvertierung ist das nicht kritisch; Audio/Video
  waere davon betroffen.

## Smoke-Test

Output liegt lokal und gitignored unter:

```text
out/codex-markitdown-smoke/2026-06-13/
```

### Test 1: ArchitekturKosmos AI Workflow Pipeline

Input:

```text
/mnt/data/ArchitekturKosmos/11_AI_Workflow/OneDrive_2026-06-09/00 Architekturkosmos Zentrale/Architekturkosmos_AI_Workflow_Pipeline_Projekt_Dokument.pdf
```

Output:

```text
out/codex-markitdown-smoke/2026-06-13/architekturkosmos-ai-workflow-pipeline.md
```

Befund:

- ca. 20 KB Markdown.
- Gute Textextraktion.
- Titel, Legende, Pipeline-Rollen und Fliesstext sind brauchbar fuer
  KosmoReferences/KosmoPrepare Source-Packs.

### Test 2: Villa Savoye UNESCO Maps

Input:

```text
archive-inbox/villa-savoye/sources/unesco-1321rev-maps.pdf
```

Output:

```text
out/codex-markitdown-smoke/2026-06-13/villa-savoye-unesco-1321rev-maps.md
```

Befund:

- ca. 2 KB Markdown.
- Enthalten sind vor allem wiederholte Kopfzeilen und Kartennummern.
- Fuer karten-/bildlastige PDFs reicht MarkItDown allein nicht.

## Entscheidung

MarkItDown ist geeignet als erster lokaler Schritt fuer:

```text
textbasierte PDFs / Office-Dateien -> Markdown -> Source-Pack -> Draft/Review
```

Nicht ausreichend allein fuer:

```text
gescannte Plaene / Karten / Bildseiten -> semantische Plan- oder Projekterfassung
```

Dafuer braucht KosmoReferences spaeter eine zweite Spur:

```text
page image cleanup -> OCR/Vision model -> layout/region detection -> source map
```

## Relevanz Fuer KosmoReferences

MarkItDown sollte in die private Quellenpipeline aufgenommen werden, aber mit
klarem Dokumenttyp-Gate:

- `text_pdf`: MarkItDown-first.
- `office_doc`: MarkItDown-first.
- `scan_pdf`: MarkItDown optional, OCR/Vision required.
- `plan_or_map_pdf`: image/layout pipeline required.

Public-Regel:

Auch wenn MarkItDown Text extrahiert, bleibt die Ausgabe bei privaten Buechern,
Vorlesungen oder Wettbewerbsunterlagen privat. Oeffentlich duerfen daraus nur
Metadaten, Quellenhinweise und eigene Zusammenfassungen entstehen.
