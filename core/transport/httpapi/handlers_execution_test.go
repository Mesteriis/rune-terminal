package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestExecutionBlocksListAndGet(t *testing.T) {
	t.Parallel()

	handler, _ := newExplainCommandHandler(t)

	explainRecorder := httptest.NewRecorder()
	handler.ServeHTTP(explainRecorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/terminal-commands/explain", map[string]any{
		"prompt":    "/run echo block-api",
		"command":   "echo block-api",
		"widget_id": "term_boot",
		"from_seq":  0,
		"context": map[string]any{
			"workspace_id":           "ws-default",
			"repo_root":              "/workspace/repo",
			"active_widget_id":       "term_boot",
			"target_session":         "local",
			"target_connection_id":   "local",
			"widget_context_enabled": true,
		},
	}))
	if explainRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", explainRecorder.Code, explainRecorder.Body.String())
	}

	var explainPayload struct {
		ExecutionBlockID    string `json:"execution_block_id"`
		ExplainAuditEventID string `json:"explain_audit_event_id"`
	}
	if err := json.Unmarshal(explainRecorder.Body.Bytes(), &explainPayload); err != nil {
		t.Fatalf("unmarshal explain payload: %v", err)
	}
	if explainPayload.ExecutionBlockID == "" {
		t.Fatal("expected execution_block_id")
	}
	if explainPayload.ExplainAuditEventID == "" {
		t.Fatal("expected explain_audit_event_id")
	}

	listRecorder := httptest.NewRecorder()
	listReq := authedJSONRequest(t, http.MethodGet, "/api/v1/execution/blocks", nil)
	listReq.URL.RawQuery = "workspace_id=ws-default&limit=10"
	handler.ServeHTTP(listRecorder, listReq)
	if listRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", listRecorder.Code, listRecorder.Body.String())
	}

	var listPayload struct {
		Blocks []struct {
			ID     string `json:"id"`
			Intent struct {
				Command string `json:"command"`
			} `json:"intent"`
			Result struct {
				State string `json:"state"`
			} `json:"result"`
			Provenance struct {
				ExplainAuditEventID string `json:"explain_audit_event_id"`
			} `json:"provenance"`
		} `json:"blocks"`
	}
	if err := json.Unmarshal(listRecorder.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("unmarshal list payload: %v", err)
	}
	if len(listPayload.Blocks) != 1 {
		t.Fatalf("expected one block, got %#v", listPayload.Blocks)
	}
	if listPayload.Blocks[0].ID != explainPayload.ExecutionBlockID {
		t.Fatalf("expected matching block id, got list=%q explain=%q", listPayload.Blocks[0].ID, explainPayload.ExecutionBlockID)
	}
	if listPayload.Blocks[0].Intent.Command != "echo block-api" {
		t.Fatalf("unexpected block command: %#v", listPayload.Blocks[0])
	}
	if listPayload.Blocks[0].Result.State != "executed" {
		t.Fatalf("unexpected block state: %#v", listPayload.Blocks[0].Result)
	}
	if listPayload.Blocks[0].Provenance.ExplainAuditEventID == "" {
		t.Fatalf("expected explain provenance id in list payload: %#v", listPayload.Blocks[0].Provenance)
	}

	getRecorder := httptest.NewRecorder()
	getReq := authedJSONRequest(t, http.MethodGet, "/api/v1/execution/blocks/"+explainPayload.ExecutionBlockID, nil)
	handler.ServeHTTP(getRecorder, getReq)
	if getRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", getRecorder.Code, getRecorder.Body.String())
	}
}

func TestGetExecutionBlockReturnsNotFound(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()
	req := authedJSONRequest(t, http.MethodGet, "/api/v1/execution/blocks/execblk_missing", nil)

	handler.ServeHTTP(recorder, req)
	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestActiveTasksCountsAndMarksFailed(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	execReq := authedJSONRequest(t, http.MethodPost, "/api/v1/agent/terminal-commands/explain", map[string]any{
		"prompt":    "/run block running",
		"command":   "sleep 1",
		"widget_id": "term_boot",
		"from_seq":  0,
		"context": map[string]any{
			"workspace_id":           "ws-default",
			"repo_root":              "/workspace/repo",
			"active_widget_id":       "term_boot",
			"target_session":         "local",
			"target_connection_id":   "local",
			"widget_context_enabled": true,
		},
	})
	handler.ServeHTTP(httptest.NewRecorder(), execReq)

	activeRecorder := httptest.NewRecorder()
	activeReq := authedJSONRequest(t, http.MethodGet, "/api/v1/tasks/active", nil)
	handler.ServeHTTP(activeRecorder, activeReq)
	if activeRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", activeRecorder.Code, activeRecorder.Body.String())
	}
	var activePayload struct {
		Count int `json:"count"`
	}
	if err := json.Unmarshal(activeRecorder.Body.Bytes(), &activePayload); err != nil {
		t.Fatalf("unmarshal active payload: %v", err)
	}
	if activePayload.Count != 0 {
		t.Fatalf("expected zero active tasks by default, got %d", activePayload.Count)
	}

	failReq := authedJSONRequest(t, http.MethodGet, "/api/v1/tasks/stats", nil)
	failRecorder := httptest.NewRecorder()
	handler.ServeHTTP(failRecorder, failReq)
	if failRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", failRecorder.Code, failRecorder.Body.String())
	}
	var statsPayload struct {
		Pending int `json:"pending"`
		Running int `json:"running"`
		Done    int `json:"done"`
		Failed  int `json:"failed"`
	}
	if err := json.Unmarshal(failRecorder.Body.Bytes(), &statsPayload); err != nil {
		t.Fatalf("unmarshal stats payload: %v", err)
	}
	if statsPayload.Pending < 0 || statsPayload.Running < 0 || statsPayload.Done < 0 || statsPayload.Failed < 0 {
		t.Fatalf("invalid stats payload: %#v", statsPayload)
	}
}
