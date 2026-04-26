package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/app"
	"github.com/Mesteriis/rune-terminal/core/connections"
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

func TestListFSFiltersEntriesByWildcardQuery(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	if err := os.Mkdir(filepath.Join(repoRoot, "docs"), 0o755); err != nil {
		t.Fatalf("mkdir docs: %v", err)
	}
	if err := os.WriteFile(filepath.Join(repoRoot, "alpha.ts"), []byte("alpha"), 0o600); err != nil {
		t.Fatalf("write alpha.ts: %v", err)
	}
	if err := os.WriteFile(filepath.Join(repoRoot, "beta.md"), []byte("beta"), 0o600); err != nil {
		t.Fatalf("write beta.md: %v", err)
	}
	if err := os.WriteFile(filepath.Join(repoRoot, "notes.txt"), []byte("notes"), 0o600); err != nil {
		t.Fatalf("write notes.txt: %v", err)
	}

	handler := NewHandler(&app.Runtime{RepoRoot: repoRoot}, testAuthToken)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(
		recorder,
		authedJSONRequest(
			t,
			http.MethodGet,
			"/api/v1/fs/list?query="+url.QueryEscape("*.md;docs"),
			nil,
		),
	)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Directories []struct {
			Name string `json:"name"`
		} `json:"directories"`
		Files []struct {
			Name string `json:"name"`
		} `json:"files"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if len(payload.Directories) != 1 || payload.Directories[0].Name != "docs" {
		t.Fatalf("unexpected filtered directories: %#v", payload.Directories)
	}
	if len(payload.Files) != 1 || payload.Files[0].Name != "beta.md" {
		t.Fatalf("unexpected filtered files: %#v", payload.Files)
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

func TestListFSAllowsAbsolutePathOutsideWorkspaceWithExplicitFlag(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	outsideRoot := t.TempDir()
	if err := os.WriteFile(filepath.Join(outsideRoot, "notes.txt"), []byte("hello"), 0o600); err != nil {
		t.Fatalf("write outside file: %v", err)
	}
	handler := NewHandler(&app.Runtime{RepoRoot: repoRoot}, testAuthToken)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(
		recorder,
		authedJSONRequest(
			t,
			http.MethodGet,
			"/api/v1/fs/list?path="+url.QueryEscape(outsideRoot)+"&allow_outside_workspace=1",
			nil,
		),
	)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Path  string `json:"path"`
		Files []struct {
			Name string `json:"name"`
		} `json:"files"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if payload.Path != filepath.Clean(outsideRoot) {
		t.Fatalf("unexpected path %q", payload.Path)
	}
	if len(payload.Files) != 1 || payload.Files[0].Name != "notes.txt" {
		t.Fatalf("unexpected files payload: %#v", payload.Files)
	}
}

func TestMkdirFSCreatesDirectoryAndReturnsCreatedPath(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	handler := NewHandler(&app.Runtime{RepoRoot: repoRoot}, testAuthToken)
	recorder := httptest.NewRecorder()
	targetPath := filepath.Join(repoRoot, "tmp", "commander")
	if err := os.Mkdir(filepath.Join(repoRoot, "tmp"), 0o755); err != nil {
		t.Fatalf("mkdir tmp: %v", err)
	}

	handler.ServeHTTP(
		recorder,
		authedJSONRequest(t, http.MethodPost, "/api/v1/fs/mkdir", map[string]string{
			"path": targetPath,
		}),
	)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Path string `json:"path"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if payload.Path != filepath.Clean(targetPath) {
		t.Fatalf("unexpected path %q", payload.Path)
	}

	info, err := os.Stat(targetPath)
	if err != nil {
		t.Fatalf("stat created directory: %v", err)
	}
	if !info.IsDir() {
		t.Fatalf("expected created path to be a directory")
	}
}

func TestMkdirFSRejectsPathOutsideWorkspace(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	handler := NewHandler(&app.Runtime{RepoRoot: repoRoot}, testAuthToken)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(
		recorder,
		authedJSONRequest(t, http.MethodPost, "/api/v1/fs/mkdir", map[string]string{
			"path": "../outside",
		}),
	)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestMkdirFSReturnsConflictWhenPathAlreadyExists(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	targetPath := filepath.Join(repoRoot, "tmp")
	if err := os.Mkdir(targetPath, 0o755); err != nil {
		t.Fatalf("mkdir tmp: %v", err)
	}
	handler := NewHandler(&app.Runtime{RepoRoot: repoRoot}, testAuthToken)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(
		recorder,
		authedJSONRequest(t, http.MethodPost, "/api/v1/fs/mkdir", map[string]string{
			"path": targetPath,
		}),
	)

	if recorder.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if payload.Error.Code != "fs_path_exists" {
		t.Fatalf("unexpected error code %q", payload.Error.Code)
	}
}

func TestCopyFSWritesIntoTargetDirectory(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	sourcePath := filepath.Join(repoRoot, "README.md")
	targetPath := filepath.Join(repoRoot, "tmp")
	if err := os.WriteFile(sourcePath, []byte("copy me"), 0o600); err != nil {
		t.Fatalf("write README: %v", err)
	}
	if err := os.Mkdir(targetPath, 0o755); err != nil {
		t.Fatalf("mkdir tmp: %v", err)
	}

	handler := NewHandler(&app.Runtime{RepoRoot: repoRoot}, testAuthToken)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(
		recorder,
		authedJSONRequest(t, http.MethodPost, "/api/v1/fs/copy", map[string]any{
			"source_paths": []string{sourcePath},
			"target_path":  targetPath,
		}),
	)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	copiedPath := filepath.Join(targetPath, "README.md")
	content, err := os.ReadFile(copiedPath)
	if err != nil {
		t.Fatalf("read copied file: %v", err)
	}
	if string(content) != "copy me" {
		t.Fatalf("unexpected copied content %q", string(content))
	}
}

func TestCopyFSReturnsConflictWhenTargetExistsWithoutOverwrite(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	sourcePath := filepath.Join(repoRoot, "README.md")
	targetPath := filepath.Join(repoRoot, "tmp")
	if err := os.WriteFile(sourcePath, []byte("copy me"), 0o600); err != nil {
		t.Fatalf("write README: %v", err)
	}
	if err := os.Mkdir(targetPath, 0o755); err != nil {
		t.Fatalf("mkdir tmp: %v", err)
	}
	if err := os.WriteFile(filepath.Join(targetPath, "README.md"), []byte("existing"), 0o600); err != nil {
		t.Fatalf("write target README: %v", err)
	}

	handler := NewHandler(&app.Runtime{RepoRoot: repoRoot}, testAuthToken)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(
		recorder,
		authedJSONRequest(t, http.MethodPost, "/api/v1/fs/copy", map[string]any{
			"source_paths": []string{sourcePath},
			"target_path":  targetPath,
		}),
	)

	if recorder.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if payload.Error.Code != "fs_path_exists" {
		t.Fatalf("unexpected error code %q", payload.Error.Code)
	}
}

func TestCopyFSWritesIntoExplicitTargetPath(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	sourceDirectory := filepath.Join(repoRoot, "tmp")
	sourcePath := filepath.Join(sourceDirectory, "README.md")
	targetPath := filepath.Join(sourceDirectory, "README-copy.md")
	if err := os.Mkdir(sourceDirectory, 0o755); err != nil {
		t.Fatalf("mkdir tmp: %v", err)
	}
	if err := os.WriteFile(sourcePath, []byte("clone me"), 0o600); err != nil {
		t.Fatalf("write README: %v", err)
	}

	handler := NewHandler(&app.Runtime{RepoRoot: repoRoot}, testAuthToken)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(
		recorder,
		authedJSONRequest(t, http.MethodPost, "/api/v1/fs/copy", map[string]any{
			"entries": []map[string]string{
				{
					"source_path": sourcePath,
					"target_path": targetPath,
				},
			},
		}),
	)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	content, err := os.ReadFile(targetPath)
	if err != nil {
		t.Fatalf("read cloned file: %v", err)
	}
	if string(content) != "clone me" {
		t.Fatalf("unexpected cloned content %q", string(content))
	}
}

func TestMoveFSRelocatesFileIntoTargetDirectory(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	sourceDirectory := filepath.Join(repoRoot, "src")
	targetDirectory := filepath.Join(repoRoot, "dst")
	if err := os.Mkdir(sourceDirectory, 0o755); err != nil {
		t.Fatalf("mkdir src: %v", err)
	}
	if err := os.Mkdir(targetDirectory, 0o755); err != nil {
		t.Fatalf("mkdir dst: %v", err)
	}
	sourcePath := filepath.Join(sourceDirectory, "notes.txt")
	if err := os.WriteFile(sourcePath, []byte("move me"), 0o600); err != nil {
		t.Fatalf("write notes: %v", err)
	}

	handler := NewHandler(&app.Runtime{RepoRoot: repoRoot}, testAuthToken)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(
		recorder,
		authedJSONRequest(t, http.MethodPost, "/api/v1/fs/move", map[string]any{
			"source_paths": []string{sourcePath},
			"target_path":  targetDirectory,
		}),
	)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	if _, err := os.Stat(sourcePath); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("expected source file to disappear, got err=%v", err)
	}
	if _, err := os.Stat(filepath.Join(targetDirectory, "notes.txt")); err != nil {
		t.Fatalf("stat moved file: %v", err)
	}
}

func TestDeleteFSRemovesDirectoryTree(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	targetPath := filepath.Join(repoRoot, "tmp")
	if err := os.Mkdir(targetPath, 0o755); err != nil {
		t.Fatalf("mkdir tmp: %v", err)
	}
	if err := os.WriteFile(filepath.Join(targetPath, "notes.txt"), []byte("delete me"), 0o600); err != nil {
		t.Fatalf("write notes: %v", err)
	}

	handler := NewHandler(&app.Runtime{RepoRoot: repoRoot}, testAuthToken)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(
		recorder,
		authedJSONRequest(t, http.MethodPost, "/api/v1/fs/delete", map[string]any{
			"paths": []string{targetPath},
		}),
	)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	if _, err := os.Stat(targetPath); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("expected directory tree to be deleted, got err=%v", err)
	}
}

func TestRenameFSRenamesEntryWithinSameDirectory(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	sourcePath := filepath.Join(repoRoot, "README.md")
	if err := os.WriteFile(sourcePath, []byte("rename me"), 0o600); err != nil {
		t.Fatalf("write README: %v", err)
	}

	handler := NewHandler(&app.Runtime{RepoRoot: repoRoot}, testAuthToken)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(
		recorder,
		authedJSONRequest(t, http.MethodPost, "/api/v1/fs/rename", map[string]any{
			"entries": []map[string]string{
				{
					"path":      sourcePath,
					"next_name": "README-renamed.md",
				},
			},
		}),
	)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	if _, err := os.Stat(sourcePath); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("expected source file to disappear, got err=%v", err)
	}
	if _, err := os.Stat(filepath.Join(repoRoot, "README-renamed.md")); err != nil {
		t.Fatalf("stat renamed file: %v", err)
	}
}

func TestRenameFSRejectsInvalidTargetName(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	sourcePath := filepath.Join(repoRoot, "README.md")
	if err := os.WriteFile(sourcePath, []byte("rename me"), 0o600); err != nil {
		t.Fatalf("write README: %v", err)
	}

	handler := NewHandler(&app.Runtime{RepoRoot: repoRoot}, testAuthToken)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(
		recorder,
		authedJSONRequest(t, http.MethodPost, "/api/v1/fs/rename", map[string]any{
			"entries": []map[string]string{
				{
					"path":      sourcePath,
					"next_name": "../outside.md",
				},
			},
		}),
	)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if payload.Error.Code != "invalid_fs_name" {
		t.Fatalf("unexpected error code %q", payload.Error.Code)
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
		PreviewBytes     int    `json:"preview_bytes"`
		PreviewKind      string `json:"preview_kind"`
		SizeBytes        int64  `json:"size_bytes"`
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
	if payload.PreviewKind != "text" {
		t.Fatalf("expected preview_kind=text, got %#v", payload)
	}
	if payload.PreviewBytes != len("hello") {
		t.Fatalf("expected preview_bytes=%d, got %#v", len("hello"), payload)
	}
	if payload.SizeBytes != int64(len("hello world")) {
		t.Fatalf("expected size_bytes=%d, got %#v", len("hello world"), payload)
	}
	if !payload.Truncated {
		t.Fatalf("expected truncated=true, got %#v", payload)
	}
}

func TestReadFSPreviewReturnsHexPreviewForBinary(t *testing.T) {
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
		PreviewBytes     int    `json:"preview_bytes"`
		PreviewKind      string `json:"preview_kind"`
		SizeBytes        int64  `json:"size_bytes"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if payload.Preview != "00000000  00 01 02 03                                      |....|" {
		t.Fatalf("unexpected binary preview %q", payload.Preview)
	}
	if !payload.PreviewAvailable {
		t.Fatalf("expected preview_available=true, got %#v", payload)
	}
	if payload.PreviewKind != "hex" {
		t.Fatalf("expected preview_kind=hex, got %#v", payload)
	}
	if payload.PreviewBytes != 4 {
		t.Fatalf("expected preview_bytes=4, got %#v", payload)
	}
	if payload.SizeBytes != 4 {
		t.Fatalf("expected size_bytes=4, got %#v", payload)
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

func TestListFSRoutesRemoteConnectionAwareRequestsThroughSSH(t *testing.T) {
	t.Setenv("PATH", installFakeSSHBinary(t, "#!/bin/sh\nprintf '/remote/project\\n__RTSEP__\\nsrc\\tdirectory\\t1714170000\\t0\\nREADME.md\\tfile\\t1714170060\\t12\\n'\n")+string(os.PathListSeparator)+os.Getenv("PATH"))

	runtime := &app.Runtime{
		Connections: newRemoteFSHandlerConnectionStore(t),
		RepoRoot:    t.TempDir(),
	}
	handler := NewHandler(runtime, testAuthToken)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(
		recorder,
		authedJSONRequest(
			t,
			http.MethodGet,
			"/api/v1/fs/list?path="+url.QueryEscape("/remote/project")+"&connection_id=conn-ssh",
			nil,
		),
	)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Path        string `json:"path"`
		Directories []struct {
			Name string `json:"name"`
		} `json:"directories"`
		Files []struct {
			Name string `json:"name"`
		} `json:"files"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if payload.Path != "/remote/project" {
		t.Fatalf("unexpected path %q", payload.Path)
	}
	if len(payload.Directories) != 1 || payload.Directories[0].Name != "src" {
		t.Fatalf("unexpected remote directories: %#v", payload.Directories)
	}
	if len(payload.Files) != 1 || payload.Files[0].Name != "README.md" {
		t.Fatalf("unexpected remote files: %#v", payload.Files)
	}
}

func TestReadFSPreviewRoutesRemoteConnectionAwareRequestsThroughSSH(t *testing.T) {
	t.Setenv(
		"PATH",
		installFakeSSHBinary(
			t,
			"#!/bin/sh\nprintf '__RTMETA__5\\nSGVsbG8=\\n'\n",
		)+string(os.PathListSeparator)+os.Getenv("PATH"),
	)

	runtime := &app.Runtime{
		Connections: newRemoteFSHandlerConnectionStore(t),
		RepoRoot:    t.TempDir(),
	}
	handler := NewHandler(runtime, testAuthToken)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(
		recorder,
		authedJSONRequest(
			t,
			http.MethodGet,
			"/api/v1/fs/read?path="+url.QueryEscape("/remote/README.md")+"&connection_id=conn-ssh",
			nil,
		),
	)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Path    string `json:"path"`
		Preview string `json:"preview"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if payload.Path != "/remote/README.md" {
		t.Fatalf("unexpected path %q", payload.Path)
	}
	if payload.Preview != "Hello" {
		t.Fatalf("unexpected preview %q", payload.Preview)
	}
}

func TestReadFSFileReturnsFullTextContent(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	filePath := filepath.Join(repoRoot, "notes.txt")
	if err := os.WriteFile(filePath, []byte("hello\nworld"), 0o600); err != nil {
		t.Fatalf("write file: %v", err)
	}
	handler := NewHandler(&app.Runtime{RepoRoot: repoRoot}, testAuthToken)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(
		recorder,
		authedJSONRequest(t, http.MethodGet, "/api/v1/fs/file?path="+url.QueryEscape(filePath), nil),
	)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Path    string `json:"path"`
		Content string `json:"content"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if payload.Path != filepath.Clean(filePath) {
		t.Fatalf("unexpected path %q", payload.Path)
	}
	if payload.Content != "hello\nworld" {
		t.Fatalf("unexpected content %q", payload.Content)
	}
}

func installFakeSSHBinary(t *testing.T, script string) string {
	t.Helper()

	binDir := t.TempDir()
	sshPath := filepath.Join(binDir, "ssh")
	if err := os.WriteFile(sshPath, []byte(script), 0o755); err != nil {
		t.Fatalf("write fake ssh: %v", err)
	}
	return binDir
}

func newRemoteFSHandlerConnectionStore(t *testing.T) *connections.Service {
	t.Helper()

	store, err := connections.NewService(filepath.Join(t.TempDir(), "connections.json"))
	if err != nil {
		t.Fatalf("connections.NewService: %v", err)
	}
	if _, _, err := store.SaveSSH(connections.SaveSSHInput{
		ID:   "conn-ssh",
		Name: "Prod",
		Host: "prod.example",
		User: "ops",
	}); err != nil {
		t.Fatalf("SaveSSH: %v", err)
	}
	return store
}

func TestReadFSFileRejectsBinaryContent(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	filePath := filepath.Join(repoRoot, "binary.dat")
	if err := os.WriteFile(filePath, []byte{0, 1, 2, 3}, 0o600); err != nil {
		t.Fatalf("write file: %v", err)
	}
	handler := NewHandler(&app.Runtime{RepoRoot: repoRoot}, testAuthToken)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(
		recorder,
		authedJSONRequest(t, http.MethodGet, "/api/v1/fs/file?path="+url.QueryEscape(filePath), nil),
	)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if payload.Error.Code != "invalid_fs_text" {
		t.Fatalf("unexpected error code %q", payload.Error.Code)
	}
}

func TestWriteFSFilePersistsTextContent(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	filePath := filepath.Join(repoRoot, "notes.txt")
	if err := os.WriteFile(filePath, []byte("before"), 0o600); err != nil {
		t.Fatalf("write file: %v", err)
	}
	handler := NewHandler(&app.Runtime{RepoRoot: repoRoot}, testAuthToken)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(
		recorder,
		authedJSONRequest(t, http.MethodPut, "/api/v1/fs/file", map[string]string{
			"path":    filePath,
			"content": "after",
		}),
	)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	content, err := os.ReadFile(filePath)
	if err != nil {
		t.Fatalf("read saved file: %v", err)
	}
	if string(content) != "after" {
		t.Fatalf("unexpected saved content %q", string(content))
	}
}

func TestOpenFSExternalRejectsInvalidRequestBody(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	handler := NewHandler(&app.Runtime{RepoRoot: repoRoot}, testAuthToken)
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/fs/open", strings.NewReader("{"))
	request.Header.Set("Authorization", "Bearer "+testAuthToken)
	request.Header.Set("Content-Type", "application/json")

	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestOpenFSExternalReturnsNotFoundForMissingPath(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	handler := NewHandler(&app.Runtime{RepoRoot: repoRoot}, testAuthToken)
	recorder := httptest.NewRecorder()
	missingPath := filepath.Join(repoRoot, "missing.bin")

	handler.ServeHTTP(
		recorder,
		authedJSONRequest(t, http.MethodPost, "/api/v1/fs/open", map[string]string{
			"path": missingPath,
		}),
	)

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d body=%s", recorder.Code, recorder.Body.String())
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

func TestReadFSPreviewAllowsPathOutsideWorkspaceWithExplicitFlag(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	outsideRoot := t.TempDir()
	filePath := filepath.Join(outsideRoot, "notes.txt")
	if err := os.WriteFile(filePath, []byte("outside workspace"), 0o600); err != nil {
		t.Fatalf("write outside file: %v", err)
	}
	handler := NewHandler(&app.Runtime{RepoRoot: repoRoot}, testAuthToken)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(
		recorder,
		authedJSONRequest(
			t,
			http.MethodGet,
			"/api/v1/fs/read?path="+url.QueryEscape(filePath)+"&allow_outside_workspace=1",
			nil,
		),
	)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Path    string `json:"path"`
		Preview string `json:"preview"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if payload.Path != filepath.Clean(filePath) {
		t.Fatalf("unexpected path %q", payload.Path)
	}
	if payload.Preview != "outside workspace" {
		t.Fatalf("unexpected preview %q", payload.Preview)
	}
}
