import { assert, test, vi } from "vitest";

vi.mock("./active-context", () => ({
    getActiveWorkspaceContext: () => ({
        workspaceID: "ws-local",
        activeWidgetID: "term-main",
        activeWidgetKind: "terminal",
        activeFilePath: "/repo/README.md",
        activeTerminalTarget: {
            targetSession: "remote",
            targetConnectionID: "conn-ssh",
        },
        activeRemoteTarget: {
            connectionID: "conn-ssh",
        },
    }),
}));

import { buildToolExecutionContext } from "./widget-helpers";

test("buildToolExecutionContext omits terminal target fields unless explicitly requested", () => {
    const context = buildToolExecutionContext("/repo", "workspace.tools.execute");

    assert.deepEqual(context, {
        workspace_id: "ws-local",
        active_widget_id: "term-main",
        repo_root: "/repo",
        action_source: "workspace.tools.execute",
        target_session: undefined,
        target_connection_id: undefined,
    });
});

test("buildToolExecutionContext includes terminal target fields when explicitly requested", () => {
    const context = buildToolExecutionContext("/repo", "ai.panel.run_command", {
        includeTerminalTarget: true,
    });

    assert.deepEqual(context, {
        workspace_id: "ws-local",
        active_widget_id: "term-main",
        repo_root: "/repo",
        action_source: "ai.panel.run_command",
        target_session: "remote",
        target_connection_id: "conn-ssh",
    });
});
