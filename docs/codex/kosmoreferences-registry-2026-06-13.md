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

## Lokaler Check

Die Registry kann lokal geprueft werden:

```bash
npm run kosmo:references-registry-check
```

Der Check liest die Registry, oeffnet die referenzierten JSON-Manifeste und
Report-JSONs, prueft IDs, Statuswerte, Review-Reports, Public-Ready-Flags,
Source-Package-Verknuepfungen und Asset-Library-Policies.

Output:

```text
out/kosmoreferences-registry/registry-check.generated.json
out/kosmoreferences-registry/registry-check.generated.md
```

Fuer ein versioniertes Handoff:

```bash
npm run kosmo:references-registry-check -- --out examples/kosmo-references/registry/review
```
