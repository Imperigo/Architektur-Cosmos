# Kosmo Innovation Smoke

Generated: 2026-06-16T05:30:24.900Z
Status: `innovation_smoke_passed_review_only`

## Summary

- Checks: 5
- Passed: 5
- Skipped: 0
- Failures: 0
- Public-ready after smoke: 0
- Fixture root: `examples/kosmo-innovation-smoke-2026-06-16`

## Checks

| Lane | Status | Evidence |
| --- | --- | --- |
| `markitdown_prepare_m2` | passed | Converted synthetic fixture to examples/kosmo-innovation-smoke-2026-06-16/markitdown-output.md. |
| `local_ocr_scanned_sources` | passed | Recognized synthetic OCR fixture at confidence 0.992; wrote examples/kosmo-innovation-smoke-2026-06-16/ocr-contract.generated.json. |
| `qwen_embedding_rag` | passed | Wrote public-safe embedding contract examples/kosmo-innovation-smoke-2026-06-16/embedding-contract.generated.json. |
| `ifcopenshell_geometry_lane` | passed | Reviewed existing demo IFC with 13/13 checks; wrote examples/kosmo-innovation-smoke-2026-06-16/ifcopenshell-semantic-review.generated.json. |
| `paper2poster_publish_lane` | passed | Wrote public-safe layout contract examples/kosmo-innovation-smoke-2026-06-16/publish-layout-contract.generated.json. |

## Next Actions

- Install missing tools only in isolated environments when owner confirms the lane.
- Keep private source OCR, conversion and embeddings blocked until source-root gates pass.
- Use the generated layout and embedding contracts as the next implementation targets for KosmoPrepare/KosmoPublish.
