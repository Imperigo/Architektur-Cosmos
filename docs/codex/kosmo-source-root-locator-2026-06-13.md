# Kosmo Source-Root Locator

Generated: 2026-06-13T19:36:08.606Z
Status: `source_root_candidates_need_owner_selection`

## Summary

- Candidates: 708
- Probable large private libraries: 0
- Workflow/project mirrors: 64
- Archive-like roots: 164
- OneDrive-like roots: 38
- Roots with sync errors: 5
- Own mount candidates: 0
- Scanned dirs: 2927
- Scan truncated: no

## Top Candidates

| Path | Classification | Score | Book-like | Lecture-like | Sync errors | Signals |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| `/mnt/data/ArchitekturKosmos/11_AI_Workflow/OneDrive_2026-06-09/00 Einrichtung Home_PC/KosmoWebsite` | workflow_or_project_mirror | 38 | 3 | 107 | 0 | `onedrive_like`, `workflow_named`, `small_book_count`, `lecture_file_count` |
| `/mnt/data/ArchitekturKosmos` | possible_source_root | 32 | 12 | 205 | 0 | `small_book_count`, `lecture_file_count` |
| `/home/andrin-baumann/ArchitekturKosmos Onedrive` | incomplete_onedrive_candidate | 22 | 13 | 30 | 14 | `onedrive_like`, `small_book_count`, `sync_errors_visible` |
| `/mnt/archiv` | weak_path_signal | 20 | 0 | 0 | 0 | `archive_like` |
| `/mnt/data/_archive_logs` | weak_path_signal | 20 | 0 | 0 | 0 | `archive_like` |
| `/mnt/data/Zum_Archivieren` | weak_path_signal | 20 | 0 | 0 | 0 | `archive_like` |
| `/home/andrin-baumann/ArchitekturKosmos Onedrive/11 AI Workflow` | workflow_or_project_mirror | 16 | 16 | 22 | 0 | `onedrive_like`, `workflow_named`, `small_book_count` |
| `/home/andrin-baumann/ArchitekturKosmos Onedrive/11 AI Workflow/00 Architekturkosmos Zentrale` | workflow_or_project_mirror | 16 | 12 | 21 | 0 | `onedrive_like`, `workflow_named`, `small_book_count` |
| `/home/andrin-baumann/ArchitekturKosmos Onedrive/11 AI Workflow/00 Architekturkosmos Zentrale/01 Gestaltungskonzepte` | workflow_or_project_mirror | 16 | 3 | 3 | 0 | `onedrive_like`, `workflow_named`, `small_book_count` |
| `/mnt/data/ArchitekturKosmos/11_AI_Workflow/OneDrive_2026-06-09` | workflow_or_project_mirror | 16 | 18 | 83 | 0 | `onedrive_like`, `workflow_named`, `small_book_count` |
| `/mnt/data/ArchitekturKosmos/11_AI_Workflow/OneDrive_2026-06-09/00 Architekturkosmos Zentrale` | workflow_or_project_mirror | 16 | 12 | 13 | 0 | `onedrive_like`, `workflow_named`, `small_book_count` |
| `/mnt/data/ArchitekturKosmos/11_AI_Workflow/OneDrive_2026-06-09/00 Architekturkosmos Zentrale/01 Gestaltungskonzepte` | workflow_or_project_mirror | 16 | 3 | 3 | 0 | `onedrive_like`, `workflow_named`, `small_book_count` |
| `/mnt/data/ArchitekturKosmos/11_AI_Workflow/OneDrive_2026-06-09/00 Einrichtung Home_PC` | workflow_or_project_mirror | 16 | 3 | 59 | 0 | `onedrive_like`, `workflow_named`, `small_book_count` |
| `/mnt/data/ArchitekturKosmos/11_AI_Workflow/OneDrive_2026-06-09/00 Einrichtung Home_PC/ZUG_Volumenstudien_2026-06-08` | workflow_or_project_mirror | 16 | 1 | 5 | 0 | `onedrive_like`, `workflow_named`, `small_book_count` |
| `/mnt/data/ArchitekturKosmos/11_AI_Workflow/OneDrive_2026-06-09/alt` | workflow_or_project_mirror | 16 | 1 | 1 | 0 | `onedrive_like`, `workflow_named`, `small_book_count` |
| `/mnt/data/ArchitekturKosmos/11_AI_Workflow/OneDrive_2026-06-09/Recht` | workflow_or_project_mirror | 16 | 1 | 42 | 0 | `onedrive_like`, `workflow_named`, `small_book_count` |
| `/mnt/data/ArchitekturKosmos/KosmoZentrale/data/wettbewerbe/onedrive` | workflow_or_project_mirror | 16 | 12 | 13 | 0 | `onedrive_like`, `workflow_named`, `small_book_count` |
| `/mnt/data/ArchitekturKosmos/Code/ArchitectureCosmos/archive-intake` | dev_or_generated_candidate | 14 | 4 | 207 | 0 | `archive_like`, `dev_or_generated_path`, `small_book_count`, `lecture_file_count` |
| `/mnt/data/ArchitekturKosmos/Code/ArchitectureCosmos/archive-inbox/books` | dev_or_generated_candidate | 12 | 0 | 2 | 0 | `archive_like`, `library_named`, `dev_or_generated_path` |
| `/mnt/data/ArchitekturKosmos/Code/ArchitectureCosmos/archive-inbox/palladio-four-books` | dev_or_generated_candidate | 12 | 0 | 0 | 0 | `archive_like`, `library_named`, `dev_or_generated_path` |

## Next Actions

- No strong large-library root was confirmed by metadata. Keep Sogn and source-dependent assets review-only.
- Ask owner/Claude whether the archive HDD or OneDrive library is mounted under another path.
- Resolve visible OneDrive sync error markers before treating any OneDrive candidate as complete.
- Do not ingest or copy private files until a root is explicitly selected and a private metadata-only inventory task is opened.

## Safety

This locator does not read file contents and does not copy books, lecture material, plans, images, PDFs or private text into Git. It records path and count metadata only.
