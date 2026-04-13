package httpapi

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestAuthRejectsQueryTokenForNonStreamEndpoints(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/agent?token="+testAuthToken, nil)

	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", recorder.Code)
	}
}

func TestAuthAllowsQueryTokenForSSEStreamEndpointOnly(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/terminal/term-main/stream?token="+testAuthToken, nil)

	handler.ServeHTTP(recorder, request)

	if recorder.Code == http.StatusUnauthorized {
		t.Fatalf("expected non-401 response for SSE query token, got %d", recorder.Code)
	}
}

func TestCORSAllowsPatchAndDeleteMethods(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodOptions, "/api/v1/workspace/tabs/tab-main", nil)

	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", recorder.Code)
	}

	allowed := recorder.Header().Get("Access-Control-Allow-Methods")
	if allowed != "GET, POST, PUT, PATCH, DELETE, OPTIONS" {
		t.Fatalf("unexpected allowed methods: %q", allowed)
	}
}
