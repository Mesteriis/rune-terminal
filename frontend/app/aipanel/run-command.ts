import type { ConversationFacade } from "@/compat/conversation";
import type { TerminalFacade } from "@/compat/terminal";
import type { ToolsFacade } from "@/compat/tools";
import type {
    ConversationContext,
    ExplainTerminalCommandResponse,
} from "@/rterm-api/conversation/types";
import type { TerminalOutputChunk, TerminalSnapshot } from "@/rterm-api/terminal/types";
import type { PendingApproval, ToolExecutionContext, ToolExecutionResponse } from "@/rterm-api/tools/types";
import type { WaveUIMessage } from "./aitypes";

export interface RunCommandIntent {
    kind: "run";
    prompt: string;
    command: string;
}

export interface InvalidRunCommandIntent {
    kind: "invalid";
    message: string;
}

export type RunCommandParseResult = RunCommandIntent | InvalidRunCommandIntent | null;

const RUN_COMMAND_PREFIX = "/run";
const RUN_COMMAND_ALIAS = "run:";
const RUN_COMMAND_FORMAT_MESSAGE = "Use `/run <command>` to execute a terminal command from the AI panel.";
const RUN_COMMAND_OUTPUT_EMPTY_MESSAGE = "No terminal output was captured yet.";
const RUN_COMMAND_OUTPUT_LIMIT = 4000;
const RUN_COMMAND_POLL_INTERVAL_MS = 200;
const RUN_COMMAND_POLL_ATTEMPTS = 8;
const ANSI_CSI_PATTERN = /\u001b\[[0-?]*[ -/]*[@-~]/g;

export function parseRunCommandPrompt(prompt: string): RunCommandParseResult {
    const trimmed = prompt.trim();
    if (trimmed === "") {
        return null;
    }
    if (trimmed === RUN_COMMAND_PREFIX) {
        return {
            kind: "invalid",
            message: RUN_COMMAND_FORMAT_MESSAGE,
        };
    }
    if (trimmed.startsWith(`${RUN_COMMAND_PREFIX} `)) {
        const command = trimmed.slice(RUN_COMMAND_PREFIX.length).trim();
        if (command === "") {
            return {
                kind: "invalid",
                message: RUN_COMMAND_FORMAT_MESSAGE,
            };
        }
        return {
            kind: "run",
            prompt: trimmed,
            command,
        };
    }
    if (trimmed === RUN_COMMAND_ALIAS) {
        return {
            kind: "invalid",
            message: RUN_COMMAND_FORMAT_MESSAGE,
        };
    }
    if (trimmed.startsWith(RUN_COMMAND_ALIAS)) {
        const command = trimmed.slice(RUN_COMMAND_ALIAS.length).trim();
        if (command === "") {
            return {
                kind: "invalid",
                message: RUN_COMMAND_FORMAT_MESSAGE,
            };
        }
        return {
            kind: "run",
            prompt: trimmed,
            command,
        };
    }
    return null;
}

type TranscriptRole = "user" | "assistant";

export function createTranscriptTextMessage(role: TranscriptRole, text: string): WaveUIMessage {
    return {
        id: crypto.randomUUID(),
        role,
        parts: [
            {
                type: "text",
                text,
            },
        ],
    } as WaveUIMessage;
}

export interface RunCommandToolErrorResult {
    kind: "tool_error";
    resultMessage: WaveUIMessage;
}

export interface RunCommandApprovalRequiredResult {
    kind: "approval_required";
    pendingApproval: PendingApproval;
}

export interface RunCommandExecutedResult {
    kind: "executed";
    resultMessage: WaveUIMessage;
    widgetId: string;
    fromSeq: number;
    outputExcerpt: string;
    snapshot: TerminalSnapshot;
}

export type RunCommandExecutionResult =
    | RunCommandApprovalRequiredResult
    | RunCommandToolErrorResult
    | RunCommandExecutedResult;

interface ExecuteRunCommandPromptOptions {
    terminalFacade: TerminalFacade;
    toolsFacade: ToolsFacade;
    command: string;
    context: ToolExecutionContext;
    approvalToken?: string;
}

export async function executeRunCommandPrompt(
    options: ExecuteRunCommandPromptOptions,
): Promise<RunCommandExecutionResult> {
    const widgetId = options.context.active_widget_id?.trim();
    if (widgetId == null || widgetId === "") {
        return {
            kind: "tool_error",
            resultMessage: createTranscriptTextMessage(
                "assistant",
                "An active terminal widget is required before `/run` can execute a command.",
            ),
        };
    }

    const beforeSnapshot = await options.terminalFacade.getSnapshot(widgetId);
    const fromSeq = beforeSnapshot.next_seq;
    const toolResponse = await options.toolsFacade.executeTool({
        tool_name: "term.send_input",
        input: {
            widget_id: widgetId,
            text: options.command,
            append_newline: true,
        },
        context: options.context,
        approval_token: options.approvalToken,
    });

    if (toolResponse.status === "requires_confirmation" && toolResponse.pending_approval != null) {
        return {
            kind: "approval_required",
            pendingApproval: toolResponse.pending_approval,
        };
    }

    if (toolResponse.status !== "ok") {
        return {
            kind: "tool_error",
            resultMessage: createTranscriptTextMessage("assistant", buildToolFailureMessage(options.command, toolResponse)),
        };
    }

    const snapshot = await waitForRunCommandOutput(options.terminalFacade, widgetId, fromSeq);
    const outputExcerpt = summarizeTerminalOutput(options.command, snapshot.chunks);

    return {
        kind: "executed",
        resultMessage: createTranscriptTextMessage("assistant", buildExecutionResultMessage(options.command, outputExcerpt)),
        widgetId,
        fromSeq,
        outputExcerpt,
        snapshot,
    };
}

interface ExplainRunCommandPromptOptions {
    conversationFacade: ConversationFacade;
    prompt: string;
    command: string;
    widgetId: string;
    fromSeq: number;
    approvalUsed?: boolean;
    context: ConversationContext;
}

export function explainRunCommandPrompt(
    options: ExplainRunCommandPromptOptions,
): Promise<ExplainTerminalCommandResponse> {
    return options.conversationFacade.explainTerminalCommand({
        prompt: options.prompt,
        command: options.command,
        widget_id: options.widgetId,
        from_seq: options.fromSeq,
        approval_used: options.approvalUsed,
        context: options.context,
    });
}

export function buildRunCommandExplanationFallbackMessage(command: string, outputExcerpt: string, error: string): WaveUIMessage {
    const details = error.trim() || "The backend explanation request failed.";
    if (outputExcerpt === "") {
        return createTranscriptTextMessage(
            "assistant",
            `Explanation unavailable for \`${command}\`.\n\n${details}\n\n${RUN_COMMAND_OUTPUT_EMPTY_MESSAGE}`,
        );
    }
    return createTranscriptTextMessage(
        "assistant",
        `Explanation unavailable for \`${command}\`.\n\n${details}\n\nObserved output:\n\n\`\`\`text\n${sanitizeCodeFenceContent(outputExcerpt)}\n\`\`\``,
    );
}

function buildToolFailureMessage(command: string, response: ToolExecutionResponse): string {
    const errorMessage = response.error?.trim() || "The runtime rejected the terminal command request.";
    return `Failed to run \`${command}\`.\n\n${errorMessage}`;
}

function buildExecutionResultMessage(command: string, outputExcerpt: string): string {
    if (outputExcerpt === "") {
        return `Executed \`${command}\`.\n\n${RUN_COMMAND_OUTPUT_EMPTY_MESSAGE}`;
    }
    return `Executed \`${command}\`.\n\n\`\`\`text\n${sanitizeCodeFenceContent(outputExcerpt)}\n\`\`\``;
}

function sanitizeCodeFenceContent(value: string): string {
    return value.replaceAll("```", "``\\`");
}

export function summarizeTerminalOutput(command: string, chunks: TerminalOutputChunk[]): string {
    if (chunks.length === 0) {
        return "";
    }
    const output = chunks
        .map((chunk) => chunk.data)
        .join("");
    const cleanedOutput = normalizeTerminalOutput(command, output);
    if (cleanedOutput.length <= RUN_COMMAND_OUTPUT_LIMIT) {
        return cleanedOutput;
    }
    return cleanedOutput.slice(cleanedOutput.length - RUN_COMMAND_OUTPUT_LIMIT);
}

function normalizeTerminalOutput(command: string, output: string): string {
    const withoutAnsi = applyTerminalBackspaces(output)
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(ANSI_CSI_PATTERN, "")
        .replaceAll("\u001b", "");
    const trimmedCommand = command.trim();
    const lines = withoutAnsi
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "")
        .filter((line) => line !== "%" && !line.startsWith("╭") && !line.startsWith("╰"))
        .filter(
            (line) =>
                line !== trimmedCommand &&
                !(trimmedCommand !== "" && (trimmedCommand.startsWith(line) || line.startsWith(trimmedCommand))),
        );
    return lines.join("\n").trim();
}

function applyTerminalBackspaces(value: string): string {
    const chars: string[] = [];
    for (const char of value) {
        if (char === "\b") {
            chars.pop();
            continue;
        }
        chars.push(char);
    }
    return chars.join("");
}

async function waitForRunCommandOutput(
    terminalFacade: TerminalFacade,
    widgetId: string,
    fromSeq: number,
): Promise<TerminalSnapshot> {
    let snapshot = await terminalFacade.getSnapshot(widgetId, fromSeq);
    let previousNextSeq = snapshot.next_seq;
    let sawOutput = snapshot.chunks.length > 0 || snapshot.state.status !== "running";

    for (let attempt = 0; attempt < RUN_COMMAND_POLL_ATTEMPTS; attempt += 1) {
        await sleep(RUN_COMMAND_POLL_INTERVAL_MS);
        snapshot = await terminalFacade.getSnapshot(widgetId, fromSeq);
        const nextSeqChanged = snapshot.next_seq !== previousNextSeq;
        if (snapshot.chunks.length > 0 || snapshot.state.status !== "running") {
            sawOutput = true;
        }
        if (sawOutput && !nextSeqChanged) {
            return snapshot;
        }
        previousNextSeq = snapshot.next_seq;
    }
    return snapshot;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        globalThis.setTimeout(resolve, ms);
    });
}
