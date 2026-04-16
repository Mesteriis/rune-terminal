package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
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
