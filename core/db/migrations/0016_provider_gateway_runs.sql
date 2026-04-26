CREATE TABLE IF NOT EXISTS provider_gateway_runs (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL,
    provider_kind TEXT NOT NULL,
    provider_display_name TEXT NOT NULL DEFAULT '',
    request_mode TEXT NOT NULL,
    model TEXT NOT NULL DEFAULT '',
    conversation_id TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL,
    error_code TEXT NOT NULL DEFAULT '',
    error_message TEXT NOT NULL DEFAULT '',
    duration_ms INTEGER NOT NULL DEFAULT 0,
    started_at TEXT NOT NULL,
    completed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_provider_gateway_runs_provider_id_started_at
    ON provider_gateway_runs (provider_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_provider_gateway_runs_started_at
    ON provider_gateway_runs (started_at DESC);
