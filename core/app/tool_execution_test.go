package app

import (
	"context"
	"encoding/json"
	"path/filepath"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/audit"
	"github.com/Mesteriis/rune-terminal/core/policy"
	"github.com/Mesteriis/rune-terminal/core/toolruntime"
)

func TestExecuteToolUsesRuntimeRepoRootForRepoScopedPolicy(t *testing.T) {
	t.Parallel()

	tempDir := t.TempDir()
	repoRoot := filepath.Join(tempDir, "repo")
	policyStore, err := policy.NewStore(filepath.Join(tempDir, "policy.json"), repoRoot)
	if err != nil {
		t.Fatalf("new policy store: %v", err)
	}
	_, err = policyStore.AddIgnoreRule(policy.IgnoreRule{
		Scope:       policy.ScopeRepo,
		ScopeRef:    repoRoot,
		MatcherType: policy.MatcherGlob,
		Pattern:     "secret.txt",
		Mode:        policy.IgnoreModeDeny,
	})
	if err != nil {
		t.Fatalf("add ignore rule: %v", err)
	}
	auditLog, err := audit.NewLog(filepath.Join(tempDir, "audit.jsonl"))
	if err != nil {
		t.Fatalf("new audit log: %v", err)
	}
	registry := toolruntime.NewRegistry()
	executed := false
	err = registry.Register(toolruntime.Definition{
		Name:         "test.write_secret",
		Description:  "test tool",
		InputSchema:  json.RawMessage(`{"type":"object"}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: toolruntime.Metadata{
			Capabilities: []string{"workspace:read"},
			ApprovalTier: policy.ApprovalTierSafe,
			Mutating:     true,
		},
		Decode: toolruntime.EmptyDecode,
		Plan: func(any, toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
			return toolruntime.OperationPlan{
				Operation: toolruntime.Operation{
					Summary:              "write secret",
					AffectedPaths:        []string{filepath.Join(repoRoot, "secret.txt")},
					RequiredCapabilities: []string{"workspace:read"},
					ApprovalTier:         policy.ApprovalTierSafe,
				},
				ChecksIgnoreRules: true,
			}, nil
		},
		Execute: func(context.Context, toolruntime.ExecutionContext, any) (any, error) {
			executed = true
			return map[string]string{"status": "ok"}, nil
		},
	})
	if err != nil {
		t.Fatalf("register tool: %v", err)
	}
	runtime := &Runtime{
		RepoRoot: repoRoot,
		Policy:   policyStore,
		Audit:    auditLog,
		Registry: registry,
		Executor: toolruntime.NewExecutor(registry, policyStore, auditLog),
	}

	response := runtime.ExecuteTool(context.Background(), toolruntime.ExecuteRequest{
		ToolName: "test.write_secret",
		Input:    json.RawMessage(`{}`),
		Context: toolruntime.ExecutionContext{
			WorkspaceID: "ws-default",
			RepoRoot:    filepath.Join(tempDir, "attacker-controlled-root"),
		},
	})

	if response.Status != "requires_confirmation" || response.ErrorCode != toolruntime.ErrorCodeApprovalRequired {
		t.Fatalf("expected repo-scoped ignore confirmation, got %#v", response)
	}
	if executed {
		t.Fatal("tool executed even though runtime repo policy should have required confirmation")
	}
}
