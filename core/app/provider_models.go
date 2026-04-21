package app

import (
	"context"
	"fmt"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/agent"
	"github.com/Mesteriis/rune-terminal/core/conversation"
)

type DiscoverProviderModelsInput struct {
	ProviderID string
	Kind       agent.ProviderKind
	Codex      *agent.CodexProviderSettings
	OpenAI     *agent.OpenAIProviderSettings
}

type ProviderModelsCatalog struct {
	Models []string `json:"models"`
}

func (r *Runtime) DiscoverProviderModels(
	ctx context.Context,
	input DiscoverProviderModelsInput,
) (ProviderModelsCatalog, error) {
	record, err := r.resolveProviderModelDiscoveryInput(input)
	if err != nil {
		return ProviderModelsCatalog{}, err
	}

	switch record.Kind {
	case agent.ProviderKindCodex:
		models, err := conversation.ListCodexModels(ctx, conversation.CodexProviderConfig{
			Model:        record.Codex.Model,
			AuthFilePath: record.Codex.AuthFilePath,
		})
		if err != nil {
			return ProviderModelsCatalog{}, err
		}
		return ProviderModelsCatalog{Models: models}, nil
	case agent.ProviderKindOpenAI:
		models, err := conversation.ListOpenAIModels(ctx, conversation.OpenAIProviderConfig{
			BaseURL: record.OpenAI.BaseURL,
			Model:   record.OpenAI.Model,
			APIKey:  record.OpenAI.APIKeySecret,
		})
		if err != nil {
			return ProviderModelsCatalog{}, err
		}
		return ProviderModelsCatalog{Models: models}, nil
	default:
		return ProviderModelsCatalog{}, fmt.Errorf(
			"%w: model discovery is available only for codex and openai-compatible providers",
			agent.ErrProviderKindUnsupported,
		)
	}
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
			Model:        strings.TrimSpace(input.Codex.Model),
			AuthFilePath: strings.TrimSpace(input.Codex.AuthFilePath),
		}
	case agent.ProviderKindOpenAI:
		if input.OpenAI == nil {
			return agent.ProviderRecord{}, fmt.Errorf("%w: openai config is required", agent.ErrProviderInvalidConfig)
		}
		record.OpenAI = &agent.OpenAIProviderSettings{
			BaseURL:      strings.TrimSpace(input.OpenAI.BaseURL),
			Model:        strings.TrimSpace(input.OpenAI.Model),
			APIKeySecret: strings.TrimSpace(input.OpenAI.APIKeySecret),
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
		if input.OpenAI != nil {
			return agent.ProviderRecord{}, fmt.Errorf("%w: codex discovery payload cannot include openai config", agent.ErrProviderInvalidConfig)
		}
		if input.Codex != nil {
			if authFilePath := strings.TrimSpace(input.Codex.AuthFilePath); authFilePath != "" {
				record.Codex.AuthFilePath = authFilePath
			}
			if model := strings.TrimSpace(input.Codex.Model); model != "" {
				record.Codex.Model = model
			}
		}
	case agent.ProviderKindOpenAI:
		if input.Codex != nil {
			return agent.ProviderRecord{}, fmt.Errorf("%w: openai discovery payload cannot include codex config", agent.ErrProviderInvalidConfig)
		}
		if input.OpenAI != nil {
			if baseURL := strings.TrimSpace(input.OpenAI.BaseURL); baseURL != "" {
				record.OpenAI.BaseURL = baseURL
			}
			if model := strings.TrimSpace(input.OpenAI.Model); model != "" {
				record.OpenAI.Model = model
			}
			if apiKey := strings.TrimSpace(input.OpenAI.APIKeySecret); apiKey != "" {
				record.OpenAI.APIKeySecret = apiKey
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
		if strings.TrimSpace(record.Codex.Model) == "" {
			record.Codex.Model = "gpt-5-codex"
		}
	case agent.ProviderKindOpenAI:
		if record.OpenAI == nil {
			return agent.ProviderRecord{}, fmt.Errorf("%w: openai config is required", agent.ErrProviderInvalidConfig)
		}
		if strings.TrimSpace(record.OpenAI.BaseURL) == "" {
			record.OpenAI.BaseURL = "https://api.openai.com/v1"
		}
		if strings.TrimSpace(record.OpenAI.Model) == "" {
			record.OpenAI.Model = "gpt-4o-mini"
		}
		if strings.TrimSpace(record.OpenAI.APIKeySecret) == "" {
			return agent.ProviderRecord{}, fmt.Errorf("%w: openai api_key is required", agent.ErrProviderInvalidConfig)
		}
	default:
		return agent.ProviderRecord{}, fmt.Errorf("%w: %s", agent.ErrProviderKindUnsupported, record.Kind)
	}

	return record, nil
}
