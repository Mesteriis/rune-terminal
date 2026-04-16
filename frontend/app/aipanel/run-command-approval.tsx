import { memo } from "react";

export interface PendingRunApprovalEntry {
    approvalId: string;
    prompt: string;
    command: string;
    summary: string;
    approvalTier: string;
    confirming: boolean;
    errorMessage?: string;
}

interface RunCommandApprovalListProps {
    approvals: PendingRunApprovalEntry[];
    busy: boolean;
    onConfirm: (approvalId: string) => void;
}

export const RunCommandApprovalList = memo(({ approvals, busy, onConfirm }: RunCommandApprovalListProps) => {
    if (approvals.length === 0) {
        return null;
    }

    return (
        <div className="px-2 pb-2 space-y-2">
            {approvals.map((approval) => (
                <div key={approval.approvalId} className="rounded-lg border border-zinc-700 bg-zinc-800/60 p-3">
                    <div className="text-sm text-white">Approval required for `/run {approval.command}`</div>
                    <div className="mt-1 text-xs text-gray-400 whitespace-pre-wrap">{approval.summary}</div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                        <div className="text-xs text-gray-400">tier: {approval.approvalTier}</div>
                        <button
                            type="button"
                            className="px-3 py-1.5 rounded bg-accent text-black text-xs font-medium disabled:opacity-50"
                            disabled={approval.confirming || busy}
                            onClick={() => onConfirm(approval.approvalId)}
                        >
                            {approval.confirming ? "Confirming..." : "Confirm and retry"}
                        </button>
                    </div>
                    {approval.errorMessage ? (
                        <div className="mt-2 text-xs text-red-300 whitespace-pre-wrap">{approval.errorMessage}</div>
                    ) : null}
                </div>
            ))}
        </div>
    );
});

RunCommandApprovalList.displayName = "RunCommandApprovalList";
