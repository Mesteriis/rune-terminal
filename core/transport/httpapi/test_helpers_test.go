package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/agent"
	"github.com/Mesteriis/rune-terminal/core/app"
	"github.com/Mesteriis/rune-terminal/core/audit"
	"github.com/Mesteriis/rune-terminal/core/config"
	"github.com/Mesteriis/rune-terminal/core/connections"
	"github.com/Mesteriis/rune-terminal/core/conversation"
	"github.com/Mesteriis/rune-terminal/core/db"
	"github.com/Mesteriis/rune-terminal/core/execution"
	"github.com/Mesteriis/rune-terminal/core/locale"
	"github.com/Mesteriis/rune-terminal/core/plugins"
	"github.com/Mesteriis/rune-terminal/core/policy"
	"github.com/Mesteriis/rune-terminal/core/providergateway"
	"github.com/Mesteriis/rune-terminal/core/tasks"
	"github.com/Mesteriis/rune-terminal/core/terminal"
	"github.com/Mesteriis/rune-terminal/core/toolruntime"
	"github.com/Mesteriis/rune-terminal/core/windowtitle"
	"github.com/Mesteriis/rune-terminal/core/workspace"
)

const testAuthToken = "test-token"

func newTestHandler(t *testing.T, definitions ...toolruntime.Definition) (http.Handler, *agent.Store) {
	return newTestHandlerWithConversationProvider(t, testConversationProvider{}, testAuthToken, definitions...)
}

func newTestHandlerWithToken(t *testing.T, authToken string, definitions ...toolruntime.Definition) (http.Handler, *agent.Store) {
	return newTestHandlerWithConversationProvider(t, testConversationProvider{}, authToken, definitions...)
}

func newTestHandlerWithConversationProvider(t *testing.T, provider conversation.Provider, authToken string, definitions ...toolruntime.Definition) (http.Handler, *agent.Store) {
	return newTestHandlerWithConversationProviderAndRepoRoot(t, provider, authToken, "/workspace/repo", definitions...)
}

func newTestHandlerWithRepoRoot(t *testing.T, repoRoot string, definitions ...toolruntime.Definition) (http.Handler, *agent.Store) {
	return newTestHandlerWithConversationProviderAndRepoRoot(t, testConversationProvider{}, testAuthToken, repoRoot, definitions...)
}

func newTestHandlerWithConversationProviderAndRepoRoot(
	t *testing.T,
	provider conversation.Provider,
	authToken string,
	repoRoot string,
	definitions ...toolruntime.Definition,
) (http.Handler, *agent.Store) {
	t.Helper()

	tempDir := t.TempDir()
	paths := config.Resolve(tempDir)
	policyStore, err := policy.NewStore(filepath.Join(tempDir, "policy.json"), repoRoot)
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
	pluginCatalogStore, err := app.NewPluginCatalogStore(filepath.Join(tempDir, "plugins-catalog.json"))
	if err != nil {
		t.Fatalf("NewPluginCatalogStore error: %v", err)
	}
	conversationStore, err := conversation.NewService(filepath.Join(tempDir, "conversation.json"), provider)
	if err != nil {
		t.Fatalf("NewService error: %v", err)
	}
	executionStore, err := execution.NewService(filepath.Join(tempDir, "execution-blocks.json"))
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
		RepoRoot:         repoRoot,
		HomeDir:          "/home/testuser",
		Paths:            paths,
		Workspace:        workspace.NewService(workspace.BootstrapDefault()),
		Terminals:        terminal.NewService(terminal.DefaultLauncher()),
		Connections:      connectionStore,
		PluginCatalog:    pluginCatalogStore,
		Agent:            agentStore,
		Conversation:     conversationStore,
		Execution:        executionStore,
		Policy:           policyStore,
		Audit:            auditLog,
		Registry:         registry,
		TaskControlToken: strings.TrimSpace(os.Getenv("RTERM_TASK_CONTROL_TOKEN")),
	}
	dbConn, err := db.Open(context.Background(), filepath.Join(tempDir, "runtime.sqlite"))
	if err != nil {
		t.Fatalf("db.Open error: %v", err)
	}
	localePreferences, err := locale.NewStore(context.Background(), dbConn)
	if err != nil {
		t.Fatalf("locale.NewStore error: %v", err)
	}
	terminalPreferences, err := terminal.NewPreferencesStore(context.Background(), dbConn)
	if err != nil {
		t.Fatalf("NewPreferencesStore error: %v", err)
	}
	windowTitlePreferences, err := windowtitle.NewStore(context.Background(), dbConn)
	if err != nil {
		t.Fatalf("windowtitle.NewStore error: %v", err)
	}
	agentComposerPreferences, err := agent.NewComposerPreferencesStore(context.Background(), dbConn)
	if err != nil {
		t.Fatalf("NewComposerPreferencesStore error: %v", err)
	}
	providerGateway, err := providergateway.NewStore(context.Background(), dbConn)
	if err != nil {
		t.Fatalf("providergateway.NewStore error: %v", err)
	}
	taskStore := tasks.NewStore(dbConn)
	runtime.DB = dbConn
	runtime.LocalePreferences = localePreferences
	runtime.TerminalPreferences = terminalPreferences
	runtime.WindowTitlePreferences = windowTitlePreferences
	runtime.AgentComposerPreferences = agentComposerPreferences
	runtime.ProviderGateway = providerGateway
	runtime.TaskStore = taskStore
	runtime.TaskService = tasks.NewService(taskStore)
	runtime.MCP = plugins.NewMCPRuntimeWithOptions(nil, &testProcessSpawner{}, nil, plugins.MCPRuntimeOptions{
		IdleCheckInterval: -1,
	})
	_ = runtime.MCP.Registry().Register(plugins.MCPServerSpec{
		ID: "mcp.test",
		Process: plugins.ProcessConfig{
			Command: "mcp-test",
		},
	})
	runtime.Executor = toolruntime.NewExecutor(runtime.Registry, runtime.Policy, runtime.Audit)
	runtime.ConversationProviderFactory = func(agent.ProviderRecord) (conversation.Provider, error) {
		return provider, nil
	}
	return NewHandler(runtime, authToken), agentStore
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

type testProcessSpawner struct{}

func (testProcessSpawner) Spawn(context.Context, plugins.ProcessConfig) (plugins.Process, error) {
	return &testProcess{}, nil
}

type testProcess struct{}

func (testProcess) Stdin() io.WriteCloser {
	return nopWriteCloser{}
}

func (testProcess) Stdout() io.ReadCloser {
	return io.NopCloser(bytes.NewReader(nil))
}

func (testProcess) Wait() error {
	return nil
}

func (testProcess) Kill() error {
	return nil
}

type nopWriteCloser struct{}

func (nopWriteCloser) Write(p []byte) (int, error) {
	return len(p), nil
}

func (nopWriteCloser) Close() error {
	return nil
}

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

func (testConversationProvider) CompleteStream(
	_ context.Context,
	_ conversation.CompletionRequest,
	onTextDelta func(string) error,
) (conversation.CompletionResult, conversation.ProviderInfo, error) {
	if onTextDelta != nil {
		if err := onTextDelta("stub assistant response"); err != nil {
			return conversation.CompletionResult{}, testConversationProvider{}.Info(), err
		}
	}
	info := testConversationProvider{}.Info()
	return conversation.CompletionResult{
		Content: "stub assistant response",
		Model:   info.Model,
	}, info, nil
}
