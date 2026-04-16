package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/Mesteriis/rune-terminal/core/toolruntime"
)

type executeToolRequest struct {
	ToolName      string                    `json:"tool_name"`
	Input         json.RawMessage           `json:"input,omitempty"`
	Context       executeToolRequestContext `json:"context,omitempty"`
	ApprovalToken string                    `json:"approval_token,omitempty"`
}

type executeToolRequestContext struct {
	WorkspaceID    string `json:"workspace_id,omitempty"`
	RepoRoot       string `json:"repo_root,omitempty"`
	ActiveWidgetID string `json:"active_widget_id,omitempty"`
}

func (api *API) handleExecuteTool(w http.ResponseWriter, r *http.Request) {
	var request executeToolRequest
	if err := decodeJSON(r, &request); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	response := api.runtime.ExecuteTool(r.Context(), toolruntime.ExecuteRequest{
		ToolName:      request.ToolName,
		Input:         request.Input,
		Context:       request.Context.executionContext(),
		ApprovalToken: request.ApprovalToken,
	})
	writeExecuteResponse(w, response)
}

func (c executeToolRequestContext) executionContext() toolruntime.ExecutionContext {
	return toolruntime.ExecutionContext{
		WorkspaceID:    c.WorkspaceID,
		RepoRoot:       c.RepoRoot,
		ActiveWidgetID: c.ActiveWidgetID,
	}
}
