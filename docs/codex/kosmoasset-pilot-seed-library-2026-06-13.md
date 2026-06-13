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
- Warnings: 2
- Public ready: 0

Die zwei Warnungen betreffen Sogn Benedetg: Der neue Entry-Draft existiert, ist
aber noch nicht im alten `data/mock-entries.json`-Set. Das ist ein Bridge-Gap,
kein Grund fuer Public-Promotion.

## Registry / Provenance

Die Library ist in `data/kosmoreferences-registry.json` eingetragen.

Nach Regeneration:

- Asset Libraries: 2
- Public-ready Assets: 0
- Blocked Public Promotions: 32
- Data-Lane Status: `passed_review_only`

## Naechster Schritt

Sogn als echte KosmoData/KosmoReferences-Bruecke sauber in die Entry-/Mock- oder
zukuenftige D1-Struktur ueberfuehren, bevor Asset-Kontextberichte fuer Sogn als
vollstaendig gelten.
