package agent

import (
	"strings"

	"github.com/Mesteriis/rune-terminal/core/codexauth"
)

func providerCatalogFromState(state State) ProviderCatalog {
	views := make([]ProviderView, 0, len(state.Providers))
	for _, provider := range state.Providers {
		views = append(views, providerViewFromRecord(provider, state.ActiveProviderID))
	}
	return ProviderCatalog{
		Providers:        views,
		ActiveProviderID: state.ActiveProviderID,
		SupportedKinds:   SupportedProviderKinds(),
	}
}

func providerViewFromRecord(record ProviderRecord, activeProviderID string) ProviderView {
	view := ProviderView{
		ID:          record.ID,
		Kind:        record.Kind,
		DisplayName: record.DisplayName,
		Enabled:     record.Enabled,
		Active:      record.ID == activeProviderID,
		CreatedAt:   record.CreatedAt,
		UpdatedAt:   record.UpdatedAt,
	}
	if record.Ollama != nil {
		view.Ollama = &OllamaProviderSettings{
			BaseURL:    record.Ollama.BaseURL,
			Model:      record.Ollama.Model,
			ChatModels: append([]string(nil), record.Ollama.ChatModels...),
		}
	}
	if record.Codex != nil {
		view.Codex = codexProviderSettingsViewFromSettings(record.Codex)
	}
	if record.OpenAI != nil {
		view.OpenAI = &OpenAIProviderSettingsView{
			BaseURL:    record.OpenAI.BaseURL,
			Model:      record.OpenAI.Model,
			ChatModels: append([]string(nil), record.OpenAI.ChatModels...),
			HasAPIKey:  strings.TrimSpace(record.OpenAI.APIKeySecret) != "",
		}
	}
	if record.Proxy != nil {
		view.Proxy = proxyProviderSettingsViewFromSettings(record.Proxy)
	}
	return view
}

func cloneProviderRecord(record ProviderRecord) ProviderRecord {
	cloned := record
	if record.Ollama != nil {
		cloned.Ollama = &OllamaProviderSettings{
			BaseURL:    record.Ollama.BaseURL,
			Model:      record.Ollama.Model,
			ChatModels: append([]string(nil), record.Ollama.ChatModels...),
		}
	}
	if record.Codex != nil {
		cloned.Codex = &CodexProviderSettings{
			Model:        record.Codex.Model,
			ChatModels:   append([]string(nil), record.Codex.ChatModels...),
			AuthFilePath: record.Codex.AuthFilePath,
		}
	}
	if record.OpenAI != nil {
		cloned.OpenAI = &OpenAIProviderSettings{
			BaseURL:      record.OpenAI.BaseURL,
			Model:        record.OpenAI.Model,
			ChatModels:   append([]string(nil), record.OpenAI.ChatModels...),
			APIKeySecret: record.OpenAI.APIKeySecret,
		}
	}
	cloned.Proxy = cloneProxyProviderSettings(record.Proxy)
	return cloned
}

func cloneProviderRecords(records []ProviderRecord) []ProviderRecord {
	if len(records) == 0 {
		return nil
	}
	cloned := make([]ProviderRecord, 0, len(records))
	for _, record := range records {
		cloned = append(cloned, cloneProviderRecord(record))
	}
	return cloned
}

func codexProviderSettingsViewFromSettings(settings *CodexProviderSettings) *CodexProviderSettingsView {
	if settings == nil {
		return nil
	}
	view := &CodexProviderSettingsView{
		Model:        settings.Model,
		ChatModels:   append([]string(nil), settings.ChatModels...),
		AuthFilePath: codexauth.ResolveAuthFilePath(settings.AuthFilePath),
		AuthState:    codexauth.StatusMissing,
	}
	state, err := codexauth.LoadState(settings.AuthFilePath)
	if err != nil {
		view.StatusMessage = state.StatusMessage
		view.AuthMode = state.AuthMode
		view.LastRefresh = state.LastRefresh
		view.AccountID = state.AccountID
		if state.Status != "" {
			view.AuthState = state.Status
		}
		return view
	}
	view.AuthMode = state.AuthMode
	view.AuthState = state.Status
	view.StatusMessage = state.StatusMessage
	view.LastRefresh = state.LastRefresh
	view.AccountID = state.AccountID
	return view
}
