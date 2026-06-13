# Kosmo Private Library Sync Resolution

Generated: 2026-06-13
Status: `operator_checklist`

## Current Finding

The expected large private book/ETH/HSLU library is not visible to Codex.

Visible roots:

- `/mnt/data/ArchitekturKosmos/11_AI_Workflow/OneDrive_2026-06-09`
- `/home/andrin-baumann/ArchitekturKosmos Onedrive`
- `/mnt/data/ArchitekturKosmos/KosmoZentrale/sources/private-extracts`

Blocked or incomplete:

- `/mnt/archiv` exists as a directory but is not its own archive HDD mount.
- `/mnt/data/Zum_Archivieren` is empty or not mounted.
- `/home/andrin-baumann/ArchitekturKosmos Onedrive` contains 30 OneDrive sync error marker files.
- Current visible mirrors contain only 39 book-like files, not a large source library.

## What This Means

KosmoReferences should not treat the current OneDrive mirror as complete. The missing Sogn Benedetg, ETH, HSLU and book-library source basis is still a storage/sync/mount problem, not a resolved data problem.

## Operator Checks

1. Confirm where the physical archive HDD should appear.
2. Mount the archive HDD as its own filesystem, ideally at `/mnt/archiv`.
3. Confirm that `df -h` shows `/mnt/archiv` as a separate mount, not under `/`.
4. Confirm whether the large private library is on the archive HDD, OneDrive, or another disk.
5. If OneDrive is the source, resolve the sync errors before treating the mirror as complete.
6. If a ZIP is the source, extract only into a private local root, not into public repo folders.
7. Re-run `npm run kosmo:private-library-diagnostic`.
8. If `library_candidate_visible` appears, run `npm run kosmo:data-lane-sweep`.

## Safe Target Layout

Recommended private root:

```text
/mnt/data/ArchitekturKosmos/KosmoZentrale/sources/private-library/
```

Recommended subfolders:

```text
books/
eth/
hslu/
lectures/
plans/
images/
rights-notes/
inventories/
```

Rules:

- Keep raw PDFs, scans, slides and books private.
- Repo outputs may contain metadata, filenames, counts, short summaries and review status only.
- Do not copy page text, scans, lecture bodies or protected plan/image content into public repo docs.

## Next Diagnostic Commands

```bash
df -h
npm run kosmo:private-library-diagnostic
npm run kosmo:data-lane-sweep
```

## Review Impact

Until the real library root is visible:

- Batch D remains `needs_more_source_context`.
- Sogn Benedetg remains link-only/review-only.
- KosmoAsset studies that depend on private source confidence remain `needs-review`.
- Public-ready remains 0.
