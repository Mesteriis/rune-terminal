package conversation

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

const (
	defaultOpenAICompatibleCompletionTimeout = 2 * time.Minute
	defaultOpenAICompatibleDiscoveryTimeout  = 10 * time.Second
)

type OpenAICompatibleProviderConfig struct {
	BaseURL    string
	Model      string
	HTTPClient *http.Client
}

type openAICompatibleProvider struct {
	baseURL string
	model   string
	client  *http.Client
}

type openAICompatibleChatRequest struct {
	Model    string                          `json:"model"`
	Messages []openAICompatibleMessageRecord `json:"messages"`
	Stream   bool                            `json:"stream"`
}

type openAICompatibleMessageRecord struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAICompatibleChatResponse struct {
	Choices []struct {
		Message struct {
			Content openAICompatibleContent `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
		Type    string `json:"type"`
		Code    string `json:"code"`
	} `json:"error,omitempty"`
}

type openAICompatibleModelsResponse struct {
	Data []struct {
		ID string `json:"id"`
	} `json:"data"`
	Error *struct {
		Message string `json:"message"`
		Type    string `json:"type"`
		Code    string `json:"code"`
	} `json:"error,omitempty"`
}

type openAICompatibleContent string

func (content *openAICompatibleContent) UnmarshalJSON(raw []byte) error {
	if string(raw) == "null" {
		*content = ""
		return nil
	}

	var text string
	if err := json.Unmarshal(raw, &text); err == nil {
		*content = openAICompatibleContent(text)
		return nil
	}

	var parts []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	}
	if err := json.Unmarshal(raw, &parts); err != nil {
		return err
	}

	builder := strings.Builder{}
	for _, part := range parts {
		if strings.EqualFold(strings.TrimSpace(part.Type), "text") {
			builder.WriteString(part.Text)
		}
	}
	*content = openAICompatibleContent(builder.String())
	return nil
}

func NewOpenAICompatibleProvider(config OpenAICompatibleProviderConfig) Provider {
	client := config.HTTPClient
	if client == nil {
		client = &http.Client{}
	}
	return &openAICompatibleProvider{
		baseURL: normalizeOpenAICompatibleBaseURL(config.BaseURL),
		model:   strings.TrimSpace(config.Model),
		client:  client,
	}
}

func DiscoverOpenAICompatibleModels(ctx context.Context, baseURL string) ([]string, error) {
	discoveryCtx := ctx
	cancel := func() {}
	if _, ok := ctx.Deadline(); !ok {
		discoveryCtx, cancel = context.WithTimeout(ctx, defaultOpenAICompatibleDiscoveryTimeout)
	}
	defer cancel()

	request, err := http.NewRequestWithContext(
		discoveryCtx,
		http.MethodGet,
		openAICompatibleEndpoint(baseURL, "/models"),
		nil,
	)
	if err != nil {
		return nil, err
	}

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	var payload openAICompatibleModelsResponse
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return nil, err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, openAICompatibleResponseError(response.StatusCode, payload.Error)
	}

	models := make([]string, 0, len(payload.Data))
	for _, model := range payload.Data {
		modelID := strings.TrimSpace(model.ID)
		if modelID != "" {
			models = append(models, modelID)
		}
	}
	return compactModelIDs(models), nil
}

func (p *openAICompatibleProvider) Info() ProviderInfo {
	return ProviderInfo{
		Kind:      "openai-compatible",
		BaseURL:   p.baseURL,
		Model:     p.model,
		Streaming: false,
	}
}

func (p *openAICompatibleProvider) Complete(
	ctx context.Context,
	request CompletionRequest,
) (CompletionResult, ProviderInfo, error) {
	return p.complete(ctx, request, nil)
}

func (p *openAICompatibleProvider) CompleteStream(
	ctx context.Context,
	request CompletionRequest,
	onTextDelta func(string) error,
) (CompletionResult, ProviderInfo, error) {
	return p.complete(ctx, request, onTextDelta)
}

func (p *openAICompatibleProvider) complete(
	ctx context.Context,
	request CompletionRequest,
	onTextDelta func(string) error,
) (CompletionResult, ProviderInfo, error) {
	info := p.Info()
	if model := strings.TrimSpace(request.Model); model != "" {
		info.Model = model
	}
	if err := validateCompletionRequest(request); err != nil {
		return CompletionResult{}, info, err
	}
	if strings.TrimSpace(p.baseURL) == "" {
		return CompletionResult{}, info, fmt.Errorf("openai-compatible base_url is required")
	}
	if strings.TrimSpace(info.Model) == "" {
		return CompletionResult{}, info, fmt.Errorf("openai-compatible model is required")
	}

	content, err := p.run(ctx, request, info.Model)
	if err != nil {
		return CompletionResult{}, info, err
	}
	content = strings.TrimSpace(content)
	if onTextDelta != nil && content != "" {
		if err := onTextDelta(content); err != nil {
			return CompletionResult{}, info, err
		}
	}
	return CompletionResult{
		Content: content,
		Model:   info.Model,
	}, info, nil
}

func (p *openAICompatibleProvider) run(
	ctx context.Context,
	request CompletionRequest,
	model string,
) (string, error) {
	runCtx := ctx
	cancel := func() {}
	if _, ok := ctx.Deadline(); !ok {
		runCtx, cancel = context.WithTimeout(ctx, defaultOpenAICompatibleCompletionTimeout)
	}
	defer cancel()

	messageRecords := make([]openAICompatibleMessageRecord, 0, len(request.Messages)+1)
	messageRecords = append(messageRecords, openAICompatibleMessageRecord{
		Role:    string(RoleSystem),
		Content: strings.TrimSpace(request.SystemPrompt),
	})
	for _, message := range request.Messages {
		messageRecords = append(messageRecords, openAICompatibleMessageRecord{
			Role:    string(message.Role),
			Content: message.Content,
		})
	}

	payload := openAICompatibleChatRequest{
		Model:    strings.TrimSpace(model),
		Messages: messageRecords,
		Stream:   false,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	httpRequest, err := http.NewRequestWithContext(
		runCtx,
		http.MethodPost,
		openAICompatibleEndpoint(p.baseURL, "/chat/completions"),
		strings.NewReader(string(body)),
	)
	if err != nil {
		return "", err
	}
	httpRequest.Header.Set("Content-Type", "application/json")

	response, err := p.client.Do(httpRequest)
	if err != nil {
		return "", err
	}
	defer response.Body.Close()

	var completion openAICompatibleChatResponse
	if err := json.NewDecoder(response.Body).Decode(&completion); err != nil {
		return "", err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return "", openAICompatibleResponseError(response.StatusCode, completion.Error)
	}
	if len(completion.Choices) == 0 {
		return "", fmt.Errorf("openai-compatible response did not include choices")
	}
	return string(completion.Choices[0].Message.Content), nil
}

func openAICompatibleResponseError(
	statusCode int,
	payload *struct {
		Message string `json:"message"`
		Type    string `json:"type"`
		Code    string `json:"code"`
	},
) error {
	if payload == nil || strings.TrimSpace(payload.Message) == "" {
		return fmt.Errorf("openai-compatible request failed (%d)", statusCode)
	}
	return fmt.Errorf(
		"openai-compatible request failed (%d): %s",
		statusCode,
		strings.TrimSpace(payload.Message),
	)
}

func normalizeOpenAICompatibleBaseURL(raw string) string {
	baseURL := strings.TrimSpace(raw)
	if baseURL == "" {
		return ""
	}
	return strings.TrimRight(baseURL, "/")
}

func openAICompatibleEndpoint(baseURL string, suffix string) string {
	normalizedBaseURL := normalizeOpenAICompatibleBaseURL(baseURL)
	if strings.HasSuffix(normalizedBaseURL, "/v1") {
		return normalizedBaseURL + suffix
	}
	return normalizedBaseURL + "/v1" + suffix
}
