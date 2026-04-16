export interface Workspace {
  id: string;
  name: string;
  tabs: WorkspaceTab[];
  active_tab_id: string;
  widgets: WorkspaceWidget[];
  active_widget_id: string;
}

export type WorkspaceWidgetKind = "terminal";

export interface WorkspaceWidget {
  id: string;
  kind: WorkspaceWidgetKind;
  title: string;
  description?: string;
  terminal_id?: string;
  connection_id?: string;
}

export interface WorkspaceTab {
  id: string;
  title: string;
  description?: string;
  pinned: boolean;
  widget_ids: string[];
}

export interface WorkspaceSnapshot {
  id: string;
  name: string;
  tabs: WorkspaceTab[];
  active_tab_id: string;
  widgets: WorkspaceWidget[];
  active_widget_id: string;
}

export type WorkspaceActionResponse = {
  workspace: WorkspaceSnapshot;
};

export interface WorkspaceTabMutation {
  tab: WorkspaceTab;
  workspace: WorkspaceSnapshot;
}

export interface CreateTerminalTabRequest {
  title?: string;
  connection_id?: string;
}

export interface CreateRemoteTerminalTabRequest {
  title?: string;
  connection_id?: string;
}

export interface CreateTerminalTabResponse {
  tab_id: string;
  widget_id: string;
  workspace: WorkspaceSnapshot;
}

export interface FocusWidgetRequest {
  widget_id: string;
}

export interface FocusTabRequest {
  tab_id: string;
}

export interface RenameTabRequest {
  title: string;
}

export interface SetTabPinnedRequest {
  pinned: boolean;
}

export interface MoveTabRequest {
  tab_id: string;
  before_tab_id: string;
}

export interface CloseTabResponse {
  closed_tab_id: string;
  workspace: WorkspaceSnapshot;
}
