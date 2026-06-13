# KosmoReferences Model Promotion Dry Run

Datum: 2026-06-13

Codex hat fuer Villa Savoye und Ingenbohl die trockene Modell-Promotion
ausgefuehrt, ohne Public-Confirmation:

```bash
npm run brain:promote-model -- --entry villa-savoye
npm run brain:promote-model -- --entry alterszentrum-kloster-ingenbohl
```

## Ergebnis

| Entry | Status | Public Files | Public Manifest | Failed Checks |
| --- | --- | ---: | ---: | ---: |
| Villa Savoye | `ready_for_owner_confirmation` | nein | nein | 0 |
| Ingenbohl | `ready_for_owner_confirmation` | nein | nein | 0 |

## Checks

Beide Dry-Runs bestanden:

- `local_review_glb`
- `geometry_profile`
- `model_tool_run`
- `glb_header`
- `tool_run_status`

## Guardrail

Das ist kein Public-Promote. Es wurden keine Dateien kopiert, kein
`public-model-previews`-Manifest geaendert, nichts zu R2/D1 geschrieben und
keine Public-Rechte freigegeben.

Naechster Schritt waere nur nach Owner/Human Review:

```bash
npm run brain:promote-model -- --entry <entry> --confirm-public-model
```
