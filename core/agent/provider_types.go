package agent

import "time"

type ProviderKind string

const (
	ProviderKindCodex            ProviderKind = "codex"
	ProviderKindClaude           ProviderKind = "claude"
	ProviderKindOpenAICompatible ProviderKind = "openai-compatible"
)

type ProviderPrewarmPolicy string

const (
	ProviderPrewarmPolicyManual     ProviderPrewarmPolicy = "manual"
	ProviderPrewarmPolicyOnActivate ProviderPrewarmPolicy = "on_activate"
	ProviderPrewarmPolicyOnStartup  ProviderPrewarmPolicy = "on_startup"
)

type ProviderActor struct {
	Username string `json:"username"`
	HomeDir  string `json:"home_dir,omitempty"`
}

type ProviderAccessPolicy struct {
	OwnerUsername string   `json:"owner_username"`
	Visibility    string   `json:"visibility,omitempty"`
	AllowedUsers  []string `json:"allowed_users,omitempty"`
}

type ProviderRoutePolicy struct {
	PrewarmPolicy  ProviderPrewarmPolicy `json:"prewarm_policy,omitempty"`
	WarmTTLSeconds int                   `json:"warm_ttl_seconds,omitempty"`
}

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
	Access           ProviderAccessPolicy              `json:"access,omitempty"`
	CreatedBy        ProviderActor                     `json:"created_by"`
	UpdatedBy        ProviderActor                     `json:"updated_by"`
	RoutePolicy      ProviderRoutePolicy               `json:"route_policy,omitempty"`
	Codex            *CodexProviderSettings            `json:"codex,omitempty"`
	Claude           *ClaudeProviderSettings           `json:"claude,omitempty"`
	OpenAICompatible *OpenAICompatibleProviderSettings `json:"openai_compatible,omitempty"`
	CreatedAt        time.Time                         `json:"created_at"`
	UpdatedAt        time.Time                         `json:"updated_at"`
}

type CodexProviderSettingsView struct {
	Command    string   `json:"command,omitempty"`
	Model      string   `json:"model"`
	ChatModels []string `json:"chat_models,omitempty"`
}

type ClaudeProviderSettingsView struct {
	Command    string   `json:"command,omitempty"`
	Model      string   `json:"model"`
	ChatModels []string `json:"chat_models,omitempty"`
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
	Access           ProviderAccessPolicy                  `json:"access,omitempty"`
	CreatedBy        ProviderActor                         `json:"created_by"`
	UpdatedBy        ProviderActor                         `json:"updated_by"`
	RoutePolicy      ProviderRoutePolicy                   `json:"route_policy,omitempty"`
	Codex            *CodexProviderSettingsView            `json:"codex,omitempty"`
	Claude           *ClaudeProviderSettingsView           `json:"claude,omitempty"`
	OpenAICompatible *OpenAICompatibleProviderSettingsView `json:"openai_compatible,omitempty"`
	CreatedAt        time.Time                             `json:"created_at"`
	UpdatedAt        time.Time                             `json:"updated_at"`
}

type ProviderCatalog struct {
	CurrentActor     ProviderActor   `json:"current_actor"`
	Providers        []ProviderView `json:"providers"`
	ActiveProviderID string         `json:"active_provider_id"`
	SupportedKinds   []ProviderKind `json:"supported_kinds"`
}

type CreateProviderInput struct {
	Kind             ProviderKind
	DisplayName      string
	Enabled          *bool
	Access           ProviderAccessPolicy
	RoutePolicy      *ProviderRoutePolicy
	Codex            *CreateCodexProviderInput
	Claude           *CreateClaudeProviderInput
	OpenAICompatible *CreateOpenAICompatibleProviderInput
}

type UpdateProviderInput struct {
	DisplayName      *string
	Enabled          *bool
	Access           *ProviderAccessPolicy
	RoutePolicy      *ProviderRoutePolicy
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
