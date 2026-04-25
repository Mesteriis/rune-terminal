package terminal

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/db"
)

func TestPreferencesStoreBootstrapsDefaultSettings(t *testing.T) {
	t.Parallel()

	dbConn, err := db.Open(context.Background(), filepath.Join(t.TempDir(), "runtime.sqlite"))
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	t.Cleanup(func() {
		_ = dbConn.Close()
	})

	store, err := NewPreferencesStore(context.Background(), dbConn)
	if err != nil {
		t.Fatalf("new preferences store: %v", err)
	}

	settings, err := store.Snapshot(context.Background())
	if err != nil {
		t.Fatalf("snapshot: %v", err)
	}

	if settings.FontSize != DefaultFontSize {
		t.Fatalf("expected default font size %d, got %d", DefaultFontSize, settings.FontSize)
	}
	if settings.LineHeight != DefaultLineHeight {
		t.Fatalf("expected default line height %.2f, got %.2f", DefaultLineHeight, settings.LineHeight)
	}
	if settings.ThemeMode != DefaultThemeMode {
		t.Fatalf("expected default theme mode %q, got %q", DefaultThemeMode, settings.ThemeMode)
	}
}

func TestPreferencesStoreClampsAndPersistsSettings(t *testing.T) {
	t.Parallel()

	dbConn, err := db.Open(context.Background(), filepath.Join(t.TempDir(), "runtime.sqlite"))
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	t.Cleanup(func() {
		_ = dbConn.Close()
	})

	store, err := NewPreferencesStore(context.Background(), dbConn)
	if err != nil {
		t.Fatalf("new preferences store: %v", err)
	}

	updated, err := store.Update(context.Background(), Preferences{FontSize: 99, LineHeight: 9, ThemeMode: ContrastThemeMode})
	if err != nil {
		t.Fatalf("update preferences: %v", err)
	}
	if updated.FontSize != MaxFontSize {
		t.Fatalf("expected clamped max font size %d, got %d", MaxFontSize, updated.FontSize)
	}
	if updated.LineHeight != MaxLineHeight {
		t.Fatalf("expected clamped max line height %.2f, got %.2f", MaxLineHeight, updated.LineHeight)
	}
	if updated.ThemeMode != ContrastThemeMode {
		t.Fatalf("expected contrast theme mode, got %q", updated.ThemeMode)
	}

	updated, err = store.Update(context.Background(), Preferences{FontSize: 1, LineHeight: 0.2, ThemeMode: "bogus"})
	if err != nil {
		t.Fatalf("update preferences with low values: %v", err)
	}
	if updated.FontSize != MinFontSize {
		t.Fatalf("expected clamped min font size %d, got %d", MinFontSize, updated.FontSize)
	}
	if updated.LineHeight != MinLineHeight {
		t.Fatalf("expected clamped min line height %.2f, got %.2f", MinLineHeight, updated.LineHeight)
	}
	if updated.ThemeMode != DefaultThemeMode {
		t.Fatalf("expected invalid theme mode to clamp to %q, got %q", DefaultThemeMode, updated.ThemeMode)
	}

	reloadedStore, err := NewPreferencesStore(context.Background(), dbConn)
	if err != nil {
		t.Fatalf("reload preferences store: %v", err)
	}
	reloaded, err := reloadedStore.Snapshot(context.Background())
	if err != nil {
		t.Fatalf("reload snapshot: %v", err)
	}
	if reloaded.FontSize != MinFontSize {
		t.Fatalf("expected persisted font size %d, got %d", MinFontSize, reloaded.FontSize)
	}
	if reloaded.LineHeight != MinLineHeight {
		t.Fatalf("expected persisted line height %.2f, got %.2f", MinLineHeight, reloaded.LineHeight)
	}
	if reloaded.ThemeMode != DefaultThemeMode {
		t.Fatalf("expected persisted theme mode %q, got %q", DefaultThemeMode, reloaded.ThemeMode)
	}
}
