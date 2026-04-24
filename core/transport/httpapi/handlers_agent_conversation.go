package httpapi

import (
	"errors"
	"net/http"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/agent"
	"github.com/Mesteriis/rune-terminal/core/app"
	"github.com/Mesteriis/rune-terminal/core/conversation"
)

type conversationMessagePayload struct {
	Prompt      string                             `json:"prompt"`
	Model       string                             `json:"model,omitempty"`
	Attachments []conversation.AttachmentReference `json:"attachments,omitempty"`
	Context     app.ConversationContext            `json:"context"`
}

type activateConversationPayload struct {
	ConversationID string `json:"conversation_id"`
}

type renameConversationPayload struct {
	Title string `json:"title"`
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

func (api *API) handleConversationList(w http.ResponseWriter, r *http.Request) {
	conversations, activeConversationID, err := api.runtime.ConversationList(r.Context())
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"active_conversation_id": activeConversationID,
		"conversations":          conversations,
	})
}

func (api *API) handleCreateConversation(w http.ResponseWriter, r *http.Request) {
	snapshot, err := api.runtime.CreateConversation(r.Context())
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"conversation": snapshot,
	})
}

func (api *API) handleRenameConversation(w http.ResponseWriter, r *http.Request) {
	conversationID := strings.TrimSpace(r.PathValue("conversationID"))
	if conversationID == "" {
		writeNotFound(w, "conversation_not_found", conversation.ErrConversationNotFound.Error())
		return
	}

	var payload renameConversationPayload
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}

	snapshot, err := api.runtime.RenameConversation(r.Context(), conversationID, payload.Title)
	if err != nil {
		writeConversationError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"conversation": snapshot,
	})
}

func (api *API) handleActivateConversation(w http.ResponseWriter, r *http.Request) {
	conversationID := strings.TrimSpace(r.PathValue("conversationID"))
	if conversationID == "" {
		var payload activateConversationPayload
		if err := decodeJSON(r, &payload); err == nil {
			conversationID = strings.TrimSpace(payload.ConversationID)
		}
	}
	if conversationID == "" {
		writeNotFound(w, "conversation_not_found", conversation.ErrConversationNotFound.Error())
		return
	}
	snapshot, err := api.runtime.ActivateConversation(r.Context(), conversationID)
	if err != nil {
		writeConversationError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"conversation": snapshot,
	})
}

func (api *API) handleSubmitConversationMessage(w http.ResponseWriter, r *http.Request) {
	var payload conversationMessagePayload
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	result, err := api.runtime.SubmitConversationPrompt(
		r.Context(),
		payload.Prompt,
		payload.Model,
		payload.Context,
		payload.Attachments,
	)
	if err != nil {
		writeConversationError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"conversation":   result.Snapshot,
		"provider_error": result.ProviderError,
	})
}

func (api *API) handleStreamConversationMessage(w http.ResponseWriter, r *http.Request) {
	var payload conversationMessagePayload
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	if strings.TrimSpace(payload.Prompt) == "" {
		writeBadRequest(w, "invalid_prompt", conversation.ErrInvalidPrompt)
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		writeError(w, http.StatusInternalServerError, "streaming_unsupported", "streaming unsupported")
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	emitted := false
	emit := func(event conversation.StreamEvent) error {
		if err := writeEventChecked(w, string(event.Type), event); err != nil {
			return err
		}
		emitted = true
		flusher.Flush()
		return nil
	}

	if _, err := api.runtime.StreamConversationPrompt(
		r.Context(),
		payload.Prompt,
		payload.Model,
		payload.Context,
		payload.Attachments,
		emit,
	); err != nil {
		if !emitted && r.Context().Err() == nil {
			_ = emit(conversation.StreamEvent{
				Type:  conversation.StreamEventError,
				Error: err.Error(),
			})
		}
		return
	}
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
		case errors.Is(err, app.ErrExecutionTargetRequired):
			writeError(w, http.StatusBadRequest, "execution_target_required", err.Error())
		case errors.Is(err, app.ErrExecutionTargetMismatch):
			writeError(w, http.StatusBadRequest, "execution_target_mismatch", err.Error())
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
	case errors.Is(err, conversation.ErrInvalidConversationTitle):
		writeBadRequest(w, "invalid_conversation_title", err)
	case errors.Is(err, app.ErrConversationModelUnavailable):
		writeError(w, http.StatusBadRequest, "invalid_model_selection", err.Error())
	case errors.Is(err, agent.ErrProviderInvalidConfig):
		writeError(w, http.StatusBadRequest, "invalid_provider_config", err.Error())
	case errors.Is(err, conversation.ErrInvalidAttachmentPath):
		writeError(w, http.StatusBadRequest, "invalid_attachment_path", err.Error())
	case errors.Is(err, conversation.ErrAttachmentNotFound):
		writeNotFound(w, "attachment_not_found", err.Error())
	case errors.Is(err, conversation.ErrAttachmentNotFile):
		writeError(w, http.StatusBadRequest, "invalid_attachment_reference", err.Error())
	case errors.Is(err, conversation.ErrConversationNotFound):
		writeNotFound(w, "conversation_not_found", err.Error())
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
