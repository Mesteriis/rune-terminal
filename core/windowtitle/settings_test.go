package windowtitle

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/db"
)

func TestStoreBootstrapsDefaultSettings(t *testing.T) {
	t.Parallel()

	dbConn, err := db.Open(context.Background(), filepath.Join(t.TempDir(), "runtime.sqlite"))
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer dbConn.Close()

	store, err := NewStore(context.Background(), dbConn)
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}

	settings, err := store.Snapshot(context.Background())
	if err != nil {
		t.Fatalf("Snapshot error: %v", err)
	}

	if settings.Mode != ModeAuto || settings.CustomTitle != "" {
		t.Fatalf("unexpected default settings: %#v", settings)
	}
}

func TestStoreNormalizesAndPersistsCustomSettings(t *testing.T) {
	t.Parallel()

	dbConn, err := db.Open(context.Background(), filepath.Join(t.TempDir(), "runtime.sqlite"))
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer dbConn.Close()

	store, err := NewStore(context.Background(), dbConn)
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}

	updated, err := store.Update(context.Background(), Settings{
		Mode:        "custom",
		CustomTitle: "  Ops Shell Window  \n",
	})
	if err != nil {
		t.Fatalf("Update error: %v", err)
	}

	if updated.Mode != ModeCustom || updated.CustomTitle != "Ops Shell Window" {
		t.Fatalf("unexpected updated settings: %#v", updated)
	}

	reset, err := store.Update(context.Background(), Settings{
		Mode:        "auto",
		CustomTitle: "ignored",
	})
	if err != nil {
		t.Fatalf("Update(auto) error: %v", err)
	}

	if reset.Mode != ModeAuto || reset.CustomTitle != "" {
		t.Fatalf("expected auto mode to clear custom title, got %#v", reset)
	}
}

func TestComposeTitlePrefersCustomThenAutoThenProductFallback(t *testing.T) {
	t.Parallel()

	if got := ComposeTitle(Settings{Mode: ModeCustom, CustomTitle: "Ops Shell"}, "Workspace-1"); got != "Ops Shell" {
		t.Fatalf("expected custom title, got %q", got)
	}
	if got := ComposeTitle(Settings{Mode: ModeAuto}, "Workspace-1"); got != "Workspace-1 · RunaTerminal" {
		t.Fatalf("expected auto title, got %q", got)
	}
	if got := ComposeTitle(Settings{Mode: ModeAuto}, ""); got != DefaultProductLabel {
		t.Fatalf("expected product fallback, got %q", got)
	}
}
