package conversation

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"slices"
	"strings"
)

var preferredModels = []string{
	"llama3.2:3b",
	"qwen3:4b-q4_K_M",
	"qwen3:4b",
	"qwen3:8b",
	"qwen3.5:9b",
	"qwen3:14b",
	"llama3.1:8b",
	"gemma2:9b",
}

type OllamaProvider struct {
	baseURL string
	config  ProviderConfig
	client  *http.Client
	runtime *providerRuntime
}

func NewOllamaProvider(config ProviderConfig) *OllamaProvider {
	baseURL := normalizeBaseURL(config.BaseURL)
	return &OllamaProvider{
		baseURL: baseURL,
		config: ProviderConfig{
			BaseURL: baseURL,
			Model:   strings.TrimSpace(config.Model),
		},
		client:  newHTTPClient(),
		runtime: &providerRuntime{model: strings.TrimSpace(config.Model)},
	}
}

func (p *OllamaProvider) Info() ProviderInfo {
	model := p.runtime.selectedModel()
	if model == "" {
		model = strings.TrimSpace(p.config.Model)
	}
	return ProviderInfo{
		Kind:      "ollama",
		BaseURL:   p.baseURL,
		Model:     model,
		Streaming: true,
	}
}

func (p *OllamaProvider) Complete(ctx context.Context, request CompletionRequest) (CompletionResult, ProviderInfo, error) {
	return p.complete(ctx, request, false, nil)
}

func (p *OllamaProvider) CompleteStream(
	ctx context.Context,
	request CompletionRequest,
	onTextDelta func(string) error,
) (CompletionResult, ProviderInfo, error) {
	return p.complete(ctx, request, true, onTextDelta)
}

func (p *OllamaProvider) complete(
	ctx context.Context,
	request CompletionRequest,
	stream bool,
	onTextDelta func(string) error,
) (CompletionResult, ProviderInfo, error) {
	if err := validateCompletionRequest(request); err != nil {
		return CompletionResult{}, p.Info(), err
	}
	model, err := p.resolveModel(ctx)
	if err != nil {
		return CompletionResult{}, p.Info(), err
	}

	payload := ollamaChatRequest{
		Model:  model,
		Stream: stream,
		Messages: append([]ollamaMessage{{
			Role:    string(RoleSystem),
			Content: request.SystemPrompt,
		}}, mapOllamaMessages(request.Messages)...),
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return CompletionResult{}, p.Info(), err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.baseURL+"/api/chat", bytes.NewReader(body))
	if err != nil {
		return CompletionResult{}, p.Info(), err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(req)
	if err != nil {
		return CompletionResult{}, p.Info(), err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return CompletionResult{}, p.Info(), fmt.Errorf("ollama chat failed with %s: %s", resp.Status, strings.TrimSpace(string(payload)))
	}

	if !stream {
		var decoded ollamaChatResponse
		if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
			return CompletionResult{}, p.Info(), err
		}
		p.runtime.setSelectedModel(decoded.Model)
		info := p.Info()
		return CompletionResult{
			Content: strings.TrimSpace(decoded.Message.Content),
			Model:   decoded.Model,
		}, info, nil
	}

	var builder strings.Builder
	finalModel := model
	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		var chunk ollamaChatResponse
		if err := json.Unmarshal([]byte(line), &chunk); err != nil {
			return CompletionResult{}, p.Info(), err
		}
		if strings.TrimSpace(chunk.Model) != "" {
			finalModel = strings.TrimSpace(chunk.Model)
		}
		if delta := chunk.Message.Content; delta != "" {
			builder.WriteString(delta)
			if onTextDelta != nil {
				if err := onTextDelta(delta); err != nil {
					return CompletionResult{}, p.Info(), err
				}
			}
		}
		if chunk.Done {
			break
		}
	}
	if err := scanner.Err(); err != nil {
		return CompletionResult{}, p.Info(), err
	}

	p.runtime.setSelectedModel(finalModel)
	info := p.Info()
	return CompletionResult{
		Content: strings.TrimSpace(builder.String()),
		Model:   finalModel,
	}, info, nil
}

func (p *OllamaProvider) resolveModel(ctx context.Context) (string, error) {
	if model := strings.TrimSpace(p.runtime.selectedModel()); model != "" {
		return model, nil
	}
	if model := strings.TrimSpace(p.config.Model); model != "" {
		p.runtime.setSelectedModel(model)
		return model, nil
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, p.baseURL+"/api/tags", nil)
	if err != nil {
		return "", err
	}
	resp, err := p.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return "", fmt.Errorf("ollama tags failed with %s: %s", resp.Status, strings.TrimSpace(string(payload)))
	}

	var decoded ollamaTagsResponse
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return "", err
	}

	names := make([]string, 0, len(decoded.Models))
	for _, model := range decoded.Models {
		name := strings.TrimSpace(model.Name)
		if name != "" {
			names = append(names, name)
		}
	}
	for _, preferred := range preferredModels {
		if slices.Contains(names, preferred) {
			p.runtime.setSelectedModel(preferred)
			return preferred, nil
		}
	}
	if len(names) == 0 {
		return "", fmt.Errorf("ollama returned no models")
	}
	p.runtime.setSelectedModel(names[0])
	return names[0], nil
}

type ollamaTagsResponse struct {
	Models []struct {
		Name string `json:"name"`
	} `json:"models"`
}

type ollamaMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ollamaChatRequest struct {
	Model    string          `json:"model"`
	Messages []ollamaMessage `json:"messages"`
	Stream   bool            `json:"stream"`
}

type ollamaChatResponse struct {
	Model      string        `json:"model"`
	Message    ollamaMessage `json:"message"`
	Done       bool          `json:"done"`
	DoneReason string        `json:"done_reason,omitempty"`
}

func mapOllamaMessages(messages []ChatMessage) []ollamaMessage {
	compact := make([]ollamaMessage, 0, len(messages))
	for _, message := range messages {
		role := strings.TrimSpace(string(message.Role))
		content := strings.TrimSpace(message.Content)
		if role == "" || content == "" {
			continue
		}
		compact = append(compact, ollamaMessage{
			Role:    role,
			Content: content,
		})
	}
	return compact
}
