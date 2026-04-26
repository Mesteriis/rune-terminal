CREATE TABLE IF NOT EXISTS locale_settings (
    scope TEXT PRIMARY KEY,
    locale TEXT NOT NULL DEFAULT 'ru',
    updated_at TEXT NOT NULL
);
