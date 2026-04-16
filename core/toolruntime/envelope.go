package toolruntime

import (
	"encoding/json"

	"github.com/Mesteriis/rune-terminal/core/policy"
)

type ExecutionEnvelopeContext struct {
	WorkspaceID string `json:"workspace_id,omitempty"`
	WidgetID    string `json:"widget_id,omitempty"`
	RepoRoot    string `json:"repo_root,omitempty"`
	Role        string `json:"role,omitempty"`
	Mode        string `json:"mode,omitempty"`
}

type ExecutionEnvelope struct {
	ToolName string                   `json:"tool_name"`
	Input    json.RawMessage          `json:"input,omitempty"`
	Context  ExecutionEnvelopeContext `json:"context,omitempty"`
}

func executionEnvelopeFromRequest(request ExecuteRequest, profile policy.EvaluationProfile) ExecutionEnvelope {
	return ExecutionEnvelope{
		ToolName: request.ToolName,
		Input:    request.Input,
		Context: ExecutionEnvelopeContext{
			WorkspaceID: request.Context.WorkspaceID,
			WidgetID:    request.Context.ActiveWidgetID,
			RepoRoot:    request.Context.RepoRoot,
			Role:        profile.RoleID,
			Mode:        profile.ModeID,
		},
	}
}

func (e ExecutionEnvelope) executionContext() ExecutionContext {
	return ExecutionContext{
		WorkspaceID:    e.Context.WorkspaceID,
		RepoRoot:       e.Context.RepoRoot,
		ActiveWidgetID: e.Context.WidgetID,
		RoleID:         e.Context.Role,
		ModeID:         e.Context.Mode,
	}
}
