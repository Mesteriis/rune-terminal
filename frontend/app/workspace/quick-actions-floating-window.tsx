import { getQuickActionsFacade } from "@/compat";
import { getConnectionsFacade } from "@/compat/connections";
import { useActiveWorkspaceContext } from "@/app/workspace/active-context";
import type { RemoteProfile } from "@/rterm-api/connections/types";
import type { QuickAction, QuickActionExecutionKind, QuickActionTargetKind } from "@/rterm-api/quickactions/types";
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
import { UtilitySurfaceFrame } from "./utility-surface-frame";

export interface QuickActionRunResult {
    message: string;
    kind?: "success" | "error";
}

export interface QuickActionRunContext {
    selectedRemoteProfileID?: string;
}

export interface LauncherEntry {
    id: string;
    label: string;
    category: string;
    target_kind: QuickActionTargetKind;
    invocation_path: string;
    execution_kind: QuickActionExecutionKind;
    requires_explicit_context?: boolean;
    context_requirement?: string;
    disabled_reason?: string;
}

interface QuickActionsFloatingWindowProps extends FloatingWindowProps {
    onRunAction: (action: QuickAction, context: QuickActionRunContext) => Promise<QuickActionRunResult>;
    launcherEntries?: LauncherEntry[];
    onRunLauncherEntry?: (entry: LauncherEntry, context: QuickActionRunContext) => Promise<QuickActionRunResult>;
}

type ActionEntry =
    | { kind: "backend"; action: QuickAction }
    | { kind: "launcher"; action: LauncherEntry };

const QuickActionsFloatingWindow = memo(({
    isOpen,
    onClose,
    referenceElement,
    onRunAction,
    launcherEntries = [],
    onRunLauncherEntry,
}: QuickActionsFloatingWindowProps) => {
    const [actions, setActions] = useState<QuickAction[]>([]);
    const [remoteProfiles, setRemoteProfiles] = useState<RemoteProfile[]>([]);
    const [selectedRemoteProfileID, setSelectedRemoteProfileID] = useState("");
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
        setSelectedRemoteProfileID("");

        void (async () => {
            try {
                const [quickActionsFacade, connectionsFacade] = await Promise.all([
                    getQuickActionsFacade(),
                    getConnectionsFacade(),
                ]);
                const [actionsResult, remoteProfilesResult] = await Promise.allSettled([
                    quickActionsFacade.listQuickActions(),
                    connectionsFacade.listRemoteProfiles(),
                ]);
                if (cancelled) {
                    return;
                }
                if (actionsResult.status !== "fulfilled") {
                    throw actionsResult.reason;
                }
                setActions(actionsResult.value);
                const profiles =
                    remoteProfilesResult.status === "fulfilled"
                        ? (remoteProfilesResult.value.profiles ?? [])
                        : [];
                setRemoteProfiles(profiles);
                setSelectedRemoteProfileID(profiles[0]?.id ?? "");
            } catch (error) {
                if (!cancelled) {
                    setLoadError(error instanceof Error ? error.message : String(error));
                    setActions([]);
                    setRemoteProfiles([]);
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
                if (selectedRemoteProfileID !== "") {
                    return { available: true };
                }
                return { available: false, reason: "Requires explicit remote profile selection." };
            default:
                return { available: false, reason: "Requires explicit context selection." };
        }
    };

    const normalizedFilter = filterValue.trim().toLowerCase();
    const combinedActions: ActionEntry[] = [
        ...launcherEntries.map((entry) => ({ kind: "launcher" as const, action: entry })),
        ...actions.map((action) => ({ kind: "backend" as const, action })),
    ];
    const visibleActions = combinedActions.filter(({ action }) => {
        if (normalizedFilter === "") {
            return true;
        }
        const haystack = `${action.label} ${action.id} ${action.category}`.toLowerCase();
        return haystack.includes(normalizedFilter);
    });
    const grouped = new Map<string, ActionEntry[]>();
    for (const entry of visibleActions) {
        const action = entry.action;
        const category = action.category || "other";
        const current = grouped.get(category);
        if (current == null) {
            grouped.set(category, [entry]);
            continue;
        }
        current.push(entry);
    }
    const orderedGroups = [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right));

    const getAvailability = (entry: ActionEntry): { available: boolean; reason?: string } => {
        if (entry.kind === "launcher") {
            if (entry.action.disabled_reason?.trim()) {
                return { available: false, reason: entry.action.disabled_reason };
            }
            return { available: true };
        }
        return hasRequiredContext(entry.action);
    };

    const runAction = async (entry: ActionEntry) => {
        if (runningActionID != null) {
            return;
        }
        const availability = getAvailability(entry);
        if (!availability.available) {
            setRunStatus(null);
            setRunError(availability.reason || "Action requires explicit context.");
            return;
        }
        setRunningActionID(entry.action.id);
        setRunError(null);
        setRunStatus(null);
        try {
            const context = {
                selectedRemoteProfileID: selectedRemoteProfileID || undefined,
            };
            const result =
                entry.kind === "launcher"
                    ? await onRunLauncherEntry?.(entry.action, context)
                    : await onRunAction(entry.action, context);
            if (result == null) {
                throw new Error(`No handler registered for launcher entry: ${entry.action.label}`);
            }
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
            <div ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()} className="z-50">
                <UtilitySurfaceFrame
                    title="Launcher"
                    icon="shapes"
                    onClose={onClose}
                    widthClassName="w-[min(92vw,30rem)] max-w-[30rem]"
                    testID="quick-actions-surface"
                >
                    <div className="min-h-0 overflow-y-auto p-3">
                        <div className="mb-2 space-y-1 rounded border border-border bg-black/20 px-2 py-1.5 text-[11px] text-secondary">
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
                            className="mb-2 w-full rounded border border-border bg-black/20 px-2 py-1.5 text-xs text-white"
                            placeholder="Search launcher"
                            value={filterValue}
                            onChange={(event) => setFilterValue(event.target.value)}
                            data-testid="quick-actions-filter"
                        />
                        <div className="mb-2 rounded border border-border bg-black/20 px-2 py-1.5 text-[11px] text-secondary">
                            <div className="mb-1">remote profile context</div>
                            <select
                                className="w-full rounded border border-border bg-black/20 p-1 text-[11px] text-white"
                                value={selectedRemoteProfileID}
                                onChange={(event) => setSelectedRemoteProfileID(event.target.value)}
                                data-testid="quick-actions-remote-profile-select"
                            >
                                {remoteProfiles.length === 0 ? (
                                    <option value="">No remote profiles</option>
                                ) : (
                                    remoteProfiles.map((profile) => (
                                        <option key={profile.id} value={profile.id}>
                                            {profile.name || profile.host}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>
                        {loading ? (
                            <div className="text-sm text-secondary">Loading launcher entries...</div>
                        ) : visibleActions.length === 0 ? (
                            <div className="text-sm text-secondary">No launcher entries available.</div>
                        ) : (
                            <div className="max-h-[24rem] overflow-y-auto rounded border border-border divide-y divide-border">
                                {orderedGroups.map(([category, categoryEntries]) => (
                                    <div key={category}>
                                        <div className="bg-black/20 px-3 py-1.5 text-[11px] uppercase tracking-wide text-secondary">
                                            {category}
                                        </div>
                                        {categoryEntries.map((entry) => {
                                            const action = entry.action;
                                            const running = runningActionID === action.id;
                                            const availability = getAvailability(entry);
                                            return (
                                                <button
                                                    key={action.id}
                                                    type="button"
                                                    className={clsx(
                                                        "w-full border-t border-border px-3 py-2 text-left transition-colors",
                                                        "text-secondary hover:bg-hoverbg hover:text-white disabled:opacity-50",
                                                    )}
                                                    disabled={runningActionID != null || !availability.available}
                                                    onClick={() => void runAction(entry)}
                                                    data-testid={`quick-action-item-${action.id}`}
                                                >
                                                    <div className="text-sm text-white">{action.label}</div>
                                                    <div className="mt-1 text-[11px] opacity-80">
                                                        {action.target_kind} · {action.execution_kind}
                                                        {action.requires_explicit_context
                                                            ? ` · needs ${action.context_requirement || "context"}`
                                                            : ""}
                                                    </div>
                                                    <div className="mt-1 break-words text-[10px] opacity-70">
                                                        {running ? "Running..." : action.invocation_path}
                                                    </div>
                                                    {!availability.available ? (
                                                        <div className="mt-1 whitespace-pre-wrap text-[10px] text-amber-300">
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
                        {loadError ? <div className="mt-2 whitespace-pre-wrap text-[11px] text-amber-300">{loadError}</div> : null}
                        {runStatus ? <div className="mt-2 whitespace-pre-wrap text-[11px] text-emerald-300">{runStatus}</div> : null}
                        {runError ? <div className="mt-2 whitespace-pre-wrap text-[11px] text-red-300">{runError}</div> : null}
                    </div>
                </UtilitySurfaceFrame>
            </div>
        </FloatingPortal>
    );
});

QuickActionsFloatingWindow.displayName = "QuickActionsFloatingWindow";

export { QuickActionsFloatingWindow };
