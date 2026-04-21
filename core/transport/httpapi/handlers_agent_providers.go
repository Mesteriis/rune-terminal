package httpapi

import (
	"errors"
	"net/http"

	"github.com/Mesteriis/rune-terminal/core/agent"
	"github.com/Mesteriis/rune-terminal/core/aiproxy"
)

type createProviderPayload struct {
	Kind        string                     `json:"kind"`
	DisplayName string                     `json:"display_name"`
	Enabled     *bool                      `json:"enabled,omitempty"`
	Ollama      *createOllamaConfigPayload `json:"ollama,omitempty"`
	Codex       *createCodexConfigPayload  `json:"codex,omitempty"`
	OpenAI      *createOpenAIConfigPayload `json:"openai,omitempty"`
	Proxy       *createProxyConfigPayload  `json:"proxy,omitempty"`
}

type updateProviderPayload struct {
	DisplayName *string                    `json:"display_name,omitempty"`
	Enabled     *bool                      `json:"enabled,omitempty"`
	Ollama      *updateOllamaConfigPayload `json:"ollama,omitempty"`
	Codex       *updateCodexConfigPayload  `json:"codex,omitempty"`
	OpenAI      *updateOpenAIConfigPayload `json:"openai,omitempty"`
	Proxy       *updateProxyConfigPayload  `json:"proxy,omitempty"`
}

type createOllamaConfigPayload struct {
	BaseURL string `json:"base_url"`
	Model   string `json:"model,omitempty"`
}

type updateOllamaConfigPayload struct {
	BaseURL *string `json:"base_url,omitempty"`
	Model   *string `json:"model,omitempty"`
}

type createCodexConfigPayload struct {
	Model        string `json:"model,omitempty"`
	AuthFilePath string `json:"auth_file_path,omitempty"`
}

type updateCodexConfigPayload struct {
	Model        *string `json:"model,omitempty"`
	AuthFilePath *string `json:"auth_file_path,omitempty"`
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

type proxyChannelPayload struct {
	ID                 string            `json:"id,omitempty"`
	Name               string            `json:"name"`
	ServiceType        string            `json:"service_type"`
	BaseURL            string            `json:"base_url,omitempty"`
	BaseURLs           []string          `json:"base_urls,omitempty"`
	APIKeys            []proxyAPIKeyItem `json:"api_keys,omitempty"`
	AuthType           string            `json:"auth_type,omitempty"`
	Priority           int               `json:"priority,omitempty"`
	Status             string            `json:"status,omitempty"`
	ModelMapping       map[string]string `json:"model_mapping,omitempty"`
	Description        string            `json:"description,omitempty"`
	InsecureSkipVerify bool              `json:"insecure_skip_verify,omitempty"`
}

type updateProxyChannelPayload struct {
	ID                 string             `json:"id,omitempty"`
	Name               string             `json:"name"`
	ServiceType        string             `json:"service_type"`
	BaseURL            string             `json:"base_url,omitempty"`
	BaseURLs           []string           `json:"base_urls,omitempty"`
	APIKeys            *[]proxyAPIKeyItem `json:"api_keys,omitempty"`
	AuthType           string             `json:"auth_type,omitempty"`
	Priority           int                `json:"priority,omitempty"`
	Status             string             `json:"status,omitempty"`
	ModelMapping       map[string]string  `json:"model_mapping,omitempty"`
	Description        string             `json:"description,omitempty"`
	InsecureSkipVerify bool               `json:"insecure_skip_verify,omitempty"`
}

type proxyAPIKeyItem struct {
	Key     string `json:"key,omitempty"`
	Enabled bool   `json:"enabled"`
}

type createProxyConfigPayload struct {
	Model    string                `json:"model"`
	Channels []proxyChannelPayload `json:"channels"`
}

type updateProxyConfigPayload struct {
	Model           *string                      `json:"model,omitempty"`
	Channels        *[]updateProxyChannelPayload `json:"channels,omitempty"`
	ReplaceChannels bool                         `json:"replace_channels,omitempty"`
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
		Codex:       mapCreateCodexProviderInput(payload.Codex),
		OpenAI:      mapCreateOpenAIProviderInput(payload.OpenAI),
		Proxy:       mapCreateProxyProviderInput(payload.Proxy),
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
		Codex:       mapUpdateCodexProviderInput(payload.Codex),
		OpenAI:      mapUpdateOpenAIProviderInput(payload.OpenAI),
		Proxy:       mapUpdateProxyProviderInput(payload.Proxy),
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

func mapCreateCodexProviderInput(payload *createCodexConfigPayload) *agent.CreateCodexProviderInput {
	if payload == nil {
		return nil
	}
	return &agent.CreateCodexProviderInput{
		Model:        payload.Model,
		AuthFilePath: payload.AuthFilePath,
	}
}

func mapUpdateCodexProviderInput(payload *updateCodexConfigPayload) *agent.UpdateCodexProviderInput {
	if payload == nil {
		return nil
	}
	return &agent.UpdateCodexProviderInput{
		Model:        payload.Model,
		AuthFilePath: payload.AuthFilePath,
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

func mapCreateProxyProviderInput(payload *createProxyConfigPayload) *agent.CreateProxyProviderInput {
	if payload == nil {
		return nil
	}
	return &agent.CreateProxyProviderInput{
		Model:    payload.Model,
		Channels: mapProxyChannels(payload.Channels),
	}
}

func mapUpdateProxyProviderInput(payload *updateProxyConfigPayload) *agent.UpdateProxyProviderInput {
	if payload == nil {
		return nil
	}
	var channels *[]agent.UpdateProxyChannelInput
	if payload.Channels != nil {
		mapped := mapUpdateProxyChannels(*payload.Channels)
		channels = &mapped
	}
	return &agent.UpdateProxyProviderInput{
		Model:           payload.Model,
		Channels:        channels,
		ReplaceChannels: payload.ReplaceChannels || payload.Channels != nil,
	}
}

func mapUpdateProxyChannels(payload []updateProxyChannelPayload) []agent.UpdateProxyChannelInput {
	if len(payload) == 0 {
		return nil
	}
	channels := make([]agent.UpdateProxyChannelInput, 0, len(payload))
	for _, item := range payload {
		channel := agent.UpdateProxyChannelInput{
			Channel: aiproxy.Channel{
				ID:                 item.ID,
				Name:               item.Name,
				ServiceType:        aiproxy.ServiceType(item.ServiceType),
				BaseURL:            item.BaseURL,
				BaseURLs:           append([]string(nil), item.BaseURLs...),
				AuthType:           aiproxy.AuthType(item.AuthType),
				Priority:           item.Priority,
				Status:             aiproxy.ChannelStatus(item.Status),
				ModelMapping:       item.ModelMapping,
				Description:        item.Description,
				InsecureSkipVerify: item.InsecureSkipVerify,
			},
		}
		if item.APIKeys != nil {
			mappedKeys := mapProxyAPIKeys(*item.APIKeys)
			channel.APIKeys = &mappedKeys
		}
		channels = append(channels, channel)
	}
	return channels
}

func mapProxyChannels(payload []proxyChannelPayload) []aiproxy.Channel {
	if len(payload) == 0 {
		return nil
	}
	channels := make([]aiproxy.Channel, 0, len(payload))
	for _, item := range payload {
		channel := aiproxy.Channel{
			ID:                 item.ID,
			Name:               item.Name,
			ServiceType:        aiproxy.ServiceType(item.ServiceType),
			BaseURL:            item.BaseURL,
			BaseURLs:           append([]string(nil), item.BaseURLs...),
			AuthType:           aiproxy.AuthType(item.AuthType),
			Priority:           item.Priority,
			Status:             aiproxy.ChannelStatus(item.Status),
			ModelMapping:       item.ModelMapping,
			Description:        item.Description,
			InsecureSkipVerify: item.InsecureSkipVerify,
		}
		channel.APIKeys = mapProxyAPIKeys(item.APIKeys)
		channels = append(channels, channel)
	}
	return channels
}

func mapProxyAPIKeys(payload []proxyAPIKeyItem) []aiproxy.APIKey {
	if len(payload) == 0 {
		return nil
	}
	keys := make([]aiproxy.APIKey, 0, len(payload))
	for _, key := range payload {
		keys = append(keys, aiproxy.APIKey{
			Key:     key.Key,
			Enabled: key.Enabled,
		})
	}
	return keys
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
