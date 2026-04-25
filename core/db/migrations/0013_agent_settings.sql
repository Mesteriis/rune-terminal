CREATE TABLE IF NOT EXISTS agent_settings (
  scope TEXT PRIMARY KEY,
  composer_submit_mode TEXT NOT NULL DEFAULT 'enter-sends',
  updated_at TEXT NOT NULL
);
