package agent

import (
	"context"
	"encoding/json"
	"os/exec"
	"slices"
	"strings"
	"time"
)

const providerStatusCommandTimeout = 2 * time.Second

var resolveProviderCLICommand = exec.LookPath
var inspectCodexCLIAuthStatus = defaultInspectCodexCLIAuthStatus
var inspectClaudeCLIAuthStatus = defaultInspectClaudeCLIAuthStatus

const defaultProviderWarmTTLSeconds = 900

func providerCatalogFromState(state State) ProviderCatalog {
	return providerCatalogFromStateWithActor(state, ProviderActor{})
}

func providerCatalogFromStateWithActor(state State, actor ProviderActor) ProviderCatalog {
	views := make([]ProviderView, 0, len(state.Providers))
	for _, provider := range state.Providers {
		views = append(views, providerViewFromRecord(provider, state.ActiveProviderID))
	}
	return ProviderCatalog{
		CurrentActor:     normalizeProviderActor(actor),
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
		Access:      normalizeProviderAccess(record.Access, record.CreatedBy),
		CreatedBy:   normalizeProviderActor(record.CreatedBy),
		UpdatedBy:   normalizeProviderActor(record.UpdatedBy),
		RoutePolicy: normalizeProviderRoutePolicy(record.RoutePolicy),
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
	cloned.Access = normalizeProviderAccess(record.Access, record.CreatedBy)
	cloned.CreatedBy = normalizeProviderActor(record.CreatedBy)
	cloned.UpdatedBy = normalizeProviderActor(record.UpdatedBy)
	cloned.RoutePolicy = normalizeProviderRoutePolicy(record.RoutePolicy)
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

func normalizeProviderActor(actor ProviderActor) ProviderActor {
	return ProviderActor{
		Username: strings.TrimSpace(actor.Username),
		HomeDir:  strings.TrimSpace(actor.HomeDir),
	}
}

func normalizeProviderAccess(access ProviderAccessPolicy, owner ProviderActor) ProviderAccessPolicy {
	normalizedOwner := strings.TrimSpace(access.OwnerUsername)
	if normalizedOwner == "" {
		normalizedOwner = strings.TrimSpace(owner.Username)
	}
	normalized := ProviderAccessPolicy{
		OwnerUsername: normalizedOwner,
		Visibility:    strings.TrimSpace(access.Visibility),
		AllowedUsers:  make([]string, 0, len(access.AllowedUsers)),
	}
	seen := make(map[string]struct{}, len(access.AllowedUsers))
	for _, raw := range access.AllowedUsers {
		user := strings.TrimSpace(raw)
		if user == "" {
			continue
		}
		if _, ok := seen[user]; ok {
			continue
		}
		seen[user] = struct{}{}
		normalized.AllowedUsers = append(normalized.AllowedUsers, user)
	}
	slices.Sort(normalized.AllowedUsers)
	return normalized
}

func normalizeProviderRoutePolicy(policy ProviderRoutePolicy) ProviderRoutePolicy {
	switch policy.PrewarmPolicy {
	case ProviderPrewarmPolicyOnActivate, ProviderPrewarmPolicyOnStartup:
	default:
		policy.PrewarmPolicy = ProviderPrewarmPolicyManual
	}
	if policy.WarmTTLSeconds <= 0 {
		policy.WarmTTLSeconds = defaultProviderWarmTTLSeconds
	}
	return policy
}

func NormalizeProviderRoutePolicy(policy ProviderRoutePolicy) ProviderRoutePolicy {
	return normalizeProviderRoutePolicy(policy)
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
