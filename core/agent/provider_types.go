package agent

import (
	"time"

	"github.com/Mesteriis/rune-terminal/core/aiproxy"
)

type ProviderKind string

const (
	ProviderKindOllama ProviderKind = "ollama"
	ProviderKindOpenAI ProviderKind = "openai"
	ProviderKindProxy  ProviderKind = "proxy"
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

type ProxyProviderSettings struct {
	Model    string            `json:"model"`
	Channels []aiproxy.Channel `json:"channels"`
}

type ProviderRecord struct {
	ID          string                  `json:"id"`
	Kind        ProviderKind            `json:"kind"`
	DisplayName string                  `json:"display_name"`
	Enabled     bool                    `json:"enabled"`
	Ollama      *OllamaProviderSettings `json:"ollama,omitempty"`
	OpenAI      *OpenAIProviderSettings `json:"openai,omitempty"`
	Proxy       *ProxyProviderSettings  `json:"proxy,omitempty"`
	CreatedAt   time.Time               `json:"created_at"`
	UpdatedAt   time.Time               `json:"updated_at"`
}

type OpenAIProviderSettingsView struct {
	BaseURL   string `json:"base_url"`
	Model     string `json:"model"`
	HasAPIKey bool   `json:"has_api_key"`
}

type ProxyChannelSettingsView struct {
	ID                 string                `json:"id"`
	Name               string                `json:"name"`
	ServiceType        aiproxy.ServiceType   `json:"service_type"`
	BaseURL            string                `json:"base_url,omitempty"`
	BaseURLs           []string              `json:"base_urls,omitempty"`
	AuthType           aiproxy.AuthType      `json:"auth_type,omitempty"`
	Priority           int                   `json:"priority,omitempty"`
	Status             aiproxy.ChannelStatus `json:"status,omitempty"`
	ModelMapping       map[string]string     `json:"model_mapping,omitempty"`
	Description        string                `json:"description,omitempty"`
	InsecureSkipVerify bool                  `json:"insecure_skip_verify,omitempty"`
	KeyCount           int                   `json:"key_count"`
	EnabledKeyCount    int                   `json:"enabled_key_count"`
}

type ProxyProviderSettingsView struct {
	Model    string                     `json:"model"`
	Channels []ProxyChannelSettingsView `json:"channels"`
}

type ProviderView struct {
	ID          string                      `json:"id"`
	Kind        ProviderKind                `json:"kind"`
	DisplayName string                      `json:"display_name"`
	Enabled     bool                        `json:"enabled"`
	Active      bool                        `json:"active"`
	Ollama      *OllamaProviderSettings     `json:"ollama,omitempty"`
	OpenAI      *OpenAIProviderSettingsView `json:"openai,omitempty"`
	Proxy       *ProxyProviderSettingsView  `json:"proxy,omitempty"`
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
	Proxy       *CreateProxyProviderInput
}

type UpdateProviderInput struct {
	DisplayName *string
	Enabled     *bool
	Ollama      *UpdateOllamaProviderInput
	OpenAI      *UpdateOpenAIProviderInput
	Proxy       *UpdateProxyProviderInput
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

type CreateProxyProviderInput struct {
	Model    string
	Channels []aiproxy.Channel
}

type UpdateOpenAIProviderInput struct {
	BaseURL     *string
	Model       *string
	APIKey      *string
	ClearAPIKey bool
}

type UpdateProxyProviderInput struct {
	Model           *string
	Channels        *[]aiproxy.Channel
	ReplaceChannels bool
}

func SupportedProviderKinds() []ProviderKind {
	return []ProviderKind{ProviderKindOllama, ProviderKindOpenAI, ProviderKindProxy}
}

func (p ProviderRecord) GetID() string {
	return p.ID
}
