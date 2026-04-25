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
}

func TestPreferencesStoreClampsAndPersistsFontSize(t *testing.T) {
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

	updated, err := store.Update(context.Background(), Preferences{FontSize: 99})
	if err != nil {
		t.Fatalf("update preferences: %v", err)
	}
	if updated.FontSize != MaxFontSize {
		t.Fatalf("expected clamped max font size %d, got %d", MaxFontSize, updated.FontSize)
	}

	reloadedStore, err := NewPreferencesStore(context.Background(), dbConn)
	if err != nil {
		t.Fatalf("reload preferences store: %v", err)
	}
	reloaded, err := reloadedStore.Snapshot(context.Background())
	if err != nil {
		t.Fatalf("reload snapshot: %v", err)
	}
	if reloaded.FontSize != MaxFontSize {
		t.Fatalf("expected persisted font size %d, got %d", MaxFontSize, reloaded.FontSize)
	}
}
