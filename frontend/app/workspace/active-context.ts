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
let cachedContext: ActiveWorkspaceContext | null = null;
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
    const nextContext = deriveActiveWorkspaceContext(workspace, activeFilePath);
    if (cachedContext != null && contextEquals(cachedContext, nextContext)) {
        return cachedContext;
    }
    cachedContext = nextContext;
    return nextContext;
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

function contextEquals(left: ActiveWorkspaceContext, right: ActiveWorkspaceContext): boolean {
    return (
        left.workspaceID === right.workspaceID &&
        left.activeWidgetID === right.activeWidgetID &&
        left.activeWidgetKind === right.activeWidgetKind &&
        left.activeFilePath === right.activeFilePath &&
        sessionTargetEquals(left.activeTerminalTarget, right.activeTerminalTarget) &&
        activeRemoteTargetEquals(left.activeRemoteTarget, right.activeRemoteTarget)
    );
}

function sessionTargetEquals(left: SessionTarget | null, right: SessionTarget | null): boolean {
    if (left == null || right == null) {
        return left === right;
    }
    return left.targetSession === right.targetSession && left.targetConnectionID === right.targetConnectionID;
}

function activeRemoteTargetEquals(left: ActiveRemoteTarget | null, right: ActiveRemoteTarget | null): boolean {
    if (left == null || right == null) {
        return left === right;
    }
    return left.connectionID === right.connectionID;
}
