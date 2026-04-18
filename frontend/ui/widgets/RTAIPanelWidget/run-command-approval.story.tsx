import { useState } from "react";
import { type PendingRunApprovalEntry, RunCommandApprovalList } from "./run-command-approval";

const initialApprovals: PendingRunApprovalEntry[] = [
    {
        approvalId: "approval-1",
        prompt: "/run git status",
        command: "git status",
        summary: "This command inspects the workspace and lists pending file changes.",
        approvalTier: "workspace",
        confirming: false,
    },
    {
        approvalId: "approval-2",
        prompt: "/run rm -rf build",
        command: "rm -rf build",
        summary: "This command removes the local build directory and can delete generated assets.",
        approvalTier: "destructive",
        confirming: false,
        errorMessage: "Approval token expired. Request a new approval before retrying.",
    },
];

function RunCommandApprovalStory() {
    const [approvals, setApprovals] = useState<PendingRunApprovalEntry[]>(initialApprovals);
    const [busy, setBusy] = useState(false);

    function handleConfirm(approvalId: string) {
        setBusy(true);
        setApprovals((current) =>
            current.map((approval) =>
                approval.approvalId === approvalId ? { ...approval, confirming: true, errorMessage: undefined } : approval
            )
        );
    }

    return (
        <div style={{ padding: 12, maxWidth: 640, backgroundColor: "#111827", color: "#ffffff" }}>
            <RunCommandApprovalList approvals={approvals} busy={busy} onConfirm={handleConfirm} />
        </div>
    );
}

export default RunCommandApprovalStory;
