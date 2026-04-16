import { assert, test } from "vitest";
import {
    bindApprovalRetryRequest,
    clearStoredPendingRunApproval,
    clearStoredPendingToolApproval,
    getStoredPendingRunApproval,
    getStoredPendingToolApproval,
    isStalePendingApprovalError,
    listStoredPendingRunApprovalsForWorkspace,
    listStoredPendingToolApprovalsForWorkspace,
    replaceStoredPendingRunApproval,
    replaceStoredPendingToolApproval,
    resetApprovalContinuityState,
    storePendingRunApproval,
    storePendingToolApproval,
} from "./continuity";

test("run approval continuity keeps retry context outside component-local state", () => {
    resetApprovalContinuityState();

    storePendingRunApproval({
        approvalId: "approval-run-1",
        prompt: "/run echo hello",
        command: "echo hello",
        summary: "send input to term-main: echo hello",
        approvalTier: "dangerous",
        toolContext: {
            workspace_id: "ws-local",
            active_widget_id: "term-main",
            repo_root: "/repo",
        },
        conversationContext: {
            workspace_id: "ws-local",
            active_widget_id: "term-main",
            repo_root: "/repo",
            widget_context_enabled: true,
        },
    });

    assert.equal(getStoredPendingRunApproval("approval-run-1")?.command, "echo hello");

    replaceStoredPendingRunApproval("approval-run-1", {
        approvalId: "approval-run-2",
        prompt: "/run echo hello",
        command: "echo hello",
        summary: "send input to term-main: echo hello",
        approvalTier: "dangerous",
        toolContext: {
            workspace_id: "ws-local",
            active_widget_id: "term-main",
            repo_root: "/repo",
        },
        conversationContext: {
            workspace_id: "ws-local",
            active_widget_id: "term-main",
            repo_root: "/repo",
            widget_context_enabled: true,
        },
    });

    assert.isNull(getStoredPendingRunApproval("approval-run-1"));
    assert.equal(getStoredPendingRunApproval("approval-run-2")?.approvalId, "approval-run-2");

    clearStoredPendingRunApproval("approval-run-2");
    assert.isNull(getStoredPendingRunApproval("approval-run-2"));
});

test("tool approval continuity binds approval token to the stored execution intent", () => {
    resetApprovalContinuityState();

    storePendingToolApproval({
        approval: {
            id: "approval-tool-1",
            tool_name: "safety.add_ignore_rule",
            summary: "add ignore rule demo-* (metadata-only)",
            approval_tier: "dangerous",
            created_at: "2026-04-16T00:00:00Z",
            expires_at: "2026-04-16T00:10:00Z",
        },
        request: {
            tool_name: "safety.add_ignore_rule",
            input: {
                scope: "repo",
                matcher_type: "glob",
                pattern: "demo-*",
                mode: "metadata-only",
            },
            context: {
                workspace_id: "ws-local",
                active_widget_id: "term-main",
                repo_root: "/repo",
            },
        },
    });

    const stored = getStoredPendingToolApproval("approval-tool-1");
    assert.isNotNull(stored);
    assert.deepEqual(bindApprovalRetryRequest(stored!.request, "token-1"), {
        tool_name: "safety.add_ignore_rule",
        input: {
            scope: "repo",
            matcher_type: "glob",
            pattern: "demo-*",
            mode: "metadata-only",
        },
        context: {
            workspace_id: "ws-local",
            active_widget_id: "term-main",
            repo_root: "/repo",
        },
        approval_token: "token-1",
    });

    replaceStoredPendingToolApproval("approval-tool-1", null);
    assert.isNull(getStoredPendingToolApproval("approval-tool-1"));

    clearStoredPendingToolApproval("approval-tool-1");
});

test("approval continuity filtering is scoped by workspace id", () => {
    resetApprovalContinuityState();

    storePendingRunApproval({
        approvalId: "approval-run-ws-a",
        prompt: "/run echo a",
        command: "echo a",
        summary: "send input a",
        approvalTier: "dangerous",
        toolContext: {
            workspace_id: "ws-a",
            active_widget_id: "term-main",
            repo_root: "/repo-a",
        },
        conversationContext: {
            workspace_id: "ws-a",
            active_widget_id: "term-main",
            repo_root: "/repo-a",
            widget_context_enabled: true,
        },
    });
    storePendingRunApproval({
        approvalId: "approval-run-ws-b",
        prompt: "/run echo b",
        command: "echo b",
        summary: "send input b",
        approvalTier: "dangerous",
        toolContext: {
            workspace_id: "ws-b",
            active_widget_id: "term-main",
            repo_root: "/repo-b",
        },
        conversationContext: {
            workspace_id: "ws-b",
            active_widget_id: "term-main",
            repo_root: "/repo-b",
            widget_context_enabled: true,
        },
    });

    storePendingToolApproval({
        approval: {
            id: "approval-tool-ws-a",
            tool_name: "safety.add_ignore_rule",
            summary: "a",
            approval_tier: "dangerous",
            created_at: "2026-04-16T00:00:00Z",
            expires_at: "2026-04-16T00:10:00Z",
        },
        request: {
            tool_name: "safety.add_ignore_rule",
            input: { pattern: "a" },
            context: {
                workspace_id: "ws-a",
                active_widget_id: "term-main",
                repo_root: "/repo-a",
            },
        },
    });
    storePendingToolApproval({
        approval: {
            id: "approval-tool-ws-b",
            tool_name: "safety.add_ignore_rule",
            summary: "b",
            approval_tier: "dangerous",
            created_at: "2026-04-16T00:00:00Z",
            expires_at: "2026-04-16T00:10:00Z",
        },
        request: {
            tool_name: "safety.add_ignore_rule",
            input: { pattern: "b" },
            context: {
                workspace_id: "ws-b",
                active_widget_id: "term-main",
                repo_root: "/repo-b",
            },
        },
    });

    assert.deepEqual(
        listStoredPendingRunApprovalsForWorkspace("ws-a").map((entry) => entry.approvalId),
        ["approval-run-ws-a"],
    );
    assert.deepEqual(
        listStoredPendingToolApprovalsForWorkspace("ws-b").map((entry) => entry.approval.id),
        ["approval-tool-ws-b"],
    );
});

test("stale pending approval errors are recognized explicitly", () => {
    assert.isTrue(isStalePendingApprovalError(new Error("pending approval not found: approval_123")));
    assert.isTrue(isStalePendingApprovalError(new Error("pending approval expired: approval_456")));
    assert.isFalse(isStalePendingApprovalError(new Error("approval token mismatch")));
});
