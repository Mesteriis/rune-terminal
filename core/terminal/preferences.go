package terminal

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

const (
	DefaultFontSize = 13
	MinFontSize     = 11
	MaxFontSize     = 16

	defaultTerminalSettingsScope = "default"
)

type Preferences struct {
	FontSize int `json:"font_size"`
}

type PreferencesStore struct {
	db *sql.DB
}

func NewPreferencesStore(ctx context.Context, db *sql.DB) (*PreferencesStore, error) {
	if db == nil {
		return nil, fmt.Errorf("terminal preferences db is required")
	}

	store := &PreferencesStore{db: db}
	if err := store.ensureDefaultRow(ctx); err != nil {
		return nil, err
	}

	return store, nil
}

func (s *PreferencesStore) Snapshot(ctx context.Context) (Preferences, error) {
	if err := s.ensureDefaultRow(ctx); err != nil {
		return Preferences{}, err
	}

	var fontSize int
	err := s.db.QueryRowContext(ctx, `
		SELECT font_size
		FROM terminal_settings
		WHERE scope = ?
	`, defaultTerminalSettingsScope).Scan(&fontSize)
	if err != nil {
		return Preferences{}, fmt.Errorf("load terminal settings: %w", err)
	}

	return Preferences{
		FontSize: clampFontSize(fontSize),
	}, nil
}

func (s *PreferencesStore) Update(ctx context.Context, next Preferences) (Preferences, error) {
	if err := s.ensureDefaultRow(ctx); err != nil {
		return Preferences{}, err
	}

	normalized := Preferences{
		FontSize: clampFontSize(next.FontSize),
	}

	_, err := s.db.ExecContext(ctx, `
		UPDATE terminal_settings
		SET font_size = ?, updated_at = ?
		WHERE scope = ?
	`,
		normalized.FontSize,
		time.Now().UTC().Format(time.RFC3339Nano),
		defaultTerminalSettingsScope,
	)
	if err != nil {
		return Preferences{}, fmt.Errorf("update terminal settings: %w", err)
	}

	return normalized, nil
}

func (s *PreferencesStore) ensureDefaultRow(ctx context.Context) error {
	var count int
	if err := s.db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM terminal_settings
		WHERE scope = ?
	`, defaultTerminalSettingsScope).Scan(&count); err != nil {
		return fmt.Errorf("check terminal settings bootstrap: %w", err)
	}
	if count > 0 {
		return nil
	}

	_, err := s.db.ExecContext(ctx, `
		INSERT INTO terminal_settings (scope, font_size, updated_at)
		VALUES (?, ?, ?)
	`,
		defaultTerminalSettingsScope,
		DefaultFontSize,
		time.Now().UTC().Format(time.RFC3339Nano),
	)
	if err != nil && !isUniqueConstraintError(err) {
		return fmt.Errorf("bootstrap terminal settings: %w", err)
	}

	return nil
}

func clampFontSize(value int) int {
	if value < MinFontSize {
		return MinFontSize
	}
	if value > MaxFontSize {
		return MaxFontSize
	}
	if value == 0 {
		return DefaultFontSize
	}
	return value
}

func isUniqueConstraintError(err error) bool {
	var sqliteErr interface{ Error() string }
	if errors.As(err, &sqliteErr) {
		message := sqliteErr.Error()
		return message != "" && (strings.Contains(message, "UNIQUE") || strings.Contains(message, "constraint failed"))
	}
	return false
}
