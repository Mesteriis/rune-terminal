package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/terminal"
)

func TestBootstrapReturnsRuntimePathContext(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodGet, "/api/v1/bootstrap", nil))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		ProductName  string `json:"product_name"`
		RepoRoot     string `json:"repo_root"`
		HomeDir      string `json:"home_dir"`
		DefaultShell string `json:"default_shell"`
		Term         string `json:"term"`
		ColorTerm    string `json:"color_term"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}

	if payload.ProductName != "RunaTerminal" {
		t.Fatalf("unexpected product_name %q", payload.ProductName)
	}

	if payload.RepoRoot != "/workspace/repo" {
		t.Fatalf("unexpected repo_root %q", payload.RepoRoot)
	}

	if payload.HomeDir != "/home/testuser" {
		t.Fatalf("unexpected home_dir %q", payload.HomeDir)
	}
	if payload.DefaultShell != terminal.DefaultShell() {
		t.Fatalf("unexpected default_shell %q", payload.DefaultShell)
	}
	if payload.Term != os.Getenv("TERM") {
		t.Fatalf("unexpected term %q", payload.Term)
	}
	if payload.ColorTerm != os.Getenv("COLORTERM") {
		t.Fatalf("unexpected color_term %q", payload.ColorTerm)
	}
}

func TestHealthEndpointReturnsPidAndStatus(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/api/v1/health", nil))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Service string `json:"service"`
		Status  string `json:"status"`
		PID     int    `json:"pid"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if payload.Service != "rterm-core" {
		t.Fatalf("unexpected service: %q", payload.Service)
	}
	if payload.Status != "ok" {
		t.Fatalf("unexpected status: %q", payload.Status)
	}
	if payload.PID <= 0 {
		t.Fatalf("expected positive pid, got %d", payload.PID)
	}
}
