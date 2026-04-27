package main

import (
	"errors"
	"net/http"
	"net/http/httptest"
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

func TestWriteJSONErrorEscapesPayload(t *testing.T) {
	recorder := httptest.NewRecorder()

	writeJSONError(recorder, errors.New("bad \"json\"\nvalue"))

	expected := "{\"error\":\"bad \\\"json\\\"\\nvalue\"}"
	if got := recorder.Body.String(); got != expected {
		t.Fatalf("expected %q, got %q", expected, got)
	}
}

func TestWriteJSONResponseDoesNotPanicOnWriterError(t *testing.T) {
	writer := errorResponseWriter{header: make(map[string][]string)}

	writeJSONResponse(writer, map[string]string{"ok": "true"})
}

type errorResponseWriter struct {
	header http.Header
}

func (w errorResponseWriter) Header() http.Header {
	return w.header
}

func (w errorResponseWriter) Write(payload []byte) (int, error) {
	return 0, errors.New("write failed")
}

func (w errorResponseWriter) WriteHeader(statusCode int) {}

func TestWriteJSONResponseWritesValidPayload(t *testing.T) {
	recorder := httptest.NewRecorder()

	writeJSONResponse(recorder, map[string]string{"ok": "true"})

	if got := recorder.Body.String(); got != "{\"ok\":\"true\"}" {
		t.Fatalf("unexpected response body: %q", got)
	}
	if contentType := recorder.Header().Get("Content-Type"); contentType != "application/json" {
		t.Fatalf("unexpected content type: %q", contentType)
	}
}
