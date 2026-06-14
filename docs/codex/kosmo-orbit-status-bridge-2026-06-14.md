# Kosmo Orbit Status Bridge

Generated: 2026-06-14T07:43:07.789Z
Status: `orbit_bridge_ready_with_blockers`

## Summary

- Cards: 7
- Blocking cards: 1
- Owner action cards: 4
- Source root blocked: yes
- Day batch: day_batch_loop_passed_review_only
- Innovation smoke: innovation_smoke_passed_review_only
- Public-ready after bridge: 0

## Orbit Cards

| Card | Status | Owner Action | Signal |
| --- | --- | --- | --- |
| `day-batch` Daily Batch | ready | no | 16/16 required steps |
| `source-root` Source Root | blocked | yes | blocked: 0 probable libraries, 59 OneDrive markers |
| `pilot-references` Pilot References | review_only | yes | 3 pilots, 12 evidence gaps |
| `kosmoasset` KosmoAsset | review_only | yes | 6 human reviews open, public-ready 0 |
| `worker-boundary` Worker Boundary | locked | no | 3 workers, 3 blocked command classes |
| `innovation` Innovation Lanes | review_only_ready | no | 4/5 public-safe smoke checks passed |
| `owner-handoff` Owner Handoff | ready | yes | 6 questions, no filled answers recorded |

## Recommended Orbit Sections

- `status_strip`
- `source_root_blocker_card`
- `pilot_reference_cards`
- `worker_boundary_card`
- `innovation_lane_card`
- `owner_handoff_card`

## Next Actions

- KosmoOrbit can render orbit_cards as a read-only dashboard.
- Do not add action buttons for blocked private commands until source-root passes.
- Use owner_action_required cards to prepare the next owner review conversation.
