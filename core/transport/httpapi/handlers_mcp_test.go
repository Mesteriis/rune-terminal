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
