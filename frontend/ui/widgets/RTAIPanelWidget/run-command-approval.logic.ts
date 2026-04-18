export interface PendingRunApprovalEntry {
    approvalId: string;
    prompt: string;
    command: string;
    summary: string;
    approvalTier: string;
    confirming: boolean;
    errorMessage?: string;
}

export interface RunCommandApprovalListProps {
    approvals: PendingRunApprovalEntry[];
    busy: boolean;
    onConfirm: (approvalId: string) => void;
}

export function getRunApprovalListClassName(): string {
    return "px-2 pb-2 space-y-2";
}

export function getRunApprovalItemClassName(): string {
    return "rounded-lg border border-zinc-700 bg-zinc-800/60 p-3";
}

export function getRunApprovalSummaryClassName(): string {
    return "mt-1 text-xs text-gray-400 whitespace-pre-wrap";
}

export function getRunApprovalActionsClassName(): string {
    return "mt-2 flex items-center justify-between gap-3";
}

export function getRunApprovalTierClassName(): string {
    return "text-xs text-gray-400";
}

export function getRunApprovalButtonClassName(): string {
    return "px-3 py-1.5 rounded bg-accent text-black text-xs font-medium disabled:opacity-50";
}

export function getRunApprovalErrorClassName(): string {
    return "mt-2 text-xs text-red-300 whitespace-pre-wrap";
}

export function getRunApprovalButtonLabel(confirming: boolean): string {
    return confirming ? "Confirming..." : "Confirm and retry";
}
