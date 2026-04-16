package plugins

import "encoding/json"

const ProtocolVersionV1 = "rterm.plugin.v1"

type PluginMessageType string

const (
	MessageTypeHandshake PluginMessageType = "handshake"
	MessageTypeRequest   PluginMessageType = "request"
	MessageTypeResponse  PluginMessageType = "response"
)

type PluginHandshakeRequest struct {
	Type            PluginMessageType `json:"type"`
	ProtocolVersion string            `json:"protocol_version"`
}

type PluginManifest struct {
	PluginID        string   `json:"plugin_id"`
	PluginVersion   string   `json:"plugin_version"`
	ProtocolVersion string   `json:"protocol_version"`
	ExposedTools    []string `json:"exposed_tools"`
	Capabilities    []string `json:"capabilities,omitempty"`
}

type PluginHandshakeResponse struct {
	Type     PluginMessageType `json:"type"`
	Manifest PluginManifest    `json:"manifest"`
}

type PluginRequest struct {
	Type      PluginMessageType `json:"type"`
	RequestID string            `json:"request_id"`
	ToolName  string            `json:"tool_name"`
	Context   RequestContext    `json:"context,omitempty"`
	Input     json.RawMessage   `json:"input,omitempty"`
}

type PluginResponseStatus string

const (
	PluginResponseStatusOK    PluginResponseStatus = "ok"
	PluginResponseStatusError PluginResponseStatus = "error"
)

type PluginError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type PluginResponse struct {
	Type      PluginMessageType    `json:"type"`
	RequestID string               `json:"request_id"`
	Status    PluginResponseStatus `json:"status"`
	Output    json.RawMessage      `json:"output,omitempty"`
	Error     *PluginError         `json:"error,omitempty"`
	Metadata  map[string]any       `json:"metadata,omitempty"`
}
