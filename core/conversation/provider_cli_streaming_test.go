package conversation

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestCodexCLIProviderCompleteStructuredStreamEmitsReasoningToolCallsAndText(t *testing.T) {
	t.Parallel()

	commandPath := writeExecutableTestScript(t, "mock-codex", `#!/bin/sh
output_path=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --output-last-message)
      output_path="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done
printf '%s\n' '{"type":"thread.started","thread_id":"thread_123"}'
printf '%s\n' '{"type":"item.completed","item":{"id":"item_reason","type":"reasoning","text":"Need to inspect the workspace first."}}'
printf '%s\n' '{"type":"item.started","item":{"id":"item_cmd","type":"command_execution","command":"ls -la","status":"in_progress"}}'
printf '%s\n' '{"type":"item.completed","item":{"id":"item_cmd","type":"command_execution","command":"ls -la","aggregated_output":"file1\n","exit_code":0,"status":"completed"}}'
printf '%s\n' '{"type":"agent_message_delta","delta":"Hello "}'
printf '%s\n' '{"type":"agent_message_delta","delta":"world"}'
printf '%s\n' '{"type":"turn.completed","usage":{"output_tokens":2}}'
printf 'Hello world' > "$output_path"
`)

	provider := NewCodexCLIProvider(CodexCLIProviderConfig{
		Command: commandPath,
		Model:   "gpt-5.4",
	})

	var events []ProviderStreamEvent
	result, info, err := provider.CompleteStructuredStream(context.Background(), CompletionRequest{
		SystemPrompt: "System prompt",
		Messages: []ChatMessage{
			{Role: RoleUser, Content: "Say hello"},
		},
	}, func(event ProviderStreamEvent) error {
		events = append(events, event)
		return nil
	})
	if err != nil {
		t.Fatalf("CompleteStructuredStream error: %v", err)
	}
	if result.Content != "Hello world" {
		t.Fatalf("unexpected stream content: %#v", result)
	}
	if result.Reasoning != "Need to inspect the workspace first." {
		t.Fatalf("unexpected stream reasoning: %#v", result)
	}
	if result.Session == nil || result.Session.ID != "thread_123" || result.Session.ProviderKind != "codex" {
		t.Fatalf("unexpected session: %#v", result.Session)
	}
	if !info.Streaming {
		t.Fatalf("expected codex provider to report streaming support")
	}
	if len(events) != 5 {
		t.Fatalf("expected 5 events, got %#v", events)
	}
	if events[0].Type != ProviderStreamEventReasoningDelta || events[0].Delta != "Need to inspect the workspace first." {
		t.Fatalf("unexpected reasoning event: %#v", events[0])
	}
	if events[1].Type != ProviderStreamEventToolCall || events[1].ToolCall == nil || events[1].ToolCall.Status != "in_progress" {
		t.Fatalf("unexpected tool-start event: %#v", events[1])
	}
	if events[2].Type != ProviderStreamEventToolCall || events[2].ToolCall == nil || events[2].ToolCall.Status != "completed" || events[2].ToolCall.Output != "file1" {
		t.Fatalf("unexpected tool-complete event: %#v", events[2])
	}
	if events[3].Type != ProviderStreamEventTextDelta || events[3].Delta != "Hello " {
		t.Fatalf("unexpected text event: %#v", events[3])
	}
	if events[4].Type != ProviderStreamEventTextDelta || events[4].Delta != "world" {
		t.Fatalf("unexpected text event: %#v", events[4])
	}
}

func TestClaudeCodeProviderCompleteStructuredStreamEmitsToolCallsAndText(t *testing.T) {
	t.Parallel()

	commandPath := writeExecutableTestScript(t, "mock-claude", `#!/bin/sh
printf '%s\n' '{"type":"init","session_id":"sess_123"}'
printf '%s\n' '{"type":"stream_event","event":{"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"tool_1","name":"Read"}}}'
printf '%s\n' '{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\"path\":\"README.md\"}"}}}'
printf '%s\n' '{"type":"stream_event","event":{"type":"content_block_stop","index":0}}'
printf '%s\n' '{"type":"stream_event","event":{"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"Hi "}}}'
printf '%s\n' '{"type":"stream_event","event":{"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"there"}}}'
printf '%s\n' '{"type":"result","subtype":"success","is_error":false,"session_id":"sess_123","result":"Hi there"}'
`)

	provider := NewClaudeCodeProvider(ClaudeCodeProviderConfig{
		Command: commandPath,
		Model:   "sonnet",
	})

	var events []ProviderStreamEvent
	result, info, err := provider.CompleteStructuredStream(context.Background(), CompletionRequest{
		SystemPrompt: "System prompt",
		Messages: []ChatMessage{
			{Role: RoleUser, Content: "Say hi"},
		},
	}, func(event ProviderStreamEvent) error {
		events = append(events, event)
		return nil
	})
	if err != nil {
		t.Fatalf("CompleteStructuredStream error: %v", err)
	}
	if result.Content != "Hi there" {
		t.Fatalf("unexpected stream content: %#v", result)
	}
	if result.Session == nil || result.Session.ID != "sess_123" || result.Session.ProviderKind != "claude" {
		t.Fatalf("unexpected session: %#v", result.Session)
	}
	if result.Reasoning == "" {
		t.Fatalf("expected fallback reasoning for claude cli stream")
	}
	if !info.Streaming {
		t.Fatalf("expected claude provider to report streaming support")
	}
	if len(events) != 4 {
		t.Fatalf("expected 4 events, got %#v", events)
	}
	if events[0].Type != ProviderStreamEventToolCall || events[0].ToolCall == nil || events[0].ToolCall.Status != "in_progress" {
		t.Fatalf("unexpected tool-start event: %#v", events[0])
	}
	if events[1].Type != ProviderStreamEventToolCall || events[1].ToolCall == nil || events[1].ToolCall.Status != "completed" || events[1].ToolCall.Input != "{\"path\":\"README.md\"}" {
		t.Fatalf("unexpected tool-complete event: %#v", events[1])
	}
	if events[2].Type != ProviderStreamEventTextDelta || events[2].Delta != "Hi " {
		t.Fatalf("unexpected text event: %#v", events[2])
	}
	if events[3].Type != ProviderStreamEventTextDelta || events[3].Delta != "there" {
		t.Fatalf("unexpected text event: %#v", events[3])
	}
}

func writeExecutableTestScript(t *testing.T, name string, content string) string {
	t.Helper()

	path := filepath.Join(t.TempDir(), name)
	if err := os.WriteFile(path, []byte(content), 0o755); err != nil {
		t.Fatalf("write script %s: %v", name, err)
	}
	return path
}
