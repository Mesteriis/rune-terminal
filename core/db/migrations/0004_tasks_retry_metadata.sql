ALTER TABLE tasks ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN max_retries INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN retry_backoff_seconds INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN last_error_at TEXT;
ALTER TABLE tasks ADD COLUMN next_retry_at TEXT;

CREATE INDEX IF NOT EXISTS idx_tasks_status_retry_ready_locked_by
ON tasks (status, next_retry_at, run_at, locked_by);
