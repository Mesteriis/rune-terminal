package httpapi

import (
	"net/http"

	"github.com/Mesteriis/rune-terminal/core/app"
	"github.com/Mesteriis/rune-terminal/core/workspace"
)

func (api *API) handleFocusWidget(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		WidgetID string `json:"widget_id"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	snapshot, err := api.runtime.FocusWidget(payload.WidgetID)
	if err != nil {
		writeWorkspaceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"workspace": snapshot})
}

func (api *API) handleUpdateLayout(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Layout workspace.Layout `json:"layout"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	snapshot, err := api.runtime.UpdateLayout(payload.Layout)
	if err != nil {
		writeWorkspaceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"workspace": snapshot})
}

func (api *API) handleFocusTab(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		TabID string `json:"tab_id"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	snapshot, err := api.runtime.FocusTab(payload.TabID)
	if err != nil {
		writeWorkspaceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"workspace": snapshot})
}

func (api *API) handleCreateTerminalTab(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Title        string `json:"title,omitempty"`
		ConnectionID string `json:"connection_id,omitempty"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	result, err := api.runtime.CreateTerminalTabWithConnection(r.Context(), payload.Title, payload.ConnectionID)
	if err != nil {
		writeWorkspaceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (api *API) handleCreateRemoteTerminalTab(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Title        string `json:"title,omitempty"`
		ConnectionID string `json:"connection_id,omitempty"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	result, err := api.runtime.CreateRemoteTerminalTab(r.Context(), payload.Title, payload.ConnectionID)
	if err != nil {
		writeWorkspaceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (api *API) handleRenameTab(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Title string `json:"title"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	result, err := api.runtime.RenameTab(r.PathValue("tabID"), payload.Title)
	if err != nil {
		writeWorkspaceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (api *API) handleSetTabPinned(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Pinned bool `json:"pinned"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	result, err := api.runtime.SetTabPinned(r.PathValue("tabID"), payload.Pinned)
	if err != nil {
		writeWorkspaceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (api *API) handleMoveTab(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		TabID       string `json:"tab_id"`
		BeforeTabID string `json:"before_tab_id"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	snapshot, err := api.runtime.MoveTab(payload.TabID, payload.BeforeTabID)
	if err != nil {
		writeWorkspaceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"workspace": snapshot})
}

func (api *API) handleCloseTab(w http.ResponseWriter, r *http.Request) {
	result, err := api.runtime.CloseTab(r.PathValue("tabID"))
	if err != nil {
		writeWorkspaceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func writeWorkspaceError(w http.ResponseWriter, err error) {
	normalized := app.NormalizePublicError(err)
	switch normalized.Code {
	case "not_found":
		writeNotFound(w, "workspace_not_found", normalized.Message)
	case "invalid_input":
		writeBadRequest(w, "invalid_workspace_request", normalized)
	default:
		writeInternalError(w, normalized)
	}
}
