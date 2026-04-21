package codexauth

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestLoadStateReturnsReadyForChatGPTOAuth(t *testing.T) {
	t.Parallel()

	path := writeAuthFile(t, map[string]any{
		"auth_mode":    "chatgpt",
		"last_refresh": "2026-04-12T12:33:26.665646Z",
		"tokens": map[string]any{
			"access_token": "access-token",
			"account_id":   "acct_123",
		},
	})

	state, err := LoadState(path)
	if err != nil {
		t.Fatalf("LoadState error: %v", err)
	}
	if state.Status != StatusReady {
		t.Fatalf("unexpected status: %#v", state)
	}
	if !state.HasAccessToken || state.AccountID != "acct_123" {
		t.Fatalf("unexpected state: %#v", state)
	}
	if state.LastRefresh.IsZero() {
		t.Fatalf("expected parsed last refresh, got %#v", state)
	}
}

func TestLoadCredentialsPrefersAPIKeyWhenPresent(t *testing.T) {
	t.Parallel()

	path := writeAuthFile(t, map[string]any{
		"OPENAI_API_KEY": "sk-codex",
		"auth_mode":      "api_key",
		"tokens": map[string]any{
			"access_token": "access-token",
			"account_id":   "acct_123",
		},
	})

	credentials, state, err := LoadCredentials(path)
	if err != nil {
		t.Fatalf("LoadCredentials error: %v", err)
	}
	if state.Status != StatusReady {
		t.Fatalf("unexpected state: %#v", state)
	}
	if credentials.BaseURL != defaultAPIBaseURL || credentials.Token != "sk-codex" {
		t.Fatalf("unexpected credentials: %#v", credentials)
	}
}

func TestLoadStateMissingFileReturnsStatusMissing(t *testing.T) {
	t.Parallel()

	state, err := LoadState(filepath.Join(t.TempDir(), "missing-auth.json"))
	if err == nil {
		t.Fatal("expected error")
	}
	if state.Status != StatusMissing {
		t.Fatalf("unexpected status: %#v", state)
	}
}

func writeAuthFile(t *testing.T, payload map[string]any) string {
	t.Helper()

	path := filepath.Join(t.TempDir(), "auth.json")
	raw, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		t.Fatalf("MarshalIndent error: %v", err)
	}
	if err := os.WriteFile(path, raw, 0o600); err != nil {
		t.Fatalf("WriteFile error: %v", err)
	}
	return path
}

func TestResolveAuthFilePathExpandsTilde(t *testing.T) {
	homeDir := t.TempDir()
	originalHome := os.Getenv("HOME")
	t.Setenv("HOME", homeDir)
	t.Cleanup(func() {
		_ = os.Setenv("HOME", originalHome)
	})

	path := ResolveAuthFilePath("~/custom/auth.json")
	expected := filepath.Join(homeDir, "custom", "auth.json")
	if path != expected {
		t.Fatalf("expected %q, got %q", expected, path)
	}
}

func TestLoadStateIgnoresUnparseableRefreshTimestamp(t *testing.T) {
	t.Parallel()

	path := writeAuthFile(t, map[string]any{
		"auth_mode":    "chatgpt",
		"last_refresh": "not-a-time",
		"tokens": map[string]any{
			"access_token": "access-token",
		},
	})

	state, err := LoadState(path)
	if err != nil {
		t.Fatalf("LoadState error: %v", err)
	}
	if !state.LastRefresh.Equal(time.Time{}) {
		t.Fatalf("expected zero refresh time, got %#v", state.LastRefresh)
	}
}
