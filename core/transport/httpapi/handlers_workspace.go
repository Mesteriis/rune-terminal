package httpapi

import (
	"net/http"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/app"
	"github.com/Mesteriis/rune-terminal/core/workspace"
)

func (api *API) handleListWorkspaces(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"workspaces": api.runtime.ListWorkspaces(),
	})
}

func (api *API) handleWorkspaceThemes(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"colors": workspace.WorkspaceColors,
		"icons":  workspace.WorkspaceIcons,
	})
}

func (api *API) handleWorkspaceWidgetKinds(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"widget_kinds": workspace.WidgetKindCatalog(),
	})
}

func (api *API) handleCreateWorkspace(w http.ResponseWriter, r *http.Request) {
	snapshot, err := api.runtime.CreateWorkspace(r.Context())
	if err != nil {
		writeWorkspaceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"workspace": snapshot})
}

func (api *API) handleActivateWorkspace(w http.ResponseWriter, r *http.Request) {
	snapshot, err := api.runtime.SwitchWorkspace(r.PathValue("workspaceID"))
	if err != nil {
		writeWorkspaceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"workspace": snapshot})
}

func (api *API) handleUpdateWorkspaceMetadata(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Name          string `json:"name"`
		Icon          string `json:"icon"`
		Color         string `json:"color"`
		ApplyDefaults bool   `json:"apply_defaults"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	snapshot, err := api.runtime.UpdateWorkspaceMetadata(
		r.PathValue("workspaceID"),
		payload.Name,
		payload.Icon,
		payload.Color,
		payload.ApplyDefaults,
	)
	if err != nil {
		writeWorkspaceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"workspace": snapshot})
}

func (api *API) handleDeleteWorkspace(w http.ResponseWriter, r *http.Request) {
	snapshot, err := api.runtime.DeleteWorkspace(r.PathValue("workspaceID"))
	if err != nil {
		writeWorkspaceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"workspace": snapshot})
}

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

func (api *API) handleCreateSplitTerminalWidget(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Title          string `json:"title,omitempty"`
		TabID          string `json:"tab_id,omitempty"`
		TargetWidgetID string `json:"target_widget_id,omitempty"`
		Direction      string `json:"direction,omitempty"`
		ConnectionID   string `json:"connection_id,omitempty"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	direction, err := workspace.ParseWindowSplitDirection(payload.Direction)
	if err != nil {
		writeWorkspaceError(w, err)
		return
	}
	result, err := api.runtime.CreateSplitTerminalWidget(
		r.Context(),
		payload.Title,
		payload.TabID,
		payload.TargetWidgetID,
		direction,
		payload.ConnectionID,
	)
	if err != nil {
		writeWorkspaceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (api *API) handleMoveWidgetBySplit(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		TabID          string `json:"tab_id,omitempty"`
		WidgetID       string `json:"widget_id"`
		TargetWidgetID string `json:"target_widget_id"`
		Direction      string `json:"direction"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	if strings.TrimSpace(payload.Direction) == "" {
		writeWorkspaceError(w, workspace.ErrInvalidWindowSplitDirection)
		return
	}
	direction, err := workspace.ParseWindowMoveDirection(payload.Direction)
	if err != nil {
		writeWorkspaceError(w, err)
		return
	}
	snapshot, err := api.runtime.MoveWidgetBySplit(
		payload.TabID,
		payload.WidgetID,
		payload.TargetWidgetID,
		direction,
	)
	if err != nil {
		writeWorkspaceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"workspace": snapshot})
}

func (api *API) handleOpenDirectoryInNewBlock(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		TargetWidgetID string `json:"target_widget_id"`
		Path           string `json:"path"`
		ConnectionID   string `json:"connection_id,omitempty"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	result, err := api.runtime.OpenDirectoryInNewBlock(payload.Path, payload.TargetWidgetID, payload.ConnectionID)
	if err != nil {
		writeWorkspaceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (api *API) handleSaveLayout(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		LayoutID string `json:"layout_id,omitempty"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	snapshot, err := api.runtime.SaveLayout(payload.LayoutID)
	if err != nil {
		writeWorkspaceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"workspace": snapshot})
}

func (api *API) handleSwitchLayout(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		LayoutID string `json:"layout_id"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	snapshot, err := api.runtime.SwitchLayout(payload.LayoutID)
	if err != nil {
		writeWorkspaceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"workspace": snapshot})
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
