package conversation

import "time"

type MessageRole string

const (
	RoleSystem    MessageRole = "system"
	RoleUser      MessageRole = "user"
	RoleAssistant MessageRole = "assistant"
)

type MessageStatus string

const (
	StatusStreaming MessageStatus = "streaming"
	StatusComplete  MessageStatus = "complete"
	StatusError     MessageStatus = "error"
)

type ProviderInfo struct {
	Kind      string `json:"kind"`
	BaseURL   string `json:"base_url"`
	Model     string `json:"model,omitempty"`
	Streaming bool   `json:"streaming"`
}

type ProviderSessionState struct {
	ProviderKind string `json:"provider_kind,omitempty"`
	ID           string `json:"id,omitempty"`
}

type ContextPreferences struct {
	WidgetContextEnabled bool     `json:"widget_context_enabled"`
	WidgetIDs            []string `json:"widget_ids,omitempty"`
}

type Message struct {
	ID          string                `json:"id"`
	Role        MessageRole           `json:"role"`
	Content     string                `json:"content"`
	Attachments []AttachmentReference `json:"attachments,omitempty"`
	Status      MessageStatus         `json:"status"`
	Provider    string                `json:"provider,omitempty"`
	Model       string                `json:"model,omitempty"`
	Reasoning   string                `json:"reasoning,omitempty"`
	CreatedAt   time.Time             `json:"created_at"`
}

type ConversationSummary struct {
	ID           string     `json:"id"`
	Title        string     `json:"title"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	MessageCount int        `json:"message_count"`
	ArchivedAt   *time.Time `json:"archived_at,omitempty"`
}

type Snapshot struct {
	ID                 string               `json:"id"`
	Title              string               `json:"title"`
	Messages           []Message            `json:"messages"`
	Provider           ProviderInfo         `json:"provider"`
	Session            ProviderSessionState `json:"session,omitempty"`
	ContextPreferences ContextPreferences   `json:"context_preferences"`
	CreatedAt          time.Time            `json:"created_at"`
	UpdatedAt          time.Time            `json:"updated_at"`
	ArchivedAt         *time.Time           `json:"archived_at,omitempty"`
}

type SubmitRequest struct {
	SystemPrompt   string
	Prompt         string
	ProviderPrompt string
	Model          string
	Attachments    []AttachmentReference
}

type AssistantPromptRequest struct {
	SystemPrompt string
	Prompt       string
}

type SubmitResult struct {
	Snapshot      Snapshot
	Assistant     Message
	ProviderInfo  ProviderInfo
	ProviderError string
}

type AppendMessageRequest struct {
	Role        MessageRole
	Content     string
	Attachments []AttachmentReference
	Status      MessageStatus
	Provider    string
	Model       string
}

type ChatMessage struct {
	Role    MessageRole
	Content string
}

type CompletionRequest struct {
	SystemPrompt string
	Model        string
	Messages     []ChatMessage
	Session      *ProviderSessionState
}

type CompletionResult struct {
	Content   string
	Model     string
	Reasoning string
	Session   *ProviderSessionState
}

type StreamEventType string

const (
	StreamEventMessageStart    StreamEventType = "message-start"
	StreamEventTextDelta       StreamEventType = "text-delta"
	StreamEventReasoningDelta  StreamEventType = "reasoning-delta"
	StreamEventToolCall        StreamEventType = "tool-call"
	StreamEventMessageComplete StreamEventType = "message-complete"
	StreamEventError           StreamEventType = "error"
)

type StreamToolCall struct {
	ID       string `json:"id,omitempty"`
	Kind     string `json:"kind,omitempty"`
	Name     string `json:"name,omitempty"`
	Status   string `json:"status,omitempty"`
	Summary  string `json:"summary,omitempty"`
	Input    string `json:"input,omitempty"`
	Output   string `json:"output,omitempty"`
	ExitCode *int   `json:"exit_code,omitempty"`
}

type StreamEvent struct {
	Type      StreamEventType `json:"type"`
	StreamID  string          `json:"stream_id,omitempty"`
	MessageID string          `json:"message_id,omitempty"`
	Delta     string          `json:"delta,omitempty"`
	ToolCall  *StreamToolCall `json:"tool_call,omitempty"`
	Message   *Message        `json:"message,omitempty"`
	ErrorCode string          `json:"error_code,omitempty"`
	Error     string          `json:"error,omitempty"`
}
