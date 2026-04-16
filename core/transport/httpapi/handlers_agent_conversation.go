package httpapi

import (
	"errors"
	"net/http"

	"github.com/Mesteriis/rune-terminal/core/app"
	"github.com/Mesteriis/rune-terminal/core/conversation"
)

type conversationMessagePayload struct {
	Prompt      string                             `json:"prompt"`
	Attachments []conversation.AttachmentReference `json:"attachments,omitempty"`
	Context     app.ConversationContext            `json:"context"`
}

type attachmentReferencePayload struct {
	Path         string `json:"path"`
	WorkspaceID  string `json:"workspace_id,omitempty"`
	ActionSource string `json:"action_source,omitempty"`
}

type terminalCommandExplanationPayload struct {
	Prompt              string                  `json:"prompt"`
	Command             string                  `json:"command"`
	WidgetID            string                  `json:"widget_id,omitempty"`
	FromSeq             uint64                  `json:"from_seq,omitempty"`
	CommandAuditEventID string                  `json:"command_audit_event_id,omitempty"`
	ExecutionBlockID    string                  `json:"execution_block_id,omitempty"`
	ApprovalUsed        bool                    `json:"approval_used,omitempty"`
	Context             app.ConversationContext `json:"context"`
}

func (api *API) handleConversationSnapshot(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"conversation": api.runtime.ConversationSnapshot(),
	})
}

func (api *API) handleSubmitConversationMessage(w http.ResponseWriter, r *http.Request) {
	var payload conversationMessagePayload
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	result, err := api.runtime.SubmitConversationPrompt(r.Context(), payload.Prompt, payload.Context, payload.Attachments)
	if err != nil {
		writeConversationError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"conversation":   result.Snapshot,
		"provider_error": result.ProviderError,
	})
}

func (api *API) handleCreateAttachmentReference(w http.ResponseWriter, r *http.Request) {
	var payload attachmentReferencePayload
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	attachment, err := api.runtime.CreateAttachmentReference(app.CreateAttachmentReferenceRequest{
		Path:         payload.Path,
		WorkspaceID:  payload.WorkspaceID,
		ActionSource: payload.ActionSource,
	})
	if err != nil {
		writeAttachmentError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"attachment": attachment,
	})
}

func (api *API) handleExplainTerminalCommand(w http.ResponseWriter, r *http.Request) {
	var payload terminalCommandExplanationPayload
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	result, err := api.runtime.ExplainTerminalCommand(r.Context(), app.ExplainTerminalCommandRequest{
		Prompt:              payload.Prompt,
		Command:             payload.Command,
		WidgetID:            payload.WidgetID,
		FromSeq:             payload.FromSeq,
		CommandAuditEventID: payload.CommandAuditEventID,
		ExecutionBlockID:    payload.ExecutionBlockID,
	}, payload.Context)
	if err != nil {
		switch {
		case errors.Is(err, app.ErrExecutionBlockNotFound):
			writeNotFound(w, "execution_block_not_found", err.Error())
		case errors.Is(err, app.ErrExecutionBlockIdentityMismatch):
			writeError(w, http.StatusBadRequest, "execution_block_identity_mismatch", err.Error())
		default:
			writeConversationError(w, err)
		}
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"conversation":           result.Snapshot,
		"provider_error":         result.ProviderError,
		"output_excerpt":         result.OutputExcerpt,
		"command_audit_event_id": result.CommandAuditEventID,
		"explain_audit_event_id": result.ExplainAuditEventID,
		"execution_block_id":     result.ExecutionBlockID,
	})
}

func writeConversationError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, conversation.ErrInvalidPrompt):
		writeBadRequest(w, "invalid_prompt", err)
	case errors.Is(err, conversation.ErrInvalidAttachmentPath):
		writeError(w, http.StatusBadRequest, "invalid_attachment_path", err.Error())
	case errors.Is(err, conversation.ErrAttachmentNotFound):
		writeNotFound(w, "attachment_not_found", err.Error())
	case errors.Is(err, conversation.ErrAttachmentNotFile):
		writeError(w, http.StatusBadRequest, "invalid_attachment_reference", err.Error())
	default:
		writeInternalError(w, err)
	}
}

func writeAttachmentError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, conversation.ErrInvalidAttachmentPath):
		writeError(w, http.StatusBadRequest, "invalid_attachment_path", err.Error())
	case errors.Is(err, conversation.ErrAttachmentNotFound):
		writeNotFound(w, "attachment_not_found", err.Error())
	case errors.Is(err, conversation.ErrAttachmentNotFile):
		writeError(w, http.StatusBadRequest, "invalid_attachment_reference", err.Error())
	default:
		writeInternalError(w, err)
	}
}
