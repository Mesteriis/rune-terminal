import type { WorkspaceClient } from "@/rterm-api/workspace/client";
import type {
  CloseTabResponse,
  CreateRemoteTerminalTabRequest,
  CreateSplitTerminalWidgetRequest,
  CreateTerminalTabRequest,
  CreateTerminalTabResponse,
  FocusTabRequest,
  FocusWidgetRequest,
  MoveTabRequest,
  RenameTabRequest,
  SaveLayoutRequest,
  SetTabPinnedRequest,
  SwitchLayoutRequest,
  UpdateLayoutRequest,
  WorkspaceActionResponse,
  WorkspaceSnapshot,
  WorkspaceTabMutation,
} from "@/rterm-api/workspace/types";
import type { CompatApiOptions } from "./types";
import { createCompatApiFacade } from "./api";

export interface WorkspaceFacade {
  focusWidget: (payload: FocusWidgetRequest) => Promise<WorkspaceActionResponse>;
  focusTab: (payload: FocusTabRequest) => Promise<WorkspaceActionResponse>;
  createTerminalTab: (payload?: CreateTerminalTabRequest) => Promise<CreateTerminalTabResponse>;
  createSplitTerminalWidget: (payload?: CreateSplitTerminalWidgetRequest) => Promise<CreateTerminalTabResponse>;
  createRemoteTerminalTab: (payload?: CreateRemoteTerminalTabRequest) => Promise<CreateTerminalTabResponse>;
  renameTab: (tabId: string, payload: RenameTabRequest) => Promise<WorkspaceTabMutation>;
  setTabPinned: (tabId: string, payload: SetTabPinnedRequest) => Promise<WorkspaceTabMutation>;
  moveTab: (payload: MoveTabRequest) => Promise<WorkspaceActionResponse>;
  updateLayout: (payload: UpdateLayoutRequest) => Promise<WorkspaceActionResponse>;
  saveLayout: (payload?: SaveLayoutRequest) => Promise<WorkspaceActionResponse>;
  switchLayout: (payload: SwitchLayoutRequest) => Promise<WorkspaceActionResponse>;
  closeTab: (tabId: string) => Promise<CloseTabResponse>;
  getWorkspace: () => Promise<WorkspaceSnapshot>;
}

let workspaceFacadePromise: Promise<WorkspaceFacade> | null = null;

function buildWorkspaceFacade(fetchImpl?: CompatApiOptions["fetchImpl"]): Promise<WorkspaceFacade> {
  const facadePromise = createCompatApiFacade({ fetchImpl }).then(({ clients }) => {
    return createWorkspaceFacade(clients.workspace);
  });
  facadePromise.catch(() => {
    workspaceFacadePromise = null;
  });
  return facadePromise;
}

export function getWorkspaceFacade(fetchImpl?: CompatApiOptions["fetchImpl"]): Promise<WorkspaceFacade> {
  if (workspaceFacadePromise == null) {
    workspaceFacadePromise = buildWorkspaceFacade(fetchImpl);
  }
  return workspaceFacadePromise;
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
    createSplitTerminalWidget(payload: CreateSplitTerminalWidgetRequest = {}): Promise<CreateTerminalTabResponse> {
      return client.createSplitTerminalWidget(payload);
    },
    createRemoteTerminalTab(payload: CreateRemoteTerminalTabRequest = {}): Promise<CreateTerminalTabResponse> {
      return client.createRemoteTerminalTab(payload);
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
    updateLayout(payload: UpdateLayoutRequest): Promise<WorkspaceActionResponse> {
      return client.updateLayout(payload);
    },
    saveLayout(payload: SaveLayoutRequest = {}): Promise<WorkspaceActionResponse> {
      return client.saveLayout(payload);
    },
    switchLayout(payload: SwitchLayoutRequest): Promise<WorkspaceActionResponse> {
      return client.switchLayout(payload);
    },
    closeTab(tabId: string): Promise<CloseTabResponse> {
      return client.closeTab(tabId);
    },
    getWorkspace(): Promise<WorkspaceSnapshot> {
      return client.getWorkspace();
    },
  };
}
