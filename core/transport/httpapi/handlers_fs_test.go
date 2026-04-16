package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/app"
)

func TestListFSReturnsDirectoriesAndFiles(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	if err := os.Mkdir(filepath.Join(repoRoot, "docs"), 0o755); err != nil {
		t.Fatalf("mkdir docs: %v", err)
	}
	if err := os.Mkdir(filepath.Join(repoRoot, "scripts"), 0o755); err != nil {
		t.Fatalf("mkdir scripts: %v", err)
	}
	if err := os.WriteFile(filepath.Join(repoRoot, "README.md"), []byte("readme"), 0o600); err != nil {
		t.Fatalf("write README: %v", err)
	}
	if err := os.WriteFile(filepath.Join(repoRoot, "main.go"), []byte("package main"), 0o600); err != nil {
		t.Fatalf("write main.go: %v", err)
	}

	handler := NewHandler(&app.Runtime{RepoRoot: repoRoot}, testAuthToken)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodGet, "/api/v1/fs/list?path="+repoRoot, nil))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Path        string `json:"path"`
		Directories []struct {
			Name string `json:"name"`
			Type string `json:"type"`
		} `json:"directories"`
		Files []struct {
			Name string `json:"name"`
			Type string `json:"type"`
			Size int64  `json:"size"`
		} `json:"files"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if payload.Path != filepath.Clean(repoRoot) {
		t.Fatalf("unexpected path %q", payload.Path)
	}
	if len(payload.Directories) != 2 {
		t.Fatalf("expected 2 directories, got %d (%#v)", len(payload.Directories), payload.Directories)
	}
	if payload.Directories[0].Type != "directory" || payload.Directories[1].Type != "directory" {
		t.Fatalf("expected directory type entries, got %#v", payload.Directories)
	}
	if payload.Directories[0].Name != "docs" || payload.Directories[1].Name != "scripts" {
		t.Fatalf("unexpected directories order: %#v", payload.Directories)
	}
	if len(payload.Files) != 2 {
		t.Fatalf("expected 2 files, got %d (%#v)", len(payload.Files), payload.Files)
	}
	if payload.Files[0].Name != "main.go" || payload.Files[1].Name != "README.md" {
		t.Fatalf("unexpected files order: %#v", payload.Files)
	}
	if payload.Files[0].Type != "file" || payload.Files[1].Type != "file" {
		t.Fatalf("expected file type entries, got %#v", payload.Files)
	}
}

func TestListFSReturnsNotFoundForMissingPath(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	handler := NewHandler(&app.Runtime{RepoRoot: repoRoot}, testAuthToken)
	recorder := httptest.NewRecorder()
	missingPath := filepath.Join(repoRoot, "missing")

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodGet, "/api/v1/fs/list?path="+missingPath, nil))

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}
