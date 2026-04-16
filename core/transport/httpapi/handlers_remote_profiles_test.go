package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
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
