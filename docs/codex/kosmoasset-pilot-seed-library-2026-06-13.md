# KosmoAsset Pilot Seed Library

Datum: 2026-06-13

Codex hat eine lokale, review-only KosmoAsset Seed-Library fuer die drei
KosmoReferences-Piloten angelegt.

## Dateien

- `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json`
- `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-library-check.generated.json`
- `examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-library-check.generated.md`

## Inhalt

6 geplante Assets:

- Villa Savoye concrete/frame material study;
- Villa Savoye five-points diagram kit;
- Sogn Benedetg wood-shingle material study;
- Sogn Benedetg light-band detail study;
- Ingenbohl mineral/pigment material study;
- Ingenbohl concrete core/frame structure study.

Alle Assets sind:

- `generated_needs_review`;
- `public_use_allowed=false`;
- `local_only=true`;
- planned-only, also noch ohne echte exportierte Dateien.

## Check

`npm run kosmo:asset-library-check -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json`

Resultat:

- Status: `passed`
- Assets: 6
- Failures: 0
- Warnings: 0
- Public ready: 0

Der Asset-Checker erkennt inzwischen auch neue
`examples/kosmo-references/entry-drafts/*.entry-draft.json`, deshalb ist Sogn
Benedetg als KosmoData-Kontextziel aufgeloest, obwohl der alte
`data/mock-entries.json`-Store noch nicht erweitert wurde.

## Registry / Provenance

Die Library ist in `data/kosmoreferences-registry.json` eingetragen.

Nach Regeneration:

- Asset Libraries: 2
- Public-ready Assets: 0
- Blocked Public Promotions: 32
- Data-Lane Status: `passed_review_only`

## Naechster Schritt

Sogn spaeter aus dem Entry-Draft in die kanonische Entry-/D1-Struktur
ueberfuehren. Bis dahin bleiben Draft-basierte Asset-Kontextberichte
review-only.
