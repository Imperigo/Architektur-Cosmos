# KosmoDraw `plan_profile` v0.1 Intake

Status: review-only adapter ready

## ArchitectureCosmos decision

- `plan_profile` remains owned and versioned by KosmoDesign/KosmoDraw.
- ArchitectureCosmos consumes draft `schema_version: "0.1"` without declaring it final.
- The adapter maps `boundary_xy` to bundle `polygon_xy`.
- Wall axes become explicit start/end coordinates.
- Opening `position_t` becomes metric `position_m` from the host-wall length.
- Room stamps, dimension chains, grid and bounds remain available under a blocked `plan_profile` review object.
- The output is always `status: review_only`.
- The output always has `public_display_allowed: false`.
- No model, drawing or asset candidate is promoted by the adapter.
- The contract fixture is not rendered as a public architecture project.

## Commands

```bash
npm run public:plan-profile-adapter
npm run public:plan-profile-adapter-smoke
npm run public:bundle-check -- examples/kosmo-references/review/kosmodraw-plan-profile-adapted.review-only.json
```

## Cross-worker feedback

1. Keep `plan_profile` as a sibling contract with its own lifecycle.
2. Keep both `story_id` and `floor_level` in v0.1 until KosmoDesign completes the migration.
3. Add confidence/provenance fields later at the producer boundary; ArchitectureCosmos does not invent confidence.
4. A real project bundle may enter the public review lane only after owner review and rights/provenance checks.
