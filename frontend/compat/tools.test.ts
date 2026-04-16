import { assert, test, vi } from "vitest";
import type { BootstrapClient } from "@/rterm-api/bootstrap/client";
import type { ToolExecutionResponse, ToolsListResponse } from "@/rterm-api/tools/types";
import type { ToolsClient } from "@/rterm-api/tools/client";
import { getApprovalGrant } from "@/rterm-api/tools/client";
import { createToolsFacade } from "./tools";

test("createToolsFacade confirmApproval uses the typed safety.confirm client helper", async () => {
    const confirmApproval = vi.fn(async () => ({ status: "ok" } satisfies ToolExecutionResponse));
    const listTools = vi.fn(async () => ({ tools: [] } satisfies ToolsListResponse));
    const executeTool = vi.fn(async () => ({ status: "ok" } satisfies ToolExecutionResponse));
    const getBootstrap = vi.fn(async () => ({ repo_root: "/repo" }));

    const facade = createToolsFacade(
        {
            confirmApproval,
            executeTool,
            listTools,
        } as unknown as ToolsClient,
        {
            getBootstrap,
        } as unknown as BootstrapClient,
    );

    const context = {
        workspace_id: "workspace-1",
        active_widget_id: "widget-1",
        repo_root: "/repo",
    };

    await facade.confirmApproval("approval-1", context);

    assert.equal(confirmApproval.mock.calls.length, 1);
    assert.deepEqual(confirmApproval.mock.calls[0], ["approval-1", context]);
    assert.equal(executeTool.mock.calls.length, 0);
});

test("getApprovalGrant extracts the approval token only from a valid confirm response", () => {
    assert.deepEqual(
        getApprovalGrant({
            status: "ok",
            output: {
                approval_id: "approval-1",
                approval_token: "token-1",
                expires_at: "2026-04-16T09:33:55Z",
            },
        }),
        {
            approval_id: "approval-1",
            approval_token: "token-1",
            expires_at: "2026-04-16T09:33:55Z",
        },
    );

    assert.isNull(
        getApprovalGrant({
            status: "ok",
            output: {
                approval_id: "approval-1",
                expires_at: "2026-04-16T09:33:55Z",
            },
        }),
    );
});
