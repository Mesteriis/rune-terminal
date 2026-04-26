package app

import (
	"context"
	"errors"
	"strings"
	"time"

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
	if r.DB == nil {
		return conversation.ErrAttachmentNotFound
	}
	attachmentID = strings.TrimSpace(attachmentID)
	if attachmentID == "" {
		return conversation.ErrAttachmentNotFound
	}

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
