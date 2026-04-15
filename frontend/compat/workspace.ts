import type { WorkspaceClient } from "@/rterm-api/workspace/client";
import type {
  CloseTabResponse,
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
} from "@/rterm-api/workspace/types";

export interface WorkspaceFacade {
  focusWidget: (payload: FocusWidgetRequest) => Promise<WorkspaceActionResponse>;
  focusTab: (payload: FocusTabRequest) => Promise<WorkspaceActionResponse>;
  createTerminalTab: (payload?: CreateTerminalTabRequest) => Promise<CreateTerminalTabResponse>;
  renameTab: (tabId: string, payload: RenameTabRequest) => Promise<WorkspaceTabMutation>;
  setTabPinned: (tabId: string, payload: SetTabPinnedRequest) => Promise<WorkspaceTabMutation>;
  moveTab: (payload: MoveTabRequest) => Promise<WorkspaceActionResponse>;
  closeTab: (tabId: string) => Promise<CloseTabResponse>;
  getWorkspace: () => Promise<WorkspaceSnapshot>;
}

export function createWorkspaceFacade(client: WorkspaceClient): WorkspaceFacade {
  return {
    focusWidget(payload: FocusWidgetRequest): Promise<WorkspaceActionResponse> {
      return client.focusWidget(payload);
    },
    focusTab(payload: FocusTabRequest): Promise<WorkspaceActionResponse> {
      return client.focusTab(payload);
    },
    createTerminalTab(payload: CreateTerminalTabRequest = {}): Promise<CreateTerminalTabResponse> {
      return client.createTerminalTab(payload);
    },
    renameTab(tabId: string, payload: RenameTabRequest): Promise<WorkspaceTabMutation> {
      return client.renameTab(tabId, payload);
    },
    setTabPinned(tabId: string, payload: SetTabPinnedRequest): Promise<WorkspaceTabMutation> {
      return client.setTabPinned(tabId, payload);
    },
    moveTab(payload: MoveTabRequest): Promise<WorkspaceActionResponse> {
      return client.moveTab(payload);
    },
    closeTab(tabId: string): Promise<CloseTabResponse> {
      return client.closeTab(tabId);
    },
    getWorkspace(): Promise<WorkspaceSnapshot> {
      return client.getWorkspace();
    },
  };
}
