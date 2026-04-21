package conversation

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/codexauth"
)

const (
	defaultCodexModel    = "gpt-5-codex"
	codexOriginator      = "codex-tui"
	codexUserAgent       = "codex-tui/0.120.0 (rterm)"
	codexResponsesSuffix = "/responses"
)

type CodexProviderConfig struct {
	Model        string
	AuthFilePath string
}

type CodexProvider struct {
	model        string
	authFilePath string
	client       *http.Client
}

func NewCodexProvider(config CodexProviderConfig) *CodexProvider {
	model := strings.TrimSpace(config.Model)
	if model == "" {
		model = defaultCodexModel
	}
	return &CodexProvider{
		model:        model,
		authFilePath: strings.TrimSpace(config.AuthFilePath),
		client:       newHTTPClient(),
	}
}

func (p *CodexProvider) Info() ProviderInfo {
	info := ProviderInfo{
		Kind:      "codex",
		Model:     p.model,
		Streaming: true,
	}
	credentials, _, err := codexauth.LoadCredentials(p.authFilePath)
	if err == nil {
		info.BaseURL = credentials.BaseURL
	}
	return info
}

func (p *CodexProvider) Complete(ctx context.Context, request CompletionRequest) (CompletionResult, ProviderInfo, error) {
	return p.complete(ctx, request, false, nil)
}

func (p *CodexProvider) CompleteStream(
	ctx context.Context,
	request CompletionRequest,
	onTextDelta func(string) error,
) (CompletionResult, ProviderInfo, error) {
	return p.complete(ctx, request, true, onTextDelta)
}

func (p *CodexProvider) complete(
	ctx context.Context,
	request CompletionRequest,
	stream bool,
	onTextDelta func(string) error,
) (CompletionResult, ProviderInfo, error) {
	if err := validateCompletionRequest(request); err != nil {
		return CompletionResult{}, p.Info(), err
	}

	credentials, _, err := codexauth.LoadCredentials(p.authFilePath)
	if err != nil {
		return CompletionResult{}, p.Info(), err
	}

	info := ProviderInfo{
		Kind:      "codex",
		BaseURL:   credentials.BaseURL,
		Model:     p.model,
		Streaming: true,
	}

	payload := codexResponsesRequest{
		Model:        p.model,
		Instructions: request.SystemPrompt,
		Input:        mapCodexInputMessages(request.Messages),
		Stream:       stream,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return CompletionResult{}, info, err
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		strings.TrimRight(credentials.BaseURL, "/")+codexResponsesSuffix,
		bytes.NewReader(body),
	)
	if err != nil {
		return CompletionResult{}, info, err
	}
	req.Header.Set("Authorization", "Bearer "+credentials.Token)
	req.Header.Set("Content-Type", "application/json")
	if stream {
		req.Header.Set("Accept", "text/event-stream")
	}
	if strings.Contains(credentials.BaseURL, "chatgpt.com") {
		req.Header.Set("Originator", codexOriginator)
		req.Header.Set("User-Agent", codexUserAgent)
		if credentials.AccountID != "" {
			req.Header.Set("Chatgpt-Account-Id", credentials.AccountID)
		}
	}

	resp, err := p.client.Do(req)
	if err != nil {
		return CompletionResult{}, info, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return CompletionResult{}, info, fmt.Errorf("codex responses failed with %s: %s", resp.Status, readOpenAIError(resp.Body))
	}

	if !stream {
		var decoded codexResponsesResponse
		if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
			return CompletionResult{}, info, err
		}
		if model := strings.TrimSpace(decoded.Model); model != "" {
			info.Model = model
		}
		return CompletionResult{
			Content: strings.TrimSpace(decoded.OutputText()),
			Model:   info.Model,
		}, info, nil
	}

	var builder strings.Builder
	finalText := ""
	finalModel := info.Model
	if err := consumeCodexStream(resp.Body, func(event codexStreamEvent) error {
		switch event.Type {
		case "response.output_text.delta":
			if event.Delta == "" {
				return nil
			}
			builder.WriteString(event.Delta)
			if onTextDelta != nil {
				return onTextDelta(event.Delta)
			}
		case "response.output_text.done":
			finalText = event.Text
		case "response.completed", "response.done":
			if model := strings.TrimSpace(event.Response.Model); model != "" {
				finalModel = model
			}
			if finalText == "" {
				finalText = event.Response.OutputText()
			}
		case "error":
			message := strings.TrimSpace(event.Error.Message)
			if message == "" {
				message = "codex stream returned an error event"
			}
			return errors.New(message)
		}
		return nil
	}); err != nil {
		return CompletionResult{}, info, err
	}

	if finalModel != "" {
		info.Model = finalModel
	}
	content := strings.TrimSpace(builder.String())
	if content == "" {
		content = strings.TrimSpace(finalText)
	}
	return CompletionResult{
		Content: content,
		Model:   info.Model,
	}, info, nil
}

func mapCodexInputMessages(messages []ChatMessage) []codexInputMessage {
	input := make([]codexInputMessage, 0, len(messages))
	for _, message := range messages {
		content := strings.TrimSpace(message.Content)
		role := strings.TrimSpace(string(message.Role))
		if role == "" || content == "" {
			continue
		}
		input = append(input, codexInputMessage{
			Role: role,
			Content: []codexInputContent{
				{
					Type: "input_text",
					Text: content,
				},
			},
		})
	}
	return input
}

func consumeCodexStream(reader io.Reader, onEvent func(codexStreamEvent) error) error {
	scanner := bufio.NewScanner(reader)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	dataLines := make([]string, 0, 4)
	flushBlock := func() error {
		if len(dataLines) == 0 {
			return nil
		}
		payload := strings.Join(dataLines, "\n")
		dataLines = dataLines[:0]
		if strings.TrimSpace(payload) == "[DONE]" {
			return io.EOF
		}
		var event codexStreamEvent
		if err := json.Unmarshal([]byte(payload), &event); err != nil {
			return err
		}
		if onEvent != nil {
			return onEvent(event)
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
			dataLines = append(dataLines, strings.TrimSpace(strings.TrimPrefix(line, "data:")))
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

type codexResponsesRequest struct {
	Model        string              `json:"model"`
	Input        []codexInputMessage `json:"input"`
	Instructions string              `json:"instructions,omitempty"`
	Stream       bool                `json:"stream,omitempty"`
}

type codexInputMessage struct {
	Role    string              `json:"role"`
	Content []codexInputContent `json:"content"`
}

type codexInputContent struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type codexResponsesResponse struct {
	Model  string                `json:"model,omitempty"`
	Output []codexResponseOutput `json:"output,omitempty"`
}

func (r codexResponsesResponse) OutputText() string {
	var builder strings.Builder
	for _, item := range r.Output {
		for _, content := range item.Content {
			if content.Type != "output_text" {
				continue
			}
			builder.WriteString(content.Text)
		}
	}
	return builder.String()
}

type codexResponseOutput struct {
	Type    string                 `json:"type,omitempty"`
	Role    string                 `json:"role,omitempty"`
	Content []codexResponseContent `json:"content,omitempty"`
}

type codexResponseContent struct {
	Type string `json:"type,omitempty"`
	Text string `json:"text,omitempty"`
}

type codexStreamEvent struct {
	Type     string                 `json:"type,omitempty"`
	Delta    string                 `json:"delta,omitempty"`
	Text     string                 `json:"text,omitempty"`
	Response codexResponsesResponse `json:"response,omitempty"`
	Error    struct {
		Message string `json:"message,omitempty"`
	} `json:"error,omitempty"`
}
