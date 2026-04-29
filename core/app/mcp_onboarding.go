package app

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Mesteriis/rune-terminal/core/plugins"
)

type MCPTemplateAuthKind string

const (
	MCPTemplateAuthNone        MCPTemplateAuthKind = "none"
	MCPTemplateAuthBearerToken MCPTemplateAuthKind = "bearer_token"
	MCPTemplateAuthHeaderValue MCPTemplateAuthKind = "header_value"
	MCPRedactedSecretValue                         = "********"
)

type MCPTemplateAuth struct {
	Kind              MCPTemplateAuthKind `json:"kind"`
	HeaderName        string              `json:"header_name,omitempty"`
	ValuePrefix       string              `json:"value_prefix,omitempty"`
	SecretLabel       string              `json:"secret_label,omitempty"`
	SecretPlaceholder string              `json:"secret_placeholder,omitempty"`
}

type MCPTemplate struct {
	ID                string          `json:"id"`
	DisplayName       string          `json:"display_name"`
	Description       string          `json:"description"`
	SuggestedServerID string          `json:"suggested_server_id,omitempty"`
	Endpoint          string          `json:"endpoint,omitempty"`
	Auth              MCPTemplateAuth `json:"auth"`
}

type MCPProbeRequest struct {
	Endpoint string
	Headers  map[string]string
}

type MCPProbeStatus string

const (
	MCPProbeStatusReady           MCPProbeStatus = "ready"
	MCPProbeStatusAuthRequired    MCPProbeStatus = "auth-required"
	MCPProbeStatusUnreachable     MCPProbeStatus = "unreachable"
	MCPProbeStatusInvalidResponse MCPProbeStatus = "invalid-response"
	MCPProbeStatusError           MCPProbeStatus = "error"
)

type MCPProbeResult struct {
	Status          MCPProbeStatus `json:"status"`
	Reachable       bool           `json:"reachable"`
	Message         string         `json:"message"`
	HTTPStatus      int            `json:"http_status,omitempty"`
	ProtocolVersion string         `json:"protocol_version,omitempty"`
	ServerName      string         `json:"server_name,omitempty"`
	ServerVersion   string         `json:"server_version,omitempty"`
	ToolCount       int            `json:"tool_count,omitempty"`
}

var mcpTemplateCatalog = []MCPTemplate{
	{
		ID:                "context7",
		DisplayName:       "Context7",
		Description:       "Reference docs MCP endpoint with bearer-token auth helper.",
		SuggestedServerID: "mcp.context7",
		Endpoint:          "https://mcp.context7.com/mcp",
		Auth: MCPTemplateAuth{
			Kind:              MCPTemplateAuthBearerToken,
			HeaderName:        "Authorization",
			ValuePrefix:       "Bearer ",
			SecretLabel:       "Bearer token",
			SecretPlaceholder: "context7 token",
		},
	},
	{
		ID:                "generic-bearer",
		DisplayName:       "Generic bearer-auth MCP",
		Description:       "Remote HTTPS MCP endpoint with Authorization bearer helper.",
		SuggestedServerID: "mcp.remote",
		Auth: MCPTemplateAuth{
			Kind:              MCPTemplateAuthBearerToken,
			HeaderName:        "Authorization",
			ValuePrefix:       "Bearer ",
			SecretLabel:       "Bearer token",
			SecretPlaceholder: "service token",
		},
	},
	{
		ID:                "generic-api-key",
		DisplayName:       "Generic API-key MCP",
		Description:       "Remote HTTPS MCP endpoint with X-API-Key style helper.",
		SuggestedServerID: "mcp.remote",
		Auth: MCPTemplateAuth{
			Kind:              MCPTemplateAuthHeaderValue,
			HeaderName:        "X-API-Key",
			SecretLabel:       "API key",
			SecretPlaceholder: "provider api key",
		},
	},
	{
		ID:                "generic-no-auth",
		DisplayName:       "Generic unauthenticated MCP",
		Description:       "Remote HTTPS MCP endpoint with no auth helper.",
		SuggestedServerID: "mcp.remote",
		Auth: MCPTemplateAuth{
			Kind: MCPTemplateAuthNone,
		},
	},
}

func cloneMCPHeaders(headers map[string]string) map[string]string {
	if len(headers) == 0 {
		return nil
	}
	cloned := make(map[string]string, len(headers))
	for key, value := range headers {
		cloned[key] = value
	}
	return cloned
}

func MCPHeaderValueIsRedactedSecret(value string) bool {
	return strings.TrimSpace(value) == MCPRedactedSecretValue
}

func MCPHeaderNameIsSensitive(name string) bool {
	normalizedName := strings.ToLower(strings.TrimSpace(name))
	if normalizedName == "" {
		return false
	}
	if normalizedName == "authorization" || normalizedName == "proxy-authorization" {
		return true
	}
	if strings.Contains(normalizedName, "token") || strings.Contains(normalizedName, "secret") {
		return true
	}

	compactName := strings.NewReplacer("-", "", "_", "", " ", "").Replace(normalizedName)
	return strings.Contains(compactName, "apikey")
}

func RedactMCPHeadersForDisplay(headers map[string]string) map[string]string {
	if len(headers) == 0 {
		return nil
	}

	redacted := make(map[string]string, len(headers))
	for key, value := range headers {
		if MCPHeaderNameIsSensitive(key) && value != "" {
			redacted[key] = MCPRedactedSecretValue
			continue
		}
		redacted[key] = value
	}
	return redacted
}

func mergeMCPHeadersPreservingRedactedSecrets(existing map[string]string, next map[string]string) map[string]string {
	merged := cloneMCPHeaders(next)
	if len(existing) == 0 || len(merged) == 0 {
		return merged
	}

	for key, value := range merged {
		if !MCPHeaderNameIsSensitive(key) || !MCPHeaderValueIsRedactedSecret(value) {
			continue
		}
		if existingValue, ok := findMCPHeaderValue(existing, key); ok {
			merged[key] = existingValue
		}
	}
	return merged
}

func findMCPHeaderValue(headers map[string]string, targetName string) (string, bool) {
	for key, value := range headers {
		if strings.EqualFold(strings.TrimSpace(key), strings.TrimSpace(targetName)) {
			return value, true
		}
	}
	return "", false
}

func normalizeRemoteMCPDraft(endpoint string, headers map[string]string) (string, map[string]string, error) {
	normalizedEndpoint := strings.TrimSpace(endpoint)
	if normalizedEndpoint == "" {
		return "", nil, fmt.Errorf("%w: endpoint is required", plugins.ErrInvalidPluginSpec)
	}

	parsedEndpoint, err := url.Parse(normalizedEndpoint)
	if err != nil || parsedEndpoint.Scheme == "" || parsedEndpoint.Host == "" {
		return "", nil, fmt.Errorf("%w: endpoint must be an absolute URL", plugins.ErrInvalidPluginSpec)
	}
	if parsedEndpoint.Scheme != "http" && parsedEndpoint.Scheme != "https" {
		return "", nil, fmt.Errorf("%w: endpoint scheme must be http or https", plugins.ErrInvalidPluginSpec)
	}

	normalizedHeaders := make(map[string]string, len(headers))
	for name, value := range headers {
		headerName := strings.TrimSpace(name)
		if headerName == "" {
			return "", nil, fmt.Errorf("%w: header names must be non-empty", plugins.ErrInvalidPluginSpec)
		}
		if strings.ContainsAny(headerName, "\r\n") {
			return "", nil, fmt.Errorf("%w: header names must not contain newlines", plugins.ErrInvalidPluginSpec)
		}
		if strings.ContainsAny(value, "\r\n") {
			return "", nil, fmt.Errorf("%w: header values must not contain newlines", plugins.ErrInvalidPluginSpec)
		}
		normalizedHeaders[headerName] = value
	}

	return parsedEndpoint.String(), normalizedHeaders, nil
}

func NormalizeRemoteMCPRegistrationRequest(request MCPRegistrationRequest, targetID string) (MCPRegistrationRequest, error) {
	id := strings.TrimSpace(request.ID)
	if id == "" {
		id = strings.TrimSpace(targetID)
	}
	if id == "" {
		return MCPRegistrationRequest{}, fmt.Errorf("%w: id is required", plugins.ErrInvalidPluginSpec)
	}

	normalizedTargetID := strings.TrimSpace(targetID)
	if normalizedTargetID != "" && id != normalizedTargetID {
		return MCPRegistrationRequest{}, fmt.Errorf("%w: id must match the target server", plugins.ErrInvalidPluginSpec)
	}

	if strings.TrimSpace(request.Type) != string(plugins.MCPServerTypeRemote) {
		return MCPRegistrationRequest{}, fmt.Errorf("%w: type must be remote", plugins.ErrInvalidPluginSpec)
	}

	endpoint, headers, err := normalizeRemoteMCPDraft(request.Endpoint, request.Headers)
	if err != nil {
		return MCPRegistrationRequest{}, err
	}

	return MCPRegistrationRequest{
		ID:       id,
		Type:     string(plugins.MCPServerTypeRemote),
		Endpoint: endpoint,
		Headers:  headers,
	}, nil
}

func (r *Runtime) MCPTemplateCatalog() []MCPTemplate {
	catalog := make([]MCPTemplate, len(mcpTemplateCatalog))
	copy(catalog, mcpTemplateCatalog)
	return catalog
}

func (r *Runtime) ProbeRemoteMCPServer(ctx context.Context, request MCPProbeRequest) (result MCPProbeResult, err error) {
	auditEndpoint := strings.TrimSpace(request.Endpoint)
	defer func() {
		r.appendMCPLifecycleAudit(mcpLifecycleAuditInput{
			Action:   "probe",
			Endpoint: auditEndpoint,
			Status:   string(result.Status),
			Success:  err == nil,
			Error:    err,
		})
	}()

	endpoint, headers, err := normalizeRemoteMCPDraft(request.Endpoint, request.Headers)
	if err != nil {
		return MCPProbeResult{}, err
	}
	auditEndpoint = endpoint
	result, err = probeRemoteMCPServer(ctx, &http.Client{Timeout: 10 * time.Second}, endpoint, headers)
	return result, err
}

type mcpProbeEnvelope struct {
	JSONRPC string `json:"jsonrpc"`
	ID      any    `json:"id"`
	Result  *struct {
		ProtocolVersion string `json:"protocolVersion,omitempty"`
		ServerInfo      *struct {
			Name    string `json:"name,omitempty"`
			Version string `json:"version,omitempty"`
		} `json:"serverInfo,omitempty"`
		Tools []json.RawMessage `json:"tools,omitempty"`
	} `json:"result,omitempty"`
	Error *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func probeRemoteMCPServer(
	ctx context.Context,
	client *http.Client,
	endpoint string,
	headers map[string]string,
) (MCPProbeResult, error) {
	initializeBody, initializeStatus, err := doRemoteMCPProbeRequest(ctx, client, endpoint, headers, mcpRPCRequest{
		JSONRPC: "2.0",
		ID:      "probe-init",
		Method:  "initialize",
		Params:  json.RawMessage(`{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"rterm","version":"pre-release"}}`),
	})
	if err != nil {
		return MCPProbeResult{
			Status:    MCPProbeStatusUnreachable,
			Message:   fmt.Sprintf("Unable to reach MCP endpoint: %s", err.Error()),
			Reachable: false,
		}, nil
	}

	if initializeStatus == http.StatusUnauthorized || initializeStatus == http.StatusForbidden {
		return MCPProbeResult{
			Status:     MCPProbeStatusAuthRequired,
			HTTPStatus: initializeStatus,
			Message:    "Endpoint is reachable but rejected the initialize request. Check auth headers.",
			Reachable:  true,
		}, nil
	}
	if initializeStatus >= http.StatusBadRequest {
		return MCPProbeResult{
			Status:     MCPProbeStatusError,
			HTTPStatus: initializeStatus,
			Message:    fmt.Sprintf("Endpoint returned HTTP %d during initialize.", initializeStatus),
			Reachable:  true,
		}, nil
	}

	var initializeEnvelope mcpProbeEnvelope
	if err := json.Unmarshal(initializeBody, &initializeEnvelope); err != nil {
		return MCPProbeResult{
			Status:     MCPProbeStatusInvalidResponse,
			HTTPStatus: initializeStatus,
			Message:    "Endpoint replied, but initialize response was not valid MCP JSON.",
			Reachable:  true,
		}, nil
	}
	if initializeEnvelope.Error != nil {
		return MCPProbeResult{
			Status:     MCPProbeStatusError,
			HTTPStatus: initializeStatus,
			Message:    fmt.Sprintf("Initialize failed: %s", strings.TrimSpace(initializeEnvelope.Error.Message)),
			Reachable:  true,
		}, nil
	}
	if initializeEnvelope.Result == nil {
		return MCPProbeResult{
			Status:     MCPProbeStatusInvalidResponse,
			HTTPStatus: initializeStatus,
			Message:    "Endpoint replied, but initialize response did not include a result.",
			Reachable:  true,
		}, nil
	}

	toolCount := 0
	toolsBody, toolsStatus, err := doRemoteMCPProbeRequest(ctx, client, endpoint, headers, mcpRPCRequest{
		JSONRPC: "2.0",
		ID:      "probe-tools",
		Method:  "tools/list",
		Params:  json.RawMessage(`{}`),
	})
	if err == nil && toolsStatus < http.StatusBadRequest {
		var toolsEnvelope mcpProbeEnvelope
		if json.Unmarshal(toolsBody, &toolsEnvelope) == nil && toolsEnvelope.Error == nil && toolsEnvelope.Result != nil {
			toolCount = len(toolsEnvelope.Result.Tools)
		}
	}

	result := MCPProbeResult{
		Status:          MCPProbeStatusReady,
		HTTPStatus:      initializeStatus,
		ProtocolVersion: strings.TrimSpace(initializeEnvelope.Result.ProtocolVersion),
		Reachable:       true,
		ToolCount:       toolCount,
	}
	if initializeEnvelope.Result != nil && initializeEnvelope.Result.ServerInfo != nil {
		result.ServerName = strings.TrimSpace(initializeEnvelope.Result.ServerInfo.Name)
		result.ServerVersion = strings.TrimSpace(initializeEnvelope.Result.ServerInfo.Version)
	}
	if toolCount > 0 {
		result.Message = fmt.Sprintf("Connected. Endpoint completed initialize and advertised %d tool(s).", toolCount)
	} else {
		result.Message = "Connected. Endpoint completed initialize."
	}
	return result, nil
}

func doRemoteMCPProbeRequest(
	ctx context.Context,
	client *http.Client,
	endpoint string,
	headers map[string]string,
	request mcpRPCRequest,
) ([]byte, int, error) {
	body, err := json.Marshal(request)
	if err != nil {
		return nil, 0, err
	}
	httpRequest, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, 0, err
	}
	httpRequest.Header.Set("Content-Type", "application/json")
	httpRequest.Header.Set("Accept", "application/json, text/event-stream")
	httpRequest.Header.Set("MCP-Protocol-Version", "2024-11-05")
	for key, value := range headers {
		name := strings.TrimSpace(key)
		if name == "" {
			continue
		}
		httpRequest.Header.Set(name, value)
	}

	response, err := client.Do(httpRequest)
	if err != nil {
		return nil, 0, err
	}
	defer response.Body.Close()

	limitedBody, err := io.ReadAll(io.LimitReader(response.Body, 1<<20))
	if err != nil {
		return nil, 0, err
	}
	return limitedBody, response.StatusCode, nil
}
