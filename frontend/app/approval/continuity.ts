import type { ConversationContext } from "@/rterm-api/conversation/types";
import type { PendingApproval, ToolExecutionContext, ToolExecutionRequest } from "@/rterm-api/tools/types";

export interface StoredPendingRunApproval {
    approvalId: string;
    prompt: string;
    command: string;
    summary: string;
    approvalTier: string;
    toolContext: ToolExecutionContext;
    conversationContext: ConversationContext;
}

export interface StoredPendingToolApproval {
    approval: PendingApproval;
    request: ToolExecutionRequest;
}

const pendingRunApprovals = new Map<string, StoredPendingRunApproval>();
const pendingToolApprovals = new Map<string, StoredPendingToolApproval>();

export function listStoredPendingRunApprovals(): StoredPendingRunApproval[] {
    return Array.from(pendingRunApprovals.values());
}

export function getStoredPendingRunApproval(approvalId: string): StoredPendingRunApproval | null {
    return pendingRunApprovals.get(approvalId) ?? null;
}

export function storePendingRunApproval(approval: StoredPendingRunApproval): void {
    pendingRunApprovals.set(approval.approvalId, approval);
}

export function replaceStoredPendingRunApproval(
    currentApprovalId: string,
    nextApproval: StoredPendingRunApproval | null,
): void {
    pendingRunApprovals.delete(currentApprovalId);
    if (nextApproval != null) {
        pendingRunApprovals.set(nextApproval.approvalId, nextApproval);
    }
}

export function clearStoredPendingRunApproval(approvalId: string): void {
    pendingRunApprovals.delete(approvalId);
}

export function listStoredPendingToolApprovals(): StoredPendingToolApproval[] {
    return Array.from(pendingToolApprovals.values());
}

export function getStoredPendingToolApproval(approvalId: string): StoredPendingToolApproval | null {
    return pendingToolApprovals.get(approvalId) ?? null;
}

export function storePendingToolApproval(approval: StoredPendingToolApproval): void {
    pendingToolApprovals.set(approval.approval.id, approval);
}

export function replaceStoredPendingToolApproval(
    currentApprovalId: string,
    nextApproval: StoredPendingToolApproval | null,
): void {
    pendingToolApprovals.delete(currentApprovalId);
    if (nextApproval != null) {
        pendingToolApprovals.set(nextApproval.approval.id, nextApproval);
    }
}

export function clearStoredPendingToolApproval(approvalId: string): void {
    pendingToolApprovals.delete(approvalId);
}

export function bindApprovalRetryRequest(request: ToolExecutionRequest, approvalToken: string): ToolExecutionRequest {
    return {
        ...request,
        approval_token: approvalToken,
    };
}

export function resetApprovalContinuityState(): void {
    pendingRunApprovals.clear();
    pendingToolApprovals.clear();
}
