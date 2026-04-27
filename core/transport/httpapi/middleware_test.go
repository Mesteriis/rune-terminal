package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/policy"
	"github.com/Mesteriis/rune-terminal/core/toolruntime"
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
	request.Header.Set("Origin", "http://127.0.0.1:5173")

	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", recorder.Code)
	}

	allowed := recorder.Header().Get("Access-Control-Allow-Methods")
	if allowed != "GET, POST, PUT, PATCH, DELETE, OPTIONS" {
		t.Fatalf("unexpected allowed methods: %q", allowed)
	}
	if got := recorder.Header().Get("Access-Control-Allow-Origin"); got != "http://127.0.0.1:5173" {
		t.Fatalf("unexpected allowed origin: %q", got)
	}
}

func TestCORSRejectsDisallowedOriginPreflight(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodOptions, "/api/v1/workspace", nil)
	request.Header.Set("Origin", "https://evil.example")

	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", recorder.Code)
	}

	var response errorEnvelope
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}
	if response.Error.Code != "origin_not_allowed" {
		t.Fatalf("unexpected response: %#v", response)
	}
}

func TestCORSRejectsDisallowedOriginSimpleRequest(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
	request.Header.Set("Origin", "https://evil.example")

	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", recorder.Code)
	}

	var response errorEnvelope
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}
	if response.Error.Code != "origin_not_allowed" {
		t.Fatalf("unexpected response: %#v", response)
	}
}

func TestProtectedRoutesRejectMissingServerAuthConfiguration(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandlerWithToken(t, "", executeToolDefinition(
		"workspace.list_widgets",
		toolruntime.EmptyDecode,
		func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			return map[string]any{"ok": true}, nil
		},
		toolruntime.Metadata{
			Capabilities: []string{"workspace:read"},
			ApprovalTier: policy.ApprovalTierSafe,
			TargetKind:   toolruntime.TargetWorkspace,
		},
	))
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/tools", nil)

	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", recorder.Code)
	}
}

func TestHealthRemainsPublicWithoutServerAuthConfiguration(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandlerWithToken(t, "", executeToolDefinition(
		"workspace.list_widgets",
		toolruntime.EmptyDecode,
		func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			return map[string]any{"ok": true}, nil
		},
		toolruntime.Metadata{
			Capabilities: []string{"workspace:read"},
			ApprovalTier: policy.ApprovalTierSafe,
			TargetKind:   toolruntime.TargetWorkspace,
		},
	))
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/healthz", nil)

	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}
}

func TestHealthV1RemainsPublicWithoutServerAuthConfiguration(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandlerWithToken(t, "", executeToolDefinition(
		"workspace.list_widgets",
		toolruntime.EmptyDecode,
		func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			return map[string]any{"ok": true}, nil
		},
		toolruntime.Metadata{
			Capabilities: []string{"workspace:read"},
			ApprovalTier: policy.ApprovalTierSafe,
			TargetKind:   toolruntime.TargetWorkspace,
		},
	))
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)

	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}
}
