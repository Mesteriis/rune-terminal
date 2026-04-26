CREATE TABLE IF NOT EXISTS provider_gateway_probes (
    provider_id TEXT PRIMARY KEY,
    provider_kind TEXT NOT NULL,
    display_name TEXT NOT NULL,
    ready INTEGER NOT NULL DEFAULT 0,
    status_state TEXT NOT NULL,
    status_message TEXT NOT NULL DEFAULT '',
    resolved_binary TEXT NOT NULL DEFAULT '',
    base_url TEXT NOT NULL DEFAULT '',
    model TEXT NOT NULL DEFAULT '',
    probe_latency_ms INTEGER NOT NULL DEFAULT 0,
    checked_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_provider_gateway_probes_checked_at
    ON provider_gateway_probes (checked_at DESC);
