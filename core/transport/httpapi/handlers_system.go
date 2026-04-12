package httpapi

import "net/http"

func (api *API) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (api *API) handleBootstrap(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"product_name": "RunaTerminal",
		"workspace":    api.runtime.Workspace.Snapshot(),
		"tools":        api.runtime.Registry.List(),
		"repo_root":    api.runtime.RepoRoot,
	})
}

func (api *API) handleWorkspace(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, api.runtime.Workspace.Snapshot())
}

func (api *API) handleTools(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"tools": api.runtime.Registry.List()})
}

func (api *API) handleAudit(w http.ResponseWriter, r *http.Request) {
	limit := parseInt(r.URL.Query().Get("limit"), 50)
	events, err := api.runtime.Audit.List(limit)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"events": events})
}
