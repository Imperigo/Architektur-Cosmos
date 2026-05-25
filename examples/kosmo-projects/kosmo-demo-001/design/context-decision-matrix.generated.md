# Context Decision Matrix

Project ID: `kosmo-demo-001`
Generated: 2026-05-25T17:38:35.087Z

This file is advisory. The human decision source of truth remains `design/context-selection.json`.

## Summary

- candidates: 2
- recommended context-only: 0
- recommended design seed: 0
- recommended source review: 2
- recommended rejected: 0
- current undecided: 2

## Matrix

| Candidate | Kind | Confidence | Current | Recommendation | Design seed later | Priority | Required checks |
| --- | --- | --- | --- | --- | --- | --- | --- |
| context-origin | project_origin | low | undecided | needs_more_source_review | no | high | Verify LV95/WGS84/project origin against source files.; Confirm unit convention and north rotation. |
| context-perimeter | site_perimeter | low | undecided | needs_more_source_review | no | high | Compare with parcel/site boundary source.; Mark whether this is frame, parcel, plot, competition area or study area. |

## Notes

- `context-origin`: Fallback or low-confidence origin should be checked against reviewed project coordinates before use.
- `context-perimeter`: Fallback perimeter is only a frame and must not become a parcel or design boundary.

