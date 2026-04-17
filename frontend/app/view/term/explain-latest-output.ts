import { workspaceStore } from "@/app/state/workspace.store";
import { getAuditFacade } from "@/compat/audit";
import { createCompatApiFacade } from "@/compat/api";
import { getConversationFacade } from "@/compat/conversation";
import { getTerminalFacade } from "@/compat/terminal";
import { findLatestWidgetCommand } from "./explain-handoff";

export const EXPLAIN_RECENT_OUTPUT_WINDOW = 300;

export interface ExplainLatestTerminalOutputOptions {
    widgetID: string;
    actionSource: string;
}

export interface ExplainLatestTerminalOutputResult {
    command: string;
    commandAuditEventID?: string;
}

export async function explainLatestTerminalOutputInAI(
    options: ExplainLatestTerminalOutputOptions,
): Promise<ExplainLatestTerminalOutputResult> {
    const [auditFacade, conversationFacade, terminalFacade, compatApi] = await Promise.all([
        getAuditFacade(),
        getConversationFacade(),
        getTerminalFacade(),
        createCompatApiFacade(),
    ]);
    const [auditResponse, terminalSnapshot, bootstrap] = await Promise.all([
        auditFacade.getEvents(200),
        terminalFacade.getSnapshot(options.widgetID),
        compatApi.clients.bootstrap.getBootstrap(),
    ]);
    const commandIdentity = findLatestWidgetCommand(auditResponse.events ?? [], options.widgetID);
    if (commandIdentity == null || commandIdentity.command === "") {
        throw new Error(
            "No recent command execution was found for this terminal widget. Run a command through /run or tools first.",
        );
    }
    const workspaceID = (bootstrap.workspace?.id ?? workspaceStore.getSnapshot().active.oid ?? "").trim() || undefined;
    const repoRoot = bootstrap.repo_root?.trim() || undefined;
    const fromSeq = terminalSnapshot.next_seq > EXPLAIN_RECENT_OUTPUT_WINDOW
        ? terminalSnapshot.next_seq - EXPLAIN_RECENT_OUTPUT_WINDOW
        : 0;
    const targetSession = terminalSnapshot.state.connection_kind === "ssh" ? "remote" : "local";
    const targetConnectionID = terminalSnapshot.state.connection_id || (targetSession === "local" ? "local" : undefined);
    await conversationFacade.explainTerminalCommand({
        prompt: `Explain the latest observed output for command: ${commandIdentity.command}`,
        command: commandIdentity.command,
        widget_id: options.widgetID,
        from_seq: fromSeq,
        command_audit_event_id: commandIdentity.commandAuditEventId,
        context: {
            workspace_id: workspaceID,
            active_widget_id: options.widgetID,
            repo_root: repoRoot,
            action_source: options.actionSource,
            target_session: targetSession,
            target_connection_id: targetConnectionID,
            widget_context_enabled: true,
        },
    });
    return {
        command: commandIdentity.command,
        commandAuditEventID: commandIdentity.commandAuditEventId,
    };
}
