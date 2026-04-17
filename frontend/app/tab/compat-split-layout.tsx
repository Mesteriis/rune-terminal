import { workspaceStore, type WorkspaceStoreTab, type WorkspaceStoreWidget, type WorkspaceStoreWindowLayoutNode } from "@/app/state/workspace.store";
import { CompatTerminalView } from "@/app/view/term/compat-terminal";
import { CompatFilesView } from "@/app/view/files/compat-files-view";
import { CenteredDiv } from "@/element/quickelems";
import { makeIconClass } from "@/util/util";
import clsx from "clsx";
import { memo, useMemo, useState, type CSSProperties, type DragEvent, type ReactNode } from "react";

type WindowMoveDirection =
    | "left"
    | "right"
    | "top"
    | "bottom"
    | "outer-left"
    | "outer-right"
    | "outer-top"
    | "outer-bottom"
    | "center";

interface CompatSplitLayoutProps {
    tabId: string;
    tab?: WorkspaceStoreTab;
    widgets: Record<string, WorkspaceStoreWidget>;
    activeWidgetId: string;
}

interface DropIndicator {
    targetWidgetId: string;
    direction: WindowMoveDirection;
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
    direction: "left" | "right" | "top" | "bottom",
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

function determineDropDirection(event: DragEvent<HTMLDivElement>): WindowMoveDirection {
    const bounds = event.currentTarget.getBoundingClientRect();
    const width = Math.max(bounds.width, 1);
    const height = Math.max(bounds.height, 1);
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const centerX1 = (2 * width) / 5;
    const centerX2 = (3 * width) / 5;
    const centerY1 = (2 * height) / 5;
    const centerY2 = (3 * height) / 5;
    if (x > centerX1 && x < centerX2 && y > centerY1 && y < centerY2) {
        return "center";
    }
    const diagonal1 = y * width - x * height;
    const diagonal2 = y * width + x * height - height * width;
    if (diagonal1 === 0 || diagonal2 === 0) {
        if (Math.abs(x - width / 2) > Math.abs(y - height / 2)) {
            return x < width / 2 ? "left" : "right";
        }
        return y < height / 2 ? "top" : "bottom";
    }

    let code = 0;
    if (diagonal2 > 0) {
        code += 1;
    }
    if (diagonal1 > 0) {
        code += 2;
        code = 5 - code;
    }

    const xOuter1 = width / 5;
    const xOuter2 = width - width / 5;
    const yOuter1 = height / 5;
    const yOuter2 = height - height / 5;
    if (y < yOuter1 || y > yOuter2 || x < xOuter1 || x > xOuter2) {
        code += 4;
    }

    switch (code) {
        case 0:
            return "top";
        case 1:
            return "right";
        case 2:
            return "bottom";
        case 3:
            return "left";
        case 4:
            return "outer-top";
        case 5:
            return "outer-right";
        case 6:
            return "outer-bottom";
        case 7:
            return "outer-left";
        default:
            return "right";
    }
}

function dropOverlayProps(direction: WindowMoveDirection): { className: string; style: CSSProperties } {
    const style: CSSProperties = {
        background: "var(--compat-drop-overlay-bg-color)",
        borderColor: "var(--compat-drop-overlay-border-color)",
    };
    switch (direction) {
        case "left":
            return { className: "absolute inset-y-0 left-0 w-1/2 border-l-2", style };
        case "right":
            return { className: "absolute inset-y-0 right-0 w-1/2 border-r-2", style };
        case "top":
            return { className: "absolute inset-x-0 top-0 h-1/2 border-t-2", style };
        case "bottom":
            return { className: "absolute inset-x-0 bottom-0 h-1/2 border-b-2", style };
        case "outer-left":
            return { className: "absolute inset-y-0 left-0 w-[20%] border-l-2", style };
        case "outer-right":
            return { className: "absolute inset-y-0 right-0 w-[20%] border-r-2", style };
        case "outer-top":
            return { className: "absolute inset-x-0 top-0 h-[20%] border-t-2", style };
        case "outer-bottom":
            return { className: "absolute inset-x-0 bottom-0 h-[20%] border-b-2", style };
        case "center":
            return { className: "absolute inset-[20%] border", style };
        default:
            return { className: "hidden", style };
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
        const dropOverlay = dropIndicator == null ? null : dropOverlayProps(dropIndicator.direction);
        const splitAction = (
            <button
                type="button"
                className="flex h-[22px] w-[22px] items-center justify-center rounded text-[10px] text-secondary transition-colors hover:bg-[rgba(255,255,255,0.08)] hover:text-white disabled:opacity-45"
                disabled={splittingWidgetId !== ""}
                onClick={(event) => {
                    event.stopPropagation();
                    setSplittingWidgetId(widgetId);
                    void workspaceStore.createSplitTerminalWidget(tabId, widgetId, "right").finally(() => {
                        setSplittingWidgetId("");
                    });
                }}
                aria-label="Split pane"
                title={splittingWidgetId === widgetId ? "Splitting pane" : "Split pane"}
                data-testid={`compat-split-add-${widgetId}`}
            >
                <i className={makeIconClass(splittingWidgetId === widgetId ? "circle-notch" : "plus", false, { spin: splittingWidgetId === widgetId })} />
            </button>
        );
        return (
            <div
                key={widgetId}
                className={clsx(
                    "relative flex flex-1 min-h-0 min-w-0 overflow-hidden rounded-[var(--block-border-radius)] border",
                )}
                style={{
                    background: "var(--compat-pane-bg-color)",
                    borderColor: active ? "var(--compat-pane-active-border-color)" : "var(--compat-pane-border-color)",
                }}
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
                data-widgetid={widgetId}
            >
                {widget?.kind === "terminal" ? (
                    <CompatTerminalView
                        key={widgetId}
                        widgetId={widgetId}
                        connectionId={widget.connectionId}
                        title={widget.title}
                        headerActions={splitAction}
                    />
                ) : widget?.kind === "files" ? (
                    <CompatFilesView
                        key={widgetId}
                        widgetId={widgetId}
                        path={widget.path ?? ""}
                        connectionId={widget.connectionId}
                        title={widget.title}
                        headerActions={splitAction}
                    />
                ) : (
                    <CenteredDiv>{widget == null ? "Missing Widget" : "Unsupported Widget"}</CenteredDiv>
                )}
                {showDrop && dropOverlay != null ? (
                    <div
                        className={dropOverlay.className}
                        style={dropOverlay.style}
                        data-testid={`compat-drop-${widgetId}-${dropIndicator.direction}`}
                    />
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
                className={clsx("flex flex-1 min-h-0 min-w-0 gap-[2px]", axis === "vertical" ? "flex-col" : "flex-row")}
                data-testid={`compat-split-${axis}`}
            >
                <div className="flex flex-1 min-h-0 min-w-0">{renderNode(node.first)}</div>
                <div className="flex flex-1 min-h-0 min-w-0">{renderNode(node.second)}</div>
            </div>
        );
    };

    return (
        <div className="flex h-full w-full flex-1 self-stretch min-h-0 min-w-0 overflow-hidden" data-testid="compat-window-layout">
            {renderNode(layout)}
        </div>
    );
});

CompatSplitLayout.displayName = "CompatSplitLayout";

export { CompatSplitLayout };
