package httpapi

import (
	"net/http"
	"strings"
)

func (api *API) handleActiveTasks(w http.ResponseWriter, r *http.Request) {
	count := 0
	if api.runtime != nil && api.runtime.Execution != nil {
		count = api.runtime.CountActiveExecutionBlocks()
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"count": count,
	})
}

func (api *API) handleMarkFailedActiveTasks(w http.ResponseWriter, r *http.Request) {
	reason := strings.TrimSpace(r.URL.Query().Get("reason"))
	if reason == "" {
		reason = "terminated by shutdown"
	}
	failedCount, err := api.runtime.FailActiveExecutionBlocks(reason)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"marked": failedCount,
	})
}
