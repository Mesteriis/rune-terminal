package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
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

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodGet, "/api/v1/fs/list", nil))

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

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodGet, "/api/v1/fs/list?path="+url.QueryEscape(missingPath), nil))

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestListFSRejectsTraversalOutsideWorkspace(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	handler := NewHandler(&app.Runtime{RepoRoot: repoRoot}, testAuthToken)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodGet, "/api/v1/fs/list?path=../", nil))

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestListFSRejectsAbsolutePathOutsideWorkspace(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	outsideRoot := t.TempDir()
	handler := NewHandler(&app.Runtime{RepoRoot: repoRoot}, testAuthToken)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodGet, "/api/v1/fs/list?path="+url.QueryEscape(outsideRoot), nil))

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestReadFSPreviewReturnsBoundedText(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	filePath := filepath.Join(repoRoot, "notes.txt")
	if err := os.WriteFile(filePath, []byte("hello world"), 0o600); err != nil {
		t.Fatalf("write file: %v", err)
	}
	handler := NewHandler(&app.Runtime{RepoRoot: repoRoot}, testAuthToken)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(
		recorder,
		authedJSONRequest(t, http.MethodGet, "/api/v1/fs/read?path="+url.QueryEscape(filePath)+"&max_bytes=5", nil),
	)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Path             string `json:"path"`
		Preview          string `json:"preview"`
		PreviewAvailable bool   `json:"preview_available"`
		Truncated        bool   `json:"truncated"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if payload.Path != filepath.Clean(filePath) {
		t.Fatalf("unexpected path %q", payload.Path)
	}
	if payload.Preview != "hello" {
		t.Fatalf("unexpected preview %q", payload.Preview)
	}
	if !payload.PreviewAvailable {
		t.Fatalf("expected preview_available=true, got %#v", payload)
	}
	if !payload.Truncated {
		t.Fatalf("expected truncated=true, got %#v", payload)
	}
}

func TestReadFSPreviewReturnsMetadataOnlyForBinary(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	filePath := filepath.Join(repoRoot, "binary.dat")
	if err := os.WriteFile(filePath, []byte{0, 1, 2, 3}, 0o600); err != nil {
		t.Fatalf("write file: %v", err)
	}
	handler := NewHandler(&app.Runtime{RepoRoot: repoRoot}, testAuthToken)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodGet, "/api/v1/fs/read?path="+url.QueryEscape(filePath), nil))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Preview          string `json:"preview"`
		PreviewAvailable bool   `json:"preview_available"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if payload.Preview != "" {
		t.Fatalf("expected empty preview for binary file, got %q", payload.Preview)
	}
	if payload.PreviewAvailable {
		t.Fatalf("expected preview_available=false, got %#v", payload)
	}
}

func TestReadFSPreviewRejectsDirectoryPath(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	handler := NewHandler(&app.Runtime{RepoRoot: repoRoot}, testAuthToken)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodGet, "/api/v1/fs/read?path="+url.QueryEscape(repoRoot), nil))

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestReadFSPreviewRejectsPathOutsideWorkspace(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	outsideRoot := t.TempDir()
	handler := NewHandler(&app.Runtime{RepoRoot: repoRoot}, testAuthToken)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodGet, "/api/v1/fs/read?path="+url.QueryEscape(outsideRoot), nil))

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}
