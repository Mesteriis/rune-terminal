package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/Mesteriis/rune-terminal/core/agent"
	"github.com/Mesteriis/rune-terminal/core/app"
	"github.com/Mesteriis/rune-terminal/core/audit"
	"github.com/Mesteriis/rune-terminal/core/connections"
	"github.com/Mesteriis/rune-terminal/core/conversation"
	"github.com/Mesteriis/rune-terminal/core/execution"
	"github.com/Mesteriis/rune-terminal/core/policy"
	"github.com/Mesteriis/rune-terminal/core/terminal"
	"github.com/Mesteriis/rune-terminal/core/toolruntime"
	"github.com/Mesteriis/rune-terminal/core/workspace"
)

func TestConversationSnapshotReturnsProviderInfo(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodGet, "/api/v1/agent/conversation", nil))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	var payload struct {
		Conversation struct {
			Provider struct {
				Kind string `json:"kind"`
			} `json:"provider"`
		} `json:"conversation"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if payload.Conversation.Provider.Kind != "stub" {
		t.Fatalf("unexpected provider kind: %q", payload.Conversation.Provider.Kind)
	}
}

func TestSubmitConversationMessagePersistsTranscript(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/conversation/messages", map[string]any{
		"prompt": "hello there",
		"context": map[string]any{
			"workspace_id":         "ws-default",
			"target_session":       "remote",
			"target_connection_id": "conn-httpapi",
		},
	}))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	var payload struct {
		ProviderError string `json:"provider_error"`
		Conversation  struct {
			Messages []struct {
				Role    string `json:"role"`
				Content string `json:"content"`
			} `json:"messages"`
		} `json:"conversation"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if payload.ProviderError != "" {
		t.Fatalf("unexpected provider error: %q", payload.ProviderError)
	}
	if len(payload.Conversation.Messages) != 2 {
		t.Fatalf("expected 2 messages, got %d", len(payload.Conversation.Messages))
	}
	if payload.Conversation.Messages[0].Role != "user" || payload.Conversation.Messages[1].Role != "assistant" {
		t.Fatalf("unexpected roles: %#v", payload.Conversation.Messages)
	}
}

func TestSubmitConversationMessagePersistsAttachmentReferences(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	tempFile := filepath.Join(t.TempDir(), "notes.txt")
	if err := os.WriteFile(tempFile, []byte("notes"), 0o600); err != nil {
		t.Fatalf("write temp file: %v", err)
	}
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/conversation/messages", map[string]any{
		"prompt": "please inspect file",
		"attachments": []map[string]any{
			{
				"id":            "att_test_1",
				"name":          "notes.txt",
				"path":          tempFile,
				"mime_type":     "text/plain",
				"size":          42,
				"modified_time": int64(1713279000),
			},
		},
		"context": map[string]any{
			"workspace_id": "ws-default",
		},
	}))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Conversation struct {
			Messages []struct {
				Role        string `json:"role"`
				Attachments []struct {
					ID   string `json:"id"`
					Path string `json:"path"`
				} `json:"attachments"`
			} `json:"messages"`
		} `json:"conversation"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if len(payload.Conversation.Messages) < 1 {
		t.Fatalf("expected persisted messages, got %#v", payload.Conversation.Messages)
	}
	if payload.Conversation.Messages[0].Role != "user" {
		t.Fatalf("unexpected first role: %#v", payload.Conversation.Messages)
	}
	if len(payload.Conversation.Messages[0].Attachments) != 1 {
		t.Fatalf("expected one attachment reference, got %#v", payload.Conversation.Messages[0].Attachments)
	}
	if payload.Conversation.Messages[0].Attachments[0].ID != "att_test_1" {
		t.Fatalf("unexpected attachment id: %#v", payload.Conversation.Messages[0].Attachments[0])
	}
}

func TestSubmitConversationMessageRejectsBlankPrompt(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/conversation/messages", map[string]any{
		"prompt": "  ",
	}))

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", recorder.Code)
	}
}

func TestConversationRoutesKeepJSONAndStreamPathsSeparate(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	jsonRecorder := httptest.NewRecorder()
	handler.ServeHTTP(jsonRecorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/conversation/messages", map[string]any{
		"prompt": "hello there",
	}))

	if jsonRecorder.Code != http.StatusOK {
		t.Fatalf("expected JSON route 200, got %d", jsonRecorder.Code)
	}
	if contentType := jsonRecorder.Header().Get("Content-Type"); !strings.HasPrefix(contentType, "application/json") {
		t.Fatalf("expected JSON content type, got %q", contentType)
	}

	server := httptest.NewServer(handler)
	defer server.Close()

	body := bytes.NewBufferString(`{"prompt":"hello there"}`)
	req, err := http.NewRequest(http.MethodPost, server.URL+"/api/v1/agent/conversation/messages/stream", body)
	if err != nil {
		t.Fatalf("new request: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+testAuthToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("do request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected stream route 200, got %d", resp.StatusCode)
	}
	if contentType := resp.Header.Get("Content-Type"); !strings.HasPrefix(contentType, "text/event-stream") {
		t.Fatalf("expected stream content type, got %q", contentType)
	}

	events := readConversationStreamEvents(t, resp.Body, 3, 2*time.Second)
	if len(events) != 3 {
		t.Fatalf("expected 3 stream events, got %#v", events)
	}
	if events[0].Event != "message-start" || events[1].Event != "text-delta" || events[2].Event != "message-complete" {
		t.Fatalf("unexpected stream event order: %#v", events)
	}
}

func TestStreamConversationMessageEmitsStructuredEventSequence(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandlerWithConversationProvider(t, &httpConversationStreamProvider{
		info: conversation.ProviderInfo{
			Kind:      "stub",
			BaseURL:   "http://stub",
			Model:     "stream-model",
			Streaming: true,
		},
		deltas: []string{"hello ", "world"},
		result: conversation.CompletionResult{
			Content: "hello world",
			Model:   "stream-model",
		},
	}, testAuthToken)
	server := httptest.NewServer(handler)
	defer server.Close()

	events := postConversationStream(t, server.URL, map[string]any{
		"prompt": "hello there",
	}, 4)
	if events[0].Event != "message-start" || events[1].Event != "text-delta" || events[2].Event != "text-delta" || events[3].Event != "message-complete" {
		t.Fatalf("unexpected stream event order: %#v", events)
	}
	if events[0].Data.Message == nil || events[0].Data.Message.Status != conversation.StatusStreaming {
		t.Fatalf("expected streaming start message, got %#v", events[0].Data.Message)
	}
	if events[1].Data.Delta != "hello " || events[2].Data.Delta != "world" {
		t.Fatalf("unexpected stream deltas: %#v", events)
	}
	if events[3].Data.Message == nil || events[3].Data.Message.Status != conversation.StatusComplete {
		t.Fatalf("expected completed final message, got %#v", events[3].Data.Message)
	}
	if events[3].Data.Message.Content != "hello world" {
		t.Fatalf("unexpected final content: %q", events[3].Data.Message.Content)
	}
}

func TestStreamConversationMessageEmitsErrorEventOnFailure(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandlerWithConversationProvider(t, &httpConversationStreamProvider{
		info: conversation.ProviderInfo{
			Kind:      "stub",
			BaseURL:   "http://stub",
			Model:     "stream-model",
			Streaming: true,
		},
		deltas: []string{"partial"},
		err:    errors.New("provider unavailable"),
	}, testAuthToken)
	server := httptest.NewServer(handler)
	defer server.Close()

	events := postConversationStream(t, server.URL, map[string]any{
		"prompt": "hello there",
	}, 3)
	if events[0].Event != "message-start" || events[1].Event != "text-delta" || events[2].Event != "error" {
		t.Fatalf("unexpected stream event order: %#v", events)
	}
	if events[2].Data.Error != "provider unavailable" {
		t.Fatalf("unexpected error payload: %#v", events[2].Data)
	}
	if events[2].Data.Message == nil || events[2].Data.Message.Status != conversation.StatusError {
		t.Fatalf("expected error message payload, got %#v", events[2].Data.Message)
	}
	if events[2].Data.Message.Content != "partial" {
		t.Fatalf("expected partial assistant content to persist, got %q", events[2].Data.Message.Content)
	}
}

func TestSubmitConversationMessageRejectsMissingAttachmentReference(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/conversation/messages", map[string]any{
		"prompt": "analyze missing file",
		"attachments": []map[string]any{
			{
				"id":            "att_missing",
				"name":          "missing.txt",
				"path":          filepath.Join(t.TempDir(), "missing.txt"),
				"mime_type":     "text/plain",
				"size":          1,
				"modified_time": int64(1713279000),
			},
		},
		"context": map[string]any{
			"workspace_id": "ws-default",
		},
	}))

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if payload.Error.Code != "attachment_not_found" {
		t.Fatalf("unexpected error code: %q", payload.Error.Code)
	}
}

func TestCreateAttachmentReferenceReturnsMetadata(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	tempFile := filepath.Join(t.TempDir(), "notes.txt")
	if err := os.WriteFile(tempFile, []byte("hello"), 0o600); err != nil {
		t.Fatalf("write temp file: %v", err)
	}

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/conversation/attachments/references", map[string]any{
		"path": tempFile,
	}))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Attachment struct {
			ID           string `json:"id"`
			Name         string `json:"name"`
			Path         string `json:"path"`
			MimeType     string `json:"mime_type"`
			Size         int64  `json:"size"`
			ModifiedTime int64  `json:"modified_time"`
		} `json:"attachment"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if payload.Attachment.ID == "" {
		t.Fatal("expected attachment id")
	}
	if payload.Attachment.Name != "notes.txt" {
		t.Fatalf("unexpected attachment name: %q", payload.Attachment.Name)
	}
	if payload.Attachment.Path != filepath.Clean(tempFile) {
		t.Fatalf("unexpected attachment path: %q", payload.Attachment.Path)
	}
	if payload.Attachment.Size != 5 {
		t.Fatalf("unexpected attachment size: %d", payload.Attachment.Size)
	}
	if payload.Attachment.ModifiedTime == 0 {
		t.Fatal("expected attachment modified_time")
	}
}

type conversationStreamEnvelope struct {
	Event string
	Data  conversation.StreamEvent
}

type httpConversationStreamProvider struct {
	info   conversation.ProviderInfo
	deltas []string
	result conversation.CompletionResult
	err    error
}

func readConversationStreamEvents(t *testing.T, reader io.Reader, count int, timeout time.Duration) []conversationStreamEnvelope {
	t.Helper()

	deadline := time.Now().Add(timeout)
	var pending strings.Builder
	events := make([]conversationStreamEnvelope, 0, count)
	buffer := make([]byte, 512)
	for len(events) < count {
		if time.Now().After(deadline) {
			t.Fatalf("timed out waiting for %d stream events, got %#v raw=%q", count, events, pending.String())
		}
		n, err := reader.Read(buffer)
		if n > 0 {
			pending.Write(buffer[:n])
			text := pending.String()
			for strings.Contains(text, "\n\n") {
				parts := strings.SplitN(text, "\n\n", 2)
				block := parts[0]
				text = parts[1]
				event := parseConversationStreamBlock(t, block)
				if event.Event != "" {
					events = append(events, event)
				}
			}
			pending.Reset()
			pending.WriteString(text)
		}
		if err != nil {
			if err == io.EOF {
				break
			}
			t.Fatalf("read stream: %v", err)
		}
	}
	return events
}

func parseConversationStreamBlock(t *testing.T, block string) conversationStreamEnvelope {
	t.Helper()

	var envelope conversationStreamEnvelope
	for _, line := range strings.Split(block, "\n") {
		switch {
		case strings.HasPrefix(line, "event: "):
			envelope.Event = strings.TrimPrefix(line, "event: ")
		case strings.HasPrefix(line, "data: "):
			if err := json.Unmarshal([]byte(strings.TrimPrefix(line, "data: ")), &envelope.Data); err != nil {
				t.Fatalf("unmarshal stream event: %v", err)
			}
		}
	}
	return envelope
}

func postConversationStream(t *testing.T, baseURL string, payload any, eventCount int) []conversationStreamEnvelope {
	t.Helper()

	raw, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}
	req, err := http.NewRequest(http.MethodPost, baseURL+"/api/v1/agent/conversation/messages/stream", bytes.NewReader(raw))
	if err != nil {
		t.Fatalf("new request: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+testAuthToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("do request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected stream route 200, got %d body=%s", resp.StatusCode, readAllString(t, resp.Body))
	}
	return readConversationStreamEvents(t, resp.Body, eventCount, 2*time.Second)
}

func readAllString(t *testing.T, reader io.Reader) string {
	t.Helper()

	raw, err := io.ReadAll(reader)
	if err != nil {
		t.Fatalf("read all: %v", err)
	}
	return string(raw)
}

func (p *httpConversationStreamProvider) Info() conversation.ProviderInfo {
	return p.info
}

func (p *httpConversationStreamProvider) Complete(context.Context, conversation.CompletionRequest) (conversation.CompletionResult, conversation.ProviderInfo, error) {
	return p.result, p.info, p.err
}

func (p *httpConversationStreamProvider) CompleteStream(
	_ context.Context,
	_ conversation.CompletionRequest,
	onTextDelta func(string) error,
) (conversation.CompletionResult, conversation.ProviderInfo, error) {
	for _, delta := range p.deltas {
		if onTextDelta != nil {
			if err := onTextDelta(delta); err != nil {
				return conversation.CompletionResult{}, p.info, err
			}
		}
	}
	return p.result, p.info, p.err
}

func TestCreateAttachmentReferenceRejectsInvalidPath(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/conversation/attachments/references", map[string]any{
		"path": "relative/path.txt",
	}))

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestExplainTerminalCommandReturnsConversationSnapshot(t *testing.T) {
	t.Parallel()

	handler, _ := newExplainCommandHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/terminal-commands/explain", map[string]any{
		"prompt":    "/run echo httpapi-smoke",
		"command":   "echo httpapi-smoke",
		"widget_id": "term_boot",
		"from_seq":  0,
		"context": map[string]any{
			"workspace_id":           "ws-default",
			"repo_root":              "/workspace/repo",
			"active_widget_id":       "term_boot",
			"target_session":         "local",
			"target_connection_id":   "local",
			"widget_context_enabled": true,
		},
	}))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		OutputExcerpt       string `json:"output_excerpt"`
		ExecutionBlockID    string `json:"execution_block_id"`
		CommandAuditEventID string `json:"command_audit_event_id"`
		ExplainAuditEventID string `json:"explain_audit_event_id"`
		Conversation        struct {
			Messages []struct {
				Role string `json:"role"`
			} `json:"messages"`
		} `json:"conversation"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if payload.OutputExcerpt == "" {
		t.Fatal("expected output excerpt")
	}
	if payload.ExecutionBlockID == "" {
		t.Fatal("expected execution_block_id in explain response")
	}
	if payload.ExplainAuditEventID == "" {
		t.Fatal("expected explain_audit_event_id in explain response")
	}
	if len(payload.Conversation.Messages) != 3 {
		t.Fatalf("expected run prompt/result/explanation chain, got %#v", payload.Conversation.Messages)
	}
	if payload.Conversation.Messages[0].Role != "user" ||
		payload.Conversation.Messages[1].Role != "assistant" ||
		payload.Conversation.Messages[2].Role != "assistant" {
		t.Fatalf("unexpected conversation messages: %#v", payload.Conversation.Messages)
	}
}

func TestExplainTerminalCommandIgnoresFrontendApprovalUsedPayload(t *testing.T) {
	t.Parallel()

	handler, runtime := newExplainCommandHandler(t)
	if err := runtime.Audit.Append(audit.Event{
		ToolName:        "term.send_input",
		Summary:         "send input to term_boot: echo httpapi-smoke",
		WorkspaceID:     "ws-default",
		AffectedWidgets: []string{"term_boot"},
		ApprovalUsed:    false,
		Success:         true,
	}); err != nil {
		t.Fatalf("append audit event: %v", err)
	}

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/terminal-commands/explain", map[string]any{
		"prompt":        "/run echo httpapi-smoke",
		"command":       "echo httpapi-smoke",
		"widget_id":     "term_boot",
		"from_seq":      0,
		"approval_used": true,
		"context": map[string]any{
			"workspace_id":           "ws-default",
			"repo_root":              "/workspace/repo",
			"active_widget_id":       "term_boot",
			"target_session":         "local",
			"target_connection_id":   "local",
			"widget_context_enabled": true,
		},
	}))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	var payload struct {
		CommandAuditEventID string `json:"command_audit_event_id"`
		ExplainAuditEventID string `json:"explain_audit_event_id"`
		ExecutionBlockID    string `json:"execution_block_id"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if payload.CommandAuditEventID == "" {
		t.Fatal("expected command_audit_event_id")
	}
	if payload.ExecutionBlockID == "" {
		t.Fatal("expected execution_block_id")
	}
	if payload.ExplainAuditEventID == "" {
		t.Fatal("expected explain_audit_event_id")
	}

	events, err := runtime.Audit.List(10)
	if err != nil {
		t.Fatalf("audit list: %v", err)
	}
	if len(events) != 2 {
		t.Fatalf("expected 2 audit events, got %d", len(events))
	}
	if events[1].ToolName != "agent.terminal_command" {
		t.Fatalf("unexpected explain audit event: %#v", events[1])
	}
	if events[1].ApprovalUsed {
		t.Fatalf("expected explain audit approval_used=false from backend truth, got %#v", events[1])
	}
}

func TestExplainTerminalCommandUsesExplicitCommandAuditEventIDPayload(t *testing.T) {
	t.Parallel()

	handler, runtime := newExplainCommandHandler(t)
	if err := runtime.Audit.Append(audit.Event{
		ID:              "audit_selected",
		ToolName:        "term.send_input",
		Summary:         "send input to term_boot: echo httpapi-smoke",
		WorkspaceID:     "ws-default",
		AffectedWidgets: []string{"term_boot"},
		ApprovalUsed:    true,
		Success:         true,
	}); err != nil {
		t.Fatalf("append selected audit event: %v", err)
	}
	if err := runtime.Audit.Append(audit.Event{
		ID:              "audit_latest",
		ToolName:        "term.send_input",
		Summary:         "send input to term_boot: echo httpapi-smoke",
		WorkspaceID:     "ws-default",
		AffectedWidgets: []string{"term_boot"},
		ApprovalUsed:    false,
		Success:         true,
	}); err != nil {
		t.Fatalf("append latest audit event: %v", err)
	}

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/terminal-commands/explain", map[string]any{
		"prompt":                 "/run echo httpapi-smoke",
		"command":                "echo httpapi-smoke",
		"widget_id":              "term_boot",
		"from_seq":               0,
		"command_audit_event_id": "audit_selected",
		"context": map[string]any{
			"workspace_id":           "ws-default",
			"repo_root":              "/workspace/repo",
			"active_widget_id":       "term_boot",
			"target_session":         "local",
			"target_connection_id":   "local",
			"widget_context_enabled": true,
		},
	}))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	var payload struct {
		CommandAuditEventID string `json:"command_audit_event_id"`
		ExplainAuditEventID string `json:"explain_audit_event_id"`
		ExecutionBlockID    string `json:"execution_block_id"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if payload.CommandAuditEventID != "audit_selected" {
		t.Fatalf("expected command_audit_event_id=audit_selected, got %q", payload.CommandAuditEventID)
	}
	if payload.ExecutionBlockID == "" {
		t.Fatal("expected execution_block_id")
	}
	if payload.ExplainAuditEventID == "" {
		t.Fatal("expected explain_audit_event_id")
	}

	events, err := runtime.Audit.List(10)
	if err != nil {
		t.Fatalf("audit list: %v", err)
	}
	if len(events) != 3 {
		t.Fatalf("expected 3 audit events, got %d", len(events))
	}
	if events[2].ToolName != "agent.terminal_command" {
		t.Fatalf("unexpected explain audit event: %#v", events[2])
	}
	if !events[2].ApprovalUsed {
		t.Fatalf("expected explain audit approval_used=true from explicit command audit id, got %#v", events[2])
	}
}

func TestExplainTerminalCommandReturnsNotFoundForUnknownExecutionBlock(t *testing.T) {
	t.Parallel()

	handler, _ := newExplainCommandHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/terminal-commands/explain", map[string]any{
		"prompt":                 "Explain execution block command: echo httpapi-smoke",
		"command":                "echo httpapi-smoke",
		"widget_id":              "term_boot",
		"from_seq":               0,
		"execution_block_id":     "execblk_missing",
		"command_audit_event_id": "",
		"context": map[string]any{
			"workspace_id":           "ws-default",
			"repo_root":              "/workspace/repo",
			"active_widget_id":       "term_boot",
			"target_session":         "local",
			"target_connection_id":   "local",
			"widget_context_enabled": true,
		},
	}))

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	var payload struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if payload.Error.Code != "execution_block_not_found" {
		t.Fatalf("unexpected error code: %q", payload.Error.Code)
	}
}

func TestExplainTerminalCommandRejectsExecutionBlockIdentityMismatch(t *testing.T) {
	t.Parallel()

	handler, _ := newExplainCommandHandler(t)

	firstExplainRecorder := httptest.NewRecorder()
	handler.ServeHTTP(firstExplainRecorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/terminal-commands/explain", map[string]any{
		"prompt":    "/run echo httpapi-smoke",
		"command":   "echo httpapi-smoke",
		"widget_id": "term_boot",
		"from_seq":  0,
		"context": map[string]any{
			"workspace_id":           "ws-default",
			"repo_root":              "/workspace/repo",
			"active_widget_id":       "term_boot",
			"target_session":         "local",
			"target_connection_id":   "local",
			"widget_context_enabled": true,
		},
	}))
	if firstExplainRecorder.Code != http.StatusOK {
		t.Fatalf("expected first explain 200, got %d body=%s", firstExplainRecorder.Code, firstExplainRecorder.Body.String())
	}
	var firstPayload struct {
		ExecutionBlockID string `json:"execution_block_id"`
	}
	if err := json.Unmarshal(firstExplainRecorder.Body.Bytes(), &firstPayload); err != nil {
		t.Fatalf("unmarshal first payload: %v", err)
	}
	if firstPayload.ExecutionBlockID == "" {
		t.Fatal("expected first execution block id")
	}

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/terminal-commands/explain", map[string]any{
		"prompt":                 "Explain execution block command: echo mismatch",
		"command":                "echo mismatch",
		"widget_id":              "term_boot",
		"from_seq":               0,
		"execution_block_id":     firstPayload.ExecutionBlockID,
		"command_audit_event_id": "",
		"context": map[string]any{
			"workspace_id":           "ws-default",
			"repo_root":              "/workspace/repo",
			"active_widget_id":       "term_boot",
			"target_session":         "local",
			"target_connection_id":   "local",
			"widget_context_enabled": true,
		},
	}))

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	var payload struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if payload.Error.Code != "execution_block_identity_mismatch" {
		t.Fatalf("unexpected error code: %q", payload.Error.Code)
	}
}

func TestExplainTerminalCommandRejectsMissingExplicitWidgetTarget(t *testing.T) {
	t.Parallel()

	handler, _ := newExplainCommandHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/terminal-commands/explain", map[string]any{
		"prompt":   "/run echo missing-widget",
		"command":  "echo missing-widget",
		"from_seq": 0,
		"context": map[string]any{
			"workspace_id":           "ws-default",
			"repo_root":              "/workspace/repo",
			"active_widget_id":       "term_boot",
			"target_session":         "local",
			"target_connection_id":   "local",
			"widget_context_enabled": true,
		},
	}))

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	var payload struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if payload.Error.Code != "execution_target_required" {
		t.Fatalf("unexpected error code: %q", payload.Error.Code)
	}
}

func TestExplainTerminalCommandRejectsMismatchedTargetSession(t *testing.T) {
	t.Parallel()

	handler, _ := newExplainCommandHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/terminal-commands/explain", map[string]any{
		"prompt":    "/run echo mismatch",
		"command":   "echo mismatch",
		"widget_id": "term_boot",
		"from_seq":  0,
		"context": map[string]any{
			"workspace_id":           "ws-default",
			"repo_root":              "/workspace/repo",
			"active_widget_id":       "term_boot",
			"target_session":         "remote",
			"target_connection_id":   "conn-ssh",
			"widget_context_enabled": true,
		},
	}))

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	var payload struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if payload.Error.Code != "execution_target_mismatch" {
		t.Fatalf("unexpected error code: %q", payload.Error.Code)
	}
}

func newExplainCommandHandler(t *testing.T) (http.Handler, *app.Runtime) {
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
	executionStore, err := execution.NewService(filepath.Join(tempDir, "execution-blocks.json"))
	if err != nil {
		t.Fatalf("NewService error: %v", err)
	}
	process := &handlerTestProcess{
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
	}
	terminalService := terminal.NewService(handlerTestLauncher{process: process})
	if _, err := terminalService.StartSession(context.Background(), terminal.LaunchOptions{
		WidgetID:   "term_boot",
		WorkingDir: "/workspace/repo",
		Connection: terminal.ConnectionSpec{ID: "local", Name: "Local Machine", Kind: "local"},
	}); err != nil {
		t.Fatalf("StartSession error: %v", err)
	}
	process.outputCh <- []byte("httpapi-smoke\n")
	deadline := time.Now().Add(250 * time.Millisecond)
	for {
		snapshot, snapErr := terminalService.Snapshot("term_boot", 0)
		if snapErr == nil && len(snapshot.Chunks) > 0 {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("timed out waiting for terminal snapshot chunk")
		}
		time.Sleep(10 * time.Millisecond)
	}

	runtime := &app.Runtime{
		RepoRoot:     "/workspace/repo",
		Workspace:    workspace.NewService(workspace.BootstrapDefault()),
		Terminals:    terminalService,
		Connections:  connectionStore,
		Agent:        agentStore,
		Conversation: conversationStore,
		Execution:    executionStore,
		Policy:       policyStore,
		Audit:        auditLog,
		Registry:     toolruntime.NewRegistry(),
	}
	runtime.Executor = toolruntime.NewExecutor(runtime.Registry, runtime.Policy, runtime.Audit)
	return NewHandler(runtime, testAuthToken), runtime
}

type handlerTestProcess struct {
	outputCh chan []byte
	waitCh   chan struct{}
}

func (p *handlerTestProcess) PID() int                       { return 42 }
func (p *handlerTestProcess) Write(data []byte) (int, error) { return len(data), nil }
func (p *handlerTestProcess) Output() <-chan []byte          { return p.outputCh }
func (p *handlerTestProcess) Wait() (int, error)             { <-p.waitCh; return 0, nil }
func (p *handlerTestProcess) Signal(os.Signal) error         { return nil }
func (p *handlerTestProcess) Close() error                   { close(p.waitCh); return nil }

type handlerTestLauncher struct {
	process terminal.Process
}

func (l handlerTestLauncher) Launch(context.Context, terminal.LaunchOptions) (terminal.Process, error) {
	return l.process, nil
}
