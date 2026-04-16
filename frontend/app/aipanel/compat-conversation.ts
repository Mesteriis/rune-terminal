import { buildToolExecutionContext } from "@/app/workspace/widget-helpers";
import type { AgentCatalog } from "@/rterm-api/agent/types";
import type {
    AttachmentReference,
    ConversationContext,
    ConversationMessage,
    ConversationSnapshot,
    ProviderInfo,
} from "@/rterm-api/conversation/types";
import { isTextLikeAttachmentType } from "./ai-utils";
import type { WaveUIMessage, WaveUIMessagePart } from "./aitypes";

function mapRole(role: string): "user" | "assistant" {
    return role === "assistant" ? "assistant" : "user";
}

function mapMessageContent(message: ConversationMessage): string {
    const content = message.content?.trim();
    if (content) {
        return content;
    }
    if (message.status === "error") {
        return "The assistant returned an empty error response.";
    }
    return "The assistant returned an empty response.";
}

export function mapConversationMessages(messages: ConversationMessage[] | null | undefined): WaveUIMessage[] {
    if (!Array.isArray(messages)) {
        return [];
    }
    return messages.map((message) => ({
        id: message.id,
        role: mapRole(message.role),
        parts: [
            {
                type: "text",
                text: mapMessageContent(message),
            },
            ...mapAttachmentParts(message.attachments),
        ],
    })) as WaveUIMessage[];
}

function mapAttachmentParts(attachments: AttachmentReference[] | null | undefined): WaveUIMessagePart[] {
    if (!Array.isArray(attachments) || attachments.length === 0) {
        return [];
    }
    return attachments.map((attachment) => ({
        type: "data-userfile",
        data: {
            filename: attachment.name,
            mimetype: attachment.mime_type,
            size: attachment.size,
            filepath: attachment.path,
            referencekind: "local",
            consumptionhint: isTextLikeAttachmentType(attachment.mime_type || "", attachment.name || "")
                ? "text"
                : "metadata_only",
        },
    })) as WaveUIMessagePart[];
}

export function mapConversationSnapshot(snapshot: ConversationSnapshot | null | undefined): WaveUIMessage[] {
    return mapConversationMessages(snapshot?.messages);
}

export function buildCompatConversationContext(repoRoot: string): ConversationContext {
    const context = buildToolExecutionContext(repoRoot);
    return {
        ...context,
        widget_context_enabled: context.active_widget_id != null,
    };
}

export function formatProviderLabel(provider: ProviderInfo | null | undefined): string {
    if (provider == null) {
        return "Unavailable";
    }
    const kind = provider.kind?.trim() || "provider";
    const model = provider.model?.trim();
    return model ? `${kind} / ${model}` : kind;
}

export function formatSelectionSummary(catalog: AgentCatalog | null): string {
    if (catalog == null) {
        return "Selection unavailable";
    }
    return `${catalog.active.profile.name} / ${catalog.active.role.name} / ${catalog.active.mode.name}`;
}
