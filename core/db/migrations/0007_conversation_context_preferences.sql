ALTER TABLE conversations ADD COLUMN widget_context_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE conversations ADD COLUMN context_widget_ids_json TEXT NOT NULL DEFAULT '[]';
