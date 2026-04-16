import type { ConversationFacade } from "@/compat/conversation";
import type {
    ConversationContext,
    SubmitConversationMessageResponse,
} from "@/rterm-api/conversation/types";

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

interface SubmitRunCommandPromptOptions {
    conversationFacade: ConversationFacade;
    prompt: string;
    context: ConversationContext;
}

export function submitRunCommandPrompt(
    options: SubmitRunCommandPromptOptions,
): Promise<SubmitConversationMessageResponse> {
    return options.conversationFacade.submitMessage({
        prompt: options.prompt,
        context: options.context,
    });
}
