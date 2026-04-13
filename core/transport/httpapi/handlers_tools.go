package httpapi

import (
	"net/http"

	"github.com/Mesteriis/rune-terminal/core/toolruntime"
)

func (api *API) handleExecuteTool(w http.ResponseWriter, r *http.Request) {
	var request toolruntime.ExecuteRequest
	if err := decodeJSON(r, &request); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	response := api.runtime.Executor.Execute(r.Context(), request)
	writeExecuteResponse(w, response)
}
