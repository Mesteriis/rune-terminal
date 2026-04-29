package app

import (
	"path/filepath"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/plugins"
	"github.com/Mesteriis/rune-terminal/core/policy"
	"github.com/Mesteriis/rune-terminal/core/toolruntime"
)

func TestPluginCatalogCreateDoesNotMutateMemoryWhenPersistFails(t *testing.T) {
	t.Parallel()

	store := newPluginCatalogStoreForTest(t)
	store.path = filepath.Join(t.TempDir(), "missing-parent", "catalog.json")

	if _, _, err := store.Create(pluginCatalogStoreRecord("plugin.create"), pluginCatalogStoreActor()); err == nil {
		t.Fatalf("expected create persist failure")
	}
	if snapshot := store.Snapshot(pluginCatalogStoreActor()); len(snapshot.Plugins) != 0 {
		t.Fatalf("expected failed create to leave catalog empty, got %#v", snapshot.Plugins)
	}
}

func TestPluginCatalogReplaceDoesNotMutateMemoryWhenPersistFails(t *testing.T) {
	t.Parallel()

	store := newPluginCatalogStoreForTest(t)
	created, _, err := store.Create(pluginCatalogStoreRecord("plugin.replace"), pluginCatalogStoreActor())
	if err != nil {
		t.Fatalf("Create error: %v", err)
	}
	store.path = filepath.Join(t.TempDir(), "missing-parent", "catalog.json")

	created.DisplayName = "Updated display name"
	if _, _, err := store.Replace(created, pluginCatalogStoreActor()); err == nil {
		t.Fatalf("expected replace persist failure")
	}
	unchanged, err := store.Get("plugin.replace")
	if err != nil {
		t.Fatalf("Get error: %v", err)
	}
	if unchanged.DisplayName == "Updated display name" {
		t.Fatalf("expected failed replace to keep previous record, got %#v", unchanged)
	}
}

func TestPluginCatalogDeleteDoesNotMutateMemoryWhenPersistFails(t *testing.T) {
	t.Parallel()

	store := newPluginCatalogStoreForTest(t)
	if _, _, err := store.Create(pluginCatalogStoreRecord("plugin.delete"), pluginCatalogStoreActor()); err != nil {
		t.Fatalf("Create error: %v", err)
	}
	store.path = filepath.Join(t.TempDir(), "missing-parent", "catalog.json")

	if _, _, err := store.Delete("plugin.delete", pluginCatalogStoreActor()); err == nil {
		t.Fatalf("expected delete persist failure")
	}
	if _, err := store.Get("plugin.delete"); err != nil {
		t.Fatalf("expected failed delete to keep plugin visible, got %v", err)
	}
}

func newPluginCatalogStoreForTest(t *testing.T) *PluginCatalogStore {
	t.Helper()

	store, err := NewPluginCatalogStore(filepath.Join(t.TempDir(), "plugins.json"))
	if err != nil {
		t.Fatalf("NewPluginCatalogStore error: %v", err)
	}
	return store
}

func pluginCatalogStoreRecord(id string) InstalledPluginRecord {
	return InstalledPluginRecord{
		ID:              id,
		DisplayName:     "Plugin " + id,
		PluginVersion:   "1.0.0",
		ProtocolVersion: plugins.ProtocolVersionV1,
		Process: plugins.ProcessConfig{
			Command: "sh",
		},
		Tools: []InstalledPluginTool{
			{
				Name:         id + ".echo",
				Description:  "Echo",
				InputSchema:  []byte(`{"type":"object"}`),
				OutputSchema: []byte(`{"type":"object"}`),
				ApprovalTier: policy.ApprovalTierSafe,
				TargetKind:   toolruntime.TargetWorkspace,
			},
		},
		Source: PluginInstallSource{
			Kind: PluginInstallSourceGit,
			URL:  "file:///tmp/plugin",
		},
		Enabled:       true,
		RuntimeStatus: PluginRuntimeStatusReady,
		InstallRoot:   "/tmp/plugin",
	}
}

func pluginCatalogStoreActor() PluginActor {
	return PluginActor{Username: "tester", HomeDir: "/home/tester"}
}
