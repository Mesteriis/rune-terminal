CREATE TABLE IF NOT EXISTS window_title_settings (
  scope TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  custom_title TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);
