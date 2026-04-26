package windowtitle

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

const (
	ModeAuto   = "auto"
	ModeCustom = "custom"

	DefaultProductLabel = "RunaTerminal"

	defaultWindowTitleScope = "default"
	maxCustomTitleLen       = 80
)

type Settings struct {
	Mode        string `json:"mode"`
	CustomTitle string `json:"custom_title"`
}

type Store struct {
	db *sql.DB
}

func NewStore(ctx context.Context, db *sql.DB) (*Store, error) {
	if db == nil {
		return nil, fmt.Errorf("window title settings db is required")
	}

	store := &Store{db: db}
	if err := store.ensureDefaultRow(ctx); err != nil {
		return nil, err
	}
	return store, nil
}

func (s *Store) Snapshot(ctx context.Context) (Settings, error) {
	if err := s.ensureDefaultRow(ctx); err != nil {
		return Settings{}, err
	}

	var mode string
	var customTitle string
	err := s.db.QueryRowContext(ctx, `
		SELECT mode, custom_title
		FROM window_title_settings
		WHERE scope = ?
	`, defaultWindowTitleScope).Scan(&mode, &customTitle)
	if err != nil {
		return Settings{}, fmt.Errorf("load window title settings: %w", err)
	}

	return normalizeSettings(Settings{
		Mode:        mode,
		CustomTitle: customTitle,
	}), nil
}

func (s *Store) Update(ctx context.Context, next Settings) (Settings, error) {
	if err := s.ensureDefaultRow(ctx); err != nil {
		return Settings{}, err
	}

	normalized := normalizeSettings(next)
	_, err := s.db.ExecContext(ctx, `
		UPDATE window_title_settings
		SET mode = ?, custom_title = ?, updated_at = ?
		WHERE scope = ?
	`,
		normalized.Mode,
		normalized.CustomTitle,
		time.Now().UTC().Format(time.RFC3339Nano),
		defaultWindowTitleScope,
	)
	if err != nil {
		return Settings{}, fmt.Errorf("update window title settings: %w", err)
	}

	return normalized, nil
}

func (s *Store) ensureDefaultRow(ctx context.Context) error {
	var count int
	if err := s.db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM window_title_settings
		WHERE scope = ?
	`, defaultWindowTitleScope).Scan(&count); err != nil {
		return fmt.Errorf("check window title settings bootstrap: %w", err)
	}
	if count > 0 {
		return nil
	}

	_, err := s.db.ExecContext(ctx, `
		INSERT INTO window_title_settings (scope, mode, custom_title, updated_at)
		VALUES (?, ?, ?, ?)
	`,
		defaultWindowTitleScope,
		ModeAuto,
		"",
		time.Now().UTC().Format(time.RFC3339Nano),
	)
	if err != nil && !isUniqueConstraintError(err) {
		return fmt.Errorf("bootstrap window title settings: %w", err)
	}

	return nil
}

func normalizeSettings(settings Settings) Settings {
	mode := normalizeMode(settings.Mode)
	customTitle := normalizeCustomTitle(settings.CustomTitle)
	if mode != ModeCustom {
		customTitle = ""
	}
	return Settings{
		Mode:        mode,
		CustomTitle: customTitle,
	}
}

func normalizeMode(mode string) string {
	switch strings.TrimSpace(strings.ToLower(mode)) {
	case ModeCustom:
		return ModeCustom
	default:
		return ModeAuto
	}
}

func normalizeCustomTitle(title string) string {
	normalized := strings.TrimSpace(strings.ReplaceAll(title, "\n", " "))
	if normalized == "" {
		return ""
	}
	if len(normalized) <= maxCustomTitleLen {
		return normalized
	}
	return strings.TrimSpace(normalized[:maxCustomTitleLen])
}

func ComposeTitle(settings Settings, autoLabel string) string {
	normalized := normalizeSettings(settings)
	if normalized.Mode == ModeCustom && normalized.CustomTitle != "" {
		return normalized.CustomTitle
	}

	autoLabel = strings.TrimSpace(autoLabel)
	if autoLabel == "" {
		return DefaultProductLabel
	}
	return autoLabel + " · " + DefaultProductLabel
}

func isUniqueConstraintError(err error) bool {
	var sqliteErr interface{ Error() string }
	if errors.As(err, &sqliteErr) {
		message := sqliteErr.Error()
		return message != "" && (strings.Contains(message, "UNIQUE") || strings.Contains(message, "constraint failed"))
	}
	return false
}
