package httpapi

import (
	"archive/zip"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestPluginCatalogEndpointsInstallToggleListAndDelete(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	archiveURL := createPluginBundleZipArchive(t, "example.ziphandler", "1.0.0")

	installRecorder := httptest.NewRecorder()
	handler.ServeHTTP(installRecorder, authedJSONRequest(t, http.MethodPost, "/api/v1/plugins/install", map[string]any{
		"source": map[string]any{
			"kind": "zip",
			"url":  archiveURL,
		},
		"metadata": map[string]string{
			"team": "ops",
		},
		"access": map[string]any{
			"visibility":    "private",
			"allowed_users": []string{"alice", "bob"},
		},
	}))
	if installRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 install, got %d (%s)", installRecorder.Code, installRecorder.Body.String())
	}

	var installPayload struct {
		Plugin struct {
			ID            string            `json:"id"`
			Enabled       bool              `json:"enabled"`
			RuntimeStatus string            `json:"runtime_status"`
			Metadata      map[string]string `json:"metadata"`
			Access        struct {
				OwnerUsername string   `json:"owner_username"`
				Visibility    string   `json:"visibility"`
				AllowedUsers  []string `json:"allowed_users"`
			} `json:"access"`
			InstalledBy struct {
				Username string `json:"username"`
			} `json:"installed_by"`
		} `json:"plugin"`
		Plugins struct {
			CurrentActor struct {
				Username string `json:"username"`
			} `json:"current_actor"`
			Plugins []struct {
				ID string `json:"id"`
			} `json:"plugins"`
		} `json:"plugins"`
	}
	if err := json.Unmarshal(installRecorder.Body.Bytes(), &installPayload); err != nil {
		t.Fatalf("unmarshal install payload: %v", err)
	}
	if installPayload.Plugin.ID != "example.ziphandler" {
		t.Fatalf("unexpected installed plugin id: %#v", installPayload.Plugin)
	}
	if !installPayload.Plugin.Enabled || installPayload.Plugin.RuntimeStatus != "ready" {
		t.Fatalf("expected ready enabled plugin, got %#v", installPayload.Plugin)
	}
	if installPayload.Plugin.Metadata["team"] != "ops" {
		t.Fatalf("expected metadata in response, got %#v", installPayload.Plugin.Metadata)
	}
	if installPayload.Plugin.Access.Visibility != "private" || len(installPayload.Plugin.Access.AllowedUsers) != 2 {
		t.Fatalf("expected access payload to persist, got %#v", installPayload.Plugin.Access)
	}
	if installPayload.Plugin.Access.OwnerUsername == "" {
		t.Fatalf("expected owner_username to be derived from current actor")
	}
	if installPayload.Plugin.InstalledBy.Username == "" || installPayload.Plugins.CurrentActor.Username == "" {
		t.Fatalf("expected current actor metadata in payload, got %#v", installPayload)
	}

	listRecorder := httptest.NewRecorder()
	handler.ServeHTTP(listRecorder, authedJSONRequest(t, http.MethodGet, "/api/v1/plugins", nil))
	if listRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 list, got %d (%s)", listRecorder.Code, listRecorder.Body.String())
	}
	if !strings.Contains(listRecorder.Body.String(), `"current_actor"`) {
		t.Fatalf("expected current_actor in list response, got %s", listRecorder.Body.String())
	}

	disableRecorder := httptest.NewRecorder()
	handler.ServeHTTP(
		disableRecorder,
		authedJSONRequest(t, http.MethodPost, "/api/v1/plugins/example.ziphandler/disable", nil),
	)
	if disableRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 disable, got %d (%s)", disableRecorder.Code, disableRecorder.Body.String())
	}
	if !strings.Contains(disableRecorder.Body.String(), `"runtime_status":"disabled"`) {
		t.Fatalf("expected disabled status, got %s", disableRecorder.Body.String())
	}

	enableRecorder := httptest.NewRecorder()
	handler.ServeHTTP(
		enableRecorder,
		authedJSONRequest(t, http.MethodPost, "/api/v1/plugins/example.ziphandler/enable", nil),
	)
	if enableRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 enable, got %d (%s)", enableRecorder.Code, enableRecorder.Body.String())
	}
	if !strings.Contains(enableRecorder.Body.String(), `"runtime_status":"ready"`) {
		t.Fatalf("expected ready status, got %s", enableRecorder.Body.String())
	}

	deleteRecorder := httptest.NewRecorder()
	handler.ServeHTTP(
		deleteRecorder,
		authedJSONRequest(t, http.MethodDelete, "/api/v1/plugins/example.ziphandler", nil),
	)
	if deleteRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 delete, got %d (%s)", deleteRecorder.Code, deleteRecorder.Body.String())
	}
	if !strings.Contains(deleteRecorder.Body.String(), `"plugins":[]`) {
		t.Fatalf("expected empty plugin catalog after delete, got %s", deleteRecorder.Body.String())
	}
}

func TestPluginCatalogUpdateEndpointRefreshesVersionFromGitSource(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	repoRoot, repoURL := createPluginBundleGitRepo(t, "example.githandler", "1.0.0")

	installRecorder := httptest.NewRecorder()
	handler.ServeHTTP(installRecorder, authedJSONRequest(t, http.MethodPost, "/api/v1/plugins/install", map[string]any{
		"source": map[string]any{
			"kind": "git",
			"url":  repoURL,
		},
	}))
	if installRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 install, got %d (%s)", installRecorder.Code, installRecorder.Body.String())
	}

	writePluginBundleFixture(t, repoRoot, "example.githandler", "2.0.0", "plugin.bundle_echo")
	runPluginFixtureGit(t, repoRoot, "add", ".")
	runPluginFixtureGit(t, repoRoot, "commit", "-m", "update plugin bundle")

	updateRecorder := httptest.NewRecorder()
	handler.ServeHTTP(
		updateRecorder,
		authedJSONRequest(t, http.MethodPost, "/api/v1/plugins/example.githandler/update", nil),
	)
	if updateRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 update, got %d (%s)", updateRecorder.Code, updateRecorder.Body.String())
	}
	if !strings.Contains(updateRecorder.Body.String(), `"plugin_version":"2.0.0"`) {
		t.Fatalf("expected updated version in payload, got %s", updateRecorder.Body.String())
	}
}

func createPluginBundleGitRepo(t *testing.T, pluginID string, version string) (string, string) {
	t.Helper()

	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git is required for plugin handler tests")
	}

	repoRoot := t.TempDir()
	writePluginBundleFixture(t, repoRoot, pluginID, version, "plugin.bundle_echo")
	runPluginFixtureGit(t, repoRoot, "init")
	runPluginFixtureGit(t, repoRoot, "config", "user.email", "test@example.com")
	runPluginFixtureGit(t, repoRoot, "config", "user.name", "Test User")
	runPluginFixtureGit(t, repoRoot, "add", ".")
	runPluginFixtureGit(t, repoRoot, "commit", "-m", "initial plugin bundle")
	return repoRoot, "file://" + repoRoot
}

func createPluginBundleZipArchive(t *testing.T, pluginID string, version string) string {
	t.Helper()

	root := t.TempDir()
	bundleRoot := filepath.Join(root, "bundle")
	writePluginBundleFixture(t, bundleRoot, pluginID, version, "plugin.bundle_echo")

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

func writePluginBundleFixture(t *testing.T, root string, pluginID string, version string, toolName string) {
	t.Helper()

	if err := os.MkdirAll(root, 0o755); err != nil {
		t.Fatalf("MkdirAll(bundle) error: %v", err)
	}
	manifest := fmt.Sprintf(`{
  "plugin_id": %q,
  "display_name": "Fixture Plugin",
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
	if err := os.WriteFile(filepath.Join(root, "rterm-plugin.json"), []byte(manifest), 0o600); err != nil {
		t.Fatalf("WriteFile(manifest) error: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, "plugin.sh"), []byte("#!/bin/sh\nexit 0\n"), 0o600); err != nil {
		t.Fatalf("WriteFile(plugin.sh) error: %v", err)
	}
}

func runPluginFixtureGit(t *testing.T, dir string, args ...string) {
	t.Helper()

	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("git %v failed: %v\n%s", args, err, string(output))
	}
}
