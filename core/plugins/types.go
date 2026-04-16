package plugins

import (
	"encoding/json"
	"time"
)

const DefaultInvokeTimeout = 5 * time.Second

type PluginSpec struct {
	Name         string
	Process      ProcessConfig
	Timeout      time.Duration
	Protocol     string
	Capabilities []string
}

type InvokeRequest struct {
	ToolName string          `json:"tool_name"`
	Input    json.RawMessage `json:"input,omitempty"`
	Context  RequestContext  `json:"context,omitempty"`
}

type RequestContext struct {
	WorkspaceID string `json:"workspace_id,omitempty"`
	WidgetID    string `json:"widget_id,omitempty"`
	RepoRoot    string `json:"repo_root,omitempty"`
	RoleID      string `json:"role_id,omitempty"`
	ModeID      string `json:"mode_id,omitempty"`
}

type InvokeResult struct {
	Manifest PluginManifest
	Output   json.RawMessage
}
