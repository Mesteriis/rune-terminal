package conversation

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/Mesteriis/rune-terminal/internal/ids"
)

const activeConversationStateKey = "active_conversation_id"

type conversationRecord struct {
	ID         string
	Title      string
	Session    ProviderSessionState
	CreatedAt  time.Time
	UpdatedAt  time.Time
	ArchivedAt *time.Time
}

func (record conversationRecord) snapshot(messages []Message, info ProviderInfo) Snapshot {
	return Snapshot{
		ID:         record.ID,
		Title:      record.Title,
		Messages:   append([]Message(nil), messages...),
		Provider:   info,
		Session:    record.Session,
		CreatedAt:  record.CreatedAt,
		UpdatedAt:  record.UpdatedAt,
		ArchivedAt: cloneTimePointer(record.ArchivedAt),
	}
}

func (record conversationRecord) summary(messageCount int) ConversationSummary {
	return ConversationSummary{
		ID:           record.ID,
		Title:        record.Title,
		CreatedAt:    record.CreatedAt,
		UpdatedAt:    record.UpdatedAt,
		MessageCount: messageCount,
		ArchivedAt:   cloneTimePointer(record.ArchivedAt),
	}
}

func newConversationRecord(now time.Time) conversationRecord {
	return conversationRecord{
		ID:        ids.New("conv"),
		CreatedAt: now.UTC(),
		UpdatedAt: now.UTC(),
	}
}

func (s *Service) ensureBootstrappedTx(ctx context.Context, tx *sql.Tx) error {
	var count int
	if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM conversations`).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return s.ensureActiveConversationStateTx(ctx, tx)
	}

	now := time.Now().UTC()
	record := newConversationRecord(now)
	legacyState, err := s.readLegacyState()
	if err != nil {
		return err
	}
	if len(legacyState.Messages) > 0 {
		record.Title = titleFromMessages(legacyState.Messages)
		record.UpdatedAt = conversationUpdatedAt(record.CreatedAt, legacyState.UpdatedAt, legacyState.Messages)
	}
	if err := insertConversationTx(ctx, tx, record); err != nil {
		return err
	}
	if len(legacyState.Messages) > 0 {
		if err := insertConversationMessagesTx(ctx, tx, record.ID, legacyState.Messages); err != nil {
			return err
		}
	}
	return setActiveConversationTx(ctx, tx, record.ID)
}

func (s *Service) ensureActiveConversationStateTx(ctx context.Context, tx *sql.Tx) error {
	activeConversationID, err := activeConversationIDTx(ctx, tx)
	if err != nil {
		return err
	}
	if activeConversationID != "" {
		return nil
	}

	var conversationID string
	if err := tx.QueryRowContext(ctx, `
		SELECT id
		FROM conversations
		ORDER BY CASE WHEN archived_at IS NULL THEN 0 ELSE 1 END ASC,
		         COALESCE(archived_at, updated_at) DESC,
		         created_at DESC,
		         id DESC
		LIMIT 1
	`).Scan(&conversationID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil
		}
		return err
	}
	return setActiveConversationTx(ctx, tx, conversationID)
}

func (s *Service) readLegacyState() (persistedState, error) {
	state := persistedState{Messages: []Message{}}
	if strings.TrimSpace(s.legacyPath) == "" {
		return state, nil
	}

	payload, err := os.ReadFile(s.legacyPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return state, nil
		}
		return persistedState{}, err
	}
	if len(payload) == 0 {
		return state, nil
	}
	if err := json.Unmarshal(payload, &state); err != nil {
		return persistedState{}, err
	}
	if state.Messages == nil {
		state.Messages = []Message{}
	}
	return state, nil
}

func activeConversationIDTx(ctx context.Context, tx *sql.Tx) (string, error) {
	var conversationID string
	err := tx.QueryRowContext(ctx, `
		SELECT value
		FROM conversation_state
		WHERE key = ?
	`, activeConversationStateKey).Scan(&conversationID)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(conversationID), nil
}

func setActiveConversationTx(ctx context.Context, tx *sql.Tx, conversationID string) error {
	_, err := tx.ExecContext(ctx, `
		INSERT INTO conversation_state (key, value)
		VALUES (?, ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value
	`, activeConversationStateKey, strings.TrimSpace(conversationID))
	return err
}

func insertConversationTx(ctx context.Context, tx *sql.Tx, record conversationRecord) error {
	_, err := tx.ExecContext(ctx, `
		INSERT INTO conversations
			(id, title, provider_session_kind, provider_session_id, created_at, updated_at, archived_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`,
		record.ID,
		record.Title,
		record.Session.ProviderKind,
		record.Session.ID,
		formatDBTime(record.CreatedAt),
		formatDBTime(record.UpdatedAt),
		formatOptionalDBTime(record.ArchivedAt),
	)
	return err
}

func updateConversationTx(ctx context.Context, tx *sql.Tx, record conversationRecord) error {
	_, err := tx.ExecContext(ctx, `
		UPDATE conversations
		SET title = ?, provider_session_kind = ?, provider_session_id = ?, updated_at = ?, archived_at = ?
		WHERE id = ?
	`,
		record.Title,
		record.Session.ProviderKind,
		record.Session.ID,
		formatDBTime(record.UpdatedAt),
		formatOptionalDBTime(record.ArchivedAt),
		record.ID,
	)
	return err
}

func insertConversationMessagesTx(ctx context.Context, tx *sql.Tx, conversationID string, messages []Message) error {
	for _, message := range messages {
		attachmentsJSON, err := json.Marshal(cloneAttachmentReferences(message.Attachments))
		if err != nil {
			return err
		}
		_, err = tx.ExecContext(ctx, `
			INSERT INTO conversation_messages
				(id, conversation_id, role, content, attachments_json, status, provider, model, reasoning, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
			message.ID,
			conversationID,
			message.Role,
			message.Content,
			string(attachmentsJSON),
			message.Status,
			strings.TrimSpace(message.Provider),
			strings.TrimSpace(message.Model),
			strings.TrimSpace(message.Reasoning),
			formatDBTime(message.CreatedAt),
		)
		if err != nil {
			return err
		}
	}
	return nil
}

func updateConversationMessageContentTx(
	ctx context.Context,
	tx *sql.Tx,
	messageID string,
	content string,
	status MessageStatus,
	reasoning string,
	provider string,
	model string,
) error {
	_, err := tx.ExecContext(ctx, `
		UPDATE conversation_messages
		SET content = ?, status = ?, reasoning = ?, provider = ?, model = ?
		WHERE id = ?
	`,
		content,
		status,
		strings.TrimSpace(reasoning),
		strings.TrimSpace(provider),
		strings.TrimSpace(model),
		messageID,
	)
	return err
}

func loadConversationStateTx(ctx context.Context, tx *sql.Tx, conversationID string) (conversationRecord, []Message, error) {
	record, err := loadConversationRecordTx(ctx, tx, conversationID)
	if err != nil {
		return conversationRecord{}, nil, err
	}
	messages, err := loadConversationMessagesTx(ctx, tx, conversationID)
	if err != nil {
		return conversationRecord{}, nil, err
	}
	return record, messages, nil
}

func loadConversationRecordTx(ctx context.Context, tx *sql.Tx, conversationID string) (conversationRecord, error) {
	var record conversationRecord
	var createdAtRaw string
	var updatedAtRaw string
	var archivedAtRaw sql.NullString
	err := tx.QueryRowContext(ctx, `
		SELECT id, title, provider_session_kind, provider_session_id, created_at, updated_at, archived_at
		FROM conversations
		WHERE id = ?
	`, conversationID).Scan(
		&record.ID,
		&record.Title,
		&record.Session.ProviderKind,
		&record.Session.ID,
		&createdAtRaw,
		&updatedAtRaw,
		&archivedAtRaw,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return conversationRecord{}, ErrConversationNotFound
		}
		return conversationRecord{}, err
	}
	record.CreatedAt, err = parseDBTime(createdAtRaw)
	if err != nil {
		return conversationRecord{}, err
	}
	record.UpdatedAt, err = parseDBTime(updatedAtRaw)
	if err != nil {
		return conversationRecord{}, err
	}
	record.ArchivedAt, err = parseOptionalDBTime(archivedAtRaw)
	if err != nil {
		return conversationRecord{}, err
	}
	return record, nil
}

func loadConversationMessagesTx(ctx context.Context, tx *sql.Tx, conversationID string) ([]Message, error) {
	rows, err := tx.QueryContext(ctx, `
		SELECT id, role, content, attachments_json, status, provider, model, reasoning, created_at
		FROM conversation_messages
		WHERE conversation_id = ?
		ORDER BY created_at ASC, id ASC
	`, conversationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	messages := []Message{}
	for rows.Next() {
		var message Message
		var attachmentsJSON string
		var createdAtRaw string
		if err := rows.Scan(
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
			return nil, err
		}
		if strings.TrimSpace(attachmentsJSON) != "" {
			if err := json.Unmarshal([]byte(attachmentsJSON), &message.Attachments); err != nil {
				return nil, err
			}
		}
		if message.Attachments == nil {
			message.Attachments = nil
		}
		createdAt, err := parseDBTime(createdAtRaw)
		if err != nil {
			return nil, err
		}
		message.CreatedAt = createdAt
		messages = append(messages, message)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return messages, nil
}

func listConversations(ctx context.Context, dbConn *sql.DB) ([]ConversationSummary, error) {
	rows, err := dbConn.QueryContext(ctx, `
		SELECT c.id, c.title, c.created_at, c.updated_at, c.archived_at, COUNT(m.id)
		FROM conversations c
		LEFT JOIN conversation_messages m ON m.conversation_id = c.id
		GROUP BY c.id, c.title, c.created_at, c.updated_at, c.archived_at
		ORDER BY CASE WHEN c.archived_at IS NULL THEN 0 ELSE 1 END ASC,
		         COALESCE(c.archived_at, c.updated_at) DESC,
		         c.created_at DESC,
		         c.id DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	summaries := make([]ConversationSummary, 0)
	for rows.Next() {
		var summary ConversationSummary
		var createdAtRaw string
		var updatedAtRaw string
		var archivedAtRaw sql.NullString
		if err := rows.Scan(
			&summary.ID,
			&summary.Title,
			&createdAtRaw,
			&updatedAtRaw,
			&archivedAtRaw,
			&summary.MessageCount,
		); err != nil {
			return nil, err
		}
		var err error
		summary.CreatedAt, err = parseDBTime(createdAtRaw)
		if err != nil {
			return nil, err
		}
		summary.UpdatedAt, err = parseDBTime(updatedAtRaw)
		if err != nil {
			return nil, err
		}
		summary.ArchivedAt, err = parseOptionalDBTime(archivedAtRaw)
		if err != nil {
			return nil, err
		}
		summaries = append(summaries, summary)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return summaries, nil
}

func nextConversationCandidateTx(ctx context.Context, tx *sql.Tx, excludingConversationID string) (string, error) {
	var conversationID string
	err := tx.QueryRowContext(ctx, `
		SELECT id
		FROM conversations
		WHERE id <> ?
		ORDER BY CASE WHEN archived_at IS NULL THEN 0 ELSE 1 END ASC,
		         COALESCE(archived_at, updated_at) DESC,
		         created_at DESC,
		         id DESC
		LIMIT 1
	`, excludingConversationID).Scan(&conversationID)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(conversationID), nil
}

func nextUnarchivedConversationCandidateTx(ctx context.Context, tx *sql.Tx, excludingConversationID string) (string, error) {
	var conversationID string
	err := tx.QueryRowContext(ctx, `
		SELECT id
		FROM conversations
		WHERE id <> ? AND archived_at IS NULL
		ORDER BY updated_at DESC, created_at DESC, id DESC
		LIMIT 1
	`, excludingConversationID).Scan(&conversationID)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(conversationID), nil
}

func titleFromMessages(messages []Message) string {
	for _, message := range messages {
		if message.Role != RoleUser {
			continue
		}
		title := summarizeConversationTitle(message.Content)
		if title != "" {
			return title
		}
	}
	return ""
}

func summarizeConversationTitle(raw string) string {
	title := strings.TrimSpace(strings.ReplaceAll(raw, "\n", " "))
	if title == "" {
		return ""
	}
	if len(title) <= 72 {
		return title
	}
	return strings.TrimSpace(title[:69]) + "..."
}

func normalizeConversationTitle(raw string) string {
	return summarizeConversationTitle(raw)
}

func conversationUpdatedAt(createdAt time.Time, persistedUpdatedAt time.Time, messages []Message) time.Time {
	if !persistedUpdatedAt.IsZero() {
		return persistedUpdatedAt.UTC()
	}
	updatedAt := createdAt.UTC()
	for _, message := range messages {
		if message.CreatedAt.After(updatedAt) {
			updatedAt = message.CreatedAt.UTC()
		}
	}
	return updatedAt
}

func parseDBTime(raw string) (time.Time, error) {
	parsed, err := time.Parse(time.RFC3339Nano, raw)
	if err != nil {
		return time.Time{}, fmt.Errorf("parse db time %q: %w", raw, err)
	}
	return parsed.UTC(), nil
}

func formatDBTime(value time.Time) string {
	return value.UTC().Format("2006-01-02T15:04:05.000000000Z07:00")
}

func parseOptionalDBTime(raw sql.NullString) (*time.Time, error) {
	if !raw.Valid || strings.TrimSpace(raw.String) == "" {
		return nil, nil
	}
	parsed, err := parseDBTime(raw.String)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}

func formatOptionalDBTime(value *time.Time) any {
	if value == nil {
		return nil
	}
	return formatDBTime(*value)
}

func cloneTimePointer(value *time.Time) *time.Time {
	if value == nil {
		return nil
	}
	cloned := value.UTC()
	return &cloned
}
