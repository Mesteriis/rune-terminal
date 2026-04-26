package app

import (
	"context"
	"fmt"
	"mime"
	"os"
	"path/filepath"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/audit"
	"github.com/Mesteriis/rune-terminal/core/conversation"
	"github.com/Mesteriis/rune-terminal/internal/ids"
)

type CreateAttachmentReferenceRequest struct {
	Path         string `json:"path"`
	WorkspaceID  string `json:"workspace_id,omitempty"`
	ActionSource string `json:"action_source,omitempty"`
}

func (r *Runtime) CreateAttachmentReference(
	request CreateAttachmentReferenceRequest,
) (conversation.AttachmentReference, error) {
	rawPath := strings.TrimSpace(request.Path)
	if rawPath == "" {
		return conversation.AttachmentReference{}, conversation.ErrInvalidAttachmentPath
	}

	normalizedPath := filepath.Clean(rawPath)
	if normalizedPath == "." || !filepath.IsAbs(normalizedPath) {
		return conversation.AttachmentReference{}, conversation.ErrInvalidAttachmentPath
	}

	info, err := os.Stat(normalizedPath)
	if err != nil {
		if os.IsNotExist(err) {
			return conversation.AttachmentReference{}, conversation.ErrAttachmentNotFound
		}
		return conversation.AttachmentReference{}, err
	}
	if info.IsDir() {
		return conversation.AttachmentReference{}, conversation.ErrAttachmentNotFile
	}

	name := filepath.Base(normalizedPath)
	mimeType := strings.TrimSpace(mime.TypeByExtension(filepath.Ext(name)))
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	reference := conversation.AttachmentReference{
		ID:           ids.New("att"),
		Name:         name,
		Path:         normalizedPath,
		MimeType:     mimeType,
		Size:         info.Size(),
		ModifiedTime: info.ModTime().UTC().Unix(),
	}

	_ = r.Audit.Append(audit.Event{
		ToolName:      "agent.attachment_reference",
		Summary:       fmt.Sprintf("create attachment reference: %s", trimSummary(name)),
		WorkspaceID:   strings.TrimSpace(request.WorkspaceID),
		ActionSource:  strings.TrimSpace(request.ActionSource),
		Success:       true,
		AffectedPaths: []string{normalizedPath},
	})

	if err := r.storeAttachmentReference(
		context.Background(),
		reference,
		request.WorkspaceID,
		request.ActionSource,
	); err != nil {
		return conversation.AttachmentReference{}, err
	}

	return reference, nil
}
