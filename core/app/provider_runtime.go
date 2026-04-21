package app

import (
	"fmt"
	"slices"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/agent"
	"github.com/Mesteriis/rune-terminal/core/aiproxy"
	"github.com/Mesteriis/rune-terminal/core/conversation"
)

type ConversationProviderFactory func(agent.ProviderRecord) (conversation.Provider, error)

func defaultConversationProviderFactory(record agent.ProviderRecord) (conversation.Provider, error) {
	switch record.Kind {
	case agent.ProviderKindOllama:
		if record.Ollama == nil {
			return nil, fmt.Errorf("%w: ollama settings are required", agent.ErrProviderInvalidConfig)
		}
		return conversation.NewOllamaProvider(conversation.ProviderConfig{
			BaseURL: record.Ollama.BaseURL,
			Model:   record.Ollama.Model,
		}), nil
	case agent.ProviderKindCodex:
		if record.Codex == nil {
			return nil, fmt.Errorf("%w: codex settings are required", agent.ErrProviderInvalidConfig)
		}
		return conversation.NewCodexProvider(conversation.CodexProviderConfig{
			Model:        record.Codex.Model,
			AuthFilePath: record.Codex.AuthFilePath,
		}), nil
	case agent.ProviderKindOpenAI:
		if record.OpenAI == nil {
			return nil, fmt.Errorf("%w: openai settings are required", agent.ErrProviderInvalidConfig)
		}
		return conversation.NewOpenAIProvider(conversation.OpenAIProviderConfig{
			BaseURL: record.OpenAI.BaseURL,
			Model:   record.OpenAI.Model,
			APIKey:  record.OpenAI.APIKeySecret,
		}), nil
	case agent.ProviderKindProxy:
		if record.Proxy == nil {
			return nil, fmt.Errorf("%w: proxy settings are required", agent.ErrProviderInvalidConfig)
		}
		return aiproxy.NewProvider(aiproxy.Config{
			Model:    record.Proxy.Model,
			Channels: record.Proxy.Channels,
		})
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
	case agent.ProviderKindOllama:
		if record.Ollama != nil {
			return append([]string(nil), record.Ollama.ChatModels...)
		}
	case agent.ProviderKindCodex:
		if record.Codex != nil {
			return append([]string(nil), record.Codex.ChatModels...)
		}
	case agent.ProviderKindOpenAI:
		if record.OpenAI != nil {
			return append([]string(nil), record.OpenAI.ChatModels...)
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
	case agent.ProviderKindOllama:
		if record.Ollama == nil {
			return agent.ProviderRecord{}, "", fmt.Errorf("%w: ollama settings are required", agent.ErrProviderInvalidConfig)
		}
		overridden.Ollama = &agent.OllamaProviderSettings{
			BaseURL:    record.Ollama.BaseURL,
			Model:      model,
			ChatModels: append([]string(nil), record.Ollama.ChatModels...),
		}
	case agent.ProviderKindCodex:
		if record.Codex == nil {
			return agent.ProviderRecord{}, "", fmt.Errorf("%w: codex settings are required", agent.ErrProviderInvalidConfig)
		}
		overridden.Codex = &agent.CodexProviderSettings{
			Model:        model,
			ChatModels:   append([]string(nil), record.Codex.ChatModels...),
			AuthFilePath: record.Codex.AuthFilePath,
		}
	case agent.ProviderKindOpenAI:
		if record.OpenAI == nil {
			return agent.ProviderRecord{}, "", fmt.Errorf("%w: openai settings are required", agent.ErrProviderInvalidConfig)
		}
		overridden.OpenAI = &agent.OpenAIProviderSettings{
			BaseURL:      record.OpenAI.BaseURL,
			Model:        model,
			ChatModels:   append([]string(nil), record.OpenAI.ChatModels...),
			APIKeySecret: record.OpenAI.APIKeySecret,
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
