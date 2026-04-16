package httpapi

import (
	"net/http"
	"strings"
)

func (api *API) handleListExecutionBlocks(w http.ResponseWriter, r *http.Request) {
	workspaceID := strings.TrimSpace(r.URL.Query().Get("workspace_id"))
	limit := parseInt(r.URL.Query().Get("limit"), 50)
	if limit < 0 {
		limit = 0
	}

	blocks := api.runtime.ListExecutionBlocks(workspaceID, limit)
	writeJSON(w, http.StatusOK, map[string]any{
		"blocks": blocks,
	})
}

func (api *API) handleGetExecutionBlock(w http.ResponseWriter, r *http.Request) {
	blockID := strings.TrimSpace(r.PathValue("blockID"))
	if blockID == "" {
		writeError(w, http.StatusBadRequest, "invalid_request", "block id is required")
		return
	}
	block, ok := api.runtime.GetExecutionBlock(blockID)
	if !ok {
		writeNotFound(w, "execution_block_not_found", "execution block not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"block": block,
	})
}
