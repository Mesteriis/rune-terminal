import { getQuickActionsFacade } from "@/compat";
import { useActiveWorkspaceContext } from "@/app/workspace/active-context";
import type { QuickAction } from "@/rterm-api/quickactions/types";
import type { FloatingWindowProps } from "@/app/workspace/widget-types";
import {
    FloatingPortal,
    autoUpdate,
    offset,
    shift,
    useDismiss,
    useFloating,
    useInteractions,
} from "@floating-ui/react";
import clsx from "clsx";
import { memo, useEffect, useState } from "react";

export interface QuickActionRunResult {
    message: string;
    kind?: "success" | "error";
}

interface QuickActionsFloatingWindowProps extends FloatingWindowProps {
    onRunAction: (action: QuickAction) => Promise<QuickActionRunResult>;
}

const QuickActionsFloatingWindow = memo(({ isOpen, onClose, referenceElement, onRunAction }: QuickActionsFloatingWindowProps) => {
    const [actions, setActions] = useState<QuickAction[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [runError, setRunError] = useState<string | null>(null);
    const [runStatus, setRunStatus] = useState<string | null>(null);
    const [runningActionID, setRunningActionID] = useState<string | null>(null);
    const [filterValue, setFilterValue] = useState("");
    const activeContext = useActiveWorkspaceContext();
    const { refs, floatingStyles, context } = useFloating({
        open: isOpen,
        onOpenChange: onClose,
        placement: "left-start",
        middleware: [offset(-2), shift({ padding: 12 })],
        whileElementsMounted: autoUpdate,
        elements: {
            reference: referenceElement,
        },
    });

    const dismiss = useDismiss(context);
    const { getFloatingProps } = useInteractions([dismiss]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        let cancelled = false;
        setLoading(true);
        setLoadError(null);
        setRunError(null);
        setRunStatus(null);
        setRunningActionID(null);
        setFilterValue("");

        void (async () => {
            try {
                const facade = await getQuickActionsFacade();
                const nextActions = await facade.listQuickActions();
                if (cancelled) {
                    return;
                }
                setActions(nextActions);
            } catch (error) {
                if (!cancelled) {
                    setLoadError(error instanceof Error ? error.message : String(error));
                    setActions([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    const hasRequiredContext = (action: QuickAction): { available: boolean; reason?: string } => {
        if (!action.requires_explicit_context) {
            return { available: true };
        }
        switch (action.context_requirement) {
            case "active_terminal_widget":
                if (activeContext.activeWidgetID !== "" && activeContext.activeWidgetKind === "terminal") {
                    return { available: true };
                }
                return { available: false, reason: "Requires an active terminal widget." };
            case "selected_file_path":
                if (activeContext.activeFilePath !== "") {
                    return { available: true };
                }
                return { available: false, reason: "Requires a selected file path from Files panel." };
            case "selected_file_path+active_remote_target":
                if (activeContext.activeFilePath === "") {
                    return { available: false, reason: "Requires a selected file path from Files panel." };
                }
                if (activeContext.activeRemoteTarget == null) {
                    return { available: false, reason: "Requires active remote terminal target." };
                }
                return { available: true };
            case "remote_profile_id":
                return { available: false, reason: "Requires explicit remote profile selection." };
            default:
                return { available: false, reason: "Requires explicit context selection." };
        }
    };

    const normalizedFilter = filterValue.trim().toLowerCase();
    const visibleActions = actions.filter((action) => {
        if (normalizedFilter === "") {
            return true;
        }
        const haystack = `${action.label} ${action.id} ${action.category}`.toLowerCase();
        return haystack.includes(normalizedFilter);
    });
    const grouped = new Map<string, QuickAction[]>();
    for (const action of visibleActions) {
        const category = action.category || "other";
        const current = grouped.get(category);
        if (current == null) {
            grouped.set(category, [action]);
            continue;
        }
        current.push(action);
    }
    const orderedGroups = [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right));

    const runAction = async (action: QuickAction) => {
        if (runningActionID != null) {
            return;
        }
        const availability = hasRequiredContext(action);
        if (!availability.available) {
            setRunStatus(null);
            setRunError(availability.reason || "Action requires explicit context.");
            return;
        }
        setRunningActionID(action.id);
        setRunError(null);
        setRunStatus(null);
        try {
            const result = await onRunAction(action);
            if (result.kind === "error") {
                setRunError(result.message);
                return;
            }
            setRunStatus(result.message);
        } catch (error) {
            setRunError(error instanceof Error ? error.message : String(error));
        } finally {
            setRunningActionID(null);
        }
    };

    return (
        <FloatingPortal>
            <div
                ref={refs.setFloating}
                style={floatingStyles}
                {...getFloatingProps()}
                className="bg-modalbg border border-border rounded-lg shadow-xl p-3 z-50 w-[32rem]"
                data-testid="quick-actions-surface"
            >
                <div className="text-sm font-medium text-white mb-3">Quick Actions</div>
                <div className="rounded border border-border bg-black/20 px-2 py-1.5 text-[11px] text-secondary mb-2 space-y-1">
                    <div>workspace: {activeContext.workspaceID || "none"}</div>
                    <div>
                        active widget: {activeContext.activeWidgetID || "none"}{" "}
                        {activeContext.activeTerminalTarget
                            ? `(${activeContext.activeTerminalTarget.targetSession}:${activeContext.activeTerminalTarget.targetConnectionID})`
                            : ""}
                    </div>
                    <div className="break-all">selected file: {activeContext.activeFilePath || "none"}</div>
                </div>
                <input
                    type="text"
                    className="w-full rounded border border-border bg-black/20 px-2 py-1.5 text-xs text-white mb-2"
                    placeholder="Filter actions"
                    value={filterValue}
                    onChange={(event) => setFilterValue(event.target.value)}
                    data-testid="quick-actions-filter"
                />
                {loading ? (
                    <div className="text-sm text-secondary">Loading quick actions...</div>
                ) : loadError ? (
                    <div className="text-sm text-red-400 whitespace-pre-wrap">{loadError}</div>
                ) : visibleActions.length === 0 ? (
                    <div className="text-sm text-secondary">No quick actions available.</div>
                ) : (
                    <div className="max-h-[24rem] overflow-y-auto border border-border rounded divide-y divide-border">
                        {orderedGroups.map(([category, categoryActions]) => (
                            <div key={category}>
                                <div className="px-3 py-1.5 text-[11px] uppercase tracking-wide text-secondary bg-black/20">
                                    {category}
                                </div>
                                {categoryActions.map((action) => {
                                    const running = runningActionID === action.id;
                                    const availability = hasRequiredContext(action);
                                    return (
                                        <button
                                            key={action.id}
                                            type="button"
                                            className={clsx(
                                                "w-full text-left px-3 py-2 border-t border-border transition-colors",
                                                "text-secondary hover:bg-hoverbg hover:text-white disabled:opacity-50"
                                            )}
                                            disabled={runningActionID != null || !availability.available}
                                            onClick={() => void runAction(action)}
                                            data-testid={`quick-action-item-${action.id}`}
                                        >
                                            <div className="text-sm text-white">{action.label}</div>
                                            <div className="text-[11px] mt-1 opacity-80">
                                                {action.target_kind} · {action.execution_kind}
                                                {action.requires_explicit_context
                                                    ? ` · needs ${action.context_requirement || "context"}`
                                                    : ""}
                                            </div>
                                            <div className="text-[10px] mt-1 opacity-70 break-words">
                                                {running ? "Running..." : action.invocation_path}
                                            </div>
                                            {!availability.available ? (
                                                <div className="text-[10px] mt-1 text-amber-300 whitespace-pre-wrap">
                                                    {availability.reason}
                                                </div>
                                            ) : null}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}
                {runStatus ? <div className="text-[11px] text-emerald-300 mt-2 whitespace-pre-wrap">{runStatus}</div> : null}
                {runError ? <div className="text-[11px] text-red-300 mt-2 whitespace-pre-wrap">{runError}</div> : null}
            </div>
        </FloatingPortal>
    );
});

QuickActionsFloatingWindow.displayName = "QuickActionsFloatingWindow";

export { QuickActionsFloatingWindow };
