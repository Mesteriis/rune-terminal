import { assert, test, vi } from "vitest";
import type { TerminalFacade } from "@/compat/terminal";
import type { ToolsFacade } from "@/compat/tools";
import type { TerminalOutputChunk } from "@/rterm-api/terminal/types";
import { executeRunCommandPrompt, parseRunCommandPrompt, summarizeTerminalOutput } from "./run-command";

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

test("executeRunCommandPrompt surfaces approval_required without flattening it into a generic tool error", async () => {
    const terminalFacade = {
        getSnapshot: vi.fn(async () => ({
            state: {
                widget_id: "widget-1",
                session_id: "widget-1",
                shell: "/bin/zsh",
                pid: 1,
                status: "running",
                started_at: "2026-04-16T09:33:55Z",
                can_send_input: true,
                can_interrupt: true,
            },
            chunks: [],
            next_seq: 7,
        })),
    } as unknown as TerminalFacade;
    const executeToolMock = vi.fn(async () => ({
        status: "requires_confirmation",
        pending_approval: {
            id: "approval-1",
            tool_name: "term.send_input",
            summary: "send terminal input",
            approval_tier: "dangerous",
            created_at: "2026-04-16T09:33:55Z",
            expires_at: "2026-04-16T09:38:55Z",
        },
    }));
    const toolsFacade = {
        executeTool: executeToolMock,
    } as unknown as ToolsFacade;

    const result = await executeRunCommandPrompt({
        terminalFacade,
        toolsFacade,
        command: "rm -rf /tmp/demo",
        context: {
            active_widget_id: "widget-1",
            repo_root: "/repo",
            workspace_id: "workspace-1",
        },
    });

    assert.deepEqual(result, {
        kind: "approval_required",
        pendingApproval: {
            id: "approval-1",
            tool_name: "term.send_input",
            summary: "send terminal input",
            approval_tier: "dangerous",
            created_at: "2026-04-16T09:33:55Z",
            expires_at: "2026-04-16T09:38:55Z",
        },
    });
    assert.equal(executeToolMock.mock.calls.length, 1);
    const approvalCallPayload = (
        executeToolMock as unknown as {
            mock: { calls: Array<[ { approval_token?: string } ]> };
        }
    ).mock.calls.at(0)?.[0];
    assert.equal(approvalCallPayload?.approval_token, undefined);
});

test("executeRunCommandPrompt forwards approval_token on approved retry", async () => {
    vi.useFakeTimers();

    const terminalFacade = {
        getSnapshot: vi
            .fn()
            .mockResolvedValueOnce({
                state: {
                    widget_id: "widget-1",
                    session_id: "widget-1",
                    shell: "/bin/zsh",
                    pid: 1,
                    status: "exited",
                    started_at: "2026-04-16T09:33:55Z",
                    can_send_input: true,
                    can_interrupt: true,
                },
                chunks: [],
                next_seq: 7,
            })
            .mockResolvedValueOnce({
                state: {
                    widget_id: "widget-1",
                    session_id: "widget-1",
                    shell: "/bin/zsh",
                    pid: 1,
                    status: "exited",
                    started_at: "2026-04-16T09:33:55Z",
                    can_send_input: true,
                    can_interrupt: true,
                },
                chunks: [
                    {
                        seq: 7,
                        data: "done\n",
                        timestamp: "2026-04-16T09:33:56Z",
                    },
                ],
                next_seq: 8,
            })
            .mockResolvedValueOnce({
                state: {
                    widget_id: "widget-1",
                    session_id: "widget-1",
                    shell: "/bin/zsh",
                    pid: 1,
                    status: "running",
                    started_at: "2026-04-16T09:33:55Z",
                    can_send_input: true,
                    can_interrupt: true,
                },
                chunks: [
                    {
                        seq: 7,
                        data: "done\n",
                        timestamp: "2026-04-16T09:33:56Z",
                    },
                ],
                next_seq: 8,
            }),
    } as unknown as TerminalFacade;
    const executeToolMock = vi.fn(async () => ({
        status: "ok",
        output: {
            widget_id: "widget-1",
            bytes_sent: 5,
            append_newline: true,
        },
    }));
    const toolsFacade = {
        executeTool: executeToolMock,
    } as unknown as ToolsFacade;

    const executionPromise = executeRunCommandPrompt({
        terminalFacade,
        toolsFacade,
        command: "echo done",
        context: {
            active_widget_id: "widget-1",
            repo_root: "/repo",
            workspace_id: "workspace-1",
        },
        approvalToken: "token-1",
    });

    await vi.advanceTimersByTimeAsync(200);
    const result = await executionPromise;

    assert.equal(executeToolMock.mock.calls.length, 1);
    const retryPayload = (
        executeToolMock as unknown as {
            mock: { calls: Array<[ { approval_token?: string } ]> };
        }
    ).mock.calls.at(0)?.[0];
    assert.equal(retryPayload?.approval_token, "token-1");
    assert.equal(result.kind, "executed");

    vi.useRealTimers();
});

test("executeRunCommandPrompt tolerates null snapshot chunks from terminal API", async () => {
    vi.useFakeTimers();

    const terminalFacade = {
        getSnapshot: vi
            .fn()
            .mockResolvedValueOnce({
                state: {
                    widget_id: "widget-1",
                    session_id: "widget-1",
                    shell: "/bin/zsh",
                    pid: 1,
                    status: "running",
                    started_at: "2026-04-16T09:33:55Z",
                    can_send_input: true,
                    can_interrupt: true,
                },
                chunks: [],
                next_seq: 7,
            })
            .mockResolvedValueOnce({
                state: {
                    widget_id: "widget-1",
                    session_id: "widget-1",
                    shell: "/bin/zsh",
                    pid: 1,
                    status: "exited",
                    started_at: "2026-04-16T09:33:55Z",
                    can_send_input: true,
                    can_interrupt: true,
                },
                chunks: null,
                next_seq: 7,
            })
            .mockResolvedValueOnce({
                state: {
                    widget_id: "widget-1",
                    session_id: "widget-1",
                    shell: "/bin/zsh",
                    pid: 1,
                    status: "exited",
                    started_at: "2026-04-16T09:33:55Z",
                    can_send_input: true,
                    can_interrupt: true,
                },
                chunks: null,
                next_seq: 7,
            }),
    } as unknown as TerminalFacade;
    const toolsFacade = {
        executeTool: vi.fn(async () => ({
            status: "ok",
            output: {
                widget_id: "widget-1",
                bytes_sent: 5,
                append_newline: true,
            },
        })),
    } as unknown as ToolsFacade;

    const executionPromise = executeRunCommandPrompt({
        terminalFacade,
        toolsFacade,
        command: "echo done",
        context: {
            active_widget_id: "widget-1",
            repo_root: "/repo",
            workspace_id: "workspace-1",
        },
        approvalToken: "token-1",
    });

    await vi.advanceTimersByTimeAsync(200);
    const result = await executionPromise;
    assert.equal(result.kind, "executed");
    if (result.kind === "executed") {
        assert.equal(result.outputExcerpt, "");
    }

    vi.useRealTimers();
});
