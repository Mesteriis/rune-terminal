package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/connections"
)

func TestRemoteProfilesEndpointsListSaveAndDelete(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	listRecorder := httptest.NewRecorder()
	handler.ServeHTTP(listRecorder, authedJSONRequest(t, http.MethodGet, "/api/v1/remote/profiles", nil))
	if listRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 list, got %d", listRecorder.Code)
	}

	var initial struct {
		Profiles []connections.RemoteProfile `json:"profiles"`
	}
	if err := json.Unmarshal(listRecorder.Body.Bytes(), &initial); err != nil {
		t.Fatalf("unmarshal initial list: %v", err)
	}
	if len(initial.Profiles) != 0 {
		t.Fatalf("expected zero initial remote profiles, got %d", len(initial.Profiles))
	}

	saveRecorder := httptest.NewRecorder()
	handler.ServeHTTP(saveRecorder, authedJSONRequest(t, http.MethodPost, "/api/v1/remote/profiles", map[string]any{
		"name": "Prod",
		"host": "prod.example.com",
		"user": "deploy",
		"port": 2222,
	}))
	if saveRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 save, got %d", saveRecorder.Code)
	}

	var saved struct {
		Profile  connections.RemoteProfile   `json:"profile"`
		Profiles []connections.RemoteProfile `json:"profiles"`
	}
	if err := json.Unmarshal(saveRecorder.Body.Bytes(), &saved); err != nil {
		t.Fatalf("unmarshal save: %v", err)
	}
	if saved.Profile.ID == "" {
		t.Fatalf("expected saved profile id")
	}
	if len(saved.Profiles) != 1 {
		t.Fatalf("expected one profile after save, got %d", len(saved.Profiles))
	}

	deleteRecorder := httptest.NewRecorder()
	handler.ServeHTTP(
		deleteRecorder,
		authedJSONRequest(t, http.MethodDelete, "/api/v1/remote/profiles/"+saved.Profile.ID, nil),
	)
	if deleteRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 delete, got %d", deleteRecorder.Code)
	}

	var deleted struct {
		Profiles []connections.RemoteProfile `json:"profiles"`
	}
	if err := json.Unmarshal(deleteRecorder.Body.Bytes(), &deleted); err != nil {
		t.Fatalf("unmarshal delete: %v", err)
	}
	if len(deleted.Profiles) != 0 {
		t.Fatalf("expected empty profile list after delete, got %d", len(deleted.Profiles))
	}
}

func TestRemoteProfilesDeleteReturnsNotFoundForMissingProfile(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(
		recorder,
		authedJSONRequest(t, http.MethodDelete, "/api/v1/remote/profiles/missing-profile", nil),
	)

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", recorder.Code)
	}
}

func TestRemoteProfilesImportSSHConfig(t *testing.T) {
	t.Parallel()

	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "config")
	if err := os.WriteFile(configPath, []byte(`
Host prod
  HostName prod.example.com
  User deploy
`), 0o600); err != nil {
		t.Fatalf("write config: %v", err)
	}

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(
		recorder,
		authedJSONRequest(t, http.MethodPost, "/api/v1/remote/profiles/import-ssh-config", map[string]any{
			"path": configPath,
		}),
	)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	var result connections.SSHConfigImportResult
	if err := json.Unmarshal(recorder.Body.Bytes(), &result); err != nil {
		t.Fatalf("unmarshal import result: %v", err)
	}
	if len(result.Imported) != 1 {
		t.Fatalf("expected one imported profile, got %#v", result.Imported)
	}
	if result.Imported[0].Name != "prod" || result.Imported[0].Host != "prod.example.com" {
		t.Fatalf("unexpected imported profile: %#v", result.Imported[0])
	}
	if len(result.Profiles) != 1 {
		t.Fatalf("expected profiles list to include imported profile, got %#v", result.Profiles)
	}
}

func TestRemoteProfilesCreateSessionReturnsNotFoundForMissingProfile(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(
		recorder,
		authedJSONRequest(t, http.MethodPost, "/api/v1/remote/profiles/missing-profile/session", map[string]any{
			"title": "Remote From Profile",
		}),
	)

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d (%s)", recorder.Code, recorder.Body.String())
	}
}
