package conversation

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

const (
	defaultOpenAIBaseURL = "https://api.openai.com/v1"
	defaultOpenAIModel   = "gpt-4o-mini"
)

type OpenAIProviderConfig struct {
	BaseURL string
	Model   string
	APIKey  string
}

type OpenAIProvider struct {
	baseURL string
	model   string
	apiKey  string
	client  *http.Client
}

func NewOpenAIProvider(config OpenAIProviderConfig) *OpenAIProvider {
	baseURL := normalizeOpenAIBaseURL(config.BaseURL)
	model := strings.TrimSpace(config.Model)
	if model == "" {
		model = defaultOpenAIModel
	}
	return &OpenAIProvider{
		baseURL: baseURL,
		model:   model,
		apiKey:  strings.TrimSpace(config.APIKey),
		client:  newHTTPClient(),
	}
}

func (p *OpenAIProvider) Info() ProviderInfo {
	return ProviderInfo{
		Kind:      "openai",
		BaseURL:   p.baseURL,
		Model:     p.model,
		Streaming: true,
	}
}

func (p *OpenAIProvider) Complete(ctx context.Context, request CompletionRequest) (CompletionResult, ProviderInfo, error) {
	return p.complete(ctx, request, false, nil)
}

func (p *OpenAIProvider) CompleteStream(
	ctx context.Context,
	request CompletionRequest,
	onTextDelta func(string) error,
) (CompletionResult, ProviderInfo, error) {
	return p.complete(ctx, request, true, onTextDelta)
}

func (p *OpenAIProvider) complete(
	ctx context.Context,
	request CompletionRequest,
	stream bool,
	onTextDelta func(string) error,
) (CompletionResult, ProviderInfo, error) {
	if err := validateCompletionRequest(request); err != nil {
		return CompletionResult{}, p.Info(), err
	}
	if strings.TrimSpace(p.apiKey) == "" {
		return CompletionResult{}, p.Info(), fmt.Errorf("openai api_key is required")
	}
	model := firstNonEmptyString(strings.TrimSpace(request.Model), p.model)

	payload := openAIChatCompletionRequest{
		Model:  model,
		Stream: stream,
		Messages: append([]openAIChatMessage{{
			Role:    string(RoleSystem),
			Content: request.SystemPrompt,
		}}, mapOpenAIMessages(request.Messages)...),
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return CompletionResult{}, p.Info(), err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.baseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return CompletionResult{}, p.Info(), err
	}
	req.Header.Set("Authorization", "Bearer "+p.apiKey)
	req.Header.Set("Content-Type", "application/json")
	if stream {
		req.Header.Set("Accept", "text/event-stream")
	}

	resp, err := p.client.Do(req)
	if err != nil {
		return CompletionResult{}, p.Info(), err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return CompletionResult{}, p.Info(), fmt.Errorf("openai chat failed with %s: %s", resp.Status, readOpenAIError(resp.Body))
	}

	if !stream {
		var decoded openAIChatCompletionResponse
		if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
			return CompletionResult{}, p.Info(), err
		}
		info := p.Info()
		if resolvedModel := firstNonEmptyString(strings.TrimSpace(decoded.Model), model); resolvedModel != "" {
			info.Model = resolvedModel
		}
		return CompletionResult{
			Content: strings.TrimSpace(decoded.FirstContent()),
			Model:   info.Model,
		}, info, nil
	}

	var builder strings.Builder
	finalModel := model
	if err := consumeOpenAIStream(resp.Body, func(chunk openAIChatCompletionChunk) error {
		if model := strings.TrimSpace(chunk.Model); model != "" {
			finalModel = model
		}
		for _, choice := range chunk.Choices {
			delta := choice.Delta.Content
			if delta == "" {
				continue
			}
			builder.WriteString(delta)
			if onTextDelta != nil {
				if err := onTextDelta(delta); err != nil {
					return err
				}
			}
		}
		return nil
	}); err != nil {
		return CompletionResult{}, p.Info(), err
	}

	info := p.Info()
	if finalModel != "" {
		info.Model = finalModel
	}
	return CompletionResult{
		Content: strings.TrimSpace(builder.String()),
		Model:   finalModel,
	}, info, nil
}

func normalizeOpenAIBaseURL(raw string) string {
	base := strings.TrimSpace(raw)
	if base == "" {
		base = defaultOpenAIBaseURL
	}
	return strings.TrimRight(base, "/")
}

func mapOpenAIMessages(messages []ChatMessage) []openAIChatMessage {
	compact := make([]openAIChatMessage, 0, len(messages))
	for _, message := range messages {
		role := strings.TrimSpace(string(message.Role))
		content := strings.TrimSpace(message.Content)
		if role == "" || content == "" {
			continue
		}
		compact = append(compact, openAIChatMessage{
			Role:    role,
			Content: content,
		})
	}
	return compact
}

func consumeOpenAIStream(reader io.Reader, onChunk func(openAIChatCompletionChunk) error) error {
	scanner := bufio.NewScanner(reader)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	dataLines := make([]string, 0, 4)
	flushBlock := func() error {
		if len(dataLines) == 0 {
			return nil
		}
		payload := strings.Join(dataLines, "\n")
		dataLines = dataLines[:0]
		if payload == "[DONE]" {
			return io.EOF
		}
		var chunk openAIChatCompletionChunk
		if err := json.Unmarshal([]byte(payload), &chunk); err != nil {
			return err
		}
		if onChunk != nil {
			return onChunk(chunk)
		}
		return nil
	}

	for scanner.Scan() {
		line := strings.TrimRight(scanner.Text(), "\r")
		if line == "" {
			if err := flushBlock(); err != nil {
				if err == io.EOF {
					return nil
				}
				return err
			}
			continue
		}
		if strings.HasPrefix(line, "data:") {
			value := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
			dataLines = append(dataLines, value)
		}
	}
	if err := scanner.Err(); err != nil {
		return err
	}
	if err := flushBlock(); err != nil && err != io.EOF {
		return err
	}
	return nil
}

func readOpenAIError(reader io.Reader) string {
	payload, _ := io.ReadAll(io.LimitReader(reader, 4096))
	if len(payload) == 0 {
		return "empty error response"
	}
	var decoded openAIAPIErrorResponse
	if err := json.Unmarshal(payload, &decoded); err == nil {
		if message := strings.TrimSpace(decoded.Error.Message); message != "" {
			return message
		}
	}
	return strings.TrimSpace(string(payload))
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

type openAIChatCompletionRequest struct {
	Model    string              `json:"model"`
	Messages []openAIChatMessage `json:"messages"`
	Stream   bool                `json:"stream,omitempty"`
}

type openAIChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAIChatCompletionResponse struct {
	Model   string                       `json:"model"`
	Choices []openAIChatCompletionChoice `json:"choices"`
}

func (r openAIChatCompletionResponse) FirstContent() string {
	if len(r.Choices) == 0 {
		return ""
	}
	return r.Choices[0].Message.Content
}

type openAIChatCompletionChoice struct {
	Message openAIChatCompletionMessage `json:"message"`
}

type openAIChatCompletionMessage struct {
	Content string `json:"content"`
}

type openAIChatCompletionChunk struct {
	Model   string                            `json:"model"`
	Choices []openAIChatCompletionChunkChoice `json:"choices"`
}

type openAIChatCompletionChunkChoice struct {
	Delta openAIChatCompletionChunkDelta `json:"delta"`
}

type openAIChatCompletionChunkDelta struct {
	Content string `json:"content"`
}

type openAIAPIErrorResponse struct {
	Error struct {
		Message string `json:"message"`
	} `json:"error"`
}
