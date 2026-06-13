# KosmoReferences Night Batch Status

Datum: 2026-06-13

## Stand

Codex hat die ersten drei KosmoReferences-Piloten weiter in eine kontrollierte
Data-Lane gebracht:

- Villa Savoye
- Kapelle Sogn Benedetg
- Alterszentrum Kloster Ingenbohl

## Harte Zahlen

- Source-Packages: 5
- Entry-Drafts: 3
- Asset-Libraries: 2
- Library Assets: 11
- Public-ready Assets: 0
- Blockierte Public-Promotions: 32
- Public-Source-Links erreichbar: 14/14
- Villa File-Provenance: 7/7 Dateien geprueft, 0 public-ready
- Ingenbohl File-Provenance: 1/1 Datei geprueft, 0 public-ready
- Sogn File-Provenance: 0 lokale Dateien
- Model Review: Villa 92, Ingenbohl 100, Average 96
- Model Promotion Dry-Run: 2/2 `ready_for_owner_confirmation`, 0 public writes

## Neue Gates

- Source-Package Link Availability:
  `npm run kosmo:source-package-link-check`
- Model Provenance Bridge:
  `examples/kosmo-references/provenance/model-provenance-bridge-2026-06-13.json`
- Model Promotion Dry-Run:
  `examples/kosmo-references/provenance/model-promotion-dry-run-2026-06-13.json`
- Owner Review Decision Pack:
  `examples/kosmo-references/provenance/owner-review-decision-pack-2026-06-13.json`

## Wichtigste Entscheidungen

1. Keine automatische Public-Promotion.
2. Villa hat drei Bildkandidaten, aber alle bleiben bis Human Review blockiert.
3. Villa und Ingenbohl haben technisch gute GLB-Reviews, bleiben aber
   `derived_asset_review_required`.
4. Sogn Benedetg bleibt link-only, weil die grosse private Buch-/ETH-/HSLU-
   Library in den sichtbaren Mounts nicht auffindbar ist.
5. `/mnt/archiv` wirkt leer oder nicht befuellt; realer Library-Pfad muss
   bestaetigt werden.

## Naechste sinnvolle Loops

1. Owner/Human Review fuer Villa-Bildkandidaten und Modellstatus durchfuehren.
2. Realen privaten Library-Pfad mounten/synchronisieren.
3. Danach Sogn Benedetg aus Buechern/Vorlesungen vertiefen.
4. Erst nach Entscheidungen Public-Manifeste oder `--confirm-public-model`
   verwenden.
