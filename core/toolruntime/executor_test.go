package toolruntime

import (
	"context"
	"encoding/json"
	"path/filepath"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/audit"
	"github.com/Mesteriis/rune-terminal/core/policy"
)

func TestExecutorConfirmationFlow(t *testing.T) {
	t.Parallel()

	policyStore, err := policy.NewStore(filepath.Join(t.TempDir(), "policy.json"), "/workspace/repo")
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}
	auditLog, err := audit.NewLog(filepath.Join(t.TempDir(), "audit.jsonl"))
	if err != nil {
		t.Fatalf("NewLog error: %v", err)
	}
	registry := NewRegistry()
	if err := registry.Register(Definition{
		Name:         "safety.add_ignore_rule",
		Description:  "add ignore rule",
		InputSchema:  json.RawMessage(`{"type":"object"}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: Metadata{
			Capabilities: []string{"policy:write"},
			ApprovalTier: policy.ApprovalTierDangerous,
			Mutating:     true,
			TargetKind:   TargetPolicy,
		},
		Decode: func(raw json.RawMessage) (any, error) { return map[string]any{}, nil },
		Plan: func(input any, ctx ExecutionContext) (OperationPlan, error) {
			return OperationPlan{
				Operation: Operation{
					Summary:              "add ignore rule",
					RequiredCapabilities: []string{"policy:write"},
					ApprovalTier:         policy.ApprovalTierDangerous,
				},
			}, nil
		},
		Execute: func(ctx context.Context, execCtx ExecutionContext, input any) (any, error) {
			return map[string]any{"ok": true}, nil
		},
	}); err != nil {
		t.Fatalf("Register error: %v", err)
	}

	executor := NewExecutor(registry, policyStore, auditLog)
	response := executor.Execute(context.Background(), ExecuteRequest{ToolName: "safety.add_ignore_rule"}, policy.EvaluationProfile{})
	if response.Status != "requires_confirmation" || response.PendingApproval == nil {
		t.Fatalf("expected confirmation response, got %#v", response)
	}
	if response.Operation == nil || response.Operation.Summary != "add ignore rule" {
		t.Fatalf("expected operation summary in response, got %#v", response)
	}

	grant, err := executor.Confirm(response.PendingApproval.ID)
	if err != nil {
		t.Fatalf("Confirm error: %v", err)
	}
	approved := executor.Execute(context.Background(), ExecuteRequest{
		ToolName:      "safety.add_ignore_rule",
		ApprovalToken: grant.Token,
	}, policy.EvaluationProfile{})
	if approved.Status != "ok" {
		t.Fatalf("expected approved execution, got %#v", approved)
	}
}

func TestExecutorConfirmConsumesPendingApproval(t *testing.T) {
	t.Parallel()

	executor := newDangerousExecutor(t)
	response := executor.Execute(context.Background(), ExecuteRequest{ToolName: "safety.add_ignore_rule"}, policy.EvaluationProfile{})
	if response.PendingApproval == nil {
		t.Fatalf("expected pending approval, got %#v", response)
	}

	if _, err := executor.Confirm(response.PendingApproval.ID); err != nil {
		t.Fatalf("first Confirm error: %v", err)
	}
	if _, err := executor.Confirm(response.PendingApproval.ID); err == nil {
		t.Fatalf("expected second Confirm to fail")
	}
}

func TestExecutorApprovalGrantIsSingleUse(t *testing.T) {
	t.Parallel()

	executor := newDangerousExecutor(t)
	response := executor.Execute(context.Background(), ExecuteRequest{ToolName: "safety.add_ignore_rule"}, policy.EvaluationProfile{})
	if response.PendingApproval == nil {
		t.Fatalf("expected pending approval, got %#v", response)
	}

	grant, err := executor.Confirm(response.PendingApproval.ID)
	if err != nil {
		t.Fatalf("Confirm error: %v", err)
	}

	first := executor.Execute(context.Background(), ExecuteRequest{
		ToolName:      "safety.add_ignore_rule",
		ApprovalToken: grant.Token,
	}, policy.EvaluationProfile{})
	if first.Status != "ok" {
		t.Fatalf("expected first execution to succeed, got %#v", first)
	}

	replayed := executor.Execute(context.Background(), ExecuteRequest{
		ToolName:      "safety.add_ignore_rule",
		ApprovalToken: grant.Token,
	}, policy.EvaluationProfile{})
	if replayed.Status != "requires_confirmation" || replayed.PendingApproval == nil {
		t.Fatalf("expected replayed approval token to require a new approval, got %#v", replayed)
	}
}

func TestExecutorApprovalGrantRejectsMismatchedInputIntent(t *testing.T) {
	t.Parallel()

	executor := newDangerousExecutorWithInput(t)
	initial := executor.Execute(context.Background(), ExecuteRequest{
		ToolName: "safety.add_ignore_rule",
		Input:    json.RawMessage(`{"pattern":"alpha"}`),
		Context:  ExecutionContext{WorkspaceID: "workspace-1"},
	}, policy.EvaluationProfile{})
	if initial.PendingApproval == nil {
		t.Fatalf("expected pending approval, got %#v", initial)
	}

	grant, err := executor.Confirm(initial.PendingApproval.ID)
	if err != nil {
		t.Fatalf("Confirm error: %v", err)
	}

	mismatch := executor.Execute(context.Background(), ExecuteRequest{
		ToolName:      "safety.add_ignore_rule",
		Input:         json.RawMessage(`{"pattern":"beta"}`),
		Context:       ExecutionContext{WorkspaceID: "workspace-1"},
		ApprovalToken: grant.Token,
	}, policy.EvaluationProfile{})
	if mismatch.Status != "error" || mismatch.ErrorCode != ErrorCodeApprovalMismatch {
		t.Fatalf("expected approval mismatch error, got %#v", mismatch)
	}

	matched := executor.Execute(context.Background(), ExecuteRequest{
		ToolName:      "safety.add_ignore_rule",
		Input:         json.RawMessage(`{"pattern":"alpha"}`),
		Context:       ExecutionContext{WorkspaceID: "workspace-1"},
		ApprovalToken: grant.Token,
	}, policy.EvaluationProfile{})
	if matched.Status != "ok" {
		t.Fatalf("expected matching retry to succeed after mismatch rejection, got %#v", matched)
	}
}

func TestExecutorApprovalGrantRejectsMismatchedContextIntent(t *testing.T) {
	t.Parallel()

	executor := newDangerousExecutorWithInput(t)
	initial := executor.Execute(context.Background(), ExecuteRequest{
		ToolName: "safety.add_ignore_rule",
		Input:    json.RawMessage(`{"pattern":"alpha"}`),
		Context:  ExecutionContext{WorkspaceID: "workspace-1", ActiveWidgetID: "widget-1", RepoRoot: "/workspace/repo"},
	}, policy.EvaluationProfile{})
	if initial.PendingApproval == nil {
		t.Fatalf("expected pending approval, got %#v", initial)
	}

	grant, err := executor.Confirm(initial.PendingApproval.ID)
	if err != nil {
		t.Fatalf("Confirm error: %v", err)
	}

	mismatch := executor.Execute(context.Background(), ExecuteRequest{
		ToolName:      "safety.add_ignore_rule",
		Input:         json.RawMessage(`{"pattern":"alpha"}`),
		Context:       ExecutionContext{WorkspaceID: "workspace-2", ActiveWidgetID: "widget-1", RepoRoot: "/workspace/repo"},
		ApprovalToken: grant.Token,
	}, policy.EvaluationProfile{})
	if mismatch.Status != "error" || mismatch.ErrorCode != ErrorCodeApprovalMismatch {
		t.Fatalf("expected context mismatch error, got %#v", mismatch)
	}
}

func TestExecutorApprovalGrantRejectsMismatchedSessionTargetIntent(t *testing.T) {
	t.Parallel()

	executor := newDangerousExecutorWithInput(t)
	initial := executor.Execute(context.Background(), ExecuteRequest{
		ToolName: "safety.add_ignore_rule",
		Input:    json.RawMessage(`{"pattern":"alpha"}`),
		Context: ExecutionContext{
			WorkspaceID:        "workspace-1",
			ActiveWidgetID:     "widget-1",
			RepoRoot:           "/workspace/repo",
			TargetSession:      "local",
			TargetConnectionID: "local",
		},
	}, policy.EvaluationProfile{})
	if initial.PendingApproval == nil {
		t.Fatalf("expected pending approval, got %#v", initial)
	}

	grant, err := executor.Confirm(initial.PendingApproval.ID)
	if err != nil {
		t.Fatalf("Confirm error: %v", err)
	}

	mismatch := executor.Execute(context.Background(), ExecuteRequest{
		ToolName:      "safety.add_ignore_rule",
		Input:         json.RawMessage(`{"pattern":"alpha"}`),
		ApprovalToken: grant.Token,
		Context: ExecutionContext{
			WorkspaceID:        "workspace-1",
			ActiveWidgetID:     "widget-1",
			RepoRoot:           "/workspace/repo",
			TargetSession:      "remote",
			TargetConnectionID: "conn-ssh",
		},
	}, policy.EvaluationProfile{})
	if mismatch.Status != "error" || mismatch.ErrorCode != ErrorCodeApprovalMismatch {
		t.Fatalf("expected session target mismatch error, got %#v", mismatch)
	}
}

func TestExecutorCarriesExplicitRoleAndModeInExecutionContextAndAudit(t *testing.T) {
	t.Parallel()

	policyStore, err := policy.NewStore(filepath.Join(t.TempDir(), "policy.json"), "/workspace/repo")
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}
	auditLog, err := audit.NewLog(filepath.Join(t.TempDir(), "audit.jsonl"))
	if err != nil {
		t.Fatalf("NewLog error: %v", err)
	}
	registry := NewRegistry()
	if err := registry.Register(Definition{
		Name:         "term.echo_role_mode",
		Description:  "echo role/mode",
		InputSchema:  json.RawMessage(`{"type":"object"}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: Metadata{
			Capabilities: []string{"terminal:read"},
			ApprovalTier: policy.ApprovalTierSafe,
			TargetKind:   TargetWidget,
		},
		Decode: EmptyDecode,
		Plan: func(input any, ctx ExecutionContext) (OperationPlan, error) {
			return OperationPlan{
				Operation: Operation{
					Summary:              "echo role and mode",
					RequiredCapabilities: []string{"terminal:read"},
					ApprovalTier:         policy.ApprovalTierSafe,
				},
			}, nil
		},
		Execute: func(ctx context.Context, execCtx ExecutionContext, input any) (any, error) {
			return map[string]any{
				"role_id":              execCtx.RoleID,
				"mode_id":              execCtx.ModeID,
				"target_session":       execCtx.TargetSession,
				"target_connection_id": execCtx.TargetConnectionID,
			}, nil
		},
	}); err != nil {
		t.Fatalf("Register error: %v", err)
	}

	executor := NewExecutor(registry, policyStore, auditLog)
	profile := policy.EvaluationProfile{
		PromptProfileID: "balanced",
		RoleID:          "reviewer",
		ModeID:          "review",
		SecurityPosture: "hardened",
	}

	response := executor.Execute(context.Background(), ExecuteRequest{
		ToolName: "term.echo_role_mode",
		Context: ExecutionContext{
			WorkspaceID:        "workspace-1",
			RoleID:             "frontend-spoofed-role",
			ModeID:             "frontend-spoofed-mode",
			ActionSource:       "test.tools.execute",
			TargetSession:      "remote",
			TargetConnectionID: "conn-ssh",
		},
	}, profile)
	if response.Status != "ok" {
		t.Fatalf("expected ok response, got %#v", response)
	}
	if response.Output == nil {
		t.Fatalf("expected output, got %#v", response)
	}
	output, ok := response.Output.(map[string]any)
	if !ok {
		t.Fatalf("expected map output, got %#v", response.Output)
	}
	if output["role_id"] != "reviewer" || output["mode_id"] != "review" {
		t.Fatalf("expected backend profile role/mode in exec context, got %#v", output)
	}
	if output["target_session"] != "remote" || output["target_connection_id"] != "conn-ssh" {
		t.Fatalf("expected target session context in tool execution, got %#v", output)
	}

	events, err := auditLog.List(10)
	if err != nil {
		t.Fatalf("List error: %v", err)
	}
	if len(events) != 1 {
		t.Fatalf("expected 1 audit event, got %d", len(events))
	}
	if events[0].RoleID != "reviewer" || events[0].ModeID != "review" {
		t.Fatalf("expected backend profile role/mode in audit, got %#v", events[0])
	}
	if events[0].PromptProfileID != "balanced" || events[0].SecurityPosture != "hardened" {
		t.Fatalf("expected explicit profile context in audit, got %#v", events[0])
	}
	if events[0].TargetSession != "remote" || events[0].TargetConnectionID != "conn-ssh" {
		t.Fatalf("expected target session in audit, got %#v", events[0])
	}
	if events[0].ActionSource != "test.tools.execute" {
		t.Fatalf("expected action source in audit, got %#v", events[0])
	}
}

func newDangerousExecutor(t *testing.T) *Executor {
	t.Helper()

	policyStore, err := policy.NewStore(filepath.Join(t.TempDir(), "policy.json"), "/workspace/repo")
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}
	auditLog, err := audit.NewLog(filepath.Join(t.TempDir(), "audit.jsonl"))
	if err != nil {
		t.Fatalf("NewLog error: %v", err)
	}
	registry := NewRegistry()
	if err := registry.Register(Definition{
		Name:         "safety.add_ignore_rule",
		Description:  "add ignore rule",
		InputSchema:  json.RawMessage(`{"type":"object"}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: Metadata{
			Capabilities: []string{"policy:write"},
			ApprovalTier: policy.ApprovalTierDangerous,
			Mutating:     true,
			TargetKind:   TargetPolicy,
		},
		Decode: func(raw json.RawMessage) (any, error) { return map[string]any{}, nil },
		Plan: func(input any, ctx ExecutionContext) (OperationPlan, error) {
			return OperationPlan{
				Operation: Operation{
					Summary:              "add ignore rule",
					RequiredCapabilities: []string{"policy:write"},
					ApprovalTier:         policy.ApprovalTierDangerous,
				},
			}, nil
		},
		Execute: func(ctx context.Context, execCtx ExecutionContext, input any) (any, error) {
			return map[string]any{"ok": true}, nil
		},
	}); err != nil {
		t.Fatalf("Register error: %v", err)
	}

	return NewExecutor(registry, policyStore, auditLog)
}

func newDangerousExecutorWithInput(t *testing.T) *Executor {
	t.Helper()

	type payload struct {
		Pattern string `json:"pattern"`
	}

	policyStore, err := policy.NewStore(filepath.Join(t.TempDir(), "policy.json"), "/workspace/repo")
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}
	auditLog, err := audit.NewLog(filepath.Join(t.TempDir(), "audit.jsonl"))
	if err != nil {
		t.Fatalf("NewLog error: %v", err)
	}
	registry := NewRegistry()
	if err := registry.Register(Definition{
		Name:         "safety.add_ignore_rule",
		Description:  "add ignore rule",
		InputSchema:  json.RawMessage(`{"type":"object","properties":{"pattern":{"type":"string"}},"required":["pattern"],"additionalProperties":false}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: Metadata{
			Capabilities: []string{"policy:write"},
			ApprovalTier: policy.ApprovalTierDangerous,
			Mutating:     true,
			TargetKind:   TargetPolicy,
		},
		Decode: func(raw json.RawMessage) (any, error) { return DecodeJSON[payload](raw) },
		Plan: func(input any, ctx ExecutionContext) (OperationPlan, error) {
			parsed := input.(payload)
			return OperationPlan{
				Operation: Operation{
					Summary:              "add ignore rule " + parsed.Pattern,
					RequiredCapabilities: []string{"policy:write"},
					ApprovalTier:         policy.ApprovalTierDangerous,
				},
			}, nil
		},
		Execute: func(ctx context.Context, execCtx ExecutionContext, input any) (any, error) {
			parsed := input.(payload)
			return map[string]any{"ok": true, "pattern": parsed.Pattern, "workspace_id": execCtx.WorkspaceID}, nil
		},
	}); err != nil {
		t.Fatalf("Register error: %v", err)
	}

	return NewExecutor(registry, policyStore, auditLog)
}
