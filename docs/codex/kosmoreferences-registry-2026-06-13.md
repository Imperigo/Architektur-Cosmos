# KosmoReferences Registry

Stand: 2026-06-13

Die kleine Registry liegt hier:

```text
data/kosmoreferences-registry.json
```

Sie ist eine Karte fuer Worker und UI, nicht die Quelle selbst. Sie referenziert
die aktuellen, versionierten Artefakte:

- Source-Packages;
- Entry-Drafts;
- KosmoAsset-Pilotbibliothek;
- Referenzpiloten.

## Aktueller Inhalt

### Source-Packages

- `codex-markitdown-smoke-2026-06-13`
  - MarkItDown-Test fuer textlastige PDFs und kartenlastige PDFs.
  - Status: `passed`.
- `kapelle-sogn-benedetg-public-source-candidate-2026-06-13`
  - Link-only public-source candidate fuer Schweizer Holzbau.
  - Status: `passed`.

### Entry-Drafts

- `kapelle-sogn-benedetg`
  - review-only Draft.
  - nicht public-ready.
  - validiert mit `archive-entry-draft`.

### Asset Libraries

- `codex-pilot-library`
  - erster gemischter KosmoAsset-Pilot fuer 2D, 3D, Material, Detail und
    Exportprofil.

## Arbeitsregel

Diese Registry darf von KosmoOrbit, Claude und lokalen LLMs gelesen werden,
aber nicht als Freigabe fuer Public-Publishing interpretiert werden.

Public-ready ist ein Objekt erst, wenn Source-Package, Rechte-Gate,
Entry-/Asset-Review und Medien-/Modellpolitik jeweils gruen sind.
