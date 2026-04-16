import type {
  CloseTabResponse,
  CreateRemoteTerminalTabRequest,
  CreateTerminalTabRequest,
  CreateTerminalTabResponse,
  FocusTabRequest,
  FocusWidgetRequest,
  MoveTabRequest,
  RenameTabRequest,
  SetTabPinnedRequest,
  WorkspaceActionResponse,
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

  closeTab(tabID: string): Promise<CloseTabResponse> {
    return this.http.delete<CloseTabResponse>(`/api/v1/workspace/tabs/${encodeURIComponent(tabID)}`);
  }

  getWorkspace(): Promise<WorkspaceSnapshot> {
    return this.http.get<WorkspaceSnapshot>("/api/v1/workspace");
  }
}
