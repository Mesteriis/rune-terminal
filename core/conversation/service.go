package conversation

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	coredb "github.com/Mesteriis/rune-terminal/core/db"
	"github.com/Mesteriis/rune-terminal/internal/ids"
)

type persistedState struct {
	Messages  []Message `json:"messages"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Service struct {
	mu         sync.RWMutex
	db         *sql.DB
	legacyPath string
	provider   Provider
	budget     historyBudget
	active     conversationRecord
	state      persistedState
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
	databasePath := filepath.Join(filepath.Dir(path), "runtime.db")
	dbConn, err := coredb.Open(context.Background(), databasePath)
	if err != nil {
		return nil, err
	}
	return NewServiceWithDB(dbConn, path, provider)
}

func NewServiceWithDB(dbConn *sql.DB, legacyPath string, provider Provider) (*Service, error) {
	if provider == nil {
		provider = NewCodexCLIProvider(CodexCLIProviderConfig{})
	}
	svc := &Service{
		db:         dbConn,
		legacyPath: strings.TrimSpace(legacyPath),
		provider:   provider,
		budget:     defaultHistoryBudget(),
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
	return s.snapshotLockedWithProviderInfo(info)
}

func (s *Service) ActiveConversationID() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.active.ID
}

func (s *Service) ListConversations(ctx context.Context) ([]ConversationSummary, string, error) {
	summaries, err := listConversations(ctx, s.db)
	if err != nil {
		return nil, "", err
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	return summaries, s.active.ID, nil
}

func (s *Service) CreateConversation(ctx context.Context) (Snapshot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	record := newConversationRecord(time.Now().UTC())
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return Snapshot{}, err
	}
	defer func() {
		_ = tx.Rollback()
	}()
	if err := insertConversationTx(ctx, tx, record); err != nil {
		return Snapshot{}, err
	}
	if err := setActiveConversationTx(ctx, tx, record.ID); err != nil {
		return Snapshot{}, err
	}
	if err := tx.Commit(); err != nil {
		return Snapshot{}, err
	}

	s.active = record
	s.state = persistedState{Messages: []Message{}, UpdatedAt: record.UpdatedAt}
	return s.snapshotLocked(), nil
}

func (s *Service) ActivateConversation(ctx context.Context, conversationID string) (Snapshot, error) {
	conversationID = strings.TrimSpace(conversationID)
	if conversationID == "" {
		return Snapshot{}, ErrConversationNotFound
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return Snapshot{}, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	record, messages, err := loadConversationStateTx(ctx, tx, conversationID)
	if err != nil {
		return Snapshot{}, err
	}
	if err := setActiveConversationTx(ctx, tx, conversationID); err != nil {
		return Snapshot{}, err
	}
	if err := tx.Commit(); err != nil {
		return Snapshot{}, err
	}

	s.active = record
	s.state = persistedState{
		Messages:  append([]Message(nil), messages...),
		UpdatedAt: record.UpdatedAt,
	}
	return s.snapshotLocked(), nil
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

	userMessage := newMessage(RoleUser, prompt, request.Attachments, StatusComplete, "", "", "")
	conversationID, history, storedSession, err := s.appendMessagesForConversation(
		ctx,
		s.ActiveConversationID(),
		[]Message{userMessage},
		false,
	)
	if err != nil {
		return SubmitResult{}, err
	}
	session := storedSession
	if session != nil && strings.TrimSpace(session.ProviderKind) != strings.TrimSpace(provider.Info().Kind) {
		session = nil
	}

	historyForCompletion := append([]Message(nil), history...)
	if len(historyForCompletion) > 0 {
		historyForCompletion[len(historyForCompletion)-1].Content = providerPrompt
	}

	result, info, providerErr := s.completeWithProvider(
		provider,
		ctx,
		systemPrompt,
		historyForCompletion,
		request.Model,
		session,
	)
	return s.appendAssistantResult(conversationID, result, info, providerErr, true)
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

	info := provider.Info()
	if model := strings.TrimSpace(request.Model); model != "" {
		info.Model = model
	}
	userMessage := newMessage(RoleUser, prompt, request.Attachments, StatusComplete, "", "", "")
	assistant := newMessage(RoleAssistant, "", nil, StatusStreaming, info.Kind, info.Model, "")

	conversationID, history, storedSession, err := s.appendMessagesForConversation(
		ctx,
		s.ActiveConversationID(),
		[]Message{userMessage, assistant},
		false,
	)
	if err != nil {
		return SubmitResult{}, err
	}
	session := storedSession
	if session != nil && strings.TrimSpace(session.ProviderKind) != strings.TrimSpace(info.Kind) {
		session = nil
	}

	if emit != nil {
		startMessage := assistant
		if err := emit(StreamEvent{
			Type:      StreamEventMessageStart,
			MessageID: assistant.ID,
			Message:   &startMessage,
		}); err != nil {
			return s.finalizeAssistantStreamResult(conversationID, assistant.ID, CompletionResult{}, info, err, nil, true)
		}
	}

	historyForCompletion := append([]Message(nil), history[:len(history)-1]...)
	if len(historyForCompletion) > 0 {
		historyForCompletion[len(historyForCompletion)-1].Content = providerPrompt
	}

	result, finalInfo, providerErr := s.completeStreamWithProvider(
		provider,
		ctx,
		systemPrompt,
		historyForCompletion,
		request.Model,
		session,
		func(delta string) error {
			if delta == "" {
				return nil
			}
			if err := s.appendAssistantDelta(ctx, conversationID, assistant.ID, delta); err != nil {
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
		},
	)

	return s.finalizeAssistantStreamResult(conversationID, assistant.ID, result, finalInfo, providerErr, emit, true)
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
	conversationID := s.active.ID
	history := append([]Message(nil), s.state.Messages...)
	s.mu.RUnlock()

	history = append(history, newMessage(RoleUser, prompt, nil, StatusComplete, "", "", ""))
	result, info, providerErr := s.completeWithProvider(provider, ctx, systemPrompt, history, "", nil)
	return s.appendAssistantResult(conversationID, result, info, providerErr, false)
}

func (s *Service) AppendMessages(requests []AppendMessageRequest) (Snapshot, error) {
	if len(requests) == 0 {
		return s.Snapshot(), nil
	}

	prepared := make([]Message, 0, len(requests))
	for index, request := range requests {
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
		createdAt := time.Now().UTC().Add(time.Duration(index) * time.Nanosecond)
		prepared = append(prepared, Message{
			ID:          newMessageID(),
			Role:        role,
			Content:     content,
			Attachments: cloneAttachmentReferences(request.Attachments),
			Status:      status,
			Provider:    strings.TrimSpace(request.Provider),
			Model:       strings.TrimSpace(request.Model),
			CreatedAt:   createdAt,
		})
	}

	_, _, _, err := s.appendMessagesForConversation(context.Background(), s.ActiveConversationID(), prepared, false)
	if err != nil {
		return Snapshot{}, err
	}
	return s.Snapshot(), nil
}

func (s *Service) appendAssistantResult(
	conversationID string,
	result CompletionResult,
	info ProviderInfo,
	providerErr error,
	allowSessionUpdate bool,
) (SubmitResult, error) {
	assistant := newMessage(
		RoleAssistant,
		"",
		nil,
		StatusComplete,
		info.Kind,
		info.Model,
		reasoningFromResult(result, info),
	)
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

	snapshot, _, err := s.appendAssistantMessageForConversation(
		context.Background(),
		conversationID,
		assistant,
		result.Session,
		info.Kind,
		allowSessionUpdate,
	)
	if err != nil {
		return SubmitResult{}, err
	}

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
	return s.active.snapshot(s.state.Messages, info)
}

func newMessage(
	role MessageRole,
	content string,
	attachments []AttachmentReference,
	status MessageStatus,
	provider string,
	model string,
	reasoning string,
) Message {
	return Message{
		ID:          newMessageID(),
		Role:        role,
		Content:     content,
		Attachments: cloneAttachmentReferences(attachments),
		Status:      status,
		Provider:    provider,
		Model:       model,
		Reasoning:   strings.TrimSpace(reasoning),
		CreatedAt:   time.Now().UTC(),
	}
}

func newMessageID() string {
	return ids.New("msg")
}

func reasoningFromResult(result CompletionResult, info ProviderInfo) string {
	reasoning := strings.TrimSpace(result.Reasoning)
	if reasoning != "" {
		return reasoning
	}
	if info.Kind == "" && strings.TrimSpace(info.Model) == "" {
		return ""
	}
	parts := []string{}
	if strings.TrimSpace(info.Kind) != "" {
		parts = append(parts, "provider: "+strings.TrimSpace(info.Kind))
	}
	if strings.TrimSpace(info.Model) != "" {
		parts = append(parts, "model: "+strings.TrimSpace(info.Model))
	}
	return strings.Join(parts, ", ")
}

func cloneAttachmentReferences(attachments []AttachmentReference) []AttachmentReference {
	if len(attachments) == 0 {
		return nil
	}
	return append([]AttachmentReference(nil), attachments...)
}

func (s *Service) complete(ctx context.Context, systemPrompt string, history []Message) (CompletionResult, ProviderInfo, error) {
	return s.completeWithProvider(s.provider, ctx, systemPrompt, history, "", nil)
}

func (s *Service) completeWithProvider(
	provider Provider,
	ctx context.Context,
	systemPrompt string,
	history []Message,
	model string,
	session *ProviderSessionState,
) (CompletionResult, ProviderInfo, error) {
	if provider == nil {
		provider = s.provider
	}
	request := CompletionRequest{
		SystemPrompt: systemPrompt,
		Model:        strings.TrimSpace(model),
		Messages:     pruneCompletionHistory(history, s.budget),
		Session:      cloneSessionState(session),
	}
	return provider.Complete(ctx, request)
}

func (s *Service) completeStream(
	ctx context.Context,
	systemPrompt string,
	history []Message,
	onTextDelta func(string) error,
) (CompletionResult, ProviderInfo, error) {
	return s.completeStreamWithProvider(s.provider, ctx, systemPrompt, history, "", nil, onTextDelta)
}

func (s *Service) completeStreamWithProvider(
	provider Provider,
	ctx context.Context,
	systemPrompt string,
	history []Message,
	model string,
	session *ProviderSessionState,
	onTextDelta func(string) error,
) (CompletionResult, ProviderInfo, error) {
	if provider == nil {
		provider = s.provider
	}
	request := CompletionRequest{
		SystemPrompt: systemPrompt,
		Model:        strings.TrimSpace(model),
		Messages:     pruneCompletionHistory(history, s.budget),
		Session:      cloneSessionState(session),
	}
	return provider.CompleteStream(ctx, request, onTextDelta)
}

func (s *Service) appendAssistantDelta(ctx context.Context, conversationID string, messageID string, delta string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	var content string
	if s.active.ID == conversationID {
		index := s.messageIndexLocked(messageID)
		if index >= 0 {
			s.state.Messages[index].Content += delta
			content = s.state.Messages[index].Content
		}
	}
	if content == "" {
		content, err = conversationMessageContentTx(ctx, tx, messageID)
		if err != nil {
			return err
		}
		content += delta
	}
	if err := updateConversationMessageContentTx(ctx, tx, messageID, content, StatusStreaming, "", "", ""); err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return err
	}

	if s.active.ID == conversationID {
		s.state.UpdatedAt = time.Now().UTC()
	}
	return nil
}

func (s *Service) finalizeAssistantStreamResult(
	conversationID string,
	messageID string,
	result CompletionResult,
	info ProviderInfo,
	providerErr error,
	emit func(StreamEvent) error,
	allowSessionUpdate bool,
) (SubmitResult, error) {
	s.mu.Lock()

	var assistant Message
	if s.active.ID == conversationID {
		index := s.messageIndexLocked(messageID)
		if index < 0 {
			s.mu.Unlock()
			return SubmitResult{}, ErrInvalidMessage
		}
		assistant = s.state.Messages[index]
	} else {
		var err error
		assistant, err = s.loadMessageByIDLocked(context.Background(), messageID)
		if err != nil {
			s.mu.Unlock()
			return SubmitResult{}, err
		}
	}

	assistant.Provider = info.Kind
	assistant.Model = info.Model
	assistant.Status = StatusComplete
	assistant.Reasoning = reasoningFromResult(result, info)

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

	nextSession := nextProviderSessionState(s.active.Session, info.Kind, result.Session, allowSessionUpdate)
	snapshot, err := s.persistAssistantFinalizationLocked(context.Background(), conversationID, assistant, nextSession)
	s.mu.Unlock()
	if err != nil {
		return SubmitResult{}, err
	}

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
	s.mu.Lock()
	defer s.mu.Unlock()

	tx, err := s.db.BeginTx(context.Background(), nil)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback()
	}()
	if err := s.ensureBootstrappedTx(context.Background(), tx); err != nil {
		return err
	}
	activeConversationID, err := activeConversationIDTx(context.Background(), tx)
	if err != nil {
		return err
	}
	record, messages, err := loadConversationStateTx(context.Background(), tx, activeConversationID)
	if err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return err
	}

	s.active = record
	s.state = persistedState{
		Messages:  append([]Message(nil), messages...),
		UpdatedAt: record.UpdatedAt,
	}
	return nil
}

func (s *Service) appendMessagesForConversation(
	ctx context.Context,
	conversationID string,
	messages []Message,
	allowSessionReset bool,
) (string, []Message, *ProviderSessionState, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	conversationID = strings.TrimSpace(conversationID)
	if conversationID == "" {
		return "", nil, nil, ErrConversationNotFound
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return "", nil, nil, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	record, persistedMessages, err := loadConversationStateTx(ctx, tx, conversationID)
	if err != nil {
		return "", nil, nil, err
	}
	if err := insertConversationMessagesTx(ctx, tx, conversationID, messages); err != nil {
		return "", nil, nil, err
	}

	record.UpdatedAt = messages[len(messages)-1].CreatedAt.UTC()
	if record.Title == "" {
		record.Title = titleFromMessages(messages)
	}
	if allowSessionReset {
		record.Session = ProviderSessionState{}
	}
	if err := updateConversationTx(ctx, tx, record); err != nil {
		return "", nil, nil, err
	}
	if err := tx.Commit(); err != nil {
		return "", nil, nil, err
	}

	persistedMessages = append(persistedMessages, messages...)
	if s.active.ID == conversationID {
		s.active = record
		s.state.Messages = append([]Message(nil), persistedMessages...)
		s.state.UpdatedAt = record.UpdatedAt
	}
	return conversationID, persistedMessages, cloneSessionState(sessionForProvider(record.Session, record.Session.ProviderKind)), nil
}

func (s *Service) appendAssistantMessageForConversation(
	ctx context.Context,
	conversationID string,
	assistant Message,
	resultSession *ProviderSessionState,
	providerKind string,
	allowSessionUpdate bool,
) (Snapshot, ProviderSessionState, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	nextSession := nextProviderSessionState(s.active.Session, providerKind, resultSession, allowSessionUpdate)
	snapshot, err := s.persistAssistantFinalizationLocked(ctx, conversationID, assistant, nextSession)
	if err != nil {
		return Snapshot{}, ProviderSessionState{}, err
	}
	return snapshot, nextSession, nil
}

func (s *Service) persistAssistantFinalizationLocked(
	ctx context.Context,
	conversationID string,
	assistant Message,
	nextSession ProviderSessionState,
) (Snapshot, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return Snapshot{}, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	record, persistedMessages, err := loadConversationStateTx(ctx, tx, conversationID)
	if err != nil {
		return Snapshot{}, err
	}

	existingIndex := -1
	for index := range persistedMessages {
		if persistedMessages[index].ID == assistant.ID {
			existingIndex = index
			break
		}
	}
	if existingIndex >= 0 {
		persistedMessages[existingIndex] = assistant
		if err := updateConversationMessageContentTx(
			ctx,
			tx,
			assistant.ID,
			assistant.Content,
			assistant.Status,
			assistant.Reasoning,
			assistant.Provider,
			assistant.Model,
		); err != nil {
			return Snapshot{}, err
		}
	} else {
		if err := insertConversationMessagesTx(ctx, tx, conversationID, []Message{assistant}); err != nil {
			return Snapshot{}, err
		}
		persistedMessages = append(persistedMessages, assistant)
	}

	record.Session = nextSession
	record.UpdatedAt = assistant.CreatedAt.UTC()
	if err := updateConversationTx(ctx, tx, record); err != nil {
		return Snapshot{}, err
	}
	if err := tx.Commit(); err != nil {
		return Snapshot{}, err
	}

	if s.active.ID == conversationID {
		s.active = record
		s.state.Messages = append([]Message(nil), persistedMessages...)
		s.state.UpdatedAt = record.UpdatedAt
		return s.snapshotLocked(), nil
	}
	return record.snapshot(persistedMessages, s.provider.Info()), nil
}

func (s *Service) loadMessageByIDLocked(ctx context.Context, messageID string) (Message, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, role, content, attachments_json, status, provider, model, reasoning, created_at
		FROM conversation_messages
		WHERE id = ?
	`, messageID)
	var message Message
	var attachmentsJSON string
	var createdAtRaw string
	if err := row.Scan(
		&message.ID,
		&message.Role,
		&message.Content,
		&attachmentsJSON,
		&message.Status,
		&message.Provider,
		&message.Model,
		&message.Reasoning,
		&createdAtRaw,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Message{}, ErrInvalidMessage
		}
		return Message{}, err
	}
	if strings.TrimSpace(attachmentsJSON) != "" {
		if err := json.Unmarshal([]byte(attachmentsJSON), &message.Attachments); err != nil {
			return Message{}, err
		}
	}
	createdAt, err := parseDBTime(createdAtRaw)
	if err != nil {
		return Message{}, err
	}
	message.CreatedAt = createdAt
	return message, nil
}

func conversationMessageContentTx(ctx context.Context, tx *sql.Tx, messageID string) (string, error) {
	var content string
	err := tx.QueryRowContext(ctx, `
		SELECT content
		FROM conversation_messages
		WHERE id = ?
	`, messageID).Scan(&content)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrInvalidMessage
	}
	return content, err
}

func sessionForProvider(session ProviderSessionState, providerKind string) *ProviderSessionState {
	session = normalizeProviderSession(session)
	providerKind = strings.TrimSpace(providerKind)
	if session.ID == "" {
		return nil
	}
	if providerKind != "" && session.ProviderKind != providerKind {
		return nil
	}
	copy := session
	return &copy
}

func normalizeProviderSession(session ProviderSessionState) ProviderSessionState {
	session.ProviderKind = strings.TrimSpace(session.ProviderKind)
	session.ID = strings.TrimSpace(session.ID)
	if session.ProviderKind == "" || session.ID == "" {
		return ProviderSessionState{}
	}
	return session
}

func nextProviderSessionState(
	current ProviderSessionState,
	providerKind string,
	resultSession *ProviderSessionState,
	allowSessionUpdate bool,
) ProviderSessionState {
	current = normalizeProviderSession(current)
	providerKind = strings.TrimSpace(providerKind)
	if !allowSessionUpdate {
		return current
	}
	if current.ProviderKind != "" && current.ProviderKind != providerKind {
		current = ProviderSessionState{}
	}
	if resultSession != nil {
		next := normalizeProviderSession(*resultSession)
		if next.ProviderKind == "" {
			next.ProviderKind = providerKind
		}
		next = normalizeProviderSession(next)
		if next.ID != "" {
			return next
		}
	}
	if current.ProviderKind == providerKind {
		return current
	}
	return ProviderSessionState{}
}

func cloneSessionState(session *ProviderSessionState) *ProviderSessionState {
	if session == nil {
		return nil
	}
	copy := *session
	return &copy
}

func errorString(err error) string {
	if err == nil {
		return ""
	}
	return strings.TrimSpace(err.Error())
}
