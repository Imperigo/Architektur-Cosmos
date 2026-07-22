# Kosmo Worktree Guard Audit Check

Generated: 2026-07-22T10:43:41.395Z
Status: `worktree_guard_audit_guard_passed`

## Summary

- Checks: 19/19
- Failures: 0
- Public-ready after check: 0

## Checks

- passed: `known_status` - worktree_guard_audit_dirty_review_required
- passed: `audit_only` - true
- passed: `no_file_content_reads` - false
- passed: `no_staging` - false
- passed: `no_reverts` - false
- passed: `broad_stage_blocked` - false/false
- passed: `remote_behind_push_guard_present` - true
- passed: `branch_state_present` - {"branch":"main","upstream":"origin/main","ahead":0,"behind":0,"diverged":false,"push_requires_sync_decision":false}
- passed: `branch_counts_consistent` - {"branch":"main","upstream":"origin/main","ahead":0,"behind":0,"diverged":false,"push_requires_sync_decision":false}
- passed: `branch_behind_counts_consistent` - {"branch":"main","upstream":"origin/main","ahead":0,"behind":0,"diverged":false,"push_requires_sync_decision":false}
- passed: `summary_branch_state_mirrors_detail` - {"summary":{"entries":1855,"staged":0,"unstaged":1415,"untracked":440,"top_level_buckets":26,"status_code_buckets":2,"high_risk_path_hints":80,"broad_stage_allowed":false,"branch":"main","upstream":"origin/main","ahead":0,"behind":0,"diverged":false,"push_requires_sync_decision":false,"public_ready_after_audit":0},"branchState":{"branch":"main","upstream":"origin/main","ahead":0,"behind":0,"diverged":false,"push_requires_sync_decision":false}}
- passed: `push_requires_sync_on_remote_behind` - {"branch":"main","upstream":"origin/main","ahead":0,"behind":0,"diverged":false,"push_requires_sync_decision":false}
- passed: `public_ready_zero` - 0/0
- passed: `entry_counts_present` - {"entries":1855,"staged":0,"unstaged":1415,"untracked":440,"top_level_buckets":26,"status_code_buckets":2,"high_risk_path_hints":80,"broad_stage_allowed":false,"branch":"main","upstream":"origin/main","ahead":0,"behind":0,"diverged":false,"push_requires_sync_decision":false,"public_ready_after_audit":0}
- passed: `top_level_buckets_present` - 26/26
- passed: `rule_blocks_git_add_dot` - do not run git add . in this repository. stage exact files only and inspect git diff --cached --stat before commit. treat existing dirty files as user/other-worker state unless the current worker created them in this batch. do not revert unrelated dirty files. if local and upstream branches diverge, do not push until a sync or owner decision is explicit. if a file owned by another worker must change, write a handoff.
- passed: `rule_exact_files` - do not run git add . in this repository. stage exact files only and inspect git diff --cached --stat before commit. treat existing dirty files as user/other-worker state unless the current worker created them in this batch. do not revert unrelated dirty files. if local and upstream branches diverge, do not push until a sync or owner decision is explicit. if a file owned by another worker must change, write a handoff.
- passed: `rule_no_unrelated_reverts` - do not run git add . in this repository. stage exact files only and inspect git diff --cached --stat before commit. treat existing dirty files as user/other-worker state unless the current worker created them in this batch. do not revert unrelated dirty files. if local and upstream branches diverge, do not push until a sync or owner decision is explicit. if a file owned by another worker must change, write a handoff.
- passed: `rule_blocks_divergent_push` - do not run git add . in this repository. stage exact files only and inspect git diff --cached --stat before commit. treat existing dirty files as user/other-worker state unless the current worker created them in this batch. do not revert unrelated dirty files. if local and upstream branches diverge, do not push until a sync or owner decision is explicit. if a file owned by another worker must change, write a handoff.
