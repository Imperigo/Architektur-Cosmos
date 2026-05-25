# kosmo-demo-001 Context Review

Generated: 2026-05-25T17:38:35.095Z
Project path: `examples/kosmo-projects/kosmo-demo-001`
Status: `review_required`
Approved for design generation: no

## Summary

- candidates: 2
- undecided: 2
- accepted as context: 0
- accepted as design seed: 0
- needs more source review: 0
- rejected: 0

## Candidate Decisions

| Candidate | Kind | Confidence | Current | Recommended | Priority |
| --- | --- | --- | --- | --- | --- |
| context-origin | project_origin | low | undecided | needs_more_source_review | high |
| context-perimeter | site_perimeter | low | undecided | needs_more_source_review | high |

## Review Commands

### context-origin

Rationale: Fallback or low-confidence origin should be checked against reviewed project coordinates before use.

Required checks:
- Verify LV95/WGS84/project origin against source files.
- Confirm unit convention and north rotation.

Warnings:
- Fallback origin; add reviewed project coordinates before measured work.

Suggested command:

```bash
npm run kosmo:context-review -- --project examples/kosmo-projects/kosmo-demo-001 --decision context-origin=needs_more_source_review --reviewed-by "Local Reviewer"
```

### context-perimeter

Rationale: Fallback perimeter is only a frame and must not become a parcel or design boundary.

Required checks:
- Compare with parcel/site boundary source.
- Mark whether this is frame, parcel, plot, competition area or study area.

Warnings:
- Perimeter is a context frame, not a verified parcel boundary.

Suggested command:

```bash
npm run kosmo:context-review -- --project examples/kosmo-projects/kosmo-demo-001 --decision context-perimeter=needs_more_source_review --reviewed-by "Local Reviewer"
```

## Next Actions

- Review 2 undecided context candidate(s).
- Start with 2 high-priority undecided candidate(s).

