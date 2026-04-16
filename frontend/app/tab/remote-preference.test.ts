import { assert, test } from "vitest";
import { pickPreferredRemoteConnectionID } from "./remote-preference";

test("pickPreferredRemoteConnectionID prefers active remote connection id", () => {
    assert.equal(pickPreferredRemoteConnectionID("conn-active", ["conn-fallback"]), "conn-active");
});

test("pickPreferredRemoteConnectionID falls back to first saved profile id when active is local", () => {
    assert.equal(pickPreferredRemoteConnectionID("local", ["conn-first", "conn-second"]), "conn-first");
    assert.equal(pickPreferredRemoteConnectionID(undefined, ["conn-first", "conn-second"]), "conn-first");
});

test("pickPreferredRemoteConnectionID returns undefined when no remote target is available", () => {
    assert.equal(pickPreferredRemoteConnectionID("local", []), undefined);
    assert.equal(pickPreferredRemoteConnectionID(undefined, []), undefined);
});
