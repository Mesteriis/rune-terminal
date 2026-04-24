package agent

import "time"

type ProviderKind string

const (
	ProviderKindCodex            ProviderKind = "codex"
	ProviderKindClaude           ProviderKind = "claude"
	ProviderKindOpenAICompatible ProviderKind = "openai-compatible"
)

type CodexProviderSettings struct {
	Command    string   `json:"command,omitempty"`
	Model      string   `json:"model"`
	ChatModels []string `json:"chat_models,omitempty"`
}

type ClaudeProviderSettings struct {
	Command    string   `json:"command,omitempty"`
	Model      string   `json:"model"`
	ChatModels []string `json:"chat_models,omitempty"`
}

type OpenAICompatibleProviderSettings struct {
	BaseURL    string   `json:"base_url"`
	Model      string   `json:"model"`
	ChatModels []string `json:"chat_models,omitempty"`
}

type ProviderRecord struct {
	ID               string                            `json:"id"`
	Kind             ProviderKind                      `json:"kind"`
	DisplayName      string                            `json:"display_name"`
	Enabled          bool                              `json:"enabled"`
	Codex            *CodexProviderSettings            `json:"codex,omitempty"`
	Claude           *ClaudeProviderSettings           `json:"claude,omitempty"`
	OpenAICompatible *OpenAICompatibleProviderSettings `json:"openai_compatible,omitempty"`
	CreatedAt        time.Time                         `json:"created_at"`
	UpdatedAt        time.Time                         `json:"updated_at"`
}

type CodexProviderSettingsView struct {
	Command        string   `json:"command,omitempty"`
	Model          string   `json:"model"`
	ChatModels     []string `json:"chat_models,omitempty"`
	StatusState    string   `json:"status_state"`
	StatusMessage  string   `json:"status_message,omitempty"`
	ResolvedBinary string   `json:"resolved_binary,omitempty"`
}

type ClaudeProviderSettingsView struct {
	Command        string   `json:"command,omitempty"`
	Model          string   `json:"model"`
	ChatModels     []string `json:"chat_models,omitempty"`
	StatusState    string   `json:"status_state"`
	StatusMessage  string   `json:"status_message,omitempty"`
	ResolvedBinary string   `json:"resolved_binary,omitempty"`
}

type OpenAICompatibleProviderSettingsView struct {
	BaseURL    string   `json:"base_url"`
	Model      string   `json:"model"`
	ChatModels []string `json:"chat_models,omitempty"`
}

type ProviderView struct {
	ID               string                                `json:"id"`
	Kind             ProviderKind                          `json:"kind"`
	DisplayName      string                                `json:"display_name"`
	Enabled          bool                                  `json:"enabled"`
	Active           bool                                  `json:"active"`
	Codex            *CodexProviderSettingsView            `json:"codex,omitempty"`
	Claude           *ClaudeProviderSettingsView           `json:"claude,omitempty"`
	OpenAICompatible *OpenAICompatibleProviderSettingsView `json:"openai_compatible,omitempty"`
	CreatedAt        time.Time                             `json:"created_at"`
	UpdatedAt        time.Time                             `json:"updated_at"`
}

type ProviderCatalog struct {
	Providers        []ProviderView `json:"providers"`
	ActiveProviderID string         `json:"active_provider_id"`
	SupportedKinds   []ProviderKind `json:"supported_kinds"`
}

type CreateProviderInput struct {
	Kind             ProviderKind
	DisplayName      string
	Enabled          *bool
	Codex            *CreateCodexProviderInput
	Claude           *CreateClaudeProviderInput
	OpenAICompatible *CreateOpenAICompatibleProviderInput
}

type UpdateProviderInput struct {
	DisplayName      *string
	Enabled          *bool
	Codex            *UpdateCodexProviderInput
	Claude           *UpdateClaudeProviderInput
	OpenAICompatible *UpdateOpenAICompatibleProviderInput
}

type CreateCodexProviderInput struct {
	Command    string
	Model      string
	ChatModels []string
}

type UpdateCodexProviderInput struct {
	Command    *string
	Model      *string
	ChatModels *[]string
}

type CreateClaudeProviderInput struct {
	Command    string
	Model      string
	ChatModels []string
}

type UpdateClaudeProviderInput struct {
	Command    *string
	Model      *string
	ChatModels *[]string
}

type CreateOpenAICompatibleProviderInput struct {
	BaseURL    string
	Model      string
	ChatModels []string
}

type UpdateOpenAICompatibleProviderInput struct {
	BaseURL    *string
	Model      *string
	ChatModels *[]string
}

func SupportedProviderKinds() []ProviderKind {
	return []ProviderKind{ProviderKindCodex, ProviderKindClaude, ProviderKindOpenAICompatible}
}

func (p ProviderRecord) GetID() string {
	return p.ID
}
