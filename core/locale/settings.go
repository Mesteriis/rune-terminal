package locale

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

const (
	LocaleEN   = "en"
	LocaleRU   = "ru"
	LocaleZHCN = "zh-CN"
	LocaleES   = "es"

	DefaultLocale      = LocaleRU
	defaultLocaleScope = "default"
)

type Settings struct {
	Locale string `json:"locale"`
}

type Store struct {
	db *sql.DB
}

func NewStore(ctx context.Context, db *sql.DB) (*Store, error) {
	if db == nil {
		return nil, fmt.Errorf("locale settings db is required")
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

	var locale string
	err := s.db.QueryRowContext(ctx, `
		SELECT locale
		FROM locale_settings
		WHERE scope = ?
	`, defaultLocaleScope).Scan(&locale)
	if err != nil {
		return Settings{}, fmt.Errorf("load locale settings: %w", err)
	}

	return normalizeSettings(Settings{Locale: locale}), nil
}

func (s *Store) Update(ctx context.Context, next Settings) (Settings, error) {
	if err := s.ensureDefaultRow(ctx); err != nil {
		return Settings{}, err
	}

	normalized := normalizeSettings(next)
	_, err := s.db.ExecContext(ctx, `
		UPDATE locale_settings
		SET locale = ?, updated_at = ?
		WHERE scope = ?
	`,
		normalized.Locale,
		time.Now().UTC().Format(time.RFC3339Nano),
		defaultLocaleScope,
	)
	if err != nil {
		return Settings{}, fmt.Errorf("update locale settings: %w", err)
	}

	return normalized, nil
}

func SupportedLocales() []string {
	return []string{LocaleRU, LocaleEN, LocaleZHCN, LocaleES}
}

func NormalizeLocale(locale string) string {
	switch strings.TrimSpace(strings.ToLower(locale)) {
	case LocaleEN:
		return LocaleEN
	case LocaleRU:
		return LocaleRU
	case "zh", "zh-cn", "cn":
		return LocaleZHCN
	case LocaleES:
		return LocaleES
	default:
		return DefaultLocale
	}
}

func normalizeSettings(settings Settings) Settings {
	return Settings{
		Locale: NormalizeLocale(settings.Locale),
	}
}

func (s *Store) ensureDefaultRow(ctx context.Context) error {
	var count int
	if err := s.db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM locale_settings
		WHERE scope = ?
	`, defaultLocaleScope).Scan(&count); err != nil {
		return fmt.Errorf("check locale settings bootstrap: %w", err)
	}
	if count > 0 {
		return nil
	}

	_, err := s.db.ExecContext(ctx, `
		INSERT INTO locale_settings (scope, locale, updated_at)
		VALUES (?, ?, ?)
	`,
		defaultLocaleScope,
		DefaultLocale,
		time.Now().UTC().Format(time.RFC3339Nano),
	)
	if err != nil && !isUniqueConstraintError(err) {
		return fmt.Errorf("bootstrap locale settings: %w", err)
	}

	return nil
}

func isUniqueConstraintError(err error) bool {
	var sqliteErr interface{ Error() string }
	if errors.As(err, &sqliteErr) {
		message := sqliteErr.Error()
		return message != "" && (strings.Contains(message, "UNIQUE") || strings.Contains(message, "constraint failed"))
	}
	return false
}
