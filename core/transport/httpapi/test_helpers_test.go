package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/avm/rterm/core/agent"
	"github.com/avm/rterm/core/app"
	"github.com/avm/rterm/core/audit"
	"github.com/avm/rterm/core/policy"
	"github.com/avm/rterm/core/terminal"
	"github.com/avm/rterm/core/toolruntime"
)

const testAuthToken = "test-token"

func newTestHandler(t *testing.T, definitions ...toolruntime.Definition) (http.Handler, *agent.Store) {
	t.Helper()

	tempDir := t.TempDir()
	policyStore, err := policy.NewStore(filepath.Join(tempDir, "policy.json"), "/workspace/repo")
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}
	auditLog, err := audit.NewLog(filepath.Join(tempDir, "audit.jsonl"))
	if err != nil {
		t.Fatalf("NewLog error: %v", err)
	}
	agentStore, err := agent.NewStore(filepath.Join(tempDir, "agent.json"))
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}
	registry := toolruntime.NewRegistry()
	for _, definition := range definitions {
		if err := registry.Register(definition); err != nil {
			t.Fatalf("Register error: %v", err)
		}
	}
	runtime := &app.Runtime{
		RepoRoot:  "/workspace/repo",
		Terminals: terminal.NewService(terminal.DefaultLauncher()),
		Agent:     agentStore,
		Policy:    policyStore,
		Audit:     auditLog,
		Registry:  registry,
	}
	runtime.Executor = toolruntime.NewExecutor(runtime.Registry, runtime.Policy, runtime.Audit, runtime.Agent)
	return NewHandler(runtime, testAuthToken), agentStore
}

func authedJSONRequest(t *testing.T, method string, path string, payload any) *http.Request {
	t.Helper()

	var body *bytes.Reader
	if payload == nil {
		body = bytes.NewReader(nil)
	} else {
		raw, err := json.Marshal(payload)
		if err != nil {
			t.Fatalf("Marshal error: %v", err)
		}
		body = bytes.NewReader(raw)
	}

	req := httptest.NewRequest(method, path, body)
	req.Header.Set("Authorization", "Bearer "+testAuthToken)
	req.Header.Set("Content-Type", "application/json")
	return req
}

func executeToolDefinition(name string, decode func(json.RawMessage) (any, error), execute func(context.Context, toolruntime.ExecutionContext, any) (any, error), metadata toolruntime.Metadata) toolruntime.Definition {
	return toolruntime.Definition{
		Name:         name,
		Description:  "test tool",
		InputSchema:  json.RawMessage(`{"type":"object"}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata:     metadata,
		Decode:       decode,
		Plan: func(input any, execCtx toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
			return toolruntime.OperationPlan{
				Operation: toolruntime.Operation{
					Summary:              "test operation",
					RequiredCapabilities: append([]string(nil), metadata.Capabilities...),
					ApprovalTier:         metadata.ApprovalTier,
				},
			}, nil
		},
		Execute: execute,
	}
}
