import { workspaceStore, type WorkspaceStoreSnapshot } from "@/app/state/workspace.store";
import { useSyncExternalStore } from "react";
import { deriveSessionTarget, type SessionTarget } from "./session-target";

export interface ActiveRemoteTarget {
    connectionID: string;
}

export interface ActiveWorkspaceContext {
    workspaceID: string;
    activeWidgetID: string;
    activeWidgetKind: string;
    activeFilePath: string;
    activeTerminalTarget: SessionTarget | null;
    activeRemoteTarget: ActiveRemoteTarget | null;
}

let activeFilePath = "";
let workspaceUnsubscribe: (() => void) | null = null;
const listeners = new Set<() => void>();

function emitContextChange(): void {
    for (const listener of listeners) {
        listener();
    }
}

function normalizePath(path: string): string {
    return path.trim();
}

function ensureWorkspaceSubscription(): void {
    if (workspaceUnsubscribe != null) {
        return;
    }
    workspaceUnsubscribe = workspaceStore.subscribe(() => {
        if (listeners.size === 0) {
            return;
        }
        emitContextChange();
    });
}

export function deriveActiveWorkspaceContext(
    workspace: WorkspaceStoreSnapshot["active"],
    selectedFilePath: string,
): ActiveWorkspaceContext {
    const activeWidgetID = workspace.activewidgetid || "";
    const activeWidget = activeWidgetID ? workspace.widgets[activeWidgetID] : undefined;
    const activeWidgetKind = activeWidget?.kind || "";
    const terminalTarget = activeWidget != null ? deriveSessionTarget(activeWidget.connectionId) : null;
    const activeRemoteTarget =
        terminalTarget != null && terminalTarget.targetSession === "remote"
            ? { connectionID: terminalTarget.targetConnectionID }
            : null;

    return {
        workspaceID: workspace.oid || "",
        activeWidgetID,
        activeWidgetKind,
        activeFilePath: normalizePath(selectedFilePath),
        activeTerminalTarget: terminalTarget,
        activeRemoteTarget,
    };
}

export function getActiveWorkspaceContext(): ActiveWorkspaceContext {
    const workspace = workspaceStore.getSnapshot().active;
    return deriveActiveWorkspaceContext(workspace, activeFilePath);
}

export function setActiveFilePath(path: string): void {
    const normalizedPath = normalizePath(path);
    if (normalizedPath === activeFilePath) {
        return;
    }
    activeFilePath = normalizedPath;
    emitContextChange();
}

export function clearActiveFilePath(): void {
    if (activeFilePath === "") {
        return;
    }
    activeFilePath = "";
    emitContextChange();
}

function subscribeActiveWorkspaceContext(listener: () => void): () => void {
    ensureWorkspaceSubscription();
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function useActiveWorkspaceContext(): ActiveWorkspaceContext {
    return useSyncExternalStore(subscribeActiveWorkspaceContext, getActiveWorkspaceContext, getActiveWorkspaceContext);
}

