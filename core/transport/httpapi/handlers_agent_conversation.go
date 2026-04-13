package httpapi

import (
	"errors"
	"net/http"

	"github.com/Mesteriis/rune-terminal/core/app"
	"github.com/Mesteriis/rune-terminal/core/conversation"
)

type conversationMessagePayload struct {
	Prompt  string                  `json:"prompt"`
	Context app.ConversationContext `json:"context"`
}

type terminalCommandExplanationPayload struct {
	Prompt       string                  `json:"prompt"`
	Command      string                  `json:"command"`
	WidgetID     string                  `json:"widget_id,omitempty"`
	FromSeq      uint64                  `json:"from_seq,omitempty"`
	ApprovalUsed bool                    `json:"approval_used,omitempty"`
	Context      app.ConversationContext `json:"context"`
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
	result, err := api.runtime.SubmitConversationPrompt(r.Context(), payload.Prompt, payload.Context)
	if err != nil {
		writeConversationError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"conversation":   result.Snapshot,
		"provider_error": result.ProviderError,
	})
}

func (api *API) handleExplainTerminalCommand(w http.ResponseWriter, r *http.Request) {
	var payload terminalCommandExplanationPayload
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	result, err := api.runtime.ExplainTerminalCommand(r.Context(), app.ExplainTerminalCommandRequest{
		Prompt:       payload.Prompt,
		Command:      payload.Command,
		WidgetID:     payload.WidgetID,
		FromSeq:      payload.FromSeq,
		ApprovalUsed: payload.ApprovalUsed,
	}, payload.Context)
	if err != nil {
		writeConversationError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"conversation":   result.Snapshot,
		"provider_error": result.ProviderError,
		"output_excerpt": result.OutputExcerpt,
	})
}

func writeConversationError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, conversation.ErrInvalidPrompt):
		writeBadRequest(w, "invalid_prompt", err)
	default:
		writeInternalError(w, err)
	}
}
