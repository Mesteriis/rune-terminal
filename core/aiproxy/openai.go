package aiproxy

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/conversation"
)

func (p *Provider) completeOpenAI(
	ctx context.Context,
	channel Channel,
	model string,
	apiKey string,
	request conversation.CompletionRequest,
) (conversation.CompletionResult, conversation.ProviderInfo, error) {
	baseURLs := channel.GetAllBaseURLs()
	endpoint := strings.TrimRight(baseURLs[0], "/") + "/chat/completions"
	payload := openAIChatCompletionRequest{
		Model: model,
		Messages: append([]openAIChatMessage{{
			Role:    string(conversation.RoleSystem),
			Content: request.SystemPrompt,
		}}, mapOpenAIMessages(request.Messages)...),
	}

	resp, err := doJSONRequest(ctx, channel, http.MethodPost, endpoint, apiKey, payload)
	if err != nil {
		return conversation.CompletionResult{}, conversation.ProviderInfo{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return conversation.CompletionResult{}, conversation.ProviderInfo{}, readOpenAIError(resp)
	}

	var decoded openAIChatCompletionResponse
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return conversation.CompletionResult{}, conversation.ProviderInfo{}, err
	}

	info := conversation.ProviderInfo{
		Kind:      "proxy",
		BaseURL:   baseURLs[0],
		Model:     firstNonEmpty(strings.TrimSpace(decoded.Model), model),
		Streaming: true,
	}
	return conversation.CompletionResult{
		Content: strings.TrimSpace(decoded.FirstContent()),
		Model:   info.Model,
	}, info, nil
}

func mapOpenAIMessages(messages []conversation.ChatMessage) []openAIChatMessage {
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

func readOpenAIError(resp *http.Response) error {
	body, _ := ioReadAllLimit(resp)
	if len(body) == 0 {
		return &upstreamError{
			status: resp.StatusCode,
			msg:    fmt.Sprintf("openai-compatible upstream returned %s", resp.Status),
		}
	}
	var decoded openAIAPIErrorResponse
	if err := json.Unmarshal(body, &decoded); err == nil {
		if message := strings.TrimSpace(decoded.Error.Message); message != "" {
			return &upstreamError{
				status: resp.StatusCode,
				msg:    fmt.Sprintf("openai-compatible upstream returned %s: %s", resp.Status, message),
			}
		}
	}
	return &upstreamError{
		status: resp.StatusCode,
		msg:    fmt.Sprintf("openai-compatible upstream returned %s: %s", resp.Status, strings.TrimSpace(string(body))),
	}
}

func ioReadAllLimit(resp *http.Response) ([]byte, error) {
	return io.ReadAll(io.LimitReader(resp.Body, 4096))
}

type openAIChatCompletionRequest struct {
	Model    string              `json:"model"`
	Messages []openAIChatMessage `json:"messages"`
}

type openAIChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAIChatCompletionResponse struct {
	Model   string `json:"model"`
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

func (response openAIChatCompletionResponse) FirstContent() string {
	if len(response.Choices) == 0 {
		return ""
	}
	return response.Choices[0].Message.Content
}

type openAIAPIErrorResponse struct {
	Error struct {
		Message string `json:"message"`
	} `json:"error"`
}
