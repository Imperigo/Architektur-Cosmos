# Kosmo Storage Mount Snapshot

Generated: 2026-06-15T10:41:52.878Z
Status: `storage_snapshot_archive_mount_visible`

## Summary

- Data mount visible: yes
- Data mount source: /dev/nvme1n1
- Data mount filesystem: ext4
- Data mount total/available GiB: 3666.5/3267
- Archive mount visible: yes
- Archive mount source: /dev/sda
- Archive mount filesystem: ext4
- Archive mount total/available GiB: 11086.8/10498.2
- Archive target exists: yes
- Active project root: `/mnt/data/ArchitekturKosmos`
- Archive root: `/mnt/archiv`
- Project root exists: yes
- Project root own mount: no
- OneDrive targets visible: 2
- Source-root decision: owner_selection_still_required
- Public-ready after snapshot: 0

## Targets

| Path | Exists | Own mount | FS | Total GiB | Available GiB | Top-level entries | Sample |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
| `/mnt/data` | yes | yes | ext4 | 3666.5 | 3267 | 9 | _archive_logs, ai-models, Applikationen Andrin, ArchitekturKosmos, ComfyUI, kosmo-verify, lost+found, tools, Zum_Archivieren |
| `/mnt/archiv` | yes | yes | ext4 | 11086.8 | 10498.2 | 4 | 01 ArchitekturKosmos Projekt, ArchitekturKosmos, FromSSD, lost+found |
| `/mnt/data/ArchitekturKosmos` | yes | no | ext4 | 3666.5 | 3267 | 7 | _incoming, .pytest_cache, 11_AI_Workflow, Code, KosmoOrbit, KosmoZentrale, tools |
| `/mnt/data/ArchitekturKosmos/11_AI_Workflow/OneDrive_2026-06-09` | yes | no | ext4 | 3666.5 | 3267 | 14 | _build_briefing_pdf.py, 00 Architekturkosmos Zentrale, 00 Einrichtung Home_PC, 12 Architektur Cosmos, alt, Andrin-Owner-Pakete, ANLEITUNG.txt, Architecture-Cosmos_Status_2026-06-02.pdf, Architekturkosmos_Status_2026-06-02.pdf, KosmoDraw, KosmoOrbit_Status_Progress_2026-06-02.pdf, Recht |
| `/home/andrin-baumann/ArchitekturKosmos Onedrive` | yes | no | ext4 | 1831.7 | 1635.5 | 3 | ___All_Errors.txt, __11 AI Workflow, 11 AI Workflow |

## Interpretation

- /mnt/data is the active large SSD mount.
- /mnt/archiv is an own mounted archive drive; owner still must select the exact source-root folder inside it or elsewhere.
- /mnt/data/ArchitekturKosmos is a project/workspace root inside the SSD mount, not a separate source-library mount.
- OneDrive-like roots are visible, but source-root guards still require sync repair or explicit owner confirmation.
- No source root is selected by this snapshot.

## Next Actions

- Owner/KosmoOverseer should confirm the exact source-root folder inside /mnt/archiv or confirm a different complete root.
- If OneDrive is the real library, repair sync markers before any private inventory.
- After storage changes, rerun source-root locator, selection brief, decision-session check, blocker refresh and worker-boundary pack.
- Do not select /mnt/data/ArchitekturKosmos as the private library root unless the owner explicitly confirms it.
