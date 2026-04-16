package toolruntime

import "encoding/json"

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
