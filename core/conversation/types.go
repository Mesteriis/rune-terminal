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
	StatusComplete MessageStatus = "complete"
	StatusError    MessageStatus = "error"
)

type ProviderInfo struct {
	Kind      string `json:"kind"`
	BaseURL   string `json:"base_url"`
	Model     string `json:"model,omitempty"`
	Streaming bool   `json:"streaming"`
}

type Message struct {
	ID        string        `json:"id"`
	Role      MessageRole   `json:"role"`
	Content   string        `json:"content"`
	Status    MessageStatus `json:"status"`
	Provider  string        `json:"provider,omitempty"`
	Model     string        `json:"model,omitempty"`
	CreatedAt time.Time     `json:"created_at"`
}

type Snapshot struct {
	Messages  []Message    `json:"messages"`
	Provider  ProviderInfo `json:"provider"`
	UpdatedAt time.Time    `json:"updated_at"`
}

type SubmitRequest struct {
	SystemPrompt string
	Prompt       string
}

type SubmitResult struct {
	Snapshot      Snapshot
	Assistant     Message
	ProviderInfo  ProviderInfo
	ProviderError string
}

type ChatMessage struct {
	Role    MessageRole
	Content string
}

type CompletionRequest struct {
	SystemPrompt string
	Messages     []ChatMessage
}

type CompletionResult struct {
	Content string
	Model   string
}
