import type { AuditEvent } from "@/rterm-api/audit/types";

export function parseCommandFromSendInputSummary(widgetId: string, summary: string | undefined): string {
    const value = summary?.trim() ?? "";
    const prefix = `send input to ${widgetId}:`;
    if (!value.startsWith(prefix)) {
        return "";
    }
    return value.slice(prefix.length).trim();
}

export interface ExplainCommandIdentity {
    command: string;
    commandAuditEventId?: string;
}

export function findLatestWidgetCommand(events: AuditEvent[], widgetId: string): ExplainCommandIdentity | null {
    let latestIdentity: ExplainCommandIdentity | null = null;
    let latestTimestamp = -1;
    for (const event of events) {
        if (event.tool_name !== "term.send_input" || !event.success) {
            continue;
        }
        if (!event.affected_widgets?.includes(widgetId)) {
            continue;
        }
        const command = parseCommandFromSendInputSummary(widgetId, event.summary);
        if (command === "") {
            continue;
        }
        const nextIdentity: ExplainCommandIdentity = {
            command,
            commandAuditEventId: event.id?.trim() || undefined,
        };
        const timestamp = Date.parse(event.timestamp);
        if (Number.isNaN(timestamp)) {
            if (latestIdentity == null) {
                latestIdentity = nextIdentity;
            }
            continue;
        }
        if (timestamp >= latestTimestamp) {
            latestTimestamp = timestamp;
            latestIdentity = nextIdentity;
        }
    }
    return latestIdentity;
}
