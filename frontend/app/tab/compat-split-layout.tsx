import { workspaceStore, type WorkspaceStoreTab, type WorkspaceStoreWidget, type WorkspaceStoreWindowLayoutNode } from "@/app/state/workspace.store";
import { CompatTerminalView } from "@/app/view/term/compat-terminal";
import { CenteredDiv } from "@/element/quickelems";
import clsx from "clsx";
import { memo, useMemo, useState, type ReactNode } from "react";

type WindowSplitDirection = "left" | "right" | "top" | "bottom";

interface CompatSplitLayoutProps {
    tabId: string;
    tab?: WorkspaceStoreTab;
    widgets: Record<string, WorkspaceStoreWidget>;
    activeWidgetId: string;
}

function cloneNode(node: WorkspaceStoreWindowLayoutNode | undefined): WorkspaceStoreWindowLayoutNode | undefined {
    if (node == null) {
        return undefined;
    }
    return {
        kind: node.kind,
        widgetId: node.widgetId,
        axis: node.axis,
        first: cloneNode(node.first),
        second: cloneNode(node.second),
    };
}

function splitNodeAtTarget(
    node: WorkspaceStoreWindowLayoutNode | undefined,
    targetWidgetId: string,
    newWidgetId: string,
    direction: WindowSplitDirection,
): { node: WorkspaceStoreWindowLayoutNode | undefined; changed: boolean } {
    if (node == null || targetWidgetId === "" || newWidgetId === "") {
        return { node: cloneNode(node), changed: false };
    }
    if (node.kind === "leaf") {
        if (node.widgetId !== targetWidgetId) {
            return { node: cloneNode(node), changed: false };
        }
        const axis = direction === "left" || direction === "right" ? "horizontal" : "vertical";
        const firstIsNew = direction === "left" || direction === "top";
        return {
            node: {
                kind: "split",
                axis,
                first: firstIsNew ? { kind: "leaf", widgetId: newWidgetId } : { kind: "leaf", widgetId: targetWidgetId },
                second: firstIsNew ? { kind: "leaf", widgetId: targetWidgetId } : { kind: "leaf", widgetId: newWidgetId },
            },
            changed: true,
        };
    }
    const left = splitNodeAtTarget(node.first, targetWidgetId, newWidgetId, direction);
    if (left.changed) {
        return {
            node: {
                kind: "split",
                axis: node.axis === "vertical" ? "vertical" : "horizontal",
                first: left.node,
                second: cloneNode(node.second),
            },
            changed: true,
        };
    }
    const right = splitNodeAtTarget(node.second, targetWidgetId, newWidgetId, direction);
    if (right.changed) {
        return {
            node: {
                kind: "split",
                axis: node.axis === "vertical" ? "vertical" : "horizontal",
                first: cloneNode(node.first),
                second: right.node,
            },
            changed: true,
        };
    }
    return { node: cloneNode(node), changed: false };
}

function sanitizeLayout(
    node: WorkspaceStoreWindowLayoutNode | undefined,
    validWidgetIds: Set<string>,
    seenWidgetIds: Set<string>,
): WorkspaceStoreWindowLayoutNode | undefined {
    if (node == null) {
        return undefined;
    }
    if (node.kind === "leaf") {
        const widgetId = (node.widgetId ?? "").trim();
        if (widgetId === "" || !validWidgetIds.has(widgetId) || seenWidgetIds.has(widgetId)) {
            return undefined;
        }
        seenWidgetIds.add(widgetId);
        return { kind: "leaf", widgetId };
    }
    const first = sanitizeLayout(node.first, validWidgetIds, seenWidgetIds);
    const second = sanitizeLayout(node.second, validWidgetIds, seenWidgetIds);
    if (first == null && second == null) {
        return undefined;
    }
    if (first == null) {
        return second;
    }
    if (second == null) {
        return first;
    }
    return {
        kind: "split",
        axis: node.axis === "vertical" ? "vertical" : "horizontal",
        first,
        second,
    };
}

function lastLeafWidgetId(node: WorkspaceStoreWindowLayoutNode | undefined): string {
    if (node == null) {
        return "";
    }
    if (node.kind === "leaf") {
        return node.widgetId ?? "";
    }
    const right = lastLeafWidgetId(node.second);
    if (right !== "") {
        return right;
    }
    return lastLeafWidgetId(node.first);
}

function normalizeLayout(
    tab: WorkspaceStoreTab | undefined,
    activeWidgetId: string,
): WorkspaceStoreWindowLayoutNode | undefined {
    if (tab == null || tab.widgetIds.length === 0) {
        return undefined;
    }
    const widgetIds = [...new Set(tab.widgetIds.filter((widgetId) => widgetId.trim() !== ""))];
    if (widgetIds.length === 0) {
        return undefined;
    }
    const validWidgetIds = new Set(widgetIds);
    const seenWidgetIds = new Set<string>();
    let layout = sanitizeLayout(tab.windowLayout, validWidgetIds, seenWidgetIds);
    if (layout == null) {
        layout = { kind: "leaf", widgetId: widgetIds[0] };
        seenWidgetIds.add(widgetIds[0]);
    }

    let targetWidgetId = seenWidgetIds.has(activeWidgetId) ? activeWidgetId : lastLeafWidgetId(layout);
    if (targetWidgetId === "") {
        targetWidgetId = widgetIds[0];
    }
    for (const widgetId of widgetIds) {
        if (seenWidgetIds.has(widgetId)) {
            continue;
        }
        const next = splitNodeAtTarget(layout, targetWidgetId, widgetId, "right");
        if (!next.changed || next.node == null) {
            continue;
        }
        layout = next.node;
        seenWidgetIds.add(widgetId);
        targetWidgetId = widgetId;
    }
    return layout;
}

const CompatSplitLayout = memo(({ tabId, tab, widgets, activeWidgetId }: CompatSplitLayoutProps) => {
    const layout = useMemo(() => normalizeLayout(tab, activeWidgetId), [tab, activeWidgetId]);
    const [splittingWidgetId, setSplittingWidgetId] = useState("");

    const renderLeaf = (widgetId: string): ReactNode => {
        const widget = widgets[widgetId];
        const active = widgetId === activeWidgetId;
        return (
            <div
                key={widgetId}
                className={clsx(
                    "relative flex flex-1 min-h-0 min-w-0 overflow-hidden border rounded-md bg-black/10",
                    active ? "border-cyan-300/70" : "border-border/60",
                )}
                onMouseDown={() => {
                    if (widgetId !== activeWidgetId) {
                        void workspaceStore.focusWidget(widgetId);
                    }
                }}
                data-testid={`compat-widget-pane-${widgetId}`}
            >
                <div className="absolute right-2 top-2 z-30 flex items-center gap-1">
                    <button
                        type="button"
                        className="rounded border border-border bg-black/40 px-2 py-1 text-[10px] uppercase tracking-wide text-secondary hover:text-white disabled:opacity-60"
                        disabled={splittingWidgetId !== ""}
                        onClick={(event) => {
                            event.stopPropagation();
                            setSplittingWidgetId(widgetId);
                            void workspaceStore.createSplitTerminalWidget(tabId, widgetId, "right").finally(() => {
                                setSplittingWidgetId("");
                            });
                        }}
                        data-testid={`compat-split-add-${widgetId}`}
                    >
                        {splittingWidgetId === widgetId ? "Splitting..." : "Split Right"}
                    </button>
                </div>
                {widget?.kind === "terminal" ? (
                    <CompatTerminalView key={widgetId} widgetId={widgetId} connectionId={widget.connectionId} />
                ) : (
                    <CenteredDiv>{widget == null ? "Missing Widget" : "Unsupported Widget"}</CenteredDiv>
                )}
            </div>
        );
    };

    const renderNode = (node: WorkspaceStoreWindowLayoutNode | undefined): ReactNode => {
        if (node == null) {
            return <CenteredDiv>No Terminal Widget</CenteredDiv>;
        }
        if (node.kind === "leaf") {
            const widgetId = (node.widgetId ?? "").trim();
            if (widgetId === "") {
                return <CenteredDiv>No Terminal Widget</CenteredDiv>;
            }
            return renderLeaf(widgetId);
        }
        const axis = node.axis === "vertical" ? "vertical" : "horizontal";
        return (
            <div
                className={clsx("flex flex-1 min-h-0 min-w-0 gap-1.5", axis === "vertical" ? "flex-col" : "flex-row")}
                data-testid={`compat-split-${axis}`}
            >
                <div className="flex flex-1 min-h-0 min-w-0">{renderNode(node.first)}</div>
                <div className="flex flex-1 min-h-0 min-w-0">{renderNode(node.second)}</div>
            </div>
        );
    };

    return (
        <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden" data-testid="compat-window-layout">
            {renderNode(layout)}
        </div>
    );
});

CompatSplitLayout.displayName = "CompatSplitLayout";

export { CompatSplitLayout };
