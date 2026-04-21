package agent

import "strings"

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
			BaseURL: record.Ollama.BaseURL,
			Model:   record.Ollama.Model,
		}
	}
	if record.OpenAI != nil {
		view.OpenAI = &OpenAIProviderSettingsView{
			BaseURL:   record.OpenAI.BaseURL,
			Model:     record.OpenAI.Model,
			HasAPIKey: strings.TrimSpace(record.OpenAI.APIKeySecret) != "",
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
			BaseURL: record.Ollama.BaseURL,
			Model:   record.Ollama.Model,
		}
	}
	if record.OpenAI != nil {
		cloned.OpenAI = &OpenAIProviderSettings{
			BaseURL:      record.OpenAI.BaseURL,
			Model:        record.OpenAI.Model,
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
