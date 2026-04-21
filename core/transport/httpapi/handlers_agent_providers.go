package httpapi

import (
	"errors"
	"net/http"

	"github.com/Mesteriis/rune-terminal/core/agent"
)

type createProviderPayload struct {
	Kind        string                     `json:"kind"`
	DisplayName string                     `json:"display_name"`
	Enabled     *bool                      `json:"enabled,omitempty"`
	Ollama      *createOllamaConfigPayload `json:"ollama,omitempty"`
	OpenAI      *createOpenAIConfigPayload `json:"openai,omitempty"`
}

type updateProviderPayload struct {
	DisplayName *string                    `json:"display_name,omitempty"`
	Enabled     *bool                      `json:"enabled,omitempty"`
	Ollama      *updateOllamaConfigPayload `json:"ollama,omitempty"`
	OpenAI      *updateOpenAIConfigPayload `json:"openai,omitempty"`
}

type createOllamaConfigPayload struct {
	BaseURL string `json:"base_url"`
	Model   string `json:"model,omitempty"`
}

type updateOllamaConfigPayload struct {
	BaseURL *string `json:"base_url,omitempty"`
	Model   *string `json:"model,omitempty"`
}

type createOpenAIConfigPayload struct {
	BaseURL string `json:"base_url,omitempty"`
	Model   string `json:"model,omitempty"`
	APIKey  string `json:"api_key"`
}

type updateOpenAIConfigPayload struct {
	BaseURL     *string `json:"base_url,omitempty"`
	Model       *string `json:"model,omitempty"`
	APIKey      *string `json:"api_key,omitempty"`
	ClearAPIKey bool    `json:"clear_api_key,omitempty"`
}

func (api *API) handleProviderCatalog(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, api.runtime.ProviderCatalog())
}

func (api *API) handleCreateProvider(w http.ResponseWriter, r *http.Request) {
	var payload createProviderPayload
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	provider, catalog, err := api.runtime.CreateProvider(agent.CreateProviderInput{
		Kind:        agent.ProviderKind(payload.Kind),
		DisplayName: payload.DisplayName,
		Enabled:     payload.Enabled,
		Ollama:      mapCreateOllamaProviderInput(payload.Ollama),
		OpenAI:      mapCreateOpenAIProviderInput(payload.OpenAI),
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
		DisplayName: payload.DisplayName,
		Enabled:     payload.Enabled,
		Ollama:      mapUpdateOllamaProviderInput(payload.Ollama),
		OpenAI:      mapUpdateOpenAIProviderInput(payload.OpenAI),
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

func mapCreateOllamaProviderInput(payload *createOllamaConfigPayload) *agent.CreateOllamaProviderInput {
	if payload == nil {
		return nil
	}
	return &agent.CreateOllamaProviderInput{
		BaseURL: payload.BaseURL,
		Model:   payload.Model,
	}
}

func mapUpdateOllamaProviderInput(payload *updateOllamaConfigPayload) *agent.UpdateOllamaProviderInput {
	if payload == nil {
		return nil
	}
	return &agent.UpdateOllamaProviderInput{
		BaseURL: payload.BaseURL,
		Model:   payload.Model,
	}
}

func mapCreateOpenAIProviderInput(payload *createOpenAIConfigPayload) *agent.CreateOpenAIProviderInput {
	if payload == nil {
		return nil
	}
	return &agent.CreateOpenAIProviderInput{
		BaseURL: payload.BaseURL,
		Model:   payload.Model,
		APIKey:  payload.APIKey,
	}
}

func mapUpdateOpenAIProviderInput(payload *updateOpenAIConfigPayload) *agent.UpdateOpenAIProviderInput {
	if payload == nil {
		return nil
	}
	return &agent.UpdateOpenAIProviderInput{
		BaseURL:     payload.BaseURL,
		Model:       payload.Model,
		APIKey:      payload.APIKey,
		ClearAPIKey: payload.ClearAPIKey,
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
