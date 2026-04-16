import type { ConversationFacade } from "@/compat/conversation";
import type { TerminalFacade } from "@/compat/terminal";
import type { ToolsFacade } from "@/compat/tools";
import type {
    ConversationContext,
    ExplainTerminalCommandResponse,
} from "@/rterm-api/conversation/types";
import type { TerminalOutputChunk, TerminalSnapshot } from "@/rterm-api/terminal/types";
import type { ToolExecutionContext, ToolExecutionResponse } from "@/rterm-api/tools/types";
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

export interface RunCommandExecutedResult {
    kind: "executed";
    resultMessage: WaveUIMessage;
    widgetId: string;
    fromSeq: number;
    outputExcerpt: string;
    snapshot: TerminalSnapshot;
}

export type RunCommandExecutionResult = RunCommandToolErrorResult | RunCommandExecutedResult;

interface ExecuteRunCommandPromptOptions {
    terminalFacade: TerminalFacade;
    toolsFacade: ToolsFacade;
    command: string;
    context: ToolExecutionContext;
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
    });

    if (toolResponse.status !== "ok") {
        return {
            kind: "tool_error",
            resultMessage: createTranscriptTextMessage("assistant", buildToolFailureMessage(options.command, toolResponse)),
        };
    }

    const snapshot = await waitForRunCommandOutput(options.terminalFacade, widgetId, fromSeq);
    const outputExcerpt = summarizeTerminalOutput(snapshot.chunks);

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
    if (response.status === "requires_confirmation") {
        const summary = response.pending_approval?.summary?.trim();
        return summary
            ? `Approval required to run \`${command}\`.\n\n${summary}`
            : `Approval required to run \`${command}\`.`;
    }
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

function summarizeTerminalOutput(chunks: TerminalOutputChunk[]): string {
    if (chunks.length === 0) {
        return "";
    }
    const output = chunks
        .map((chunk) => chunk.data)
        .join("")
        .trim();
    if (output.length <= RUN_COMMAND_OUTPUT_LIMIT) {
        return output;
    }
    return output.slice(output.length - RUN_COMMAND_OUTPUT_LIMIT);
}

async function waitForRunCommandOutput(
    terminalFacade: TerminalFacade,
    widgetId: string,
    fromSeq: number,
): Promise<TerminalSnapshot> {
    let snapshot = await terminalFacade.getSnapshot(widgetId, fromSeq);
    if (snapshot.chunks.length > 0 || snapshot.state.status !== "running") {
        return snapshot;
    }

    for (let attempt = 0; attempt < RUN_COMMAND_POLL_ATTEMPTS; attempt += 1) {
        await sleep(RUN_COMMAND_POLL_INTERVAL_MS);
        snapshot = await terminalFacade.getSnapshot(widgetId, fromSeq);
        if (snapshot.chunks.length > 0 || snapshot.state.status !== "running") {
            return snapshot;
        }
    }
    return snapshot;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
}
