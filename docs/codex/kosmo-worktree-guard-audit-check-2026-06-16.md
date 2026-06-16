# Kosmo Worktree Guard Audit Check

Generated: 2026-06-16T18:07:04.696Z
Status: `worktree_guard_audit_guard_passed`

## Summary

- Checks: 12/12
- Failures: 0
- Public-ready after check: 0

## Checks

- passed: `known_status` - worktree_guard_audit_dirty_review_required
- passed: `audit_only` - true
- passed: `no_file_content_reads` - false
- passed: `no_staging` - false
- passed: `no_reverts` - false
- passed: `broad_stage_blocked` - false/false
- passed: `public_ready_zero` - 0/0
- passed: `entry_counts_present` - {"entries":1324,"staged":0,"unstaged":1194,"untracked":130,"top_level_buckets":26,"status_code_buckets":2,"high_risk_path_hints":80,"broad_stage_allowed":false,"public_ready_after_audit":0}
- passed: `top_level_buckets_present` - 26/26
- passed: `rule_blocks_git_add_dot` - do not run git add . in this repository. stage exact files only and inspect git diff --cached --stat before commit. treat existing dirty files as user/other-worker state unless the current worker created them in this batch. do not revert unrelated dirty files. if a file owned by another worker must change, write a handoff.
- passed: `rule_exact_files` - do not run git add . in this repository. stage exact files only and inspect git diff --cached --stat before commit. treat existing dirty files as user/other-worker state unless the current worker created them in this batch. do not revert unrelated dirty files. if a file owned by another worker must change, write a handoff.
- passed: `rule_no_unrelated_reverts` - do not run git add . in this repository. stage exact files only and inspect git diff --cached --stat before commit. treat existing dirty files as user/other-worker state unless the current worker created them in this batch. do not revert unrelated dirty files. if a file owned by another worker must change, write a handoff.
