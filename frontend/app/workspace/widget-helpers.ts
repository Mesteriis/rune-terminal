import { workspaceStore } from "@/app/state/workspace.store";
import type { ToolExecutionResponse } from "@/rterm-api/tools/types";
import { createBlock } from "@/store/global";
import { deriveSessionTarget } from "./session-target";

export function sortByDisplayOrder(wmap: { [key: string]: WidgetConfigType }): WidgetConfigType[] {
    if (wmap == null) {
        return [];
    }
    const wlist = Object.values(wmap);
    wlist.sort((a, b) => {
        return (a["display:order"] ?? 0) - (b["display:order"] ?? 0);
    });
    return wlist;
}

export async function handleWidgetSelect(widget: WidgetConfigType) {
    const blockDef = widget.blockdef;
    createBlock(blockDef, widget.magnified);
}

export function calculateGridSize(appCount: number): number {
    if (appCount <= 4) return 2;
    if (appCount <= 9) return 3;
    if (appCount <= 16) return 4;
    if (appCount <= 25) return 5;
    return 6;
}

export function normalizeAppList(apps: AppInfo[] | null | undefined): AppInfo[] {
    return Array.isArray(apps) ? apps : [];
}

export function formatJson(value: unknown): string {
    if (value == null) {
        return "{}";
    }
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return "{}";
    }
}

export function formatAuditTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
        return timestamp;
    }
    return date.toLocaleString();
}

export function buildToolExecutionContext(repoRoot: string) {
    const workspace = workspaceStore.getSnapshot().active;
    const activeWidget = workspace.activewidgetid ? workspace.widgets[workspace.activewidgetid] : undefined;
    const sessionTarget = activeWidget
        ? deriveSessionTarget(activeWidget.connectionId)
        : null;
    return {
        workspace_id: workspace.oid || undefined,
        active_widget_id: workspace.activewidgetid || undefined,
        repo_root: repoRoot || undefined,
        target_session: sessionTarget?.targetSession,
        target_connection_id: sessionTarget?.targetConnectionID,
    };
}

export function getApprovalToken(response: ToolExecutionResponse): string | null {
    const output = response.output;
    if (output == null || typeof output !== "object") {
        return null;
    }
    const token = (output as Record<string, unknown>).approval_token;
    return typeof token === "string" ? token : null;
}
