package aiproxy

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/conversation"
)

type Provider struct {
	config    Config
	scheduler *Scheduler
}

func NewProvider(config Config) (*Provider, error) {
	config = CloneConfig(config)
	if err := ValidateConfig(config); err != nil {
		return nil, err
	}
	return &Provider{
		config:    config,
		scheduler: NewScheduler(config.Channels),
	}, nil
}

func (p *Provider) Info() conversation.ProviderInfo {
	baseURL := ""
	if channel, err := p.scheduler.SelectChannel(nil); err == nil && channel != nil {
		baseURLs := channel.GetAllBaseURLs()
		if len(baseURLs) > 0 {
			baseURL = baseURLs[0]
		}
	}
	return conversation.ProviderInfo{
		Kind:      "proxy",
		BaseURL:   baseURL,
		Model:     strings.TrimSpace(p.config.Model),
		Streaming: true,
	}
}

func (p *Provider) Complete(
	ctx context.Context,
	request conversation.CompletionRequest,
) (conversation.CompletionResult, conversation.ProviderInfo, error) {
	if err := validateCompletionRequest(request); err != nil {
		return conversation.CompletionResult{}, p.Info(), err
	}

	excludeChannels := make(map[string]bool)
	var lastErr error
	for attempt := 0; attempt < len(p.config.Channels); attempt++ {
		channel, err := p.scheduler.SelectChannel(excludeChannels)
		if err != nil {
			if lastErr != nil {
				return conversation.CompletionResult{}, p.Info(), lastErr
			}
			return conversation.CompletionResult{}, p.Info(), err
		}

		result, info, retryable, err := p.completeWithChannel(ctx, *channel, request)
		if err == nil {
			p.scheduler.RecordSuccess(channel.ID)
			return result, info, nil
		}

		p.scheduler.RecordFailure(channel.ID, retryable)
		excludeChannels[channel.ID] = true
		lastErr = err
	}
	if lastErr == nil {
		lastErr = fmt.Errorf("proxy request failed without an upstream error")
	}
	return conversation.CompletionResult{}, p.Info(), lastErr
}

func (p *Provider) CompleteStream(
	ctx context.Context,
	request conversation.CompletionRequest,
	onTextDelta func(string) error,
) (conversation.CompletionResult, conversation.ProviderInfo, error) {
	result, info, err := p.Complete(ctx, request)
	if err != nil {
		return conversation.CompletionResult{}, info, err
	}
	if onTextDelta != nil && result.Content != "" {
		if emitErr := onTextDelta(result.Content); emitErr != nil {
			return conversation.CompletionResult{}, info, emitErr
		}
	}
	return result, info, nil
}

func (p *Provider) completeWithChannel(
	ctx context.Context,
	channel Channel,
	request conversation.CompletionRequest,
) (conversation.CompletionResult, conversation.ProviderInfo, bool, error) {
	model := channel.MapModel(p.config.Model)
	info := conversation.ProviderInfo{
		Kind:      "proxy",
		Model:     model,
		Streaming: true,
	}
	baseURLs := channel.GetAllBaseURLs()
	if len(baseURLs) > 0 {
		info.BaseURL = baseURLs[0]
	}

	failedKeys := make(map[string]bool)
	keys := channel.EnabledAPIKeys()
	if len(keys) == 0 {
		keys = []string{""}
	}

	var lastErr error
	lastRetryable := true
	for range keys {
		apiKey, keyErr := p.scheduler.NextAPIKey(channel, failedKeys)
		if keyErr != nil {
			return conversation.CompletionResult{}, info, false, keyErr
		}

		result, callInfo, err := p.callChannel(ctx, channel, model, apiKey, request)
		if err == nil {
			if callInfo.BaseURL == "" {
				callInfo.BaseURL = info.BaseURL
			}
			if callInfo.Model == "" {
				callInfo.Model = info.Model
			}
			if callInfo.Kind == "" {
				callInfo.Kind = info.Kind
			}
			if !callInfo.Streaming {
				callInfo.Streaming = true
			}
			return result, callInfo, false, nil
		}

		retryable := isRetryable(err)
		lastRetryable = retryable
		lastErr = err
		if isAuthFailure(err) && apiKey != "" {
			failedKeys[apiKey] = true
			p.scheduler.MarkKeyFailed(apiKey)
			continue
		}
		break
	}

	if lastErr == nil {
		lastErr = fmt.Errorf("proxy channel request failed")
	}
	return conversation.CompletionResult{}, info, lastRetryable, lastErr
}

func (p *Provider) callChannel(
	ctx context.Context,
	channel Channel,
	model string,
	apiKey string,
	request conversation.CompletionRequest,
) (conversation.CompletionResult, conversation.ProviderInfo, error) {
	switch channel.ServiceType {
	case ServiceTypeClaude:
		return p.completeClaude(ctx, channel, model, apiKey, request)
	case ServiceTypeGemini:
		return p.completeGemini(ctx, channel, model, apiKey, request)
	default:
		return p.completeOpenAI(ctx, channel, model, apiKey, request)
	}
}

func validateCompletionRequest(request conversation.CompletionRequest) error {
	if strings.TrimSpace(request.SystemPrompt) == "" {
		return fmt.Errorf("%w: system prompt is required", conversation.ErrInvalidPrompt)
	}
	if len(request.Messages) == 0 {
		return fmt.Errorf("%w: at least one message is required", conversation.ErrInvalidPrompt)
	}
	last := request.Messages[len(request.Messages)-1]
	if last.Role != conversation.RoleUser || strings.TrimSpace(last.Content) == "" {
		return fmt.Errorf("%w: last message must be a non-empty user prompt", conversation.ErrInvalidPrompt)
	}
	return nil
}

type upstreamError struct {
	status int
	msg    string
}

func (err *upstreamError) Error() string {
	return err.msg
}

func isRetryable(err error) bool {
	var upstream *upstreamError
	if !errors.As(err, &upstream) {
		return true
	}
	if upstream.status == 0 {
		return true
	}
	if upstream.status >= http.StatusInternalServerError {
		return true
	}
	switch upstream.status {
	case http.StatusTooManyRequests, http.StatusRequestTimeout, http.StatusBadGateway, http.StatusServiceUnavailable, http.StatusGatewayTimeout:
		return true
	default:
		return false
	}
}

func isAuthFailure(err error) bool {
	var upstream *upstreamError
	if !errors.As(err, &upstream) {
		return false
	}
	return upstream.status == http.StatusUnauthorized || upstream.status == http.StatusForbidden
}
