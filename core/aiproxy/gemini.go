package aiproxy

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/conversation"
)

func (p *Provider) completeGemini(
	ctx context.Context,
	channel Channel,
	model string,
	apiKey string,
	request conversation.CompletionRequest,
) (conversation.CompletionResult, conversation.ProviderInfo, error) {
	baseURLs := channel.GetAllBaseURLs()
	endpoint := strings.TrimRight(baseURLs[0], "/") + "/models/" + url.PathEscape(model) + ":generateContent"
	endpoint, err := addGeminiAPIKey(endpoint, apiKey, channel.EffectiveAuthType())
	if err != nil {
		return conversation.CompletionResult{}, conversation.ProviderInfo{}, err
	}
	payload := geminiRequest{
		SystemInstruction: &geminiContent{
			Parts: []geminiPart{{Text: request.SystemPrompt}},
		},
		Contents: mapGeminiMessages(request.Messages),
	}

	resp, err := doJSONRequest(ctx, channel, http.MethodPost, endpoint, apiKey, payload)
	if err != nil {
		return conversation.CompletionResult{}, conversation.ProviderInfo{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return conversation.CompletionResult{}, conversation.ProviderInfo{}, readGeminiError(resp)
	}

	var decoded geminiResponse
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return conversation.CompletionResult{}, conversation.ProviderInfo{}, err
	}
	info := conversation.ProviderInfo{
		Kind:      "proxy",
		BaseURL:   baseURLs[0],
		Model:     firstNonEmpty(strings.TrimSpace(decoded.ModelVersion), model),
		Streaming: true,
	}
	return conversation.CompletionResult{
		Content: decoded.Text(),
		Model:   info.Model,
	}, info, nil
}

func mapGeminiMessages(messages []conversation.ChatMessage) []geminiContent {
	compact := make([]geminiContent, 0, len(messages))
	for _, message := range messages {
		role := "user"
		if message.Role == conversation.RoleAssistant {
			role = "model"
		}
		content := strings.TrimSpace(message.Content)
		if content == "" {
			continue
		}
		compact = append(compact, geminiContent{
			Role: role,
			Parts: []geminiPart{{
				Text: content,
			}},
		})
	}
	return compact
}

func readGeminiError(resp *http.Response) error {
	return readErrorResponse("gemini", resp.StatusCode, resp.Body)
}

type geminiRequest struct {
	Contents          []geminiContent `json:"contents"`
	SystemInstruction *geminiContent  `json:"systemInstruction,omitempty"`
}

type geminiContent struct {
	Role  string       `json:"role,omitempty"`
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text string `json:"text,omitempty"`
}

type geminiResponse struct {
	Candidates   []geminiCandidate `json:"candidates"`
	ModelVersion string            `json:"modelVersion"`
}

type geminiCandidate struct {
	Content geminiContent `json:"content"`
}

func (response geminiResponse) Text() string {
	if len(response.Candidates) == 0 {
		return ""
	}
	parts := make([]string, 0, len(response.Candidates[0].Content.Parts))
	for _, part := range response.Candidates[0].Content.Parts {
		if text := strings.TrimSpace(part.Text); text != "" {
			parts = append(parts, text)
		}
	}
	return strings.Join(parts, "\n")
}
