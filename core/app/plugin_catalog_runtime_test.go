package app

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/audit"
	"github.com/Mesteriis/rune-terminal/core/config"
	"github.com/Mesteriis/rune-terminal/core/plugins"
	"github.com/Mesteriis/rune-terminal/core/policy"
	"github.com/Mesteriis/rune-terminal/core/toolruntime"
)

func TestInstallPluginFromGitRegistersCatalogAndTools(t *testing.T) {
	t.Parallel()

	repoURL := createInstallablePluginGitRepo(t, "example.bundle", "1.0.0")
	runtime := newPluginCatalogTestRuntime(t)

	record, catalog, err := runtime.InstallPlugin(context.Background(), InstallPluginInput{
		Source: PluginInstallSource{
			Kind: PluginInstallSourceGit,
			URL:  repoURL,
		},
		Metadata: map[string]string{
			"team": "ops",
		},
	})
	if err != nil {
		t.Fatalf("InstallPlugin error: %v", err)
	}

	if record.ID != "example.bundle" || record.PluginVersion != "1.0.0" {
		t.Fatalf("unexpected installed plugin: %#v", record)
	}
	if record.Metadata["team"] != "ops" {
		t.Fatalf("expected persisted metadata, got %#v", record.Metadata)
	}
	if strings.TrimSpace(record.InstalledBy.Username) == "" {
		t.Fatalf("expected installed_by actor, got %#v", record.InstalledBy)
	}
	if record.Access.OwnerUsername != record.InstalledBy.Username {
		t.Fatalf("expected owner derived from actor, got %#v", record.Access)
	}
	if record.RuntimeStatus != PluginRuntimeStatusReady || !record.Enabled {
		t.Fatalf("expected ready enabled plugin, got %#v", record)
	}
	if len(catalog.Plugins) != 1 || catalog.Plugins[0].ID != "example.bundle" {
		t.Fatalf("unexpected plugin catalog snapshot: %#v", catalog)
	}
	if _, ok := runtime.Registry.Get("plugin.bundle_echo"); !ok {
		t.Fatalf("expected installed tool to be registered")
	}
	if _, err := os.Stat(filepath.Join(record.InstallRoot, installablePluginManifestFile)); err != nil {
		t.Fatalf("expected installed plugin files, got %v", err)
	}
}

func TestInstallPluginFromZipSupportsDisableEnableAndDelete(t *testing.T) {
	t.Parallel()

	archiveURL := createInstallablePluginZipArchive(t, "example.zipbundle", "1.0.0")
	runtime := newPluginCatalogTestRuntime(t)

	record, _, err := runtime.InstallPlugin(context.Background(), InstallPluginInput{
		Source: PluginInstallSource{
			Kind: PluginInstallSourceZip,
			URL:  archiveURL,
		},
	})
	if err != nil {
		t.Fatalf("InstallPlugin error: %v", err)
	}

	disabled, _, err := runtime.SetPluginEnabled(record.ID, false)
	if err != nil {
		t.Fatalf("SetPluginEnabled(false) error: %v", err)
	}
	if disabled.Enabled || disabled.RuntimeStatus != PluginRuntimeStatusDisabled {
		t.Fatalf("expected disabled plugin, got %#v", disabled)
	}
	if _, ok := runtime.Registry.Get("plugin.bundle_echo"); ok {
		t.Fatalf("expected tool to be removed after disable")
	}

	enabled, _, err := runtime.SetPluginEnabled(record.ID, true)
	if err != nil {
		t.Fatalf("SetPluginEnabled(true) error: %v", err)
	}
	if !enabled.Enabled || enabled.RuntimeStatus != PluginRuntimeStatusReady {
		t.Fatalf("expected re-enabled plugin, got %#v", enabled)
	}
	if _, ok := runtime.Registry.Get("plugin.bundle_echo"); !ok {
		t.Fatalf("expected tool to return after enable")
	}

	removed, catalog, err := runtime.DeleteInstalledPlugin(record.ID)
	if err != nil {
		t.Fatalf("DeleteInstalledPlugin error: %v", err)
	}
	if removed.ID != record.ID {
		t.Fatalf("unexpected removed plugin: %#v", removed)
	}
	if len(catalog.Plugins) != 0 {
		t.Fatalf("expected empty catalog after delete, got %#v", catalog)
	}
	if _, ok := runtime.Registry.Get("plugin.bundle_echo"); ok {
		t.Fatalf("expected tool to be removed after delete")
	}
	if _, err := os.Stat(record.InstallRoot); !os.IsNotExist(err) {
		t.Fatalf("expected install root removed, stat err=%v", err)
	}
}

func TestClonePluginRepositoryTerminatesOptionsBeforeSourceURL(t *testing.T) {
	binDir := t.TempDir()
	argsPath := filepath.Join(t.TempDir(), "git-args.txt")
	gitPath := filepath.Join(binDir, "git")
	if err := os.WriteFile(gitPath, []byte("#!/bin/sh\nprintf '%s\\n' \"$@\" > \"$GIT_ARGS_FILE\"\n"), 0o755); err != nil {
		t.Fatalf("WriteFile(fake git) error: %v", err)
	}
	t.Setenv("PATH", binDir+string(os.PathListSeparator)+os.Getenv("PATH"))
	t.Setenv("GIT_ARGS_FILE", argsPath)

	stageRoot := t.TempDir()
	_, err := clonePluginRepository(context.Background(), stageRoot, PluginInstallSource{
		Kind: PluginInstallSourceGit,
		URL:  "--upload-pack=malicious",
	})
	if err != nil {
		t.Fatalf("clonePluginRepository error: %v", err)
	}

	payload, err := os.ReadFile(argsPath)
	if err != nil {
		t.Fatalf("ReadFile(fake git args) error: %v", err)
	}
	args := strings.Split(strings.TrimSpace(string(payload)), "\n")
	if len(args) < 5 {
		t.Fatalf("unexpected git args: %#v", args)
	}
	if args[len(args)-3] != "--" || args[len(args)-2] != "--upload-pack=malicious" {
		t.Fatalf("expected -- before source URL, got %#v", args)
	}
}

func TestUpdateInstalledPluginRefreshesManifestVersion(t *testing.T) {
	t.Parallel()

	repoRoot, repoURL := createInstallablePluginGitRepoWithRoot(t, "example.updatebundle", "1.0.0")
	runtime := newPluginCatalogTestRuntime(t)

	record, _, err := runtime.InstallPlugin(context.Background(), InstallPluginInput{
		Source: PluginInstallSource{
			Kind: PluginInstallSourceGit,
			URL:  repoURL,
		},
	})
	if err != nil {
		t.Fatalf("InstallPlugin error: %v", err)
	}

	writeInstallablePluginBundle(t, repoRoot, "example.updatebundle", "2.0.0")
	runGit(t, repoRoot, "add", ".")
	runGit(t, repoRoot, "commit", "-m", "update plugin bundle")

	updated, _, err := runtime.UpdateInstalledPlugin(context.Background(), record.ID)
	if err != nil {
		t.Fatalf("UpdateInstalledPlugin error: %v", err)
	}
	if updated.PluginVersion != "2.0.0" {
		t.Fatalf("expected updated version, got %#v", updated)
	}
}

func TestUpdateInstalledPluginRestoresPreviousBundleWhenReplacementConflicts(t *testing.T) {
	t.Parallel()

	repoRoot, repoURL := createInstallablePluginGitRepoWithRoot(t, "example.rollbackbundle", "1.0.0")
	runtime := newPluginCatalogTestRuntime(t)
	if err := runtime.Registry.Register(toolruntime.Definition{
		Name:         "plugin.conflict",
		Description:  "conflicting tool",
		InputSchema:  json.RawMessage(`{"type":"object"}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: toolruntime.Metadata{
			ApprovalTier: policy.ApprovalTierSafe,
			TargetKind:   toolruntime.TargetWorkspace,
		},
		Decode: func(raw json.RawMessage) (any, error) {
			return raw, nil
		},
		Plan: func(any, toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
			return toolruntime.OperationPlan{}, nil
		},
		Execute: func(context.Context, toolruntime.ExecutionContext, any) (any, error) {
			return map[string]any{}, nil
		},
	}); err != nil {
		t.Fatalf("Register(conflict) error: %v", err)
	}

	record, _, err := runtime.InstallPlugin(context.Background(), InstallPluginInput{
		Source: PluginInstallSource{
			Kind: PluginInstallSourceGit,
			URL:  repoURL,
		},
	})
	if err != nil {
		t.Fatalf("InstallPlugin error: %v", err)
	}

	writeInstallablePluginBundleWithTool(t, repoRoot, "example.rollbackbundle", "2.0.0", "plugin.conflict")
	runGit(t, repoRoot, "add", ".")
	runGit(t, repoRoot, "commit", "-m", "introduce conflicting tool")

	_, _, err = runtime.UpdateInstalledPlugin(context.Background(), record.ID)
	if err == nil {
		t.Fatalf("expected update conflict error")
	}
	if _, ok := runtime.Registry.Get("plugin.bundle_echo"); !ok {
		t.Fatalf("expected original tool to remain registered after failed update")
	}
	manifestPath := filepath.Join(record.InstallRoot, installablePluginManifestFile)
	manifestBytes, readErr := os.ReadFile(manifestPath)
	if readErr != nil {
		t.Fatalf("ReadFile(manifest) error: %v", readErr)
	}
	if !strings.Contains(string(manifestBytes), `"plugin_version": "1.0.0"`) {
		t.Fatalf("expected original plugin bundle to be restored, got %s", string(manifestBytes))
	}

	snapshot, snapshotErr := runtime.ListInstalledPlugins()
	if snapshotErr != nil {
		t.Fatalf("ListInstalledPlugins error: %v", snapshotErr)
	}
	if len(snapshot.Plugins) != 1 || snapshot.Plugins[0].PluginVersion != "1.0.0" {
		t.Fatalf("expected catalog to keep previous plugin version, got %#v", snapshot.Plugins)
	}
}

func TestPluginLifecycleAppendsAuditEvents(t *testing.T) {
	t.Parallel()

	repoRoot, repoURL := createInstallablePluginGitRepoWithRoot(t, "example.auditbundle", "1.0.0")
	runtime := newPluginCatalogTestRuntime(t)
	auditLog := attachPluginAuditLog(t, runtime)

	record, _, err := runtime.InstallPlugin(context.Background(), InstallPluginInput{
		Source: PluginInstallSource{
			Kind: PluginInstallSourceGit,
			URL:  repoURL,
		},
	})
	if err != nil {
		t.Fatalf("InstallPlugin error: %v", err)
	}

	writeInstallablePluginBundle(t, repoRoot, "example.auditbundle", "2.0.0")
	runGit(t, repoRoot, "add", ".")
	runGit(t, repoRoot, "commit", "-m", "update plugin bundle")
	if _, _, err := runtime.UpdateInstalledPlugin(context.Background(), record.ID); err != nil {
		t.Fatalf("UpdateInstalledPlugin error: %v", err)
	}
	if _, _, err := runtime.SetPluginEnabled(record.ID, false); err != nil {
		t.Fatalf("SetPluginEnabled(false) error: %v", err)
	}
	if _, _, err := runtime.SetPluginEnabled(record.ID, true); err != nil {
		t.Fatalf("SetPluginEnabled(true) error: %v", err)
	}
	if _, _, err := runtime.DeleteInstalledPlugin(record.ID); err != nil {
		t.Fatalf("DeleteInstalledPlugin error: %v", err)
	}

	events, err := auditLog.List(10)
	if err != nil {
		t.Fatalf("audit list: %v", err)
	}
	expectedTools := []string{
		"plugin.install",
		"plugin.update",
		"plugin.disable",
		"plugin.enable",
		"plugin.delete",
	}
	if len(events) != len(expectedTools) {
		t.Fatalf("expected %d audit events, got %d (%#v)", len(expectedTools), len(events), events)
	}
	for index, expectedTool := range expectedTools {
		event := events[index]
		if event.ToolName != expectedTool || !event.Success || event.Error != "" {
			t.Fatalf("unexpected audit event %d: %#v", index, event)
		}
		if event.ActionSource != "plugin.catalog" {
			t.Fatalf("expected plugin.catalog action source, got %#v", event)
		}
		if len(event.AffectedPaths) == 0 {
			t.Fatalf("expected affected path for %s, got %#v", expectedTool, event)
		}
	}
}

func TestInstallPluginAppendsFailureAuditEvent(t *testing.T) {
	t.Parallel()

	runtime := newPluginCatalogTestRuntime(t)
	auditLog := attachPluginAuditLog(t, runtime)

	_, _, err := runtime.InstallPlugin(context.Background(), InstallPluginInput{
		Source: PluginInstallSource{
			Kind: PluginInstallSourceZip,
			URL:  "file://" + filepath.Join(t.TempDir(), "missing.zip"),
		},
	})
	if err == nil {
		t.Fatalf("expected missing archive install to fail")
	}

	events, listErr := auditLog.List(10)
	if listErr != nil {
		t.Fatalf("audit list: %v", listErr)
	}
	if len(events) != 1 {
		t.Fatalf("expected one failure audit event, got %#v", events)
	}
	event := events[0]
	if event.ToolName != "plugin.install" || event.Success || event.Error == "" {
		t.Fatalf("unexpected failure audit event: %#v", event)
	}
}

func TestInstallPluginRejectsZipArchiveOverExpandedSizeLimit(t *testing.T) {
	t.Parallel()

	archiveURL := createOversizedPluginZipArchive(t)
	runtime := newPluginCatalogTestRuntime(t)

	_, _, err := runtime.InstallPlugin(context.Background(), InstallPluginInput{
		Source: PluginInstallSource{
			Kind: PluginInstallSourceZip,
			URL:  archiveURL,
		},
	})
	if err == nil {
		t.Fatalf("expected oversized zip archive install to fail")
	}
	if !errors.Is(err, plugins.ErrInvalidPluginSpec) {
		t.Fatalf("expected invalid plugin spec error, got %v", err)
	}
}

func TestInstallPluginRejectsZipArchiveEntryOutsideRootPrefix(t *testing.T) {
	t.Parallel()

	archiveURL := createPluginZipArchiveWithEntry(t, "../zip-evil/escape.txt", []byte("outside"))
	runtime := newPluginCatalogTestRuntime(t)

	_, _, err := runtime.InstallPlugin(context.Background(), InstallPluginInput{
		Source: PluginInstallSource{
			Kind: PluginInstallSourceZip,
			URL:  archiveURL,
		},
	})
	if err == nil {
		t.Fatalf("expected zip archive with escaping entry to fail")
	}
	if !errors.Is(err, plugins.ErrInvalidPluginSpec) {
		t.Fatalf("expected invalid plugin spec error, got %v", err)
	}
}

func TestInstallPluginRejectsBundleSymlinkEntries(t *testing.T) {
	t.Parallel()

	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git is required for plugin git install tests")
	}
	outsideRoot := t.TempDir()
	outsidePath := filepath.Join(outsideRoot, "outside-secret.txt")
	if err := os.WriteFile(outsidePath, []byte("outside secret"), 0o600); err != nil {
		t.Fatalf("WriteFile(outside) error: %v", err)
	}
	repoRoot := t.TempDir()
	writeInstallablePluginBundle(t, repoRoot, "example.symlinkbundle", "1.0.0")
	if err := os.Symlink(outsidePath, filepath.Join(repoRoot, "outside-link.txt")); err != nil {
		t.Skipf("symlink unsupported: %v", err)
	}
	runGit(t, repoRoot, "init")
	runGit(t, repoRoot, "config", "user.email", "test@example.com")
	runGit(t, repoRoot, "config", "user.name", "Test User")
	runGit(t, repoRoot, "add", ".")
	runGit(t, repoRoot, "commit", "-m", "add plugin bundle with symlink")

	runtime := newPluginCatalogTestRuntime(t)
	_, _, err := runtime.InstallPlugin(context.Background(), InstallPluginInput{
		Source: PluginInstallSource{
			Kind: PluginInstallSourceGit,
			URL:  "file://" + repoRoot,
		},
	})
	if err == nil {
		t.Fatalf("expected plugin bundle with symlink to fail")
	}
	if !errors.Is(err, plugins.ErrInvalidPluginSpec) {
		t.Fatalf("expected invalid plugin spec error, got %v", err)
	}
	assertNoPluginStagingDirs(t, runtime)
}

func TestInstallPluginRejectsGitBundleOverCopiedSizeLimit(t *testing.T) {
	t.Parallel()

	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git is required for plugin git install tests")
	}
	repoRoot := t.TempDir()
	writeInstallablePluginBundle(t, repoRoot, "example.largebundle", "1.0.0")
	if err := os.WriteFile(filepath.Join(repoRoot, "large.bin"), oversizedZipPayload(t), 0o600); err != nil {
		t.Fatalf("WriteFile(large.bin) error: %v", err)
	}
	runGit(t, repoRoot, "init")
	runGit(t, repoRoot, "config", "user.email", "test@example.com")
	runGit(t, repoRoot, "config", "user.name", "Test User")
	runGit(t, repoRoot, "add", ".")
	runGit(t, repoRoot, "commit", "-m", "add oversized plugin bundle")

	runtime := newPluginCatalogTestRuntime(t)
	_, _, err := runtime.InstallPlugin(context.Background(), InstallPluginInput{
		Source: PluginInstallSource{
			Kind: PluginInstallSourceGit,
			URL:  "file://" + repoRoot,
		},
	})
	if err == nil {
		t.Fatalf("expected oversized plugin bundle install to fail")
	}
	if !errors.Is(err, plugins.ErrInvalidPluginSpec) {
		t.Fatalf("expected invalid plugin spec error, got %v", err)
	}
}

func TestInstallPluginRejectsFileZipOverDownloadedSizeLimit(t *testing.T) {
	t.Parallel()

	archivePath := filepath.Join(t.TempDir(), "oversized.zip")
	file, err := os.OpenFile(archivePath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o600)
	if err != nil {
		t.Fatalf("OpenFile(oversized zip) error: %v", err)
	}
	if err := file.Truncate(pluginArchiveMaxDownloadedBytes + 1); err != nil {
		t.Fatalf("Truncate(oversized zip) error: %v", err)
	}
	if err := file.Close(); err != nil {
		t.Fatalf("Close(oversized zip) error: %v", err)
	}
	runtime := newPluginCatalogTestRuntime(t)

	_, _, err = runtime.InstallPlugin(context.Background(), InstallPluginInput{
		Source: PluginInstallSource{
			Kind: PluginInstallSourceZip,
			URL:  "file://" + archivePath,
		},
	})
	if err == nil {
		t.Fatalf("expected oversized file zip install to fail")
	}
	if !errors.Is(err, plugins.ErrInvalidPluginSpec) {
		t.Fatalf("expected invalid plugin spec error, got %v", err)
	}
	if !strings.Contains(err.Error(), "zip archive download is too large") {
		t.Fatalf("expected compressed-size error, got %v", err)
	}
}

func TestDeleteInstalledPluginKeepsCatalogWhenInstallRootRemovalFails(t *testing.T) {
	t.Parallel()

	runtime := newPluginCatalogTestRuntime(t)
	actor := runtime.currentPluginActor()
	record := InstalledPluginRecord{
		ID:              "example.deletefail",
		DisplayName:     "Delete Fail",
		PluginVersion:   "1.0.0",
		ProtocolVersion: plugins.ProtocolVersionV1,
		Process: plugins.ProcessConfig{
			Command: "sh",
		},
		Tools:         []InstalledPluginTool{},
		RuntimeStatus: PluginRuntimeStatusDisabled,
		InstallRoot:   "invalid\x00path",
	}
	if _, _, err := runtime.PluginCatalog.Create(record, actor); err != nil {
		t.Fatalf("Create plugin record error: %v", err)
	}

	_, _, err := runtime.DeleteInstalledPlugin(record.ID)
	if err == nil {
		t.Fatalf("expected delete to fail")
	}

	snapshot, snapshotErr := runtime.ListInstalledPlugins()
	if snapshotErr != nil {
		t.Fatalf("ListInstalledPlugins error: %v", snapshotErr)
	}
	if len(snapshot.Plugins) != 1 || snapshot.Plugins[0].ID != record.ID {
		t.Fatalf("expected failed delete to keep catalog record, got %#v", snapshot.Plugins)
	}
}

func assertNoPluginStagingDirs(t *testing.T, runtime *Runtime) {
	t.Helper()

	entries, err := os.ReadDir(runtime.Paths.PluginInstallRoot)
	if err != nil {
		if os.IsNotExist(err) {
			return
		}
		t.Fatalf("ReadDir(plugin install root) error: %v", err)
	}
	for _, entry := range entries {
		if strings.Contains(entry.Name(), ".staging-") {
			t.Fatalf("expected failed plugin install to remove staging dir, found %s", entry.Name())
		}
	}
}

func newPluginCatalogTestRuntime(t *testing.T) *Runtime {
	t.Helper()

	stateDir := t.TempDir()
	paths := config.Resolve(stateDir)
	store, err := NewPluginCatalogStore(paths.PluginCatalogFile)
	if err != nil {
		t.Fatalf("NewPluginCatalogStore error: %v", err)
	}
	return &Runtime{
		HomeDir:       "/home/testuser",
		Paths:         paths,
		PluginCatalog: store,
		Registry:      toolruntime.NewRegistry(),
	}
}

func attachPluginAuditLog(t *testing.T, runtime *Runtime) *audit.Log {
	t.Helper()

	auditLog, err := audit.NewLog(filepath.Join(t.TempDir(), "audit.jsonl"))
	if err != nil {
		t.Fatalf("NewLog error: %v", err)
	}
	runtime.Audit = auditLog
	return auditLog
}

func createInstallablePluginGitRepo(t *testing.T, pluginID string, version string) string {
	t.Helper()
	_, repoURL := createInstallablePluginGitRepoWithRoot(t, pluginID, version)
	return repoURL
}

func createInstallablePluginGitRepoWithRoot(t *testing.T, pluginID string, version string) (string, string) {
	t.Helper()

	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git is required for plugin git install tests")
	}

	repoRoot := t.TempDir()
	writeInstallablePluginBundle(t, repoRoot, pluginID, version)
	runGit(t, repoRoot, "init")
	runGit(t, repoRoot, "config", "user.email", "test@example.com")
	runGit(t, repoRoot, "config", "user.name", "Test User")
	runGit(t, repoRoot, "add", ".")
	runGit(t, repoRoot, "commit", "-m", "initial plugin bundle")
	return repoRoot, "file://" + repoRoot
}

func createInstallablePluginZipArchive(t *testing.T, pluginID string, version string) string {
	t.Helper()

	root := t.TempDir()
	bundleRoot := filepath.Join(root, "bundle")
	writeInstallablePluginBundle(t, bundleRoot, pluginID, version)

	archivePath := filepath.Join(root, "plugin.zip")
	file, err := os.OpenFile(archivePath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o600)
	if err != nil {
		t.Fatalf("OpenFile(zip) error: %v", err)
	}
	archive := zip.NewWriter(file)
	err = filepath.Walk(bundleRoot, func(path string, info os.FileInfo, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		relative, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}
		header, err := zip.FileInfoHeader(info)
		if err != nil {
			return err
		}
		header.Name = filepath.ToSlash(relative)
		if info.IsDir() {
			header.Name += "/"
			_, err = archive.CreateHeader(header)
			return err
		}
		writer, err := archive.CreateHeader(header)
		if err != nil {
			return err
		}
		input, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		_, err = writer.Write(input)
		return err
	})
	if err != nil {
		t.Fatalf("Walk(zip) error: %v", err)
	}
	if err := archive.Close(); err != nil {
		t.Fatalf("zip.Close error: %v", err)
	}
	if err := file.Close(); err != nil {
		t.Fatalf("file.Close error: %v", err)
	}
	return "file://" + archivePath
}

func createOversizedPluginZipArchive(t *testing.T) string {
	t.Helper()

	return createPluginZipArchiveWithEntry(t, "bundle/large.bin", oversizedZipPayload(t))
}

func oversizedZipPayload(t *testing.T) []byte {
	t.Helper()

	chunk := bytes.Repeat([]byte("x"), 1024*1024)
	payload := make([]byte, 0, 40*1024*1024)
	for index := 0; index < 40; index++ {
		payload = append(payload, chunk...)
	}
	return payload
}

func createPluginZipArchiveWithEntry(t *testing.T, name string, payload []byte) string {
	t.Helper()

	root := t.TempDir()
	bundleRoot := filepath.Join(root, "bundle")
	writeInstallablePluginBundle(t, bundleRoot, "example.zipguard", "1.0.0")

	archivePath := filepath.Join(root, "plugin.zip")
	file, err := os.OpenFile(archivePath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o600)
	if err != nil {
		t.Fatalf("OpenFile(zip) error: %v", err)
	}
	archive := zip.NewWriter(file)
	addDirectoryToZip(t, archive, root, bundleRoot)
	writer, err := archive.Create(filepath.ToSlash(name))
	if err != nil {
		t.Fatalf("Create(extra zip entry) error: %v", err)
	}
	if _, err := writer.Write(payload); err != nil {
		t.Fatalf("Write(extra zip entry) error: %v", err)
	}
	if err := archive.Close(); err != nil {
		t.Fatalf("zip.Close error: %v", err)
	}
	if err := file.Close(); err != nil {
		t.Fatalf("file.Close error: %v", err)
	}
	return "file://" + archivePath
}

func addDirectoryToZip(t *testing.T, archive *zip.Writer, archiveRoot string, sourceRoot string) {
	t.Helper()

	err := filepath.Walk(sourceRoot, func(path string, info os.FileInfo, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		relative, err := filepath.Rel(archiveRoot, path)
		if err != nil {
			return err
		}
		header, err := zip.FileInfoHeader(info)
		if err != nil {
			return err
		}
		header.Name = filepath.ToSlash(relative)
		if info.IsDir() {
			header.Name += "/"
			_, err = archive.CreateHeader(header)
			return err
		}
		writer, err := archive.CreateHeader(header)
		if err != nil {
			return err
		}
		input, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		_, err = writer.Write(input)
		return err
	})
	if err != nil {
		t.Fatalf("Walk(zip) error: %v", err)
	}
}

func writeInstallablePluginBundle(t *testing.T, root string, pluginID string, version string) {
	t.Helper()

	writeInstallablePluginBundleWithTool(t, root, pluginID, version, "plugin.bundle_echo")
}

func writeInstallablePluginBundleWithTool(
	t *testing.T,
	root string,
	pluginID string,
	version string,
	toolName string,
) {
	t.Helper()

	if err := os.MkdirAll(root, 0o755); err != nil {
		t.Fatalf("MkdirAll(bundle) error: %v", err)
	}
	manifest := fmt.Sprintf(`{
  "plugin_id": %q,
  "display_name": "Bundle Plugin",
  "description": "Installable plugin fixture",
  "plugin_version": %q,
  "protocol_version": "rterm.plugin.v1",
  "capabilities": ["tool.execute", "workspace:read"],
  "process": {
    "command": "sh",
    "args": ["plugin.sh"],
    "dir": "."
  },
  "tools": [
    {
      "name": %q,
      "description": "Echo through bundle plugin",
      "input_schema": {"type":"object","properties":{"text":{"type":"string"}},"additionalProperties":true},
      "output_schema": {"type":"object","additionalProperties":true},
      "capabilities": ["workspace:read"],
      "approval_tier": "safe",
      "target_kind": "workspace"
    }
  ]
}`, pluginID, version, toolName)
	if err := os.WriteFile(filepath.Join(root, installablePluginManifestFile), []byte(manifest), 0o600); err != nil {
		t.Fatalf("WriteFile(manifest) error: %v", err)
	}
	script := "#!/bin/sh\nexit 0\n"
	if err := os.WriteFile(filepath.Join(root, "plugin.sh"), []byte(script), 0o600); err != nil {
		t.Fatalf("WriteFile(plugin.sh) error: %v", err)
	}
}

func runGit(t *testing.T, dir string, args ...string) {
	t.Helper()

	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("git %v failed: %v\n%s", args, err, string(output))
	}
}
