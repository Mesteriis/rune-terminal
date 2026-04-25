package terminal

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"
)

const (
	DefaultFontSize   = 13
	MinFontSize       = 11
	MaxFontSize       = 16
	DefaultLineHeight = 1.25
	MinLineHeight     = 1.05
	MaxLineHeight     = 1.6
	DefaultThemeMode  = "adaptive"
	ContrastThemeMode = "contrast"
	DefaultScrollback = 5000
	MinScrollback     = 1000
	MaxScrollback     = 20000
	DefaultCursorStyle    = "block"
	CursorStyleBar        = "bar"
	CursorStyleUnderline  = "underline"

	defaultTerminalSettingsScope = "default"
)

type Preferences struct {
	FontSize    int     `json:"font_size"`
	LineHeight  float64 `json:"line_height"`
	ThemeMode   string  `json:"theme_mode"`
	Scrollback  int     `json:"scrollback"`
	CursorStyle string  `json:"cursor_style"`
	CursorBlink bool    `json:"cursor_blink"`
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
	var lineHeight float64
	var themeMode string
	var scrollback int
	var cursorStyle string
	var cursorBlink int
	err := s.db.QueryRowContext(ctx, `
		SELECT font_size, line_height, theme_mode, scrollback, cursor_style, cursor_blink
		FROM terminal_settings
		WHERE scope = ?
	`, defaultTerminalSettingsScope).Scan(&fontSize, &lineHeight, &themeMode, &scrollback, &cursorStyle, &cursorBlink)
	if err != nil {
		return Preferences{}, fmt.Errorf("load terminal settings: %w", err)
	}

	return Preferences{
		FontSize:    clampFontSize(fontSize),
		LineHeight:  clampLineHeight(lineHeight),
		ThemeMode:   clampThemeMode(themeMode),
		Scrollback:  clampScrollback(scrollback),
		CursorStyle: clampCursorStyle(cursorStyle),
		CursorBlink: cursorBlink != 0,
	}, nil
}

func (s *PreferencesStore) Update(ctx context.Context, next Preferences) (Preferences, error) {
	if err := s.ensureDefaultRow(ctx); err != nil {
		return Preferences{}, err
	}

	normalized := Preferences{
		FontSize:    clampFontSize(next.FontSize),
		LineHeight:  clampLineHeight(next.LineHeight),
		ThemeMode:   clampThemeMode(next.ThemeMode),
		Scrollback:  clampScrollback(next.Scrollback),
		CursorStyle: clampCursorStyle(next.CursorStyle),
		CursorBlink: next.CursorBlink,
	}

	_, err := s.db.ExecContext(ctx, `
		UPDATE terminal_settings
		SET font_size = ?, line_height = ?, theme_mode = ?, scrollback = ?, cursor_style = ?, cursor_blink = ?, updated_at = ?
		WHERE scope = ?
	`,
		normalized.FontSize,
		normalized.LineHeight,
		normalized.ThemeMode,
		normalized.Scrollback,
		normalized.CursorStyle,
		boolToSQLite(normalized.CursorBlink),
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
		INSERT INTO terminal_settings (scope, font_size, line_height, theme_mode, scrollback, cursor_style, cursor_blink, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`,
		defaultTerminalSettingsScope,
		DefaultFontSize,
		DefaultLineHeight,
		DefaultThemeMode,
		DefaultScrollback,
		DefaultCursorStyle,
		boolToSQLite(true),
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

func clampLineHeight(value float64) float64 {
	if value == 0 {
		return DefaultLineHeight
	}
	if value < MinLineHeight {
		return MinLineHeight
	}
	if value > MaxLineHeight {
		return MaxLineHeight
	}
	return math.Round(value*100) / 100
}

func clampThemeMode(value string) string {
	normalized := strings.TrimSpace(strings.ToLower(value))
	switch normalized {
	case "", DefaultThemeMode:
		return DefaultThemeMode
	case ContrastThemeMode:
		return ContrastThemeMode
	default:
		return DefaultThemeMode
	}
}

func clampScrollback(value int) int {
	if value == 0 {
		return DefaultScrollback
	}
	if value < MinScrollback {
		return MinScrollback
	}
	if value > MaxScrollback {
		return MaxScrollback
	}
	return value
}

func clampCursorStyle(value string) string {
	normalized := strings.TrimSpace(strings.ToLower(value))
	switch normalized {
	case "", DefaultCursorStyle:
		return DefaultCursorStyle
	case CursorStyleBar:
		return CursorStyleBar
	case CursorStyleUnderline:
		return CursorStyleUnderline
	default:
		return DefaultCursorStyle
	}
}

func boolToSQLite(value bool) int {
	if value {
		return 1
	}
	return 0
}

func isUniqueConstraintError(err error) bool {
	var sqliteErr interface{ Error() string }
	if errors.As(err, &sqliteErr) {
		message := sqliteErr.Error()
		return message != "" && (strings.Contains(message, "UNIQUE") || strings.Contains(message, "constraint failed"))
	}
	return false
}
