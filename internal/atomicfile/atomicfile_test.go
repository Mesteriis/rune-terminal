package atomicfile

import (
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestWriteFileWritesPayloadModeAndOverwrites(t *testing.T) {
	t.Parallel()

	dir := filepath.Join(t.TempDir(), "nested")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatalf("MkdirAll error: %v", err)
	}
	path := filepath.Join(dir, "state.json")
	if err := WriteFile(path, []byte("old"), 0o600); err != nil {
		t.Fatalf("WriteFile old error: %v", err)
	}
	if err := WriteFile(path, []byte("new"), 0o640); err != nil {
		t.Fatalf("WriteFile new error: %v", err)
	}

	payload, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile error: %v", err)
	}
	if string(payload) != "new" {
		t.Fatalf("expected overwritten payload, got %q", string(payload))
	}

	if runtime.GOOS != "windows" {
		info, err := os.Stat(path)
		if err != nil {
			t.Fatalf("Stat error: %v", err)
		}
		if got := info.Mode().Perm(); got != 0o640 {
			t.Fatalf("expected file mode 0640, got %03o", got)
		}
	}
}

func TestWriteFileRemovesTemporaryFile(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "state.json")
	if err := WriteFile(path, []byte("payload"), 0o600); err != nil {
		t.Fatalf("WriteFile error: %v", err)
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("ReadDir error: %v", err)
	}
	if len(entries) != 1 || entries[0].Name() != "state.json" {
		t.Fatalf("expected only final file, got %#v", entries)
	}
}

func TestWriteReaderKeepsExistingTargetOnCopyError(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "state.json")
	if err := os.WriteFile(path, []byte("old"), 0o600); err != nil {
		t.Fatalf("WriteFile old error: %v", err)
	}

	err := WriteReader(path, failingReader{}, 0o600)
	if err == nil {
		t.Fatalf("expected WriteReader error")
	}

	payload, readErr := os.ReadFile(path)
	if readErr != nil {
		t.Fatalf("ReadFile error: %v", readErr)
	}
	if string(payload) != "old" {
		t.Fatalf("expected existing payload to remain, got %q", string(payload))
	}

	entries, readDirErr := os.ReadDir(dir)
	if readDirErr != nil {
		t.Fatalf("ReadDir error: %v", readDirErr)
	}
	if len(entries) != 1 || entries[0].Name() != "state.json" {
		t.Fatalf("expected failed temp file cleanup, got %#v", entries)
	}
}

func TestWriteReaderNoReplaceKeepsExistingTarget(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "state.json")
	if err := os.WriteFile(path, []byte("old"), 0o600); err != nil {
		t.Fatalf("WriteFile old error: %v", err)
	}

	err := WriteReaderNoReplace(path, strings.NewReader("new"), 0o600)
	if !errors.Is(err, os.ErrExist) {
		t.Fatalf("expected os.ErrExist, got %v", err)
	}

	payload, readErr := os.ReadFile(path)
	if readErr != nil {
		t.Fatalf("ReadFile error: %v", readErr)
	}
	if string(payload) != "old" {
		t.Fatalf("expected existing payload to remain, got %q", string(payload))
	}
}

type failingReader struct{}

func (failingReader) Read(payload []byte) (int, error) {
	copy(payload, "partial")
	return len("partial"), errors.New("copy failed")
}
