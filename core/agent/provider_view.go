package agent

import (
	"os/exec"
	"strings"
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
	if record.Codex != nil {
		view.Codex = codexProviderSettingsViewFromSettings(record.Codex)
	}
	if record.Claude != nil {
		view.Claude = claudeProviderSettingsViewFromSettings(record.Claude)
	}
	return view
}

func cloneProviderRecord(record ProviderRecord) ProviderRecord {
	cloned := record
	if record.Codex != nil {
		cloned.Codex = &CodexProviderSettings{
			Command:    record.Codex.Command,
			Model:      record.Codex.Model,
			ChatModels: append([]string(nil), record.Codex.ChatModels...),
		}
	}
	if record.Claude != nil {
		cloned.Claude = &ClaudeProviderSettings{
			Command:    record.Claude.Command,
			Model:      record.Claude.Model,
			ChatModels: append([]string(nil), record.Claude.ChatModels...),
		}
	}
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
		Command:    firstNonEmpty(settings.Command, defaultCodexCommand),
		Model:      settings.Model,
		ChatModels: append([]string(nil), settings.ChatModels...),
	}
	populateCLIStatus(view.Command, "Codex CLI", &view.StatusState, &view.StatusMessage, &view.ResolvedBinary)
	return view
}

func claudeProviderSettingsViewFromSettings(settings *ClaudeProviderSettings) *ClaudeProviderSettingsView {
	if settings == nil {
		return nil
	}
	view := &ClaudeProviderSettingsView{
		Command:    firstNonEmpty(settings.Command, defaultClaudeCommand),
		Model:      settings.Model,
		ChatModels: append([]string(nil), settings.ChatModels...),
	}
	populateCLIStatus(view.Command, "Claude Code CLI", &view.StatusState, &view.StatusMessage, &view.ResolvedBinary)
	return view
}

func populateCLIStatus(command string, label string, state *string, message *string, resolved *string) {
	path, err := exec.LookPath(strings.TrimSpace(command))
	if err != nil {
		*state = "missing"
		*message = label + " command is not available on PATH."
		return
	}
	*state = "ready"
	*message = label + " command is available."
	*resolved = path
}
