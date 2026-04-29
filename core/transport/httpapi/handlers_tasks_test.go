package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

const testTaskControlToken = "test-task-control-token"
const testTaskControlTokenHeader = "X-Rterm-Task-Token"

func TestTaskMutationRoutesRejectBearerOnlyClients(t *testing.T) {
	t.Setenv("RTERM_TASK_CONTROL_TOKEN", testTaskControlToken)

	handler, _ := newTestHandler(t)
	for _, testcase := range []struct {
		name    string
		method  string
		path    string
		payload map[string]any
	}{
		{
			name:   "create",
			method: http.MethodPost,
			path:   "/api/v1/tasks",
			payload: map[string]any{
				"type": "example.sleep",
			},
		},
		{
			name:   "claim",
			method: http.MethodPost,
			path:   "/api/v1/tasks/claim",
			payload: map[string]any{
				"worker_id": "watcher_test",
				"limit":     1,
			},
		},
		{
			name:   "done",
			method: http.MethodPost,
			path:   "/api/v1/tasks/task_test/done",
			payload: map[string]any{
				"worker_id": "watcher_test",
			},
		},
		{
			name:   "fail",
			method: http.MethodPost,
			path:   "/api/v1/tasks/task_test/fail",
			payload: map[string]any{
				"worker_id": "watcher_test",
				"error":     "boom",
			},
		},
	} {
		t.Run(testcase.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			handler.ServeHTTP(recorder, authedJSONRequest(t, testcase.method, testcase.path, testcase.payload))
			if recorder.Code != http.StatusUnauthorized {
				t.Fatalf("expected 401, got %d body=%s", recorder.Code, recorder.Body.String())
			}
		})
	}
}

func TestTaskMutationRoutesRequireConfiguredTaskControlToken(t *testing.T) {
	t.Setenv("RTERM_TASK_CONTROL_TOKEN", "")
	handler, _ := newTestHandler(t)
	request := authedJSONRequest(t, http.MethodPost, "/api/v1/tasks", map[string]any{
		"type": "example.sleep",
	})
	request.Header.Set(testTaskControlTokenHeader, testTaskControlToken)

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)
	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestTaskMutationRoutesAcceptTaskControlToken(t *testing.T) {
	t.Setenv("RTERM_TASK_CONTROL_TOKEN", testTaskControlToken)

	handler, _ := newTestHandler(t)
	createRecorder := httptest.NewRecorder()
	createRequest := authedJSONRequest(t, http.MethodPost, "/api/v1/tasks", map[string]any{
		"type": "example.sleep",
	})
	createRequest.Header.Set(testTaskControlTokenHeader, testTaskControlToken)
	handler.ServeHTTP(createRecorder, createRequest)
	if createRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 create, got %d body=%s", createRecorder.Code, createRecorder.Body.String())
	}
	var createPayload struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(createRecorder.Body.Bytes(), &createPayload); err != nil {
		t.Fatalf("unmarshal create payload: %v", err)
	}
	if createPayload.ID == "" {
		t.Fatalf("expected created task id, got %#v", createPayload)
	}

	claimRecorder := httptest.NewRecorder()
	claimRequest := authedJSONRequest(t, http.MethodPost, "/api/v1/tasks/claim", map[string]any{
		"worker_id": "watcher_test",
		"limit":     1,
	})
	claimRequest.Header.Set(testTaskControlTokenHeader, testTaskControlToken)
	handler.ServeHTTP(claimRecorder, claimRequest)
	if claimRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 claim, got %d body=%s", claimRecorder.Code, claimRecorder.Body.String())
	}
	var claimPayload struct {
		Count int `json:"count"`
	}
	if err := json.Unmarshal(claimRecorder.Body.Bytes(), &claimPayload); err != nil {
		t.Fatalf("unmarshal claim payload: %v", err)
	}
	if claimPayload.Count != 1 {
		t.Fatalf("expected one claimed task, got %#v", claimPayload)
	}

	doneRecorder := httptest.NewRecorder()
	doneRequest := authedJSONRequest(t, http.MethodPost, "/api/v1/tasks/"+createPayload.ID+"/done", map[string]any{
		"worker_id": "watcher_test",
	})
	doneRequest.Header.Set(testTaskControlTokenHeader, testTaskControlToken)
	handler.ServeHTTP(doneRecorder, doneRequest)
	if doneRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 done, got %d body=%s", doneRecorder.Code, doneRecorder.Body.String())
	}
}
