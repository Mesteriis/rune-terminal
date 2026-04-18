import { memo } from "react";
import {
    type RunCommandApprovalListProps,
    getRunApprovalActionsClassName,
    getRunApprovalButtonClassName,
    getRunApprovalButtonLabel,
    getRunApprovalErrorClassName,
    getRunApprovalItemClassName,
    getRunApprovalListClassName,
    getRunApprovalSummaryClassName,
    getRunApprovalTierClassName,
} from "./run-command-approval.logic";
import "./run-command-approval.style.scss";

export const RunCommandApprovalList = memo(({ approvals, busy, onConfirm }: RunCommandApprovalListProps) => {
    if (approvals.length === 0) {
        return null;
    }

    return (
        <div className={getRunApprovalListClassName()}>
            {approvals.map((approval) => (
                <div key={approval.approvalId} className={getRunApprovalItemClassName()}>
                    <div className="text-sm text-white">Approval required for `/run {approval.command}`</div>
                    <div className={getRunApprovalSummaryClassName()}>{approval.summary}</div>
                    <div className={getRunApprovalActionsClassName()}>
                        <div className={getRunApprovalTierClassName()}>tier: {approval.approvalTier}</div>
                        <button
                            type="button"
                            className={getRunApprovalButtonClassName()}
                            disabled={approval.confirming || busy}
                            onClick={() => onConfirm(approval.approvalId)}
                        >
                            {getRunApprovalButtonLabel(approval.confirming)}
                        </button>
                    </div>
                    {approval.errorMessage ? (
                        <div className={getRunApprovalErrorClassName()}>{approval.errorMessage}</div>
                    ) : null}
                </div>
            ))}
        </div>
    );
});

RunCommandApprovalList.displayName = "RunCommandApprovalList";
