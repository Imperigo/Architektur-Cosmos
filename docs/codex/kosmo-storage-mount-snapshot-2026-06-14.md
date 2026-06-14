# Kosmo Storage Mount Snapshot

Generated: 2026-06-14T07:53:05.789Z
Status: `storage_snapshot_data_mount_visible_archive_missing`

## Summary

- Data mount visible: yes
- Data mount filesystem: ext4
- Data mount total/available GiB: 3666.5/3275.9
- Archive mount visible: no
- Archive target exists: yes
- Project root exists: yes
- Project root own mount: no
- OneDrive targets visible: 2
- Source-root decision: owner_selection_still_required
- Public-ready after snapshot: 0

## Targets

| Path | Exists | Own mount | FS | Total GiB | Available GiB | Top-level entries | Sample |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
| `/mnt/data` | yes | yes | ext4 | 3666.5 | 3275.9 | 9 | _archive_logs, ai-models, Applikationen Andrin, ArchitekturKosmos, ComfyUI, kosmo-verify, lost+found, tools, Zum_Archivieren |
| `/mnt/archiv` | yes | no | ext4 | 1831.7 | 1639.2 | 0 | - |
| `/mnt/data/ArchitekturKosmos` | yes | no | ext4 | 3666.5 | 3275.9 | 7 | _incoming, .pytest_cache, 11_AI_Workflow, Code, KosmoOrbit, KosmoZentrale, tools |
| `/mnt/data/ArchitekturKosmos/11_AI_Workflow/OneDrive_2026-06-09` | yes | no | ext4 | 3666.5 | 3275.9 | 14 | _build_briefing_pdf.py, 00 Architekturkosmos Zentrale, 00 Einrichtung Home_PC, 12 Architektur Cosmos, alt, Andrin-Owner-Pakete, ANLEITUNG.txt, Architecture-Cosmos_Status_2026-06-02.pdf, Architekturkosmos_Status_2026-06-02.pdf, KosmoDraw, KosmoOrbit_Status_Progress_2026-06-02.pdf, Recht |
| `/home/andrin-baumann/ArchitekturKosmos Onedrive` | yes | no | ext4 | 1831.7 | 1639.2 | 3 | ___All_Errors.txt, __11 AI Workflow, 11 AI Workflow |

## Interpretation

- /mnt/data is the active large SSD mount.
- /mnt/archiv exists as a directory but is not an own mounted archive drive.
- /mnt/data/ArchitekturKosmos is a project/workspace root inside the SSD mount, not a separate source-library mount.
- OneDrive-like roots are visible, but source-root guards still require sync repair or explicit owner confirmation.
- No source root is selected by this snapshot.

## Next Actions

- If the archive HDD should contain the private library, mount it so /mnt/archiv is an own mount with files.
- If OneDrive is the real library, repair sync markers before any private inventory.
- After storage changes, rerun source-root locator, selection brief, decision-session check, blocker refresh and worker-boundary pack.
- Do not select /mnt/data/ArchitekturKosmos as the private library root unless the owner explicitly confirms it.
