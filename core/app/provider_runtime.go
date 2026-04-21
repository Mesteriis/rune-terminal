package app

import (
	"fmt"

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

func (r *Runtime) resolveConversationProvider() (conversation.Provider, error) {
	if r.ConversationProviderFactory == nil {
		return nil, nil
	}
	if r.Agent == nil {
		return nil, fmt.Errorf("agent store is required for provider resolution")
	}
	record, err := r.Agent.ActiveProvider()
	if err != nil {
		return nil, err
	}
	return r.ConversationProviderFactory(record)
}
