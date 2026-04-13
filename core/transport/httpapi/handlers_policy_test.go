package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/policy"
)

func TestPolicyListEndpointsReturnConfiguredRules(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodGet, "/api/v1/policy/ignore-rules", nil))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	var payload struct {
		Rules []policy.IgnoreRule `json:"rules"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}
	if len(payload.Rules) == 0 {
		t.Fatal("expected default ignore rules")
	}

	recorder = httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodGet, "/api/v1/policy/trusted-rules", nil))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	var trustedPayload struct {
		Rules []policy.TrustedRule `json:"rules"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &trustedPayload); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}
	if trustedPayload.Rules == nil {
		t.Fatal("expected rules array, got nil")
	}
}

func TestPolicyListEndpointsRequireAuth(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/policy/ignore-rules", nil)

	handler.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", recorder.Code)
	}
}
