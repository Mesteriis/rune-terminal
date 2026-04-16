import { assert, test } from "vitest";
import { parseRunCommandPrompt } from "./run-command";

test("parseRunCommandPrompt ignores free-text prompts", () => {
    assert.isNull(parseRunCommandPrompt("hello there"));
});

test("parseRunCommandPrompt extracts /run command", () => {
    assert.deepEqual(parseRunCommandPrompt("  /run echo hello  "), {
        kind: "run",
        prompt: "/run echo hello",
        command: "echo hello",
    });
});

test("parseRunCommandPrompt extracts run: alias", () => {
    assert.deepEqual(parseRunCommandPrompt("run: pwd"), {
        kind: "run",
        prompt: "run: pwd",
        command: "pwd",
    });
});

test("parseRunCommandPrompt rejects missing command", () => {
    const result = parseRunCommandPrompt("/run");
    assert.deepEqual(result, {
        kind: "invalid",
        message: "Use `/run <command>` to execute a terminal command from the AI panel.",
    });
});
