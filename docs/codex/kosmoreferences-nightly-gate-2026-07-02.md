# KosmoReferences Nightly Gate

Generated: 2026-07-02T06:00:41.662Z
Status: `failed`

## Summary

- Steps passed: 8/9
- Duration: 9895ms
- Source packages: 9
- Web source packages: 3
- Public-ready assets: 0
- Blocked public promotions: 32
- Owner decision session: passed_pending_owner_input (0 selected / 10 pending)
- Private library: missing_report
- Local worker: passed (kosmo-qwen3-coder:30b-a3b-q4km)

## Steps

| Step | Status | Duration |
| --- | --- | ---: |
| `references-registry-check` | passed | 229ms |
| `references-provenance-check` | passed | 231ms |
| `source-package-link-check:alterszentrum-kloster-ingenbohl-public-source-candidate-2026-06-13` | passed | 1572ms |
| `source-package-link-check:kapelle-sogn-benedetg-public-source-candidate-2026-06-13` | passed | 4685ms |
| `source-package-link-check:villa-savoye-public-source-candidate-2026-06-13` | passed | 2139ms |
| `owner-review-decision-check` | passed | 277ms |
| `owner-decision-session-check` | passed | 237ms |
| `private-library-diagnostic` | passed | 272ms |
| `local-worker-ollama-smoke` | failed | 252ms |

## Source Packages

- `alterszentrum-kloster-ingenbohl-public-source-candidate-2026-06-13`: 5 web links / public_candidate
- `architecturekosmos-private-project-sources-2026-06-13`: 0 web links / private_research
- `codex-markitdown-smoke-2026-06-13`: 0 web links / private_research
- `kapelle-sogn-benedetg-public-source-candidate-2026-06-13`: 4 web links / public_candidate
- `kosmo-prepare-phase1-adapter-fixture-2026-06-15`: 0 web links / synthetic_fixture
- `kosmo-prepare-phase1-adapter-fixture-2026-06-16`: 0 web links / synthetic_fixture
- `kosmo-prepare-phase1-adapter-fixture-2026-06-30`: 0 web links / synthetic_fixture
- `kosmo-prepare-phase1-adapter-fixture-2026-07-01`: 0 web links / synthetic_fixture
- `villa-savoye-public-source-candidate-2026-06-13`: 5 web links / public_candidate

## Next Actions

- Fix failed nightly gate steps: local-worker-ollama-smoke.
- Owner selects the pending review decisions before any public promotion preparation.
- Keep all reference media review-only until explicit owner decisions and separate promotion checks pass.
- Mount or expose the private OneDrive/book library root before private-source matching can start.
