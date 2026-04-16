import { assert, test, vi } from "vitest";
import { ApiError } from "@/rterm-api/http/errors";
import { ToolsClient } from "./client";

test("ToolsClient.executeTool preserves structured approval_mismatch responses", async () => {
    const http = {
        get: vi.fn(),
        post: vi.fn(async () => {
            throw new ApiError({
                status: 403,
                code: "http_error",
                message: "forbidden",
                details: {
                    status: "error",
                    error: "approval token does not match the requested execution intent",
                    error_code: "approval_mismatch",
                },
            });
        }),
    } as any;

    const client = new ToolsClient(http);
    const response = await client.executeTool({
        tool_name: "term.send_input",
        input: {
            widget_id: "term-main",
            text: "echo hardened",
            append_newline: true,
        },
        approval_token: "token-1",
    });

    assert.deepEqual(response, {
        status: "error",
        error: "approval token does not match the requested execution intent",
        error_code: "approval_mismatch",
    });
});
