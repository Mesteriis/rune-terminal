CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    payload TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL,
    run_at TEXT NOT NULL,
    locked_by TEXT,
    locked_at TEXT,
    created_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT,
    error TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_status_run_at_locked_by
ON tasks (status, run_at, locked_by);

CREATE INDEX IF NOT EXISTS idx_tasks_status_locked_by
ON tasks (status, locked_by);
