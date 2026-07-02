# Kosmo Source-Root Locator

Generated: 2026-07-02T06:00:47.582Z
Status: `source_root_candidates_need_owner_selection`

## Summary

- Candidates: 1469
- Probable large private libraries: 0
- Workflow/project mirrors: 71
- Archive-like roots: 603
- OneDrive-like roots: 149
- Roots with sync errors: 5
- Own mount candidates: 1
- Scanned dirs: 5815
- Scan truncated: no

## Top Candidates

| Path | Classification | Score | Book-like | Lecture-like | Sync errors | Signals |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| `/mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC/KosmoWebsite` | possible_source_root | 70 | 3 | 107 | 0 | `onedrive_like`, `archive_like`, `small_book_count`, `lecture_file_count` |
| `/mnt/archiv/ArchitekturKosmos/Assets/Claude to Blender/abgabe/TKB_Bibliothek_Live-Final-Test_Abgabe` | possible_source_root | 60 | 1 | 2 | 0 | `archive_like`, `library_named`, `small_book_count` |
| `/mnt/archiv/ArchitekturKosmos/Assets/Claude to Blender/Ai Architektur Workflow/PBR Library + HDRI` | possible_source_root | 60 | 2 | 4 | 0 | `archive_like`, `library_named`, `small_book_count` |
| `/mnt/archiv/01 ArchitekturKosmos Projekt/00 Einrichtung Home_PC/KosmoWebsite` | possible_source_root | 52 | 3 | 107 | 0 | `archive_like`, `small_book_count`, `lecture_file_count` |
| `/mnt/archiv/ArchitekturKosmos/Assets` | possible_source_root | 52 | 21 | 110 | 0 | `archive_like`, `small_book_count`, `lecture_file_count` |
| `/mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC` | possible_source_root | 48 | 3 | 59 | 0 | `onedrive_like`, `archive_like`, `small_book_count` |
| `/mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC/KosmoWebsite/repo-context` | possible_source_root | 48 | 2 | 89 | 0 | `onedrive_like`, `archive_like`, `small_book_count` |
| `/mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC/KosmoWebsite/reports` | possible_source_root | 48 | 2 | 2 | 0 | `onedrive_like`, `archive_like`, `small_book_count` |
| `/mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC/ZUG_Volumenstudien_2026-06-08` | possible_source_root | 48 | 1 | 5 | 0 | `onedrive_like`, `archive_like`, `small_book_count` |
| `/mnt/archiv/FromSSD/OneDrive_2026-06-08/00 Einrichtung Home_PC/ZUG_Volumenstudien_2026-06-08/01_Studie` | possible_source_root | 48 | 1 | 2 | 0 | `onedrive_like`, `archive_like`, `small_book_count` |
| `/mnt/archiv/FromSSD/onedrive-2026-06-09` | possible_source_root | 48 | 7 | 33 | 0 | `onedrive_like`, `archive_like`, `small_book_count` |
| `/mnt/archiv/FromSSD/onedrive-2026-06-09/00 Architekturkosmos Zentrale/Architekturkosmos_Codex_Starter` | possible_source_root | 48 | 1 | 92 | 0 | `onedrive_like`, `archive_like`, `small_book_count` |
| `/mnt/archiv/FromSSD/onedrive-2026-06-09/00 Architekturkosmos Zentrale/Architekturkosmos_Codex_Starter/docs` | possible_source_root | 48 | 1 | 55 | 0 | `onedrive_like`, `archive_like`, `small_book_count` |
| `/mnt/archiv/FromSSD/onedrive-2026-06-09/KosmosPrepare` | possible_source_root | 48 | 6 | 48 | 0 | `onedrive_like`, `archive_like`, `small_book_count` |
| `/mnt/archiv/FromSSD/onedrive-2026-06-09/KosmosPrepare/_Archiv_Desktop-Tests_2026-05-31/kosmosprepare_test_20260528_1534` | possible_source_root | 48 | 1 | 2 | 0 | `onedrive_like`, `archive_like`, `small_book_count` |
| `/mnt/archiv/FromSSD/onedrive-2026-06-09/KosmosPrepare/02_Sandbox` | possible_source_root | 48 | 1 | 3 | 0 | `onedrive_like`, `archive_like`, `small_book_count` |
| `/home/andrin-baumann/.claude/projects/-home-andrin-baumann-ArchitekturKosmos-Codex` | possible_source_root | 42 | 47 | 153 | 0 | `medium_book_count`, `lecture_file_count` |
| `/mnt/archiv/01 ArchitekturKosmos Projekt` | weak_path_signal | 42 | 0 | 478 | 0 | `archive_like`, `lecture_file_count` |
| `/mnt/archiv/01 ArchitekturKosmos Projekt/_overseer-snapshots` | weak_path_signal | 42 | 0 | 1336 | 0 | `archive_like`, `lecture_file_count` |
| `/mnt/archiv/01 ArchitekturKosmos Projekt/_overseer-snapshots/2026-06-17_2155` | weak_path_signal | 42 | 0 | 548 | 0 | `archive_like`, `lecture_file_count` |

## Next Actions

- No strong large-library root was confirmed by metadata. Keep Sogn and source-dependent assets review-only.
- Ask owner/Claude whether the archive HDD or OneDrive library is mounted under another path.
- Resolve visible OneDrive sync error markers before treating any OneDrive candidate as complete.
- Do not ingest or copy private files until a root is explicitly selected and a private metadata-only inventory task is opened.

## Safety

This locator does not read file contents and does not copy books, lecture material, plans, images, PDFs or private text into Git. It records path and count metadata only.
