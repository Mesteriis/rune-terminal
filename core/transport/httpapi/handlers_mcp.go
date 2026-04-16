package httpapi

import "net/http"

func (api *API) handleListMCPServers(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"servers": api.runtime.ListMCPServers(),
	})
}
