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
	return s.SnapshotWithProviderInfo(s.provider.Info())
}

func (s *Service) SnapshotWithProviderInfo(info ProviderInfo) Snapshot {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return Snapshot{
		Messages:  append([]Message(nil), s.state.Messages...),
		Provider:  info,
		UpdatedAt: s.state.UpdatedAt,
	}
}

func (s *Service) Submit(ctx context.Context, request SubmitRequest) (SubmitResult, error) {
	return s.SubmitWithProvider(ctx, s.provider, request)
}

func (s *Service) SubmitWithProvider(ctx context.Context, provider Provider, request SubmitRequest) (SubmitResult, error) {
	prompt := strings.TrimSpace(request.Prompt)
	providerPrompt := strings.TrimSpace(request.ProviderPrompt)
	systemPrompt := strings.TrimSpace(request.SystemPrompt)
	if prompt == "" {
		return SubmitResult{}, ErrInvalidPrompt
	}
	if providerPrompt == "" {
		providerPrompt = prompt
	}
	if systemPrompt == "" {
		return SubmitResult{}, ErrInvalidPrompt
	}

	userMessage := newMessage(RoleUser, prompt, request.Attachments, StatusComplete, "", "")

	s.mu.Lock()
	s.state.Messages = append(s.state.Messages, userMessage)
	s.state.UpdatedAt = userMessage.CreatedAt
	if err := s.persistLocked(); err != nil {
		s.mu.Unlock()
		return SubmitResult{}, err
	}
	history := append([]Message(nil), s.state.Messages...)
	s.mu.Unlock()

	historyForCompletion := append([]Message(nil), history...)
	if len(historyForCompletion) > 0 {
		historyForCompletion[len(historyForCompletion)-1].Content = providerPrompt
	}

	result, info, providerErr := s.completeWithProvider(provider, ctx, systemPrompt, historyForCompletion)
	return s.appendAssistantResult(result, info, providerErr)
}

func (s *Service) SubmitStream(
	ctx context.Context,
	request SubmitRequest,
	emit func(StreamEvent) error,
) (SubmitResult, error) {
	return s.SubmitStreamWithProvider(ctx, s.provider, request, emit)
}

func (s *Service) SubmitStreamWithProvider(
	ctx context.Context,
	provider Provider,
	request SubmitRequest,
	emit func(StreamEvent) error,
) (SubmitResult, error) {
	prompt := strings.TrimSpace(request.Prompt)
	providerPrompt := strings.TrimSpace(request.ProviderPrompt)
	systemPrompt := strings.TrimSpace(request.SystemPrompt)
	if prompt == "" {
		return SubmitResult{}, ErrInvalidPrompt
	}
	if providerPrompt == "" {
		providerPrompt = prompt
	}
	if systemPrompt == "" {
		return SubmitResult{}, ErrInvalidPrompt
	}
	if provider == nil {
		provider = s.provider
	}

	userMessage := newMessage(RoleUser, prompt, request.Attachments, StatusComplete, "", "")
	info := provider.Info()
	assistant := newMessage(RoleAssistant, "", nil, StatusStreaming, info.Kind, info.Model)

	s.mu.Lock()
	s.state.Messages = append(s.state.Messages, userMessage, assistant)
	s.state.UpdatedAt = assistant.CreatedAt
	if err := s.persistLocked(); err != nil {
		s.mu.Unlock()
		return SubmitResult{}, err
	}
	history := append([]Message(nil), s.state.Messages[:len(s.state.Messages)-1]...)
	s.mu.Unlock()

	if emit != nil {
		startMessage := assistant
		if err := emit(StreamEvent{
			Type:      StreamEventMessageStart,
			MessageID: assistant.ID,
			Message:   &startMessage,
		}); err != nil {
			return s.finalizeAssistantStreamResult(assistant.ID, CompletionResult{}, info, err, nil)
		}
	}

	historyForCompletion := append([]Message(nil), history...)
	if len(historyForCompletion) > 0 {
		historyForCompletion[len(historyForCompletion)-1].Content = providerPrompt
	}

	result, finalInfo, providerErr := s.completeStreamWithProvider(provider, ctx, systemPrompt, historyForCompletion, func(delta string) error {
		if delta == "" {
			return nil
		}
		if err := s.appendAssistantDelta(assistant.ID, delta); err != nil {
			return err
		}
		if emit != nil {
			return emit(StreamEvent{
				Type:      StreamEventTextDelta,
				MessageID: assistant.ID,
				Delta:     delta,
			})
		}
		return nil
	})

	return s.finalizeAssistantStreamResult(assistant.ID, result, finalInfo, providerErr, emit)
}

func (s *Service) AppendAssistantPrompt(ctx context.Context, request AssistantPromptRequest) (SubmitResult, error) {
	return s.AppendAssistantPromptWithProvider(ctx, s.provider, request)
}

func (s *Service) AppendAssistantPromptWithProvider(
	ctx context.Context,
	provider Provider,
	request AssistantPromptRequest,
) (SubmitResult, error) {
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

	history = append(history, newMessage(RoleUser, prompt, nil, StatusComplete, "", ""))
	result, info, providerErr := s.completeWithProvider(provider, ctx, systemPrompt, history)
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
			ID:          ids.New("msg"),
			Role:        role,
			Content:     content,
			Attachments: cloneAttachmentReferences(request.Attachments),
			Status:      status,
			Provider:    strings.TrimSpace(request.Provider),
			Model:       strings.TrimSpace(request.Model),
			CreatedAt:   now,
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
	assistant := newMessage(RoleAssistant, "", nil, StatusComplete, info.Kind, info.Model)
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
	snapshot := s.snapshotLockedWithProviderInfo(info)
	s.mu.Unlock()

	return SubmitResult{
		Snapshot:      snapshot,
		Assistant:     assistant,
		ProviderInfo:  info,
		ProviderError: errorString(providerErr),
	}, nil
}

func (s *Service) snapshotLocked() Snapshot {
	return s.snapshotLockedWithProviderInfo(s.provider.Info())
}

func (s *Service) snapshotLockedWithProviderInfo(info ProviderInfo) Snapshot {
	return Snapshot{
		Messages:  append([]Message(nil), s.state.Messages...),
		Provider:  info,
		UpdatedAt: s.state.UpdatedAt,
	}
}

func newMessage(
	role MessageRole,
	content string,
	attachments []AttachmentReference,
	status MessageStatus,
	provider string,
	model string,
) Message {
	return Message{
		ID:          ids.New("msg"),
		Role:        role,
		Content:     content,
		Attachments: cloneAttachmentReferences(attachments),
		Status:      status,
		Provider:    provider,
		Model:       model,
		CreatedAt:   time.Now().UTC(),
	}
}

func cloneAttachmentReferences(attachments []AttachmentReference) []AttachmentReference {
	if len(attachments) == 0 {
		return nil
	}
	return append([]AttachmentReference(nil), attachments...)
}

func (s *Service) complete(ctx context.Context, systemPrompt string, history []Message) (CompletionResult, ProviderInfo, error) {
	return s.completeWithProvider(s.provider, ctx, systemPrompt, history)
}

func (s *Service) completeWithProvider(
	provider Provider,
	ctx context.Context,
	systemPrompt string,
	history []Message,
) (CompletionResult, ProviderInfo, error) {
	if provider == nil {
		provider = s.provider
	}
	request := CompletionRequest{
		SystemPrompt: systemPrompt,
		Messages:     pruneCompletionHistory(history, s.budget),
	}
	return provider.Complete(ctx, request)
}

func (s *Service) completeStream(
	ctx context.Context,
	systemPrompt string,
	history []Message,
	onTextDelta func(string) error,
) (CompletionResult, ProviderInfo, error) {
	return s.completeStreamWithProvider(s.provider, ctx, systemPrompt, history, onTextDelta)
}

func (s *Service) completeStreamWithProvider(
	provider Provider,
	ctx context.Context,
	systemPrompt string,
	history []Message,
	onTextDelta func(string) error,
) (CompletionResult, ProviderInfo, error) {
	if provider == nil {
		provider = s.provider
	}
	request := CompletionRequest{
		SystemPrompt: systemPrompt,
		Messages:     pruneCompletionHistory(history, s.budget),
	}
	return provider.CompleteStream(ctx, request, onTextDelta)
}

func (s *Service) appendAssistantDelta(messageID string, delta string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	index := s.messageIndexLocked(messageID)
	if index < 0 {
		return ErrInvalidMessage
	}
	s.state.Messages[index].Content += delta
	s.state.UpdatedAt = time.Now().UTC()
	return s.persistLocked()
}

func (s *Service) finalizeAssistantStreamResult(
	messageID string,
	result CompletionResult,
	info ProviderInfo,
	providerErr error,
	emit func(StreamEvent) error,
) (SubmitResult, error) {
	s.mu.Lock()
	index := s.messageIndexLocked(messageID)
	if index < 0 {
		s.mu.Unlock()
		return SubmitResult{}, ErrInvalidMessage
	}
	assistant := s.state.Messages[index]
	assistant.Provider = info.Kind
	assistant.Model = info.Model
	assistant.Status = StatusComplete

	currentContent := strings.TrimSpace(assistant.Content)
	switch {
	case providerErr != nil:
		assistant.Status = StatusError
		if currentContent == "" {
			assistant.Content = strings.TrimSpace(providerErr.Error())
		}
	case strings.TrimSpace(result.Content) != "":
		assistant.Content = strings.TrimSpace(result.Content)
	case currentContent == "":
		assistant.Content = "The assistant returned an empty response."
	}
	if assistant.Content == "" {
		assistant.Content = "The assistant returned an empty response."
		if providerErr != nil {
			assistant.Status = StatusError
		}
	}

	s.state.Messages[index] = assistant
	s.state.UpdatedAt = time.Now().UTC()
	if err := s.persistLocked(); err != nil {
		s.mu.Unlock()
		return SubmitResult{}, err
	}
	snapshot := s.snapshotLockedWithProviderInfo(info)
	s.mu.Unlock()

	if emit != nil {
		eventType := StreamEventMessageComplete
		if providerErr != nil {
			eventType = StreamEventError
		}
		finalMessage := assistant
		if err := emit(StreamEvent{
			Type:      eventType,
			MessageID: assistant.ID,
			Message:   &finalMessage,
			Error:     errorString(providerErr),
		}); err != nil {
			return SubmitResult{}, err
		}
	}

	return SubmitResult{
		Snapshot:      snapshot,
		Assistant:     assistant,
		ProviderInfo:  info,
		ProviderError: errorString(providerErr),
	}, nil
}

func (s *Service) messageIndexLocked(messageID string) int {
	for index := range s.state.Messages {
		if s.state.Messages[index].ID == messageID {
			return index
		}
	}
	return -1
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
