package conversation

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/codexauth"
)

func ListOpenAIModels(ctx context.Context, config OpenAIProviderConfig) ([]string, error) {
	provider := NewOpenAIProvider(config)
	return listOpenAIModelsWithClient(ctx, provider.client, provider.baseURL, provider.apiKey)
}

func ListOllamaModels(ctx context.Context, config ProviderConfig) ([]string, error) {
	provider := NewOllamaProvider(config)
	return listOllamaModelsWithClient(ctx, provider.client, provider.baseURL)
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

	var attempts []string
	for _, requestURL := range openAICompatibleModelCatalogURLs(baseURL, defaultOpenAIBaseURL) {
		models, err := fetchOpenAICompatibleModelCatalog(ctx, client, requestURL, apiKey)
		if err == nil {
			return models, nil
		}
		attempts = append(attempts, err.Error())
	}

	return nil, fmt.Errorf("openai model discovery failed: %s", strings.Join(attempts, "; "))
}

func listOllamaModelsWithClient(ctx context.Context, client *http.Client, baseURL string) ([]string, error) {
	var attempts []string
	for _, requestURL := range ollamaNativeModelCatalogURLs(baseURL) {
		models, err := fetchOllamaNativeModelCatalog(ctx, client, requestURL)
		if err == nil {
			return models, nil
		}
		attempts = append(attempts, err.Error())
	}
	for _, requestURL := range openAICompatibleModelCatalogURLs(baseURL, normalizeBaseURL(baseURL)) {
		models, err := fetchOpenAICompatibleModelCatalog(ctx, client, requestURL, "")
		if err == nil {
			return models, nil
		}
		attempts = append(attempts, err.Error())
	}

	return nil, fmt.Errorf("ollama model discovery failed: %s", strings.Join(attempts, "; "))
}

func listCodexModelsWithCredentials(
	ctx context.Context,
	client *http.Client,
	credentials codexauth.Credentials,
) ([]string, error) {
	requestURL := strings.TrimRight(credentials.BaseURL, "/") + "/models"
	if strings.Contains(credentials.BaseURL, "chatgpt.com") {
		parsedURL, err := url.Parse(requestURL)
		if err != nil {
			return nil, err
		}
		query := parsedURL.Query()
		query.Set("client_version", codexClientVersion)
		parsedURL.RawQuery = query.Encode()
		requestURL = parsedURL.String()
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		requestURL,
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

	return decodeOpenAICompatibleModelCatalog(resp.Body, "codex")
}

func fetchOpenAICompatibleModelCatalog(
	ctx context.Context,
	client *http.Client,
	requestURL string,
	apiKey string,
) ([]string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return nil, err
	}
	if trimmedAPIKey := strings.TrimSpace(apiKey); trimmedAPIKey != "" {
		req.Header.Set("Authorization", "Bearer "+trimmedAPIKey)
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("GET %s: %w", requestURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf(
			"GET %s returned %s: %s",
			requestURL,
			resp.Status,
			readOpenAIError(resp.Body),
		)
	}

	return decodeOpenAICompatibleModelCatalog(resp.Body, "openai")
}

func fetchOllamaNativeModelCatalog(
	ctx context.Context,
	client *http.Client,
	requestURL string,
) ([]string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("GET %s: %w", requestURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return nil, fmt.Errorf(
			"GET %s returned %s: %s",
			requestURL,
			resp.Status,
			strings.TrimSpace(string(payload)),
		)
	}

	var decoded ollamaTagsResponse
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return nil, err
	}

	models := make([]string, 0, len(decoded.Models))
	for _, model := range decoded.Models {
		if name := strings.TrimSpace(model.Name); name != "" {
			models = append(models, name)
		}
	}
	models = compactModelIDs(models)
	if len(models) == 0 {
		return nil, fmt.Errorf("ollama model discovery returned no models")
	}
	return models, nil
}

func decodeOpenAICompatibleModelCatalog(reader io.Reader, providerLabel string) ([]string, error) {
	var decoded rawModelListResponse
	if err := json.NewDecoder(reader).Decode(&decoded); err != nil {
		return nil, err
	}
	models := compactModelIDs(decoded.ModelIDs())
	if len(models) == 0 {
		return nil, fmt.Errorf("%s model discovery returned no models", providerLabel)
	}
	return models, nil
}

func openAICompatibleModelCatalogURLs(rawBaseURL string, fallbackBaseURL string) []string {
	base := strings.TrimRight(strings.TrimSpace(rawBaseURL), "/")
	if base == "" {
		base = strings.TrimRight(strings.TrimSpace(fallbackBaseURL), "/")
	}
	if base == "" {
		return nil
	}

	candidates := []string{base + "/models"}
	if strings.HasSuffix(base, "/v1") {
		trimmed := strings.TrimSuffix(base, "/v1")
		if trimmed != "" {
			candidates = append(candidates, trimmed+"/models")
		}
	} else {
		candidates = append(candidates, base+"/v1/models")
	}

	return compactModelIDs(candidates)
}

func ollamaNativeModelCatalogURLs(rawBaseURL string) []string {
	return compactModelIDs([]string{strings.TrimRight(normalizeBaseURL(rawBaseURL), "/") + "/api/tags"})
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
