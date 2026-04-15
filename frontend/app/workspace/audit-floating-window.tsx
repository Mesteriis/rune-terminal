import { getAuditFacade } from "@/compat";
import { formatAuditTimestamp } from "@/app/workspace/widget-helpers";
import type { AuditFloatingWindowProps } from "@/app/workspace/widget-types";
import type { AuditEvent } from "@/rterm-api/audit/types";
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

const AuditFloatingWindow = memo(({ isOpen, onClose, referenceElement, refreshNonce }: AuditFloatingWindowProps) => {
    const [events, setEvents] = useState<AuditEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

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
        if (!isOpen) return;

        let cancelled = false;
        setLoading(true);
        setLoadError(null);

        void (async () => {
            try {
                const facade = await getAuditFacade();
                const response = await facade.getEvents(50);
                if (cancelled) {
                    return;
                }
                const nextEvents = Array.isArray(response.events) ? [...response.events].reverse() : [];
                setEvents(nextEvents);
            } catch (error) {
                if (!cancelled) {
                    setLoadError(error instanceof Error ? error.message : String(error));
                    setEvents([]);
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
    }, [isOpen, refreshNonce]);

    if (!isOpen) return null;

    return (
        <FloatingPortal>
            <div
                ref={refs.setFloating}
                style={floatingStyles}
                {...getFloatingProps()}
                className="bg-modalbg border border-border rounded-lg shadow-xl p-3 z-50 w-[30rem]"
            >
                <div className="text-sm font-medium text-white mb-3">Audit</div>
                {loading ? (
                    <div className="flex items-center justify-center p-8">
                        <i className="fa fa-solid fa-spinner fa-spin text-2xl text-muted"></i>
                    </div>
                ) : loadError ? (
                    <div className="text-sm text-red-400 whitespace-pre-wrap">{loadError}</div>
                ) : events.length === 0 ? (
                    <div className="text-sm text-muted">No audit events available</div>
                ) : (
                    <div className="max-h-[28rem] overflow-y-auto space-y-2 pr-1">
                        {events.map((event) => (
                            <div key={event.id} className="rounded border border-border bg-black/20 p-2 space-y-1.5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-sm text-white break-words">{event.tool_name || "unknown tool"}</div>
                                        <div className="text-[11px] text-secondary">{formatAuditTimestamp(event.timestamp)}</div>
                                    </div>
                                    <div
                                        className={clsx(
                                            "text-[11px] font-medium uppercase tracking-wide shrink-0",
                                            event.success ? "text-emerald-300" : "text-red-300"
                                        )}
                                    >
                                        {event.success ? "success" : "error"}
                                    </div>
                                </div>
                                {event.summary ? (
                                    <div className="text-xs text-secondary whitespace-pre-wrap break-words">{event.summary}</div>
                                ) : null}
                                <div className="text-[11px] text-secondary space-y-1">
                                    {event.effective_approval_tier ? (
                                        <div>approval tier: {event.effective_approval_tier}</div>
                                    ) : event.approval_tier ? (
                                        <div>approval tier: {event.approval_tier}</div>
                                    ) : null}
                                    {event.approval_used ? <div>approval used: yes</div> : null}
                                    {event.workspace_id ? <div>workspace: {event.workspace_id}</div> : null}
                                    {event.affected_paths && event.affected_paths.length > 0 ? (
                                        <div className="break-words">paths: {event.affected_paths.join(", ")}</div>
                                    ) : null}
                                    {event.affected_widgets && event.affected_widgets.length > 0 ? (
                                        <div className="break-words">widgets: {event.affected_widgets.join(", ")}</div>
                                    ) : null}
                                </div>
                                {event.error ? (
                                    <div className="text-xs text-red-300 whitespace-pre-wrap break-words">{event.error}</div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </FloatingPortal>
    );
});

AuditFloatingWindow.displayName = "AuditFloatingWindow";

export { AuditFloatingWindow };
