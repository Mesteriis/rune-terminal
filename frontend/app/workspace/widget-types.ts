import type { PendingApproval, ToolExecutionRequest } from "@/rterm-api/tools/types";

export type WidgetDisplayMode = "normal" | "compact" | "supercompact";

export interface WidgetItemProps {
    widget: WidgetConfigType;
    mode: WidgetDisplayMode;
}

export interface FloatingWindowProps {
    isOpen: boolean;
    onClose: () => void;
    referenceElement: HTMLElement;
}

export interface ToolsFloatingWindowProps extends FloatingWindowProps {
    onAuditChanged?: () => void;
}

export interface AuditFloatingWindowProps extends FloatingWindowProps {
    refreshNonce: number;
}

export interface PendingToolApproval {
    approval: PendingApproval;
    request: ToolExecutionRequest;
}
