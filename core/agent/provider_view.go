package agent

import (
	"context"
	"encoding/json"
	"os/exec"
	"strings"
	"time"
)

const providerStatusCommandTimeout = 2 * time.Second

var resolveProviderCLICommand = exec.LookPath
var inspectCodexCLIAuthStatus = defaultInspectCodexCLIAuthStatus
var inspectClaudeCLIAuthStatus = defaultInspectClaudeCLIAuthStatus

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
	if record.OpenAICompatible != nil {
		view.OpenAICompatible = openAICompatibleProviderSettingsViewFromSettings(record.OpenAICompatible)
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
	if record.OpenAICompatible != nil {
		cloned.OpenAICompatible = &OpenAICompatibleProviderSettings{
			BaseURL:    record.OpenAICompatible.BaseURL,
			Model:      record.OpenAICompatible.Model,
			ChatModels: append([]string(nil), record.OpenAICompatible.ChatModels...),
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
	return &CodexProviderSettingsView{
		Command:    firstNonEmpty(settings.Command, defaultCodexCommand),
		Model:      settings.Model,
		ChatModels: append([]string(nil), settings.ChatModels...),
	}
}

func claudeProviderSettingsViewFromSettings(settings *ClaudeProviderSettings) *ClaudeProviderSettingsView {
	if settings == nil {
		return nil
	}
	return &ClaudeProviderSettingsView{
		Command:    firstNonEmpty(settings.Command, defaultClaudeCommand),
		Model:      settings.Model,
		ChatModels: append([]string(nil), settings.ChatModels...),
	}
}

func openAICompatibleProviderSettingsViewFromSettings(
	settings *OpenAICompatibleProviderSettings,
) *OpenAICompatibleProviderSettingsView {
	if settings == nil {
		return nil
	}
	return &OpenAICompatibleProviderSettingsView{
		BaseURL:    settings.BaseURL,
		Model:      settings.Model,
		ChatModels: append([]string(nil), settings.ChatModels...),
	}
}

func populateCLIStatus(
	command string,
	label string,
	inspectAuth func(string) (string, string, bool),
	state *string,
	message *string,
	resolved *string,
) {
	path, err := resolveProviderCLICommand(strings.TrimSpace(command))
	if err != nil {
		*state = "missing"
		*message = label + " command is not available on PATH."
		return
	}
	*resolved = path
	*state = "ready"
	*message = label + " command is available."

	if inspectAuth == nil {
		return
	}

	nextState, nextMessage, ok := inspectAuth(path)
	if !ok {
		return
	}

	*state = nextState
	*message = nextMessage
}

func defaultInspectCodexCLIAuthStatus(commandPath string) (string, string, bool) {
	output, _ := runProviderStatusCommand(commandPath, "login", "status")
	trimmedOutput := strings.TrimSpace(output)

	switch {
	case strings.Contains(strings.ToLower(trimmedOutput), "logged in"):
		return "ready", "Codex CLI is authenticated.", true
	case strings.Contains(strings.ToLower(trimmedOutput), "not logged in"):
		return "auth-required", "Codex CLI is installed but not logged in.", true
	default:
		return "", "", false
	}
}

func defaultInspectClaudeCLIAuthStatus(commandPath string) (string, string, bool) {
	output, _ := runProviderStatusCommand(commandPath, "auth", "status", "--json")
	trimmedOutput := strings.TrimSpace(output)
	if trimmedOutput == "" {
		return "", "", false
	}

	var payload struct {
		LoggedIn bool `json:"loggedIn"`
	}
	if err := json.Unmarshal([]byte(trimmedOutput), &payload); err != nil {
		if strings.Contains(strings.ToLower(trimmedOutput), "not logged in") {
			return "auth-required", "Claude Code CLI is installed but not logged in.", true
		}
		return "", "", false
	}

	if payload.LoggedIn {
		return "ready", "Claude Code CLI is authenticated.", true
	}

	return "auth-required", "Claude Code CLI is installed but not logged in.", true
}

func runProviderStatusCommand(commandPath string, args ...string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), providerStatusCommandTimeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, commandPath, args...)
	output, err := cmd.CombinedOutput()
	return string(output), err
}
