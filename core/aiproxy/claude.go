package aiproxy

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/conversation"
)

const anthropicVersion = "2023-06-01"

func (p *Provider) completeClaude(
	ctx context.Context,
	channel Channel,
	model string,
	apiKey string,
	request conversation.CompletionRequest,
) (conversation.CompletionResult, conversation.ProviderInfo, error) {
	baseURLs := channel.GetAllBaseURLs()
	endpoint := strings.TrimRight(baseURLs[0], "/") + "/v1/messages"
	payload := anthropicRequest{
		Model:     model,
		System:    request.SystemPrompt,
		MaxTokens: 4096,
		Messages:  mapAnthropicMessages(request.Messages),
		Stream:    false,
	}
	resp, err := doJSONRequest(ctx, channel, http.MethodPost, endpoint, apiKey, payload)
	if err != nil {
		return conversation.CompletionResult{}, conversation.ProviderInfo{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return conversation.CompletionResult{}, conversation.ProviderInfo{}, readAnthropicError(resp)
	}

	var decoded anthropicResponse
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
		Content: decoded.Text(),
		Model:   info.Model,
	}, info, nil
}

func mapAnthropicMessages(messages []conversation.ChatMessage) []anthropicMessage {
	compact := make([]anthropicMessage, 0, len(messages))
	for _, message := range messages {
		role := "user"
		if message.Role == conversation.RoleAssistant {
			role = "assistant"
		}
		content := strings.TrimSpace(message.Content)
		if content == "" {
			continue
		}
		compact = append(compact, anthropicMessage{
			Role: role,
			Content: []anthropicContentBlock{{
				Type: "text",
				Text: content,
			}},
		})
	}
	return compact
}

func readAnthropicError(resp *http.Response) error {
	return readErrorResponse("claude-compatible", resp.StatusCode, resp.Body)
}

type anthropicRequest struct {
	Model     string             `json:"model"`
	System    string             `json:"system,omitempty"`
	MaxTokens int                `json:"max_tokens"`
	Messages  []anthropicMessage `json:"messages"`
	Stream    bool               `json:"stream,omitempty"`
}

type anthropicMessage struct {
	Role    string                  `json:"role"`
	Content []anthropicContentBlock `json:"content"`
}

type anthropicContentBlock struct {
	Type string `json:"type"`
	Text string `json:"text,omitempty"`
}

type anthropicResponse struct {
	Model   string                  `json:"model"`
	Content []anthropicContentBlock `json:"content"`
}

func (response anthropicResponse) Text() string {
	parts := make([]string, 0, len(response.Content))
	for _, block := range response.Content {
		if block.Type != "text" {
			continue
		}
		if text := strings.TrimSpace(block.Text); text != "" {
			parts = append(parts, text)
		}
	}
	return strings.Join(parts, "\n")
}
