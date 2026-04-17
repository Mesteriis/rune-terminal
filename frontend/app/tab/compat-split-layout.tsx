import { workspaceStore, type WorkspaceStoreTab, type WorkspaceStoreWidget, type WorkspaceStoreWindowLayoutNode } from "@/app/state/workspace.store";
import { CompatTerminalView } from "@/app/view/term/compat-terminal";
import { CenteredDiv } from "@/element/quickelems";
import clsx from "clsx";
import { memo, useMemo, useState, type DragEvent, type ReactNode } from "react";

type WindowSplitDirection = "left" | "right" | "top" | "bottom";

interface CompatSplitLayoutProps {
    tabId: string;
    tab?: WorkspaceStoreTab;
    widgets: Record<string, WorkspaceStoreWidget>;
    activeWidgetId: string;
}

interface DropIndicator {
    targetWidgetId: string;
    direction: WindowSplitDirection;
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

function determineDropDirection(event: DragEvent<HTMLDivElement>): WindowSplitDirection {
    const bounds = event.currentTarget.getBoundingClientRect();
    const width = Math.max(bounds.width, 1);
    const height = Math.max(bounds.height, 1);
    const x = (event.clientX - bounds.left) / width;
    const y = (event.clientY - bounds.top) / height;
    const edgeThreshold = 0.25;
    if (x <= edgeThreshold) {
        return "left";
    }
    if (x >= 1 - edgeThreshold) {
        return "right";
    }
    if (y <= edgeThreshold) {
        return "top";
    }
    if (y >= 1 - edgeThreshold) {
        return "bottom";
    }
    if (Math.abs(x - 0.5) > Math.abs(y - 0.5)) {
        return x < 0.5 ? "left" : "right";
    }
    return y < 0.5 ? "top" : "bottom";
}

function dropOverlayClass(direction: WindowSplitDirection): string {
    switch (direction) {
        case "left":
            return "absolute inset-y-0 left-0 w-1/2 bg-cyan-500/20 border-l-2 border-cyan-300";
        case "right":
            return "absolute inset-y-0 right-0 w-1/2 bg-cyan-500/20 border-r-2 border-cyan-300";
        case "top":
            return "absolute inset-x-0 top-0 h-1/2 bg-cyan-500/20 border-t-2 border-cyan-300";
        case "bottom":
            return "absolute inset-x-0 bottom-0 h-1/2 bg-cyan-500/20 border-b-2 border-cyan-300";
        default:
            return "hidden";
    }
}

const CompatSplitLayout = memo(({ tabId, tab, widgets, activeWidgetId }: CompatSplitLayoutProps) => {
    const layout = useMemo(() => normalizeLayout(tab, activeWidgetId), [tab, activeWidgetId]);
    const [draggingWidgetId, setDraggingWidgetId] = useState("");
    const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
    const [splittingWidgetId, setSplittingWidgetId] = useState("");

    const clearDragState = () => {
        setDraggingWidgetId("");
        setDropIndicator(null);
    };

    const renderLeaf = (widgetId: string): ReactNode => {
        const widget = widgets[widgetId];
        const active = widgetId === activeWidgetId;
        const showDrop = dropIndicator != null && dropIndicator.targetWidgetId === widgetId && draggingWidgetId !== "";
        return (
            <div
                key={widgetId}
                className={clsx(
                    "relative flex flex-1 min-h-0 min-w-0 overflow-hidden border rounded-md bg-black/10",
                    active ? "border-cyan-300/70" : "border-border/60",
                )}
                draggable
                onMouseDown={() => {
                    if (widgetId !== activeWidgetId) {
                        void workspaceStore.focusWidget(widgetId);
                    }
                }}
                onDragStart={(event) => {
                    setDraggingWidgetId(widgetId);
                    event.dataTransfer.setData("text/plain", widgetId);
                    event.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={clearDragState}
                onDragOver={(event) => {
                    const sourceWidgetId = draggingWidgetId || event.dataTransfer.getData("text/plain");
                    if (sourceWidgetId === "" || sourceWidgetId === widgetId) {
                        return;
                    }
                    event.preventDefault();
                    const direction = determineDropDirection(event);
                    setDropIndicator({ targetWidgetId: widgetId, direction });
                }}
                onDragLeave={() => {
                    setDropIndicator((current) =>
                        current != null && current.targetWidgetId === widgetId ? null : current,
                    );
                }}
                onDrop={(event) => {
                    event.preventDefault();
                    const sourceWidgetId = draggingWidgetId || event.dataTransfer.getData("text/plain");
                    if (sourceWidgetId === "" || sourceWidgetId === widgetId) {
                        clearDragState();
                        return;
                    }
                    const direction =
                        dropIndicator?.targetWidgetId === widgetId
                            ? dropIndicator.direction
                            : determineDropDirection(event);
                    clearDragState();
                    void workspaceStore.moveWidgetBySplit(tabId, sourceWidgetId, widgetId, direction);
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
                {showDrop ? (
                    <div className={dropOverlayClass(dropIndicator.direction)} data-testid={`compat-drop-${widgetId}-${dropIndicator.direction}`} />
                ) : null}
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
