package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/agent"
	"github.com/Mesteriis/rune-terminal/core/app"
	"github.com/Mesteriis/rune-terminal/core/audit"
	"github.com/Mesteriis/rune-terminal/core/connections"
	"github.com/Mesteriis/rune-terminal/core/conversation"
	"github.com/Mesteriis/rune-terminal/core/policy"
	"github.com/Mesteriis/rune-terminal/core/terminal"
	"github.com/Mesteriis/rune-terminal/core/toolruntime"
	"github.com/Mesteriis/rune-terminal/core/workspace"
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
	connectionStore, err := connections.NewService(filepath.Join(tempDir, "connections.json"))
	if err != nil {
		t.Fatalf("NewService error: %v", err)
	}
	conversationStore, err := conversation.NewService(filepath.Join(tempDir, "conversation.json"), testConversationProvider{})
	if err != nil {
		t.Fatalf("NewService error: %v", err)
	}
	registry := toolruntime.NewRegistry()
	for _, definition := range definitions {
		if err := registry.Register(definition); err != nil {
			t.Fatalf("Register error: %v", err)
		}
	}
	runtime := &app.Runtime{
		RepoRoot:     "/workspace/repo",
		Workspace:    workspace.NewService(workspace.BootstrapDefault()),
		Terminals:    terminal.NewService(terminal.DefaultLauncher()),
		Connections:  connectionStore,
		Agent:        agentStore,
		Conversation: conversationStore,
		Policy:       policyStore,
		Audit:        auditLog,
		Registry:     registry,
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

type testConversationProvider struct{}

func (testConversationProvider) Info() conversation.ProviderInfo {
	return conversation.ProviderInfo{
		Kind:      "stub",
		BaseURL:   "http://stub",
		Model:     "stub-model",
		Streaming: false,
	}
}

func (testConversationProvider) Complete(context.Context, conversation.CompletionRequest) (conversation.CompletionResult, conversation.ProviderInfo, error) {
	info := testConversationProvider{}.Info()
	return conversation.CompletionResult{
		Content: "stub assistant response",
		Model:   info.Model,
	}, info, nil
}
