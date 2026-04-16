import { terminalStore } from "@/app/state/terminal.store";
import { workspaceStore } from "@/app/state/workspace.store";
import { WaveAIModel } from "@/app/aipanel/waveai-model";
import { WorkspaceLayoutModel } from "@/app/workspace/workspace-layout-model";
import { getAuditFacade } from "@/compat/audit";
import { createCompatApiFacade } from "@/compat/api";
import { getConversationFacade } from "@/compat/conversation";
import { getTerminalFacade } from "@/compat/terminal";
import type { TerminalSnapshot } from "@/rterm-api/terminal/types";
import { CenteredDiv } from "@/element/quickelems";
import { TermWrap } from "./termwrap";
import { findLatestWidgetCommand } from "./explain-handoff";
import { useEffect, useRef, useState } from "react";
import "./term.scss";
import "./xterm.css";

interface CompatTerminalViewProps {
    widgetId: string;
    connectionId?: string;
}

function isLocalConnection(connectionId?: string): boolean {
    return connectionId == null || connectionId === "" || connectionId === "local" || connectionId.startsWith("local:");
}

const EXPLAIN_RECENT_OUTPUT_WINDOW = 300;

export function CompatTerminalView({ widgetId, connectionId }: CompatTerminalViewProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const connectElemRef = useRef<HTMLDivElement>(null);
    const termWrapRef = useRef<TermWrap | null>(null);
    const [explainBusy, setExplainBusy] = useState(false);
    const [explainStatus, setExplainStatus] = useState<string | null>(null);
    const [explainError, setExplainError] = useState<string | null>(null);
    const [lifecycleSnapshot, setLifecycleSnapshot] = useState<TerminalSnapshot | null>(null);
    const [lifecycleError, setLifecycleError] = useState<string | null>(null);
    const isRemoteTerminal = !isLocalConnection(connectionId);

    useEffect(() => {
        if (connectElemRef.current == null) {
            return;
        }

        const termWrap = new TermWrap(
            widgetId,
            widgetId,
            connectElemRef.current,
            {
                fontSize: 12,
                fontFamily: "Hack",
                drawBoldTextInBrightColors: false,
                fontWeight: "normal",
                fontWeightBold: "bold",
                allowTransparency: true,
                scrollback: 2000,
                allowProposedApi: true,
                ignoreBracketedPasteMode: false,
            },
            {
                keydownHandler: () => true,
                useWebGl: false,
                sendDataHandler: (data: string) => {
                    void terminalStore.sendInput(widgetId, data).catch((err) => {
                        console.log("error sending terminal input", widgetId, err);
                    });
                },
            }
        );
        (
            termWrap as unknown as {
                isLocalConnection?: () => boolean;
            }
        ).isLocalConnection = () => isLocalConnection(connectionId);
        termWrapRef.current = termWrap;
        void termWrap.initTerminal();

        return () => {
            termWrap.dispose();
            termWrapRef.current = null;
        };
    }, [connectionId, widgetId]);

    useEffect(() => {
        if (!widgetId) {
            return;
        }
        let cancelled = false;
        const refreshLifecycle = async () => {
            try {
                const facade = await getTerminalFacade();
                const snapshot = await facade.getSnapshot(widgetId);
                if (cancelled) {
                    return;
                }
                setLifecycleSnapshot(snapshot);
                setLifecycleError(null);
            } catch (error) {
                if (cancelled) {
                    return;
                }
                setLifecycleError(error instanceof Error ? error.message : String(error));
            }
        };
        void refreshLifecycle();
        const intervalID = window.setInterval(() => {
            void refreshLifecycle();
        }, 4000);
        return () => {
            cancelled = true;
            window.clearInterval(intervalID);
        };
    }, [widgetId]);

    if (!widgetId) {
        return <CenteredDiv>No Terminal Widget</CenteredDiv>;
    }

    const lifecycleStatus = lifecycleSnapshot?.state.status ?? "unknown";
    const isConnected = lifecycleStatus === "running";
    const lifecycleLabel = isConnected ? "connected" : lifecycleStatus === "unknown" ? "status unknown" : "disconnected";
    const lifecycleColorClass = isConnected ? "text-emerald-300" : "text-amber-300";
    const lifecycleDetail = lifecycleError
        ?? (lifecycleSnapshot?.state.status === "failed"
            ? "session failed"
            : lifecycleSnapshot?.state.status === "exited"
                ? `session exited${lifecycleSnapshot.state.exit_code != null ? ` (code ${lifecycleSnapshot.state.exit_code})` : ""}`
                : null);

    const explainLatestCommandOutput = async () => {
        if (explainBusy) {
            return;
        }
        setExplainBusy(true);
        setExplainStatus(null);
        setExplainError(null);
        try {
            const [auditFacade, conversationFacade, terminalFacade, compatApi] = await Promise.all([
                getAuditFacade(),
                getConversationFacade(),
                getTerminalFacade(),
                createCompatApiFacade(),
            ]);
            const [auditResponse, terminalSnapshot, bootstrap] = await Promise.all([
                auditFacade.getEvents(200),
                terminalFacade.getSnapshot(widgetId),
                compatApi.clients.bootstrap.getBootstrap(),
            ]);
            const commandIdentity = findLatestWidgetCommand(auditResponse.events ?? [], widgetId);
            if (commandIdentity == null || commandIdentity.command === "") {
                setExplainError(
                    "No recent command execution was found for this terminal widget. Run a command through /run or tools first.",
                );
                return;
            }
            const command = commandIdentity.command;
            const fallbackWorkspaceID = bootstrap.workspace?.id ?? workspaceStore.getSnapshot().active.oid ?? "";
            const workspaceID = fallbackWorkspaceID.trim() || undefined;
            const repoRoot = bootstrap.repo_root?.trim() || undefined;
            const fromSeq = terminalSnapshot.next_seq > EXPLAIN_RECENT_OUTPUT_WINDOW
                ? terminalSnapshot.next_seq - EXPLAIN_RECENT_OUTPUT_WINDOW
                : 0;
            const targetSession = terminalSnapshot.state.connection_kind === "ssh" ? "remote" : "local";
            const targetConnectionID =
                terminalSnapshot.state.connection_id || (targetSession === "local" ? "local" : undefined);
            await conversationFacade.explainTerminalCommand({
                prompt: `Explain the latest observed output for command: ${command}`,
                command,
                widget_id: widgetId,
                from_seq: fromSeq,
                command_audit_event_id: commandIdentity.commandAuditEventId,
                context: {
                    workspace_id: workspaceID,
                    active_widget_id: widgetId,
                    repo_root: repoRoot,
                    action_source: "terminal.widget.explain_latest_output",
                    target_session: targetSession,
                    target_connection_id: targetConnectionID,
                    widget_context_enabled: true,
                },
            });
            WorkspaceLayoutModel.getInstance().setAIPanelVisible(true);
            WaveAIModel.getInstance().focusInput();
            const commandIdentitySuffix = commandIdentity.commandAuditEventId ? ` (event ${commandIdentity.commandAuditEventId})` : "";
            setExplainStatus(`Explained latest output for: ${command}${commandIdentitySuffix}`);
        } catch (error) {
            setExplainError(error instanceof Error ? error.message : String(error));
        } finally {
            setExplainBusy(false);
        }
    };

    return (
        <div
            ref={rootRef}
            className="view-term term-mode-term"
            onClick={() => {
                termWrapRef.current?.terminal.focus();
            }}
        >
            <div className="absolute top-2 left-2 z-20 flex flex-col items-start gap-1">
                <div className={`text-[10px] uppercase tracking-wide ${lifecycleColorClass}`}>
                    {isRemoteTerminal ? "remote" : "local"} session {lifecycleLabel}
                </div>
                {lifecycleDetail ? <div className="text-[10px] text-red-300 max-w-[24rem]">{lifecycleDetail}</div> : null}
            </div>
            <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-1">
                <button
                    type="button"
                    className="px-2 py-1 text-[11px] rounded border border-border bg-black/30 text-secondary hover:text-white disabled:opacity-50"
                    disabled={explainBusy}
                    onClick={(event) => {
                        event.stopPropagation();
                        void explainLatestCommandOutput();
                    }}
                >
                    {explainBusy ? "Sending..." : isRemoteTerminal ? "Explain Remote Command In AI" : "Explain Latest Output In AI"}
                </button>
                {explainStatus ? <div className="text-[10px] text-emerald-300 max-w-[24rem] text-right">{explainStatus}</div> : null}
                {explainError ? <div className="text-[10px] text-red-300 max-w-[24rem] text-right">{explainError}</div> : null}
            </div>
            <div key="connectElem" className="term-connectelem" ref={connectElemRef} />
        </div>
    );
}
