import type { AuditEvent } from "@/rterm-api/audit/types";

export function parseCommandFromSendInputSummary(widgetId: string, summary: string | undefined): string {
    const value = summary?.trim() ?? "";
    const prefix = `send input to ${widgetId}:`;
    if (!value.startsWith(prefix)) {
        return "";
    }
    return value.slice(prefix.length).trim();
}

export function findLatestWidgetCommand(events: AuditEvent[], widgetId: string): string {
    let latestCommand = "";
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
        const timestamp = Date.parse(event.timestamp);
        if (Number.isNaN(timestamp)) {
            if (latestCommand === "") {
                latestCommand = command;
            }
            continue;
        }
        if (timestamp >= latestTimestamp) {
            latestTimestamp = timestamp;
            latestCommand = command;
        }
    }
    return latestCommand;
}

