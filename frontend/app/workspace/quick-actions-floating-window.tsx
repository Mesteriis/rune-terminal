import { getQuickActionsFacade } from "@/compat";
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

    const runAction = async (action: QuickAction) => {
        if (runningActionID != null) {
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
                {loading ? (
                    <div className="text-sm text-secondary">Loading quick actions...</div>
                ) : loadError ? (
                    <div className="text-sm text-red-400 whitespace-pre-wrap">{loadError}</div>
                ) : actions.length === 0 ? (
                    <div className="text-sm text-secondary">No quick actions available.</div>
                ) : (
                    <div className="max-h-[24rem] overflow-y-auto border border-border rounded">
                        {actions.map((action) => {
                            const running = runningActionID === action.id;
                            return (
                                <button
                                    key={action.id}
                                    type="button"
                                    className={clsx(
                                        "w-full text-left px-3 py-2 border-b border-border last:border-b-0 transition-colors",
                                        "text-secondary hover:bg-hoverbg hover:text-white disabled:opacity-50"
                                    )}
                                    disabled={runningActionID != null}
                                    onClick={() => void runAction(action)}
                                    data-testid={`quick-action-item-${action.id}`}
                                >
                                    <div className="text-sm text-white">{action.label}</div>
                                    <div className="text-[11px] mt-1 opacity-80">
                                        {action.category} · {action.target_kind} · {action.execution_kind}
                                        {action.requires_explicit_context ? ` · needs ${action.context_requirement || "context"}` : ""}
                                    </div>
                                    <div className="text-[10px] mt-1 opacity-70 break-words">
                                        {running ? "Running..." : action.invocation_path}
                                    </div>
                                </button>
                            );
                        })}
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
