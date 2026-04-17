import type {
  CloseTabResponse,
  CreateRemoteTerminalTabRequest,
  CreateSplitTerminalWidgetRequest,
  CreateTerminalTabRequest,
  CreateTerminalTabResponse,
  FocusTabRequest,
  FocusWidgetRequest,
  MoveWidgetBySplitRequest,
  MoveTabRequest,
  OpenDirectoryInNewBlockRequest,
  RenameTabRequest,
  SaveLayoutRequest,
  SetTabPinnedRequest,
  SwitchLayoutRequest,
  UpdateWorkspaceMetadataRequest,
  UpdateLayoutRequest,
  WorkspaceActionResponse,
  WorkspaceCatalogResponse,
  WorkspaceThemesResponse,
  WorkspaceSnapshot,
  WorkspaceTabMutation,
} from "./types";
import { HttpClient } from "../http/client";

export class WorkspaceClient {
  constructor(private readonly http: HttpClient) {}

  focusWidget(payload: FocusWidgetRequest): Promise<WorkspaceActionResponse> {
    return this.http.post<WorkspaceActionResponse, FocusWidgetRequest>("/api/v1/workspace/focus-widget", {
      body: payload,
    });
  }

  focusTab(payload: FocusTabRequest): Promise<WorkspaceActionResponse> {
    return this.http.post<WorkspaceActionResponse, FocusTabRequest>("/api/v1/workspace/focus-tab", {
      body: payload,
    });
  }

  createTerminalTab(payload: CreateTerminalTabRequest = {}): Promise<CreateTerminalTabResponse> {
    return this.http.post<CreateTerminalTabResponse, CreateTerminalTabRequest>("/api/v1/workspace/tabs", {
      body: payload,
    });
  }

  createSplitTerminalWidget(payload: CreateSplitTerminalWidgetRequest = {}): Promise<CreateTerminalTabResponse> {
    return this.http.post<CreateTerminalTabResponse, CreateSplitTerminalWidgetRequest>("/api/v1/workspace/widgets/split", {
      body: payload,
    });
  }

  createRemoteTerminalTab(payload: CreateRemoteTerminalTabRequest = {}): Promise<CreateTerminalTabResponse> {
    return this.http.post<CreateTerminalTabResponse, CreateRemoteTerminalTabRequest>("/api/v1/workspace/tabs/remote", {
      body: payload,
    });
  }

  renameTab(tabID: string, payload: RenameTabRequest): Promise<WorkspaceTabMutation> {
    return this.http.patch<WorkspaceTabMutation, RenameTabRequest>(
      `/api/v1/workspace/tabs/${encodeURIComponent(tabID)}/rename`,
      { body: payload },
    );
  }

  setTabPinned(tabID: string, payload: SetTabPinnedRequest): Promise<WorkspaceTabMutation> {
    return this.http.patch<WorkspaceTabMutation, SetTabPinnedRequest>(
      `/api/v1/workspace/tabs/${encodeURIComponent(tabID)}/pinned`,
      { body: payload },
    );
  }

  moveTab(payload: MoveTabRequest): Promise<WorkspaceActionResponse> {
    return this.http.post<WorkspaceActionResponse, MoveTabRequest>("/api/v1/workspace/tabs/move", {
      body: payload,
    });
  }

  moveWidgetBySplit(payload: MoveWidgetBySplitRequest): Promise<WorkspaceActionResponse> {
    return this.http.post<WorkspaceActionResponse, MoveWidgetBySplitRequest>("/api/v1/workspace/widgets/move-split", {
      body: payload,
    });
  }

  openDirectoryInNewBlock(payload: OpenDirectoryInNewBlockRequest): Promise<CreateTerminalTabResponse> {
    return this.http.post<CreateTerminalTabResponse, OpenDirectoryInNewBlockRequest>("/api/v1/workspace/widgets/open-directory", {
      body: payload,
    });
  }

  closeTab(tabID: string): Promise<CloseTabResponse> {
    return this.http.delete<CloseTabResponse>(`/api/v1/workspace/tabs/${encodeURIComponent(tabID)}`);
  }

  updateLayout(payload: UpdateLayoutRequest): Promise<WorkspaceActionResponse> {
    return this.http.patch<WorkspaceActionResponse, UpdateLayoutRequest>("/api/v1/workspace/layout", {
      body: payload,
    });
  }

  saveLayout(payload: SaveLayoutRequest = {}): Promise<WorkspaceActionResponse> {
    return this.http.post<WorkspaceActionResponse, SaveLayoutRequest>("/api/v1/workspace/layouts/save", {
      body: payload,
    });
  }

  switchLayout(payload: SwitchLayoutRequest): Promise<WorkspaceActionResponse> {
    return this.http.post<WorkspaceActionResponse, SwitchLayoutRequest>("/api/v1/workspace/layouts/switch", {
      body: payload,
    });
  }

  getWorkspace(): Promise<WorkspaceSnapshot> {
    return this.http.get<WorkspaceSnapshot>("/api/v1/workspace");
  }

  listWorkspaces(): Promise<WorkspaceCatalogResponse> {
    return this.http.get<WorkspaceCatalogResponse>("/api/v1/workspaces");
  }

  getWorkspaceThemes(): Promise<WorkspaceThemesResponse> {
    return this.http.get<WorkspaceThemesResponse>("/api/v1/workspaces/themes");
  }

  createWorkspace(): Promise<WorkspaceActionResponse> {
    return this.http.post<WorkspaceActionResponse>("/api/v1/workspaces");
  }

  activateWorkspace(workspaceID: string): Promise<WorkspaceActionResponse> {
    return this.http.post<WorkspaceActionResponse>(`/api/v1/workspaces/${encodeURIComponent(workspaceID)}/activate`);
  }

  updateWorkspaceMetadata(workspaceID: string, payload: UpdateWorkspaceMetadataRequest): Promise<WorkspaceActionResponse> {
    return this.http.patch<WorkspaceActionResponse, UpdateWorkspaceMetadataRequest>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceID)}`,
      { body: payload },
    );
  }

  deleteWorkspace(workspaceID: string): Promise<WorkspaceActionResponse> {
    return this.http.delete<WorkspaceActionResponse>(`/api/v1/workspaces/${encodeURIComponent(workspaceID)}`);
  }
}
