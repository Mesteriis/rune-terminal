package httpapi

import "net/http"

func (api *API) handleQuickActions(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"actions": api.runtime.ListQuickActions(),
	})
}
