package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/connections"
)

func TestConnectionsEndpointsListSelectAndSave(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	listRecorder := httptest.NewRecorder()
	handler.ServeHTTP(listRecorder, authedJSONRequest(t, http.MethodGet, "/api/v1/connections", nil))
	if listRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", listRecorder.Code)
	}

	var initial connections.Snapshot
	if err := json.Unmarshal(listRecorder.Body.Bytes(), &initial); err != nil {
		t.Fatalf("unmarshal list: %v", err)
	}
	if initial.ActiveConnectionID != "local" {
		t.Fatalf("expected local active connection, got %q", initial.ActiveConnectionID)
	}

	saveRecorder := httptest.NewRecorder()
	handler.ServeHTTP(saveRecorder, authedJSONRequest(t, http.MethodPost, "/api/v1/connections/ssh", map[string]any{
		"name": "Prod",
		"host": "prod.example.com",
		"user": "deploy",
	}))
	if saveRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 save, got %d", saveRecorder.Code)
	}

	var saved struct {
		Connection  connections.Connection `json:"connection"`
		Connections connections.Snapshot   `json:"connections"`
	}
	if err := json.Unmarshal(saveRecorder.Body.Bytes(), &saved); err != nil {
		t.Fatalf("unmarshal save: %v", err)
	}
	if saved.Connection.Kind != connections.KindSSH {
		t.Fatalf("expected ssh connection kind, got %q", saved.Connection.Kind)
	}
	if saved.Connection.Runtime.CheckStatus != connections.CheckStatusPassed {
		t.Fatalf("expected save to include preflight status, got %q", saved.Connection.Runtime.CheckStatus)
	}

	selectRecorder := httptest.NewRecorder()
	handler.ServeHTTP(selectRecorder, authedJSONRequest(t, http.MethodPut, "/api/v1/connections/active", map[string]string{
		"connection_id": saved.Connection.ID,
	}))
	if selectRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 select, got %d", selectRecorder.Code)
	}

	var selected connections.Snapshot
	if err := json.Unmarshal(selectRecorder.Body.Bytes(), &selected); err != nil {
		t.Fatalf("unmarshal select: %v", err)
	}
	if selected.ActiveConnectionID != saved.Connection.ID {
		t.Fatalf("expected selected active connection %q, got %q", saved.Connection.ID, selected.ActiveConnectionID)
	}

	checkRecorder := httptest.NewRecorder()
	handler.ServeHTTP(checkRecorder, authedJSONRequest(t, http.MethodPost, "/api/v1/connections/"+saved.Connection.ID+"/check", nil))
	if checkRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 check, got %d", checkRecorder.Code)
	}

	var checked struct {
		Connection  connections.Connection `json:"connection"`
		Connections connections.Snapshot   `json:"connections"`
	}
	if err := json.Unmarshal(checkRecorder.Body.Bytes(), &checked); err != nil {
		t.Fatalf("unmarshal check: %v", err)
	}
	if checked.Connection.ID != saved.Connection.ID {
		t.Fatalf("expected checked connection %q, got %q", saved.Connection.ID, checked.Connection.ID)
	}
}

func TestConnectionsSelectReturnsNotFound(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPut, "/api/v1/connections/active", map[string]string{
		"connection_id": "missing",
	}))

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", recorder.Code)
	}
}
