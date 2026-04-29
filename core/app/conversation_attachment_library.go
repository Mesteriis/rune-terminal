package app

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/Mesteriis/rune-terminal/core/audit"
	"github.com/Mesteriis/rune-terminal/core/conversation"
)

func (r *Runtime) storeAttachmentReference(
	ctx context.Context,
	reference conversation.AttachmentReference,
	workspaceID string,
	actionSource string,
) error {
	if r.DB == nil {
		return nil
	}
	if strings.TrimSpace(reference.ID) == "" {
		return errors.New("attachment id is required")
	}

	_, err := r.DB.ExecContext(
		ctx,
		`
		INSERT INTO agent_attachment_references (
			id, name, path, mime_type, size, modified_time, workspace_id, action_source, created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			name = excluded.name,
			path = excluded.path,
			mime_type = excluded.mime_type,
			size = excluded.size,
			modified_time = excluded.modified_time,
			workspace_id = excluded.workspace_id,
			action_source = excluded.action_source
		`,
		reference.ID,
		reference.Name,
		reference.Path,
		reference.MimeType,
		reference.Size,
		reference.ModifiedTime,
		strings.TrimSpace(workspaceID),
		strings.TrimSpace(actionSource),
		time.Now().UTC().Format(time.RFC3339Nano),
	)
	return err
}

func (r *Runtime) ListAttachmentReferences(ctx context.Context, limit int) ([]conversation.AttachmentReference, error) {
	if r.DB == nil {
		return []conversation.AttachmentReference{}, nil
	}
	if limit < 1 {
		limit = 12
	}

	rows, err := r.DB.QueryContext(
		ctx,
		`
		SELECT id, name, path, mime_type, size, modified_time
		FROM agent_attachment_references
		ORDER BY created_at DESC
		LIMIT ?
		`,
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	attachments := make([]conversation.AttachmentReference, 0, limit)
	for rows.Next() {
		var attachment conversation.AttachmentReference
		if err := rows.Scan(
			&attachment.ID,
			&attachment.Name,
			&attachment.Path,
			&attachment.MimeType,
			&attachment.Size,
			&attachment.ModifiedTime,
		); err != nil {
			return nil, err
		}
		attachments = append(attachments, attachment)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return attachments, nil
}

func (r *Runtime) DeleteAttachmentReference(ctx context.Context, attachmentID string) error {
	return r.deleteAttachmentReference(ctx, attachmentID)
}

func (r *Runtime) deleteAttachmentReference(ctx context.Context, attachmentID string) (err error) {
	attachmentID = strings.TrimSpace(attachmentID)
	var (
		workspaceID   string
		actionSource  string
		affectedPaths []string
	)
	defer func() {
		r.appendDeleteAttachmentReferenceAudit(attachmentID, workspaceID, actionSource, affectedPaths, err)
	}()

	if r.DB == nil {
		return conversation.ErrAttachmentNotFound
	}
	if attachmentID == "" {
		return conversation.ErrAttachmentNotFound
	}

	storedReference, err := r.loadAttachmentReferenceForDelete(ctx, attachmentID)
	if err != nil {
		return err
	}
	workspaceID = storedReference.workspaceID
	actionSource = storedReference.actionSource
	affectedPaths = []string{storedReference.attachment.Path}

	result, err := r.DB.ExecContext(
		ctx,
		`DELETE FROM agent_attachment_references WHERE id = ?`,
		attachmentID,
	)
	if err != nil {
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected < 1 {
		return conversation.ErrAttachmentNotFound
	}
	return nil
}

type storedAttachmentReference struct {
	attachment   conversation.AttachmentReference
	workspaceID  string
	actionSource string
}

func (r *Runtime) loadAttachmentReferenceForDelete(
	ctx context.Context,
	attachmentID string,
) (storedAttachmentReference, error) {
	var stored storedAttachmentReference
	err := r.DB.QueryRowContext(
		ctx,
		`
		SELECT id, name, path, mime_type, size, modified_time, workspace_id, action_source
		FROM agent_attachment_references
		WHERE id = ?
		`,
		attachmentID,
	).Scan(
		&stored.attachment.ID,
		&stored.attachment.Name,
		&stored.attachment.Path,
		&stored.attachment.MimeType,
		&stored.attachment.Size,
		&stored.attachment.ModifiedTime,
		&stored.workspaceID,
		&stored.actionSource,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return storedAttachmentReference{}, conversation.ErrAttachmentNotFound
		}
		return storedAttachmentReference{}, err
	}
	return stored, nil
}

func (r *Runtime) appendDeleteAttachmentReferenceAudit(
	attachmentID string,
	workspaceID string,
	actionSource string,
	affectedPaths []string,
	err error,
) {
	if r == nil || r.Audit == nil {
		return
	}
	summaryID := trimSummary(strings.TrimSpace(attachmentID))
	if summaryID == "" {
		summaryID = "unknown"
	}
	_ = r.Audit.Append(audit.Event{
		ToolName:      "agent.attachment_reference.delete",
		Summary:       fmt.Sprintf("delete attachment reference: %s", summaryID),
		WorkspaceID:   strings.TrimSpace(workspaceID),
		ActionSource:  firstNonEmpty(strings.TrimSpace(actionSource), "http.agent.conversation"),
		Success:       err == nil,
		Error:         errorString(err),
		AffectedPaths: normalizeFSAuditPaths(affectedPaths),
	})
}
