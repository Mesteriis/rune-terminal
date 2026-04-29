package app

import (
	"context"
	"fmt"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/agent"
	"github.com/Mesteriis/rune-terminal/core/conversation"
)

type DiscoverProviderModelsInput struct {
	ProviderID       string
	Kind             agent.ProviderKind
	Codex            *agent.CodexProviderSettings
	Claude           *agent.ClaudeProviderSettings
	OpenAICompatible *agent.OpenAICompatibleProviderSettings
}

type ProviderModelsCatalog struct {
	Models []string `json:"models"`
}

func (r *Runtime) DiscoverProviderModels(
	ctx context.Context,
	input DiscoverProviderModelsInput,
) (catalog ProviderModelsCatalog, err error) {
	auditProviderID := strings.TrimSpace(input.ProviderID)
	auditProviderKind := strings.TrimSpace(string(input.Kind))
	modelCount := -1
	defer func() {
		r.AppendProviderAudit(ProviderAuditInput{
			ToolName:     "providers.discover_models",
			Action:       "discover_models",
			ProviderID:   auditProviderID,
			ProviderKind: auditProviderKind,
			Summary:      providerModelDiscoveryAuditSummary(auditProviderID, auditProviderKind, modelCount),
			ActionSource: "http.providers",
			Success:      err == nil,
			Error:        err,
		})
	}()

	record, err := r.resolveProviderModelDiscoveryInput(input)
	if err != nil {
		return ProviderModelsCatalog{}, err
	}
	auditProviderID = strings.TrimSpace(record.ID)
	auditProviderKind = strings.TrimSpace(string(record.Kind))

	switch record.Kind {
	case agent.ProviderKindCodex:
		models := conversation.ListCodexCLIModels(record.Codex.Model, record.Codex.ChatModels)
		catalog = ProviderModelsCatalog{Models: models}
	case agent.ProviderKindClaude:
		models := conversation.ListClaudeCodeModels(record.Claude.Model, record.Claude.ChatModels)
		catalog = ProviderModelsCatalog{Models: models}
	case agent.ProviderKindOpenAICompatible:
		models, err := conversation.DiscoverOpenAICompatibleModels(ctx, record.OpenAICompatible.BaseURL)
		if err != nil {
			return ProviderModelsCatalog{}, err
		}
		catalog = ProviderModelsCatalog{
			Models: compactModelIDs(append([]string{record.OpenAICompatible.Model}, models...)),
		}
	default:
		return ProviderModelsCatalog{}, fmt.Errorf(
			"%w: model discovery is unavailable for provider kind %s",
			agent.ErrProviderKindUnsupported,
			record.Kind,
		)
	}
	modelCount = len(catalog.Models)
	return catalog, nil
}

func providerModelDiscoveryAuditSummary(providerID string, providerKind string, modelCount int) string {
	parts := []string{"action=discover_models"}
	if providerID := strings.TrimSpace(providerID); providerID != "" {
		parts = append(parts, "provider_id="+providerID)
	}
	if providerKind := strings.TrimSpace(providerKind); providerKind != "" {
		parts = append(parts, "provider_kind="+providerKind)
	}
	if modelCount >= 0 {
		parts = append(parts, fmt.Sprintf("model_count=%d", modelCount))
	}
	return strings.Join(parts, " ")
}

func (r *Runtime) resolveProviderModelDiscoveryInput(input DiscoverProviderModelsInput) (agent.ProviderRecord, error) {
	if providerID := strings.TrimSpace(input.ProviderID); providerID != "" {
		record, err := r.Agent.Provider(providerID)
		if err != nil {
			return agent.ProviderRecord{}, err
		}
		return applyProviderModelDiscoveryOverrides(record, input)
	}

	record := agent.ProviderRecord{Kind: input.Kind}
	switch input.Kind {
	case agent.ProviderKindCodex:
		if input.Codex == nil {
			return agent.ProviderRecord{}, fmt.Errorf("%w: codex config is required", agent.ErrProviderInvalidConfig)
		}
		record.Codex = &agent.CodexProviderSettings{
			Command: strings.TrimSpace(input.Codex.Command),
			Model:   strings.TrimSpace(input.Codex.Model),
		}
	case agent.ProviderKindClaude:
		if input.Claude == nil {
			return agent.ProviderRecord{}, fmt.Errorf("%w: claude config is required", agent.ErrProviderInvalidConfig)
		}
		record.Claude = &agent.ClaudeProviderSettings{
			Command: strings.TrimSpace(input.Claude.Command),
			Model:   strings.TrimSpace(input.Claude.Model),
		}
	case agent.ProviderKindOpenAICompatible:
		if input.OpenAICompatible == nil {
			return agent.ProviderRecord{}, fmt.Errorf("%w: openai-compatible config is required", agent.ErrProviderInvalidConfig)
		}
		record.OpenAICompatible = &agent.OpenAICompatibleProviderSettings{
			BaseURL: strings.TrimSpace(input.OpenAICompatible.BaseURL),
			Model:   strings.TrimSpace(input.OpenAICompatible.Model),
		}
	default:
		return agent.ProviderRecord{}, fmt.Errorf("%w: %s", agent.ErrProviderKindUnsupported, input.Kind)
	}

	return applyProviderModelDiscoveryDefaults(record)
}

func applyProviderModelDiscoveryOverrides(
	record agent.ProviderRecord,
	input DiscoverProviderModelsInput,
) (agent.ProviderRecord, error) {
	if input.Kind != "" && input.Kind != record.Kind {
		return agent.ProviderRecord{}, fmt.Errorf(
			"%w: requested kind %s does not match stored provider kind %s",
			agent.ErrProviderInvalidConfig,
			input.Kind,
			record.Kind,
		)
	}

	switch record.Kind {
	case agent.ProviderKindCodex:
		if input.Claude != nil || input.OpenAICompatible != nil {
			return agent.ProviderRecord{}, fmt.Errorf("%w: codex discovery payload cannot include other provider config", agent.ErrProviderInvalidConfig)
		}
		if input.Codex != nil {
			if command := strings.TrimSpace(input.Codex.Command); command != "" {
				record.Codex.Command = command
			}
			if model := strings.TrimSpace(input.Codex.Model); model != "" {
				record.Codex.Model = model
			}
		}
	case agent.ProviderKindClaude:
		if input.Codex != nil || input.OpenAICompatible != nil {
			return agent.ProviderRecord{}, fmt.Errorf("%w: claude discovery payload cannot include other provider config", agent.ErrProviderInvalidConfig)
		}
		if input.Claude != nil {
			if command := strings.TrimSpace(input.Claude.Command); command != "" {
				record.Claude.Command = command
			}
			if model := strings.TrimSpace(input.Claude.Model); model != "" {
				record.Claude.Model = model
			}
		}
	case agent.ProviderKindOpenAICompatible:
		if input.Codex != nil || input.Claude != nil {
			return agent.ProviderRecord{}, fmt.Errorf(
				"%w: openai-compatible discovery payload cannot include other provider config",
				agent.ErrProviderInvalidConfig,
			)
		}
		if input.OpenAICompatible != nil {
			if baseURL := strings.TrimSpace(input.OpenAICompatible.BaseURL); baseURL != "" {
				record.OpenAICompatible.BaseURL = baseURL
			}
			if model := strings.TrimSpace(input.OpenAICompatible.Model); model != "" {
				record.OpenAICompatible.Model = model
			}
		}
	default:
		return agent.ProviderRecord{}, fmt.Errorf("%w: %s", agent.ErrProviderKindUnsupported, record.Kind)
	}

	return applyProviderModelDiscoveryDefaults(record)
}

func applyProviderModelDiscoveryDefaults(record agent.ProviderRecord) (agent.ProviderRecord, error) {
	switch record.Kind {
	case agent.ProviderKindCodex:
		if record.Codex == nil {
			return agent.ProviderRecord{}, fmt.Errorf("%w: codex config is required", agent.ErrProviderInvalidConfig)
		}
		if strings.TrimSpace(record.Codex.Command) == "" {
			record.Codex.Command = "codex"
		}
		if strings.TrimSpace(record.Codex.Model) == "" {
			record.Codex.Model = "gpt-5.4"
		}
		record.Codex.ChatModels = conversation.ListCodexCLIModels(record.Codex.Model, record.Codex.ChatModels)
	case agent.ProviderKindClaude:
		if record.Claude == nil {
			return agent.ProviderRecord{}, fmt.Errorf("%w: claude config is required", agent.ErrProviderInvalidConfig)
		}
		if strings.TrimSpace(record.Claude.Command) == "" {
			record.Claude.Command = "claude"
		}
		if strings.TrimSpace(record.Claude.Model) == "" {
			record.Claude.Model = "sonnet"
		}
		record.Claude.ChatModels = conversation.ListClaudeCodeModels(record.Claude.Model, record.Claude.ChatModels)
	case agent.ProviderKindOpenAICompatible:
		if record.OpenAICompatible == nil {
			return agent.ProviderRecord{}, fmt.Errorf("%w: openai-compatible config is required", agent.ErrProviderInvalidConfig)
		}
		record.OpenAICompatible.BaseURL = normalizeProviderDiscoveryBaseURL(record.OpenAICompatible.BaseURL)
		if strings.TrimSpace(record.OpenAICompatible.BaseURL) == "" {
			return agent.ProviderRecord{}, fmt.Errorf("%w: openai-compatible base_url is required", agent.ErrProviderInvalidConfig)
		}
		record.OpenAICompatible.ChatModels = normalizeProviderDiscoveryChatModels(
			record.OpenAICompatible.Model,
			record.OpenAICompatible.ChatModels,
		)
	default:
		return agent.ProviderRecord{}, fmt.Errorf("%w: %s", agent.ErrProviderKindUnsupported, record.Kind)
	}

	return record, nil
}

func normalizeProviderDiscoveryBaseURL(raw string) string {
	baseURL := strings.TrimSpace(raw)
	if baseURL == "" {
		return ""
	}
	return strings.TrimRight(baseURL, "/")
}

func normalizeProviderDiscoveryChatModels(defaultModel string, rawModels []string) []string {
	models := make([]string, 0, len(rawModels)+1)
	seen := make(map[string]struct{}, len(rawModels)+1)

	appendModel := func(raw string) {
		model := strings.TrimSpace(raw)
		if model == "" {
			return
		}
		if _, ok := seen[model]; ok {
			return
		}
		seen[model] = struct{}{}
		models = append(models, model)
	}

	appendModel(defaultModel)
	for _, rawModel := range rawModels {
		appendModel(rawModel)
	}

	if len(models) == 0 {
		return nil
	}
	return models
}

func compactModelIDs(models []string) []string {
	compact := make([]string, 0, len(models))
	seen := make(map[string]struct{}, len(models))

	for _, rawModel := range models {
		model := strings.TrimSpace(rawModel)
		if model == "" {
			continue
		}
		if _, ok := seen[model]; ok {
			continue
		}
		seen[model] = struct{}{}
		compact = append(compact, model)
	}
	return compact
}
