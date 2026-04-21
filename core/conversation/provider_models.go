package conversation

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/codexauth"
)

func ListOpenAIModels(ctx context.Context, config OpenAIProviderConfig) ([]string, error) {
	provider := NewOpenAIProvider(config)
	return listOpenAIModelsWithClient(ctx, provider.client, provider.baseURL, provider.apiKey)
}

func ListCodexModels(ctx context.Context, config CodexProviderConfig) ([]string, error) {
	credentials, _, err := codexauth.LoadCredentials(config.AuthFilePath)
	if err != nil {
		return nil, err
	}
	return listCodexModelsWithCredentials(ctx, newHTTPClient(), credentials)
}

func listOpenAIModelsWithClient(
	ctx context.Context,
	client *http.Client,
	baseURL string,
	apiKey string,
) ([]string, error) {
	if strings.TrimSpace(apiKey) == "" {
		return nil, fmt.Errorf("openai api_key is required")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimRight(baseURL, "/")+"/models", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(apiKey))

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("openai model discovery failed with %s: %s", resp.Status, readOpenAIError(resp.Body))
	}

	var decoded rawModelListResponse
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return nil, err
	}
	models := compactModelIDs(decoded.ModelIDs())
	if len(models) == 0 {
		return nil, fmt.Errorf("openai model discovery returned no models")
	}
	return models, nil
}

func listCodexModelsWithCredentials(
	ctx context.Context,
	client *http.Client,
	credentials codexauth.Credentials,
) ([]string, error) {
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		strings.TrimRight(credentials.BaseURL, "/")+"/models",
		nil,
	)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+credentials.Token)
	if strings.Contains(credentials.BaseURL, "chatgpt.com") {
		req.Header.Set("Originator", codexOriginator)
		req.Header.Set("User-Agent", codexUserAgent)
		if credentials.AccountID != "" {
			req.Header.Set("Chatgpt-Account-Id", credentials.AccountID)
		}
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("codex model discovery failed with %s: %s", resp.Status, readOpenAIError(resp.Body))
	}

	var decoded rawModelListResponse
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return nil, err
	}
	models := compactModelIDs(decoded.ModelIDs())
	if len(models) == 0 {
		return nil, fmt.Errorf("codex model discovery returned no models")
	}
	return models, nil
}

type rawModelListResponse struct {
	Data   []rawModelEntry   `json:"data"`
	Models []json.RawMessage `json:"models"`
}

type rawModelEntry struct {
	ID   string `json:"id,omitempty"`
	Slug string `json:"slug,omitempty"`
	Name string `json:"name,omitempty"`
}

func (r rawModelListResponse) ModelIDs() []string {
	models := make([]string, 0, len(r.Data)+len(r.Models))
	for _, entry := range r.Data {
		models = append(models, entry.ModelID())
	}
	for _, rawEntry := range r.Models {
		var entry rawModelEntry
		if err := json.Unmarshal(rawEntry, &entry); err == nil {
			models = append(models, entry.ModelID())
			continue
		}
		var plainModel string
		if err := json.Unmarshal(rawEntry, &plainModel); err == nil {
			models = append(models, strings.TrimSpace(plainModel))
		}
	}
	return models
}

func (e rawModelEntry) ModelID() string {
	return firstNonEmptyString(e.ID, e.Slug, e.Name)
}

func compactModelIDs(ids []string) []string {
	if len(ids) == 0 {
		return nil
	}

	compacted := make([]string, 0, len(ids))
	seen := make(map[string]struct{}, len(ids))
	for _, rawID := range ids {
		modelID := strings.TrimSpace(rawID)
		if modelID == "" {
			continue
		}
		if _, ok := seen[modelID]; ok {
			continue
		}
		seen[modelID] = struct{}{}
		compacted = append(compacted, modelID)
	}
	return compacted
}
