# KosmoReferences Model Provenance Bridge

Datum: 2026-06-13

Codex hat die vorhandenen Public-Preview-GLBs fuer Villa Savoye und Ingenbohl
gegen die `archive-intake`-Build-Artefakte abgeglichen.

## Ergebnis

| Entry | Public GLB | Intake GLB | Hash Match | Brain Review |
| --- | --- | --- | --- | --- |
| Villa Savoye | `public/archive-models/villa-savoye/low.glb` | `archive-intake/villa-savoye/models/low.glb` | ja | 92 / `ready_for_promote_review` |
| Ingenbohl | `public/archive-models/alterszentrum-kloster-ingenbohl/low.glb` | `archive-intake/alterszentrum-kloster-ingenbohl/models/low.glb` | ja | 100 / `ready_for_promote_review` |

`npm run brain:model-review -- --entry villa-savoye,alterszentrum-kloster-ingenbohl`
meldete:

- reviewed: 2
- ready for promote review: 2
- needs layer work: 0
- missing GLB: 0
- average score: 96

## Wichtige Grenze

`ready_for_promote_review` heisst nicht public-safe. Es heisst nur:

- GLB existiert im Intake;
- GLB parsed korrekt;
- Geometry Profile existiert;
- Tool-Run existiert;
- Blender Import Profile existiert;
- Layer/Material-Namen sind fuer den Review lesbar.

Beide Modelle bleiben `derived_asset_review_required` und `public_ready=false`,
bis Owner/Human Review Geometriebasis, Quellenstatus und nicht-vermessenen
Studiencharakter explizit freigibt.

## Evidence Refs

- `archive-intake/villa-savoye/automation/model-tool-run.json`
- `archive-intake/villa-savoye/analysis/generated-geometry-profile.json`
- `archive-intake/villa-savoye/automation/blender-import-profile.json`
- `archive-intake/villa-savoye/models/model-package.manifest.json`
- `archive-intake/alterszentrum-kloster-ingenbohl/automation/model-tool-run.json`
- `archive-intake/alterszentrum-kloster-ingenbohl/analysis/generated-geometry-profile.json`
- `archive-intake/alterszentrum-kloster-ingenbohl/automation/blender-import-profile.json`
- `archive-intake/alterszentrum-kloster-ingenbohl/models/model-package.manifest.json`
- `out/brain-model-review/2026-06-13/latest.json`
- `examples/kosmo-references/provenance/model-provenance-bridge-2026-06-13.json`
