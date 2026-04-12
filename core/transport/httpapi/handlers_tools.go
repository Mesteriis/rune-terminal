package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/avm/rterm/core/toolruntime"
)

func (api *API) handleExecuteTool(w http.ResponseWriter, r *http.Request) {
	var request toolruntime.ExecuteRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	response := api.runtime.Executor.Execute(r.Context(), request)
	writeJSON(w, http.StatusOK, response)
}
