package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/agent"
)

func TestAgentCatalogReturnsActiveSelection(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodGet, "/api/v1/agent", nil))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	var catalog agent.Catalog
	if err := json.Unmarshal(recorder.Body.Bytes(), &catalog); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}
	if catalog.Active.Profile.ID != "balanced" || catalog.Active.Role.ID != "developer" || catalog.Active.Mode.ID != "implement" {
		t.Fatalf("unexpected active selection: %#v", catalog.Active)
	}
}

func TestAgentSelectionEndpointsUpdateActiveState(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	for _, requestSpec := range []struct {
		path string
		id   string
	}{
		{path: "/api/v1/agent/selection/profile", id: "hardened"},
		{path: "/api/v1/agent/selection/role", id: "reviewer"},
		{path: "/api/v1/agent/selection/mode", id: "review"},
	} {
		recorder := httptest.NewRecorder()
		handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPut, requestSpec.path, map[string]string{"id": requestSpec.id}))
		if recorder.Code != http.StatusOK {
			t.Fatalf("expected 200 for %s, got %d", requestSpec.path, recorder.Code)
		}
	}

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodGet, "/api/v1/agent", nil))

	var catalog agent.Catalog
	if err := json.Unmarshal(recorder.Body.Bytes(), &catalog); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}
	if catalog.Active.Profile.ID != "hardened" || catalog.Active.Role.ID != "reviewer" || catalog.Active.Mode.ID != "review" {
		t.Fatalf("unexpected active selection: %#v", catalog.Active)
	}
}

func TestAgentSelectionEndpointsReturnNotFoundForUnknownIDs(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPut, "/api/v1/agent/selection/mode", map[string]string{"id": "unknown"}))

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", recorder.Code)
	}
}
