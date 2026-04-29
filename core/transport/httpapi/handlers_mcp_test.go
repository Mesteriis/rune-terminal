package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/plugins"
)

func TestListMCPServersReturnsRuntimeState(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodGet, "/api/v1/mcp/servers", nil))
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	var response struct {
		Servers []plugins.MCPServerSnapshot `json:"servers"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}
	if len(response.Servers) == 0 {
		t.Fatalf("expected at least one mcp server, got %#v", response)
	}
	if response.Servers[0].ID == "" {
		t.Fatalf("expected server id, got %#v", response.Servers[0])
	}
}

func TestRegisterMCPServer(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/mcp/servers", map[string]any{
		"id":       "mcp.context7",
		"type":     "remote",
		"endpoint": "https://mcp.context7.com/mcp",
		"headers": map[string]any{
			"X-Context7-API-Key": "placeholder",
		},
	}))
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	var response struct {
		Server plugins.MCPServerSnapshot `json:"server"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}
	if response.Server.ID != "mcp.context7" {
		t.Fatalf("expected mcp.context7, got %#v", response.Server)
	}
	if response.Server.State != plugins.MCPStateStopped || response.Server.Active {
		t.Fatalf("expected newly registered server to be stopped and inactive, got %#v", response.Server)
	}
}

func TestRegisterMCPServerValidation(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	cases := []map[string]any{
		{
			"id":       "",
			"type":     "remote",
			"endpoint": "https://mcp.context7.com/mcp",
		},
		{
			"id":       "mcp.context7",
			"type":     "process",
			"endpoint": "https://mcp.context7.com/mcp",
		},
		{
			"id":       "mcp.context7",
			"type":     "remote",
			"endpoint": "/not-absolute",
		},
	}
	for _, payload := range cases {
		recorder := httptest.NewRecorder()
		handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/mcp/servers", payload))
		if recorder.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 for payload %#v, got %d (%s)", payload, recorder.Code, recorder.Body.String())
		}
	}
}

func TestRegisterMCPServerDuplicate(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	payload := map[string]any{
		"id":       "mcp.context7",
		"type":     "remote",
		"endpoint": "https://mcp.context7.com/mcp",
	}

	first := httptest.NewRecorder()
	handler.ServeHTTP(first, authedJSONRequest(t, http.MethodPost, "/api/v1/mcp/servers", payload))
	if first.Code != http.StatusCreated {
		t.Fatalf("expected first register=201, got %d (%s)", first.Code, first.Body.String())
	}

	second := httptest.NewRecorder()
	handler.ServeHTTP(second, authedJSONRequest(t, http.MethodPost, "/api/v1/mcp/servers", payload))
	if second.Code != http.StatusConflict {
		t.Fatalf("expected duplicate register=409, got %d (%s)", second.Code, second.Body.String())
	}
}

func TestGetAndUpdateMCPServer(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	registerRecorder := httptest.NewRecorder()
	handler.ServeHTTP(registerRecorder, authedJSONRequest(t, http.MethodPost, "/api/v1/mcp/servers", map[string]any{
		"id":       "mcp.context7",
		"type":     "remote",
		"endpoint": "https://mcp.context7.com/mcp",
		"headers": map[string]any{
			"Authorization": "Bearer old",
		},
	}))
	if registerRecorder.Code != http.StatusCreated {
		t.Fatalf("expected register=201, got %d (%s)", registerRecorder.Code, registerRecorder.Body.String())
	}

	getRecorder := httptest.NewRecorder()
	handler.ServeHTTP(getRecorder, authedJSONRequest(t, http.MethodGet, "/api/v1/mcp/servers/mcp.context7", nil))
	if getRecorder.Code != http.StatusOK {
		t.Fatalf("expected get=200, got %d (%s)", getRecorder.Code, getRecorder.Body.String())
	}

	var getResponse struct {
		Server struct {
			ID      string            `json:"id"`
			Headers map[string]string `json:"headers"`
		} `json:"server"`
	}
	if err := json.Unmarshal(getRecorder.Body.Bytes(), &getResponse); err != nil {
		t.Fatalf("Unmarshal get response error: %v", err)
	}
	if getResponse.Server.ID != "mcp.context7" || getResponse.Server.Headers["Authorization"] != "********" {
		t.Fatalf("unexpected get response: %#v", getResponse.Server)
	}

	updateRecorder := httptest.NewRecorder()
	handler.ServeHTTP(updateRecorder, authedJSONRequest(t, http.MethodPut, "/api/v1/mcp/servers/mcp.context7", map[string]any{
		"id":       "mcp.context7",
		"type":     "remote",
		"endpoint": "https://mcp.context7.com/v2",
		"headers": map[string]any{
			"Authorization": "Bearer new",
		},
	}))
	if updateRecorder.Code != http.StatusOK {
		t.Fatalf("expected update=200, got %d (%s)", updateRecorder.Code, updateRecorder.Body.String())
	}

	var updateResponse struct {
		Server plugins.MCPServerSnapshot `json:"server"`
	}
	if err := json.Unmarshal(updateRecorder.Body.Bytes(), &updateResponse); err != nil {
		t.Fatalf("Unmarshal update response error: %v", err)
	}
	if updateResponse.Server.Endpoint != "https://mcp.context7.com/v2" {
		t.Fatalf("unexpected updated snapshot: %#v", updateResponse.Server)
	}
}

func TestGetMCPServerRedactsSensitiveHeaders(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	registerRecorder := httptest.NewRecorder()
	handler.ServeHTTP(registerRecorder, authedJSONRequest(t, http.MethodPost, "/api/v1/mcp/servers", map[string]any{
		"id":       "mcp.context7",
		"type":     "remote",
		"endpoint": "https://mcp.context7.com/mcp",
		"headers": map[string]any{
			"Authorization":      "Bearer secret-token",
			"X-Context7-API-Key": "context7-secret",
			"X-Trace-ID":         "trace-safe",
		},
	}))
	if registerRecorder.Code != http.StatusCreated {
		t.Fatalf("expected register=201, got %d (%s)", registerRecorder.Code, registerRecorder.Body.String())
	}

	getRecorder := httptest.NewRecorder()
	handler.ServeHTTP(getRecorder, authedJSONRequest(t, http.MethodGet, "/api/v1/mcp/servers/mcp.context7", nil))
	if getRecorder.Code != http.StatusOK {
		t.Fatalf("expected get=200, got %d (%s)", getRecorder.Code, getRecorder.Body.String())
	}

	var response struct {
		Server struct {
			Headers map[string]string `json:"headers"`
		} `json:"server"`
	}
	if err := json.Unmarshal(getRecorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("Unmarshal get response error: %v", err)
	}

	if response.Server.Headers["Authorization"] != "********" {
		t.Fatalf("expected authorization to be redacted, got %#v", response.Server.Headers)
	}
	if response.Server.Headers["X-Context7-API-Key"] != "********" {
		t.Fatalf("expected api key to be redacted, got %#v", response.Server.Headers)
	}
	if response.Server.Headers["X-Trace-ID"] != "trace-safe" {
		t.Fatalf("expected non-sensitive header to remain editable, got %#v", response.Server.Headers)
	}
}

func TestDeleteMCPServer(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	registerRecorder := httptest.NewRecorder()
	handler.ServeHTTP(registerRecorder, authedJSONRequest(t, http.MethodPost, "/api/v1/mcp/servers", map[string]any{
		"id":       "mcp.context7",
		"type":     "remote",
		"endpoint": "https://mcp.context7.com/mcp",
	}))
	if registerRecorder.Code != http.StatusCreated {
		t.Fatalf("expected register=201, got %d (%s)", registerRecorder.Code, registerRecorder.Body.String())
	}

	deleteRecorder := httptest.NewRecorder()
	handler.ServeHTTP(deleteRecorder, authedJSONRequest(t, http.MethodDelete, "/api/v1/mcp/servers/mcp.context7", nil))
	if deleteRecorder.Code != http.StatusOK {
		t.Fatalf("expected delete=200, got %d (%s)", deleteRecorder.Code, deleteRecorder.Body.String())
	}

	getRecorder := httptest.NewRecorder()
	handler.ServeHTTP(getRecorder, authedJSONRequest(t, http.MethodGet, "/api/v1/mcp/servers/mcp.context7", nil))
	if getRecorder.Code != http.StatusNotFound {
		t.Fatalf("expected get-after-delete=404, got %d (%s)", getRecorder.Code, getRecorder.Body.String())
	}
}

func TestUpdateAndDeleteMCPServerRejectProcessServers(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	updateRecorder := httptest.NewRecorder()
	handler.ServeHTTP(updateRecorder, authedJSONRequest(t, http.MethodPut, "/api/v1/mcp/servers/mcp.test", map[string]any{
		"id":       "mcp.test",
		"type":     "remote",
		"endpoint": "https://mcp.context7.com/mcp",
	}))
	if updateRecorder.Code != http.StatusBadRequest {
		t.Fatalf("expected process update=400, got %d (%s)", updateRecorder.Code, updateRecorder.Body.String())
	}

	deleteRecorder := httptest.NewRecorder()
	handler.ServeHTTP(deleteRecorder, authedJSONRequest(t, http.MethodDelete, "/api/v1/mcp/servers/mcp.test", nil))
	if deleteRecorder.Code != http.StatusBadRequest {
		t.Fatalf("expected process delete=400, got %d (%s)", deleteRecorder.Code, deleteRecorder.Body.String())
	}
}

func TestMCPServerControlEndpoints(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	startRecorder := httptest.NewRecorder()
	handler.ServeHTTP(startRecorder, authedJSONRequest(t, http.MethodPost, "/api/v1/mcp/servers/mcp.test/start", nil))
	if startRecorder.Code != http.StatusOK {
		t.Fatalf("expected start=200, got %d (%s)", startRecorder.Code, startRecorder.Body.String())
	}

	disableRecorder := httptest.NewRecorder()
	handler.ServeHTTP(disableRecorder, authedJSONRequest(t, http.MethodPost, "/api/v1/mcp/servers/mcp.test/disable", nil))
	if disableRecorder.Code != http.StatusOK {
		t.Fatalf("expected disable=200, got %d (%s)", disableRecorder.Code, disableRecorder.Body.String())
	}

	var disableResponse struct {
		Server plugins.MCPServerSnapshot `json:"server"`
	}
	if err := json.Unmarshal(disableRecorder.Body.Bytes(), &disableResponse); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}
	if disableResponse.Server.Enabled {
		t.Fatalf("expected enabled=false after disable, got %#v", disableResponse.Server)
	}
	if disableResponse.Server.Active {
		t.Fatalf("expected active=false after disable, got %#v", disableResponse.Server)
	}
}

func TestInvokeMCPRespectsLifecycleControls(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	disabledRecorder := httptest.NewRecorder()
	handler.ServeHTTP(disabledRecorder, authedJSONRequest(t, http.MethodPost, "/api/v1/mcp/servers/mcp.test/disable", nil))
	if disabledRecorder.Code != http.StatusOK {
		t.Fatalf("expected disable=200, got %d", disabledRecorder.Code)
	}

	invokeRecorder := httptest.NewRecorder()
	handler.ServeHTTP(invokeRecorder, authedJSONRequest(t, http.MethodPost, "/api/v1/mcp/invoke", map[string]any{
		"server_id":             "mcp.test",
		"allow_on_demand_start": true,
		"workspace_id":          "ws-default",
	}))
	if invokeRecorder.Code != http.StatusConflict {
		t.Fatalf("expected disabled invoke=409, got %d (%s)", invokeRecorder.Code, invokeRecorder.Body.String())
	}

	enableRecorder := httptest.NewRecorder()
	handler.ServeHTTP(enableRecorder, authedJSONRequest(t, http.MethodPost, "/api/v1/mcp/servers/mcp.test/enable", nil))
	if enableRecorder.Code != http.StatusOK {
		t.Fatalf("expected enable=200, got %d", enableRecorder.Code)
	}

	invokeRecorder = httptest.NewRecorder()
	handler.ServeHTTP(invokeRecorder, authedJSONRequest(t, http.MethodPost, "/api/v1/mcp/invoke", map[string]any{
		"server_id":             "mcp.test",
		"allow_on_demand_start": true,
		"include_context":       true,
		"workspace_id":          "ws-default",
	}))
	if invokeRecorder.Code != http.StatusOK {
		t.Fatalf("expected invoke=200, got %d (%s)", invokeRecorder.Code, invokeRecorder.Body.String())
	}

	var invokeResponse plugins.MCPInvokeResult
	if err := json.Unmarshal(invokeRecorder.Body.Bytes(), &invokeResponse); err != nil {
		t.Fatalf("Unmarshal invoke response error: %v", err)
	}
	if invokeResponse.Context == nil || !invokeResponse.Context.Included {
		t.Fatalf("expected explicit bounded context, got %#v", invokeResponse.Context)
	}
}

func TestInvokeMCPAppendsAuditWithExplicitProvenance(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	invokeRecorder := httptest.NewRecorder()
	handler.ServeHTTP(invokeRecorder, authedJSONRequest(t, http.MethodPost, "/api/v1/mcp/invoke", map[string]any{
		"server_id":             "mcp.test",
		"allow_on_demand_start": true,
		"action_source":         "test.mcp.invoke",
		"workspace_id":          "ws-default",
	}))
	if invokeRecorder.Code != http.StatusOK {
		t.Fatalf("expected invoke=200, got %d (%s)", invokeRecorder.Code, invokeRecorder.Body.String())
	}

	auditRecorder := httptest.NewRecorder()
	handler.ServeHTTP(auditRecorder, authedJSONRequest(t, http.MethodGet, "/api/v1/audit?limit=10", nil))
	if auditRecorder.Code != http.StatusOK {
		t.Fatalf("expected audit=200, got %d (%s)", auditRecorder.Code, auditRecorder.Body.String())
	}

	var auditResponse struct {
		Events []struct {
			ToolName     string `json:"tool_name"`
			ActionSource string `json:"action_source"`
			WorkspaceID  string `json:"workspace_id"`
		} `json:"events"`
	}
	if err := json.Unmarshal(auditRecorder.Body.Bytes(), &auditResponse); err != nil {
		t.Fatalf("unmarshal audit response: %v", err)
	}

	var invokeAudit *struct {
		ToolName     string `json:"tool_name"`
		ActionSource string `json:"action_source"`
		WorkspaceID  string `json:"workspace_id"`
	}
	for i := range auditResponse.Events {
		if auditResponse.Events[i].ToolName == "mcp.invoke" {
			invokeAudit = &auditResponse.Events[i]
		}
	}
	if invokeAudit == nil {
		t.Fatalf("expected mcp.invoke audit event, got %#v", auditResponse.Events)
	}
	if invokeAudit.ActionSource != "test.mcp.invoke" || invokeAudit.WorkspaceID != "ws-default" {
		t.Fatalf("expected explicit mcp provenance fields, got %#v", *invokeAudit)
	}
}

func TestMCPServerLifecycleAppendsAuditEvents(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	mcpRequest(t, handler, http.MethodPost, "/api/v1/mcp/servers", map[string]any{
		"id":       "mcp.audit",
		"type":     "remote",
		"endpoint": "https://mcp.example.test/mcp",
	}, http.StatusCreated)
	mcpRequest(t, handler, http.MethodPut, "/api/v1/mcp/servers/mcp.audit", map[string]any{
		"id":       "mcp.audit",
		"type":     "remote",
		"endpoint": "https://mcp.example.test/v2",
	}, http.StatusOK)
	mcpRequest(t, handler, http.MethodPost, "/api/v1/mcp/servers/mcp.test/start", nil, http.StatusOK)
	mcpRequest(t, handler, http.MethodPost, "/api/v1/mcp/servers/mcp.test/stop", nil, http.StatusOK)
	mcpRequest(t, handler, http.MethodPost, "/api/v1/mcp/servers/mcp.test/restart", nil, http.StatusOK)
	mcpRequest(t, handler, http.MethodPost, "/api/v1/mcp/servers/mcp.test/disable", nil, http.StatusOK)
	mcpRequest(t, handler, http.MethodPost, "/api/v1/mcp/servers/mcp.test/enable", nil, http.StatusOK)
	mcpRequest(t, handler, http.MethodDelete, "/api/v1/mcp/servers/mcp.audit", nil, http.StatusOK)

	auditRecorder := mcpRequest(t, handler, http.MethodGet, "/api/v1/audit?limit=20", nil, http.StatusOK)
	var auditResponse struct {
		Events []struct {
			ToolName     string `json:"tool_name"`
			ActionSource string `json:"action_source"`
			Success      bool   `json:"success"`
			Error        string `json:"error"`
		} `json:"events"`
	}
	if err := json.Unmarshal(auditRecorder.Body.Bytes(), &auditResponse); err != nil {
		t.Fatalf("unmarshal audit response: %v", err)
	}

	expectedTools := []string{
		"mcp.register",
		"mcp.update",
		"mcp.start",
		"mcp.stop",
		"mcp.restart",
		"mcp.disable",
		"mcp.enable",
		"mcp.delete",
	}
	if len(auditResponse.Events) != len(expectedTools) {
		t.Fatalf("expected %d lifecycle audit events, got %#v", len(expectedTools), auditResponse.Events)
	}
	for index, expectedTool := range expectedTools {
		event := auditResponse.Events[index]
		if event.ToolName != expectedTool || !event.Success || event.Error != "" {
			t.Fatalf("unexpected lifecycle audit event %d: %#v", index, event)
		}
		if event.ActionSource != "mcp.lifecycle" {
			t.Fatalf("expected mcp.lifecycle action source, got %#v", event)
		}
	}
}

func TestMCPServerLifecycleAppendsFailureAuditEvent(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	mcpRequest(t, handler, http.MethodPut, "/api/v1/mcp/servers/mcp.test", map[string]any{
		"id":       "mcp.test",
		"type":     "remote",
		"endpoint": "https://mcp.example.test/mcp",
	}, http.StatusBadRequest)

	auditRecorder := mcpRequest(t, handler, http.MethodGet, "/api/v1/audit?limit=10", nil, http.StatusOK)
	var auditResponse struct {
		Events []struct {
			ToolName     string `json:"tool_name"`
			ActionSource string `json:"action_source"`
			Success      bool   `json:"success"`
			Error        string `json:"error"`
		} `json:"events"`
	}
	if err := json.Unmarshal(auditRecorder.Body.Bytes(), &auditResponse); err != nil {
		t.Fatalf("unmarshal audit response: %v", err)
	}
	if len(auditResponse.Events) != 1 {
		t.Fatalf("expected one lifecycle audit event, got %#v", auditResponse.Events)
	}
	event := auditResponse.Events[0]
	if event.ToolName != "mcp.update" || event.ActionSource != "mcp.lifecycle" || event.Success || event.Error == "" {
		t.Fatalf("unexpected failure audit event: %#v", event)
	}
}

func TestMCPProbeAppendsAuditEventWithoutSecretHeadersOrQuery(t *testing.T) {
	t.Parallel()

	callCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		switch callCount {
		case 1:
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"jsonrpc":"2.0","id":"probe-init","result":{"protocolVersion":"2024-11-05","serverInfo":{"name":"Probe","version":"1.0.0"}}}`))
		case 2:
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"jsonrpc":"2.0","id":"probe-tools","result":{"tools":[{"name":"docs.search"}]}}`))
		default:
			t.Fatalf("unexpected probe request")
		}
	}))
	defer server.Close()

	handler, _ := newTestHandler(t)
	mcpRequest(t, handler, http.MethodPost, "/api/v1/mcp/probe", map[string]any{
		"endpoint": server.URL + "/mcp?token=secret",
		"headers": map[string]string{
			"Authorization": "Bearer secret",
		},
	}, http.StatusOK)

	auditRecorder := mcpRequest(t, handler, http.MethodGet, "/api/v1/audit?limit=10", nil, http.StatusOK)
	var auditResponse struct {
		Events []struct {
			ToolName     string `json:"tool_name"`
			Summary      string `json:"summary"`
			ActionSource string `json:"action_source"`
			Success      bool   `json:"success"`
			Error        string `json:"error"`
		} `json:"events"`
	}
	if err := json.Unmarshal(auditRecorder.Body.Bytes(), &auditResponse); err != nil {
		t.Fatalf("unmarshal audit response: %v", err)
	}
	if len(auditResponse.Events) != 1 {
		t.Fatalf("expected one probe audit event, got %#v", auditResponse.Events)
	}
	event := auditResponse.Events[0]
	if event.ToolName != "mcp.probe" || event.ActionSource != "mcp.lifecycle" ||
		!event.Success || event.Error != "" {
		t.Fatalf("unexpected probe audit event: %#v", event)
	}
	if !strings.Contains(event.Summary, "status=ready") {
		t.Fatalf("expected probe status in audit summary, got %#v", event)
	}
	if strings.Contains(event.Summary, "secret") || strings.Contains(event.Summary, "Authorization") {
		t.Fatalf("expected audit summary to redact query/header secrets, got %#v", event)
	}
}

func mcpRequest(
	t *testing.T,
	handler http.Handler,
	method string,
	path string,
	payload any,
	expectedStatus int,
) *httptest.ResponseRecorder {
	t.Helper()

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, method, path, payload))
	if recorder.Code != expectedStatus {
		t.Fatalf("expected %d for %s %s, got %d (%s)", expectedStatus, method, path, recorder.Code, recorder.Body.String())
	}
	return recorder
}

func TestInvokeMCPRejectsMissingWorkspaceTarget(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/mcp/invoke", map[string]any{
		"server_id":             "mcp.test",
		"allow_on_demand_start": true,
	}))
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Error struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if payload.Error.Code != "invalid_mcp_request" {
		t.Fatalf("unexpected error code: %q", payload.Error.Code)
	}
	if payload.Error.Message == "" {
		t.Fatalf("expected explicit error message, got %#v", payload)
	}
}
