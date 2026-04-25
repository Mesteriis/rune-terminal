ALTER TABLE terminal_settings ADD COLUMN cursor_style TEXT NOT NULL DEFAULT 'block';
ALTER TABLE terminal_settings ADD COLUMN cursor_blink INTEGER NOT NULL DEFAULT 1;
