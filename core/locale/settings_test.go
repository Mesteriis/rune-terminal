package locale

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/db"
)

func TestStoreDefaultsToRULocale(t *testing.T) {
	t.Parallel()

	dbConn, err := db.Open(context.Background(), filepath.Join(t.TempDir(), "runtime.sqlite"))
	if err != nil {
		t.Fatalf("db.Open error: %v", err)
	}

	store, err := NewStore(context.Background(), dbConn)
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}

	settings, err := store.Snapshot(context.Background())
	if err != nil {
		t.Fatalf("Snapshot error: %v", err)
	}

	if settings.Locale != LocaleRU {
		t.Fatalf("expected default locale %q, got %#v", LocaleRU, settings)
	}
}

func TestStoreNormalizesSupportedLocales(t *testing.T) {
	t.Parallel()

	dbConn, err := db.Open(context.Background(), filepath.Join(t.TempDir(), "runtime.sqlite"))
	if err != nil {
		t.Fatalf("db.Open error: %v", err)
	}

	store, err := NewStore(context.Background(), dbConn)
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}

	updated, err := store.Update(context.Background(), Settings{Locale: "CN"})
	if err != nil {
		t.Fatalf("Update error: %v", err)
	}

	if updated.Locale != LocaleZHCN {
		t.Fatalf("expected zh-CN normalization, got %#v", updated)
	}

	english, err := store.Update(context.Background(), Settings{Locale: "en"})
	if err != nil {
		t.Fatalf("Update english error: %v", err)
	}

	if english.Locale != LocaleEN {
		t.Fatalf("expected english locale %q, got %#v", LocaleEN, english)
	}

	reset, err := store.Update(context.Background(), Settings{Locale: "unknown"})
	if err != nil {
		t.Fatalf("Update fallback error: %v", err)
	}

	if reset.Locale != LocaleRU {
		t.Fatalf("expected fallback locale %q, got %#v", LocaleRU, reset)
	}
}
