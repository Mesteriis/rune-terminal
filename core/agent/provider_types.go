package agent

import "time"

type ProviderKind string

const (
	ProviderKindOllama ProviderKind = "ollama"
	ProviderKindOpenAI ProviderKind = "openai"
)

type OllamaProviderSettings struct {
	BaseURL string `json:"base_url"`
	Model   string `json:"model,omitempty"`
}

// OpenAIProviderSettings stores the secret locally in backend-owned state for
// v1. The secret is never exposed through ProviderView.
type OpenAIProviderSettings struct {
	BaseURL      string `json:"base_url"`
	Model        string `json:"model"`
	APIKeySecret string `json:"api_key_secret,omitempty"`
}

type ProviderRecord struct {
	ID          string                  `json:"id"`
	Kind        ProviderKind            `json:"kind"`
	DisplayName string                  `json:"display_name"`
	Enabled     bool                    `json:"enabled"`
	Ollama      *OllamaProviderSettings `json:"ollama,omitempty"`
	OpenAI      *OpenAIProviderSettings `json:"openai,omitempty"`
	CreatedAt   time.Time               `json:"created_at"`
	UpdatedAt   time.Time               `json:"updated_at"`
}

type OpenAIProviderSettingsView struct {
	BaseURL   string `json:"base_url"`
	Model     string `json:"model"`
	HasAPIKey bool   `json:"has_api_key"`
}

type ProviderView struct {
	ID          string                      `json:"id"`
	Kind        ProviderKind                `json:"kind"`
	DisplayName string                      `json:"display_name"`
	Enabled     bool                        `json:"enabled"`
	Active      bool                        `json:"active"`
	Ollama      *OllamaProviderSettings     `json:"ollama,omitempty"`
	OpenAI      *OpenAIProviderSettingsView `json:"openai,omitempty"`
	CreatedAt   time.Time                   `json:"created_at"`
	UpdatedAt   time.Time                   `json:"updated_at"`
}

type ProviderCatalog struct {
	Providers        []ProviderView `json:"providers"`
	ActiveProviderID string         `json:"active_provider_id"`
	SupportedKinds   []ProviderKind `json:"supported_kinds"`
}

type CreateProviderInput struct {
	Kind        ProviderKind
	DisplayName string
	Enabled     *bool
	Ollama      *CreateOllamaProviderInput
	OpenAI      *CreateOpenAIProviderInput
}

type UpdateProviderInput struct {
	DisplayName *string
	Enabled     *bool
	Ollama      *UpdateOllamaProviderInput
	OpenAI      *UpdateOpenAIProviderInput
}

type CreateOllamaProviderInput struct {
	BaseURL string
	Model   string
}

type UpdateOllamaProviderInput struct {
	BaseURL *string
	Model   *string
}

type CreateOpenAIProviderInput struct {
	BaseURL string
	Model   string
	APIKey  string
}

type UpdateOpenAIProviderInput struct {
	BaseURL     *string
	Model       *string
	APIKey      *string
	ClearAPIKey bool
}

func SupportedProviderKinds() []ProviderKind {
	return []ProviderKind{ProviderKindOllama, ProviderKindOpenAI}
}

func (p ProviderRecord) GetID() string {
	return p.ID
}
