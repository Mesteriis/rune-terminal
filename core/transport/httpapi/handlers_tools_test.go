package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/policy"
	"github.com/Mesteriis/rune-terminal/core/toolruntime"
)

func TestExecuteToolReturnsPreconditionRequiredForApprovalFlow(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t, executeToolDefinition(
		"safety.add_ignore_rule",
		toolruntime.EmptyDecode,
		func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			return map[string]any{"ok": true}, nil
		},
		toolruntime.Metadata{
			Capabilities: []string{"policy:write"},
			ApprovalTier: policy.ApprovalTierDangerous,
			Mutating:     true,
			TargetKind:   toolruntime.TargetPolicy,
		},
	))

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/tools/execute", map[string]any{
		"tool_name": "safety.add_ignore_rule",
		"input":     map[string]any{},
	}))

	if recorder.Code != http.StatusPreconditionRequired {
		t.Fatalf("expected 428, got %d", recorder.Code)
	}

	var response toolruntime.ExecuteResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}
	if response.Status != "requires_confirmation" || response.ErrorCode != toolruntime.ErrorCodeApprovalRequired {
		t.Fatalf("unexpected response: %#v", response)
	}
}

func TestExecuteToolReturnsForbiddenForPolicyDenied(t *testing.T) {
	t.Parallel()

	handler, agentStore := newTestHandler(t, executeToolDefinition(
		"safety.add_ignore_rule",
		toolruntime.EmptyDecode,
		func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			return map[string]any{"ok": true}, nil
		},
		toolruntime.Metadata{
			Capabilities: []string{"policy:write"},
			ApprovalTier: policy.ApprovalTierSafe,
			Mutating:     true,
			TargetKind:   toolruntime.TargetPolicy,
		},
	))
	if err := agentStore.SetActiveMode("explore"); err != nil {
		t.Fatalf("SetActiveMode error: %v", err)
	}

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/tools/execute", map[string]any{
		"tool_name": "safety.add_ignore_rule",
		"input":     map[string]any{},
	}))

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", recorder.Code)
	}

	var response toolruntime.ExecuteResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}
	if response.ErrorCode != toolruntime.ErrorCodePolicyDenied {
		t.Fatalf("unexpected response: %#v", response)
	}
}

func TestExecuteToolReturnsBadRequestForToolInputErrors(t *testing.T) {
	t.Parallel()

	type payload struct {
		Text string `json:"text"`
	}

	handler, _ := newTestHandler(t, executeToolDefinition(
		"term.echo",
		func(raw json.RawMessage) (any, error) {
			return toolruntime.DecodeJSON[payload](raw)
		},
		func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			return map[string]any{"ok": true}, nil
		},
		toolruntime.Metadata{
			Capabilities: []string{"terminal:read"},
			ApprovalTier: policy.ApprovalTierSafe,
			TargetKind:   toolruntime.TargetWidget,
		},
	))

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/tools/execute", map[string]any{
		"tool_name": "term.echo",
		"input":     map[string]any{"text": 42},
	}))

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", recorder.Code)
	}

	var response toolruntime.ExecuteResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}
	if response.ErrorCode != toolruntime.ErrorCodeInvalidInput {
		t.Fatalf("unexpected response: %#v", response)
	}
}

func TestExecuteToolRejectsRoleAndModeFieldsAtTransportBoundary(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t, executeToolDefinition(
		"term.echo",
		toolruntime.EmptyDecode,
		func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			return map[string]any{"ok": true}, nil
		},
		toolruntime.Metadata{
			Capabilities: []string{"terminal:read"},
			ApprovalTier: policy.ApprovalTierSafe,
			TargetKind:   toolruntime.TargetWidget,
		},
	))

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/tools/execute", map[string]any{
		"tool_name": "term.echo",
		"context": map[string]any{
			"workspace_id":     "ws-local",
			"active_widget_id": "term-main",
			"repo_root":        "/workspace/repo",
			"role_id":          "spoofed-role",
		},
	}))

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", recorder.Code)
	}
}

func TestExecuteToolReturnsInternalErrorForUnhandledFailures(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t, executeToolDefinition(
		"term.crash",
		toolruntime.EmptyDecode,
		func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			return nil, errors.New("boom")
		},
		toolruntime.Metadata{
			Capabilities: []string{"terminal:read"},
			ApprovalTier: policy.ApprovalTierSafe,
			TargetKind:   toolruntime.TargetWidget,
		},
	))

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/tools/execute", map[string]any{
		"tool_name": "term.crash",
		"input":     map[string]any{},
	}))

	if recorder.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", recorder.Code)
	}

	var response toolruntime.ExecuteResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}
	if response.ErrorCode != toolruntime.ErrorCodeInternalError {
		t.Fatalf("unexpected response: %#v", response)
	}
}

func TestExecuteToolAcceptsSessionTargetFieldsAtTransportBoundary(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t, executeToolDefinition(
		"term.echo",
		toolruntime.EmptyDecode,
		func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			return map[string]any{
				"target_session":       execCtx.TargetSession,
				"target_connection_id": execCtx.TargetConnectionID,
			}, nil
		},
		toolruntime.Metadata{
			Capabilities: []string{"terminal:read"},
			ApprovalTier: policy.ApprovalTierSafe,
			TargetKind:   toolruntime.TargetWidget,
		},
	))

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/tools/execute", map[string]any{
		"tool_name": "term.echo",
		"context": map[string]any{
			"workspace_id":         "ws-local",
			"active_widget_id":     "term-main",
			"repo_root":            "/workspace/repo",
			"target_session":       "remote",
			"target_connection_id": "conn-ssh",
		},
	}))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", recorder.Code, recorder.Body.String())
	}
}

func TestStatusForExecuteErrorReturnsForbiddenForApprovalMismatch(t *testing.T) {
	t.Parallel()

	if got := statusForExecuteError(toolruntime.ErrorCodeApprovalMismatch); got != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", got)
	}
}

func TestStatusForExecuteErrorReturnsBadGatewayForPluginFailure(t *testing.T) {
	t.Parallel()

	if got := statusForExecuteError(toolruntime.ErrorCodePluginFailure); got != http.StatusBadGateway {
		t.Fatalf("expected 502, got %d", got)
	}
}
