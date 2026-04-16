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

function normalizeWorkspaceID(workspaceID: string | null | undefined): string {
    return workspaceID?.trim() ?? "";
}

function matchesWorkspaceScope(entryWorkspaceID: string | null | undefined, workspaceID: string | null | undefined): boolean {
    const targetWorkspaceID = normalizeWorkspaceID(workspaceID);
    if (targetWorkspaceID === "") {
        return true;
    }
    return normalizeWorkspaceID(entryWorkspaceID) === targetWorkspaceID;
}

export function listStoredPendingRunApprovals(): StoredPendingRunApproval[] {
    return Array.from(pendingRunApprovals.values());
}

export function listStoredPendingRunApprovalsForWorkspace(workspaceID: string | null | undefined): StoredPendingRunApproval[] {
    return listStoredPendingRunApprovals().filter((approval) =>
        matchesWorkspaceScope(approval.toolContext.workspace_id, workspaceID),
    );
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

export function listStoredPendingToolApprovalsForWorkspace(workspaceID: string | null | undefined): StoredPendingToolApproval[] {
    return listStoredPendingToolApprovals().filter((approval) =>
        matchesWorkspaceScope(approval.request.context?.workspace_id, workspaceID),
    );
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

export function isStalePendingApprovalError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
    const normalizedMessage = message.toLowerCase();
    return normalizedMessage.includes("pending approval not found") || normalizedMessage.includes("pending approval expired");
}
