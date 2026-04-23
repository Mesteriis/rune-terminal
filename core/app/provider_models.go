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
	Claude     *agent.ClaudeProviderSettings
}

type ProviderModelsCatalog struct {
	Models []string `json:"models"`
}

func (r *Runtime) DiscoverProviderModels(
	_ context.Context,
	input DiscoverProviderModelsInput,
) (ProviderModelsCatalog, error) {
	record, err := r.resolveProviderModelDiscoveryInput(input)
	if err != nil {
		return ProviderModelsCatalog{}, err
	}

	switch record.Kind {
	case agent.ProviderKindCodex:
		models := conversation.ListCodexCLIModels(record.Codex.Model, record.Codex.ChatModels)
		return ProviderModelsCatalog{Models: models}, nil
	case agent.ProviderKindClaude:
		models := conversation.ListClaudeCodeModels(record.Claude.Model, record.Claude.ChatModels)
		return ProviderModelsCatalog{Models: models}, nil
	default:
		return ProviderModelsCatalog{}, fmt.Errorf(
			"%w: model discovery is available only for codex-cli and claude-code-cli providers",
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
		if input.Claude != nil {
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
		if input.Codex != nil {
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
			record.Codex.Model = "gpt-5-codex"
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
	default:
		return agent.ProviderRecord{}, fmt.Errorf("%w: %s", agent.ErrProviderKindUnsupported, record.Kind)
	}

	return record, nil
}
