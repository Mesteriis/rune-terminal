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
		api.appendWorkspaceMutationAudit("workspace.create", "", "", "", nil, nil, err)
		writeWorkspaceError(w, err)
		return
	}
	api.appendWorkspaceMutationAudit("workspace.create", "", snapshot.ID, "", nil, nil, nil)
	writeJSON(w, http.StatusOK, map[string]any{"workspace": snapshot})
}

func (api *API) handleActivateWorkspace(w http.ResponseWriter, r *http.Request) {
	workspaceID := r.PathValue("workspaceID")
	snapshot, err := api.runtime.SwitchWorkspace(workspaceID)
	if err != nil {
		api.appendWorkspaceMutationAudit("workspace.activate", "", workspaceID, "", nil, nil, err)
		writeWorkspaceError(w, err)
		return
	}
	api.appendWorkspaceMutationAudit("workspace.activate", "", snapshot.ID, "", nil, nil, nil)
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
		api.appendWorkspaceMutationAudit("workspace.update_metadata", "", r.PathValue("workspaceID"), "", nil, nil, err)
		writeWorkspaceError(w, err)
		return
	}
	api.appendWorkspaceMutationAudit("workspace.update_metadata", "", snapshot.ID, "", nil, nil, nil)
	writeJSON(w, http.StatusOK, map[string]any{"workspace": snapshot})
}

func (api *API) handleDeleteWorkspace(w http.ResponseWriter, r *http.Request) {
	workspaceID := r.PathValue("workspaceID")
	snapshot, err := api.runtime.DeleteWorkspace(workspaceID)
	if err != nil {
		api.appendWorkspaceMutationAudit("workspace.delete", "", workspaceID, "", nil, nil, err)
		writeWorkspaceError(w, err)
		return
	}
	api.appendWorkspaceMutationAudit("workspace.delete", "", workspaceID, "", nil, nil, nil)
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
		api.appendWorkspaceMutationAudit("workspace.focus_widget", "", "", "", nil, []string{payload.WidgetID}, err)
		writeWorkspaceError(w, err)
		return
	}
	api.appendWorkspaceMutationAudit("workspace.focus_widget", "", snapshot.ID, "", nil, []string{payload.WidgetID}, nil)
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
	summary := workspaceAuditSummary(
		workspaceAuditKV("layout_id", payload.Layout.ID),
		workspaceAuditKV("active_surface_id", string(payload.Layout.ActiveSurfaceID)),
	)
	if err != nil {
		api.appendWorkspaceMutationAudit("workspace.update_layout", summary, "", "", nil, nil, err)
		writeWorkspaceError(w, err)
		return
	}
	api.appendWorkspaceMutationAudit("workspace.update_layout", summary, snapshot.ID, "", nil, nil, nil)
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
	summary := workspaceAuditKV("tab_id", payload.TabID)
	if err != nil {
		api.appendWorkspaceMutationAudit("workspace.focus_tab", summary, "", "", nil, nil, err)
		writeWorkspaceError(w, err)
		return
	}
	api.appendWorkspaceMutationAudit("workspace.focus_tab", summary, snapshot.ID, "", nil, []string{snapshot.ActiveWidgetID}, nil)
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
		api.appendWorkspaceMutationAudit("workspace.create_terminal_tab", "", "", payload.ConnectionID, nil, nil, err)
		writeWorkspaceError(w, err)
		return
	}
	connectionID := workspaceAuditConnectionID(payload.ConnectionID, result.Workspace, result.WidgetID)
	api.appendWorkspaceMutationAudit("workspace.create_terminal_tab", workspaceAuditKV("tab_id", result.TabID), result.Workspace.ID, connectionID, nil, []string{result.WidgetID}, nil)
	writeJSON(w, http.StatusOK, result)
}

func (api *API) handleCreateSplitTerminalWidget(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Title          string `json:"title,omitempty"`
		TabID          string `json:"tab_id,omitempty"`
		TargetWidgetID string `json:"target_widget_id,omitempty"`
		Direction      string `json:"direction,omitempty"`
		ConnectionID   string `json:"connection_id,omitempty"`
		WorkingDir     string `json:"working_dir,omitempty"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	direction, err := workspace.ParseWindowSplitDirection(payload.Direction)
	summary := workspaceAuditSummary(
		workspaceAuditKV("tab_id", payload.TabID),
		workspaceAuditKV("direction", payload.Direction),
	)
	if err != nil {
		api.appendWorkspaceMutationAudit("workspace.create_split_terminal_widget", summary, "", payload.ConnectionID, []string{payload.WorkingDir}, []string{payload.TargetWidgetID}, err)
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
		payload.WorkingDir,
	)
	if err != nil {
		api.appendWorkspaceMutationAudit("workspace.create_split_terminal_widget", summary, "", payload.ConnectionID, []string{payload.WorkingDir}, []string{payload.TargetWidgetID}, err)
		writeWorkspaceError(w, err)
		return
	}
	successSummary := summary
	if strings.TrimSpace(payload.TabID) == "" {
		successSummary = workspaceAuditSummary(summary, workspaceAuditKV("tab_id", result.TabID))
	}
	connectionID := workspaceAuditConnectionID(payload.ConnectionID, result.Workspace, result.WidgetID)
	api.appendWorkspaceMutationAudit("workspace.create_split_terminal_widget", successSummary, result.Workspace.ID, connectionID, []string{payload.WorkingDir}, []string{result.WidgetID, payload.TargetWidgetID}, nil)
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
	summary := workspaceAuditSummary(
		workspaceAuditKV("tab_id", payload.TabID),
		workspaceAuditKV("direction", payload.Direction),
	)
	if strings.TrimSpace(payload.Direction) == "" {
		api.appendWorkspaceMutationAudit("workspace.move_widget_split", summary, "", "", nil, []string{payload.WidgetID, payload.TargetWidgetID}, workspace.ErrInvalidWindowSplitDirection)
		writeWorkspaceError(w, workspace.ErrInvalidWindowSplitDirection)
		return
	}
	direction, err := workspace.ParseWindowMoveDirection(payload.Direction)
	if err != nil {
		api.appendWorkspaceMutationAudit("workspace.move_widget_split", summary, "", "", nil, []string{payload.WidgetID, payload.TargetWidgetID}, err)
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
		api.appendWorkspaceMutationAudit("workspace.move_widget_split", summary, "", "", nil, []string{payload.WidgetID, payload.TargetWidgetID}, err)
		writeWorkspaceError(w, err)
		return
	}
	api.appendWorkspaceMutationAudit("workspace.move_widget_split", summary, snapshot.ID, "", nil, []string{payload.WidgetID, payload.TargetWidgetID}, nil)
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
		api.appendWorkspaceMutationAudit("workspace.open_directory", "", "", payload.ConnectionID, []string{payload.Path}, []string{payload.TargetWidgetID}, err)
		writeWorkspaceError(w, err)
		return
	}
	connectionID := workspaceAuditConnectionID(payload.ConnectionID, result.Workspace, result.WidgetID)
	api.appendWorkspaceMutationAudit("workspace.open_directory", "", result.Workspace.ID, connectionID, []string{payload.Path}, []string{payload.TargetWidgetID, result.WidgetID}, nil)
	writeJSON(w, http.StatusOK, result)
}

func (api *API) handleOpenPreviewInNewBlock(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		TargetWidgetID string `json:"target_widget_id"`
		Path           string `json:"path"`
		ConnectionID   string `json:"connection_id,omitempty"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	result, err := api.runtime.OpenPreviewInNewBlock(payload.Path, payload.TargetWidgetID, payload.ConnectionID)
	if err != nil {
		api.appendWorkspaceMutationAudit("workspace.open_preview", "", "", payload.ConnectionID, []string{payload.Path}, []string{payload.TargetWidgetID}, err)
		writeWorkspaceError(w, err)
		return
	}
	connectionID := workspaceAuditConnectionID(payload.ConnectionID, result.Workspace, result.WidgetID)
	api.appendWorkspaceMutationAudit("workspace.open_preview", "", result.Workspace.ID, connectionID, []string{payload.Path}, []string{payload.TargetWidgetID, result.WidgetID}, nil)
	writeJSON(w, http.StatusOK, result)
}

func (api *API) handleCloseWidget(w http.ResponseWriter, r *http.Request) {
	widgetID := r.PathValue("widgetID")
	result, err := api.runtime.CloseWidget(widgetID)
	if err != nil {
		api.appendWorkspaceMutationAudit("workspace.close_widget", "", "", "", nil, []string{widgetID}, err)
		writeWorkspaceError(w, err)
		return
	}
	api.appendWorkspaceMutationAudit("workspace.close_widget", "", result.Workspace.ID, "", nil, []string{result.ClosedWidgetID}, nil)
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
	summary := workspaceAuditKV("layout_id", payload.LayoutID)
	snapshot, err := api.runtime.SaveLayout(payload.LayoutID)
	if err != nil {
		api.appendWorkspaceMutationAudit("workspace.save_layout", summary, "", "", nil, nil, err)
		writeWorkspaceError(w, err)
		return
	}
	api.appendWorkspaceMutationAudit("workspace.save_layout", workspaceAuditSummary(summary, workspaceAuditKV("active_layout_id", snapshot.ActiveLayoutID)), snapshot.ID, "", nil, nil, nil)
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
	summary := workspaceAuditKV("layout_id", payload.LayoutID)
	snapshot, err := api.runtime.SwitchLayout(payload.LayoutID)
	if err != nil {
		api.appendWorkspaceMutationAudit("workspace.switch_layout", summary, "", "", nil, nil, err)
		writeWorkspaceError(w, err)
		return
	}
	api.appendWorkspaceMutationAudit("workspace.switch_layout", summary, snapshot.ID, "", nil, nil, nil)
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
		api.appendWorkspaceMutationAudit("workspace.create_remote_terminal_tab", "", "", payload.ConnectionID, nil, nil, err)
		writeWorkspaceError(w, err)
		return
	}
	connectionID := workspaceAuditConnectionID(payload.ConnectionID, result.Workspace, result.WidgetID)
	api.appendWorkspaceMutationAudit("workspace.create_remote_terminal_tab", workspaceAuditKV("tab_id", result.TabID), result.Workspace.ID, connectionID, nil, []string{result.WidgetID}, nil)
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
	tabID := r.PathValue("tabID")
	summary := workspaceAuditKV("tab_id", tabID)
	result, err := api.runtime.RenameTab(tabID, payload.Title)
	if err != nil {
		api.appendWorkspaceMutationAudit("workspace.rename_tab", summary, "", "", nil, nil, err)
		writeWorkspaceError(w, err)
		return
	}
	api.appendWorkspaceMutationAudit("workspace.rename_tab", summary, result.Workspace.ID, "", nil, nil, nil)
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
	tabID := r.PathValue("tabID")
	summary := workspaceAuditKV("tab_id", tabID)
	result, err := api.runtime.SetTabPinned(tabID, payload.Pinned)
	if err != nil {
		api.appendWorkspaceMutationAudit("workspace.set_tab_pinned", summary, "", "", nil, nil, err)
		writeWorkspaceError(w, err)
		return
	}
	api.appendWorkspaceMutationAudit("workspace.set_tab_pinned", summary, result.Workspace.ID, "", nil, nil, nil)
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
	summary := workspaceAuditSummary(
		workspaceAuditKV("tab_id", payload.TabID),
		workspaceAuditKV("before_tab_id", payload.BeforeTabID),
	)
	snapshot, err := api.runtime.MoveTab(payload.TabID, payload.BeforeTabID)
	if err != nil {
		api.appendWorkspaceMutationAudit("workspace.move_tab", summary, "", "", nil, nil, err)
		writeWorkspaceError(w, err)
		return
	}
	api.appendWorkspaceMutationAudit("workspace.move_tab", summary, snapshot.ID, "", nil, nil, nil)
	writeJSON(w, http.StatusOK, map[string]any{"workspace": snapshot})
}

func (api *API) handleCloseTab(w http.ResponseWriter, r *http.Request) {
	tabID := r.PathValue("tabID")
	summary := workspaceAuditKV("tab_id", tabID)
	result, err := api.runtime.CloseTab(tabID)
	if err != nil {
		api.appendWorkspaceMutationAudit("workspace.close_tab", summary, "", "", nil, nil, err)
		writeWorkspaceError(w, err)
		return
	}
	api.appendWorkspaceMutationAudit("workspace.close_tab", summary, result.Workspace.ID, "", nil, nil, nil)
	writeJSON(w, http.StatusOK, result)
}

func (api *API) appendWorkspaceMutationAudit(
	toolName string,
	summary string,
	workspaceID string,
	connectionID string,
	paths []string,
	widgets []string,
	err error,
) {
	if api == nil || api.runtime == nil {
		return
	}
	workspaceID = strings.TrimSpace(workspaceID)
	if workspaceID == "" && api.runtime.Workspace != nil {
		workspaceID = api.runtime.Workspace.Snapshot().ID
	}
	api.runtime.AppendWorkspaceAudit(app.WorkspaceAuditInput{
		ToolName:           toolName,
		Summary:            summary,
		WorkspaceID:        workspaceID,
		TargetConnectionID: connectionID,
		AffectedPaths:      paths,
		AffectedWidgets:    widgets,
		Success:            err == nil,
		Error:              err,
	})
}

func workspaceAuditSummary(parts ...string) string {
	normalized := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		normalized = append(normalized, part)
	}
	return strings.Join(normalized, " ")
}

func workspaceAuditKV(key string, value string) string {
	key = strings.TrimSpace(key)
	value = strings.TrimSpace(value)
	if key == "" || value == "" {
		return ""
	}
	return key + "=" + value
}

func workspaceAuditConnectionID(requested string, snapshot workspace.Snapshot, widgetID string) string {
	requested = strings.TrimSpace(requested)
	if requested != "" {
		return requested
	}
	widgetID = strings.TrimSpace(widgetID)
	for _, widget := range snapshot.Widgets {
		if widget.ID == widgetID {
			return strings.TrimSpace(widget.ConnectionID)
		}
	}
	return ""
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
