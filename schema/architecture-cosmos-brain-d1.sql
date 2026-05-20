-- Architecture Cosmos Brain D1 schema draft
-- Target: Cloudflare D1 / SQLite dialect.
-- Purpose: operational Brain state, reports and approval queue.
-- This schema is not applied automatically.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS brain_runs (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN (
    'observe',
    'draft',
    'autonomous_review',
    'review',
    'execute',
    'publish'
  )),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'manual',
    'cron',
    'webhook',
    'approval',
    'recovery'
  )),
  status TEXT NOT NULL CHECK (status IN (
    'started',
    'completed',
    'failed',
    'cancelled',
    'needs_approval'
  )),
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  summary TEXT NOT NULL DEFAULT '',
  checks_json TEXT NOT NULL DEFAULT '[]',
  retry_count INTEGER NOT NULL DEFAULT 0,
  writes_repository INTEGER NOT NULL DEFAULT 0 CHECK (writes_repository IN (0, 1)),
  writes_database INTEGER NOT NULL DEFAULT 0 CHECK (writes_database IN (0, 1)),
  publishes INTEGER NOT NULL DEFAULT 0 CHECK (publishes IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_brain_runs_status ON brain_runs (status, started_at);
CREATE INDEX IF NOT EXISTS idx_brain_runs_trigger ON brain_runs (trigger_type, started_at);

CREATE TABLE IF NOT EXISTS brain_tasks (
  id TEXT PRIMARY KEY,
  run_id TEXT REFERENCES brain_runs(id) ON DELETE SET NULL,
  scope TEXT NOT NULL CHECK (scope IN (
    'system',
    'entry',
    'source',
    'model',
    'security',
    'ui',
    'obsidian',
    'cloud'
  )),
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  priority INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN (
    'low',
    'medium',
    'high',
    'critical'
  )),
  approval_required INTEGER NOT NULL DEFAULT 1 CHECK (approval_required IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open',
    'approved',
    'rejected',
    'in_progress',
    'done',
    'blocked'
  )),
  target_entry_id TEXT,
  suggested_action_json TEXT NOT NULL DEFAULT '{}',
  tests_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_brain_tasks_status_priority ON brain_tasks (status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_brain_tasks_scope ON brain_tasks (scope, kind);
CREATE INDEX IF NOT EXISTS idx_brain_tasks_entry ON brain_tasks (target_entry_id);

CREATE TABLE IF NOT EXISTS brain_approvals (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES brain_tasks(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN (
    'approved',
    'rejected',
    'needs_changes',
    'expired'
  )),
  decided_by TEXT NOT NULL DEFAULT 'owner',
  decided_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approval_channel TEXT NOT NULL DEFAULT 'manual' CHECK (approval_channel IN (
    'manual',
    'signed_link',
    'dashboard',
    'email_reply'
  )),
  notes TEXT NOT NULL DEFAULT '',
  signature_hash TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_brain_approvals_task ON brain_approvals (task_id, decided_at);

CREATE TABLE IF NOT EXISTS brain_errors (
  id TEXT PRIMARY KEY,
  run_id TEXT REFERENCES brain_runs(id) ON DELETE SET NULL,
  task_id TEXT REFERENCES brain_tasks(id) ON DELETE SET NULL,
  severity TEXT NOT NULL CHECK (severity IN (
    'info',
    'warning',
    'error',
    'critical'
  )),
  error_code TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  stack_excerpt TEXT,
  recovery_action TEXT NOT NULL DEFAULT '',
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_brain_errors_severity ON brain_errors (severity, created_at);
CREATE INDEX IF NOT EXISTS idx_brain_errors_run ON brain_errors (run_id);

CREATE TABLE IF NOT EXISTS brain_reports (
  id TEXT PRIMARY KEY,
  run_id TEXT REFERENCES brain_runs(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL CHECK (report_type IN (
    'daily',
    'weekly',
    'doctor',
    'cloud_status',
    'security',
    'database_quality',
    'obsidian_export'
  )),
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  markdown TEXT NOT NULL DEFAULT '',
  data_json TEXT NOT NULL DEFAULT '{}',
  public_safe INTEGER NOT NULL DEFAULT 0 CHECK (public_safe IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_brain_reports_type ON brain_reports (report_type, created_at);

CREATE TABLE IF NOT EXISTS brain_obsidian_exports (
  id TEXT PRIMARY KEY,
  run_id TEXT REFERENCES brain_runs(id) ON DELETE SET NULL,
  vault_target TEXT NOT NULL,
  export_type TEXT NOT NULL CHECK (export_type IN (
    'brain_report',
    'research_pack',
    'decision',
    'taxonomy',
    'project_note'
  )),
  file_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN (
    'planned',
    'written',
    'skipped',
    'failed'
  )),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_brain_obsidian_exports_status ON brain_obsidian_exports (status, created_at);
