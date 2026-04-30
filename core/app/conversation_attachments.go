package app

import (
	"context"
	"errors"
	"fmt"
	"mime"
	"path/filepath"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/audit"
	"github.com/Mesteriis/rune-terminal/core/conversation"
	"github.com/Mesteriis/rune-terminal/core/policy"
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
	normalizedPath, info, err := statAttachmentPath(request.Path)
	if err != nil {
		return conversation.AttachmentReference{}, err
	}
	if err := r.ensureAttachmentReferenceAllowed(normalizedPath, request.WorkspaceID); err != nil {
		if errors.Is(err, conversation.ErrAttachmentPolicyDenied) {
			r.appendAttachmentPolicyDeniedAudit(attachmentPolicyDeniedAudit{
				ToolName: "agent.attachment_reference",
				Summary:  fmt.Sprintf("create attachment reference: %s", trimSummary(filepath.Base(normalizedPath))),
				Context: ConversationContext{
					WorkspaceID:  strings.TrimSpace(request.WorkspaceID),
					ActionSource: strings.TrimSpace(request.ActionSource),
				},
				Error:         err,
				AffectedPaths: []string{normalizedPath},
			})
		}
		return conversation.AttachmentReference{}, err
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

	if err := r.storeAttachmentReference(
		context.Background(),
		reference,
		request.WorkspaceID,
		request.ActionSource,
	); err != nil {
		return conversation.AttachmentReference{}, err
	}

	if r != nil && r.Audit != nil {
		_ = r.Audit.Append(audit.Event{
			ToolName:      "agent.attachment_reference",
			Summary:       fmt.Sprintf("create attachment reference: %s", trimSummary(name)),
			WorkspaceID:   strings.TrimSpace(request.WorkspaceID),
			ActionSource:  strings.TrimSpace(request.ActionSource),
			Success:       true,
			AffectedPaths: []string{normalizedPath},
		})
	}

	return reference, nil
}

func (r *Runtime) ensureAttachmentReferenceAllowed(path string, workspaceID string) error {
	_, err := evaluateAttachmentPolicy(r.attachmentPolicyGuard(
		ConversationContext{
			WorkspaceID: strings.TrimSpace(workspaceID),
			RepoRoot:    r.RepoRoot,
		},
		policy.EvaluationProfile{},
	), path)
	if err != nil {
		return err
	}
	return nil
}
