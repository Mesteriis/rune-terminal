package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestWriteFileAtomicOverwritesReadyPayload(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "runtime-ready.json")

	if err := os.WriteFile(path, []byte(`{"base_url":"old","pid":1}`), 0o600); err != nil {
		t.Fatalf("WriteFile error: %v", err)
	}

	payload := []byte(`{"base_url":"http://127.0.0.1:12345","pid":42}`)
	if err := writeFileAtomic(path, payload, 0o600); err != nil {
		t.Fatalf("writeFileAtomic error: %v", err)
	}

	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile error: %v", err)
	}
	if string(raw) != string(payload) {
		t.Fatalf("expected %q, got %q", string(payload), string(raw))
	}

	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("Stat error: %v", err)
	}
	if got := info.Mode().Perm(); got != 0o600 {
		t.Fatalf("expected mode 0600, got %#o", got)
	}
}
