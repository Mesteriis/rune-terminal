import { assert, test } from "vitest";
import { deriveSessionTarget, isLocalConnectionID } from "./session-target";

test("isLocalConnectionID detects local connection shapes", () => {
    assert.isTrue(isLocalConnectionID(undefined));
    assert.isTrue(isLocalConnectionID(""));
    assert.isTrue(isLocalConnectionID("local"));
    assert.isTrue(isLocalConnectionID("local:default"));
    assert.isFalse(isLocalConnectionID("conn-prod"));
});

test("deriveSessionTarget returns local target metadata by default", () => {
    assert.deepEqual(deriveSessionTarget(undefined), {
        targetSession: "local",
        targetConnectionID: "local",
    });
    assert.deepEqual(deriveSessionTarget(""), {
        targetSession: "local",
        targetConnectionID: "local",
    });
});

test("deriveSessionTarget returns remote target metadata for non-local IDs", () => {
    assert.deepEqual(deriveSessionTarget("conn-prod"), {
        targetSession: "remote",
        targetConnectionID: "conn-prod",
    });
});
