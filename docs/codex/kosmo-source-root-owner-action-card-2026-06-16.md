# Kosmo Source-Root Owner Action Card

Generated: 2026-06-16T12:30:32.958Z
Status: `source_root_owner_action_satisfied_metadata_only`

## Current State

- Owner action required: no
- Data mount visible: yes
- Data mount free GiB: 3243.3
- Archive mount visible: yes
- OneDrive marker files: 59
- Probable large private libraries: 0
- Workflow mirrors: 68
- Selected decision: select_existing_root_for_private_diagnostic
- Selected root: `/mnt/archiv/ArchitekturKosmos/Assets`
- Private diagnostic allowed: yes
- Recommended decision: `already_allowed`
- Public-ready after card: 0

## Decision File

File: `examples/kosmo-references/provenance/source-root-decision-session-2026-06-16.json`

Fields to set only after owner confirmation:
- `status`
- `selected_decision`
- `selected_root_path`
- `owner_confirmation_note`

## Candidate Roots

| Candidate | Score | Caution |
| --- | ---: | --- |
| `/mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC/KosmoWebsite` | 70 | workflow/project mirror; likely not the full private architecture library |
| `/mnt/archiv/ArchitekturKosmos/Assets/Claude to Blender/abgabe/TKB_Bibliothek_Live-Final-Test_Abgabe` | 60 | archive path; verify it is an own mounted archive disk |
| `/mnt/archiv/ArchitekturKosmos/Assets/Claude to Blender/Ai Architektur Workflow/PBR Library + HDRI` | 60 | archive path; verify it is an own mounted archive disk |
| `/mnt/archiv/01 ArchitekturKosmos Projekt/00 Einrichtung Home_PC/KosmoWebsite` | 52 | workflow/project mirror; likely not the full private architecture library |
| `/mnt/archiv/ArchitekturKosmos/Assets` | 52 | archive path; verify it is an own mounted archive disk |
| `/mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC` | 48 | OneDrive-like path; verify sync markers and completeness |
| `/mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC/KosmoWebsite/repo-context` | 48 | workflow/project mirror; likely not the full private architecture library |
| `/mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC/KosmoWebsite/reports` | 48 | workflow/project mirror; likely not the full private architecture library |

## Exact Next Commands After Owner Edit

- `npm run kosmo:storage-mount-snapshot`
- `npm run kosmo:source-root-locator`
- `npm run kosmo:source-root-selection-brief`
- `npm run kosmo:source-root-decision-session-check`
- `npm run kosmo:source-root-blocker-refresh`
- `npm run kosmo:source-root-activation-preflight`
- `npm run kosmo:private-metadata-inventory`
- `npm run kosmo:private-metadata-inventory-fixture-smoke`
- `npm run kosmo:private-metadata-inventory-check`
- `npm run kosmo:day-batch-loop`

## Still Forbidden

- private OCR or PDF/book text extraction
- copying private scans, images, plans or lecture material into Git
- public-ready promotion for Sogn Benedetg, Ingenbohl or source-dependent assets
- local LLM tasks that read private file contents

## Owner Prompt

- Source-root owner action is satisfied for metadata diagnostics only.
- Continue with guarded private metadata inventory and output checks.
