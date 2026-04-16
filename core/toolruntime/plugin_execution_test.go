package toolruntime

import (
	"context"
	"encoding/json"
	"path/filepath"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/audit"
	"github.com/Mesteriis/rune-terminal/core/plugins"
	"github.com/Mesteriis/rune-terminal/core/policy"
)

func TestExecutorExecutesPluginBackedToolsViaPluginInvoker(t *testing.T) {
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

	type payload struct {
		Text string `json:"text"`
	}

	base := Definition{
		Name:         "plugin.example_echo",
		Description:  "echo through plugin",
		InputSchema:  json.RawMessage(`{"type":"object","properties":{"text":{"type":"string"}},"required":["text"],"additionalProperties":false}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: Metadata{
			Capabilities: []string{"terminal:read"},
			ApprovalTier: policy.ApprovalTierSafe,
			TargetKind:   TargetWidget,
		},
		Decode: func(raw json.RawMessage) (any, error) {
			return DecodeJSON[payload](raw)
		},
		Plan: func(input any, execCtx ExecutionContext) (OperationPlan, error) {
			parsed := input.(payload)
			return OperationPlan{
				Operation: Operation{
					Summary:              "plugin echo " + parsed.Text,
					RequiredCapabilities: []string{"terminal:read"},
					ApprovalTier:         policy.ApprovalTierSafe,
					AffectedWidgets:      []string{execCtx.ActiveWidgetID},
				},
			}, nil
		},
		Execute: func(context.Context, ExecutionContext, any) (any, error) {
			t.Fatalf("in-process execute must not be called for plugin-backed tools")
			return nil, nil
		},
	}
	definition := PluginBackedDefinition(base, plugins.PluginSpec{
		Name: "example-plugin",
		Process: plugins.ProcessConfig{
			Command: "/tmp/example-plugin",
		},
	})
	if err := registry.Register(definition); err != nil {
		t.Fatalf("Register error: %v", err)
	}

	invoker := &capturingPluginInvoker{
		output: json.RawMessage(`{"echo":"from plugin","source":"side-process"}`),
	}
	executor := NewExecutor(registry, policyStore, auditLog, WithPluginInvoker(invoker))
	profile := policy.EvaluationProfile{
		RoleID: "reviewer",
		ModeID: "review",
	}

	response := executor.Execute(context.Background(), ExecuteRequest{
		ToolName: "plugin.example_echo",
		Input:    json.RawMessage(`{"text":"hello"}`),
		Context: ExecutionContext{
			WorkspaceID:    "ws-local",
			ActiveWidgetID: "term-main",
			RepoRoot:       "/workspace/repo",
		},
	}, profile)
	if response.Status != "ok" {
		t.Fatalf("expected ok status, got %#v", response)
	}
	output, ok := response.Output.(map[string]any)
	if !ok {
		t.Fatalf("unexpected output payload: %#v", response.Output)
	}
	if output["echo"] != "from plugin" {
		t.Fatalf("unexpected plugin output: %#v", output)
	}

	if invoker.request.ToolName != "plugin.example_echo" {
		t.Fatalf("unexpected tool name sent to plugin: %#v", invoker.request)
	}
	if invoker.request.Context.RoleID != "reviewer" || invoker.request.Context.ModeID != "review" {
		t.Fatalf("expected role/mode context in plugin request, got %#v", invoker.request.Context)
	}
	if invoker.request.Context.WidgetID != "term-main" {
		t.Fatalf("expected widget context in plugin request, got %#v", invoker.request.Context)
	}
}

func TestExecutorReturnsInternalErrorWhenPluginRuntimeIsMissing(t *testing.T) {
	t.Parallel()

	executor := newPluginBackedExecutor(t, nil)
	response := executor.Execute(context.Background(), ExecuteRequest{
		ToolName: "plugin.example_echo",
		Input:    json.RawMessage(`{"text":"hello"}`),
	}, policy.EvaluationProfile{})

	if response.Status != "error" || response.ErrorCode != ErrorCodeInternalError {
		t.Fatalf("expected internal error response, got %#v", response)
	}
}

func TestExecutorMapsPluginExecutionErrorCodes(t *testing.T) {
	t.Parallel()

	executor := newPluginBackedExecutor(t, &capturingPluginInvoker{
		err: &plugins.ExecutionError{
			PluginName: "example-plugin",
			Code:       "invalid_input",
			Message:    "text is required",
		},
	})
	response := executor.Execute(context.Background(), ExecuteRequest{
		ToolName: "plugin.example_echo",
		Input:    json.RawMessage(`{"text":"hello"}`),
	}, policy.EvaluationProfile{})

	if response.Status != "error" || response.ErrorCode != ErrorCodeInvalidInput {
		t.Fatalf("expected invalid_input response, got %#v", response)
	}
}

func TestPluginBackedExecutionRequiresApprovalBeforePluginInvoke(t *testing.T) {
	t.Parallel()

	invoker := &capturingPluginInvoker{
		output: json.RawMessage(`{"ok":true}`),
	}
	executor := newPluginBackedDangerousExecutor(t, invoker)

	initial := executor.Execute(context.Background(), ExecuteRequest{
		ToolName: "plugin.example_mutation",
		Input:    json.RawMessage(`{"text":"alpha"}`),
		Context: ExecutionContext{
			WorkspaceID: "ws-local",
		},
	}, policy.EvaluationProfile{})
	if initial.Status != "requires_confirmation" || initial.PendingApproval == nil {
		t.Fatalf("expected pending approval, got %#v", initial)
	}
	if invoker.calls != 0 {
		t.Fatalf("expected plugin invoker not to run before approval, calls=%d", invoker.calls)
	}

	grant, err := executor.Confirm(initial.PendingApproval.ID)
	if err != nil {
		t.Fatalf("Confirm error: %v", err)
	}

	approved := executor.Execute(context.Background(), ExecuteRequest{
		ToolName:      "plugin.example_mutation",
		Input:         json.RawMessage(`{"text":"alpha"}`),
		Context:       ExecutionContext{WorkspaceID: "ws-local"},
		ApprovalToken: grant.Token,
	}, policy.EvaluationProfile{})
	if approved.Status != "ok" {
		t.Fatalf("expected approved execution, got %#v", approved)
	}
	if invoker.calls != 1 {
		t.Fatalf("expected plugin invoker to run once after approval, calls=%d", invoker.calls)
	}
}

func TestPluginBackedExecutionRejectsApprovalIntentMismatchBeforePluginInvoke(t *testing.T) {
	t.Parallel()

	invoker := &capturingPluginInvoker{
		output: json.RawMessage(`{"ok":true}`),
	}
	executor := newPluginBackedDangerousExecutor(t, invoker)

	initial := executor.Execute(context.Background(), ExecuteRequest{
		ToolName: "plugin.example_mutation",
		Input:    json.RawMessage(`{"text":"alpha"}`),
		Context: ExecutionContext{
			WorkspaceID: "ws-local",
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
		ToolName:      "plugin.example_mutation",
		Input:         json.RawMessage(`{"text":"beta"}`),
		Context:       ExecutionContext{WorkspaceID: "ws-local"},
		ApprovalToken: grant.Token,
	}, policy.EvaluationProfile{})
	if mismatch.Status != "error" || mismatch.ErrorCode != ErrorCodeApprovalMismatch {
		t.Fatalf("expected approval mismatch, got %#v", mismatch)
	}
	if invoker.calls != 0 {
		t.Fatalf("expected plugin invoker not to run on mismatch, calls=%d", invoker.calls)
	}
}

func newPluginBackedExecutor(t *testing.T, invoker PluginInvoker) *Executor {
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
	if err := registry.Register(pluginTestDefinition()); err != nil {
		t.Fatalf("Register error: %v", err)
	}

	if invoker == nil {
		return NewExecutor(registry, policyStore, auditLog)
	}
	return NewExecutor(registry, policyStore, auditLog, WithPluginInvoker(invoker))
}

func pluginTestDefinition() Definition {
	type payload struct {
		Text string `json:"text"`
	}
	base := Definition{
		Name:         "plugin.example_echo",
		Description:  "echo through plugin",
		InputSchema:  json.RawMessage(`{"type":"object","properties":{"text":{"type":"string"}},"required":["text"],"additionalProperties":false}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: Metadata{
			Capabilities: []string{"terminal:read"},
			ApprovalTier: policy.ApprovalTierSafe,
			TargetKind:   TargetWidget,
		},
		Decode: func(raw json.RawMessage) (any, error) {
			return DecodeJSON[payload](raw)
		},
		Plan: func(input any, execCtx ExecutionContext) (OperationPlan, error) {
			parsed := input.(payload)
			return OperationPlan{
				Operation: Operation{
					Summary:              "plugin echo " + parsed.Text,
					RequiredCapabilities: []string{"terminal:read"},
					ApprovalTier:         policy.ApprovalTierSafe,
				},
			}, nil
		},
		Execute: func(context.Context, ExecutionContext, any) (any, error) {
			return map[string]any{"unused": true}, nil
		},
	}
	return PluginBackedDefinition(base, plugins.PluginSpec{
		Name: "example-plugin",
		Process: plugins.ProcessConfig{
			Command: "/tmp/example-plugin",
		},
	})
}

type capturingPluginInvoker struct {
	request plugins.InvokeRequest
	output  json.RawMessage
	err     error
	calls   int
}

func (i *capturingPluginInvoker) Invoke(
	ctx context.Context,
	spec plugins.PluginSpec,
	request plugins.InvokeRequest,
) (plugins.InvokeResult, error) {
	_ = ctx
	_ = spec
	i.calls++
	i.request = request
	if i.err != nil {
		return plugins.InvokeResult{}, i.err
	}
	return plugins.InvokeResult{Output: i.output}, nil
}

func newPluginBackedDangerousExecutor(t *testing.T, invoker PluginInvoker) *Executor {
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
	if err := registry.Register(pluginDangerousTestDefinition()); err != nil {
		t.Fatalf("Register error: %v", err)
	}
	return NewExecutor(registry, policyStore, auditLog, WithPluginInvoker(invoker))
}

func pluginDangerousTestDefinition() Definition {
	type payload struct {
		Text string `json:"text"`
	}
	base := Definition{
		Name:         "plugin.example_mutation",
		Description:  "mutating plugin tool",
		InputSchema:  json.RawMessage(`{"type":"object","properties":{"text":{"type":"string"}},"required":["text"],"additionalProperties":false}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: Metadata{
			Capabilities: []string{"policy:write"},
			ApprovalTier: policy.ApprovalTierDangerous,
			Mutating:     true,
			TargetKind:   TargetPolicy,
		},
		Decode: func(raw json.RawMessage) (any, error) {
			return DecodeJSON[payload](raw)
		},
		Plan: func(input any, execCtx ExecutionContext) (OperationPlan, error) {
			parsed := input.(payload)
			return OperationPlan{
				Operation: Operation{
					Summary:              "plugin mutate " + parsed.Text,
					RequiredCapabilities: []string{"policy:write"},
					ApprovalTier:         policy.ApprovalTierDangerous,
				},
			}, nil
		},
		Execute: func(context.Context, ExecutionContext, any) (any, error) {
			return map[string]any{"unused": true}, nil
		},
	}
	return PluginBackedDefinition(base, plugins.PluginSpec{
		Name: "example-plugin",
		Process: plugins.ProcessConfig{
			Command: "/tmp/example-plugin",
		},
	})
}
