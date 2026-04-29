package httpapi

import (
	"crypto/subtle"
	"errors"
	"net/http"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/tasks"
)

const TaskControlTokenHeader = "X-Rterm-Task-Token"

func (api *API) handleCreateTask(w http.ResponseWriter, r *http.Request) {
	if api.runtime.TaskService == nil {
		writeInternalError(w, errors.New("task service is not available"))
		return
	}
	if !api.requireTaskControlToken(w, r) {
		return
	}

	var request tasks.CreateTaskRequest
	if err := decodeJSON(r, &request); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}

	task, err := api.runtime.TaskService.Create(r.Context(), request)
	if err != nil {
		writeTaskServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, task)
}

func (api *API) handleClaimTask(w http.ResponseWriter, r *http.Request) {
	if api.runtime.TaskService == nil {
		writeInternalError(w, errors.New("task service is not available"))
		return
	}
	if !api.requireTaskControlToken(w, r) {
		return
	}

	var request tasks.ClaimTaskRequest
	if err := decodeJSON(r, &request); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}

	request.Limit = normalizeLimit(request.Limit)
	claimed, err := api.runtime.TaskService.Claim(r.Context(), request)
	if err != nil {
		writeTaskServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"tasks": claimed,
		"count": len(claimed),
	})
}

func (api *API) handleMarkTaskDone(w http.ResponseWriter, r *http.Request) {
	if api.runtime.TaskService == nil {
		writeInternalError(w, errors.New("task service is not available"))
		return
	}
	if !api.requireTaskControlToken(w, r) {
		return
	}

	taskID := r.PathValue("id")
	if strings.TrimSpace(taskID) == "" {
		writeBadRequest(w, "invalid_request", errors.New("task id is required"))
		return
	}
	var request tasks.UpdateTaskRequest
	if err := decodeJSON(r, &request); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	if err := api.runtime.TaskService.Done(r.Context(), taskID, request); err != nil {
		writeTaskServiceError(w, err)
		return
	}
	task, err := api.runtime.TaskStore.GetTask(r.Context(), taskID)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"id":     taskID,
		"status": task.Status,
		"task":   task,
	})
}

func (api *API) handleMarkTaskFail(w http.ResponseWriter, r *http.Request) {
	if api.runtime.TaskService == nil {
		writeInternalError(w, errors.New("task service is not available"))
		return
	}
	if !api.requireTaskControlToken(w, r) {
		return
	}

	taskID := r.PathValue("id")
	if strings.TrimSpace(taskID) == "" {
		writeBadRequest(w, "invalid_request", errors.New("task id is required"))
		return
	}
	var request tasks.UpdateTaskRequest
	if err := decodeJSON(r, &request); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	if err := api.runtime.TaskService.Fail(r.Context(), taskID, request); err != nil {
		writeTaskServiceError(w, err)
		return
	}
	task, err := api.runtime.TaskStore.GetTask(r.Context(), taskID)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"id":     taskID,
		"status": task.Status,
		"task":   task,
	})
}

func (api *API) handleActiveTasksV1(w http.ResponseWriter, r *http.Request) {
	if api.runtime.TaskService == nil {
		writeInternalError(w, errors.New("task service is not available"))
		return
	}

	tasks, err := api.runtime.TaskService.Active(r.Context())
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"tasks": tasks,
		"count": len(tasks),
	})
}

func (api *API) handleTaskStats(w http.ResponseWriter, r *http.Request) {
	if api.runtime.TaskService == nil {
		writeInternalError(w, errors.New("task service is not available"))
		return
	}

	stats, err := api.runtime.TaskService.Stats(r.Context())
	if err != nil {
		writeInternalError(w, err)
		return
	}
	payload := struct {
		Pending int `json:"pending"`
		Running int `json:"running"`
		Done    int `json:"done"`
		Failed  int `json:"failed"`
	}{
		Pending: stats.Pending,
		Running: stats.Running,
		Done:    stats.Done,
		Failed:  stats.Failed,
	}
	writeJSON(w, http.StatusOK, payload)
}

func (api *API) requireTaskControlToken(w http.ResponseWriter, r *http.Request) bool {
	expected := strings.TrimSpace(api.runtime.TaskControlToken)
	if expected == "" {
		writeServiceUnavailable(w, "task_control_auth_not_configured", "task control token not configured")
		return false
	}
	actual := strings.TrimSpace(r.Header.Get(TaskControlTokenHeader))
	if subtle.ConstantTimeCompare([]byte(actual), []byte(expected)) != 1 {
		writeUnauthorized(w)
		return false
	}
	return true
}

func writeTaskServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, tasks.ErrTypeRequired):
		writeBadRequest(w, "invalid_request", err)
	case errors.Is(err, tasks.ErrWorkerMissing):
		writeBadRequest(w, "invalid_request", err)
	case errors.Is(err, tasks.ErrInvalidMaxRetries):
		writeBadRequest(w, "invalid_request", err)
	case errors.Is(err, tasks.ErrInvalidRetryBackoff):
		writeBadRequest(w, "invalid_request", err)
	case errors.Is(err, tasks.ErrNotFound):
		writeNotFound(w, "task_not_found", err.Error())
	case errors.Is(err, tasks.ErrWrongOwner):
		writeError(w, http.StatusConflict, "wrong_owner", err.Error())
	case errors.Is(err, tasks.ErrInvalidStatus):
		writeError(w, http.StatusConflict, "invalid_status", err.Error())
	default:
		writeInternalError(w, err)
	}
}

func normalizeLimit(raw int) int {
	if raw <= 0 {
		return 10
	}
	if raw > 100 {
		return 100
	}
	return raw
}
