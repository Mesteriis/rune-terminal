CREATE TABLE IF NOT EXISTS agent_attachment_references (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    modified_time INTEGER NOT NULL DEFAULT 0,
    workspace_id TEXT NOT NULL DEFAULT '',
    action_source TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_attachment_references_created_at
    ON agent_attachment_references(created_at DESC);
