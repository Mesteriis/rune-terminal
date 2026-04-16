import { assert, test } from "vitest";
import type { WorkspaceStoreSnapshot } from "../state/workspace.store";
import { deriveActiveWorkspaceContext } from "./active-context";

function makeWorkspaceSnapshot(overrides?: Partial<WorkspaceStoreSnapshot["active"]>): WorkspaceStoreSnapshot["active"] {
    return {
        oid: "ws-local",
        name: "Local workspace",
        icon: "",
        color: "",
        tabids: ["tab-main"],
        pinnedtabids: [],
        activetabid: "tab-main",
        activewidgetid: "term-main",
        tabs: {
            "tab-main": {
                id: "tab-main",
                title: "Main",
                pinned: false,
                widgetIds: ["term-main"],
            },
        },
        widgets: {
            "term-main": {
                id: "term-main",
                kind: "terminal",
                title: "Main terminal",
                connectionId: "local",
            },
        },
        ...overrides,
    };
}

test("deriveActiveWorkspaceContext returns local terminal target for local active widget", () => {
    const context = deriveActiveWorkspaceContext(makeWorkspaceSnapshot(), "/repo/docs/a.md");
    assert.equal(context.workspaceID, "ws-local");
    assert.equal(context.activeWidgetID, "term-main");
    assert.equal(context.activeWidgetKind, "terminal");
    assert.equal(context.activeFilePath, "/repo/docs/a.md");
    assert.deepEqual(context.activeTerminalTarget, {
        targetSession: "local",
        targetConnectionID: "local",
    });
    assert.equal(context.activeRemoteTarget, null);
});

test("deriveActiveWorkspaceContext marks remote target when active widget is remote", () => {
    const context = deriveActiveWorkspaceContext(
        makeWorkspaceSnapshot({
            widgets: {
                "term-main": {
                    id: "term-main",
                    kind: "terminal",
                    title: "Remote terminal",
                    connectionId: "conn-ssh-prod",
                },
            },
        }),
        "",
    );
    assert.deepEqual(context.activeTerminalTarget, {
        targetSession: "remote",
        targetConnectionID: "conn-ssh-prod",
    });
    assert.deepEqual(context.activeRemoteTarget, {
        connectionID: "conn-ssh-prod",
    });
});

test("deriveActiveWorkspaceContext clears terminal target when no active widget is present", () => {
    const context = deriveActiveWorkspaceContext(
        makeWorkspaceSnapshot({
            activewidgetid: "",
        }),
        "   ",
    );
    assert.equal(context.activeWidgetID, "");
    assert.equal(context.activeFilePath, "");
    assert.equal(context.activeTerminalTarget, null);
    assert.equal(context.activeRemoteTarget, null);
});
