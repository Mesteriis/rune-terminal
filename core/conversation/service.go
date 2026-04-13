package conversation

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/Mesteriis/rune-terminal/internal/ids"
)

type persistedState struct {
	Messages  []Message `json:"messages"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Service struct {
	mu       sync.RWMutex
	path     string
	provider Provider
	state    persistedState
}

func NewService(path string, provider Provider) (*Service, error) {
	if provider == nil {
		provider = NewOllamaProvider(DefaultProviderConfig())
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, err
	}
	svc := &Service{
		path:     path,
		provider: provider,
		state: persistedState{
			Messages: []Message{},
		},
	}
	if err := svc.load(); err != nil {
		return nil, err
	}
	return svc, nil
}

func (s *Service) Snapshot() Snapshot {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return Snapshot{
		Messages:  append([]Message(nil), s.state.Messages...),
		Provider:  s.provider.Info(),
		UpdatedAt: s.state.UpdatedAt,
	}
}

func (s *Service) Submit(ctx context.Context, request SubmitRequest) (SubmitResult, error) {
	prompt := strings.TrimSpace(request.Prompt)
	systemPrompt := strings.TrimSpace(request.SystemPrompt)
	if prompt == "" {
		return SubmitResult{}, ErrInvalidPrompt
	}
	if systemPrompt == "" {
		return SubmitResult{}, ErrInvalidPrompt
	}

	userMessage := Message{
		ID:        ids.New("msg"),
		Role:      RoleUser,
		Content:   prompt,
		Status:    StatusComplete,
		CreatedAt: time.Now().UTC(),
	}

	s.mu.Lock()
	s.state.Messages = append(s.state.Messages, userMessage)
	s.state.UpdatedAt = userMessage.CreatedAt
	if err := s.persistLocked(); err != nil {
		s.mu.Unlock()
		return SubmitResult{}, err
	}
	history := append([]Message(nil), s.state.Messages...)
	s.mu.Unlock()

	result, info, providerErr := s.complete(ctx, systemPrompt, history)
	assistant := Message{
		ID:        ids.New("msg"),
		Role:      RoleAssistant,
		Provider:  info.Kind,
		Model:     info.Model,
		CreatedAt: time.Now().UTC(),
	}
	if providerErr != nil {
		assistant.Status = StatusError
		assistant.Content = strings.TrimSpace(providerErr.Error())
	} else {
		assistant.Status = StatusComplete
		assistant.Content = strings.TrimSpace(result.Content)
	}
	if assistant.Content == "" {
		assistant.Content = "The assistant returned an empty response."
		if providerErr != nil {
			assistant.Status = StatusError
		}
	}

	s.mu.Lock()
	s.state.Messages = append(s.state.Messages, assistant)
	s.state.UpdatedAt = assistant.CreatedAt
	if err := s.persistLocked(); err != nil {
		s.mu.Unlock()
		return SubmitResult{}, err
	}
	snapshot := Snapshot{
		Messages:  append([]Message(nil), s.state.Messages...),
		Provider:  info,
		UpdatedAt: s.state.UpdatedAt,
	}
	s.mu.Unlock()

	return SubmitResult{
		Snapshot:      snapshot,
		Assistant:     assistant,
		ProviderInfo:  info,
		ProviderError: errorString(providerErr),
	}, nil
}

func (s *Service) complete(ctx context.Context, systemPrompt string, history []Message) (CompletionResult, ProviderInfo, error) {
	request := CompletionRequest{
		SystemPrompt: systemPrompt,
		Messages:     make([]ChatMessage, 0, len(history)),
	}
	for _, message := range history {
		if strings.TrimSpace(message.Content) == "" {
			continue
		}
		switch message.Role {
		case RoleUser, RoleAssistant:
			request.Messages = append(request.Messages, ChatMessage{
				Role:    message.Role,
				Content: message.Content,
			})
		}
	}
	return s.provider.Complete(ctx, request)
}

func (s *Service) load() error {
	payload, err := os.ReadFile(s.path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return s.persist()
		}
		return err
	}
	var state persistedState
	if err := json.Unmarshal(payload, &state); err != nil {
		return err
	}
	if state.Messages == nil {
		state.Messages = []Message{}
	}
	s.state = state
	return nil
}

func (s *Service) persist() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.persistLocked()
}

func (s *Service) persistLocked() error {
	payload, err := json.MarshalIndent(s.state, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.path, payload, 0o600)
}

func errorString(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}
