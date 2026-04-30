package agent

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

const (
	DefaultComposerSubmitMode    = "enter-sends"
	ModEnterComposerSubmitMode   = "mod-enter-sends"
	DefaultDebugModeEnabled      = false
	defaultComposerSettingsScope = "default"
)

type ComposerPreferences struct {
	SubmitMode       string `json:"composer_submit_mode"`
	DebugModeEnabled bool   `json:"debug_mode_enabled"`
}

type ComposerPreferencesStore struct {
	db *sql.DB
}

func NewComposerPreferencesStore(ctx context.Context, db *sql.DB) (*ComposerPreferencesStore, error) {
	if db == nil {
		return nil, fmt.Errorf("agent composer preferences db is required")
	}

	store := &ComposerPreferencesStore{db: db}
	if err := store.ensureDefaultRow(ctx); err != nil {
		return nil, err
	}

	return store, nil
}

func (s *ComposerPreferencesStore) Snapshot(ctx context.Context) (ComposerPreferences, error) {
	if err := s.ensureDefaultRow(ctx); err != nil {
		return ComposerPreferences{}, err
	}

	var (
		submitMode       string
		debugModeEnabled bool
	)
	err := s.db.QueryRowContext(ctx, `
		SELECT composer_submit_mode, debug_mode_enabled
		FROM agent_settings
		WHERE scope = ?
	`, defaultComposerSettingsScope).Scan(&submitMode, &debugModeEnabled)
	if err != nil {
		return ComposerPreferences{}, fmt.Errorf("load agent composer settings: %w", err)
	}

	return ComposerPreferences{
		SubmitMode:       clampComposerSubmitMode(submitMode),
		DebugModeEnabled: debugModeEnabled,
	}, nil
}

func (s *ComposerPreferencesStore) Update(ctx context.Context, next ComposerPreferences) (ComposerPreferences, error) {
	if err := s.ensureDefaultRow(ctx); err != nil {
		return ComposerPreferences{}, err
	}

	normalized := ComposerPreferences{
		SubmitMode:       clampComposerSubmitMode(next.SubmitMode),
		DebugModeEnabled: next.DebugModeEnabled,
	}

	_, err := s.db.ExecContext(ctx, `
		UPDATE agent_settings
		SET composer_submit_mode = ?, debug_mode_enabled = ?, updated_at = ?
		WHERE scope = ?
	`,
		normalized.SubmitMode,
		normalized.DebugModeEnabled,
		time.Now().UTC().Format(time.RFC3339Nano),
		defaultComposerSettingsScope,
	)
	if err != nil {
		return ComposerPreferences{}, fmt.Errorf("update agent composer settings: %w", err)
	}

	return normalized, nil
}

func (s *ComposerPreferencesStore) ensureDefaultRow(ctx context.Context) error {
	var count int
	if err := s.db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM agent_settings
		WHERE scope = ?
	`, defaultComposerSettingsScope).Scan(&count); err != nil {
		return fmt.Errorf("check agent composer settings bootstrap: %w", err)
	}
	if count > 0 {
		return nil
	}

	_, err := s.db.ExecContext(ctx, `
		INSERT INTO agent_settings (scope, composer_submit_mode, debug_mode_enabled, updated_at)
		VALUES (?, ?, ?, ?)
	`,
		defaultComposerSettingsScope,
		DefaultComposerSubmitMode,
		DefaultDebugModeEnabled,
		time.Now().UTC().Format(time.RFC3339Nano),
	)
	if err != nil && !isUniqueConstraintError(err) {
		return fmt.Errorf("bootstrap agent composer settings: %w", err)
	}

	return nil
}

func clampComposerSubmitMode(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case ModEnterComposerSubmitMode:
		return ModEnterComposerSubmitMode
	case "", DefaultComposerSubmitMode:
		return DefaultComposerSubmitMode
	default:
		return DefaultComposerSubmitMode
	}
}

func isUniqueConstraintError(err error) bool {
	var sqliteErr interface{ Error() string }
	if errors.As(err, &sqliteErr) {
		message := sqliteErr.Error()
		return message != "" && (strings.Contains(message, "UNIQUE") || strings.Contains(message, "constraint failed"))
	}
	return false
}
