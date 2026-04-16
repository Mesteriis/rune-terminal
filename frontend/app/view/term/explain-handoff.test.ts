import { assert, test } from "vitest";
import type { AuditEvent } from "../../../rterm-api/audit/types";
import { findLatestWidgetCommand, parseCommandFromSendInputSummary } from "./explain-handoff";

function event(overrides: Partial<AuditEvent>): AuditEvent {
    return {
        id: "audit_1",
        tool_name: "term.send_input",
        success: true,
        timestamp: "2026-04-16T20:00:00Z",
        summary: "send input to term-main: pwd",
        affected_widgets: ["term-main"],
        ...overrides,
    };
}

test("parseCommandFromSendInputSummary extracts command text", () => {
    assert.equal(parseCommandFromSendInputSummary("term-main", "send input to term-main: echo hello"), "echo hello");
    assert.equal(parseCommandFromSendInputSummary("term-main", "send input to term-side: echo hello"), "");
    assert.equal(parseCommandFromSendInputSummary("term-main", undefined), "");
});

test("findLatestWidgetCommand uses the most recent matching term.send_input event", () => {
    const result = findLatestWidgetCommand(
        [
            event({
                timestamp: "2026-04-16T20:00:00Z",
                summary: "send input to term-main: echo first",
            }),
            event({
                timestamp: "2026-04-16T20:01:00Z",
                summary: "send input to term-main: echo latest",
            }),
            event({
                timestamp: "2026-04-16T20:02:00Z",
                summary: "send input to term-side: echo other-widget",
                affected_widgets: ["term-side"],
            }),
        ],
        "term-main",
    );
    assert.equal(result, "echo latest");
});

test("findLatestWidgetCommand returns empty when there is no matching event", () => {
    const result = findLatestWidgetCommand(
        [
            event({
                tool_name: "workspace.list_tabs",
                summary: "list tabs",
            }),
            event({
                success: false,
                summary: "send input to term-main: echo failed",
            }),
        ],
        "term-main",
    );
    assert.equal(result, "");
});
