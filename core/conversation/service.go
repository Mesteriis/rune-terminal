package conversation

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

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
	budget   historyBudget
	state    persistedState
}

type historyBudget struct {
	MaxMessages int
	MaxChars    int
}

const (
	defaultConversationMaxMessages = 24
	defaultConversationMaxChars    = 12000
)

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
		budget:   defaultHistoryBudget(),
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

	userMessage := newMessage(RoleUser, prompt, StatusComplete, "", "")

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
	return s.appendAssistantResult(result, info, providerErr)
}

func (s *Service) AppendAssistantPrompt(ctx context.Context, request AssistantPromptRequest) (SubmitResult, error) {
	prompt := strings.TrimSpace(request.Prompt)
	systemPrompt := strings.TrimSpace(request.SystemPrompt)
	if prompt == "" {
		return SubmitResult{}, ErrInvalidPrompt
	}
	if systemPrompt == "" {
		return SubmitResult{}, ErrInvalidPrompt
	}

	s.mu.RLock()
	history := append([]Message(nil), s.state.Messages...)
	s.mu.RUnlock()

	history = append(history, newMessage(RoleUser, prompt, StatusComplete, "", ""))
	result, info, providerErr := s.complete(ctx, systemPrompt, history)
	return s.appendAssistantResult(result, info, providerErr)
}

func (s *Service) AppendMessages(requests []AppendMessageRequest) (Snapshot, error) {
	if len(requests) == 0 {
		return s.Snapshot(), nil
	}

	now := time.Now().UTC()
	prepared := make([]Message, 0, len(requests))
	for _, request := range requests {
		role := MessageRole(strings.TrimSpace(string(request.Role)))
		if role == "" {
			return Snapshot{}, ErrInvalidMessage
		}
		content := strings.TrimSpace(request.Content)
		if content == "" {
			return Snapshot{}, ErrInvalidMessage
		}
		status := MessageStatus(strings.TrimSpace(string(request.Status)))
		if status == "" {
			status = StatusComplete
		}
		prepared = append(prepared, Message{
			ID:        ids.New("msg"),
			Role:      role,
			Content:   content,
			Status:    status,
			Provider:  strings.TrimSpace(request.Provider),
			Model:     strings.TrimSpace(request.Model),
			CreatedAt: now,
		})
	}

	s.mu.Lock()
	s.state.Messages = append(s.state.Messages, prepared...)
	s.state.UpdatedAt = now
	if err := s.persistLocked(); err != nil {
		s.mu.Unlock()
		return Snapshot{}, err
	}
	snapshot := s.snapshotLocked()
	s.mu.Unlock()
	return snapshot, nil
}

func (s *Service) appendAssistantResult(result CompletionResult, info ProviderInfo, providerErr error) (SubmitResult, error) {
	assistant := newMessage(RoleAssistant, "", StatusComplete, info.Kind, info.Model)
	if providerErr != nil {
		assistant.Status = StatusError
		assistant.Content = strings.TrimSpace(providerErr.Error())
	} else {
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
	snapshot := s.snapshotLocked()
	snapshot.Provider = info
	s.mu.Unlock()

	return SubmitResult{
		Snapshot:      snapshot,
		Assistant:     assistant,
		ProviderInfo:  info,
		ProviderError: errorString(providerErr),
	}, nil
}

func (s *Service) snapshotLocked() Snapshot {
	return Snapshot{
		Messages:  append([]Message(nil), s.state.Messages...),
		Provider:  s.provider.Info(),
		UpdatedAt: s.state.UpdatedAt,
	}
}

func newMessage(role MessageRole, content string, status MessageStatus, provider string, model string) Message {
	return Message{
		ID:        ids.New("msg"),
		Role:      role,
		Content:   content,
		Status:    status,
		Provider:  provider,
		Model:     model,
		CreatedAt: time.Now().UTC(),
	}
}

func (s *Service) complete(ctx context.Context, systemPrompt string, history []Message) (CompletionResult, ProviderInfo, error) {
	request := CompletionRequest{
		SystemPrompt: systemPrompt,
		Messages:     pruneCompletionHistory(history, s.budget),
	}
	return s.provider.Complete(ctx, request)
}

func defaultHistoryBudget() historyBudget {
	return historyBudget{
		MaxMessages: parsePositiveIntEnv("RTERM_CONVERSATION_MAX_MESSAGES", defaultConversationMaxMessages),
		MaxChars:    parsePositiveIntEnv("RTERM_CONVERSATION_MAX_CHARS", defaultConversationMaxChars),
	}
}

func parsePositiveIntEnv(key string, fallback int) int {
	value := strings.TrimSpace(defaultString(key, ""))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < 1 {
		return fallback
	}
	return parsed
}

func pruneCompletionHistory(history []Message, budget historyBudget) []ChatMessage {
	compact := make([]ChatMessage, 0, len(history))
	for _, message := range history {
		content := strings.TrimSpace(message.Content)
		if content == "" {
			continue
		}
		switch message.Role {
		case RoleUser, RoleAssistant:
			compact = append(compact, ChatMessage{
				Role:    message.Role,
				Content: content,
			})
		}
	}
	if len(compact) == 0 {
		return nil
	}

	maxMessages := budget.MaxMessages
	if maxMessages < 1 {
		maxMessages = len(compact)
	}
	maxChars := budget.MaxChars

	tail := make([]ChatMessage, 0, min(len(compact), maxMessages))
	totalChars := 0
	for index := len(compact) - 1; index >= 0; index-- {
		message := compact[index]
		messageChars := utf8.RuneCountInString(message.Content)
		if len(tail) >= maxMessages {
			break
		}
		if len(tail) > 0 && maxChars > 0 && totalChars+messageChars > maxChars {
			break
		}
		tail = append(tail, message)
		totalChars += messageChars
	}

	slices.Reverse(tail)
	return tail
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
