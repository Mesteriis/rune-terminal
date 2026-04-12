package toolruntime

import (
	"context"
	"encoding/json"
	"path/filepath"
	"testing"

	"github.com/avm/rterm/core/audit"
	"github.com/avm/rterm/core/policy"
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

	executor := NewExecutor(registry, policyStore, auditLog, nil)
	response := executor.Execute(context.Background(), ExecuteRequest{ToolName: "safety.add_ignore_rule"})
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
	})
	if approved.Status != "ok" {
		t.Fatalf("expected approved execution, got %#v", approved)
	}
}

func TestExecutorConfirmConsumesPendingApproval(t *testing.T) {
	t.Parallel()

	executor := newDangerousExecutor(t)
	response := executor.Execute(context.Background(), ExecuteRequest{ToolName: "safety.add_ignore_rule"})
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
	response := executor.Execute(context.Background(), ExecuteRequest{ToolName: "safety.add_ignore_rule"})
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
	})
	if first.Status != "ok" {
		t.Fatalf("expected first execution to succeed, got %#v", first)
	}

	replayed := executor.Execute(context.Background(), ExecuteRequest{
		ToolName:      "safety.add_ignore_rule",
		ApprovalToken: grant.Token,
	})
	if replayed.Status != "requires_confirmation" || replayed.PendingApproval == nil {
		t.Fatalf("expected replayed approval token to require a new approval, got %#v", replayed)
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

	return NewExecutor(registry, policyStore, auditLog, nil)
}
