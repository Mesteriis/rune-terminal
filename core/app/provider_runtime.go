package app

import (
	"fmt"
	"slices"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/agent"
	"github.com/Mesteriis/rune-terminal/core/conversation"
)

type ConversationProviderFactory func(agent.ProviderRecord) (conversation.Provider, error)

func defaultConversationProviderFactory(record agent.ProviderRecord) (conversation.Provider, error) {
	switch record.Kind {
	case agent.ProviderKindCodex:
		if record.Codex == nil {
			return nil, fmt.Errorf("%w: codex settings are required", agent.ErrProviderInvalidConfig)
		}
		return conversation.NewCodexCLIProvider(conversation.CodexCLIProviderConfig{
			Command: record.Codex.Command,
			Model:   record.Codex.Model,
		}), nil
	case agent.ProviderKindClaude:
		if record.Claude == nil {
			return nil, fmt.Errorf("%w: claude settings are required", agent.ErrProviderInvalidConfig)
		}
		return conversation.NewClaudeCodeProvider(conversation.ClaudeCodeProviderConfig{
			Command: record.Claude.Command,
			Model:   record.Claude.Model,
		}), nil
	case agent.ProviderKindOpenAICompatible:
		if record.OpenAICompatible == nil {
			return nil, fmt.Errorf("%w: openai-compatible settings are required", agent.ErrProviderInvalidConfig)
		}
		return conversation.NewOpenAICompatibleProvider(conversation.OpenAICompatibleProviderConfig{
			BaseURL: record.OpenAICompatible.BaseURL,
			Model:   record.OpenAICompatible.Model,
		}), nil
	default:
		return nil, fmt.Errorf("%w: %s", agent.ErrProviderKindUnsupported, record.Kind)
	}
}

func (r *Runtime) activeConversationProviderRecord() (agent.ProviderRecord, error) {
	if r.Agent == nil {
		return agent.ProviderRecord{}, fmt.Errorf("agent store is required for provider resolution")
	}
	record, err := r.Agent.ActiveProvider()
	if err != nil {
		return agent.ProviderRecord{}, err
	}
	return record, nil
}

func (r *Runtime) resolveConversationProvider() (conversation.Provider, error) {
	if r.ConversationProviderFactory == nil {
		return nil, nil
	}
	record, err := r.activeConversationProviderRecord()
	if err != nil {
		return nil, err
	}
	return r.ConversationProviderFactory(record)
}

func providerChatModels(record agent.ProviderRecord) []string {
	switch record.Kind {
	case agent.ProviderKindCodex:
		if record.Codex != nil {
			return append([]string(nil), record.Codex.ChatModels...)
		}
	case agent.ProviderKindClaude:
		if record.Claude != nil {
			return append([]string(nil), record.Claude.ChatModels...)
		}
	case agent.ProviderKindOpenAICompatible:
		if record.OpenAICompatible != nil {
			return append([]string(nil), record.OpenAICompatible.ChatModels...)
		}
	}
	return nil
}

func applyConversationModelOverride(
	record agent.ProviderRecord,
	selectedModel string,
) (agent.ProviderRecord, string, error) {
	model := strings.TrimSpace(selectedModel)
	if model == "" {
		return record, "", nil
	}

	chatModels := providerChatModels(record)
	if len(chatModels) == 0 {
		return agent.ProviderRecord{}, "", fmt.Errorf(
			"%w: active provider %s does not expose selectable chat models",
			ErrConversationModelUnavailable,
			record.Kind,
		)
	}
	if !slices.Contains(chatModels, model) {
		return agent.ProviderRecord{}, "", fmt.Errorf(
			"%w: model %q is not enabled for provider %s",
			ErrConversationModelUnavailable,
			model,
			record.Kind,
		)
	}

	overridden := record
	switch record.Kind {
	case agent.ProviderKindCodex:
		if record.Codex == nil {
			return agent.ProviderRecord{}, "", fmt.Errorf("%w: codex settings are required", agent.ErrProviderInvalidConfig)
		}
		overridden.Codex = &agent.CodexProviderSettings{
			Command:    record.Codex.Command,
			Model:      model,
			ChatModels: append([]string(nil), record.Codex.ChatModels...),
		}
	case agent.ProviderKindClaude:
		if record.Claude == nil {
			return agent.ProviderRecord{}, "", fmt.Errorf("%w: claude settings are required", agent.ErrProviderInvalidConfig)
		}
		overridden.Claude = &agent.ClaudeProviderSettings{
			Command:    record.Claude.Command,
			Model:      model,
			ChatModels: append([]string(nil), record.Claude.ChatModels...),
		}
	case agent.ProviderKindOpenAICompatible:
		if record.OpenAICompatible == nil {
			return agent.ProviderRecord{}, "", fmt.Errorf("%w: openai-compatible settings are required", agent.ErrProviderInvalidConfig)
		}
		overridden.OpenAICompatible = &agent.OpenAICompatibleProviderSettings{
			BaseURL:    record.OpenAICompatible.BaseURL,
			Model:      model,
			ChatModels: append([]string(nil), record.OpenAICompatible.ChatModels...),
		}
	default:
		return agent.ProviderRecord{}, "", fmt.Errorf(
			"%w: provider kind %s does not support direct model selection",
			ErrConversationModelUnavailable,
			record.Kind,
		)
	}

	return overridden, model, nil
}
