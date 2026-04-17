export interface Workspace {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  tabs: WorkspaceTab[];
  active_tab_id: string;
  widgets: WorkspaceWidget[];
  active_widget_id: string;
  layout: WorkspaceLayout;
  layouts: WorkspaceLayout[];
  active_layout_id: string;
}

export type WorkspaceWidgetKind = "terminal" | "files";
export type WorkspaceLayoutMode = "split" | "focus" | "stacked" | (string & {});
export type WorkspaceLayoutSurfaceID = "terminal" | "ai" | "tools" | "audit" | "mcp" | (string & {});
export type WorkspaceLayoutRegion = "main" | "sidebar" | "utility" | (string & {});

export interface WorkspaceLayoutSurface {
  id: WorkspaceLayoutSurfaceID;
  region: WorkspaceLayoutRegion;
}

export interface WorkspaceLayout {
  id: string;
  mode: WorkspaceLayoutMode;
  surfaces: WorkspaceLayoutSurface[];
  active_surface_id: WorkspaceLayoutSurfaceID;
}

export interface WorkspaceWidget {
  id: string;
  kind: WorkspaceWidgetKind;
  title: string;
  description?: string;
  terminal_id?: string;
  connection_id?: string;
  path?: string;
}

export type WorkspaceWindowNodeKind = "leaf" | "split" | (string & {});
export type WorkspaceWindowSplitAxis = "horizontal" | "vertical" | (string & {});
export type WorkspaceWindowSplitDirection = "left" | "right" | "top" | "bottom" | (string & {});
export type WorkspaceWindowMoveDirection =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "outer-left"
  | "outer-right"
  | "outer-top"
  | "outer-bottom"
  | "center"
  | (string & {});

export interface WorkspaceWindowLayoutNode {
  kind: WorkspaceWindowNodeKind;
  widget_id?: string;
  axis?: WorkspaceWindowSplitAxis;
  first?: WorkspaceWindowLayoutNode;
  second?: WorkspaceWindowLayoutNode;
}

export interface WorkspaceTab {
  id: string;
  title: string;
  description?: string;
  pinned: boolean;
  widget_ids: string[];
  window_layout?: WorkspaceWindowLayoutNode;
}

export interface WorkspaceSnapshot {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  tabs: WorkspaceTab[];
  active_tab_id: string;
  widgets: WorkspaceWidget[];
  active_widget_id: string;
  layout: WorkspaceLayout;
  layouts: WorkspaceLayout[];
  active_layout_id: string;
}

export type WorkspaceActionResponse = {
  workspace: WorkspaceSnapshot;
};

export interface WorkspaceSummary {
  oid: string;
  name: string;
  icon: string;
  color: string;
}

export interface WorkspaceCatalogEntry {
  window_id: string;
  workspace: WorkspaceSummary;
}

export interface WorkspaceCatalogResponse {
  workspaces: WorkspaceCatalogEntry[];
}

export interface WorkspaceThemesResponse {
  colors: string[];
  icons: string[];
}

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

export interface CreateSplitTerminalWidgetRequest {
  title?: string;
  tab_id?: string;
  target_widget_id?: string;
  direction?: WorkspaceWindowSplitDirection;
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

export interface MoveWidgetBySplitRequest {
  tab_id?: string;
  widget_id: string;
  target_widget_id: string;
  direction: WorkspaceWindowMoveDirection;
}

export interface OpenDirectoryInNewBlockRequest {
  target_widget_id: string;
  path: string;
  connection_id?: string;
}

export interface UpdateLayoutRequest {
  layout: WorkspaceLayout;
}

export interface SaveLayoutRequest {
  layout_id?: string;
}

export interface SwitchLayoutRequest {
  layout_id: string;
}

export interface UpdateWorkspaceMetadataRequest {
  name: string;
  icon: string;
  color: string;
  apply_defaults: boolean;
}

export interface CloseTabResponse {
  closed_tab_id: string;
  workspace: WorkspaceSnapshot;
}
