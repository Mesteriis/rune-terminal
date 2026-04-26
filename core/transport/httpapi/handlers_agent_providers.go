package httpapi

import (
	"errors"
	"net/http"

	"github.com/Mesteriis/rune-terminal/core/agent"
	"github.com/Mesteriis/rune-terminal/core/app"
)

type createProviderPayload struct {
	Kind             string                               `json:"kind"`
	DisplayName      string                               `json:"display_name"`
	Enabled          *bool                                `json:"enabled,omitempty"`
	Codex            *createCodexConfigPayload            `json:"codex,omitempty"`
	Claude           *createClaudeConfigPayload           `json:"claude,omitempty"`
	OpenAICompatible *createOpenAICompatibleConfigPayload `json:"openai_compatible,omitempty"`
}

type providerModelsPayload struct {
	ProviderID       string                                 `json:"provider_id,omitempty"`
	Kind             string                                 `json:"kind,omitempty"`
	Codex            *providerModelsCodexPayload            `json:"codex,omitempty"`
	Claude           *providerModelsClaudePayload           `json:"claude,omitempty"`
	OpenAICompatible *providerModelsOpenAICompatiblePayload `json:"openai_compatible,omitempty"`
}

type updateProviderPayload struct {
	DisplayName      *string                              `json:"display_name,omitempty"`
	Enabled          *bool                                `json:"enabled,omitempty"`
	Codex            *updateCodexConfigPayload            `json:"codex,omitempty"`
	Claude           *updateClaudeConfigPayload           `json:"claude,omitempty"`
	OpenAICompatible *updateOpenAICompatibleConfigPayload `json:"openai_compatible,omitempty"`
}

type providerModelsCodexPayload struct {
	Command string `json:"command,omitempty"`
	Model   string `json:"model,omitempty"`
}

type providerModelsClaudePayload struct {
	Command string `json:"command,omitempty"`
	Model   string `json:"model,omitempty"`
}

type providerModelsOpenAICompatiblePayload struct {
	BaseURL string `json:"base_url,omitempty"`
	Model   string `json:"model,omitempty"`
}

type createCodexConfigPayload struct {
	Command    string   `json:"command,omitempty"`
	Model      string   `json:"model,omitempty"`
	ChatModels []string `json:"chat_models,omitempty"`
}

type updateCodexConfigPayload struct {
	Command    *string   `json:"command,omitempty"`
	Model      *string   `json:"model,omitempty"`
	ChatModels *[]string `json:"chat_models,omitempty"`
}

type createClaudeConfigPayload struct {
	Command    string   `json:"command,omitempty"`
	Model      string   `json:"model,omitempty"`
	ChatModels []string `json:"chat_models,omitempty"`
}

type createOpenAICompatibleConfigPayload struct {
	BaseURL    string   `json:"base_url,omitempty"`
	Model      string   `json:"model,omitempty"`
	ChatModels []string `json:"chat_models,omitempty"`
}

type updateClaudeConfigPayload struct {
	Command    *string   `json:"command,omitempty"`
	Model      *string   `json:"model,omitempty"`
	ChatModels *[]string `json:"chat_models,omitempty"`
}

type updateOpenAICompatibleConfigPayload struct {
	BaseURL    *string   `json:"base_url,omitempty"`
	Model      *string   `json:"model,omitempty"`
	ChatModels *[]string `json:"chat_models,omitempty"`
}

func (api *API) handleProviderCatalog(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, api.runtime.ProviderCatalog())
}

func (api *API) handleProviderGatewaySnapshot(w http.ResponseWriter, r *http.Request) {
	snapshot, err := api.runtime.ProviderGatewaySnapshot(r.Context())
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, snapshot)
}

func (api *API) handleProbeProvider(w http.ResponseWriter, r *http.Request) {
	providerID := r.PathValue("providerID")
	if providerID == "" {
		writeError(w, http.StatusBadRequest, "missing_provider_id", "provider id is required")
		return
	}
	result, err := api.runtime.ProbeProvider(r.Context(), providerID)
	if err != nil {
		writeProviderConfigError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (api *API) handlePrewarmProvider(w http.ResponseWriter, r *http.Request) {
	providerID := r.PathValue("providerID")
	if providerID == "" {
		writeError(w, http.StatusBadRequest, "missing_provider_id", "provider id is required")
		return
	}
	result, err := api.runtime.PrewarmProvider(r.Context(), providerID)
	if err != nil {
		writeProviderConfigError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (api *API) handleCreateProvider(w http.ResponseWriter, r *http.Request) {
	var payload createProviderPayload
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	provider, catalog, err := api.runtime.CreateProvider(agent.CreateProviderInput{
		Kind:             agent.ProviderKind(payload.Kind),
		DisplayName:      payload.DisplayName,
		Enabled:          payload.Enabled,
		Codex:            mapCreateCodexProviderInput(payload.Codex),
		Claude:           mapCreateClaudeProviderInput(payload.Claude),
		OpenAICompatible: mapCreateOpenAICompatibleProviderInput(payload.OpenAICompatible),
	})
	if err != nil {
		writeProviderConfigError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"provider":  provider,
		"providers": catalog,
	})
}

func (api *API) handleDiscoverProviderModels(w http.ResponseWriter, r *http.Request) {
	var payload providerModelsPayload
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	if payload.ProviderID == "" && payload.Kind == "" {
		writeError(w, http.StatusBadRequest, "missing_provider_discovery_target", "provider_id or kind is required")
		return
	}

	models, err := api.runtime.DiscoverProviderModels(r.Context(), appDiscoverProviderModelsInput(payload))
	if err != nil {
		writeProviderModelDiscoveryError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, models)
}

func (api *API) handleUpdateProvider(w http.ResponseWriter, r *http.Request) {
	var payload updateProviderPayload
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	providerID := r.PathValue("providerID")
	if providerID == "" {
		writeError(w, http.StatusBadRequest, "missing_provider_id", "provider id is required")
		return
	}
	provider, catalog, err := api.runtime.UpdateProvider(providerID, agent.UpdateProviderInput{
		DisplayName:      payload.DisplayName,
		Enabled:          payload.Enabled,
		Codex:            mapUpdateCodexProviderInput(payload.Codex),
		Claude:           mapUpdateClaudeProviderInput(payload.Claude),
		OpenAICompatible: mapUpdateOpenAICompatibleProviderInput(payload.OpenAICompatible),
	})
	if err != nil {
		writeProviderConfigError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"provider":  provider,
		"providers": catalog,
	})
}

func appDiscoverProviderModelsInput(payload providerModelsPayload) app.DiscoverProviderModelsInput {
	return app.DiscoverProviderModelsInput{
		ProviderID:       payload.ProviderID,
		Kind:             agent.ProviderKind(payload.Kind),
		Codex:            mapProviderModelsCodexSettings(payload.Codex),
		Claude:           mapProviderModelsClaudeSettings(payload.Claude),
		OpenAICompatible: mapProviderModelsOpenAICompatibleSettings(payload.OpenAICompatible),
	}
}

func (api *API) handleSetActiveProvider(w http.ResponseWriter, r *http.Request) {
	var payload selectionPayload
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	if payload.ID == "" {
		writeError(w, http.StatusBadRequest, "missing_id", "id is required")
		return
	}
	catalog, err := api.runtime.SetActiveProvider(payload.ID)
	if err != nil {
		writeProviderConfigError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, catalog)
}

func (api *API) handleDeleteProvider(w http.ResponseWriter, r *http.Request) {
	providerID := r.PathValue("providerID")
	if providerID == "" {
		writeError(w, http.StatusBadRequest, "missing_provider_id", "provider id is required")
		return
	}
	catalog, err := api.runtime.DeleteProvider(providerID)
	if err != nil {
		writeProviderConfigError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, catalog)
}

func mapProviderModelsCodexSettings(payload *providerModelsCodexPayload) *agent.CodexProviderSettings {
	if payload == nil {
		return nil
	}
	return &agent.CodexProviderSettings{
		Command: payload.Command,
		Model:   payload.Model,
	}
}

func mapProviderModelsClaudeSettings(payload *providerModelsClaudePayload) *agent.ClaudeProviderSettings {
	if payload == nil {
		return nil
	}
	return &agent.ClaudeProviderSettings{
		Command: payload.Command,
		Model:   payload.Model,
	}
}

func mapProviderModelsOpenAICompatibleSettings(
	payload *providerModelsOpenAICompatiblePayload,
) *agent.OpenAICompatibleProviderSettings {
	if payload == nil {
		return nil
	}
	return &agent.OpenAICompatibleProviderSettings{
		BaseURL: payload.BaseURL,
		Model:   payload.Model,
	}
}

func mapCreateCodexProviderInput(payload *createCodexConfigPayload) *agent.CreateCodexProviderInput {
	if payload == nil {
		return nil
	}
	return &agent.CreateCodexProviderInput{
		Command:    payload.Command,
		Model:      payload.Model,
		ChatModels: payload.ChatModels,
	}
}

func mapUpdateCodexProviderInput(payload *updateCodexConfigPayload) *agent.UpdateCodexProviderInput {
	if payload == nil {
		return nil
	}
	return &agent.UpdateCodexProviderInput{
		Command:    payload.Command,
		Model:      payload.Model,
		ChatModels: payload.ChatModels,
	}
}

func mapCreateClaudeProviderInput(payload *createClaudeConfigPayload) *agent.CreateClaudeProviderInput {
	if payload == nil {
		return nil
	}
	return &agent.CreateClaudeProviderInput{
		Command:    payload.Command,
		Model:      payload.Model,
		ChatModels: payload.ChatModels,
	}
}

func mapCreateOpenAICompatibleProviderInput(
	payload *createOpenAICompatibleConfigPayload,
) *agent.CreateOpenAICompatibleProviderInput {
	if payload == nil {
		return nil
	}
	return &agent.CreateOpenAICompatibleProviderInput{
		BaseURL:    payload.BaseURL,
		Model:      payload.Model,
		ChatModels: payload.ChatModels,
	}
}

func mapUpdateClaudeProviderInput(payload *updateClaudeConfigPayload) *agent.UpdateClaudeProviderInput {
	if payload == nil {
		return nil
	}
	return &agent.UpdateClaudeProviderInput{
		Command:    payload.Command,
		Model:      payload.Model,
		ChatModels: payload.ChatModels,
	}
}

func mapUpdateOpenAICompatibleProviderInput(
	payload *updateOpenAICompatibleConfigPayload,
) *agent.UpdateOpenAICompatibleProviderInput {
	if payload == nil {
		return nil
	}
	return &agent.UpdateOpenAICompatibleProviderInput{
		BaseURL:    payload.BaseURL,
		Model:      payload.Model,
		ChatModels: payload.ChatModels,
	}
}

func writeProviderConfigError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, agent.ErrProviderNotFound):
		writeNotFound(w, "provider_not_found", err.Error())
	case errors.Is(err, agent.ErrProviderKindUnsupported):
		writeBadRequest(w, "provider_kind_unsupported", err)
	case errors.Is(err, agent.ErrProviderInvalidConfig):
		writeBadRequest(w, "invalid_provider_config", err)
	case errors.Is(err, agent.ErrProviderDisabled):
		writeError(w, http.StatusConflict, "provider_disabled", err.Error())
	case errors.Is(err, agent.ErrProviderDeleteActive):
		writeError(w, http.StatusConflict, "provider_delete_active", err.Error())
	default:
		writeInternalError(w, err)
	}
}

func writeProviderModelDiscoveryError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, agent.ErrProviderNotFound):
		writeNotFound(w, "provider_not_found", err.Error())
	case errors.Is(err, agent.ErrProviderKindUnsupported):
		writeBadRequest(w, "provider_kind_unsupported", err)
	case errors.Is(err, agent.ErrProviderInvalidConfig):
		writeBadRequest(w, "invalid_provider_config", err)
	default:
		writeError(w, http.StatusBadGateway, "provider_model_discovery_failed", err.Error())
	}
}
