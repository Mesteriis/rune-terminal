import { assert, test } from "vitest";
import type { TerminalOutputChunk } from "@/rterm-api/terminal/types";
import { parseRunCommandPrompt, summarizeTerminalOutput } from "./run-command";

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

test("summarizeTerminalOutput strips prompt noise and ANSI escapes", () => {
    const chunks: TerminalOutputChunk[] = [
        {
            seq: 15,
            data: "\u001b[10D\u001b[32me\u001b[32mc\u001b[32mh\u001b[32mo\u001b[39m\u001b[6C",
            timestamp: "2026-04-16T09:33:55.76916Z",
        },
        {
            seq: 16,
            data: "\u001b[?2004l\r\r\n",
            timestamp: "2026-04-16T09:33:55.770282Z",
        },
        {
            seq: 17,
            data: "hello\r\n",
            timestamp: "2026-04-16T09:33:55.82175Z",
        },
        {
            seq: 18,
            data: "\u001b[1m\u001b[7m%\u001b[27m\u001b[1m\u001b[0m                                                                                                                       \r \r",
            timestamp: "2026-04-16T09:33:55.821793Z",
        },
        {
            seq: 19,
            data: "\r\u001b[0m\u001b[27m\u001b[24m\u001b[J\r\n\u001b[1;36m╭─\u001b[34mruna-terminal\u001b[0m on \u001b[1;35m main\u001b[0m\r\n\u001b[1;36m╰─\u001b[32m➜\u001b[0m \u001b[K\u001b[?2004h",
            timestamp: "2026-04-16T09:33:55.903731Z",
        },
    ];

    assert.equal(summarizeTerminalOutput("echo hello", chunks), "hello");
});
