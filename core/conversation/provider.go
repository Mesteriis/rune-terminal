package conversation

import (
	"context"
	"fmt"
	"os"
	"strings"
	"sync"
)

type Provider interface {
	Info() ProviderInfo
	Complete(ctx context.Context, request CompletionRequest) (CompletionResult, ProviderInfo, error)
	CompleteStream(ctx context.Context, request CompletionRequest, onTextDelta func(string) error) (CompletionResult, ProviderInfo, error)
}

type providerRuntime struct {
	mu    sync.RWMutex
	model string
}

func (p *providerRuntime) selectedModel() string {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.model
}

func (p *providerRuntime) setSelectedModel(model string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.model = model
}

func defaultString(key string, fallback string) string {
	if value := strings.TrimSpace(strings.TrimSpace(getenv(key))); value != "" {
		return value
	}
	return fallback
}

var getenv = os.Getenv

func validateCompletionRequest(request CompletionRequest) error {
	if strings.TrimSpace(request.SystemPrompt) == "" {
		return fmt.Errorf("%w: system prompt is required", ErrInvalidPrompt)
	}
	if len(request.Messages) == 0 {
		return fmt.Errorf("%w: at least one message is required", ErrInvalidPrompt)
	}
	last := request.Messages[len(request.Messages)-1]
	if last.Role != RoleUser || strings.TrimSpace(last.Content) == "" {
		return fmt.Errorf("%w: last message must be a non-empty user prompt", ErrInvalidPrompt)
	}
	return nil
}
